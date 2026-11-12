# Introduzione a Java

Java è un linguaggio orientato agli oggetti creato nel 1995 e ancora oggi tra i più usati al mondo. Il codice viene compilato in **bytecode** ed eseguito dalla **JVM** (Java Virtual Machine): lo stesso programma gira su Windows, macOS e Linux senza modifiche.

Con Java si costruiscono applicazioni backend, API REST, applicazioni Android, sistemi aziendali e strumenti da riga di comando. Questo percorso parte da zero e arriva a un'applicazione con database, API REST e deploy.

### Obiettivo del percorso

Il corso è diviso in **6 fasi** e **30 lezioni**. Ogni lezione aggiunge un pezzo e si chiude con esercizi in ordine di difficoltà.

1. **Basi del linguaggio** — scrivere piccoli programmi da terminale.
2. **Programmazione a oggetti** — pensare a classi e oggetti.
3. **Librerie fondamentali** — stringhe, collezioni, eccezioni, file, stream.
4. **Strumenti professionali** — Git, Maven/Gradle, test automatici, logging.
5. **Database e web** — SQL, JDBC, Spring Boot, API REST.
6. **Java avanzato** — concorrenza, JVM, design pattern, Docker, CI/CD.

### Il metodo

- Studia **45-60 minuti al giorno**, una lezione alla volta.
- Scrivi sempre il codice: leggere non basta.
- Completa gli esercizi di una lezione prima di passare alla successiva.
- I progetti di fine fase sono la parte più importante: finiscine uno alla volta.
- Leggi gli errori del compilatore con calma: indicano file, riga e simbolo.
- Se un esercizio non funziona, riduci il problema: stampa i valori intermedi e confrontali con l'atteso.

### Come ragionare (e come si applica)

#### Dove si applica

- **Backend e API REST**: un servizio riceve richieste HTTP e risponde in JSON. Conta la JVM perché il processo resta acceso per settimane e gestisce memoria e thread; contano i tipi perché il contratto dell'API non deve cambiare forma a runtime; contano gli oggetti perché ogni richiesta diventa un oggetto con campi validati.
- **Android**: la stessa logica gira su telefoni diversi. Conta la portabilità del bytecode (eseguito da ART, erede della JVM), contano gli oggetti per Activity, adapter e modelli, e i tipi evitano crash sui dati mancanti.
- **Sistemi aziendali**: gestionali, fatturazione, magazzino. Conta l'incapsulamento perché regole come "non prelevare oltre il saldo" devono stare in un solo punto e non essere aggirabili dall'esterno.
- **Big data e streaming**: pipeline su Kafka e Spark. Conta la JVM perché l'ecosistema è scritto in Java e Scala e gira sulla stessa macchina virtuale; contano collezioni e stream per trasformare grandi volumi con codice leggibile.
- **Strumenti e automazione**: CLI, build tool, job notturni. Conta la portabilità: lo stesso `.jar` gira sul portatile e sul server senza ricompilare.

#### La logica in sei passi

1. **Leggi il problema** e riscrivilo con parole tue: chi lo usa, cosa inserisce, cosa deve ottenere.
2. **Definisci input e output**: tipo, forma, unità. Il saldo è un `double`, l'intestatario una `String`.
3. **Risolvi un esempio a mano** con numeri piccoli: se non riesci a mano, il codice non può riuscirci.
4. **Scomponi in classi e metodi**: i sostantivi diventano classi, i verbi metodi. "Deposita 50 sul conto" diventa `conto.deposita(50)`.
5. **Scrivi la versione minima**: un solo caso, nessuna ottimizzazione; deve compilare e stampare qualcosa di sensato.
6. **Prova i casi limite e generalizza**: vuoto, `null`, duplicati, importi negativi, un solo elemento, input malformato. Ogni caso diventa un `if`, una validazione o un test.

#### Esempio guidato 1: conto bancario con movimenti

**Problema**: un conto ha saldo e storico dei movimenti; depositi e prelievi devono rifiutare importi non validi e prelievi oltre il saldo.

**Ragionamento**: "conto" è la classe `ContoBancario`, "movimento" è una riga dello storico, quindi una `List<String>`. `saldo` e `movimenti` sono `private`: si toccano solo tramite `deposita` e `preleva`, così le regole stanno in un punto solo e nessuna classe esterna può scrivere `conto.saldo = 999999`. I controlli stanno nei metodi, non nel `main`.

