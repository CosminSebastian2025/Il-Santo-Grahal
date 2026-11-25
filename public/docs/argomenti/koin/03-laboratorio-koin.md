In questo laboratorio costruisci `orders-koin`, un servizio Kotlin JVM che espone due casi d'uso — calcolo totale e applicazione di uno sconto — con Koin come unico punto di composizione. Parti da un progetto Gradle vuoto e arrivi a un contenitore isolato per i test, al grafo verificato in CI e a un modulo di produzione in cui le dipendenze sono dichiarate una volta sola. Ogni passo si verifica con un comando.

## Obiettivi

- Configurare Gradle con `koin-bom`, `koin-core` e `koin-test`.
- Scrivere moduli per livello (data, domain) con binding alle interfacce.
- Avviare un contenitore isolato con `koinApplication` e usarlo nei test.
- Verificare il grafo con `verify()` e negare gli override in produzione.
- Introdurre una dipendenza runtime con `parametersOf` senza rompere i test.

## Passo 1 — Progetto e dipendenze

Il progetto è un'applicazione Kotlin JVM con i test JUnit 5. Le versioni di Koin le gestisce il BOM, così `koin-core` e `koin-test` non divergono.

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.1.21"
    application
}

dependencies {
    implementation(platform("io.insert-koin:koin-bom:4.2.2"))
    implementation("io.insert-koin:koin-core")
    testImplementation("io.insert-koin:koin-test")
    testImplementation("io.insert-koin:koin-test-junit5")
    testImplementation(kotlin("test"))
}

tasks.test { useJUnitPlatform() }
```

Se il BOM non risolve, la versione è probabilmente sbagliata: usane una pubblicata su Maven Central, non quella copiata da un tutorial.

| Artefatto | Serve per | Scope Gradle |
| --- | --- | --- |
| `koin-core` | DSL, container, `startKoin` | `implementation` |
| `koin-test` | `KoinTest`, `verify()` | `testImplementation` |
| `koin-test-junit5` | `KoinTestExtension`, `AutoCloseKoinTest` | `testImplementation` |
| `koin-bom` | versioni allineate | `platform(...)` |

## Passo 2 — Dominio, data e moduli

Il dominio non conosce Koin: interfacce e classi con dipendenze nel costruttore. `dataModule` registra le implementazioni e le lega alle interfacce con `bind`.

```kotlin
// src/main/kotlin/orders/Domain.kt
interface PriceRepository { fun priceOf(sku: String): Long }
interface DiscountPolicy { fun discountFor(total: Long, coupon: String?): Long }

class OrderService(
    private val prices: PriceRepository,
    private val discounts: DiscountPolicy,
) {
    fun total(items: List<Pair<String, Int>>, coupon: String? = null): Long {
        val gross = items.sumOf { (sku, qty) -> prices.priceOf(sku) * qty }
        return gross - discounts.discountFor(gross, coupon)
    }
}
```

```kotlin
// src/main/kotlin/orders/Modules.kt
import org.koin.core.module.dsl.factoryOf
import org.koin.core.module.dsl.singleOf
import org.koin.dsl.module

val dataModule = module {
    singleOf(::MapPriceRepository) { bind<PriceRepository>() }
}

val domainModule = module {
    singleOf(::PercentageDiscountPolicy) { bind<DiscountPolicy>() }
    factoryOf(::OrderService)
}
```

`OrderService` è `factory` perché non ha stato e chi lo usa ne vuole un'istanza fresca per richiesta; il repository è `single` perché è un catalogo statico. Riceve le dipendenze dal costruttore `singleOf`/`factoryOf`, che genera il `get()` per te.

## Passo 3 — Contenitore isolato nei test

I test non chiamano `startKoin`: `koinApplication { modules(...) }` crea un contenitore non registrato globalmente, liberato con `close()`. Ogni test parte pulito.

```kotlin
// src/test/kotlin/orders/OrderServiceTest.kt
import org.koin.dsl.koinApplication
import org.koin.dsl.module
import org.koin.test.get
import kotlin.test.Test
import kotlin.test.assertEquals

class OrderServiceTest {
    @Test
    fun `applica lo sconto coupon`() {
        val app = koinApplication {
            allowOverride(true)
            modules(domainModule, dataModule, module {
                single<DiscountPolicy> { DiscountPolicy { _, coupon -> if (coupon == "SALE10") 100 else 0 } }
            })
        }
        try {
            val service = app.koin.get<OrderService>()
            assertEquals(1650, service.total(listOf("bib-1" to 1, "bib-2" to 2), "SALE10"))
        } finally {
            app.close()
        }
    }
}
```

Il modulo inline sostituisce la `DiscountPolicy` di `domainModule`. Con `koin-test-junit5` il `try/finally` diventa `AutoCloseKoinTest`; per `by inject()` servono `KoinTest` e `KoinTestExtension`, che lavorano sul contenitore globale.

## Passo 4 — Verifica del grafo in CI

Il test che vale di più è quello che non esegue niente: `verify()` controlla che ogni parametro di ogni definizione abbia una definizione corrispondente.

```kotlin
// src/test/kotlin/orders/ModulesCheck.kt
import org.koin.test.verify.verify
import kotlin.test.Test

