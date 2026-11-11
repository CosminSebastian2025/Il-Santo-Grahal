# Lezione 17: Maven e Gradle

Con un file `.java` basta `javac`. Con decine di file, librerie esterne e test serve uno strumento di build: scarica le dipendenze, compila, testa e crea il pacchetto. I due standard sono **Maven** e **Gradle**.

### Maven: il file pom.xml

Maven descrive il progetto in `pom.xml` (Project Object Model).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             https://maven.apache.org/xsd/maven-4.0.0.xsd">

    <modelVersion>4.0.0</modelVersion>

    <groupId>com.esempio</groupId>
    <artifactId>rubrica</artifactId>
    <version>1.0.0</version>

    <properties>
        <maven.compiler.release>21</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.10.2</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.2.5</version>
            </plugin>
        </plugins>
    </build>
</project>
```

Le coordinate identificano il progetto e le dipendenze:

- `groupId`: organizzazione o dominio al contrario (`com.esempio`);
- `artifactId`: nome del progetto (`rubrica`);
- `version`: versione (`1.0.0`).

### Struttura delle cartelle

Maven vuole una struttura precisa:

```text
rubrica/
├── pom.xml
├── README.md
├── .gitignore
└── src/
    ├── main/
    │   ├── java/
    │   │   └── com/esempio/
    │   │       ├── App.java
    │   │       └── Contatto.java
    │   └── resources/
    │       └── application.properties
    └── test/
        └── java/
            └── com/esempio/
                └── ContattoTest.java
```

- `src/main/java` contiene il codice dell'applicazione;
- `src/main/resources` contiene configurazioni e file non Java;
- `src/test/java` contiene i test;
- il percorso del package deve corrispondere alle cartelle: `com.esempio` → `com/esempio`.

### Comandi Maven

```bash
mvn compile          # compila in target/classes
mvn test             # esegue i test
mvn package          # crea il jar in target/
mvn verify           # test + controlli, usato in CI
mvn clean            # cancella target/
mvn clean package    # build completa da zero
```

Eseguire il jar:

```bash
java -jar target/rubrica-1.0.0.jar
```

Un jar normale **non** contiene le dipendenze. Per un eseguibile autonomo serve `maven-shade-plugin` o `maven-assembly-plugin`, oppure un'immagine Docker.

Eseguire una classe senza creare il jar:

```bash
mvn exec:java -Dexec.mainClass=com.esempio.App
```

### Dipendenze

Una dipendenza è una libreria esterna dichiarata nel `pom.xml`. Maven la scarica da Maven Central e la mette nel classpath.

```xml
<dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>
    <version>2.17.1</version>
</dependency>
```

Lo `scope` dice quando serve:

| Scope | Uso |
| --- | --- |
| `compile` (default) | sempre, anche a runtime |
| `test` | solo compilazione ed esecuzione dei test |
| `provided` | fornita dall'ambiente, per esempio il server |
| `runtime` | non serve per compilare, serve per eseguire |

Regole:

- usa versioni stabili, non `SNAPSHOT`;
- non aggiungere una dipendenza per qualcosa che la libreria standard fa già;
- esegui `mvn dependency:tree` per vedere da dove arriva una libreria;
- controlla le vulnerabilità note delle dipendenze.

### Gradle

Gradle è l'alternativa moderna. Usa `build.gradle.kts` (Kotlin DSL) o `build.gradle` (Groovy).

```kotlin
plugins {
    java
    application
}

group = "com.esempio"
version = "1.0.0"

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

application {
    mainClass.set("com.esempio.App")
}

tasks.test {
    useJUnitPlatform()
}
```

Comandi:

```bash
gradle build     # compila, testa e crea il pacchetto
gradle test      # solo i test
gradle run       # avvia l'applicazione
gradle clean     # pulisce build/
```

Il **wrapper** permette di compilare senza installare Gradle sul computer:

```bash
gradle wrapper
./gradlew build      # Linux e macOS
gradlew.bat build    # Windows
```

Il wrapper va versionato: così chi clona usa la stessa versione di Gradle.

### Maven o Gradle

| Aspetto | Maven | Gradle |
| --- | --- | --- |
| Configurazione | XML dichiarativo | DSL con codice |
| Curva iniziale | più semplice da leggere | più flessibile |
| Velocità | buona con cache | build incrementali più rapide |
| Diffusione aziendale | molto alta | alta e in crescita |
| Struttura | imposta | flessibile |

Per imparare va bene Maven: è lo standard di molti corsi, di Spring Initializr e di molti progetti aziendali. Gradle è comune su Android.

### Esempio completo

Progetto Maven minimo con un programma e un test.

`src/main/java/com/esempio/Calcolatrice.java`:

```java
package com.esempio;

public class Calcolatrice {

    public int somma(int a, int b) {
        return a + b;
    }

    public int dividi(int a, int b) {
        if (b == 0) {
            throw new ArithmeticException("Divisione per zero");
        }
        return a / b;
    }
}
```

`src/main/java/com/esempio/App.java`:

```java
package com.esempio;

public class App {
    public static void main(String[] args) {
        Calcolatrice c = new Calcolatrice();
        System.out.println("3 + 4 = " + c.somma(3, 4));
    }
}
```

Build ed esecuzione:

```bash
mvn clean package
java -cp target/classes com.esempio.App
```

Per creare un jar eseguibile aggiungi al `pom.xml`:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-jar-plugin</artifactId>
    <version>3.4.1</version>
    <configuration>
        <archive>
            <manifest>
                <mainClass>com.esempio.App</mainClass>
            </manifest>
        </archive>
    </configuration>
</plugin>
```

Poi `java -jar target/rubrica-1.0.0.jar`.

### Errori comuni

- Mettere i file fuori da `src/main/java`.
- Package nel file diverso dal percorso delle cartelle.
- Dimenticare `package com.esempio;` nella prima riga.
- Aggiungere dipendenze senza `scope` quando servono solo ai test.
- Modificare `pom.xml` senza eseguire `mvn clean package` per verificare.
- Versionare `target/` o `build/` su Git.

## Esercizi progressivi

**Esercizio 1.** Crea un progetto Maven con `pom.xml` minimo e una classe `App` che stampa un saluto; compila con `mvn compile`.

**Esercizio 2.** Sposta una classe esistente nella struttura `src/main/java/com/esempio` e correggi il package.

**Esercizio 3.** Esegui `mvn package` e avvia il jar con `java -jar`.

**Esercizio 4.** Aggiungi JUnit come dipendenza con scope `test` e verifica che `mvn test` lo scarichi.

**Esercizio 5.** Aggiungi `maven-jar-plugin` con `mainClass` e crea un jar eseguibile.

**Esercizio 6.** Aggiungi una dipendenza esterna (per esempio Jackson) e usala per stampare un oggetto in JSON.

**Esercizio 7.** Esegui `mvn dependency:tree` e individua una dipendenza transitiva.

**Esercizio 8.** Crea lo stesso progetto con Gradle e `build.gradle.kts`, poi esegui `gradle build`.

**Esercizio 9.** Genera il wrapper con `gradle wrapper` e compila con `./gradlew build`.

**Esercizio 10.** Aggiungi al progetto Maven il plugin `maven-compiler-plugin` con `release` 21 e verifica la build.

### Varianti

- Aggiungi al `pom.xml` il `maven-surefire-plugin` e controlla il report dei test.
- Confronta i tempi di `mvn clean package` e `./gradlew clean build` sullo stesso progetto.
- Aggiungi un profilo Maven `dev` che attiva una proprietà diversa.
