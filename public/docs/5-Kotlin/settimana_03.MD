# Settimana 3: oggetti e null safety

Le funzioni organizzano le azioni; le **classi** organizzano i dati e le azioni che li riguardano. In questa settimana impari a modellare un dominio con oggetti, data class, enum e a gestire i valori che possono mancare senza far crashare il programma.

### Classi e oggetti

```kotlin
class Studente(val nome: String, var voto: Int) {

    init {
        require(voto in 0..30) { "Voto non valido: $voto" }
    }

    fun promosso(): Boolean = voto >= 18

    override fun toString(): String = "Studente(nome=$nome, voto=$voto)"
}

fun main() {
    val anna = Studente("Anna", 27)
    println(anna.nome)
    println(anna.promosso())
    println(anna)
}
```

- `class` definisce il tipo; `Studente("Anna", 27)` crea un'istanza con `new` implicito.
- I parametri del **costruttore primario** con `val` o `var` diventano proprietà.
- Il blocco `init` esegue controlli o inizializzazioni alla creazione.
- `require` lancia `IllegalArgumentException` se la condizione è falsa: è il modo standard per impedire oggetti non validi.

Se scrivi `class Studente(nome: String)` senza `val`/`var`, `nome` è solo un parametro del costruttore e non una proprietà accessibile dall'esterno.

### Proprietà e metodi

Una proprietà può avere un getter calcolato:

```kotlin
class Rettangolo(val base: Double, val altezza: Double) {

    val area: Double
        get() = base * altezza

    val perimetro: Double
        get() = 2 * (base + altezza)
}

val r = Rettangolo(3.0, 2.0)
println(r.area)       // 6.0
println(r.perimetro)  // 10.0
```

Il getter viene eseguito a ogni accesso: `area` non occupa memoria, viene calcolata quando serve.

I metodi sono funzioni dentro la classe e possono usare le proprietà direttamente.

### Incapsulamento

Non tutto deve essere modificabile dall'esterno. Una proprietà può essere `private set`:

```kotlin
class ContoBancario(val intestatario: String, saldoIniziale: Double) {

    var saldo: Double = saldoIniziale
        private set

    fun versa(importo: Double) {
        require(importo > 0) { "Importo non valido" }
        saldo += importo
    }

    fun preleva(importo: Double): Boolean {
        if (importo <= 0 || importo > saldo) return false
        saldo -= importo
        return true
    }
}
```

```kotlin
val conto = ContoBancario("Anna", 100.0)
conto.versa(50.0)
println(conto.saldo)   // 150.0
conto.saldo = 999.0    // errore: setter privato
```

L'oggetto decide le regole: nessuno può portare il saldo a un valore arbitrario. Questo è il senso dell'incapsulamento.

Per esporre una collezione senza permetterne la modifica:

```kotlin
class Squadra {

    private val membri = mutableListOf<String>()

    val giocatori: List<String>
        get() = membri

    fun aggiungi(nome: String) {
        membri.add(nome)
    }
}
```

`giocatori` è una vista in sola lettura: chi la riceve può scorrerla, ma non può chiamare `add`.

### data class

Una `data class` genera automaticamente `equals`, `hashCode`, `toString`, `copy` e le funzioni di destructuring.

```kotlin
data class Libro(val titolo: String, val autore: String, val anno: Int)

val libro = Libro("Dune", "Frank Herbert", 1965)
val riedizione = libro.copy(anno = 2024)

println(libro)                        // Libro(titolo=Dune, autore=Frank Herbert, anno=1965)
println(libro == Libro("Dune", "Frank Herbert", 1965)) // true
println(riedizione)

val (titolo, autore, anno) = libro
println("$titolo di $autore ($anno)")
```

Usa una data class quando l'oggetto rappresenta soprattutto **dati**: un libro, un contatto, una riga di ordine. Per oggetti con stato interno complesso o risorse aperte, una classe normale è più adatta.

`copy` è una copia superficiale: se una proprietà è una lista mutabile, la copia condivide la stessa lista.

### enum class

Un enum rappresenta un insieme chiuso di valori.

```kotlin
enum class StatoOrdine(val etichetta: String) {
    NUOVO("Nuovo"),
    SPEDITO("Spedito"),
    CONSEGNATO("Consegnato");

    fun successivo(): StatoOrdine = when (this) {
        NUOVO -> SPEDITO
        SPEDITO -> CONSEGNATO
        CONSEGNATO -> CONSEGNATO
    }
}

println(StatoOrdine.NUOVO.etichetta)          // Nuovo
println(StatoOrdine.NUOVO.successivo())       // SPEDITO
println(StatoOrdine.entries.map { it.etichetta })
```

