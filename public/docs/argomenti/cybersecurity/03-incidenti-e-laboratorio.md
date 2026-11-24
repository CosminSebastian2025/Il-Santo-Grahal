Un incidente di sicurezza non è solo un attacco riuscito: è qualsiasi evento che mette in dubbio la riservatezza, l'integrità o la disponibilità dei sistemi e richiede una decisione sotto pressione. La differenza tra un evento fastidioso e una crisi sta quasi sempre in quanto la risposta era preparata. Qui ripercorri il ciclo di gestione e chiudi con sei esercizi su un tavolo di lavoro locale.

## Obiettivi

- Descrivere le fasi di rilevamento, contenimento, eradicazione, recupero e lezione appresa.
- Preparare un registro di incidente con ruoli e soglie di escalation.
- Usare in modo difensivo log, intestazioni HTTP e scansione locale.
- Riconoscere quando un test richiede autorizzazione scritta.

## Il ciclo di gestione

La gestione segue un ciclo ripetibile. Il rilevamento trasforma un segnale in un caso: un picco di errori 401, un accesso da una posizione anomala, un avviso del fornitore cloud. Il contenimento limita il danno con revoca di credenziali, blocco di un endpoint o isolamento di un host. L'eradicazione elimina la causa, non solo il sintomo. Il recupero riporta il servizio in condizioni note e verificate. La lezione appresa produce modifiche a test, configurazioni e modello delle minacce.

Il NIST Cybersecurity Framework organizza queste attività in identificazione, protezione, rilevamento, risposta e recupero, e ricorda che rilevare senza saper rispondere genera solo rumore. Per un piccolo team bastano un foglio di contatto, un canale dedicato e un criterio dichiarato per distinguere un incidente grave da una curiosità.

## Prepararsi prima, non durante

La preparazione si misura con tre documenti brevi. Il **registro di incidente** raccoglie data e ora, sistemi coinvolti, dati potenzialmente esposti, decisioni e chi le ha prese. La **matrice di escalation** stabilisce chi contatta il legale o il responsabile della protezione dei dati. L'**elenco delle credenziali da revocare** per ogni sistema evita che il contenimento richieda mezz'ora per trovare chi ha la password del pannello.

| Fase | Domanda guida | Artefatto prodotto |
| --- | --- | --- |
| Rilevamento | Che cosa vediamo e da quando? | caso con timestamp e primo segnale |
| Contenimento | Come limitiamo il danno ora? | credenziali revocate, accessi sospesi |
| Eradicazione | Qual è la causa rimossa? | correzione verificata |
| Recupero | Il servizio è tornato coerente? | verifica post-ripristino |
| Lezione | Che cosa cambiamo? | azioni con proprietario e data |

Una preparazione utile include la comunicazione: stabilisci in anticipo chi parla all'esterno, prepara modelli di testo neutri e verifica i contatti dei fornitori.

## Osservare in modo difensivo

L'osservazione difensiva si basa su fonti che già possiedi: log applicativi, log del reverse proxy, eventi di autenticazione, metriche. Un log con identificativo di richiesta, utente, rotta ed esito permette di ricostruire una sequenza; un log solo testuale costringe a leggere righe una per una.

Le intestazioni HTTP mostrano come un servizio espone le proprie risorse: `Strict-Transport-Security` e `X-Content-Type-Options` sono controlli economici da automatizzare in pipeline, e i cookie di sessione devono avere `Secure` e `HttpOnly`.

```bash
# Intestazioni di risposta di un dominio di cui sei responsabile
curl -sI https://example.com | grep -Ei 'strict-transport|content-type-options|content-security'

# Righe che meritano una occhiata nei log di accesso: esiti 401/403 concentrati
awk '{print $9}' access.log | sort | uniq -c | sort -nr | head
```

Anche una scansione locale del tuo codice è osservazione difensiva: pattern rischiosi come HTML dinamico lato browser o query costruite per concatenazione sono candidati da revisionare.

## Laboratorio su un ambiente tuo

Per un esercizio realistico serve un bersaglio che ti appartenga: un'applicazione locale, un container di prova, un sito statico tuo. Sui sistemi di altri serve un'autorizzazione scritta che specifichi ambito, finestra temporale e limiti.

