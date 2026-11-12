# Piano di 90 giorni

Le quattro settimane insegnano i pezzi. Il piano di 90 giorni li mette in fila fino a un progetto KMP completo: logica condivisa, repository, stato, app Android, test e, se puoi, anche iOS.

### Come funziona

Il piano copre **12 settimane**, circa 60 minuti al giorno per 5-6 giorni a settimana. Ogni mese ha un obiettivo verificabile, non un elenco di argomenti da sfogliare.

| Mese | Settimane | Obiettivo | Risultato concreto |
| --- | --- | --- | --- |
| 1 | 1-4 | Fondamenta Kotlin e primi concetti di app | programmi console + modulo condiviso usato da Android |
| 2 | 5-8 | Kotlin applicato: API, coroutine, JSON, architettura | app Android con dati reali e logica testata |
| 3 | 9-12 | Progetto KMP reale | repository pubblico, APK, README e demo |

Se hai già seguito il percorso **Imparare Kotlin**, comprimi le settimane 1-2 in una sola e usa il tempo per il progetto.

### Le tre fasi del percorso

| Fase | Dove | Cosa impari | Obiettivo pratico | Tempo |
| --- | --- | --- | --- | --- |
| 1 — Kotlin base | settimane 1-2, mese 1 | variabili, tipi, funzioni, condizioni, cicli, classi, null safety, collezioni, lambda, extension functions, data class | piccoli programmi da console senza aiuto | 2-4 settimane da zero |
| 2 — App moderne | settimana 3, mese 2 | UI separata dalla logica, stato, eventi, API, JSON, architettura minima, repository, dependency injection, coroutine | capire che un'app ha stato, logica, fonte dati e presentazione | 1-2 settimane |
| 3 — KMP leggero | settimana 4, mese 3 | modulo `shared`, codice comune, `expect`/`actual`, uso da Android e iOS | logica scritta una volta e usata da più piattaforme | 1 settimana per il primo modulo |

**Esempi guida:**

- **Fase 1:** calcolatrice testuale, gestore di una lista di task, programma che legge dati e li filtra, piccolo sistema di utenti e prodotti.
- **Fase 2:** catalogo prodotti con repository finto, login con validazione, convertitore valute con API simulata.
- **Fase 3:** validazione di un form, conversione valute, calcolo di uno sconto, gestione di una lista di prodotti, repository che legge dati da un JSON.

**Esercizi di fase.** Ogni settimana del corso contiene 20 esercizi progressivi: i primi 14 accompagnano gli argomenti, gli ultimi 6 (15-20) sono di consolidamento e combinano più concetti. Usali come checkpoint:

| Fase | Esercizi | Checkpoint |
| --- | --- | --- |
| 1 | settimana 1 (1-20) e settimana 2 (1-20) | calcolatrice senza crash, task manager, report filtrato |
| 2 | settimana 3 (1-20) | tre stati dello store, JSON/DTO, retry, quattro test con `runTest` |
| 3 | settimana 4 (1-20) | modulo `shared` usato da Android, test comuni verdi |

### Ritmo settimanale

| Giorno | Attività | Tempo |
| --- | --- | --- |
| 1 | teoria e un esempio scritto a mano | 60 min |
| 2 | esercizi della settimana | 60 min |
| 3 | progetto: modello e funzioni pure | 60 min |
| 4 | progetto: repository e stato | 60 min |
| 5 | progetto: interfaccia e integrazione | 60 min |
| 6 | test, refactor e README | 45-60 min |
| 7 | riposo o ripasso leggero | libero |

La regola che conta: **ogni settimana produce qualcosa che gira**. Un commit, uno screenshot, un test verde. Se una settimana finisce senza un artefatto, riduci lo scope, non allungare il calendario.

## Mese 1: fondamenta

### Settimana 1 — Kotlin base

Obiettivo: scrivere programmi da console senza copiare.

- variabili, tipi, stringhe, condizioni, cicli;
- funzioni con parametri e valori di ritorno;
- classi, proprietà, metodi, null safety;
- calcolatrice testuale e gestore di task.

Verifica: completi almeno 10 esercizi della settimana 1 e la calcolatrice gestisce input non validi senza crash.

### Settimana 2 — Kotlin serio

Obiettivo: codice idiomatico e modellazione dei dati.

- `List`, `Set`, `Map` e operazioni dichiarative;
- lambda, funzioni di ordine superiore, `reduce` e `fold`;
- extension functions;
- `data class`, `copy`, destructuring, `enum class`;
- filtro dati e mini sistema utenti/prodotti.

