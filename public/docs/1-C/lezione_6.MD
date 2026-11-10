# Lezione 6: Array

### Che cos'è un array?

Un array è una collezione di valori **dello stesso tipo**, memorizzati uno dopo l'altro. Invece di creare 5 variabili separate, se ne crea una sola che contiene 5 elementi.

```c
int voti[5];
```

Questa riga crea un array di 5 interi. Gli elementi si numerano da **0** a **4**, non da 1 a 5:

```text
voti[0]  voti[1]  voti[2]  voti[3]  voti[4]
```

### Dichiarare e inizializzare

```c
int voti[5];                          // 5 interi, valori non inizializzati
int voti[5] = {6, 7, 8, 5, 9};        // 5 valori
int voti[5] = {6, 7};                 // i restanti diventano 0
int voti[5] = {0};                    // tutti gli elementi a 0
```

La dimensione deve essere una costante nota al compilatore. Per evitare di ripetere lo stesso numero in tutto il programma si usa una macro:

```c
#define N 5

int voti[N];
```

### Leggere e stampare un array

```c
#include <stdio.h>

#define N 5

int main() {
    int voti[N];

    for (int i = 0; i < N; i++) {
        printf("Voto %d: ", i + 1);
        scanf("%d", &voti[i]);
    }

    printf("Voti inseriti:\n");
    for (int i = 0; i < N; i++) {
        printf("voti[%d] = %d\n", i, voti[i]);
    }

    return 0;
}
```

Nella `scanf` si usa `&voti[i]`, perché bisogna passare l'indirizzo dell'elemento che deve essere riempito.

Il ciclo parte da `0` e va fino a `N - 1`: è la convenzione corretta per attraversare un array.

### Esempio: somma e media

```c
#include <stdio.h>

#define N 5

int main() {
    int voti[N] = {6, 7, 8, 5, 9};
    int somma = 0;

    for (int i = 0; i < N; i++) {
        somma += voti[i];
    }

    printf("Somma: %d\n", somma);
    printf("Media: %.2f\n", (float)somma / N);

    return 0;
}
```

Output:

```text
Somma: 35
Media: 7.00
```

### Esempio: trovare il massimo

```c
#include <stdio.h>

#define N 5

int main() {
    int voti[N] = {6, 9, 4, 8, 7};
    int massimo = voti[0];

    for (int i = 1; i < N; i++) {
        if (voti[i] > massimo) {
            massimo = voti[i];
        }
    }

    printf("Voto piu' alto: %d\n", massimo);

    return 0;
}
```

Si parte dal primo elemento e lo si confronta con tutti gli altri. Se un elemento è più grande, diventa il nuovo massimo.

### Attenzione ai limiti

C **non controlla** se l'indice è valido. Scrivere `voti[5]` in un array di 5 elementi (indici 0-4) è un errore: il programma può leggere o scrivere in una zona di memoria che non gli appartiene, con risultati imprevedibili o un crash.

Regola pratica: se l'array ha `N` elementi, gli indici validi vanno da `0` a `N - 1`.

### Errori comuni

- Partire da `1` invece che da `0` e saltare il primo elemento.
- Usare `<= N` in un ciclo: si esce dall'array.
- Dimenticare `&` nella `scanf` dell'elemento.
- Dichiarare l'array con una variabile non costante.
- Assegnare un intero a un array intero (`voti = 5;` non è valido): bisogna lavorare sui singoli elementi.

### Esercizi

**Esercizio 1.** Create un array di 5 interi con dei valori a scelta e stampate ogni elemento con il suo indice.

**Esercizio 2.** Leggete 5 voti da tastiera, calcolate e stampate la somma e la media.

**Esercizio 3.** Trovate e stampate il valore massimo di un array di 6 numeri interi, insieme alla sua posizione.

Output atteso (esempio):

```text
Massimo: 9 in posizione 3
```

**Esercizio 4.** Contate quanti voti di un array sono sufficienti (maggiori o uguali a 6).

**Esercizio 5.** Invertite l'ordine di un array di 5 elementi e stampatelo. Potete usare un secondo array oppure scambiare gli elementi sul posto.
