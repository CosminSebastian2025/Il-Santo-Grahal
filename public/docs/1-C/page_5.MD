# Cicli

<div class="not-prose">
  <aside style="position: sticky; top: 1rem; margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; max-width: 260px;">
    <p style="margin: 0 0 0.75rem; font-weight: 700; color: #0f172a;">Menu del corso C</p>
    <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.35rem; font-size: 0.92rem;">
      <li><a href="./intro_c.MD">Introduzione</a></li>
      <li><a href="./page_1.MD">1. Variabili e tipi</a></li>
      <li><a href="./page_2.MD">2. Librerie</a></li>
      <li><a href="./page_3.MD">3. Input/Output</a></li>
      <li><a href="./page_4.MD">4. Operazioni e condizioni</a></li>
      <li><a href="./page_5.MD">5. Cicli</a></li>
      <li><a href="./page_6.MD">6. Funzioni</a></li>
      <li><a href="./page_7.MD">7. Array</a></li>
      <li><a href="./page_8.MD">8. Stringhe</a></li>
      <li><a href="./page_9.MD">9. Puntatori</a></li>
      <li><a href="./page_10.MD">10. Memoria dinamica</a></li>
      <li><a href="./page_11.MD">11. File</a></li>
      <li><a href="./page_12.MD">12. Progetto finale</a></li>
      <li><a href="./page_13.MD">13. Indice conclusivo</a></li>
    </ul>
  </aside>
</div>

## Obiettivi di apprendimento

- capire cos'è un ciclo e perché è utile
- usare `for` per eseguire istruzioni in modo ripetuto
- controllare condizione, inizializzazione e incremento
- applicare i cicli a problemi reali come somme e controlli ripetuti

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

<a href="./page_6.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>