"use client";

// Lezione di un argomento: indice laterale, Markdown caricato su richiesta, prev/next.
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDocument } from "@/lib/docs";
import type { TopicLesson } from "@/content/types";
import MarkdownArticle from "@/components/MarkdownArticle";

interface TopicLessonViewProps {
  topicSlug: string;
  topicTitle: string;
  categoryTitle: string;
  lesson: TopicLesson;
  lessons: TopicLesson[];
}

export default function TopicLessonView({
  topicSlug,
  topicTitle,
  categoryTitle,
  lesson,
  lessons,
}: TopicLessonViewProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLesson() {
      try {
        setLoading(true);
        setError("");
        setContent("");
        const text = await loadDocument(lesson.filePath);
        if (!cancelled) setContent(text);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Errore nel caricamento della lezione",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLesson();
    return () => {
      cancelled = true;
    };
  }, [lesson.filePath]);

  const index = lessons.findIndex((item) => item.slug === lesson.slug);
  const previous = index > 0 ? lessons[index - 1] : undefined;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : undefined;

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-8 sm:px-8 sm:pt-10">
      <nav aria-label="Percorso di navigazione" className="mb-6 text-sm">
        <Link
          href="/argomenti/"
          className="font-semibold text-blue-700 hover:text-blue-900"
        >
          Argomenti
        </Link>
        <span className="mx-2 text-slate-400" aria-hidden="true">
          /
        </span>
        <Link
          href={`/argomenti/${topicSlug}/`}
          className="font-semibold text-blue-700 hover:text-blue-900"
        >
          {topicTitle}
        </Link>
        <span className="mx-2 text-slate-400" aria-hidden="true">
          /
        </span>
        <span className="text-slate-500">{lesson.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="Lezioni dell'argomento" className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {categoryTitle}
            </p>
            <ol className="mt-3 space-y-1">
              {lessons.map((item, itemIndex) => {
                const current = item.slug === lesson.slug;
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/argomenti/${topicSlug}/${item.slug}/`}
                      aria-current={current ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm leading-5 transition-colors ${
                        current
                          ? "bg-blue-50 font-semibold text-blue-900"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="mr-1.5 font-mono text-xs text-slate-400">
                        {String(itemIndex + 1).padStart(2, "0")}
                      </span>
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ol>
            <Link
              href={`/argomenti/${topicSlug}/`}
              className="mt-4 block rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-800"
            >
              Torna alla scheda
            </Link>
          </div>
        </aside>

        <div>
          <header className="border-b border-slate-200 pb-6">
            <p className="text-sm font-semibold text-blue-700">{topicTitle}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {lesson.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {lesson.description}
            </p>
            <p className="mt-3 text-xs font-medium text-slate-400">
              Lezione {index + 1} di {lessons.length} · {lesson.estimatedMinutes} minuti
            </p>
          </header>

          <div className="py-8">
            {loading && (
              <p role="status" className="text-sm text-slate-500">
                Caricamento della lezione…
              </p>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <h2 className="font-semibold text-red-900">Lezione non disponibile</h2>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            )}
            {content && <MarkdownArticle content={content} />}
          </div>

          <nav
            aria-label="Lezioni precedente e successiva"
            className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between"
          >
            {previous ? (
              <Link
                href={`/argomenti/${topicSlug}/${previous.slug}/`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-colors hover:border-blue-200"
              >
                <span className="block text-xs text-slate-400">Precedente</span>
                <span className="font-semibold text-slate-800">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/argomenti/${topicSlug}/${next.slug}/`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm transition-colors hover:border-blue-200"
              >
                <span className="block text-xs text-slate-400">Successiva</span>
                <span className="font-semibold text-slate-800">{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
