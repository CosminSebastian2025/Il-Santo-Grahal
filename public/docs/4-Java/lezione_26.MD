# Lezione 26: Thread e concorrenza

Un thread è un flusso di esecuzione. Un programma Java parte con il thread `main`; con altri thread esegue più cose insieme. La concorrenza rende i programmi più reattivi, ma introduce errori difficili da riprodurre.

### Creare un thread

```java
public class EsempioThread {

    public static void main(String[] args) throws InterruptedException {
        Runnable lavoro = () -> {
            for (int i = 1; i <= 3; i++) {
                System.out.println("Lavoro " + i + " su " + Thread.currentThread().getName());
                try {
                    Thread.sleep(300);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
            }
        };

        Thread t = new Thread(lavoro, "worker");
        t.start();

        System.out.println("Avviato dal thread " + Thread.currentThread().getName());
        t.join();
        System.out.println("Fine");
    }
}
```

- `start()` avvia il thread: non chiamare `run()`, che eseguirebbe il codice nello stesso thread.
- `join()` attende la sua fine.
- `sleep(ms)` sospende il thread.
- `interrupt()` segnala di interrompere; `InterruptedException` va gestita ripristinando il flag con `Thread.currentThread().interrupt()`.

Output possibile:

```text
Avviato dal thread main
Lavoro 1 su worker
Lavoro 2 su worker
Lavoro 3 su worker
Fine
```

L'ordine tra thread non è garantito: è il sistema operativo a decidere.

### Race condition

Due thread che modificano la stessa variabile possono perdere aggiornamenti.

```java
class Contatore {
    private int valore = 0;

    public void incrementa() {
        valore++;   // leggi, somma, scrivi: tre passi non atomici
    }

    public int get() {
        return valore;
    }
}
```

```java
Contatore contatore = new Contatore();
Runnable compito = () -> {
    for (int i = 0; i < 1000; i++) {
        contatore.incrementa();
    }
};

Thread[] threads = new Thread[10];
for (int i = 0; i < threads.length; i++) {
    threads[i] = new Thread(compito);
    threads[i].start();
}
for (Thread t : threads) {
    t.join();
}

System.out.println(contatore.get());   // spesso meno di 10000
```

Il risultato è sbagliato perché `valore++` non è un'operazione atomica: due thread leggono lo stesso valore e uno sovrascrive la scrittura dell'altro.

### synchronized

`synchronized` garantisce che un solo thread alla volta esegua il blocco. Il thread che entra acquisisce il lock dell'oggetto.

```java
class ContatoreSicuro {
    private int valore = 0;

    public synchronized void incrementa() {
        valore++;
    }

    public synchronized int get() {
        return valore;
    }
}
```

Equivale a un blocco esplicito:

```java
public void incrementa() {
    synchronized (this) {
        valore++;
    }
}
```

Con `synchronized` il conteggio arriva a `10000`. Il costo è l'attesa: i thread si mettono in fila.

`AtomicInteger` risolve il caso semplice senza lock espliciti:

```java
import java.util.concurrent.atomic.AtomicInteger;

class ContatoreAtomico {
    private final AtomicInteger valore = new AtomicInteger();

    public void incrementa() {
        valore.incrementAndGet();
    }

    public int get() {
        return valore.get();
    }
}
```

Regole:

- sincronizza il minimo indispensabile;
- usa sempre lo stesso oggetto come lock;
- non chiamare metodi lenti o che fanno I/O dentro un blocco sincronizzato;
- evita lock annidati in ordini diversi: rischio di **deadlock**.

### Deadlock

```java
// Thread 1: lock A, poi B
// Thread 2: lock B, poi A
```

Se i due thread acquisiscono il primo lock e attendono il secondo, restano bloccati per sempre. Prevenzione: definire un ordine globale di acquisizione dei lock o ridurre il numero di lock.

### volatile

`volatile` garantisce che una modifica sia visibile agli altri thread.

```java
public class Interruttore {
    private volatile boolean attivo = true;

    public void ferma() {
        attivo = false;
    }

    public void esegui() {
        while (attivo) {
            // lavoro
        }
    }
}
```

