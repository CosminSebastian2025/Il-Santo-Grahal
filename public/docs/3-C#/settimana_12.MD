# Settimana 12: Organizzazione e progetto finale

**Obiettivo:** mettere insieme tutto e consegnare un progetto completo, testato e leggibile.

### Organizzare il lavoro

Prima di scrivere codice, definisci:

1. **cosa fa** il programma (requisiti brevi);
2. **quali dati** gestisce (modelli);
3. **quali operazioni** servono (servizi);
4. **come si usa** (menu o comandi);
5. **come verificarlo** (test e prove manuali).

Un progetto piccolo ma completo vale più di dieci esercizi lasciati a metà.

### Struttura consigliata

```text
Rubrica/
  Rubrica.csproj
  Program.cs
  Models/
    Contatto.cs
  Services/
    ContattoService.cs
    JsonStorage.cs
  Utilities/
    Validazione.cs
  dati/
    contatti.json
Rubrica.Tests/
  Rubrica.Tests.csproj
  ContattoServiceTests.cs
  JsonStorageTests.cs
```

Comandi:

```bash
dotnet new console -o Rubrica
dotnet new xunit -o Rubrica.Tests
dotnet add Rubrica.Tests reference Rubrica
dotnet new sln -n Rubrica
dotnet sln add Rubrica Rubrica.Tests
```

Da quel momento `dotnet test` esegue i test e `dotnet run --project Rubrica` avvia l'app.

### Modello

```csharp
namespace Rubrica.Models;

public class Contatto
{
    public int Id { get; set; }
    public string Nome { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string Email { get; set; } = "";
    public string Categoria { get; set; } = "Generale";
    public DateTime CreatoIl { get; set; } = DateTime.Now;
}
```

### Servizio

```csharp
namespace Rubrica.Services;

using Rubrica.Models;

public class ContattoService
{
    private readonly List<Contatto> contatti = new List<Contatto>();
    private int prossimoId = 1;

    public IReadOnlyList<Contatto> Tutti() => contatti;

    public Contatto Aggiungi(string nome, string telefono, string email, string categoria)
    {
        if (string.IsNullOrWhiteSpace(nome))
        {
            throw new ArgumentException("Il nome è obbligatorio", nameof(nome));
        }

        if (!Utilities.Validazione.IsEmailValida(email))
        {
            throw new ArgumentException("Email non valida", nameof(email));
        }

        Contatto contatto = new Contatto
        {
            Id = prossimoId++,
            Nome = nome.Trim(),
            Telefono = telefono.Trim(),
            Email = email.Trim(),
            Categoria = string.IsNullOrWhiteSpace(categoria) ? "Generale" : categoria.Trim()
        };

        contatti.Add(contatto);
        return contatto;
    }

    public List<Contatto> Cerca(string testo)
    {
        testo = testo.Trim().ToLowerInvariant();

        return contatti
            .Where(c => c.Nome.ToLowerInvariant().Contains(testo)
                     || c.Email.ToLowerInvariant().Contains(testo)
                     || c.Telefono.Contains(testo))
            .OrderBy(c => c.Nome)
            .ToList();
    }

    public bool Rimuovi(int id)
    {
        Contatto? contatto = contatti.FirstOrDefault(c => c.Id == id);

        if (contatto is null)
        {
            return false;
        }

        contatti.Remove(contatto);
        return true;
    }

    public void Carica(IEnumerable<Contatto> caricati)
    {
        contatti.Clear();
        contatti.AddRange(caricati);
        prossimoId = contatti.Count == 0 ? 1 : contatti.Max(c => c.Id) + 1;
    }
}
```

### Persistenza JSON

```csharp
namespace Rubrica.Services;

using System.Text.Json;
using Rubrica.Models;

public static class JsonStorage
{
    private static readonly JsonSerializerOptions Opzioni = new JsonSerializerOptions
    {
        WriteIndented = true
    };

    public static void Salva(string percorso, IEnumerable<Contatto> contatti)
    {
        string? cartella = Path.GetDirectoryName(percorso);

        if (!string.IsNullOrEmpty(cartella))
        {
            Directory.CreateDirectory(cartella);
        }

        string json = JsonSerializer.Serialize(contatti, Opzioni);
        File.WriteAllText(percorso, json);
    }

    public static List<Contatto> Carica(string percorso)
    {
        if (!File.Exists(percorso))
        {
            return new List<Contatto>();
        }

        try
        {
            string json = File.ReadAllText(percorso);
            return JsonSerializer.Deserialize<List<Contatto>>(json) ?? new List<Contatto>();
        }
        catch (JsonException)
        {
            throw new InvalidDataException($"Il file {percorso} non contiene un JSON valido");
        }
    }
}
```

### Program.cs sottile

