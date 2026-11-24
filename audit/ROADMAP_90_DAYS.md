# Roadmap 90 giorni

**Rapporto:** `audit/ROADMAP_90_DAYS.md`
**Orizzonte:** 12 settimane (25 novembre 2026 – 16 febbraio 2027)
**Vincolo:** una sola persona; il piano distingue ciò che è obbligatorio da ciò che è sacrificabile.
**Stato:** revisionata il 24 novembre 2026. Settimane 1–5 completate, 6–7 parziali, 8–12 non avviate.

---

## 1. Obiettivo dei 90 giorni

Alla fine del periodo il progetto deve essere:

1. **una biblioteca navigabile**, non una home con dieci card;
2. **un catalogo completo dei 218 argomenti**, con stato, categoria, livello e relazioni;
3. **un motore di ricerca** che trovi contenuti e argomenti anche non ancora scritti;
4. **dieci fondamenta P0** con contenuti reali;
5. **un glossario iniziale** e un sistema di riferimenti;
6. **un'app Tauri** che continua a funzionare offline e ad aggiornarsi.

Non deve essere: tutti i 218 argomenti scritti. Sarebbe irrealistico e distoglierebbe risorse dalla struttura.

---

## 2. Regole di esecuzione

- **Prima la piattaforma, poi i contenuti.** Il catalogo è il moltiplicatore: senza di esso ogni nuovo corso resta isolato.
- **Un solo tema tecnico per settimana.** Le settimane non si sovraccaricano.
- **Contenuti in parallelo solo dopo la Settimana 2**, quando il catalogo è stabile.
- **Ogni settimana termina con un risultato verificabile**, non con "ho lavorato a".
- **Se una settimana slitta, si taglia il contenuto P1, non la validazione.**
- **Nessun rilascio** senza build, typecheck, lint, validazione e smoke test Tauri.

### 2.1 Stato al 24 novembre 2026

| Settimana | Stato | Note |
|---|---|---|
| 1 — Decisioni e fondamenta | **Completata** | A1–A6 chiuse; catalogo e validatore creati |
| 2 — I 218 record | **Completata** | 218 schede, conteggi 13/21/184 |
| 3 — Rotte del catalogo | **Completata** | 218 schede + 137 documenti statici |
| 4 — Percorsi e home | **Completata con scope ridotto** | 10 percorsi; mappatura per lezione rinviata |
| 5 — Ricerca | **Completata** | Indice 85 KB, filtri client-side |
| 6 — Glossario e riferimenti | **Parziale** | 55 termini fatti; fonti e riferimenti mancanti |
| 7 — Copertura e dashboard | **Parziale** | `/copertura/` fatta; elenco assenti tramite filtro; link al report mancante |
| 8–12 | **Non avviate** | Qualità, Tauri, rilascio, contenuti, buffer |

Il lavoro editoriale P0/P1 non è iniziato: la piattaforma è pronta, i contenuti no.

---

## 3. Le dodici settimane

### Settimana 1 — Decisioni e fondamenta del catalogo

**Priorità:** P0.

Attività:

- chiudere le decisioni D1–D12 e A1–A6 (tutte risolte il 24 novembre 2026);
- consolidare il working tree (tre commit separati, 24 novembre 2026);
- definire `types.ts`, le 18 categorie, i 21 tipi, gli enum di stato;
- creare lo scheletro `src/content/` e lo script di validazione.

Risultato verificabile:

- documento delle decisioni firmato;
- `npx tsc --noEmit` verde;
- validatore che fallisce su un id duplicato di prova.

Dipendenze: autore.

Rischi: nessuno; decisioni chiuse e working tree consolidato il 24 novembre 2026.

Test: typecheck, unit test del validatore.

---

### Settimana 2 — I 218 record

**Priorità:** P0.

Attività:

- importare le 218 schede dal CSV, una per area;
- compilare `coverageStatus`, `publicationStatus`, `contentRef`, `prerequisites`;
- generare `content-report.json`;
- verificare i conteggi 13 / 21 / 184 / 0.

Risultato verificabile:

- 218 record, 0 id/slug duplicati;
- report identico ai conteggi dell'audit;
- nessun percorso inventato.

Dipendenze: Settimana 1.

Rischi: compilazione manuale troppo lenta. Mitigazione: generazione dal CSV + revisione a campione.

Test: `validate-content`, diff dei conteggi, build.

---

### Settimana 3 — Rotte del catalogo

**Priorità:** P0.

Attività:

- `/argomenti/` con elenco, filtri per area/stato/livello;
- `/argomenti/[slug]/` con scheda e documenti esistenti;
- breadcrumb e stato vuoto per argomenti assenti;
- integrazione con `DocViewer` senza modificarlo in modo invasivo.

