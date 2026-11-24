// Etichette italiane condivise da filtri, badge e pagine del catalogo.
import type {
  CoverageStatus,
  Difficulty,
  TopicType,
} from "@/content/types";

export const TYPE_LABELS: Record<TopicType, string> = {
  linguaggio: "Linguaggio",
  "framework-libreria": "Framework o libreria",
  strumento: "Strumento",
  protocollo: "Protocollo",
  tecnologia: "Tecnologia",
  "concetto-teoria": "Concetto o teoria",
  "server-proxy": "Server o proxy",
  piattaforma: "Piattaforma",
  "standard-formato": "Standard o formato",
  disciplina: "Disciplina",
  architettura: "Architettura",
  "servizio-cloud": "Servizio cloud",
  "sistema-operativo": "Sistema operativo",
  "database-orm": "Database o ORM",
  "pratica-metodologia": "Pratica o metodologia",
  "api-interfaccia": "API o interfaccia",
  "ambiente-runtime": "Ambiente runtime",
  vulnerabilita: "Vulnerabilità",
  normativa: "Normativa",
  hardware: "Hardware",
  applicazione: "Applicazione",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  base: "Base",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
};

export const COVERAGE_LABELS: Record<CoverageStatus, string> = {
  presente: "Presente",
  parziale: "Parziale",
  assente: "Da scrivere",
};

export const COVERAGE_STYLES: Record<CoverageStatus, string> = {
  presente: "border-emerald-200 bg-emerald-50 text-emerald-800",
  parziale: "border-amber-200 bg-amber-50 text-amber-800",
  assente: "border-slate-200 bg-slate-50 text-slate-600",
};
