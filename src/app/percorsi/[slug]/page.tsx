import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getTopicById } from "@/content/catalog";
import {
  COVERAGE_LABELS,
  COVERAGE_STYLES,
  DIFFICULTY_LABELS,
} from "@/content/labels";
import { getLearningPathBySlug, learningPaths } from "@/content/paths";
import { getSectionById, getSortedPages } from "@/lib/sections";

interface PathPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return learningPaths.map((path) => ({ slug: path.slug }));
}

export async function generateMetadata({
  params,
}: PathPageProps): Promise<Metadata> {
  const { slug } = await params;
  const learningPath = getLearningPathBySlug(slug);
  if (!learningPath) {
    return { title: "Percorso non trovato | Il Santo Grahal" };
  }
  return {
    title: `${learningPath.title} | Il Santo Grahal`,
    description: learningPath.description,
  };
}

export default async function PathPage({ params }: PathPageProps) {
  const { slug } = await params;
  const learningPath = getLearningPathBySlug(slug);
  if (!learningPath) {
    notFound();
  }

  const section = getSectionById(learningPath.sectionId);
  const firstPage = section ? getSortedPages(section)[0] : undefined;
  const totalMinutes = learningPath.modules.reduce(
    (total, module) => total + module.estimatedMinutes,
    0,
  );

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <nav aria-label="Percorso di navigazione" className="mb-6 text-sm">
          <Link
            href="/percorsi/"
            className="font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Tutti i percorsi
          </Link>
        </nav>

        <header className="border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
              Livello {DIFFICULTY_LABELS[learningPath.level].toLowerCase()}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {learningPath.estimatedWeeks} settimane
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {Math.round(totalMinutes / 60)} ore stimate
            </span>
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            {learningPath.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {learningPath.description}
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Per chi: {learningPath.audience}
          </p>

          {section && firstPage && (
            <Link
              href={`/documenti/${section.id}/${firstPage.id}/`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Apri il corso «{section.title}»
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </header>

        <section className="py-8" aria-labelledby="moduli-title">
          <h2 id="moduli-title" className="text-xl font-bold text-slate-900">
            Moduli
          </h2>
          <ol className="mt-5 space-y-4">
            {learningPath.modules.map((module, index) => (
              <li
                key={module.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-800"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {module.title}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {module.estimatedMinutes} min
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {module.description}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {module.topicIds.map((topicId) => {
                        const topic = getTopicById(topicId);
                        if (!topic) {
                          return null;
                        }
                        return (
                          <li key={topicId}>
                            <Link
                              href={`/argomenti/${topic.slug}/`}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80 ${COVERAGE_STYLES[topic.coverageStatus]}`}
                            >
                              {topic.title}
                              <span className="opacity-70">
                                · {COVERAGE_LABELS[topic.coverageStatus]}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="grid gap-6 border-t border-slate-200 py-8 sm:grid-cols-2">
          <section aria-labelledby="prerequisiti-title">
            <h2 id="prerequisiti-title" className="text-lg font-bold text-slate-900">
              Prerequisiti
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm leading-6 text-slate-600">
              {learningPath.prerequisites.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="risultati-title">
            <h2 id="risultati-title" className="text-lg font-bold text-slate-900">
              Al termine saprai
            </h2>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm leading-6 text-slate-600">
              {learningPath.outcomes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
