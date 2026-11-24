# Piano di migrazione

**Rapporto:** `audit/MIGRATION_PLAN.md`
**Stato:** Fasi 1–4 implementate e consolidate il 24 novembre 2026; Fasi 5–8 non avviate. Decisioni A1–A6 chiuse e working tree pulito. Resta il test Tauri delle nuove rotte.
**Data:** 24 novembre 2026

---

## 1. Regole non negoziabili

Questo piano eredita i vincoli dell'audit e li estende alla migrazione:

1. **Nessun contenuto viene cancellato.** I 137 documenti restano; eventuali spostamenti sono copie o move tracciati con git.
2. **Nessun argomento viene eliminato**, nemmeno se simile a un altro. Le sovrapposizioni si gestiscono con richiami, non con rimozioni.
3. **Nessun documento viene riscritto in blocco.** Le modifiche ai Markdown sono additive (frontmatter, link) e avvengono solo nelle fasi che lo prevedono.
4. **Nessun percorso esistente viene sostituito** finché il nuovo non è verificato.
5. **Ogni fase è reversibile** con un revert git mirato.
6. **La migrazione non parte** finché l'autore non ha esaminato audit, catalogo proposto e decisioni registrate.

---

## 2. Precondizioni

Prima della Fase 1 servono:

| # | Precondizione | Stato |
|---|---|---|
| P1 | Conferma dell'inventario ufficiale | **Risolta**: 216 dichiarate, 218 ufficiali |
| P2 | Chiarimento delle 10 voci ambigue | **Risolta**: tutte confermate |
| P3 | Decisione su JavaScript, React e React Native | **Risolta**: JavaScript sostituisce `js`; React e React Native voci esplicite |
| P4 | Decisione su Git come argomento | **Risolta**: non aggiunto, resta documentato come contenuto non dichiarato |
| P5 | Scelta catalogo TypeScript vs JSON | **Risolta**: TypeScript |
| P6 | Decisione su rotte reali | **Risolta**: rotte implementate e verificate sul build statico |
| P7 | Working tree pulito o modifiche preesistenti messe al sicuro | **Risolta**: modifiche preesistenti e migrazione consolidate in tre commit separati (`5ea1625`, `cf96d2a`, `66eb728`) il 24 novembre 2026; working tree pulito |

**Nota sul working tree:** la migrazione è stata eseguita senza toccare i contenuti. Al termine, le modifiche preesistenti e il lavoro della migrazione sono stati consolidati in tre commit distinti; l'albero è pulito e un rilascio non è più sospeso da P7. Restano da eseguire il test Tauri e, solo su richiesta esplicita, push, tag e rilascio.

---

## 3. Strategia

### 3.1 Additiva, non sostitutiva

```
Fase 1-4: aggiungo catalogo, rotte e ricerca accanto a ciò che esiste
Fase 5-6: collego i contenuti esistenti al catalogo
Fase 7:   sposto i contenuti solo se e quando serve
```

In nessuna fase intermedia l'app smette di funzionare. Se una fase si blocca, la precedente resta operativa.

### 3.2 Un'unica fonte di verità per fase

| Fase | Fonte dei metadati | Fonte dei contenuti |
|---|---|---|
| 1–3 | Catalogo TS | `public/docs` (invariato) |
| 4–6 | Catalogo TS | `public/docs` (invariato) |
| 7 | Catalogo TS + frontmatter generato | `content/` (spostato) |

La doppia fonte è vietata: il frontmatter non viene introdotto finché il catalogo non è stabile. In Fase 7 il frontmatter può diventare un artefatto generato dal catalogo, non un secondo input.

### 3.3 Stato di attuazione

| Fase | Stato | Esito |
|---|---|---|
| 0 | Completata | A1–A6 chiuse (vedi `PROPOSED_ARCHITECTURE.md` §13) |
| 1 | Completata | 218 schede, validatore e report |
| 2 | Completata | Rotte del catalogo e dei documenti |
| 3 | Completata con scope ridotto | 10 percorsi; mappatura per lezione rinviata |
| 4 | Completata | Ricerca client-side e 55 termini di glossario |
| 5–6 | Non avviate | Esercizi, riferimenti e fonti |
| 7 | Rinviata | Dipende da A2/A5, fuori dai primi 90 giorni |
| 8 | Non avviata | Contenuti P0/P1 |

