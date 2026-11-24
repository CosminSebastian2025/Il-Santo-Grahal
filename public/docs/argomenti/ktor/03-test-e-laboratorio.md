Un endpoint che funziona a mano con `curl` può rompersi al primo refactoring: senza test automatici te ne accorgi solo in produzione. Ktor espone `testApplication`, che avvia l'applicazione con un motore in memoria, senza porte di rete, e permette di inviare richieste e ispezionare risposte come farebbe un client esterno. In questo laboratorio costruisci un servizio di libri e lo testi da cima a fondo.

## Obiettivi

- Configurare le dipendenze di test di Ktor e le dipendenze del client di test.
- Usare `testApplication` con `client` e `createClient` per inviare richieste.
- Verificare stato, header e corpo JSON senza dipendere da una porta.
- Organizzare i test in modo che l'isolamento tra casi sia garantito.
- Distinguere test del contratto da test della logica interna.

## Preparazione

Nel `build.gradle.kts` servono, oltre a `ktor-server-netty` e alla negoziazione, le dipendenze `ktor-server-test-host` e `kotlin("test")` con scope `testImplementation`. Per deserializzare le risposte nel client di test aggiungi `ktor-client-content-negotiation` e `ktor-serialization-kotlinx-json`.

```kotlin
plugins {
    kotlin("jvm") version "2.1.0"
    kotlin("plugin.serialization") version "2.1.0"
    id("io.ktor.plugin") version "3.0.3"
}

dependencies {
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-netty")
    implementation("io.ktor:ktor-server-content-negotiation")
    implementation("io.ktor:ktor-serialization-kotlinx-json")
    testImplementation("io.ktor:ktor-server-test-host")
    testImplementation("io.ktor:ktor-client-content-negotiation")
    testImplementation(kotlin("test"))
}
```

Il servizio di base è piccolo: un magazzino in memoria con `GET /libri`, `GET /libri/{id}` e `POST /libri`. Gli esercizi lo estendono mantenendo i test verdi.

## Test con `testApplication`

`testApplication` è una funzione di livello superiore che riceve un blocco nel quale configuri l'applicazione come faresti in `Application.module()` e un secondo blocco di test. Dentro il blocco di test hai accesso a `client`, un client già collegato al motore fittizio. Ogni invocazione di `testApplication` crea un'istanza nuova: lo stato in memoria del servizio non passa da un test all'altro, a meno che tu non usi oggetti globali.

```kotlin
class LibriTest {
    @Test
    fun elenco_vuoto_risponde_200() = testApplication {
        application { moduloLibri(magazzino = Magazzino()) }
        val response = client.get("/libri")
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("application/json", response.contentType()?.contentType)
    }
}
```

Il parametro `client` usa il motore di test, senza porta né DNS. Se ti serve un client con plugin aggiuntivi, come la negoziazione per `body<T>()`, usa `createClient { install(ContentNegotiation) { json() } }` nel blocco di test.

```kotlin
@Test
fun crea_libro_e_restituisce_201_con_location() = testApplication {
    application { moduloLibri(Magazzino()) }
    val api = createClient { install(ContentNegotiation) { json() } }
    val response = api.post("/libri") {
        contentType(ContentType.Application.Json)
        setBody(LibroRequest("Il Gattopardo", "Tomasi di Lampedusa"))
    }
    assertEquals(HttpStatusCode.Created, response.status)
    assertNotNull(response.headers[HttpHeaders.Location])
}
```

Il test verifica tre parti del contratto HTTP: il codice di stato, l'header `Location` e la consumabilità della risposta come oggetto tipizzato. Se il server dimentica `contentType(ContentType.Application.Json)` nella `respond`, il `body<Libro>()` fallisce con un messaggio chiaro.

## Cosa testare e cosa no

Un buon test di integrazione con `testApplication` copre il confine HTTP: instradamento, validazione, codici di stato, header e forma del JSON. Per l'algoritmo interno conviene estrarre funzioni pure e testarle con test unitari, più veloci e con errori più precisi.

