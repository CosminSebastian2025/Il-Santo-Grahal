# Settimana 1: Kotlin base

Si parte da zero: un programma che stampa, legge l'input e prende decisioni. Alla fine della settimana sai scrivere piccoli programmi da console senza aiuto e sai già leggere il codice che userai nel modulo condiviso.

### Primo programma

```kotlin
fun main() {
    println("Ciao, mondo!")
}
```

- `fun main()` è il punto di ingresso.
- `println` stampa una riga.
- `readln()` legge una riga di testo da tastiera.
- Il codice sta in un file `.kt`, per esempio `Main.kt`.

Con il compilatore:

```bash
kotlinc Main.kt -include-runtime -d main.jar
java -jar main.jar
```

Oppure esegui direttamente da IntelliJ o dal Playground. Nel Playground `readln()` non funziona: gli esercizi con input vanno eseguiti in locale.

### val e var

```kotlin
val nome = "Anna"      // non riassegnabile
var visite = 0         // riassegnabile
visite = visite + 1
```

- `val` è la scelta predefinita: il valore non cambia.
- `var` serve solo quando il valore deve cambiare.
- Il tipo si deduce dal valore, ma può essere dichiarato: `val eta: Int = 30`.

Usare `val` quasi sempre è una regola pratica: meno stato mutabile significa meno bug, soprattutto quando il codice verrà condiviso tra piattaforme.

### Tipi di dato

| Tipo | Esempio | Uso |
| --- | --- | --- |
| `String` | `"ciao"` | testo |
| `Int` | `42` | interi |
| `Long` | `42L` | interi grandi |
| `Double` | `3.14` | decimali |
| `Float` | `3.14f` | decimali a precisione singola |
| `Boolean` | `true` | vero/falso |
| `Char` | `'A'` | singolo carattere |

```kotlin
val quanti: Int = 3
val prezzo: Double = 4.50
val totale = quanti * prezzo          // Double: 13.5
val testo = totale.toString()          // "13.5"
val intero = "12".toInt()              // 12
val numero = "12.5".toDoubleOrNull()   // 12.5
val nonValido = "abc".toIntOrNull()    // null
```

In Kotlin non c'è conversione implicita tra numeri: `1 + 2.0` non compila, devi scrivere `1.0 + 2.0` o convertire esplicitamente. La divisione tra interi restituisce un intero: `5 / 2` vale `2`.

### Stringhe

```kotlin
val nome = "Marco"
val messaggio = "Ciao, $nome! Hai ${nome.length} lettere."
val maiuscolo = nome.uppercase()
val contiene = nome.contains("ar")
val pulito = "  testo  ".trim()
val parti = "a,b,c".split(",")
val ripetuto = "-".repeat(10)
```

Le stringhe multilinea usano tre virgolette:

```kotlin
val testo = """
    Riga uno
    Riga due
""".trimIndent()
```

`trimIndent()` toglie l'indentazione comune: è comodo per i menu da console.

### Funzioni

```kotlin
fun somma(a: Int, b: Int): Int {
    return a + b
}

fun sommaBreve(a: Int, b: Int): Int = a + b

fun saluta(nome: String, saluto: String = "Ciao"): String = "$saluto, $nome!"

println(saluta("Anna"))                    // Ciao, Anna!
println(saluta("Anna", saluto = "Buongiorno")) // Buongiorno, Anna!
```

- i parametri hanno sempre il tipo;
- il valore di ritorno si dichiara dopo i due punti;
- una funzione che non restituisce nulla ha tipo `Unit`;
- i parametri con default si possono omettere;
- gli argomenti si possono passare per nome.

Una funzione dovrebbe fare una cosa sola e avere un nome che la descrive. `calcolaTotale` è meglio di `fai`.

### if e when

```kotlin
fun descriviEta(eta: Int): String {
    return if (eta < 18) {
        "Minorenne"
    } else if (eta < 65) {
        "Adulto"
    } else {
        "Senior"
    }
}

fun descriviVoto(voto: Int): String = when {
    voto < 18 -> "Insufficiente"
    voto < 24 -> "Sufficiente"
    voto < 28 -> "Buono"
    else -> "Ottimo"
}
```

`if` e `when` sono **espressioni**: restituiscono un valore. `when` con soggetto:

```kotlin
fun giornoLavorativo(giorno: Int): Boolean = when (giorno) {
    1, 2, 3, 4, 5 -> true
    6, 7 -> false
    else -> throw IllegalArgumentException("Giorno non valido: $giorno")
}
```

Altri esempi:

