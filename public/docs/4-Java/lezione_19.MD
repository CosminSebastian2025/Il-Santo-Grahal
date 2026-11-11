# Lezione 19: Debugging e logging

Un programma che non compila è facile da correggere: il compilatore dice dove. Un programma che compila ma dà il risultato sbagliato richiede metodo: il debugger per vedere lo stato, il logging per capire cosa succede in esecuzione.

### Leggere gli errori del compilatore

```text
Main.java:12: error: ';' expected
        int eta = 30
                    ^
```

- il primo numero è la riga: `Main.java:12`;
- il messaggio dice cosa manca;
- l'indicatore `^` mostra il punto esatto.

Errori ricorrenti:

| Messaggio | Significato |
| --- | --- |
| `cannot find symbol` | nome sbagliato, import mancante o variabile fuori scope |
| `incompatible types` | stai assegnando un tipo a un altro |
| `missing return statement` | manca un `return` in un metodo non `void` |
| `class X is public, should be declared in a file named X.java` | nome del file diverso dalla classe |
| `reached end of file while parsing` | parentesi graffa non chiusa |
| `non-static method cannot be referenced from a static context` | serve un oggetto o il metodo deve essere `static` |

Un errore di sintassi può produrre dieci messaggi: correggi sempre **il primo**, poi ricompila. Gli altri spesso spariscono da soli.

### Debugger

Il debugger ferma il programma e permette di guardare dentro.

1. Metti un **breakpoint** cliccando a sinistra del numero di riga.
2. Avvia in modalità debug.
3. Quando l'esecuzione si ferma, ispeziona le variabili.
4. Prosegui con:
   - **step over** (F10): esegue la riga senza entrare nei metodi;
   - **step into** (F11): entra nel metodo chiamato;
   - **step out** (Shift+F11): termina il metodo corrente;
   - **resume** (F5): continua fino al prossimo breakpoint.
5. Aggiungi un **watch** su un'espressione per seguirla a ogni passo.

Esempio: un ciclo che somma i numeri da 1 a 5 e restituisce 14. Metti un breakpoint dentro il ciclo e osserva `somma` e `i` a ogni iterazione: noterai che il valore viene aggiornato due volte in un giro.

### Debug senza debugger

Stampare lo stato resta utile:

```java
System.out.println("DEBUG i=" + i + " somma=" + somma + " lista=" + lista.size());
```

Tecnica del dimezzamento: se un risultato è sbagliato, controlla il valore a metà del calcolo.

- giusto? l'errore è nella seconda metà;
- sbagliato? l'errore è nella prima metà.

Ripeti finché il punto è evidente. Funziona anche sui dati: dimezza la lista di input finché il problema non si riproduce.

Un'altra tecnica: sostituisci i dati letti da tastiera con valori fissi nel codice, così il caso si riproduce identico a ogni esecuzione.

### Errori a runtime più comuni

| Eccezione | Domanda da farsi |
| --- | --- |
| `NullPointerException` | quale riferimento è `null` e perché? |
| `ArrayIndexOutOfBoundsException` | l'indice è `length` invece di `length - 1`? |
| `IndexOutOfBoundsException` sulla lista | ho usato un indice o un valore? |
| `ConcurrentModificationException` | ho rimosso un elemento dentro un `for-each`? |
| `NumberFormatException` | il testo contiene spazi o lettere? |
| `ClassCastException` | il cast corrisponde al tipo reale? |
| `StackOverflowError` | manca il caso base nella ricorsione? |

Per `NullPointerException`, lo stack trace indica la riga esatta: parti da lì e chiediti chi doveva assegnare quel valore.

### Logging

`System.out.println` va bene per esercitarsi; in un programma reale serve un logger, con livelli e formattazione.

```java
import java.util.logging.Level;
import java.util.logging.Logger;

public class App {

    private static final Logger LOG = Logger.getLogger(App.class.getName());

    public static void main(String[] args) {
        LOG.info("Avvio applicazione");

        try {
            int risultato = 10 / 0;
            LOG.fine("Risultato " + risultato);
        } catch (ArithmeticException e) {
            LOG.log(Level.WARNING, "Divisione per zero", e);
        }

        LOG.warning("Operazione conclusa con un errore");
    }
}
```

Livelli, dal più grave:

| Livello | Uso |
| --- | --- |
| `SEVERE` | errore che impedisce il funzionamento |
| `WARNING` | situazione anomala gestita |
| `INFO` | eventi importanti del flusso |
| `CONFIG` | configurazione |
| `FINE` / `FINER` / `FINEST` | dettagli per lo sviluppatore |

