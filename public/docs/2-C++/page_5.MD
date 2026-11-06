# Cicli

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

- capire cosa è un ciclo
- usare `while` e `for`
- evitare i loop infiniti
- applicare i cicli a problemi ripetitivi

---

### Ciclo `while`

```cpp
#include <iostream>

int main() {
    int i = 1;

    while (i <= 5) {
        std::cout << i << "\n";
        i++;
    }

    return 0;
}
```

### Ciclo `for`

```cpp
#include <iostream>

int main() {
    for (int i = 1; i <= 10; i++) {
        std::cout << i << "\n";
    }

    return 0;
}
```

### Quando usare `for` e quando usare `while`

- `for`: quando sai già quante volte deve ripetersi
- `while`: quando la condizione dipende da un evento esterno

### Esempio pratico

```cpp
#include <iostream>

int main() {
    for (int i = 1; i <= 10; i++) {
        std::cout << "Numero: " << i << "\n";
    }
    return 0;
}
```

### Errori comuni

- condizione che non cambia mai
- ciclo infinito
- aggiornamento del contatore dimenticato

### Micro-esercizio

Stampare i numeri da 1 a 10 con `while` oppure con `for`.

<a href="/esercizi/2-C++/es_5.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizio</a>

<a href="./page_6.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
