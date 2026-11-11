# Settimana 2: funzioni e collezioni

I programmi della settimana 1 avevano tutto dentro `main`. Da qui in avanti il codice si divide in **funzioni** con un compito chiaro e i dati si organizzano in **liste**, **set** e **mappe**.

### Funzioni

```kotlin
fun areaRettangolo(base: Double, altezza: Double): Double {
    return base * altezza
}

fun saluta(nome: String): String {
    return "Ciao, $nome!"
}

fun main() {
    println(areaRettangolo(3.0, 2.5))
    println(saluta("Anna"))
}
```

La firma contiene nome, parametri con tipo e tipo di ritorno. Quando il corpo è una sola espressione puoi abbreviare:

```kotlin
fun areaRettangolo(base: Double, altezza: Double): Double = base * altezza

fun isPari(numero: Int): Boolean = numero % 2 == 0
```

Una funzione che non restituisce nulla ha tipo `Unit` e può omettere il tipo di ritorno:

```kotlin
fun stampaSeparatore() {
    println("-----------")
}
```

### Parametri di default e argomenti nominati

```kotlin
fun saluta(nome: String, saluto: String = "Ciao"): String = "$saluto, $nome!"

println(saluta("Anna"))                          // Ciao, Anna!
println(saluta("Luca", "Buongiorno"))            // Buongiorno, Luca!
println(saluta(nome = "Sara", saluto = "Ehi"))   // Ehi, Sara!
```

I parametri con default evitano di scrivere più overload. Gli argomenti nominati rendono leggibili le chiamate con molti parametri.

Con `vararg` una funzione accetta un numero variabile di argomenti:

```kotlin
fun somma(vararg numeri: Int): Int = numeri.sum()

println(somma(1, 2, 3, 4)) // 10
```

### Liste

```kotlin
val frutti = listOf("mela", "pera", "banana")      // immutabile
val spesa = mutableListOf("pane", "latte")         // mutabile

spesa.add("uova")
spesa += "caffè"
spesa.remove("latte")

println(spesa.size)        // 3
println(spesa[0])          // pane
println(frutti.first())    // mela
println(frutti.last())     // banana
println(frutti.indexOf("pera")) // 1
```

| Operazione | Metodo |
| --- | --- |
| aggiungere | `add`, `+=` |
| rimuovere per valore | `remove("pane")` |
| leggere per posizione | `lista[0]` |
| dimensione | `size` |
| verificare presenza | `contains("pane")` o `"pane" in lista` |
| ordinare | `sorted()` (nuova lista) o `sort()` (sul posto) |

Una lista `listOf` non si modifica: se serve cambiarla, crea una copia con `toMutableList()`.

```kotlin
val base = listOf(3, 1, 2)
val modificabile = base.toMutableList()
modificabile.add(4)
println(base)          // [3, 1, 2]
println(modificabile)  // [3, 1, 2, 4]
```

### Set

Un `Set` non ammette duplicati.

```kotlin
val parole = setOf("ciao", "mondo", "ciao")
println(parole.size)   // 2
println(parole)        // [ciao, mondo]

val a = setOf(1, 2, 3)
val b = setOf(3, 4, 5)

println(a union b)      // [1, 2, 3, 4, 5]
println(a intersect b)  // [3]
println(a subtract b)   // [1, 2]
```

Usa un set quando l'unicità è il punto: parole distinte, tag, identificativi. L'ordine non è garantito da un set generico: se conta, usa `linkedSetOf`.

### Mappe

Una mappa associa una chiave a un valore.

```kotlin
val capitali = mapOf(
    "Italia" to "Roma",
    "Francia" to "Parigi"
)

println(capitali["Italia"])   // Roma
println(capitali["Spagna"])   // null

val rubrica = mutableMapOf<String, String>()
rubrica["Anna"] = "333-1234567"
rubrica["Luca"] = "333-7654321"
rubrica["Anna"] = "333-0000000"   // sovrascrive
rubrica.remove("Luca")

println(rubrica.getOrDefault("Sara", "non presente"))

for ((nome, telefono) in rubrica) {
    println("$nome: $telefono")
}
```

| Operazione | Metodo |
| --- | --- |
| leggere | `mappa[chiave]` (restituisce `null` se manca) |
| leggere con default | `getOrDefault(chiave, default)` |
| scrivere | `mappa[chiave] = valore` |
| rimuovere | `remove(chiave)` |
| chiavi / valori | `keys` / `values` |
| verificare | `containsKey(chiave)` |

Attenzione: `mappa[chiave]` restituisce un tipo **nullable**, perché la chiave può non esistere. Nella settimana 3 vedrai come gestirlo in modo pulito.

### for e when in pratica

```kotlin
val voti = listOf(18, 24, 30, 27)

for (voto in voti) {
    val esito = when {
        voto >= 27 -> "Alto"
        voto >= 18 -> "Passato"
        else -> "Bocciato"
    }
    println("$voto: $esito")
}

for ((indice, voto) in voti.withIndex()) {
    println("${indice + 1}° voto: $voto")
}
```

`when` senza soggetto valuta condizioni booleane; `withIndex()` fornisce indice e valore a ogni giro.

### Lambda semplici

Una **lambda** è una funzione scritta al volo e passata a un'altra funzione.

```kotlin
val doppio: (Int) -> Int = { x -> x * 2 }
println(doppio(5)) // 10

val numeri = listOf(1, 2, 3, 4, 5, 6)

val pari = numeri.filter { it % 2 == 0 }
val quadrati = numeri.map { it * it }
val somma = numeri.sum()
val ordinati = numeri.sortedDescending()

println(pari)       // [2, 4, 6]
println(quadrati)   // [1, 4, 9, 16, 25, 36]
println(somma)      // 21
println(ordinati)   // [6, 5, 4, 3, 2, 1]

numeri.forEach { println(it) }
```

