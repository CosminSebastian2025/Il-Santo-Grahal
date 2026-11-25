In questo laboratorio costruisci `fsharp-conta`, una CLI .NET che legge un file o stdin e stampa righe, parole, byte e le parole più frequenti, scritta in F# con la sola libreria standard. Il progetto segue la struttura tipica di un'applicazione F#: un file per il dominio, uno per il core puro, uno per l'interfaccia e uno per i test. Alla fine avrai una build `dotnet` riproducibile e una suite xUnit sulle funzioni pure.

## Obiettivi

- Separare il dominio, il core puro e l'I/O in file con l'ordine corretto nel `.fsproj`.
- Rappresentare opzioni ed errori con record e `Result` invece di eccezioni.
- Contare righe, parole e frequenze con `List` e `Seq` senza stato mutabile.
- Scrivere test xUnit che coprono il testo, le opzioni e i codici di uscita.
- Eseguire il programma su stdin e file verificando il contratto della shell.

## Il contratto di `fsharp-conta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `fsharp-conta [OPZIONI] [FILE]` | senza file legge stdin |
| `-n, --top N` | intero >= 1, default 5 | limite di stampa |
| `--json` | output su una riga | consumo da script |
| exit 0 | successo | anche con conteggi a zero |
| exit 1 | file mancante o opzione invalida | errore operativo |

Senza argomenti e con stdin vuoto il programma stampa zeri ed esce con 0: il vuoto è un risultato. Il file che non si apre è invece un errore operativo, scritto su stderr.

```bash
dotnet build
printf 'ciao fsharp ciao\n' | dotnet run --project src/Conta -- -n 2
dotnet run --project src/Conta -- /non/esiste; echo "exit: $?"
dotnet test    # suite xUnit
```

## Dominio e core puro

Il file `Domain.fs` definisce i tipi condivisi; il file `Core.fs` contiene solo funzioni pure che ricevono testo e restituiscono valori. Nessuna funzione del core legge file o stampa, quindi i test possono chiamarle direttamente.

```fsharp
module Conta.Domain

type Conteggi =
    { Righe: int
      Parole: int
      Byte: int }

type Opzioni =
    { Top: int
      Json: bool
      File: string option } // None significa stdin
```

Il tipo `string option` rende esplicito nel dominio che il file è facoltativo; non c'è modo di dimenticare il caso `None`. Il core segue lo stesso principio: ogni funzione ha un solo lavoro e un tipo di ritorno che ne descrive il risultato.

```fsharp
module Conta.Core

open Conta.Domain

let tokenizza (testo: string) : string list =
    testo.Split([| ' '; '\t'; '\r'; '\n' |], System.StringSplitOptions.RemoveEmptyEntries)
    |> List.ofArray // lista immutabile, niente token vuoti

let conta (testo: string) : Conteggi =
    let righe =
        if System.String.IsNullOrEmpty testo then 0 // nessun testo, nessuna riga
        else
            let n = testo.Split('\n').Length
            if testo.EndsWith "\n" then n - 1 else n // ultima riga senza a capo
    let parole = tokenizza testo
    { Righe = righe
      Parole = List.length parole
      Byte = System.Text.Encoding.UTF8.GetByteCount testo }

let frequenze (testo: string) (top: int) : (string * int) list =
    tokenizza testo
    |> List.countBy id // associa ogni parola al numero di occorrenze
    |> List.sortBy (fun (parola, n) -> -n, parola) // legami in ordine alfabetico
    |> List.take (min top (List.length parole)) // top non supera le parole
```

`List.countBy` fa il conteggio in una passata, e `List.sortBy` su una tupla confronta prima il conteggio negativo e poi la parola: i legami sono deterministici e i test non diventano fragili. La funzione che rispecchia il contratto CLI vive in `Cli.fs`.

