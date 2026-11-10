# Lezione 9: Memoria dinamica

### Due modi di usare la memoria

Fino ad ora abbiamo creato array con una dimensione fissa, decisa mentre scriviamo il programma:

```c
int voti[100];
```

Se l'utente ha 5 voti, sprechiamo spazio; se ne ha 200, il programma non basta. La **memoria dinamica** permette di decidere la dimensione mentre il programma è in esecuzione, chiedendola al sistema con `malloc`.

La memoria dinamica si trova nell'**heap**. Le variabili locali e gli array fissi si trovano nello **stack**. La differenza pratica è questa: lo stack si libera da solo quando la funzione termina, l'heap va liberato manualmente con `free`.

### malloc

`malloc` (memory allocation) riserva un blocco di memoria e restituisce un puntatore al suo inizio. Si trova in `stdlib.h`.

```c
#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;

    printf("Quanti voti? ");
    scanf("%d", &n);

    int *voti = malloc(n * sizeof(int));

    if (voti == NULL) {
        printf("Memoria non disponibile.\n");
        return 1;
    }

    for (int i = 0; i < n; i++) {
        printf("Voto %d: ", i + 1);
        scanf("%d", &voti[i]);
    }

    int somma = 0;
    for (int i = 0; i < n; i++) {
        somma += voti[i];
    }

    printf("Somma: %d\n", somma);

    free(voti);   // libera la memoria
    voti = NULL;  // evita di usare un puntatore non piu' valido

    return 0;
}
```

Punti importanti:

- `n * sizeof(int)` calcola quanti byte servono per `n` interi.
- `malloc` restituisce `NULL` se non riesce a riservare la memoria: va sempre controllato.
- `free` restituisce la memoria al sistema.
- Dopo `free` il puntatore non è più utilizzabile. Assegnargli `NULL` aiuta a evitare errori.

### calloc

`calloc` riserva memoria e la inizializza tutta a zero:

```c
int *voti = calloc(n, sizeof(int));

if (voti == NULL) {
    printf("Memoria non disponibile.\n");
    return 1;
}
```

Con `calloc` tutti gli elementi valgono `0` da subito. Con `malloc` i valori sono indeterminati finché non li scrivete voi.

### realloc

`realloc` cambia la dimensione di un blocco già allocato:

```c
int *voti = malloc(3 * sizeof(int));

// ... uso dell'array ...

int *piu_grandi = realloc(voti, 6 * sizeof(int));

if (piu_grandi == NULL) {
    printf("Memoria non disponibile.\n");
    free(voti);
    return 1;
}

voti = piu_grandi;
```

I dati già presenti vengono conservati. Usate sempre un puntatore temporaneo (`piu_grandi`): se `realloc` fallisce e sovrascriveste direttamente `voti` con `NULL`, perdereste l'unico riferimento al blocco originale.

### Esempio completo: media con dimensione scelta dall'utente

```c
#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;

    printf("Quanti numeri? ");
    scanf("%d", &n);

    if (n <= 0) {
        printf("Numero non valido.\n");
        return 1;
    }

    double *numeri = malloc(n * sizeof(double));

    if (numeri == NULL) {
        printf("Memoria non disponibile.\n");
        return 1;
    }

    double somma = 0.0;
    for (int i = 0; i < n; i++) {
        printf("Numero %d: ", i + 1);
        scanf("%lf", &numeri[i]);
        somma += numeri[i];
    }

    printf("Media: %.2f\n", somma / n);

    free(numeri);
    numeri = NULL;

    return 0;
}
```

### Le regole d'oro

1. Ogni `malloc` o `calloc` deve avere il suo `free`.
2. Non usate la memoria dopo averla liberata.
3. Non liberate due volte lo stesso blocco.
4. Non chiamate `free` su indirizzi che non vengono da `malloc` (per esempio l'indirizzo di una variabile locale).
5. Controllate sempre che il puntatore non sia `NULL` prima di usarlo.
6. Per array e strutture usate `sizeof` per calcolare la dimensione corretta.

### Errori comuni

- Dimenticare `free`: il programma perde memoria mentre gira (memory leak).
- Liberare memoria ancora in uso.
- Usare `malloc(10)` pensando a 10 elementi invece di 10 byte.
- Dereferenziare un puntatore `NULL` dopo un'allocazione fallita.
- Perdere il puntatore originale durante una `realloc` fallita.

### Esercizi

**Esercizio 1.** Allocate con `malloc` un array di 5 interi, riempitelo con valori a scelta, stampatelo e liberate la memoria con `free`.

**Esercizio 2.** Chiedete all'utente quanti numeri vuole inserire, allocate l'array con `malloc`, calcolate la media e liberate la memoria.

**Esercizio 3.** Allocate un array di 3 interi, leggete i valori, poi usate `realloc` per portarlo a 6 elementi. Riempite i nuovi 3 elementi e stampate tutti i 6 valori.

**Esercizio 4.** Create un array con `calloc` e verificate che tutti gli elementi siano inizializzati a zero prima di scriverci sopra.

**Esercizio 5.** Scrivete una funzione `int *creaArray(int n)` che alloca e restituisce un array di `n` interi azzerati, e chiamatela dal `main` ricordandovi di liberare la memoria.
