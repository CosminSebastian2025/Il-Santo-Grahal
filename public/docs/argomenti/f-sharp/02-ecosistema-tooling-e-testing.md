Un progetto F# è un progetto .NET come gli altri: `dotnet new`, `.fsproj`, NuGet, `dotnet build` e `dotnet test`. La differenza rispetto a C# sta nei file ordinati del progetto, nelle librerie pensate in stile funzionale e nella REPL `dotnet fsi`, che rende veloce l'esplorazione. In questa lezione vedi com'è fatto l'ecosistema, come si testa e dove F# viene usato in produzione.

## Obiettivi

- Creare e strutturare un progetto F# con `.fsproj` e l'ordine dei file.
- Usare `dotnet fsi`, `dotnet build` e `dotnet test` come ciclo di sviluppo quotidiano.
- Aggiungere pacchetti NuGet tra librerie F#, .NET e wrapper C#.
- Scrivere test con xUnit partendo da un progetto di soluzione.
- Valutare casi d'uso reali: dati e scripting, backend su .NET, interfaccia con C#.

## Struttura del progetto e ordine dei file

In un progetto F# i file sorgente sono dichiarati esplicitamente nel `.fsproj` e compilano nell'ordine elencato: un file può usare solo le definizioni dei file precedenti. Questo ordine è una conseguenza del modello funzionale, in cui i tipi e le funzioni sono definiti prima di essere usati, e non si può aggirare con l'inclusione automatica di directory come in C#.

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
  </PropertyGroup>
  <ItemGroup>
    <Compile Include="Domain.fs" />
    <Compile Include="Core.fs" />
    <Compile Include="Program.fs" />
  </ItemGroup>
  <ItemGroup>
    <PackageReference Include="FSharp.SystemTextJson" Version="1.3.0" />
  </ItemGroup>
</Project>
```

Il template `dotnet new console -lang F#` genera già questa struttura con `Program.fs`. Le cartelle non contengono automaticamente i file: `dotnet add <file>` o l'aggiunta manuale nel `.fsproj` li include, e la soluzione `.sln` raccoglie più progetti, per esempio una libreria e una suite di test. Il pacchetto `FSharp.SystemTextJson` aggiunge il supporto ai tipi F# per il serializzatore JSON standard di .NET.

```bash
dotnet new sln -n Conta
dotnet new console -lang F# -o src/Conta
dotnet new xunit -lang F# -o tests/Conta.Tests
dotnet sln add src/Conta tests/Conta.Tests
dotnet build         # compila in ordine
```

Il file `Program.fs` è di solito l'ultimo, perché contiene il punto di ingresso. Mettere il `main` in un file intermedio è possibile ma impedisce ai successivi di usare tipi definiti dopo: l'ordine va progettato dall'inizio. In pratica si tiene un file per modulo, si mettono i tipi condivisi in cima e si lascia che i nomi esprimano la dipendenza, per esempio `Domain.fs` prima di `Core.fs`.

## Tooling: REPL, formatter e analizzatori

`dotnet fsi` è la REPL ufficiale e la si usa anche come runner di script: un file `.fsx` con `#r "nuget: ..."` carica un pacchetto e permette di provare codice in pochi secondi. Il formatter predefinito è Fantomas, che normalizza indentazione e spaziatura secondo uno stile condiviso e si integra come strumento locale `dotnet tool`.

```fsharp
// script.fsx: prova con dotnet fsi script.fsx
#r "nuget: FSharp.Data, 6.2.0"

open FSharp.Data

let csv = CsvFile.Parse("nome,voto\nAda,30\nAlan,28") // tipo generato in compilazione
for riga in csv.Rows do
    printfn "%s: %d" riga.nome (int riga.voto)
```

```bash
dotnet tool install fsharp.diagnostics --global   # analizzatori del linguaggio
dotnet tool install fantomas --global             # formatter
dotnet fsi script.fsx                             # esegue lo script
dotnet fsi                                        # REPL interattiva
```

L'analizzatore `fsharp.diagnostics` segnala pattern sconsigliati, come l'uso di `mutable` dove basta una ricorsione o il ritorno di `null`. UnirAI a Fantomas dà un ciclo rapido: modifica, formato, test.