```fsharp
module Conta.Cli

open Conta.Domain

type Esito =
    | Ok of conteggi: Conteggi * top: (string * int) list
    | Errore of messaggio: string

let esegui (opzioni: Opzioni) (testo: string) : Esito =
    let c = Core.conta testo
    let top = if opzioni.Json then Core.frequenze testo opzioni.Top else []
    Ok(c, top)

let parse (args: string list) : Result<Opzioni, string> =
    let iniziale = Ok { Top = 5; Json = false; File = None }
    let aggiorna stato arg =
        match stato, arg with
        | Error _, _ -> stato // l'errore resta l'errore
        | Ok _, "-n" | Ok _, "--top" -> stato // il valore si gestisce sotto
        | Ok o, "--json" -> Ok { o with Json = true }
        | Ok o, a when a.StartsWith "-" -> Error $"opzione sconosciuta: {a}"
        | Ok o, a when o.File.IsNone -> Ok { o with File = Some a }
        | Ok _, a -> Error $"troppi argomenti: {a}"
    (iniziale, args) ||> List.fold aggiorna // da completare negli esercizi
```

`parse` piega gli argomenti con `List.fold`, restituendo `Error` sui casi invalidi; il caso `Ok _, "-n"` è volutamente lasciato agli esercizi, perché richiede di leggere l'elemento successivo. L'intero `Program.fs` contiene solo la lettura di stdin e la traduzione dell'esito in output e codice di uscita.

```fsharp
module Conta.Program

open System
open Conta.Domain
open Conta.Cli

[<EntryPoint>]
let main args =
    match Cli.parse (Array.toList args) with
    | Error msg ->
        eprintfn "fsharp-conta: %s" msg
        1 // codice di uscita leggible dalla shell
    | Ok opzioni ->
        let testo =
            match opzioni.File with
            | Some percorso -> IO.File.ReadAllText percorso // eccezione catturata sotto
            | None -> Console.In.ReadToEnd()
        match Cli.esegui opzioni testo with
        | Ok(c, top) ->
            printfn "%d %d %d" c.Righe c.Parole c.Byte
            top |> List.iter (fun (w, n) -> printfn "%d\t%s" n w)
            0
        | Errore msg ->
            eprintfn "fsharp-conta: %s" msg
            1
```

Il punto di ingresso restituisce un intero, che .NET usa come codice di uscita. Gestire `IO.File.ReadAllText` dentro `main` lascia le eccezioni fuori dal core, dove l'interop .NET le usa di routine.

## Test e criterio di uscita

I test stanno in un progetto separato che referenzia il progetto principale; xUnit esegue ogni funzione di test marcata con `[<Fact>]` o con parametri `[<Theory>]`. I record e le union hanno uguaglianza strutturale, quindi `Assert.Equal` funziona sui valori composti.

```fsharp
module Conta.Tests

open Xunit
open Conta
open Conta.Domain

[<Fact>]
let ``conta righe e parole`` () =
    let c = Core.conta "ciao fsharp\nciao lua"
    Assert.Equal({ Righe = 2; Parole = 4; Byte = 18 }, c)

[<Fact>]
let ``input vuoto`` () =
    Assert.Equal(0, (Core.conta "").Righe)

[<Fact>]
let ``frequenze ordinate e stabili`` () =
    Assert.Equal<(string * int) list>(
        [ "a", 2; "b", 2 ],
        Core.frequenze "b a b a" 2) // il legame va su "a" < "b"

[<Theory>]
[<InlineData(0, false)>]
[<InlineData(1, true)>]
let ``top valido solo se maggiore di zero`` valore atteso =
    let opzioni : Result<Opzioni, string> = Cli.parse [ "--top"; string valore ]
    Assert.Equal(atteso, Result.isOk opzioni)
```

Il contratto da verificare a mano è breve: `printf '' | fsharp-conta` deve dare `0 0 0` ed exit 0; `fsharp-conta /non/esiste` deve uscire con 1 e scrivere su stderr. Annota questi due comandi in un breve runbook e ripetili dopo ogni modifica del parser.

## Esercizi

