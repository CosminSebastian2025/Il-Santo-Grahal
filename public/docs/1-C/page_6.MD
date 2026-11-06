# Definizione di Funzione

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

- capire cos'è una funzione e perché è utile
- distinguere tra funzioni con e senza ritorno
- usare parametri correttamente
- organizzare il codice in blocchi riutilizzabili

### Che cos'è una funzione?

Una funzione è un blocco di codice che esegue un compito specifico e può essere richiamato più volte durante il programma. In C, le funzioni servono a organizzare il codice, renderlo più leggibile e riutilizzabile.

In pratica, una funzione riceve dei dati in ingresso, li elabora e può restituire un risultato.

```c
#include <stdio.h>

int somma(int a, int b) {
    return a + b;
}

int main() {
    int risultato = somma(5, 3);
    printf("La somma e': %d\n", risultato);
    return 0;
}
```

### Struttura di una funzione

Una funzione in C è composta da:

- tipo di ritorno
- nome della funzione
- parametri (opzionali)
- corpo della funzione

```c
int nomeFunzione(int parametro1, int parametro2) {
    // codice
    return valore;
}
```

### Tipi di funzioni

#### 1. Funzioni senza parametri e senza ritorno

```c
void saluta() {
    printf("Ciao!\n");
}
```

Questa funzione non riceve dati e non restituisce un valore.

#### 2. Funzioni con parametri e senza ritorno

```c
void stampaNumero(int n) {
    printf("Numero: %d\n", n);
}
```

Questa funzione riceve un numero e lo stampa, ma non restituisce niente.

#### 3. Funzioni con parametri e con ritorno

```c
int doppio(int n) {
    return n * 2;
}
```

La funzione riceve un valore e ne restituisce un altro.

#### 4. Funzioni con più parametri

```c
int prodotto(int a, int b) {
    return a * b;
}
```

### Perché usare le funzioni?

Le funzioni ci aiutano a:

- scrivere codice più ordinato
- evitare di copiare lo stesso codice più volte
- dividere il problema in parti più semplici
- rendere il programma più facile da mantenere

### Esempio completo

```c
#include <stdio.h>

int somma(int a, int b) {
    return a + b;
}

int main() {
    int x = 10;
    int y = 20;
    int risultato = somma(x, y);

    printf("Il risultato e': %d\n", risultato);
    return 0;
}
```

### Errori comuni

- dimenticare il tipo di ritorno
- non usare `return` quando la funzione dovrebbe restituire un valore
- chiamare una funzione prima di averla definita senza prototipo
- usare il nome sbagliato della funzione

### Esercizi

1. Scrivi una funzione che calcoli la somma di due numeri interi.
2. Scrivi una funzione che stampi "Buongiorno" a schermo.
3. Scrivi una funzione che restituisca il doppio di un numero.
4. Scrivi una funzione che controlli se un numero è pari e restituisca `1` se lo è, `0` se non lo è.
5. Scrivi una funzione che calcoli il massimo tra tre numeri.

<a href="/esercizi/1-C/es_6.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizi di funzioni</a>

---

### Esercizio pratico finale

```c
#include <stdio.h>

int maggiore(int a, int b) {
    if (a > b) {
        return a;
    }
    return b;
}

int main() {
    int x = 8;
    int y = 12;
    printf("Il maggiore e': %d\n", maggiore(x, y));
    return 0;
}
```

Questa è la base per capire come i programmi diventano più organizzati e più facili da sviluppare.

<a href="./page_7.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>