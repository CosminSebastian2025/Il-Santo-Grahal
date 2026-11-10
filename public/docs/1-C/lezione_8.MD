# Lezione 8: Puntatori

### Ogni variabile ha un indirizzo

Quando dichiarate una variabile, il computer le riserva uno spazio in memoria. Ogni spazio ha un **indirizzo**, cioè una posizione. Un puntatore è una variabile che contiene l'indirizzo di un'altra variabile.

```c
int x = 42;

printf("Valore: %d\n", x);
printf("Indirizzo: %p\n", (void *)&x);
```

- `&x` restituisce l'indirizzo di `x`.
- `%p` è lo specificatore usato per stampare un indirizzo.
- `(void *)` è una conversione necessaria per usare `%p` correttamente.

L'indirizzo stampato cambia a ogni esecuzione: non è un valore su cui fare calcoli.

### Dichiarare un puntatore

```c
int x = 42;
int *p = &x;   // p contiene l'indirizzo di x
```

La sintassi `int *p` si legge "p è un puntatore a int". L'asterisco fa parte della dichiarazione, non del nome.

### Dereferenziare un puntatore

Con l'operatore `*` si accede al valore contenuto all'indirizzo puntato:

```c
#include <stdio.h>

int main() {
    int x = 42;
    int *p = &x;

    printf("x = %d\n", x);
    printf("*p = %d\n", *p);   // legge il valore puntato

    *p = 100;                  // scrive attraverso il puntatore
    printf("x dopo la modifica = %d\n", x);

    return 0;
}
```

Output:

```text
x = 42
*p = 42
x dopo la modifica = 100
```

`*p = 100` modifica direttamente `x`, perché `p` contiene il suo indirizzo. Questa è la differenza fondamentale rispetto al passaggio per valore della Lezione 5.

### Puntatori e array

Il nome di un array, usato in un'espressione, rappresenta l'indirizzo del primo elemento:

```c
int voti[3] = {6, 7, 8};
int *p = voti;        // equivale a &voti[0]

printf("%d\n", *p);       // 6
printf("%d\n", *(p + 1)); // 7
printf("%d\n", p[2]);     // 8
```

Le tre scritture seguenti sono equivalenti:

```c
voti[i]
*(voti + i)
*(p + i)
```

L'aritmetica dei puntatori avanza di un elemento alla volta, non di un byte: `p + 1` punta all'intero successivo.

### Esempio: scambiare due variabili

Con il passaggio per valore una funzione non può modificare le variabili del chiamante. Con i puntatori sì:

```c
#include <stdio.h>

void scambia(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 3;
    int y = 7;

    scambia(&x, &y);

    printf("x = %d, y = %d\n", x, y);

    return 0;
}
```

Output:

```text
x = 7, y = 3
```

La funzione riceve gli indirizzi (`&x`, `&y`) e modifica i valori originali tramite `*a` e `*b`.

### Perché i puntatori sono importanti

- Permettono alle funzioni di modificare i dati del chiamante.
- Sono la base degli array e delle stringhe.
- Servono per gestire la memoria dinamica (Lezione 9) e le strutture collegate.
- Rendono possibile passare grandi quantità di dati senza copiarli.

### Errori comuni e pericoli

- **Puntatore non inizializzato**: contiene un indirizzo casuale. Dereferenziarlo può far crashare il programma.
- **Puntatore nullo**: `int *p = NULL;` è un puntatore che non punta a nulla. Non va mai dereferenziato.
- **Dimenticare `&`** quando si assegna un indirizzo: `int *p = x;` è sbagliato, serve `&x`.
- **Usare `*` in modo sbagliato**: `*p` legge il valore, `p` è l'indirizzo.
- **Puntatore a memoria liberata**: dopo `free` il puntatore non è più valido (Lezione 9).

```c
int *p = NULL;

if (p != NULL) {
    printf("%d\n", *p);   // eseguito solo se p punta a qualcosa
}
```

### Esercizi

**Esercizio 1.** Dichiarate un intero e stampate il suo valore e il suo indirizzo.

**Esercizio 2.** Dichiarate un puntatore alla variabile e raddoppiate il valore tramite il puntatore. Stampate la variabile per verificare la modifica.

**Esercizio 3.** Scrivete una funzione `void scambia(int *a, int *b)` e usatela per scambiare due numeri letti da tastiera.

**Esercizio 4.** Create un array di 5 interi e sommate i suoi elementi usando un puntatore e un ciclo, senza usare le parentesi quadre.

Suggerimento: partite da `int *p = voti;` e sommate `*(p + i)`.

**Esercizio 5.** Scrivete una funzione `void azzera(int *n)` che mette a `0` la variabile puntata e provatela nel `main`.
