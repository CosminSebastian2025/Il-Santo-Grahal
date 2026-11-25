F# è un linguaggio funzionale multiparadigma che gira su .NET e su JavaScript, con accesso completo alle librerie dell'ecosistema .NET e a C#. La sintassi è leggera, l'inferenza dei tipi è profonda e le funzioni sono valori di prima classe; l'immutabilità è la scelta predefinita e il compilatore segnala i casi non trattati. In questa lezione impari i costrutti essenziali con cui si scrive un programma F# idiomatico.

## Obiettivi

- Leggere e scrivere funzioni con inferenza dei tipi, `let` e pipe `|>`.
- Distinguere tra tuple, record e discriminated union come strumenti di modellazione.
- Usare il pattern matching, incluse le forme `function`, con esaustività garantita.
- Scegliere tra `option`, `Result` ed eccezioni per il flusso di controllo.
- Trasformare liste e sequenze con funzioni di ordine superiore e currying.

## Funzioni, valori e inferenza

In F# un binding si introduce con `let`, il tipo si inferisce dal corpo e dalle chiamate, e lo si precisa con `:` solo dove serve chiarezza. Il segnaposto `_` indica un valore ignorato, l'uguale chiude il binding. Ogni funzione è curryfied: riceve un argomento alla volta e la pipe `|>` passa il valore a sinistra come ultimo argomento della funzione a destra.

```fsharp
// le funzioni sono valori; il tipo si inferisce
let doppio x = x * 2
let incrementa y = y + 1

let composta = doppio >> incrementa // composizione: doppio e poi incrementa

let numeri = [ 1; 2; 3; 4 ]
let risultato =
    numeri
    |> List.map doppio
    |> List.filter (fun n -> n > 2) // lambda
    |> List.sum

printfn "composta 3 = %d, somma = %d" (composta 3) risultato
```

L'ultima espressione di un blocco è il valore del blocco: non serve `return`. L'indentazione è significativa, come in Python, ma il compilatore è quello di .NET e produce codice che gira sul CLR. Una chiamata `doppio 3` scrive l'argomento senza parentesi; le parentesi servono per raggruppare.

| Costrutto | Sintassi | Nota |
| --- | --- | --- |
| binding | `let x = 42` | immutabile per default |
| binding mutabile | `let mutable n = 0` | raro nel codice idiomatico |
| funzione | `let somma a b = a + b` | curried: `somma 1 2` |
| lambda | `fun x -> x * 2` | oppure `_ * 2` in alcuni contesti |
| pipe | `valore \|> f` | `f valore` |
| composizione | `f >> g` | applica prima `f` poi `g` |
| unit | `()` | il "niente" tipizzato |

Il tipo `unit` con valore `()` sostituisce `void`: una funzione che stampa ha tipo `unit -> unit`. Le eccezioni in F# esistono e si interoperano con .NET, ma il linguaggio preferisce rappresentare i fallimenti nei valori, lasciando le eccezioni ai confini con librerie che le usano come contratto.

## Modellare i dati

F# ha tre strumenti principali: record, discriminated union e tuple. I record sono strutture nominali con campi nominati e uguaglianza strutturale, le union rappresentano uno tra più casi possibili, le tuple servono per raggruppamenti ad hoc senza un nome.

```fsharp
type Utente = { Nome: string; Eta: int } // record immutabile

type Ruolo =
    | Admin
    | Cliente
    | Editor of livello: int // caso con dati e nome di campo

type Risultato =
    | Ok of int
    | Errore of motivo: string

let utente = { Nome = "Ada"; Eta = 36 }
let aggiornato = { utente with Eta = 37 } // copy con un campo cambiato

let descrivi (r: Ruolo) =
    match r with
    | Admin -> "amministratore"
    | Cliente -> "cliente"
    | Editor livello -> $"editor di livello {livello}"
```

La sintassi `with` crea un nuovo record a partire da uno esistente, senza mutare l'originale. I casi di una union formano un insieme chiuso: se aggiungi un caso e dimentichi un ramo nel `match`, il compilatore genera un avviso o un errore. Questa proprietà rende le union più sicure di una gerarchia di classi aperta.

| Tipo | Usa per | Esempio |
| --- | --- | --- |
| record | prodotti con campi nominati | `{ Nome: string; Eta: int }` |
| union | scelte chiuse di casi | `Admin \| Cliente` |
| tuple | ritorno multiplo ad hoc | `(int * string)` |
| struct | valori senza indirezione | `[<Struct>] type Punto = ...` |

