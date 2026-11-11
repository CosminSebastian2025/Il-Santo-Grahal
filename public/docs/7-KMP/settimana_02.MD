# Settimana 2: Kotlin idiomatico

Le collezioni, le lambda e le data class cambiano il modo in cui scrivi: meno cicli manuali, più intenzioni dichiarate. Alla fine della settimana sai leggere e modificare una lista di oggetti senza scrivere dieci righe di ciclo.

### List

```kotlin
val numeri = listOf(3, 1, 4, 1, 5)
val nomi = listOf("Anna", "Marco", "Luca")

println(numeri[0])          // 3
println(numeri.first())     // 3
println(numeri.last())      // 5
println(numeri.size)        // 5
println(numeri.contains(4)) // true

val senzaDuplicati = numeri.distinct()          // [3, 1, 4, 5]
val doppi = numeri.map { it * 2 }               // [6, 2, 8, 2, 10]
val maggioriDiDue = numeri.filter { it > 2 }    // [3, 4, 5]
```

Una lista creata con `listOf` è **in sola lettura**: non puoi aggiungere elementi tramite l'interfaccia `List`. Per modificarla serve `mutableListOf`:

```kotlin
val spesa = mutableListOf("pane", "latte")
spesa.add("uova")
spesa.remove("latte")
spesa[0] = "pane integrale"
```

`listOf` restituisce comunque una lista che, se nessuno la modifica, si comporta come immutabile. La distinzione tra `List` e `MutableList` è nel tipo: una funzione che riceve `List` non può aggiungere elementi.

### Set

Un `Set` non ammette duplicati:

```kotlin
val lettere = setOf("a", "b", "a", "c")   // [a, b, c]
val vuoto = mutableSetOf<Int>()

vuoto.add(1)
vuoto.add(1)          // ignorato
println(vuoto.size)   // 1

val pari = setOf(2, 4, 6)
val multipliDiTre = setOf(3, 6, 9)
println(pari intersect multipliDiTre)   // [6]
println(pari union multipliDiTre)       // [2, 4, 6, 3, 9]
println(pari - multipliDiTre)           // [2, 4]
```

Usa un `Set` quando l'appartenenza è il punto, non l'ordine: tag, permessi, id già visti.

### Map

Una `Map` associa chiavi a valori:

```kotlin
val prezzi = mapOf(
    "penna" to 1.20,
    "quaderno" to 2.50,
    "mouse" to 15.00
)

println(prezzi["penna"])                       // 1.2
println(prezzi["tastiera"])                    // null
println(prezzi["tastiera"] ?: 0.0)             // 0.0
println(prezzi.getValue("mouse"))              // 15.0, eccezione se manca

for ((nome, prezzo) in prezzi) {
    println("$nome costa $prezzo")
}

val magazzino = mutableMapOf<String, Int>()
magazzino["penna"] = 50
magazzino["quaderno"] = 30
magazzino.getOrPut("mouse") { 0 }
```

| Operazione | Risultato |
| --- | --- |
| `map["chiave"]` | valore o `null` |
| `map.getValue("chiave")` | valore o eccezione |
| `map.getOrPut("chiave") { default }` | valore esistente o nuovo |
| `map.keys` / `map.values` | chiavi / valori |
| `map.entries` | coppie chiave-valore |
| `map + ("chiave" to valore)` | nuova mappa con l'aggiunta |

Le mappe sono l'archivio naturale per "id → oggetto": ci tornerai nel repository del modulo condiviso.

### Iterare le collezioni

```kotlin
val prodotti = listOf("penna", "quaderno", "mouse")

for (prodotto in prodotti) {
    println(prodotto)
}

for ((indice, prodotto) in prodotti.withIndex()) {
    println("$indice: $prodotto")
}

prodotti.forEach { println(it) }
prodotti.forEachIndexed { indice, prodotto ->
    println("$indice: $prodotto")
}
```

`it` è il nome implicito del singolo parametro di una lambda. Con due parametri serve dichiararli.

### Lambda

Una lambda è una funzione anonima:

```kotlin
val somma: (Int, Int) -> Int = { a, b -> a + b }
val raddoppia: (Int) -> Int = { it * 2 }

println(somma(2, 3))      // 5
println(raddoppia(4))     // 8
```

Quando la lambda è l'ultimo argomento, si può scrivere fuori dalle parentesi:

