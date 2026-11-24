# Il Santo Grahal — Audit del repository

**Data:** 24 novembre 2026
**Ambito:** repository `Il-Santo-Grahal` (working tree, incluse le modifiche non committate)
**Modalità:** sola analisi, nessuna modifica a file preesistenti
**Autore dell'audit:** analisi tecnica su richiesta dell'autore del progetto

---

## 1. Sintesi esecutiva

Il repository contiene una piattaforma editoriale funzionante, costruita con Next.js 16, React 19, TypeScript, Tailwind CSS 4 e Tauri 2, che pubblica **10 percorsi didattici** per un totale di **137 documenti Markdown** e **37.103 righe** di contenuto. La qualità dei percorsi esistenti è buona: struttura uniforme, esempi, output attesi, esercizi progressivi e progetti.

Il confronto con l'inventario dichiarato dall'autore produce però un risultato netto:

| Indicatore | Valore |
|---|---:|
| Voci dichiarate nel messaggio | 209 (indicativo) |
| Voci effettive dopo lo split dell'elenco | **216** |
| Voci ufficiali dopo le decisioni dell'autore | **218** |
| Voci PRESENTI | **13** (6,0%) |
| Voci PARZIALI | **21** (9,6%) |
| Voci ASSENTI | **184** (84,4%) |
| Voci DA VERIFICARE | **0** |
| Voci con almeno un contenuto (presenti + parziali) | **34** (15,6%) |

Le 218 voci derivano da 216 + React + React Native; la voce `js` è stata confermata come **JavaScript** e sostituita, non duplicata.

**Il repository copre bene la programmazione di base e intermedia, ma non è ancora la piattaforma ibrida descritta nella visione.** Mancano quasi integralmente networking, cybersecurity, sistemi operativi, cloud, DevOps, server/reverse proxy, database non relazionali, AI e game development. Il disallineamento tra inventario e repository è stato risolto: **JavaScript, React e React Native sono ora voci esplicite** e risultano tutti `PRESENTE`.

Cinque problemi strutturali sono più urgenti della scrittura di nuovi argomenti:

1. **Nessun catalogo centrale di argomenti**: l'unità di informazione è la pagina del corso, non il topic.
2. **Nessun routing per documento**: la navigazione è gestita con stato React; non esistono URL condivisibili, deep link o tasto Indietro del browser.
3. **Nessuna ricerca**: con 137 documenti e 37.103 righe, non c'è modo di trovare un argomento se non navigando i percorsi.
4. **Nessuna validazione dei contenuti**: link, blocchi di codice, manifest e metadati non sono verificati automaticamente; non esistono test.
5. **README non aggiornato**: descrive ancora il template `create-next-app` e la cache Redis, non i dieci percorsi.

La migrazione non è stata avviata: questo documento e gli altri sette rapporti sono proposte da approvare.

---

## 2. Struttura del repository

```
Il-Santo-Grahal/
├── .github/workflows/       3 workflow (CodeQL, GitHub Pages, release Tauri)
├── audit/                   8 rapporti di audit (nuova cartella, creata da questa analisi)
├── esercizi/1-C/            5 esercizi C in formato .txt
├── public/docs/             137 documenti Markdown in 10 cartelle
│   ├── 1-C/                 12 documenti
│   ├── 2-C++/               31 documenti
│   ├── 3-C#/                13 documenti
│   ├── 4-Java/              31 documenti
│   ├── 5-Kotlin/            9 documenti
│   ├── 6-Compose/           7 documenti
│   ├── 7-KMP/               6 documenti
│   ├── 8-JS/                11 documenti
│   ├── 9-React/             8 documenti
│   └── 10-ReactNative/      9 documenti
├── src/
│   ├── app/                 3 route/componenti di pagina + layout + CSS + immagini
│   ├── components/          6 componenti React
│   ├── hooks/               3 hook
│   └── lib/                 5 moduli (manifest, caricamento documenti, cache, release, preferenze)
├── src-tauri/               3 sorgenti Rust + build.rs, Cargo.toml, tauri.conf.json, capabilities, icone
├── README.md                64 righe (boilerplate + sezione cache)
├── next.config.ts           export statico, basePath, trailingSlash, immagini non ottimizzate
├── package.json             versione 0.4.0, nessuno script di test
├── eslint.config.mjs        ESLint 9
├── postcss.config.mjs       Tailwind CSS 4
└── tsconfig.json            TypeScript 5
```

