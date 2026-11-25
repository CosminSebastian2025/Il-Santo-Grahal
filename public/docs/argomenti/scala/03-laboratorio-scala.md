In questo laboratorio costruisci `scala-conta`, una CLI che legge un file o stdin e stampa righe, parole, byte e le parole più frequenti, scritta in Scala 3 con la sola libreria standard. Il programma non è una copia di `wc`: serve a mettere in pratica tipi algebrici, `Either` per gli errori, collezioni immutabili e test con MUnit. Alla fine avrai un progetto sbt eseguibile e testato.

## Obiettivi

- Definire un contratto CLI con opzioni, codice di uscita e comportamento su stdin vuoto.
- Representare il risultato della lettura con `Either[ErroreCli, String]` invece di eccezioni.
- Calcolare conteggi e frequenze con collezioni immutabili e `groupMapReduce`.
- Scrivere test con MUnit che coprono input, opzioni e fallimenti.
- Separare il core puro dall'I/O per rendere i test veloci e deterministici.

## Il contratto di `scala-conta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `scala-conta [OPZIONI] [FILE]` | senza file legge stdin |
| `-n, --top N` | intero >= 1, default 5 | limite di stampa |
| `--json` | output su una riga | consumo da script |
| exit 0 | successo | anche con conteggi a zero |
| exit 1 | file mancante o opzione invalida | errore operativo |

Senza argomenti e con stdin vuoto il programma stampa zeri ed esce con 0: il vuoto è un risultato. Un file che non esiste è invece un errore operativo, scritto su stderr.

```bash
sbt compile
printf 'ciao scala ciao\n' | sbt --error "runMain contacli.Main -n 2"  # avvio via sbt
sbt test                                                              # suite MUnit
```

In fase di sviluppo `sbt run` ricompila solo il necessario; per distribuire il programma si usa un assembly jar o un pacchetto nativo tramite un plugin.

## Core: conteggi e frequenze

Il core è puro: riceve il testo come `String` e restituisce una `case class` con i risultati. Nessuna lettura di file, nessun `println`, nessuno stato condiviso.

```scala
package contacli

// Conteggi: un tipico prodotto, uguaglianza strutturale gratis
case class Conteggi(righe: Int, parole: Int, byte: Int)
```

```scala
object Core:
  def conta(testo: String): Conteggi =
    val righe =
      if testo.isEmpty then 0 // una riga solo se c'è testo
      else testo.count(_ == '\n') + (if testo.endsWith("\n") then 0 else 1)
    val parole = tokenizza(testo)
    Conteggi(righe, parole.size,
             testo.getBytes(java.nio.charset.StandardCharsets.UTF_8).length)

  def tokenizza(testo: String): List[String] =
    testo.split("\\s+").toList.filter(_.nonEmpty) // niente token vuoti

  def frequenze(testo: String, n: Int): List[(String, Int)] =
    tokenizza(testo)
      .groupMapReduce(identity)(_ => 1)(_ + _) // una mappa, un passaggio
      .toList
      .sortBy { case (parola, conteggio) => (-conteggio, parola) } // ordine stabile
      .take(n)
```

`groupMapReduce` combina `groupBy` e `mapValues`: in una sola espressione conta le occorrenze. `sortBy` ordina prima per conteggio decrescente, poi per parola, così i legami sono deterministici e i test non diventano fragili.

```scala
object Cli:
  case class Opzioni(top: Int, attivo: Boolean)

  sealed trait Esito
  case class Ok(righe: Int, parole: Int, byte: Int, top: List[(String, Int)]) extends Esito
  case class Errore(messaggio: String) extends Esito

  def esegui(args: List[String], input: String): Esito =
    parse(args) match
      case Left(err) => Errore(err) // messaggio stabile, testabile
      case Right(Ozioni(top, attivo)) =>
        val c = Core.conta(input)
        Ok(c.righe, c.parole, c.byte,
           if attivo then Core.frequenze(input, top) else Nil)

  def parse(args: List[String]): Either[String, Opzioni] =
    args match
      case Nil => Right(Opzioni(5, false)) // default senza opzioni
      case _ => Left("opzioni non ancora implementate")
```

`esegui` riceve il testo già letto, quindi è testabile senza file né stdin. La versione di `parse` qui sopra è volutamente minima: negli esercizi la sostituisci con una `foldLeft` sull'elenco degli argomenti che riconosce `-n` e `--json` e restituisce `Left` sui casi invalidi.

Il `main` è l'unico punto che tocca l'ambiente: legge stdin, chiama `esegui` e traduce l'esito in output e codice di uscita.

```scala
import scala.io.Source

@main def main(args: String*): Unit =
  val input = Source.stdin.mkString("")
  Cli.esegui(args.toList, input) match
    case Cli.Ok(r, p, b, top) =>
      println(s"$r $p $b")
      top.foreach { case (w, n) => println(s"$n\t$w") }
    case Cli.Errore(m) =>
      System.err.println(s"scala-conta: $m")
      sys.exit(1) // codice d'errore: la shell lo vede
```

## Test e criterio di uscita

I test coprono tre livelli: il conteggio sul testo, le frequenze sui legami e il contratto CLI. MUnit confronta valori con uguaglianza strutturale, e il plain Scala rende i test molto espressivi.

