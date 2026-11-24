"use client";

// Esploratore del catalogo: ricerca testuale e filtri su categoria, tipo, livello e stato.
import Link from "next/link";
import { useMemo, useState } from "react";
import { categories } from "@/content/categories";
import searchIndexData from "@/content/search-index.json";
import {
  COVERAGE_LABELS,
  COVERAGE_STYLES,
  DIFFICULTY_LABELS,
  TYPE_LABELS,
} from "@/content/labels";
import type {
  CoverageStatus,
  Difficulty,
  TopicSummary,
  TopicType,
} from "@/content/types";

const searchIndex = searchIndexData as TopicSummary[];
const typeOptions = (Object.keys(TYPE_LABELS) as TopicType[]).sort((a, b) =>
  TYPE_LABELS[a].localeCompare(TYPE_LABELS[b], "it"),
);
const difficultyOptions: Difficulty[] = ["base", "intermedio", "avanzato"];
const coverageOptions: CoverageStatus[] = ["presente", "parziale", "assente"];

function matchesQuery(topic: TopicSummary, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  const haystack = [
    topic.title,
    topic.slug,
    topic.summary,
    ...topic.legacyNames,
  ]
    .join(" ")
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export default function CatalogExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("tutte");
  const [type, setType] = useState("tutti");
  const [difficulty, setDifficulty] = useState("tutti");
  const [coverage, setCoverage] = useState("tutti");

  const results = useMemo(() => {
    return searchIndex
      .filter((topic) => matchesQuery(topic, query))
      .filter((topic) =>
        category === "tutte"
          ? true
          : topic.primaryCategory === category ||
            topic.secondaryCategories.includes(category as TopicSummary["primaryCategory"]),
      )
      .filter((topic) => (type === "tutti" ? true : topic.type === type))
      .filter((topic) => (difficulty === "tutti" ? true : topic.difficulty === difficulty))
      .filter((topic) => (coverage === "tutti" ? true : topic.coverageStatus === coverage))
      .sort((a, b) => a.title.localeCompare(b.title, "it"));
  }, [query, category, type, difficulty, coverage]);

  const reset = () => {
    setQuery("");
    setCategory("tutte");
    setType("tutti");
    setDifficulty("tutti");
    setCoverage("tutti");
  };

  const filtersActive =
    query !== "" ||
    category !== "tutte" ||
    type !== "tutti" ||
    difficulty !== "tutti" ||
    coverage !== "tutti";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="catalog-search" className="sr-only">
          Cerca nel catalogo
        </label>
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca un argomento, un linguaggio o uno strumento…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-semibold text-slate-600">
            Area
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="tutte">Tutte le aree</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Tipo
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="tutti">Tutti i tipi</option>
              {typeOptions.map((item) => (
                <option key={item} value={item}>
                  {TYPE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Livello
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="tutti">Tutti i livelli</option>
              {difficultyOptions.map((item) => (
                <option key={item} value={item}>
                  {DIFFICULTY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Stato
            <select
              value={coverage}
              onChange={(event) => setCoverage(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="tutti">Tutti gli stati</option>
              {coverageOptions.map((item) => (
                <option key={item} value={item}>
                  {COVERAGE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p aria-live="polite">
            {results.length} {results.length === 1 ? "argomento" : "argomenti"} su{" "}
            {searchIndex.length}
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={reset}
              className="rounded-lg px-2 py-1 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
            >
              Azzera filtri
            </button>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-800">
            Nessun argomento corrisponde ai filtri.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Prova una parola più breve oppure azzera i filtri.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {results.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`/argomenti/${topic.slug}/`}
                className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-900/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${COVERAGE_STYLES[topic.coverageStatus]}`}
                    >
                      {COVERAGE_LABELS[topic.coverageStatus]}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {DIFFICULTY_LABELS[topic.difficulty]}
                    </span>
                  </div>
                  <h2 className="mt-3 text-base font-bold tracking-tight text-slate-900 group-hover:text-blue-800">
                    {topic.title}
                  </h2>
                  <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-slate-600">
                    {topic.summary}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>{TYPE_LABELS[topic.type]}</span>
                  <span className="font-medium text-blue-700">Apri scheda</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