**Conteggio file non generati:** 209 (esclusi `node_modules`, `.git`, `.next`, `out`, `src-tauri/target`, `.idea`). La coincidenza con il numero dichiarato di argomenti è casuale e non va interpretata come relazione.

---

## 3. Stack e dipendenze

### 3.1 Frontend

| Tecnologia | Versione | Uso |
|---|---|---|
| Next.js | 16.4.6 | App Router, export statico (`output: "export"`) |
| React / React DOM | 19.2.8 | Interfaccia |
| TypeScript | ^5 | Tipizzazione |
| Tailwind CSS | ^4.3.3 | Stili, con `@tailwindcss/postcss` e `@tailwindcss/typography` |
| react-markdown | ^10.1.0 | Rendering Markdown |
| remark-gfm | ^4.0.1 | Tabelle, task list, GFM |
| rehype-highlight | ^7.0.2 | Evidenziazione del codice |
| rehype-raw | ^7.0.0 | HTML grezzo nel Markdown |
| highlight.js | ^11.12.0 | Tema di evidenziazione |
| ESLint | ^9 | Lint, `eslint-config-next` 16.4.6 |

### 3.2 Desktop

| Tecnologia | Versione | Uso |
|---|---|---|
| Tauri | 2.11.3 | Contenitore desktop |
| Rust | edition 2021, rust-version 1.88 | Backend nativo |
| tauri-plugin-log / process / updater | 2 | Log, riavvio, aggiornamenti firmati |
| redis (crate) | 1.8 | Cache opzionale con `tokio-rustls-comp` |
| tokio | 1 | Runtime async |
| serde / serde_json | 1 | Serializzazione |

### 3.3 CI/CD

| Workflow | Trigger | Funzione |
|---|---|---|
| `codeql.yml` | push/PR su `main`, schedule | Analisi CodeQL per Actions, JavaScript/TypeScript, Rust |
| `nextjs.yml` | push su `main`, manuale | Build Next e deploy su GitHub Pages con `NEXT_PUBLIC_BASE_PATH` |
| `release.yml` | tag `v*` | Build Tauri su Linux, Windows, macOS (x86_64 e arm64), release draft, pubblicazione |

**Osservazione:** la CI usa Node 20; l'ambiente locale rilevato usa Node 24. Non è un errore, ma va allineato per evitare differenze di build.

---

## 4. Manifest e navigazione

### 4.1 Manifest

`src/lib/sections.ts` (1.061 righe) è la fonte unica dei percorsi. Definisce:

- `Section`: `id`, `title`, `description`, `icon`, `color`, `filePath`, `pages`.
- `SubSection`: `id`, `title`, `description`, `icon`, `filePath`, `order`.
- Helper: `getSectionById`, `getSubSectionById`, `getSortedPages`.

Le 10 sezioni e le 137 pagine registrate corrispondono esattamente ai 137 file presenti in `public/docs` (una pagina per file):

| Sezione | ID | Pagine | Documenti | Righe |
|---|---|---:|---:|---:|
| Imparare il C | `c` | 12 | 12 | 2.073 |
| Imparare il C++ | `cpp` | 31 | 31 | 4.637 |
| Imparare il C# | `csharp` | 13 | 13 | 2.942 |
| Imparare Java | `java` | 31 | 31 | 8.640 |
| Imparare Kotlin | `kotlin` | 9 | 9 | 2.954 |
| Imparare Jetpack Compose | `compose` | 7 | 7 | 3.832 |
| Imparare Kotlin Multiplatform | `kmp` | 6 | 6 | 3.154 |
| Imparare JavaScript | `javascript` | 11 | 11 | 2.890 |
| Imparare React | `react` | 8 | 8 | 2.691 |
| Imparare React Native | `react-native` | 9 | 9 | 3.290 |
| **Totale** | | **137** | **137** | **37.103** |

