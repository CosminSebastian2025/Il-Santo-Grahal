# Settimana 11: Testing, debugging e refactoring

**Obiettivo:** rendere il codice affidabile e facile da modificare.

### Perché testare

Un test automatico verifica che una parte del programma faccia quello che deve. I test:

- si eseguono in pochi secondi;
- ti avvisano quando una modifica rompe qualcosa;
- documentano il comportamento atteso.

In .NET lo strumento più usato è **xUnit**.

```bash
dotnet new xunit -o CorsoCSharp.Tests
cd CorsoCSharp.Tests
dotnet add reference ../CorsoCSharp/CorsoCSharp.csproj
dotnet test
```

### Un primo test

```csharp
using Xunit;

public class CalcolatriceTests
{
    [Fact]
    public void Somma_DuePositivi_RestituisceLaSomma()
    {
        int risultato = Calcolatrice.Somma(3, 4);

        Assert.Equal(7, risultato);
    }
}
```

- `[Fact]` indica un test senza parametri.
- `Assert.Equal(valoreAtteso, valoreOttenuto)` confronta.
- Il nome del test descrive metodo, scenario e risultato atteso.

### Test con parametri

```csharp
[Theory]
[InlineData(6, 7, 8, 7.0)]
[InlineData(0, 0, 0, 0.0)]
[InlineData(10, 10, 10, 10.0)]
public void Media_TreNumeri_RestituisceLaMedia(double a, double b, double c, double atteso)
{
    double risultato = Calcoli.Media(a, b, c);

    Assert.Equal(atteso, risultato, precision: 2);
}
```

`[Theory]` esegue lo stesso test con più input: hai meno duplicazione e più casi coperti.

### Verificare le eccezioni

```csharp
[Fact]
public void Fattoriale_NumeroNegativo_LanciaArgumentException()
{
    Assert.Throws<ArgumentException>(() => Calcoli.Fattoriale(-1));
}
```

### Cosa testare

- i calcoli e le regole di validazione;
- i casi limite: zero, negativo, lista vuota, `null`;
- i metodi che trasformano dati (stringhe, collezioni, file).

I metodi che leggono da `Console` sono difficili da testare: separa la logica (`Calcoli.Media`) dall'input/output (`Program`). Questo è già un primo passo di refactoring.

### Debugging

Un bug è un comportamento diverso da quello atteso. Il debugger serve a fermare il programma e guardare dentro.

In Visual Studio o VS Code:

1. metti un **breakpoint** cliccando a sinistra del numero di riga;
2. avvia con `F5` o dalla configurazione di debug;
3. ispeziona le variabili nel pannello **Locals/Watch**;
4. avanza con **Step Over** (`F10`) e **Step Into** (`F11`);
5. controlla lo **stack delle chiamate**.

Suggerimenti:

- usa un breakpoint **condizionale** quando il ciclo è lungo (`i == 57`);
- leggi il messaggio dell'eccezione e l'ultima riga dello stack trace;
- se un valore è `null`, risali a chi lo ha assegnato;
- non lasciare `Console.WriteLine` di debug nel codice finale;
- `Debug.Assert(condizione, "messaggio")` aiuta durante lo sviluppo.

Errori tipici da saper riconoscere:

| Errore | Causa frequente |
| --- | --- |
| `NullReferenceException` | uso di un oggetto `null` |
| `IndexOutOfRangeException` | indice oltre la fine dell'array |
| `FormatException` | conversione da stringa non valida |
| `InvalidOperationException` | sequenza vuota con `First`, modifica durante `foreach` |
| `KeyNotFoundException` | chiave assente nel `Dictionary` |

### Refactoring

Refactoring significa migliorare il codice **senza cambiare il comportamento**. Esempi:

```csharp
// Prima: numero magico e logica mescolata
double totale = prezzo + prezzo * 0.22;

// Dopo: intenzione chiara
const decimal Iva = 0.22m;
decimal totale = prezzo * (1 + Iva);
```

- **Estrai un metodo** quando un blocco ha bisogno di un commento per essere capito.
- **Rinomina** quando un nome non spiega più cosa fa.
- **Riduci la duplicazione**: tre righe uguali diventano una chiamata.
- **Ritorno anticipato**: meno `else` annidati.
- **Una responsabilità per classe**: una classe che legge file, calcola e stampa è troppo.
- **Metodi corti**: se non entra nello schermo, probabilmente fa troppo.

`dotnet format` applica le convenzioni di stile del progetto:

```bash
dotnet format
```

### Organizzazione del progetto

Una struttura leggibile per un'app console:

```text
CorsoCSharp/
  Program.cs            // solo avvio e menu
  Models/
    Contatto.cs
    Studente.cs
  Services/
    ContattoService.cs
    FileService.cs
  Utilities/
    Validazione.cs
CorsoCSharp.Tests/
  ValidazioneTests.cs
  ContattoServiceTests.cs
```

- `Program.cs` resta sottile: legge input e chiama i servizi.
- Modelli, servizi e utilità hanno una responsabilità chiara.
- I test stanno in un progetto separato.
- I namespace seguono le cartelle: `CorsoCSharp.Services`.

### Errori comuni

- Testare solo il caso felice e non i casi limite.
- Test che dipendono da file, rete o data corrente senza preparazione.
- Test che cambiano il risultato in base all'ordine di esecuzione.
- Refactoring senza test: non hai modo di sapere se hai rotto qualcosa.
- Lasciare codice commentato "per sicurezza": usa Git.
- Menu e logica nello stesso metodo da 300 righe.

## Esercizi progressivi

1. **Testa la media.** Crea un progetto xUnit e testa `Media(double a, double b, double c)` con un `[Fact]` e un `[Theory]` con almeno tre casi, inclusi tutti zeri.
2. **Testa il fattoriale.** Testa `Fattoriale(int n)` per `0`, `1`, `5` e verifica che un numero negativo lanci `ArgumentException`.
3. **Testa la palindroma.** Testa `IsPalindroma(string)` con `[InlineData]`: `"anna"`, `"Ciao"`, `""`, `"I topi non avevano nipoti"`.
4. **Testa l'email.** Testa `IsEmailValida` con casi validi e non validi: `anna@example.com`, `anna@example`, `anna example.com`, `@example.com`.
5. **Refactoring di un `Main` lungo.** Prendi il bancomat della settimana 3 e dividilo in: `LeggiImporto`, `EseguiPrelievo`, `EseguiVersamento`, `StampaMenu`. Il comportamento deve restare identico.
6. **Servizio testabile per l'inventario.** Sposta la logica dell'inventario in `InventarioService` con `Aggiungi`, `Scarica`, `QuantitaDi`. Scrivi almeno quattro test, incluso il caso "scarico più del disponibile".

### Obiettivo della settimana

Prendi il progetto della rubrica (settimana 8) e:

1. separa `Contatto`, `ContattoService` e la persistenza JSON;
2. rendi `Program.cs` un semplice menu;
3. scrivi test per aggiunta, ricerca, rimozione e caricamento da JSON;
4. esegui `dotnet test` e `dotnet format`.

### Varianti

- Aggiungi un test che verifica un file JSON corrotto: il servizio deve restituire una lista vuota o un errore controllato.
- Misura la copertura con `dotnet test --collect:"XPlat Code Coverage"`.
- Aggiungi un'asserzione `Debug.Assert` nel punto in cui un'operazione non dovrebbe mai ricevere un valore negativo.
