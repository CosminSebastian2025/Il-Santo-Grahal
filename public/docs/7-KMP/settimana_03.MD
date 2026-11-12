# Settimana 3: app, stato e dati

Un'app non è solo bottoni: ha uno stato, una logica, una fonte dati e una presentazione. In questa settimana separi questi pezzi e impari a farli comunicare con repository, JSON e coroutine.

### Cos'è un'app moderna

Una schermata riceve dati, li mostra e reagisce alle azioni dell'utente. Dietro c'è una struttura ripetibile:

```text
UI  ->  stato  ->  logica  ->  repository  ->  fonte dati
 ^                                              |
 |----------------------------------------------|
        eventi dell'utente e nuovi dati
```

| Pezzo | Responsabilità |
| --- | --- |
| UI | disegna lo stato e invia eventi |
| Stato | descrive ciò che l'utente vede |
| Logica | valida, calcola, decide |
| Repository | offre dati senza rivelare da dove arrivano |
| Fonte dati | API, JSON locale, database, memoria |

L'obiettivo non è creare file astratti: è poter cambiare la fonte dati senza riscrivere la schermata, e poter testare la logica senza emulatore.

### UI e logica separate

La UI non deve contenere regole di business. Una regola come "la password deve avere almeno 8 caratteri" appartiene alla logica condivisa:

```kotlin
fun validaPassword(password: String): String? = when {
    password.length < 8 -> "La password deve avere almeno 8 caratteri"
    password.none { it.isDigit() } -> "Serve almeno un numero"
    else -> null
}
```

La UI chiama `validaPassword` e mostra il risultato. La stessa funzione può essere usata da Android, iOS, desktop e dai test.

### Stato ed eventi

Lo stato è un valore immutabile che descrive la schermata. Gli eventi sono le azioni che lo trasformano.

```kotlin
data class StatoLogin(
    val email: String = "",
    val password: String = "",
    val invio: Boolean = false,
    val errore: String? = null,
    val completato: Boolean = false
)

sealed interface EventoLogin {
    data class EmailCambiata(val valore: String) : EventoLogin
    data class PasswordCambiata(val valore: String) : EventoLogin
    data object Invia : EventoLogin
}

fun StatoLogin.riduci(evento: EventoLogin): StatoLogin = when (evento) {
    is EventoLogin.EmailCambiata -> copy(email = evento.valore, errore = null)
    is EventoLogin.PasswordCambiata -> copy(password = evento.valore, errore = null)
    EventoLogin.Invia -> when {
        email.isBlank() -> copy(errore = "Email obbligatoria")
        validaPassword(password) != null -> copy(errore = validaPassword(password))
        else -> copy(invio = true, errore = null)
    }
}
```

- lo stato è una `data class` con `val`: aggiornare significa `copy`;
- gli eventi sono un `sealed interface`: il `when` è esaustivo;
- la funzione `riduci` è pura: stessi input, stesso output, nessun effetto collaterale;
- per questo si testa senza UI e senza emulatore.

### Stato osservabile con StateFlow

`StateFlow` è un flusso che ha sempre un valore corrente. La UI lo osserva; la logica lo aggiorna.

```kotlin
class ContatoreStore {
    private val _valore = MutableStateFlow(0)
    val valore: StateFlow<Int> = _valore.asStateFlow()

    fun incrementa() {
        _valore.update { it + 1 }
    }
}
```

- `_valore` è privato: solo lo store scrive;
- `valore` è pubblico e in sola lettura;
- `update` è atomico: sicuro anche con più coroutine;
- chi osserva riceve subito il valore corrente, poi ogni cambiamento.

Su Android la UI raccoglie con `collectAsStateWithLifecycle()`; su iOS il layer Swift può osservare con un wrapper. Il flusso è la parte condivisa.

### Coroutine base

Una funzione `suspend` può sospendersi senza bloccare il thread:

```kotlin
suspend fun caricaProdotti(): List<Prodotto> {
    delay(500)          // simula la rete
    return listOf(Prodotto(1, "Penna", 1.20))
}
```

Si esegue dentro uno scope:

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

