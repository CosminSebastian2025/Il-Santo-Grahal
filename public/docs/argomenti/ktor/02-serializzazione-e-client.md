Un servizio web reale raramente risponde solo testo: scambia strutture dati con i client e a sua volta chiama altri servizi. Ktor affronta entrambi i lati con due plugin distinti, `ContentNegotiation` sul server e `ContentNegotiation` più motore HTTP sul client. Qui impari a configurare kotlinx.serialization per JSON, a gestire errori di formato e a costruire un client condiviso con timeout, base URL e validazione delle risposte.

## Obiettivi

- Configurare la serializzazione JSON sul server con kotlinx.serialization.
- Distinguere data class serializzabili, valori di default e campi ignorati.
- Costruire un client Ktor con motore, base URL, timeout e header comuni.
- Riconoscere quando la negoziazione dei contenuti deve fallire con 415 o 406.
- Gestire le eccezioni di rete e di parsing in modo esplicito.

## Serializzazione sul server

`ContentNegotiation` legge l'header `Accept` della richiesta per scegliere il formato della risposta e l'header `Content-Type` per scegliere il decodificatore del corpo in ingresso. Il serializzatore lo fornisce `kotlinx.serialization`: una libreria Kotlin-first che genera codice di conversione a compile time, senza reflection.

```kotlin
@Serializable
data class Libro(
    val id: Int,
    val titolo: String,
    val autore: String,
    @SerialName("anno_pubblicazione") val anno: Int? = null,
)

fun Application.module() {
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            encodeDefaults = false
            explicitNulls = false
        })
    }
    routing {
        post("/libri") {
            val libro = call.receive<Libro>()
            call.respond(HttpStatusCode.Created, libro)
        }
    }
}
```

Tre opzioni meritano attenzione. `ignoreUnknownKeys = true` rende il servizio tollerante a campi aggiunti da client più recenti: senza questa impostazione, un campo sconosciuto provoca un'eccezione di deserializzazione. `encodeDefaults = false` evita di scrivere nel JSON i valori uguali al default, riducendo il payload. `explicitNulls = false` omette i nulli invece di emetterli.

Kotlin conosce anche i valori non nulli senza default: se manca un campo obbligatorio il parsing fallisce, ed è il comportamento corretto per un contratto che consideri quel campo indispensabile. Per i campi opzionali, usa un tipo nullable o un valore di default.

La negoziazione dei contenuti ha un comportamento formale. Se il client invia un corpo con un `Content-Type` non registrato, il server risponde 415 Unsupported Media Type; se l'`Accept` non include alcun formato disponibile, risponde 406 Not Acceptable. Non è un dettaglio: distinguere 415 e 406 aiuta chi consuma l'API a capire se il problema è nel corpo o nella richiesta di formato.

## Il client HTTP

Il client Ktor ha la stessa architettura del server: un motore che gestisce connessioni e TLS, un `HttpClient` che espone le chiamate e plugin per serializzazione, logging, autenticazione, retry. I motori principali sono CIO, OkHttp, Apache e Darwin su Apple; su JVM puoi anche usare `java`.

```kotlin
val client = HttpClient(CIO) {
    expectSuccess = false
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
    install(HttpTimeout) {
        requestTimeoutMillis = 5_000
        connectTimeoutMillis = 2_000
        socketTimeoutMillis = 5_000
    }
    defaultRequest {
        url("https://api.example.com")
        header(HttpHeaders.Accept, ContentType.Application.Json)
    }
}
```

`expectSuccess = false` è una scelta deliberata: di default il client lancia `ClientRequestException` per le risposte 4xx e `ServerResponseException` per le 5xx. Lasciare attivo il default è spesso comodo, ma obbliga a catturare l'eccezione per leggere il corpo dell'errore. Con la soglia disattivata il codice decide caso per caso.

Un client va creato una volta e riutilizzato: contiene pool di connessioni, cache e stato del motore. Crearne uno per richiesta è uno degli errori più costosi in termini di latenza e file descriptor.

```kotlin
suspend fun caricaLibro(id: Int): Libro {
    val response = client.get("/libri/$id")
    return when (response.status) {
        HttpStatusCode.OK -> response.body<Libro>()
        HttpStatusCode.NotFound -> throw NoSuchElementException("libro $id assente")
        else -> throw IllegalStateException("stato inatteso: ${response.status}")
    }
}
```

## Errori, timeout e chiusura

Le eccezioni del client si dividono in tre gruppi: di rete (`ConnectTimeoutException`, `SocketTimeoutException`, `IOException` per connessione rifiutata o interrotta), di protocollo (`ResponseException` con codice di stato e corpo della risposta) e di serializzazione. Le prime sono tipicamente ritentabili, le seconde dipendono dal significato del codice, le terze indicano un disallineamento di contratto.

La regola operativa è non ritentare una richiesta non idempotente senza una chiave di idempotenza condivisa con il server: un `POST` ripetuto per timeout può creare due risorse. I retry con backoff esponenziale vanno limitati per numero e tempo totale, oltre che applicati solo a errori transitori come 502, 503 e 504.

Il client va chiuso con `close()` quando l'applicazione termina: in un server Ktor puoi farlo con un hook sul ciclo di vita, in un'app desktop o mobile con la gestione della cancellazione del coroutine scope che lo ospita.

```kotlin
application.environment.monitor.subscribe(ApplicationStopped) {
    client.close()
}
```

## Errori comuni

- **Installare il plugin di serializzazione e aspettarsi JSON per default**: senza `install(ContentNegotiation)` con `json()`, `call.receive` non sa decodificare e `call.respond` con un oggetto non serializza.
- **Dimenticare `@Serializable`**: il plugin del compilatore non genera il serializzatore e l'errore compare solo a runtime o in compilazione con un messaggio criptico.
- **Confondere 415 e 400**: un corpo ben formato ma con media type sbagliato è 415, un corpo JSON malformato è di solito 400.
- **Creare un `HttpClient` per ogni chiamata**: perdi pooling e TLS session reuse; riutilizza un'istanza condivisa e chiudila alla fine.

## In sintesi

- Sul server, `ContentNegotiation` con kotlinx.serialization converte oggetti e JSON rispettando `Accept` e `Content-Type`.
- Le opzioni di `Json` definiscono il grado di rigidità del contratto, non semplici comodità.
- Il client Ktor riutilizza un motore condiviso con timeout, base URL e header di default.
- Rete, protocollo e parsing sono famiglie di errore diverse e meritano politiche diverse.

## Fonti

- Ktor — Serialize data with kotlinx.serialization: https://ktor.io/docs/serialization-client.html
- Ktor — Create a client application: https://ktor.io/docs/client-create-new-application.html
- Kotlin — Serialization: https://kotlinlang.org/docs/serialization.html
- Ktor — Response validation: https://ktor.io/docs/client-response-validation.html
