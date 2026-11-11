// Cache a due livelli: Redis (se configurato) con fallback in memoria per processo.
use std::{
    collections::HashMap,
    sync::Mutex,
    time::{Duration, Instant},
};

use redis::{aio::ConnectionManager, AsyncCommands};
use serde::Serialize;

// Scadenze predefinite e limiti di sicurezza della cache.
const DEFAULT_TTL_SECONDS: u64 = 24 * 60 * 60;
const MEMORY_MAX_ENTRIES: usize = 512;
const REDIS_CONNECT_TIMEOUT: Duration = Duration::from_secs(2);
const REDIS_RETRY_COOLDOWN: Duration = Duration::from_secs(30);
const MAX_KEY_LEN: usize = 512;

// Voce della cache in memoria con scadenza e momento di inserimento.
struct MemoryEntry {
    value: String,
    expires_at: Option<Instant>,
    inserted_at: Instant,
}

impl MemoryEntry {
    // Una voce è scaduta quando il deadline è stato superato.
    fn is_expired(&self) -> bool {
        self.expires_at
            .is_some_and(|deadline| deadline <= Instant::now())
    }
}

// Stato della connessione Redis: condivisa, con cooldown dopo un errore.
struct RedisSlot {
    connection: Option<ConnectionManager>,
    retry_at: Option<Instant>,
    last_error: Option<String>,
}

// Informazioni restituite al frontend per diagnosticare la cache.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheHealth {
    backend: &'static str,
    redis_configured: bool,
    redis_connected: bool,
    memory_entries: usize,
    last_error: Option<String>,
}

// Stato globale gestito da Tauri: prefisso chiavi, URL Redis e cache in memoria.
pub struct CacheState {
    prefix: String,
    redis_url: Option<String>,
    redis: tokio::sync::Mutex<RedisSlot>,
    memory: Mutex<HashMap<String, MemoryEntry>>,
}

impl CacheState {
    // Legge la configurazione dalle variabili d'ambiente, con fallback alla sola memoria.
    pub fn from_env() -> Self {
        let redis_url = ["ILSG_REDIS_URL", "REDIS_URL"]
            .iter()
            .find_map(|name| std::env::var(name).ok())
            .map(|url| url.trim().to_string())
            .filter(|url| !url.is_empty());

        let prefix = std::env::var("ILSG_REDIS_PREFIX")
            .ok()
            .map(|prefix| prefix.trim().to_string())
            .filter(|prefix| !prefix.is_empty())
            .unwrap_or_else(|| "ilsg:v1:".to_string());

        if redis_url.is_some() {
            log::info!("cache: Redis configurato, connessione lazy al primo utilizzo");
        } else {
            log::info!("cache: Redis non configurato, uso solo la cache in memoria");
        }

        Self {
            prefix,
            redis_url,
            redis: tokio::sync::Mutex::new(RedisSlot {
                connection: None,
                retry_at: None,
                last_error: None,
            }),
            memory: Mutex::new(HashMap::new()),
        }
    }

    // Legge prima da Redis, poi dalla memoria; un errore Redis non blocca la lettura.
    pub async fn get(&self, key: &str) -> Option<String> {
        if let Some(mut connection) = self.redis_connection().await {
            match connection
                .get::<_, Option<String>>(&self.namespaced(key))
                .await
            {
                Ok(Some(value)) => {
                    self.memory_set(key, &value, Some(DEFAULT_TTL_SECONDS));
                    return Some(value);
                }
                Ok(None) => {}
                Err(error) => {
                    log::warn!("cache: GET Redis fallita ({error}), provo la cache in memoria");
                }
            }
        }

        self.memory_get(key)
    }

    // Scrive in memoria e, se disponibile, anche su Redis con TTL.
    pub async fn set(&self, key: &str, value: &str, ttl_seconds: Option<u64>) {
        let ttl = ttl_seconds.unwrap_or(DEFAULT_TTL_SECONDS).max(1);
        self.memory_set(key, value, Some(ttl));

        let Some(mut connection) = self.redis_connection().await else {
            return;
        };

        if let Err(error) = connection
            .set_ex::<_, _, ()>(&self.namespaced(key), value, ttl)
            .await
        {
            log::warn!("cache: SET Redis fallita ({error}), valore mantenuto in memoria");
        }
    }

