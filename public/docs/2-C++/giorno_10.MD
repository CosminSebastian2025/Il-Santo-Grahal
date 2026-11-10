# Giorno 10: Array e introduzione a std::vector

**Obiettivo:** memorizzare più valori e usare il contenitore più comodo del C++.

### Array C: solo per comprensione

Un array è una sequenza di elementi dello stesso tipo:

```cpp
int voti[5] = {6, 7, 8, 5, 9};
```

Gli elementi si numerano da **0** a **4**:

```cpp
std::cout << voti[0] << "\n";   // 6
std::cout << voti[4] << "\n";   // 9
```

Gli array C hanno due limiti importanti:

- la dimensione è fissa e deve essere nota al compilatore;
- nessuno controlla gli indici: `voti[5]` è un errore che il compilatore non segnala.

Per questo, nel C++ moderno, al loro posto si usa quasi sempre `std::vector`.

### std::vector

`std::vector` è un array che può crescere e sa sempre quanti elementi contiene. Si include con:

```cpp
#include <vector>
```

Dichiarazione e uso:

```cpp
std::vector<int> voti;        // vector vuoto di int

voti.push_back(6);            // aggiunge in fondo
voti.push_back(7);
voti.push_back(8);

std::cout << voti.size() << "\n";    // 3
std::cout << voti[0] << "\n";        // 6
```

Si può anche creare già pieno:

```cpp
std::vector<int> voti = {6, 7, 8, 5, 9};
```

### push_back, size e accesso

| Operazione | Significato |
| --- | --- |
| `v.push_back(x)` | Aggiunge `x` in fondo |
| `v.size()` | Numero di elementi |
| `v[i]` | Elemento in posizione `i` (nessun controllo) |
| `v.at(i)` | Elemento in posizione `i` (controlla e lancia un'eccezione) |
| `v.empty()` | `true` se è vuoto |

```cpp
std::vector<int> numeri = {3, 5, 7};

numeri.push_back(9);

for (std::size_t i = 0; i < numeri.size(); ++i) {
    std::cout << numeri[i] << "\n";
}
```

`std::size_t` è il tipo usato da `size()`: è un intero senza segno. In alternativa, quando serve solo leggere gli elementi, si usa il range-based for:

```cpp
for (int n : numeri) {
    std::cout << n << "\n";
}
```

### Esempio: somma e media

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> voti = {6, 7, 8, 5, 9};
    int somma = 0;

    for (int voto : voti) {
        somma += voto;
    }

    double media = static_cast<double>(somma) / voti.size();

    std::cout << "Somma: " << somma << "\n";
    std::cout << "Media: " << media << "\n";

    return 0;
}
```

`static_cast<double>(somma)` converte la somma in `double`, così la divisione non perde i decimali.

### Aggiungere valori letti da tastiera

```cpp
#include <iostream>
#include <vector>

int main() {
    int n;

    std::cout << "Quanti voti? ";
    std::cin >> n;

    std::vector<int> voti;

    for (int i = 0; i < n; ++i) {
        int voto;
        std::cout << "Voto " << i + 1 << ": ";
        std::cin >> voto;
        voti.push_back(voto);
    }

    std::cout << "Hai inserito " << voti.size() << " voti.\n";

    return 0;
}
```

### Errori comuni

- Accedere a un indice fuori dai limiti: usate `at()` quando volete un controllo.
- Usare `size()` in un `for` con `int` senza pensarci: il confronto tra tipi con e senza segno può generare avvisi.
- Dimenticare `#include <vector>`.
- Dichiarare `std::vector<int> voti[5];` pensando a un vector di 5 elementi: quella è una cosa diversa (array di vector).

## Micro-esercizio

Create un `std::vector<int>` con cinque numeri a scelta, stampate tutti gli elementi e poi stampate la loro somma.

Output atteso (esempio):

```text
3
5
7
9
11
Somma: 35
```

### Variante

Chiedete quanti numeri inserire, riempiteli con `push_back` e stampate il maggiore. Per trovare il maggiore non serve ordinare: basta un ciclo con un confronto.
