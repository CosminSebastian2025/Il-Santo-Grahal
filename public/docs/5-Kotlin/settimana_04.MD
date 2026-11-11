# Settimana 4: Kotlin moderno

Kotlin mette a disposizione strumenti che rendono il codice più espressivo: funzioni che ricevono altre funzioni, operazioni dichiarative sulle collezioni, scope functions, gerarchie chiuse con `sealed` e una gestione degli errori che non passa solo dalle eccezioni.

### Funzioni di ordine superiore

Una funzione è di **ordine superiore** quando accetta una funzione come parametro o ne restituisce una.

```kotlin
fun quadrato(n: Int): Int = n * n

fun applica(x: Int, operazione: (Int) -> Int): Int = operazione(x)

println(applica(5) { it * 2 })    // 10
println(applica(5, ::quadrato))   // 25
```

- `(Int) -> Int` è il tipo di una funzione che riceve un `Int` e restituisce un `Int`.
- `{ it * 2 }` è una lambda passata come ultimo argomento.
- `::quadrato` è un **riferimento a funzione**.

Una funzione può anche restituire una lambda:

```kotlin
fun moltiplicatore(fattore: Int): (Int) -> Int = { numero -> numero * fattore }

val triplo = moltiplicatore(3)
println(triplo(5)) // 15
```

La lambda cattura `fattore`: ogni funzione creata ha il proprio valore.

### Operazioni sulle collezioni

```kotlin
data class Prodotto(val nome: String, val categoria: String, val prezzo: Double, val quantita: Int)

val prodotti = listOf(
    Prodotto("penna", "cancelleria", 1.20, 10),
    Prodotto("quaderno", "cancelleria", 2.50, 5),
    Prodotto("mouse", "informatica", 15.00, 2),
    Prodotto("tastiera", "informatica", 25.00, 1)
)

val nomi = prodotti.map { it.nome }
val economici = prodotti.filter { it.prezzo < 10 }
val totale = prodotti.sumOf { it.prezzo * it.quantita }
val ordinati = prodotti.sortedByDescending { it.prezzo }
val perCategoria = prodotti.groupBy { it.categoria }
val (costosi, altri) = prodotti.partition { it.prezzo >= 10 }
```

| Operazione | Risultato |
| --- | --- |
| `map` | trasforma ogni elemento |
| `filter` | tiene gli elementi che soddisfano la condizione |
| `flatMap` | trasforma e appiattisce le liste |
| `sortedBy` / `sortedByDescending` | ordina per criterio |
| `groupBy` | raggruppa in una mappa |
| `associateBy` | crea una mappa chiave → elemento |
| `partition` | divide in due liste: soddisfatti e non |
| `any` / `all` / `none` | verifica se almeno uno / tutti / nessuno |
| `count` | conta gli elementi che soddisfano la condizione |
| `sumOf` | somma un valore calcolato |
| `distinct` | rimuove i duplicati |
| `take` / `drop` | primi n elementi / tutti tranne i primi n |

Queste operazioni restituiscono nuove collezioni e non modificano l'originale.

### reduce e fold

```kotlin
val numeri = listOf(1, 2, 3, 4, 5)

val somma = numeri.reduce { acc, n -> acc + n }        // 15
val prodotto = numeri.fold(1) { acc, n -> acc * n }    // 120
val testo = numeri.fold("") { acc, n -> "$acc$n" }     // 12345
```

- `reduce` usa il primo elemento come valore iniziale: su una lista vuota lancia un'eccezione.
- `fold` riceve un valore iniziale esplicito e funziona anche con una lista vuota.

`acc` è l'accumulatore, `n` l'elemento corrente. Se la logica diventa complessa, estrai il lambda in una funzione con un nome.

### Scope functions

Cinque funzioni eseguono un blocco su un oggetto. Cambiano due cose: come si accede all'oggetto (`it` o `this`) e che cosa restituiscono.

```kotlin
data class Persona(var nome: String, var citta: String = "")

val persona = Persona("Anna").apply {
    citta = "Roma"
}

val lunghezza = persona.let { it.nome.length }

val descrizione = persona.run { "$nome vive a $citta" }

val messaggio = with(persona) { "$nome ($citta)" }

val sb = StringBuilder().apply {
    append("Ciao")
    append(", mondo")
}

sb.also { println("Debug: $it") }
```

