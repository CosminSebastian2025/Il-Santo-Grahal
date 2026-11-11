# Lezione 27: ExecutorService e CompletableFuture

Creare thread a mano non scala: ogni thread costa memoria e il sistema operativo non li gestisce all'infinito. Un **pool** riusa un insieme di thread; `CompletableFuture` compone operazioni asincrone.

### ExecutorService

```java
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class EsempioPool {

    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        List<Future<Integer>> risultati = new ArrayList<>();

        for (int i = 1; i <= 10; i++) {
            final int n = i;
            risultati.add(pool.submit(() -> n * n));
        }

        for (Future<Integer> f : risultati) {
            System.out.println(f.get());
        }

        pool.shutdown();
    }
}
```

- `submit` accetta un `Runnable` o un `Callable<T>` e restituisce un `Future<T>`;
- `f.get()` attende il risultato;
- `shutdown()` lascia finire i compiti già inviati e chiude il pool.

| Metodo di `Executors` | Uso |
| --- | --- |
| `newFixedThreadPool(n)` | numero fisso di thread |
| `newCachedThreadPool()` | cresce e riusa thread inattivi |
| `newSingleThreadExecutor()` | un solo thread, esecuzione ordinata |
| `newScheduledThreadPool(n)` | esecuzione ritardata o periodica |
| `newVirtualThreadPerTaskExecutor()` | un virtual thread per compito |

### Future

```java
Future<Integer> futuro = pool.submit(() -> {
    Thread.sleep(500);
    return 42;
});

System.out.println(futuro.isDone());   // false
System.out.println(futuro.get());      // 42 dopo circa 500 ms
```

`get()` blocca il thread chiamante fino al risultato. Se il compito lancia un'eccezione, `get()` la ripropone dentro `ExecutionException`.

```java
try {
    futuro.get();
} catch (ExecutionException e) {
    System.out.println("Errore nel compito: " + e.getCause().getMessage());
}
```

### Chiudere il pool

```java
pool.shutdown();                     // termina dopo i compiti in corso
pool.shutdownNow();                  // interrompe i compiti
pool.awaitTermination(5, TimeUnit.SECONDS);
```

Un pool non chiuso tiene vivo il processo: il programma sembra bloccato alla fine del `main`. In un'applicazione Spring il pool è un bean gestito dal framework.

### CompletableFuture

`CompletableFuture` compone operazioni asincrone: concatenarle, combinarle e gestirne gli errori.

```java
import java.util.concurrent.CompletableFuture;

public class EsempioAsync {

    public static void main(String[] args) {
        CompletableFuture<String> utente =
            CompletableFuture.supplyAsync(() -> caricaUtente(1));

        CompletableFuture<String> ordini =
            CompletableFuture.supplyAsync(() -> caricaOrdini(1));

        CompletableFuture<String> riepilogo = utente.thenCombine(
            ordini,
            (u, o) -> u + " con " + o
        );

        riepilogo
            .thenAccept(System.out::println)
            .exceptionally(err -> {
                System.out.println("Errore: " + err.getMessage());
                return null;
            })
            .join();
    }

    static String caricaUtente(int id) {
        return "utente" + id;
    }

    static String caricaOrdini(int id) {
        return "3 ordini";
    }
}
```

Output:

```text
utente1 con 3 ordini
```

| Metodo | Effetto |
| --- | --- |
| `supplyAsync(funzione)` | esegue e restituisce un valore |
| `runAsync(azione)` | esegue senza valore |
| `thenApply(funzione)` | trasforma il risultato |
| `thenCompose(funzione)` | concatena un'altra operazione asincrona |
| `thenCombine(altro, funzione)` | combina due risultati indipendenti |
| `thenAccept(consumatore)` | usa il risultato senza restituire nulla |
| `exceptionally(funzione)` | gestisce l'errore e restituisce un valore |
| `handle(funzione)` | gestisce risultato ed errore insieme |
| `orTimeout(ms, unit)` | scade dopo un tempo |
| `join()` | attende il risultato |

### Catene di operazioni

```java
CompletableFuture<Integer> lunghezza = CompletableFuture
    .supplyAsync(() -> "java")
    .thenApply(String::toUpperCase)
    .thenApply(String::length);

System.out.println(lunghezza.join());   // 4
```

```java
CompletableFuture<String> risultato = CompletableFuture
    .supplyAsync(() -> caricaUtente(7))
    .thenCompose(nome -> CompletableFuture.supplyAsync(() -> nome + " - profilo"))
    .exceptionally(e -> "Profilo non disponibile");

System.out.println(risultato.join());
```

Differenza chiave: `thenApply` trasforma un valore, `thenCompose` concatena un'operazione che restituisce un altro `CompletableFuture`.

### Timeout

```java
CompletableFuture<String> lento = CompletableFuture
    .supplyAsync(() -> {
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return "fatto";
    })
    .orTimeout(1, java.util.concurrent.TimeUnit.SECONDS);

try {
    System.out.println(lento.join());
} catch (Exception e) {
    System.out.println("Tempo scaduto: " + e.getClass().getSimpleName());
}
```

