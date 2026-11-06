# Primo programma e compilatore

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

- capire cos'è un programma e un compilatore
- conoscere la struttura base di un programma C++
- usare `main()` come punto di partenza del codice
- compilare ed eseguire un programma semplice

---

### Cos'è un programma?

Un programma è una sequenza di istruzioni scritte in un linguaggio di programmazione. In C++ il codice viene trasformato in un file eseguibile dal compilatore.

### Cos'è un compilatore?

Il compilatore è lo strumento che legge il codice C++ e lo trasforma in un programma eseguibile. Senza compilatore, il computer non può comprendere il codice scritto dall'uomo.

### Struttura base di un programma C++

```cpp
#include <iostream>

int main() {
    std::cout << "Ciao, mondo!\n";
    return 0;
}
```

### Cosa significa questa sintassi?

- `#include <iostream>`: include la libreria standard per input e output
- `int main()`: la funzione principale del programma
- `std::cout << ...`: stampa qualcosa sul terminale
- `return 0;`: indica che il programma è terminato correttamente

### Esempio semplice

```cpp
#include <iostream>

int main() {
    std::cout << "Ciao, sto imparando C++!\n";
    return 0;
}
```

### Compilazione

Se usi un compilatore locale come `g++`, puoi eseguire:

```bash
g++ programma.cpp -o programma
./programma
```

### Errori comuni

- dimenticare `return 0;`
- non chiudere le parentesi graffe
- usare `std::cout` senza includere `iostream`
- sbagliare il nome di una variabile o di una funzione

### Esercizio

Scrivi un programma che stampa:

```text
Ciao, sto imparando C++
```

<a href="/esercizi/2-C++/es_1.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizio</a>

<a href="./page_2.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