```kotlin
val categoria = when (eta) {
    in 0..12 -> "bambino"
    in 13..17 -> "ragazzo"
    in 18..64 -> "adulto"
    else -> "senior"
}
```

### for e while

```kotlin
for (i in 1..5) print("$i ")          // 1 2 3 4 5
for (i in 1 until 5) print("$i ")     // 1 2 3 4
for (i in 10 downTo 1 step 2) print("$i ") // 10 8 6 4 2
for (indice in lista.indices) { }     // da 0 a lista.size - 1

var tentativi = 0
while (tentativi < 3) {
    tentativi++
}

do {
    val riga = readln()
} while (riga.isNotEmpty())

repeat(3) { indice ->
    println("Ripetizione $indice")
}
```

`break` esce dal ciclo, `continue` salta al giro successivo. `1..5` include il 5, `1 until 5` no: l'errore di un elemento è dietro l'angolo.

### Classi e oggetti

```kotlin
class Studente(val nome: String, val eta: Int) {
    val maggiorenne: Boolean
        get() = eta >= 18

    fun presentati(): String = "Sono $nome, ho $eta anni"

    companion object {
        fun daRiga(riga: String): Studente {
            val parti = riga.split(",")
            return Studente(parti[0].trim(), parti[1].trim().toInt())
        }
    }
}

val anna = Studente("Anna", 20)
println(anna.presentati())
println(anna.maggiorenne)
val marco = Studente.daRiga("Marco, 17")
```

- il costruttore primario sta nella dichiarazione della classe;
- `val`/`var` davanti al parametro creano una proprietà;
- senza `val`/`var` il parametro è disponibile solo nell'`init` e nelle proprietà inizializzate;
- `companion object` contiene funzioni legate alla classe, come un factory;
- `object` crea un singleton:

```kotlin
object Configurazione {
    const val NOME_APP = "ProgettoKMP"
    const val VERSIONE = 1
}
```

### Proprietà e metodi

```kotlin
class ContoBancario(val intestatario: String, saldoIniziale: Double = 0.0) {
    var saldo: Double = saldoIniziale
        private set

    fun versa(importo: Double) {
        require(importo > 0) { "L'importo deve essere positivo" }
        saldo += importo
    }

    fun preleva(importo: Double): Boolean {
        if (importo <= 0 || importo > saldo) return false
        saldo -= importo
        return true
    }
}
```

- `private set` permette di leggere `saldo` da fuori ma non di scriverlo: le modifiche passano dai metodi.
- `require` lancia un'eccezione se la condizione è falsa.
- Le proprietà calcolate con `get()` non occupano memoria: si calcolano al momento della lettura.

### Null safety

Kotlin distingue i tipi che possono essere `null` da quelli che non possono:

```kotlin
var nome: String = "Anna"
// nome = null  // errore di compilazione

var secondoNome: String? = null   // può essere null

println(secondoNome?.length)              // null
println(secondoNome?.length ?: 0)         // 0
secondoNome?.let { println("Ciao $it") }  // esegue solo se non è null

val lunghezza = secondoNome!!.length      // crash se è null: evitare
```

| Operatore | Significato |
| --- | --- |
| `T?` | valore che può essere null |
| `?.` | chiama solo se non è null |
| `?:` | valore di riserva se è null |
| `!!` | forza il valore, crash se null |
| `?.let { }` | esegue un blocco solo se non è null |
| `as?` | conversione che restituisce null se fallisce |
| `lateinit` | inizializzazione successiva, solo per `var` non nullable |

```kotlin
val input: Any = "42"
val numero = input as? Int          // null, non è un Int

lateinit var repository: String
// println(repository)               // errore a runtime se non inizializzata
repository = "pronto"
```

Regola: usa `!!` solo quando sei assolutamente certo che il valore non sia null, meglio se dopo un controllo esplicito. Nella maggior parte dei casi `?.`, `?:` e `let` fanno il lavoro senza rischi.

### Esempio completo: calcolatrice testuale

```kotlin
fun main() {
    println("Calcolatrice — operazioni: + - * /, q per uscire")

    while (true) {
        print("Operazione: ")
        val operazione = readln().trim().lowercase()

        if (operazione == "q") break

        if (operazione !in listOf("+", "-", "*", "/")) {
            println("Operazione non valida")
            continue
        }

        val primo = leggiNumero("Primo numero: ") ?: continue
        val secondo = leggiNumero("Secondo numero: ") ?: continue

        when (operazione) {
            "+" -> println("Risultato: ${primo + secondo}")
            "-" -> println("Risultato: ${primo - secondo}")
            "*" -> println("Risultato: ${primo * secondo}")
            "/" -> {
                if (secondo == 0.0) {
                    println("Errore: divisione per zero")
                } else {
                    println("Risultato: ${primo / secondo}")
                }
            }
        }
    }

    println("Arrivederci")
}

fun leggiNumero(messaggio: String): Double? {
    print(messaggio)
    val testo = readln().trim().replace(',', '.')
    val numero = testo.toDoubleOrNull()

    if (numero == null) {
        println("Numero non valido")
    }

    return numero
}
```

