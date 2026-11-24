import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { getTopicById } from "@/content/catalog";
import { glossary } from "@/content/glossary";

export const metadata: Metadata = {
  title: "Glossario | Il Santo Grahal",
  description:
    "Termini essenziali dell'informatica spiegati in breve e collegati alle schede del catalogo.",
};

export default function GlossaryPage() {
  const sorted = [...glossary].sort((a, b) =>
    a.term.localeCompare(b.term, "it"),
  );
  const groups = new Map<string, typeof sorted>();
  for (const term of sorted) {
    const letter = term.term.charAt(0).toUpperCase();
    const list = groups.get(letter) ?? [];
    list.push(term);
    groups.set(letter, list);
  }
  const letters = [...groups.keys()];

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl flex-1 px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <header className="mb-8 max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <span className="h-px w-7 bg-blue-600" aria-hidden="true" />
            GLOSSARIO
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Le parole che servono
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {glossary.length} termini ricorrenti, con una definizione breve e il rimando
            alle schede del catalogo in cui approfondirli.
          </p>
          <nav aria-label="Indice alfabetico" className="mt-6 flex flex-wrap gap-1.5">
            {letters.map((letter) => (
              <a
                key={letter}
                href={`#lettera-${letter}`}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:text-blue-800"
              >
                {letter}
              </a>
            ))}
          </nav>
        </header>

        <div className="space-y-10">
          {letters.map((letter) => (
            <section
              key={letter}
              id={`lettera-${letter}`}
              aria-labelledby={`titolo-${letter}`}
              className="scroll-mt-24"
            >
              <h2
                id={`titolo-${letter}`}
                className="border-b border-slate-200 pb-2 text-2xl font-bold text-slate-900"
              >
                {letter}
              </h2>
              <dl className="mt-4 space-y-5">
                {groups.get(letter)?.map((term) => (
                  <div key={term.slug}>
                    <dt className="text-base font-bold text-slate-900">{term.term}</dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-600">
                      {term.definition}
                      {term.relatedTopicIds.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-2">
                          {term.relatedTopicIds.map((topicId) => {
                            const topic = getTopicById(topicId);
                            if (!topic) {
                              return null;
                            }
                            return (
                              <Link
                                key={topicId}
                                href={`/argomenti/${topic.slug}/`}
                                className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
                              >
                                {topic.title}
                              </Link>
                            );
                          })}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
