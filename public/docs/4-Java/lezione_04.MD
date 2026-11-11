# Lezione 4: Cicli

Un ciclo ripete un blocco di istruzioni. Serve per contare, accumulare valori, scorrere dati e ripetere un menu finché l'utente non decide di uscire.

### Il ciclo for

```java
for (int i = 1; i <= 5; i++) {
    System.out.println("Giro " + i);
}
```

Output:

```text
Giro 1
Giro 2
Giro 3
Giro 4
Giro 5
```

La testa del `for` ha tre parti separate da `;`:

1. **inizializzazione**: `int i = 1` viene eseguita una volta sola;
2. **condizione**: finché è vera il ciclo continua;
3. **aggiornamento**: `i++` viene eseguito alla fine di ogni giro.

Errore tipico: usare `i <= 5` quando si vogliono 5 elementi partendo da 0, o `i < 5` partendo da 1. Conta sempre gli elementi prima di scrivere la condizione.

### Ciclo while

Il `while` controlla la condizione **prima** di eseguire il blocco: può non eseguirlo mai.

```java
int i = 1;

while (i <= 5) {
    System.out.println("Giro " + i);
    i++;
}
```

Il `while` serve quando non sai in anticipo quante volte ripetere: per esempio finché l'utente non inserisce `0`.

```java
import java.util.Scanner;

Scanner scanner = new Scanner(System.in);
int somma = 0;
int numero;

System.out.println("Inserisci numeri, 0 per terminare:");

numero = scanner.nextInt();

while (numero != 0) {
    somma += numero;
    numero = scanner.nextInt();
}

System.out.println("Somma: " + somma);
```

### Ciclo do-while

Il `do-while` esegue il blocco **almeno una volta** e controlla la condizione alla fine. È la forma naturale per un menu.

```java
import java.util.Scanner;

public class Menu {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int scelta;

        do {
            System.out.println("1) Saluta");
            System.out.println("0) Esci");
            System.out.print("Scelta: ");
            scelta = scanner.nextInt();

            if (scelta == 1) {
                System.out.println("Ciao!");
            }
        } while (scelta != 0);

        System.out.println("Arrivederci");
        scanner.close();
    }
}
```

### break e continue

- `break` interrompe il ciclo.
- `continue` salta il resto del giro e passa al successivo.

```java
for (int i = 1; i <= 10; i++) {
    if (i == 5) {
        continue;   // salta il 5
    }
    if (i == 8) {
        break;      // si ferma prima dell'8
    }
    System.out.println(i);
}
```

Output: `1 2 3 4 6 7`, uno per riga.

### Cicli annidati

Un ciclo dentro un altro produce combinazioni, tabelle e matrici.

```java
for (int riga = 1; riga <= 3; riga++) {
    for (int colonna = 1; colonna <= 4; colonna++) {
        System.out.print(riga * colonna + "\t");
    }
    System.out.println();
}
```

Output:

```text
1	2	3	4
2	4	6	8
3	6	9	12
```

Il ciclo interno completo viene eseguito per ogni giro di quello esterno: 3 × 4 = 12 iterazioni.

### Accumulare valori

Tre schemi ricorrenti:

```java
int somma = 0;
int massimo = Integer.MIN_VALUE;
int conteggio = 0;

for (int i = 1; i <= 10; i++) {
    somma += i;
    if (i > massimo) {
        massimo = i;
    }
    if (i % 2 == 0) {
        conteggio++;
    }
}

System.out.println("Somma " + somma);       // 55
System.out.println("Massimo " + massimo);   // 10
System.out.println("Pari " + conteggio);    // 5
```

Per una media usa un `double` per la somma o fai il cast al momento della divisione.

### Esempio completo

```java
import java.util.Scanner;

public class Tabellina {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.print("Numero: ");
        if (!scanner.hasNextInt()) {
            System.out.println("Numero non valido");
            scanner.close();
            return;
        }

        int numero = scanner.nextInt();

        for (int i = 1; i <= 10; i++) {
            System.out.printf("%d x %d = %d%n", numero, i, numero * i);
        }

        scanner.close();
    }
}
```

Output con `7`:

```text
7 x 1 = 7
7 x 2 = 14
...
7 x 10 = 70
```

### Errori comuni

- Dimenticare l'aggiornamento nel `while`: il ciclo non termina mai.
- Usare `while` quando serve `do-while`: il menu non viene stampato se la condizione è falsa subito.
- Confondere `=` con `==` nella condizione.
- Modificare l'indice dentro il `for` oltre a `i++`: il conteggio salta.
- Chiudere il blocco con `;` prima delle graffe: `while (x > 0);`.
- Dichiarare l'accumulatore dentro il ciclo: viene azzerato a ogni giro.

## Esercizi progressivi

**Esercizio 1.** Stampa i numeri da 1 a 10 con un `for`.

**Esercizio 2.** Stampa i numeri pari da 2 a 20 e poi i dispari da 19 a 1.

**Esercizio 3.** Leggi un numero `N` e calcola la somma da 1 a `N`. Con `5` l'output è `Somma: 15`.

**Esercizio 4.** Leggi un numero e stampa il suo fattoriale con un `long`. Gestisci `0` (risultato `1`) e i numeri negativi con un messaggio di errore.

**Esercizio 5.** Leggi numeri finché l'utente non inserisce `0`; poi stampa somma, media, massimo e minimo.

**Esercizio 6.** Indovina il numero: il programma sceglie un numero tra 1 e 100 con `new java.util.Random().nextInt(100) + 1` e dice `troppo alto` o `troppo basso` finché non lo indovini. Conta i tentativi.

**Esercizio 7.** Chiedi una parola e stampala al contrario usando un `for` che parte dall'ultimo carattere.

**Esercizio 8.** Stampa un triangolo di asterischi alto `N`: riga 1 con un asterisco, riga 2 con due, fino a `N`.

Con `N = 4`:

```text
*
**
***
****
```

**Esercizio 9.** Chiedi un numero e stampa tutti i suoi divisori (esclusi 1 e il numero stesso). Con `12`: `2 3 4 6`.

**Esercizio 10.** Calcola la serie armonica `1 + 1/2 + 1/3 + ... + 1/N` con `N` letto da tastiera e stampa il risultato con quattro decimali.

### Varianti

- Rifai l'esercizio 3 con un `while` e poi con la formula `N * (N + 1) / 2`: confronta i risultati.
- Aggiungi al menu dell'esempio l'opzione per stampare la data di oggi (la vedremo nella lezione 15).
- Nel triangolo, stampa gli spazi a sinistra per ottenere una piramide centrata.
