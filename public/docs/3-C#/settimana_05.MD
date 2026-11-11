# Settimana 5: Classi, oggetti e proprietà

**Obiettivo:** modellare il mondo reale con classi e oggetti.

### Dalla variabile all'oggetto

Finora hai usato variabili separate: `nome`, `eta`, `media`. Quando i dati appartengono alla stessa cosa — per esempio a uno studente — conviene raggrupparli in una **classe**.

Una classe è un progetto; un **oggetto** è un'esemplare creato da quel progetto.

```csharp
class Studente
{
    public string Nome { get; set; } = "";
    public string Cognome { get; set; } = "";
    public int Eta { get; set; }
    public List<int> Voti { get; } = new List<int>();

    public double Media()
    {
        if (Voti.Count == 0)
        {
            return 0;
        }

        double somma = 0;

        foreach (int voto in Voti)
        {
            somma += voto;
        }

        return somma / Voti.Count;
    }

    public override string ToString()
    {
        return $"{Nome} {Cognome}, {Eta} anni, media {Media():F1}";
    }
}
```

Uso:

```csharp
Studente studente = new Studente
{
    Nome = "Anna",
    Cognome = "Bianchi",
    Eta = 17
};

studente.Voti.Add(7);
studente.Voti.Add(8);

Console.WriteLine(studente);
```

Output:

```text
Anna Bianchi, 17 anni, media 7.5
```

### Campi e proprietà

Un **campo** è una variabile dentro la classe:

```csharp
class Contatore
{
    private int valore;   // campo

    public int Valore    // proprietà
    {
        get { return valore; }
    }

    public void Incrementa()
    {
        valore++;
    }
}
```

Le **proprietà automatiche** evitano di scrivere il campo:

```csharp
class Persona
{
    public string Nome { get; set; } = "";
    public int Eta { get; set; }
}
```

- `get` legge il valore, `set` lo scrive.
- `{ get; }` rende la proprietà leggibile ma non modificabile dall'esterno: perfetta per `Voti`, che si modifica solo con `Add`.
- `{ get; private set; }` permette di modificare il valore solo da dentro la classe.

### Incapsulamento

L'incapsulamento significa proteggere i dati: l'esterno usa i metodi e le proprietà, non tocca i dettagli interni.

```csharp
class Conto
{
    private decimal saldo;

    public decimal Saldo => saldo;

    public void Versa(decimal importo)
    {
        if (importo <= 0)
        {
            throw new ArgumentException("L'importo deve essere positivo");
        }

        saldo += importo;
    }

    public bool Preleva(decimal importo)
    {
        if (importo <= 0 || importo > saldo)
        {
            return false;
        }

        saldo -= importo;
        return true;
    }
}
```

`Saldo => saldo` è una proprietà calcolata in sola lettura, scritta in forma compatta.

### Proprietà con validazione

```csharp
class Prodotto
{
    private decimal prezzo;

    public string Nome { get; set; } = "";

    public decimal Prezzo
    {
        get => prezzo;
        set
        {
            if (value < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value), "Il prezzo non può essere negativo");
            }

            prezzo = value;
        }
    }
}
```

`value` è il valore che l'esterno sta assegnando. `nameof(value)` restituisce la stringa `"value"`: utile nei messaggi di errore e nei test.

### Proprietà calcolate

Una proprietà può derivare da altre:

```csharp
class Rettangolo
{
    public double Base { get; set; }
    public double Altezza { get; set; }

    public double Area => Base * Altezza;
    public double Perimetro => 2 * (Base + Altezza);
}
```

`Area` non ha un campo: viene calcolata a ogni lettura.

### Oggetti dentro le liste

```csharp
List<Studente> classe = new List<Studente>();

classe.Add(new Studente { Nome = "Anna", Cognome = "Bianchi", Eta = 17 });
classe.Add(new Studente { Nome = "Luca", Cognome = "Verdi", Eta = 18 });

foreach (Studente s in classe)
{
    Console.WriteLine(s);
}
```

### Membri statici

Un membro `static` appartiene alla classe, non ai singoli oggetti:

```csharp
class Calcolatrice
{
    public static int Somma(int a, int b) => a + b;
}

Console.WriteLine(Calcolatrice.Somma(2, 3));   // 5
```

`Math.Max` e `Console.WriteLine` sono esempi di membri statici della libreria .NET.

### Errori comuni

- Creare la classe ma dimenticare `public` su proprietà e metodi: dall'esterno non sono accessibili.
- Lasciare campi `public` e modificabili: meglio proprietà con `private set` o validazione.
- Confondere classe e oggetto: `Studente` è il progetto, `new Studente()` è l'oggetto.
- Modificare una lista con `{ get; set; }` dall'esterno senza controllo.
- Dimenticare `new` prima del nome della classe.
- Scrivere `studente.Media` invece di `studente.Media()`: la prima è una proprietà, la seconda un metodo.

## Esercizi progressivi

1. **Classe Studente.** Proprietà `Nome`, `Cognome`, `Eta`, lista `Voti`; metodo `Media()` e `ToString()`. Crea tre studenti e stampali (esercizio classi 1).
2. **Classe Prodotto.** Proprietà `Nome`, `Prezzo` (validato non negativo), `Quantita`; proprietà calcolata `ValoreTotale` e metodo `ApplicaSconto(percentuale)` (esercizio classi 2).
3. **Classe Auto.** Proprietà `Marca`, `Modello`, `Anno`, `Velocita`; metodi `Accelera(int kmh)` e `Frena(int kmh)` che non superano 0 e 200 km/h (esercizio classi 3).
4. **Classe Libro.** Proprietà `Titolo`, `Autore`, `Anno`, `Disponibile`; metodi `Presta()` e `Restituisci()` che cambiano `Disponibile` e restituiscono un messaggio (esercizio classi 4).
5. **Classe Dipendente.** Proprietà `Nome`, `Ruolo`, `Stipendio` (non modificabile dall'esterno); metodo `AumentaStipendio(percentuale)` che valida la percentuale tra 0 e 100 (esercizio classi 5).

### Obiettivo della settimana

Crea un programma con un `List<Studente>` che:

1. chiede all'utente quanti studenti inserire;
2. per ognuno legge nome, cognome, età e tre voti;
3. stampa tutti gli studenti con la media;
4. indica lo studente con la media più alta.

### Varianti

- Aggiungi a `Studente` una proprietà `Promosso` che vale `true` se la media è almeno 6.
- Aggiungi a `Prodotto` un metodo `Rifornisci(int quantita)`.
- Rendi `Voti` una lista di sola lettura dall'esterno e aggiungi un metodo `AggiungiVoto(int voto)` che accetta solo voti da 0 a 10.
