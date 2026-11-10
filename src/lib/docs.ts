import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { cacheGet, cacheSet } from "@/lib/cache";

const CACHE_KEY_VERSION = "v2";
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const localCache = new Map<string, string>();
const inflightRequests = new Map<string, Promise<string>>();
let contentVersionPromise: Promise<string> | null = null;

function getContentVersion(): Promise<string> {
  contentVersionPromise ??= isTauri()
    ? getVersion().catch(() => "web")
    : Promise.resolve("web");

  return contentVersionPromise;
}

async function buildCacheKey(filePath: string): Promise<string> {
  return `doc:${CACHE_KEY_VERSION}:${await getContentVersion()}:${filePath}`;
}

export async function loadDocument(filePath: string): Promise<string> {
  const inMemory = localCache.get(filePath);
  if (inMemory !== undefined) {
    return inMemory;
  }

  const inflight = inflightRequests.get(filePath);
  if (inflight !== undefined) {
    return inflight;
  }

  const request = fetchAndCache(filePath).finally(() => {
    inflightRequests.delete(filePath);
  });
  inflightRequests.set(filePath, request);

  return request;
}

async function fetchAndCache(filePath: string): Promise<string> {
  const cacheKey = await buildCacheKey(filePath);
  const cached = await cacheGet(cacheKey);
  if (cached !== null) {
    localCache.set(filePath, cached);
    return cached;
  }

  const response = await fetch(`${BASE_PATH}${filePath}`);
  if (!response.ok) {
    throw new Error(`File non trovato: ${filePath}`);
  }

  const text = await response.text();
  localCache.set(filePath, text);
  void cacheSet(cacheKey, text, CACHE_TTL_SECONDS);

  return text;
}