```kotlin
fun applicaDueVolte(valore: Int, operazione: (Int) -> Int): Int =
    operazione(operazione(valore))

println(applicaDueVolte(3) { it + 10 })   // 23
```

### Funzioni di ordine superiore

Una funzione è di ordine superiore quando riceve o restituisce un'altra funzione:

```kotlin
fun filtraEConverti(
    valori: List<Int>,
    filtro: (Int) -> Boolean,
    trasforma: (Int) -> String
): List<String> = valori.filter(filtro).map(trasforma)

val risultato = filtraEConverti(
    valori = listOf(1, 2, 3, 4, 5),
    filtro = { it % 2 == 0 },
    trasforma = { "numero $it" }
)
```

Questa forma è la base di `map`, `filter`, `sortedBy` e di quasi tutta la programmazione funzionale che userai.

### Operazioni sulle collezioni

```kotlin
data class Prodotto(val nome: String, val categoria: String, val prezzo: Double, val quantita: Int)

val prodotti = listOf(
    Prodotto("penna", "cancelleria", 1.20, 50),
    Prodotto("quaderno", "cancelleria", 2.50, 30),
    Prodotto("mouse", "informatica", 15.00, 8),
    Prodotto("tastiera", "informatica", 25.00, 5)
)

val nomi = prodotti.map { it.nome }
val economici = prodotti.filter { it.prezzo < 10 }
val totale = prodotti.sumOf { it.prezzo * it.quantita }
val ordinati = prodotti.sortedByDescending { it.prezzo }
val perCategoria = prodotti.groupBy { it.categoria }
val (costosi, altri) = prodotti.partition { it.prezzo >= 10 }
val sopraSoglia = prodotti.any { it.quantita < 10 }
val tuttiDisponibili = prodotti.all { it.quantita > 0 }
val primoEconomico = prodotti.find { it.prezzo < 5 }
val nomiUniti = prodotti.map { it.nome }.joinToString(", ")
```

| Operazione | Risultato |
| --- | --- |
| `map` | trasforma ogni elemento |
| `filter` | tiene gli elementi che soddisfano la condizione |
| `flatMap` | trasforma e appiattisce le liste |
| `sortedBy` / `sortedByDescending` | ordina per criterio |
| `sortedWith` | ordina con un comparatore |
| `groupBy` | raggruppa in una mappa |
| `partition` | separa in due liste |
| `associateBy` | crea una mappa chiave → elemento |
| `any` / `all` / `none` | verifica una condizione |
| `find` / `firstOrNull` | primo elemento o `null` |
| `count` | conta gli elementi |
| `sumOf` | somma un valore calcolato |
| `joinToString` | unisce in una stringa |
| `take` / `drop` | primi N / senza primi N |
| `distinct` | elimina duplicati |

`associateBy` è utilissimo per gli id:

```kotlin
val perId = prodotti.associateBy { it.nome }
println(perId["mouse"])
```

### reduce e fold

```kotlin
val numeri = listOf(1, 2, 3, 4)

val somma = numeri.reduce { accumulatore, valore -> accumulatore + valore }  // 10
val sommaConBase = numeri.fold(100) { accumulatore, valore -> accumulatore + valore } // 110
```

`reduce` non ha un valore iniziale e fallisce su lista vuota; `fold` parte da un valore esplicito ed è più sicuro.

### Extension functions

Un'estensione aggiunge una funzione a un tipo esistente senza modificarlo:

```kotlin
fun String.senzaSpazi(): String = replace(" ", "")

fun String.emailValida(): Boolean =
    contains("@") && contains(".") && !contains(" ")

fun List<Prodotto>.valoreMagazzino(): Double =
    sumOf { it.prezzo * it.quantita }

println("anna @ example.com".senzaSpazi())
println("anna@example.com".emailValida())
println(prodotti.valoreMagazzino())
```

- `this` dentro l'estensione è l'oggetto ricevente;
- l'estensione non può accedere ai membri privati;
- se esiste un metodo con la stessa firma, vince il metodo della classe;
- se l'estensione sta in un altro package, va importata.

Le estensioni sono perfette per le regole di validazione che vuoi condividere tra Android e iOS senza creare classi di utilità piene di `static`.

### data class

```kotlin
data class Utente(val id: Int, val nome: String, val email: String, val attivo: Boolean)

val anna = Utente(1, "Anna", "anna@example.com", true)
val annaDisattivata = anna.copy(attivo = false)
val (id, nome, email, attivo) = anna

println(anna)                 // Utente(id=1, nome=Anna, ...)
println(anna == Utente(1, "Anna", "anna@example.com", true)) // true
```

