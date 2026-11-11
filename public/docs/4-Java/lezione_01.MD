# Lezione 1: Primo programma e variabili

Un programma Java è composto da **classi**. La classe con il metodo `main` è il punto da cui parte l'esecuzione. In questa lezione scriviamo il primo programma, impariamo a compilarlo e conserviamo i valori nelle variabili.

### Il primo programma

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Ciao, mondo!");
    }
}
```

Compilazione ed esecuzione:

```bash
javac Main.java
java Main
```

Output:

```text
Ciao, mondo!
```

Come si legge:

- `public class Main` dichiara una classe pubblica; il file deve chiamarsi `Main.java`.
- `public static void main(String[] args)` è il metodo di avvio; senza di lui la JVM non sa da dove partire.
- `System.out.println(...)` stampa il testo e va a capo.
- Ogni istruzione termina con `;`.

Per stampare senza andare a capo si usa `System.out.print(...)`:

```java
public class Saluto {
    public static void main(String[] args) {
        System.out.print("Ciao ");
        System.out.println("mondo!");
    }
}
```

Output:

```text
Ciao mondo!
```

Un commento inizia con `//` e vale fino a fine riga:

```java
// questo è un commento
int anni = 30;   // anche questo lo è
```

Per blocchi lunghi si usa `/* ... */`.

### Variabili e tipi primitivi

Una variabile ha un nome, un tipo e un valore.

```java
int eta = 25;
double altezza = 1.78;
boolean studente = true;
char iniziale = 'A';
```

| Tipo | Valori | Esempio |
| --- | --- | --- |
| `int` | interi fino a circa 2 miliardi | `int n = 42;` |
| `long` | interi molto grandi | `long abitanti = 8_000_000_000L;` |
| `double` | decimali | `double prezzo = 19.90;` |
| `float` | decimali meno precisi | `float x = 3.14f;` |
| `boolean` | `true` o `false` | `boolean ok = false;` |
| `char` | un solo carattere | `char voto = 'A';` |
| `byte` / `short` | interi piccoli | `byte b = 100;` |

Regole pratiche:

- per i numeri interi usa `int`, per i decimali usa `double`;
- `long` richiede il suffisso `L`, `float` richiede `f`;
- `char` usa apici singoli `'A'`, le stringhe usano apici doppi `"Anna"`;
- una variabile dichiarata e non inizializzata non si può usare.

Si può dichiarare una variabile facendo dedurre il tipo al compilatore (Java 10+):

```java
var citta = "Roma";      // String
var temperatura = 21.5;  // double
```

`var` si usa solo per le variabili locali, quando il tipo è evidente dal valore.

Una costante si dichiara con `final`: non può essere riassegnata.

```java
final double IVA = 0.22;
final int MAX_TENTATIVI = 3;
```

### Cast e conversione

Da un tipo più piccolo a uno più grande la conversione è automatica:

```java
int intero = 7;
double decimale = intero;   // 7.0
```

Nel verso opposto serve un **cast esplicito** e la parte decimale viene troncata:

```java
double prezzo = 19.99;
int euro = (int) prezzo;   // 19
```

Attenzione alla divisione tra interi: il risultato è intero.

```java
int a = 7;
int b = 2;

System.out.println(a / b);            // 3
System.out.println((double) a / b);   // 3.5
```

Se almeno uno dei due operandi è `double`, il risultato è decimale.

### Esempio completo

```java
public class Scheda {
    public static void main(String[] args) {
        String nome = "Anna";
        int eta = 28;
        double altezza = 1.72;
        boolean studentessa = false;
        final int ANNO = 2026;

        System.out.println("Nome: " + nome);
        System.out.println("Età: " + eta);
        System.out.println("Altezza: " + altezza + " m");
        System.out.println("Studentessa: " + studentessa);
        System.out.println("Anno: " + ANNO);
    }
}
```

Output:

```text
Nome: Anna
Età: 28
Altezza: 1.72 m
Studentessa: false
Anno: 2026
```

Il `+` tra una stringa e un altro valore crea una concatenazione: il valore viene convertito in testo.

### Errori comuni

- Nome del file diverso dal nome della classe pubblica: `class Main` deve stare in `Main.java`.
- Dimenticare il `;` a fine istruzione.
- Scrivere `"A"` per un `char` o `'Anna'` per una `String`.
- Assegnare un decimale a un `int` senza cast: `int x = 3.5;` non compila.
- Modificare una variabile `final`.
- Usare una variabile prima di assegnarle un valore.

## Esercizi progressivi

**Esercizio 1.** Scrivi un programma che stampa il tuo nome e la tua età usando due variabili e `println`.

Output atteso (esempio):

```text
Mi chiamo Luca e ho 22 anni
```

**Esercizio 2.** Dichiara quattro variabili (`String`, `int`, `double`, `boolean`) con valori a tua scelta e stampale una per riga.

**Esercizio 3.** Dichiara due `int`, salva il primo in una variabile temporanea, scambia i valori e stampa prima e dopo.

Output atteso con `3` e `8`:

```text
Prima: 3 8
Dopo: 8 3
```

**Esercizio 4.** Calcola l'area di un rettangolo con base `7.5` e altezza `3.2` e stampala con due decimali usando `System.out.printf("%.2f%n", area)`.

**Esercizio 5.** Hai tre voti interi (`7`, `8`, `6`). Calcola la media in un `double` e stampala con due decimali.

**Esercizio 6.** Un biglietto costa `12.50` euro. Calcola il costo di `4` biglietti, applica uno sconto del `10%` e stampa totale e totale scontato. Usa una costante per l'aliquota.

**Esercizio 7.** Dichiara `int secondi = 3672;` e converti in ore, minuti e secondi usando `/` e `%`. Stampa `1h 1m 12s`.

### Varianti

- Rifai l'esercizio 6 con `printf` e l'output allineato su due colonne.
- Aggiungi alla scheda personale una variabile `char` con l'iniziale del nome.
- Prova a dividere `7` per `2` salvando il risultato in un `int` e poi in un `double`: spiega la differenza.
