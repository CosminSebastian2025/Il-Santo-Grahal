OCaml è un linguaggio funzionale con tipi statici e inferenza, compilato nativamente e con garbage collection automatica. Il suo carattere deriva da una scelta radicale: quasi tutto è un'espressione con un valore, e le funzioni sono valori come gli altri. In questa lezione impari le espressioni di base, la definizione di funzioni, il pattern matching e il modello di esecuzione nativo prima di toccare progetti veri.

## Obiettivi

- Distinguere le espressioni (che hanno un valore) dalle definizioni (`let`) e dalla struttura di un programma.
- Scrivere funzioni ricorsive e curried, leggendone il tipo inferito.
- Usare il pattern matching su varianti, liste e tuple senza scrivere annotazioni superflue.
- Comprendere come il codice sorgente diventa un eseguibile nativo e quando serve il toplevel.
- Riconoscere il ruolo dell'immutabilità e delle strutture di dati persistenti.

## Espressioni, valori e tipi

In OCaml ogni frammento di codice produce un valore. I tipi primitivi sono `int`, `float`, `string`, `char`, `bool` e `unit`, dove `unit` indica "nessun valore interessante" ed è scritto `()`. Le stringhe si concatenano con `^`, mentre `+` è riservato agli interi: `1.0 +. 2.0` usa l'operatore float.

```ocaml
let saluto = "ciao" ^ " mondo"  (* string *)
let doppio = 2 * 21             (* int *)
let pi = 3.14                   (* float: attenzione, + richiede int *)

(* let binding: non è una variabile mutabile, ma un nome per un valore *)
let limite = 10
let messaggio = if doppio > limite then "grande" else "piccolo"
```

Il tipo non viene dichiarato: il compilatore lo deduce dalle operazioni usate. Una funzione si scrive con `let nome parametri = corpo`, e la parola `fun` serve per funzioni anonime passate come argomenti. La ricorsione deve essere dichiarata con `rec`, perché il nome non è visibile dentro la propria definizione.

```ocaml
let rec fattoriale n = if n = 0 then 1 else n * fattoriale (n - 1)
(* val fattoriale : int -> int *)

let incr x = x + 1
let somma a b = a + b
let somma5 = somma 5    (* applicazione parziale: somma5 : int -> int *)
```

OCaml è curried: `somma a b` equivale a `(somma a) b`, quindi ogni funzione con più argomenti può essere parzialmente applicata. Le parentesi servono solo a raggruppare, non a segnalare l'applicazione.

## Pattern matching e strutture dati

Le **varianti** sono tipi somma dichiarati con `type`, e il pattern matching li scompone in modo esaustivo. Il compilatore segnala un `match` incompleto come warning: ignorarlo è una scelta da fare una volta, non un'abitudine.

```ocaml
type forma =
  | Cerchio of float
  | Rettangolo of float * float

let area = function
  | Cerchio r -> 3.14159 *. r *. r
  | Rettangolo (b, h) -> b *. h
(* val area : forma -> float *)
```

`function` è una scorciatoia per `fun x -> match x with`. Le liste sono un tipo ricorsivo noto al compilatore: `::` costruisce, `[]` è la lista vuota e i pattern `x :: resto` consumano un elemento alla volta.

| Costrutto | Sintassi | Note |
| --- | --- | --- |
| Tupla | `(1, "a", true)` | dimensione fissa, tipi diversi |
| Lista | `[1; 2; 3]` | omogenea, immutabile |
| Record | `{ nome; eta }` | campi nominati, tipo dichiarato |
| Variante | `Cerchio 2.0` | casi alternativi di un `type` |
| Option | `Some 3` / `None` | assenza esplicita di valore |

```ocaml
let rec lunghezza = function
  | [] -> 0
  | _ :: coda -> 1 + lunghezza coda

let primo_elemento = function
  | [] -> None          (* option: assenza dichiarata nel tipo *)
  | x :: _ -> Some x
```

Le strutture sono immutabili e persistenti: `1 :: lista` crea una nuova lista che condivide la coda con l'originale. Questa condivisione rende le liste economiche e spiega perché le funzioni ricorsive sono preferibili ai cicli.

## Modello di esecuzione

Un programma OCaml viene compilato in codice nativo su x86 o ARM con `ocamlopt`, oppure in bytecode portabile con `ocamlc`. In entrambi i casi esiste un runtime con garbage collector generazionale che gestisce l'occupazione di memoria senza che tu debba liberarla.

| Modalità | Comando | Produzione |
| --- | --- | --- |
| Nativa | `ocamlopt` | eseguibile autonomo, velocità piena |
| Bytecode | `ocamlc` | eseguibile portabile, più lento |
| Toplevel | `ocaml` o `utop` | REPL per esperimenti |

Il punto d'ingresso è l'espressione finale del modulo `main.ml`: di solito è `let () = ...`, un pattern che si confronta con il risultato. Se l'espressione produce `unit` non succede nulla, altrimenti il compilatore segnala un valore ignorato.

```bash
# compilazione di un singolo file, senza progetto
ocamlfind ocamlopt -o saluto saluto.ml
./saluto
```

Un file `.ml` è anche un modulo: `saluto.ml` diventa `Saluto` e gli dà uno spazio dei nomi. Le funzioni non vincolate da un'interfaccia `.mli` sono esposte, quindi le interfacce servono a nascondere i dettagli. Per progetti reali non si invoca il compilatore a mano: ci pensa dune.

## Errori comuni

- **Dimenticare `rec`**: dentro una definizione il nome della funzione non esiste e il compilatore segnala un identificatore non vincolato.
- **Usare `+` con i float**: gli operatori esatti sono `+.`, `-.`, `*.` e `/.`; i due set non si mescolano.
- **Interpretare `let` come assegnazione**: `let x = 1 in ...` introduce un nuovo legame, non modifica quello esterno.
- **Ignorare il warning `match` incompleto**: a runtime produce `Match_failure`, difficile da spiegare in produzione.
- **Scrivere cicli come nei linguaggi imperativi**: senza `ref` gli accumulatori non cambiano, e la ricorsione è la forma idiomatica.

## In sintesi

OCaml è un linguaggio a espressioni con tipi statici inferiti: il compilatore conosce ogni tipo senza che tu lo scriva. Le funzioni sono curried e la ricorsione va dichiarata con `rec`. Varianti e pattern matching rendono l'analisi dei casi esplicita e verificabile. Il codice compila in nativo con garbage collection, e ogni file `.ml` è già un modulo con una propria interfaccia.

## Fonti

- [OCaml: Values and Functions](https://ocaml.org/docs/values-and-functions), introduzione a `let`, funzioni e astrazione.
- [OCaml: Basic Data Types](https://ocaml.org/docs/basic-data-types), varianti, record, tuple e liste.
- [OCaml Manual](https://ocaml.org/manual/), riferimento del linguaggio e degli operatori standard.
- [OCaml: Installing OCaml](https://ocaml.org/docs/installing-ocaml), installazione del compilatore e del toplevel.
