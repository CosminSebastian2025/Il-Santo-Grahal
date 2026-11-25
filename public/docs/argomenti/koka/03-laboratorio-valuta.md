In questo laboratorio costruisci `koka-valuta`, un piccolo interprete per espressioni aritmetiche che valuta i termini, segnala la divisione per zero e descrive le operazioni con un log. Non è un esercizio di sintassi: il punto è usare i tipi algebrici per i termini, l'handler `catch` per trasformare `exn` in un valore e la riga di effetto per dimostrare che il calcolo è puro mentre l'I/O resta confinato nel `main`. Alla fine avrai un programma con test eseguibili dall'editor e un effetto `log` definito da te.

## Obiettivi

- Modellare un linguaggio con un `type` ricorsivo e pattern matching esaustivo.
- Separare il calcolo puro (`eval`, `avg`) dagli effetti esterni.
- Trasformare le eccezioni in valori con un handler su `exn`.
- Definire un effetto `log` e un handler che lo raccoglie.
- Scrivere test con prefisso `test` e leggerli come specifica.

## Il contratto di `koka-valuta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| termini | tipo `expr` con quattro casi | pattern matching esaustivo |
| divisione per zero | `throw` con messaggio | l'handler la trasforma in `Nothing` |
| media | `avg` su lista di interi | caso limite rappresentato con `maybe` |
| log | effetto `log` raccolto in lista | testabile senza console |
| uscita | solo `main` stampa | effetti esterni confinati |
| test | funzioni `test...` | eseguibili da VS Code e dal REPL |

Il contratto è volutamente piccolo: due funzioni pure, una parziale e un `main` per gli effetti. Il resto è responsabilità dei tipi.

```bash
koka koka-valuta.kk            # compila ed esegue main
koka                           # REPL: :l koka-valuta.kk, poi :t eval
```

## Core: tipi algebrici e calcolo puro

Le espressioni sono un tipo ricorsivo con quattro casi. `eval` è dichiarata con effetto `exn`, perché la divisione per zero la rende parziale, e il compilatore la tratta come tale.

```koka
// Termini di un mini linguaggio aritmetico
type expr
  Num(n : int)
  Add(l : expr, r : expr)
  Mul(l : expr, r : expr)
  Div(l : expr, r : expr)

// Valutazione: fallisce solo sulla divisione per zero
fun eval(e : expr) : exn int
  match e
    Num(n) -> n
    Add(l, r) -> eval(l) + eval(r)
    Mul(l, r) -> eval(l) * eval(r)
    Div(l, r) -> dividi(eval(l), eval(r))

fun dividi(a : int, b : int) : exn int
  if b == 0 then throw("divisione per zero") else a / b

// Media senza eccezioni: lista vuota e somma sicura
fun avg(xs : list<int>) : total maybe<int>
  if xs.is-empty then Nothing
  else Just(xs.foldl(0, fn(a, b) { a + b }) / xs.length)
```

`avg` è `total`: non legge, non scrive e non fallisce, e il `maybe` rappresenta l'unico caso limite. Il `match` su `expr` è esaustivo, quindi un caso nuovo obbliga a toccare `eval`.

## Handler per gli errori e per il log

`catch` prende un handler per le eccezioni e un'azione, e restituisce un valore del tipo dell'handler: l'errore non termina il programma, diventa un `maybe`. Il log usa un effetto con una sola operazione, raccolto in una lista con `ctl`, così i messaggi sono dati testabili.

```koka
import std/core/console

// Errore controllato: exn => maybe<int>
fun evalSicuro(e : expr) : total maybe<int>
  catch(fn(exn) { Nothing }, fun() { Just(e.eval) })

// Effetto di log definito dall'utente
effect log
  fun log(msg : string) : ()

// Handler globale: registra i messaggi in una lista mutabile locale
fun conLog(action : () -> <log|e> a) : e (list<string>, a)
  var messaggi := []
  with handler
    ctl log(msg)
      messaggi := Cons(msg, messaggi)   // cattura e prosegue
      resume(())
  val risultato = action()
  (messaggi, risultato)
```

Il handler è globale (`with handler`) perché deve valere per tutta `action`, e il `var` resta confinato dentro `conLog`. `evalSicuro` è `total` e non stampa: la stampa spetta al `main`.

## Test e integrazione

