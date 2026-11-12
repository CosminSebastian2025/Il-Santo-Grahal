# Introduzione a Kotlin Multiplatform

Kotlin Multiplatform (KMP) permette di scrivere la **logica** di un'app una sola volta in Kotlin e usarla da Android, iOS, desktop e backend. L'interfaccia resta nativa, oppure condivisa con Compose Multiplatform. Non è "scrivi una volta, gira ovunque" senza compromessi: è un modo per condividere modello, validazione, repository, stato e regole di business, lasciando a ogni piattaforma ciò che le appartiene.

Questo percorso porta da zero a un primo modulo condiviso funzionante, passando per il Kotlin necessario e per i concetti di architettura di un'app moderna.

### Obiettivo del percorso

Il corso segue tre fasi. Ognuna produce qualcosa che gira: non si passa alla successiva finché la precedente non è chiara.

#### Fase 1 — Impara Kotlin base (2-4 settimane da zero)

Prima di KMP serve Kotlin. In questa fase impari:

- `val` e `var`, tipi di dato (`String`, `Int`, `Boolean`, `Double`, `Char`);
- funzioni con parametri, valori di ritorno e parametri con default;
- condizioni con `if` e `when`;
- cicli `for` e `while`;
- classi, oggetti, proprietà e metodi;
- null safety: `?`, `!!`, `?.`, `?:`;
- collezioni `List`, `Map`, `Set`;
- extension functions, `data class`, lambda e funzioni di ordine superiore.

**Obiettivo pratico:** scrivere piccoli programmi in Kotlin, anche senza grafica. Esempi: calcolatrice testuale, gestore di una lista di task, programma che legge dati e li filtra, piccolo sistema di utenti e prodotti.

**Tempo consigliato:** 2-4 settimane se parti da zero; 1 settimana se conosci già un altro linguaggio.

#### Fase 2 — Capisci come funziona un'app moderna (1-2 settimane)

Prima di condividere codice tra piattaforme devi capire com'è fatta un'app. I concetti importanti sono:

- UI separata dalla logica;
- stato dell'app ed eventi;
- chiamate API e serializzazione JSON;
- architettura minima, repository e dependency injection di base.

**Obiettivo:** capire che un'app non è solo "bottoni", ma ha uno **stato**, una **logica**, una **fonte dati** e una **presentazione**.

#### Fase 3 — Inizia con Kotlin Multiplatform leggero (1 settimana)

Qui entra KMP, con un progetto piccolo: un modulo condiviso che contiene la logica comune. Esempi: validazione di un form, conversione valute, calcolo di uno sconto, gestione di una lista di prodotti, repository che legge dati da un JSON.

**Obiettivo:** capire il concetto di **shared module**. Hai un modulo `shared` con codice Kotlin comune; Android e iOS usano quello stesso codice.

Le fasi diventano un piano di **4 settimane**, pensato per chi parte da zero e ha già visto un linguaggio:

| Settimana | Fase | Argomenti | Risultato |
| --- | --- | --- | --- |
| 1 | Fase 1 | Sintassi, variabili, funzioni, classi, null safety | programmi da console senza aiuto |
| 2 | Fase 1 | Collezioni, lambda, extension functions, data class | codice più pulito e idiomatico |
| 3 | Fase 2 | Stato, eventi, repository, API, JSON, coroutine | capire come un'app ottiene e gestisce dati |
| 4 | Fase 3 | Progetto multiplatform minimale e modulo condiviso | codice condiviso in uso da Android |

Dopo le quattro settimane trovi il **piano di 90 giorni**: tre mesi per arrivare a un progetto KMP vero, con logica condivisa, repository, stato, app Android, test e, se puoi, integrazione iOS.

Se hai già seguito il percorso **Imparare Kotlin**, le settimane 1 e 2 sono un ripasso: puoi correrle più velocemente e fermarti sugli esercizi che ti mettono in difficoltà.

### Come ragionare (e come si applica)

