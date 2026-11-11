# Settimana 6: file, JSON e dipendenze

Un programma utile conserva i dati e li scambia con il mondo esterno. In questa settimana impari a leggere e scrivere file, serializzare oggetti in JSON, chiamare un'API HTTP e gestire il progetto con Gradle.

### File di testo

```kotlin
import java.io.File

fun main() {
    val file = File("note.txt")

    file.writeText("Prima riga\n")       // crea o sovrascrive
    file.appendText("Seconda riga\n")    // aggiunge in fondo

    println(file.exists())
    println(file.readText())

    file.readLines().forEachIndexed { indice, riga ->
        println("${indice + 1}: $riga")
    }
}
```

| Metodo | Effetto |
| --- | --- |
| `writeText(testo)` | scrive tutto, sovrascrivendo |
| `appendText(testo)` | aggiunge in fondo |
| `readText()` | legge tutto il contenuto |
| `readLines()` | restituisce una lista di righe |
| `forEachLine { }` | scorre le righe senza caricarle tutte |
| `exists()` | vero se il file esiste |
| `delete()` | elimina il file |

L'encoding predefinito è UTF-8. Per i file grandi usa `useLines`, che chiude lo stream automaticamente:

```kotlin
File("grande.txt").useLines { righe ->
    righe.filter { it.isNotBlank() }
        .take(10)
        .forEach { println(it) }
}
```

### Percorsi e cartelle

Un percorso relativo dipende dalla **directory di lavoro**, che in IntelliJ è la radice del progetto e da terminale è la cartella da cui lanci il comando. Se un file "non esiste", stampa `File("note.txt").absolutePath` e controlla dove lo stai cercando.

```kotlin
import java.io.File

val cartella = File("dati")
if (!cartella.exists()) {
    cartella.mkdirs()
}

val file = File(cartella, "note.txt")
file.writeText("contenuto")
```

Con NIO, l'API più moderna:

```kotlin
import java.nio.file.Files
import java.nio.file.Path

val percorso = Path.of("note.txt")
Files.writeString(percorso, "ciao")
val testo = Files.readString(percorso)
```

### JSON con kotlinx.serialization

Il **JSON** è il formato standard per scambiare dati con API e file di configurazione. La libreria `kotlinx.serialization` trasforma oggetti Kotlin in JSON e viceversa.

Nel `build.gradle.kts` servono il plugin e la dipendenza:

```kotlin
plugins {
    kotlin("jvm") version "2.1.20"
    kotlin("plugin.serialization") version "2.1.20"
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.0")
}
```

```kotlin
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class Libro(val titolo: String, val autore: String, val anno: Int)

fun main() {
    val json = Json { prettyPrint = true }

    val libro = Libro("Dune", "Frank Herbert", 1965)
    val testo = json.encodeToString(libro)
    println(testo)

    val letto = json.decodeFromString<Libro>(testo)
    println(letto)
}
```

Output:

```json
{
    "titolo": "Dune",
    "autore": "Frank Herbert",
    "anno": 1965
}
```

Anche le liste funzionano:

```kotlin
val libri = listOf(
    Libro("Dune", "Frank Herbert", 1965),
    Libro("1984", "George Orwell", 1949)
)

val testo = json.encodeToString(libri)
val letti = json.decodeFromString<List<Libro>>(testo)
```

Per JSON esterni con campi diversi o sconosciuti:

```kotlin
import kotlinx.serialization.SerialName

@Serializable
data class Utente(
    val id: Int,
    @SerialName("first_name") val nome: String,
    val email: String? = null
)

val json = Json {
    prettyPrint = true
    ignoreUnknownKeys = true
}
```

`@SerialName` mappa un nome JSON diverso; `ignoreUnknownKeys` evita errori quando il JSON contiene campi che non modelliamo; il valore predefinito `null` rende il campo opzionale.

### Chiamare un'API HTTP

Java mette a disposizione un client HTTP standard:

```kotlin
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

fun main() {
    val client = HttpClient.newHttpClient()

    val richiesta = HttpRequest.newBuilder()
        .uri(URI.create("https://jsonplaceholder.typicode.com/todos/1"))
        .timeout(Duration.ofSeconds(10))
        .GET()
        .build()

    val risposta = client.send(richiesta, HttpResponse.BodyHandlers.ofString())

    println(risposta.statusCode())
    println(risposta.body())
}
```

