# Introduzione al C#

Il C# (si legge "C sharp") è un linguaggio di programmazione moderno creato da Microsoft e basato sulla piattaforma **.NET**. È compilato, fortemente tipizzato e gestisce la memoria automaticamente: non dovrai preoccuparti di `malloc` e `free` come in C, ma solo di scrivere codice chiaro.

Con il C# si costruiscono applicazioni desktop, servizi web, giochi con Unity, app mobile e strumenti da riga di comando. È un ottimo linguaggio per imparare la programmazione a oggetti, perché è stato progettato proprio per questo.

### Obiettivo del percorso

In 12 settimane imparerai a scrivere programmi completi:

- variabili, input/output, operatori, condizioni e cicli;
- metodi, collezioni e manipolazione di testo;
- classi, oggetti, proprietà, eredità, interfacce e polimorfismo;
- eccezioni, file, CSV, JSON, `Dictionary` e LINQ;
- generics, delegates, eventi, lambda, `async`/`await` e chiamate HTTP;
- test, debug, refactoring e organizzazione del codice.

Alla fine costruirai una **rubrica contatti** completa, con salvataggio su file JSON e test automatici.

### Il metodo

- Studia **30-60 minuti al giorno**.
- Scrivi sempre il codice: leggere non basta.
- Fai gli esercizi in ordine: ogni settimana parte da quelli appena spiegati.
- Se un esercizio ti blocca, riducilo: prima fai funzionare un caso semplice, poi aggiungi i dettagli.
- Leggi i messaggi di errore con calma: indicano sempre file e riga.

### Come ragionare (e come si applica)

Il C# non chiede di memorizzare comandi: chiede di trasformare un problema in passi piccoli, ognuno con un tipo chiaro. Questa sezione mostra il ragionamento da fare **prima** di scrivere codice.

#### Dove si applica

- **Applicazioni desktop** (WPF, WinForms): ogni finestra è un oggetto con proprietà ed eventi; i tipi impediscono di trattare un importo come se fosse un nome.
- **Web e API con ASP.NET Core**: ogni richiesta diventa un oggetto tipizzato e viene serializzata in JSON; il tipo dei parametri decide che cosa è valido.
- **Giochi con Unity**: il metodo `Update` gira molte volte al secondo; la gestione automatica della memoria evita i crash da puntatori.
- **App mobile** (MAUI): interfaccia e logica condividono gli stessi oggetti, quindi si valida il dato una volta sola.
- **Automazione e script**: leggere un CSV o rinominare file; collezioni e `try`/`catch` rendono lo script robusto senza gestire la memoria a mano.

In tutti questi casi contano tre cose: i **tipi** dicono che cosa può contenere una variabile, gli **oggetti** tengono insieme dati e comportamento, la **gestione automatica della memoria** ti lascia concentrato sulla logica invece che su `new`/`delete`.

#### La logica in sei passi

1. **Leggi il problema** e riscrivilo con parole tue, senza termini tecnici.
2. **Definisci input e output**: che cosa entra, di che tipo, e che cosa deve uscire (numero, testo, elenco).
3. **Risolvi un esempio a mano** con dati piccoli: se non funziona a mano, non funzionerà nel codice.
4. **Scomponi in metodi**: un metodo = un verbo ("filtra", "calcola", "stampa") con pochi parametri.
5. **Scrivi la versione minima**: solo il caso normale, con output esplicito in `Console.WriteLine`.
6. **Prova i casi limite** (collezione vuota, `null`, duplicati, valori negativi) e **generalizza** solo dopo.

#### Esempio guidato 1: rubrica contatti filtrata

**Problema**: dato un elenco di contatti con nome e città, stampare solo quelli che abitano a Torino.

**Modello**: un contatto è fatto di due dati che devono restare insieme; uso una classe con proprietà, non due liste parallele che possono disallinearsi.

**Lista e filtro**: l'input è una `List<Contatto>`, l'output è una lista filtrata (riutilizzabile) e poi una stampa. Filtrare significa una condizione booleana per elemento: `c.Citta == "Torino"`.

```csharp
var contatti = new List<Contatto>
{
    new Contatto { Nome = "Ada", Citta = "Torino" },
    new Contatto { Nome = "Bruno", Citta = "Milano" },
    new Contatto { Nome = "Carla", Citta = "Torino" }
};

var filtrati = contatti.Where(c => c.Citta == "Torino").ToList();

foreach (var contatto in filtrati)
{
    Console.WriteLine($"{contatto.Nome} - {contatto.Citta}");
}

class Contatto
{
    public string Nome { get; set; } = "";
    public string Citta { get; set; } = "";
}
```

Le dichiarazioni di classi vanno **dopo** i top-level statements, nello stesso file. **Output atteso**: due righe, `Ada - Torino` e poi `Carla - Torino` (Bruno è escluso dal filtro).

#### Esempio guidato 2: media con lista vuota

**Problema**: calcolare la media dei voti e dire chiaramente quando non ci sono voti.

**Caso vuoto**: `Average` su una lista vuota lancia un'eccezione. Il risultato quindi non può essere un semplice `double`: serve un tipo che possa anche significare "nessun dato", cioè `double?`.

```csharp
var voti = new List<int> { 6, 8, 7, 9 };

double? CalcolaMedia(List<int> valori)
{
    if (valori.Count == 0)
        return null;

    return valori.Average();
}

double? media = CalcolaMedia(voti);
Console.WriteLine(media is null ? "Nessun dato" : $"Media: {media.Value:F1}");
```

**Output atteso** con quei voti: `Media: 7.5`. Se sostituisci la lista con `new List<int>()`, l'output diventa `Nessun dato`.

