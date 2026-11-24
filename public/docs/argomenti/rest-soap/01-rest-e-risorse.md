REST non è un protocollo né una libreria: è uno stile architetturale descritto da Roy Fielding nella sua tesi del 2000, che riprende le proprietà del web e le applica alle API. Molte API si chiamano REST perché usano URL e JSON, ma violano i vincoli che rendono lo stile utile. In questa lezione impari a modellare le risorse, a scegliere i verbi HTTP con coerenza e a progettare una piccola API di esempio con codice reale.

## Obiettivi

- Definire una risorsa e distinguere l'identificatore dalla rappresentazione.
- Applicare i principali vincoli REST: indirizzabilità, interfaccia uniforme, assenza di stato.
- Progettare percorsi e verbi coerenti con le operazioni CRUD.
- Scegliere i codici di stato e la forma degli errori in un'API JSON.
- Riconoscere le deviazioni comuni dallo stile REST e il loro costo.

## Risorse, identificatori e rappresentazione

In REST tutto ciò che interessa viene modellato come **risorsa**: un libro, un ordine, una collezione di articoli. Ogni risorsa ha un identificatore stabile, di solito una URL. La risorsa non è il JSON che ricevi: quella è una **rappresentazione** in un formato, che può essere JSON, XML, CSV o HTML, negoziata con gli header.

| Concetto | Esempio | Note |
| --- | --- | --- |
| Risorsa | `libro 42` | entità dello spazio problematico |
| Identificatore | `/api/v1/libri/42` | stabile, senza verbi nel percorso |
| Rappresentazione | `{"id":42,"titolo":"..."}` | cambia con `Accept` |
| Collezione | `/api/v1/libri` | sottoinsieme di risorse |

La distinzione tra risorsa e rappresentazione spiega perché non si scrive il formato nel percorso: `/libri.json` rompe la negoziazione dei contenuti e costringe a duplicare gli endpoint per ogni formato. Il percorso dice *cosa*, gli header dicono *come*.

Nella progettazione del percorso si usa il sostantivo plurale per le collezioni, l'identificatore per il singolo elemento e la relazione per le sottorisorse: `/libri/42/recensioni`. I verbi non devono comparire nel percorso perché il metodo HTTP li esprime già: `/libri/42/delete` duplica l'informazione e confonde cache e proxy.

## I vincoli che contano

I vincoli REST sono sei, ma tre hanno conseguenze pratiche immediate. L'**interfaccia uniforme** impone che tutte le interazioni usino gli stessi metodi HTTP con la stessa semantica: un client che sa leggere una collezione sa leggere anche le altre. L'**assenza di stato** sposta lo stato della sessione sul client: ogni richiesta deve essere self-contained e portarsi l'identità necessaria, in un token o in un cookie.

Il terzo è l'**indirizzabilità**: ogni informazione utile deve avere un identificatore raggiungibile e collegabile. Per questo un'API che restituisce un `id` opaco senza URL di dettaglio rende la scoperta e la documentazione più difficili.

La cacheability è un vincolo spesso ignorato: le risposte di lettura dovrebbero essere memorizzabili quando i dati lo permettono, usando `Cache-Control` e `ETag`. Un'API che impedisce la cache su ogni endpoint aumenta il costo infrastrutturale senza motivo.

## Mappare i verbi

La mappatura tra operazioni applicative e metodi HTTP è il cuore del progetto. Il CRUD è solo il caso più semplice.

| Operazione | Metodo e percorso | Stato |
| --- | --- | --- |
| elenco con filtri | `GET /libri?anno=2024` | 200 |
| dettaglio | `GET /libri/42` | 200 o 404 |
| creazione | `POST /libri` | 201 più `Location` |
| sostituzione | `PUT /libri/42` | 200 o 204 |
| modificazione parziale | `PATCH /libri/42` | 200 o 204 |
| eliminazione | `DELETE /libri/42` | 204 oppure 404 |
| azione non CRUD | `POST /libri/42/prestito` | 201 o 202 |

L'ultima riga mostra il caso che più genera dibattito. I puristi evitano i verbi nel percorso, ma un'operazione che non è semplice lettura o scrittura di un campo merita un endpoint dedicato con un nome che ne descrive il significato. `POST /libri/42/prestito` crea una risorsa "prestito" sotto il libro: è coerente se la collezione dei prestiti ha senso e un identificatore.

```kotlin
post("/libri") {
    val richiesta = call.receive<NuovoLibro>()
    if (richiesta.titolo.isBlank()) {
        return@post call.respond(HttpStatusCode.BadRequest, Errore("titolo_obbligatorio"))
    }
    val creato = magazzino.aggiungi(richiesta)
    call.response.header(HttpHeaders.Location, "/libri/${creato.id}")
    call.respond(HttpStatusCode.Created, creato)
}

get("/libri/{id}") {
    val id = call.parameters["id"]?.toIntOrNull()
        ?: return@get call.respond(HttpStatusCode.BadRequest, Errore("id_non_valido"))
    val libro = magazzino.cerca(id)
        ?: return@get call.respond(HttpStatusCode.NotFound, Errore("libro_assente"))
    call.respond(libro)
}
```

Questo esempio usa Ktor perché è un framework che rende visibile l'HTTP, ma il modello si applica identico a Spring, Express o FastAPI. La parte che conta è la corrispondenza tra significato dell'operazione, metodo, percorso e codice di stato.

## Forma degli errori

Un'API REST coerente espone gli errori in un formato stabile, con un tipo, un messaggio leggibile e, se serve, un identificatore di richiesta da usare nel supporto. Il codice di stato resta la fonte principale: il corpo è un dettaglio che i client non devono essere obbligati a interpretare per capire l'esito.

```json
{
  "type": "https://api.example.com/problemi/validazione",
  "title": "Dati non validi",
  "status": 400,
  "detail": "Il campo titolo non può essere vuoto",
  "instance": "/libri",
  "errors": [{ "field": "titolo", "code": "obbligatorio" }]
}
```

Questo formato ricalca `application/problem+json` definito nella RFC 9457 e ha il vantaggio di essere standard e di avere un campo `type` che funge da identificatore del tipo di errore. Non serve adottarlo alla lettera, ma conviene avere un formato unico, documentato e validato da un test di contratto.

## Errori comuni

- **Mettere verbi nel percorso**: `/libri/42/get` non usa la semantica di `GET` e rompe cache, retry e strumenti di osservabilità.
- **Restituire 200 con `success: false`**: il codice di stato è parte del contratto HTTP e i client automatici lo usano; un errore con 200 è invisibile a monitoraggi e retry.
- **Fare `PUT` con merge parziale**: `PUT` sostituisce, `PATCH` modifica; confonderli rende imprevedibile cosa succede ai campi omessi.
- **Inserire lo stato della sessione nel server senza identificarlo**: senza un token o una sessione esplicita, il servizio non scala orizzontalmente e ogni istanza vede dati diversi.

## In sintesi

- REST è uno stile: risorse indirizzabili, rappresentazioni negoziate, interfaccia uniforme, assenza di stato.
- I sostantivi vanno nel percorso, i verbi nel metodo HTTP.
- La mappatura CRUD è il minimo; le operazioni di dominio meritano endpoint con un significato esplicito.
- Codici di stato corretti e un formato d'errore unico rendono l'API prevedibile e testabile.

## Fonti

- RFC 9110 — HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- OWASP — REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- RFC 9457 — Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457.html