Le fasi 1–4 sono state eseguite in anticipo rispetto alla roadmap, in una sola sessione, senza modificare i contenuti.

---

## 4. Fasi

### Fase 0 — Baseline e decisioni (1 settimana)

**Obiettivo:** congelare lo stato di partenza e ottenere le risposte.

Attività:

- eseguire build, lint e typecheck sul commit di partenza e annotare i risultati;
- salvare un inventario dei 137 documenti con hash (solo report, in `audit/`);
- raccogliere e chiudere le decisioni D1–D12 e A1–A6 (tutte risolte il 24 novembre 2026);
- definire il lessico definitivo (18 categorie, 21 tipi, 4 stati di copertura, 4 stati editoriali).

File toccati: solo `audit/` (nuovi report). Nessun file applicativo.

Rollback: non necessario.

Gate: decisioni scritte e approvate. **Superato il 24 novembre 2026.**

**Esito:** decisioni A2–A6 chiuse con la revisione registrata in `PROPOSED_ARCHITECTURE.md` §13; il working tree è stato consolidato (P7) il 24 novembre 2026.

---

### Fase 1 — Catalogo dei 218 argomenti (1–2 settimane)

**Obiettivo:** trasformare il CSV in catalogo tipizzato, senza toccare i contenuti.

Attività:

- creare `src/content/types.ts`, `src/content/categories.ts`, `src/content/topics/*.ts`;
- importare le 218 schede dal CSV, una per area;
- mantenere `coverageStatus` e `publicationStatus` separati;
- aggiungere `legacyNames` per le voci normalizzate;
- creare `scripts/validate-content.mjs` con le regole bloccanti (Node ESM, nessuna dipendenza nuova);
- generare `content-report.json` con i conteggi.

File nuovi: `src/content/**`, `scripts/generate-catalog.mjs`, `scripts/validate-content.mjs`.
File modificati: `package.json` (soli script `catalog:generate` e `validate:content`).

Validazione:

- 218 schede, 0 id duplicati, 0 slug duplicati;
- conteggi per stato identici al CSV (13 presenti / 21 parziali / 184 assenti / 0 da verificare);
- tutte le categorie tra le 18;
- build e typecheck verdi.

Rollback: eliminare i file nuovi; nessun impatto sull'app.

Rischio principale: inventare campi mancanti. Mitigazione: i campi senza evidenza restano vuoti, mai compilati a caso.

**Esito (24/11/2026):** 218 schede generate dal CSV in 18 file, 0 id e 0 slug duplicati, conteggi 13/21/184; validatore e report operativi.

---

### Fase 2 — Rotte di consultazione (1–2 settimane)

**Obiettivo:** rendere il catalogo navigabile, leggendo i documenti esistenti.

Attività:

- aggiungere `/argomenti/` con elenco e filtri;
- aggiungere `/argomenti/[slug]/` con scheda argomento;
- riusare `DocViewer` per i documenti collegati;
- aggiungere breadcrumb e link "torna al catalogo";
- mantenere la home attuale e le card dei percorsi.

File nuovi: `src/app/argomenti/**`, `src/app/documenti/**`, `src/components/CatalogExplorer.tsx`, `src/components/SiteChrome.tsx`, `src/components/DocumentRouteView.tsx`.
File modificati: `src/app/page.tsx`, `src/components/SectionCard.tsx`, `src/components/DocViewer.tsx` (prop `onPageSelect`).

Validazione:

- ogni scheda con collegamento in `docLinksByTopic` apre il documento corretto;
- le schede `assente` mostrano uno stato vuoto esplicito;
- build statica con `generateStaticParams` produce tutte le pagine;
- test manuale web + Tauri.

Rollback: rimuovere le rotte nuove; la home resta com'era.

