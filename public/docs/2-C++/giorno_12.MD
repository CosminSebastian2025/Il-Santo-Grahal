# Giorno 12: Iterare su vector e stringhe

**Obiettivo:** attraversare collezioni di dati con il ciclo più adatto.

### Ciclo for classico

Con il `for` classico si controlla l'indice e si può usare la posizione:

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numeri = {10, 20, 30};

    for (std::size_t i = 0; i < numeri.size(); ++i) {
        std::cout << "Indice " << i << ": " << numeri[i] << "\n";
    }

    return 0;
}
```

Output:

```text
Indice 0: 10
Indice 1: 20
Indice 2: 30
```

Serve quando la posizione è importante, per esempio per confrontare un elemento con il precedente o per modificare un elemento in base all'indice.

### Range-based for

Il range-based for visita tutti gli elementi senza chiedere l'indice:

```cpp
std::vector<int> numeri = {10, 20, 30};

for (int n : numeri) {
    std::cout << n << "\n";
}
```

È più corto e meno soggetto a errori. La variabile `n` è una **copia** dell'elemento: modificarla non cambia il vector.

### Iterare su una stringa

```cpp
#include <iostream>
#include <string>

int main() {
    std::string parola = "ciao";

    for (char c : parola) {
        std::cout << c << "\n";
    }

    return 0;
}
```

Output:

```text
c
i
a
o
```

Con il for classico si può usare `parola[i]` e la lunghezza `parola.size()`.

### const auto&

Quando gli elementi sono grandi (per esempio struct o stringhe) copiarli a ogni ripetizione è inutile. Si usa `const auto&` per leggerli senza copiarli e senza poterli modificare:

```cpp
std::vector<std::string> nomi = {"Anna", "Luca", "Sara"};

for (const auto& nome : nomi) {
    std::cout << nome << "\n";
}
```

- `const` impedisce di modificare l'elemento.
- `&` evita la copia.
- `auto` lascia dedurre il tipo.

Per un `int` la copia costa poco, ma `const auto&` va bene comunque. Se volete **modificare** gli elementi usate `auto&`:

```cpp
for (auto& n : numeri) {
    n = n * 2;   // modifica il vector originale
}
```

### Esempio: contare le vocali

```cpp
#include <iostream>
#include <string>

int main() {
    std::string parola;
    int vocali = 0;

    std::cout << "Parola: ";
    std::cin >> parola;

    for (char c : parola) {
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' ||
            c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U') {
            ++vocali;
        }
    }

    std::cout << "Vocali: " << vocali << "\n";

    return 0;
}
```

Con `programma` stampa `3`.

### Esempio: somma con for classico e con range-based

```cpp
int somma = 0;

for (std::size_t i = 0; i < numeri.size(); ++i) {
    somma += numeri[i];
}

int somma2 = 0;

for (int n : numeri) {
    somma2 += n;
}
```

Le due versioni danno lo stesso risultato. La prima serve se vi interessa l'indice, la seconda se dovete solo leggere i valori.

### Errori comuni

- Modificare la variabile del range-based for pensando di modificare il vector (è una copia).
- Confondere `for (auto n : v)` con `for (auto& n : v)`.
- Usare `<` `size()` e confrontare `int` con un tipo senza segno, ottenendo avvisi.
- Scorrere una stringa vuota e accedere a `[0]`: controllate che non sia vuota.

## Micro-esercizio

Chiedete una parola e contate le vocali, sia minuscole sia maiuscole. Stampate anche il numero totale di caratteri.

Output atteso con `Ciao`:

```text
Caratteri: 4
Vocali: 2
```

### Variante

Stampate la parola una lettera per riga usando il range-based for, poi contate quante lettere sono spazi. Provate con una frase letta con `std::getline`.
