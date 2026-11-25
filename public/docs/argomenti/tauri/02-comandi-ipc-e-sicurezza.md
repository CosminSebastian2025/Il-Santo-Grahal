Il ponte fra Rust e la WebView è la parte di Tauri in cui si concentrano i problemi veri: serializzazione degli argomenti, comandi asincroni, permessi per finestra, API del sistema che espongono più di quanto serve. In questa lezione passi dai comandi "ciao mondo" ai pattern di produzione: `Result` serializzabili, stato condiviso con `tokio::sync`, eventi bidirezionali, plugin ufficiali e capabilities minime.

## Obiettivi

- Scrivere comandi che restituiscono `Result<T, E>` con `E: Serialize` e leggere l'errore lato JS.
- Usare comandi `async` e stato condiviso senza bloccare il thread principale.
- Scegliere fra comandi, plugin ufficiali ed eventi per i casi reali.
- Scrivere capability per finestra e capire quando il permesso manca.
- Adottare le regole di sicurezza della guida ufficiale dentro un'app Tauri.

## Comandi: firma, errori e serializzazione

Un comando è una funzione Rust annotata con `#[tauri::command]`, con argomenti nominati (Tauri li legge da camelCase lato JS) e valore di ritorno serializzabile. Per gestire gli errori in modo pulito, il ritorno deve essere un `Result` il cui errore implementi `Serialize`.

```rust
use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(tag = "tipo", content = "dettaglio")]
enum ErroreApp {
    PercorsoNonValido(String),
    Io(String),
}

#[tauri::command]
fn leggi_note(percorso: String) -> Result<String, ErroreApp> {
    std::fs::read_to_string(&percorso).map_err(|e| ErroreApp::Io(e.to_string()))
}
```

Lato frontend l'errore arriva come valore rifiutato, non come stringa generica, quindi puoi discriminarlo:

```ts
import { invoke } from "@tauri-apps/api/core";

try {
  const testo = await invoke<string>("leggi_note", { percorso: "/tmp/note.md" });
} catch (e) {
  const err = e as { tipo: string; dettaglio: string };
  console.error(err.tipo, err.dettaglio); // "Io" + messaggio del sistema
}
```

Nota il dettaglio: un parametro Rust `frontend_dist` diventa `frontendDist` lato JS. La convenzione è camelCase sul decode, e questa è la prima fonte di errori "invalid args".

## Comandi async, stato e blocking

Il core di Tauri gira su un runtime tokio. Un comando `async` viene eseguito sul runtime e non blocca la UI; un comando sincrono gira su un thread del pool IPC. Per operazioni lente o CPU-bound `tauri::async_runtime::spawn_blocking` evita di occupare i worker dell'IPC.

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

struct Archivio { contenuti: RwLock<Vec<String>> }

#[tauri::command]
async fn analizza(archivio: tauri::State<'_, Arc<Archivio>>, pagina: u32) -> Result<Vec<String>, String> {
    let guard = archivio.contenuti.read().await;
    Ok(guard.iter().skip((pagina as usize) * 20).take(20).cloned().collect())
}

#[tauri::command]
async fn scansiona(cartella: String) -> Result<usize, String> {
    tauri::async_runtime::spawn_blocking(move || conta_file(&cartella))
        .await
        .map_err(|e| e.to_string())?
}

fn conta_file(_c: &str) -> Result<usize, String> { Ok(0) }
```

| Scenario | Scelta |
| --- | --- |
| lettura veloce, calcolo breve | comando sync |
| I/O di rete, attesa di un servizio | comando `async` con client async (reqwest, redis) |
| scansione disco, parsing pesante | `spawn_blocking` dentro un comando `async` |
| lavoro da mandare avanti a comando finito | `spawn` + eventi di progresso |

Se usi `std::sync::Mutex` dentro un comando `async`, il guard può essere mantenuto attraverso un `.await` e bloccare il worker: usa `tokio::sync::RwLock` o `Mutex`, come nell'esempio.

## Plugin ufficiali o comandi scritti a mano

Tauri 2 distribuisce come plugin la maggior parte delle capacità di sistema: `fs`, `dialog`, `notification`, `shell`, `updater`, `process`, `log`, `sql`. Aggiungerli significa una riga in `Cargo.toml` e un `.plugin(tauri_plugin_x::init())` nel builder, più il pacchetto JS `@tauri-apps/plugin-x`.

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .manage(Archivio { contenuti: RwLock::new(Vec::new()) })
    .invoke_handler(tauri::generate_handler![analizza, scansiona, importa])
    .run(tauri::generate_context!())
    .expect("avvio fallito");
```

