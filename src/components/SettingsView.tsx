"use client";

// Vista impostazioni dell'app desktop: preferenze di aggiornamento e controllo manuale.
import { getVersion } from "@tauri-apps/api/app";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useIsTauri } from "@/hooks/useIsTauri";
import { useUpdater } from "@/hooks/useUpdater";
import { useUpdatePreferences } from "@/hooks/useUpdatePreferences";
import {
	getUpdatePreferencesSnapshot,
	writeUpdatePreferences,
	type UpdatePreferences,
} from "@/lib/update-preferences";
import { RELEASES_LATEST_URL } from "@/lib/releases";

interface SettingsViewProps {
	onBack: () => void;
}

// Interruttore accessibile (role=switch) usato per le due preferenze.
function Toggle({
	checked,
	onToggle,
	label,
	description,
}: {
	checked: boolean;
	onToggle: () => void;
	label: string;
	description: string;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={onToggle}
			className="flex w-full items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
		>
			<span>
				<span className="block text-sm font-semibold text-slate-900">{label}</span>
				<span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
			</span>
			<span
				className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
					checked ? "bg-blue-700" : "bg-slate-300"
				}`}
				aria-hidden="true"
			>
				<span
					className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
						checked ? "translate-x-5" : "translate-x-0.5"
					}`}
				/>
			</span>
		</button>
	);
}

