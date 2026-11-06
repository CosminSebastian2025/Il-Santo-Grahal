# Array

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

- capire cos'è un array e come viene memorizzato
- usare correttamente gli indici
- lavorare con array monodimensionali e bidimensionali
- usare i cicli per scorrere e manipolare i dati

### Che cos'è un array?

Un array è una struttura che permette di memorizzare molti valori dello stesso tipo in una sola variabile. Per esempio, invece di creare 10 variabili diverse, si può usare un array.

```c
int numeri[5];
```

Questo significa che `numeri` può contenere 5 valori interi.

### Indici degli elementi

Gli elementi di un array sono organizzati in posizioni chiamate indici. In C, il primo elemento ha indice `0`.

```c
int numeri[5] = {10, 20, 30, 40, 50};
printf("%d\n", numeri[0]); // stampa 10
printf("%d\n", numeri[2]); // stampa 30
```

### Array monodimensionali

Un array monodimensionale è una sequenza di valori:

```c
int voti[4] = {7, 8, 6, 9};
```

### Array bidimensionali

Un array bidimensionale è come una tabella, con righe e colonne.

```c
int matrice[2][3] = {
    {1, 2, 3},
    {4, 5, 6}
};
```

In questo caso:

- `matrice[0]` è la prima riga
- `matrice[0][1]` è il secondo elemento della prima riga

### Perché usare gli array?

Gli array servono per:

- memorizzare insiemi di dati
- gestire liste di numeri
- lavorare con matrici
- semplificare il codice con i cicli

### Esempio con un ciclo

```c
#include <stdio.h>

int main() {
    int numeri[5] = {1, 2, 3, 4, 5};

    for (int i = 0; i < 5; i++) {
        printf("%d\n", numeri[i]);
    }

    return 0;
}
```

### Errori comuni

- usare un indice fuori dai limiti dell'array
- inizializzare un array con più valori del previsto
- confondere la prima posizione con la posizione 1

### Esercizi

1. Creare un array di 5 numeri e stamparli tutti.
2. Trovare il numero maggiore in un array.
3. Calcolare la somma di tutti gli elementi di un array.
4. Invertire gli elementi di un array.
5. Creare una matrice 3x3 e stamparla a schermo.

<a href="/esercizi/1-C/es_7.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizi sugli array</a>

---

### Esercizio pratico finale

```c
#include <stdio.h>

int main() {
    int valori[5] = {12, 5, 8, 20, 3};
    int somma = 0;

    for (int i = 0; i < 5; i++) {
        somma += valori[i];
    }

    printf("La somma e': %d\n", somma);
    return 0;
}
```

Gli array sono molto utili quando bisogna gestire molti dati in modo ordinato.

<a href="./page_8.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