## Pattern matching ed errori

Il pattern matching è il cuore del controllo di flusso. Funziona su record, union, tuple, liste e valori guardati da `when`. Il costrutto `function` è una scorciatoia per una lambda con un solo argomento già `matchato`.

```fsharp
let classifica (punteggio: int) =
    match punteggio with
    | n when n >= 90 -> "A"
    | n when n >= 75 -> "B"
    | n when n >= 60 -> "C"
    | _ -> "D"

// function: lambda che fa match sull'argomento
let nomeCaso = function
    | [] -> "vuota"
    | [ x ] -> $"un solo elemento: {x}"
    | lista -> $"{List.length lista} elementi"

let parseSicuro (testo: string) : int option =
    match System.Int32.TryParse testo with
    | true, valore -> Some valore // vero parsing, senza eccezioni
    | false, _ -> None

let esito : Result<int, string> =
    match parseSicuro "42" with
    | Some v -> Ok v
    | None -> Error "non numerico"
```

`option` esprime l'assenza, `Result` esprime il fallimento con un motivo, e il `match` obbliga a trattare entrambi i rami. Così le funzioni dichiarano nei tipi cosa può andare storto e i chiamanti non possono ignorarlo. I wrapper come `Option.map`, `Option.defaultValue` e `Result.map` riducono gli annidamenti, allo stesso modo di Scala.

## Liste, sequenze e funzioni di ordine superiore

`List` è una lista immutabile con pattern matching efficiente in testa, `Array` è il vettore mutabile, e `seq` è una sequenza pigra. Le funzioni di ordine superiore lavorano su tutte, e la lazy evaluation di `seq` evita di materializzare dati intermedi.

```fsharp
let prezzi = [ ("penna", 1.20); ("quaderno", 2.80); ("gomma", 0.90) ]

let totale =
    prezzi
    |> List.map snd
    |> List.sum

let cari =
    prezzi
    |> List.filter (fun (_, p) -> p > 1.0) // pattern sul pair
    |> List.map fst

let primiQuattro =
    seq { 1 .. 100 } // sequenza pigra
    |> Seq.filter (fun n -> n % 2 = 0)
    |> Seq.take 4
    |> Seq.toList

let perPrefisso =
    prezzi
    |> List.groupBy (fun (n, _) -> n.Substring(0, 1))
```

`List.groupBy` restituisce una lista di coppie chiave-valori, tipica di un conteggio o di una classificazione. Il costrutto `seq { ... }` è una computation expression: descrive una sequenza calcolata solo quando viene consumata. Le funzioni `printfn` con formato `%d`, `%s` e `%.2f` verificano a compilazione che gli argomenti corrispondano.

## Errori comuni

- **Usare `let mutable` per accumulare in una lista**: `List.fold` o `List.sum` esprimono la stessa cosa senza stato mutabile.
- **Aprire gerarchie di classi dove basta una union**: una `discriminated union` dà esaustività e un `match` obbligatorio, e resta estensibile nel proprio modulo.
- **Restituire `null` da codice F#**: le union e i record non sono pensati per `null`, che sfugge ai controlli e si propaga solo dall'interop.
- **Applicare una formula come `printfn "%d" f`**: manca il valore; il formato va chiamato con `printfn "%d" (f x)` perché gli argomenti extra sono curryfied.
- **Confondere `=` con `<-`**: `=` è il confronto strutturale, l'assegnamento esiste solo su binding `mutable` e si scrive `<-`.

## In sintesi

F# rende leggeri i binding e potenti le funzioni, con inferenza dei tipi e pipe per comporre. Record e discriminated union descrivono i dati con uguaglianza strutturale e controllo di esaustività nei `match`. `option` e `Result` rendono espliciti nei tipi i casi previsti, mentre liste, array e sequenze si trasformano con funzioni di ordine superiore. Tutto gira sul CLR e interopera con l'ecosistema .NET.

## Fonti

- [What is F#](https://learn.microsoft.com/en-us/dotnet/fsharp/what-is-fsharp)
- [Tour of F#](https://learn.microsoft.com/en-us/dotnet/fsharp/tour)
- [F# Language Reference](https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/)
- [Discriminated Unions](https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/discriminated-unions)
- [Records](https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/records)