Senza `volatile`, il ciclo potrebbe continuare per sempre perché il thread non vede la modifica fatta dall'altro. `volatile` non rende atomico `valore++`: per quello servono `synchronized` o `AtomicInteger`.

### Thread-safe

Una classe è thread-safe se può essere usata da più thread senza risultati errati.

| Strumento | Uso |
| --- | --- |
| `AtomicInteger`, `AtomicLong` | contatori |
| `synchronized` | sezioni critiche |
| `volatile` | flag condivisi |
| `ConcurrentHashMap` | mappa usata da più thread |
| `CopyOnWriteArrayList` | lista con poche scritture e molte letture |
| `BlockingQueue` | scambio di dati tra produttore e consumatore |

```java
import java.util.concurrent.ConcurrentHashMap;

ConcurrentHashMap<String, Integer> visite = new ConcurrentHashMap<>();
visite.merge("home", 1, Integer::sum);
```

`HashMap` e `ArrayList` non sono thread-safe: usarli da più thread senza sincronizzazione produce risultati imprevedibili, non solo eccezioni.

### Quando servono i thread

- operazioni di rete o database che aspettano molto;
- interfacce grafiche che non devono bloccarsi;
- elaborazioni parallele di dati indipendenti;
- server che gestiscono più richieste.

Non serve creare thread per calcoli veloci: il costo di creazione e sincronizzazione supera il guadagno. Nella lezione 27 vedremo i pool, il modo corretto di gestire molti compiti.

### Esempio completo

```java
import java.util.concurrent.atomic.AtomicInteger;

public class SommaParallela {

    public static void main(String[] args) throws InterruptedException {
        AtomicInteger somma = new AtomicInteger();
        int[] numeri = {1, 2, 3, 4, 5, 6, 7, 8};

        Thread[] threads = new Thread[4];

        for (int i = 0; i < 4; i++) {
            final int inizio = i * 2;
            threads[i] = new Thread(() -> {
                for (int j = inizio; j < inizio + 2; j++) {
                    somma.addAndGet(numeri[j]);
                }
            });
            threads[i].start();
        }

        for (Thread t : threads) {
            t.join();
        }

        System.out.println("Somma: " + somma.get());   // 36
    }
}
```

Ogni thread somma due numeri; `AtomicInteger` evita le race condition. Con quattro thread il risultato è sempre corretto, indipendentemente dall'ordine di esecuzione.

### Errori comuni

- Chiamare `run()` invece di `start()`.
- Accedere a una variabile condivisa senza sincronizzazione.
- Usare `HashMap` condivisa tra thread.
- Sincronizzare su oggetti diversi per proteggere lo stesso dato.
- Dimenticare `join()` e leggere il risultato prima della fine dei thread.
- Creare thread in un ciclo senza limite.
- Ignorare `InterruptedException` senza ripristinare il flag.

## Esercizi progressivi

**Esercizio 1.** Avvia un thread che stampa cinque numeri e attendilo con `join()`.

**Esercizio 2.** Avvia due thread che stampano lettere e numeri, e osserva l'ordine variabile.

**Esercizio 3.** Crea un thread che dorme un secondo e misura il tempo con `System.currentTimeMillis()`.

**Esercizio 4.** Interrompi un thread che dorme dopo 300 ms e gestisci `InterruptedException`.

**Esercizio 5.** Riproduci la race condition con un contatore non sincronizzato e verifica il risultato sbagliato.

**Esercizio 6.** Correggi l'esercizio 5 con `synchronized` e verifica il risultato.

**Esercizio 7.** Rifai l'esercizio 6 con `AtomicInteger`.

**Esercizio 8.** Scrivi un programma con un flag `volatile` che un thread legge e un altro modifica.

**Esercizio 9.** Usa `ConcurrentHashMap` per contare le parole di una frase da quattro thread.

**Esercizio 10.** Crea un esempio di deadlock con due lock e poi correggilo ordinando le acquisizioni.

### Varianti

- Confronta il tempo di esecuzione di una somma con un solo thread e con quattro thread.
- Aggiungi un contatore atomico che conta quante volte ogni thread esegue il suo ciclo.
- Prova `sleep(0)` in un ciclo e osserva il comportamento.
