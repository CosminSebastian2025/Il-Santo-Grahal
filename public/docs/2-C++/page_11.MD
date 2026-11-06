# STL, file ed eccezioni

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

- conoscere le basi della libreria standard STL
- leggere e scrivere file di testo
- capire il concetto di eccezione
- muovere i primi passi verso programmi più reali

---

### STL

La STL è la libreria standard del C++, e fornisce strutture dati e algoritmi molto utili. Tra i più usati ci sono:

- `std::vector`
- `std::string`
- `std::sort`
- `std::map`

### File di testo

```cpp
#include <fstream>
#include <iostream>

int main() {
    std::ofstream file("dati.txt");
    file << "Ciao da C++\n";
    file.close();

    std::cout << "File creato\n";
    return 0;
}
```

### Eccezioni

```cpp
#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("Errore di esempio");
    } catch (const std::exception& e) {
        std::cout << e.what() << "\n";
    }

    return 0;
}
```

### Quando usarle?

- file per salvare dati come nomi, voti o preferenze
- eccezioni per gestire errori come divisione per zero oppure file non trovato

### Micro-esercizio

Scrivere un programma che salva una frase in un file di testo.

<a href="/esercizi/2-C++/es_11.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizio</a>

<a href="./page_12.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