In produzione il livello si alza (per esempio `INFO`) per non riempire i file; in sviluppo si abbassa a `FINE`.

Configurazione rapida:

```java
import java.util.logging.ConsoleHandler;
import java.util.logging.SimpleFormatter;

Logger root = Logger.getLogger("");
root.setLevel(Level.FINE);

ConsoleHandler handler = new ConsoleHandler();
handler.setFormatter(new SimpleFormatter());
root.addHandler(handler);
```

Nelle applicazioni reali si usa **SLF4J** con **Logback**:

```xml
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-simple</artifactId>
    <version>2.0.13</version>
</dependency>
```

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RubricaService {

    private static final Logger log = LoggerFactory.getLogger(RubricaService.class);

    public void aggiungi(Contatto c) {
        log.info("Aggiunto contatto {}", c.nome());
    }
}
```

I segnaposto `{}` evitano la concatenazione quando il livello non è attivo.

### Regole per un log utile

- scrivi cosa è successo e con quali dati: `Aggiunto contatto id=7 nome=Anna`;
- usa il livello giusto: un input non valido è `WARNING`, non `SEVERE`;
- passa l'eccezione come ultimo argomento per conservare lo stack trace;
- non loggare password, token, numeri di carte o dati personali;
- non loggare dentro un ciclo stretto: riempi il disco;
- un log che nessuno legge è rumore: ogni riga deve aiutare a capire un problema.

### Esempio completo

```java
import java.util.logging.Level;
import java.util.logging.Logger;

public class Divisore {

    private static final Logger LOG = Logger.getLogger(Divisore.class.getName());

    static int dividi(int a, int b) {
        LOG.fine(() -> "dividi(" + a + ", " + b + ")");

        if (b == 0) {
            LOG.warning("Tentativo di divisione per zero");
            throw new ArithmeticException("Divisore nullo");
        }

        return a / b;
    }

    public static void main(String[] args) {
        try {
            System.out.println(dividi(10, 2));
            System.out.println(dividi(10, 0));
        } catch (ArithmeticException e) {
            LOG.log(Level.SEVERE, "Calcolo interrotto", e);
        }
    }
}
```

Il log mostra il tentativo, l'avviso e lo stack trace completo. Un `System.out.println` da solo non darebbe né il livello né il contesto.

### Errori comuni

- Correggere gli errori in ordine casuale invece del primo.
- Disattivare il logging alla fine del debug e lasciare stampi sparsi nel codice.
- Loggare l'oggetto senza `toString()` e leggere `Contatto@1b6d3586`.
- Usare `printStackTrace()` come unica gestione degli errori.
- Riempire il log di `FINE` lasciando il livello al minimo in produzione.
- Modificare il codice sperando che funzioni senza leggere il messaggio di errore.

## Esercizi progressivi

**Esercizio 1.** Scrivi un programma con un errore di sintassi voluto, leggi l'errore del compilatore e correggilo.

**Esercizio 2.** Correggi un programma con tre errori in cascata: corri a ogni ricompilazione, uno alla volta.

**Esercizio 3.** Metti un breakpoint in un ciclo `for` e annota i valori della variabile a ogni iterazione.

**Esercizio 4.** Trova con il debugger un ciclo che sbaglia la condizione (`<=` invece di `<`) su un array.

**Esercizio 5.** Usa `step into` per entrare in un metodo chiamato e osserva i parametri.

**Esercizio 6.** Aggiungi un watch su `lista.size()` e osserva la crescita durante un programma che aggiunge elementi.

**Esercizio 7.** Provoca un `NullPointerException`, leggi lo stack trace e correggi la causa.

**Esercizio 8.** Provoca una `ConcurrentModificationException` e correggila con un `Iterator`.

**Esercizio 9.** Sostituisci i `System.out.println` di un esercizio precedente con un `Logger` a livello `INFO`.

**Esercizio 10.** Aggiungi un log di errore con `LOG.log(Level.SEVERE, "messaggio", e)` in un `catch`.

**Esercizio 11.** Configura il logger a `FINE` e verifica che i messaggi dettagliati compaiano solo a quel livello.

### Varianti

- Confronta l'output di `java.util.logging` e di SLF4J sullo stesso programma.
- Aggiungi un log con segnaposto `{}` in un metodo chiamato molte volte.
- Riduci un caso di bug dimezzando la lista di input fino alla riga colpevole.
