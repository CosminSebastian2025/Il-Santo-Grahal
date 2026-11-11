# Settimana 3: Metodi

**Obiettivo:** dividere il programma in pezzi piccoli e riutilizzabili.

### Perché usare i metodi

Un metodo è un blocco di codice con un nome. Invece di ripetere le stesse istruzioni, le scrivi una volta e le richiami quando servono. I metodi rendono il programma più corto, leggibile e facile da correggere.

Anche `Console.WriteLine` è un metodo: appartiene alla classe `Console`, prende un parametro e non restituisce nulla.

### La struttura

```csharp
static tipoRestituito NomeMetodo(parametri)
{
    // istruzioni
    return valore;
}
```

Esempio:

```csharp
Console.WriteLine($"Risultato: {Somma(3, 4)}");

static int Somma(int a, int b)
{
    return a + b;
}
```

Output:

```text
Risultato: 7
```

Con i top-level statements le istruzioni stanno in alto e i metodi si dichiarano in fondo al file. In alternativa si può usare la struttura classica:

```csharp
class Program
{
    static void Main()
    {
        Console.WriteLine(Somma(3, 4));
    }

    static int Somma(int a, int b)
    {
        return a + b;
    }
}
```

Le due forme sono equivalenti: la prima è più breve, la seconda è quella che troverai nei progetti grandi.

### Parametri e argomenti

Quando chiami `Somma(3, 4)`, i valori `3` e `4` si chiamano **argomenti**. Vengono copiati nei parametri `a` e `b`: il metodo lavora su copie e non può modificare le variabili originali.

```csharp
int x = 10;
int y = 5;

Console.WriteLine(Somma(x, y));   // 15
```

### Metodi void

Un metodo `void` non restituisce un valore e serve a eseguire un'azione:

```csharp
StampaRiga();
Console.WriteLine("Titolo");
StampaRiga();

static void StampaRiga()
{
    Console.WriteLine("--------------------");
}
```

Output:

```text
--------------------
Titolo
--------------------
```

In un metodo `void` si può usare `return;` per uscire prima, ma non si restituisce un valore.

### Valori restituiti multipli

Un metodo restituisce un solo valore, ma quel valore può essere una **tupla**:

```csharp
(int ore, int minuti) = ConvertiMinuti(125);
Console.WriteLine($"{ore} ore e {minuti} minuti");

static (int Ore, int Minuti) ConvertiMinuti(int totaleMinuti)
{
    int ore = totaleMinuti / 60;
    int minuti = totaleMinuti % 60;
    return (ore, minuti);
}
```

Output:

```text
2 ore e 5 minuti
```

### Parametri opzionali e argomenti nominati

```csharp
static decimal CalcolaPrezzo(decimal prezzo, decimal iva = 0.22m)
{
    return prezzo * (1 + iva);
}

Console.WriteLine(CalcolaPrezzo(100m));                 // 122
Console.WriteLine(CalcolaPrezzo(100m, iva: 0.10m));     // 110
```

I parametri con valore predefinito vanno sempre dopo quelli obbligatori. Gli argomenti nominati (`iva:`) rendono le chiamate chiare.

### Overload

Più metodi possono avere lo stesso nome se cambiano i parametri:

```csharp
static int Somma(int a, int b) => a + b;
static double Somma(double a, double b) => a + b;
```

Il compilatore sceglie la versione giusta in base ai tipi degli argomenti.

### Metodi che esprimono un giudizio

Un metodo che restituisce `bool` si legge bene dentro un `if`:

```csharp
static bool IsPari(int n) => n % 2 == 0;

if (IsPari(10))
{
    Console.WriteLine("Pari");
}
```

I metodi con un corpo di una sola espressione possono usare la sintassi `=>`: è equivalente a un `return`.

### Errori comuni

- Dimenticare il `return` in un metodo che restituisce un valore.
- Restituire un tipo diverso da quello dichiarato (es. `double` da un metodo `int`).
- Dichiarare il metodo dentro un altro metodo senza motivo.
- Usare un metodo prima di dichiararlo: con i top-level statements i metodi in fondo al file vanno bene, ma nei file separati servono le classi e i namespace.
- Dare nomi poco chiari: `F` non spiega nulla, `CalcolaMedia` sì.
- Duplicare lo stesso calcolo in tre punti invece di creare un metodo.

## Esercizi progressivi

1. **Sconto in base all'età.** Metodo `ApplicaSconto(decimal prezzo, int eta)`: sotto i 18 anni sconto del 20%, da 65 anni in su del 30%, altrimenti nessuno sconto. Stampa prezzo finale (esercizio condizioni 6).
2. **Semaforo.** Metodo che riceve `"rosso"`, `"giallo"` o `"verde"` e stampa l'azione corretta; per un colore sconosciuto stampa un errore (esercizio condizioni 7).
3. **Bancomat semplice.** Saldo iniziale 500 €, menu con `1` prelievo, `2` versamento, `3` esci. Il prelievo non deve superare il saldo. Ogni operazione passa da un metodo dedicato (esercizio condizioni 8).
4. **Login.** Username e password fissi, massimo 3 tentativi, messaggio finale di blocco se sbagli sempre (esercizio condizioni 9).
5. **Quiz a scelta multipla.** Tre domande, una risposta per domanda, punteggio finale su 3 con giudizio (esercizio condizioni 10).
6. **Metodo che saluta.** `Saluta(string nome)` stampa `Ciao, {nome}!` (esercizio metodi 1).
7. **Metodo che somma due numeri.** `Somma(int a, int b)` restituisce il risultato e viene usato nel programma principale (esercizio metodi 2).
8. **Metodo che calcola la media.** `Media(double a, double b, double c)` restituisce la media con due decimali (esercizio metodi 3).
9. **Minuti in ore e minuti.** `ConvertiMinuti(int totale)` restituisce una tupla `(Ore, Minuti)`. Con `125` stampa `2 ore e 5 minuti` (esercizio metodi 4).
10. **Metodo che verifica numero pari.** `IsPari(int n)` restituisce `bool` (esercizio metodi 5).
11. **Metodo che valida email semplice.** `IsEmailValida(string email)`: niente spazi, una sola `@`, almeno un punto dopo la `@` e almeno un carattere prima e dopo (esercizio metodi 6).

    Casi di prova:

    ```text
    anna@example.com   -> true
    anna@example       -> false
    anna example.com   -> false
    ```

12. **Metodo che genera numero casuale.** `NumeroCasuale(int min, int max)` restituisce un intero nell'intervallo, estremi inclusi. Il `Random` va creato una volta sola (esercizio metodi 7).
13. **Metodo che formatta prezzo.** `FormattaPrezzo(decimal valore)` restituisce una stringa come `12,50 €` (esercizio metodi 8).
14. **Metodo che calcola sconto.** `ApplicaSconto(decimal prezzo, int percentuale)` restituisce il prezzo scontato; valida che la percentuale sia tra 0 e 100 (esercizio metodi 9).
15. **Metodo che ritorna il giorno della settimana.** `GiornoSettimana(int numero)` con `1` = lunedì ... `7` = domenica, usando una switch expression; per valori fuori intervallo solleva `ArgumentOutOfRangeException` (esercizio metodi 10).

### Varianti

- Aggiungi un overload `Saluta(string nome, string cognome)`.
- Fai in modo che il login usi un metodo `VerificaCredenziali` e un contatore dei tentativi passato come parametro.
- Nel bancomat, sposta le operazioni in una classe `Conto` già dalla prossima settimana: per ora basta un metodo.