Verifica: il programma di filtraggio usa `filter`, `map` e `groupBy`, e il sistema utenti/prodotti separa modello e stampa.

### Settimana 3 — App e architettura

Obiettivo: capire cosa succede dietro una schermata.

- UI separata dalla logica;
- stato, eventi e reducer;
- `StateFlow` e coroutine;
- chiamate HTTP con Ktor;
- JSON con `kotlinx.serialization`;
- repository, DTO e dependency injection;
- `UiState` con caricamento, successo ed errore.

Verifica: il catalogo con repository finto stampa i tre stati e il login valida i dati con funzioni pure testate.

### Settimana 4 — Primo modulo KMP

Obiettivo: vedere codice condiviso in azione.

- progetto `shared` + `androidApp`;
- `commonMain`, `androidMain`, `iosMain`, `commonTest`;
- `expect`/`actual`;
- validazione, sconto, conversione valute, repository JSON;
- uso da Android;
- framework iOS facoltativo;
- test comuni con `kotlin.test`.

Verifica: l'app Android usa `Validatore` e `CalcolatoreSconto` dal modulo `shared` e `:shared:testDebugUnitTest` passa.

### Deliverable del mese 1

- repository Git con i progetti delle quattro settimane;
- un modulo `shared` funzionante;
- una piccola app Android che usa quel modulo;
- test comuni verdi;
- README iniziale con istruzioni di build.

## Mese 2: Kotlin applicato

Il secondo mese trasforma gli esercizi in un'app che parla con il mondo. Scegli un dominio semplice e tienilo fino alla fine: cambiare idea ogni settimana azzera il progresso.

### Settimana 5 — API e coroutine

Obiettivo: dati reali da una API pubblica.

- ripasso di `suspend`, `launch`, `async`, `coroutineScope`;
- client Ktor con `ContentNegotiation`, timeout e `expectSuccess`;
- gestione di 4xx, 5xx, timeout e assenza di rete;
- cancellazione e `CancellationException`;
- API pubbliche per esercitarsi, per esempio `https://fakestoreapi.com/products`.

Verifica: una funzione `suspend` carica una lista reale, la mappa su modelli di dominio e restituisce un errore leggibile quando la rete non risponde.

### Settimana 6 — JSON, DTO e repository

Obiettivo: isolare la fonte dati.

- DTO con `@Serializable`, `@SerialName`, valori di default;
- `ignoreUnknownKeys` e campi aggiunti dal server;
- mappatura DTO → dominio;
- interfaccia `Repository` e due implementazioni: API e fake;
- cache in memoria e gestione della lista vuota;
- test del repository con JSON di esempio.

Verifica: l'app funziona con il repository finto senza rete e con quello API cambiando una sola riga nel composition root.

### Settimana 7 — Stato e UI

Obiettivo: una schermata completa e testabile.

- `UiState` con caricamento, successo, errore e vuoto;
- store con `StateFlow` e metodi `carica`, `riprova`, `cerca`;
- eventi una tantum con `SharedFlow` o `Channel`;
- ViewModel Android che espone lo stato;
- Compose con i tre stati e il pull-to-refresh;
- test dello store con `runTest` e repository finto.

Verifica: la schermata mostra caricamento, dati, errore e vuoto; il retry riparte dallo stato di caricamento; i test dello store coprono successo ed errore.

### Settimana 8 — Verso il modulo condiviso

Obiettivo: spostare la logica fuori dall'app.

- modello, validazione, repository e store in `commonMain`;
- Android usa il modulo senza duplicare regole;
- `expect`/`actual` solo per risorse, rete e piattaforma;
- test comuni eseguiti su Android;
- cenni al consumo da iOS.

Verifica: cancellare la logica dall'app Android non rompe nulla, perché vive nel modulo condiviso; i test comuni passano da riga di comando.

### Deliverable del mese 2

- app Android con dati da API o da JSON locale;
- repository sostituibile e testato;
- store con `StateFlow` e `UiState`;
- schermata con quattro stati;
- suite di test comuni;
- README con diagramma `UI -> store -> repository -> fonte dati`.

## Mese 3: progetto KMP reale

Il terzo mese è un unico progetto, sviluppato in quattro tappe. Non aggiungere funzionalità nuove dopo la settimana 11: il tempo che resta serve a rifinire, testare e documentare.

### Settimana 9 — Setup, dominio e repository

- crea il progetto `shared` + `androidApp`;
- scrivi il modello di dominio con `data class` e `enum`;
- definisci le regole e le invarianti in funzioni pure;
- scrivi l'interfaccia del repository;
- implementa un repository locale (JSON o memoria);
- testa modello, regole e repository.

