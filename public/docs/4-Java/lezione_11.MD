# Lezione 11: Stringhe e StringBuilder

Il testo è ovunque: nomi, messaggi, file, JSON, URL. Questa lezione raccoglie i metodi che servono davvero e spiega perché in un ciclo conviene `StringBuilder`.

### String è immutabile

```java
String nome = "java";
String maiuscolo = nome.toUpperCase();

System.out.println(nome);        // java
System.out.println(maiuscolo);   // JAVA
```

`toUpperCase()` non modifica `nome`: restituisce una nuova stringa. Ogni "modifica" crea un nuovo oggetto e lascia il precedente in memoria fino alla garbage collection.

Questo ha due conseguenze pratiche:

- confrontare con `equals`, mai con `==`;
- non concatenare in un ciclo con `+=` quando le iterazioni sono molte.

### Metodi principali

```java
String s = "  Java è un linguaggio  ";

System.out.println(s.length());            // 24
System.out.println(s.trim());              // "Java è un linguaggio"
System.out.println(s.trim().toLowerCase()); // "java è un linguaggio"
System.out.println(s.contains("Java"));    // true
System.out.println(s.indexOf("un"));       // 10
System.out.println(s.charAt(2));           // 'J'
System.out.println(s.substring(2, 6));     // "Java"
System.out.println(s.replace("Java", "C#"));
System.out.println(s.isEmpty());           // false
System.out.println("   ".isBlank());       // true
System.out.println(s.trim().split(" ").length);  // 4
```

| Metodo | Restituisce |
| --- | --- |
| `length()` | numero di caratteri |
| `charAt(i)` | carattere in posizione `i` |
| `substring(inizio, fine)` | sottostringa, `fine` escluso |
| `indexOf(testo)` | posizione, `-1` se assente |
| `contains(testo)` | `boolean` |
| `startsWith` / `endsWith` | `boolean` |
| `replace(a, b)` | nuova stringa |
| `split(separatore)` | array di parti |
| `trim()` / `strip()` | rimuove spazi ai lati |
| `repeat(n)` | ripete la stringa (Java 11+) |

Attenzione: `substring(2, 6)` restituisce i caratteri 2, 3, 4 e 5. L'indice finale è escluso, come nella lezione 5 per gli array.

### Confronti

```java
String a = "ciao";
String b = "CIAO";

System.out.println(a.equals(b));              // false
System.out.println(a.equalsIgnoreCase(b));    // true
System.out.println(a.compareTo(b));           // valore positivo: 'c' > 'C'
```

`compareTo` restituisce un numero negativo, zero o positivo: è l'ordine alfabetico usato da `sort`, come vedremo nella lezione 14.

### StringBuilder

`StringBuilder` è mutabile: `append` modifica lo stesso oggetto.

```java
StringBuilder sb = new StringBuilder();

for (int i = 1; i <= 5; i++) {
    sb.append(i).append(" ");
}

System.out.println(sb.toString().trim());   // 1 2 3 4 5
```

Metodi principali:

| Metodo | Effetto |
| --- | --- |
| `append(x)` | aggiunge in coda |
| `insert(pos, x)` | inserisce in posizione |
| `deleteCharAt(pos)` | rimuove un carattere |
| `replace(inizio, fine, testo)` | sostituisce una parte |
| `reverse()` | inverte |
| `length()` | lunghezza attuale |
| `toString()` | converte in `String` |

Esempio di inversione:

```java
String parola = "programma";
String inversa = new StringBuilder(parola).reverse().toString();
System.out.println(inversa);   // ammargorp
```

Confronto delle prestazioni: concatenare 10.000 stringhe con `+=` crea migliaia di oggetti; con `StringBuilder` ne crea uno. Nei programmi piccoli non si nota, nei cicli lunghi sì.

### Wrapper e autoboxing

Ogni tipo primitivo ha una classe wrapper: `Integer`, `Long`, `Double`, `Boolean`, `Character`.

```java
Integer numero = 42;        // autoboxing: int -> Integer
int valore = numero;        // unboxing: Integer -> int

System.out.println(Integer.parseInt("123"));   // 123
System.out.println(Integer.MAX_VALUE);         // 2147483647
System.out.println(String.valueOf(42));        // "42"
System.out.println(Integer.compare(3, 7));     // negativo
```

