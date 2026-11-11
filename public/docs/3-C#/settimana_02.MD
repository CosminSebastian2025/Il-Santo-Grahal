# Settimana 2: Condizioni e cicli

**Obiettivo:** far scegliere al programma tra più strade e ripetere istruzioni.

### if, else if, else

```csharp
Console.Write("Età: ");
int eta = int.Parse(Console.ReadLine() ?? "0");

if (eta >= 18)
{
    Console.WriteLine("Maggiorenne");
}
else if (eta >= 14)
{
    Console.WriteLine("Minorenne, ma può dare il consenso ai dati");
}
else
{
    Console.WriteLine("Minorenne");
}
```

Le condizioni si possono combinare con `&&` (e), `||` (o), `!` (non):

```csharp
bool puoGuidare = eta >= 18 && patenteValida;
bool giornoLibero = sabato || domenica;
bool nonPuoEntrare = !maggiorenne;
```

C# valuta le condizioni da sinistra a destra e si ferma appena il risultato è certo (**short-circuit**): in `eta >= 18 && patenteValida`, se `eta` è 10 la seconda parte non viene nemmeno valutata.

### switch

Quando si confronta una variabile con molti valori fissi, `switch` è più chiaro di tanti `else if`:

```csharp
Console.Write("Voto (A-F): ");
string voto = (Console.ReadLine() ?? "").ToUpper();

switch (voto)
{
    case "A":
        Console.WriteLine("Ottimo");
        break;
    case "B":
        Console.WriteLine("Buono");
        break;
    case "C":
    case "D":
        Console.WriteLine("Sufficiente");
        break;
    default:
        Console.WriteLine("Non valido");
        break;
}
```

Le **switch expression** sono ancora più compatte:

```csharp
string giudizio = voto switch
{
    "A" => "Ottimo",
    "B" => "Buono",
    "C" or "D" => "Sufficiente",
    _ => "Non valido"
};
```

L'operatore ternario è un `if` in una riga, utile per scelte piccole:

```csharp
string esito = eta >= 18 ? "maggiorenne" : "minorenne";
```

Non concatenare troppi ternari: diventano illeggibili.

### Ciclo while

Ripete il blocco finché la condizione è vera:

```csharp
int contatore = 1;

while (contatore <= 5)
{
    Console.WriteLine(contatore);
    contatore++;
}
```

Il ciclo `do-while` esegue il corpo almeno una volta e controlla la condizione dopo:

```csharp
string risposta;

do
{
    Console.Write("Scrivi 'esci' per terminare: ");
    risposta = Console.ReadLine() ?? "";
}
while (risposta != "esci");
```

### Ciclo for

Si usa quando il numero di ripetizioni è noto:

```csharp
for (int i = 1; i <= 10; i++)
{
    Console.WriteLine(i);
}
```

Il `for` ha tre parti: inizializzazione, condizione, aggiornamento. `i += 2` salta di due, `i--` conta all'indietro.

### foreach

Scorre gli elementi di una collezione o i caratteri di una stringa:

```csharp
string parola = "Ciao";

foreach (char lettera in parola)
{
    Console.WriteLine(lettera);
}
```

### break e continue

- `break` esce subito dal ciclo.
- `continue` salta al giro successivo.

```csharp
for (int i = 1; i <= 10; i++)
{
    if (i == 7)
    {
        break;
    }

    if (i % 2 == 0)
    {
        continue;
    }

    Console.WriteLine(i);   // 1, 3, 5
}
```

### Numeri casuali

```csharp
Random random = new Random();

int dado = random.Next(1, 7);        // da 1 a 6
double casuale = random.NextDouble(); // tra 0.0 e 1.0
```

`Random` va creato una volta sola: crearne uno nuovo a ogni giro può dare valori ripetuti.

### Esempio completo

