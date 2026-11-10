# Lezione 1: Variabili e printf

### Cosa sono le variabili?

Una variabile è un contenitore con un nome che serve a memorizzare un valore durante l'esecuzione del programma. Ogni variabile ha un **tipo**, che stabilisce che cosa può contenere (numeri interi, numeri decimali, caratteri) e quanta memoria occupa.

```c
int eta;      // dichiarazione: creo una variabile di tipo int chiamata eta
eta = 18;     // assegnazione: metto il valore 18 dentro eta
```

Si può anche dichiarare e inizializzare nella stessa riga:

```c
int eta = 18;
```

**Inizializzare** significa assegnare un valore iniziale. Se una variabile locale non viene inizializzata, contiene un valore casuale, quindi è sempre meglio darle subito un valore.

### I tipi principali

| Tipo | Cosa contiene | Esempio | Specificatore per `printf` |
| --- | --- | --- | --- |
| `int` | Numeri interi | `int eta = 18;` | `%d` |
| `float` | Numeri decimali (precisione semplice) | `float altezza = 1.75f;` | `%f` |
| `double` | Numeri decimali (doppia precisione) | `double pi = 3.14159;` | `%f` |
| `char` | Un singolo carattere | `char iniziale = 'A';` | `%c` |

Alcune precisazioni:

- `char` vuole il carattere tra **apici singoli**: `'A'`. Le stringhe, che usano le virgolette doppie, le vedremo nella Lezione 7.
- `double` è più preciso di `float` e si usa spesso per i calcoli. Nella `scanf` richiede `%lf`, mentre nella `printf` si usa `%f`.
- Il suffisso `f` in `1.75f` dice al compilatore che il numero è un `float`.

### Stampare con printf

`printf` stampa del testo nel terminale. Dentro le virgolette possiamo mettere degli **specificatori di formato**, che vengono sostituiti dai valori indicati dopo la virgola, nell'ordine in cui compaiono.

```c
printf("Ciao!\n");
printf("Eta: %d\n", eta);
printf("Altezza: %.2f\n", altezza);
```

- `\n` va a capo.
- `%d` viene sostituito da un intero.
- `%f` viene sostituito da un numero decimale.
- `%.2f` stampa il numero con due cifre dopo la virgola.

Si possono stampare più valori in una sola chiamata:

```c
int a = 5;
int b = 3;

printf("%d + %d = %d\n", a, b, a + b);
```

Output:

```text
5 + 3 = 8
```

### Operatori aritmetici

| Operatore | Operazione | Esempio |
| --- | --- | --- |
| `+` | Addizione | `a + b` |
| `-` | Sottrazione | `a - b` |
| `*` | Moltiplicazione | `a * b` |
| `/` | Divisione | `a / b` |
| `%` | Resto della divisione tra interi | `a % b` |

Attenzione alla divisione tra interi: se entrambi gli operandi sono `int`, il risultato è intero e la parte decimale viene persa.

```c
printf("%d\n", 7 / 2);     // stampa 3
printf("%.2f\n", 7 / 2.0); // stampa 3.50
printf("%d\n", 7 % 2);     // stampa 1 (il resto)
```

Per ottenere un risultato decimale basta che almeno uno dei due numeri sia decimale.

### Esempio completo

```c
#include <stdio.h>

int main() {
    int voto1 = 6;
    int voto2 = 7;
    int voto3 = 8;
    float media;

    media = (voto1 + voto2 + voto3) / 3.0;

    printf("Voti: %d, %d, %d\n", voto1, voto2, voto3);
    printf("Media: %.2f\n", media);

    return 0;
}
```

Output:

```text
Voti: 6, 7, 8
Media: 7.00
```

Se avessimo scritto `/ 3` invece di `/ 3.0`, la somma sarebbe stata divisa per un intero e la media avrebbe perso i decimali.

### Commenti e nomi leggibili

I commenti servono a spiegare il codice e non vengono eseguiti:

```c
// Commento su una sola riga

/*
 * Commento su più righe
 * per spiegazioni più lunghe
 */
```

Scegliete nomi chiari: `eta_utente` è meglio di `e`. I nomi non possono contenere spazi, accenti o caratteri speciali e non possono iniziare con un numero.

### Errori comuni

- Usare una variabile senza averla inizializzata.
- Usare `%d` per stampare un `float` (o `%f` per un `int`): il risultato sarà sbagliato.
- Scrivere `'A'` per una stringa o `"A"` per un singolo `char`.
- Dimenticare il punto e virgola alla fine dell'istruzione.
- Assegnare un valore decimale a un `int`: la parte decimale viene persa.

### Esercizi

**Esercizio 1.** Dichiarate tre variabili: un `char` con la vostra iniziale, un `int` con la vostra età e un `float` con la vostra altezza. Stampatele con un'etichetta per ciascuna.

Output atteso (con i vostri dati):

```text
Iniziale: A
Eta: 17
Altezza: 1.75
```

**Esercizio 2.** Un rettangolo ha base `8` e altezza `5`. Calcolate e stampate area e perimetro usando due variabili `int`.

Output atteso:

```text
Area: 40
Perimetro: 26
```

**Esercizio 3.** Calcolate la media dei voti `6`, `7` e `8` e stampatela con due cifre decimali. Attenzione alla divisione tra interi.

**Esercizio 4.** Senza eseguire il programma, prevedete l'output e poi verificate nel compilatore:

```c
printf("%d\n", 9 / 2);
printf("%.2f\n", 9 / 2.0);
printf("%d\n", 9 % 2);
```