`leggiNumero` restituisce `Double?`: `null` segnala un input non valido e il chiamante decide di saltare il giro con `?: continue`.

### Errori comuni

- **Usare `var` per tutto.** Preferisci `val`: meno stato mutabile, meno bug.
- **Divisione tra interi.** `5 / 2` vale `2`, non `2.5`: converti in `Double`.
- **`toInt()` su input non valido.** Lancia un'eccezione: usa `toIntOrNull()`.
- **`!!` usato per comodità.** Trasforma un errore di compilazione in un crash a runtime.
- **Dimenticare `return` in una funzione a blocco.** La funzione restituisce `Unit` e il compilatore segnala il tipo sbagliato.
- **`when` non esaustivo.** Su espressioni senza `else` il compilatore pretende tutti i casi.
- **`..` invece di `until`.** `1..5` include il 5, `1 until 5` no.
- **Non fare `trim()` sull'input.** Gli spazi invisibili rompono i confronti.
- **Riassegnare una `val`.** Errore di compilazione: cambia la dichiarazione in `var` solo se serve davvero.
- **Confondere `==` e `===`.** `==` confronta i valori, `===` l'identità dell'oggetto.

## Esercizi progressivi

**Esercizio 1.** Stampa il tuo nome e la tua età con una stringa template.

**Esercizio 2.** Leggi due numeri e stampa somma, differenza, prodotto e quoziente. Con `8` e `3` l'output deve essere:

```text
Somma: 11
Differenza: 5
Prodotto: 24
Quoziente: 2.67
```

Il quoziente è decimale: converti almeno un operando in `Double` e formatta con due cifre.

**Esercizio 3.** Chiedi un numero e stampa se è pari o dispari. Con `7` stampa `7 è dispari`; con `10` stampa `10 è pari`.

**Esercizio 4.** Chiedi un voto da 0 a 30 e descrivilo con `when`: insufficiente sotto 18, sufficiente fino a 23, buono fino a 27, ottimo da 28. Un voto fuori intervallo deve produrre un messaggio, non un crash.

**Esercizio 5.** Chiedi un numero da 1 a 7 e stampa il giorno della settimana; gestisci il valore fuori intervallo. Con `0` stampa `Giorno non valido: 0`.

**Esercizio 6.** Calcola la somma dei numeri da 1 a 100 con un ciclo `for`. L'output deve essere `Somma: 5050`.

**Esercizio 7.** Stampa la tabellina di un numero scelto dall'utente. Con `5` l'output inizia così:

```text
5 x 1 = 5
5 x 2 = 10
5 x 3 = 15
...
5 x 10 = 50
```

**Esercizio 8.** Scrivi una funzione `massimo(a, b, c)` che restituisce il maggiore. Verificala con `massimo(3, 9, 4)` → `9` e con tre valori uguali.

**Esercizio 9.** Scrivi una funzione `saluta(nome, saluto = "Ciao")` e prova le due forme di chiamata. `saluta("Anna")` deve restituire `Ciao, Anna!`; `saluta("Anna", saluto = "Buongiorno")` deve restituire `Buongiorno, Anna!`.

**Esercizio 10.** Crea una classe `Persona` con nome ed età, un metodo `presentati()` e una proprietà calcolata `maggiorenne`. Con `Persona("Marco", 17)` la proprietà deve valere `false`.

**Esercizio 11.** Crea una classe `ContoBancario` con `saldo` in sola lettura, `versa` e `preleva`; rifiuta importi negativi e prelievi superiori al saldo. Dopo `versa(50.0)` e `preleva(20.0)` il saldo deve essere `30.0`; un prelievo di `100.0` deve restituire `false` e lasciare il saldo invariato.

**Esercizio 12.** Chiedi un nome e stampalo solo se non è vuoto, usando una variabile nullable e l'operatore `?.`. Con input vuoto non deve comparire nessuna riga oltre al messaggio iniziale.

**Esercizio 13.** Scrivi una funzione `dividi(a, b)` che restituisce `Double?`: `null` se `b` è zero. `dividi(7.0, 2.0)` vale `3.5`; `dividi(1.0, 0.0)` vale `null` e il chiamante deve stampare `Divisione non possibile`.