```csharp
Console.Write("Numero: ");
int n = int.Parse(Console.ReadLine() ?? "0");

long fattoriale = 1;

for (int i = 2; i <= n; i++)
{
    fattoriale *= i;
}

Console.WriteLine($"{n}! = {fattoriale}");
```

Output con `5`:

```text
5! = 120
```

### Errori comuni

- Dimenticare di aggiornare la variabile del `while`: ciclo infinito.
- Mettere `;` dopo `if (...)` o `while (...)`: il blocco non viene eseguito come pensi.
- Confondere `=` e `==`.
- Usare `int` per il fattoriale di numeri grandi: dopo `12!` va in overflow, serve `long`.
- Ciclo `for` che parte da 0 quando l'esercizio chiede da 1 (errore di "off by one").
- Creare un `Random` dentro un ciclo stretto.

## Esercizi progressivi

1. **Positivo o negativo.** Chiedi un numero e stampa `Positivo`, `Negativo` o `Zero` (esercizio base 6).
2. **Parola vuota.** Chiedi una parola e verifica se è vuota o composta solo da spazi con `string.IsNullOrWhiteSpace` (esercizio base 7).
3. **Numeri pari da 1 a 100.** Stampa solo i pari, separati da uno spazio (esercizio base 8).
4. **Numeri dispari da 1 a 100.** Stampa solo i dispari (esercizio base 9).
5. **Conta fino a N.** Chiedi un numero `N` e stampa da 1 a `N`; se `N` è minore di 1, avvisa l'utente (esercizio base 10).
6. **Maggiorenne.** Chiedi l'età e stampa se la persona è maggiorenne (esercizio condizioni 1).
7. **Anno bisestile.** Un anno è bisestile se è divisibile per 4 ma non per 100, oppure se è divisibile per 400. Stampa `Bisestile` o `Non bisestile` (esercizio condizioni 2).

   Output atteso con `2024`:

   ```text
   2024 è bisestile
   ```

8. **Maggiore tra tre numeri.** Leggi tre numeri e stampa il maggiore; se sono uguali, dillo (esercizio condizioni 3).
9. **Divisibile per 3 e 5.** Verifica se un numero è divisibile sia per 3 sia per 5. Attenzione: `n % 3 == 0 && n % 5 == 0`, non `n % 15` senza motivo (anche se funziona, l'esercizio chiede di usare due condizioni) (esercizio condizioni 4).
10. **Voto in lettera.** Converti un voto da 0 a 100 in una lettera: da 90 in su `A`, da 80 `B`, da 70 `C`, da 60 `D`, sotto `F`. Con un valore fuori scala stampa `Voto non valido` (esercizio condizioni 5).
11. **Tabellina.** Chiedi un numero e stampa la sua tabellina fino a 10 (esercizio cicli 1).

    Output con `3`:

    ```text
    3 x 1 = 3
    3 x 2 = 6
    ...
    3 x 10 = 30
    ```

12. **Tutte le tabelline.** Stampa le tabelline da 1 a 10, separate da una riga vuota (esercizio cicli 2).
13. **Somma da 1 a N.** Chiedi `N`, calcola la somma con un ciclo e verifica il risultato con la formula `N * (N + 1) / 2` (esercizio cicli 3).
14. **Fattoriale.** Calcola `N!` con un ciclo, gestendo `0! = 1` e i numeri negativi. Usa `long` e avvisa se `N` è maggiore di 20 (esercizio cicli 4).
15. **Password casuale semplice.** Genera una password di 8 caratteri usando lettere minuscole, maiuscole e cifre (esercizio cicli 5).

    Output di esempio (cambia a ogni esecuzione):

    ```text
    Password: k3Lm9QaT
    ```

### Varianti

- Nel semaforo e nel login userai `switch` e condizioni più articolate: prova a scriverli già qui come riscaldamento.
- Trasforma il ciclo della tabellina in un `while`.
- Nel fattoriale, chiedi all'utente di ripetere il calcolo finché non scrive `esci`.
