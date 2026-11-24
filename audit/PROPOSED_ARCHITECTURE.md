# Architettura proposta

**Rapporto:** `audit/PROPOSED_ARCHITECTURE.md`
**Fase:** 4 (catalogo centrale) e 5 (architettura futura)
**Vincolo:** documento di progetto revisionato dopo l'implementazione delle Fasi 1–4; le decisioni A1–A6 sono chiuse.
**Data:** 24 novembre 2026
**Revisione:** 24 novembre 2026 (esiti in §13)

---

## 1. Principio guida

Il repository oggi è una **raccolta di corsi**: dieci percorsi, 137 documenti, nessun livello intermedio tra "corso" e "file Markdown". La visione richiede tre cose che oggi mancano:

1. **un'unità minima di conoscenza** (l'argomento) distinta dal documento che lo insegna;
2. **un catalogo** che colleghi argomenti, percorsi, esercizi, progetti, glossario e riferimenti;
3. **una validazione automatica** che impedisca al catalogo di divergere dai contenuti.

La proposta non sostituisce i corsi: aggiunge il livello che li rende una biblioteca.

---

## 2. Il record di catalogo

Ogni argomento diventa una scheda con i campi richiesti. I campi sono raggruppati per responsabilità.

### 2.1 Identità

| Campo | Tipo | Obbligatorio | Esempio | Note |
|---|---|---|---|---|
| `id` | string | sì | `ling-java` | Stabile per sempre; non cambia se cambia il titolo |
| `title` | string | sì | `Java` | Nome leggibile, normalizzato |
| `slug` | string | sì | `java` | URL-safe, unico, senza accenti |
| `aliases` | string[] | no | `["J2SE", "JDK"]` | Per ricerca e import legacy |
| `legacyNames` | string[] | no | `["Typescript"]` | Nomi originali dell'inventario, per tracciabilità |

### 2.2 Classificazione

| Campo | Tipo | Obbligatorio | Esempio | Note |
|---|---|---|---|---|
| `primaryCategory` | CategoryId | sì | `linguaggi` | Una sola, tra le 18 aree |
| `secondaryCategories` | CategoryId[] | no | `["backend", "mobile"]` | Zero o più, senza duplicare la primaria |
| `type` | TopicType | sì | `linguaggio` | Vocabolario controllato (21 valori) |
| `difficulty` | `base` \| `intermedio` \| `avanzato` | sì | `intermedio` | Stima editoriale, non misura psicometrica |
| `tags` | string[] | no | `["jvm", "oop"]` | Liberi ma con linee guida |

### 2.3 Stato: due assi distinti

| Campo | Tipo | Obbligatorio | Esempio | Note |
|---|---|---|---|---|
| `coverageStatus` | `presente` \| `parziale` \| `assente` \| `da-verificare` | sì | `presente` | Fotografia dell'audit; nessuna scheda attuale usa `da-verificare` |
| `publicationStatus` | `draft` \| `review` \| `published` \| `archived` | sì | `published` | Ciclo di vita editoriale |
| `reviewNotes` | string | no | `Aggiornare la lezione a Java 21` | Note editoriali e verifiche tecniche |

Separare i due stati è necessario: un argomento può essere `presente` ma `draft` (bozza di lezione), o `assente` e `published` (scheda enciclopedica senza corso).

### 2.4 Contenuti

| Campo | Tipo | Obbligatorio | Esempio | Note |
|---|---|---|---|---|
| `content` | `ContentRef[]` | no | `[{ kind: "lesson", path: "public/docs/4-Java/lezione_01.MD" }]` | Un argomento può avere più documenti |
| `summary` | string | sì | `Linguaggio a oggetti per la JVM.` | 1–2 frasi, usata nelle card e nella ricerca |
| `estimatedMinutes` | number | sì | `600` | Somma stimata dei contenuti, non del corso intero |
| `lastReviewed` | ISO date | sì | `2026-11-24` | Ultima verifica tecnica |
| `sources` | `Source[]` | no | `[{ title: "Java SE Docs", url: "..." }]` | Fonti esterne e riferimenti |

`ContentRef.kind` ammette: `lesson`, `reference`, `lab`, `exercise`, `project`, `glossary`, `video`. Il percorso è relativo alla radice del repository; nessun URL assoluto.

### 2.5 Relazioni