`it` è il nome implicito dell'unico parametro della lambda. Quando i parametri sono più di uno o il nome `it` rende il codice ambiguo, assegna un nome esplicito.

### Esempio completo: lista della spesa

```kotlin
fun main() {
    val spesa = mutableListOf<String>()

    while (true) {
        println("1. Aggiungi  2. Rimuovi  3. Elenca  0. Esci")
        when (readlnOrNull()) {
            "1" -> {
                print("Articolo: ")
                val articolo = readln().trim()
                if (articolo.isNotEmpty()) spesa.add(articolo)
            }
            "2" -> {
                print("Articolo da rimuovere: ")
                val articolo = readln().trim()
                if (spesa.remove(articolo)) {
                    println("Rimosso.")
                } else {
                    println("Non presente.")
                }
            }
            "3" -> {
                if (spesa.isEmpty()) {
                    println("Lista vuota.")
                } else {
                    spesa.forEachIndexed { indice, articolo ->
                        println("${indice + 1}. $articolo")
                    }
                }
            }
            "0" -> break
            else -> println("Scelta non valida.")
        }
    }
}
```

Qui ogni ramo del `when` contiene poche righe. Se un ramo diventa lungo, estrailo in una funzione.

### Errori comuni

- **Modificare una lista immutabile.** `listOf` non ha `add`: usa `mutableListOf` o `toMutableList()`.
- **Ignorare il `null` delle mappe.** `mappa[chiave]` può essere `null`: gestiscilo prima di usare il valore.
- **Dimenticare il tipo di ritorno.** Una funzione che deve restituire un valore e non lo fa produce un errore di compilazione.
- **Usare `it` in lambda annidate.** Diventa ambiguo: assegna nomi ai parametri.
- **Confrontare liste con `==` pensando all'identità.** In Kotlin `==` confronta il contenuto, che è quasi sempre ciò che vuoi.
- **Ramo mancante nel `when`.** Se lo usi come espressione, deve coprire tutti i casi o avere `else`.
- **Funzioni troppo lunghe.** Se superano le 20-30 righe, probabilmente fanno più cose: dividile.

## Esercizi progressivi

**Esercizio 1.** Scrivi `maggiore(a: Int, b: Int): Int` e usala per stampare il maggiore tra due numeri letti da tastiera.

**Esercizio 2.** Scrivi `isPari(numero: Int): Boolean` con corpo a espressione e usala su tre numeri.

**Esercizio 3.** Scrivi `saluta(nome: String, saluto: String = "Ciao")` e chiamala tre volte, una con argomenti nominati.

**Esercizio 4.** Crea una lista di cinque città e stampa la prima, l'ultima e quante sono.

**Esercizio 5.** Gestisci una lista della spesa con tre funzioni: `aggiungi`, `rimuovi`, `stampa`.

**Esercizio 6.** Leggi parole finché l'utente non scrive `fine`, inseriscile in un set e stampa quante parole distinte ha inserito.

**Esercizio 7.** Conta quante volte compare ogni parola nella frase `"il gatto e il cane e il topo"` usando una mappa.

Output atteso (ordine non importante):

```text
il: 3
gatto: 1
e: 2
cane: 1
topo: 1
```

**Esercizio 8.** Crea una rubrica con `mutableMapOf<String, String>`: aggiungi tre contatti, cercane uno e stampa tutti con un ciclo.

**Esercizio 9.** Scrivi un menu con `when` che chiama una funzione diversa per ogni voce.

**Esercizio 10.** Da una lista di numeri, stampa solo i pari con `filter` e i loro quadrati con `map`.

**Esercizio 11.** Da una lista di nomi, produci una lista in maiuscolo ordinata alfabeticamente.

**Esercizio 12.** Scrivi `sommaEMedia(numeri: List<Int>): Pair<Int, Double>` e stampa i due valori.

### Varianti

- Aggiungi alla lista della spesa il controllo dei duplicati prima di inserire.
- Nel contatore di parole ignora maiuscole e punteggiatura con `lowercase()` e `replace`.
- Trasforma la rubrica in un set di contatti `data class` (lo vedrai nella settimana 3).

## Progetti della settimana 2

### Progetto 1: Lista della spesa

Requisiti:

- menu con aggiungi, rimuovi, elenca ed esci;
- ogni azione in una funzione separata;
- niente duplicati nella lista;
- conteggio degli articoli;
- input vuoto ignorato con un messaggio.

### Progetto 2: Rubrica contatti

Requisiti:

- contatti salvati in una `mutableMapOf<String, String>` (nome → telefono);
- aggiunta, ricerca, modifica ed eliminazione;
- la ricerca di un nome assente restituisce un messaggio, non un crash;
- elenco ordinato per nome;
- menu che si ripete fino all'uscita.

### Progetto 3: Contatore di parole

Requisiti:

- legge un testo (fisso o inserito dall'utente) e conta le occorrenze di ogni parola;
- ignora maiuscole e punteggiatura;
- stampa le parole dalla più frequente alla meno frequente;
- mostra il numero totale di parole e di parole distinte;
- gestisce un testo vuoto con un messaggio.

### Criteri di verifica

- [ ] Ogni funzione ha una sola responsabilità e un nome chiaro.
- [ ] Le collezioni sono scelte bene: lista per l'ordine, set per l'unicità, mappa per le associazioni.
- [ ] Le mappe non producono `NullPointerException`.
- [ ] Gli input non validi non fermano il programma.
- [ ] Non ci sono funzioni con più di 30 righe.
- [ ] I menu si ripetono finché l'utente non esce.

Nella settimana 3 i dati diventano oggetti: classi, proprietà, data class e tipi nullable.
