// Caricamento dei documenti Markdown con cache in memoria, su disco (Tauri) e richieste deduplicate.
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { cacheGet, cacheSet } from "@/lib/cache";

// Versione della chiave: cambiarla invalida le cache dei documenti.
const CACHE_KEY_VERSION = "v2";
// Sette giorni di validità per la cache persistente.
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
// Prefisso pubblico usato quando il sito è pubblicato sotto un sottopercorso.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Cache di sessione: evita richieste ripetute dello stesso file.
const localCache = new Map<string, string>();
// Richieste in corso: due componenti che chiedono lo stesso file condividono la promise.
const inflightRequests = new Map<string, Promise<string>>();
// La versione viene chiesta una sola volta e riusata per tutte le chiavi.
let contentVersionPromise: Promise<string> | null = null;

// Versione dell'app come parte della chiave: gli aggiornamenti invalidano i documenti.
function getContentVersion(): Promise<string> {
  contentVersionPromise ??= isTauri()
    ? getVersion().catch(() => "web")
    : Promise.resolve("web");

  return contentVersionPromise;
}

// Chiave stabile per la cache Rust: versione schema, versione app e file.
async function buildCacheKey(filePath: string): Promise<string> {
  return `doc:${CACHE_KEY_VERSION}:${await getContentVersion()}:${filePath}`;
}

// Restituisce il documento dalla cache, da una richiesta in corso o dal fetch.
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

// Prova prima la cache persistente, poi scarica e salva su disco.
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
