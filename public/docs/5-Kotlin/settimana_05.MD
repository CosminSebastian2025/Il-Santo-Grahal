# Settimana 5: coroutine

Un programma che legge un file, chiama un'API o aspetta un database passa la maggior parte del tempo in attesa. Le **coroutine** permettono di aspettare senza bloccare il thread e senza creare un thread per ogni operazione.

### Perché le coroutine

Un thread del sistema operativo costa memoria e il loro numero non scala a migliaia. Una coroutine è un compito leggero gestito dalla libreria: può essere sospesa e ripresa, e migliaia di coroutine possono condividere pochi thread.

Il vantaggio non è solo la velocità: il codice asincrono resta scritto in modo **sequenziale**, senza callback annidate.

### Dipendenza e primo esempio

Con Gradle aggiungi la libreria:

```kotlin
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
}
```

```kotlin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    launch {
        delay(1000)
        println("Mondo")
    }
    println("Ciao")
}
```

Output: `Ciao` compare subito, `Mondo` dopo circa un secondo. `runBlocking` crea un ambiente di coroutine e blocca il thread principale finché tutte le coroutine figlie non hanno finito. Si usa nel `main` e nei test, non dentro un'applicazione reale.

### launch e delay

```kotlin
fun main() = runBlocking {
    val job = launch {
        repeat(3) { indice ->
            println("Lavoro $indice")
            delay(300)
        }
    }

    job.join()
    println("Finito")
}
```

- `launch` avvia una coroutine e restituisce un `Job`.
- `delay` sospende la coroutine senza bloccare il thread.
- `join` attende la fine di quella coroutine.

Senza `join`, il `main` potrebbe terminare prima che il lavoro sia concluso. `runBlocking` attende comunque le figlie, ma `join` rende l'ordine esplicito.

### async e await

`async` avvia una coroutine che produce un valore; `await` lo recupera.

```kotlin
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking

suspend fun calcola(nome: String, millisecondi: Long): String {
    delay(millisecondi)
    return nome
}

fun main() = runBlocking {
    val inizio = System.currentTimeMillis()

    val a = async { calcola("A", 300) }
    val b = async { calcola("B", 200) }

    println("${a.await()} ${b.await()}")
    println("Tempo: ${System.currentTimeMillis() - inizio} ms")
}
```

Le due operazioni partono insieme: il tempo totale è circa 300 ms, non 500. Se scrivessi `calcola("A", 300)` seguito da `calcola("B", 200)` senza `async`, aspetteresti la prima prima di avviare la seconda.

### Funzioni suspend

Una funzione `suspend` può sospendersi e può essere chiamata solo da un'altra funzione `suspend` o da una coroutine.

```kotlin
suspend fun caricaUtente(id: Int): String {
    delay(500)
    return "Utente $id"
}

fun main() = runBlocking {
    println(caricaUtente(1))
}
```

`suspend` non significa "esegue su un altro thread": significa "può sospendersi". Il dispatcher decide su quale thread gira il lavoro.

### Dispatcher e withContext

| Dispatcher | Uso |
| --- | --- |
| `Dispatchers.Default` | calcolo intensivo su CPU |
| `Dispatchers.IO` | file, rete, database (operazioni bloccanti) |
| `Dispatchers.Main` | aggiornare l'interfaccia (Android, JavaFX) |
| `Dispatchers.Unconfined` | casi particolari, da evitare nella pratica |

Per spostare una parte di lavoro su un altro dispatcher:

```kotlin
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

suspend fun leggiTesto(): String = withContext(Dispatchers.IO) {
    java.io.File("note.txt").readText()
}
```

`withContext` sospende la coroutine, esegue il blocco sul dispatcher indicato e restituisce il risultato. È il modo corretto per chiamare API bloccanti senza bloccare il thread principale.

### Concorrenza strutturata e cancellazione

Le coroutine formano una gerarchia: una coroutine genitore aspetta le figlie e, se fallisce, le cancella.

```kotlin
suspend fun elabora() = coroutineScope {
    launch {
        delay(1000)
        println("Prima operazione")
    }
    launch {
        delay(500)
        println("Seconda operazione")
    }
    println("Avviate")
}
```

`coroutineScope` restituisce il controllo solo quando tutte le figlie hanno finito. Se una figlia lancia un'eccezione, le altre vengono cancellate e l'errore risale.

Una coroutine si può cancellare:

```kotlin
val job = launch {
    repeat(1000) { indice ->
        delay(100)
        println(indice)
    }
}

delay(350)
job.cancelAndJoin()
```

`delay` è un punto di sospensione cancellabile: quando il job viene cancellato, la coroutine si interrompe. Un ciclo che non si sospende mai non è cancellabile: controlla `isActive` se necessario.

Per isolare i fallimenti c'è `supervisorScope`:

```kotlin
supervisorScope {
    val a = async { error("errore A") }
    val b = async { delay(300); "B ok" }

    println(runCatching { a.await() }.getOrElse { "A fallito" })
    println(b.await())
}
```