**Esito (24/11/2026):** rotte implementate con `generateStaticParams` (374 pagine statiche); `DocViewer` riceve `onPageSelect` e la pagina del documento cambia URL. La home conserva card e impostazioni Tauri, con link alle nuove rotte.

---

### Fase 3 — Percorsi e collegamenti (1–2 settimane)

**Obiettivo:** collegare i 10 corsi esistenti agli argomenti.

Attività:

- creare `src/content/paths.ts` per i 10 percorsi;
- collegare i corsi esistenti alle schede tramite `src/content/doc-links.ts`;
- aggiungere `/percorsi/` e `/percorsi/[slug]/`;
- aggiornare le card della home per puntare ai percorsi;
- introdurre `prerequisites` e `relatedTopics` verificati.

File nuovi: `src/content/paths.ts`, `src/content/doc-links.ts`, `src/app/percorsi/**`.
File modificati: `src/app/page.tsx`, `src/components/SectionCard.tsx`.

Validazione:

- 10 percorsi con moduli e argomenti esistenti;
- 12 schede collegate a un corso; mappatura lezione→argomento rinviata;
- nessun prerequisito ciclico;
- link da percorso a corso funzionanti.

Rollback: revert dei file di percorso; `sections.ts` invariato.

**Esito (24/11/2026):** 10 percorsi implementati; i moduli citano solo argomenti del catalogo (validato). La mappatura fine lezione→argomento resta un backlog editoriale, non un blocco.

**Attenzione:** `sections.ts` è dichiarato con tabs e CRLF. Ogni modifica va fatta con lo stesso formato per evitare diff enormi. In questa migrazione è stato usato in sola lettura.

---

### Fase 4 — Ricerca e glossario iniziale (1–2 settimane)

**Obiettivo:** rendere il catalogo interrogabile.

Attività:

- generare `src/content/search-index.json` a build-time dentro `generate-catalog.mjs`;
- aggiungere ricerca e filtri client-side nella pagina `/argomenti/`;
- creare `src/content/glossary.ts` con 55 termini ad alto valore (HTTP, TLS, API, container, ecc.);
- collegare i termini del glossario alle schede tramite `relatedTopicIds`;
- mantenere i rimandi come anchor, senza pagine `/glossario/[slug]/`.

File nuovi: `src/content/search-index.json`, `src/content/glossary.ts`, `src/components/CatalogExplorer.tsx`, `src/app/glossario/page.tsx`.
File modificati: header e home per i link di navigazione.

Validazione:

- ricerca su titolo, summary e alias;
- nessuna chiamata di rete;
- indice < 500 KB (target; attuale 85 KB);
- glossario senza termini duplicati;
- link glossario → argomento validi;
- indice sincronizzato con il catalogo (controllo del validatore).

Rollback: rimuovere ricerca e glossario; nessun contenuto perso.

**Esito (24/11/2026):** ricerca con 218 voci e quattro filtri; glossario con 55 termini; validatore aggiornato per intercettare un indice di ricerca non aggiornato.

---

### Fase 5 — Esercizi e progetti (2 settimane, opzionale)

**Obiettivo:** separare esercizi e progetti dai documenti, senza riscriverli.

Attività:

- censire gli esercizi esistenti (oltre 550 secondo l'audit) e assegnare un id;
- creare `content/esercizi/` con metadati e puntatori al testo esistente;
- creare `content/progetti/` per i progetti finali;
- aggiungere componenti `ExerciseBlock` e `ProjectBrief`;
- non estrarre il testo finché non è necessario: prima i metadati.

File nuovi: `content/esercizi/**`, `content/progetti/**`, componenti.
File modificati: documenti solo per aggiungere link, se approvato.

Validazione:

- ogni esercizio punta a un argomento esistente;
- nessun esercizio duplicato per id;
- i progetti hanno requisiti e criteri di valutazione;
- i documenti restano leggibili anche senza i nuovi blocchi.

Rollback: i metadati sono additivi; rimozione sicura.

---

### Fase 6 — Riferimenti e metadati editoriali (1 settimana)

**Obiettivo:** completare il livello enciclopedico.

Attività:

- creare `content/riferimenti/` con fonti per argomento;
- aggiungere `lastReviewed`, `reviewer`, `license`, `contentVersion`;
- generare il report di copertura per area;
- collegare le fonti nelle schede.

File nuovi: `content/riferimenti/**`, `content/meta/**`.
File modificati: schede catalogo.

Validazione:

- ogni fonte ha URL valido o ISBN;
- nessun argomento `published` senza `lastReviewed`;
- report di copertura coerente con il CSV.

Rollback: banale (dati additivi).

---

### Fase 7 — Spostamento dei contenuti in `content/` (2 settimane, opzionale)

**Obiettivo:** allineare la struttura fisica all'architettura, solo se la Fase 2–6 ha dimostrato che serve.

Attività:

- spostare i documenti da `public/docs/<corso>/` a `content/argomenti/<area>/<argomento>/`;
- aggiornare i `contentRef.path`;
- generare una copia in `out/docs` per l'app Tauri, oppure importare i documenti a build-time;
- aggiornare le chiavi cache (`doc:v3:...`);
- mantenere redirect o alias per i percorsi vecchi, se esistono URL pubblici.

File modificati: molti. **È la fase a rischio più alto.**

Validazione:

- 137 documenti presenti, 0 persi;
- hash dei contenuti identici prima/dopo (esclusi eventuali frontmatter);
- build web e Tauri;
- cache: vecchie chiavi non usate, nuove chiavi corrette;
- link interni tutti validi.

Rollback: revert del commit di spostamento; i file tornano in `public/docs`.

**Raccomandazione:** eseguire questa fase solo se c'è un beneficio concreto (es. necessità di co-locare metadati e contenuti). La decisione A2 la esclude dai primi 90 giorni; A5 (MDX) è il prerequisito per rivalutarla.

---

### Fase 8 — Produzione dei contenuti P0/P1 (trasversale, 8–10 settimane)

**Obiettivo:** riempire le lacune prioritarie senza fermare la piattaforma.

Non è una fase tecnica: è il lavoro editoriale descritto in `MISSING_TOPICS.md` e `ROADMAP_90_DAYS.md`. Può iniziare dopo la Fase 1 (catalogo), perché ogni nuovo contenuto nasce già con la sua scheda.

---

## 5. Impatto sui file esistenti

| File | Fase | Tipo di modifica | Rischio |
|---|---|---|---|
| `src/app/page.tsx` | 2–3 | Aggiunta link e card; rimossa la navigazione a stato per i documenti | Basso |
| `src/lib/sections.ts` | 3 | Usato in sola lettura come manifest; nessuna modifica | Basso |
| `src/components/DocViewer.tsx` | 2 | Aggiunta prop `onPageSelect`; comportamento invariato senza la prop | Basso |
| `src/components/SectionCard.tsx` | 3 | Da pulsante a link di rotta | Basso |
| `package.json` | 1 | Aggiunti `catalog:generate` e `validate:content` | Basso |
| `public/docs/**` | 7 | Spostamento | Alto |
| `next.config.ts` | 2 | Nessuna modifica prevista | Basso |
| `src-tauri/**` | 2, 7 | Solo test; nessuna modifica prevista | Basso |
| `README.md` | 7 | Aggiornamento documentazione | Basso |
| Workflow CI | 1, 4 | Aggiunta job `validate-content` | Basso |

**File che non devono cambiare nelle fasi 1–6:** `src/lib/docs.ts`, `src/lib/cache.ts`, `src-tauri/src/cache.rs`, `tauri.conf.json`, gli updater endpoint, i 137 documenti.

---

## 6. Gate di qualità

Ogni fase termina con:

1. `npm run build` verde;
2. `npm run lint` verde (o soli warning preesistenti documentati);
3. `npx tsc --noEmit` verde;
4. `npm run validate:content` verde;
5. smoke test web: home → catalogo → argomento → documento → indietro;
6. smoke test Tauri: apertura, navigazione, un documento, chiusura;
7. conteggi confrontati con l'audit;
8. git status pulito o con modifiche attese e documentate.

Nessuna fase si considera conclusa se uno dei gate fallisce.

---

## 7. Test manuali minimi

| Scenario | Atteso |
|---|---|
| Aprire un argomento `presente` | Scheda + documenti |
| Aprire un argomento `assente` | Stato vuoto esplicito, nessun errore |
| Aprire un argomento `parziale` | Scheda, documenti e indicazione di ciò che manca |
| Cercare "docker" | Docker e Docker Compose tra i risultati |
| Aprire un percorso | Moduli e argomenti nell'ordine |
| Tornare indietro dal documento | Pulsante Home → home; il link diretto alla pagina resta ricaricabile |
| Ricaricare un URL profondo | Pagina corretta (web e Tauri) |
| Aprire l'app offline | Contenuti e catalogo disponibili |
| Avviare un aggiornamento | Comportamento invariato |
| Aprire un documento con cache piena | Nessun errore, cache riutilizzata |

---

## 8. Rischi e mitigazioni

| Rischio | Gravità | Mitigazione |
|---|---|---|
| Perdita di documenti durante lo spostamento | Alta | Hash pre/post, move con git, nessuna cancellazione |
| Doppia fonte di metadati | Alta | Catalogo unico fino alla Fase 7 |
| Catalogo che duplica il CSV e diverge | Media | Validazione automatica e report |
| Rotte statiche non funzionanti in Tauri | Alta | Test in webview a ogni fase |
| Modifiche a `sections.ts` con diff enormi | Media | Mantenere tabs/CRLF; modifiche mirate |
| Cache che serve documenti vecchi | Media | Bump chiave in Fase 7 |
| Tempi: 218 schede sembrano un lavoro infinito | Alta | Schede `assente` senza contenuto; compilazione graduale |
| Ambiguità irrisolte che bloccano il catalogo | Bassa | Risolte in Fase 0: 10 confermate, 0 `da-verificare` |
| Contenuti nuovi scritti senza standard | Media | Template di lezione e checklist nella Fase 8 |

---

## 9. Cosa non faremo

- Non elimineremo argomenti simili.
- Non riscriveremo i 137 documenti.
- Non cambieremo l'updater, la firma o i workflow di release durante la migrazione.
- Non introdurremo un database o un CMS.
- Non sposteremo i documenti prima che catalogo e rotte siano stabili.
- Non pubblicheremo nulla senza una verifica esplicita.

---

## 10. Tempi indicativi

| Fase | Durata | Dipende da |
|---|---|---|
| 0 — Baseline e decisioni | 1 settimana | Autore |
| 1 — Catalogo | 1–2 settimane | Fase 0 |
| 2 — Rotte | 1–2 settimane | Fase 1 |
| 3 — Percorsi | 1–2 settimane | Fase 1 |
| 4 — Ricerca e glossario | 1–2 settimane | Fase 1 |
| 5 — Esercizi e progetti | 2 settimane | Fase 3 |
| 6 — Riferimenti e metadati | 1 settimana | Fase 1 |
| 7 — Spostamento documenti | 2 settimane | Fasi 2–6, opzionale |
| 8 — Contenuti P0/P1 | 8–10 settimane | Fase 1, in parallelo |

Le fasi 2–4 sono sequenziali per una sola persona, ma la Fase 8 (contenuti) può sovrapporsi alle fasi tecniche perché tocca file diversi. La roadmap dei 90 giorni dettaglia questa sequenza.

---

## 11. Approvazione richiesta

Le decisioni D1–D12 e A1–A6 sono tutte chiuse. Per procedere oltre la Fase 4 serve:

- il test Tauri delle nuove rotte (gate della Settimana 9);
- la conferma che la Fase 7 (spostamento) resta opzionale e fuori dai primi 90 giorni;
- l'autorizzazione esplicita per un eventuale commit, tag o rilascio.

**Nessun commit o rilascio viene eseguito senza questa autorizzazione.**