| Tipo di test | Cosa verifica | Strumento |
| --- | --- | --- |
| Unitario | funzioni pure, regole di business | `kotlin.test`, nessun server |
| Integrazione HTTP | route, validazione, status, header | `testApplication` |
| End-to-end | catena con database e client reale | motore reale su porta effimera |

Per gli end-to-end si usa `embeddedServer` con porta 0, che assegna una porta libera, e un `HttpClient` reale verso `http://127.0.0.1:<porta>`. Servono per TLS, redirect o middleware di rete che il motore di test simula solo in parte.

Attenzione all'isolamento: `testApplication` non resetta i singleton. Se lo stato vive in un `object` Kotlin, resta tra i test nella stessa JVM e la suite diventa dipendente dall'ordine. Inietta il magazzino come parametro, come fa l'esempio con `Magazzino()`.

## Esercizi

### 1. Testare il percorso di errore 404

Aggiungi un test che richieda `/libri/999` su un magazzino vuoto e verifichi `HttpStatusCode.NotFound` e un corpo JSON con un campo `messaggio`.

<details><summary>Soluzione</summary>

Implementa la route con `call.respond(HttpStatusCode.NotFound, ErroreDto("libro non trovato"))` e scrivi il test con un client tipizzato:

```kotlin
@Test
fun libro_assente_404() = testApplication {
    application { moduloLibri(Magazzino()) }
    val api = createClient { install(ContentNegotiation) { json() } }
    val response = api.get("/libri/999")
    assertEquals(HttpStatusCode.NotFound, response.status)
    assertEquals("libro non trovato", response.body<ErroreDto>().messaggio)
}
```

Il test fallisce se il server risponde 404 con testo semplice, quindi protegge anche il formato del corpo d'errore.

</details>

### 2. Verificare la validazione del corpo

Il `POST /libri` deve rifiutare un corpo con `titolo` vuoto con `400 Bad Request`. Scrivi il test e fai in modo che passi.

<details><summary>Soluzione</summary>

Nel handler leggi il DTO, controlla `titolo.isBlank()` e rispondi con 400 prima di toccare il magazzino:

```kotlin
@Test
fun titolo_vuoto_400() = testApplication {
    application { moduloLibri(Magazzino()) }
    val response = client.post("/libri") {
        contentType(ContentType.Application.Json)
        setBody("""{"titolo":"  ","autore":"Anonimo"}""")
    }
    assertEquals(HttpStatusCode.BadRequest, response.status)
}
```

Nota che il test invia JSON grezzo: è una verifica sul contratto HTTP che non dipende dalle classi del client di test.

</details>

### 3. JSON malformato e media type errato

Scrivi due test: uno che invia `{"titolo":` senza chiudere la graffa e uno che invia testo semplice con `Content-Type: text/plain`. Attesi rispettivamente 400 e 415.

<details><summary>Soluzione</summary>

```kotlin
@Test
fun json_malformato_400() = testApplication {
    application { moduloLibri(Magazzino()) }
    val response = client.post("/libri") {
        contentType(ContentType.Application.Json)
        setBody("""{"titolo":""")
    }
    assertEquals(HttpStatusCode.BadRequest, response.status)
}

@Test
fun media_type_errato_415() = testApplication {
    application { moduloLibri(Magazzino()) }
    val response = client.post("/libri") {
        contentType(ContentType.Text.Plain)
        setBody("titolo=Il Gattopardo")
    }
    assertEquals(HttpStatusCode.UnsupportedMediaType, response.status)
}
```

Il primo caso è un errore di parsing del corpo; il secondo è un formato non negoziabile. Installando `StatusPages` puoi anche mappare l'eccezione di deserializzazione a un corpo d'errore coerente.

</details>

### 4. Paginazione con parametri di query