Un buon esercizio parte dal modello delle minacce e non dallo strumento. Scegli una funzione, come il caricamento di un file, elenca chi può accedervi e cosa dovrebbe accadere in caso di abuso. Spesso la lezione più utile non è "ho trovato una vulnerabilità", ma "non avevamo i log per saperlo".

## Esercizi

1. **Inventario degli asset.** Prendi una tua applicazione locale e scrivi l'elenco di asset, confini di fiducia e punti di ingresso. Individua il punto in cui i dati di un utente attraversano un confine senza controllo esplicito.
2. **Registro di incidente.** Simula una fuga di sessioni: due account di prova, un log di accesso. Scrivi la cronologia delle prime tre azioni di contenimento, con timestamp e responsabile, in un file Markdown locale.
3. **Verifica delle intestazioni.** Avvia un servizio locale e misura quali intestazioni di sicurezza risponde. Aggiungi o rimuovi configurazioni nel tuo server di sviluppo e documenta l'effetto su `curl -sI`.
4. **Analisi dei log.** Genera un log di accesso sintetico con esiti misti. Scrivi un comando che estragga i codici di stato più frequenti e le rotte con più 403, senza usare servizi esterni.
5. **Escalation.** Definisci a tavolino tre scenari (servizio non disponibile, credenziali rubate, dati esposti) e per ciascuno scrivi chi viene chiamato, entro quanto tempo e quale decisione spetta a chi.
6. **Autorizzazione dei test.** Scrivi un breve documento di autorizzazione per testare la tua applicazione locale: ambito, strumenti ammessi, orari, contatti e cosa fare in caso di scoperta imprevista. Firmalo come se fosse un accordo reale.

<details><summary>Soluzione</summary>

**Esercizio 1.** L'inventario va scritto per flussi. Prendi l'endpoint di caricamento, descrivi il percorso e verifica che l'oggetto abbia un proprietario registrato e che la lettura controlli quel proprietario.

**Esercizio 2.** La cronologia inizia con il momento dell'autenticazione sospetta, non con la scoperta. I passi previsti sono revoca delle sessioni dell'utente coinvolto, rotazione del segreto di firma dei token e verifica di accessi o utenti aggiunti nel periodo.

**Esercizio 3.** Se il servizio locale gira su HTTP, `Secure` impedisce l'invio del cookie: annota la condizione e riusa la stessa configurazione dietro un proxy con TLS locale.

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
```

**Esercizio 4.** I codici di stato più frequenti aiutano a distinguere rumore e segnale, ma i 401 sono normali in un flusso con login: guarda la distribuzione delle rotte.

```bash
awk '{print $9}' access.log | sort | uniq -c | sort -nr | head
```

**Esercizio 5.** Per credenziali rubate l'escalation deve essere immediata e breve: contenere prima, comunicare dopo, con un canale dichiarato. Per dati esposti serve sapere chi valuta gli obblighi informativi, senza improvvisare durante l'evento.

**Esercizio 6.** L'autorizzazione deve specificare che il test è limitato all'ambiente locale dell'autore e che ogni scoperta viene condivisa per la correzione. Un test autorizzato non è un permesso di esplorare altri sistemi.

</details>

## Errori comuni

- **Scoprire senza registrare**: ricostruire la cronologia a memoria il giorno dopo è quasi impossibile; annotare timestamp e decisioni mentre succedono costa pochi minuti.
- **Contenere distruggendo le prove**: cancellare un host o i log prima di conservarli rende impossibile capire da dove arriva l'accesso; prima si preserva una copia, poi si isola.
- **Confondere notifica e comunicazione pubblica**: avvisare le persone giuste non è lo stesso di pubblicare un annuncio, e chi gestisce i sistemi non deve essere anche l'unico interlocutore esterno.
- **Testare senza autorizzazione**: anche un controllo "innocuo" su un sistema di altri può violare termini d'uso e obblighi di legge; l'ambito va scritto prima.

## In sintesi

La gestione degli incidenti è un ciclo sostenuto da un registro e da una matrice di escalation. Log strutturati e intestazioni verificate sono difese economiche. Un ambiente locale tuo è il contesto giusto per esercitarsi; sui sistemi altrui serve l'autorizzazione scritta. La lezione appresa deve diventare un test, altrimenti l'incidente è solo rimandato.

## Fonti

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [RFC 9110 – HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
