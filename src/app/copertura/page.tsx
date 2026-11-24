import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getCategoryStats, getCoverageTotals } from "@/content/catalog";
import { glossary } from "@/content/glossary";
import { learningPaths } from "@/content/paths";
import { sections } from "@/lib/sections";

export const metadata: Metadata = {
  title: "Copertura | Il Santo Grahal",
  description:
    "Quanto è coperto il catalogo: argomenti presenti, parziali e ancora da scrivere, area per area.",
};

export default function CoveragePage() {
  const totals = getCoverageTotals();
  const stats = getCategoryStats();
  const totalPages = sections.reduce(
    (total, section) => total + section.pages.length,
    0,
  );
  const percentage = Math.round((totals.presente / totals.total) * 100);

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <header className="mb-10 max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <span className="h-px w-7 bg-blue-600" aria-hidden="true" />
            COPERTURA
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Cosa c&apos;è e cosa manca
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Il catalogo è onesto: distingue ciò che è già documentato, ciò che è
            trattato solo in parte e ciò che è ancora nella roadmap editoriale.
          </p>
        </header>

        <section
          aria-labelledby="sintesi-title"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 id="sintesi-title" className="sr-only">
            Sintesi
          </h2>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-4xl font-bold tracking-tight text-slate-950">
              {percentage}%
              <span className="ml-2 text-base font-medium text-slate-500">
                degli argomenti è presente
              </span>
            </p>
            <p className="text-sm text-slate-500">
              {totals.presente} presenti · {totals.parziale} parziali ·{" "}
              {totals.assente} da scrivere su {totals.total}
            </p>
          </div>
          <div
            className="mt-5 flex h-3 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={`Copertura: ${totals.presente} presenti, ${totals.parziale} parziali, ${totals.assente} da scrivere`}
          >
            <span
              className="bg-emerald-500"
              style={{ width: `${(totals.presente / totals.total) * 100}%` }}
            />
            <span
              className="bg-amber-400"
              style={{ width: `${(totals.parziale / totals.total) * 100}%` }}
            />
            <span
              className="bg-slate-300"
              style={{ width: `${(totals.assente / totals.total) * 100}%` }}
            />
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Guide esistenti</dt>
              <dd className="mt-1 text-xl font-bold text-slate-900">{totalPages}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Corsi</dt>
              <dd className="mt-1 text-xl font-bold text-slate-900">{sections.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Percorsi curati</dt>
              <dd className="mt-1 text-xl font-bold text-slate-900">{learningPaths.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Voci di glossario</dt>
              <dd className="mt-1 text-xl font-bold text-slate-900">{glossary.length}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-10" aria-labelledby="aree-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="aree-title" className="text-xl font-bold text-slate-900">
              Copertura per area
            </h2>
            <Link
              href="/argomenti/"
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              Esplora il catalogo →
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Area
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Totale
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Presenti
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Parziali
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Da scrivere
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Avanzamento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map((stat) => (
                  <tr key={stat.category.id}>
                    <th scope="row" className="px-4 py-3 font-medium text-slate-800">
                      {stat.category.title}
                    </th>
                    <td className="px-4 py-3 text-right text-slate-600">{stat.total}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {stat.presente}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">
                      {stat.parziale}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{stat.assente}</td>
                    <td className="px-4 py-3">
                      <div className="flex h-2 w-full max-w-40 overflow-hidden rounded-full bg-slate-100">
                        <span
                          className="bg-emerald-500"
                          style={{ width: `${(stat.presente / stat.total) * 100}%` }}
                        />
                        <span
                          className="bg-amber-400"
                          style={{ width: `${(stat.parziale / stat.total) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