| Strumento | Ruolo | Comando |
| --- | --- | --- |
| `dotnet fsi` | REPL e script | `dotnet fsi file.fsx` |
| Fantomas | formatter | `dotnet fantomas .` |
| FSharp.SystemTextJson | serializzazione | `PackageReference` |
| NuGet | pacchetti | `dotnet add package` |
| `dotnet test` | esecuzione test | nella soluzione |

## Testing e interop con .NET

I test sono progetti .NET normali: xUnit (o Expecto) vengono referenziati come pacchetti e il runner `dotnet test` li esegue. F# scrive test compatti con la sintassi `let` a file level o con classi, e il pattern matching rende leggibili le asserzioni sulle union.

```fsharp
module Conta.Tests

open Xunit
open Conta

[<Fact>]
let ``conta righe e parole`` () =
    let c = Core.conta "ciao fsharp\nciao lua"
    Assert.Equal(2, c.Righe) // record con uguaglianza strutturale
    Assert.Equal(4, c.Parole)

[<Theory>]
[<InlineData("42", true)>]
[<InlineData("x", false)>]
let ``parsing e validazione`` testo atteso =
    Assert.Equal(atteso, (Core.parse testo).IsSome)
```

Da C# una libreria F# si usa come una qualunque libreria .NET: si referenzia il progetto, si chiamano i moduli come classi statiche e i record come tipi con costruttori. Per l'interoperabilità conviene marcare pubblicamente i tipi con `[<CLIMutable>]` quando il consumatore C# deve creare record con assegnamenti, e documentare le firme curried con `[<CompiledName>]` se serve un nome diverso.

## Casi d'uso reali

F# eccelle nell'elaborazione dei dati, nei servizi su .NET e nello scripting che deve durare. Le computation expression rendono leggibile il codice asincrono, e le unità di misura impediscono confusioni tra grandezze fisiche. Su Azure le librerie F# permettono di scrivere tabelle e code in modo conciso.

| Contesto | Cosa offre F# | Attenzione |
| --- | --- | --- |
| dati e analytics | scripting con `.fsx`, provider di tipi | meno librerie ML dedicate rispetto a Python |
| backend su .NET | ASP.NET Core, Giraffe, Saturn | team con esperienza C# |
| scripting DevOps | script con `#r` e pacchetti | avvio più lento di uno script Python |
| modellazione di dominio | union e unità di misura | tooling meno diffuso di C# |

La scelta tra F# e C# è spesso di team: chi parte da Java o C# trova in F# una curva ripida sul primo mese, poi stabile. Fissare la versione del linguaggio e dell'SDK nel progetto evita sorprese nella CI. Una buona strategia è introdurre F# in un modulo isolato, per esempio nell'elaborazione dei dati o nei test, e allargare solo dopo che il team ha preso confidenza con gli strumenti.

## Errori comuni

- **Includere i file nell'ordine sbagliato**: il compilatore protesta con errori di nome non trovato che sembrano misteriosi; metti prima i tipi e poi chi li usa.
- **Assumere l'ordine alfabetico dei file**: `.fsproj` definisce l'ordine, non il filesystem, e una riorganizzazione può rompere la build.
- **Ignorare Fantomas**: senza formatter le differenze di stile nel diff nascondono i cambiamenti logici.
- **Testare solo con `.fsx`**: uno script che funziona non prova la CI; i test vanno in un progetto `dotnet test`.
- **Esporre tipi F# senza pensare al consumatore C#**: firme curried e moduli non hanno un binding C# banale, quindi documenta o aggiungi wrapper.

## In sintesi

Un progetto F# è un progetto .NET con file ordinati nel `.fsproj`, build affidata a `dotnet` e pacchetti NuGet. `dotnet fsi` e Fantomas rendono veloce l'esplorazione e uniformano lo stile, mentre xUnit esegue i test nella soluzione. L'interop con C# è completa e gli scenari forti sono dati, backend e scripting. Progetta l'ordine dei file fin dall'inizio e fissa le versioni.

## Fonti

- [Get Started with F#](https://learn.microsoft.com/en-us/dotnet/fsharp/get-started/)
- [F# command-line get started](https://learn.microsoft.com/en-us/dotnet/fsharp/tutorials/getting-started/getting-started-command-line)
- [F# Interactive](https://learn.microsoft.com/en-us/dotnet/fsharp/tools/fsharp-interactive/)
- [Unit testing F# with dotnet test and xUnit](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-fsharp-with-dotnet-test)
- [F# style guide conventions](https://learn.microsoft.com/en-us/dotnet/fsharp/style-guide/conventions)
