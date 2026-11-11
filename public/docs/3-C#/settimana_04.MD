# Settimana 4: Array, liste e stringhe

**Obiettivo:** gestire molti valori insieme e manipolare il testo.

### Array

Un array contiene un numero fisso di elementi dello stesso tipo:

```csharp
int[] voti = { 6, 7, 8, 5 };
string[] nomi = new string[3];

nomi[0] = "Anna";
nomi[1] = "Luca";
nomi[2] = "Sara";

Console.WriteLine(voti.Length);   // 4
Console.WriteLine(voti[0]);       // 6
```

- Gli indici partono da **0**.
- `Length` è il numero di elementi.
- Un indice fuori intervallo produce `IndexOutOfRangeException`.
- La dimensione si decide alla creazione e non cambia.

Si possono ordinare e cercare con metodi statici:

```csharp
Array.Sort(voti);            // ordine crescente
Array.Reverse(voti);         // ordine decrescente
int posizione = Array.IndexOf(voti, 7);   // -1 se non c'è
```

### Liste

`List<T>` è una collezione che cresce a runtime: è la scelta giusta quando il numero di elementi non è noto.

```csharp
List<string> spesa = new List<string>();

spesa.Add("Pane");
spesa.Add("Latte");
spesa.AddRange(new[] { "Uova", "Caffè" });

Console.WriteLine(spesa.Count);        // 4
Console.WriteLine(spesa.Contains("Latte"));   // True

spesa.Remove("Latte");
spesa.Sort();

foreach (string prodotto in spesa)
{
    Console.WriteLine(prodotto);
}
```

Metodi utili:

| Metodo | Cosa fa |
| --- | --- |
| `Add`, `AddRange` | aggiungono uno o più elementi |
| `Insert(i, valore)` | inserisce in posizione `i` |
| `Remove(valore)` | rimuove la prima occorrenza |
| `RemoveAt(i)` | rimuove per posizione |
| `Contains(valore)` | dice se esiste |
| `IndexOf(valore)` | posizione, oppure `-1` |
| `Sort()` | ordina |
| `Clear()` | svuota |

Attenzione: `Count` è una proprietà per le liste, mentre per gli array si usa `Length`.

### Cercare il massimo e il minimo

Con un ciclo:

```csharp
int[] numeri = { 4, 9, 2, 15, 7 };
int massimo = numeri[0];

foreach (int n in numeri)
{
    if (n > massimo)
    {
        massimo = n;
    }
}

Console.WriteLine($"Massimo: {massimo}");
```

Con LINQ, dalla settimana 8, basterà `numeri.Max()`. Per ora è importante capire il meccanismo.

### Stringhe

Una `string` è una sequenza di caratteri immutabile: ogni operazione che la modifica restituisce una **nuova** stringa.

```csharp
string frase = "  Ciao mondo  ";

Console.WriteLine(frase.Trim());            // "Ciao mondo"
Console.WriteLine(frase.ToUpper());         // "  CIAO MONDO  "
Console.WriteLine(frase.Contains("mondo")); // True
Console.WriteLine(frase.Replace("mondo", "C#")); // "  Ciao C#  "
Console.WriteLine(frase.Trim().Length);     // 10
Console.WriteLine(frase.Trim()[0]);         // 'C'
Console.WriteLine(frase.Trim().Substring(0, 4)); // "Ciao"
```

Le operazioni più usate:

| Membro | Risultato |
| --- | --- |
| `Length` | numero di caratteri |
| `ToUpper()`, `ToLower()` | maiuscole/minuscole |
| `Trim()` | toglie spazi iniziali e finali |
| `Split(separatore)` | divide in un array di parti |
| `Replace(a, b)` | sostituisce tutte le occorrenze |
| `Contains(testo)` | vero se il testo è presente |
| `IndexOf(testo)` | posizione, oppure `-1` |
| `Substring(inizio, lunghezza)` | estrae una parte |
| `StartsWith`, `EndsWith` | controlla inizio e fine |
| `string.Join(sep, parti)` | unisce un array in una stringa |

### Split e Join

```csharp
string riga = "mela,pera,banana";
string[] frutti = riga.Split(',');

foreach (string frutto in frutti)
{
    Console.WriteLine(frutto);
}

string nuovaRiga = string.Join(" | ", frutti);
Console.WriteLine(nuovaRiga);
```

Output:

```text
mela
pera
banana
mela | pera | banana
```