Risultato verificabile:

- tutte le schede con contenuto aprono il documento corretto;
- le schede assenti mostrano uno stato esplicito;
- deep link funzionante sul web.

Dipendenze: Settimana 2.

Rischi: `generateStaticParams` con molti slug; mitigazione: build incrementale e verifica del numero di pagine.

Test: build, navigazione manuale, URL diretto, tasto Indietro.

---

### Settimana 4 — Percorsi e home

**Priorità:** P0.

Attività:

- `/percorsi/` e `/percorsi/[slug]/` per i 10 corsi;
- mappatura corsi → schede; mappatura per lezione rinviata;
- card della home che puntano ai percorsi;
- `sections.ts` usato come adapter, senza riscrittura.

Risultato verificabile:

- 10 percorsi, 12 schede collegate ai corsi; mappatura per lezione rinviata;
- home invariata nelle funzioni, migliorata nei link;
- nessun prerequisito ciclico.

Dipendenze: Settimana 3.

Rischi: differenze tra modello corso e modello percorso. Mitigazione: il percorso è un contenitore, non una riscrittura del corso.

Test: link da home, percorso, lezione; Tauri.

**Contenuti in parallelo (da qui):** avvio P0.

---

### Settimana 5 — Ricerca

**Priorità:** P0.

Attività:

- indice di ricerca generato a build-time;
- dialogo di ricerca con tastiera e risultati;
- ricerca su titolo, summary, sezioni, alias, glossario;
- nessuna chiamata di rete.

Risultato verificabile:

- "docker" trova Docker e Docker Compose;
- "tls" trova TLS, HTTP/HTTPS e mTLS;
- indice < 500 KB;
- ricerca utilizzabile offline.

Dipendenze: Settimana 2.

Rischi: indice troppo grande. Mitigazione: escludere il corpo completo, indicizzare titoli e prime righe.

Test: query note, risultati attesi, performance, offline.

---

### Settimana 6 — Glossario e riferimenti

**Priorità:** P1.

Attività:

- `/glossario/` con 50–80 termini;
- definizioni brevi, alias, collegamento agli argomenti;
- `content/riferimenti/` con fonti per i P0;
- tooltip nei documenti solo se non invasivo.

Risultato verificabile:

- 50 termini minimi, 0 duplicati;
- ogni termine linka ad almeno un argomento;
- ogni P0 ha almeno una fonte.

Dipendenze: Settimana 2.

Rischi: glossario che duplica i documenti. Mitigazione: definizioni da 1–2 frasi, non lezioni.

Test: link, duplicati, ricerca.

---

### Settimana 7 — Copertura e dashboard editoriale

**Priorità:** P1.

Attività:

- pagina `/copertura/` con conteggi per area e stato;
- elenco degli argomenti assenti, filtrabile;
- evidenza dei parziali da completare;
- collegamento al report di validazione.

Risultato verificabile:

- i numeri coincidono con il CSV;
- ogni area mostra presente/parziale/assente;
- l'elenco assenti è navigabile.

Dipendenze: Settimana 2.

Rischi: dashboard che diventa un progetto nel progetto. Mitigazione: sola lettura, nessuna modifica inline.

Test: conteggi, filtri, link.

---

### Settimana 8 — Qualità, accessibilità, performance

**Priorità:** P1.

Attività:

- audit di accessibilità sulle nuove rotte (focus, tastiera, contrasto, landmarks);
- controllo performance (peso JS, tempo di caricamento indice);
- gestione stati vuoti, errori e caricamento;
- test su viewport mobile e desktop.

Risultato verificabile:

- navigazione completa da tastiera;
- nessun errore console;
- Lighthouse accessibilità ≥ 90 sulle nuove pagine;
- nessun layout rotto a 360 px.

Dipendenze: Settimane 3–7.

Rischi: correzioni invasive. Mitigazione: solo fix mirati, nessun restyling.

Test: tastiera, screen reader di base, Lighthouse, mobile.

---

### Settimana 9 — Tauri e offline

**Priorità:** P0 (rischio specifico).

Attività:

- verificare tutte le nuove rotte nel webview Tauri;
- verificare asset protocol, trailing slash, basePath;
- verificare cache Redis/Memory con i nuovi documenti;
- verificare updater e riavvio.

Risultato verificabile:

- apertura app, catalogo, argomento, documento, ricerca;
- funzionamento offline;
- aggiornamento simulato senza regressioni.

Dipendenze: Settimane 3–7.

Rischi: rotte statiche non risolte nel webview. Mitigazione: test precoce in Settimana 4, non rimandare alla 9.

Test: smoke Tauri completo, offline, updater.