| Funzione | Oggetto | Restituisce | Uso tipico |
| --- | --- | --- | --- |
| `let` | `it` | risultato della lambda | trasformare un valore o gestire un nullable |
| `run` | `this` | risultato della lambda | calcolare qualcosa usando l'oggetto |
| `with` | `this` | risultato della lambda | più operazioni su un oggetto esistente |
| `apply` | `this` | l'oggetto stesso | configurare un oggetto appena creato |
| `also` | `it` | l'oggetto stesso | effetto collaterale, log, controllo |

Non servono tutte sempre. La maggior parte del codice si legge benissimo con `let`, `apply` e `also`.

### sealed class

Una `sealed class` definisce una gerarchia **chiusa**: tutte le sottoclassi sono note al compilatore. Questo rende il `when` esaustivo senza `else`.

```kotlin
sealed class RisultatoOperazione {
    data class Successo(val valore: Int) : RisultatoOperazione()
    data class Errore(val messaggio: String) : RisultatoOperazione()
    data object InCorso : RisultatoOperazione()
}

fun descrivi(r: RisultatoOperazione): String = when (r) {
    is RisultatoOperazione.Successo -> "OK: ${r.valore}"
    is RisultatoOperazione.Errore -> "Errore: ${r.messaggio}"
    RisultatoOperazione.InCorso -> "In corso"
}
```

Se domani aggiungi una sottoclasse, il compilatore segnala tutti i `when` che non la gestiscono. È uno degli strumenti più utili per modellare stati e risultati.

### Gestione degli errori

Le eccezioni restano lo strumento per i casi eccezionali:

```kotlin
fun parseEta(input: String): Int =
    input.toIntOrNull() ?: throw IllegalArgumentException("Età non valida: $input")

fun main() {
    try {
        println(parseEta("20"))
        println(parseEta("abc"))
    } catch (e: IllegalArgumentException) {
        println("Errore: ${e.message}")
    } finally {
        println("Fine")
    }
}
```

`try` è un'espressione:

```kotlin
val eta = try {
    parseEta("20")
} catch (e: IllegalArgumentException) {
    0
}
```

Per gli errori **attesi** (input utente, chiamata di rete) `Result` è spesso più leggibile di un `try`:

```kotlin
val risultato = runCatching { parseEta("abc") }

risultato
    .onSuccess { println("Età: $it") }
    .onFailure { println("Errore: ${it.message}") }

val eta = risultato.getOrElse { 0 }
val forseEta = risultato.getOrNull()
```

`runCatching` cattura qualsiasi eccezione e restituisce `Result<T>`. Non usarlo per nascondere bug di programmazione: serve per i fallimenti previsti.

Un'eccezione personalizzata rende esplicito il dominio:

```kotlin
class SaldoInsufficienteException(val mancante: Double) :
    Exception("Saldo insufficiente: mancano $mancante euro")
```

### Esempio completo: ordini

```kotlin
data class Riga(val nome: String, val prezzo: Double, val quantita: Int)

class Ordine {

    private val righe = mutableListOf<Riga>()

    val totale: Double
        get() = righe.fold(0.0) { acc, riga -> acc + riga.prezzo * riga.quantita }

    fun aggiungi(riga: Riga) {
        require(riga.quantita > 0) { "Quantità non valida" }
        righe.add(riga)
    }
}

sealed class Esito {
    data class Ok(val totale: Double) : Esito()
    data class Rifiutato(val motivo: String) : Esito()
}

fun chiudi(ordine: Ordine, saldo: Double): Esito =
    if (ordine.totale <= saldo) {
        Esito.Ok(ordine.totale)
    } else {
        Esito.Rifiutato("Saldo insufficiente")
    }

fun main() {
    val ordine = Ordine()
    ordine.aggiungi(Riga("penna", 1.20, 10))
    ordine.aggiungi(Riga("quaderno", 2.50, 5))

    when (val esito = chiudi(ordine, 20.0)) {
        is Esito.Ok -> println("Ordine confermato: ${"%.2f".format(esito.totale)} euro")
        is Esito.Rifiutato -> println("Ordine rifiutato: ${esito.motivo}")
    }
}
```

Output atteso:

```text
Ordine rifiutato: Saldo insufficiente
```

### Errori comuni

