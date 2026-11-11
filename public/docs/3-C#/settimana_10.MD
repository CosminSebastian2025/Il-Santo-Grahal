# Settimana 10: Lambda, async/await e chiamate HTTP

**Obiettivo:** scrivere funzioni compatte e usare operazioni che richiedono tempo senza bloccare il programma.

### Lambda

Una lambda è una funzione senza nome, scritta sul momento:

```csharp
Func<int, int> doppio = n => n * 2;
Func<int, int, int> somma = (a, b) => a + b;
Action<string> saluta = nome => Console.WriteLine($"Ciao {nome}");

Console.WriteLine(doppio(5));
Console.WriteLine(somma(3, 4));
saluta("Anna");
```

La forma è `parametri => espressione`. Con più istruzioni servono le graffe:

```csharp
Func<int, string> classifica = n =>
{
    if (n >= 6)
    {
        return "promosso";
    }

    return "bocciato";
};
```

Le lambda sono ovunque in LINQ:

```csharp
var promossi = studenti.Where(s => s.Media >= 6);
var nomi = studenti.Select(s => s.Nome);
var ordinati = studenti.OrderBy(s => s.Cognome).ThenBy(s => s.Nome);
```

### Closure

Una lambda può usare le variabili del contesto in cui è creata:

```csharp
int soglia = 7;
Func<int, bool> sopraSoglia = voto => voto >= soglia;

Console.WriteLine(sopraSoglia(8));   // True
```

La variabile viene catturata: se cambia dopo, la lambda vede il nuovo valore. È comodo, ma evita di modificare la variabile dentro un ciclo se non sei sicuro dell'effetto.

### Async e await

Le operazioni lente (rete, disco) non devono bloccare l'interfaccia. In C# si usano `async` e `await`:

```csharp
static async Task<int> CalcolaDopoAsync(int secondi)
{
    await Task.Delay(secondi * 1000);
    return secondi * 2;
}

int risultato = await CalcolaDopoAsync(2);
Console.WriteLine(risultato);
```

Con i top-level statements puoi usare `await` direttamente nel `Program.cs`.

Regole pratiche:

- un metodo `async` restituisce `Task` o `Task<T>`;
- `await` sospende il metodo senza bloccare il thread;
- il suffisso `Async` nel nome è una convenzione;
- evitare `async void`, tranne nei gestori di eventi;
- `Task.WhenAll` attende più operazioni insieme.

```csharp
Task<int> a = CalcolaDopoAsync(1);
Task<int> b = CalcolaDopoAsync(2);

int[] risultati = await Task.WhenAll(a, b);
Console.WriteLine(string.Join(", ", risultati));
```

I due calcoli partono insieme: il tempo totale è il più lungo, non la somma.

### HttpClient

`HttpClient` serve per chiamare API web:

```csharp
using HttpClient client = new HttpClient();
client.DefaultRequestHeaders.UserAgent.ParseAdd("CorsoCSharp/1.0");
client.Timeout = TimeSpan.FromSeconds(10);

try
{
    string risposta = await client.GetStringAsync("https://api.github.com/zen");
    Console.WriteLine(risposta);
}
catch (HttpRequestException ex)
{
    Console.WriteLine($"Errore di rete: {ex.Message}");
}
```

- `using` libera le risorse.
- Un `HttpClient` andrebbe riutilizzato, non creato a ogni chiamata in un'app reale.
- `GetStringAsync` solleva `HttpRequestException` per risposte di errore (4xx/5xx).
- Un timeout produce `TaskCanceledException`.

### Leggere JSON da un'API

```csharp
using System.Net.Http.Json;
using System.Text.Json.Serialization;

class RepositoryInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("stargazers_count")]
    public int Stars { get; set; }
}

using HttpClient client = new HttpClient();
client.DefaultRequestHeaders.UserAgent.ParseAdd("CorsoCSharp/1.0");

RepositoryInfo? repo = await client.GetFromJsonAsync<RepositoryInfo>(
    "https://api.github.com/repos/dotnet/runtime");

if (repo is not null)
{
    Console.WriteLine($"{repo.Name}: {repo.Stars} stelle");
}
```

`[JsonPropertyName]` collega il nome JSON (`stargazers_count`) alla proprietà C# (`Stars`), perché i nomi non coincidono.

Per una lista: `await client.GetFromJsonAsync<List<RepositoryInfo>>(url)`.

### Record

Per i dati che non cambiano dopo la creazione, il C# moderno offre i `record`:

```csharp
record Film(string Titolo, int Anno, double Voto);

Film film = new Film("Inception", 2010, 8.8);
Console.WriteLine(film.Titolo);
Console.WriteLine(film);   // Film { Titolo = Inception, Anno = 2010, Voto = 8.8 }
```

Un `record` genera automaticamente costruttore, proprietà di sola lettura, `ToString`, confronto per valore. Perfetto per i modelli di dati.

### Errori comuni

- Dimenticare `await`: il metodo restituisce un `Task` e il risultato non viene usato.
- Usare `.Result` o `.Wait()`: blocca il thread e può causare deadlock.
- Creare un `HttpClient` per ogni chiamata in un'app reale.
- Non gestire gli errori di rete.
- Usare una lambda che cattura una variabile modificata nel ciclo, ottenendo valori inattesi.
- Chiamare un'API senza `User-Agent`: alcune API rispondono con errore.

## Esercizi progressivi

1. **Filtro con lambda.** Data una `List<int>`, usa `Where` con una lambda per stampare i numeri pari maggiori di 10.
2. **Ordinamento personalizzato.** Crea una lista di `Film` (`Titolo`, `Anno`, `Voto`), ordinala per voto decrescente e poi per titolo, usando lambda e `ThenBy`.
3. **Countdown asincrono.** Metodo `async Task CountdownAsync(int secondi)` che stampa un numero al secondo con `Task.Delay(1000)` e infine `Via!`.
4. **Download paralleli.** Tre metodi che simulano operazioni con `Task.Delay` e restituiscono un valore; eseguili con `Task.WhenAll` e stampa i risultati.
5. **Chiamata HTTP di testo.** Chiedi all'API `https://api.github.com/zen` una frase e stampala, gestendo timeout ed errore di rete.
6. **Chiamata HTTP con JSON.** Leggi `https://api.github.com/repos/dotnet/runtime` in una classe con `[JsonPropertyName]` e stampa nome, descrizione e numero di stelle. Se `description` è `null`, stampa `Nessuna descrizione`.

### Obiettivo della settimana

Crea un'app console che, dato uno username GitHub, chiama `https://api.github.com/users/{username}` e stampa nome, numero di repository pubblici e data di creazione dell'account. Gestisci:

- username inesistente (404);
- errore di rete;
- timeout;
- risposta JSON inattesa.

### Varianti

- Usa `Task.WhenAll` per cercare tre utenti GitHub contemporaneamente.
- Aggiungi `CancellationTokenSource` per annullare la richiesta dopo 5 secondi.
- Trasforma le classi dei modelli in `record` e confronta due record con `==`.