```scala
import munit.FunSuite

class CoreSuite extends FunSuite:
  test("righe e parole"):
    val c = Core.conta("ciao scala\nciao lua")
    assertEquals(c.righe, 2)
    assertEquals(Core.tokenizza(c.parole).size, 4)

  test("input vuoto"):
    assertEquals(Core.conta("").righe, 0)

  test("frequenze con legami stabili"):
    assertEquals(Core.frequenze("b a b a c", 2),
                 List("a" -> 2, "b" -> 2)) // il legame va su "a" < "b"

  test("opzione invalida"):
    assertEquals(Cli.parse(List("--top", "0")), Left("top deve essere >= 1"))
```

Il `parse` reale deve produrre proprio quel messaggio per `--top 0`, così il test resta un contratto leggibile. Il contratto da verificare a mano è breve: `printf '' | scala-conta` deve dare `0 0 0` ed exit 0; `scala-conta /non/esiste` deve uscire con 1 e scrivere su stderr.

## Esercizi

1. Implementa `Cli.parse` con una `foldLeft` che restituisce `Left("opzione sconosciuta: ...")` di fronte a un flag non previsto e `Left("valore mancante")` su `--top` senza numero.
2. Aggiungi `-s, --sort nome|freq` per ordinare le parole, con default `freq`, e un test che verifichi l'ordine alfabetico con `nome`.
3. Rendi `--json` stabile con i campi `righe`, `parole`, `byte` e `top`, e scrivi un test che ne fissi l'ordine.
4. Prova a leggere a blocchi di 8 KiB con un `BufferedReader`: quale parte del core deve cambiare per contare senza caricare tutto in memoria?
5. Gestisci input non UTF-8: `Source.fromInputStream` va specificato con una codifica; decidi cosa fare con i byte non validi e scrivi un test.
6. Confronta `Vector` e `List` sul conteggio di 100.000 parole: misura con `System.nanoTime()` e ipotizza il perché della differenza.

<details>
<summary>Soluzione</summary>

1. Parti da `Right(Opzioni(5, false))` e piega gli argomenti: su `-n` o `--top` prendi il valore successivo con `values.toIntOption`, su `--json` attiva il flag, su un argomento non flag lo usi come file, altrimenti `Left`. La `foldLeft` pura si legge come una riduzione sullo stato delle opzioni.

2. Aggiungi `sort: Ordina` all'enum `Ozioni` e nel core scegli tra `sortBy(_._2)` e `sortBy(_._1)`; il test verifica `List("a" -> 1, "b" -> 1)` per l'ordine alfabetico e `List("b" -> 2, "a" -> 1)` per la frequenza.

3. Costruisci la stringa interpolendo i campi nell'ordine fisso e serializza `top` con una `map` verso i pair JSON. Il test confronta l'intera riga con `assertEquals`, quindi qualsiasi cambio di ordine o spaziatura rompe il test.

4. `conta` deve accettare uno stream e aggiornare righe e parole a blocchi, trattando i byte UTF-8 a confine tra blocchi. La frequenza richiede di accumulare la mappa a ogni blocco con `groupMapReduce` parziale.

5. Usa `Source.fromInputStream(System.in, "UTF-8")` e sostituisci i caratteri non validi con `\uFFFD` prima di contare, così l'output JSON resta valido; il test può scrivere i byte non validi in un `ByteArrayInputStream`.

6. `Vector` ha accesso casuale e append efficaci, `List` eccelle in prepend e traversata sequenziale. Per `split` e traversal lineare la differenza è modesta; l'append ripetuto su `List` è quadratico e va evitato.

</details>

## Errori comuni

- **Leggere stdin dentro `Core.conta`**: rende il test dipendente dall'ambiente e serializza l'esecuzione; il core deve ricevere una `String`.
- **Usare `var` o collezioni mutabili nel calcolo**: il risultato diventa sensibile all'ordine e testarlo diventa fragile.
- **Restituire eccezioni per opzioni invalide**: un `IllegalArgumentException` ha un messaggio instabile e non è un caso esaustivo; `Either` è il tipo giusto.
- **Dimenticare il codice di uscita**: senza `sys.exit(1)` la shell vede successo anche quando lo strumento ha fallito.
- **Testare solo l'input felice**: il caso vuoto, il file mancante e l'opzione con valore mancante sono quelli che rompono le pipeline.

## In sintesi

Hai separato un core puro (`Core` e `Cli.esegui`) dal `main` che fa I/O ed esce con il codice giusto. Le collezioni immutabili, come `groupMapReduce` e `sortBy` con ordine totale, rendono i risultati deterministici e i test semplici. MUnit verifica con uguaglianza strutturale e i valori `case class` regalano ottimi messaggi d'errore. Il passo successivo è la lettura a blocchi, che sposta l'attenzione dall'allocazione anticipata al flusso.

## Fonti

- [Scala 3 Book - Introduction](https://docs.scala-lang.org/scala3/book/introduction.html)
- [Scala 3 Book - Collections](https://docs.scala-lang.org/scala3/book/collections-intro.html)
- [Scala 3 Book - Building and Testing Projects with sbt](https://docs.scala-lang.org/scala3/book/tools-sbt.html)
- [Scala 3 Book - Functional Error Handling](https://docs.scala-lang.org/scala3/book/fp-functional-error-handling.html)
- [Scala CLI - Commands](https://scala-cli.virtuslab.org/docs/commands/run)
