"use client";

import { isTauri } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";

// Indica se il codice gira nel webview Tauri: la funzione nativa isTauri() non è reattiva.
const subscribe = () => () => undefined;
const getSnapshot = () => isTauri();
// In SSR assumiamo web per evitare mismatch di idratazione.
const getServerSnapshot = () => false;

export function useIsTauri(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
