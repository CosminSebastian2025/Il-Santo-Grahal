# Lezione 15: File, date, Stream e Optional

Ultima lezione della fase 3. Mettiamo insieme quattro strumenti che userai in ogni progetto: leggere e scrivere file, gestire date, trasformare collezioni con gli stream e rappresentare i valori assenti con `Optional`.

### File con java.nio

`Path` rappresenta un percorso, `Files` offre le operazioni.

Scrivere un file:

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

Path percorso = Path.of("nomi.txt");
List<String> righe = List.of("Anna", "Luca", "Sara");

try {
    Files.write(percorso, righe);
    System.out.println("File scritto");
} catch (IOException e) {
    System.out.println("Errore: " + e.getMessage());
}
```

Leggere tutte le righe:

```java
try {
    List<String> lette = Files.readAllLines(Path.of("nomi.txt"));
    for (String riga : lette) {
        System.out.println(riga);
    }
} catch (IOException e) {
    System.out.println("Errore: " + e.getMessage());
}
```

Leggere tutto il contenuto come testo singolo:

```java
String contenuto = Files.readString(Path.of("nomi.txt"));
```

Aggiungere in coda:

```java
import java.nio.file.StandardOpenOption;

Files.writeString(
    Path.of("log.txt"),
    "nuova riga" + System.lineSeparator(),
    StandardOpenOption.CREATE,
    StandardOpenOption.APPEND
);
```

Controlli e utilità:

```java
Path p = Path.of("nomi.txt");

System.out.println(Files.exists(p));
System.out.println(Files.isRegularFile(p));
System.out.println(Files.size(p));

Files.createDirectories(Path.of("output", "report"));
Files.deleteIfExists(Path.of("vecchio.txt"));
```

Le operazioni sui file lanciano `IOException`: vanno in un `try` o dichiarate con `throws`. Per file grandi si usa un `BufferedReader` in try-with-resources, come nella lezione 12.

Un formato semplice e robusto per i dati è il CSV con punto e virgola:

```java
record Contatto(String nome, String telefono) { }

String riga = "Anna;3331112222";
String[] parti = riga.split(";");
Contatto c = new Contatto(parti[0], parti[1]);
```

Attenzione: se un campo può contenere il separatore, serve una regola di escape o una libreria CSV. Per gli esercizi va bene il formato semplice.

### Date e orari con java.time

```java
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

LocalDate oggi = LocalDate.now();
LocalTime ora = LocalTime.now();
LocalDateTime adesso = LocalDateTime.now();

System.out.println(oggi);     // 2026-11-11
System.out.println(ora);      // 14:32:05.123
System.out.println(adesso);   // 2026-11-11T14:32:05.123
```

Creare e modificare:

```java
LocalDate nascita = LocalDate.of(2000, 5, 14);
LocalDate traUnMese = oggi.plusMonths(1);
LocalDate ieri = oggi.minusDays(1);

System.out.println(oggi.isAfter(nascita));   // true
System.out.println(oggi.isLeapYear());       // false
System.out.println(oggi.lengthOfMonth());    // 30
```

Formattare e leggere:

```java
DateTimeFormatter formato = DateTimeFormatter.ofPattern("dd/MM/yyyy");

System.out.println(oggi.format(formato));                    // 11/11/2026
LocalDate letta = LocalDate.parse("14/05/2000", formato);
```

Differenze:

```java
import java.time.Period;

Period eta = Period.between(nascita, oggi);
System.out.println(eta.getYears() + " anni");
```

`LocalDate` è immutabile: `plusDays` restituisce una nuova data. Per date con fuso orario si usa `ZonedDateTime`.

### Lambda e interfacce funzionali

Una lambda è un blocco di codice passato come valore:

```java
Runnable saluto = () -> System.out.println("Ciao");
saluto.run();

Comparator<String> perLunghezza = (a, b) -> Integer.compare(a.length(), b.length());
```

Un'interfaccia funzionale ha un solo metodo astratto:

```java
@FunctionalInterface
interface Operazione {
    int applica(int a, int b);
}

Operazione somma = (a, b) -> a + b;
System.out.println(somma.applica(3, 4));   // 7
```

Interfacce standard in `java.util.function`:

| Interfaccia | Metodo | Uso |
| --- | --- | --- |
| `Predicate<T>` | `test(T)` | filtro |
| `Function<T,R>` | `apply(T)` | trasformazione |
| `Consumer<T>` | `accept(T)` | azione |
| `Supplier<T>` | `get()` | produzione |

Le method reference abbreviano una lambda che chiama un metodo esistente: `String::toUpperCase`, `System.out::println`.

### Stream

Uno stream è una sequenza di valori su cui si applicano operazioni. Non modifica la collezione originale.

```java
import java.util.List;
import java.util.stream.Collectors;

List<String> nomi = List.of("Anna", "Luca", "Sara", "Marco", "Elisa");

