Koka è un linguaggio funzionale fortemente tipizzato creato da Daan Leijen ai Microsoft Research Labs, pensato per rendere gli effetti collaterali una parte visibile del sistema di tipi. Una funzione che legge un file o genera numeri casuali lo dichiara nel proprio tipo, e chi la chiama può decidere se eseguirla, isolarla o trasformarla tramite gli handler. In questa lezione impari la sintassi di base, i tipi algebrici e il modo in cui Koka deduce e propaga gli effetti.

## Obiettivi

- Scrivere funzioni e costrutti di controllo esprimendo espressioni invece di istruzioni.
- Usare i tipi algebrici con `type` e il pattern matching con `match`.
- Leggere la riga di effetto che appare nei tipi e capire quando è vuota.
- Distinguere `val` da `var` e sapere perché la mutazione è un effetto.
- Scrivere funzioni ricorsive e usare le liste e le comprehension di Koka.

## Funzioni, valori e controllo di flusso

In Koka tutto è un'espressione e il corpo di una funzione restituisce un valore. Le funzioni si dichiarano con `fun`, i parametri hanno tipi inferibili, e i blocchi si compongono allineando le righe nella stessa colonna, come in Python.

```koka
// Il tipo è inferito, ma può essere scritto esplicitamente
fun somma(x : int, y : int) : int
  x + y

fun classifica(n : int) : string
  match n
    0 -> "zero"
    _ | n < 0 -> "negativo"
    _ -> if n % 2 == 0 then "pari" else "dispari"

fun main()
  println("somma: " ++ (somma(2, 3)).show)
  println(classifica(42))   // "pari"
```

`fun` ammette più clausole di pattern matching, `if` è un'espressione e `.show` trasforma un valore in stringa. La ricorsione è il meccanismo naturale per iterare, e Koka elimina le chiamate in coda quando possibile.

| Costrutto | Sintassi | Nota |
| --- | --- | --- |
| funzione | `fun nome(x : int) : int` | il corpo è un'espressione |
| valore | `val x = 3` | immutabile |
| variabile | `var m := 0` | mutazione: effetto `var` |
| `if` | `if c then a else b` | entrambi i rami hanno lo stesso tipo |
| `match` | `match v { p -> e }` | esaustivo sui tipi algebrici |
| comprehension | `[ f(x) | x <- xs ]` | su liste e vettori |

## Tipi algebrici e pattern matching

`type` introduce un tipo nominato con costruttori, e i campi possono essere tipizzati oppure ricavati per posizione. I tipi ricorsivi come `Expr` sono la base di un piccolo interprete.

```koka
type colore
  Rosso
  Verde
  Blu

type expr
  Num(n : int)
  Add(l : expr, r : expr)
  Mul(l : expr, r : expr)

// Ritorna un maybe: Just v oppure Nothing
fun valuta(e : expr) : total maybe<int>
  match e
    Num(n) -> Just(n)
    Add(l, r) -> match (valuta(l), valuta(r))
      (Just(a), Just(b)) -> Just(a + b)
      _ -> Nothing
    Mul(l, r) -> match (valuta(l), valuta(r))
      (Just(a), Just(b)) -> Just(a * b)
      _ -> Nothing
```

Il pattern matching su tuple permette di valutare entrambi i sottoalberi e combinare i risultati. `total` indica che la funzione non ha effetti: nessuna eccezione implicita, nessuno stato, nessuna lettura dall'esterno.

## Effetti dedotti nei tipi

Il vero carattere di Koka è la riga di effetto. Una funzione con tipo `unit` è pura; `console` significa che scrive o legge dal terminale; `var` contiene una mutazione locale. Il compilatore deduce gli effetti dal corpo e obbliga il chiamante a dichiararli o a gestirli.

```koka
// Legge e stampa: effetto `console`, dedotto senza annotazioni
fun saluta(nome : string)
  println("Ciao, " ++ nome)

// Purificata: la funzione non mostra console ai chiamanti
fun salutaTutti(nomi : list<string>)
  [ saluta(n) | n <- nomi ].foreach(fn(_) ())

// Mutazione locale confinata
fun contaLoop(n : int) : int
  var acc := 0
  for(1, n) fn(i)
    acc := acc + i
  acc
```

`for` è un costrutto di Koka che applica una funzione a ogni valore di un intervallo, e contiene l'effetto `var` dentro la funzione: chi chiama `contaLoop` vede solo `int`. Sezioni di codice che leggono la console o generano casualità si comportano allo stesso modo.

## Handlers: eseguire e trasformare gli effetti

Un handler intercetta le operazioni di un effetto e ne decide il significato. Il caso classico è `exn`, l'effetto dell'eccezione: un handler globale in `run-exn` cattura il throw e lo trasforma in un `result`.

```koka
// Rilancio controllato: il fallimento diventa un valore
fun dividi(a : int, b : int) : exn int
  if b == 0 then throw("divisione per zero") else a / b

fun dividiSicuro(a : int, b : int) : maybe<int>
  match run-exn
    fn()
      dividi(a, b)
  Exn(msg) -> Nothing
  Result(v) -> Just(v)
```

Handlers definiti con `handler` possono anche contare gli effetti, scrivere su un log virtuale e riprodurre il controllo. Le stesse operazioni restano nel tipo, quindi il compilatore mostra quali funzioni sono pure (`total`) e quali possono fallire o interagire con il mondo.

## Errori comuni

- **Scrivere sequenze senza allineamento**: i blocchi di Koka dipendono dalla colonna, e una riga spostata cambia il significato del programma.
- **Dimenticare che `var` è un effetto**: una variabile mutabile confina il tipo, e funzioni pure non possono chiamare codice che la usa.
- **Confondere `maybe` e `exn`**: `maybe` rappresenta assenza di risultato, `exn` il fallimento, e mescolarli rende il tipo difficile da leggere.
- **Scrivere `match` senza caso `_` su tipi aperti**: i tipi algebrici esaustivi sono controllati, ma un caso mancante è un errore di compilazione.
- **Ignorare la riga di effetto nei documenti**: è l'informazione che dice chi deve gestire la console, il tempo o l'eccezione.

## In sintesi

Koka è funzionale, espressivo e con un sistema di tipi che tiene traccia degli effetti. I tipi algebrici e il pattern matching danno un modello dei dati sicuro, mentre `total`, `console` ed `exn` dicono esattamente cosa può fare una funzione. Gli handler rendono gli effetti componibili: si possono eseguire, isolare o trasformare in valori. Imparare a leggere la riga di effetto è il primo passo per capire Koka.

## Fonti

- [Koka - Documentation](https://koka-lang.github.io/koka/doc/index.html)
- [The Koka Programming Language Book](https://koka-lang.github.io/koka/doc/book.html)
- [Koka Language Specification](https://koka-lang.github.io/koka/doc/spec.html)
- [Koka Standard Library - Core](https://koka-lang.github.io/koka/doc/std_core.html)
