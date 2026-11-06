# Memoria Dinamica

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

- capire il concetto di memoria dinamica
- usare `malloc`, `calloc`, `realloc` e `free` correttamente
- evitare errori come memory leak e accessi illegali
- applicare la memoria dinamica a dati di dimensione variabile

### Che cos'è la memoria dinamica?

La memoria dinamica permette di allocare memoria durante l'esecuzione del programma, cioè quando il programma è già in esecuzione e non si conosce ancora quanti dati serviranno.

In C si usa la memoria dinamica per creare strutture dati di dimensione variabile.

### Funzioni principali

Le funzioni principali sono:

- `malloc` → alloca memoria
- `calloc` → alloca memoria e inizializza a zero
- `realloc` → ridimensiona la memoria già allocata
- `free` → libera la memoria allocata

### Esempio con `malloc`

```c
#include <stdio.h>
#include <stdlib.h>

int main() {
    int *numeri = malloc(5 * sizeof(int));

    if (numeri == NULL) {
        printf("Errore di allocazione\n");
        return 1;
    }

    for (int i = 0; i < 5; i++) {
        numeri[i] = i + 1;
        printf("%d\n", numeri[i]);
    }

    free(numeri);
    return 0;
}
```

### Perché è importante liberare la memoria?

Se non si usa `free`, la memoria occupata dal programma non viene restituita al sistema. Questo può causare problemi di prestazioni e perdite di memoria.

### `calloc` vs `malloc`

- `malloc` alloca memoria senza inizializzarla
- `calloc` alloca memoria e la riempie di zeri

```c
int *vettore = calloc(5, sizeof(int));
```

### `realloc`

`realloc` serve per aumentare o diminuire la memoria già allocata.

```c
int *vettore = malloc(3 * sizeof(int));
vetore = realloc(vettore, 5 * sizeof(int));
```

### Errori comuni

- dimenticare di controllare `NULL`
- non liberare la memoria allocata
- usare la memoria dopo averla liberata

### Esercizi

1. Allocare dinamicamente un array di 5 numeri e stamparli.
2. Calcolare la somma dei valori di un array allocato dinamicamente.
3. Usare `calloc` per creare un array inizializzato a zero.
4. Aumentare la dimensione di un array con `realloc`.
5. Allocare memoria per un vettore e liberarla correttamente.

<a href="/esercizi/1-C/es_10.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizi sulla memoria dinamica</a>

---

### Esercizio pratico finale

```c
#include <stdio.h>
#include <stdlib.h>

int main() {
    int *vettore = malloc(4 * sizeof(int));
    int somma = 0;

    if (vettore == NULL) {
        printf("Errore\n");
        return 1;
    }

    for (int i = 0; i < 4; i++) {
        vettore[i] = i + 2;
        somma += vettore[i];
    }

    printf("La somma e': %d\n", somma);
    free(vettore);
    return 0;
}
```

La memoria dinamica è fondamentale quando il programma deve gestire dati di dimensione non nota in fase di scrittura.

<a href="./page_11.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
