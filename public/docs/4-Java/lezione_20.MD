# Lezione 20: Organizzare un progetto completo

Hai imparato la sintassi, gli oggetti e gli strumenti. Ora il passo che cambia tutto: dare una struttura a un programma che cresce. Questa lezione chiude la fase 4 e prepara il salto verso database e web.

### La struttura dei package

Un progetto Java si organizza in package con responsabilità separate.

```text
rubrica/
├── pom.xml
├── README.md
├── .gitignore
└── src/
    ├── main/
    │   ├── java/com/esempio/rubrica/
    │   │   ├── App.java
    │   │   ├── model/
    │   │   │   └── Contatto.java
    │   │   ├── service/
    │   │   │   └── RubricaService.java
    │   │   ├── ui/
    │   │   │   └── Menu.java
    │   │   └── util/
    │   │       └── Validatore.java
    │   └── resources/
    │       └── contatti.csv
    └── test/
        └── java/com/esempio/rubrica/
            └── RubricaServiceTest.java
```

| Package | Responsabilità |
| --- | --- |
| `model` | dati e regole dell'oggetto (`Contatto`) |
| `service` | logica dell'applicazione (`RubricaService`) |
| `ui` | input e output, menu |
| `util` | funzioni di supporto senza stato |
| `App` | avvio: crea gli oggetti e collega tutto |

Il `main` deve restare piccolo. Se contiene un menu di 200 righe, la logica è nel posto sbagliato.

### Separare le responsabilità

Prima, tutto in un file:

```java
public class App {
    public static void main(String[] args) {
        // stampa menu, legge input, valida, cerca, salva su file...
    }
}
```

Dopo, ogni classe fa una cosa:

```java
package com.esempio.rubrica.model;

public record Contatto(String nome, String telefono, String email) {

    public Contatto {
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("Nome obbligatorio");
        }
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Email non valida");
        }
    }
}
```

```java
package com.esempio.rubrica.service;

import com.esempio.rubrica.model.Contatto;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class RubricaService {

    private final List<Contatto> contatti = new ArrayList<>();

    public void aggiungi(Contatto contatto) {
        if (trova(contatto.nome()).isPresent()) {
            throw new IllegalArgumentException("Contatto già presente");
        }
        contatti.add(contatto);
    }

    public Optional<Contatto> trova(String nome) {
        return contatti.stream()
            .filter(c -> c.nome().equalsIgnoreCase(nome))
            .findFirst();
    }

    public List<Contatto> tutti() {
        return List.copyOf(contatti);
    }

    public boolean elimina(String nome) {
        return contatti.removeIf(c -> c.nome().equalsIgnoreCase(nome));
    }

    public int size() {
        return contatti.size();
    }
}
```

```java
package com.esempio.rubrica.ui;

import com.esempio.rubrica.model.Contatto;
import com.esempio.rubrica.service.RubricaService;

import java.util.Scanner;

public class Menu {

    private final Scanner scanner = new Scanner(System.in);
    private final RubricaService service;

    public Menu(RubricaService service) {
        this.service = service;
    }

    public void avvia() {
        int scelta;
        do {
            System.out.println("\n1) Aggiungi  2) Elenca  3) Cerca  4) Esci");
            System.out.print("Scelta: ");
            scelta = scanner.nextInt();
            scanner.nextLine();

            switch (scelta) {
                case 1 -> aggiungi();
                case 2 -> service.tutti().forEach(System.out::println);
                case 3 -> cerca();
                default -> System.out.println("Arrivederci");
            }
        } while (scelta != 4);
    }

    private void aggiungi() {
        System.out.print("Nome: ");
        String nome = scanner.nextLine();
        System.out.print("Telefono: ");
        String telefono = scanner.nextLine();
        System.out.print("Email: ");
        String email = scanner.nextLine();

        try {
            service.aggiungi(new Contatto(nome, telefono, email));
            System.out.println("Contatto aggiunto");
        } catch (IllegalArgumentException e) {
            System.out.println("Dato non valido: " + e.getMessage());
        }
    }

    private void cerca() {
        System.out.print("Nome: ");
        String nome = scanner.nextLine();
        service.trova(nome).ifPresentOrElse(
            System.out::println,
            () -> System.out.println("Non trovato"));
    }
}
```

```java
package com.esempio.rubrica;

import com.esempio.rubrica.service.RubricaService;
import com.esempio.rubrica.ui.Menu;

public class App {
    public static void main(String[] args) {
        RubricaService service = new RubricaService();
        new Menu(service).avvia();
    }
}
```

`App` ha tre righe. `Menu` gestisce input e output. `RubricaService` applica le regole. `Contatto` protegge i propri dati. Ogni classe si può testare da sola.

### Dipendenze in una direzione

```text
ui  ->  service  ->  model
```

- `ui` conosce `service`;
- `service` conosce `model`;
- `model` non conosce nessuno.

Se `model` importa `Menu`, la struttura è sbagliata: i dati non devono sapere come vengono mostrati. Rispettare la direzione delle dipendenze rende possibile cambiare l'interfaccia (terminale, web) senza toccare le regole.

### Configurazione e risorse

