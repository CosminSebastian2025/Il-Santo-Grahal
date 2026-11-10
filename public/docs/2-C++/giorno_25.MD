# Giorno 25: Eccezioni

**Obiettivo:** segnalare e gestire gli errori in modo esplicito.

### Che cos'è un'eccezione

Un'eccezione è un meccanismo per segnalare che qualcosa è andato storto. Chi chiama una funzione può decidere se gestire l'errore o lasciarlo propagare.

```cpp
throw std::runtime_error("Qualcosa è andato storto");
```

`throw` interrompe l'esecuzione normale e lancia un'eccezione. Se nessuno la cattura, il programma termina con un messaggio di errore.

### try e catch

```cpp
#include <iostream>
#include <stdexcept>

int main() {
    try {
        throw std::runtime_error("Errore di esempio");
    } catch (const std::exception& e) {
        std::cout << "Catturato: " << e.what() << "\n";
    }

    return 0;
}
```

Output:

```text
Catturato: Errore di esempio
```

- `try` contiene il codice che può fallire.
- `catch` contiene il codice che gestisce l'errore.
- `std::exception` è la base di molte eccezioni standard.
- `e.what()` restituisce il messaggio.

### Tipi di eccezioni standard

| Eccezione | Uso tipico |
| --- | --- |
| `std::invalid_argument` | Un argomento non è valido |
| `std::out_of_range` | Un indice o un valore è fuori dall'intervallo |
| `std::runtime_error` | Un errore generale a runtime |

Si trovano in `stdexcept`.

```cpp
#include <stdexcept>

double dividi(double a, double b) {
    if (b == 0) {
        throw std::invalid_argument("Divisore zero");
    }
    return a / b;
}
```

### Catturare per riferimento const

Si cattura sempre per riferimento costante:

```cpp
try {
    double risultato = dividi(10, 0);
    std::cout << risultato << "\n";
} catch (const std::invalid_argument& e) {
    std::cout << "Errore: " << e.what() << "\n";
}
```

Catturare per valore copierebbe l'eccezione; catturare per riferimento evita la copia e mantiene il tipo corretto.

### Più catch

```cpp
try {
    // codice
} catch (const std::invalid_argument& e) {
    std::cout << "Argomento non valido: " << e.what() << "\n";
} catch (const std::exception& e) {
    std::cout << "Errore: " << e.what() << "\n";
}
```

Il primo `catch` che corrisponde gestisce l'eccezione. Mettete i casi più specifici prima di quelli generali.

### Quando usare le eccezioni

Usatele per situazioni **eccezionali**, cioè errori che impediscono di continuare:

- un file richiesto non esiste;
- un input non rispetta un vincolo importante;
- una divisione per zero in una funzione che non può restituire un risultato valido.

Non usatele per il normale flusso del programma: per una scelta tra due casi va bene un `if`.

### Esempio completo

```cpp
#include <iostream>
#include <stdexcept>

double dividi(double a, double b) {
    if (b == 0) {
        throw std::invalid_argument("Il divisore non può essere zero");
    }
    return a / b;
}

int main() {
    double a, b;

    std::cout << "Primo numero: ";
    std::cin >> a;
    std::cout << "Secondo numero: ";
    std::cin >> b;

    try {
        std::cout << "Risultato: " << dividi(a, b) << "\n";
    } catch (const std::invalid_argument& e) {
        std::cout << "Errore: " << e.what() << "\n";
    }

    return 0;
}
```

Con `b = 0`:

```text
Errore: Il divisore non può essere zero
```

### Errori comuni

- Dimenticare di catturare un'eccezione che può essere lanciata.
- Catturare per valore (`catch (std::exception e)`) invece che per riferimento.
- Lanciare un'eccezione per un caso normale.
- Usare `throw` senza includere `stdexcept`.
- Catturare tutto con `catch (...)` e non fare nulla: l'errore viene nascosto.

## Micro-esercizio

Scrivete una funzione `double dividi(double a, double b)` che lancia `std::invalid_argument` se `b` è zero. Nel `main` leggete due numeri e gestite l'eccezione con `try` e `catch`.

Output atteso con `10` e `0`:

```text
Errore: Il divisore non può essere zero
```

### Variante

Aggiungete una funzione `int leggiEta()` che lancia `std::out_of_range` se l'età non è tra 0 e 120. Nel `main` gestite l'eccezione e stampate un messaggio.