Il percorso Java genera 30 pagine lezione da un array (`javaLessons`) più l'introduzione: il manifest è quindi in parte programmatico e in parte dichiarativo.

### 4.2 Navigazione

La navigazione è **interamente a stato React** in `src/app/page.tsx`:

- home → clic su una card → `DocViewer` con la sezione selezionata;
- dentro `DocViewer` → cambio pagina con `useState`, senza cambiare URL;
- impostazioni desktop → sostituzione della vista, senza rotta;
- unica rotta secondaria: `/download/`.

Conseguenze:

- **Nessun deep link** a una lezione o a un argomento.
- **Nessun URL condivisibile** (importante per una biblioteca/enciclopedia).
- **Tasto Indietro del browser** non riporta alla home: esce dal sito.
- **SEO assente** per i contenuti: i motori vedono solo la home e la pagina download.
- **Nessuna cronologia** interna o stato di avanzamento.

Per la visione "enciclopedia tecnica" questo è il debito architetturale più costoso da sanare.

---

## 5. Contenuti esistenti

### 5.1 Quadro per corso

| Corso | Struttura | Punti di forza | Limiti principali |
|---|---|---|---|
| C | Introduzione + 11 lezioni | Basi solide, memoria, puntatori, file | Nessun progetto finale ampio; nessun esercizio strutturato oltre `esercizi/1-C` |
| C++ | Introduzione + 30 giorni | Progressione chiara, STL, RAII, smart pointer | C++ moderno da verificare; nessuno sbocco su toolchain/CMake |
| C# | Introduzione + 12 settimane | JSON, LINQ, async, HTTP, testing, progetto | .NET/ASP.NET assenti; Unity solo menzionato |
| Java | Introduzione + 30 lezioni | Molto ampio: SQL, JDBC, Spring, concorrenza, JVM, pattern, Docker | Il corso contiene argomenti che l'inventario tratta come separati (SQL, Git, Docker, CI/CD, Redis) |
| Kotlin | Introduzione + 8 settimane | Coroutine, JSON, Ktor, test, progetto | Ktor e Koin solo in parte |
| Jetpack Compose | Introduzione + 6 livelli | UI, stato, navigazione, animazioni, performance, accessibilità | Dipendenza da Android non dichiarata nel titolo |
| Kotlin Multiplatform | Introduzione + piano 90 giorni + 4 settimane | KMP reale, Ktor, interop iOS | Swift/Objective-C solo menzioni |
| JavaScript | Introduzione + laboratorio + 9 settimane | DOM, storage, async/API, progetto finale, pubblicazione | Node.js e tooling solo menzionati |
| React | Introduzione + laboratorio + 6 settimane | HTML/CSS, router, API, TypeScript, Tailwind, test, Next.js, XSS | Un solo percorso web; manca CSS avanzato e accessibilità sistematica |
| React Native | Introduzione + 8 fasi (120 giorni) | Expo Router, storage, permessi, fotocamera, test, EAS | TypeScript e performance solo in una fase |

**Totale blocchi di codice:** circa 1.555 coppie di fence (misura automatica, arrotondata). **Esercizi numerati rilevati:** oltre 550, con conteggi diversi per corso a causa di formattazioni non uniformi.

### 5.2 Modello didattico

I corsi più recenti (JavaScript, React, React Native) usano un modello uniforme e utile:

- tabella "Percorso dei giorni/settimane";
- sezioni con codice, output atteso e spiegazione;
- "Come ragionare: dal problema allo schermo" con casi guidati;
- "Come ragiona un informatico";
- errori comuni con causa e correzione;
- esercizi progressivi base/intermedio/avanzato;
- varianti;
- laboratori di ragionamento separati (JavaScript e React).