1. Rendi `tokenizza` sensibile al contesto: oggi divide sempre sugli spazi, aggiungi un test che verifichi che `"a\n\n  b"` produca `[ "a"; "b" ]` e non token vuoti.
2. Implementa `Cli.parse` con `List.fold`: riconosci `-n` e `--top` con il valore successivo, `--json`, un argomento come file e restituisci `Error` su flag sconosciuti.
3. Rendi `--json` stabile con i campi `righe`, `parole`, `byte` e `top`, e scrivi un test che ne fissi l'ordine.
4. Leggi a blocchi da 8 KiB con `StreamReader` invece di `ReadToEnd`: quali funzioni del core devono cambiare per contare senza caricare tutto?
5. Gestisci `IO.File.ReadAllText` con `try ... with` e mappalo su `Errore`, scrivendo un test che usi un percorso inesistente.
6. Aggiungi una `Async` function per leggere da stdin e confronta l'avvio con la lettura sincrona: cosa cambia nel codice e nel tipo?

<details>
<summary>Soluzione</summary>

1. `testo.Split([| ' '; '\t'; '\r'; '\n' |], System.StringSplitOptions.RemoveEmptyEntries) |> List.ofArray` scarta i token vuoti in una sola chiamata; il test usa `"a\n\n  b"` e si aspetta `[ "a"; "b" ]`.

2. La `fold` accumula un `Result`: se lo stato è già `Error` lo lascia passare, su `-n` prende il valore seguente con `Int32.TryParse` e controlla che sia `>= 1`, su `--json` attiva il flag, quale argomento non flag diventa `File = Some`, altrimenti restituisce `Error $"opzione sconosciuta: {arg}"`.

3. Interpola i campi nell'ordine fisso e scrivi `top` come coppie tra quadre. Il test confronta l'intera riga, quindi qualsiasi cambio di ordine o spaziatura lo rompe.

4. Il core deve accettare una `seq<string>` di righe o un `seq<int>` di conteggi per blocco: `conta` somma i parziali e `frequenze` accumula con `List.countBy` per blocco più un `groupBy` finale.

5. `try IO.File.ReadAllText percorso with ex -> Error ex.Message` in una funzione dedicata; il test verifica che `main` restituisca 1 e che il messaggio non sia vuoto.

6. `Async` restituisce `Async<Esito>` e il `main` può usare `Async.RunSynchronously` o rendere l'`EntryPoint` asincrono con `Task`; il guadagno è marginale per stdin locale, ma il tipo riflette l'I/O.

</details>

## Errori comuni

- **Mettere il file di dominio dopo il core nel `.fsproj`**: il compilatore non conosce i tipi e l'errore sembra un refuso; l'ordine è significativo.
- **Leggere stdin dentro le funzioni del core**: i test diventano dipendenti dall'ambiente e la funzione non è più pura.
- **Dimenticare `List.take` su una lista corta**: se `top` supera la lunghezza, il risultato cambia senso; limita con `min`.
- **Usare eccezioni per un input non valido**: `Result` rende il caso parte della firma e il chiamante non può ignorarlo.
- **Testare solo i casi felici**: l'input vuoto, il file mancante e `--top 0` sono quelli che rompono le pipeline.

## In sintesi

Hai separato dominio, core puro, interfaccia e test in file ordinati, e il `main` contiene solo la lettura e il codice di uscita. Le liste immutabili con `List.countBy` e un ordinamento totale rendono i risultati deterministici e i test semplici. Il `Result` esplicita gli errori del parser, mentre l'I/O resta confinato nel `main`. Il passo successivo è la lettura a blocchi, che sposta l'attenzione dal testo completo ai conteggi incrementali.

## Fonti

- [Get Started with F#](https://learn.microsoft.com/en-us/dotnet/fsharp/get-started/)
- [Records](https://learn.microsoft.com/en-us/dotnet/fsharp/language-reference/records)
- [Unit testing F# with dotnet test and xUnit](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-fsharp-with-dotnet-test)
- [F# style guide formatting](https://learn.microsoft.com/en-us/dotnet/fsharp/style-guide/formatting)
- [F# Interactive](https://learn.microsoft.com/en-us/dotnet/fsharp/tools/fsharp-interactive/)