| Campo | Tipo | Obbligatorio | Esempio | Note |
|---|---|---|---|---|
| `prerequisites` | TopicId[] | no | `["ling-programmazione"]` | Deve essere aciclico |
| `relatedTopics` | TopicId[] | no | `["backend-spring-boot"]` | Simmetrico solo se dichiarato |
| `supersedes` | TopicId[] | no | `["ling-java-8"]` | Per contenuti obsoleti |
| `supersededBy` | TopicId[] | no | `["ling-java-21"]` | Complementare al precedente |

Le relazioni usano **id**, mai percorsi o titoli. Un percorso che cambia cartella non rompe il catalogo.

### 2.6 Esempio completo (illustrativo, non implementato)

```ts
{
  id: "ling-java",
  title: "Java",
  slug: "java",
  aliases: ["J2SE", "JDK"],
  legacyNames: ["Java"],
  primaryCategory: "linguaggi",
  secondaryCategories: ["backend", "database"],
  type: "linguaggio",
  difficulty: "intermedio",
  coverageStatus: "presente",
  publicationStatus: "published",
  summary: "Linguaggio a oggetti per la JVM, con percorso di 30 lezioni.",
  content: [
    { kind: "lesson", path: "public/docs/4-Java/lezione_01.MD" },
    { kind: "lesson", path: "public/docs/4-Java/lezione_02.MD" }
  ],
  estimatedMinutes: 1200,
  lastReviewed: "2026-11-24",
  sources: [{ title: "Java SE Documentation", url: "https://docs.oracle.com/en/java/" }],
  prerequisites: ["fond-programmazione"],
  relatedTopics: ["backend-spring-boot", "db-sql", "ling-kotlin"]
}
```

---

## 3. JSON o TypeScript?

### 3.1 Le tre opzioni

| Criterio | JSON puro | TypeScript | Ibrido (JSON + schema) |
|---|---|---|---|
| Sicurezza dei tipi | Nessuna a compile-time | Completa | Garantita a runtime dalla validazione |
| Refactoring | Manuale | Automatico sull'IDE | Limitato |
| Autocompletamento | No | Sì | Parziale |
| Facilità per non-developer | Alta | Bassa | Media |
| Rischio di refusi | Alto | Basso | Medio-basso |
| Import statico con `output: export` | Sì | Sì | Sì |
| Validazione in CI | Necessaria | Parziale (tipi) + necessaria | Necessaria |
| Merge conflict | Bassi per file piccoli | Possibili su file grandi | Bassi |
| Generazione da CSV/foglio | Naturale | Richiede script | Naturale |

### 3.2 Raccomandazione: TypeScript come fonte, JSON come artefatto

