# Puntatori

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

- capire cosa è un puntatore e come si dichiara
- distinguere tra variabile, indirizzo e valore puntato
- usare `&` e `*` in modo corretto
- applicare i puntatori a funzioni, array e parametri

### Che cos'è un puntatore?

Un puntatore è una variabile che contiene l'indirizzo di un'altra variabile nella memoria. È uno degli argomenti più importanti del C, perché consente di lavorare direttamente con la memoria del computer.

```c
int numero = 10;
int *puntatore = &numero;
```

Qui:

- `numero` è una variabile normale
- `&numero` è l'indirizzo di `numero`
- `*puntatore` permette di accedere al valore memorizzato nell'indirizzo

### Differenze importanti

```c
int numero = 10;
int *p = &numero;

printf("Valore di numero: %d\n", numero);
printf("Valore puntato: %d\n", *p);
printf("Indirizzo di numero: %p\n", (void*)p);
```

### Perché usare i puntatori?

I puntatori servono a:

- passare variabili alle funzioni in modo più efficiente
- gestire array e stringhe
- lavorare con la memoria dinamica
- comprendere meglio la struttura del programma

### Passaggio per indirizzo

```c
#include <stdio.h>

void modifica(int *x) {
    *x = 20;
}

int main() {
    int numero = 10;
    modifica(&numero);
    printf("Numero: %d\n", numero);
    return 0;
}
```

In questo esempio la funzione modifica il valore originale della variabile tramite il puntatore.

### Puntatori e array

Gli array e i puntatori sono legati tra loro. Un array può essere visto come un puntatore al primo elemento.

```c
int numeri[5] = {1, 2, 3, 4, 5};
int *p = numeri;

printf("%d\n", *(p + 2)); // stampa 3
```

### Errori comuni

- usare un puntatore non inizializzato
- dereferenziare un puntatore nullo
- confondere `*` usato per dichiarare un puntatore e per leggere il valore puntato

### Esercizi

1. Creare una variabile e stampare il suo indirizzo tramite puntatore.
2. Scrivere una funzione che scambia due variabili usando puntatori.
3. Usare un puntatore per cambiare il valore di una variabile.
4. Sommare i valori di un array usando un puntatore.
5. Stampare il terzo elemento di un array tramite puntatore.

<a href="/esercizi/1-C/es_9.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizi sui puntatori</a>

---

### Esercizio pratico finale

```c
#include <stdio.h>

void scambia(int *a, int *b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 10;
    int y = 20;

    scambia(&x, &y);
    printf("x = %d, y = %d\n", x, y);
    return 0;
}
```

I puntatori sono la base per lavorare bene con memoria, array e funzioni in C.

<a href="./page_10.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
