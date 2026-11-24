// Verifica coerenza del catalogo generato, dei percorsi, del glossario e dei documenti.
// Uso: node --experimental-strip-types scripts/validate-content.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function fail(message) {
	errors.push(message);
}

async function importTs(relativePath) {
	return import(pathToFileURL(path.join(ROOT, relativePath)).href);
}

// Il CSV è la fonte dei conteggi attesi: lo stato può avanzare senza hardcode.
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

function readCsvCoverage() {
	const raw = fs
		.readFileSync(path.join(ROOT, "audit", "CONTENT_INVENTORY.csv"), "utf8")
		.replace(/^\uFEFF/, "");
	const rows = parseCsv(raw);
	const counts = { presente: 0, parziale: 0, assente: 0 };
	for (const row of rows) {
		const status = (row.stato ?? "").trim().toLowerCase();
		if (status in counts) counts[status] += 1;
	}
	return { total: rows.length, counts };
}

const [
	{ sections },
	categoriesModule,
	docLinksModule,
	pathsModule,
	glossaryModule,
	topicDocsModule,
] = await Promise.all([
	importTs("src/lib/sections.ts"),
	importTs("src/content/categories.ts"),
	importTs("src/content/doc-links.ts"),
	importTs("src/content/paths.ts"),
	importTs("src/content/glossary.ts"),
	importTs("src/content/topic-docs.ts"),
]);

const { categories } = categoriesModule;
const { docLinksByTopic } = docLinksModule;
const { learningPaths } = pathsModule;
const { glossary } = glossaryModule;
const { lessonsByTopic } = topicDocsModule;

const topicFiles = fs
	.readdirSync(path.join(ROOT, "src", "content", "topics"))
	.filter((file) => file.endsWith(".ts") && file !== "index.ts")
	.sort();

const topics = [];
for (const file of topicFiles) {
	const loaded = await importTs(`src/content/topics/${file}`);
	const exported = Object.values(loaded).find(Array.isArray);
	if (!exported) {
		fail(`Nessun array esportato da topics/${file}`);
		continue;
	}
	topics.push(...exported);
}

const categoryIds = new Set(categories.map((category) => category.id));
const topicIds = new Set(topics.map((topic) => topic.id));
let docLinkMissing = 0;
const statuses = new Set(["presente", "parziale", "assente"]);
const difficulties = new Set(["base", "intermedio", "avanzato"]);
const types = new Set([
	"linguaggio", "framework-libreria", "strumento", "protocollo", "tecnologia",
	"concetto-teoria", "server-proxy", "piattaforma", "standard-formato", "disciplina",
	"architettura", "servizio-cloud", "sistema-operativo", "database-orm",
	"pratica-metodologia", "api-interfaccia", "ambiente-runtime", "vulnerabilita",
	"normativa", "hardware", "applicazione",
]);

for (const key of ["id", "slug", "title"]) {
	const values = topics.map((topic) => topic[key]);
	const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
	if (duplicates.length > 0) {
		fail(`${key} duplicati: ${[...new Set(duplicates)].join(", ")}`);
	}
}

for (const topic of topics) {
	if (!categoryIds.has(topic.primaryCategory)) {
		fail(`${topic.id}: categoria primaria sconosciuta (${topic.primaryCategory})`);
	}
	for (const secondary of topic.secondaryCategories) {
		if (!categoryIds.has(secondary)) {
			fail(`${topic.id}: categoria secondaria sconosciuta (${secondary})`);
		}
	}
	if (!types.has(topic.type)) fail(`${topic.id}: tipo sconosciuto (${topic.type})`);
	if (!difficulties.has(topic.difficulty)) {
		fail(`${topic.id}: livello sconosciuto (${topic.difficulty})`);
	}
	if (!statuses.has(topic.coverageStatus)) {
		fail(`${topic.id}: stato sconosciuto (${topic.coverageStatus})`);
	}
	if (topic.publicationStatus !== "published") {
		fail(`${topic.id}: publicationStatus inatteso`);
	}
	for (const related of topic.relatedTopics) {
		if (!topicIds.has(related)) {
			fail(`${topic.id}: correlato inesistente (${related})`);
		}
	}
	if (getDocumentLinksForTopic(topic.id).length === 0) {
		// Le schede senza documenti sono ammesse: solo un'informazione di sintesi.
		docLinkMissing += 1;
	}
}

function getDocumentLinksForTopic(topicId) {
	return docLinksByTopic[topicId] ?? [];
}

