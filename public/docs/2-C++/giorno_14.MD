# Giorno 14: Vector di struct

**Obiettivo:** gestire una collezione di oggetti dello stesso tipo.

### Un vector di struct

Un `std::vector` può contenere qualsiasi tipo, anche una struct:

```cpp
#include <vector>

struct Persona {
    std::string nome;
    int eta;
};

std::vector<Persona> persone;
```

Ogni elemento del vector è una `Persona` completa, con tutti i suoi campi.

### Aggiungere elementi

```cpp
persone.push_back({"Anna", 17});
persone.push_back({"Luca", 18});
persone.push_back({"Sara", 16});
```

Le graffe creano una `Persona` temporanea che viene copiata nel vector.

### Stampare gli elementi

```cpp
for (const auto& p : persone) {
    std::cout << p.nome << " ha " << p.eta << " anni\n";
}
```

Con `const auto&` evitiamo di copiare ogni persona.

### Accedere a un elemento per posizione

```cpp
std::cout << persone[0].nome << "\n";      // Anna
std::cout << persone.at(1).eta << "\n";    // 18
```

### Esempio completo

```cpp
#include <iostream>
#include <string>
#include <vector>

struct Persona {
    std::string nome;
    int eta;
};

int main() {
    std::vector<Persona> persone = {
        {"Anna", 17},
        {"Luca", 18},
        {"Sara", 16}
    };

    for (const auto& p : persone) {
        std::cout << p.nome << " ha " << p.eta << " anni\n";
    }

    return 0;
}
```

Output:

```text
Anna ha 17 anni
Luca ha 18 anni
Sara ha 16 anni
```

### Cercare un elemento

Per una ricerca semplice si attraversa il vector e si confronta un campo:

```cpp
std::string cercato;
std::cout << "Nome da cercare: ";
std::cin >> cercato;

bool trovato = false;

for (const auto& p : persone) {
    if (p.nome == cercato) {
        std::cout << "Trovato: " << p.nome << ", " << p.eta << " anni\n";
        trovato = true;
    }
}

if (!trovato) {
    std::cout << "Nessuna persona trovata.\n";
}
```

Questa ricerca lineare è perfetta per pochi elementi. Il Giorno 23 vedremo `std::find`.

### Aggiungere elementi letti da tastiera

```cpp
Persona p;

std::cout << "Nome: ";
std::getline(std::cin, p.nome);
std::cout << "Eta: ";
std::cin >> p.eta;

persone.push_back(p);
```

Se leggete più persone di seguito, ricordatevi di consumare l'Invio con `std::cin.ignore()` prima della prossima `getline`.

### Errori comuni

- Usare `persone[10]` quando ci sono solo 3 elementi.
- Dimenticare `#include <vector>` o `#include <string>`.
- Modificare la copia nel range-based for: per cambiare un elemento serve `auto&`.
- Confondere il campo di una persona con un elemento del vector: `persone[0].nome` è corretto, `persone.nome[0]` no.

## Micro-esercizio

Create un vector con 3 persone e stampatele tutte con nome ed età.

Output atteso (esempio):

```text
Anna ha 17 anni
Luca ha 18 anni
Sara ha 16 anni
```

### Variante

Stampate solo le persone maggiorenni e, alla fine, quante sono. Poi provate ad aggiungere una quarta persona letta da tastiera.
