# Settimana 8: test, rifinitura e consegna

Un progetto non è finito quando il codice funziona sulla tua macchina: è finito quando un'altra persona riesce ad avviarlo, usarlo e capire com'è fatto.

### Test con kotlin.test

Kotlin include una libreria di test leggera, basata su JUnit. Con Gradle aggiungi:

```kotlin
dependencies {
    testImplementation(kotlin("test"))
}
```

```kotlin
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ServizioAttivitaTest {

    private fun servizioConFileTemporaneo(): ServizioAttivita {
        val file = kotlin.io.path.createTempFile("attivita", ".json").toFile()
        file.deleteOnExit()
        return ServizioAttivita(ArchivioAttivita(file))
    }

    @Test
    fun aggiungeUnaAttivita() {
        val servizio = servizioConFileTemporaneo()

        val attivita = servizio.aggiungi("Studiare Kotlin")

        assertEquals("Studiare Kotlin", attivita.titolo)
        assertEquals(1, servizio.elenco().size)
    }

    @Test
    fun rifiutaTitoloVuoto() {
        val servizio = servizioConFileTemporaneo()

        assertFailsWith<IllegalArgumentException> {
            servizio.aggiungi("   ")
        }
    }

    @Test
    fun completaUnaAttivitaEsistente() {
        val servizio = servizioConFileTemporaneo()
        val attivita = servizio.aggiungi("Leggere")

        assertTrue(servizio.completa(attivita.id))
        assertTrue(servizio.elenco().first().completata)
    }
}
```

| Asserzione | Uso |
| --- | --- |
| `assertEquals(atteso, reale)` | confronta valori |
| `assertTrue(condizione)` | verifica vero |
| `assertFalse(condizione)` | verifica falso |
| `assertNull(valore)` | verifica `null` |
| `assertNotNull(valore)` | verifica non `null` |
| `assertFailsWith<T> { }` | verifica che l'eccezione venga lanciata |

`./gradlew test` esegue tutti i test. Un test che fallisce è un'informazione, non un fastidio: ti sta dicendo esattamente dove il comportamento non corrisponde alle aspettative.

### Cosa testare

| Cosa | Esempio |
| --- | --- |
| regole del dominio | un'attività completata non può essere completata di nuovo |
| validazione | titolo vuoto rifiutato |
| transizioni di stato | ordine `NUOVO` → `SPEDITO` |
| serializzazione | un oggetto salvato e ricaricato è uguale |
| casi limite | lista vuota, id inesistente, file corrotto |
| calcoli | totale dell'ordine, media dei voti |

Non testare l'ovvio né l'interfaccia riga per riga. Concentrati sulla logica che può rompersi e sui casi che è facile dimenticare.

Per la serializzazione:

```kotlin
@Test
fun salvaERicaricaMantieneIDati() {
    val file = kotlin.io.path.createTempFile("attivita", ".json").toFile()
    file.deleteOnExit()

    val archivio = ArchivioAttivita(file)
    val originali = listOf(Attivita(1, "Leggere", true))

    archivio.salva(originali)
    val ricaricate = archivio.carica()

    assertEquals(originali, ricaricate)
}
```

### Rifinitura e gestione degli errori

Prima di consegnare, prova a rompere il programma:

- input vuoto;
- input lunghissimo;
- numero al posto del testo e testo al posto del numero;
- id inesistente;
- file cancellato o corrotto;
- risposta HTTP `404` o `500`;
- rete assente;
- interruzione durante il salvataggio.

Per ogni caso decidi che cosa deve vedere l'utente:

- un messaggio chiaro e un'azione possibile (`Riprova`, `Torna al menu`);
- nessun crash e nessuna perdita dei dati già salvati;
- un log tecnico separato dal messaggio per l'utente, se serve.

Non inventare messaggi generici come `Errore`: spiega cosa è successo e cosa può fare l'utente.

### README e consegna

Un README completo contiene:

````markdown
# Nome del progetto

Descrizione in due righe: cosa fa e per chi.

## Requisiti

- JDK 21
- Gradle (il wrapper è incluso)

