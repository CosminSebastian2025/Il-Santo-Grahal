# Giorno 2: Variabili e tipi base

**Obiettivo:** memorizzare valori nei tipi fondamentali del C++ e stamparli.

### Che cos'è una variabile?

Una variabile è un contenitore con un nome che contiene un valore. In C++ ogni variabile ha un **tipo**, che stabilisce che cosa può contenere.

```cpp
int eta = 17;
```

- `int` è il tipo.
- `eta` è il nome.
- `17` è il valore iniziale.

### I tipi base

| Tipo | Cosa contiene | Esempio |
| --- | --- | --- |
| `int` | Numeri interi | `int eta = 17;` |
| `double` | Numeri decimali | `double altezza = 1.75;` |
| `bool` | Vero o falso | `bool maggiorenne = false;` |
| `char` | Un singolo carattere | `char iniziale = 'A';` |
| `std::string` | Testo | `std::string nome = "Anna";` |

Per usare `std::string` bisogna includere la libreria:

```cpp
#include <string>
```

`char` usa gli apici singoli (`'A'`), mentre `std::string` usa le virgolette doppie (`"Anna"`).

### Inizializzazione

In C++ moderno si consiglia l'inizializzazione con le graffe:

```cpp
int eta{17};
double altezza{1.75};
std::string nome{"Anna"};
```

Con le graffe il compilatore segnala se il valore non è compatibile con il tipo, per esempio se provate a mettere un numero decimale in un `int`.

Una variabile può anche essere dichiarata senza valore e assegnata dopo:

```cpp
int numero;
numero = 10;
```

Ma se la usate prima di assegnarle un valore, il comportamento è indefinito: inizializzatela sempre.

### const

`const` rende una variabile non modificabile dopo l'inizializzazione:

```cpp
const double PI = 3.14159;
// PI = 3.14;   // errore: PI è costante
```

Serve a esprimere un'intenzione: quel valore non deve cambiare. Il compilatore vi avvisa se provate a modificarlo.

### auto

`auto` lascia dedurre il tipo al compilatore dal valore iniziale:

```cpp
auto eta = 17;          // int
auto altezza = 1.75;    // double
auto nome = std::string{"Anna"};
```

È comodo, ma per i principianti è meglio scrivere il tipo esplicitamente finché i tipi non sono chiari.

### Esempio completo

```cpp
#include <iostream>
#include <string>

int main() {
    std::string nome{"Anna"};
    int eta{17};
    double altezza{1.75};
    bool studentessa{true};

    std::cout << "Nome: " << nome << "\n";
    std::cout << "Eta: " << eta << "\n";
    std::cout << "Altezza: " << altezza << "\n";
    std::cout << "Studentessa: " << studentessa << "\n";

    return 0;
}
```

Output:

```text
Nome: Anna
Eta: 17
Altezza: 1.75
Studentessa: 1
```

`std::cout` stampa `1` per `true` e `0` per `false`, a meno che non si usi `std::boolalpha`.

### Errori comuni

- Usare una variabile non inizializzata.
- Mettere un numero decimale in un `int`: la parte decimale viene persa.
- Usare `"A"` per un `char` o `'A'` per una stringa.
- Dimenticare `#include <string>` quando si usa `std::string`.
- Modificare una variabile dichiarata `const`.

## Micro-esercizio

Create quattro variabili: il vostro nome (`std::string`), la vostra età (`int`), la vostra altezza in metri (`double`) e un valore booleano che indica se vi piace programmare. Stampatele con un'etichetta per ciascuna.

Output atteso (con i vostri dati):

```text
Nome: Anna
Eta: 17
Altezza: 1.75
Ti piace programmare: 1
```

### Variante

Dichiarate una costante `const int ANNO_CORRENTE = 2026;` e stampatela. Provate poi a modificarla e osservate l'errore del compilatore.