Verifica: il repository restituisce dati coerenti e i test coprono i casi limite.

### Settimana 10 — Stato e app Android

- crea `UiState` e lo store con `StateFlow`;
- collega il repository allo store;
- costruisci la schermata principale con lista e dettaglio;
- aggiungi ricerca, filtro o ordinamento;
- gestisci caricamento, errore e lista vuota;
- aggiungi il retry.

Verifica: l'app si usa dall'inizio alla fine senza crash e senza rete perde lo stato in modo controllato.

### Settimana 11 — Test, API e iOS facoltativo

- test dello store con `runTest`;
- test di validazione e casi limite;
- sostituisci il repository locale con uno API, se il progetto lo prevede;
- gestisci timeout, 401 e 500 con messaggi distinti;
- se hai un Mac, collega il framework iOS e mostra la stessa logica in SwiftUI;
- prova la rotazione e il processo in background.

Verifica: la suite è verde; l'app funziona con repository fake, locale e API; ogni errore ha un messaggio comprensibile.

### Settimana 12 — Rifinitura e consegna

- correggi i bug noti;
- elimina codice morto e duplicazioni;
- scrivi il README;
- registra una demo di 60-90 secondi;
- genera l'APK di debug;
- pubblica il repository;
- prepara il riepilogo delle scelte tecniche.

Verifica: una persona esterna riesce a clonare, compilare ed eseguire il progetto seguendo solo il README.

## Progetto finale

Scegli **uno** dei tre progetti. Non importa quale: importa portarlo a termine.

### Opzione 1: Spese condivise

Un'app per dividere le spese di un gruppo.

- gruppi con partecipanti;
- spese con importo, pagatore e partecipanti coinvolti;
- calcolo del saldo per persona;
- suggerimento di rimborsi per pareggiare i conti;
- repository locale con dati di esempio;
- schermata con gruppi, dettaglio e saldo;
- test del calcolo dei saldi e dei rimborsi.

La parte difficile è il calcolo, non la UI: perfetta per mostrare logica condivisa e test.

### Opzione 2: Gestore attività condiviso

Un'app per organizzare attività per progetto.

- attività con titolo, priorità, scadenza e stato;
- filtri per stato, priorità e testo;
- ordinamento per scadenza;
- conteggio delle attività completate;
- repository locale con persistenza JSON;
- schermata con lista, filtro e dettaglio;
- test di filtro, ordinamento e stato.

La parte difficile è lo stato: tante combinazioni di filtro e aggiornamenti immutabili.

### Opzione 3: Catalogo prodotti con API

Un catalogo che legge dati da una API pubblica.

- lista prodotti con ricerca e filtro per categoria;
- dettaglio prodotto;
- cache in memoria dei risultati;
- stati caricamento, successo, errore e vuoto;
- retry e messaggi di errore distinti;
- repository API e repository fake;
- test di parsing, mappatura e store.

La parte difficile è la gestione degli errori: mostra come un'app resta usabile quando la rete non collabora.

## Requisiti del progetto finale

### Codice condiviso

- [ ] Modulo `shared` con modello, regole, repository e store.
- [ ] Nessuna classe Android o iOS in `commonMain`.
- [ ] `expect`/`actual` solo per risorse, rete e piattaforma.
- [ ] Repository definito da un'interfaccia e sostituibile.
- [ ] DTO separati dai modelli di dominio.
- [ ] Stato immutabile aggiornato con `copy`.
- [ ] `StateFlow` esposto in sola lettura.

### App Android

- [ ] Schermata principale funzionante.
- [ ] Stati di caricamento, successo, errore e vuoto.
- [ ] Azione di retry o refresh.
- [ ] Nessuna regola di business nel composable.
- [ ] Rotazione gestita senza perdere i dati importanti.
- [ ] Nessun crash con input non valido.

### Test

- [ ] Test delle funzioni pure e della validazione.
- [ ] Test del repository con JSON o fake.
- [ ] Test dello store con `runTest`.
- [ ] Almeno un test per ogni caso limite dichiarato nel README.
- [ ] `./gradlew :shared:testDebugUnitTest` verde.

### Consegna

- [ ] README con descrizione, screenshot, architettura, istruzioni e test.
- [ ] APK di debug generato.
- [ ] Demo registrata o almeno tre screenshot.
- [ ] Repository Git con commit leggibili.
- [ ] Elenco dei limiti noti e dei prossimi passi.

### Facoltativo

