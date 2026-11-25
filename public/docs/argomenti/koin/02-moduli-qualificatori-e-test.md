Un'applicazione Koin diventa difficile da mantenere quando tutte le definizioni finiscono in un unico `module { }`: dipendenze nascoste tra feature, collisioni di tipo, parametri calcolati a mano dentro le lambda. Koin offre gli strumenti per strutturare il grafo: moduli composti con `includes`, qualificatori per distinguere due definizioni dello stesso tipo, parametri di costruzione espliciti, override controllati in test e verifica del grafo con `verify()`. Questa lezione li mette insieme su un caso realistico di backend Kotlin e di app Android.

## Obiettivi

- Comporre moduli per feature con `includes` e binding per interfaccia.
- Distinguere due implementazioni con `named`, `qualifier` e tipi `@JvmInline`.
- Passare parametri runtime senza usare `get()` a mano.
- Verificare il grafo con `module.verify()` e fallire in CI prima del runtime.
- Controllare gli override tra moduli di produzione e di test.

## Moduli composti per feature

Un modulo dovrebbe corrispondere a una feature o a un livello tecnico. I moduli si compongono con `includes`, e il carico del padre carica l'albero. Per un backend Ktor con database, cache e gestione utenti, la struttura naturale è tre moduli foglia e un modulo applicativo.

```kotlin
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val networkModule = module {
    singleOf(::HttpClientFactory)
}

val dataModule = module {
    includes(networkModule)
    singleOf(::SqlUserRepository) { bind<UserRepository>() }
    singleOf(::RedisCache) { bind<Cache>() }
}

val domainModule = module {
    factoryOf(::UserService)
}

val appModule = module {
    includes(dataModule, domainModule)
}
```

Koin risolve attraverso tutti i moduli caricati, non solo tra quelli annidati, quindi `UserService` in `domainModule` può dipendere da `UserRepository` definito in `dataModule` anche se i due moduli non si conoscono. Il beneficio di `includes` è il contratto di caricamento, non la risoluzione: chi carica `appModule` ottiene tutto, e i test possono invece caricare solo `domainModule` più un modulo finto.

| Strumento | Quando usarlo | Effetto se manca |
| --- | --- | --- |
| `includes` | moduli per feature o livello | moduli dimenticati in `startKoin` |
| `bind<T>()` | interfaccia di un tipo concreto | `get<Impl>()` sparso nel codice |
| `named("...")` | due istanze dello stesso tipo | `SingleInstanceClashException` |
| `parametersOf` | dato runtime (id, chiave) | `get()` calcolato dentro la lambda |
| `override` | finto nei test | moduli di test separati e duplicati |

## Qualificatori e parametri

Due `Cache` con politiche diverse — una in memoria e una Redis — non possono convivere senza distinzione, perché Koin risolve sull'indice tipo più qualificatore. Il qualificatore è un `Qualifier`, e lo strumento idiomatico è una classe `@JvmInline`.

```kotlin
import org.koin.core.qualifier.named
import org.koin.dsl.module

@JvmInline value class CacheKey(val name: String)

val cacheModule = module {
    single<Cache>(named("memory")) { MemoryCache(maxEntries = 1_000) }
    single<Cache>(named("redis")) { RedisCache(client = get()) }
    singleOf(::CatalogService)          // usa il default
    single { CatalogService(cache = get(named("redis"))) }
}
```

Le stringhe `"memory"` e `"redis"` sono valide ma invisibili al compilatore: un refuso produce `NoDefinitionFoundException` solo a runtime. `@JvmInline value class` intorno a una `String` conserva la leggibilità senza costo a runtime e permette costanti condivise tra moduli.

Quando un oggetto dipende da un valore che esiste solo al momento della richiesta — l'id di un ordine, la chiave di una richiesta HTTP — la lambda del modulo non è il posto giusto: lì non hai accesso al chiamante. Si usa invece `parametersOf`, che passa i valori come `ParameterList` e si legge con `get<Int>()` all'interno della factory.

