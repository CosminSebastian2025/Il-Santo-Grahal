# Giorno 8: Funzioni semplici

**Obiettivo:** dividere il programma in funzioni riutilizzabili.

### Perché usare le funzioni

Una funzione è un blocco di codice con un nome. Invece di ripetere le stesse istruzioni, le si scrive una volta e le si richiama quando serve. Le funzioni rendono il programma più corto, leggibile e facile da correggere.

Avete già usato funzioni: `main` è una funzione, e anche `std::getline` lo è.

### La struttura

```cpp
tipo_restituito nome(parametri) {
    // istruzioni
    return valore;
}
```

Esempio:

```cpp
#include <iostream>

int somma(int a, int b) {
    return a + b;
}

int main() {
    int risultato = somma(3, 4);
    std::cout << "Risultato: " << risultato << "\n";
    return 0;
}
```

Output:

```text
Risultato: 7
```

- `int` è il tipo del valore restituito.
- `somma` è il nome della funzione.
- `int a, int b` sono i parametri, cioè i valori che la funzione riceve.
- `return` restituisce il risultato a chi ha chiamato la funzione.

### Parametri e argomenti

Quando chiamate `somma(3, 4)`, i valori `3` e `4` si chiamano **argomenti**. Vengono copiati nei parametri `a` e `b` della funzione.

```cpp
int x = 10;
int y = 5;

std::cout << somma(x, y) << "\n";   // 15
```

La funzione non deve sapere da dove arrivano i valori: lavora solo con le copie che riceve.

### Funzioni void

Una funzione `void` non restituisce un valore e serve a eseguire un'azione:

```cpp
#include <iostream>

void stampaRiga() {
    std::cout << "--------------------\n";
}

int main() {
    stampaRiga();
    std::cout << "Titolo\n";
    stampaRiga();
    return 0;
}
```

Output:

```text
--------------------
Titolo
--------------------
```

In una funzione `void` si può usare `return;` per uscire prima, ma non si restituisce un valore.

### Ordine delle funzioni e prototipi

Il compilatore deve conoscere una funzione prima che venga usata. Per questo di solito si mettono le funzioni **prima** di `main`.

In alternativa si dichiara il **prototipo** prima di `main` e si scrive il corpo dopo:

```cpp
#include <iostream>

int somma(int a, int b);   // prototipo

int main() {
    std::cout << somma(2, 3) << "\n";
    return 0;
}

int somma(int a, int b) {  // definizione
    return a + b;
}
```

### Esempio: funzione che restituisce un bool

```cpp
#include <iostream>

bool pari(int n) {
    return n % 2 == 0;
}

int main() {
    int numero;

    std::cout << "Numero: ";
    std::cin >> numero;

    if (pari(numero)) {
        std::cout << "Pari\n";
    } else {
        std::cout << "Dispari\n";
    }

    return 0;
}
```

`pari` restituisce direttamente il risultato del confronto, che è un `bool`.

### Errori comuni

- Dimenticare il `return` in una funzione che deve restituire un valore.
- Restituire un tipo diverso da quello dichiarato.
- Usare una funzione prima di averla dichiarata o definita.
- Mettere un `;` dopo la parentesi della definizione: `int somma(int a, int b);` è solo un prototipo, non il corpo.
- Dare alla funzione un nome poco chiaro: `f` non spiega nulla, `calcolaMedia` sì.

## Micro-esercizio

Scrivete una funzione `int somma(int a, int b)` e usatela nel `main` con due numeri letti da tastiera.

Output atteso con `4` e `6`:

```text
Somma: 10
```

### Variante

Scrivete una funzione `void saluta(std::string nome)` che stampa `Ciao` seguito dal nome. Chiamatela con un nome letto da `std::getline`.
