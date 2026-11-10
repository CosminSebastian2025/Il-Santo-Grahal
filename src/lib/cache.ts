import { invoke, isTauri } from "@tauri-apps/api/core";

export interface CacheHealth {
  backend: "redis" | "memory";
  redisConfigured: boolean;
  redisConnected: boolean;
  memoryEntries: number;
  lastError: string | null;
}

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