scope.launch {
    val prodotti = caricaProdotti()
    println(prodotti)
}
```

| Concetto | Significato |
| --- | --- |
| `suspend fun` | può sospendersi, va chiamata da una coroutine |
| `launch` | avvia un lavoro che non restituisce un valore |
| `async` | avvia un lavoro che restituisce un valore con `await` |
| `coroutineScope` | crea un ambito che attende tutti i figli |
| `viewModelScope` | ambito legato alla schermata Android |
| `Dispatchers.Default` | lavoro di calcolo |
| `Dispatchers.IO` | rete e disco |
| `delay` | sospende senza bloccare il thread |
| `runBlocking` | solo per `main` da console e test |

Due chiamate indipendenti in parallelo:

```kotlin
suspend fun caricaDashboard(api: Api): Dashboard = coroutineScope {
    val utenti = async { api.utenti() }
    val prodotti = async { api.prodotti() }

    Dashboard(
        utenti = utenti.await(),
        prodotti = prodotti.await()
    )
}
```

Regole:

- non usare `GlobalScope`: il lavoro sfugge al ciclo di vita;
- non catturare `Throwable` e ignorare `CancellationException`;
- non usare `Thread.sleep` dentro una coroutine: usa `delay`;
- ogni lavoro deve avere uno scope che lo cancelli quando non serve.

### Chiamare un'API

Un'API REST espone risorse via HTTP:

| Metodo | Uso |
| --- | --- |
| `GET` | leggere dati |
| `POST` | creare |
| `PUT` / `PATCH` | aggiornare |
| `DELETE` | eliminare |

I codici di stato contano: `200` e `201` sono successi, `400` richiesta errata, `401` non autorizzato, `404` non trovato, `500` errore del server.

Con Ktor il client si configura una volta:

```kotlin
val client = HttpClient {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
    install(HttpTimeout) {
        requestTimeoutMillis = 10_000
        connectTimeoutMillis = 5_000
    }
    expectSuccess = true
}
```

Poi una chiamata è una funzione `suspend`:

```kotlin
suspend fun caricaProdotti(baseUrl: String): List<ProdottoDto> =
    client.get("$baseUrl/prodotti").body()
```

`expectSuccess = true` trasforma le risposte 4xx e 5xx in eccezioni, così puoi gestirle con `try`/`catch` e mostrare uno stato di errore.

L'engine HTTP è specifico della piattaforma: OkHttp su Android, Darwin su iOS. Nel modulo condiviso si passa un `HttpClient` già configurato oppure si usa `expect`/`actual` (settimana 4).

### JSON con kotlinx.serialization

Dipendenze e plugin:

```kotlin
plugins {
    kotlin("plugin.serialization") version "2.1.20"
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.8.0")
}
```

Modello serializzabile:

```kotlin
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class ProdottoDto(
    val id: Int,
    val nome: String,
    @SerialName("prezzo_unitario") val prezzo: Double,
    val categoria: String? = null
)

val json = Json { ignoreUnknownKeys = true }

val prodotti: List<ProdottoDto> =
    json.decodeFromString<List<ProdottoDto>>(testoJson)

val testo = json.encodeToString(ProdottoDto(1, "Penna", 1.20, "cancelleria"))
```

- `@Serializable` genera il codice di serializzazione a compile time;
- `@SerialName` mappa un nome JSON diverso;
- i campi con default sono opzionali;
- `ignoreUnknownKeys = true` evita di rompersi quando il server aggiunge campi;
- le liste si deserializzano direttamente con il tipo generico.

### DTO e modello di dominio

Il DTO descrive il JSON, il modello descrive l'app. Tenerli separati evita che un cambio dell'API si propaghi ovunque.

```kotlin
data class Prodotto(
    val id: Int,
    val nome: String,
    val prezzo: Double,
    val categoria: String
)

fun ProdottoDto.aProdotto(): Prodotto = Prodotto(
    id = id,
    nome = nome,
    prezzo = prezzo,
    categoria = categoria ?: "senza categoria"
)
```

### Repository

Il repository è la porta verso i dati. L'interfaccia sta nel codice comune; le implementazioni possono essere API, JSON locale o database.

```kotlin
interface ProdottiRepository {
    suspend fun carica(): List<Prodotto>
}