`entries` restituisce tutti i valori nell'ordine di dichiarazione. Evita `valueOf` con input libero: lancia un'eccezione se il nome non esiste.

### Tipi nullable

In Kotlin `String` e `String?` sono tipi diversi: il secondo può contenere `null`, il primo no. Il compilatore ti obbliga a gestire il caso assente.

```kotlin
data class Utente(val nome: String, val email: String?)

fun main() {
    val anna = Utente("Anna", null)
    val luca = Utente("Luca", "luca@example.com")

    println(anna.email?.length)          // null
    println(luca.email?.length)          // 16
    println(anna.email ?: "nessuna email")
}
```

- `?.` è la **safe call**: se il valore è `null`, l'intera espressione vale `null` e il metodo non viene chiamato.
- `?:` è l'**operatore Elvis**: fornisce un valore alternativo quando a sinistra c'è `null`.

### `!!`, `let` e conversioni sicure

`!!` forza il valore non nullo. Se il valore è davvero `null`, il programma lancia `NullPointerException`: usalo solo quando hai una garanzia esterna e non puoi esprimerla altrimenti.

```kotlin
val email = anna.email ?: error("Email obbligatoria")
```

Il blocco `?.let` esegue codice solo se il valore esiste:

```kotlin
anna.email?.let { email ->
    println("Email: $email")
}
```

La conversione sicura `as?` restituisce `null` invece di lanciare un'eccezione:

```kotlin
val valore: Any = "testo"
val testo = valore as? String
println(testo?.uppercase() ?: "non è una stringa")
```

Per le variabili inizializzate più tardi esiste `lateinit var`, ma solo per tipi non primitivi; se accedi prima dell'inizializzazione ottieni un'eccezione. Preferisci, quando possibile, un valore iniziale o un tipo nullable.

### open, override e interfacce in breve

In Kotlin le classi sono **final** per impostazione predefinita: per ereditarne devi dichiararle `open`.

```kotlin
open class Animale(val nome: String) {
    open fun verso(): String = "..."
}

class Cane(nome: String) : Animale(nome) {
    override fun verso(): String = "Bau"
}

interface Stampabile {
    fun stampa(): String
}

class Ricevuta(val totale: Double) : Stampabile {
    override fun stampa(): String = "Totale: $totale"
}
```

Userai queste strutture con le sealed class nella settimana 4. Per ora ricorda: `open` per estendere, `override` per ridefinire, `interface` per descrivere un comportamento.

### Esempio completo: biblioteca

```kotlin
data class Libro(val titolo: String, val autore: String, var disponibile: Boolean = true)

class Biblioteca {

    private val libri = mutableListOf<Libro>()

    val catalogo: List<Libro>
        get() = libri

    fun aggiungi(libro: Libro) {
        require(libri.none { it.titolo.equals(libro.titolo, ignoreCase = true) }) {
            "Libro già presente: ${libro.titolo}"
        }
        libri.add(libro)
    }

    fun cerca(titolo: String): Libro? =
        libri.firstOrNull { it.titolo.equals(titolo, ignoreCase = true) }

    fun presta(titolo: String): Boolean {
        val libro = cerca(titolo) ?: return false
        if (!libro.disponibile) return false
        libro.disponibile = false
        return true
    }

    fun restituisci(titolo: String): Boolean {
        val libro = cerca(titolo) ?: return false
        libro.disponibile = true
        return true
    }
}

fun main() {
    val biblioteca = Biblioteca()
    biblioteca.aggiungi(Libro("Dune", "Frank Herbert"))
    biblioteca.aggiungi(Libro("1984", "George Orwell"))

    println(biblioteca.presta("Dune"))       // true
    println(biblioteca.presta("Dune"))       // false: già in prestito
    println(biblioteca.cerca("1984")?.autore) // George Orwell
}
```

`firstOrNull` e `none` sono operazioni sulle collezioni che userai continuamente: la prima restituisce il primo elemento che soddisfa la condizione o `null`; la seconda verifica che nessun elemento la soddisfi.

### Errori comuni