for (const [topicId, links] of Object.entries(docLinksByTopic)) {
	if (!topicIds.has(topicId)) {
		fail(`doc-links: scheda inesistente (${topicId})`);
		continue;
	}
	for (const link of links) {
		const section = sections.find((candidate) => candidate.id === link.sectionId);
		if (!section) {
			fail(`doc-links ${topicId}: percorso inesistente (${link.sectionId})`);
			continue;
		}
		const page = link.pageId
			? section.pages.find((candidate) => candidate.id === link.pageId)
			: section.pages[0];
		if (!page) {
			fail(`doc-links ${topicId}: pagina inesistente (${link.pageId})`);
			continue;
		}
		const file = path.join(ROOT, "public", decodeURIComponent(page.filePath));
		if (!fs.existsSync(file)) {
			fail(`doc-links ${topicId}: file mancante ${page.filePath}`);
		}
	}
}

const topicsById = new Map(topics.map((topic) => [topic.id, topic]));
let topicsWithLessons = 0;
let topicLessonsTotal = 0;

for (const [topicId, lessons] of Object.entries(lessonsByTopic)) {
	const topic = topicsById.get(topicId);
	if (!topic) {
		fail(`lezioni: scheda inesistente (${topicId})`);
		continue;
	}
	if (!Array.isArray(lessons) || lessons.length === 0) {
		fail(`lezioni ${topicId}: elenco vuoto`);
		continue;
	}
	topicsWithLessons += 1;
	topicLessonsTotal += lessons.length;
	const lessonSlugs = new Set();
	let minutes = 0;

	for (const lesson of lessons) {
		if (!lesson.slug || !/^[a-z0-9-]+$/.test(lesson.slug)) {
			fail(`lezioni ${topicId}: slug non valido (${lesson.slug})`);
		}
		if (lessonSlugs.has(lesson.slug)) {
			fail(`lezioni ${topicId}: slug duplicato (${lesson.slug})`);
		}
		lessonSlugs.add(lesson.slug);
		if (!lesson.title || !lesson.description) {
			fail(`lezioni ${topicId}/${lesson.slug}: titolo o descrizione mancante`);
		}
		if (!Number.isInteger(lesson.estimatedMinutes) || lesson.estimatedMinutes <= 0) {
			fail(`lezioni ${topicId}/${lesson.slug}: minuti non validi`);
		}
		minutes += lesson.estimatedMinutes;
		if (!lesson.filePath.startsWith("/docs/")) {
			fail(`lezioni ${topicId}/${lesson.slug}: percorso fuori da /docs/`);
			continue;
		}
		const file = path.join(ROOT, "public", decodeURIComponent(lesson.filePath));
		if (!fs.existsSync(file)) {
			fail(`lezioni ${topicId}/${lesson.slug}: file mancante ${lesson.filePath}`);
		}
	}

	if (topic.estimatedMinutes !== minutes) {
		fail(`lezioni ${topicId}: minuti in catalogo ${topic.estimatedMinutes}, attesi ${minutes}`);
	}

	const glossaryLinks = glossary.filter((term) =>
		term.relatedTopicIds.includes(topicId),
	).length;
	if (glossaryLinks < 3) {
		fail(`lezioni ${topicId}: ${glossaryLinks} termini di glossario collegati (minimo 3)`);
	}

	const pathLinks = learningPaths.filter((learningPath) =>
		learningPath.modules.some((module) => module.topicIds.includes(topicId)),
	).length;
	if (pathLinks === 0) {
		fail(`lezioni ${topicId}: nessun percorso collega l'argomento`);
	}
}

const pathSlugs = new Set();
for (const learningPath of learningPaths) {
	if (pathSlugs.has(learningPath.slug)) {
		fail(`percorso: slug duplicato (${learningPath.slug})`);
	}
	pathSlugs.add(learningPath.slug);
	if (!sections.some((section) => section.id === learningPath.sectionId)) {
		fail(`${learningPath.slug}: sezione inesistente (${learningPath.sectionId})`);
	}
	if (learningPath.modules.length === 0) {
		fail(`${learningPath.slug}: nessun modulo`);
	}
	const moduleIds = new Set();
	for (const entry of learningPath.modules) {
		if (moduleIds.has(entry.id)) fail(`${learningPath.slug}: modulo duplicato (${entry.id})`);
		moduleIds.add(entry.id);
		if (entry.topicIds.length === 0) {
			warnings.push(`${learningPath.slug}/${entry.id}: modulo senza argomenti`);
		}
		for (const topicId of entry.topicIds) {
			if (!topicIds.has(topicId)) {
				fail(`${learningPath.slug}/${entry.id}: argomento inesistente (${topicId})`);
			}
		}
	}
}

