# Settimana 8: CSV, JSON, Dictionary e LINQ

**Obiettivo:** organizzare dati strutturati, salvarli e interrogarli con poche righe.

### Dictionary

Un `Dictionary<TKey, TValue>` associa una chiave a un valore, come una rubrica:

```csharp
Dictionary<string, string> rubrica = new Dictionary<string, string>();

rubrica["Anna"] = "333-1234567";
rubrica["Luca"] = "347-7654321";

Console.WriteLine(rubrica["Anna"]);

if (rubrica.TryGetValue("Sara", out string? numero))
{
    Console.WriteLine(numero);
}
else
{
    Console.WriteLine("Contatto non trovato");
}
```

- Le chiavi sono uniche: assegnare due volte la stessa chiave sovrascrive.
- `Add` dà errore se la chiave esiste; l'indicizzatore no.
- `TryGetValue` evita l'eccezione `KeyNotFoundException`.
- Scorrere le coppie: `foreach (KeyValuePair<string, string> coppia in rubrica)`.

Contare le parole:

```csharp
string testo = "ciao mondo ciao a tutti ciao";
Dictionary<string, int> conteggi = new Dictionary<string, int>();

foreach (string parola in testo.Split(' ', StringSplitOptions.RemoveEmptyEntries))
{
    conteggi[parola] = conteggi.GetValueOrDefault(parola) + 1;
}

foreach (var coppia in conteggi)
{
    Console.WriteLine($"{coppia.Key}: {coppia.Value}");
}
```

### Salvare dati in JSON

JSON è il formato più diffuso per scambiare dati. Con `System.Text.Json` non serve installare nulla:

```csharp
using System.Text.Json;

class Impostazioni
{
    public string Tema { get; set; } = "chiaro";
    public bool Notifiche { get; set; } = true;
    public int DimensioneTesto { get; set; } = 14;
}

Impostazioni impostazioni = new Impostazioni { Tema = "scuro", DimensioneTesto = 16 };

JsonSerializerOptions opzioni = new JsonSerializerOptions { WriteIndented = true };

string json = JsonSerializer.Serialize(impostazioni, opzioni);
File.WriteAllText("impostazioni.json", json);

string letto = File.ReadAllText("impostazioni.json");
Impostazioni? caricate = JsonSerializer.Deserialize<Impostazioni>(letto);

Console.WriteLine(caricate?.Tema);
```

Il JSON prodotto:

```json
{
  "Tema": "scuro",
  "Notifiche": true,
  "DimensioneTesto": 16
}
```

Per una lista:

```csharp
List<Contatto> contatti = new List<Contatto> { /* ... */ };

string json = JsonSerializer.Serialize(contatti, opzioni);
File.WriteAllText("contatti.json", json);

List<Contatto>? letti = JsonSerializer.Deserialize<List<Contatto>>(File.ReadAllText("contatti.json"));
```

`Deserialize` restituisce `null` se il JSON non è valido per il tipo: controlla sempre il risultato. Un JSON malformato solleva `JsonException`.

### CSV robusto

Un CSV è un file di testo con un valore per colonna:

```csharp
class Contatto
{
    public string Nome { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string Email { get; set; } = "";
}

string[] campi = riga.Split(';');

if (campi.Length >= 3)
{
    Contatto contatto = new Contatto
    {
        Nome = campi[0].Trim(),
        Telefono = campi[1].Trim(),
        Email = campi[2].Trim()
    };
}
```

Attenzione: il formato CSV "vero" gestisce virgole e virgolette nei valori. Per gli esercizi delimiter `;` e valori semplici bastano; per dati reali conviene una libreria come CsvHelper.

### LINQ

LINQ permette di interrogare liste con metodi leggibili:

```csharp
List<int> numeri = new List<int> { 5, 12, 8, 21, 3, 14 };

List<int> maggioriDiDieci = numeri.Where(n => n > 10).ToList();
int somma = numeri.Sum();
double media = numeri.Average();
int massimo = numeri.Max();
int quantiPari = numeri.Count(n => n % 2 == 0);
List<int> ordinati = numeri.OrderBy(n => n).ToList();
```

Metodi LINQ da conoscere:

| Metodo | Risultato |
| --- | --- |
| `Where` | filtra |
| `Select` | trasforma ogni elemento |
| `OrderBy`, `OrderByDescending` | ordina |
| `ThenBy` | ordina sul secondo criterio |
| `GroupBy` | raggruppa |
| `Sum`, `Average`, `Min`, `Max`, `Count` | calcoli |
| `Any`, `All` | condizioni su tutta la sequenza |
| `First`, `FirstOrDefault` | primo elemento |
| `ToList`, `ToArray` | materializza il risultato |

`First` dà errore se non c'è nessun elemento; `FirstOrDefault` restituisce `0` o `null`.

### LINQ sugli oggetti

