"use client";

import { useState } from "react";
import { sections, type Section } from "@/lib/sections";
import SectionCard from "@/components/SectionCard";
import DocViewer from "@/components/DocViewer";

export default function Home() {
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);

    const handleSectionClick = (section: Section) => {
        setSelectedSection(section);
    };

    const handleBack = () => {
        setSelectedSection(null);
    };

    if (selectedSection) {
        return (
            <main className="min-h-screen bg-slate-50">
                <DocViewer section={selectedSection} onBack={handleBack}/>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen flex-col">
            <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
                    <a href="#home" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.8">
                                <path d="M4.75 5.75A2.75 2.75 0 0 1 7.5 3h12v15h-12a2.75 2.75 0 0 0-2.75 2.75V5.75Z" />
                                <path d="M4.75 18A2.75 2.75 0 0 1 7.5 15.25h12M9 7h6m-6 3h6" />
                            </svg>
                        </span>
                        <span className="text-base font-bold tracking-tight text-slate-900">Il Santo Grahal</span>
                    </a>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                        Sempre disponibile offline
                    </span>
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
                </section>

                <section aria-labelledby="paths-title">
                    <div className="mb-5 flex items-end justify-between gap-4">
                        <div>
                            <h2 id="paths-title" className="text-xl font-bold tracking-tight text-slate-900">Esplora i percorsi</h2>
                            <p className="mt-1 text-sm text-slate-500">Materiale essenziale, sempre a portata di mano.</p>
                        </div>
                        <span className="shrink-0 text-sm font-medium text-slate-500">{sections.length} {sections.length === 1 ? "percorso" : "percorsi"}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sections.map((section) => (
                            <SectionCard
                                key={section.id}
                                section={section}
                                onClick={handleSectionClick}
                            />
                        ))}
                    </div>
                </section>
            </div>

            <footer className="border-t border-slate-200/80 bg-white/60">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-center text-xs text-slate-500 sm:flex-row sm:px-8 sm:text-left">
                    <p>Una piccola guida per grandi idee.</p>
                    <p>Funziona offline <span aria-hidden="true">·</span> Realizzato con Tauri e Next.js</p>
                </div>
            </footer>
        </main>
    );
}