---

### Settimana 10 — Consolidamento e rilascio

**Priorità:** P0.

Attività:

- correggere i difetti emersi;
- aggiornare README e documentazione tecnica;
- preparare note di rilascio;
- decidere la versione (proposta: 0.5.0);
- congelare il catalogo e il report di copertura.

Risultato verificabile:

- build di produzione web e Tauri;
- artefatti firmati come da processo esistente;
- release notes con numeri verificabili.

Dipendenze: Settimane 1–9.

Rischi: rilascio affrettato. Mitigazione: nessun rilascio se un gate fallisce; slittamento alla 11.

Test: build completa, installazione, smoke su artefatto installato.

---

### Settimana 11 — Contenuti P0 e rifinitura

**Priorità:** P0/P1.

Attività:

- completare i P0 non finiti;
- collegare i nuovi contenuti a catalogo, glossario e ricerca;
- verificare che ogni nuovo argomento passi da `assente` a `parziale` o `presente`;
- aggiornare i riferimenti.

Risultato verificabile:

- 10 P0 con contenuto e scheda aggiornata;
- 0 P0 ancora `assente`;
- ricerca che trova i nuovi contenuti.

Dipendenze: Settimana 2, in parallelo dalla 5.

Rischi: contenuti scritti in fretta. Mitigazione: definition of done sotto.

Test: link, esercizi, build, ricerca.

---

### Settimana 12 — Buffer e retrospettiva

**Priorità:** P1.

Attività:

- risolvere il debito residuo;
- aggiornare il report di copertura;
- scrivere la retrospettiva: cosa ha funzionato, cosa no, cosa slitta;
- pianificare il trimestre successivo (P1/P2).

Risultato verificabile:

- report di copertura aggiornato;
- elenco prioritizzato per il trimestre successivo;
- nessun P0 aperto.

Dipendenze: tutte.

Rischi: usare il buffer per aggiungere scope. Mitigazione: il buffer serve a chiudere, non ad aprire.

---

## 4. Contenuti: cosa scrivere nei 90 giorni

### 4.1 P0 — Le dieci fondamenta

| # | Argomento | Moduli minimi | Settimane |
|---|---|---|---|
| 1 | OS | processi, memoria, filesystem, permessi | 5–6 |
| 2 | Bash | shell, variabili, pipe, script, exit code | 5–6 |
| 3 | SSH | chiavi, config, tunnel, hardening | 7 |
| 4 | DNS | risoluzione, record, cache, strumenti | 7 |
| 5 | Client/Server | modello, richiesta/risposta, stateless, socket | 7 |
| 6 | SSL | handshake storico, certificati, errori comuni | 8 |
| 7 | TLS | handshake moderno, versioni, configurazione | 8 |
| 8 | Crittografia | hash, simmetrica, asimmetrica, firme | 8–9 |
| 9 | YAML | sintassi, anchor, validazione, esempi Compose | 9 |
| 10 | Markdown | sintassi, tabelle, code fence, estensioni | 9 |

**Nota:** DNS è la decima fondamentale, confermato dall'autore (la voce dichiarata era `DSN`). SSL e TLS restano due schede distinte, insegnate insieme.

### 4.2 Definition of done per un argomento

Un argomento è "fatto" solo se ha:

- 3–6 lezioni o una guida organica;
- almeno un esercizio o un laboratorio;
- almeno una fonte esterna;
- scheda catalogo aggiornata (`coverageStatus`, `estimatedMinutes`, `lastReviewed`);
- almeno 3 termini di glossario collegati;
- link da almeno un percorso;
- ricerca che lo trova;
- build e link check verdi.

### 4.3 P1 — Cosa può iniziare, non finire

Nei tempi residui:

- Node.js (dopo HTTP);
- HTTP/HTTPS come percorso (completamento del parziale);
- Nginx o Caddy (dopo TLS);
- Python (base, propedeutico ad AI).

Tutto il resto è P2/P3 e va nel trimestre successivo.

---

## 5. Dipendenze tra attività

```
Decisioni (S1)
   └── Catalogo (S2)
         ├── Rotte (S3) ── Percorsi (S4) ── Qualità (S8) ── Tauri (S9) ── Rilascio (S10)
         ├── Ricerca (S5) ── Glossario (S6) ── Dashboard (S7)
         └── Contenuti P0 (S5–S11)
```

Regole:

- nessuna rotta prima del catalogo;
- nessun percorso prima delle rotte;
- nessun rilascio prima del test Tauri;
- i contenuti possono iniziare dopo il catalogo e proseguire in parallelo.

---

## 6. Risultati verificabili per area