```csharp
class Studente
{
    public string Nome { get; set; } = "";
    public string Classe { get; set; } = "";
    public double Media { get; set; }
}

List<Studente> studenti = new List<Studente> { /* ... */ };

var promossi = studenti
    .Where(s => s.Media >= 6)
    .OrderByDescending(s => s.Media)
    .ToList();

var perClasse = studenti
    .GroupBy(s => s.Classe)
    .Select(g => new { Classe = g.Key, Numero = g.Count(), Media = g.Average(s => s.Media) });

foreach (var gruppo in perClasse)
{
    Console.WriteLine($"{gruppo.Classe}: {gruppo.Numero} studenti, media {gruppo.Media:F1}");
}
```

`GroupBy` restituisce gruppi con `Key` e gli elementi del gruppo.

### Sintassi query

Esiste anche una sintassi simile a SQL:

```csharp
var nomi = from s in studenti
           where s.Media >= 7
           orderby s.Nome
           select s.Nome;
```

È equivalente a `Where`/`OrderBy`/`Select`: scegli quella che leggi meglio.

### Collezioni particolari

```csharp
Queue<string> coda = new Queue<string>();
coda.Enqueue("Canzone 1");
coda.Enqueue("Canzone 2");
Console.WriteLine(coda.Dequeue());   // Canzone 1

Stack<string> cronologia = new Stack<string>();
cronologia.Push("Pagina 1");
cronologia.Push("Pagina 2");
Console.WriteLine(cronologia.Pop()); // Pagina 2
```

- `Queue` è FIFO: primo entrato, primo uscito.
- `Stack` è LIFO: ultimo entrato, primo uscito.

### Errori comuni

- Usare `First` su una sequenza vuota: `InvalidOperationException`.
- Dimenticare `ToList()` quando serve una lista modificabile.
- Confondere `Count()` di LINQ con `Count` delle liste: con LINQ è un metodo.
- Modificare una lista dentro un `foreach` mentre la si interroga.
- Usare `int` per i soldi: meglio `decimal`.
- Scrivere JSON con classi senza proprietà pubbliche: vengono ignorate.

## Esercizi progressivi

1. **Rubrica con Dictionary.** Chiedi cinque coppie nome/telefono, salvale in un `Dictionary<string, string>` e cercane uno a scelta (esercizio collezioni 1).
2. **Contatore di parole.** Leggi una frase e conta quante volte compare ogni parola, ignorando maiuscole e minuscole (esercizio collezioni 2).
3. **Studenti raggruppati per classe.** Crea una lista di studenti con `Classe` e `Media`, raggruppali per classe e stampa numero e media di ogni gruppo (esercizio collezioni 3).

   Output di esempio:

   ```text
   1A: 3 studenti, media 7.2
   1B: 2 studenti, media 6.5
   ```

4. **Prodotti per categoria.** Lista di prodotti con `Categoria` e `Prezzo`; raggruppa per categoria e calcola il totale per categoria (esercizio collezioni 4).
5. **Movimenti bancari ordinati per data.** Lista di movimenti con `Data` e `Importo`; ordina dal più recente e calcola il saldo finale (esercizio collezioni 5).
6. **Film filtrati per anno.** Lista di film con `Titolo` e `Anno`; stampa quelli dal 2020 in poi ordinati per titolo (esercizio collezioni 6).
7. **Playlist musicale con Queue.** Simula una coda di brani: aggiungi tre canzoni e riproduci la prima (esercizio collezioni 7).
8. **Cronologia operazioni con Stack.** Simula la cronologia di un editor: aggiungi tre azioni e annulla l'ultima (esercizio collezioni 8).
9. **Sistema di ticket con Queue.** Tre ticket in coda; ogni volta che l'utente preme Invio, apri il successivo e stampalo (esercizio collezioni 9).
10. **Inventario con quantità.** `Dictionary<string, int>` di prodotti e quantità; chiedi un prodotto e mostra quanti pezzi restano, usando `TryGetValue` (esercizio collezioni 10).
11. **Salva impostazioni in JSON.** Classe `Impostazioni` con tema, notifiche e dimensione testo; salva in `impostazioni.json` con indentazione (esercizio file 6).
12. **Leggi impostazioni da JSON.** Leggi il file del punto precedente, gestisci file mancante o JSON non valido e stampa i valori (esercizio file 7).
13. **Backup di una lista attività.** Lista di `Attivita` (titolo, completata, data); salva un backup JSON con nome `attivita_backup_AAAA-MM-GG.json` (esercizio file 8).
14. **Diario personale su file.** Menu con aggiungi voce (data automatica), leggi tutte le voci e cerca una parola nel diario (esercizio file 9).
15. **Log di errori semplice.** Funzione che esegue una divisione; se il denominatore è zero scrive una riga in `errori.log` con data, messaggio e tipo di eccezione (esercizio file 10).

### Varianti

- Nel contatore di parole mostra le prime tre parole più frequenti con `OrderByDescending(...).Take(3)`.
- Nella rubrica salva e carica i contatti da JSON, non solo in memoria.
- Nell'inventario aggiungi un comando per scaricare una quantità e impedisci di andare sotto zero.