- **Usare `reduce` su una lista che può essere vuota.** Preferisci `fold` con un valore iniziale.
- **Confondere `apply` e `let`.** `apply` restituisce l'oggetto, `let` restituisce il risultato della lambda.
- **Catturare tutte le eccezioni e non fare nulla.** Un `catch` vuoto nasconde il problema.
- **Usare `Result` per errori di programmazione.** Index out of bounds e bug simili devono emergere.
- **Lambda annidate con `it`.** Il riferimento più interno vince: dai nomi espliciti.
- **Catene di venti operazioni.** Estrai passaggi intermedi con nomi significativi.
- **Dimenticare un ramo in un `when` su sealed.** Il compilatore lo segnala: è un vantaggio, non un fastidio.
- **Trattare `groupBy` come se restituisse liste ordinate.** L'ordine dei gruppi non è garantito.

## Esercizi progressivi

**Esercizio 1.** Scrivi `applica(x: Int, f: (Int) -> Int)` e usala con una lambda e con un riferimento a funzione.

**Esercizio 2.** Scrivi `moltiplicatore(fattore: Int): (Int) -> Int` e crea le funzioni per raddoppiare, triplicare e quadruplicare.

**Esercizio 3.** Da una lista di numeri, produci i quadrati dei soli numeri dispari con `filter` e `map`.

**Esercizio 4.** Calcola la somma con `reduce` e il prodotto con `fold` di una lista di interi.

**Esercizio 5.** Raggruppa una lista di prodotti per categoria con `groupBy` e stampa quante categorie ci sono.

**Esercizio 6.** Dividi una lista di prezzi in `sopra 50` e `sotto 50` con `partition` e stampa le due liste.

**Esercizio 7.** Verifica con `any`, `all` e `none` se in una lista ci sono numeri negativi, se sono tutti pari e se nessuno è zero.

**Esercizio 8.** Crea un oggetto con `apply`, trasformane una proprietà con `let` e calcola una descrizione con `run`.

**Esercizio 9.** Definisci una sealed class `Pagamento` con `Carta`, `Contanti` e `Buono`; scrivi una funzione che descrive ogni caso con `when`.

**Esercizio 10.** Usa `runCatching` per convertire una stringa in intero e stampa il risultato oppure un messaggio con `getOrElse`.

**Esercizio 11.** Crea un'eccezione `QuantitaNonValidaException`, lanciala da una funzione e catturala nel `main`.

**Esercizio 12.** Da una lista di ordini (`categoria`, `importo`), calcola il totale per categoria con `groupBy` e `fold`.

### Varianti

- Rifai l'esercizio 5 usando `associateBy` per indicizzare i prodotti per nome.
- Aggiungi a `Esito` un caso `InAttesa` e verifica che il compilatore ti obblighi ad aggiornare il `when`.
- Sostituisci una catena di `if` di un progetto precedente con una sealed class.

## Progetti della settimana 4

### Progetto 1: Analizzatore di dati

Requisiti:

- una lista di record con categoria e importo (definita nel codice o letta da input);
- totale complessivo, media, massimo e minimo;
- totale e numero di record per categoria con `groupBy`;
- classifica delle categorie per importo decrescente;
- output formattato e nessun crash su lista vuota.

### Progetto 2: Mini sistema di ordini

Requisiti:

- data class `RigaOrdine` e classe `Ordine` con totale calcolato;
- sealed class `EsitoOrdine` con casi `Confermato`, `Rifiutato` e `InAttesa`;
- aggiunta di righe con validazione della quantità;
- chiusura dell'ordine con controllo del saldo o della disponibilità;
- funzione che stampa l'esito con `when` esaustivo.

### Progetto 3: Gioco testuale più strutturato

Requisiti:

- almeno quattro stanze collegate tra loro;
- comandi `vai`, `guarda`, `prendi`, `inventario`, `esci`;
- sealed class per gli esiti dei comandi (`Successo`, `Errore`, `Vittoria`);
- un oggetto da raccogliere e una condizione di vittoria;
- nessun crash con comandi sconosciuti.

### Criteri di verifica

- [ ] Le operazioni sulle collezioni sostituiscono i cicli manuali dove possibile.
- [ ] `reduce` è usato solo su collezioni non vuote; altrimenti c'è `fold`.
- [ ] Le scope functions sono usate con criterio, non a caso.
- [ ] La gerarchia sealed copre tutti i casi e i `when` sono esaustivi.
- [ ] Gli errori attesi sono gestiti con `Result` o con messaggi, non con crash.
- [ ] Le funzioni restano corte e con nomi chiari.

Nelle settimane 5 e 6 il programma impara ad aspettare senza bloccare tutto e a leggere e scrivere dati reali.
