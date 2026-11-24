// Collegamenti tra le schede del catalogo e i percorsi didattici esistenti.
// Gli id dei percorsi sono quelli di src/lib/sections.ts.
import type { ContentLink } from "./types";

export const docLinksByTopic: Record<string, ContentLink[]> = {
  "ling-c": [{ sectionId: "c", label: "Percorso C" }],
  "ling-cpp": [{ sectionId: "cpp", label: "Percorso C++" }],
  "ling-c-sharp": [{ sectionId: "csharp", label: "Percorso C#" }],
  "ling-java": [{ sectionId: "java", label: "Percorso Java" }],
  "ling-kotlin": [{ sectionId: "kotlin", label: "Percorso Kotlin" }],
  "ling-javascript": [{ sectionId: "javascript", label: "Percorso JavaScript" }],
  "ling-typescript": [
    { sectionId: "javascript", label: "Percorso JavaScript" },
    { sectionId: "react", label: "Percorso React" },
  ],
  "web-react": [{ sectionId: "react", label: "Percorso React" }],
  "mobile-react-native": [{ sectionId: "react-native", label: "Percorso React Native" }],
  "mobile-jetpack-compose": [{ sectionId: "compose", label: "Percorso Jetpack Compose" }],
  "mobile-kotlin-multiplatform": [{ sectionId: "kmp", label: "Percorso Kotlin Multiplatform" }],
  "backend-ktor": [
    { sectionId: "kotlin", label: "Percorso Kotlin" },
    { sectionId: "kmp", label: "Percorso Kotlin Multiplatform" },
  ],
};
