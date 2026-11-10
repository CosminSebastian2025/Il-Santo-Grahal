# Lezione 5: Funzioni

### Perché usare le funzioni

Una funzione è un blocco di codice con un nome che possiamo richiamare quando serve. Serve a:

- evitare di ripetere lo stesso codice;
- dividere un programma grande in parti più piccole e comprensibili;
- riutilizzare una soluzione già scritta e testata.

Avete già usato funzioni senza accorgervene: `printf`, `scanf` e `main` sono funzioni.

### La sintassi

```c
tipo_restituito nome_funzione(tipo parametro1, tipo parametro2) {
    // istruzioni
    return valore;
}
```

- **tipo restituito** è il tipo del risultato (`int`, `float`, `double`, `char`).
- **parametri** sono i valori che la funzione riceve dall'esterno.
- **return** restituisce il risultato a chi ha chiamato la funzione.

Se la funzione non restituisce nulla si usa `void`.

### Esempio: una funzione che somma

```c
#include <stdio.h>

int somma(int a, int b) {
    return a + b;
}

int main() {
    int x = 7;
    int y = 3;
    int risultato;

    risultato = somma(x, y);
    printf("Risultato: %d\n", risultato);

    return 0;
}
```

Output:

```text
Risultato: 10
```

Quando `main` chiama `somma(x, y)`, i valori di `x` e `y` vengono copiati nei parametri `a` e `b`. La funzione calcola e restituisce la somma, che viene salvata in `risultato`.

### Esempio: funzione void

Una funzione `void` non restituisce un valore e serve solo a eseguire delle istruzioni:

```c
#include <stdio.h>

void stampaRiga(void) {
    printf("--------------------\n");
}

int main() {
    stampaRiga();
    printf("Titolo\n");
    stampaRiga();

    return 0;
}
```

Output:

```text
--------------------
Titolo
--------------------
```

La parola `void` tra le parentesi indica che la funzione non riceve parametri. Si può anche scrivere `stampaRiga()` senza `void`; entrambe le forme sono accettate.

### Esempio: funzione che restituisce vero o falso

In C non è obbligatorio usare un tipo booleano: una funzione può restituire `1` per vero e `0` per falso.

```c
#include <stdio.h>

int pari(int n) {
    return n % 2 == 0;
}

int main() {
    int numero;

    printf("Inserisci un numero: ");
    scanf("%d", &numero);

    if (pari(numero)) {
        printf("Il numero e' pari.\n");
    } else {
        printf("Il numero e' dispari.\n");
    }

    return 0;
}
```

L'espressione `n % 2 == 0` vale `1` quando è vera e `0` quando è falsa, quindi può essere restituita direttamente.

### Esempio: massimo tra tre numeri

```c
#include <stdio.h>

int massimo(int a, int b, int c) {
    int max = a;

    if (b > max) {
        max = b;
    }

    if (c > max) {
        max = c;
    }

    return max;
}

int main() {
    printf("Massimo: %d\n", massimo(4, 9, 6));
    return 0;
}
```

Output:

```text
Massimo: 9
```

### Il passaggio per valore

In C i parametri vengono passati **per valore**: la funzione riceve una copia. Se modificate `a` dentro la funzione, la variabile originale nel `main` non cambia.

```c
void raddoppia(int n) {
    n = n * 2;   // modifica solo la copia locale
}

int main() {
    int x = 5;
    raddoppia(x);
    printf("%d\n", x);   // stampa 5, non 10
    return 0;
}
```

Per modificare davvero la variabile originale serviranno i puntatori, che vedremo nella Lezione 8.

### Prototipo e ordine delle funzioni

Il compilatore deve conoscere una funzione prima che venga usata. Per questo di solito le funzioni si scrivono **prima** di `main`. In alternativa si può dichiarare il **prototipo** prima di `main` e scrivere il corpo dopo:

```c
#include <stdio.h>

int somma(int a, int b);   // prototipo

int main() {
    printf("%d\n", somma(2, 3));
    return 0;
}

int somma(int a, int b) {  // definizione
    return a + b;
}
```

### Variabili locali

Le variabili dichiarate dentro una funzione esistono solo in quella funzione. Due funzioni possono avere una variabile con lo stesso nome senza entrare in conflitto.

### Errori comuni

- Dimenticare il `return` in una funzione che deve restituire un valore.
- Restituire un tipo diverso da quello dichiarato.
- Usare una funzione prima di averla dichiarata o definita.
- Pensare che modificare un parametro cambi la variabile originale (passaggio per valore).

### Esercizi

**Esercizio 1.** Scrivete una funzione `int somma(int a, int b)` e usatela nel `main` con due numeri letti da tastiera.

**Esercizio 2.** Scrivete una funzione `int pari(int n)` che restituisce `1` se il numero è pari e `0` altrimenti. Usatela in un `if`.

**Esercizio 3.** Scrivete una funzione `int massimo(int a, int b, int c)` e stampate il maggiore tra tre numeri letti da tastiera.

**Esercizio 4.** Scrivete una funzione `float areaRettangolo(float base, float altezza)` che restituisce l'area e stampate il risultato con due decimali.

**Esercizio 5.** Scrivete una funzione `void saluta(void)` che stampa `Ciao!` e chiamatela due volte dal `main`.
