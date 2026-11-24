import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { DIFFICULTY_LABELS } from "@/content/labels";
import { learningPaths } from "@/content/paths";
import { getSectionById, getSortedPages } from "@/lib/sections";

export const metadata: Metadata = {
  title: "Percorsi | Il Santo Grahal",
  description:
    "Percorsi di apprendimento ordinati che collegano le guide esistenti e le schede del catalogo.",
};

export default function PathsPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <span className="h-px w-7 bg-blue-600" aria-hidden="true" />
            PERCORSI
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Un ordine consigliato per imparare
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Ogni percorso raggruppa moduli, prerequisiti e risultati attesi. Le guide
            complete restano quelle dei corsi; qui trovi la sequenza e i collegamenti
            alle schede degli argomenti.
          </p>
        </header>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {learningPaths.map((path) => {
            const section = getSectionById(path.sectionId);
            const pages = section ? getSortedPages(section) : [];
            const minutes = path.modules.reduce(
              (total, module) => total + module.estimatedMinutes,
              0,
            );

            return (
              <li key={path.id}>
                <Link
                  href={`/percorsi/${path.slug}/`}
                  className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                      {DIFFICULTY_LABELS[path.level]}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {path.estimatedWeeks} settimane
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-800">
                    {path.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                    {path.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span>
                      {path.modules.length} moduli · {Math.round(minutes / 60)} ore
                    </span>
                    <span>
                      {section ? `${pages.length} guide` : "Solo catalogo"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <SiteFooter />
    </main>
  );
}
