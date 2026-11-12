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

### Come ragionare (e come si applica)

Programmare in Kotlin non significa ricordare parole chiave: significa decidere **cosa entra**, **cosa esce** e **quali casi rompono il programma**; il codice arriva dopo. Null safety, immutabilità e concisione spostano gli errori dal momento in cui l'utente li vede al momento in cui scrivi: il compilatore ti avvisa prima, `val` e `data class` rendono i valori facili da condividere, meno righe significano meno cose da sbagliare.

**Dove si applica.** Cinque contesti concreti, con la stessa domanda di fondo: questo dato può mancare? questo valore deve cambiare?

- **Android**: i dati dell'interfaccia possono mancare (utente non loggato, campo vuoto); la null safety ti obbliga a decidere cosa mostrare prima di disegnare la schermata.
- **Backend con Ktor o Spring Boot**: una richiesta arriva da fuori e non è mai affidabile; tipi non nulli e oggetti immutabili rendono prevedibile cosa cambia tra una richiesta e l'altra.
- **Strumenti da riga di comando**: poche righe eseguite spesso, con input digitato; la concisione ti permette di tenere lo script intero sotto gli occhi.
- **Desktop con Compose**: lo stato cambia a ogni evento; se è immutabile e lo sostituisci con `copy`, l'interfaccia si ridisegna solo quando serve.
- **Multiplatform**: lo stesso dominio gira su JVM, Android, iOS e web; un modulo condiviso senza `null` impliciti evita bug diversi per piattaforma.

**La logica in sei passi.**

1. **Leggi il problema** e riscrivilo con parole tue, in una frase.
2. **Definisci input e output**: cosa ricevi, cosa restituisci, cosa non è mai ammesso.
3. **Risolvi un esempio a mano** con numeri piccoli: quel risultato sarà il primo test.
4. **Scegli tipi e strutture dati**: un valore o una lista? Serve una chiave? Quale campo può mancare?
5. **Scrivi la versione minima** che funziona sull'esempio, senza ottimizzare.
6. **Prova i casi limite** (null, lista vuota, input non valido, valori estremi) e generalizza solo dopo.

**Esempio guidato 1: divisione delle spese tra amici.**

Tre amici hanno pagato spese comuni: servono la quota a testa e il resto lasciato dagli arrotondamenti. Un `data class` descrive la spesa, una `List` le raccoglie, `map` produce le quote senza cicli con indice. Gli importi sono in **centesimi `Int`**, non `Double`, così non compaiono errori di virgola mobile: la divisione intera arrotonda per difetto e il centesimo mancante diventa il "resto", informazione da mostrare e non bug da nascondere.

```kotlin
data class Spesa(val descrizione: String, val centesimi: Int, val partecipanti: Int)
data class Quota(val descrizione: String, val centesimiATesta: Int)
fun euro(centesimi: Int) = "${centesimi / 100}.${(centesimi % 100).toString().padStart(2, '0')} EUR"
fun main() {
    val spese = listOf(Spesa("Pizza", 4250, 3), Spesa("Taxi", 1800, 3), Spesa("Caffè", 600, 3))
    val quote = spese.map { Quota(it.descrizione, it.centesimi / it.partecipanti) }
    quote.forEach { println("${it.descrizione}: ${euro(it.centesimiATesta)} a testa") }
    val totale = spese.sumOf { it.centesimi }
    val perPersona = quote.sumOf { it.centesimiATesta }
    println("Totale speso: ${euro(totale)}")
    println("Quota per persona: ${euro(perPersona)}")
    println("Resto da distribuire: ${euro(totale - perPersona * 3)}")
}
```

```text
Pizza: 14.16 EUR a testa
Taxi: 6.00 EUR a testa
Caffè: 2.00 EUR a testa
Totale speso: 66.50 EUR
Quota per persona: 22.16 EUR
Resto da distribuire: 0.02 EUR
```

**Esempio guidato 2: filtro di attività con stato.**

Data una lista di attività con stato, servono il filtro per stato e una copia in cui tutte risultano completate, con la lista originale intatta. Lo stato è un insieme chiuso, quindi `enum class`; le attività sono immutabili, quindi completare significa produrre un nuovo oggetto con `copy(stato = FATTA)`: chi ha ancora la vecchia lista continua a vedere la verità di prima. `filter` prende una lambda, e una lista vuota attraversa la stessa catena senza casi speciali.

```kotlin
enum class Stato { DA_FARE, IN_CORSO, FATTA }
data class Attivita(val titolo: String, val stato: Stato = Stato.DA_FARE)
fun conStato(attivita: List<Attivita>, stato: Stato) = attivita.filter { it.stato == stato }
fun completa(attivita: Attivita) = if (attivita.stato == Stato.FATTA) attivita else attivita.copy(stato = Stato.FATTA)
fun main() {
    val iniziali = listOf(
        Attivita("Leggere un capitolo"),
        Attivita("Scrivere l'esercizio 3", Stato.IN_CORSO),
        Attivita("Fare la spesa")
    )
    val aggiornate = iniziali.map(::completa)
    println("Iniziali da fare: ${conStato(iniziali, Stato.DA_FARE).size}")
    println("Aggiornate fatte: ${conStato(aggiornate, Stato.FATTA).size}")
    println("Iniziali non toccate: ${iniziali.map { it.titolo }}")
    println("Lista vuota -> fatte: ${conStato(emptyList(), Stato.FATTA).size}")
}
```