```java
import java.util.ArrayList;
import java.util.List;

public class ContoBancario {
    private double saldo;
    private final List<String> movimenti = new ArrayList<>();
    public void deposita(double importo) {
        if (importo <= 0) {
            System.out.println("Importo non valido: " + importo);
            return;
        }
        saldo += importo;
        movimenti.add("+" + importo);
    }
    public void preleva(double importo) {
        if (importo <= 0 || importo > saldo) {
            System.out.println("Prelievo rifiutato: " + importo);
            return;
        }
        saldo -= importo;
        movimenti.add("-" + importo);
    }
    public static void main(String[] args) {
        ContoBancario conto = new ContoBancario();
        conto.deposita(100.0);
        conto.deposita(-10.0);
        conto.preleva(500.0);
        conto.preleva(30.0);
        System.out.println("Saldo: " + conto.saldo + ", movimenti: " + conto.movimenti);
    }
}
```

Output atteso: `Importo non valido: -10.0`, `Prelievo rifiutato: 500.0`, poi `Saldo: 70.0, movimenti: [+100.0, -30.0]`.

#### Esempio guidato 2: filtro di una lista di prodotti

**Problema**: data una lista di prodotti con nome, prezzo e disponibilità, ottenere i nomi dei prodotti disponibili sotto una soglia, in ordine alfabetico.

**Ragionamento**: input `List<Prodotto>` più soglia, output `List<String>`. La catena si legge come una frase: filtra, ordina, trasforma. Il caso vuoto fa parte del problema: lista `null` o senza elementi deve dare lista vuota, non un'eccezione.

```java
import java.util.Comparator;
import java.util.List;

public class Catalogo {
    record Prodotto(String nome, double prezzo, boolean disponibile) {
    }

    public static List<String> nomiEconomici(List<Prodotto> prodotti, double soglia) {
        if (prodotti == null) {
            return List.of();
        }
        return prodotti.stream()
                .filter(p -> p.disponibile() && p.prezzo() < soglia)
                .sorted(Comparator.comparing(Prodotto::nome))
                .map(Prodotto::nome)
                .toList();
    }

    public static void main(String[] args) {
        List<Prodotto> prodotti = List.of(
                new Prodotto("Tastiera", 25.0, true),
                new Prodotto("Mouse", 15.0, true),
                new Prodotto("Monitor", 120.0, true),
                new Prodotto("Cavo", 5.0, false));
        System.out.println(nomiEconomici(prodotti, 30.0));
        System.out.println(nomiEconomici(prodotti, 2.0));
        System.out.println(nomiEconomici(null, 30.0));
    }
}
```

**Output atteso**: `[Mouse, Tastiera]`, poi `[]` con soglia `2.0`, poi `[]` con input `null`; la prima riga mostra l'ordine alfabetico e l'esclusione del cavo non disponibile.

#### Debug: ragionare su un errore

Frammento che lancia `NullPointerException`:

```java
for (Prodotto p : prodotti) {
    totale += p.prezzo();   // se p è null, l'eccezione parte da qui
}
```

Come isolare: leggi lo stack trace e individua la riga esatta; stampa lo stato prima di usarlo (`System.out.println(prodotti)` e `System.out.println(p)`); formula l'ipotesi (lista `null` oppure un elemento `null`); riproduci con una lista di un solo elemento `null`. Con gli indici vale lo stesso: `get(size())` è sempre fuori dai limiti, il ciclo corretto usa `< size()`.

Correzione che accetta lista `null` e salta gli elementi `null`:

```java
public static double totale(List<Prodotto> prodotti) {
    if (prodotti == null) {
        return 0;
    }
    return prodotti.stream()
            .filter(Objects::nonNull)
            .mapToDouble(Prodotto::prezzo)
            .sum();
}
```

#### Tabella di orientamento

| Obiettivo | Come ragionare | Strumento Java |
| --- | --- | --- |
| Modellare un concetto | Cerca i sostantivi e i dati che non possono mancare | Classe con campi `private` e costruttore |
| Gestire più elementi | Chiediti se servono ordine, chiavi o unicità | `List`, `Map`, `Set` |
| Proteggere una regola | Chiediti chi può violarla e chiudi quella porta | Incapsulamento e validazione nel costruttore |
| Segnalare un errore | Distingui errore del chiamante da errore imprevisto | `IllegalArgumentException`, eccezioni custom |
| Trasformare dati | Descrivi la pipeline con verbi: filtra, ordina, trasforma | Stream: `filter`, `map`, `sorted` |
| Verificare il comportamento | Parti dai casi limite e scrivili come aspettative | JUnit, `assertEquals` |

