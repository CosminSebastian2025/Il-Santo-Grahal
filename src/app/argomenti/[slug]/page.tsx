import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import {
  categoriesById,
  getDocumentLinks,
  getRelatedTopics,
  getTopicBySlug,
  topics,
} from "@/content/catalog";
import {
  COVERAGE_LABELS,
  COVERAGE_STYLES,
  DIFFICULTY_LABELS,
  TYPE_LABELS,
} from "@/content/labels";
import { getTopicLessonMinutes, getTopicLessons } from "@/content/topic-docs";

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return topics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({
  params,
}: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) {
    return { title: "Argomento non trovato | Il Santo Grahal" };
  }
  return {
    title: `${topic.title} | Il Santo Grahal`,
    description: topic.summary,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) {
    notFound();
  }

  const category = categoriesById.get(topic.primaryCategory);
  const related = getRelatedTopics(topic);
  const docLinks = getDocumentLinks(topic.id);
  const lessons = getTopicLessons(topic.id);
  const lessonMinutes = getTopicLessonMinutes(topic.id);
  const secondary = topic.secondaryCategories
    .map((id) => categoriesById.get(id))
    .filter((item) => item !== undefined);
  const showEvidence = topic.evidence !== "" && topic.evidence !== topic.summary;

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <nav aria-label="Percorso di navigazione" className="mb-6 text-sm">
          <Link
            href="/argomenti/"
            className="font-semibold text-blue-700 hover:text-blue-900"
          >
            ← Torna al catalogo
          </Link>
        </nav>

        <article>
          <header className="border-b border-slate-200 pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${COVERAGE_STYLES[topic.coverageStatus]}`}
              >
                {COVERAGE_LABELS[topic.coverageStatus]}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                {TYPE_LABELS[topic.type]}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Livello {DIFFICULTY_LABELS[topic.difficulty].toLowerCase()}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {topic.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">{topic.summary}</p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {category && (
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-800">
                  {category.title}
                </span>
              )}
              {secondary.map((item) => (
                <span
                  key={item.id}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600"
                >
                  {item.title}
                </span>
              ))}
            </div>
          </header>

          <div className="grid gap-8 py-8 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-8">
              {lessons.length > 0 && (
                <section aria-labelledby="lezioni-title">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id="lezioni-title" className="text-lg font-bold text-slate-900">
                      Lezioni
                    </h2>
                    <p className="text-xs font-medium text-slate-400">
                      {lessons.length} lezioni · {lessonMinutes} minuti
                    </p>
                  </div>
                  <ol className="mt-3 space-y-2">
                    {lessons.map((lesson, index) => (
                      <li key={lesson.slug}>
                        <Link
                          href={`/argomenti/${topic.slug}/${lesson.slug}/`}
                          className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                        >
                          <span className="mt-0.5 font-mono text-xs font-semibold text-slate-400">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-900">
                              {lesson.title}
                            </span>
                            <span className="mt-0.5 block text-sm leading-6 text-slate-600">
                              {lesson.description}
                            </span>
                            <span className="mt-1 block text-xs text-slate-400">
                              {lesson.estimatedMinutes} minuti
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <section aria-labelledby="stato-title">
                <h2 id="stato-title" className="text-lg font-bold text-slate-900">
                  Stato nel repository
                </h2>
                <div className="mt-3 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
                  {showEvidence && (
                    <p>
                      <span className="font-semibold text-slate-800">Cosa c&apos;è: </span>
                      {topic.evidence}
                    </p>
                  )}
                  {topic.problems && (
                    <p>
                      <span className="font-semibold text-slate-800">Cosa manca: </span>
                      {topic.problems}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Ultima revisione: {topic.lastReviewed}
                  </p>
                </div>
              </section>

              {topic.prerequisites.length > 0 && (
                <section aria-labelledby="prerequisiti-title">
                  <h2 id="prerequisiti-title" className="text-lg font-bold text-slate-900">
                    Prerequisiti
                  </h2>
                  <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm leading-6 text-slate-600">
                    {topic.prerequisites.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {related.length > 0 && (
                <section aria-labelledby="correlati-title">
                  <h2 id="correlati-title" className="text-lg font-bold text-slate-900">
                    Argomenti correlati
                  </h2>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {related.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={`/argomenti/${item.slug}/`}
                          className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-800"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <section
                aria-labelledby="documenti-title"
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2 id="documenti-title" className="text-sm font-bold text-slate-900">
                  Nei percorsi
                </h2>
                {docLinks.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {docLinks.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="block rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-100"
                        >
                          {link.label}
                          <span className="mt-0.5 block text-xs font-normal text-blue-700">
                            Apri «{link.pageTitle}»
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {lessons.length > 0
                      ? "Nessun corso collegato: le lezioni dedicate sono nella colonna principale."
                      : "Nessun documento dedicato: questo argomento è nella roadmap editoriale."}
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-900">Scheda</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Identificativo</dt>
                    <dd className="font-mono text-xs text-slate-700">{topic.id}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Tipo</dt>
                    <dd className="text-right text-slate-700">{TYPE_LABELS[topic.type]}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Livello</dt>
                    <dd className="text-right text-slate-700">
                      {DIFFICULTY_LABELS[topic.difficulty]}
                    </dd>
                  </div>
                  {lessonMinutes > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Studio stimato</dt>
                      <dd className="text-right text-slate-700">{lessonMinutes} minuti</dd>
                    </div>
                  )}
                </dl>
              </section>
            </aside>
          </div>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
