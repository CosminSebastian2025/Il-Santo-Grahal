// Tipi condivisi del catalogo: categorie, schede argomento, percorsi, glossario.

export const CATEGORY_IDS = [
	"linguaggi",
	"fondamenti",
	"web-frontend",
	"backend",
	"mobile",
	"desktop",
	"database",
	"api",
	"sistemi-operativi",
	"networking",
	"cybersecurity",
	"devops",
	"server-proxy",
	"cloud",
	"ai-data",
	"game-grafica",
	"automazione",
	"formati",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export const TOPIC_TYPES = [
	"linguaggio",
	"framework-libreria",
	"strumento",
	"protocollo",
	"tecnologia",
	"concetto-teoria",
	"server-proxy",
	"piattaforma",
	"standard-formato",
	"disciplina",
	"architettura",
	"servizio-cloud",
	"sistema-operativo",
	"database-orm",
	"pratica-metodologia",
	"api-interfaccia",
	"ambiente-runtime",
	"vulnerabilita",
	"normativa",
	"hardware",
	"applicazione",
] as const;

export type TopicType = (typeof TOPIC_TYPES)[number];

export type CoverageStatus = "presente" | "parziale" | "assente";
export type Difficulty = "base" | "intermedio" | "avanzato";

export interface Category {
	id: CategoryId;
	slug: CategoryId;
	title: string;
	order: number;
	description: string;
}

export interface Topic {
	id: string;
	title: string;
	slug: string;
	/** Nomi originali dell'inventario, mantenuti per tracciabilità. */
	legacyNames: string[];
	primaryCategory: CategoryId;
	secondaryCategories: CategoryId[];
	type: TopicType;
	difficulty: Difficulty;
	coverageStatus: CoverageStatus;
	publicationStatus: "published";
	summary: string;
	/** Dipendenze editoriali in testo libero, come dichiarate nell'audit. */
	prerequisites: string[];
	/** Id delle schede correlate, risolti quando il nome è nell'inventario. */
	relatedTopics: string[];
	problems: string;
	evidence: string;
	lastReviewed: string;
	/** Minuti stimati delle lezioni dedicate, quando esistono. */
	estimatedMinutes?: number;
}

export interface TopicLesson {
	slug: string;
	title: string;
	description: string;
	filePath: string;
	estimatedMinutes: number;
}

/** Versione compatta usata dalla ricerca client-side e dalle card. */
export type TopicSummary = Pick<
	Topic,
	| "id"
	| "title"
	| "slug"
	| "summary"
	| "primaryCategory"
	| "secondaryCategories"
	| "type"
	| "difficulty"
	| "coverageStatus"
	| "legacyNames"
>;

export interface ContentLink {
	sectionId: string;
	pageId?: string;
	label: string;
}

export interface LearningPathModule {
	id: string;
	title: string;
	description: string;
	topicIds: string[];
	estimatedMinutes: number;
}

export interface LearningPath {
	id: string;
	title: string;
	slug: string;
	description: string;
	level: Difficulty;
	audience: string;
	estimatedWeeks: number;
	/** Percorso documentale di riferimento in src/lib/sections.ts. */
	sectionId: string;
	modules: LearningPathModule[];
	prerequisites: string[];
	outcomes: string[];
	status: "published";
}

export interface GlossaryTerm {
	term: string;
	slug: string;
	definition: string;
	relatedTopicIds: string[];
}
