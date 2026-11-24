// Genera src/content/topics/*.ts dal censimento ufficiale (audit/CONTENT_INVENTORY.csv).
// Uso: node scripts/generate-catalog.mjs
import fs from "node:fs";
import path from "node:path";
import { lessonsByTopic } from "../src/content/topic-docs.ts";

const ROOT = process.cwd();
const CSV_PATH = path.join(ROOT, "audit", "CONTENT_INVENTORY.csv");
const OUT_DIR = path.join(ROOT, "src", "content", "topics");
const LAST_REVIEWED = "2026-11-24";

const CATEGORY_META = {
	1: { prefix: "ling", file: "01-linguaggi.ts", exportName: "linguaggi" },
	2: { prefix: "fond", file: "02-fondamenti.ts", exportName: "fondamenti" },
	3: { prefix: "web", file: "03-web-frontend.ts", exportName: "webFrontend" },
	4: { prefix: "backend", file: "04-backend.ts", exportName: "backend" },
	5: { prefix: "mobile", file: "05-mobile.ts", exportName: "mobile" },
	6: { prefix: "desktop", file: "06-desktop.ts", exportName: "desktop" },
	7: { prefix: "db", file: "07-database.ts", exportName: "database" },
	8: { prefix: "com", file: "08-api.ts", exportName: "api" },
	9: { prefix: "os", file: "09-sistemi-operativi.ts", exportName: "sistemiOperativi" },
	10: { prefix: "net", file: "10-networking.ts", exportName: "networking" },
	11: { prefix: "sec", file: "11-cybersecurity.ts", exportName: "cybersecurity" },
	12: { prefix: "devops", file: "12-devops.ts", exportName: "devops" },
	13: { prefix: "srv", file: "13-server-proxy.ts", exportName: "serverProxy" },
	14: { prefix: "cloud", file: "14-cloud.ts", exportName: "cloud" },
	15: { prefix: "ai", file: "15-ai-data.ts", exportName: "aiData" },
	16: { prefix: "game", file: "16-game-grafica.ts", exportName: "gameGrafica" },
	17: { prefix: "auto", file: "17-automazione.ts", exportName: "automazione" },
	18: { prefix: "fmt", file: "18-formati.ts", exportName: "formati" },
};

const CATEGORY_IDS = {
	1: "linguaggi",
	2: "fondamenti",
	3: "web-frontend",
	4: "backend",
	5: "mobile",
	6: "desktop",
	7: "database",
	8: "api",
	9: "sistemi-operativi",
	10: "networking",
	11: "cybersecurity",
	12: "devops",
	13: "server-proxy",
	14: "cloud",
	15: "ai-data",
	16: "game-grafica",
	17: "automazione",
	18: "formati",
};

const TYPE_SLUGS = {
	Linguaggio: "linguaggio",
	"Framework/Libreria": "framework-libreria",
	Strumento: "strumento",
	Protocollo: "protocollo",
	Tecnologia: "tecnologia",
	"Concetto/Teoria": "concetto-teoria",
	"Server/Proxy": "server-proxy",
	Piattaforma: "piattaforma",
	"Standard/Formato": "standard-formato",
	Disciplina: "disciplina",
	Architettura: "architettura",
	"Servizio cloud": "servizio-cloud",
	"Sistema operativo": "sistema-operativo",
	"Database/ORM": "database-orm",
	"Pratica/Metodologia": "pratica-metodologia",
	"API/Interfaccia": "api-interfaccia",
	"Ambiente runtime": "ambiente-runtime",
	Vulnerabilità: "vulnerabilita",
	Normativa: "normativa",
	Hardware: "hardware",
	Applicazione: "applicazione",
};

const STATUS_SLUGS = {
	PRESENTE: "presente",
	PARZIALE: "parziale",
	ASSENTE: "assente",
};

const LEVEL_SLUGS = {
	Base: "base",
	Intermedio: "intermedio",
	Avanzato: "avanzato",
};