I valori che cambiano tra ambienti non stanno nel codice:

```properties
# src/main/resources/app.properties
nome.file=contatti.csv
max.contatti=1000
```

```java
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

Properties props = new Properties();
try (InputStream in = App.class.getResourceAsStream("/app.properties")) {
    props.load(in);
}
System.out.println(props.getProperty("max.contatti"));
```

Le credenziali vere non vanno nel repository: si passano come variabili d'ambiente o file esterni ignorati da Git.

### README

Un progetto senza README è un progetto che nessuno riesce a eseguire, nemmeno tu fra sei mesi.

```markdown
# Rubrica

Applicazione da terminale per gestire contatti.

## Requisiti
- JDK 21
- Maven 3.9+

## Build ed esecuzione
mvn clean package
java -cp target/classes com.esempio.rubrica.App

## Test
mvn test

## Struttura
- `model`: dati
- `service`: regole
- `ui`: menu e input
```

### Un ciclo di lavoro sano

1. Scrivi un test che descrive il comportamento da aggiungere.
2. Scrivi il codice minimo per farlo passare.
3. Rifattorizza: nomi, duplicazioni, classi troppo grandi.
4. Fai commit con un messaggio chiaro.
5. Ripeti.

Questo ciclo si chiama **test-driven development** nella sua forma stretta. Anche usato in modo più leggero, il principio resta: un comportamento nuovo deve avere un test o un esercizio che lo verifica.

### Errori comuni

- Tutto in una classe `Main` da 500 righe.
- Package che si importano a vicenda (`model` che importa `ui`).
- Codice di accesso al file dentro il menu.
- Valori di configurazione scritti nel codice.
- Nessun README, o un README che non funziona da una cartella pulita.
- Classi con nomi generici: `Manager`, `Helper`, `Utils` senza contesto.

## Esercizi progressivi

**Esercizio 1.** Prendi il progetto "Rubrica" della fase 2 e dividilo in `model`, `service`, `ui` e `App`.

**Esercizio 2.** Aggiungi al `service` il metodo `elimina(String nome)` e usa `removeIf`.

**Esercizio 3.** Sposta la validazione dell'email dalla UI al modello.

**Esercizio 4.** Verifica che `App` contenga al massimo cinque righe e correggi se non è così.

**Esercizio 5.** Aggiungi `List.copyOf` nel metodo `tutti()` e spiega perché è meglio restituire una copia.

**Esercizio 6.** Aggiungi un file `app.properties` con il nome del file dei contatti e leggilo con `Properties`.

**Esercizio 7.** Scrivi il README del progetto con requisiti, build, esecuzione, test e struttura.

**Esercizio 8.** Aggiungi un test per `aggiungi` che verifica il rifiuto di un contatto duplicato.

**Esercizio 9.** Aggiungi un'interfaccia `RubricaRepository` con le operazioni di salvataggio e carico, e un'implementazione su file.

**Esercizio 10.** Scrivi un `.gitignore` completo e verifica che `target/` non sia versionato.

**Esercizio 11.** Rifattorizza un metodo del progetto più lungo di 30 righe dividendolo in parti con nomi chiari.

### Varianti

- Aggiungi un livello `util.Validatore` con `emailValida(String)` e testalo.
- Sostituisci `record Contatto` con una classe normale che ha `equals` e `hashCode` scritti a mano.
- Aggiungi un secondo menu che usa lo stesso `service` con output diverso.

## Progetti della fase 4

### Progetto 1: Repository GitHub

Requisiti: progetto Java con più classi e package, `README.md` con requisiti, build, esecuzione e test, `.gitignore` corretto, almeno cinque commit chiari, un branch secondario unito su `main`, repository pubblicato su GitHub.

Criterio: chi clona il repository deve riuscire a compilare ed eseguire seguendo solo il README.

### Progetto 2: Test automatici

Requisiti: progetto Maven con JUnit 5, una classe `Rubrica` con `aggiungi`, `cerca`, `rimuovi` e `tutti`, almeno dieci test che coprono casi normali, limite ed errore, uso di `@BeforeEach`, `assertThrows` e almeno un test parametrizzato.

Criterio: `mvn test` passa senza fallimenti e senza test disattivati.

### Progetto 3: Build Maven o Gradle

Requisiti: applicazione da terminale strutturata in package, una dipendenza esterna dichiarata, `mvn clean package` che produce un jar eseguibile (o `gradlew build`), logging al posto delle stampe di debug, README con istruzioni di build ed esecuzione.

Criterio: da una cartella pulita, i comandi del README portano all'applicazione funzionante.

### Criteri di verifica

- [ ] La struttura dei package separa model, service e ui.
- [ ] Le dipendenze puntano in una sola direzione.
- [ ] Il `main` contiene solo l'avvio.
- [ ] Le classi di modello non dipendono dalla UI.
- [ ] `mvn test` è verde e `mvn package` produce l'artefatto.
- [ ] Il README funziona da clone pulito.
- [ ] Non ci sono credenziali nel repository.

Nella fase 5 si passa ai database e alle API REST con Spring Boot: il codice inizia a parlare con il mondo esterno.
