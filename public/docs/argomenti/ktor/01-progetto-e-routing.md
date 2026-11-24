Ktor è il framework HTTP scritto in Kotlin dal team di JetBrains: si usa per costruire servizi backend, ma anche client HTTP e applicazioni multipiattaforma. In questa prima lezione impari come nasce un progetto Ktor, come si struttura l'entry point e come il motore di routing decide quale codice risponde a una richiesta. L'obiettivo è avere un server minimo funzionante che sappia distinguere percorsi, parametri e metodi.

## Obiettivi

- Creare un progetto Ktor con Gradle e riconoscere i file che contano.
- Distinguere il modulo server dal motore di esecuzione (Netty, CIO, Jetty).
- Scrivere route con parametri di percorso, parametri di query e metodi diversi.
- Organizzare le route in moduli annidati con prefissi riutilizzabili.
- Spiegare l'ordine di valutazione delle route e l'uso dei plugin nel ciclo di una richiesta.

## Anatomia del progetto

Un progetto Ktor generato dal wizard di JetBrains contiene un `build.gradle.kts` con il plugin `io.ktor.plugin`, le dipendenze `ktor-server-core` e un motore come `ktor-server-netty`, e un file `Application.kt`. Il plugin Gradle aggiunge task utili per eseguire l'applicazione in sviluppo e per costruire un fat JAR distribuibile.

La struttura tipica separa tre livelli di responsabilità:

| Componente | Ruolo |
| --- | --- |
| Modulo applicativo | definisce route, plugin e logica |
| Motore (`EngineMain` o `embeddedServer`) | apre le porte, gestisce I/O e concorrenza |
| Configurazione `application.conf` | dichiara modulo da caricare, porta e opzioni del motore |

Il punto di ingresso standard è una funzione `Application.module()` esterna alla classe, richiamata da `EngineMain` grazie al file `application.conf`. In alternativa, per test rapidi, `embeddedServer(Netty, port = 8080) { ... }.start(wait = true)` avvia tutto in un file.

```kotlin
fun Application.module() {
    routing {
        get("/") {
            call.respondText("Servizio attivo", ContentType.Text.Plain)
        }
    }
}
```

Ktor separa nettamente il motore dall'applicazione: il motore gestisce socket, TLS e ciclo di vita dei processi, mentre il codice scritto da te riceve un oggetto `ApplicationCall`. Questa separazione consente di cambiare motore senza toccare le route e di testare tutta la logica con un motore di test in memoria.

## Route, parametri e metodi

Il blocco `routing { }` è il DSL che associa un metodo HTTP e un modello di percorso a un handler. Ogni handler riceve implicitamente `call`. I selettori si combinano in modo gerarchico, quindi la route finale è il percorso completo risultante dall'annidamento.

```kotlin
fun Application.module() {
    routing {
        route("/api/v1") {
            get("/libri") {
                val autore = call.request.queryParameters["autore"]
                call.respondText("filtro autore=$autore")
            }
            get("/libri/{id}") {
                val id = call.parameters["id"] ?: return@get call.respondText(
                    "id assente",
                    status = HttpStatusCode.BadRequest,
                )
                call.respondText("richiesto id=$id")
            }
            post("/libri") {
                call.respond(HttpStatusCode.Created)
            }
            get("/salute") {
                call.respondText("ok")
            }
        }
    }
}
```

Tre osservazioni importanti. Primo, i parametri di percorso sono stringhe: la conversione a intero va fatta nel codice e va gestita l'assenza, altrimenti `call.parameters["id"]` è `null`. Secondo, `queryParameters` restituisce una collezione che mantiene i valori multipli per la stessa chiave. Terzo, il prefisso `route("/api/v1")` non aggiunge nulla di magico: serve solo a evitare ripetizioni e a raggruppare per versione.

Ktor sceglie la route più specifica, non la prima dichiarata in assoluto: un segmento letterale ha priorità su un segnaposto, quindi `/libri/novita` vince su `/libri/{id}` quando entrambe corrispondono. I metodi sono selettori come gli altri, per questo `post("/libri")` e `get("/libri")` convivono sulla stessa forma.

Per evitare duplicazione tra route si usano anche i cosiddetti "route handler" con `route("/admin") { ... }`, le funzioni di estensione su `Route` che accettano un blocco e i `RouteScopedPlugin`. Una funzione come `fun Route.libriRoutes()` può essere richiamata da più parti e rende il file principale leggibile.

## Plugin e ciclo della richiesta

In Ktor ogni funzionalità trasversale è un plugin: parsing del corpo, negoziazione dei contenuti, gestione degli errori, compressione, chiamate con metriche. I plugin si installano su `Application` o su un ramo di `Route` e possono intervenire su fasi diverse del ciclo di vita: `onCall`, `onCallReceive`, `onCallRespond`.

```kotlin
install(CallLogging) {
    level = Level.INFO
}
```

L'ordine in cui aggiungi plugin e route conta, perché la pipeline applica i plugin nell'ordine di installazione e il primo che risponde può interrompere la catena. Un plugin di autenticazione installato sulla radice protegge tutte le route successive; installato su un ramo `route("/admin")` protegge solo quello. `StatusPages` intercetta le eccezioni emesse dagli handler e produce risposte strutturate, evitando che un errore diventi un 500 con dettagli interni.

## Errori comuni

- **Chiamare `call.parameters["id"]!!`**: il parametro può essere assente e il `!!` produce un `NullPointerException` che diventa 500 invece di un 400.
- **Installare plugin su `Application` quando serve solo su un ramo**: si finisce per autenticare anche le endpoint pubbliche o per loggare inutilmente tutto il traffico.
- **Fidarsi dell'ordine "da sinistra a destra" delle route**: il motore sceglie in base alla specificità dei segmenti, quindi una route catch-all dichiarata prima può intercettare percorsi che credevi liberi.
- **Scrivere `embeddedServer` anche in produzione**: il progetto Gradle con `EngineMain` e `application.conf` permette di cambiare porta e motore senza ricompilare il codice.

## In sintesi

- Il progetto Ktor separa modulo applicativo, motore e configurazione; il modulo non sa su quale porta gira.
- Le route sono un DSL annidabile: i prefissi organizzano, i metodi selezionano, i parametri arrivano come stringhe da validare.
- La specificità dei segmenti decide il match, non la posizione della dichiarazione.
- I plugin sono il meccanismo unico per logica trasversale e possono essere limitati a un ramo di route.

## Fonti

- Ktor — Create a new project: https://ktor.io/docs/server-create-a-new-project.html
- Ktor — Routing: https://ktor.io/docs/server-routing.html
- Ktor — Plugins: https://ktor.io/docs/server-plugins.html
- Kotlin — Documentazione ufficiale: https://kotlinlang.org/docs/home.html