| Area | Risultato al giorno 90 | Verifica |
|---|---|---|
| Catalogo | 218 schede complete | `validate-content` + conteggi |
| Navigazione | Ogni argomento e percorso ha una pagina | Build + crawl interno |
| Ricerca | Query su titolo, sezioni, alias, glossario | Test con 20 query |
| Glossario | ≥ 50 termini | Conteggio + link check |
| Copertura | Dashboard coerente col CSV | Confronto numerico |
| P0 | 10 argomenti con contenuto | Stato catalogo |
| Offline | App Tauri utilizzabile senza rete | Test manuale |
| Qualità | Build, lint, typecheck, link check verdi | CI |
| Accessibilità | Navigazione da tastiera completa | Test manuale |
| Rilascio | Versione con note e numeri | Release notes |

---

## 7. Rischi del piano

| Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|
| Le decisioni slittano | Bassa | Alto | A1–A6 sono chiuse e il working tree è consolidato; resta il test Tauri |
| Una settimana tecnica ne occupa due | Alta | Medio | Tagliare P1, non i gate |
| I contenuti P0 richiedono più tempo del previsto | Alta | Alto | Moduli minimi, non corsi enciclopedici |
| Tauri rompe le rotte statiche | Media | Alto | Test in S4 e S9, non solo alla fine |
| Il catalogo duplica il CSV e diverge | Media | Alto | Validazione settimanale, non a fine progetto |
| Scope creep (nuove tecnologie, restyling) | Alta | Alto | Backlog esplicito; nulla entra senza sostituire qualcosa |
| Burnout da solo dev | Media | Alto | Buffer S12; nessuna settimana con due temi tecnici |
| Contenuti nuovi senza esercizi | Media | Medio | Definition of done bloccante |

---

## 8. Punti di controllo

### Checkpoint 1 — fine Settimana 2

- catalogo completo e validato;
- decisioni registrate;
- modifiche applicative limitate a home, card, `DocViewer` e script, come registrato in `MIGRATION_PLAN.md` §5.

**Esito:** superato il 24 novembre 2026. Le settimane 3–5 sono state completate nello stesso blocco e il working tree è stato consolidato in tre commit.

Se fallisce: non si parte con le rotte; si riduce lo scope del catalogo a 18 categorie + 30 argomenti prioritari.

### Checkpoint 2 — fine Settimana 6

- rotte, percorsi, ricerca e glossario funzionanti;
- P0 avviati;
- Tauri testato almeno una volta.

Se fallisce: si taglia la dashboard (S7) e si anticipa il consolidamento.

### Checkpoint 3 — fine Settimana 9

- Tauri e offline verificati;
- nessun blocco al rilascio;
- P0 a metà.

Se fallisce: si rinvia il rilascio alla S11 e si concentrano le risorse sul fix.

### Checkpoint 4 — fine Settimana 12

- 10 P0 chiusi;
- report di copertura aggiornato;
- retrospettiva e piano del trimestre successivo.

---

## 9. Cosa resta fuori dai 90 giorni

- I 34 P1 non elencati nella sezione 4.3.
- I 51 P2.
- Gli 89 P3.
- Lo spostamento fisico dei documenti in `content/` (Fase 7), salvo necessità.
- MDX.
- Internazionalizzazione.
- Tema scuro.
- Ricerca semantica o AI.
- Autenticazione e progressi utente.

Questi punti non sono dimenticati: sono nel backlog e nel catalogo, con stato e priorità.

---

## 10. Metriche di successo

| Metrica | Oggi | Giorno 90 |
|---|---:|---:|
| Argomenti con scheda | 0 | 218 |
| Argomenti con contenuto | 34 | 44+ (34 + 10 P0) |
| Argomenti P0 assenti | 10 | 0 |
| Rotte navigabili | 2 | ≥ 230 (home, catalogo, 218 schede, 10 percorsi, glossario) |
| Ricerca | assente | presente, offline |
| Glossario | assente | ≥ 50 termini |
| Deep link | assenti | presenti |
| Test automatici di contenuto | 0 | ≥ 15 regole |
| Copertura P1 | 0 | avviata |

Le metriche sono verificabili con lo script di validazione e con il report di copertura.

---

## 11. Collegamenti

- Audit del repository: `audit/REPOSITORY_AUDIT.md`
- Inventario: `audit/CONTENT_INVENTORY.csv`
- Classificazione: `audit/CONTENT_CLASSIFICATION.md`
- Mancanti e priorità: `audit/MISSING_TOPICS.md`
- Ambiguità: `audit/DUPLICATES_AND_AMBIGUITIES.md`
- Architettura: `audit/PROPOSED_ARCHITECTURE.md`
- Migrazione: `audit/MIGRATION_PLAN.md`
