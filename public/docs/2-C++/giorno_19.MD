# Giorno 19: Puntatori, solo basi

**Obiettivo:** capire che cos'è un indirizzo di memoria e come si usa un puntatore.

### L'indirizzo di una variabile

Ogni variabile occupa una posizione in memoria. L'operatore `&` restituisce il suo indirizzo:

```cpp
#include <iostream>

int main() {
    int x = 42;

    std::cout << "Valore: " << x << "\n";
    std::cout << "Indirizzo: " << &x << "\n";

    return 0;
}
```

L'indirizzo cambia a ogni esecuzione e non è un numero su cui fare calcoli. Serve al computer per sapere dove si trova la variabile.

### Che cos'è un puntatore

Un **puntatore** è una variabile che contiene un indirizzo:

```cpp
int x = 42;
int* p = &x;   // p contiene l'indirizzo di x
```

La sintassi `int*` si legge "puntatore a int". L'asterisco fa parte del tipo.

### Dereferenziare

Con `*` si accede al valore contenuto all'indirizzo:

```cpp
#include <iostream>

int main() {
    int x = 42;
    int* p = &x;

    std::cout << "x = " << x << "\n";
    std::cout << "*p = " << *p << "\n";

    *p = 100;
    std::cout << "x dopo = " << x << "\n";

    return 0;
}
```

Output:

```text
x = 42
*p = 42
x dopo = 100
```

`*p = 100` modifica `x`, perché `p` punta a `x`.

### nullptr

Un puntatore che non punta a nulla si inizializza con `nullptr`:

```cpp
int* p = nullptr;

if (p != nullptr) {
    std::cout << *p << "\n";
}
```

Dereferenziare `nullptr` è un errore grave e di solito fa chiudere il programma. Controllate sempre un puntatore prima di usarlo, se può essere nullo.

### Puntatori e riferimenti

Un riferimento è un altro nome per un oggetto e deve sempre riferirsi a qualcosa. Un puntatore può non puntare a nulla (`nullptr`) e può essere cambiato per puntare altrove:

```cpp
int a = 1;
int b = 2;

int* p = &a;
p = &b;      // ora punta a b

int& r = a;  // r resta legato ad a
```

Per i principianti i riferimenti sono spesso più semplici e sicuri. I puntatori servono quando l'oggetto può non esistere, quando si lavora con la memoria dinamica o con le strutture collegate.

### Puntatori e array

Il nome di un array, usato in un'espressione, rappresenta l'indirizzo del primo elemento:

```cpp
int voti[3] = {6, 7, 8};
int* p = voti;       // equivale a &voti[0]

std::cout << *p << "\n";       // 6
std::cout << *(p + 1) << "\n"; // 7
```

Come per gli array, il C++ moderno preferisce `std::vector` e gli iteratori. Questa parte serve soprattutto per capire il funzionamento della memoria.

### Quando evitare i puntatori

- Non usate puntatori quando un riferimento basta.
- Non usate `new` e `delete` manuali per oggetti semplici.
- Preferite `std::vector` agli array dinamici.
- Preferite gli smart pointer (Giorni 20-21) alla gestione manuale della memoria.

### Errori comuni

- Dereferenziare un puntatore non inizializzato.
- Dereferenziare `nullptr`.
- Confondere `p` (indirizzo) con `*p` (valore).
- Dimenticare `&` quando si assegna un indirizzo.
- Usare un puntatore dopo che l'oggetto puntato è stato distrutto.

## Micro-esercizio

Dichiarate un intero, stampate il suo valore e il suo indirizzo. Create un puntatore all'intero, stampate il valore tramite il puntatore e modificatelo. Verificate che la variabile originale sia cambiata.

Output atteso (esempio):

```text
Valore: 42
Indirizzo: 0x...
Tramite puntatore: 42
Nuovo valore: 100
```

L'indirizzo sarà diverso nel vostro computer.

### Variante

Create due interi e un puntatore che prima punta al primo e poi al secondo. Stampate il valore puntato dopo ogni assegnazione.