## Avvio

```bash
./gradlew run
```

## Uso

1. Scegli `1` per aggiungere un'attività.
2. Inserisci il titolo.
3. Scegli `2` per vedere l'elenco.

## Struttura

- `model/`: data class del dominio
- `service/`: regole dell'applicazione
- `storage/`: salvataggio JSON
- `ui/`: menu e input

## Test

```bash
./gradlew test
```

## Scelte progettuali

Perché JSON, perché i package sono separati, cosa è rimasto fuori dall'MVP.
````

Aggiungi esempi concreti: un comando, un output atteso, una chiamata `curl` se c'è un'API. Chi legge il README non dovrebbe dover indovinare nulla.

### Presentare il progetto

Prepara una demo di **cinque minuti**:

1. che problema risolve;
2. com'è organizzato il codice in tre frasi;
3. una dimostrazione dall'inizio alla fine;
4. un caso di errore gestito bene;
5. cosa hai imparato e cosa faresti dopo.

Se sai spiegare il progetto senza leggere il codice, lo hai capito.

### Errori comuni

- **Testare solo il caso felice.** Gli errori sono la parte che si rompe in produzione.
- **Test che dipendono dall'ordine di esecuzione.** Ogni test deve essere indipendente.
- **Usare file reali del progetto nei test.** Usa file temporanei.
- **README senza comandi di avvio.** Chi clona non sa da dove iniziare.
- **Salvare dati senza gestire il file corrotto.** Un JSON invalido non deve cancellare tutto.
- **Commit finali enormi.** Meglio pochi commit chiari lungo tutto il progetto.
- **Nessuna prova su un'altra macchina o cartella.** I percorsi relativi riservano sorprese.

## Esercizi progressivi

**Esercizio 1.** Scrivi tre test per le regole principali del tuo service.

**Esercizio 2.** Aggiungi un test di round-trip: salva su file e ricarica, verificando l'uguaglianza.

**Esercizio 3.** Gestisci un file JSON corrotto: messaggio chiaro e nessuna cancellazione automatica dei dati.

**Esercizio 4.** Aggiungi test per input vuoto, id inesistente e operazione non permessa.

**Esercizio 5.** Trova la funzione più lunga del progetto e dividila in funzioni più piccole con nomi chiari.

**Esercizio 6.** Scrivi il README completo con requisiti, avvio, uso, struttura, test e scelte.

**Esercizio 7.** Prepara un test manuale di cinque passi che copra il flusso principale e un errore.

**Esercizio 8.** Riorganizza la storia dei commit in messaggi chiari e verifica con `git log --oneline`.

**Esercizio 9.** Registra una demo di tre minuti oppure scrivi il testo che useresti per presentarla.

**Esercizio 10.** Chiedi a una persona di avviare il progetto seguendo solo il README e annota i punti poco chiari.

### Varianti

- Aggiungi l'opzione `--help` alla CLI con i comandi disponibili.
- Genera una distribuzione con `./gradlew installDist` e avviala da `build/install/...`.
- Crea un tag locale `v1.0.0` quando la consegna è completa.

## Progetti della settimana 7-8

Scegli **una** delle idee e portala fino alla consegna. Le prime tre sono le più adatte a chi vuole consolidare le basi.

| Progetto | Cosa dimostra |
| --- | --- |
| Gestore di attività | modello, persistenza JSON, menu, test |
| Gioco testuale | stato, sealed class, cicli, condizioni di vittoria |
| Dashboard di dati | collezioni, file/API, aggregazioni, output |
| Backend Ktor | HTTP, routing, JSON, repository |
| App Android con Compose | stato UI, Compose, integrazione con il modello |
| Chat client-server | coroutine, socket, protocollo, concorrenza |

### Requisiti minimi comuni

- MVP dichiarato e funzionante dall'inizio alla fine;
- modello separato da input/output;
- almeno una forma di persistenza o di scambio dati (file JSON, API, socket);
- gestione dei casi di errore principali;
- tre test automatici sulle regole;
- README con istruzioni ed esempi;
- almeno cinque commit leggibili;
- nessun `TODO` critico rimasto nel codice.

