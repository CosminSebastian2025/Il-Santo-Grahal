# Funzioni

<div class="not-prose">
  <aside style="position: sticky; top: 1rem; margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; max-width: 260px;">
    <p style="margin: 0 0 0.75rem; font-weight: 700; color: #0f172a;">Menu del corso C++</p>
    <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.35rem; font-size: 0.92rem;">
      <li><a href="./intro_cpp.MD">Introduzione</a></li>
      <li><a href="./page_1.MD">1. Primo programma</a></li>
      <li><a href="./page_2.MD">2. Variabili e tipi</a></li>
      <li><a href="./page_3.MD">3. Input e output</a></li>
      <li><a href="./page_4.MD">4. Operatori e condizioni</a></li>
      <li><a href="./page_5.MD">5. Cicli</a></li>
      <li><a href="./page_6.MD">6. Funzioni</a></li>
      <li><a href="./page_7.MD">7. Vettori e stringhe</a></li>
      <li><a href="./page_8.MD">8. Struct</a></li>
      <li><a href="./page_9.MD">9. Classi</a></li>
      <li><a href="./page_10.MD">10. Puntatori</a></li>
      <li><a href="./page_11.MD">11. STL e file</a></li>
      <li><a href="./page_12.MD">12. Progetto finale</a></li>
      <li><a href="./page_13.MD">13. Indice</a></li>
    </ul>
  </aside>
</div>

## Obiettivi di apprendimento

- capire cosa è una funzione
- usare parametri e `return`
- creare funzioni riutilizzabili
- organizzare il programma in blocchi chiari

---

### Cos'è una funzione?

Una funzione è un blocco di codice che svolge un compito preciso e può essere richiamato più volte.

```cpp
#include <iostream>

int somma(int a, int b) {
    return a + b;
}

int main() {
    int risultato = somma(5, 3);
    std::cout << "Risultato: " << risultato << "\n";
    return 0;
}
```

### Funzioni `void`

Una funzione `void` non restituisce un valore, ma può stampare oppure eseguire un'azione.

```cpp
#include <iostream>

void stampaMessaggio() {
    std::cout << "Buongiorno!\n";
}

int main() {
    stampaMessaggio();
    return 0;
}
```

### Perché usare le funzioni?

Perché rendono il codice:

- più leggibile
- più ordinato
- più facile da riutilizzare
- più semplice da correggere

### Micro-esercizio

Creare una funzione che somma due numeri e la richiama nel `main`.

<a href="/esercizi/2-C++/es_6.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizio</a>

<a href="./page_7.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