- **Dimenticare `val`/`var` nel costruttore.** Il parametro non diventa una proprietà.
- **Usare `!!` per zittire il compilatore.** Sposta il crash a runtime: gestisci il `null` con `?.`, `?:` o un controllo esplicito.
- **Confrontare oggetti normali con `==`.** Senza data class o `equals` ridefinito, il confronto è per riferimento.
- **Esporre una lista mutabile.** Restituisci una vista `List` o una copia.
- **Modificare una data class con `copy` aspettandosi una copia profonda.** Le collezioni interne restano condivise.
- **Chiamare `valueOf` su input dell'utente.** Usa `entries.find { ... }` e gestisci il `null`.
- **Dichiarare `lateinit` per un `Int`.** Non è permesso: usa `var x = 0` o un nullable.

## Esercizi progressivi

**Esercizio 1.** Crea una classe `Rettangolo` con base e altezza, un metodo `area()` e un metodo `perimetro()`.

**Esercizio 2.** Crea `ContoBancario` con saldo modificabile solo tramite `versa` e `preleva`; impedisci importi negativi e prelievi oltre il saldo.

**Esercizio 3.** Crea una data class `Studente(nome, voto)` e usa `copy` per creare uno studente con il voto corretto.

**Esercizio 4.** Crea un enum `Stagione` con etichetta e un metodo `successiva()` che restituisce la stagione seguente.

**Esercizio 5.** Crea un `Utente` con email nullable e stampa l'email oppure `nessuna email` usando l'Elvis.

**Esercizio 6.** Leggi un'età con `toIntOrNull()` e stampa `Età valida` o `Input non valido` senza crash.

**Esercizio 7.** Crea una lista di data class `Libro`, filtrala per autore e ordinala per anno.

**Esercizio 8.** Implementa una `Biblioteca` con aggiunta, ricerca per titolo e prestito; la ricerca restituisce `Libro?`.

**Esercizio 9.** Crea un inventario con `mutableMapOf<String, Int>`: aggiungi prodotti, leggi una giacenza assente senza crash e incrementala.

**Esercizio 10.** Crea una `Squadra` con lista privata di giocatori e una vista pubblica in sola lettura.

**Esercizio 11.** Definisci un'interfaccia `Stampabile` con `stampa(): String` e implementala in due classi diverse.

**Esercizio 12.** Crea una classe `open Veicolo` con un metodo `muovi()` e una sottoclasse `Auto` che lo ridefinisce; usa una lista di `Veicolo` e stampa i comportamenti.

### Varianti

- Aggiungi a `ContoBancario` un elenco privato dei movimenti e un metodo che restituisce una copia.
- Trasforma `StatoOrdine` in un enum con un metodo `puoAnnullare(): Boolean`.
- Nella biblioteca, permetti la ricerca anche per autore.

## Progetti della settimana 3

### Progetto 1: Gestione studenti

Requisiti:

- data class `Studente` con nome, cognome e voti;
- media calcolata da un metodo;
- aggiunta, ricerca ed eliminazione da una lista;
- elenco ordinato per media decrescente;
- validazione dei voti tra 0 e 30.

### Progetto 2: Biblioteca semplice

Requisiti:

- data class `Libro` con titolo, autore, anno e disponibilità;
- classe `Biblioteca` con catalogo privato e vista in sola lettura;
- aggiunta, ricerca per titolo, prestito e restituzione;
- niente titoli duplicati;
- messaggi chiari quando un libro non esiste o è già in prestito.

### Progetto 3: Sistema di inventario

Requisiti:

- data class `Prodotto` con codice, nome, prezzo e giacenza;
- inventario in una mappa `codice -> Prodotto`;
- entrata e uscita di merce con controllo della giacenza;
- ricerca per codice con gestione del `null`;
- elenco dei prodotti sotto una soglia minima.

### Criteri di verifica

- [ ] Le proprietà che non devono cambiare sono `val`; i setter pericolosi sono privati.
- [ ] I costruttori impediscono oggetti non validi con `require`.
- [ ] I dati semplici sono modellati con data class.
- [ ] Gli stati chiusi sono modellati con enum.
- [ ] Non ci sono `!!` senza una motivazione valida.
- [ ] Le collezioni esposte non sono modificabili dall'esterno.
- [ ] I metodi hanno nomi chiari e una sola responsabilità.

Nella settimana 4 il codice diventa più espressivo: funzioni di ordine superiore, scope functions, sealed class e gestione funzionale degli errori.