Il fallimento di `a` non cancella `b`.

### Errori nelle coroutine

Un'eccezione non gestita in una coroutine `launch` risale al genitore e può cancellare il lavoro. Le eccezioni di `async` vengono consegnate da `await`.

```kotlin
try {
    withTimeout(1000) {
        delay(3000)
    }
} catch (e: TimeoutCancellationException) {
    println("Tempo scaduto")
}
```

`withTimeout` lancia `TimeoutCancellationException` quando il blocco supera il limite.

Per proteggere uno stato condiviso, usa un lock sospendibile:

```kotlin
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

val mutex = Mutex()
var contatore = 0

coroutineScope {
    repeat(1000) {
        launch(Dispatchers.Default) {
            mutex.withLock {
                contatore++
            }
        }
    }
}
```

### Esempio completo: prezzi in parallelo

```kotlin
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking

data class Offerta(val negozio: String, val prezzo: Double)

suspend fun offerta(negozio: String, millisecondi: Long, prezzo: Double): Offerta {
    delay(millisecondi)
    return Offerta(negozio, prezzo)
}

fun main() = runBlocking {
    val inizio = System.currentTimeMillis()

    val a = async { offerta("A", 300, 18.50) }
    val b = async { offerta("B", 200, 17.90) }
    val c = async { offerta("C", 400, 19.00) }

    val offerte = listOf(a.await(), b.await(), c.await())
    val migliore = offerte.minByOrNull { it.prezzo }

    if (migliore != null) {
        println("Migliore: ${migliore.negozio} a ${"%.2f".format(migliore.prezzo)} euro")
    }
    println("Tempo: ${System.currentTimeMillis() - inizio} ms")
}
```

Output atteso, con tempi variabili:

```text
Migliore: B a 17.90 euro
Tempo: 403 ms
```

Il tempo è vicino alla chiamata più lenta (400 ms), non alla somma (900 ms).

### Errori comuni

- **Usare `Thread.sleep` dentro una coroutine.** Blocca il thread e annulla il vantaggio: usa `delay`.
- **Avviare coroutine con `GlobalScope`.** Non hanno un genitore, non vengono attese e sfuggono alla cancellazione.
- **Chiamare una funzione `suspend` da codice non `suspend`.** Il compilatore lo impedisce: avvolgi in `runBlocking` solo nel `main` o nei test.
- **Dimenticare `await` su un `async`.** L'eccezione può andare persa e il risultato non viene usato.
- **Usare `runBlocking` nel codice applicativo.** Serve a `main` e ai test, non dentro un servizio.
- **Accedere a uno stato condiviso senza sincronizzazione.** Le coroutine possono girare su thread diversi: usa `Mutex` o strutture atomiche.
- **Aspettare operazioni bloccanti sul dispatcher sbagliato.** File e rete vanno su `Dispatchers.IO`.

## Esercizi progressivi

**Esercizio 1.** Avvia due coroutine con `launch` che stampano un messaggio dopo 500 e 800 ms; verifica l'ordine.

**Esercizio 2.** Avvia tre coroutine da 500 ms ciascuna con `coroutineScope` e misura il tempo totale.

**Esercizio 3.** Esegui le stesse tre attese in modo sequenziale e confronta il tempo con l'esercizio 2.

**Esercizio 4.** Usa `async` per calcolare due valori e stampali con `await`.

**Esercizio 5.** Scrivi una funzione `suspend fun saluta(nome: String): String` che attende 300 ms e restituisce un saluto.

**Esercizio 6.** Avvolgi una lettura simulata di file in `withContext(Dispatchers.IO)` e stampa il risultato.

**Esercizio 7.** Avvia un job che stampa numeri ogni 100 ms e cancellalo dopo 350 ms con `cancelAndJoin`.

**Esercizio 8.** Usa `withTimeout(1000)` su un'attesa di 3 secondi e gestisci la scadenza.

**Esercizio 9.** In uno `supervisorScope`, avvia due `async`: uno fallisce, l'altro restituisce un valore. Gestisci il fallimento senza perdere il secondo.

**Esercizio 10.** Incrementa un contatore da 100 coroutine proteggendolo con `Mutex` e verifica il risultato.

**Esercizio 11.** Simula tre negozi con tempi diversi, recupera le offerte in parallelo e stampa la migliore.

**Esercizio 12.** Avvia 1000 coroutine che attendono 100 ms e misura il tempo totale; confrontalo con l'avvio di 1000 thread.

### Varianti

- Stampa il nome del thread in ogni coroutine con `Thread.currentThread().name`.
- Sostituisci `async` con `launch` e una lista condivisa protetta da `Mutex`.
- Aggiungi `withTimeoutOrNull` e usa `null` per indicare la scadenza invece di un'eccezione.

I tre progetti di questo blocco usano file, JSON e API: li trovi alla fine della settimana 6, dopo aver acquisito gli strumenti per gestire i dati.