- [ ] Integrazione iOS con framework `Shared`.
- [ ] API reale al posto del repository locale.
- [ ] Persistenza con SQLDelight o Room KMP.
- [ ] CI GitHub Actions che esegue i test.
- [ ] Compose Multiplatform per condividere anche la UI.

## Esercizi di milestone

Questi esercizi non sono lezioni: sono checkpoint. Se uno non è chiaro, torna alla settimana indicata.

**Milestone 1.** Descrivi in dieci righe il dominio del progetto: entità, regole, azioni dell'utente. (Settimana 1-2)

**Milestone 2.** Scrivi il modello di dominio con `data class` e le regole in funzioni pure. (Settimana 2)

**Milestone 3.** Scrivi cinque test per le regole, inclusi due casi limite. (Settimana 2-3)

**Milestone 4.** Definisci il repository e due implementazioni: fake e locale. (Settimana 3)

**Milestone 5.** Crea lo store con `StateFlow` e i metodi `carica` e `riprova`. (Settimana 3)

**Milestone 6.** Collega il repository API con gestione di timeout ed errore HTTP. (Settimana 5)

**Milestone 7.** Costruisci la schermata Android con i quattro stati. (Settimana 7)

**Milestone 8.** Sposta una regola dalla UI al modulo `shared` e aggiorna i test. (Settimana 8)

**Milestone 9.** Collega il framework iOS e mostra lo stesso risultato in SwiftUI. (Settimana 11, facoltativo)

**Milestone 10.** Scrivi il README e registra la demo. (Settimana 12)

## Catalogo di progetti per livello

Se i tre progetti finali non ti convincono, scegli da qui mantenendo lo stesso scope.

| Livello | Progetti | Cosa alleni |
| --- | --- | --- |
| Iniziale | convertitore di unità, calcolatore mance, validatore password, lista della spesa | funzioni pure, validazione, liste |
| Intermedio | spese condivise, gestore attività, catalogo locale, convertitore valute | stato, repository, JSON, test |
| Avanzato | catalogo con API e cache, diario allenamenti, ricettario con ricerca, film preferiti | rete, errori, persistenza, architettura |
| Sperimentale | app con Compose Multiplatform, sincronizzazione offline, backend Ktor condiviso | UI condivisa, database, backend |

La colonna destra è più importante del nome del progetto: scegli quello che ti fa esercitare ciò che ti manca.

## Come misurare i progressi

| Momento | Domanda di controllo | Se la risposta è no |
| --- | --- | --- |
| fine mese 1 | so spiegare cosa sta in `commonMain` e cosa no? | ripassa la settimana 4 |
| fine mese 2 | so cambiare repository senza toccare la UI? | ripassa la settimana 6 |
| fine mese 3 | una persona esterna riesce a eseguire il progetto? | dedica una settimana al README e alla demo |

Non misurare i progressi con le ore: misura con artefatti. Un test verde, una schermata funzionante, un commit comprensibile, un README che basta a un'altra persona.

## Trappole frequenti

- **Scope troppo grande.** Se il progetto non sta in quattro settimane, taglia una funzionalità, non allungare il piano.
- **Riscrivere la UI a ogni idea.** Blocca il layout nella settimana 10 e usalo fino alla fine.
- **iOS troppo presto.** Android che usa il modulo condiviso è già un risultato KMP. iOS viene dopo.
- **Nessun test fino all'ultimo giorno.** I test si scrivono insieme alla logica, non alla fine.
- **Troppa architettura.** Repository, store e `UiState` bastano. Koin, moduli multipli e Clean Architecture completa arrivano quando servono davvero.
- **Chiavi API nel codice.** Non mettere segreti nel repository: usa un backend o una configurazione esterna.
- **Copiare un tutorial senza capirlo.** Se non sai spiegare una riga, riscrivila più semplice.
- **Nessun commit intermedio.** Commit frequenti e piccoli rendono visibile il percorso e recuperabile un errore.

## Dopo i 90 giorni

Il percorso non finisce con l'APK. Le direzioni naturali sono:

- **Backend con Ktor** — condividere modelli e contratti con l'app.
- **Persistenza KMP** — SQLDelight o Room KMP per dati offline.
- **Compose Multiplatform** — condividere anche la UI tra Android, iOS e desktop.
- **CI e distribuzione** — GitHub Actions per test e build, distribuzione dell'APK.
- **Pubblicazione** — mettere il progetto nel portfolio e raccontare le scelte tecniche.
- **Contributo open source** — cercare un progetto KMP e partire da una issue piccola.

La cosa più importante che porti via non è un framework: è il metodo. Modellare, testare, isolare le dipendenze, documentare. Vale per KMP e per qualunque altra piattaforma.
