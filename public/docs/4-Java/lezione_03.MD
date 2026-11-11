# Lezione 3: Condizioni

Fino ad ora il programma esegue sempre tutte le istruzioni. Con le condizioni scegliamo quali istruzioni eseguire in base ai valori.

### La struttura if-else

```java
if (condizione) {
    // istruzioni se la condizione è vera
} else {
    // istruzioni se la condizione è falsa
}
```

- La condizione deve produrre un `boolean`: un confronto, una variabile `boolean` o una combinazione.
- Le parentesi graffe delimitano il blocco.
- `else` è facoltativo.

```java
int eta = 20;

if (eta >= 18) {
    System.out.println("Maggiorenne");
} else {
    System.out.println("Minorenne");
}
```

### Operatori di confronto e logici

| Operatore | Significato |
| --- | --- |
| `==` | uguale a |
| `!=` | diverso da |
| `>` `<` `>=` `<=` | maggiore, minore, maggiore o uguale, minore o uguale |
| `&&` | AND: entrambe vere |
| `\|\|` | OR: almeno una vera |
| `!` | NOT: inverte |

Attenzione alla differenza tra `=` e `==`:

- `x = 5;` **assegna** 5 a `x`.
- `x == 5` **confronta** `x` con 5.

In Java `if (x = 5)` non compila, perché l'assegnazione non produce un `boolean`. È un errore che il compilatore intercetta, ma la distrazione resta.

Esempio con l'AND:

```java
int temperatura = 20;

if (temperatura >= 18 && temperatura <= 25) {
    System.out.println("Temperatura nella norma");
} else {
    System.out.println("Temperatura fuori intervallo");
}
```

### Più scelte con else if

```java
int voto = 8;

if (voto == 10) {
    System.out.println("Ottimo");
} else if (voto >= 8) {
    System.out.println("Buono");
} else if (voto >= 6) {
    System.out.println("Sufficiente");
} else {
    System.out.println("Insufficiente");
}
```

Le condizioni si controllano dall'alto verso il basso e si fermano alla prima vera. Per questo l'ordine conta: se `voto >= 6` venisse prima di `voto >= 8`, un `8` sarebbe classificato come "Sufficiente".

### L'operatore ternario

Per una scelta semplice su un solo valore:

```java
int eta = 17;
String stato = eta >= 18 ? "maggiorenne" : "minorenne";
System.out.println(stato);
```

La forma è `condizione ? valoreSeVera : valoreSeFalsa`. Se la scelta richiede più istruzioni, usa `if`/`else`: il ternario annidato diventa illeggibile.

### switch classico

Confronta una variabile con più valori costanti.

```java
int giorno = 3;

switch (giorno) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
        System.out.println("Giorno feriale");
        break;
    case 6:
    case 7:
        System.out.println("Fine settimana");
        break;
    default:
        System.out.println("Giorno non valido");
}
```

- `break` esce dallo `switch`; senza `break` l'esecuzione continua nei `case` successivi (**fall-through**).
- `default` gestisce i valori non previsti.
- Funziona con `int`, `char`, `String` ed `enum`, non con `double`.

### switch moderno

Da Java 14 si può usare la freccia, senza `break`:

```java
String tipo = switch (giorno) {
    case 6, 7 -> "Fine settimana";
    case 1, 2, 3, 4, 5 -> "Feriale";
    default -> "Non valido";
};
```

Lo `switch` con freccia può anche restituire un valore. Questa forma è più compatta e non ha fall-through.

### Esempio completo

```java
import java.util.Scanner;

public class MenuPrezzi {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("1) Caffè 1.20");
        System.out.println("2) Cappuccino 1.80");
        System.out.println("3) Cornetto 1.50");
        System.out.print("Scelta: ");

        if (!scanner.hasNextInt()) {
            System.out.println("Scelta non valida");
            return;
        }

        int scelta = scanner.nextInt();
        double prezzo = switch (scelta) {
            case 1 -> 1.20;
            case 2 -> 1.80;
            case 3 -> 1.50;
            default -> -1;
        };

        if (prezzo < 0) {
            System.out.println("Prodotto non disponibile");
        } else {
            System.out.printf("Totale: %.2f euro%n", prezzo);
        }

        scanner.close();
    }
}
```

Con `2` l'output è `Totale: 1.80 euro`; con `9` è `Prodotto non disponibile`.

### Errori comuni

- Dimenticare `break` nello `switch` classico e ottenere due risultati.
- Confrontare stringhe con `==` in un `if` invece di `equals`.
- Invertire l'ordine delle condizioni in una catena `else if`.
- Scrivere `if (eta >= 18 || eta <= 65)` quando si intende `&&`: l'OR è quasi sempre vero.
- Usare `=` invece di `==` (in Java il compilatore lo segnala).
- Mettere un `;` dopo la parentesi: `if (x > 0);` chiude subito il blocco e il resto viene eseguito sempre.

## Esercizi progressivi

**Esercizio 1.** Leggi un numero e stampa `Positivo`, `Negativo` o `Zero`.

**Esercizio 2.** Leggi due numeri e stampa il maggiore; se sono uguali stampa `Sono uguali`.

**Esercizio 3.** Leggi un voto da 0 a 10 e stampa il giudizio con la catena `else if`: `Ottimo` da 10, `Buono` da 8, `Sufficiente` da 6, `Insufficiente` sotto 6. Valori fuori dall'intervallo producono `Voto non valido`.

**Esercizio 4.** Leggi un anno e stampa se è bisestile. Un anno è bisestile se è divisibile per 4 e non per 100, oppure se è divisibile per 400.

**Esercizio 5.** Leggi un carattere (`scanner.next().charAt(0)`) e stampa se è una vocale, una consonante o un carattere non alfabetico.

**Esercizio 6.** Leggi tre numeri e stampali in ordine crescente, senza usare array e senza ordinare con `sort`.

Output atteso con `9`, `2`, `5`:

```text
2 5 9
```

**Esercizio 7.** Simula un login: chiedi utente e password. Se utente è `admin` e password `1234` stampa `Accesso consentito`, altrimenti `Credenziali errate`. Dopo tre tentativi errati il programma termina con `Account bloccato` (usa un ciclo, che vedremo nella prossima lezione, oppure tre richieste consecutive).

**Esercizio 8.** Calcola il prezzo di un biglietto del cinema: base `10` euro, riduzione del `50%` per under 12 e over 65, del `20%` per studenti tra 12 e 25 anni. Usa `if`/`else if` e stampa il prezzo con due decimali.

### Varianti

- Rifai l'esercizio 3 con lo `switch` a freccia.
- Aggiungi all'esercizio 2 un messaggio diverso se la differenza tra i due numeri è maggiore di 100.
- Scrivi una versione con il ternario dell'esercizio 1 per stampare `Pari` o `Dispari` in base a `numero % 2 == 0`.
