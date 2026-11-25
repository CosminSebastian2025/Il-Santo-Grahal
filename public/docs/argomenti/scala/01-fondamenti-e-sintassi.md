Scala 3 è un linguaggio che unisce la programmazione orientata agli oggetti e quella funzionale sulla stessa JVM, senza rinunciare alla compatibilità con Java. La sintassi è compatta, l'inferenza dei tipi è forte e il compilatore verifica che i casi siano esaustivi: molte classi di errori diventano errori di compilazione. In questa lezione impari i pezzi minimi con cui si scrive un programma Scala leggibile.

## Obiettivi

- Distinguere `val` e `var`, e capire perché l'immutabilità è il default logico.
- Dichiarare funzioni, method e lambda con la sintassi Scala 3, inclusa la forma con indentazione.
- Modellare dati con `case class`, `enum` e `trait` invece che con gerarchie vuote.
- Usare `match` e i tipi `Option` e `Either` al posto delle eccezioni.
- Esplorare le collezioni immutabili con `map`, `filter` e `foldLeft`.

## Valori, espressioni e funzioni

In Scala quasi tutto è un'espressione: `if`, `match` e un blocco racchiuso tra graffe restituiscono un valore. `val` è immutabile, `var` mutabile, e il tipo si può quasi sempre omettere perché il compilatore lo inferisce.

```scala
// Scala 3: funzioni top-level, senza classe contenitore
def saluta(nome: String, grado: Int = 1): String =
  val titolo = if grado > 2 then "dott." else "sig." // if come espressione
  s"Ciao $titolo $nome" // string interpolation

def doppio(n: Int): Int = n * 2 // corpo su una riga

@main def demo(): Unit =
  val valori = List(1, 2, 3)
  val somma = valori.map(doppio).sum // funzioni passate come valori
  println(s"${saluta("Ada")}: $somma")
```

A differenza di un file Java, `def` può stare in cima al file senza `object`. L'indentazione sostituisce spesso le graffe, ma le graffe restano valide per chi preferisce lo stile classico. Le lambda brevi si scrivono `x => x + 1` oppure con il segnaposto `_ + 1`.

| Costrutto | Sintassi | Nota |
| --- | --- | --- |
| valore immutabile | `val x = 42` | tipo inferito come `Int` |
| variabile mutabile | `var n = 0` | da usare con parsimonia |
| funzione | `def f(x: Int): Int = x + 1` | espressione, non istruzioni |
| lambda | `(x: Int) => x * 2` | `_ * 2` nella forma breve |
| interpolazione | `s"riga $n"` | prefissi `s`, `f`, `raw` |
| blocco | `val y = { val a = 1; a + 1 }` | restituisce l'ultima espressione |

`var` non è proibito, ma è una scelta da spiegare: ogni volta che lo usi stai rinunciando alla possibilità di ragionare sul valore senza seguire la storia degli assegnamenti. Un'abitudine utile è dare un tipo esplicito alle funzioni pubbliche, dove l'inferenza rende meno leggibili le firme per chi legge la documentazione generata.

Il REPL `scala` e la console di sbt permettono di provare queste espressioni in pochi secondi: scrivi `List(1,2,3).map(_ * 2)` e vedi il risultato senza creare un file. Questo ciclo rapido è uno dei motivi per cui Scala si presta all'esplorazione dei tipi.

## Modellare i dati

Scala 3 offre tre strumenti per descrivere i dati, e la scelta dipende da cosa vuoi: `case class` per i prodotti con uguaglianza strutturale, `enum` per le somme di casi, `trait` per i contratti aperti. `enum` sostituisce le vecchie gerarchie con `sealed trait` e `case object`, mantenendo il controllo di esaustività.

```scala
case class Utente(nome: String, eta: Int)

enum Ruolo:
  case Admin, Cliente // enumerazione semplice
  case Editor(livello: Int) // caso con dati (ADT)

enum Risultato:
  case Ok(valore: Int)
  case Errore(motivo: String)

def descrivi(r: Ruolo): String = r match
  case Ruolo.Admin => "amministratore"
  case Ruolo.Cliente => "cliente"
  case Ruolo.Editor(liv) => s"editor di livello $liv"

val u = Utente("Ada", 36)
println(u.copy(eta = 37)) // copy con un campo cambiato
println(u == Utente("Ada", 36)) // true: uguaglianza strutturale
```

`copy` e l'uguaglianza per valore nascono con `case class`. `enum` è una somma tipizzata: se aggiungi un caso e dimentichi un ramo nel `match`, il compilatore ti avvisa. I `trait` restano il modo per definire interfacce e miscelare comportamenti con `with`.

## Pattern matching ed errori