La differenza tra `0` e "nessun dato" conta: `0` è una media possibile (tutti i voti a zero), `null` dice che il calcolo non è applicabile. Restituire `0` mescolerebbe due situazioni diverse e chi legge il risultato non potrebbe più distinguerle.

#### Debug: ragionare su un errore

```csharp
var contatti = new List<Contatto>
{
    new Contatto { Nome = "Ada" },
    null
};

foreach (var contatto in contatti)
{
    Console.WriteLine(contatto.Nome.ToUpper());
}
```

L'errore è `System.NullReferenceException` e lo stack trace indica file e riga: la riga del `Console.WriteLine`. Ragionamento per isolare il problema: la riga usa due cose (`contatto` e `Nome`), quindi una delle due è `null`. Metto un `Console.WriteLine(contatto is null)` prima della riga, oppure un breakpoint sulla riga e guardo `contatto` nella finestra Locals: vale `null`, perché la lista contiene un elemento nullo.

Correzione minima, che accetta il caso e resta leggibile:

```csharp
foreach (var contatto in contatti)
{
    string nome = contatto?.Nome ?? "(senza nome)";
    Console.WriteLine(nome.ToUpper());
}
```

Se invece `null` non deve proprio entrare nella lista, filtra in ingresso (`contatti.OfType<Contatto>()`) e attiva i tipi riferimento nullable: una proprietà dichiarata `public string Nome { get; set; }` senza valore iniziale produce l'avviso `CS8618` e, a runtime, vale `null`. Il compilatore ti avvisa prima, se lo ascolti.

#### Obiettivo -> Come ragionare -> Strumento C#

| Obiettivo | Come ragionare | Strumento C# |
| --- | --- | --- |
| Conservare più elementi in ordine | "Quanti sono? Cambiano di numero?" Prima chiediti se serve l'indice | `List<T>` |
| Cercare un valore da una chiave | La chiave identifica in modo univoco il dato? | `Dictionary<TKey, TValue>` |
| Estrarre un sottoinsieme o trasformarlo | Descrivi la regola in italiano, poi diventa una condizione | LINQ (`Where`, `Select`, `Any`) |
| Ripetere una logica con dati diversi | Quali dati cambiano e quali restano fissi? Quelli variabili sono parametri | metodo `static` o locale |
| Aspettare una risorsa lenta (rete, file) | Che cosa succede all'interfaccia mentre aspetti? | `async`/`await` con `Task` |

#### Esercizi di ragionamento

Prima di scrivere codice, compila per ogni esercizio: input, output, passi e casi limite.

1. **Spesa totale**. Input: una lista di prezzi (`List<decimal>`). Output: il totale formattato con due decimali. Scrivi i passi e i casi limite (lista vuota, prezzo negativo). Output atteso con `2.50, 1.20, 3.00`: `Totale: 6.70`.
2. **Conteggio parole**. Input: una frase. Output: il numero di parole distinte, ignorando maiuscole e punteggiatura. Casi limite: stringa vuota, sole spazi, parole ripetute. Output atteso con `"ciao Ciao mondo"`: `Parole distinte: 2`.
3. **Rubrica per iniziale**. Input: una lista di contatti e una lettera. Output: quanti contatti iniziano con quella lettera e il loro nome in ordine alfabetico. Casi limite: nessun contatto, lettera minuscola, nomi con accenti. Output atteso con Ada, Bruno, Carla e lettera `c`: `1 - Carla`.

### Come è organizzato il corso

| Settimane | Argomenti |
| --- | --- |
| 1-2 | Basi assolute: variabili, input/output, operatori, condizioni, cicli |
| 3-4 | Metodi, array, liste, stringhe, ricerca e manipolazione dei dati |
| 5-6 | Programmazione orientata agli oggetti: classi, proprietà, costruttori, eredità, interfacce, polimorfismo |
| 7-8 | Dati e file: eccezioni, file, CSV, JSON, `Dictionary`, LINQ |
| 9-10 | C# moderno: generics, delegates, eventi, lambda, `async`/`await`, HTTP |
| 11-12 | Qualità e progetto finale: testing, debugging, refactoring, organizzazione |

Ogni settimana trovi una lezione con esempi, errori comuni ed **esercizi progressivi**. Gli esercizi sono cumulativi: quelli delle settimane precedenti tornano come ripasso.

### Gli strumenti

Serve il **.NET SDK** (versione 8 o superiore), disponibile per Windows, macOS e Linux su [dotnet.microsoft.com](https://dotnet.microsoft.com/download).

Controlla l'installazione:

```bash
dotnet --version
```

Crea un progetto console ed eseguilo:

```bash
dotnet new console -o CorsoCSharp
cd CorsoCSharp
dotnet run
```

Come editor puoi usare **Visual Studio Code** con l'estensione C# Dev Kit, oppure **Visual Studio** / **Rider**.

### Due convenzioni del corso

1. Useremo i **top-level statements**: il codice di `Program.cs` viene eseguito direttamente, senza scrivere a mano `class Program` e `Main`. Dalla settimana 3 vedrai come si definiscono i metodi `static` e dalla settimana 5 le classi complete.
2. I nomi di classi e metodi seguiranno la convenzione C#: `PascalCase` per classi, metodi e proprietà, `camelCase` per variabili e parametri (es. `CalcolaMedia`, `numeroStudenti`).

### Come usare gli esercizi

Gli esercizi sono divisi per argomento e diventano via via più completi. Non copiare la soluzione: prova, sbaglia, correggi. Se un programma non compila, il messaggio di errore è la prima cosa da leggere.

Nella prima settimana scriverai i primi programmi: variabili, stampa a schermo e calcoli.
