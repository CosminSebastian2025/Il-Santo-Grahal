"use client";

// Pagina pubblica di download: rileva il sistema operativo, elenca i formati e genera i link diretti.
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
	APP_VERSION,
	RELEASES_LATEST_URL,
	buildOsDownloads,
	detectOperatingSystem,
	formatFileSize,
	isMobileDevice,
	loadLatestRelease,
	type LatestRelease,
	type OperatingSystem,
} from "@/lib/releases";

// Stato del caricamento della release da GitHub.
type ReleaseStatus = "loading" | "ready" | "error";

// L'ambiente non cambia a runtime: una subscribe no-op basta a useSyncExternalStore.
const subscribeEnvironment = () => () => undefined;

// Icone inline per i tre sistemi operativi.
function OsIcon({ os }: { os: OperatingSystem }) {
	if (os === "windows") {
		return (
			<svg viewBox="0 0 24 24" fill="currentColor" className="size-6" aria-hidden="true">
				<path d="M3 4.5 10.5 3.4v8.1H3V4.5Zm0 15 7.5 1.1v-7.9H3v6.8Zm8.5 1.2L21 22V12.5h-9.5v8.2ZM11.5 3.2 21 2v9.5h-9.5V3.2Z" />
			</svg>
		);
	}

	if (os === "macos") {
		return (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-6" aria-hidden="true">
				<rect x="3" y="4.5" width="18" height="12" rx="2" />
				<path d="M8 20h8M12 16.5V20" strokeLinecap="round" />
			</svg>
		);
	}

	return (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-6" aria-hidden="true">
			<rect x="3" y="4.5" width="18" height="15" rx="2" />
			<path d="m7 9 2.5 2.5L7 14M12.5 14H17" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

// Spunta riutilizzata per formati consigliati e requisiti.
function CheckIcon() {
	return (
		<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
			<path d="m4 10.5 4 4L16 6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export default function DownloadPage() {
	// Release letta da GitHub e relativo stato di caricamento.
	const [release, setRelease] = useState<LatestRelease | null>(null);
	const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus>("loading");
	// Il SO scelto manualmente vince sul rilevamento automatico.
	const [manualOs, setManualOs] = useState<OperatingSystem | null>(null);
	const [formatId, setFormatId] = useState("");
	const detectedOs = useSyncExternalStore(
		subscribeEnvironment,
		detectOperatingSystem,
		() => null,
	);
	const mobile = useSyncExternalStore(
		subscribeEnvironment,
		isMobileDevice,
		() => false,
	);
	// Fallback a Windows se il browser non espone un SO riconoscibile.
	const selectedOs = manualOs ?? detectedOs ?? "windows";

	// Carica l'ultima release; se fallisce restano i link della versione in package.json.
	useEffect(() => {
		const controller = new AbortController();
		let cancelled = false;

		loadLatestRelease(controller.signal)
			.then((latest) => {
				if (cancelled) {
					return;
				}
				setRelease(latest);
				setReleaseStatus("ready");
			})
			.catch((error: unknown) => {
				if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
					return;
				}
				setReleaseStatus("error");
			});

		return () => {
			// Annulla la richiesta se il componente viene smontato.
			cancelled = true;
			controller.abort();
		};
	}, []);

	// Download raggruppati per SO; il formato attivo è quello scelto o il consigliato.
	const downloads = useMemo(() => buildOsDownloads(release), [release]);
	const activeOs = downloads.find((os) => os.id === selectedOs) ?? downloads[0];
	const activeFormat =
		activeOs.formats.find((format) => format.id === formatId) ??
		activeOs.formats.find((format) => format.recommended) ??
		activeOs.formats[0];

	// Versione mostrata, data leggibile e dimensione del file attivo.
	const version = release?.version ?? APP_VERSION;
	const releaseDate = release?.publishedAt
		? new Intl.DateTimeFormat("it-IT", {
				day: "numeric",
				month: "long",
				year: "numeric",
			}).format(new Date(release.publishedAt))
		: null;

	const size = formatFileSize(activeFormat.size);

	return (
		<main className="min-h-screen bg-slate-50">
			{/* Intestazione con logo e ritorno ai percorsi */}
			<header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
					<Link
						href="/"
						className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
					>
						<span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8">
								<path d="M4.75 5.75A2.75 2.75 0 0 1 7.5 3h12v15h-12a2.75 2.75 0 0 0-2.75 2.75V5.75Z" />
								<path d="M4.75 18A2.75 2.75 0 0 1 7.5 15.25h12M9 7h6m-6 3h6" />
							</svg>
						</span>
						<span className="text-base font-bold tracking-tight text-slate-900">Il Santo Grahal</span>
					</Link>

					<Link
						href="/"
						className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
					>
						Torna ai percorsi
					</Link>
				</div>
			</header>

			<div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
				<section className="max-w-3xl" aria-labelledby="download-title">
					<p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
						<span className="h-px w-7 bg-blue-600" aria-hidden="true" />
						DOWNLOAD
					</p>
					<h1 id="download-title" className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
						Porta Il Santo Grahal
						<span className="mt-1 block text-blue-700">sul tuo computer.</span>
					</h1>
					<p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
						Scegli il sistema operativo e il formato di installazione. La versione per il tuo sistema è già selezionata; puoi cambiarla in qualsiasi momento.
					</p>

					<div className="mt-6 flex flex-wrap items-center gap-3" aria-live="polite">
						<span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
							Versione {version}
						</span>
						{releaseDate && (
							<span className="text-xs text-slate-500">Pubblicata il {releaseDate}</span>
						)}
						{releaseStatus === "loading" && (
							<span className="text-xs text-slate-500">Recupero dell&apos;ultima release…</span>
						)}
						{releaseStatus === "error" && (
							<span className="text-xs font-medium text-amber-700">
								Ultima release non raggiungibile: uso la versione {APP_VERSION}.
							</span>
						)}
					</div>
				</section>

				{mobile && (
					<div className="mt-8 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
						Stai navigando da un dispositivo mobile. Il download è pensato per Windows, macOS e Linux; puoi comunque aprire i link da un computer.
					</div>
				)}

				{/* Selettore del sistema operativo: il rilevato è evidenziato */}
				<section className="mt-10" aria-labelledby="os-title">
					<h2 id="os-title" className="sr-only">Sistema operativo</h2>
					<div className="grid gap-3 sm:grid-cols-3">
						{downloads.map((os) => {
							const isActive = os.id === selectedOs;
							return (
								<button
									key={os.id}
									type="button"
									onClick={() => setManualOs(os.id)}
									aria-pressed={isActive}
									className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
										isActive
											? "border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-600"
											: "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
									} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
								>
									<span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
										<OsIcon os={os.id} />
									</span>
									<span className="min-w-0">
										<span className="flex flex-wrap items-center gap-2">
											<span className="font-semibold text-slate-900">{os.name}</span>
											{detectedOs === os.id && (
												<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
													Rilevato
												</span>
											)}
										</span>
										<span className="mt-0.5 block text-xs text-slate-500">{os.subtitle}</span>
									</span>
								</button>
							);
						})}
					</div>
				</section>

				{/* Formati disponibili per il sistema operativo selezionato */}
				<section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="formats-title">
					<div className="border-b border-slate-100 px-5 py-5 sm:px-6">
						<h2 id="formats-title" className="text-lg font-bold text-slate-900">
							Scegli il formato per {activeOs.name}
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							Tutti i formati contengono la stessa applicazione. Cambia solo il modo in cui viene installata.
						</p>
					</div>

					<div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
						{activeOs.formats.map((format) => {
							const isActive = format.id === activeFormat.id;
							return (
								<button
									key={format.id}
									type="button"
									onClick={() => setFormatId(format.id)}
									aria-pressed={isActive}
									className={`relative flex h-full flex-col rounded-xl border p-4 text-left transition ${
										isActive
											? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600"
											: "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
									} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
								>
									<span className="flex items-start justify-between gap-3">
										<span className="font-semibold text-slate-900">{format.label}</span>
										<span className="rounded-md bg-slate-900/5 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">
											{format.extension}
										</span>
									</span>
									<span className="mt-2 flex-1 text-sm leading-6 text-slate-600">
										{format.description}
									</span>
									<span className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
										<span>{format.architecture === "any" ? "Universale" : format.architecture === "arm64" ? "ARM64" : "x86_64"}</span>
										<span className="flex items-center gap-2">
											{formatFileSize(format.size) && <span>{formatFileSize(format.size)}</span>}
											{format.recommended && (
												<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
													<CheckIcon />
													Consigliato
												</span>
											)}
										</span>
									</span>
								</button>
							);
						})}
					</div>

					{/* Riepilogo del file scelto e pulsante di download diretto */}
					<div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="min-w-0">
								<p className="text-sm font-semibold text-slate-900">
									Scarica {activeFormat.label} per {activeOs.name}
								</p>
								<p className="mt-1 truncate font-mono text-xs text-slate-500" title={activeFormat.fileName}>
									{activeFormat.fileName}
									{size ? ` · ${size}` : ""}
								</p>
							</div>
							<a
								href={activeFormat.url}
								className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
							>
								<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden="true">
									<path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
								Scarica {activeFormat.extension}
							</a>
						</div>
						<p className="mt-3 text-xs leading-5 text-slate-500">
							Il download apre GitHub Releases. Se il file non parte, usa la pagina{" "}
							<a href={RELEASES_LATEST_URL} className="font-semibold text-blue-700 underline-offset-2 hover:underline">
								dell&apos;ultima release
							</a>.
						</p>
					</div>
				</section>

				{/* Note di primo avvio, aggiornamenti e provenienza delle build */}
				<section className="mt-10 grid gap-4 md:grid-cols-3" aria-label="Informazioni sull'installazione">
					<article className="rounded-2xl border border-slate-200 bg-white p-5">
						<h2 className="text-sm font-bold text-slate-900">Primo avvio</h2>
						<p className="mt-2 text-sm leading-6 text-slate-600">
							{selectedOs === "windows" &&
								"Apri il file scaricato e segui la procedura. Windows potrebbe mostrare SmartScreen perché l'installer non usa un certificato commerciale."}
							{selectedOs === "macos" &&
								"Apri il DMG e trascina l'app in Applicazioni. Al primo avvio macOS potrebbe chiedere una conferma in Privacy e sicurezza, perché l'app non è notarizzata."}
							{selectedOs === "linux" &&
								"AppImage: rendi eseguibile il file con chmod +x e avvialo. DEB e RPM si installano con il gestore pacchetti della distribuzione."}
						</p>
					</article>
					<article className="rounded-2xl border border-slate-200 bg-white p-5">
						<h2 className="text-sm font-bold text-slate-900">Aggiornamenti</h2>
						<p className="mt-2 text-sm leading-6 text-slate-600">
							Dopo l&apos;installazione, apri <span className="font-semibold text-slate-800">Impostazioni</span> nell&apos;app per controllare manualmente gli aggiornamenti o attivare il controllo automatico all&apos;avvio.
						</p>
					</article>
					<article className="rounded-2xl border border-slate-200 bg-white p-5">
						<h2 className="text-sm font-bold text-slate-900">Fonte verificabile</h2>
						<p className="mt-2 text-sm leading-6 text-slate-600">
							Le build sono prodotte da GitHub Actions a partire dal repository pubblico. Gli aggiornamenti dell&apos;app sono firmati e verificati prima dell&apos;installazione.
						</p>
					</article>
				</section>

				<section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6" aria-labelledby="requirements-title">
					<h2 id="requirements-title" className="text-lg font-bold text-slate-900">Requisiti</h2>
					<ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-2">
						<li className="flex gap-3">
							<span className="mt-0.5 text-blue-700"><CheckIcon /></span>
							Windows 10 o 11 a 64 bit, con Microsoft Edge WebView2.
						</li>
						<li className="flex gap-3">
							<span className="mt-0.5 text-blue-700"><CheckIcon /></span>
							macOS 11 o successivo, Intel o Apple Silicon.
						</li>
						<li className="flex gap-3">
							<span className="mt-0.5 text-blue-700"><CheckIcon /></span>
							Linux x86_64 con WebKitGTK 4.1 per l&apos;AppImage.
						</li>
						<li className="flex gap-3">
							<span className="mt-0.5 text-blue-700"><CheckIcon /></span>
							Circa 100 MB di spazio libero per installazione e guide offline.
						</li>
					</ul>
				</section>
			</div>

			<footer className="border-t border-slate-200/80 bg-white/60">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-center text-xs text-slate-500 sm:flex-row sm:px-8 sm:text-left">
					<p>Il Santo Grahal {version} · Tauri e Next.js</p>
					<a href={RELEASES_LATEST_URL} className="font-medium text-slate-600 hover:text-slate-900">
						Tutte le release su GitHub
					</a>
				</div>
			</footer>
		</main>
	);
}