`send` è bloccante: in un'applicazione con coroutine va eseguito su `Dispatchers.IO`.

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

suspend fun scarica(url: String): String = withContext(Dispatchers.IO) {
    val client = HttpClient.newHttpClient()
    val richiesta = HttpRequest.newBuilder()
        .uri(URI.create(url))
        .header("Accept", "application/json")
        .GET()
        .build()

    val risposta = client.send(richiesta, HttpResponse.BodyHandlers.ofString())
    check(risposta.statusCode() == 200) { "HTTP ${risposta.statusCode()}" }
    risposta.body()
}
```

Controlla sempre il codice di stato: un corpo di errore non è un JSON valido e il parsing fallirà in modo poco chiaro.

### Gradle

Gradle gestisce dipendenze, compilazione, test ed esecuzione. La struttura di un progetto:

```text
progetto/
  build.gradle.kts
  settings.gradle.kts
  src/
    main/kotlin/Main.kt
    test/kotlin/
```

`settings.gradle.kts`:

```kotlin
rootProject.name = "kotlin-cli"
```

`build.gradle.kts`:

```kotlin
plugins {
    kotlin("jvm") version "2.1.20"
    kotlin("plugin.serialization") version "2.1.20"
    application
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.0")
    testImplementation(kotlin("test"))
}

application {
    mainClass.set("MainKt")
}

tasks.test {
    useJUnitPlatform()
}
```

| Comando | Effetto |
| --- | --- |
| `gradle wrapper` | genera il wrapper (`gradlew`) |
| `./gradlew run` | compila ed esegue `main` |
| `./gradlew build` | compila e lancia i test |
| `./gradlew test` | esegue solo i test |
| `./gradlew clean` | pulisce la cartella `build` |

Su Windows usa `gradlew.bat run`. Il wrapper fissa la versione di Gradle del progetto: chi clona il repository non deve installare nulla a mano.

`mainClass` è il nome della classe generata dal file: `Main.kt` diventa `MainKt`.

### Librerie esterne

Le dipendenze si prendono da **Maven Central**. Prima di aggiungere una libreria chiediti:

- risolve davvero il problema o basta la libreria standard?
- è mantenuta e documentata?
- quali dipendenze porta con sé?
- la versione è compatibile con il tuo Kotlin e la tua JVM?

Le versioni in questo corso sono di riferimento: quando crei un progetto nuovo usa quelle indicate nella documentazione ufficiale, evitando di mescolare versioni incompatibili.

### Esempio completo: scarica un TODO e salvalo

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

@Serializable
data class Todo(val userId: Int, val id: Int, val title: String, val completed: Boolean)

fun scarica(url: String): String {
    val client = HttpClient.newHttpClient()
    val richiesta = HttpRequest.newBuilder()
        .uri(URI.create(url))
        .header("Accept", "application/json")
        .GET()
        .build()

    val risposta = client.send(richiesta, HttpResponse.BodyHandlers.ofString())
    check(risposta.statusCode() == 200) { "HTTP ${risposta.statusCode()}" }
    return risposta.body()
}

fun main() = runBlocking {
    val json = Json {
        prettyPrint = true
        ignoreUnknownKeys = true
    }

    val corpo = withContext(Dispatchers.IO) {
        scarica("https://jsonplaceholder.typicode.com/todos/1")
    }

    val todo = json.decodeFromString<Todo>(corpo)
    File("todo.json").writeText(json.encodeToString(todo))

    println("Salvato: ${todo.title}")
    println("Completato: ${todo.completed}")
}
```

### Errori comuni

