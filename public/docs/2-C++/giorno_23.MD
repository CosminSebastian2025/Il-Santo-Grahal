# Giorno 23: Algoritmi STL

**Obiettivo:** usare gli algoritmi già pronti della libreria standard invece di scrivere cicli a mano.

### La libreria algorithm

Gli algoritmi si trovano in `algorithm` e lavorano su intervalli di elementi:

```cpp
#include <algorithm>
```

Un intervallo è indicato da due iteratori: l'inizio e la fine (esclusa). Per un vector si usano `v.begin()` e `v.end()`.

### std::sort

Ordina gli elementi dal più piccolo al più grande:

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numeri = {5, 2, 9, 1, 7};

    std::sort(numeri.begin(), numeri.end());

    for (int n : numeri) {
        std::cout << n << " ";
    }
    std::cout << "\n";

    return 0;
}
```

Output:

```text
1 2 5 7 9
```

`std::sort` modifica il vector originale.

### std::find

Cerca un valore e restituisce un iteratore al primo elemento trovato:

```cpp
auto it = std::find(numeri.begin(), numeri.end(), 7);

if (it != numeri.end()) {
    std::cout << "Trovato\n";
} else {
    std::cout << "Non trovato\n";
}
```

Se non trova nulla restituisce `numeri.end()`. Per conoscere la posizione si può calcolare la distanza dall'inizio:

```cpp
std::cout << std::distance(numeri.begin(), it) << "\n";
```

### std::count

Conta quante volte compare un valore:

```cpp
int quanti = std::count(numeri.begin(), numeri.end(), 7);
std::cout << quanti << "\n";
```

### std::reverse

Inverte l'ordine degli elementi:

```cpp
std::reverse(numeri.begin(), numeri.end());
```

### Esempio completo

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numeri = {5, 2, 9, 1, 7, 2};

    std::sort(numeri.begin(), numeri.end());

    std::cout << "Ordinati: ";
    for (int n : numeri) {
        std::cout << n << " ";
    }
    std::cout << "\n";

    std::cout << "Occorrenze di 2: "
              << std::count(numeri.begin(), numeri.end(), 2) << "\n";

    auto it = std::find(numeri.begin(), numeri.end(), 9);
    std::cout << "Il 9 si trova in posizione "
              << std::distance(numeri.begin(), it) << "\n";

    std::reverse(numeri.begin(), numeri.end());

    std::cout << "Invertiti: ";
    for (int n : numeri) {
        std::cout << n << " ";
    }
    std::cout << "\n";

    return 0;
}
```

Output:

```text
Ordinati: 1 2 2 5 7 9
Occorrenze di 2: 2
Il 9 si trova in posizione 5
Invertiti: 9 7 5 2 2 1
```

### Perché usare gli algoritmi

- Sono già testati e ottimizzati.
- Il codice dice **cosa** fa (`sort`, `find`, `count`) invece di mostrare come.
- Sono meno soggetti a errori di un ciclo scritto a mano.

### Algoritmi e iteratori

La maggior parte degli algoritmi accetta:

- `begin()` e `end()` per un vector completo;
- `begin()` e `begin() + n` per una parte.

```cpp
std::sort(numeri.begin(), numeri.begin() + 3);   // ordina i primi 3
```

### Errori comuni

- Dimenticare `#include <algorithm>`.
- Confondere `end()` con l'ultimo elemento: `end()` indica la posizione **dopo** l'ultimo.
- Usare l'iteratore restituito da `find` senza controllare che non sia `end()`.
- Aspettarsi che `find` restituisca un indice.
- Usare `std::sort` su una collezione che non permette di modificare l'ordine.

## Micro-esercizio

Create un vector di numeri, ordinarli con `std::sort` e stampateli. Cercate poi un numero con `std::find` e indicate se è presente.

Output atteso con `{5, 2, 9, 1, 7}`:

```text
1 2 5 7 9
Il numero 9 è presente.
```

### Variante

Contate quante volte compare un numero scelto dall'utente e invertite il vector con `std::reverse` prima di stamparlo.
