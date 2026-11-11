# Settimana 7: progetto, prima parte

Le prime sei settimane ti hanno dato gli strumenti. Da qui in avanti il progetto è il corso: scegli un'applicazione, la riduci a un MVP e la costruisci un pezzo alla volta.

### Scegliere il progetto

| Idea | Competenze | Difficoltà |
| --- | --- | --- |
| Gestore di attività da terminale | classi, JSON, file, menu | media |
| Gioco testuale | sealed class, stato, cicli | media |
| Dashboard di dati | collezioni, file/API, output | media |
| Backend con Ktor | HTTP, routing, JSON | medio-alta |
| App Android con Jetpack Compose | UI, stato, Android | alta |
| Chat client-server da console | socket, coroutine, protocollo | alta |

Scegli in base a ciò che vuoi imparare, non a ciò che sembra più impressionante. Un gestore di attività completo e ben fatto vale più di un backend Ktor lasciato a metà.

### Definire un MVP

**MVP** significa Minimum Viable Product: la versione più piccola che fa davvero qualcosa di utile dall'inizio alla fine.

Per un gestore di attività l'MVP è:

- aggiungere un'attività;
- elencare le attività;
- segnare un'attività come completata;
- salvare e ricaricare da JSON.

Non sono nell'MVP: account utente, notifiche, sincronizzazione, temi grafici, ricerca avanzata. Arrivano dopo, se arrivano.

Scrivi il perimetro prima di scrivere il codice:

```text
Obiettivo: gestire attività personali da terminale.
Utente: una persona sola, sul proprio computer.
Azioni: aggiungi, elenca, completa, elimina.
Dati: id, titolo, completata, data di creazione.
Persistenza: file JSON locale.
Fuori scope: account, notifiche, sincronizzazione.
```

### Storie utente

Una **storia utente** descrive un bisogno dal punto di vista di chi usa il programma:

- Come utente, voglio aggiungere un'attività con un titolo, così posso ricordarmela.
- Come utente, voglio vedere tutte le attività aperte, così so cosa devo fare.
- Come utente, voglio segnare un'attività come completata, così tengo traccia dei progressi.
- Come utente, voglio che i dati restino dopo la chiusura, così non perdo il lavoro.
- Come utente, voglio un messaggio chiaro se il file è corrotto, così so cosa fare.

Da ogni storia derivano i test e i criteri di accettazione.

### Architettura minima

Anche un progetto piccolo guadagna da una divisione semplice:

```text
progetto/
  src/main/kotlin/
    model/       data class e enum del dominio
    service/     regole dell'applicazione
    storage/     lettura e scrittura JSON
    ui/          menu e input/output
    Main.kt      avvio
```

La direzione delle dipendenze è una sola:

```text
ui -> service -> storage
         |
       model
```

- `model` non conosce nessuno.
- `storage` salva e carica oggetti, senza regole di business.
- `service` applica le regole e usa lo storage.
- `ui` parla con il service e gestisce l'input.

Per un progetto da console puoi iniziare con meno cartelle, ma tieni separati modello, salvataggio e menu.

### Modello e persistenza

```kotlin
import kotlinx.serialization.Serializable

@Serializable
data class Attivita(
    val id: Int,
    val titolo: String,
    val completata: Boolean = false
)
```

```kotlin
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

class ArchivioAttivita(private val file: File) {

    private val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
    }

    fun carica(): List<Attivita> =
        if (file.exists()) {
            json.decodeFromString(file.readText())
        } else {
            emptyList()
        }

    fun salva(attivita: List<Attivita>) {
        file.writeText(json.encodeToString(attivita))
    }
}
```

Il service contiene le operazioni:

```kotlin
class ServizioAttivita(private val archivio: ArchivioAttivita) {

    private val attivita = archivio.carica().toMutableList()

    fun elenco(): List<Attivita> = attivita.toList()

    fun aggiungi(titolo: String): Attivita {
        require(titolo.isNotBlank()) { "Il titolo non può essere vuoto" }
        val nuova = Attivita(
            id = (attivita.maxOfOrNull { it.id } ?: 0) + 1,
            titolo = titolo.trim()
        )
        attivita.add(nuova)
        archivio.salva(attivita)
        return nuova
    }

    fun completa(id: Int): Boolean {
        val indice = attivita.indexOfFirst { it.id == id }
        if (indice == -1) return false
        attivita[indice] = attivita[indice].copy(completata = true)
        archivio.salva(attivita)
        return true
    }
}
```

Nota la direzione: il service non sa nulla del menu, lo storage non sa nulla delle regole. Puoi testare il service con un archivio finto o con un file temporaneo.

### Se scegli Ktor

Un backend minimo con Ktor:

```kotlin
plugins {
    kotlin("jvm") version "2.1.20"
    id("io.ktor.plugin") version "3.1.1"
    kotlin("plugin.serialization") version "2.1.20"
}

dependencies {
    implementation(platform("io.ktor:ktor-bom:3.1.1"))
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-netty")
    implementation("io.ktor:ktor-server-content-negotiation")
    implementation("io.ktor:ktor-serialization-kotlinx-json")
}
```

```kotlin
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.response.respond
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import kotlinx.serialization.Serializable

@Serializable
data class Attivita(val id: Int, val titolo: String, val completata: Boolean = false)

fun main() {
    embeddedServer(Netty, port = 8080) {
        install(ContentNegotiation) { json() }

        routing {
            get("/") {
                call.respondText("Ktor funziona")
            }
            get("/api/attivita") {
                call.respond(listOf(Attivita(1, "Studiare Kotlin")))
            }
        }
    }.start(wait = true)
}
```