List<String> lunghi = nomi.stream()
    .filter(n -> n.length() > 4)
    .map(String::toUpperCase)
    .sorted()
    .collect(Collectors.toList());

System.out.println(lunghi);   // [ELISA, MARCO]
```

| Operazione | Effetto |
| --- | --- |
| `filter(predicato)` | tiene gli elementi che superano il test |
| `map(funzione)` | trasforma ogni elemento |
| `sorted()` | ordina |
| `distinct()` | rimuove i duplicati |
| `limit(n)` / `skip(n)` | taglia la sequenza |
| `count()` | conta |
| `anyMatch` / `allMatch` | verifica condizioni |
| `findFirst()` | primo elemento in un `Optional` |
| `collect(...)` | raccoglie il risultato |
| `forEach(azione)` | esegue un'azione |

Numeri:

```java
List<Integer> numeri = List.of(3, 8, 1, 10, 5, 8);

int somma = numeri.stream().mapToInt(Integer::intValue).sum();
double media = numeri.stream().mapToInt(Integer::intValue).average().orElse(0);
int massimo = numeri.stream().mapToInt(Integer::intValue).max().orElse(0);
long pari = numeri.stream().filter(n -> n % 2 == 0).count();

System.out.println(somma + " " + media + " " + massimo + " " + pari);
```

Raggruppare:

```java
List<String> parole = List.of("java", "kotlin", "c#", "python", "go", "rust", "c");

var perLunghezza = parole.stream()
    .collect(Collectors.groupingBy(String::length));

System.out.println(perLunghezza);
// {1=[c], 2=[go], 3=[c#], 4=[java, rust], 6=[kotlin, python]}
```

Somme per gruppo:

```java
record Vendita(String prodotto, double importo) { }

List<Vendita> vendite = List.of(
    new Vendita("Penna", 1.5),
    new Vendita("Zaino", 40.0),
    new Vendita("Penna", 3.0)
);

var totali = vendite.stream()
    .collect(Collectors.groupingBy(
        Vendita::prodotto,
        Collectors.summingDouble(Vendita::importo)));

System.out.println(totali);   // {Penna=4.5, Zaino=40.0}
```

Uno stream è **lazy**: nessuna operazione viene eseguita finché non arriva un'operazione terminale (`collect`, `count`, `sum`, `forEach`). Uno stream si consuma una sola volta: riutilizzarlo lancia `IllegalStateException`.

### Optional

`Optional` rappresenta un valore che può esserci o no. Evita di restituire `null` da un metodo.

```java
import java.util.Optional;

public static Optional<String> trova(List<String> nomi, String iniziale) {
    for (String nome : nomi) {
        if (nome.startsWith(iniziale)) {
            return Optional.of(nome);
        }
    }
    return Optional.empty();
}
```

```java
Optional<String> trovato = trova(List.of("Anna", "Luca", "Sara"), "S");

System.out.println(trovato.isPresent());   // true
trovato.ifPresent(n -> System.out.println("Trovato " + n));

String nome = trovato.orElse("nessuno");
String altro = trovato.orElseThrow(() -> new IllegalStateException("Nessun nome"));
```

Regole:

- `Optional` come tipo di ritorno, non come campo o parametro;
- `orElse` se il valore di default è già pronto, `orElseGet` se va calcolato;
- `get()` senza controllo è da evitare: usa `orElseThrow`;
- non incapsulare liste in `Optional`: una collezione vuota è già un'assenza valida.

### Esempio completo

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

public class Report {

    record Spesa(String descrizione, double importo) { }

    public static void main(String[] args) {
        Path file = Path.of("spese.csv");

        try {
            List<Spesa> spese = Files.readAllLines(file).stream()
                .filter(riga -> !riga.isBlank())
                .map(riga -> riga.split(";"))
                .filter(parti -> parti.length == 2)
                .map(parti -> new Spesa(parti[0], Double.parseDouble(parti[1])))
                .collect(Collectors.toList());

            double totale = spese.stream().mapToDouble(Spesa::importo).sum();
            Optional<Spesa> massima = spese.stream()
                .max(Comparator.comparingDouble(Spesa::importo));

            System.out.printf("Spese: %d, totale %.2f euro%n", spese.size(), totale);
            massima.ifPresent(s ->
                System.out.printf("Maggiore: %s (%.2f euro)%n", s.descrizione(), s.importo()));

        } catch (IOException e) {
            System.out.println("File non leggibile: " + e.getMessage());
        } catch (NumberFormatException e) {
            System.out.println("Importo non valido nel file");
        }
    }
}
```

Con un file:

```text
Pranzo;12.50
Libro;24.00
Benzina;45.00
```

Output:

```text
Spese: 3, totale 81.50 euro
Maggiore: Benzina (45.00 euro)
```

### Errori comuni