    // Elimina la chiave da entrambi i livelli di cache.
    pub async fn delete(&self, key: &str) {
        self.memory_remove(key);

        let Some(mut connection) = self.redis_connection().await else {
            return;
        };

        if let Err(error) = connection.del::<_, ()>(&self.namespaced(key)).await {
            log::warn!("cache: DEL Redis fallita ({error})");
        }
    }

    // Stato sintetico: backend attivo, configurazione, numero di voci e ultimo errore.
    pub async fn health(&self) -> CacheHealth {
        self.redis_connection().await;

        let slot = self.redis.lock().await;
        let connected = slot.connection.is_some();
        let last_error = slot.last_error.clone();
        drop(slot);

        let memory_entries = self
            .memory
            .lock()
            .map(|memory| memory.len())
            .unwrap_or_default();

        CacheHealth {
            backend: if connected { "redis" } else { "memory" },
            redis_configured: self.redis_url.is_some(),
            redis_connected: connected,
            memory_entries,
            last_error,
        }
    }

    // Restituisce la connessione Redis, riconnettendosi con timeout e cooldown.
    async fn redis_connection(&self) -> Option<ConnectionManager> {
        let url = self.redis_url.as_deref()?;
        let mut slot = self.redis.lock().await;

        if let Some(connection) = slot.connection.as_ref() {
            return Some(connection.clone());
        }
        if slot
            .retry_at
            .is_some_and(|retry_at| retry_at > Instant::now())
        {
            return None;
        }

        let client = match redis::Client::open(url) {
            Ok(client) => client,
            Err(error) => {
                slot.retry_at = Some(Instant::now() + REDIS_RETRY_COOLDOWN);
                slot.last_error = Some(format!("URL Redis non valido: {error}"));
                log::warn!("cache: URL Redis non valido ({error}), uso la cache in memoria");
                return None;
            }
        };

        let attempt =
            tokio::time::timeout(REDIS_CONNECT_TIMEOUT, ConnectionManager::new(client)).await;

        match attempt {
            Ok(Ok(connection)) => {
                slot.connection = Some(connection.clone());
                slot.retry_at = None;
                slot.last_error = None;
                log::info!("cache: connesso a Redis");
                Some(connection)
            }
            Ok(Err(error)) => {
                slot.connection = None;
                slot.retry_at = Some(Instant::now() + REDIS_RETRY_COOLDOWN);
                slot.last_error = Some(error.to_string());
                log::warn!("cache: Redis non raggiungibile ({error}), uso la cache in memoria");
                None
            }
            Err(_) => {
                let message = format!(
                    "timeout di connessione dopo {}s",
                    REDIS_CONNECT_TIMEOUT.as_secs()
                );
                slot.connection = None;
                slot.retry_at = Some(Instant::now() + REDIS_RETRY_COOLDOWN);
                slot.last_error = Some(message.clone());
                log::warn!("cache: {message}, uso la cache in memoria");
                None
            }
        }
    }

    // Applica il prefisso configurato alle chiavi Redis.
    fn namespaced(&self, key: &str) -> String {
        format!("{}{}", self.prefix, key)
    }

    // Lettura dalla memoria: rimuove le voci scadute incontrate.
    fn memory_get(&self, key: &str) -> Option<String> {
        let mut memory = self.memory.lock().ok()?;

        match memory.get(key) {
            Some(entry) if !entry.is_expired() => Some(entry.value.clone()),
            Some(_) => {
                memory.remove(key);
                None
            }
            None => None,
        }
    }

