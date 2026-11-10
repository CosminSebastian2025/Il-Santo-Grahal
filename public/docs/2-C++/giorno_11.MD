# Giorno 11: std::string

**Obiettivo:** gestire il testo con `std::string` e le sue operazioni principali.

### Una stringa non è un char

Un `char` contiene un solo carattere:

```cpp
char iniziale = 'A';
```

`std::string` contiene una sequenza di caratteri:

```cpp
#include <string>

std::string nome = "Anna";
```

Per usare `std::string` bisogna includere `string`. Non serve gestire manualmente la lunghezza o il carattere di fine stringa: ci pensa la classe.

### Lunghezza

```cpp
std::string nome = "Anna";

std::cout << nome.length() << "\n";   // 4
std::cout << nome.size() << "\n";     // 4
```

`length()` e `size()` fanno la stessa cosa. Restituiscono un valore di tipo `std::size_t`.

### Concatenazione

Si possono unire stringhe con `+`:

```cpp
std::string nome = "Anna";
std::string saluto = "Ciao " + nome + "!";

std::cout << saluto << "\n";   // Ciao Anna!
```

Attenzione: non si può sommare direttamente una stringa e un numero. Bisogna convertire il numero con `std::to_string`:

```cpp
std::string messaggio = "Eta: " + std::to_string(17);
```

### Accesso ai caratteri

```cpp
std::string parola = "ciao";

std::cout << parola[0] << "\n";   // c
std::cout << parola[3] << "\n";   // o

parola[0] = 'C';
std::cout << parola << "\n";      // Ciao
```

Come per i vector, `[]` non controlla i limiti. `parola.at(10)` invece segnala l'errore con un'eccezione.

### Confronto

Due stringhe si confrontano con gli operatori normali:

```cpp
std::string a = "ciao";
std::string b = "ciao";

if (a == b) {
    std::cout << "Uguali\n";
}

if (a != "hello") {
    std::cout << "Diverse\n";
}
```

Non serve usare `strcmp` come in C: `==`, `!=`, `<`, `>` funzionano direttamente.

### Sottostringhe

`substr(posizione, lunghezza)` estrae una parte della stringa:

```cpp
std::string parola = "programmazione";

std::cout << parola.substr(0, 6) << "\n";   // progra
std::cout << parola.substr(6) << "\n";      // mmazione
```

### Esempio completo

```cpp
#include <iostream>
#include <string>

int main() {
    std::string parola;

    std::cout << "Inserisci una parola: ";
    std::cin >> parola;

    std::cout << "Lunghezza: " << parola.length() << "\n";
    std::cout << "Prima lettera: " << parola[0] << "\n";
    std::cout << "Ultima lettera: " << parola[parola.length() - 1] << "\n";

    return 0;
}
```

Con `ciao`:

```text
Lunghezza: 4
Prima lettera: c
Ultima lettera: o
```

### Errori comuni

- Usare una stringa vuota e poi `parola[0]`: l'indice non esiste.
- Confondere `'A'` (char) con `"A"` (stringa).
- Sommare un numero a una stringa senza `std::to_string`.
- Dimenticare `#include <string>`.
- Usare `==` con una stringa C (`char[]`) e un `std::string` in modo confuso: convertite o usate sempre `std::string`.

## Micro-esercizio

Chiedete una parola e stampate il numero di caratteri e la prima lettera.

Output atteso con `programma`:

```text
Lunghezza: 9
Prima lettera: p
```

### Variante

Stampate anche l'ultima lettera e la parola scritta tutta in maiuscolo. Per la maiuscola potete usare `std::toupper` da `cctype` dentro un ciclo sui caratteri.
