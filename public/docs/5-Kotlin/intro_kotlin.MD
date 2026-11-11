# Introduzione a Kotlin

Kotlin è un linguaggio moderno creato da JetBrains che gira sulla **JVM**, è pienamente interoperabile con Java ed è il linguaggio ufficiale per lo sviluppo Android. È conciso, ha la **null safety** nel sistema dei tipi e con le **coroutine** gestisce operazioni asincrone senza il peso dei thread.

Con Kotlin si costruiscono app Android, backend con Ktor o Spring Boot, strumenti da riga di comando, applicazioni desktop e progetti multiplatform.

### Obiettivo del percorso

Il corso è diviso in **8 settimane**. Ogni settimana aggiunge un pezzo:

1. **Basi** — primo programma, variabili, tipi, stringhe, condizioni e cicli.
2. **Funzioni e collezioni** — parametri, liste, set, mappe, `when` e lambda.
3. **Oggetti e null safety** — classi, proprietà, metodi, data class, enum e tipi nullable.
4. **Kotlin moderno** — funzioni di ordine superiore, operazioni sulle collezioni, scope functions, sealed class ed errori.
5. **Coroutine** — `launch`, `async`, `suspend`, dispatcher e concorrenza strutturata.
6. **File, JSON e dipendenze** — lettura e scrittura di file, serializzazione, HTTP e Gradle.
7. **Progetto** — scelta, progettazione e prima metà dello sviluppo.
8. **Consegna** — test, rifinitura, README e chiusura del progetto.

Le settimane 5 e 6 formano un unico blocco: i tre progetti del blocco sono alla fine della settimana 6. Anche le settimane 7 e 8 sono un unico progetto, sviluppato in due tappe.

### Il metodo

- Studia **45-60 minuti al giorno**.
- Scrivi sempre il codice: leggere non basta.
- Completa gli esercizi di ogni settimana prima di passare alla successiva.
- Fai un progetto alla volta, fino in fondo: un progetto finito vale più di tre abbozzati.
- Leggi gli errori del compilatore con calma: indicano file, riga e simbolo.
- Preferisci `val` a `var` finché non hai davvero bisogno di modificare il valore.

### Come è organizzato il corso

| Settimana | Argomenti |
| --- | --- |
| 1 | Primo programma, `val`/`var`, tipi, stringhe, numeri, input, condizioni, cicli |
| 2 | Funzioni, liste, set, mappe, `for`, `when`, lambda semplici |
| 3 | Classi, proprietà, metodi, data class, enum, tipi nullable e safe call |
| 4 | Funzioni di ordine superiore, `map`/`filter`/`reduce`/`fold`, scope functions, sealed class, errori |
| 5 | Coroutine, funzioni `suspend`, dispatcher e concorrenza strutturata |
| 6 | File, JSON con kotlinx.serialization, HTTP e Gradle |
| 7 | Scelta del progetto, architettura e sviluppo della prima metà |
| 8 | Test, rifinitura, README, consegna e idee per continuare |

Ogni settimana contiene argomenti con esempi, **errori comuni**, **esercizi progressivi** e **varianti**. Alla fine di ogni settimana (o blocco di settimane) trovi i **progetti** con requisiti e criteri di verifica.

### Gli strumenti

**Kotlin Playground** (nessuna installazione): [play.kotlinlang.org](https://play.kotlinlang.org/). Perfetto per i primi esperimenti. Non supporta l'input da tastiera: i programmi con `readln()` vanno eseguiti in locale.

**In locale**: installa un **JDK 21 LTS** (Adoptium o Oracle) e **IntelliJ IDEA Community**, che include il supporto Kotlin. In alternativa puoi usare VS Code con l'estensione Kotlin.

**Da terminale**: il compilatore `kotlinc` si installa con SDKMAN, Homebrew o insieme a IntelliJ. Controlla la versione:

```bash
kotlinc -version
java -version
```

### Il primo programma

```kotlin
fun main() {
    println("Ciao, mondo!")
}
```

Con `kotlinc`:

```bash
kotlinc Main.kt -include-runtime -d main.jar
java -jar main.jar
```

Dalla settimana 6 userai **Gradle**, che gestisce dipendenze, compilazione ed esecuzione con un solo comando.

### Convenzioni del corso

- Classi, interfacce, enum e data class in `PascalCase`: `ContoBancario`, `StatoOrdine`.
- Funzioni, proprietà e variabili in `camelCase`: `calcolaMedia`, `numeroStudenti`.
- Costanti in `MAIUSCOLO_CON_UNDERSCORE`: `const val MAX_TENTATIVI = 3`.
- Package in minuscolo: `com.example.rubrica`.
- Quattro spazi di indentazione, niente tab.
- `val` è la scelta predefinita: usa `var` solo quando il valore deve cambiare.
- Il punto di ingresso è sempre `fun main()`.

### Come usare esercizi e progetti

Ogni settimana contiene:

- **argomenti** con esempi commentati;
- **errori comuni** da riconoscere subito;
- **esercizi progressivi**, dal più semplice al più articolato;
- **varianti** per chi vuole spingere l'esercizio un po' più in là;
- **progetti** con requisiti e criteri di verifica.

Non copiare gli esempi: riscrivili e modificali. Se un esercizio ti blocca, riducilo alla parte più piccola che sai già fare e ricostruisci da lì.

Nella settimana 1 si parte dalle variabili e dal primo programma da console.
