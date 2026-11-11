"use client";

// Hook che incapsula il ciclo di vita degli aggiornamenti Tauri: controllo, download, installazione e riavvio.
import { isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

// Stati esposti alla UI durante il ciclo di aggiornamento.
export type UpdatePhase =
	| "idle"
	| "checking"
	| "uptodate"
	| "available"
	| "downloading"
	| "installing"
	| "ready"
	| "error";

export interface AvailableUpdate {
	version: string;
	currentVersion: string;
	date: string | null;
	body: string | null;
}

export interface UpdaterController {
	phase: UpdatePhase;
	update: AvailableUpdate | null;
	progress: number | null;
	error: string | null;
	checkForUpdates: () => Promise<void>;
	installUpdate: (autoRelaunch?: boolean) => Promise<void>;
	relaunchApp: () => Promise<void>;
	reset: () => void;
}

// Traduce gli errori tecnici in messaggi comprensibili per l'utente.
function describeError(error: unknown): string {
	const raw = error instanceof Error ? error.message : String(error);

	if (/network|fetch|connect|timeout|timed out|dns/i.test(raw)) {
		return "Impossibile raggiungere il server degli aggiornamenti. Controlla la connessione e riprova.";
	}
	if (/signature|firma/i.test(raw)) {
		return "La firma dell'aggiornamento non è valida. L'installazione è stata bloccata per sicurezza.";
	}

	return raw || "Errore sconosciuto durante l'aggiornamento.";
}

// Gestisce lo stato React e mantiene l'istanza nativa Update in una ref.
export function useUpdater(): UpdaterController {
	const [phase, setPhase] = useState<UpdatePhase>("idle");
	const [update, setUpdate] = useState<AvailableUpdate | null>(null);
	const [progress, setProgress] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	// L'istanza Update detiene una risorsa Rust: va chiusa quando non serve più.
	const updateRef = useRef<import("@tauri-apps/plugin-updater").Update | null>(null);
	const phaseRef = useRef<UpdatePhase>("idle");

	useEffect(() => {
		phaseRef.current = phase;
	}, [phase]);

	useEffect(() => {
		return () => {
			// Non chiudere la risorsa mentre download o installazione sono in corso.
			if (phaseRef.current === "downloading" || phaseRef.current === "installing") {
				return;
			}
			void updateRef.current?.close().catch(() => undefined);
		};
	}, []);

	// Controlla l'endpoint configurato in tauri.conf.json e prepara l'eventuale update.
	const checkForUpdates = useCallback(async () => {
		// Fuori dal webview Tauri il plugin non esiste: errore esplicito.
		if (!isTauri()) {
			setPhase("error");
			setError("Gli aggiornamenti sono disponibili solo nell'app desktop.");
			return;
		}

		setPhase("checking");
		setError(null);
		setProgress(null);

		try {
			const { check } = await import("@tauri-apps/plugin-updater");
			const found = await check({ timeout: 20_000 });

			// Nessun metadata: l'app è già all'ultima versione pubblicata.
			if (!found) {
				setUpdate(null);
				setPhase("uptodate");
				return;
			}

			// Chiude l'eventuale istanza precedente prima di sostituirla.
			if (updateRef.current && updateRef.current !== found) {
				void updateRef.current.close().catch(() => undefined);
			}

			updateRef.current = found;
			setUpdate({
				version: found.version,
				currentVersion: found.currentVersion,
				date: found.date ?? null,
				body: found.body ?? null,
			});
			setPhase("available");
		} catch (caught) {
			setPhase("error");
			setError(describeError(caught));
		}
	}, []);

	// Scarica e installa; il riavvio è opzionale per lasciare scegliere all'utente.
	const installUpdate = useCallback(async (autoRelaunch = false) => {
		const current = updateRef.current;
		// Senza un Update precedente non c'è nulla da installare.
		if (!current) {
			setPhase("error");
			setError("Nessun aggiornamento pronto. Controlla prima la disponibilità.");
			return;
		}

		setPhase("downloading");
		setProgress(0);
		setError(null);

		let received = 0;
		let total: number | undefined;

		try {
			await current.downloadAndInstall((event) => {
				// Started fornisce la dimensione totale usata per la percentuale.
				if (event.event === "Started") {
					total = event.data.contentLength;
					setProgress(total ? 0 : null);
					return;
				}

				// Progress arriva a blocchi: accumuliamo i byte ricevuti.
				if (event.event === "Progress") {
					received += event.data.chunkLength;
					if (total) {
						setProgress(Math.min(99, Math.round((received / total) * 100)));
					}
					return;
				}

				// Finished: il download è terminato, inizia l'installazione.
				setProgress(100);
				setPhase("installing");
			});

			setPhase("ready");
			setProgress(100);

			// Riavvio automatico solo se richiesto (installazione da banner).
			if (autoRelaunch) {
				const { relaunch } = await import("@tauri-apps/plugin-process");
				await relaunch();
			}
		} catch (caught) {
			setPhase("error");
			setError(describeError(caught));
		}
	}, []);

	// Riavvia l'app dopo l'installazione, quando l'utente lo conferma.
	const relaunchApp = useCallback(async () => {
		try {
			const { relaunch } = await import("@tauri-apps/plugin-process");
			await relaunch();
		} catch (caught) {
			setPhase("error");
			setError(describeError(caught));
		}
	}, []);

	// Riporta l'hook allo stato iniziale e libera la risorsa nativa.
	const reset = useCallback(() => {
		void updateRef.current?.close().catch(() => undefined);
		updateRef.current = null;
		setUpdate(null);
		setProgress(null);
		setError(null);
		setPhase("idle");
	}, []);

	return {
		phase,
		update,
		progress,
		error,
		checkForUpdates,
		installUpdate,
		relaunchApp,
		reset,
	};
}