```text
Iniziali da fare: 2
Aggiornate fatte: 3
Iniziali non toccate: [Leggere un capitolo, Scrivere l'esercizio 3, Fare la spesa]
Lista vuota -> fatte: 0
```

Con una lista vuota non succede nulla: `filter` restituisce una lista vuota e `map` non invoca mai `completa`, quindi il conteggio è `0` senza eccezioni. Per questo conviene scrivere trasformazioni invece di cicli con indici fissi o accessi al primo elemento.

**Debug: ragionare su un errore.** Un informatico non aggiunge un `try`: legge il tipo e cerca l'assunzione sbagliata.

```kotlin
data class Utente(val nome: String, val email: String?)
fun emailDelPrimo(utenti: List<Utente>): String = utenti.first().email!!.trim()
fun main() {
    val utenti = listOf(Utente("Anna", " anna@example.com "), Utente("Luca", null))
    println(emailDelPrimo(utenti.drop(1)))  // NullPointerException: email è null
    println(emailDelPrimo(emptyList()))     // NoSuchElementException: first() su lista vuota
}
```

1. **Leggi l'eccezione**: tipo, riga, simbolo; la riga è quella con `!!` e `first()`.
2. **Guarda il tipo dichiarato**: `email` è `String?`, quindi il compilatore sapeva che poteva mancare; `!!` gli ha detto "fidati di me" e ha spostato l'errore dal compilatore all'esecuzione.
3. **Chiediti da dove viene il valore**: dal secondo utente, che non ha email; il difetto non è nel `trim`, è nell'assunzione che l'email esista.
4. **Cerca il caso limite**: `first()` pretende almeno un elemento, quindi anche una lista vuota rompe la funzione.

La correzione dichiara l'assenza invece di nasconderla: `firstOrNull()` restituisce `null` se non c'è nulla, `?.` propaga il null, `?:` fornisce l'alternativa.

```kotlin
data class Utente(val nome: String, val email: String?)
fun emailDelPrimo(utenti: List<Utente>): String? = utenti.firstOrNull()?.email?.trim()?.takeIf { it.isNotEmpty() }
fun main() {
    val utenti = listOf(Utente("Anna", " anna@example.com "), Utente("Luca", null))
    println(emailDelPrimo(utenti) ?: "nessuna email")
    println(emailDelPrimo(utenti.drop(1)) ?: "nessuna email")
    println(emailDelPrimo(emptyList()) ?: "lista vuota, nessuna email")
}
```

Stampa `anna@example.com`, poi `nessuna email` e `lista vuota, nessuna email`: i tre scenari, caso limite compreso, ora sono gestiti dal tipo.

**Obiettivo, ragionamento, strumento.**

| Obiettivo | Come ragionare | Strumento Kotlin |
| --- | --- | --- |
| Raggruppare dati che viaggiano insieme | Due valori uguali nei campi devono contare come uguali? Devo derivarne una copia? | `data class` con `equals`, `toString`, `copy` |
| Tenere molti elementi | Serve l'ordine? Serve una chiave univoca? Ci sono duplicati? | `List`, `Set`, `Map` con `map`, `filter`, `groupBy` |
| Decidere tra `val` e `var` | Il valore va riassegnato dopo l'inizializzazione? | `val` di default, `var` solo se serve |
| Trasformare una collezione | Posso descrivere la trasformazione invece del ciclo? | lambda con `map`, `filter`, `sortedBy`, `sumOf` |
| Attendere rete o disco | Chi aspetta? Serve subito il risultato? | `suspend` con `launch` e `async` |

**Esercizi di ragionamento.** Per ognuno scrivi input, output, passi e casi limite prima di aprire l'editor.

- **Parola più lunga.** Input `impara kotlin con esercizi brevi`; output atteso `5 parole, più lunga: esercizi (8)`. Casi limite: frase vuota, una parola sola, pareggio di lunghezza (decidi la regola prima).
- **Spese sopra soglia.** Input tre coppie `(descrizione, centesimi)` con soglia `200`: `Caffè 150`, `Libro 2400`, `Pane 300`; output atteso `1 spesa sopra 200, totale 28.50 EUR`. Casi limite: lista vuota (`0 spese, 0.00 EUR`), soglia uguale a un importo, importo negativo.
- **Attività da completare.** Input 4 attività di cui 1 `FATTA`; output atteso `prima: 1 fatta, dopo: 4 fatte`, con la lista originale ancora a `1 fatta`. Casi limite: lista vuota (`0, 0`), lista già completata. Spiega in due righe perché serve una nuova lista.

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
