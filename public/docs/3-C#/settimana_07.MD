# Settimana 7: Eccezioni e file

**Obiettivo:** gestire gli errori senza far crashare il programma e salvare dati su disco.

### Le eccezioni

Un'eccezione è un errore che interrompe il flusso normale. In C# si gestisce con `try`/`catch`:

```csharp
try
{
    Console.Write("Numero: ");
    int n = int.Parse(Console.ReadLine() ?? "");
    Console.WriteLine($"Il doppio è {n * 2}");
}
catch (FormatException)
{
    Console.WriteLine("Devi scrivere un numero.");
}
catch (OverflowException)
{
    Console.WriteLine("Numero troppo grande.");
}
finally
{
    Console.WriteLine("Fine del tentativo.");
}
```

- `try` contiene il codice che può fallire.
- `catch` intercetta un tipo specifico di errore.
- `finally` viene eseguito sempre, anche se c'è stato un errore.
- Catturare `Exception` generica va bene solo come ultima rete di sicurezza.

### Sollevare un'eccezione

```csharp
static decimal CalcolaSconto(decimal prezzo, int percentuale)
{
    if (percentuale < 0 || percentuale > 100)
    {
        throw new ArgumentOutOfRangeException(nameof(percentuale), "La percentuale deve essere tra 0 e 100");
    }

    return prezzo * (100 - percentuale) / 100;
}
```

Un metodo deve sollevare un'eccezione quando riceve un dato che non può gestire. Chi chiama decide se correggere l'input o interrompere il programma.

### Eccezioni personalizzate

```csharp
class SaldoInsufficienteException : Exception
{
    public SaldoInsufficienteException(decimal mancante)
        : base($"Saldo insufficiente: mancano {mancante:F2} €")
    {
    }
}
```

Poi:

```csharp
try
{
    conto.Preleva(1000m);
}
catch (SaldoInsufficienteException ex)
{
    Console.WriteLine(ex.Message);
}
```

### Non usare le eccezioni per il flusso normale

Se un input può essere sbagliato spesso, usa `TryParse` o un `bool`. Le eccezioni servono per situazioni eccezionali, non per ogni controllo.

### Scrivere e leggere file

La classe `File` offre metodi pronti:

```csharp
string percorso = "note.txt";

File.WriteAllText(percorso, "Prima nota");
File.AppendAllText(percorso, Environment.NewLine + "Seconda nota");

string contenuto = File.ReadAllText(percorso);
Console.WriteLine(contenuto);
```

Se il file non esiste, `ReadAllText` solleva `FileNotFoundException`: controlla prima con `File.Exists`.

```csharp
if (File.Exists(percorso))
{
    Console.WriteLine(File.ReadAllText(percorso));
}
else
{
    Console.WriteLine("Il file non esiste.");
}
```

### Righe e liste

Per lavorare riga per riga:

```csharp
List<string> righe = new List<string>
{
    "Anna;Bianchi;anna@example.com",
    "Luca;Verdi;luca@example.com"
};

File.WriteAllLines("contatti.csv", righe);

string[] lette = File.ReadAllLines("contatti.csv");

foreach (string riga in lette)
{
    Console.WriteLine(riga);
}
```

### Percorsi

Non costruire i percorsi a mano con `"cartella\\file.txt"`: usa `Path.Combine`.

```csharp
string cartella = "dati";
Directory.CreateDirectory(cartella);

string file = Path.Combine(cartella, "log.txt");
File.AppendAllText(file, $"{DateTime.Now}: avvio{Environment.NewLine}");
```

`Directory.CreateDirectory` non dà errore se la cartella esiste già.

### Stream per file grandi

Per file molto grandi si usano `StreamWriter` e `StreamReader`:

```csharp
using (StreamWriter writer = new StreamWriter("grande.txt"))
{
    for (int i = 1; i <= 1000; i++)
    {
        writer.WriteLine($"Riga {i}");
    }
}

using (StreamReader reader = new StreamReader("grande.txt"))
{
    string? riga;

    while ((riga = reader.ReadLine()) != null)
    {
        Console.WriteLine(riga);
    }
}
```

`using` chiude il file automaticamente anche in caso di eccezione. Con C# moderno si può scrivere `using StreamWriter writer = new StreamWriter(...);` senza parentesi.

### Errori comuni

- Dimenticare di gestire il caso in cui il file non esiste.
- Scrivere in un file senza la cartella: prima `Directory.CreateDirectory`.
- Catturare `Exception` e non fare nulla: l'errore sparisce e non sai perché.
- Usare `File.WriteAllText` in un ciclo per aggiungere righe: cancella tutto ogni volta; serve `AppendAllText`.
- Dimenticare che i percorsi Windows usano `\`, che nelle stringhe va scritto `\\`: meglio `Path.Combine`.
- Lasciare aperto uno `StreamWriter` senza `using`: il file può restare bloccato.

## Esercizi progressivi

1. **Salva una nota.** Chiedi una frase e salvala in `nota.txt`; conferma con un messaggio (esercizio file 1).
2. **Leggi un file e stampalo.** Se il file non esiste, stampa un messaggio chiaro invece di andare in errore (esercizio file 2).
3. **Aggiungi righe a un file.** Chiedi righe finché l'utente non scrive `esci` e aggiungile a `diario.txt` con la data (esercizio file 3).
4. **Salva contatti in CSV.** Chiedi nome, telefono ed email di tre contatti e salvali in `contatti.csv` con il separatore `;` (esercizio file 4).

   Formato:

   ```text
   Anna;Bianchi;3331234567;anna@example.com
   ```

5. **Leggi contatti da CSV.** Leggi `contatti.csv`, ignora righe vuote o con meno di quattro campi e stampa i contatti in forma leggibile (esercizio file 5).

   Output di esempio:

   ```text
   Anna Bianchi - 3331234567 - anna@example.com
   ```

### Obiettivo della settimana

Scrivi un piccolo **log di errori**: un'applicazione con un menu che esegue una divisione tra due numeri. Se l'utente scrive zero al denominatore o un valore non numerico, invece di crashare scrivi una riga in `errori.log` con data, messaggio e tipo di eccezione, poi continua.

### Varianti

- Aggiungi un `finally` che stampa `Operazione terminata` in ogni caso.
- Crea un'eccezione `FileContattiCorrottoException` da lanciare quando il CSV non ha abbastanza colonne.
- Salva il diario in UTF-8 esplicito con `new UTF8Encoding(encoderShouldEmitUTF8Identifier: false)`.
