# Lezione 3: Condizioni if

Fino ad ora il programma esegue sempre tutte le istruzioni. Con le condizioni possiamo scegliere quali istruzioni eseguire in base ai valori.

### La struttura if-else

```c
if (condizione) {
    // istruzioni eseguite se la condizione è vera
} else {
    // istruzioni eseguite se la condizione è falsa
}
```

- La condizione va scritta tra parentesi tonde `( )`.
- Le parentesi graffe `{ }` delimitano il blocco di istruzioni.
- La parte `else` è facoltativa: se non serve un'alternativa, si può omettere.

### Operatori di confronto

| Operatore | Significato |
| --- | --- |
| `==` | uguale a |
| `!=` | diverso da |
| `>` | maggiore di |
| `<` | minore di |
| `>=` | maggiore o uguale a |
| `<=` | minore o uguale a |

Attenzione alla differenza tra `=` e `==`:

- `x = 5;` **assegna** 5 alla variabile `x`.
- `x == 5` **confronta** `x` con 5 e produce vero o falso.

Usare `=` dentro un `if` è un errore molto comune e il compilatore spesso lo segnala solo come avviso.

### Esempio: maggiore o minorenne

```c
#include <stdio.h>

int main() {
    int eta;

    printf("Inserisci la tua eta: ");
    scanf("%d", &eta);

    if (eta >= 18) {
        printf("Sei maggiorenne!\n");
    } else {
        printf("Sei minorenne!\n");
    }

    return 0;
}
```

Con `19` viene eseguito il primo blocco, con `17` il secondo.

### Più scelte con else if

Quando le possibilità sono più di due, si usa una catena `if` / `else if` / `else`:

```c
if (voto >= 10) {
    printf("Ottimo\n");
} else if (voto >= 8) {
    printf("Buono\n");
} else if (voto >= 6) {
    printf("Sufficiente\n");
} else {
    printf("Insufficiente\n");
}
```

Il programma controlla le condizioni dall'alto verso il basso e si ferma alla prima vera. Per questo l'ordine è importante: se mettessimo `voto >= 6` prima di `voto >= 8`, un voto alto verrebbe classificato come "Sufficiente".

### Operatori logici

| Operatore | Significato | Esempio |
| --- | --- | --- |
| `&&` | AND: entrambe le condizioni devono essere vere | `eta >= 18 && patente == 1` |
| `\|\|` | OR: almeno una condizione deve essere vera | `giorno == 6 \|\| giorno == 7` |
| `!` | NOT: inverte il valore | `!maggiorenne` |

Esempio: controllare se una temperatura è compresa tra 18 e 25 gradi, estremi inclusi.

```c
if (temperatura >= 18 && temperatura <= 25) {
    printf("Temperatura nella norma.\n");
} else {
    printf("Temperatura fuori dall'intervallo.\n");
}
```

Con `20` entrambe le condizioni sono vere e il risultato di `&&` è vero. Con `27` la seconda condizione è falsa, quindi viene eseguito l'`else`.

Per l'OR basta che una condizione sia vera:

```c
if (giorno == 6 || giorno == 7) {
    printf("E' il fine settimana.\n");
} else {
    printf("E' un giorno feriale.\n");
}
```

### Esempio: numero pari o dispari

L'operatore `%` restituisce il resto della divisione. Un numero è pari quando il resto della divisione per 2 è zero:

```c
#include <stdio.h>

int main() {
    int numero;

    printf("Inserisci un numero: ");
    scanf("%d", &numero);

    if (numero % 2 == 0) {
        printf("Il numero e' pari.\n");
    } else {
        printf("Il numero e' dispari.\n");
    }

    return 0;
}
```

### Consigli pratici

- Mettete sempre le parentesi graffe, anche quando il blocco contiene una sola istruzione: il codice resta più chiaro e meno soggetto a errori.
- Indentate le istruzioni dentro i blocchi (di solito 4 spazi).
- Non annidate troppi `if`: se il codice diventa difficile da leggere, dividetelo in funzioni (Lezione 5).
- Ricordate che in C non esiste un tipo booleano obbligatorio: zero significa falso, qualsiasi valore diverso da zero significa vero.

### Esercizi

**Esercizio 1.** Leggete un numero intero e stampate se è pari o dispari.

**Esercizio 2.** Leggete due numeri e stampate il maggiore. Gestite anche il caso in cui i due numeri sono uguali.

Output atteso (esempio con `7` e `3`):

```text
Il maggiore e' 7
```

**Esercizio 3.** Leggete un voto da 0 a 10 e stampate il giudizio con la catena `else if`: `Ottimo` da 10, `Buono` da 8, `Sufficiente` da 6, `Insufficiente` sotto 6.

**Esercizio 4.** Leggete la temperatura e stampate `Temperatura nella norma` se è tra 18 e 25 gradi inclusi, altrimenti `Temperatura fuori dall'intervallo`.

**Esercizio 5.** Leggete un numero e stampate se è positivo, negativo o zero usando `if`, `else if` e `else`.