**Esercizio 14.** Estendi la calcolatrice: conta quante operazioni sono state eseguite e mostra il totale quando l'utente esce. Dopo tre operazioni valide l'output finale deve essere `Operazioni eseguite: 3`.

### Consolidamento (livello avanzato)

**Esercizio 15.** Scrivi `validaPassword(password: String): String?` che restituisce il primo errore trovato o `null` se la password è valida. Regole: almeno 8 caratteri, almeno una maiuscola, almeno un numero. Con `"ciao"` deve restituire `Almeno 8 caratteri`; con `"CiaoMondo"` deve restituire `Manca un numero`; con `"CiaoMondo1"` deve restituire `null`.

**Esercizio 16.** Leggi una riga nel formato `nome;età;città` e stampa una scheda. Se mancano campi o l'età non è numerica, stampa un errore e non interrompere il programma. Con `Anna;20;Roma` l'output deve essere:

```text
Nome: Anna
Età: 20
Città: Roma
Categoria: adulto
```

**Esercizio 17.** Convertitore di temperature con menu: Celsius, Fahrenheit, Kelvin. Rifiuta valori sotto lo zero assoluto e accetta sia la virgola sia il punto. Con `100` in Celsius l'output deve includere `212.0 °F` e `373.15 K`.

**Esercizio 18.** Indovina il numero: numero casuale da 1 a 100, massimo sette tentativi, suggerimenti "più alto" e "più basso", possibilità di rigiocare. Alla fine mostra il numero segreto se i tentativi finiscono.

**Esercizio 19.** Estendi `ContoBancario` con `ultimaOperazione: String?` e un metodo `riepilogo()` che restituisce saldo e ultima operazione, oppure `Nessuna operazione` se non ce ne sono. Verifica il caso senza operazioni e quello dopo un prelievo rifiutato.

**Esercizio 20.** Rifattorizza la calcolatrice in tre funzioni: `leggiOperazione()`, `leggiNumero(messaggio)` e `calcola(operazione, primo, secondo): Double?`. `calcola` restituisce `null` per divisione per zero e per operazione sconosciuta; il `main` decide solo cosa stampare. A fine sessione mostra operazioni eseguite ed errori conteggiati.

### Varianti

- Nella calcolatrice, accetta anche `x` come moltiplicazione e `:` come divisione.
- Nel convertitore di temperature, accetta sia la virgola sia il punto come separatore decimale.
- Nell'esercizio 6, calcola la somma solo dei numeri pari.
- Nella classe `ContoBancario`, aggiungi un limite di prelievo giornaliero.
- Nell'esercizio 14, mostra anche l'operazione con il risultato più alto.

## Progetti della settimana 1

### Progetto 1: Calcolatrice testuale

Requisiti:

- ciclo principale con uscita tramite `q`;
- operazioni `+`, `-`, `*`, `/`;
- input non numerico gestito senza crash;
- divisione per zero gestita con messaggio;
- accetta la virgola decimale;
- conteggio delle operazioni eseguite;
- funzioni separate per lettura input e calcolo.

### Progetto 2: Convertitore di temperature

Requisiti:

- menu per scegliere Celsius, Fahrenheit o Kelvin;
- conversione verso le altre due scale;
- rifiuto di valori sotto lo zero assoluto;
- input con virgola o punto;
- ciclo per eseguire più conversioni;
- messaggi chiari per input non valido;
- almeno una funzione per ogni conversione.

### Progetto 3: Indovina il numero

Requisiti:

- numero casuale da 1 a 100 generato con `Random`;
- ciclo di tentativi con conteggio;
- suggerimento "più alto" o "più basso";
- limite massimo di tentativi o messaggio finale con il numero;
- possibilità di rigiocare senza riavviare il programma;
- input non numerico gestito;
- messaggio personalizzato in base al numero di tentativi.

### Criteri di verifica

- [ ] Il programma si avvia e termina senza crash con input validi.
- [ ] Gli input non validi producono un messaggio, non un'eccezione.
- [ ] Le variabili che non cambiano sono `val`.
- [ ] Le funzioni hanno nomi chiari e una sola responsabilità.
- [ ] I cicli hanno una condizione di uscita raggiungibile.
- [ ] Non ci sono `!!` senza una motivazione.
- [ ] Il codice compila senza warning su variabili inutilizzate.

Nella settimana 2 le collezioni e le lambda rendono i programmi più espressivi e meno ripetitivi.