### Virtual thread

Dalla versione 21 i **virtual thread** sono thread leggeri gestiti dalla JVM: costano pochissimo e permettono migliaia di compiti in attesa.

```java
import java.util.concurrent.Executors;

try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 10_000; i++) {
        executor.submit(() -> {
            Thread.sleep(1000);
            return null;
        });
    }
}
```

Con i thread tradizionali 10.000 thread in attesa sarebbero un problema; con i virtual thread è normale amministrazione. Sono ideali per compiti che aspettano molto (I/O, database, rete) e calcolano poco.

Non accelerano il calcolo puro: per quello servono i pool classici e il parallelismo reale.

In Spring Boot 3.2+ si attivano con una proprietà:

```properties
spring.threads.virtual.enabled=true
```

### Quando usare cosa

| Situazione | Strumento |
| --- | --- |
| Un compito asincrono con risultato | `CompletableFuture` |
| Molti compiti indipendenti | `ExecutorService` |
| Migliaia di attese di I/O | virtual thread |
| Attività periodica | `ScheduledExecutorService` |
| Calcolo parallelo su grandi array | parallel stream o pool dedicato |

### Esempio completo

```java
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class Prezzi {

    record Offerta(String negozio, double prezzo) { }

    static double prezzoDi(String negozio) {
        try {
            Thread.sleep(300);   // simula una chiamata di rete
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return switch (negozio) {
            case "A" -> 19.90;
            case "B" -> 18.50;
            default -> 21.00;
        };
    }

    public static void main(String[] args) {
        ExecutorService pool = Executors.newFixedThreadPool(3);

        long inizio = System.currentTimeMillis();

        List<CompletableFuture<Offerta>> richieste = List.of("A", "B", "C").stream()
            .map(negozio -> CompletableFuture.supplyAsync(
                () -> new Offerta(negozio, prezzoDi(negozio)), pool))
            .toList();

        CompletableFuture.allOf(richieste.toArray(CompletableFuture[]::new)).join();

        richieste.stream()
            .map(CompletableFuture::join)
            .min((a, b) -> Double.compare(a.prezzo(), b.prezzo()))
            .ifPresent(o -> System.out.printf(
                "Migliore: %s a %.2f euro%n", o.negozio(), o.prezzo()));

        long fine = System.currentTimeMillis();
        System.out.println("Tempo: " + (fine - inizio) + " ms");

        pool.shutdown();
    }
}
```

Le tre chiamate partono insieme: il tempo totale è circa 300 ms, non 900. `allOf` attende tutte; `join` recupera i risultati.

Output:

```text
Migliore: B a 18.50 euro
Tempo: 305 ms
```

### Errori comuni

- Dimenticare `shutdown()` e lasciare il processo vivo.
- Chiamare `get()` dentro un ciclo su un pool piccolo e bloccare i thread disponibili.
- Usare `thenApply` quando serve `thenCompose` (e ottenere un future annidato).
- Ignorare le eccezioni: senza `exceptionally` o `handle` il fallimento è silenzioso.
- Creare un pool per ogni richiesta: il pool si crea una volta e si riusa.
- Usare virtual thread per calcoli CPU-bound aspettandosi un guadagno.

## Esercizi progressivi

**Esercizio 1.** Crea un `newFixedThreadPool(2)` e invia tre compiti che stampano un messaggio; chiudi il pool.

**Esercizio 2.** Invia un `Callable` che restituisce un numero e leggi il risultato con `Future.get()`.

**Esercizio 3.** Avvia tre compiti da 500 ms ciascuno su un pool da 3 e misura il tempo totale.

**Esercizio 4.** Ripeti l'esercizio 3 con un pool da 1 e confronta i tempi.

**Esercizio 5.** Gestisci con `ExecutionException` un compito che lancia `IllegalStateException`.

**Esercizio 6.** Usa `CompletableFuture.supplyAsync` e `thenApply` per trasformare una stringa in maiuscolo.

**Esercizio 7.** Combina due future con `thenCombine` e stampa il risultato.

**Esercizio 8.** Concatena due operazioni con `thenCompose` e gestisci l'errore con `exceptionally`.

**Esercizio 9.** Aggiungi `orTimeout(1, TimeUnit.SECONDS)` a un compito da 3 secondi e gestisci la scadenza.

**Esercizio 10.** Avvia 1000 virtual thread che dormono 100 ms e misura il tempo.

**Esercizio 11.** Calcola il prezzo migliore da tre negozi in parallelo come nell'esempio.

**Esercizio 12.** Usa `allOf` e `anyOf` su tre future e spiega la differenza nell'output.

### Varianti

- Sostituisci `newFixedThreadPool(3)` con un pool di virtual thread e confronta.
- Aggiungi un contatore per misurare quanti compiti sono completati.
- Con `handle`, restituisci `"errore"` quando un future fallisce e `"ok"` quando riesce.
