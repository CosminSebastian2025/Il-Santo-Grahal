// Ponte verso la cache Rust di Tauri: Redis se configurato, altrimenti memoria.
import { invoke, isTauri } from "@tauri-apps/api/core";

// Stato del backend restituito dal comando cache_health.
export interface CacheHealth {
  backend: "redis" | "memory";
  redisConfigured: boolean;
  redisConnected: boolean;
  memoryEntries: number;
  lastError: string | null;
}

// Legge un valore dalla cache; null se assente o fuori dal runtime Tauri.
export async function cacheGet(key: string): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }

  try {
    return (await invoke<string | null>("cache_get", { key })) ?? null;
  } catch (error) {
    console.debug("[cache] cache_get non disponibile", error);
    return null;
  }
}

// Salva un valore con scadenza; nel web non fa nulla.
export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invoke("cache_set", { key, value, ttlSeconds });
  } catch (error) {
    console.debug("[cache] cache_set non disponibile", error);
  }
}

// Elimina una chiave dalla cache.
export async function cacheDelete(key: string): Promise<void> {
  if (!isTauri()) {
    return;
  }

  try {
    await invoke("cache_del", { key });
  } catch (error) {
    console.debug("[cache] cache_del non disponibile", error);
  }
}

// Chiede al backend Rust lo stato della cache (usato in sviluppo).
export async function getCacheHealth(): Promise<CacheHealth | null> {
  if (!isTauri()) {
    return null;
  }

  try {
    return await invoke<CacheHealth>("cache_health");
  } catch (error) {
    console.debug("[cache] cache_health non disponibile", error);
    return null;
  }
}