Una `data class` genera automaticamente:

- `toString`, utile nei log;
- `equals` e `hashCode`, basati sui valori;
- `copy`, per creare una variante;
- `componentN`, per la destrutturazione.

Regole pratiche:

- usa `val` per i campi: un oggetto che cambia identità è più difficile da gestire;
- non usare `data class` per entità con stato interno mutabile e comportamento complesso;
- `copy` è la strada giusta per aggiornare un elemento in una lista.

```kotlin
val aggiornati = prodotti.map { p ->
    if (p.nome == "mouse") p.copy(prezzo = 12.90) else p
}
```

Questa riga non modifica la lista originale: ne crea una nuova. È esattamente il modello che userai nello stato condiviso.

### enum class

```kotlin
enum class StatoOrdine {
    NUOVO, PAGATO, SPEDITO, CONSEGNATO, ANNULLATO
}

fun descrivi(stato: StatoOrdine): String = when (stato) {
    StatoOrdine.NUOVO -> "Da pagare"
    StatoOrdine.PAGATO -> "In preparazione"
    StatoOrdine.SPEDITO -> "In viaggio"
    StatoOrdine.CONSEGNATO -> "Consegnato"
    StatoOrdine.ANNULLATO -> "Annullato"
}
```

Con `when` su un enum il compilatore verifica che tutti i casi siano coperti. Gli enum sono ideali per stati finiti, che nella settimana 3 diventeranno `UiState`.

### Esempio completo: utenti e prodotti

```kotlin
data class Prodotto(
    val id: Int,
    val nome: String,
    val categoria: String,
    val prezzo: Double,
    val quantita: Int
)

data class Utente(
    val id: Int,
    val nome: String,
    val email: String,
    val attivo: Boolean
)

fun List<Prodotto>.valoreMagazzino(): Double = sumOf { it.prezzo * it.quantita }

fun String.emailValida(): Boolean =
    contains("@") && contains(".") && !contains(" ")

fun main() {
    val prodotti = listOf(
        Prodotto(1, "Penna", "cancelleria", 1.20, 50),
        Prodotto(2, "Quaderno", "cancelleria", 2.50, 30),
        Prodotto(3, "Mouse", "informatica", 15.00, 8),
        Prodotto(4, "Tastiera", "informatica", 25.00, 5),
        Prodotto(5, "Zaino", "accessori", 35.00, 3)
    )

    val utenti = listOf(
        Utente(1, "Anna", "anna@example.com", true),
        Utente(2, "Marco", "marco.example.com", true),
        Utente(3, "Luca", "luca@example.com", false)
    )

    println("Valore del magazzino: ${prodotti.valoreMagazzino()}")

    prodotti
        .filter { it.quantita < 10 }
        .sortedBy { it.prezzo }
        .forEach { println("Scorta bassa: ${it.nome} (${it.quantita})") }

    prodotti.groupBy { it.categoria }.forEach { (categoria, lista) ->
        println("$categoria: ${lista.size} prodotti, valore ${lista.valoreMagazzino()}")
    }

    val attivi = utenti.filter { it.attivo }
    val emailNonValide = utenti.filterNot { it.email.emailValida() }

    println("Utenti attivi: ${attivi.map { it.nome }.joinToString()}")
    println("Email non valide: ${emailNonValide.map { it.nome }}")
}
```

La stessa logica, senza `println`, è ciò che nella settimana 4 finirà dentro `commonMain` e verrà chiamata da Android e iOS.

### Errori comuni

- **Modificare una lista creata con `listOf`.** Lancia `UnsupportedOperationException`: usa `mutableListOf`.
- **Usare `forEach` per trasformare.** `forEach` non restituisce una lista: usa `map`.
- **Chiamare `first()` su lista vuota.** Lancia un'eccezione: usa `firstOrNull()`.
- **Usare `getValue` con una chiave assente.** Lancia un'eccezione: usa `map[key]` o `?:`.
- **Condividere una `MutableList` tra più parti.** Le modifiche sfuggono al controllo: esponi `List`.
- **Data class con campi `var`.** `copy` e `equals` funzionano, ma lo stato diventa imprevedibile.
- **Estensione con lo stesso nome di un membro.** Il membro vince: rinomina l'estensione.
- **`sortedBy` su valori nullable.** Definisci un criterio con `?:` o `compareBy`.
- **`reduce` su lista vuota.** Usa `fold` con un valore iniziale.
- **Lambda annidate con `it`.** Dichiara i parametri per evitare ambiguità.

