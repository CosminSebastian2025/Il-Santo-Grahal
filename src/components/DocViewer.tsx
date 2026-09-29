"use client";

import { useEffect, useState } from "react";
import { Section, SubSection, getSortedPages } from "@/lib/sections";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github.css";
import SectionBar from "@/components/SectionBar";

interface DocViewerProps {
    section: Section;
    initialPage?: SubSection;
    onBack: () => void;
}

export default function DocViewer({ section, initialPage, onBack }: DocViewerProps) {
    const [currentpage, setCurrentPage] = useState<SubSection | null>(initialPage || getSortedPages(section)[0]);
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");

    useEffect(() => {
        async function loadDoc() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(currentpage?.filePath || section.filePath);

                if (!response.ok) {
                    throw new Error(`File non trovato: ${currentpage?.filePath || section.filePath}`);
                }

                const text = await response.text();
                setContent(text);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Errore nel caricamento"
                );
            } finally {
                setLoading(false);
            }
        }

        loadDoc();
    }, [currentpage?.filePath]);

    const handlePage = (subsection: SubSection) => {
        setCurrentPage(subsection)
    }

    return (
        <div className="flex h-screen bg-white">
            {/* Sidebar */}
            <SectionBar
                section={section}
                currentSubSectionPath={currentpage?.filePath}
                onPageSelect={handlePage}
            />

            {/* Contenuto principale */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
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
                            <p className="text-sm text-gray-500">{currentpage?.title}</p>
                        </div>
                    </div>
                </header>

                {/* Contenuto scrollabile */}
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

                        {content && (
                            <article className="prose prose-lg max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
                                >
                                    {content}
                                </ReactMarkdown>
                            </article>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}