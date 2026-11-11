# Lezione 28: JVM, garbage collector e prestazioni

Un programma Java non gira direttamente sulla macchina: gira su una macchina virtuale che gestisce memoria, classi e ottimizzazioni. Conoscere la JVM serve a capire certi errori e a misurare le prestazioni senza indovinare.

### Che cosa fa la JVM

Il compilatore `javac` produce **bytecode**, un formato intermedio che la JVM interpreta ed esegue. La JVM:

- carica le classi quando servono (**class loading**);
- verifica il bytecode prima di eseguirlo;
- gestisce la memoria e libera gli oggetti inutilizzati;
- compila a runtime il codice più usato in codice macchina (**JIT**).

| Sigla | Significato |
| --- | --- |
| **JVM** | Java Virtual Machine: esegue il bytecode |
| **JRE** | JVM + librerie standard: serve a eseguire |
| **JDK** | JRE + `javac` e strumenti: serve a sviluppare |

### Stack e heap

La memoria è divisa in due aree principali:

- lo **stack** contiene le variabili locali e i riferimenti; è veloce e viene liberato automaticamente all'uscita dal metodo;
- lo **heap** contiene gli oggetti creati con `new`; qui lavora il garbage collector.

```java
public class Memoria {

    public static void main(String[] args) {
        int x = 10;
        StringBuilder sb = new StringBuilder("ciao");

        modifica(x, sb);

        System.out.println(x);   // 10
        System.out.println(sb);  // ciaociao
    }

    static void modifica(int numero, StringBuilder testo) {
        numero = 99;            // cambia solo la copia locale
        testo.append("ciao");   // modifica l'oggetto condiviso
    }
}
```

In Java i parametri sono sempre passati **per valore**. Per i tipi primitivi si copia il numero; per gli oggetti si copia il **riferimento**, quindi il metodo può modificare l'oggetto puntato, ma non può far puntare il chiamante a un altro oggetto.

### Il garbage collector

Gli oggetti sullo heap che non sono più raggiungibili da nessun riferimento diventano spazzatura. Il **garbage collector (GC)** li individua e ne recupera la memoria.

La maggior parte degli oggetti muore subito: per questo lo heap è diviso in generazioni.

| Area | Contenuto |
| --- | --- |
| **Young** (Eden + Survivor) | oggetti appena creati |
| **Old** (Tenured) | oggetti sopravvissuti a molte raccolte |

Una raccolta **minor** pulisce la young ed è veloce; una raccolta **major** o **full** coinvolge la old ed è più costosa. Durante alcune fasi i thread applicativi sono fermati: si parla di **stop-the-world**.

| Collector | Caratteristica |
| --- | --- |
| **Serial** | un solo thread, heap piccoli |
| **Parallel** | più thread, massimo throughput |
| **G1** | predefinito su JDK recenti, pause prevedibili |
| **ZGC** | pause minime anche con heap grandi |
| **Shenandoah** | pause basse, heap grandi |

Non serve sceglierlo per un programma da esercizio: G1 va bene quasi sempre. Serve sapere che esiste e che si può cambiare con un flag.

### Riferimenti e memory leak

In Java non si libera la memoria a mano, ma si può impedire al GC di farlo. Un oggetto resta vivo finché esiste un riferimento raggiungibile.

```java
public class CacheSenzaLimiti {

    private static final List<byte[]> DATI = new ArrayList<>();

    public static void carica(int quantita) {
        for (int i = 0; i < quantita; i++) {
            DATI.add(new byte[1024 * 1024]); // 1 MB per elemento
        }
    }
}
```

La lista `static` vive per tutta l'esecuzione: ogni elemento aggiunto non viene mai liberato. Questo è un **memory leak** classico, frequente con cache fatte in casa, listener mai rimossi e raccolte statiche che crescono.

Rimedio: limitare la dimensione, usare una cache vera (lezione 30) o rimuovere i riferimenti quando non servono più.

### Misurare le prestazioni

La regola è una sola: **misura, non indovinare**. Il JIT riscalda il codice dopo le prime esecuzioni, quindi un benchmark va eseguito più volte.

```java
public class Benchmark {

    private static long tempoConcat(int n) {
        long inizio = System.nanoTime();
        String s = "";
        for (int i = 0; i < n; i++) {
            s += i;
        }
        long fine = System.nanoTime();
        System.out.println(s.length()); // evita che il compilatore ottimizzi via il lavoro
        return (fine - inizio) / 1_000_000;
    }

    private static long tempoBuilder(int n) {
        long inizio = System.nanoTime();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) {
            sb.append(i);
        }
        long fine = System.nanoTime();
        System.out.println(sb.length());
        return (fine - inizio) / 1_000_000;
    }

    public static void main(String[] args) {
        int n = 50_000;

        tempoConcat(1_000);   // riscaldamento JIT
        tempoBuilder(1_000);

        System.out.println("concat:  " + tempoConcat(n) + " ms");
        System.out.println("builder: " + tempoBuilder(n) + " ms");
    }
}
```

