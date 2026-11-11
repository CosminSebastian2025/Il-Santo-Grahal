"use client";

// Banner flottante mostrato nell'app desktop quando all'avvio è disponibile una nuova versione.
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useUpdater } from "@/hooks/useUpdater";
import { useUpdatePreferences } from "@/hooks/useUpdatePreferences";
import {
	dismissVersion,
	getDismissedVersion,
	markAutoInstallAttempted,
	subscribeToDismissedVersion,
	wasAutoInstallAttempted,
} from "@/lib/update-preferences";

interface UpdateBannerProps {
	onOpenSettings: () => void;
}

export default function UpdateBanner({ onOpenSettings }: UpdateBannerProps) {
	const {
		phase,
		update,
		progress,
		error,
		checkForUpdates,
		installUpdate,
		relaunchApp,
	} = useUpdater();
	const preferences = useUpdatePreferences();
	// Versione chiusa dall'utente in questa sessione: il banner resta nascosto.
	const dismissedVersion = useSyncExternalStore(
		subscribeToDismissedVersion,
		getDismissedVersion,
		() => null,
	);
	// Il controllo automatico parte una sola volta per montaggio del banner.
	const startedRef = useRef(false);

	useEffect(() => {
		if (startedRef.current || !preferences.autoCheck) {
			return;
		}
		startedRef.current = true;

		// Attendiamo 2,5 s per non rallentare l'avvio dell'app.
		const timeout = window.setTimeout(() => {
			void checkForUpdates();
		}, 2_500);

		return () => window.clearTimeout(timeout);
	}, [preferences.autoCheck, checkForUpdates]);

	// Con installazione automatica attiva procediamo una volta per versione.
	useEffect(() => {
		if (phase !== "available" || !update || !preferences.autoInstall) {
			return;
		}
		if (wasAutoInstallAttempted(update.version)) {
			return;
		}
		if (getDismissedVersion() === update.version) {
			return;
		}

		markAutoInstallAttempted(update.version);
		void installUpdate(true);
	}, [phase, update, preferences.autoInstall, installUpdate]);

	// Il banner esiste solo se il controllo automatico è attivo e c'è un aggiornamento.
	if (!preferences.autoCheck || !update) {
		return null;
	}

	// Una versione chiusa dall'utente non viene più proposta in questa sessione.
	if (phase === "available" && dismissedVersion === update.version) {
		return null;
	}

	const isBusy = phase === "downloading" || phase === "installing";

	// Chiude il banner solo per la versione corrente.
	const dismiss = () => {
		dismissVersion(update.version);
	};

	return (
		<div
			className="fixed bottom-5 right-5 z-50 w-[calc(100%-2.5rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/15"
			role="status"
			aria-live="polite"
		>
			<div className="flex items-start gap-3">
				<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-5" aria-hidden="true">
						<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-bold text-slate-900">
						{phase === "available" && "Aggiornamento disponibile"}
						{phase === "downloading" && "Download dell'aggiornamento"}
						{phase === "installing" && "Installazione in corso"}
						{phase === "ready" && "Aggiornamento installato"}
						{phase === "error" && "Aggiornamento non riuscito"}
					</p>
					<p className="mt-1 text-xs leading-5 text-slate-600">
						Versione {update.version} · dalla {update.currentVersion}
					</p>
				</div>
				{!isBusy && phase !== "ready" && (
					<button
						type="button"
						onClick={dismiss}
						aria-label="Chiudi avviso aggiornamento"
						className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
					>
						<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden="true">
							<path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
						</svg>
					</button>
				)}
			</div>

			{/* Avanzamento di download e installazione */}
			{isBusy && (
				<div className="mt-4">
					<div
						className="h-1.5 overflow-hidden rounded-full bg-slate-100"
						role="progressbar"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={progress ?? undefined}
					>
						<div
							className="h-full rounded-full bg-blue-700 transition-[width] duration-300"
							style={{ width: `${progress ?? 12}%` }}
						/>
					</div>
					<p className="mt-2 text-xs text-slate-500">
						{progress !== null ? `${progress}%` : "Preparazione…"}
						{preferences.autoInstall && " · riavvio automatico al termine"}
					</p>
				</div>
			)}

			{phase === "ready" && (
				<p className="mt-3 text-xs leading-5 text-slate-600">
					Riavvia l&apos;app per completare l&apos;aggiornamento.
				</p>
			)}

			{phase === "error" && error && (
				<p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">
					{error}
				</p>
			)}

			{/* Azioni disponibili in base alla fase */}
			<div className="mt-4 flex flex-wrap gap-2">
				{phase === "available" && !preferences.autoInstall && (
					<button
						type="button"
						onClick={() => void installUpdate(false)}
						className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
					>
						Installa ora
					</button>
				)}
				{phase === "available" && preferences.autoInstall && (
					<span className="text-xs font-medium text-slate-500">Avvio automatico in corso…</span>
				)}
				{phase === "ready" && (
					<button
						type="button"
						onClick={() => void relaunchApp()}
						className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-800"
					>
						Riavvia ora
					</button>
				)}
				{phase === "error" && (
					<button
						type="button"
						onClick={() => void installUpdate(false)}
						className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
					>
						Riprova
					</button>
				)}
				{phase !== "ready" && (
					<button
						type="button"
						onClick={onOpenSettings}
						className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
					>
						Dettagli
					</button>
				)}
			</div>
		</div>
	);
}