const glossarySlugs = new Set();
for (const term of glossary) {
	if (glossarySlugs.has(term.slug)) {
		fail(`glossario: slug duplicato (${term.slug})`);
	}
	glossarySlugs.add(term.slug);
	if (term.relatedTopicIds.length === 0) {
		fail(`glossario ${term.term}: nessuna scheda collegata`);
	}
	for (const topicId of term.relatedTopicIds) {
		if (!topicIds.has(topicId)) {
			fail(`glossario ${term.term}: scheda inesistente (${topicId})`);
		}
	}
}

const searchIndexPath = path.join(ROOT, "src", "content", "search-index.json");
if (!fs.existsSync(searchIndexPath)) {
	fail("search-index.json mancante: eseguire npm run catalog:generate");
} else {
	const searchIndex = JSON.parse(fs.readFileSync(searchIndexPath, "utf8"));
	if (!Array.isArray(searchIndex)) {
		fail("search-index.json non è un array");
	} else if (searchIndex.length !== topics.length) {
		fail(`search-index.json: ${searchIndex.length} voci, attese ${topics.length}`);
	} else {
		const indexById = new Map(searchIndex.map((entry) => [entry.id, entry]));
		for (const topic of topics) {
			const entry = indexById.get(topic.id);
			if (!entry) {
				fail(`search-index.json: manca ${topic.id}`);
				continue;
			}
			for (const key of [
				"title",
				"slug",
				"summary",
				"primaryCategory",
				"type",
				"difficulty",
				"coverageStatus",
			]) {
				if (entry[key] !== topic[key]) {
					fail(`search-index.json: ${topic.id}/${key} non aggiornato`);
				}
			}
		}
	}
}

for (const section of sections) {
	if (section.pages.length === 0) {
		fail(`percorso ${section.id}: nessuna pagina`);
	}
	for (const page of section.pages) {
		const file = path.join(ROOT, "public", decodeURIComponent(page.filePath));
		if (!fs.existsSync(file)) {
			fail(`manifest ${section.id}/${page.id}: file mancante ${page.filePath}`);
		}
	}
}

const coverage = topics.reduce(
	(acc, topic) => {
		acc[topic.coverageStatus] = (acc[topic.coverageStatus] ?? 0) + 1;
		return acc;
	},
	{ presente: 0, parziale: 0, assente: 0 },
);

const csvCoverage = readCsvCoverage();
if (topics.length !== csvCoverage.total) {
	fail(`attese ${csvCoverage.total} schede dal CSV, trovate ${topics.length}`);
}
for (const status of Object.keys(csvCoverage.counts)) {
	if (coverage[status] !== csvCoverage.counts[status]) {
		fail(
			`conteggio ${status}: CSV ${csvCoverage.counts[status]}, catalogo ${coverage[status]}`,
		);
	}
}

const totalPages = sections.reduce((total, section) => total + section.pages.length, 0);
const searchIndexBytes = fs.existsSync(searchIndexPath)
	? fs.statSync(searchIndexPath).size
	: 0;
if (searchIndexBytes > 500 * 1024) {
	warnings.push(`search-index.json pesa ${Math.round(searchIndexBytes / 1024)} KB (target < 500 KB)`);
}

const report = {
	generatedAt: new Date().toISOString(),
	topics: topics.length,
	coverage,
	categories: categories.length,
	documentSections: sections.length,
	documentPages: totalPages,
	learningPaths: learningPaths.length,
	glossaryTerms: glossary.length,
	topicsWithDocuments: Object.keys(docLinksByTopic).length,
	topicsWithoutDocuments: docLinkMissing,
	topicsWithLessons,
	topicLessons: topicLessonsTotal,
	searchIndexBytes,
	errors,
	warnings,
};

fs.writeFileSync(
	path.join(ROOT, "src", "content", "content-report.json"),
	`${JSON.stringify(report, null, 2)}\n`,
	"utf8",
);

if (errors.length > 0) {
	console.error(`Validazione fallita: ${errors.length} errori.`);
	for (const error of errors) console.error(`- ${error}`);
	process.exit(1);
}

console.log(
	`Validazione riuscita: ${topics.length} schede (${coverage.presente}/${coverage.parziale}/${coverage.assente}), ` +
		`${learningPaths.length} percorsi, ${glossary.length} termini, ${totalPages} guide.`,
);
for (const warning of warnings) console.warn(`Avviso: ${warning}`);
