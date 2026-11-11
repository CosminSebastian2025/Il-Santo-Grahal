# Lezione 2: Input, operatori e stringhe

I programmi della lezione 1 hanno valori scritti nel codice. Ora impariamo a leggere dati da tastiera, a fare calcoli e a manipolare il testo.

### Leggere l'input con Scanner

`Scanner` legge da tastiera. Va importato e creato una volta sola.

```java
import java.util.Scanner;

public class Benvenuto {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Come ti chiami? ");
        String nome = scanner.nextLine();

        System.out.println("Ciao, " + nome + "!");

        scanner.close();
    }
}
```

Output con `Anna`:

```text
Come ti chiami? Anna
Ciao, Anna!
```

Metodi principali:

| Metodo | Legge |
| --- | --- |
| `nextLine()` | una riga intera, spazi inclusi |
| `next()` | una sola parola |
| `nextInt()` | un intero |
| `nextDouble()` | un decimale |
| `nextBoolean()` | `true` o `false` |
| `hasNextInt()` | `true` se il prossimo dato è un intero |

Attenzione a un dettaglio classico: `nextInt()` lascia il tasto invio nella coda di input. Se subito dopo chiami `nextLine()`, ottieni una stringa vuota. La soluzione è svuotare la riga:

```java
int eta = scanner.nextInt();
scanner.nextLine();   // consuma il resto della riga

System.out.print("Città: ");
String citta = scanner.nextLine();
```

Un input non numerico con `nextInt()` lancia `InputMismatchException`. Per un programma robusto si controlla prima:

```java
System.out.print("Numero: ");
if (scanner.hasNextInt()) {
    int numero = scanner.nextInt();
    System.out.println("Hai inserito " + numero);
} else {
    System.out.println("Non è un numero");
}
```

### Operatori aritmetici

| Operatore | Significato | Esempio | Risultato |
| --- | --- | --- | --- |
| `+` | somma | `7 + 2` | `9` |
| `-` | sottrazione | `7 - 2` | `5` |
| `*` | moltiplicazione | `7 * 2` | `14` |
| `/` | divisione | `7 / 2` | `3` (interi) |
| `%` | resto | `7 % 2` | `1` |

Forme abbreviate:

```java
int n = 10;
n += 5;    // n = 15
n -= 3;    // n = 12
n *= 2;    // n = 24
n /= 4;    // n = 6
n %= 4;    // n = 2
n++;       // n = 3
n--;       // n = 2
```

La divisione tra interi scarta la parte decimale: `7 / 2` vale `3`. Per ottenere `3.5` basta un operando decimale.

### Stringhe: operazioni di base

```java
String nome = "  Anna Rossi  ";

System.out.println(nome.length());          // 14
System.out.println(nome.trim());            // "Anna Rossi"
System.out.println(nome.trim().toUpperCase());  // "ANNA ROSSI"
System.out.println(nome.contains("Rossi")); // true
System.out.println(nome.indexOf("Rossi"));  // 7
System.out.println(nome.charAt(2));         // 'A'
```

Confronto tra stringhe: **mai** `==`, sempre `equals`.

```java
String a = "ciao";
String b = "ciao";

System.out.println(a == b);        // può essere true o false: non usarlo
System.out.println(a.equals(b));   // true, confronta il contenuto
System.out.println(a.equalsIgnoreCase("CIAO"));  // true
```

`==` confronta i riferimenti, `equals` il contenuto. Su questo si sbagliano anche programmatori esperti.

Altri metodi utili:

```java
String frase = "Java è un linguaggio";

System.out.println(frase.isEmpty());        // false
System.out.println(frase.isBlank());        // false
System.out.println(frase.substring(0, 4));  // Java
System.out.println(frase.replace("Java", "C#"));  // C# è un linguaggio
System.out.println(frase.split(" ").length);     // 4
```

### Convertire tra testo e numeri

```java
String testo = "42";

int numero = Integer.parseInt(testo);       // 42
double decimale = Double.parseDouble("3.14");
String ritorno = String.valueOf(numero);    // "42"
```

Se il testo non è un numero, `parseInt` lancia `NumberFormatException`.

### Esempio completo

```java
import java.util.Scanner;

public class Scontrino {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Nome prodotto: ");
        String prodotto = scanner.nextLine();

        System.out.print("Prezzo unitario: ");
        double prezzo = scanner.nextDouble();

        System.out.print("Quantità: ");
        int quantita = scanner.nextInt();

        double totale = prezzo * quantita;
        double sconto = totale > 50 ? totale * 0.10 : 0;
        double daPagare = totale - sconto;

        System.out.println("Prodotto: " + prodotto);
        System.out.printf("Totale: %.2f euro%n", totale);
        System.out.printf("Sconto: %.2f euro%n", sconto);
        System.out.printf("Da pagare: %.2f euro%n", daPagare);

        scanner.close();
    }
}
```

Output con `Tastiera`, `79.90`, `2`:

```text
Prodotto: Tastiera
Totale: 159.80 euro
Sconto: 15.98 euro
Da pagare: 143.82 euro
```

`%.2f` stampa due decimali, `%n` va a capo. In alternativa `System.out.println(String.format("%.2f", totale))`.

### Errori comuni

- Usare `==` per confrontare due stringhe.
- Chiamare `nextLine()` subito dopo `nextInt()` senza svuotare la riga.
- Dimenticare `scanner.close()` alla fine.
- Fare `Integer.parseInt` su un testo vuoto o con spazi: prima usa `trim()`.
- Credere che `7 / 2` valga `3.5`.
- Dichiarare `Scanner` dentro un `while` e creare centinaia di oggetti inutili.

## Esercizi progressivi

**Esercizio 1.** Chiedi nome e città e stampa `Anna vive a Roma`.

**Esercizio 2.** Chiedi due numeri interi e stampa somma, differenza, prodotto e resto.

Output atteso con `9` e `4`:

```text
Somma: 13
Differenza: 5
Prodotto: 36
Resto: 1
```

**Esercizio 3.** Chiedi due numeri e stampa la divisione con due decimali, anche quando entrambi sono interi.

**Esercizio 4.** Chiedi una temperatura in gradi Celsius e converti in Fahrenheit con `F = C * 9 / 5 + 32`. Stampa con un decimale.

**Esercizio 5.** Chiedi nome e cognome, poi stampa le iniziali in maiuscolo separate da punto.

Output atteso con `anna` e `rossi`:

```text
A.R.
```

**Esercizio 6.** Chiedi una frase e stampa: numero di caratteri, versione maiuscola e se contiene la parola `java` (case-insensitive).

**Esercizio 7.** Chiedi un prezzo e una quantità, calcola il totale e applica il `20%` di IVA. Stampa imponibile, IVA e totale con due decimali.

**Esercizio 8.** Chiedi un numero come testo, convertilo con `Integer.parseInt` e stampa il suo doppio. Se il testo non è valido, stampa `Valore non valido` senza far terminare il programma (usa `try`/`catch`).

### Varianti

- Modifica lo scontrino per chiedere tre prodotti e sommare i totali.
- Chiedi una data nel formato `gg/mm/aaaa` e stampa solo anno e mese usando `substring`.
- Chiedi età e anno corrente e calcola l'anno di nascita.
