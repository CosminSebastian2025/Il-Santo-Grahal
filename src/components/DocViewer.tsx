"use client";

// Visualizzatore Markdown di un percorso: sidebar, caricamento documento, errori e cache.
import { useEffect, useState } from "react";
import { Section, SubSection, getSortedPages } from "@/lib/sections";
import { loadDocument } from "@/lib/docs";
import { getCacheHealth } from "@/lib/cache";
import MarkdownArticle from "@/components/MarkdownArticle";
import SectionBar from "@/components/SectionBar";

interface DocViewerProps {
    // Percorso aperto, eventuale pagina iniziale, ritorno alla home e cambio pagina via rotta.
    section: Section;
    initialPage?: SubSection;
    onBack: () => void;
    onPageSelect?: (subsection: SubSection) => void;
}

export default function DocViewer({ section, initialPage, onBack, onPageSelect }: DocViewerProps) {
    // Pagina corrente: quella richiesta oppure la prima del percorso.
    const [currentPage, setCurrentPage] = useState<SubSection | null>(initialPage || getSortedPages(section)[0]);
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");

    // File da caricare: pagina selezionata o documento unico del percorso.
    const filePath = currentPage?.filePath || section.filePath;

    // Carica il Markdown a ogni cambio pagina, ignorando risposte obsolete.
    useEffect(() => {
        let cancelled = false;

        async function loadDoc() {
            try {
                setLoading(true);
                setError("");
                setContent("");

                const text = await loadDocument(filePath);

                if (!cancelled) {
                    setContent(text);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error ? err.message : "Errore nel caricamento"
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadDoc();

        return () => {
            // Evita aggiornamenti di stato dopo lo smontaggio.
            cancelled = true;
        };
    }, [filePath]);

    // In sviluppo stampa lo stato del backend cache (Redis o memoria).
    useEffect(() => {
        if (process.env.NODE_ENV !== "development") {
            return;
        }

        void getCacheHealth().then((health) => {
            if (health) {
                console.info(`[cache] backend: ${health.backend}`, health);
            }
        });
    }, []);

    // Cambia la pagina mostrata: rotta dedicata se il chiamante la gestisce.
    const handlePage = (subsection: SubSection) => {
        if (onPageSelect) {
            onPageSelect(subsection);
            return;
        }
        setCurrentPage(subsection)
    }

    return (
        <div className="flex h-full bg-white">
            {/* Barra laterale con gli argomenti del percorso */}
            <SectionBar
                section={section}
                currentSubSectionPath={currentPage?.filePath}
                onPageSelect={handlePage}
            />

            {/* Contenuto principale */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Intestazione con pulsante Home e titolo del percorso */}
                <header className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
                    >
                        <span>←</span>
                        <span>Home</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{section.icon}</span>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">
                                {section.title}
                            </h1>
                            <p className="text-sm text-gray-500">{currentPage?.title}</p>
                        </div>
                    </div>
                    
                    <div>
                    
                    </div>
                </header>

                {/* Area scrollabile: caricamento, errore o Markdown renderizzato */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-8 py-8">
                        {loading && (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-gray-500">Caricamento...</div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                <h2 className="text-lg font-semibold text-red-900 mb-2">
                                    Errore
                                </h2>
                                <p className="text-red-700">{error}</p>
                            </div>
                        )}

                        {content && <MarkdownArticle content={content} />}
                    </div>
                </div>
            </div>
        </div>
    );
}