- Usare `Date` e `SimpleDateFormat` (vecchie e non thread-safe) al posto di `java.time`.
- Dimenticare che `LocalDate` è immutabile: `oggi.plusDays(1);` senza assegnare il risultato non fa nulla.
- Chiudere file a mano solo nel caso felice.
- Riutilizzare uno stream dopo un'operazione terminale.
- Chiamare `Optional.get()` senza `isPresent()`.
- Mescolare `null` e `Optional` nello stesso metodo: scegli uno dei due.
- Usare `map` per un'azione con effetti collaterali: in quel caso serve `forEach`.

## Esercizi progressivi

**Esercizio 1.** Scrivi tre righe in `note.txt`, poi rileggile e stampale numerate.

**Esercizio 2.** Aggiungi una riga in coda a `note.txt` con `StandardOpenOption.APPEND`.

**Esercizio 3.** Leggi un file di nomi, ignora le righe vuote e stampa quanti nomi ci sono.

**Esercizio 4.** Chiedi una data di nascita in formato `dd/MM/yyyy` e calcola l'età con `Period`.

**Esercizio 5.** Stampa la data di oggi in tre formati diversi.

**Esercizio 6.** Data una lista di date, trova la più recente e la più vecchia.

**Esercizio 7.** Data una lista di nomi, stampa in maiuscolo quelli più lunghi di 4 lettere con `Stream`.

**Esercizio 8.** Calcola somma, media e massimo di una lista di numeri con `mapToInt`.

**Esercizio 9.** Raggruppa una lista di città per iniziale con `Collectors.groupingBy`.

**Esercizio 10.** Data una lista di `record Vendita(String prodotto, double importo)`, calcola il totale per prodotto.

**Esercizio 11.** Scrivi un metodo che cerca uno studente per nome e restituisce `Optional<Studente>`; usalo con `ifPresent` e `orElse`.

**Esercizio 12.** Leggi un file CSV `descrizione;importo`, calcola il totale e gestisci le righe malformate senza interrompere l'elaborazione.

### Varianti

- Nel report, aggiungi il conteggio delle spese per descrizione con `groupingBy`.
- Scrivi il report su un file `report.txt` invece di stamparlo.
- Usa `anyMatch` per verificare se esiste una spesa sopra 100 euro.

## Progetti della fase 3

Sei progetti per mettere insieme collezioni, eccezioni, file, date e stream. Scegline uno, portalo a termine, poi passa al successivo.

### Progetto 1: TODO list

Applicazione da terminale con menu: aggiungi, mostra, completa, rimuovi, esci.

Requisiti: classe `Attivita` con descrizione e stato, `ArrayList` in memoria, selezione per indice con input non valido gestito, salvataggio su `todo.txt` all'uscita e ricarica all'avvio, messaggio quando la lista è vuota.

### Progetto 2: Gestore spese

Requisiti: `record Spesa(String descrizione, String categoria, double importo, LocalDate data)`, inserimento con importo positivo validato, totale per categoria con `groupingBy` e `summingDouble`, spese ordinate per data, filtro per mese, salvataggio su file.

Output atteso:

```text
Totale per categoria
Trasporti: 85.50
Alimentari: 120.30
Svago: 40.00
Totale: 245.80
```

### Progetto 3: Salvataggio dati su file

Requisiti: classe `Contatto` con nome, telefono ed email, formato `nome;telefono;email`, caricamento all'avvio saltando le righe malformate, gestione `IOException` con messaggio, menu con aggiungi, elenca, cerca, elimina, salva.

### Progetto 4: Catalogo film

Requisiti: `record Film(String titolo, String regista, int anno, double voto)`, almeno cinque film di esempio nel codice, ordinamento per anno e per voto, ricerca parziale sul titolo case-insensitive, media dei voti con `Stream`, film migliore con `Optional`, raggruppamento per decennio.

### Progetto 5: Ricerca contatti

Requisiti: `HashMap<String, Contatto>` con chiave il nome in minuscolo, ricerca esatta e parziale, aggiornamento di un contatto, conteggio per dominio email con `Stream`, stampa ordinata alfabeticamente.

### Progetto 6: Analizzatore di testo

Leggi un file di testo e produci: caratteri, parole, righe, le 10 parole più frequenti, lunghezza media delle parole, numero di frasi e parole più lunghe di 8 caratteri senza duplicati.

Suggerimento: normalizza con `toLowerCase()` e `replaceAll("[^a-zàèéìòù ]", " ")`, conta con `HashMap`, ordina con `Stream`, costruisci l'output con `StringBuilder`.

### Criteri di verifica

- [ ] Le collezioni sono usate con i generics, mai raw.
- [ ] Un file viene chiuso correttamente anche in caso di errore.
- [ ] Le date usano `java.time`, non `java.util.Date`.
- [ ] Gli errori di input producono un messaggio leggibile.
- [ ] Uno stream non viene riutilizzato dopo l'operazione terminale.
- [ ] `Optional` è usato al posto di `null` nei valori di ritorno.

Nella fase 4 impari a organizzare il codice con Git, Maven e i test automatici: gli strumenti che trasformano gli esercizi in un progetto vero.