KMP non si impara ricordando il nome delle cartelle, ma decidendo **dove passa il confine** tra ciò che è uguale su ogni piattaforma e ciò che dipende dal sistema operativo. La domanda giusta non è "posso condividerlo?", ma "questa parte ha bisogno di Android, di iOS o di nessuno dei due?". Se la risposta è "nessuno dei due", appartiene a `commonMain`.

#### Dove si applica

- **App Android e iOS con la stessa logica.** Prezzi, sconti, validazione, stato della schermata e chiamate API sono identici; cambia solo il modo di mostrarli. Si condivide il "cosa", si lascia alle piattaforme il "come".
- **SDK o libreria per altri team.** Un SDK vive dentro app che non controlli: il confine tra API pubblica e dettagli di piattaforma deve essere esplicito, altrimenti ogni aggiornamento rompe chi lo usa.
- **Backend Ktor.** Lo stesso modulo di dominio e gli stessi DTO possono girare nel server e nell'app: una regola scritta una volta sola non può divergere tra client e server.
- **Desktop (JVM) e tool interni.** Un modulo condiviso si usa anche in un'app desktop o in uno script: se il codice è davvero comune, non serve riscriverlo.
- **Librerie di utilità comuni.** Formattazione, calcolo di totali, parser di date "semplici": funzioni pure, facili da testare e da riusare ovunque.

I confini contano per tre motivi concreti. Primo, `commonMain` viene compilato per **tutti** i target: se importa una classe Android, la compilazione iOS si rompe. Secondo, il codice comune si testa una volta in `commonTest` e vale per ogni piattaforma. Terzo, un confine pulito rende sostituibile la parte nativa: domani l'app iOS può cambiare senza toccare la logica.

#### La logica in sei passi

1. **Leggi il problema e riscrivilo in una frase.** "Calcolare il prezzo finale applicando sconto e IVA" è già metà del lavoro.
2. **Separa il comune dallo specifico.** Per ogni pezzo chiediti: serve un `Context`, una `View`, un file, un permesso? Se sì è di piattaforma; se no è comune.
3. **Definisci input e output prima del codice.** Tipi, unità di misura, cosa succede con valori nulli, negativi o vuoti. Un output scritto prima è anche il test che scriverai dopo.
4. **Progetta il modulo `shared`.** Funzioni pure e classi piccole in `commonMain`; `expect` solo dove il comportamento deve davvero cambiare.
5. **Scrivi la versione minima e i test comuni.** Prima il caso base, poi i casi limite; i test stanno in `commonTest` e girano su ogni target.
6. **Integra una piattaforma alla volta.** Prima Android con un uso minimo, poi iOS o desktop: un errore alla volta si trova, tre insieme no.

#### Esempio guidato 1: calcolo sconto condiviso

**Problema.** Un negozio applica il 10% di sconto sugli ordini da 100 euro e il 20% da 500 in su. Sotto 100 nessuno sconto. Il prezzo non può mai essere negativo.

**Ragionamento.** Qui non c'è nulla di Android: sono numeri e regole, quindi tutto in `commonMain` come funzione pura. La decisione sulla soglia resta separata dal calcolo, così ognuna si testa da sola.

```kotlin
// commonMain — com.example.shared
object Sconti {
    const val SOGLIA_BASSA = 100.0
    const val SOGLIA_ALTA = 500.0

    fun percentuale(totale: Double): Int = when {
        totale >= SOGLIA_ALTA -> 20
        totale >= SOGLIA_BASSA -> 10
        else -> 0
    }

    fun prezzoFinale(totale: Double): Double {
        require(totale >= 0) { "Il totale non può essere negativo" }
        return totale - totale * percentuale(totale) / 100.0
    }
}
```

