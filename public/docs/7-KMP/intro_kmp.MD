# Introduzione a Kotlin Multiplatform

Kotlin Multiplatform (KMP) permette di scrivere la **logica** di un'app una sola volta in Kotlin e usarla da Android, iOS, desktop e backend. L'interfaccia resta nativa, oppure condivisa con Compose Multiplatform. Non è "scrivi una volta, gira ovunque" senza compromessi: è un modo per condividere modello, validazione, repository, stato e regole di business, lasciando a ogni piattaforma ciò che le appartiene.

Questo percorso porta da zero a un primo modulo condiviso funzionante, passando per il Kotlin necessario e per i concetti di architettura di un'app moderna.

### Obiettivo del percorso

Il corso segue tre fasi:

1. **Kotlin base** — variabili, tipi, funzioni, condizioni, cicli, classi, null safety, collezioni, lambda, extension functions e data class.
2. **App moderne** — separazione tra UI e logica, stato, eventi, API, JSON, architettura minima, repository, dependency injection e coroutine.
3. **KMP leggero** — modulo condiviso, codice comune, `expect`/`actual`, uso da Android e cenni all'integrazione iOS.

Le fasi diventano un piano di **4 settimane**, pensato per chi parte da zero e ha già visto un linguaggio:

| Settimana | Argomenti | Risultato |
| --- | --- | --- |
| 1 | Sintassi, variabili, funzioni, classi, null safety | programmi da console senza aiuto |
| 2 | Collezioni, lambda, extension functions, data class | codice più pulito e idiomatico |
| 3 | Stato, eventi, repository, API, JSON, coroutine | capire come un'app ottiene e gestisce dati |
| 4 | Progetto multiplatform minimale e modulo condiviso | codice condiviso in uso da Android |

Dopo le quattro settimane trovi il **piano di 90 giorni**: tre mesi per arrivare a un progetto KMP vero, con logica condivisa, repository, stato, app Android, test e, se puoi, integrazione iOS.

Se hai già seguito il percorso **Imparare Kotlin**, le settimane 1 e 2 sono un ripasso: puoi correrle più velocemente e fermarti sugli esercizi che ti mettono in difficoltà.

### Il metodo

- Studia **45-60 minuti al giorno**.
- Scrivi il codice e fallo girare: leggere non basta.
- Completa gli esercizi di una settimana prima di passare alla successiva.
- Un progetto finito e spiegabile vale più di tre progetti abbozzati.
- Leggi gli errori del compilatore: indicano file, riga e simbolo.
- Non copiare gli esempi: cambiali, rompili e rimettili insieme.
- Preferisci `val` a `var` finché non hai davvero bisogno di modificare un valore.

### Gli strumenti

- **JDK 21 LTS** (Adoptium o Oracle).
- **Android Studio** recente, con il supporto Kotlin Multiplatform nel wizard di progetto.
- **IntelliJ IDEA** come alternativa per i moduli condivisi e i programmi da console.
- **Xcode** recente solo se hai un Mac e vuoi provare il target iOS.

Versioni usate nel percorso:

| Strumento | Versione |
| --- | --- |
| Kotlin | 2.1.20 |
| Android Gradle Plugin | 8.7.3 |
| Gradle | 8.10+ (wrapper del progetto) |
| compileSdk / minSdk | 35 / 24 |
| kotlinx-coroutines | 1.10.1 |
| kotlinx-serialization-json | 1.8.0 |
| Ktor client | 3.1.1 |

Verifica da terminale:

```bash
java -version
./gradlew --version
```

Per i primi programmi puoi usare anche il **Kotlin Playground** ([play.kotlinlang.org](https://play.kotlinlang.org/)), che non richiede installazione ma non legge l'input da tastiera.

### Come funziona KMP

Un progetto multiplatform divide il codice in sorgenti:

| Cartella | Contenuto |
| --- | --- |
| `commonMain` | codice Kotlin condiviso da tutte le piattaforme |
| `androidMain` | codice specifico Android |
| `iosMain` | codice specifico iOS |
| `commonTest` | test condivisi, eseguibili su ogni target |

Quando una funzione deve comportarsi diversamente, si usa `expect`/`actual`: la firma è in `commonMain`, l'implementazione in ogni piattaforma.

```kotlin
// commonMain
expect fun nomePiattaforma(): String

// androidMain
actual fun nomePiattaforma(): String = "Android"

// iosMain
actual fun nomePiattaforma(): String = "iOS"
```

Il codice comune viene compilato per Android come libreria e per iOS come framework. L'app Android lo importa come un normale modulo Gradle; l'app iOS lo importa come framework Swift/Objective-C.

### Come è organizzato il corso

| Pagina | Contenuto |
| --- | --- |
| Settimana 1 | Kotlin base: sintassi, funzioni, classi, null safety |
| Settimana 2 | Collezioni, lambda, extension functions, data class |
| Settimana 3 | Architettura, stato, repository, API, JSON, coroutine |
| Settimana 4 | Primo modulo KMP condiviso e uso da Android |
| Piano di 90 giorni | Tre mesi, progetto finale e catalogo di idee |

Ogni settimana contiene argomenti con esempi, **errori comuni**, **esercizi progressivi**, **varianti** e **progetti** con criteri di verifica.

### Convenzioni del corso

- Classi, interfacce, data class ed enum in `PascalCase`: `ConvertitoreValute`, `StatoOrdine`.
- Funzioni, proprietà e variabili in `camelCase`: `calcolaSconto`, `prezzoFinale`.
- Costanti in `MAIUSCOLO_CON_UNDERSCORE`: `const val ALIQUOTA_IVA = 0.22`.
- Package in minuscolo: `com.example.shared`.
- Quattro spazi di indentazione, niente tab.
- Moduli Gradle in minuscolo: `shared`, `androidApp`.
- Il codice condiviso non importa classi Android: se serve, passa da `expect`/`actual`.

### Come usare esercizi e progetti

Gli esercizi sono progressivi: i primi verificano la sintassi, gli ultimi combinano più concetti e somigliano a codice reale. Le varianti servono per spingere un esercizio un po' più in là senza aspettare la settimana successiva.

I progetti sono la parte più importante. Scegline uno per settimana e portalo a termine:

- nella settimana 1 e 2 restano programmi da console;
- nella settimana 3 introducono stato, repository e dati;
- nella settimana 4 diventano un modulo condiviso usato da un'app Android.

Nella settimana 1 si parte dalle variabili e da un piccolo programma da console.
