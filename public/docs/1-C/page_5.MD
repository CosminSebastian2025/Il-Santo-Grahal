# Cicli

### Che cos'è un ciclo?

Un ciclo è una struttura di controllo che permette di ripetere un blocco di istruzioni più volte, fino a quando una condizione specifica è soddisfatta. In C, i cicli sono utilizzati per eseguire operazioni ripetitive senza dover scrivere manualmente le stesse istruzioni più volte.

### Come funziona il ciclo `for`?

Il ciclo `for` è uno dei tipi più comuni di cicli in C. La sua sintassi è la seguente:

```c
for (inizializzazione; condizione; incremento) {
    // Blocco di istruzioni da eseguire
}
```

- **Inizializzazione**: Qui si inizializza una variabile di controllo del ciclo. Questa parte viene eseguita una sola volta all'inizio del ciclo.
- **Condizione**: Questa è una espressione booleana che viene valutata prima di ogni iterazione del ciclo. Se la condizione è vera, il ciclo continua; se è falsa, il ciclo termina.
- **Incremento**: Questa parte viene eseguita alla fine di ogni iterazione del ciclo. Di solito, si utilizza per aggiornare la variabile di controllo del ciclo.

### Esempi di ciclo `for`

```c
#include <stdio.h>
 int main() {
    int i;
    for (i = 0; i < 5; i++) {
        printf("Iterazione %d\n", i);
    }
    return 0;
 }
```

In questo esempio, il ciclo `for` inizializza la variabile `i` a 0, controlla se `i` è minore di 5 e, se la condizione è vera, esegue il blocco di istruzioni all'interno del ciclo. Dopo ogni iterazione, `i` viene incrementato di 1. Il ciclo continuerà fino a quando `i` non sarà più minore di 5.

Un altro esempio dì ciclo `for` pratico:

```c
#include <stdio.h>

 int main() {

    int numero, somma = 0;


    for (int i = 0; i < 5; i++) {
        printf("Inserisici il %d numero: ", i);
        scanf("%d", &numero);

        somma += numero;
    }

    printf("Il risultato della somma e di %d", somma);
    return 0;
 }
```

In questo esempio dichiariamo due variabili intere: `numero` e `somma`. Inizializziamo la`somma`  a zero. Il programma chiede all'utente di inserire un numero per cinque volte;a ogni volta inserimento, aggiunge il numero a `somma`. Al termine del ciclo `for`, mostra la somma dei cinque numeri inseriti.


<a href="/esercizi/1-C/es_4.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica il primo esercizio</a>

<a href="/esercizi/1-C/es_5.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica il secondo esercizio</a>