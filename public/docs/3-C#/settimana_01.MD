# Settimana 1: Variabili, input/output e operatori

**Obiettivo:** scrivere i primi programmi, stampare messaggi, leggere dati e fare calcoli.

### Il primo programma

Il modo più veloce per iniziare è un progetto console:

```bash
dotnet new console -o CorsoCSharp
cd CorsoCSharp
dotnet run
```

Il file `Program.cs` contiene una sola riga e stampa un messaggio:

```csharp
Console.WriteLine("Ciao, mondo!");
```

Output:

```text
Ciao, mondo!
```

`Console.WriteLine` stampa una riga e va a capo; `Console.Write` stampa senza andare a capo.

### Variabili e tipi

In C# ogni variabile ha un tipo, che il compilatore controlla. I tipi che useremo di più sono:

| Tipo | Valori | Esempio |
| --- | --- | --- |
| `int` | numeri interi | `int eta = 16;` |
| `long` | interi molto grandi | `long abitanti = 60_000_000;` |
| `double` | numeri con la virgola | `double altezza = 1.75;` |
| `decimal` | soldi, alta precisione | `decimal prezzo = 19.99m;` |
| `bool` | vero/falso | `bool iscritto = true;` |
| `char` | un carattere | `char iniziale = 'A';` |
| `string` | testo | `string nome = "Anna";` |

Una variabile dichiarata con `var` prende il tipo dal valore a destra:

```csharp
var citta = "Roma";      // string
var anno = 2026;         // int
```

`var` non significa "nessun tipo": il tipo viene deciso dal compilatore e poi non cambia.

Una costante non può cambiare valore:

```csharp
const double PiGreco = 3.14159;
```

### Stampare valori

Il modo più leggibile è l'**interpolazione** con `$`:

```csharp
string nome = "Luca";
int eta = 17;

Console.WriteLine($"Mi chiamo {nome} e ho {eta} anni.");
```

Output:

```text
Mi chiamo Luca e ho 17 anni.
```

Per formattare i numeri si usano le parentesi graffe con i due punti:

```csharp
double media = 7.4567;
Console.WriteLine($"Media: {media:F2}");
```

Output:

```text
Media: 7.46
```

- `F2` mostra due decimali.
- `C` mostra la valuta della cultura corrente: `media.ToString("C")`.

### Leggere l'input

`Console.ReadLine` restituisce sempre una `string`, anche se l'utente scrive un numero. Per convertire si usa `int.Parse`, ma se l'input non è valido il programma va in errore. La versione sicura è `TryParse`:

```csharp
Console.Write("Quanti anni hai? ");
string risposta = Console.ReadLine() ?? "";

if (int.TryParse(risposta, out int eta))
{
    Console.WriteLine($"Tra un anno ne avrai {eta + 1}.");
}
else
{
    Console.WriteLine("Non hai scritto un numero valido.");
}
```

`TryParse` restituisce `true` se la conversione riesce e mette il risultato in `eta`. Il `?? ""` gestisce il caso in cui `ReadLine` restituisca `null`.

Per i numeri con la virgola si usa `double.TryParse`. Attenzione: su un sistema in italiano si scrive `1,75`, mentre `double.TryParse` di default accetta la virgola della cultura corrente ma non il punto.

### Operatori

| Operatore | Significato | Esempio |
| --- | --- | --- |
| `+ - * /` | somma, sottrazione, moltiplicazione, divisione | `7 / 2` |
| `%` | resto della divisione | `7 % 2` vale `1` |
| `< <= > >= == !=` | confronti | `eta >= 18` |
| `&& \|\| !` | and, or, not | `eta >= 18 && iscritto` |
| `+= -= *= /=` | aggiornamento | `somma += 5;` |
| `++ --` | incremento e decremento | `contatore++` |

La divisione tra due `int` restituisce un `int`:

```csharp
Console.WriteLine(7 / 2);        // 3
Console.WriteLine(7.0 / 2);      // 3.5
Console.WriteLine(7 % 2);        // 1
```

Se uno dei due valori è `double`, il risultato è `double`. Per ottenere decimali da interi si può convertire: `(double)somma / quantita`.

### Esempio completo

```csharp
Console.Write("Nome: ");
string nome = Console.ReadLine() ?? "";

Console.Write("Anno di nascita: ");
int annoNascita = int.Parse(Console.ReadLine() ?? "0");

int eta = 2026 - annoNascita;

Console.WriteLine($"{nome}, nel 2026 hai {eta} anni.");
```

Output con `Marta` e `2008`:

```text
Marta, nel 2026 hai 18 anni.
```

### Errori comuni

- Confondere `=` (assegnazione) con `==` (confronto).
- Usare `Console.ReadLine()` senza convertire: `"5" + 1` produce `"51"`, non `6`.
- Fare `int.Parse` su un input vuoto: meglio `TryParse`.
- Dividere due `int` e aspettarsi decimali.
- Dimenticare il `;` alla fine dell'istruzione.
- Scrivere `Console.WriteLine` con una variabile non ancora dichiarata.

## Esercizi progressivi

1. **Stampa nome ed età.** Chiedi nome ed età e stampa una frase completa, ad esempio `Ciao Anna, hai 17 anni.` (esercizio base 1).
2. **Somma di due numeri.** Chiedi due numeri interi e stampa la somma. Se l'input non è valido, stampa un messaggio di errore (esercizio base 2).
3. **Celsius in Fahrenheit.** Leggi una temperatura in gradi Celsius e converti con la formula `F = C * 9 / 5 + 32`. Attenzione: usa `double` (esercizio base 3).

   Output atteso con `100`:

   ```text
   100 °C = 212 °F
   ```

4. **Area di un rettangolo.** Chiedi base e altezza e stampa area e perimetro con due decimali (esercizio base 4).
5. **Media di tre numeri.** Leggi tre numeri interi e stampa la media con due decimali. Il risultato deve essere decimale anche quando la media è intera (esercizio base 5).

   Output atteso con `6`, `7`, `8`:

   ```text
   Media: 7.00
   ```

### Varianti

- Nel primo esercizio, se l'utente lascia il nome vuoto, stampa `Ciao, sconosciuto.`.
- Nell'esercizio della media arrotonda al numero intero più vicino con `Math.Round`.
- Aggiungi il calcolo dell'IVA al 22% a un prezzo letto da tastiera, usando `decimal` e `m` per i valori.