#### Esercizi di ragionamento

Per ognuno scrivi prima input, output, passi e casi limite; solo dopo il codice. Nessuna soluzione è inclusa.

1. **Rubrica**: input una `List<String>` di nomi, output il numero di nomi distinti e non vuoti. Quali passi tolgono vuoti e duplicati? Casi limite: lista vuota, tutti vuoti, nome ripetuto. Atteso: `["Anna", "", "Luca", "Anna"]` restituisce `2`.
2. **Media voti**: input una `List<Integer>` di voti 0-30, output la media come `double`, con messaggio se non ci sono voti. Dove va il controllo sul conteggio zero? Casi limite: lista vuota, un solo voto, voto fuori range. Atteso: `[18, 24, 30]` restituisce `24.0`; `[]` restituisce un messaggio, non `NaN`.
3. **Giacenze**: input righe `"nome;quantita"`, output una `Map<String, Integer>` con le quantità sommate per nome. Come gestisci la riga malformata? Casi limite: riga senza `;`, quantità non numerica, nome ripetuto. Atteso: `["penna;2", "penna;3", "gesso;1"]` restituisce `{penna=5, gesso=1}` (l'ordine di stampa può variare).

### Come è organizzato il corso

| Fase | Lezioni | Argomenti |
| --- | --- | --- |
| 1 | 1-5 | Compilazione, variabili, input, condizioni, cicli, array, metodi |
| 2 | 6-10 | Classi, oggetti, incapsulamento, ereditarietà, interfacce, enum, record |
| 3 | 11-15 | Stringhe, eccezioni, collezioni, generics, file, date, Stream |
| 4 | 16-20 | Git, Maven e Gradle, JUnit, debugging, logging, struttura del progetto |
| 5 | 21-25 | SQL, JOIN, JDBC, Spring Boot, REST, validazione, sicurezza |
| 6 | 26-30 | Thread, executor, JVM, design pattern, SOLID, Docker, CI/CD, monitoring |

Ogni fase termina con un elenco di **progetti** e con i criteri per capire se puoi passare alla fase successiva.

### Gli strumenti

Serve un **JDK** (Java Development Kit). Consigliato **JDK 21 LTS** o **JDK 25 LTS**, scaricabile da [Adoptium](https://adoptium.net/) o [Oracle](https://www.oracle.com/java/technologies/downloads/).

Controlla l'installazione:

```bash
java -version
javac -version
```

Come editor: **IntelliJ IDEA Community**, **Visual Studio Code** con il pacchetto Java, oppure **Eclipse**.

### Compilare ed eseguire

Un file `Main.java`:

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Ciao, mondo!");
    }
}
```

Compila ed esegui:

```bash
javac Main.java
java Main
```

Con Java 11 o superiore puoi anche eseguire direttamente il sorgente:

```bash
java Main.java
```

Il nome del file deve coincidere con quello della classe pubblica: `public class Main` deve stare in `Main.java`.

### Convenzioni del corso

- Classi, interfacce ed enum in `PascalCase`: `ContoBancario`, `StatoOrdine`.
- Metodi e variabili in `camelCase`: `calcolaMedia`, `numeroStudenti`.
- Costanti in `MAIUSCOLO_CON_UNDERSCORE`: `MAX_TENTATIVI`.
- I package in minuscolo: `com.example.rubrica`.
- Il metodo `main` ha sempre la firma `public static void main(String[] args)`.
- Ogni istruzione termina con `;` e ogni blocco usa le parentesi graffe `{ }`.

### Come usare gli esercizi

Ogni lezione contiene:

- **argomenti** con esempi e codice completo;
- **errori comuni** da riconoscere subito;
- **esercizi progressivi**: i primi sono meccanici, gli ultimi richiedono di combinare più argomenti;
- **varianti** per chi vuole un passo in più.

Non copiare gli esempi: riscrivi e modifica. Un esercizio scritto da te vale più di dieci copiati.

Nella lezione 1 si scrive il primo programma e si usano le variabili.
