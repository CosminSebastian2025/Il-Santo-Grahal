# Giorno 24: Lambda

**Obiettivo:** scrivere piccole funzioni anonime direttamente nel punto in cui servono.

### Che cos'è una lambda

Una **lambda** è una funzione senza nome, definita sul momento. Si usa spesso per passare un comportamento a un algoritmo.

```cpp
auto saluta = []() {
    std::cout << "Ciao!\n";
};

saluta();
```

La sintassi base è:

```text
[cattura](parametri) { corpo }
```

- `[]` è la lista di cattura: indica quali variabili esterne la lambda può usare.
- `(parametri)` sono i parametri, come in una funzione normale.
- `{ corpo }` contiene le istruzioni.

### Lambda con parametri e return

```cpp
auto somma = [](int a, int b) {
    return a + b;
};

std::cout << somma(3, 4) << "\n";   // 7
```

Il tipo di ritorno viene dedotto dal `return`. Se il corpo ha una sola espressione si può scrivere in modo compatto:

```cpp
auto doppio = [](int n) { return n * 2; };
```

### Cattura delle variabili

Le parentesi quadre possono catturare variabili esterne:

```cpp
int base = 10;

auto aggiungiBase = [base](int n) {
    return n + base;
};
```

- `[base]` cattura `base` per valore (una copia).
- `[&base]` cattura per riferimento.
- `[=]` cattura tutto per valore, `[&]` tutto per riferimento. Usatele con moderazione: sono comode ma rendono meno chiaro cosa serve alla lambda.

### Lambda con std::sort

L'uso più comune all'inizio è come criterio di ordinamento. Di default `std::sort` ordina in modo crescente; una lambda può definire un ordine diverso:

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numeri = {5, 2, 9, 1, 7};

    std::sort(numeri.begin(), numeri.end(), [](int a, int b) {
        return a > b;   // decrescente
    });

    for (int n : numeri) {
        std::cout << n << " ";
    }
    std::cout << "\n";

    return 0;
}
```

Output:

```text
9 7 5 2 1
```

La lambda riceve due elementi e restituisce `true` se il primo deve venire **prima** del secondo. Con `a > b` i numeri più grandi vengono prima.

### Ordinare struct con una lambda

```cpp
struct Persona {
    std::string nome;
    int eta;
};

std::vector<Persona> persone = {
    {"Anna", 17},
    {"Luca", 18},
    {"Sara", 16}
};

std::sort(persone.begin(), persone.end(), [](const Persona& a, const Persona& b) {
    return a.eta < b.eta;
});
```

Così le persone vengono ordinate per età crescente. Per ordinarle per nome basta confrontare `a.nome < b.nome`.

### Lambda salvata in una variabile

```cpp
auto pari = [](int n) {
    return n % 2 == 0;
};

if (pari(10)) {
    std::cout << "Pari\n";
}
```

Il tipo della lambda è deciso dal compilatore: per questo si usa `auto`.

### Errori comuni

- Dimenticare le parentesi `()` quando la lambda non ha parametri ma viene chiamata: `saluta` è l'oggetto, `saluta()` la chiamata.
- Usare una variabile esterna senza catturarla.
- Catturare per riferimento una variabile che muore prima della lambda.
- Invertire il confronto nel comparatore di `sort`.
- Dimenticare `#include <algorithm>` quando si usa `std::sort`.

## Micro-esercizio

Create un vector di numeri e ordinatelo in ordine decrescente usando `std::sort` con una lambda.

Output atteso con `{5, 2, 9, 1, 7}`:

```text
9 7 5 2 1
```

### Variante

Ordinate un vector di nomi in ordine alfabetico e poi, con una seconda lambda, in ordine di lunghezza crescente. In caso di lunghezza uguale, ordinate alfabeticamente.