```kotlin
// commonTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ScontiTest {
    @Test
    fun nessunoScontoSottoLaSoglia() {
        assertEquals(80.0, Sconti.prezzoFinale(80.0))
    }

    @Test
    fun scontoDieciSopraCento() {
        assertEquals(180.0, Sconti.prezzoFinale(200.0))
    }

    @Test
    fun scontoVentiSopraCinquecento() {
        assertEquals(480.0, Sconti.prezzoFinale(600.0))
    }

    @Test
    fun totaleNegativoNonAmmesso() {
        assertFailsWith<IllegalArgumentException> { Sconti.prezzoFinale(-1.0) }
    }
}
```

**Output atteso.** `80.0`, `180.0`, `480.0` e un'eccezione sul valore negativo: quattro test verdi in `commonTest`, identici su Android, iOS e desktop.

#### Esempio guidato 2: validazione form usata da Android

**Problema.** Una schermata di registrazione accetta email valida e password di almeno 8 caratteri. Gli errori vanno mostrati sotto i campi, non in un messaggio unico.

**Ragionamento.** Separare tre cose: il **modello** (i valori inseriti), gli **errori** (un elenco tipizzato, non stringhe sparse) e lo **stato** (cosa mostrare). Nessuna delle tre ha bisogno di Android: il `Context` serve solo al layout, quindi le regole stanno in `commonMain` e l'Activity si limita a disegnare.

```kotlin
// commonMain
data class DatiRegistrazione(val email: String, val password: String)

enum class ErroreForm { EMAIL_VUOTA, EMAIL_NON_VALIDA, PASSWORD_CORTA }

data class EsitoValidazione(
    val erroriEmail: List<ErroreForm>,
    val erroriPassword: List<ErroreForm>,
) {
    val valido: Boolean get() = erroriEmail.isEmpty() && erroriPassword.isEmpty()
}

object ValidatoreRegistrazione {
    private val formatoEmail = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

    fun valida(dati: DatiRegistrazione): EsitoValidazione {
        val email = mutableListOf<ErroreForm>()
        if (dati.email.isBlank()) email += ErroreForm.EMAIL_VUOTA
        else if (!formatoEmail.matches(dati.email)) email += ErroreForm.EMAIL_NON_VALIDA
        val password =
            if (dati.password.length < 8) listOf(ErroreForm.PASSWORD_CORTA) else emptyList()
        return EsitoValidazione(email, password)
    }
}
```

```kotlin
// uso minimo da Android: l'unica parte che sa cos'è Android
val esito = ValidatoreRegistrazione.valida(
    DatiRegistrazione(email.text.toString(), password.text.toString()),
)
bottone.isEnabled = esito.valido
testoErroreEmail.text = esito.erroriEmail.joinToString { it.name }
```

**Output atteso.** Con `mario@example.com` e `password123` l'esito è valido: nessun errore, bottone attivo. Con `mario` e `1234` gli elenchi contengono `EMAIL_NON_VALIDA` e `PASSWORD_CORTA`, il bottone resta spento e i messaggi compaiono sotto i rispettivi campi.

#### Debug: ragionare su un errore

Il segnale tipico è un errore di compilazione in `commonMain` che nomina simboli Android. Codice sbagliato:

```kotlin
// commonMain — errore: Context e Log non esistono per iOS
fun salvaPreferito(context: Context, valore: String) {
    Log.d("Preferiti", "salvo $valore")
    context.getSharedPreferences("app", 0).edit().putString("preferito", valore).apply()
}
```

Come ragiona un informatico: `commonMain` è compilato per ogni target, quindi può usare solo la libreria standard e le dipendenze comuni. Se compare `android.content.Context`, il confine è nel posto sbagliato: quella non è logica comune, è **accesso all'archivio della piattaforma**. Tre mosse: capire cosa serve davvero (salvare una stringa), tenere in comune la regola, spostare l'effetto su ogni piattaforma.