Il criterio di scelta è netto: se il plugin fa esattamente l'operazione che ti serve, usalo, perché il permesso è granulare (`dialog:allow-open`, `sql:allow-execute`) e la manutenzione è a carico del progetto. Scrivi un comando custom quando devi combinare più operazioni con logica tua, e in quel caso non concedere alla WebView il permesso sul plugin sottostante: il frontend chiama solo il tuo comando.

## Capabilities e regole di sicurezza

Il permesso di un plugin vale solo se compare in una capability che include la finestra. Una capability minima assomiglia a questa:

```json
{
  "identifier": "finestra-principale",
  "windows": ["main"],
  "permissions": [
    "core:window:allow-set-title",
    "dialog:allow-open",
    { "identifier": "fs:allow-read-text-file",
      "allow": [{ "path": "$APPDATA/note/*" }] }
  ]
}
```

I permessi di plugin accettano uno scope `allow` con variabili tipo `$APPDATA`, `$HOME`, `$RESOURCE`: è così che limiti la lettura a una cartella invece dell'intero disco. Il pattern di produzione è tre capability distinte - `main` (finestra principale), `finestra-impostazioni` (niente fs), `finestra-anteprima` (solo `core:event`) - così un errore in una finestra non amplia i poteri delle altre.

Le regole che la guida ufficiale mette al primo posto sono quattro: non abilitare `withGlobalTauri` in produzione, definire una CSP invece di `null`, non caricare risorse remote non verificate, e non passare oggetti di sistema (percorsi, URL) come stringhe usate direttamente in comandi di shell. Un secondo strato è il protocollo IPC stesso: l'accesso al sistema passa solo per i comandi registrati, quindi non c'è `require("child_process")` equivalente.

## Eventi e flussi asincroni

Un comando risponde una volta; per flussi lunghi (download, importazione, indice di ricerca) serve un canale. Due strumenti: `emit`/`listen` globale e i `Channel`, che restano legati a una singola chiamata.

```rust
use tauri::ipc::Channel;

#[tauri::command]
async fn importa(file: String, canale: Channel<u8>) -> Result<(), String> {
    for p in [10u8, 40, 70, 100] {
        canale.send(p).map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

```ts
const ch = new Channel<number>();
ch.onmessage = (percento) => aggiornaBarra(percento);
await invoke("importa", { file: "note.json", canale: ch });
```

`Channel` è preferibile agli eventi globali quando il flusso è legato a un invocazione: non serve un listener da rimuovere e non arriva a finestre estranee.

## Errori comuni

- **Errore come `String` ovunque**: perdi la possibilità di discriminare lato JS; usa enum con `#[serde(tag = ...)]`.
- **`State<Mutex<T>>` in un comando async tenuto attraverso `.await`**: il lock bloqueante congela il worker; passa a `tokio::sync`.
- **Concedere `fs:default` alle finestre**: espone lettura e scrittura su tutte le cartelle; restringi con lo scope `allow`.
- **Aggiornare l'app senza firmare gli artefatti**: l'updater rifiuta i pacchetti senza firma; vedi il laboratorio.
- **Registrare un comando per due finestre con lo stesso nome ma semantica diversa**: la prima registrazione vince, la seconda viene ignorata senza avvisi.

## In sintesi

I comandi sono il contratto fra WebView e Rust: firma tipizzata, errori serializzabili, async dove c'è attesa. I plugin ufficiali coprono il sistema con permessi granulari, e le capabilities decidono, finestra per finestra, cosa la WebView può chiedere. Per i flussi lunghi si usano eventi o `Channel`. La sicurezza non è un'opzione: CSP, scope dei permessi e niente API globali in produzione sono la baseline di ogni app Tauri.

## Fonti

- [Tauri 2 - Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/)
- [Tauri 2 - Capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri 2 - Security](https://v2.tauri.app/security/)
- [Tauri 2 - Content Security Policy](https://v2.tauri.app/security/csp/)