`call` è disponibile dentro le rotte; per `respondText` serve l'import `io.ktor.server.response.respondText`.

Se scegli questa strada, l'MVP è: due rotte, un modello serializzabile, un repository in memoria. Il database arriva dopo.

### Se scegli Android

Un'app Android con Jetpack Compose richiede Android Studio e un emulatore. L'MVP:

- una schermata con la lista delle attività;
- un campo di testo e un pulsante per aggiungere;
- stato gestito con `remember` e `mutableStateListOf`;
- nessuna persistenza nella prima versione.

Estratto di UI, non un progetto completo:

```kotlin
setContent {
    MaterialTheme {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Le mie attività", style = MaterialTheme.typography.headlineSmall)
            Text("${attivita.size} totali")
        }
    }
}
```

Il modello e il service restano gli stessi: cambia solo la UI.

### Se scegli una chat o un gioco

Per una chat serve un **protocollo**: che cosa si scambiano client e server. Modellalo con una sealed interface:

```kotlin
sealed interface Messaggio {
    data class Testo(val da: String, val contenuto: String) : Messaggio
    data object Arrivederci : Messaggio
}
```

Serializza i messaggi in JSON e inviali una riga alla volta. Per un gioco testuale modella gli esiti:

```kotlin
sealed class Esito {
    data class Ok(val messaggio: String) : Esito()
    data class Errore(val messaggio: String) : Esito()
    data object Vittoria : Esito()
}
```

### Piano dei cinque giorni

| Giorno | Obiettivo |
| --- | --- |
| 1 | perimetro, storie utente, modello, progetto Gradle, primo commit |
| 2 | service con le regole e tre test |
| 3 | flusso principale completo (menu, UI o rotta API) |
| 4 | persistenza o rete, gestione degli errori |
| 5 | rifinitura, README, test manuale, commit |

Un **commit al giorno** con un messaggio chiaro racconta il lavoro meglio di un unico commit finale.

### Errori comuni

- **Progetto troppo grande.** Se l'MVP richiede più di due settimane, riducilo.
- **Partire dalla UI o dal framework.** Parti dal modello e dal flusso principale.
- **Rimandare la persistenza alla fine.** Scopri subito se il formato JSON funziona.
- **Scrivere tutto in `main`.** Separa modello, service e interfaccia.
- **Copiare un tutorial senza adattarlo.** Il codice che non sai spiegare non è tuo.
- **Rifattorizzare all'infinito senza consegnare.** Prima fai funzionare un flusso completo, poi migliora.
- **Nessun commit intermedio.** Se qualcosa si rompe, non hai un punto sicuro a cui tornare.
- **README alla fine.** Scrivi le istruzioni mentre costruisci: scopri subito i passaggi mancanti.

## Esercizi progressivi

**Esercizio 1.** Scrivi in un paragrafo che cosa fa il tuo progetto e per chi è pensato.

**Esercizio 2.** Elenca cinque storie utente e scegli le tre che entrano nell'MVP.

**Esercizio 3.** Definisci le data class del dominio e almeno un enum o una sealed class.

**Esercizio 4.** Elenca cinque casi di errore (input vuoto, file mancante, id inesistente, JSON corrotto, operazione non permessa) e come li gestirai.

**Esercizio 5.** Crea il progetto Gradle con la struttura a package e fai partire un `main` che stampa il nome del progetto.

**Esercizio 6.** Implementa il modello e tre test sulle regole principali.

**Esercizio 7.** Completa un flusso end-to-end: aggiungi un elemento, elencalo, modificalo.

**Esercizio 8.** Aggiungi la persistenza su file (o una rotta API) e verifica che i dati sopravvivano al riavvio.

**Esercizio 9.** Scrivi il README con prerequisiti, comandi di avvio ed esempi d'uso.

**Esercizio 10.** Fai un commit con un messaggio che spiega il traguardo raggiunto.

### Varianti

- Aggiungi al modello una data di creazione con `java.time.LocalDate` e serializzala come stringa.
- Introduci un'interfaccia `RepositoryAttivita` con due implementazioni: file e memoria.
- Scrivi un test che usa una cartella temporanea invece del file reale.

## Progetto della settimana 7

Requisiti:

- scegli una delle idee proposte (o una equivalente impegnativa);
- scrivi obiettivo, MVP, storie utente e fuori scope;
- crea il progetto Gradle con struttura a package;
- implementa modello, service e almeno un flusso completo;
- aggiungi persistenza su file o una prima rotta API;
- scrivi almeno tre test sulle regole di dominio;
- esegui il programma più volte e verifica che i dati restino;
- README con istruzioni di avvio;
- almeno tre commit leggibili.

### Criteri di verifica

- [ ] L'MVP è ridotto e dichiarato.
- [ ] Il flusso principale funziona dall'inizio alla fine.
- [ ] Le responsabilità sono separate in package.
- [ ] Il modello non contiene input/output.
- [ ] I test coprono le regole più importanti.
- [ ] Il programma gestisce i casi di errore elencati.
- [ ] Il README permette a un'altra persona di avviare il progetto.

Nella settimana 8 il progetto viene testato, rifinito e consegnato.