```kotlin
val orderModule = module {
    factory { (orderId: String) ->
        OrderProcessor(orderId = orderId, repo = get(), events = get())
    }
}

// richiesta a runtime
val processor = get<OrderProcessor>(parametersOf("ord-42"))
```

Nota che `OrderProcessor` è una `factory`: con `single` il primo `orderId` resterebbe congelato per sempre, un bug classico che si manifesta solo alla seconda richiesta.

## Verificare il grafo e gestire gli override

`verify()` è un'estensione su `Module` che vive in `koin-test` e, sul JVM, legge i costruttori delle definizioni e controlla che ogni tipo richiesto esista nel grafo. Non avvia l'applicazione e non crea istanze.

```kotlin
import org.koin.test.verify.verify
import kotlin.test.Test

class ModuleCheck {
    @Test
    fun `grafo coerente`() {
        appModule.verify()
    }
}
```

`verify()` lancia `MissingKoinDefinitionException` indicando il tipo e un suggerimento, e `CircularInjectionException` se due costruttori si rincorrono. In CI questo test costa millisecondi e intercetta il caso più frequente: una classe nuova con una dipendenza che nessun modulo registra, scoperta solo al deploy. Per i tipi generici che `verify()` non può dedurre — liste, `Lazy`, nullable — si passano eccezioni esplicite.

Gli override permettono di sostituire una definizione senza riscrivere il modulo. Koin accetta l'override, ma con `allowOverride(false)` si trasforma un doppio registrato per errore in un errore esplicito.

```kotlin
import org.koin.test.KoinTest
import org.koin.test.get
import org.koin.core.context.startKoin
import org.koin.core.context.stopKoin

class UserServiceTest : KoinTest {
    @Test
    fun `usa repository finto`() {
        startKoin {
            allowOverride(true)
            modules(appModule, module { single<UserRepository> { FakeUserRepository() } })
        }
        try {
            assertEquals("Ada", get<UserService>().displayName("1"))
        } finally {
            stopKoin()
        }
    }
}
```

Il `stopKoin()` nel blocco `finally` è obbligatorio: `startKoin` può essere chiamato una sola volta per processo, quindi senza reset il secondo test lancia `KoinApplicationAlreadyStartedException`. In alternativa, `koin-test` offre `AutoCloseKoinTest` e le extension JUnit che chiudono il contenitore dopo ogni test.

## Errori comuni

- **Dipendenze `get()` dentro i costruttori**: il costruttore non dichiara le dipendenze, quindi `verify()` non può vederle e il grafo resta non verificato.
- **Qualificatori con stringhe diverse per lo stesso concetto**: due costanti duplicate con un refuso generano definizioni orfane.
- **`single` al posto di `factory` con `parametersOf`**: il primo parametro resta cablato e tutti gli utenti successivi ricevono lo stesso oggetto.
- **Override silenziosi in produzione**: un modulo caricato due volte con `allowOverride(true)` nasconde duplicati; in produzione deve restare `false`.
- **Dimenticare `stopKoin` nei test**: anche un test superato può rompere quello successivo per contenitore già avviato.

## In sintesi

Un grafo sano si costruisce con moduli piccoli composti da `includes`, binding espliciti alle interfacce e qualificatori tipizzati; i dati runtime passano da `parametersOf` in factory, non da `get()` dentro le lambda. `verify()` è il guardrail più economico che esista, perché trasforma un errore di runtime in un test JVM. Gli override sono lo strumento per i test, da attivare con attenzione e da chiudere sempre con `stopKoin`.

## Fonti

- [Koin — Modules](https://insert-koin.io/docs/reference/koin-core/modules)
- [Koin — Qualifiers](https://insert-koin.io/docs/reference/koin-core/qualifiers)
- [Koin — Definitions](https://insert-koin.io/docs/reference/koin-core/definitions)
- [Koin — Verifying your Configuration](https://insert-koin.io/docs/reference/koin-test/verify)