I test sono funzioni con prefisso `test`, che l'editor avvia direttamente, e confrontano risultati puri: `evalSicuro` ha già trasformato l'errore in un valore, quindi i test non dipendono dal testo dell'eccezione.

```koka
fun assertEq(nome : string, atteso : a, ottenuto : a) : console ()
  if atteso == ottenuto then
    println("ok   " ++ nome)
  else
    println("FAIL " ++ nome ++ ": " ++ atteso.show ++ " != " ++ ottenuto.show)

fun testEval()
  assertEq("somma", Just(7), evalSicuro(Add(Num(3), Num(4))))
  assertEq("prodotto", Just(12), evalSicuro(Mul(Num(3), Num(4))))
  assertEq("vuota", Nothing, avg([]))

fun testDivisione()
  assertEq("divisione per zero", Nothing, evalSicuro(Div(Num(1), Num(0))))

fun main()
  val (log, r) = conLog(fn() { log("valuto 2 + 3"); eval(Add(Num(2), Num(3))) })
  println("risultato: " ++ r.show)
  log.foreach(fn(m) { println("log: " ++ m) })
```

`testDivisione` non verifica un messaggio, ma il fatto che l'handler abbia convertito l'eccezione in `Nothing`. Il `main` chiude il cerchio: raccoglie il log, lo mostra e resta l'unico punto con effetto `console`.

## Esercizi

1. Aggiungi il caso `Neg(e : expr)` a `expr` e aggiorna `eval`.
2. Implementa `Pow(e : expr, k : int)` con esponente non negativo, usando un accumulatore.
3. Scrivi un parser minimo con due livelli, `somma` e `prodotto`, per l'input `"2 + 3 * 4"`.
4. Fai in modo che `evalSicuro` restituisca un `either<string,int>` con il messaggio.
5. Aggiungi un effetto `trace` che registra solo le operazioni `Mul` visitate.
6. Estendi `conLog` perché restituisca i messaggi in ordine di emissione, non invertito.

<details>
<summary>Soluzione</summary>

1. Si aggiunge `Neg(e : expr)` al tipo e il ramo `Neg(e) -> -eval(e)`; il `match` incompleto viene rifiutato in compilazione.

2. `Pow(e, k)` valuta `e` una volta e accumula con `repeat(k)` o con una ricorsione che dimezza `k`.

3. Un parser ricorsivo discendente con `somma` che legge `prodotto` separata da `+` e `prodotto` che legge `Num` separati da `*` produce l'albero giusto.

4. Il handler restituisce `Right(msg)` e `evalSicuro` costruisce `Left(msg)` invece di `Nothing`: il tipo `either` porta l'errore senza stampare.

5. `effect trace fun traccia(desc : string) : ()` viene invocato nel caso `Mul`; un handler `ctl` che fa `resume(())` misura l'effetto senza alterare il risultato.

6. `Cons(msg, messaggi)` costruisce la lista al contrario: si accumula in coda oppure si inverte con `.reverse`.

</details>

## Errori comuni

- **Stampare dentro il handler di `catch`**: trasforma un calcolo puro in uno con effetto `console` e rende il test legato all'output.
- **Dimenticare un caso nel `match`**: su un tipo chiuso è un errore di compilazione, quindi arriva prima dei test.
- **Usare `var` fuori dal handler**: la mutabilità è un effetto e deve restare confinata dove la si gestisce.
- **Dichiarare `total` una funzione che legge un file**: l'effetto dedotto include `filesys` e la firma non compila.
- **Testare solo il `main`**: ha effetto `console` e non è riutilizzabile; i test vanno sulle funzioni pure.

## In sintesi

- `expr` è un tipo chiuso: ogni nuovo caso impone di rivedere `eval`.
- `eval` dichiara `exn`, `avg` è `total`: la riga di effetto dice chi può fallire.
- `catch` converte l'eccezione in `maybe`, senza terminare il programma.
- L'effetto `log` e il suo handler rendono i messaggi dati testabili.
- Solo il `main` tocca la console: il resto è puro e riutilizzabile.

## Fonti

- [The Koka Programming Language Book](https://koka-lang.github.io/koka/doc/book.html)
- [Koka Standard Library - Core](https://koka-lang.github.io/koka/doc/std_core.html)
- [Koka Standard Library - Exceptions](https://koka-lang.github.io/koka/doc/std_core_exn.html)
- [Koka Standard Library - Handlers](https://koka-lang.github.io/koka/doc/std_core_hnd.html)
