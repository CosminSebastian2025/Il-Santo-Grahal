# Settimana 1: basi

In questa settimana scrivi i primi programmi, impari a conservare valori nelle variabili e a far prendere decisioni al programma. Tutto avviene da console: testo in ingresso, testo in uscita.

### Installare Kotlin o usare il Playground

Per iniziare senza installare nulla apri [play.kotlinlang.org](https://play.kotlinlang.org/) e scrivi il codice nel riquadro a sinistra. Il Playground non legge l'input da tastiera: per i programmi con `readln()` serve IntelliJ IDEA o il terminale.

In locale servono un **JDK 21** e **IntelliJ IDEA Community**. Il compilatore da terminale è `kotlinc`:

```bash
kotlinc -version
```

### Il primo programma

```kotlin
fun main() {
    println("Ciao, mondo!")
}
```

- `fun` dichiara una funzione.
- `main` è il punto di ingresso: da lì parte il programma.
- `println` stampa una riga e va a capo; `print` stampa senza andare a capo.
- Le parentesi graffe delimitano il corpo della funzione.

I commenti si scrivono con `//` su una riga o con `/* ... */` su più righe.

### val e var

```kotlin
val nome = "Anna"      // non può essere riassegnata
var eta = 25           // può cambiare

eta = 26
println("$nome ha $eta anni")
```

- `val` dichiara un valore **immutabile**: il riferimento non può puntare a un altro valore.
- `var` dichiara una variabile **mutabile**.
- Kotlin deduce il tipo dal valore iniziale (**type inference**), ma puoi dichiararlo:

```kotlin
val prezzo: Double = 19.90
var tentativi: Int = 0
```

La regola pratica: parti sempre da `val`, passa a `var` solo se il valore deve cambiare. Meno variabili mutabili ci sono, meno bug si nascondono.

### Tipi base

| Tipo | Esempio | Uso |
| --- | --- | --- |
| `Int` | `42` | interi |
| `Long` | `42L` | interi grandi |
| `Double` | `3.14` | decimali (predefinito) |
| `Float` | `3.14f` | decimali a precisione singola |
| `Boolean` | `true`, `false` | vero o falso |
| `Char` | `'a'` | un singolo carattere |
| `String` | `"ciao"` | testo |
| `Unit` | — | assenza di valore (come `void` in Java) |

I numeri possono contenere underscore per leggibilità: `1_000_000`. Le conversioni esplicite usano metodi:

```kotlin
val intero = 42
val decimale = intero.toDouble()   // 42.0
val testo = intero.toString()      // "42"
```

Kotlin non converte i tipi numerici automaticamente: `val x: Long = 42` funziona perché `42` è una costante, ma assegnare un `Int` a un `Long` richiede `toLong()`.

### Stringhe

```kotlin
val nome = "Anna"
val saluto = "Ciao, $nome!"
val lunghezza = "Ciao, ${nome.uppercase()}!".length

println(saluto)       // Ciao, Anna!
println(lunghezza)    // 12
```

Con `$nome` inserisci una variabile; con `${...}` inserisci un'espressione. Le graffe servono quando dopo la variabile c'è altro testo o quando l'espressione è più complessa.

Le stringhe sono **immutabili**: ogni metodo restituisce una nuova stringa.

| Metodo | Risultato |
| --- | --- |
| `length` | numero di caratteri |
| `uppercase()` / `lowercase()` | maiuscole / minuscole |
| `trim()` | rimuove spazi ai lati |
| `contains("na")` | vero se contiene il testo |
| `startsWith("An")` / `endsWith("na")` | controllo inizio / fine |
| `substring(0, 2)` | caratteri dall'indice 0 incluso al 2 escluso |
| `replace("a", "o")` | sostituisce |
| `split(" ")` | divide in una lista |
| `"42".toInt()` | converte in intero |
| `"3.5".toDouble()` | converte in decimale |

Le stringhe multilinea usano tre virgolette:

```kotlin
val testo = """
    Riga uno
    Riga due
""".trimIndent()
```

`trimIndent()` toglie l'indentazione comune, utile per non stampare spazi inutili.

### Numeri

```kotlin
val a = 7
val b = 2

println(a / b)        // 3: divisione intera
println(a / 2.0)      // 3.5: almeno un Double
println(a % b)        // 1: resto
println(a.toDouble() / b)
```

Per formattare un decimale con due cifre:

```kotlin
val totale = 19.9
println("%.2f".format(totale)) // 19,90 in italiano, 19.90 in inglese
```

La formattazione dipende dalla lingua del sistema: per gli esercizi va bene. Se ti serve il punto come separatore, usa `String.format(Locale.US, "%.2f", totale)`.

Attenzione alla divisione per zero: con i `Double` produce `Infinity` o `NaN`, con gli `Int` lancia `ArithmeticException`.

### Leggere l'input

```kotlin
print("Come ti chiami? ")
val nome = readln()

print("Quanti anni hai? ")
val eta = readln().toIntOrNull()

if (eta == null) {
    println("Età non valida")
} else {
    println("Ciao $nome, hai $eta anni")
}
```

- `readln()` restituisce una `String` e lancia un'eccezione se l'input è chiuso.
- `readlnOrNull()` restituisce `null` in quel caso.
- `toIntOrNull()` e `toDoubleOrNull()` evitano il crash su input non numerico.

Un programma che non va in crash quando l'utente sbaglia è già un buon programma.

### Condizioni

`if` è un'espressione: restituisce un valore.

```kotlin
val eta = 20
val stato = if (eta >= 18) "maggiorenne" else "minorenne"
println(stato)
```

| Operatore | Significato |
| --- | --- |
| `==` | uguale (confronta il contenuto) |
| `!=` | diverso |
| `>` `<` `>=` `<=` | confronti |
| `&&` | AND logico |
| `\|\|` | OR logico |
| `!` | NOT |

`==` confronta il contenuto; `===` confronta i riferimenti e quasi non serve.

Quando le alternative sono più di due, `when` è più leggibile di una catena di `else if`:

```kotlin
val voto = 27

val giudizio = when {
    voto >= 30 -> "Ottimo"
    voto >= 26 -> "Distinto"
    voto >= 22 -> "Buono"
    voto >= 18 -> "Sufficiente"
    else -> "Insufficiente"
}
println(giudizio)
```

Con un soggetto:

```kotlin
val giorno = 6

val tipo = when (giorno) {
    6, 7 -> "fine settimana"
    in 1..5 -> "giorno feriale"
    else -> "giorno non valido"
}
```

`when` usato come espressione deve essere **esaustivo**: serve un ramo `else`, oppure tutti i casi possibili.

### Cicli

```kotlin
for (i in 1..5) {
    print("$i ")
}
println()

for (i in 5 downTo 1) {
    print("$i ")
}
println()

for (i in 1 until 5) {      // 1, 2, 3, 4
    print("$i ")
}
println()

for (i in 1..10 step 2) {   // 1, 3, 5, 7, 9
    print("$i ")
}
println()

repeat(3) {
    println("ripetizione")
}
```

- `1..5` include entrambi gli estremi.
- `until` esclude l'estremo finale.
- `downTo` conta all'indietro.
- `step` cambia il passo.

`while` ripete finché la condizione è vera; `do-while` esegue almeno una volta:

```kotlin
var tentativi = 0
while (tentativi < 3) {
    println("Tentativo ${tentativi + 1}")
    tentativi++
}

var scelta: String
do {
    print("Scrivi 'esci' per terminare: ")
    scelta = readln()
} while (scelta != "esci")
```

`break` interrompe il ciclo, `continue` salta al giro successivo.

### Esempio completo: scontrino

```kotlin
const val IVA = 0.22

fun main() {
    print("Nome prodotto: ")
    val nome = readln()

    print("Prezzo unitario: ")
    val prezzo = readln().toDoubleOrNull() ?: 0.0

    print("Quantità: ")
    val quantita = readln().toIntOrNull() ?: 0

    val imponibile = prezzo * quantita
    val totale = imponibile * (1 + IVA)

    println("--- Scontrino ---")
    println("$nome x$quantita")
    println("Imponibile: ${"%.2f".format(imponibile)} euro")
    println("Totale:     ${"%.2f".format(totale)} euro")
}
```

`?:` è l'operatore **Elvis**: se il valore a sinistra è `null`, usa quello a destra. Qui evita il crash quando l'input non è un numero.

### Errori comuni

- **Riassegnare una `val`.** Il compilatore segnala "Val cannot be reassigned": usa `var` solo se serve davvero.
- **Dimenticare le graffe nel template.** `"$nome.length"` stampa il nome seguito da `.length`: scrivi `"${nome.length}"`.
- **Usare `=` invece di `==`.** In Kotlin `=` assegna, `==` confronta; dentro un `if` l'assegnazione non è un'espressione valida e il compilatore ti avvisa.
- **Fare `toInt()` su un input libero.** Se l'utente scrive "abc" il programma termina con un'eccezione: usa `toIntOrNull()`.
- **Divisione intera inattesa.** `7 / 2` vale `3`: converti almeno un operando a `Double`.
- **Confrontare stringhe con `===`.** Per il contenuto serve `==`.
- **Dimenticare `else` in un `when` espressione.** Il compilatore segnala che il `when` non è esaustivo.

## Esercizi progressivi

**Esercizio 1.** Dichiara `val nome` e `var eta`, stampa una frase con il template e poi incrementa l'età di uno.

**Esercizio 2.** Leggi base e altezza di un rettangolo e stampa area e perimetro con due decimali.

**Esercizio 3.** Converti una temperatura da Celsius a Fahrenheit con la formula `F = C * 9 / 5 + 32` e stampa il risultato con un decimale.

Output atteso (esempio con `20`):

```text
20.0 C = 68.0 F
```

**Esercizio 4.** Leggi un numero intero e stampa `Pari` o `Dispari` usando un `if` espressione.

**Esercizio 5.** Leggi tre numeri e stampa il maggiore. Gestisci anche il caso di valori uguali.

**Esercizio 6.** Leggi un voto da 0 a 30 e stampa il giudizio con `when`: da 30 `Ottimo`, da 26 `Distinto`, da 22 `Buono`, da 18 `Sufficiente`, sotto 18 `Insufficiente`.

**Esercizio 7.** Leggi un numero e stampa la sua tabellina da 1 a 10 con un `for`.

**Esercizio 8.** Calcola la somma dei numeri da 1 a 100 e la media, usando un ciclo.

**Esercizio 9.** Stampa un conto alla rovescia da 10 a 1 con `downTo`, poi la scritta `Via!`.

**Esercizio 10.** Stampa i numeri da 1 a 30, sostituendo i multipli di 3 con `Fizz`, i multipli di 5 con `Buzz` e i multipli di entrambi con `FizzBuzz`.

**Esercizio 11.** Leggi una parola e conta quante vocali contiene, scorrendo i caratteri con un `for`.

**Esercizio 12.** Indovina un numero: il programma estrae un numero casuale da 1 a 100 e chiede all'utente di indovinarlo, dicendo se è troppo alto o troppo basso. Continua finché l'utente non indovina.

### Varianti

- Rifai l'esercizio 4 con `when` e l'esercizio 6 con `if`/`else if`: confronta la leggibilità.
- Nell'esercizio 8, chiedi all'utente il limite superiore e gestisci un input non valido senza crash.
- Nell'esercizio 12, limita i tentativi a 7 e mostra il numero segreto quando finiscono.

## Progetti della settimana 1

### Progetto 1: Calcolatrice semplice da console

Requisiti:

- legge due numeri e un operatore (`+`, `-`, `*`, `/`);
- usa `when` per scegliere l'operazione;
- gestisce divisione per zero e operatore sconosciuto con un messaggio chiaro;
- usa `toDoubleOrNull()` per gli input;
- alla fine chiede se eseguire un altro calcolo (`s`/`n`).

### Progetto 2: Convertitore Celsius-Fahrenheit

Requisiti:

- menu con due scelte: da Celsius a Fahrenheit e viceversa;
- formule corrette, con `9 / 5.0` per evitare la divisione intera;
- risultato formattato con un decimale;
- input non valido gestito con un messaggio;
- il programma si ripete finché l'utente non sceglie di uscire.

### Progetto 3: Gioco indovina un numero

Requisiti:

- numero segreto casuale da 1 a 100 con `Random.nextInt(1, 101)`;
- feedback `Troppo basso` o `Troppo alto`;
- conteggio dei tentativi;
- massimo 7 tentativi, con rivelazione del numero alla fine;
- possibilità di giocare una nuova partita.

### Criteri di verifica

- [ ] Il programma compila senza errori.
- [ ] Gli input non validi producono un messaggio, non un'eccezione.
- [ ] Le variabili che non cambiano sono dichiarate con `val`.
- [ ] Le stringhe usano i template invece della concatenazione con `+`.
- [ ] I menu si ripetono finché l'utente non esce.
- [ ] Non ci sono cicli infiniti nei casi normali.

Nella settimana 2 le funzioni dividono il codice in pezzi riutilizzabili e le collezioni permettono di gestire più dati insieme.
