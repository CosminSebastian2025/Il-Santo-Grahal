# Giorno 21: Smart pointer

**Obiettivo:** gestire oggetti sull'heap senza chiamare `new` e `delete`.

### unique_ptr

`std::unique_ptr` è un puntatore che possiede un solo oggetto. Non può essere copiato: esiste un solo proprietario alla volta.

```cpp
#include <memory>

std::unique_ptr<int> p = std::make_unique<int>(42);
```

- `std::make_unique<int>(42)` crea un `int` sull'heap con valore `42`.
- `p` lo possiede.
- Quando `p` esce dallo scope, l'oggetto viene distrutto automaticamente.

### make_unique

`std::make_unique` è il modo consigliato per creare un `unique_ptr`. Evita di scrivere `new` e rende esplicito il tipo:

```cpp
auto p = std::make_unique<int>(42);            // int
auto nome = std::make_unique<std::string>("Anna"); // string
auto robot = std::make_unique<Robot>("R2D2");  // oggetto di classe
```

### Ownership

L'**ownership** è la responsabilità di distruggere un oggetto. Con `unique_ptr` la responsabilità è di un solo proprietario per volta.

```cpp
auto p = std::make_unique<int>(10);
// auto q = p;            // errore: unique_ptr non si copia
auto q = std::move(p);    // il possesso passa a q, p diventa vuoto
```

`std::move` trasferisce il possesso. Dopo il trasferimento `p` non punta più a nulla: non usatelo.

### shared_ptr: solo il concetto

`std::shared_ptr` permette a più puntatori di condividere lo stesso oggetto. L'oggetto viene distrutto quando l'ultimo proprietario scompare.

```cpp
#include <memory>

std::shared_ptr<int> a = std::make_shared<int>(42);
std::shared_ptr<int> b = a;   // due proprietari
```

Si usa quando la condivisione è davvero necessaria. Nella maggior parte dei programmi iniziali `unique_ptr` è la scelta migliore, perché il possesso è più semplice da capire.

### Perché evitare new e delete manuali

Con `new` e `delete` bisogna ricordarsi di liberare la memoria in ogni percorso del programma, anche quando ci sono errori o `return` anticipati. Gli smart pointer lo fanno automaticamente:

- niente memory leak;
- niente doppia liberazione;
- il codice esprime chiaramente chi possiede l'oggetto;
- le eccezioni non lasciano memoria non liberata.

### Esempio completo

```cpp
#include <iostream>
#include <memory>
#include <string>

class Robot {
public:
    Robot(std::string nome)
        : nome{nome} {
    }

    void saluta() const {
        std::cout << "Ciao, sono " << nome << "\n";
    }

private:
    std::string nome;
};

int main() {
    auto robot = std::make_unique<Robot>("R2D2");

    robot->saluta();

    return 0;
}
```

Output:

```text
Ciao, sono R2D2
```

### Errori comuni

- Provare a copiare un `unique_ptr`.
- Usare un `unique_ptr` dopo `std::move`.
- Passare un `unique_ptr` per valore senza motivo: il possesso verrebbe trasferito.
- Usare `shared_ptr` per tutto: la condivisione ha un costo e complica il possesso.
- Mescolare `new` e smart pointer senza attenzione.

## Micro-esercizio

Create una classe `Robot` con un nome e un metodo `saluta()`. Create un oggetto con `std::make_unique`, chiamate il metodo e verificate che non serva `delete`.

Output atteso:

```text
Ciao, sono R2D2
```

### Variante

Scrivete una funzione `void presenta(std::unique_ptr<Robot>& robot)` che chiama `saluta()`. Passate il puntatore per riferimento, così il possesso resta nel `main`.