    // Scrittura in memoria con limite di voci; se pieno elimina le scadute o la più vecchia.
    fn memory_set(&self, key: &str, value: &str, ttl_seconds: Option<u64>) {
        let Ok(mut memory) = self.memory.lock() else {
            return;
        };

        if !memory.contains_key(key) && memory.len() >= MEMORY_MAX_ENTRIES {
            memory.retain(|_, entry| !entry.is_expired());

            if memory.len() >= MEMORY_MAX_ENTRIES {
                if let Some(oldest) = memory
                    .iter()
                    .min_by_key(|(_, entry)| entry.inserted_at)
                    .map(|(key, _)| key.clone())
                {
                    memory.remove(&oldest);
                }
            }
        }

        memory.insert(
            key.to_string(),
            MemoryEntry {
                value: value.to_string(),
                expires_at: ttl_seconds.map(|ttl| Instant::now() + Duration::from_secs(ttl)),
                inserted_at: Instant::now(),
            },
        );
    }

    // Rimuove una voce dalla cache in memoria.
    fn memory_remove(&self, key: &str) {
        if let Ok(mut memory) = self.memory.lock() {
            memory.remove(key);
        }
    }
}

// Valida le chiavi in arrivo dal frontend: niente stringhe vuote, caratteri strani o "..".
fn validate_key(key: &str) -> Result<(), String> {
    if key.is_empty() {
        return Err("la chiave di cache non può essere vuota".to_string());
    }
    if key.len() > MAX_KEY_LEN {
        return Err(format!(
            "la chiave di cache supera il limite di {MAX_KEY_LEN} byte"
        ));
    }
    if !key.chars().all(|character| character.is_ascii_graphic()) {
        return Err(
            "la chiave di cache deve contenere solo caratteri ASCII stampabili".to_string(),
        );
    }
    if key.contains("..") {
        return Err("la chiave di cache non può contenere '..'".to_string());
    }

    Ok(())
}

// Comandi IPC esposti al frontend: validano sempre la chiave prima di usarla.
#[tauri::command]
pub async fn cache_get(
    state: tauri::State<'_, CacheState>,
    key: String,
) -> Result<Option<String>, String> {
    validate_key(&key)?;
    Ok(state.get(&key).await)
}

// Salva un valore con TTL opzionale (secondi).
#[tauri::command]
pub async fn cache_set(
    state: tauri::State<'_, CacheState>,
    key: String,
    value: String,
    ttl_seconds: Option<u64>,
) -> Result<(), String> {
    validate_key(&key)?;
    state.set(&key, &value, ttl_seconds).await;
    Ok(())
}

// Elimina una chiave dalla cache.
#[tauri::command]
pub async fn cache_del(state: tauri::State<'_, CacheState>, key: String) -> Result<(), String> {
    validate_key(&key)?;
    state.delete(&key).await;
    Ok(())
}

// Restituisce lo stato del backend per la diagnostica del frontend.
#[tauri::command]
pub async fn cache_health(state: tauri::State<'_, CacheState>) -> Result<CacheHealth, String> {
    Ok(state.health().await)
}

// Test unitari della cache in memoria e della validazione delle chiavi.
#[cfg(test)]
mod tests {
    use super::*;

    fn memory_only_state() -> CacheState {
        CacheState {
            prefix: "test:".to_string(),
            redis_url: None,
            redis: tokio::sync::Mutex::new(RedisSlot {
                connection: None,
                retry_at: None,
                last_error: None,
            }),
            memory: Mutex::new(HashMap::new()),
        }
    }

    #[test]
    fn memory_cache_roundtrip() {
        let cache = memory_only_state();

        cache.memory_set("doc:a", "contenuto", Some(60));
        assert_eq!(cache.memory_get("doc:a").as_deref(), Some("contenuto"));
        assert_eq!(cache.memory_get("doc:missing"), None);
    }

    #[test]
    fn expired_entries_are_removed() {
        let cache = memory_only_state();

        cache.memory_set("doc:expired", "contenuto", Some(0));
        assert_eq!(cache.memory_get("doc:expired"), None);
    }

    #[test]
    fn keys_are_validated() {
        assert!(validate_key("doc:v1:0.2.6:/docs/1-C/page_1.MD").is_ok());
        assert!(validate_key("").is_err());
        assert!(validate_key("doc:chiave con spazi").is_err());
        assert!(validate_key("doc:..").is_err());
        assert!(validate_key(&"a".repeat(MAX_KEY_LEN + 1)).is_err());
    }
}
