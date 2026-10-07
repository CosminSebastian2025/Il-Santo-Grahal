import type { Section } from "@/lib/sections";

interface SectionCardProps {
    section: Section;
    onClick: (section: Section) => void;
}

export default function SectionCard({ section, onClick }: SectionCardProps) {
    return (
        <button
            onClick={() => onClick(section)}
            className="group relative flex min-h-56 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            aria-label={`Apri il percorso ${section.title}`}
        >
            <div className="flex w-full items-start justify-between gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold uppercase text-blue-800 ring-1 ring-inset ring-blue-100 transition-colors group-hover:bg-blue-100" aria-hidden="true">
                    {section.icon}
                </span>
                <span className="flex size-9 items-center justify-center rounded-full text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-blue-700" aria-hidden="true">
                    <svg viewBox="0 0 20 20" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7">
                        <path d="M4.5 10h11m-4.5-4.5L15.5 10 11 14.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </span>
            </div>
            <div className="mt-6 flex-1">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-800">
                    {section.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    {section.description}
                </p>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                <span>{section.pages.length} {section.pages.length === 1 ? "guida" : "guide"}</span>
                <span className="text-blue-700">Esplora percorso</span>
            </div>
        </button>
    );
}