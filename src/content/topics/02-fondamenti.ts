// File generato da scripts/generate-catalog.mjs: non modificare a mano.
import type { Topic } from "../types";

export const fondamenti: Topic[] = [
  {
    id: "fond-ottimizzazione-codice",
    title: "Ottimizzazione Codice",
    slug: "ottimizzazione-codice",
    legacyNames: [],
    primaryCategory: "fondamenti",
    secondaryCategories: ["linguaggi", "web-frontend"],
    type: "pratica-metodologia",
    difficulty: "avanzato",
    coverageStatus: "parziale",
    publicationStatus: "published",
    summary: "Parziale: Performance applicativa sparsa; manca un metodo su misura, profiling e complessità.",
    prerequisites: ["Algoritmi, profiling"],
    relatedTopics: ["fond-algoritmi"],
    problems: "Performance applicativa sparsa; manca un metodo su misura, profiling e complessità.",
    evidence: "19 occorrenze in 8 documenti",
    lastReviewed: "2026-11-24",
  },
  {
    id: "fond-algoritmi",
    title: "Algoritmi",
    slug: "algoritmi",
    legacyNames: [],
    primaryCategory: "fondamenti",
    secondaryCategories: ["linguaggi"],
    type: "disciplina",
    difficulty: "intermedio",
    coverageStatus: "parziale",
    publicationStatus: "published",
    summary: "Parziale: Solo algoritmi STL e menzioni; mancano complessità, ordinamento, ricerca e strutture dati.",
    prerequisites: ["Strutture dati, complessità"],
    relatedTopics: ["ling-cpp"],
    problems: "Solo algoritmi STL e menzioni; mancano complessità, ordinamento, ricerca e strutture dati.",
    evidence: "14 occorrenze in 6 documenti",
    lastReviewed: "2026-11-24",
  }
];