La concatenazione con `+=` crea una nuova `String` a ogni giro: il tempo cresce in modo quadratico. `StringBuilder` modifica lo stesso buffer e resta lineare.

### Flag e strumenti

| Opzione o comando | Uso |
| --- | --- |
| `-Xms256m` | heap iniziale |
| `-Xmx1g` | heap massimo |
| `-Xss512k` | stack di ogni thread |
| `-Xlog:gc` | log delle raccolte |
| `-XX:+UseZGC` | seleziona ZGC |
| `-XX:+HeapDumpOnOutOfMemoryError` | dump dello heap in caso di errore |
| `jps` | elenca i processi Java |
| `jcmd <pid> VM.flags` | mostra i flag attivi |
| `jstack <pid>` | thread dump |
| `jmap -histo <pid>` | istogramma degli oggetti |
| `jfr` / VisualVM | profilazione e registrazioni |

Esempio di esecuzione con limiti espliciti:

```bash
java -Xms256m -Xmx512m -Xlog:gc Main
```

Se il programma ha bisogno di più memoria di `-Xmx`, la JVM lancia `OutOfMemoryError`. Aumentare `-Xmx` rimanda il problema: se la memoria cresce senza fermarsi, c'è un leak.

### Errori comuni

- **Ottimizzare senza misurare.** La modifica "ovvia" spesso non è quella che conta.
- **Chiamare `System.gc()`.** È solo un suggerimento alla JVM: non garantisce nulla.
- **Aumentare `-Xmx` per nascondere un leak.** La memoria continuerà a crescere.
- **Confondere stack e heap.** I primitivi locali stanno sullo stack, gli oggetti sullo heap.
- **Credere che gli oggetti si copino passandoli a un metodo.** Si copia il riferimento.
- **Benchmark senza riscaldamento.** Le prime esecuzioni sono lente per via dell'interpretazione.

### Esempio completo

```java
public class Diagnostica {

    public static void main(String[] args) {
        Runtime rt = Runtime.getRuntime();
        long mb = 1024 * 1024;

        System.out.println("Heap massimo: " + rt.maxMemory() / mb + " MB");
        System.out.println("Heap totale:  " + rt.totalMemory() / mb + " MB");
        System.out.println("Heap libero:  " + rt.freeMemory() / mb + " MB");

        List<String> cresciuta = new ArrayList<>();
        for (int i = 0; i < 200_000; i++) {
            cresciuta.add("elemento-" + i);
        }

        System.out.println("Dopo 200.000 stringhe:");
        System.out.println("Heap totale:  " + rt.totalMemory() / mb + " MB");
        System.out.println("Heap libero:  " + rt.freeMemory() / mb + " MB");
        System.out.println("Elementi:     " + cresciuta.size());
    }
}
```

I numeri esatti cambiano da macchina a macchina: conta la tendenza, non il valore assoluto.

## Esercizi progressivi

**Esercizio 1.** Stampa `maxMemory()`, `totalMemory()` e `freeMemory()` in MB all'avvio del programma.

**Esercizio 2.** Scrivi un metodo che modifica un `int` e un array passati come parametri; dimostra che il primo resta invariato e il secondo no.

**Esercizio 3.** Crea 100.000 oggetti piccoli in una lista e stampa la memoria prima e dopo, poi richiama `System.gc()` e commenta il risultato.

**Esercizio 4.** Confronta con `System.nanoTime()` la creazione di 50.000 stringhe con `+=` e con `StringBuilder`.

**Esercizio 5.** Aggiungi il riscaldamento al benchmark dell'esercizio 4 ed esegui tre misure per ogni versione; riporta la media.

**Esercizio 6.** Esegui il programma dell'esercizio 3 con `-Xmx64m` e osserva l'`OutOfMemoryError`; leggi il messaggio e spiega cosa indica.

**Esercizio 7.** Crea un memory leak con una lista `static` che cresce a ogni chiamata di un metodo e proponi la correzione.

**Esercizio 8.** Avvia un programma con un thread che dorme 60 secondi, trova il processo con `jps` ed esegui `jstack`: individua il frame del `Thread.sleep`.

**Esercizio 9.** Avvia il programma di benchmark con `-Xlog:gc` e individua tre righe di raccolta, indicando quale generazione è stata pulita.

**Esercizio 10.** Confronta i flag attivi del tuo programma con `jcmd <pid> VM.flags` e individua i valori di `-Xmx` e del collector.

**Esercizio 11.** Esegui lo stesso programma con `-XX:+UseSerialGC` e con G1, riportando i tempi di esecuzione.

**Esercizio 12.** Per un servizio web con heap da 4 GB e latenze sotto i 50 ms, scegli un collector e motiva la scelta in cinque righe.

### Varianti

- Ripeti il benchmark con `String.join` e con un `StringBuilder` creato con dimensione iniziale stimata.
- Aggiungi una misura del picco di heap durante l'esecuzione, campionando `totalMemory() - freeMemory()`.
- Prova `-XX:+HeapDumpOnOutOfMemoryError`, genera l'errore e apri il dump con VisualVM.