class ApiProdottiRepository(
    private val client: HttpClient,
    private val baseUrl: String
) : ProdottiRepository {

    override suspend fun carica(): List<Prodotto> =
        client.get("$baseUrl/prodotti")
            .body<List<ProdottoDto>>()
            .map { it.aProdotto() }
}
```

Un repository finto rende la logica testabile senza rete:

```kotlin
class FakeProdottiRepository : ProdottiRepository {
    override suspend fun carica(): List<Prodotto> {
        delay(300)
        return listOf(
            Prodotto(1, "Penna", 1.20, "cancelleria"),
            Prodotto(2, "Mouse", 15.00, "informatica")
        )
    }
}
```

### Dependency injection, almeno il concetto

L'**iniezione delle dipendenze** significa che una classe riceve ciò di cui ha bisogno dall'esterno, invece di costruirlo da sola.

```kotlin
// bene: la dipendenza arriva dal costruttore
class ProdottiStore(
    private val repository: ProdottiRepository,
    private val scope: CoroutineScope
)
```

```kotlin
// male: lo store decide da solo quale repository usare
class ProdottiStore {
    private val repository = ApiProdottiRepository(HttpClient(), "https://...")
}
```

La seconda versione non si può testare senza rete e nasconde la configurazione. La prima si istanzia con un fake nei test.

Il punto in cui si costruiscono gli oggetti si chiama **composition root**:

```kotlin
fun creaStore(scope: CoroutineScope): ProdottiStore {
    val client = HttpClient { /* configurazione */ }
    val repository = ApiProdottiRepository(client, BASE_URL)
    return ProdottiStore(repository, scope)
}
```

Su Android il composition root è l'`Application` o un contenitore dedicato; su iOS è il punto di ingresso Swift. Librerie come **Koin** automatizzano la costruzione, ma il concetto resta questo: dipendenze esplicite e sostituibili.

### UiState e store completo

```kotlin
sealed interface ProdottiUiState {
    data object Caricamento : ProdottiUiState
    data class Successo(val prodotti: List<Prodotto>) : ProdottiUiState
    data class Errore(val messaggio: String) : ProdottiUiState
}

class ProdottiStore(
    private val repository: ProdottiRepository,
    private val scope: CoroutineScope
) {
    private val _stato =
        MutableStateFlow<ProdottiUiState>(ProdottiUiState.Caricamento)
    val stato: StateFlow<ProdottiUiState> = _stato.asStateFlow()

    fun carica() {
        scope.launch {
            _stato.value = ProdottiUiState.Caricamento

            _stato.value = try {
                ProdottiUiState.Successo(repository.carica())
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                ProdottiUiState.Errore(e.message ?: "Errore di rete")
            }
        }
    }
}
```

`CancellationException` viene rilanciata: se la coroutine è cancellata, non è un errore da mostrare all'utente.

### Esempio completo: schermata con stati

```kotlin
class FakeRepositoryConErrore : ProdottiRepository {
    override suspend fun carica(): List<Prodotto> {
        delay(400)
        throw IllegalStateException("Server non raggiungibile")
    }
}