class ModulesCheck {
    @Test
    fun `il grafo di produzione e coerente`() {
        module { includes(dataModule, domainModule) }.verify()
    }
}
```

Rompilo di proposito: commenta il `bind<PriceRepository>()` e rilancia `gradle test`. Deve fallire con `MissingKoinDefinitionException` che indica `PriceRepository`. Se passano sia `verify()` sia i test funzionali, il container di produzione quasi certamente si avvia.

Nel `main` il container si costruisce una sola volta, con l'override disabilitato:

```kotlin
import org.koin.core.context.startKoin
import org.koin.core.context.KoinApplicationAlreadyStartedException

fun main() {
    try {
        startKoin {
            allowOverride(false)
            modules(dataModule, domainModule)
            createEagerInstances()
        }
    } catch (e: KoinApplicationAlreadyStartedException) {
        error("Koin avviato due volte: ${e.message}")
    }
}
```

`allowOverride(false)` trasforma una definizione duplicata in un errore all'avvio; `createEagerInstances()` costruisce subito le definizioni `createdAtStart`, così un errore emerge all'avvio e non alla prima richiesta.

## Passo 5 — Un parametro runtime

Il secondo caso d'uso riceve l'id dell'ordine, che non esiste al momento della configurazione: la lambda legge i valori da `parametersOf`, passati nell'ordine atteso per tipo.

```kotlin
class OrderAuditor(
    private val orderId: String,
    private val repository: PriceRepository,
) { fun audit(sku: String) = "ordine=$orderId sku=$sku prezzo=${repository.priceOf(sku)}" }

val auditModule = module {
    factory { (orderId: String) -> OrderAuditor(orderId, get()) }
}

// call site
val auditor = app.koin.get<OrderAuditor>(parametersOf("ord-42"))
```

Con `factory` ogni `get` crea un auditor per il suo id; con `single` il primo id resterebbe cablato. Con due parametri dello stesso tipo, `parametersOf("a", "b")` li assegna in ordine.

## Esercizi

1. Aggiungi una `Cache` come `single` e un `CatalogService` che la usa, poi verifica il grafo in CI.
2. Duplica `PriceRepository` con una variante `named("cache")` e prova a risolvere quella sbagliata: cattura l'eccezione nel test.
3. Converti il modulo inline del test di `OrderService` in un modulo riusabile con `includes`.
4. Misura con un contatore statico quante volte viene invocata la lambda della `factory` e quante volte quella del `single`.
5. Introduci `scoped` per un oggetto legato alla singola sessione di checkout e scrivi un test che ne verifichi la chiusura.

<details>
<summary>Soluzione</summary>

1. Basta `singleOf(::InMemoryCache) { bind<Cache>() }` in `dataModule`: se il costruttore di `CatalogService` dichiara `Cache`, `verify()` lo vede senza altro lavoro.

2. `get<PriceRepository>(named("cache"))` su un grafo che ha solo il default lancia `NoDefinitionFoundException`; il test usa `assertFailsWith`.

3. Il modulo inline diventa `val fakeModule = module { single<DiscountPolicy> { ... } }` e il test carica `modules(domainModule, dataModule, fakeModule)`.

4. Un `var counter` incrementato nella lambda dimostra che la `factory` viene chiamata a ogni `get` e la `single` una volta sola per contenitore.

5. `scope<CheckoutSession> { scopedOf(::CheckoutCart) }`, poi `koin.createScope<CheckoutSession>()` e `close()`: `onClose` deve essere invocato una volta sola.

</details>

## Errori comuni

- **Avviare `startKoin` nei test invece di `koinApplication`**: il secondo test lancia `KoinApplicationAlreadyStartedException` ed errori che sembrano casuali.
- **Passare il parametro runtime come `single`**: il primo valore resta cablato e gli utenti successivi ricevono l'oggetto sbagliato.
- **Fidarsi del compilatore per i qualificatori a stringa**: `named("redis")` con una lettera diversa è un errore solo a runtime; usa tipi `@JvmInline`.
- **Lasciare `allowOverride(true)` in produzione**: nasconde definizioni duplicate che in test sembravano innocue.
- **Includere moduli di test in `appModule`**: il grafo di produzione espone implementazioni fittizie.

## In sintesi

`orders-koin` mostra il ciclo completo: BOM, dominio senza Koin, moduli con bind, test su contenitore isolato, gate di CI con `verify()` e parametri runtime solo in `factory`. Il costo di questa configurazione è basso; un grafo non verificato si paga in produzione.

## Fonti

- [Koin — Starting Koin](https://insert-koin.io/docs/reference/koin-core/starting-koin)
- [Koin — Unit Testing](https://insert-koin.io/docs/reference/koin-test/testing)
- [Koin — Verifying your Configuration](https://insert-koin.io/docs/reference/koin-test/verify)
- [Koin — Definitions](https://insert-koin.io/docs/reference/koin-core/definitions)
