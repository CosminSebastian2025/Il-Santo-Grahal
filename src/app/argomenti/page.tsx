import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import CatalogExplorer from "@/components/CatalogExplorer";
import { getCoverageTotals } from "@/content/catalog";

export const metadata: Metadata = {
  title: "Argomenti | Il Santo Grahal",
  description:
    "Esplora il catalogo degli argomenti di informatica, con stato di copertura e collegamenti ai percorsi.",
};

export default function TopicsPage() {
  const totals = getCoverageTotals();

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <header className="mb-8 max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <span className="h-px w-7 bg-blue-600" aria-hidden="true" />
            CATALOGO
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {totals.total} argomenti, una mappa chiara
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Ogni scheda dichiara cosa sappiamo, cosa manca e dove trovarlo. Cerca un
            termine oppure filtra per area, tipo, livello e stato di copertura.
          </p>
          <dl className="mt-6 flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-slate-500">Presenti</dt>
              <dd className="text-lg font-bold text-emerald-700">{totals.presente}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Parziali</dt>
              <dd className="text-lg font-bold text-amber-700">{totals.parziale}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Da scrivere</dt>
              <dd className="text-lg font-bold text-slate-700">{totals.assente}</dd>
            </div>
          </dl>
        </header>

        <CatalogExplorer />
      </div>
      <SiteFooter />
    </main>
  );
}
