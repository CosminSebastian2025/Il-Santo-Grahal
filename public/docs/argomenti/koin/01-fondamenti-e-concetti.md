Koin è il framework di dependency injection pensato per Kotlin: non usa annotazioni a runtime né bytecode manipulation, ma un DSL dichiarativo puro che costruisce un grafo di oggetti all'avvio dell'applicazione. La versione 4.x (current 4.2) ha introdotto il Compiler Plugin che valida il grafo in compilazione, affiancandolo al classico DSL e alle annotazioni. In questa lezione impari il problema che Koin risolve, come si dichiara un modulo e cosa succede quando chiami `startKoin`.

## Obiettivi

- Spiegare il dependency injection a runtime rispetto al `new` sparso nel codice.
- Distinguere `single`, `factory` e `scoped` e quando usare ciascuno.
- Scrivere un modulo con la DSL di Koin Core e avviarlo con `startKoin`.
- Iniettare dipendenze in una classe senza che la classe conosca il container.
- Riconoscere il ruolo di `GlobalContext` e dei moduli caricati.

## Perché un container

Senza iniezione, una classe complessa costruisce da sola i suoi collaboratori: un `UserService` crea la propria istanza di `UserRepository`, che crea il proprio `Database`, che legge configurazione da un singleton globale. Ne derivano tre problemi: dipendenze invisibili nella firma, test che richiedono hack sui singleton, e la configurazione è cablata nei costruttori.

Con l'iniezione la classe dichiara di che cosa ha bisogno e non sa chi glielo fornisce:

```kotlin
interface UserRepository {
    suspend fun find(id: String): User?
}

class UserService(private val repository: UserRepository) {
    suspend fun displayName(id: String): String =
        repository.find(id)?.name ?: "anonimo"
}
```

`UserService` è testabile senza container: nel test gli passi un `UserRepository` finto creato a mano. Il container serve in un solo punto, il `main` dell'applicazione, dove qualcuno deve decidere che implementazione usare.

| Approccio | Dove si crea l'oggetto | Testabilità | Rischio |
| --- | --- | --- | --- |
| `new` nel costruttore | dentro la classe | richiede mock statici | accoppiamento nascosto |
| parametri manuali nel `main` | in un unico punto | buona | la `main` cresce senza limite |
| service locator (`object`) | ovunque tramite `get()` | dipende dal container | dipendenze invisibili |
| dependency injection | container | buona | serve una configurazione |

Koin sta nel quarto caso: il container produce gli oggetti, ma la classe non lo chiama mai. Le scritture tipiche sono `single { UserService(get()) }`: la lambda viene registrata e eseguita quando qualcuno richiede l'istanza.

## Definizioni: single, factory e scoped

Una definizione è una ricetta: tipo, qualificatore e lambda che costruisce l'oggetto. Koin offre tre cicli di vita principali, e sceglierli male è la causa più comune di bug sottili.

| Definizione | Istanze | Uso tipico |
| --- | --- | --- |
| `single` | una per contenitore, per sempre | repository, client HTTP, database |
| `factory` | nuova a ogni richiesta | presenter, mapper, use case stateful |
| `scoped` | una per scope, liberata alla chiusura | sessione utente, richiesta HTTP |
| `viewModel` | una per ViewModel Android | schermate Android |

```kotlin
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val dataModule = module {
    singleOf(::Database)
    singleOf(::UserRepositoryImpl) { bind<UserRepository>() }
}

val domainModule = module {
    factoryOf(::UserService)
}
```

`singleOf(::UserRepositoryImpl) { bind<UserRepository>() }` dichiara l'istanza come tipo concreto e la rende recuperabile anche tramite l'interfaccia: è il modo idiomatico per evitare `get<UserRepositoryImpl>()` sparsi nel codice. La forma esplicita `single<UserRepository> { UserRepositoryImpl(get()) }` fa la stessa cosa ma lega la lambda al tipo astratto, e serve quando il costruttore ha parametri che vuoi calcolare tu.

`scoped` richiede uno scope dichiarato a monte (`scope<UserSession> { scopedOf(::CartService) })`: l'istanza vive finché lo scope è aperto. In un'app Android con ViewModel e sessioni utente, `scoped` è spesso più corretto di `single`, perché un carrello legato a `single` viene condiviso tra utenti dopo un logout.

## Avvio e risoluzione

`startKoin` crea il contenitore, registra i moduli e lo pubblica in `GlobalContext`. L'ordine dei moduli non conta per la risoluzione — una definizione in `dataModule` può dipendere da una in `networkModule` a prescindere dall'ordine di caricamento — ma conta per gli override e per la creazione eager delle istanze con `createdAtStart`.

```kotlin
import org.koin.core.context.startKoin
import org.koin.dsl.module

val appModule = module {
    singleOf(::InMemoryUserRepository) { bind<UserRepository>() }
    factoryOf(::UserService)
}

fun main() {
    startKoin {
        modules(dataModule, domainModule, appModule)
    }
    val service = org.koin.java.KoinJavaComponent.get(UserService::class.java)
}
```

`startKoin` può essere chiamato una sola volta per processo: la seconda chiamata lancia `KoinApplicationAlreadyStartedException`. Per aggiungere moduli dopo, si usa `loadKoinModules`; per rimuoverli, `unloadKoinModules`. Se il codice deve accedere al container senza passarci la funzione, esiste `KoinComponent`: implementarlo su una classe la dota di `get()` e `inject()`, comodo nei test ma pericoloso nel codice di dominio, perché riporta il service locator dentro la classe.

Il vero punto di controllo è la risoluzione: `get<UserRepository>()` lancia `NoDefinitionFoundException` se nessun modulo caricato dichiara quel tipo. Koin 4 suggerisce il fix più probabile nel messaggio, ma il container si testa, non si spera.

## Errori comuni

- **Registrare un `single` con stato mutabile per utente**: dopo il logout l'oggetto resta e conserva dati della sessione precedente; usa `scoped` o ricrea il contenitore.
- **Chiamare `get()` dentro una `single` come scorciatoia per evitare parametri**: il grafo diventa una rete di risoluzioni implicite e `verify()` non può più leggere il costruttore per validare le dipendenze.
- **Usare `factory` per un oggetto costoso**: un client HTTP creato a ogni risoluzione apre decine di connection pool.
- **Caricare moduli in `startKoin` e in `loadKoinModules` con la stessa definizione**: l'ultima registrata vince, ma il comportamento dipende dall'ordine e i test diventano fragili.
- **Confondere `KoinComponent` con l'iniezione**: chi estende `KoinComponent` chiama il container, quindi non è più testabile con un costruttore semplice.

## In sintesi

Koin è un contenitore leggero che costruisce il grafo con lambda dichiarate in `module { }`. `single` è per gli oggetti senza stato condivisi, `factory` per quelli usa-e-getta, `scoped` per quelli legati a un ciclo di vita. Il codice applicativo riceve le dipendenze dal costruttore e non conosce Koin; il container esiste solo all'avvio, e il suo grafo va verificato con i test. La lezione successiva entra nei moduli, qualificatori, parametri e verifica del grafo in compilazione.

## Fonti

- [Koin — Starting Koin](https://insert-koin.io/docs/reference/koin-core/starting-koin)
- [Koin — Definitions](https://insert-koin.io/docs/reference/koin-core/definitions)
- [Koin — What is Koin?](https://insert-koin.io/)
- [Koin — Modules](https://insert-koin.io/docs/reference/koin-core/modules)
