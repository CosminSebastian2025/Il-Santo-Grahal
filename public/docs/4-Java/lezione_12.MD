# Lezione 12: Eccezioni

Un'eccezione è un errore che interrompe il flusso normale. Gestirla significa decidere cosa fare invece di far terminare il programma con uno stack trace.

### try, catch, finally

```java
try {
    int risultato = 10 / 0;
    System.out.println(risultato);
} catch (ArithmeticException e) {
    System.out.println("Divisione per zero: " + e.getMessage());
}
```

- Il blocco `try` contiene il codice che può fallire.
- Il `catch` intercetta un tipo di eccezione e gestisce il problema.
- Se nessuna eccezione viene lanciata, il `catch` non viene eseguito.

`finally` viene eseguito in ogni caso, anche se c'è un `return`:

```java
try {
    System.out.println("apro la risorsa");
} catch (Exception e) {
    System.out.println("errore");
} finally {
    System.out.println("chiudo la risorsa");
}
```

### Le due famiglie

**Checked**: il compilatore obbliga a gestirle o a dichiararle con `throws`. Esempi: `IOException`, `SQLException`, `FileNotFoundException`.

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public static void salva(String testo) throws IOException {
    Files.writeString(Path.of("note.txt"), testo);
}
```

Chi chiama `salva` deve gestire l'eccezione:

```java
try {
    salva("ciao");
} catch (IOException e) {
    System.out.println("Impossibile scrivere: " + e.getMessage());
}
```

**Unchecked** (runtime): errori di programmazione, non obbligano a nulla. Esempi: `NullPointerException`, `ArrayIndexOutOfBoundsException`, `IllegalArgumentException`, `NumberFormatException`.

```java
int numero = Integer.parseInt("abc");   // NumberFormatException
```

| Eccezione | Causa tipica |
| --- | --- |
| `NullPointerException` | usare un oggetto `null` |
| `ArrayIndexOutOfBoundsException` | indice fuori dai limiti |
| `NumberFormatException` | `parseInt` su testo non numerico |
| `IllegalArgumentException` | parametro non valido |
| `ClassCastException` | cast verso il tipo sbagliato |
| `ConcurrentModificationException` | collezione modificata durante l'iterazione |
| `StackOverflowError` | ricorsione senza caso base |
| `OutOfMemoryError` | heap esaurito |

Le ultime due sono `Error`, non `Exception`: indicano problemi gravi e di solito non si gestiscono.

### Più catch

```java
try {
    String testo = null;
    System.out.println(testo.length());
} catch (NullPointerException e) {
    System.out.println("Riferimento nullo");
} catch (RuntimeException e) {
    System.out.println("Altro errore: " + e.getClass().getSimpleName());
}
```

L'ordine conta: dal più specifico al più generico. `catch (Exception e)` cattura tutto e va usato con parsimonia, altrimenti nasconde errori che vorresti vedere.

Multi-catch:

```java
try {
    // operazioni
} catch (NumberFormatException | NullPointerException e) {
    System.out.println("Dato non valido: " + e.getMessage());
}
```

### Eccezioni personalizzate

```java
public class SaldoInsufficienteException extends Exception {

    public SaldoInsufficienteException(String messaggio) {
        super(messaggio);
    }
}
```

```java
public void preleva(double importo) throws SaldoInsufficienteException {
    if (importo > saldo) {
        throw new SaldoInsufficienteException(
            "Saldo insufficiente: disponibili " + saldo + " euro");
    }
    saldo -= importo;
}
```

```java
try {
    conto.preleva(500);
} catch (SaldoInsufficienteException e) {
    System.out.println(e.getMessage());
}
```

Un'eccezione personalizzata ha senso quando il chiamante deve distinguere quel caso specifico e reagire in modo diverso. Se il messaggio basta, `IllegalArgumentException` è sufficiente.

### try-with-resources

Le risorse come file, scanner e connessioni vanno chiuse. Il try-with-resources lo fa automaticamente, anche in caso di errore.

```java
import java.util.Scanner;