Aggiungi `GET /libri?limit=2&offset=1` e testa che su cinque libri la risposta contenga esattamente due elementi a partire dal secondo.

<details><summary>Soluzione</summary>

Leggi i parametri con valori di default, limita `limit` a un massimo ragionevole e applica `drop(offset).take(limit)`:

```kotlin
@Test
fun pagina_due_elementi() = testApplication {
    application { moduloLibri(Magazzino.pienoDi(5)) }
    val api = createClient { install(ContentNegotiation) { json() } }
    val risposta = api.get("/libri?limit=2&offset=1").body<List<Libro>>()
    assertEquals(2, risposta.size)
    assertEquals(2, risposta.first().id)
}
```

Il limite massimo evita che un client chieda l'intero dataset in una richiesta, che è anche una difesa semplice contro abusi.

</details>

### 5. Testare il client contro `testApplication`

Crea una funzione `suspend fun libriDisponibili(): Int` che usa un `HttpClient` e verificala in un test con `testApplication`, senza avviare un server reale.

<details><summary>Soluzione</summary>

```kotlin
suspend fun libriDisponibili(client: HttpClient): Int =
    client.get("/libri").body<List<Libro>>().size

@Test
fun conteggio_libri() = testApplication {
    application { moduloLibri(Magazzino.pienoDi(3)) }
    val api = createClient { install(ContentNegotiation) { json() } }
    assertEquals(3, libriDisponibili(api))
}
```

Passare il client come parametro rende la funzione testabile senza server e riutilizzabile in produzione con un client reale.

</details>

### 6. Testare un header di cache

Imposta `Cache-Control: max-age=60` su `GET /libri` e verifica l'header nel test. Poi aggiungi un test che fallisca se l'header manca sulla risposta 304.

<details><summary>Soluzione</summary>

```kotlin
@Test
fun elenco_ha_cache_control() = testApplication {
    application { moduloLibri(Magazzino()) }
    val response = client.get("/libri")
    assertEquals("max-age=60", response.headers[HttpHeaders.CacheControl])
}
```

Per il 304 devi implementare la gestione di `If-None-Match` con un `ETag`: se la richiesta è condizionale e l'ETag coincide, rispondi `HttpStatusCode.NotModified` mantenendo `Cache-Control`. Il test negativo verifica che l'header non venga perso nel ramo che non ha corpo.

</details>

## Errori comuni

- **Testare con `embeddedServer` su una porta fissa**: due esecuzioni in parallelo collidono e la suite diventa instabile. Preferisci `testApplication`, oppure porta 0 se ti serve il motore reale.
- **Condividere stato globale tra test**: un `object` con il magazzino fa passare i test in un ordine e fallire in un altro; inietta le dipendenze.
- **Asserire su stringhe JSON grezze**: il confronto fallisce al primo riordino di campi. Confronta oggetti deserializzati o singoli campi.
- **Dimenticare le dipendenze di test del client**: `createClient` senza `ktor-client-content-negotiation` compila ma `body<T>()` non decodifica e il test fallisce in modo poco leggibile.
- **Testare solo i percorsi felici**: 404, 400 e 415 sono il contratto che i client dipendono davvero.

## In sintesi

- `testApplication` avvia l'applicazione in memoria e consente test HTTP completi senza porte.
- `createClient` permette di personalizzare il client di test con negoziazione dei contenuti.
- Ogni test deve isolare lo stato del servizio tramite dipendenze iniettate.
- La suite deve coprire status, header, formato e casi d'errore, non solo il percorso felice.

## Fonti

- Ktor — Test a server application: https://ktor.io/docs/server-testing.html
- Ktor — Requests and responses: https://ktor.io/docs/server-requests-and-responses.html
- Ktor — Status Pages: https://ktor.io/docs/server-status-pages.html
- RFC 9110 — HTTP Semantics (codici di stato): https://www.rfc-editor.org/rfc/rfc9110.html