fun main() = runBlocking {
    val store = ProdottiStore(FakeRepositoryConErrore(), this)

    val raccolta = launch {
        store.stato.collect { stato ->
            when (stato) {
                ProdottiUiState.Caricamento -> println("Caricamento...")
                is ProdottiUiState.Successo -> println("${stato.prodotti.size} prodotti")
                is ProdottiUiState.Errore -> println("Errore: ${stato.messaggio}")
            }
        }
    }

    store.carica()
    delay(1_000)
    raccolta.cancel()
}
```

Senza UI, il comportamento è già completo: caricamento, successo, errore. La schermata Android dovrà solo disegnare questi tre stati.

### Errori comuni

- **Logica di business nella UI.** Non è testabile e va duplicata su ogni piattaforma.
- **Esporre `MutableStateFlow`.** La UI può scrivere stato: esponi solo `StateFlow`.
- **Bloccare il thread principale.** `Thread.sleep` dentro una coroutine blocca l'app: usa `delay`.
- **Usare `GlobalScope`.** Il lavoro continua anche quando la schermata è chiusa.
- **Ingoiare `CancellationException`.** La cancellazione viene trattata come errore e il lavoro non si ferma.
- **API key nel codice o nel repository.** Finisce nell'APK: usa configurazione sicura e backend.
- **Dimenticare il permesso `INTERNET`.** La chiamata fallisce su Android.
- **Serializzazione senza plugin o senza `@Serializable`.** Errore a compile time o runtime.
- **Usare i DTO come modelli UI.** Un cambio del JSON rompe la schermata.
- **Costruire il repository dentro la UI.** Impedisce test e sostituzioni.

## Esercizi progressivi

**Esercizio 1.** Modella `StatoLogin` con email, password, invio, errore e completato. Deve essere immutabile e aggiornabile solo con `copy`.

**Esercizio 2.** Scrivi un reducer `riduci(stato, evento)` per il login e verificalo con tre casi: modifica email, invio con campi vuoti, invio valido. Nel terzo caso lo stato deve passare a `invio = true` senza perdere i dati inseriti.

**Esercizio 3.** Crea `ContatoreStore` con `StateFlow<Int>` e i metodi `incrementa`, `decrementa`, `azzera`. L'output deve essere `0 → 1 → 0`, senza esporre il `MutableStateFlow`.

**Esercizio 4.** Avvia una coroutine con `delay(1000)` e cancellala prima che finisca; osserva il comportamento. La stampa finale deve essere `Annullata`, non `Completata`.

**Esercizio 5.** Carica due liste in parallelo con `async` e `await`, poi combinale. Con 300 ms e 500 ms di ritardo il totale deve arrivare in circa 500 ms, non 800: stampa il tempo misurato.

**Esercizio 6.** Deserializza una stringa JSON che contiene una lista di prodotti. Con due prodotti l'output deve essere `Prodotti caricati: 2` e il nome del primo prodotto.

**Esercizio 7.** Serializza `Prodotto(1, "Penna", 1.5)` in JSON e stampalo. L'output deve contenere `"id":1`, `"nome":"Penna"` e `"prezzo":1.5`.

**Esercizio 8.** Crea un DTO con `@SerialName` e una funzione di conversione al modello di dominio. Il JSON usa `product_name` e `unit_price`; il dominio usa `nome` e `prezzo`. Verifica la mappatura con un test.

**Esercizio 9.** Definisci `ProdottiRepository` e due implementazioni: una finta e una che lancia un errore. Entrambe devono rispettare la stessa interfaccia e restituire una lista immutabile.

**Esercizio 10.** Configura un client Ktor con `ContentNegotiation` e `HttpTimeout`. Il timeout deve essere esplicito e la configurazione comune a tutti i client, non duplicata nel repository.

**Esercizio 11.** Gestisci un errore HTTP mostrando uno stato `Errore` con messaggio leggibile. Con risposta 503 l'output deve essere `Errore: servizio non disponibile`, non lo stack trace.

**Esercizio 12.** Aggiungi un metodo `riprova()` allo store e verifica che riparta dallo stato di caricamento. Dopo un errore la sequenza degli stati deve essere `Errore → Caricamento → Successo`.

**Esercizio 13.** Scrivi un test con `runTest` e un repository finto per lo stato di successo e di errore. I due test devono essere indipendenti e non usare ritardi reali.

**Esercizio 14.** Scrivi un composition root che colleghi client, repository e store senza usare singleton nascosti. Deve essere possibile sostituire il repository con un fake cambiando una sola funzione.

### Consolidamento (livello avanzato)

**Esercizio 15.** Aggiungi una cache in memoria al repository: la prima chiamata interroga la fonte, la seconda restituisce i dati salvati. Con un contatore nella fonte finta l'output dopo due caricamenti deve essere `Chiamate alla fonte: 1`.

**Esercizio 16.** Avvolgi una chiamata lenta in `withTimeout(500)` e gestisci il caso di superamento. Con un ritardo di 1000 ms lo stato deve diventare `Errore: timeout`, senza crash e senza lasciare coroutine attive.

**Esercizio 17.** Definisci `sealed interface ProdottiUiState` con `Caricamento`, `Successo`, `Vuoto` ed `Errore`. Con una lista vuota lo store deve passare a `Vuoto`, non a `Successo`; stampa la sequenza degli stati.

**Esercizio 18.** Aggiungi allo store un metodo `cerca(testo)` che filtra i prodotti già caricati senza nuove chiamate di rete. Con `"pen"` deve restituire solo i prodotti il cui nome contiene il testo, ignorando maiuscole e minuscole.

**Esercizio 19.** Crea un composition root con due configurazioni: `fake` e `api`. Con `fake` l'app parte senza rete e stampa `Repository: fake`; con `api` usa il client Ktor e stampa `Repository: api`. La scelta arriva da un parametro, non da un `if` sparso nella UI.

**Esercizio 20.** Scrivi quattro test con `runTest` per lo store: successo, vuoto, errore e retry. Ogni test usa un repository finto dedicato; a fine esecuzione l'output deve essere `4 test superati`.

### Varianti

- Nel reducer del login, aggiungi l'evento `Invia` che passa allo stato di completamento dopo una chiamata simulata.
- Nello store, aggiungi un `SharedFlow` per un messaggio una tantum.
- Nel client Ktor, aggiungi un header `Authorization`.
- Nel repository, mappa una lista vuota in uno stato "nessun risultato".
- Nel test, verifica anche che `riprova()` chiami il repository una seconda volta.

## Progetti della settimana 3

### Progetto 1: Catalogo prodotti con repository finto

Requisiti:

- `ProdottiRepository` con implementazione finta e ritardo simulato;
- `ProdottiUiState` con caricamento, successo ed errore;
- store con `StateFlow` e metodo `carica`;
- retry che riparte dallo stato di caricamento;
- errore simulato attivabile con un flag;
- programma console che stampa i tre stati;
- nessuna logica di business nel `main`.

### Progetto 2: Login con validazione condivisa

Requisiti:

- stato, eventi e reducer per email e password;
- validazione di email e password in funzioni pure;
- pulsante di invio rappresentato dall'evento `Invia`;
- stato di invio simulato con `delay`;
- errore mostrato come parte dello stato;
- test del reducer per casi validi e non validi;
- nessuna funzione `suspend` chiamata dalla UI senza scope.

### Progetto 3: Convertitore valute con API simulata

Requisiti:

- modello `TassoCambio` e repository con tassi finti;
- stato con valuta di partenza, valuta di arrivo, importo e risultato;
- calcolo in una funzione pura condivisibile;
- caricamento dei tassi con stato di caricamento e di errore;
- cache in memoria dei tassi già scaricati;
- eventi per cambiare valuta e importo;
- test del calcolo con importi e valute diverse.

### Progetto 4: Task manager con architettura

Requisiti:

- `Attivita` come data class immutabile;
- repository in memoria con lista immutabile;
- store con `StateFlow` di lista e filtro;
- eventi per aggiungere, completare, eliminare e filtrare;
- gestione dello stato vuoto;
- test delle operazioni sul repository;
- nessuna lista mutabile condivisa con la UI.

### Criteri di verifica

- [ ] La UI non contiene regole di business.
- [ ] Lo stato è immutabile e aggiornato con `copy`.
- [ ] Gli eventi sono modellati con `sealed interface`.
- [ ] Lo store espone solo `StateFlow`.
- [ ] Le coroutine usano uno scope che può essere cancellato.
- [ ] Gli errori di rete diventano uno stato visibile.
- [ ] I DTO sono separati dai modelli di dominio.
- [ ] Repository e store si possono costruire con dipendenze finte nei test.

Nella settimana 4 questo codice esce dall'esempio e diventa il primo modulo condiviso di un progetto Kotlin Multiplatform.