```csharp
using Rubrica.Models;
using Rubrica.Services;

string percorsoDati = Path.Combine("dati", "contatti.json");

ContattoService servizio = new ContattoService();
servizio.Carica(JsonStorage.Carica(percorsoDati));

bool esci = false;

while (!esci)
{
    StampaMenu();
    string scelta = Console.ReadLine() ?? "";

    try
    {
        switch (scelta)
        {
            case "1":
                AggiungiContatto(servizio);
                break;
            case "2":
                StampaContatti(servizio.Tutti());
                break;
            case "3":
                CercaContatti(servizio);
                break;
            case "4":
                EliminaContatto(servizio);
                break;
            case "5":
                StampaStatistiche(servizio);
                break;
            case "6":
                JsonStorage.Salva(percorsoDati, servizio.Tutti());
                Console.WriteLine("Contatti salvati.");
                break;
            case "0":
                esci = true;
                break;
            default:
                Console.WriteLine("Scelta non valida.");
                break;
        }
    }
    catch (Exception ex) when (ex is ArgumentException or InvalidDataException)
    {
        Console.WriteLine($"Errore: {ex.Message}");
    }
}

static void StampaMenu()
{
    Console.WriteLine();
    Console.WriteLine("1. Aggiungi contatto");
    Console.WriteLine("2. Elenco contatti");
    Console.WriteLine("3. Cerca");
    Console.WriteLine("4. Elimina");
    Console.WriteLine("5. Statistiche");
    Console.WriteLine("6. Salva");
    Console.WriteLine("0. Esci");
    Console.Write("Scelta: ");
}
```

Nel progetto reale aggiungi i metodi `AggiungiContatto`, `StampaContatti`, `CercaContatti`, `EliminaContatto` e `StampaStatistiche` in fondo al file: ognuno fa una cosa sola.

### Statistiche con LINQ

```csharp
static void StampaStatistiche(ContattoService servizio)
{
    var contatti = servizio.Tutti();

    Console.WriteLine($"Totale contatti: {contatti.Count}");

    foreach (var gruppo in contatti.GroupBy(c => c.Categoria).OrderBy(g => g.Key))
    {
        Console.WriteLine($"{gruppo.Key}: {gruppo.Count()}");
    }

    Contatto? ultimo = contatti.OrderByDescending(c => c.CreatoIl).FirstOrDefault();

    if (ultimo is not null)
    {
        Console.WriteLine($"Ultimo inserito: {ultimo.Nome}");
    }
}
```

### Test del servizio

```csharp
using Rubrica.Models;
using Rubrica.Services;
using Xunit;

public class ContattoServiceTests
{
    [Fact]
    public void Aggiungi_ContattoValido_AumentaIlTotale()
    {
        ContattoService servizio = new ContattoService();

        Contatto contatto = servizio.Aggiungi("Anna", "3331234567", "anna@example.com", "Famiglia");

        Assert.Equal(1, servizio.Tutti().Count);
        Assert.Equal(1, contatto.Id);
    }

    [Fact]
    public void Aggiungi_EmailNonValida_LanciaArgumentException()
    {
        ContattoService servizio = new ContattoService();

        Assert.Throws<ArgumentException>(
            () => servizio.Aggiungi("Anna", "333", "non-una-email", "Famiglia"));
    }

    [Fact]
    public void Cerca_TestoPresente_RestituisceIContattiCorrispondenti()
    {
        ContattoService servizio = new ContattoService();
        servizio.Aggiungi("Anna", "3331234567", "anna@example.com", "Famiglia");
        servizio.Aggiungi("Luca", "3477654321", "luca@example.com", "Lavoro");

        List<Contatto> risultati = servizio.Cerca("anna");

        Assert.Single(risultati);
        Assert.Equal("Anna", risultati[0].Nome);
    }
}
```

Per testare il salvataggio usa un file temporaneo:

```csharp
string percorso = Path.Combine(Path.GetTempPath(), $"contatti_{Guid.NewGuid()}.json");

try
{
    JsonStorage.Salva(percorso, new[] { new Contatto { Nome = "Test" } });
    List<Contatto> letti = JsonStorage.Carica(percorso);

    Assert.Single(letti);
}
finally
{
    File.Delete(percorso);
}
```

### Passi del progetto

1. Crea soluzione, progetto console e progetto xUnit, aggiungi la reference.
2. Modello `Contatto` e utility `Validazione`.
3. `ContattoService` con aggiunta, ricerca, rimozione e caricamento.
4. `JsonStorage` con salvataggio, caricamento e gestione del JSON corrotto.
5. Menu in `Program.cs`, con gestione degli errori e input non validi.
6. Statistiche con LINQ: totale, conteggio per categoria, ultimo inserito.
7. Test di servizio e storage.
8. Rifinitura: `dotnet format`, niente warning, README con istruzioni e screenshot del menu.

### Criteri di accettazione

- [ ] Si possono aggiungere contatti validi e l'Id cresce automaticamente.
- [ ] Un'email non valida viene rifiutata con un messaggio chiaro.
- [ ] La ricerca trova per nome, email o telefono, senza distinzione di maiuscole.
- [ ] L'eliminazione funziona e un Id inesistente restituisce `false`.
- [ ] I contatti vengono salvati in JSON e ricaricati all'avvio.
- [ ] Un file JSON corrotto non fa crashare il programma.
- [ ] `dotnet test` passa con almeno otto test.
- [ ] `Program.cs` non contiene logica di business.
- [ ] Il README spiega come avviare il progetto e i test.

### Dopo il progetto

Hai attraversato tutto il C# di base. Prossimi passi possibili:

- interfaccia grafica con **WPF**, **WinUI** o **Avalonia**;
- applicazioni web con **ASP.NET Core** e **Blazor**;
- database con **Entity Framework Core** e SQLite;
- giochi 2D con **Unity** o **MonoGame**;
- pubblicazione con `dotnet publish` per Windows, Linux e macOS.

Scegli un progetto piccolo e finiscilo: è il modo più rapido per consolidare tutto quello che hai imparato.