### Idee e requisiti specifici

**Gestore di attività.** Aggiunta, elenco, completamento, eliminazione, filtro per stato, salvataggio JSON, test su service e storage.

**Gioco testuale.** Almeno quattro stanze, comandi di movimento e inventario, oggetto da raccogliere, condizione di vittoria, sealed class per gli esiti, nessun crash con comandi sconosciuti.

**Dashboard di dati.** Legge un file JSON o CSV, calcola totali e medie, raggruppa per categoria, mostra i primi cinque risultati, gestisce file mancante o malformato.

**Backend Ktor.** Due risorse collegate, rotte CRUD, JSON con kotlinx.serialization, repository in memoria, test sulle rotte o sul service, README con esempi `curl`.

**App Android.** Una schermata Compose con lista e aggiunta, stato gestito correttamente, modello condiviso con il service, gestione dell'input vuoto. La persistenza è opzionale.

**Chat client-server.** Due processi, protocollo JSON modellato con sealed interface, coroutine per ricevere e inviare, messaggio di benvenuto e uscita pulita.

### Criteri di verifica

- [ ] `./gradlew test` termina con tutti i test verdi.
- [ ] Il flusso principale funziona seguendo solo il README.
- [ ] I dati restano dopo un riavvio (dove previsto).
- [ ] I casi di errore principali mostrano messaggi comprensibili.
- [ ] Il codice è diviso in model, service e interfaccia/storage.
- [ ] Non ci sono funzioni enormi né duplicazioni evidenti.
- [ ] La storia dei commit è leggibile.
- [ ] Sai spiegare in cinque minuti le scelte principali.

### Come verificare di aver finito

- il progetto parte da una cartella pulita con `./gradlew run`;
- i test passano con `./gradlew test`;
- il README contiene tutto il necessario;
- una persona esterna riesce a usare il programma;
- sai indicare che cosa è fuori dall'MVP e perché.

## Dopo il percorso: altri progetti

Il corso finisce, la pratica continua. Ecco un catalogo per scegliere il prossimo progetto in base al livello.

### Progetti iniziali

- **Calcolatrice** con menu e gestione degli errori (già nella settimana 1: rifalla senza guardare).
- **Convertitore di valute** con tassi inseriti a mano e formattazione corretta.
- **Indovina il numero** con livelli di difficoltà.
- **Generatore di password** con lunghezza e categorie di caratteri scelte dall'utente.
- **Conto alla rovescia** con input dei minuti e aggiornamento ogni secondo.

### Progetti intermedi

- **To-do list** da terminale con priorità e scadenze.
- **Rubrica** con ricerca, modifica ed eliminazione, salvata su JSON.
- **Diario personale** con una voce per giorno e riepilogo mensile.
- **Quiz a risposte multiple** con punteggio e domande lette da JSON.
- **Analizzatore di testo** con frequenze, lunghezza media delle parole e parole più lunghe.

### Progetti avanzati

- **App Android con Jetpack Compose**: lista, dettaglio, stato e persistenza.
- **API REST con Ktor**: autenticazione semplice, validazione, database.
- **Client meteo**: API pubblica, gestione errori di rete, salvataggio delle ultime ricerche.
- **Chat client-server**: più client, stanze, protocollo JSON.
- **Applicazione multiplatform**: modello condiviso tra Android, desktop e backend.

La regola è sempre la stessa: scegli un progetto, riducilo a un MVP, portalo fino alla consegna e solo dopo aggiungi funzionalità.

### Dopo Kotlin

Approfondisci in base alla direzione che hai scelto:

- **Android**: Compose, stato, navigazione, Room.
- **Backend**: Ktor o Spring Boot, database, test di integrazione, Docker.
- **Coroutine avanzate**: `Flow`, canali, concorrenza strutturata e gestione degli errori.
- **Qualità**: test parametrizzati, mocking, analisi statica e CI.

Da qui in poi il passo più utile non è un altro tutorial: è un progetto scelto da te, usato da qualcuno, con test e istruzioni chiare.
