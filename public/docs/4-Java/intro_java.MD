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