I wrapper servono quando un valore deve essere un oggetto: dentro le collezioni, come valore `null`, o per i metodi di utilità. Attenzione: un `Integer` nullo assegnato a un `int` produce `NullPointerException`.

```java
Integer forse = null;
// int n = forse;   // NullPointerException
```

### Formattazione

```java
String riga = String.format("%-10s %6.2f", "Tastiera", 39.9);
System.out.println(riga);
```

| Segnaposto | Significato |
| --- | --- |
| `%s` | stringa |
| `%d` | intero |
| `%f` | decimale |
| `%.2f` | decimale con due cifre |
| `%6.2f` | larghezza minima 6, due decimali |
| `%-10s` | stringa allineata a sinistra su 10 |
| `%n` | nuova riga |

### Esempio completo

```java
import java.util.Scanner;

public class Analizzatore {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Frase: ");
        String frase = scanner.nextLine().trim();

        if (frase.isEmpty()) {
            System.out.println("Frase vuota");
            scanner.close();
            return;
        }

        String[] parole = frase.split("\\s+");
        StringBuilder iniziali = new StringBuilder();

        for (String parola : parole) {
            iniziali.append(Character.toUpperCase(parola.charAt(0)));
        }

        System.out.println("Caratteri: " + frase.length());
        System.out.println("Parole: " + parole.length);
        System.out.println("Iniziali: " + iniziali);
        System.out.println("Maiuscola: " + frase.toUpperCase());
    }
}
```

Output con `il santo grahal`:

```text
Caratteri: 15
Parole: 3
Iniziali: ISG
Maiuscola: IL SANTO GRAHAL
```

`split("\\s+")` divide su uno o più spazi. Nelle stringhe Java il backslash va scritto due volte.

### Errori comuni

- Confrontare stringhe con `==`.
- Usare `substring` con l'indice finale incluso: è escluso.
- Dimenticare che `charAt` accetta solo indici validi, altrimenti `StringIndexOutOfBoundsException`.
- Concatenare dentro un ciclo molto lungo con `+=`.
- Chiamare `split` con un `+` o un `.` senza escape: sono caratteri speciali delle espressioni regolari.
- Confondere `isEmpty()` (lunghezza zero) con `isBlank()` (solo spazi).

## Esercizi progressivi

**Esercizio 1.** Leggi una parola e stampala in maiuscolo, in minuscolo e con la sua lunghezza.

**Esercizio 2.** Leggi una frase e stampa quante vocali contiene (considera anche le maiuscole).

**Esercizio 3.** Leggi una frase e stampa le parole separate da `|` usando `split` e `StringBuilder`.

**Esercizio 4.** Leggi una parola e stampala al contrario con `StringBuilder.reverse()`.

**Esercizio 5.** Leggi una frase e verifica se è un palindromo ignorando spazi e maiuscole.

**Esercizio 6.** Leggi nome e cognome e stampa `Cognome N.` con l'iniziale puntata.

**Esercizio 7.** Conta quante parole di una frase superano i 5 caratteri.

**Esercizio 8.** Leggi una frase e sostituisci tutte le occorrenze di `ciao` con `salve`, poi stampa quante sostituzioni hai fatto.

**Esercizio 9.** Leggi una data nel formato `gg/mm/aaaa`, estrai giorno, mese e anno con `substring` e stampa `Anno: 2026, Mese: 11, Giorno: 11`.

**Esercizio 10.** Costruisci una tabella allineata con `String.format`: tre prodotti, prezzo a destra su 8 caratteri con due decimali, nome a sinistra su 12.

**Esercizio 11.** Scrivi `static String iniziali(String nomeCompleto)` che restituisce le iniziali maiuscole separate da punto, per esempio `A.R.`.

**Esercizio 12.** Scrivi `static String normalizza(String testo)` che rimuove spazi doppi, taglia gli estremi e mette in minuscolo.

### Varianti

- Conta le occorrenze di una lettera usando `indexOf` in un ciclo invece di scorrere i caratteri.
- Confronta i tempi di concatenazione con `+=` e con `StringBuilder` su 100.000 iterazioni.
- Converti un numero intero in stringa e conta le cifre senza usare `String.valueOf`.