```kotlin
// commonMain — la regola resta comune, l'archivio è un'interfaccia
interface ArchivioPreferiti {
    fun salva(chiave: String, valore: String)
}

class GestorePreferiti(private val archivio: ArchivioPreferiti) {
    fun salvaPreferito(valore: String) {
        require(valore.isNotBlank()) { "Il valore non può essere vuoto" }
        archivio.salva("preferito", valore)
    }
}

// androidMain — l'unica parte che conosce Context
class ArchivioPreferitiAndroid(private val context: Context) : ArchivioPreferiti {
    override fun salva(chiave: String, valore: String) {
        context.getSharedPreferences("app", 0).edit().putString(chiave, valore).apply()
    }
}
```

Verifica con un finto `ArchivioPreferiti` in `commonTest`: la logica si prova senza emulatore e il compilatore smette di protestare perché `commonMain` non vede più Android. Se invece manca l'`actual` di una funzione `expect`, l'errore è "expected declaration has no actual": il confine è giusto, l'implementazione su una piattaforma no.

#### Obiettivo -> Come ragionare -> Strumento KMP

| Obiettivo | Come ragionare | Strumento KMP |
| --- | --- | --- |
| Mettere una regola di business in un posto solo | È fatta di dati e condizioni? Allora non ha piattaforma | `commonMain` |
| Usare una API del sistema operativo | Qui serve il sistema: tienilo fuori dal resto e dietro un'interfaccia | `androidMain`, `iosMain` |
| Avere una firma comune e comportamenti diversi | La firma è la promessa, l'implementazione è il dettaglio | `expect` / `actual` |
| Dimostrare che la logica è corretta | La regola non cambia con la piattaforma: un test vale per tutte | `commonTest` con `kotlin.test` |
| Nascondere la fonte dati a UI e test | L'app deve chiedere dati, non sapere se sono in rete o in locale | repository in `commonMain` |
| Aggiungere una piattaforma senza riscrivere tutto | Se il confine è pulito manca solo l'adattatore | nuovo source set + `actual` |

#### Esercizi di ragionamento

Prima del codice scrivi tre righe: cosa è comune, cosa è di piattaforma, quali casi limite vuoi coprire.

1. **Carrello con spese di spedizione.** Spedizione gratis sopra 50 euro, altrimenti 4,90. Decidi cosa va in `commonMain` e cosa cambia tra Android e iOS, definisci input e output (unità, arrotondamenti) e i casi limite prima di scrivere una riga.
2. **Promemoria a un orario locale.** L'utente sceglie un'ora e riceve una notifica. Elenca almeno quattro casi limite (fuso orario, ora già passata, permessi negati, dispositivo spento) e stabilisci quali riguardano la logica comune e quali le API di piattaforma.
3. **Cache dei prodotti.** Un repository scarica un JSON e lo riusa per 10 minuti. Individua il confine tra regola di scadenza (comune) e archivio (piattaforma), definisci l'interfaccia che li separa e i test che scriveresti sul confine, senza implementare nulla.

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

Ogni settimana contiene argomenti con esempi, **errori comuni**, **20 esercizi progressivi su tre livelli**, **varianti** e **progetti** con criteri di verifica.

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

Ogni settimana organizza gli esercizi su tre livelli:

| Livello | Esercizi | Cosa verifica |
| --- | --- | --- |
| Base | 1-7 | sintassi, variabili, input/output, condizioni e cicli |
| Intermedio | 8-14 | funzioni, classi, null safety, collezioni e lambda |
| Avanzato | 15-20 | più concetti insieme, casi limite e piccole funzionalità |

Quando un esercizio ha un output verificabile, il documento mostra cosa deve comparire a schermo: confrontalo prima di dichiararlo finito. Gli esercizi avanzati non hanno una soluzione unica, ma hanno criteri di accettazione espliciti.

I progetti sono la parte più importante. Scegline uno per settimana e portalo a termine:

- nella settimana 1 e 2 restano programmi da console;
- nella settimana 3 introducono stato, repository e dati;
- nella settimana 4 diventano un modulo condiviso usato da un'app Android.

Nella settimana 1 si parte dalle variabili e da un piccolo programma da console.