- **Percorso relativo inatteso.** Stampa `absolutePath` e verifica la directory di lavoro.
- **Sovrascrivere senza volerlo.** `writeText` cancella il contenuto precedente: usa `appendText` per aggiungere.
- **Caricare file enormi con `readText`.** Usa `useLines` e processa una riga alla volta.
- **Dimenticare il plugin di serializzazione.** L'errore "Serializer has not been found" arriva dal plugin mancante, non dalla data class.
- **Modellare male il JSON.** Campi mancanti o nomi diversi producono eccezioni: usa valori predefiniti e `@SerialName`.
- **Chiamare la rete sul thread sbagliato.** Usa `withContext(Dispatchers.IO)`.
- **Non controllare lo stato HTTP.** Un `404` restituisce comunque un corpo: verifica `statusCode()`.
- **Dimenticare una dipendenza nel build.** `./gradlew build` fallisce con "unresolved reference": aggiungi la libreria.

## Esercizi progressivi

**Esercizio 1.** Scrivi tre righe in un file, leggile e stampale numerate.

**Esercizio 2.** Aggiungi una riga a un file esistente e conta quante righe contiene ora.

**Esercizio 3.** Leggi un file con un numero per riga, calcola la somma e ignora le righe non numeriche con un messaggio.

**Esercizio 4.** Copia un file in un secondo file, saltando le righe vuote.

**Esercizio 5.** Leggi un file CSV con righe `nome,eta` e trasformalo in una lista di data class.

**Esercizio 6.** Salva una lista di libri in JSON e rileggila, verificando che i dati coincidano.

**Esercizio 7.** Decodifica un JSON con un campo in più e un campo mancante usando `ignoreUnknownKeys` e un valore predefinito.

**Esercizio 8.** Scarica `https://jsonplaceholder.typicode.com/todos/1` e stampa titolo e stato di completamento.

**Esercizio 9.** Scarica la lista dei TODO e conta quanti sono completati.

**Esercizio 10.** Gestisci una risposta `404` con un messaggio leggibile, senza far crashare il programma.

**Esercizio 11.** Scarica due endpoint in parallelo con `async` e combina i risultati.

**Esercizio 12.** Scrivi una CLI che legge un file di testo, conta le parole e salva un report JSON con totale, parole distinte e le cinque più frequenti.

### Varianti

- Aggiungi a ogni riga di un file di log la data corrente con `java.time.LocalDateTime.now()`.
- Salva il report dell'esercizio 12 in una cartella `report/`, creandola se non esiste.
- Usa `@SerialName` per mappare i campi `userId` e `title` su nomi italiani.

## Progetti della settimana 5-6

### Progetto 1: App che legge un file di testo

Requisiti:

- riceve il percorso del file come argomento o lo chiede all'utente;
- conta righe, parole e caratteri;
- elenca le parole distinte e le cinque più frequenti;
- gestisce file mancante, file vuoto e righe vuote;
- salva un report JSON accanto al file di input.

### Progetto 2: Programma che scarica dati da un'API pubblica

Requisiti:

- usa `https://jsonplaceholder.typicode.com` (utenti, post o todo);
- scarica i dati in una coroutine su `Dispatchers.IO`;
- modella la risposta con data class `@Serializable`;
- filtra o ordina i dati e stampa un riepilogo leggibile;
- salva il risultato in un file JSON;
- gestisce timeout, stato HTTP diverso da 200 e JSON inatteso.

### Progetto 3: CLI che salva dati in JSON

Requisiti:

- gestisce una raccolta di elementi a scelta (attività, spese, contatti);
- menu con aggiungi, elenca, cerca, elimina ed esci;
- i dati sono salvati in un file JSON e ricaricati all'avvio;
- ogni modifica viene persistita subito;
- input non validi gestiti con messaggi;
- se il file non esiste, parte con una raccolta vuota.

### Criteri di verifica

- [ ] Il programma funziona sia da IntelliJ sia da terminale con `./gradlew run`.
- [ ] I file vengono chiusi correttamente (`useLines`, `use`).
- [ ] JSON e data class corrispondono; i campi opzionali hanno un default.
- [ ] Le chiamate di rete sono su `Dispatchers.IO` e controllano lo stato HTTP.
- [ ] Il programma non perde dati tra un avvio e l'altro.
- [ ] Errori di file, rete e input producono messaggi comprensibili.
- [ ] Il progetto ha un `.gitignore` con `build/` e i file locali.

Nelle settimane 7 e 8 scegli un progetto completo e lo porti fino alla consegna.