## Esercizi progressivi

**Esercizio 1.** Crea una lista di cinque nomi e stampali in maiuscolo con `map`.

**Esercizio 2.** Data una lista di numeri, stampa solo quelli maggiori di 10.

**Esercizio 3.** Data una lista di prodotti, estrai i nomi con `map` e ordinali alfabeticamente.

**Esercizio 4.** Calcola il valore totale di un magazzino con `sumOf`.

**Esercizio 5.** Raggruppa i prodotti per categoria e stampa quanti prodotti ci sono per gruppo.

**Esercizio 6.** Ordina i prodotti per prezzo decrescente e mostra i primi tre.

**Esercizio 7.** Separa i prodotti costosi da quelli economici con `partition` e stampa i due gruppi.

**Esercizio 8.** Data una lista di parole con duplicati, crea un `Set` e stampa quante parole uniche ci sono.

**Esercizio 9.** Crea una mappa nome → prezzo e cerca un prodotto assente con `?:`.

**Esercizio 10.** Aggiorna il prezzo di un prodotto con `copy` senza modificare la lista originale.

**Esercizio 11.** Itera una mappa con destrutturazione e stampa chiave e valore.

**Esercizio 12.** Scrivi un'estensione `List<Int>.media()` che restituisce `Double` e gestisce la lista vuota.

**Esercizio 13.** Scrivi una funzione di ordine superiore `trasformaLista(valori, trasforma)` e usala con due lambda diverse.

**Esercizio 14.** Crea una lista di attività con un campo `completata` e filtra quelle da fare.

### Varianti

- Nell'esercizio 4, calcola anche il valore per categoria con `groupBy` e `sumOf`.
- Nell'esercizio 9, usa `getOrPut` per inserire un prezzo predefinito.
- Nell'esercizio 12, restituisci `0.0` se la lista è vuota.
- Nell'esercizio 14, ordina prima le attività non completate.
- Nell'esempio completo, sostituisci `filterNot` con `filter { !it.email.emailValida() }` e confronta.

## Progetti della settimana 2

### Progetto 1: Gestore di attività da console

Requisiti:

- lista mutabile di `Attivita` con id, titolo e stato;
- menu con elenco, aggiunta, completamento, eliminazione e uscita;
- filtro per "da fare" e "completate";
- conteggio delle attività per stato;
- id generato automaticamente;
- input non valido gestito senza crash;
- funzioni separate per stampa, filtro e ricerca.

### Progetto 2: Programma che legge dati e li filtra

Requisiti:

- legge righe nel formato `nome;categoria;prezzo;quantita`;
- ignora righe vuote e righe malformate con un messaggio;
- costruisce una lista di `Prodotto` con `data class`;
- filtra per prezzo massimo scelto dall'utente;
- raggruppa per categoria e calcola il totale;
- stampa un report ordinato per valore decrescente;
- estensione `List<Prodotto>.valoreTotale()`.

### Progetto 3: Mini sistema utenti e prodotti

Requisiti:

- `data class Utente` con id, nome, email e stato attivo;
- `data class Prodotto` con id, nome, categoria, prezzo e quantità;
- archivio in memoria con `mutableMapOf<Int, Utente>` e `mutableMapOf<Int, Prodotto>`;
- ricerca per id con messaggio se assente;
- filtro utenti attivi e prodotti sotto scorta;
- validazione email con extension function;
- totale del magazzino;
- menu console con almeno cinque operazioni.

### Criteri di verifica

- [ ] Le collezioni in sola lettura sono esposte come `List` o `Map`.
- [ ] Le trasformazioni usano `map`, `filter`, `groupBy` invece di cicli manuali.
- [ ] Le data class usano campi `val` e gli aggiornamenti passano da `copy`.
- [ ] Le estensioni hanno un nome che descrive il risultato.
- [ ] Non ci sono `first()` o `reduce()` su collezioni che possono essere vuote.
- [ ] Gli input malformati vengono segnalati senza crash.
- [ ] Il codice compila senza warning su variabili inutilizzate.

Nella settimana 3 questi oggetti diventano il modello di un'app: stato, eventi, repository e dati che arrivano da un'API.
