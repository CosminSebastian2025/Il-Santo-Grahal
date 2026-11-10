# Giorno 20: Stack, heap e RAII

**Obiettivo:** capire dove vivono gli oggetti e perché il C++ moderno evita la gestione manuale della memoria.

### Stack

Lo **stack** è la memoria delle variabili locali. Viene gestito automaticamente:

```cpp
void funzione() {
    int x = 10;             // sullo stack
    std::vector<int> v;     // il vector gestisce la sua memoria
}
```

Quando la funzione termina, le variabili locali vengono distrutte e la loro memoria viene liberata. Non dovete fare nulla.

Lo stack è veloce ma limitato: non è pensato per grandi quantità di dati o per oggetti che devono vivere più a lungo della funzione.

### Heap

L'**heap** è una memoria più grande, gestita manualmente o tramite classi. Un oggetto creato con `new` vive sull'heap finché non viene distrutto con `delete`:

```cpp
int* p = new int(42);
std::cout << *p << "\n";
delete p;
```

Questo funziona, ma è facile sbagliare:

- dimenticare `delete`: la memoria resta occupata (memory leak);
- usare `p` dopo `delete`: comportamento indefinito;
- fare `delete` due volte: errore grave.

Per questo nel C++ moderno si evita `new` e `delete` diretto.

### RAII

**RAII** significa "Resource Acquisition Is Initialization": una risorsa viene acquisita nel costruttore di un oggetto e rilasciata nel distruttore. Quando l'oggetto esce dallo scope, il distruttore viene chiamato automaticamente.

`std::vector` e `std::string` funzionano così: gestiscono la loro memoria e la liberano da soli. Anche gli smart pointer seguono lo stesso principio.

```cpp
{
    std::vector<int> v = {1, 2, 3};
}   // qui v viene distrutto e la memoria viene liberata automaticamente
```

### Introduzione agli smart pointer

Uno **smart pointer** è un oggetto che si comporta come un puntatore ma libera la memoria da solo. Il più semplice è `std::unique_ptr`:

```cpp
#include <memory>

std::unique_ptr<int> p = std::make_unique<int>(42);

std::cout << *p << "\n";   // 42

// non serve delete: alla fine dello scope la memoria viene liberata
```

`std::make_unique` crea l'oggetto sull'heap e lo affida a un `unique_ptr`. Quando il puntatore esce dallo scope, l'oggetto viene distrutto.

### Esempio con una classe

```cpp
#include <iostream>
#include <memory>

class Rettangolo {
public:
    Rettangolo(double base, double altezza)
        : base{base}, altezza{altezza} {
    }

    double area() const {
        return base * altezza;
    }

private:
    double base;
    double altezza;
};

int main() {
    std::unique_ptr<Rettangolo> r = std::make_unique<Rettangolo>(3.0, 4.0);

    std::cout << "Area: " << r->area() << "\n";

    return 0;
}
```

Output:

```text
Area: 12
```

Con un puntatore si accede ai membri con `->` invece che con il punto: `r->area()`.

### Errori comuni

- Usare `new` e dimenticare `delete`.
- Usare `delete` su memoria non allocata con `new`.
- Usare un puntatore dopo aver liberato la memoria.
- Pensare che un `unique_ptr` si possa copiare come un puntatore normale: è unico, non si copia.
- Usare `new` quando basta una variabile locale.

## Micro-esercizio

Create una classe semplice, per esempio `Punto` con `x` e `y`, e un oggetto gestito con `std::unique_ptr`:

```cpp
std::unique_ptr<Punto> p = std::make_unique<Punto>(3, 4);
```

Stampate i valori tramite il puntatore e verificate che non serva chiamare `delete`.

Output atteso:

```text
Punto: (3, 4)
```

### Variante

Create un `std::vector<std::unique_ptr<Punto>>`, aggiungete due punti con `push_back(std::make_unique<Punto>(...))` e stampateli con un ciclo. Alla fine del programma la memoria viene liberata automaticamente.