try (Scanner scanner = new Scanner(System.in)) {
    String riga = scanner.nextLine();
    System.out.println(riga);
}
```

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

try (BufferedReader reader = Files.newBufferedReader(Path.of("dati.txt"))) {
    String riga;
    while ((riga = reader.readLine()) != null) {
        System.out.println(riga);
    }
} catch (IOException e) {
    System.out.println("Errore di lettura: " + e.getMessage());
}
```

La variabile dichiarata nelle parentesi viene chiusa automaticamente alla fine del blocco.

### Lanciare eccezioni

```java
public static int eta(String testo) {
    int valore = Integer.parseInt(testo);   // può lanciare NumberFormatException
    if (valore < 0 || valore > 120) {
        throw new IllegalArgumentException("Età fuori intervallo: " + valore);
    }
    return valore;
}
```

Regole:

- lancia presto, quando il problema è evidente;
- aggiungi nel messaggio il valore che ha causato l'errore;
- non lanciare `Exception` generica: usa il tipo più preciso;
- non catturare un'eccezione per poi non fare nulla.

### Esempio completo

```java
import java.util.InputMismatchException;
import java.util.Scanner;

public class DivisioneSicura {
    public static void main(String[] args) {
        try (Scanner scanner = new Scanner(System.in)) {
            System.out.print("Dividendo: ");
            int a = scanner.nextInt();

            System.out.print("Divisore: ");
            int b = scanner.nextInt();

            int risultato = a / b;
            System.out.println("Risultato: " + risultato);

        } catch (InputMismatchException e) {
            System.out.println("Devi inserire numeri interi");
        } catch (ArithmeticException e) {
            System.out.println("Non si può dividere per zero");
        }
    }
}
```

Con `10` e `0` l'output è `Non si può dividere per zero`; con `abc` è `Devi inserire numeri interi`. In entrambi i casi il programma termina senza stack trace.

### Errori comuni

- Catturare `Exception` all'inizio e ignorare il contenuto.
- Blocchi `catch` vuoti: l'errore sparisce e il bug diventa invisibile.
- Gestire l'eccezione e poi continuare come se nulla fosse successo.
- Usare `printStackTrace()` come unica gestione in un programma reale.
- Dimenticare `throws` su un metodo che lancia un'eccezione checked.
- Chiudere le risorse solo nel percorso felice, senza `finally` o try-with-resources.

## Esercizi progressivi

**Esercizio 1.** Chiedi due interi e stampa la divisione, gestendo `ArithmeticException` e `InputMismatchException`.

**Esercizio 2.** Chiedi un numero come testo e convertilo con `Integer.parseInt`, gestendo `NumberFormatException`.

**Esercizio 3.** Scrivi `static int[] crea(int n)` che lancia `IllegalArgumentException` se `n` è negativo, e chiamalo con un valore non valido.

**Esercizio 4.** Crea `EtaNonValidaException` e usala in `registra(String nome, int eta)` con vincolo `0 <= eta <= 120`.

**Esercizio 5.** Crea `SaldoInsufficienteException` e usala in un `Conto` con `preleva(double)`; gestisci l'errore nel `main`.

**Esercizio 6.** Leggi un file inesistente con `Files.readString` e gestisci `IOException` con un messaggio chiaro.

**Esercizio 7.** Scrivi un metodo che accede a un array con un indice letto da tastiera; gestisci `ArrayIndexOutOfBoundsException` e stampa gli indici validi.

**Esercizio 8.** Scrivi `static double media(int[] voti)` che lancia `IllegalArgumentException` se l'array è vuoto o nullo, e gestiscila nel `main`.

**Esercizio 9.** Usa try-with-resources per leggere un file e contare le righe, gestendo l'errore di apertura.

**Esercizio 10.** Scrivi un metodo `static int parseEta(String testo)` che gestisce testo non numerico e valori fuori intervallo in un unico punto, restituendo `-1` in caso di errore.

### Varianti

- Aggiungi un blocco `finally` che stampa `Operazione conclusa` in tutti gli esercizi con input.
- Rendi `SaldoInsufficienteException` unchecked (`extends RuntimeException`) e spiega cosa cambia per il chiamante.
- Crea un'eccezione `DatiNonValidiException` con un campo `campo` che indica quale dato è sbagliato.
