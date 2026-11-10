# Lezione 4: Cicli while e for

Un ciclo permette di ripetere un blocco di istruzioni più volte, senza doverlo copiare e incollare.

### Il ciclo while

Il `while` ripete il blocco **finché** la condizione è vera:

```c
while (condizione) {
    // istruzioni ripetute
}
```

Esempio: conto alla rovescia da 5 a 1.

```c
#include <stdio.h>

int main() {
    int i = 5;

    while (i >= 1) {
        printf("%d\n", i);
        i--;   // equivale a i = i - 1
    }

    printf("Via!\n");

    return 0;
}
```

Output:

```text
5
4
3
2
1
Via!
```

La condizione viene controllata **prima** di ogni ripetizione. Se all'inizio è già falsa, il blocco non viene eseguito nemmeno una volta.

**Attenzione:** dentro il ciclo deve esserci qualcosa che prima o poi rende falsa la condizione. Se dimenticate `i--`, il ciclo non termina mai (ciclo infinito).

### Il ciclo for

Il `for` è comodo quando sappiamo quante volte ripetere il blocco. Mette nella stessa riga inizializzazione, condizione e incremento:

```c
for (inizializzazione; condizione; incremento) {
    // istruzioni ripetute
}
```

Esempio: stampare i numeri da 1 a 5.

```c
#include <stdio.h>

int main() {
    for (int i = 1; i <= 5; i++) {
        printf("Iterazione %d\n", i);
    }

    return 0;
}
```

Output:

```text
Iterazione 1
Iterazione 2
Iterazione 3
Iterazione 4
Iterazione 5
```

Il funzionamento è questo:

1. `int i = 1` viene eseguito una sola volta all'inizio.
2. Prima di ogni ripetizione si controlla `i <= 5`.
3. Dopo ogni ripetizione si esegue `i++` (cioè `i = i + 1`).
4. Quando `i` diventa `6`, la condizione è falsa e il ciclo termina.

### Esempio: somma dei primi N numeri

```c
#include <stdio.h>

int main() {
    int n;
    int somma = 0;

    printf("Quanti numeri vuoi sommare? ");
    scanf("%d", &n);

    for (int i = 1; i <= n; i++) {
        somma += i;   // equivale a somma = somma + i
    }

    printf("La somma da 1 a %d e' %d\n", n, somma);

    return 0;
}
```

Con `n = 5` il risultato è `15`, perché `1 + 2 + 3 + 4 + 5 = 15`.

### Esempio: leggere più valori

```c
#include <stdio.h>

int main() {
    int n;
    int numero;
    int somma = 0;

    printf("Quanti numeri vuoi inserire? ");
    scanf("%d", &n);

    for (int i = 0; i < n; i++) {
        printf("Numero %d: ", i + 1);
        scanf("%d", &numero);
        somma += numero;
    }

    printf("Somma totale: %d\n", somma);

    return 0;
}
```

### Esempio: media di N voti

```c
#include <stdio.h>

int main() {
    int n;
    int voto;
    int somma = 0;

    printf("Quanti voti? ");
    scanf("%d", &n);

    for (int i = 0; i < n; i++) {
        printf("Voto %d: ", i + 1);
        scanf("%d", &voto);
        somma += voto;
    }

    if (n > 0) {
        printf("Media: %.2f\n", (float)somma / n);
    } else {
        printf("Nessun voto inserito.\n");
    }

    return 0;
}
```

`(float)somma` trasforma temporaneamente la somma in un numero decimale, così la divisione non perde i decimali.

### Quando usare while o for?

- Usate `for` quando sapete già quante ripetizioni servono (per esempio "leggi 5 voti").
- Usate `while` quando la ripetizione dipende da una condizione che può cambiare in modo imprevedibile (per esempio "continua finché l'utente non inserisce 0").

Con `while` si può leggere un numero arbitrario di valori usando un valore speciale che segnala la fine:

```c
int numero;
int somma = 0;

printf("Inserisci numeri (0 per terminare):\n");
scanf("%d", &numero);

while (numero != 0) {
    somma += numero;
    scanf("%d", &numero);
}

printf("Somma: %d\n", somma);
```

### Errori comuni

- Dimenticare di aggiornare la variabile del `while`: ciclo infinito.
- Sbagliare il limite del `for` (`<` invece di `<=`): una ripetizione in più o in meno.
- Modificare la variabile del ciclo dentro il blocco: il conteggio diventa difficile da seguire.
- Dimenticare le parentesi graffe quando il blocco ha più di un'istruzione.

### Esercizi

**Esercizio 1.** Stampate i numeri da 1 a 10 con un ciclo `for`.

**Esercizio 2.** Chiedete un numero `N` e calcolate la somma dei numeri da 1 a `N` con un ciclo `for`.

**Esercizio 3.** Chiedete un numero e stampate la sua tabellina da 1 a 10.

Output atteso con `3`:

```text
3 x 1 = 3
3 x 2 = 6
3 x 3 = 9
...
3 x 10 = 30
```

**Esercizio 4.** Calcolate la media di `N` voti letti da tastiera, con `N` scelto dall'utente. Se `N` è zero, stampate un messaggio invece di dividere per zero.

**Esercizio 5.** Continuate a leggere numeri con un `while` finché l'utente non inserisce `0`, poi stampate la somma di tutti i numeri inseriti.
