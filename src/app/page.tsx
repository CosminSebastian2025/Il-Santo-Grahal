"use client";

// Home: elenco dei percorsi, accesso al catalogo, vista impostazioni e banner aggiornamenti.
import Link from "next/link";
import { useState } from "react";
import { getSortedPages, sections } from "@/lib/sections";
import SectionCard from "@/components/SectionCard";
import SettingsView from "@/components/SettingsView";
import UpdateBanner from "@/components/UpdateBanner";
import { useIsTauri } from "@/hooks/useIsTauri";

export default function Home() {
    // "settings" sostituisce la home nell'app desktop, senza cambiare rotta.
    const [view, setView] = useState<"home" | "settings">("home");
    // Nel web mostra il link Download, nel desktop il pulsante Impostazioni.
    const isDesktopApp = useIsTauri();

    // La vista impostazioni prende il posto della home mantenendo lo stesso layout.
    if (view === "settings") {
        return (
            <main className="min-h-screen bg-slate-50">
                <SettingsView onBack={() => setView("home")} />
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col">
            <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
                    <a href="#home" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8">
                                <path d="M4.75 5.75A2.75 2.75 0 0 1 7.5 3h12v15h-12a2.75 2.75 0 0 0-2.75 2.75V5.75Z" />
                                <path d="M4.75 18A2.75 2.75 0 0 1 7.5 15.25h12M9 7h6m-6 3h6" />
                            </svg>
                        </span>
                        <span className="text-base font-bold tracking-tight text-slate-900">Il Santo Grahal</span>
                    </a>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:inline-flex">
                            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            Sempre disponibile offline
                        </span>
                        {isDesktopApp ? (
                            <button
                                type="button"
                                onClick={() => setView("settings")}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4" aria-hidden="true">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.4.36.74.66 1 .3.26.68.4 1.1.4H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.6Z" />
                                </svg>
                                Impostazioni
                            </button>
                        ) : (
                            <Link
                                href="/download/"
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden="true">
                                    <path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 15.5h12" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Download
                            </Link>
                        )}
                    </div>
                </div>
                <div className="mx-auto max-w-6xl px-5 sm:px-8">
                    <nav aria-label="Catalogo" className="flex gap-1 overflow-x-auto pb-2 text-sm font-medium text-slate-600">
                        <span className="rounded-lg px-3 py-2 text-slate-900">Corsi</span>
                        <Link href="/argomenti/" className="rounded-lg px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900">
                            Argomenti
                        </Link>
                        <Link href="/percorsi/" className="rounded-lg px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900">
                            Percorsi guidati
                        </Link>
                        <Link href="/glossario/" className="rounded-lg px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900">
                            Glossario
                        </Link>
                        <Link href="/copertura/" className="rounded-lg px-3 py-2 transition-colors hover:bg-slate-100 hover:text-slate-900">
                            Copertura
                        </Link>
                    </nav>
                </div>
            </header>

            <div id="home" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-12 sm:px-8 sm:pt-20">
                <section className="mb-12 max-w-3xl sm:mb-16" aria-labelledby="welcome-title">
                    <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                        <span className="h-px w-7 bg-blue-600" aria-hidden="true" />
                        LA TUA BIBLIOTECA DI INFORMATICA
                    </p>
                    <h1 id="welcome-title" className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl sm:leading-[1.08]">
                        Impara, esplora,
                        <span className="mt-1 block text-blue-700">costruisci il tuo sapere.</span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                        Guide chiare e pratiche per orientarti nel mondo dell’informatica. Scegli un percorso e inizia da dove vuoi.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <a
                            href="#paths"
                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            Esplora i percorsi
                        </a>
                        <Link
                            href="/argomenti/"
                            className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        >
                            Sfoglia il catalogo
                        </Link>
                        {isDesktopApp ? (
                            <button
                                type="button"
                                onClick={() => setView("settings")}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                                Gestisci aggiornamenti
                            </button>
                        ) : (
                            <Link
                                href="/download/"
                                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                                Scarica l&apos;app
                            </Link>
                        )}
                    </div>
                </section>

                <section id="paths" aria-labelledby="paths-title">
                    <div className="mb-5 flex items-end justify-between gap-4">
                        <div>
                            <h2 id="paths-title" className="text-xl font-bold tracking-tight text-slate-900">Esplora i percorsi</h2>
                            <p className="mt-1 text-sm text-slate-500">Materiale essenziale, sempre a portata di mano.</p>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-slate-500">{sections.length} {sections.length === 1 ? "percorso" : "percorsi"}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sections.map((section) => {
                            const firstPage = getSortedPages(section)[0];
                            if (!firstPage) {
                                return null;
                            }
                            return (
                                <SectionCard
                                    key={section.id}
                                    section={section}
                                    href={`/documenti/${section.id}/${firstPage.id}/`}
                                />
                            );
                        })}
                    </div>
                </section>
            </div>

            <footer className="border-t border-slate-200/80 bg-white/60">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-center text-xs text-slate-500 sm:flex-row sm:px-8 sm:text-left">
                    <p>Una piccola guida per grandi idee.</p>
                    <p>Funziona offline <span aria-hidden="true">·</span> Realizzato con Tauri e Next.js</p>
                </div>
            </footer>

            {/* Il banner esiste solo nel webview Tauri */}
            {isDesktopApp && <UpdateBanner onOpenSettings={() => setView("settings")} />}
        </main>
    );
}