// Formatta in italiano la data di pubblicazione della release.
function formatDate(value: string | null): string | null {
	if (!value) {
		return null;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return new Intl.DateTimeFormat("it-IT", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(date);
}

export default function SettingsView({ onBack }: SettingsViewProps) {
	// desktop decide se mostrare le impostazioni o il rinvio alla pagina di download.
	const desktop = useIsTauri();
	const [version, setVersion] = useState<string>("");
	const preferences = useUpdatePreferences();
	const {
		phase,
		update,
		progress,
		error,
		checkForUpdates,
		installUpdate,
		relaunchApp,
	} = useUpdater();

	// La versione è leggibile solo dal runtime Tauri, che espone il comando getVersion.
	useEffect(() => {
		if (!desktop) {
			return;
		}

		void getVersion()
			.then(setVersion)
			.catch(() => setVersion("sconosciuta"));
	}, [desktop]);

	// Legge lo store aggiornato per non sovrascrivere toggle cliccati in rapida sequenza.
	const togglePreference = (key: keyof UpdatePreferences) => {
		const current = getUpdatePreferencesSnapshot();
		writeUpdatePreferences({ ...current, [key]: !current[key] });
	};

	// Durante queste fasi i pulsanti di controllo restano disabilitati.
	const busy = phase === "checking" || phase === "downloading" || phase === "installing";
	const releaseDate = formatDate(update?.date ?? null);

	// Nel sito web le impostazioni desktop non esistono: rimandiamo al download.
	if (desktop === false) {
		return (
			<main className="min-h-screen bg-slate-50">
				<header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
					<div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
						<Link href="/" className="text-base font-bold tracking-tight text-slate-900">
							Il Santo Grahal
						</Link>
						<Link
							href="/"
							className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
						>
							Torna ai percorsi
						</Link>
					</div>
				</header>
				{/* Messaggio mostrato quando la vista viene aperta nel sito web */}
				<div className="mx-auto max-w-2xl px-5 py-16 sm:px-8">
					<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
						<span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-7" aria-hidden="true">
								<rect x="4" y="3" width="16" height="14" rx="2" />
								<path d="M8 21h8M12 17v4" strokeLinecap="round" />
							</svg>
						</span>
						<h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">Impostazioni nell&apos;app</h1>
						<p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
							Il controllo e l&apos;installazione degli aggiornamenti sono disponibili nella versione desktop de Il Santo Grahal.
						</p>
						<Link
							href="/download/"
							className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
						>
							Scarica l&apos;app
						</Link>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-slate-50">
			<header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
				<div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
					<button
						type="button"
						onClick={onBack}
						className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
					>
						<span aria-hidden="true">←</span>
						Home
					</button>
					<span className="text-base font-bold tracking-tight text-slate-900">Il Santo Grahal</span>
				</div>
			</header>

			<div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
				{/* Intestazione della vista */}
				<section aria-labelledby="settings-title">
					<p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
						<span className="h-px w-7 bg-blue-600" aria-hidden="true" />
						IMPOSTAZIONI
					</p>
					<h1 id="settings-title" className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
						Aggiornamenti
					</h1>
					<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
						Scegli come l&apos;app deve comportarsi all&apos;avvio e gestisci manualmente le nuove versioni.
					</p>
				</section>

				{/* Versione installata e preferenze salvate in localStorage */}
				<section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="current-version-title">
					<div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
						<div>
							<h2 id="current-version-title" className="text-base font-bold text-slate-900">Versione installata</h2>
							<p className="mt-1 text-sm text-slate-500">
								{version ? `Versione ${version}` : "Lettura della versione…"}
							</p>
						</div>
						<span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
							<span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
							Canale stabile
						</span>
					</div>

					<div className="space-y-3 px-5 py-5 sm:px-6">
						<Toggle
							checked={preferences.autoCheck}
							onToggle={() => togglePreference("autoCheck")}
							label="Controlla gli aggiornamenti all'avvio"
							description="All'apertura l'app verifica la presenza di una nuova versione e mostra un avviso."
						/>
						<Toggle
							checked={preferences.autoInstall}
							onToggle={() => togglePreference("autoInstall")}
							label="Installa automaticamente gli aggiornamenti"
							description="Dopo il controllo, l'app scarica e installa la nuova versione, quindi si riavvia per applicarla."
						/>
					</div>
				</section>

				{/* Controllo manuale con stato, note di rilascio e azioni */}
				<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="manual-update-title">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div>
							<h2 id="manual-update-title" className="text-base font-bold text-slate-900">Controllo manuale</h2>
							<p className="mt-1 text-sm text-slate-500">
								Verifica adesso se è disponibile una nuova versione.
							</p>
						</div>
						<button
							type="button"
							onClick={() => void checkForUpdates()}
							disabled={busy}
							className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{phase === "checking" && (
								<span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
							)}
							{phase === "checking" ? "Controllo in corso…" : "Controlla aggiornamenti"}
						</button>
					</div>

					<div className="mt-5" aria-live="polite">
						{/* Un pannello per ogni fase dell'aggiornamento */}
						{phase === "idle" && (
							<p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
								Nessun controllo eseguito in questa sessione.
							</p>
						)}

						{phase === "checking" && (
							<p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
								Sto contattando il server degli aggiornamenti…
							</p>
						)}

						{phase === "uptodate" && (
							<p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
								L&apos;app è aggiornata{version ? ` alla versione ${version}` : ""}.
							</p>
						)}

						{phase === "available" && update && (
							<div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
								<p className="text-sm font-bold text-blue-950">
									Disponibile la versione {update.version}
								</p>
								<p className="mt-1 text-xs text-blue-800">
									Versione installata: {update.currentVersion}
									{releaseDate ? ` · pubblicata il ${releaseDate}` : ""}
								</p>
								{update.body && (
									<div className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-xs leading-5 text-slate-700">
										{update.body}
									</div>
								)}
								<button
									type="button"
									onClick={() => void installUpdate(false)}
									className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Scarica e installa
								</button>
							</div>
						)}

						{(phase === "downloading" || phase === "installing") && (
							<div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
								<div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
									<span>{phase === "downloading" ? "Download in corso" : "Installazione in corso"}</span>
									<span>{progress !== null ? `${progress}%` : ""}</span>
								</div>
								<div
									className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
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
									Non chiudere l&apos;app durante l&apos;installazione.
								</p>
							</div>
						)}

						{phase === "ready" && (
							<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
								<p className="text-sm font-semibold text-emerald-900">
									Aggiornamento installato.
								</p>
								<p className="mt-1 text-xs leading-5 text-emerald-800">
									Riavvia l&apos;applicazione per usare la nuova versione.
								</p>
								<button
									type="button"
									onClick={() => void relaunchApp()}
									className="mt-3 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
								>
									Riavvia ora
								</button>
							</div>
						)}

						{phase === "error" && (
							<div className="rounded-xl border border-red-200 bg-red-50 p-4">
								<p className="text-sm font-semibold text-red-900">Aggiornamento non riuscito</p>
								<p className="mt-1 text-xs leading-5 text-red-800">{error}</p>
								<button
									type="button"
									onClick={() => void (update ? installUpdate(false) : checkForUpdates())}
									className="mt-3 rounded-lg bg-red-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-900"
								>
									Riprova
								</button>
							</div>
						)}
					</div>
				</section>

				{/* Spiegazione del meccanismo di firma e link alle release */}
				<section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 sm:p-6" aria-labelledby="update-info-title">
					<h2 id="update-info-title" className="text-base font-bold text-slate-900">Come funzionano</h2>
					<p className="mt-2">
						Gli aggiornamenti vengono cercati su GitHub Releases e installati solo se la firma digitale corrisponde alla chiave pubblica inclusa nell&apos;app.
					</p>
					<p className="mt-2">
						Con l&apos;installazione automatica attiva, l&apos;app scarica la nuova versione e si riavvia al termine. Se la installi manualmente, puoi scegliere quando riavviare.
					</p>
					<a
						href={RELEASES_LATEST_URL}
						className="mt-3 inline-flex font-semibold text-blue-700 underline-offset-2 hover:underline"
					>
						Apri la pagina delle release
					</a>
				</section>
			</div>
		</main>
	);
}
