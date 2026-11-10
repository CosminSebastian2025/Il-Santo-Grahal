# Lezione 2: Input con scanf

Nella lezione precedente i valori erano scritti direttamente nel codice. Ora vediamo come chiederli all'utente tramite la tastiera usando `scanf`.

### Leggere un valore

`scanf` funziona in modo simile a `printf`, ma al contrario: legge un valore dal terminale e lo salva in una variabile.

```c
#include <stdio.h>

int main() {
    int numero;

    printf("Inserisci un numero intero: ");
    scanf("%d", &numero);
    printf("Hai inserito: %d\n", numero);

    return 0;
}
```

Output di una possibile esecuzione:

```text
Inserisci un numero intero: 42
Hai inserito: 42
```

La differenza più importante rispetto a `printf` è il simbolo **`&`** davanti al nome della variabile. `&` significa "indirizzo di": serve a dire a `scanf` dove si trova la variabile in memoria, così può scriverci dentro il valore letto. Senza `&`, il programma probabilmente va in crash.

### Specificatori di formato

| Tipo da leggere | Specificatore | Esempio |
| --- | --- | --- |
| `int` | `%d` | `scanf("%d", &n);` |
| `float` | `%f` | `scanf("%f", &prezzo);` |
| `double` | `%lf` | `scanf("%lf", &pi);` |
| `char` | `%c` | `scanf(" %c", &lettera);` |
| stringa (una parola) | `%s` | `scanf("%19s", nome);` |

Lo specificatore deve corrispondere al tipo della variabile. Se usate `%d` con un `float`, `scanf` leggerà i dati in modo errato.

### Leggere più valori

Si possono leggere più valori con una sola `scanf`, separando gli specificatori e passando tutte le variabili:

```c
int a, b;

printf("Inserisci due numeri: ");
scanf("%d %d", &a, &b);
printf("Somma: %d\n", a + b);
```

L'utente può separare i due numeri con uno spazio o con Invio.

### Leggere un carattere

Con i caratteri c'è una piccola trappola: quando premete Invio dopo un numero, il carattere di a capo resta nel buffer di input e `scanf("%c", ...)` potrebbe leggerlo al posto della lettera. La soluzione semplice è mettere uno spazio prima di `%c`:

```c
char lettera;

printf("Inserisci una lettera: ");
scanf(" %c", &lettera);   // lo spazio salta spazi e Invio precedenti
printf("Hai inserito: %c\n", lettera);
```

### Leggere una parola (anticipo sulle stringhe)

Per leggere una parola si usa un array di `char` e `%s`, **senza** `&`:

```c
char nome[20];

printf("Inserisci il tuo nome: ");
scanf("%19s", nome);
printf("Ciao %s!\n", nome);
```

Il numero `19` indica il massimo di caratteri da leggere, per non superare la dimensione dell'array (che deve contenere anche il carattere di fine stringa). `%s` legge solo fino al primo spazio: "Anna Maria" verrebbe letta come "Anna". Le stringhe complete le vedremo nella Lezione 7.

### Controllare che l'input sia valido

`scanf` restituisce il numero di valori letti con successo. È utile controllarlo per evitare che il programma usi dati sbagliati:

```c
int numero;

printf("Inserisci un numero: ");
if (scanf("%d", &numero) != 1) {
    printf("Input non valido.\n");
    return 1;
}

printf("Numero letto: %d\n", numero);
```

Se l'utente scrive una lettera invece di un numero, la condizione è vera e il programma stampa l'errore invece di proseguire con un valore casuale.

### Esempio completo

```c
#include <stdio.h>

int main() {
    char nome[20];
    int eta;

    printf("Nome: ");
    scanf("%19s", nome);

    printf("Eta: ");
    scanf("%d", &eta);

    printf("Ciao %s, hai %d anni.\n", nome, eta);

    return 0;
}
```

Output:

```text
Nome: Anna
Eta: 17
Ciao Anna, hai 17 anni.
```

### Errori comuni

- Dimenticare `&` davanti alle variabili di `scanf` (tranne per le stringhe/array).
- Usare `%d` per leggere un `float` o viceversa.
- Usare `%c` senza lo spazio iniziale dopo una lettura precedente.
- Leggere una parola più lunga del buffer: usate sempre una larghezza massima come `%19s`.

### Esercizi

**Esercizio 1.** Chiedete nome ed età e stampate un saluto.

Output atteso:

```text
Ciao Anna, hai 17 anni.
```

**Esercizio 2.** Leggete due numeri interi e stampate la loro somma, differenza, prodotto e divisione intera.

**Esercizio 3.** Convertite una temperatura da Celsius a Fahrenheit con la formula `F = C * 9 / 5 + 32`. Leggete la temperatura con un `float` e stampate il risultato con una cifra decimale.

Esempio:

```text
Temperatura in Celsius: 20
Temperatura in Fahrenheit: 68.0
```

**Esercizio 4.** Leggete un numero di minuti (per esempio `135`) e trasformarlo in ore e minuti usando `/` e `%`.

Output atteso:

```text
2 ore e 15 minuti
```
