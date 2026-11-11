// Barra laterale con l'elenco ordinato degli argomenti di un percorso.
import React from 'react'
import {Section, SubSection, getSortedPages} from "@/lib/sections";

interface SectionBarProps {
    // Percorso corrente, file attivo e callback per cambiare pagina.
    section: Section;
    currentSubSectionPath?: string;
    onPageSelect: (subSection: SubSection) => void;
}

function SectionBar({ section, currentSubSectionPath, onPageSelect }: SectionBarProps) {
    // Le pagine vengono ordinate secondo il manifest del percorso.
    const pages = getSortedPages(section);

    return (
        <aside className="w-64 border-r border-gray-200 bg-gray-50 h-full overflow-y-auto">
            <div className="p-4">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Argomenti
                </h2>
                <nav className="space-y-1">
                    {
                        pages.map((page) => {
                        // Evidenzia la pagina attualmente aperta.
                        const isActive = page.filePath === currentSubSectionPath;

                        return (
                            <button
                                key={page.id}
                                onClick={() => onPageSelect(page)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                    isActive
                                        ? "bg-blue-100 text-blue-900 font-medium"
                                        : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                <span className="block font-medium">{page.title}</span>
                                {page.description && (
                                    <span className="block text-xs text-gray-500 mt-0.5">
                                        {page.description}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>
        </aside>
    )
}

export default SectionBar
