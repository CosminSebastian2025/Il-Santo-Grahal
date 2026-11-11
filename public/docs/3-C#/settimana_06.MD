# Settimana 6: Costruttori, eredità, interfacce e polimorfismo

**Obiettivo:** costruire gerarchie di classi e usare lo stesso comando per oggetti diversi.

### Costruttori

Un costruttore prepara l'oggetto appena creato. Ha lo stesso nome della classe e non ha tipo di ritorno:

```csharp
class Studente
{
    public string Nome { get; }
    public int Eta { get; }

    public Studente(string nome, int eta)
    {
        Nome = nome;
        Eta = eta;
    }
}

Studente s = new Studente("Anna", 17);
```

Se una proprietà è `{ get; }`, può essere assegnata solo nel costruttore. Questo garantisce che un oggetto venga creato sempre completo.

I costruttori si possono sovraccaricare:

```csharp
public Studente(string nome) : this(nome, 0)
{
}
```

`this(...)` richiama un altro costruttore della stessa classe.

### Validare nel costruttore

```csharp
public Studente(string nome, int eta)
{
    if (string.IsNullOrWhiteSpace(nome))
    {
        throw new ArgumentException("Il nome è obbligatorio", nameof(nome));
    }

    if (eta < 0 || eta > 120)
    {
        throw new ArgumentOutOfRangeException(nameof(eta));
    }

    Nome = nome;
    Eta = eta;
}
```

Un oggetto non valido non deve nemmeno nascere: meglio un'eccezione immediata che un errore lontano.

### Ereditarietà

Una classe può derivare da un'altra e riusarne il comportamento:

```csharp
class Animale
{
    public string Nome { get; }

    public Animale(string nome)
    {
        Nome = nome;
    }

    public virtual string Verso()
    {
        return "...";
    }

    public override string ToString()
    {
        return $"{Nome}: {Verso()}";
    }
}

class Cane : Animale
{
    public Cane(string nome) : base(nome)
    {
    }

    public override string Verso()
    {
        return "Bau";
    }
}
```

- `: base(nome)` passa il valore al costruttore della classe madre.
- `virtual` permette di sovrascrivere il metodo.
- `override` sostituisce la versione della classe madre.

Si può ereditare da **una sola** classe.

### Classi astratte

Una classe `abstract` non può essere istanziata: serve solo come base.

```csharp
abstract class Forma
{
    public abstract double Area();
}

class Cerchio : Forma
{
    public double Raggio { get; set; }

    public override double Area() => Math.PI * Raggio * Raggio;
}

class Rettangolo : Forma
{
    public double Base { get; set; }
    public double Altezza { get; set; }

    public override double Area() => Base * Altezza;
}
```

`new Forma()` non compila: ha senso solo creare forme concrete.

### Interfacce

Un'interfaccia è un contratto: elenca i membri che una classe deve avere, senza dire come implementarli. Una classe può implementare **più** interfacce.

```csharp
interface IStampabile
{
    string Riga();
}

class Fattura : IStampabile
{
    public int Numero { get; set; }

    public string Riga() => $"Fattura n. {Numero}";
}
```

Per convenzione i nomi delle interfacce iniziano con `I`.

### Polimorfismo

Con una lista di tipo base puoi contenere oggetti di classi diverse e chiamare lo stesso metodo:

```csharp
List<Forma> forme = new List<Forma>
{
    new Cerchio { Raggio = 2 },
    new Rettangolo { Base = 3, Altezza = 4 }
};

foreach (Forma forma in forme)
{
    Console.WriteLine($"Area: {forma.Area():F2}");
}
```

Output:

```text
Area: 12.57
Area: 12.00
```

Il programma non ha bisogno di sapere quale forma sta usando: chiama `Area()` e ogni classe risponde a modo suo. Questo è il **polimorfismo**.

### is, as e pattern matching

```csharp
foreach (Forma forma in forme)
{
    if (forma is Cerchio cerchio)
    {
        Console.WriteLine($"Cerchio di raggio {cerchio.Raggio}");
    }
}
```

`is` con una variabile controlla il tipo e, se corrisponde, la assegna: il modo più pulito per distinguere i casi.

### Errori comuni

- Dimenticare `: base(...)` quando la classe madre non ha un costruttore senza parametri.
- Marcare `override` un metodo che nella classe madre non è `virtual`, `abstract` o `override`.
- Provare a istanziare una classe `abstract` o un'interfaccia.
- Ereditare per riusare due righe di codice quando basterebbe una classe helper.
- Dimenticare di implementare tutti i membri di un'interfaccia.
- Confondere l'ereditarietà (è un) con la composizione (ha un): un'auto **ha** un motore, non **è** un motore.

## Esercizi progressivi

1. **Classe Fattura.** Costruttore con numero e cliente; lista di voci `(Descrizione, Quantita, PrezzoUnitario)`; metodi `AggiungiVoce`, `Totale()` con IVA 22% e `ToString()` (esercizio classi 6).
2. **Classe Animale.** Classe astratta con `Nome`, metodo astratto `Verso()` e `ToString()`. Crea `Cane`, `Gatto` e `Mucca`, mettili in una `List<Animale>` e stampali (esercizio classi 7).
3. **Classe Veicolo.** Classe astratta con `Marca`, `Modello`, `VelocitaMax` e metodo astratto `Tipo()`. Crea `Auto`, `Moto` e `Bici`; aggiungi un'interfaccia `IMotorizzato` con `Cilindrata` implementata solo da auto e moto (esercizio classi 8).
4. **Classe Utente.** Proprietà `Username`, `Email`, `Ruolo`; costruttore con validazione dell'email; `ToString()`. Crea `Utente` e una classe derivata `Amministratore` con un permesso extra (esercizio classi 9).
5. **Classe Evento.** Proprietà `Titolo`, `Data`, `CapienzaMassima`, lista `Partecipanti`; metodo `Iscrivi(string nome)` che rifiuta l'iscrizione se l'evento è pieno o se il nome è già presente (esercizio classi 10).

### Obiettivo della settimana

Crea un piccolo gestionale con:

- un'interfaccia `IRiepilogabile` con il metodo `Riepilogo()`;
- una classe astratta `Documento` con numero e data;
- `Fattura` e `Preventivo` che ereditano da `Documento` e implementano `IRiepilogabile`;
- una `List<Documento>` stampata con un unico ciclo.

### Varianti

- Aggiungi a `Forma` un'interfaccia `IScalabile` con `Ridimensiona(fattore)`.
- Usa `is` per stampare un messaggio diverso per ogni tipo di animale.
- Rendi `Utente` astratta e crea `Studente` e `Docente` come classi derivate.