function parseCsv(text) {
	const rows = [];
	let field = [];
	let quoted = false;
	let current = "";
	for (let i = 0; i < text.length; i += 1) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					current += '"';
					i += 1;
				} else {
					quoted = false;
				}
			} else {
				current += ch;
			}
		} else if (ch === '"') {
			quoted = true;
		} else if (ch === ",") {
			field.push(current);
			current = "";
		} else if (ch === "\n") {
			field.push(current.replace(/\r$/, ""));
			rows.push(field);
			field = [];
			current = "";
		} else {
			current += ch;
		}
	}
	if (current.length > 0 || field.length > 0) {
		field.push(current.replace(/\r$/, ""));
		rows.push(field);
	}
	const header = rows.shift();
	return rows
		.filter((row) => row.length === header.length && row[0] !== "")
		.map((row) => Object.fromEntries(header.map((key, index) => [key, row[index]])));
}

function slugify(value) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/c\+\+/g, "cpp")
		.replace(/f#/g, "f-sharp")
		.replace(/c#/g, "c-sharp")
		.replace(/\+/g, "-plus")
		.replace(/#/g, "-sharp")
		.replace(/&/g, " e ")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function short(value, max = 190) {
	const text = value.replace(/\s+/g, " ").trim();
	return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function literal(value) {
	return JSON.stringify(value);
}

function objectToTs(value, indent = 2) {
	const pad = " ".repeat(indent);
	const inner = " ".repeat(indent + 2);
	const entries = Object.entries(value).map(([key, item]) => {
		let rendered;
		if (Array.isArray(item)) {
			rendered = item.length === 0 ? "[]" : `[${item.map((entry) => literal(entry)).join(", ")}]`;
		} else if (item && typeof item === "object") {
			rendered = `{ ${Object.entries(item)
				.map(([k, v]) => `${k}: ${literal(v)}`)
				.join(", ")} }`;
		} else if (typeof item === "number") {
			rendered = String(item);
		} else {
			rendered = literal(item);
		}
		return `${inner}${key}: ${rendered},`;
	});
	return `{\n${entries.join("\n")}\n${pad}}`;
}

const raw = fs.readFileSync(CSV_PATH, "utf8").replace(/^\uFEFF/, "");
const rows = parseCsv(raw);

const topics = rows.map((row) => {
	const categoryNumber = Number.parseInt(row.categoria_primaria, 10);
	const meta = CATEGORY_META[categoryNumber];
	if (!meta) {
		throw new Error(`Categoria sconosciuta: ${row.categoria_primaria}`);
	}
	const title = row.nome_normalizzato.trim();
	const slug = slugify(title);
	const secondary = row.categorie_secondarie
		.split("|")
		.map((value) => Number.parseInt(value.trim(), 10))
		.filter((value) => Number.isInteger(value) && value !== categoryNumber)
		.map((value) => CATEGORY_IDS[value])
		.filter(Boolean);

	const type = TYPE_SLUGS[row.tipo_argomento];
	const status = STATUS_SLUGS[row.stato];
	const difficulty = LEVEL_SLUGS[row.livello_stimato];
	if (!type || !status || !difficulty) {
		throw new Error(`Valore non mappato per ${title}: ${row.tipo_argomento}/${row.stato}/${row.livello_stimato}`);
	}

	const evidence = row.evidenza.trim();
	const problems = row.problemi_rilevati.trim();
	let summary;
	if (status === "presente") {
		summary = short(evidence || "Argomento presente nel repository.");
	} else if (status === "parziale") {
		summary = short(problems ? `Parziale: ${problems}` : evidence || "Trattato solo in parte.");
	} else {
		summary = "Argomento dichiarato nell'inventario, non ancora trattato nei contenuti didattici.";
	}

	const prerequisites = row.dipendenze
		.split(";")
		.map((value) => value.trim())
		.filter((value) => value && value.toLowerCase() !== "nessuna");

	const legacyNames = row.nome_originale.trim() === title ? [] : [row.nome_originale.trim()];
	const id = `${meta.prefix}-${slug}`;
	const estimatedMinutes = (lessonsByTopic[id] ?? []).reduce(
		(total, lesson) => total + lesson.estimatedMinutes,
		0,
	);

	return {
		id,
		title,
		slug,
		legacyNames,
		primaryCategory: CATEGORY_IDS[categoryNumber],
		secondaryCategories: secondary,
		type,
		difficulty,
		coverageStatus: status,
		publicationStatus: "published",
		summary,
		prerequisites,
		relatedTopics: [],
		problems,
		evidence,
		lastReviewed: LAST_REVIEWED,
		...(estimatedMinutes > 0 ? { estimatedMinutes } : {}),
		rawRelated: row.argomenti_correlati,
		categoryNumber,
	};
});

const uniqueIds = new Set();
const uniqueSlugs = new Set();
for (const topic of topics) {
	if (uniqueIds.has(topic.id)) throw new Error(`Id duplicato: ${topic.id}`);
	if (uniqueSlugs.has(topic.slug)) throw new Error(`Slug duplicato: ${topic.slug}`);
	uniqueIds.add(topic.id);
	uniqueSlugs.add(topic.slug);
}

const byTitle = new Map();
for (const topic of topics) {
	byTitle.set(topic.title.toLowerCase(), topic.id);
	for (const legacy of topic.legacyNames) {
		byTitle.set(legacy.toLowerCase(), topic.id);
	}
}

for (const topic of topics) {
	const related = topic.rawRelated
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean)
		.map((value) => byTitle.get(value.toLowerCase()))
		.filter((value) => value && value !== topic.id);
	topic.relatedTopics = [...new Set(related)];
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [number, meta] of Object.entries(CATEGORY_META)) {
	const categoryTopics = topics.filter((topic) => topic.categoryNumber === Number(number));
	const body = categoryTopics
		.map((topic) => {
			const clean = Object.fromEntries(
				Object.entries(topic).filter(
					([key]) => key !== "rawRelated" && key !== "categoryNumber"
				)
			);
			return objectToTs(clean);
		})
		.join(",\n  ");
	const file = `// File generato da scripts/generate-catalog.mjs: non modificare a mano.
import type { Topic } from "../types";

export const ${meta.exportName}: Topic[] = [
  ${body}
];
`;
	fs.writeFileSync(path.join(OUT_DIR, meta.file), file, "utf8");
}

const imports = Object.values(CATEGORY_META)
	.map((meta) => `import { ${meta.exportName} } from "./${meta.file.replace(/\.ts$/, "")}";`)
	.join("\n");
const spreads = Object.values(CATEGORY_META).map((meta) => `  ...${meta.exportName},`).join("\n");
const index = `// Indice generato da scripts/generate-catalog.mjs.
import type { Topic } from "../types";
${imports}

export const topics: Topic[] = [
${spreads}
];
`;
fs.writeFileSync(path.join(OUT_DIR, "index.ts"), index, "utf8");

const searchIndex = topics.map((topic) => ({
	id: topic.id,
	title: topic.title,
	slug: topic.slug,
	summary: topic.summary,
	primaryCategory: topic.primaryCategory,
	secondaryCategories: topic.secondaryCategories,
	type: topic.type,
	difficulty: topic.difficulty,
	coverageStatus: topic.coverageStatus,
	legacyNames: topic.legacyNames,
}));
fs.writeFileSync(
	path.join(ROOT, "src", "content", "search-index.json"),
	`${JSON.stringify(searchIndex, null, 2)}\n`,
	"utf8"
);

const counts = topics.reduce((acc, topic) => {
	acc[topic.coverageStatus] = (acc[topic.coverageStatus] ?? 0) + 1;
	return acc;
}, {});
console.log(`Schede generate: ${topics.length}`);
console.log(`Stati: ${JSON.stringify(counts)}`);
console.log(`File scritti in ${path.relative(ROOT, OUT_DIR)}`);