I corsi più vecchi (C, C++, C#, Java, Kotlin, Compose, KMP) non hanno tutti la stessa struttura: non c'è un formato comune di metadati, prerequisiti, durata o criteri di verifica.

### 5.3 Copertura rispetto all'inventario

Solo **34 voci su 218** hanno un contenuto reale. Le principali aree presenti:

- **Linguaggi:** C, C++, C#, Java, Kotlin (percorsi completi); TypeScript (parziale).
- **Mobile:** Jetpack Compose, Kotlin Multiplatform (percorsi completi).
- **Database:** SQL (tre lezioni dentro Java).
- **Backend:** Spring Boot (due lezioni dentro Java).
- **Versionamento:** GitHub (una lezione dentro Java + pubblicazione in JavaScript).
- **Trasversali parziali:** JSON, HTTP/HTTPS, API, REST, HTML, CSS, Tailwind, Next.js, Docker, Docker Compose, Redis, CI/CD, Linux, CLI, algoritmi, performance, XSS, cybersecurity applicativa.

Le aree completamente scoperte includono: networking (28 assenti su 30), cybersecurity (19 assenti su 21), DevOps (15 assenti su 19), server e reverse proxy (11 assenti su 13), cloud (7 su 7), AI (2 su 2), game development (5 su 5), database non relazionali, framework backend non Java, framework frontend non React, linguaggi non insegnati.

---

## 6. Funzionalità applicative

| Funzionalità | Stato | Evidenza |
|---|---|---|
| Catalogo dei percorsi in home | Presente | `src/app/page.tsx`, `SectionCard.tsx` |
| Lettore Markdown con sidebar | Presente | `DocViewer.tsx`, `SectionBar.tsx` |
| Evidenziazione del codice | Presente | `rehype-highlight` |
| Stati di caricamento/errore | Presente | `DocViewer.tsx` |
| Cache in memoria + Redis opzionale | Presente | `cache.ts`, `cache.rs`, `docs.ts` |
| App desktop offline | Presente | Tauri, `output: "export"` |
| Aggiornamenti firmati | Presente | `tauri-plugin-updater`, `UpdateBanner.tsx`, release workflow |
| Impostazioni aggiornamenti | Presente | `SettingsView.tsx`, `useUpdatePreferences.ts` |
| Pagina download con versione/dimensione | Presente nel working tree, non committata | `DownloadPage.tsx`, `releases.ts` |
| Ricerca testuale | **Assente** | Nessun componente o indice |
| URL per lezione/argomento | **Assente** | Navigazione a stato |
| Preferiti / progresso / letti | **Assente** | Nessun modello utente |
| Glossario | **Assente** | Nessun dato |
| Collegamenti tra argomenti | **Assente** | Nessun campo di catalogo |
| Breadcrumb / cronologia | **Assente** | Solo pulsante Home |
| Internazionalizzazione | **Assente** | Solo italiano |
| Tema scuro | **Assente** | Nessun toggle |
| Test automatici | **Assente** | Nessun file di test, nessuno script |
| Validazione contenuti | **Assente** | Nessuno script su link/fence/manifest |

---

## 7. Qualità, test e CI

### 7.1 Cosa esiste

- `npm run lint` con ESLint 9.
- Build statica Next (`npm run build`).
- CodeQL su Actions, JavaScript/TypeScript e Rust.
- Build e release Tauri multipiattaforma.
- TypeScript in modalità strict? Da verificare in `tsconfig.json`; il progetto compila con `tsc --noEmit` nelle verifiche precedenti.

### 7.2 Cosa manca

- **Nessun test unitario, di integrazione o end-to-end.**
- **Nessun test del manifest**: una pagina può puntare a un file inesistente senza che la build fallisca.
- **Nessun controllo dei link interni/esterni.**
- **Nessun controllo dei blocchi di codice** (fence sbilanciati, linguaggi non supportati).
- **Nessuna validazione dei metadati** (non esistono metadati).
- **Nessun test di accessibilità** (axe, Lighthouse, tastiera).
- **Nessun controllo delle dimensioni** o del tempo di caricamento dei documenti lunghi.
- **Nessun test della cache** (TTL, Redis assente, chiavi versionate).

Con 137 documenti e una crescita prevista a 218+ argomenti, l'assenza di validazione è il rischio più concreto di regressione silenziosa.

---

## 8. Sicurezza e privacy

| Aspetto | Stato | Nota |
|---|---|---|
| CSP Tauri | **Assente** (`csp: null`) | Da definire prima di accettare contenuti di terzi |
| HTML grezzo nel Markdown | Abilitato (`rehype-raw`) | Accettabile con contenuti fidati; rischioso con contributori esterni |
| Autenticazione | Assente | Non necessaria per contenuti pubblici |
| Dati utente | Assenti | Nessun account, nessun tracking |
| Segreti | Non presenti nel repository | La chiave pubblica updater è pubblica per definizione |
| Redis | Solo processo Rust | La webview non riceve credenziali (documentato nel README) |
| Dipendenze | Aggiornate | Next 16, React 19, Tauri 2.11 |
| GDPR | Nessun contenuto | Voce dell'inventario assente |

**Raccomandazione:** definire una CSP compatibile con l'export statico e con Tauri, e mantenere `rehype-raw` solo se i contenuti restano fidati. Se in futuro si accettano contributi esterni, sostituire `rehype-raw` con una sanitizzazione esplicita.

---

## 9. Debito tecnico e rischi

| # | Problema | Impatto | Priorità |
|---|---|---|---|
| 1 | Navigazione a stato senza URL | Niente deep link, SEO, condivisione, cronologia | P0 |
| 2 | Nessun catalogo di argomenti | Impossibile collegare 218 topic, duplicazioni, nessuna visione d'insieme | P0 |
| 3 | Nessuna ricerca | 137 documenti non esplorabili per parola chiave | P0 |
| 4 | Nessuna validazione/test | Regressioni silenziose su manifest e contenuti | P0 |
| 5 | README boilerplate | Chi arriva non capisce il progetto | P1 |
| 6 | Manifest manuale | Ogni nuova pagina richiede modifica a `sections.ts` | P1 |
| 7 | URL-encoded `3-C%23` | Fragilità nei percorsi e nei link | P1 |
| 8 | Estensione `.MD` maiuscola | Incoerenza con gli altri file (`.md`) | P2 |
| 9 | Nessun metadato (livello, durata, prerequisiti) | Impossibile costruire percorsi personalizzati | P1 |
| 10 | Contenuti senza `lastReviewed` | Rischio di obsolescenza tecnica | P1 |
| 11 | CSP assente | Superficie di rischio se cambia il modello di fiducia | P1 |
| 12 | Nessun glossario | La visione "enciclopedia" non è rappresentata | P2 |
| 13 | Modifiche non committate | Il working tree conteneva 3 file modificati e 3 nuove cartelle docs | P1, risolta il 24 novembre 2026 |
| 14 | Node 20 in CI vs Node 24 locale | Possibili differenze di build | P2 |

### Stato del working tree

Al momento dell'audit il repository presenta modifiche **preesistenti** a questa analisi:

- `M src/components/DownloadPage.tsx`
- `M src/lib/releases.ts`
- `M src/lib/sections.ts`
- `?? public/docs/10-ReactNative/`
- `?? public/docs/8-JS/`
- `?? public/docs/9-React/`

L'audit **non ha modificato** questi file né ne ha creati di nuovi fuori da `audit/`.

**Aggiornamento del 24 novembre 2026:** queste modifiche e le tre cartelle sono state consolidate insieme alla migrazione in tre commit separati; il working tree è pulito (P7 risolta).

---

## 10. File effettivamente analizzati

### 10.1 Documenti (`public/docs`, 137/137)

Tutti i 137 documenti sono stati attraversati con estrazione dei titoli e ricerca testuale sistematica; i documenti chiave sono stati letti integralmente. Elenco per cartella:

- **1-C (12):** `intro_c.MD`, `lezione_0.MD` … `lezione_10.MD` (11 lezioni, intervallo completo verificato).
- **2-C++ (31):** `intro_cpp.MD`, `giorno_01.MD` … `giorno_30.MD` (30 giorni, intervallo completo verificato).
- **3-C# (13):** `intro_csharp.MD`, `settimana_01.MD` … `settimana_12.MD` (12 settimane, intervallo completo verificato).
- **4-Java (31):** `intro_java.MD`, `lezione_01.MD` … `lezione_30.MD` (30 lezioni, intervallo completo verificato).
- **5-Kotlin (9):** `intro_kotlin.MD`, `settimana_01.MD` … `settimana_08.MD`.
- **6-Compose (7):** `intro_compose.MD`, `livello_01.MD` … `livello_06.MD`.
- **7-KMP (6):** `intro_kmp.MD`, `piano_90_giorni.MD`, `settimana_01.MD` … `settimana_04.MD`.
- **8-JS (11):** `intro_javascript.MD`, `laboratorio_ragionamento.MD`, `settimana_01.MD` … `settimana_09.MD`.
- **9-React (8):** `intro_react.MD`, `laboratorio_ragionamento.MD`, `settimana_01.MD` … `settimana_06.MD`.
- **10-ReactNative (9):** `intro_react_native.MD`, `fase_01.MD` … `fase_08.MD`.

### 10.2 Codice e configurazione

- **src/app:** `page.tsx`, `layout.tsx`, `download/page.tsx`, `global.css`, `favicon.ico`, `informatica/img.png`, `informatica/img_1.png`.
- **src/components:** `DocViewer.tsx`, `SectionBar.tsx`, `SectionCard.tsx`, `SettingsView.tsx`, `UpdateBanner.tsx`, `DownloadPage.tsx`.
- **src/hooks:** `useIsTauri.ts`, `useUpdatePreferences.ts`, `useUpdater.ts`.
- **src/lib:** `sections.ts`, `docs.ts`, `cache.ts`, `releases.ts`, `update-preferences.ts`.
- **src-tauri:** `Cargo.toml`, `tauri.conf.json`, `build.rs`, `src/main.rs`, `src/lib.rs`, `src/cache.rs`, `capabilities/default.json`, `gen/schemas/*`.
- **CI:** `.github/workflows/codeql.yml`, `nextjs.yml`, `release.yml`.
- **Configurazione root:** `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `README.md`.
- **Esercizi:** `esercizi/1-C/es_1.txt` … `es_5.txt`.

### 10.3 Limiti dichiarati

- Non è stata eseguita una lettura filologica riga per riga di tutte le 37.103 righe; l'analisi è completa a livello di struttura, titoli, occorrenze e documenti chiave.
- Non sono stati eseguiti test applicativi, build o browser in questa fase (audit di sola lettura).
- Le classificazioni di livello e difficoltà sono stime editoriali, non misurazioni psicometriche.

---

## 11. Conferma di non modifica

- Nessun file preesistente è stato cancellato, spostato, rinominato, riscritto o modificato.
- Nessun percorso esistente è stato sostituito.
- Nessun README o configurazione è stato sovrascritto.
- L'unica aggiunta è la cartella `audit/` con gli otto rapporti richiesti.
- La migrazione **non è stata avviata** e attende l'approvazione dell'autore.

## 12. Controllo finale

Verifica eseguita al termine della stesura degli otto rapporti.

| Controllo | Esito |
|---|---|
| Righe dati nel CSV | **218** (oltre all'intestazione) |
| Voci presenti | 13 |
| Voci parziali | 21 |
| Voci assenti | 184 |
| Voci da verificare | 0 |
| Somma | 218 |
| Categorie primarie | 18, tutte con almeno una voce |
| Conteggio per categoria | 40, 2, 18, 15, 6, 5, 7, 7, 4, 30, 21, 19, 13, 7, 2, 5, 10, 7 (somma 218) |
| Livelli | Base 25, Intermedio 95, Avanzato 98 (somma 218) |
| Tipi | 21 valori del vocabolario controllato (somma 218) |
| Voci ASSENTI citate in `MISSING_TOPICS.md` | **184 su 184** (verifica testuale automatica) |
| Voci ASSENTI citate in `CONTENT_CLASSIFICATION.md` | **184 su 184** |
| Nomi normalizzati duplicati | **0** |
| Ambiguità dichiarate | **0 aperte**; 10 confermate dall'autore; `ToIP` confermato come Telephony over IP |
| Normalizzazioni | 34, tutte confermate: 17 ortografiche, 7 disambiguatori, 10 semantiche |
| Documenti dichiarati non presenti nell'inventario | **0** (JavaScript, React e React Native sono ora voci esplicite) |
| Discrepanza inventario | 209 dichiarate, 216 effettive, **218 ufficiali** dopo le aggiunte |
| File creati | 8, tutti in `audit/` |
| File preesistenti modificati | **Nessuno** (durante l'audit) |
| Migrazione avviata | **Sì, dopo approvazione esplicita** (24 novembre 2026) |

### 12.1 Verifica del working tree

Alla fine dell'audit `git status` mostra:

- `M src/components/DownloadPage.tsx`, `M src/lib/releases.ts`, `M src/lib/sections.ts` — **modifiche preesistenti**, non introdotte dall'audit;
- `?? public/docs/10-ReactNative/`, `?? public/docs/8-JS/`, `?? public/docs/9-React/` — **cartelle preesistenti non tracciate**;
- `?? audit/` — **unica aggiunta dell'audit**.

Nessun file in `src/`, `public/`, `src-tauri/`, `.github/` o nella root è stato toccato.

**Aggiornamento del 24 novembre 2026:** dopo la migrazione il working tree è pulito; le modifiche sopra sono state incluse nei commit `5ea1625`, `cf96d2a` e `66eb728`.

### 12.2 Limiti del controllo

- La verifica di copertura è testuale: dimostra che ogni voce è citata nei rapporti, non che ogni giudizio sia corretto al 100%. I giudizi si basano su occorrenze, titoli e lettura dei documenti chiave.
- I conteggi delle occorrenze possono includere falsi positivi; i casi noti (Go/Expo Go, R/R.drawable, Pascal/PascalCase, Scala/"scala", OS/Platform.OS) sono stati esclusi manualmente e annotati.
- Le stime di livello e tempo sono editoriali.
- Non sono stati eseguiti build, test o browser: l'audit è di sola lettura.

### 12.3 Esito dell'implementazione (24 novembre 2026)

Dopo l'approvazione dell'autore è stata realizzata la prima migrazione tecnica prevista dal piano, senza modificare i contenuti.

- Catalogo TypeScript generato dal CSV in `src/content/topics/` (18 file, 218 schede), con `categories.ts`, `doc-links.ts`, `search-index.json`, `catalog.ts`, `paths.ts`, `glossary.ts` e `labels.ts`.
- Rotte statiche reali: `/argomenti/` e 218 schede, `/percorsi/` e 10 percorsi curati, `/glossario/` con 55 termini, `/copertura/`, più 137 pagine in `/documenti/[section]/[page]/`. La home ora usa link alle rotte e alle prime guide dei corsi.
- Script di manutenzione: `npm run catalog:generate` (rigenera dal CSV) e `npm run validate:content` (unicità, vocabolari, correlati, collegamenti ai documenti, conteggi 13/21/184 e sincronizzazione dell'indice di ricerca).
- Decisioni A2–A6 chiuse e registrate in `PROPOSED_ARCHITECTURE.md` §13; lo stato delle fasi è in `MIGRATION_PLAN.md` §3.3.
- Verifiche eseguite: validazione contenuti riuscita, `tsc --noEmit` pulito, ESLint pulito, build statica riuscita con 374 pagine generate. Sul build esportato sono stati provati in browser ricerca e filtri del catalogo, scheda argomento, percorso, glossario, copertura e navigazione tra le pagine di un documento, con cambio URL.
- P7 risolta: modifiche preesistenti e migrazione consolidate in tre commit separati (`5ea1625` aggiornamento release, `cf96d2a` nuovi percorsi JS/React/React Native, `66eb728` catalogo e rotte); working tree pulito.
- Vincoli rispettati: nessun documento di `public/docs/` modificato dalla migrazione, nessuna modifica a cache/updater Tauri, nessun push, tag o rilascio.

---

## 13. Collegamenti agli altri rapporti

- Inventario completo: `audit/CONTENT_INVENTORY.csv`
- Classificazione e tassonomia: `audit/CONTENT_CLASSIFICATION.md`
- Argomenti mancanti e priorità: `audit/MISSING_TOPICS.md`
- Sovrapposizioni e ambiguità: `audit/DUPLICATES_AND_AMBIGUITIES.md`
- Catalogo e architettura: `audit/PROPOSED_ARCHITECTURE.md`
- Piano di migrazione: `audit/MIGRATION_PLAN.md`
- Roadmap 90 giorni: `audit/ROADMAP_90_DAYS.md`
