# Settimana 9: Generics, delegates ed eventi

**Obiettivo:** scrivere codice riutilizzabile con i tipi e far comunicare oggetti tramite eventi.

### Generics

Hai già usato `List<T>`: la `T` è un tipo generico, deciso da chi usa la lista. Con i generics puoi scrivere metodi e classi che funzionano con qualsiasi tipo, senza duplicare il codice.

```csharp
static void StampaTutto<T>(IEnumerable<T> elementi)
{
    foreach (T elemento in elementi)
    {
        Console.WriteLine(elemento);
    }
}

StampaTutto(new[] { 1, 2, 3 });
StampaTutto(new[] { "a", "b" });
```

Una classe generica:

```csharp
class Contenitore<T>
{
    private readonly List<T> elementi = new List<T>();

    public void Aggiungi(T elemento)
    {
        elementi.Add(elemento);
    }

    public int Count => elementi.Count;

    public T? Primo()
    {
        return elementi.Count > 0 ? elementi[0] : default;
    }
}
```

### Vincoli

I vincoli limitano i tipi accettati:

```csharp
static T Massimo<T>(T a, T b) where T : IComparable<T>
{
    return a.CompareTo(b) >= 0 ? a : b;
}

Console.WriteLine(Massimo(3, 8));
Console.WriteLine(Massimo("Anna", "Luca"));
```

Vincoli comuni:

| Vincolo | Significato |
| --- | --- |
| `where T : class` | solo tipi riferimento |
| `where T : struct` | solo tipi valore |
| `where T : new()` | il tipo deve avere un costruttore senza parametri |
| `where T : IComparable<T>` | deve poter essere confrontato |
| `where T : Animale` | deve derivare da `Animale` |

Senza vincoli puoi usare solo le operazioni disponibili per `object`.

### Delegates

Un delegate è un tipo che rappresenta un metodo: permette di passare comportamento come parametro.

```csharp
static int Somma(int a, int b) => a + b;
static int Moltiplica(int a, int b) => a * b;

Func<int, int, int> operazione = Somma;
Console.WriteLine(operazione(3, 4));   // 7

operazione = Moltiplica;
Console.WriteLine(operazione(3, 4));   // 12
```

I delegate pronti della libreria:

| Tipo | Firma |
| --- | --- |
| `Action` | nessun parametro, nessun risultato |
| `Action<T>` | uno o più parametri, nessun risultato |
| `Func<T>` | nessun parametro, restituisce `T` |
| `Func<T, TResult>` | un parametro, restituisce `TResult` |
| `Predicate<T>` | un parametro, restituisce `bool` |

Esempio: una funzione che applica un'operazione a ogni numero.

```csharp
static List<int> Trasforma(List<int> numeri, Func<int, int> operazione)
{
    List<int> risultato = new List<int>();

    foreach (int n in numeri)
    {
        risultato.Add(operazione(n));
    }

    return risultato;
}

List<int> doppi = Trasforma(new List<int> { 1, 2, 3 }, n => n * 2);
```

`n => n * 2` è una **lambda**, che vedremo in dettaglio la prossima settimana.

### Eventi

Un evento permette a un oggetto di avvisare altri oggetti quando succede qualcosa. Chi pubblica l'evento non conosce chi lo ascolta.

```csharp
class Conto
{
    public event EventHandler<decimal>? SaldoCambiato;

    private decimal saldo;

    public decimal Saldo => saldo;

    public void Versa(decimal importo)
    {
        saldo += importo;
        SaldoCambiato?.Invoke(this, saldo);
    }
}

Conto conto = new Conto();

conto.SaldoCambiato += (sender, nuovoSaldo) =>
{
    Console.WriteLine($"Nuovo saldo: {nuovoSaldo:F2} €");
};

conto.Versa(50m);
```

Output:

```text
Nuovo saldo: 50,00 €
```

- `event` dichiara l'evento.
- `+=` iscrive un gestore, `-=` lo rimuove.
- `?.Invoke` evita `NullReferenceException` se non ci sono iscritti.
- `EventHandler<T>` è il delegate standard: `sender` è chi pubblica, il secondo parametro porta il dato.

Per eventi con più informazioni si crea una classe di argomenti:

```csharp
class OrdineEventArgs : EventArgs
{
    public string Prodotto { get; init; } = "";
    public int Quantita { get; init; }
}

class Magazzino
{
    public event EventHandler<OrdineEventArgs>? ScorteBasse;

    public void Scarica(string prodotto, int quantita, int rimanenti)
    {
        if (rimanenti < 5)
        {
            ScorteBasse?.Invoke(this, new OrdineEventArgs { Prodotto = prodotto, Quantita = rimanenti });
        }
    }
}
```

### Errori comuni

- Usare `T` senza vincoli e chiamare metodi che non esistono per `object`.
- Dimenticare `?.` prima di `Invoke` su un evento senza iscritti.
- Iscriversi due volte allo stesso evento e ricevere notifiche doppie.
- Usare un evento quando basta un valore di ritorno: gli eventi servono per notifiche, non per sostituire i metodi.
- Confondere `Func<T>` (restituisce un valore) con `Action<T>` (non restituisce nulla).
- Dimenticare di rimuovere gli iscritti quando l'oggetto non serve più.

## Esercizi progressivi

1. **Conta vocali.** Metodo che conta le vocali di una stringa, ignorando maiuscole e minuscole (esercizio cicli 6).
2. **Inverti una stringa.** Senza usare `Reverse()`, costruisci la stringa al contrario (esercizio cicli 7).

   Output con `casa`:

   ```text
   asac
   ```

3. **Palindroma.** Verifica se una parola è palindroma ignorando spazi e maiuscole (esercizio cicli 8).
4. **Massimo in una sequenza.** Chiedi numeri finché l'utente non scrive `stop` e stampa il massimo (esercizio cicli 9).
5. **Minimo in una sequenza.** Come sopra, ma con il minimo (esercizio cicli 10).
6. **Contenitore generico.** Classe `Contenitore<T>` con `Aggiungi`, `Count`, `Primo`, usala con `int` e con `string`.
7. **Repository generico.** Classe `Repository<T>` con `Aggiungi`, `Tutti()`, `Trova(Predicate<T>)` e `Rimuovi(T)`. Usala con una lista di studenti e con una di prodotti usando `where T : class`.
8. **Pipeline con Func.** Metodo `Applica(List<double> valori, Func<double, double> operazione)`; prova con `x => x * 2`, `Math.Sqrt` e una lambda che arrotonda a due decimali.
9. **Evento saldo cambiato.** Classe `Conto` con evento `SaldoCambiato`; nel `Main` stampa ogni variazione con data e ora (esercizio evento base).
10. **Evento scorte basse.** Classe `Magazzino` con evento `ScorteBasse`; quando una quantità scende sotto 5 il gestore scrive un avviso con prodotto e pezzi rimasti.

### Obiettivo della settimana

Combina generics ed eventi: crea un `Repository<T>` che pubblica un evento `ElementoAggiunto` ogni volta che viene aggiunto un elemento. Nel `Main` iscriviti all'evento e stampa il tipo e il `ToString()` dell'elemento aggiunto.

### Varianti

- Aggiungi al repository un metodo `Conta(Predicate<T>)`.
- Fai in modo che `Contenitore<T>` implementi `IEnumerable<T>`.
- Nell'evento `ScorteBasse` usa `EventArgs` personalizzati e due gestori diversi.