Il `match` di Scala è molto più potente di uno `switch`: estrae valori, verifica tipi e condizioni. Combinato con `Option` ed `Either` evita le eccezioni per i casi previsti, e il compilatore obbliga a trattare tutti i casi.

```scala
def parseSicuro(testo: String): Option[Int] =
  texto.toIntOption // None invece di NumberFormatException

def prezzo(testo: String): Either[String, Double] =
  if testo.isBlank then Left("prezzo vuoto") // errore tipizzato
  else parseSicuro(testo).map(_.toDouble).toRight(s"non numerico: $testo")

def descrizione(e: Either[String, Double]): String = e match
  case Right(v) => f"prezzo: $v%.2f"
  case Left(m) => s"errore: $m"

println(descrizione(prezzo("19"))) // prezzo: 19.00
println(descrizione(prezzo("x")))  // errore: non numerico: x
```

Un parsing che può fallire restituisce `Option[Int]`, esplicito nel tipo; `map` trasforma il valore interno, `getOrElse` fornisce un default, `flatMap` concatena operazioni che possono fallire. Per i motivi d'errore `Either[String, Double]` è più ricco: `Left` contiene il motivo, `Right` il valore, e il `match` finale obbliga a trattare entrambi i casi.

| Tipo | Contiene | Metodo tipico |
| --- | --- | --- |
| `Option[A]` | `Some(a)` o `None` | `getOrElse(default)` |
| `Either[E, A]` | `Right(a)` o `Left(e)` | `fold(suErrore, suValore)` |
| `Try[A]` | successo o eccezione catturata | `toOption` |
| `List[A]` | lista immutabile | `headOption` |

Uno dei vantaggi è la catena senza annidamenti: `utente.flatMap(_.indirizzo).map(_.cap).getOrElse("sconosciuto")` legge l'intero percorso senza `if` annidati, perché `flatMap` e `map` propagano automaticamente l'assenza.

## Collezioni immutabili

Le collezioni predefinite di Scala sono immutabili: `List`, `Vector`, `Map`, `Set` restituiscono nuove strutture e condividono la parte invariata della memoria. `Vector` ha accesso casuale efficiente, `List` è ottima per prepend e per le ricorsioni.

```scala
val voti = Map("Ada" -> 30, "Alan" -> 28, "Grace" -> 29)
val promossi = voti.filter { case (_, voto) => voto >= 29 }.keys.toList
val media = voti.values.foldLeft(0.0)(_ + _) / voti.size
val ordinati = promossi.sorted // nuovo valore, il Map originale non cambia
println(s"${ordinati.mkString(", ")} - media $media")
```

Le trasformazioni si concatenano e il tipo resta tracciato: `voti.keys` è un `Iterable[String]`, `toList` materializza. Il pattern matching funziona anche sui pair, come in `case (_, voto)`. Le collezioni mutabili esistono (`mutable.Map`) ma sono l'eccezione, da confinare dove il profiling lo richiede.

## Errori comuni

- **Usare `var` per accumulare in un ciclo**: una `foldLeft` o `map` esprime lo stesso intento senza stato mutabile e senza ciclo.
- **Scrivere `trait` con implementazioni vuote**: se i dati formano un insieme chiuso, `enum` dà esaustività e `copy` gratis.
- **Restituire `null` invece di `Option`**: `null` sfugge al controllo di esaustività e produce `NullPointerException` a distanza.
- **Dimenticare che `match` deve essere esaustivo**: un `match` parziale compila solo se il compilatore può provarlo; sui valori aperti aggiungi un caso `case _`.
- **Confondere `==` di Scala con quello di Java**: in Scala `==` usa `equals`, quindi confronta i valori e non le identità.

## In sintesi

Scala 3 rende brevi le dichiarazioni e consente alle funzioni di stare in cima al file. `val` come default, `case class` ed `enum` descrivono dati compatti con uguaglianza strutturale e match esaustivo. `Option` ed `Either` rendono espliciti nei tipi i fallimenti previsti. Le collezioni immutabili compongono bene con lambda brevi e `foldLeft`.

## Fonti

- [Scala 3 Book - Introduction](https://docs.scala-lang.org/scala3/book/introduction.html)
- [Scala 3 Book - A Taste of Scala](https://docs.scala-lang.org/scala3/book/taste-intro.html)
- [Scala 3 Book - Domain Modeling Tools](https://docs.scala-lang.org/scala3/book/domain-modeling-tools.html)
- [Scala 3 Book - Collections](https://docs.scala-lang.org/scala3/book/collections-intro.html)
- [A Tour of Scala](https://docs.scala-lang.org/tour/tour-of-scala.html)