**Raccomando TypeScript** per il catalogo (scelta confermata dall'autore), con queste motivazioni:

1. **Il catalogo è codice strutturale, non dato utente.** Lo mantiene uno sviluppatore, cambia con regole precise e beneficia dei tipi.
2. **Il progetto è già TypeScript end-to-end.** Aggiungere JSON obbligherebbe a introdurre uno schema e un layer di validazione che TypeScript offre gratis.
3. **Gli id e le relazioni sono riferimenti incrociati.** Un tipo `TopicId` union impedisce di scrivere `prerequisiti: ["javaa"]`.
4. **L'export statico importa il catalogo a build-time.** Nessun parsing a runtime, nessun rischio di file mancante nell'app Tauri.
5. **La validazione resta necessaria**, ma si concentra sulle regole che i tipi non coprono: esistenza dei percorsi, aciclicità, unicità, date, fonti.

**Il JSON resta utile per tre artefatti generati**, non per la fonte:

- indice di ricerca (`search-index.json`);
- export del glossario per eventuali strumenti esterni;
- report di validazione (`content-report.json`) usato dalla CI.

### 3.3 Struttura consigliata del catalogo TypeScript

Un unico file da 218 schede sarebbe ingestibile. La proposta è **un file per area**, composti da un indice tipizzato:

```
src/content/
├── types.ts                 # Topic, Category, Path, Exercise, ...
├── categories.ts            # le 18 aree
├── topics/
│   ├── 01-linguaggi.ts
│   ├── 02-fondamenti.ts
│   ├── ...
│   └── 18-formati.ts
├── paths/
│   ├── java-30-giorni.ts
│   └── ...
├── glossary/
│   └── termini.ts
├── references/
│   └── bibliografia.ts
└── index.ts                 # composizione + lookup per id/slug
```

Se in futuro l'autore preferisce modificare JSON, la migrazione è banale: gli stessi tipi diventano uno schema Zod e i file `.ts` diventano `.json`. La scelta non è irreversibile.

---

## 4. Tassonomia come entità, non come stringa

Le 18 aree non devono essere stringhe duplicate in 218 schede. Diventano entità con id, slug, ordine e descrizione.

```ts
type Category = {
  id: string;          // "linguaggi"
  slug: string;        // "linguaggi"
  title: string;       // "Linguaggi di programmazione"
  order: number;       // 1..18
  description: string;
  icon?: string;       // nome icona, non SVG inline
};
```

**Mappa proposta id → area:**

| # | id | Titolo |
|---|---|---|
| 1 | `linguaggi` | Linguaggi di programmazione |
| 2 | `fondamenti` | Fondamenti di informatica |
| 3 | `web-frontend` | Web development e frontend |
| 4 | `backend` | Backend development |
| 5 | `mobile` | Mobile development |
| 6 | `desktop` | Desktop development |
| 7 | `database` | Database e dati |
| 8 | `api` | API e comunicazione |
| 9 | `sistemi-operativi` | Sistemi operativi |
| 10 | `networking` | Networking e telecomunicazioni |
| 11 | `cybersecurity` | Cybersecurity e crittografia |
| 12 | `devops` | DevOps e infrastruttura |
| 13 | `server-proxy` | Server e reverse proxy |
| 14 | `cloud` | Cloud e architetture distribuite |
| 15 | `ai-data` | AI e data science |
| 16 | `game-grafica` | Game development e grafica |
| 17 | `automazione` | Automazione e strumenti |
| 18 | `formati` | Formati e documentazione tecnica |

Il vocabolario dei tipi resta quello consolidato nell'audit (21 valori): `linguaggio`, `framework-libreria`, `strumento`, `protocollo`, `tecnologia`, `concetto-teoria`, `server-proxy`, `piattaforma`, `standard-formato`, `disciplina`, `architettura`, `servizio-cloud`, `sistema-operativo`, `database-orm`, `pratica-metodologia`, `api-interfaccia`, `ambiente-runtime`, `vulnerabilita`, `normativa`, `hardware`, `applicazione`.

---

## 5. Oltre l'argomento: le entità del sistema

### 5.1 Percorso formativo

Un percorso non è una categoria: è una sequenza didattica che attraversa più argomenti.

```ts
type LearningPath = {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: "base" | "intermedio" | "avanzato";
  audience: string;
  estimatedWeeks: number;
  modules: {
    id: string;
    title: string;
    topicIds: string[];
    estimatedMinutes: number;
  }[];
  prerequisites: string[];
  outcomes: string[];
  status: "draft" | "review" | "published";
};
```

I dieci corsi esistenti diventano percorsi; i nuovi argomenti possono esistere come schede senza percorso, oppure essere aggregati in percorsi tematici (es. "Fondamenti di reti in 6 settimane").

### 5.2 Esercizio

```ts
type Exercise = {
  id: string;
  topicId: string;
  type: "quiz" | "coding" | "lab" | "project-step";
  difficulty: "base" | "intermedio" | "avanzato";
  promptPath: string;
  solutionPath?: string;
  estimatedMinutes: number;
  validatedBy?: string;
};
```

Gli esercizi oggi sono dentro i Markdown. La separazione è graduale: prima si registrano i metadati, poi si estrae il contenuto.

### 5.3 Progetto

```ts
type Project = {
  id: string;
  title: string;
  slug: string;
  level: "base" | "intermedio" | "avanzato";
  topicIds: string[];
  briefPath: string;
  requirements: string[];
  rubric: { criterion: string; weight: number }[];
  estimatedHours: number;
};
```

### 5.4 Glossario

```ts
type GlossaryTerm = {
  term: string;
  slug: string;
  definition: string;
  aliases: string[];
  topicIds: string[];
  sources: Source[];
};
```

Il glossario è la prima funzione che rende il prodotto un'enciclopedia: una definizione breve, linkata automaticamente nei documenti.

### 5.5 Riferimento

```ts
type Reference = {
  id: string;
  topicId: string;
  type: "book" | "article" | "spec" | "video" | "course";
  title: string;
  author?: string;
  url?: string;
  accessedAt?: string;
  note?: string;
};
```

### 5.6 Metadati editoriali

Oltre ai campi della scheda, servono metadati di produzione:

- `language`: `it` (i contenuti sono in italiano);
- `license`: da decidere;
- `reviewer`: chi ha verificato;
- `contentVersion`: per la cache e per gli aggiornamenti;
- `changelog`: data + sintesi delle modifiche sostanziali.

---

## 6. Struttura delle cartelle proposta

### 6.1 Obiettivo

Separare nettamente:

1. contenuti didattici;
2. percorsi formativi;
3. esercizi;
4. progetti;
5. glossario;
6. riferimenti;
7. metadati;
8. componenti UI;
9. strumenti di validazione.

### 6.2 Albero target

```
content/                          # contenuti e dati editoriali
├── argomenti/                    # 1. contenuti didattici
│   ├── 01-linguaggi/
│   │   ├── java/
│   │   │   ├── topic.ts          # scheda catalogo
│   │   │   └── lezioni/*.md
│   │   └── ...
│   └── 18-formati/
├── percorsi/                     # 2. percorsi formativi
│   ├── java-30-giorni/
│   │   ├── path.ts
│   │   └── overview.md
│   └── ...
├── esercizi/                     # 3. esercizi
│   ├── java/
│   │   ├── ex-001-quiz.md
│   │   └── ex-002-lab.md
│   └── ...
├── progetti/                     # 4. progetti
│   ├── java-gestionale/
│   │   ├── project.ts
│   │   ├── brief.md
│   │   └── rubric.md
│   └── ...
├── glossario/                    # 5. glossario
│   ├── termine.ts
│   └── ...
├── riferimenti/                  # 6. riferimenti
│   ├── java.ts
│   └── ...
└── meta/                         # 7. metadati trasversali
    ├── categorie.ts
    ├── tipi.ts
    └── licenza.md

src/
├── app/                          # rotte Next.js (export statico)
│   ├── page.tsx
│   ├── argomenti/[slug]/page.tsx
│   ├── percorsi/[slug]/page.tsx
│   ├── glossario/page.tsx
│   └── download/page.tsx
├── components/
│   ├── content/                  # 8. componenti UI di contenuto
│   │   ├── TopicHeader.tsx
│   │   ├── PrerequisiteList.tsx
│   │   ├── RelatedTopics.tsx
│   │   ├── ExerciseBlock.tsx
│   │   ├── GlossaryLink.tsx
│   │   ├── TableOfContents.tsx
│   │   └── SourceList.tsx
│   ├── search/
│   │   ├── SearchDialog.tsx
│   │   └── SearchResult.tsx
│   └── ...
├── content/                      # registry tipizzato (sezione 3.3)
└── lib/
    ├── content/                  # lookup, filtri, relazioni
    │   ├── getTopic.ts
    │   ├── getPath.ts
    │   └── graph.ts
    └── search.ts

scripts/                          # 9. strumenti di validazione
├── validate-content.ts
├── build-search-index.ts
└── check-links.ts
```

### 6.3 Rapporto con i documenti esistenti

I 137 documenti oggi vivono in `public/docs/` e vengono letti a runtime da `DocViewer`. La struttura target li sposta in `content/argomenti/...`. Per non rompere l'app durante la transizione:

- **Fase A (nessuno spostamento):** i documenti restano in `public/docs`; il catalogo usa `contentRef.path` che punta lì; metadata in `content/`.
- **Fase B (dopo approvazione):** i documenti si spostano in `content/argomenti/`; uno script di build copia i file necessari in `out/docs` per l'app Tauri, oppure li importa come stringhe a build-time.
- **Fase C:** `public/docs` diventa un artefatto generato, non la fonte.

La fase A è sufficiente per catalogo, ricerca e routing. Lo spostamento è opzionale e va deciso solo dopo aver visto la fase A funzionante.

---

## 7. Rotte e compatibilità con l'export statico

### 7.1 Rotte proposte

| Rotta | Contenuto | Note |
|---|---|---|
| `/` | Home con percorsi e aree | Esistente, da aggiornare |
| `/argomenti/` | Indice del catalogo con filtri | Nuova |
| `/argomenti/[slug]/` | Scheda argomento + contenuti | Nuova |
| `/percorsi/` | Elenco percorsi | Nuova |
| `/percorsi/[slug]/` | Percorso e moduli | Nuova |
| `/glossario/` | Glossario A–Z | Nuova |
| `/download/` | Download app | Esistente |
| `/impostazioni/` | Solo Tauri, oppure vista in-app | Oggi è stato React, non rotta |

### 7.2 Vincoli tecnici

- `output: "export"` + `trailingSlash: true` → ogni rotta dinamica richiede `generateStaticParams`.
- Nessun server, nessuna ISR, nessuna API route a runtime.
- `basePath` configurabile via `NEXT_PUBLIC_BASE_PATH`: tutti i link devono usare `next/link` e percorsi relativi al basePath.
- La ricerca deve essere **client-side** con indice precompilato.
- In Tauri il webview carica file statici: le rotte con `trailingSlash` funzionano, ma vanno testate con il protocollo asset prima di considerarle stabili.
- La cache Redis/Memory esistente non va toccata; le chiavi vanno versionate se cambia il formato dei documenti.

### 7.3 Ricerca

Proposta: indice JSON generato a build-time con:

- titolo, slug, summary, categoria, tipo, difficoltà;
- titoli delle sezioni (H2/H3) dei documenti;
- alias e termini del glossario;
- testo normalizzato (lowercase, senza accenti) per il match.

Client: `MiniSearch` o `Fuse.js` (~10–20 KB) caricato solo alla prima apertura della ricerca. Nessuna chiamata di rete.

---

## 8. Componenti UI e stato

### 8.1 Componenti di contenuto

| Componente | Responsabilità |
|---|---|
| `TopicHeader` | Titolo, categoria, livello, stato, tempo stimato |
| `PrerequisiteList` | Prerequisiti con link e indicatore "mancante" |
| `RelatedTopics` | Argomenti correlati, divisi per relazione |
| `SourceList` | Fonti con tipo e data di accesso |
| `ExerciseBlock` | Esercizio con difficoltà, tempo e soluzione opzionale |
| `GlossaryLink` | Tooltip con definizione + link al glossario |
| `TableOfContents` | Indice generato dai titoli del documento |
| `Breadcrumb` | Area → argomento → documento |
| `ContentStatusBadge` | `presente` / `parziale` / `assente` con colore coerente |

### 8.2 Navigazione

Oggi la navigazione è stato React senza URL. La proposta introduce rotte reali, mantenendo la home attuale come punto di ingresso:

- card dei percorsi → `/percorsi/[slug]/`;
- card degli argomenti → `/argomenti/[slug]/`;
- documento → `/argomenti/[slug]/[docSlug]/` oppure sezioni nella stessa pagina.

**Attenzione:** il passaggio a rotte reali cambia il comportamento del tasto Indietro e dei deep link. È un miglioramento, ma va testato anche in Tauri.

### 8.3 Ricerca e filtri

Filtri proposti: area, tipo, difficoltà, stato di copertura, presenza di percorso. I filtri devono essere riflessi nell'URL (`?area=networking&stato=assente`) per essere condivisibili, senza richiedere un server.

---

## 9. Validazione automatica

### 9.1 Regole bloccanti (CI)

| Regola | Errore se |
|---|---|
| ID univoco | Due schede hanno lo stesso `id` |
| Slug univoco | Due schede hanno lo stesso `slug` |
| Categoria valida | `primaryCategory` non è tra le 18 |
| Tipo valido | `type` non è nel vocabolario |
| Difficoltà valida | Valore fuori dall'enum |
| Stato valido | Valore fuori dall'enum |
| Percorso esistente | `contentRef.path` non esiste nel repository |
| Riferimento esistente | `prerequisites` o `relatedTopics` puntano a id inesistenti |
| Aciclicità | I prerequisiti formano un ciclo |
| Auto-relazione | Un argomento è prerequisito di sé stesso |
| Data valida | `lastReviewed` non è ISO `YYYY-MM-DD` |
| Tempo positivo | `estimatedMinutes` ≤ 0 |
| Fonte valida | `sources[].url` non è http/https |
| Percorso coerente | Un modulo di percorso cita un argomento inesistente |
| Esercizio orfano | Un esercizio punta a un argomento inesistente |

### 9.2 Regole non bloccanti (warning)

- Argomento senza contenuti (`coverageStatus: assente` e nessun `contentRef`): atteso, ma conteggiato.
- Argomento `presente` senza `lastReviewed` recente (> 12 mesi).
- Argomento senza prerequisiti ma con difficoltà avanzata.
- Argomento senza fonti.
- Percorso con moduli vuoti.
- Glossario con termini duplicati (case-insensitive).
- Link interni rotti nei Markdown.
- Titoli duplicati tra documenti.

### 9.3 Report

`check-content` (implementato come `npm run validate:content`) produce:

- conteggi per area, stato, tipo, difficoltà;
- elenco degli argomenti assenti;
- elenco dei riferimenti rotti;
- copertura dei percorsi;
- differenza tra inventario dichiarato e catalogo.

Questo report sostituisce, in forma automatica, parte di ciò che oggi è stato fatto a mano nell'audit.

---

## 10. Compatibilità con lo stack esistente

| Tecnologia | Compatibilità | Note |
|---|---|---|
| Next.js 16 App Router | Sì | Rotte statiche con `generateStaticParams`; nessuna funzione server |
| React 19 | Sì | Componenti server per le pagine statiche, client per ricerca e viewer |
| TypeScript 5 | Sì | È la ragione della raccomandazione TS |
| Tailwind CSS 4 | Sì | I nuovi componenti usano le stesse convenzioni |
| Tauri 2 | Sì, con test | Contenuti e indice devono essere dentro `out/`; verificare asset protocol e rotte trailing slash |
| Cache Redis/Memory | Sì | Nessuna modifica; eventualmente nuova versione chiave |
| Updater | Sì | Nessuna modifica |
| GitHub Pages | Sì | `basePath` e asset relativi |
| GitHub Actions | Sì | Aggiungere job `validate-content` |

---

## 11. Cosa non propongo

- **Non propongo un CMS o un database.** Il progetto è statico e offline-first; un CMS aggiungerebbe un servizio da mantenere senza benefici per 218 schede.
- **Non propongo di riscrivere i corsi.** I contenuti esistenti restano; cambia il livello di metadati intorno.
- **Non propongo MDX subito.** MDX è utile, ma richiede una pipeline e una migrazione dei 137 file. È una fase successiva, dopo che catalogo e rotte funzionano.
- **Non propongo di eliminare `sections.ts` subito.** Diventa un adapter verso il nuovo catalogo durante la transizione.
- **Non propongo 218 pagine tutte insieme.** Il catalogo può contenere schede `assente` senza contenuto; le pagine pubblicate crescono nel tempo.

---

## 12. Rischi architetturali

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Doppia fonte di verità (frontmatter + catalogo) | Alta | Alto | Scegliere una fonte: catalogo TS ora, frontmatter in fase B |
| Spostamento documenti rompe path e cache | Media | Alto | Fase A senza spostamenti; versionare le chiavi cache |
| Rotte statiche non funzionano in Tauri | Media | Alto | Test esplicito in webview prima del rilascio |
| Catalogo troppo grande in un file | Alta | Medio | Un file per area + indice |
| Ricerca lenta su 37.000 righe | Bassa | Medio | Indice precompilato, caricamento lazy |
| Metadati non aggiornati | Alta | Medio | `lastReviewed` + report warning in CI |
| Perdita di URL dopo rinomina slug | Media | Alto | Slug immutabili; redirect espliciti se necessario |

---

## 13. Decisioni e revisione del piano

### 13.1 Decisioni finali (revisione del 24 novembre 2026)

Le decisioni A2–A6 sono state chiuse dopo l'implementazione delle Fasi 1–4. Restano reversibili, ma non sono più un blocco per il piano.

| ID | Decisione | Esito | Motivazione | Quando rivederla |
|---|---|---|---|---|
| **A1** | Catalogo in TypeScript o JSON? | **TypeScript** (deciso dall'autore) | Tipi condivisi con le rotte, nessun runtime di validazione aggiuntivo | Se servisse un catalogo editabile da non sviluppatori |
| **A2** | Documenti in `public/docs` o `content/`? | **Restano in `public/docs`** per i primi 90 giorni (Fase A) | Il fetch statico, la cache `doc:v2` e l'asset protocol di Tauri funzionano già; spostare 137 file invaliderebbe cache e URL senza un beneficio concreto finché non esiste una pipeline di frontmatter/MDX | Solo se si adotta A5 o se serve co-locare metadati e Markdown (Fase 7) |
| **A3** | Rotte reali o stato React? | **Rotte reali**, implementate | Deep link, URL condivisibili e 374 pagine statiche generate; `/documenti/[section]/[page]/` sostituisce la navigazione a stato per i documenti | Se Tauri webview mostrasse problemi con le rotte (test ancora da fare) |
| **A4** | Ricerca client-side con indice precompilato? | **Sì**, implementata | `search-index.json` con 218 voci (85 KB su disco), filtri per area/tipo/livello/stato, nessuna chiamata di rete; il validatore controlla che l'indice resti sincronizzato con il catalogo | Se servisse ricerca full-text nei documenti: indice più ricco a build-time, mai un server |
| **A5** | MDX subito o dopo? | **Rinviato** | I 137 documenti sono Markdown e `react-markdown` copre il fabbisogno attuale; MDX richiede pipeline, migrazione e test, senza un caso d'uso approvato | Quando servono componenti interattivi nelle lezioni o frontmatter generato automaticamente; è il prerequisito della Fase 7 |
| **A6** | Glossario nuova fonte o derivato dai documenti? | **Nuova fonte**, implementata | `src/content/glossary.ts` con 55 termini e `relatedTopicIds`; definizioni brevi, nessuna estrazione automatica che produrrebbe rumore | Se il glossario supera ~120 voci o servono pagine dedicate per termine |

Note operative:

- **A2 + A5 sono accoppiate:** `content/` diventa sensato solo con una pipeline che legga i Markdown a build-time (MDX o frontmatter). Fino ad allora `public/docs` è la fonte dei contenuti e `src/content/` contiene solo metadati.
- **A3 è verificata sul web**, non ancora nella webview Tauri: il test in app resta un gate della Settimana 9, non una decisione aperta.
- **A4 è vincolata al generatore:** `npm run catalog:generate` produce sia le schede sia `search-index.json`; `npm run validate:content` fallisce se l'indice è vecchio.
- **A6 non introduce pagine `/glossario/[slug]/`:** i collegamenti usano anchor e rimandi alle schede; la pagina dedicata resta opzionale.

### 13.2 Stato di attuazione del piano

| Fase | Stato al 24 novembre 2026 | Note |
|---|---|---|
| 0 — Baseline e decisioni | **Completata** | A1–A6 chiuse; resta la decisione dell'autore sul consolidamento del working tree |
| 1 — Catalogo | **Completata** | 218 schede in `src/content/topics/`; validatore in `scripts/validate-content.mjs` (Node ESM, nessuna dipendenza nuova) |
| 2 — Rotte | **Completata** | `/argomenti/`, schede, `/documenti/[section]/[page]/`; `DocViewer` esteso con `onPageSelect` |
| 3 — Percorsi | **Completata con scope ridotto** | 10 percorsi curati; collegamento documento↔argomento a livello di corso (12 schede); mappatura lezione→argomento rinviata |
| 4 — Ricerca e glossario | **Completata** | Ricerca client-side e 55 termini; generazione indice dentro `catalog:generate` |
| 5 — Esercizi e progetti | **Non avviata** | Opzionale |
| 6 — Riferimenti e metadati | **Non avviata** | Le schede hanno `lastReviewed`; mancano le fonti |
| 7 — Spostamento in `content/` | **Rinviata** | Dipende da A2/A5; fuori dai primi 90 giorni |
| 8 — Contenuti P0/P1 | **Non avviata** | Lavoro editoriale, può partire dal catalogo attuale |

### 13.3 Revisione dei rischi

- **Doppia fonte di verità:** il rischio è ridotto perché i metadati restano nel catalogo TS e i documenti in `public/docs`; il frontmatter non esiste. Resta valido il divieto di introdurlo prima della Fase 7.
- **Rotte in Tauri:** non è più un rischio di design, ma un test da eseguire. La build statica include `docs/` e tutte le rotte con trailing slash.
- **Ricerca lenta:** il target di 500 KB è rispettato (85 KB su disco); l'indice contiene solo titolo, sintesi, categorie, tipo, livello e stato.
- **Catalogo divergente dal CSV:** mitigato da `catalog:generate` e `validate:content`, che confrontano conteggi e riferimenti.

---

## 14. Collegamenti

- Stato attuale del repository: `audit/REPOSITORY_AUDIT.md`
- Dati del catalogo: `audit/CONTENT_INVENTORY.csv`
- Priorità: `audit/MISSING_TOPICS.md`
- Ambiguità risolte e normalizzazioni applicate: `audit/DUPLICATES_AND_AMBIGUITIES.md`
- Sequenza operativa: `audit/MIGRATION_PLAN.md`
- Tempi: `audit/ROADMAP_90_DAYS.md`