Per contare le parole ignorando gli spazi multipli:

```csharp
string[] parole = frase.Split(' ', StringSplitOptions.RemoveEmptyEntries);
Console.WriteLine(parole.Length);
```

### Stringhe e cicli

```csharp
string parola = "programma";
int vocali = 0;

foreach (char c in parola.ToLower())
{
    if ("aeiou".Contains(c))
    {
        vocali++;
    }
}

Console.WriteLine($"Vocali: {vocali}");
```

Per costruire una stringa carattere per carattere, in programmi grandi si usa `StringBuilder`; per gli esercizi la concatenazione con `+` va benissimo.

### Errori comuni

- Partire da 1 con gli indici: `numeri[numeri.Length]` va sempre in errore.
- Modificare una lista durante il `foreach`: usare un `for` all'indietro o raccogliere prima gli elementi da rimuovere.
- Confondere `Count` (liste) e `Length` (array e stringhe).
- Pensare che `Replace` modifichi la stringa originale: restituisce una nuova stringa, va assegnata.
- Fare `Split(' ')` senza `RemoveEmptyEntries` e contare le parole vuote.
- Dimenticare che i confronti tra stringhe sono case-sensitive: `"Anna" != "anna"`.

## Esercizi progressivi

1. **Somma di un array.** Crea un array di 8 numeri e stampa la somma (esercizio array 1).

   Output di esempio con `1 2 3 4 5 6 7 8`:

   ```text
   Somma: 36
   ```

2. **Massimo in un array.** Trova il massimo con un ciclo, senza LINQ (esercizio array 2).
3. **Minimo in una lista.** Crea una `List<int>`, chiedi 5 numeri e trova il minimo (esercizio array 3).
4. **Rimuovi duplicati.** Data una lista con valori ripetuti, crea una nuova lista senza duplicati mantenendo l'ordine (esercizio array 4).
5. **Unisci due liste.** Crea due liste di numeri, uniscile e stampa il risultato ordinato (esercizio array 5).
6. **Inverti una lista.** Inverti gli elementi senza usare `Reverse()`: scambia il primo con l'ultimo e così via (esercizio array 6).
7. **Filtra numeri maggiori di 10.** Da una lista di numeri stampa solo quelli maggiori di 10 (esercizio array 7).
8. **Conta parole.** Chiedi una frase e stampa quante parole contiene, ignorando gli spazi multipli (esercizio array 8).
9. **Trova la parola più lunga.** Data una frase, stampa la parola con più caratteri; se due hanno la stessa lunghezza, la prima (esercizio array 9).
10. **Ordina una lista di nomi.** Chiedi 5 nomi, ordinali in ordine alfabetico e stampali uno per riga (esercizio array 10).
11. **Conta caratteri.** Leggi una parola e stampa il numero di caratteri, esclusi spazi (esercizio stringhe 1).
12. **Conta parole.** Leggi una frase e stampa il numero di parole usando `Split` (esercizio stringhe 2).
13. **Sostituisci una parola.** Chiedi una frase, una parola da cercare e una nuova parola, poi stampa la frase modificata (esercizio stringhe 3).
14. **Rimuovi spazi.** Stampa la frase senza spazi interni, oltre che senza spazi iniziali e finali (esercizio stringhe 4).

    Output con `Ciao a tutti`:

    ```text
    Ciaoatutti
    ```

15. **Maiuscolo.** Converti una frase in maiuscolo e stampala (esercizio stringhe 5).
16. **Contiene una parola.** Verifica se una frase contiene una parola, indipendentemente da maiuscole e minuscole (esercizio stringhe 6).
17. **Iniziali.** Da `Mario Rossi` stampa `M. R.` (esercizio stringhe 7).
18. **Acronimo.** Da `World Wide Web` crea `WWW` (esercizio stringhe 8).
19. **Email semplice.** Verifica il formato di un'email: niente spazi, una sola `@`, punto dopo la `@` (esercizio stringhe 9).
20. **Formatta nome e cognome.** Da `mario rossi` produci `Rossi, Mario` con le iniziali maiuscole (esercizio stringhe 10).

### Varianti

- Conta le vocali e le consonanti della frase più lunga trovata negli esercizi precedenti.
- Inverti una stringa e verifica se è palindroma: questi due esercizi tornano nella settimana 9 come riscaldamento.
- Nel rimuovi duplicati, prova a usare `HashSet<int>` e nota come cambia l'ordine.
