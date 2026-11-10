# Giorno 3: Input e output

**Obiettivo:** leggere dati dalla tastiera e stampare risultati nel terminale.

### Stampare con std::cout

`std::cout` si usa con l'operatore `<<` e può concatenare più valori:

```cpp
#include <iostream>
#include <string>

int main() {
    std::string nome{"Anna"};
    int eta{17};

    std::cout << "Ciao " << nome << ", hai " << eta << " anni.\n";

    return 0;
}
```

Output:

```text
Ciao Anna, hai 17 anni.
```

`std::cout` capisce da solo il tipo dei valori: non servono specificatori come `%d` o `%f` del C.

### Andare a capo: \n e std::endl

```cpp
std::cout << "Prima riga\n";
std::cout << "Seconda riga" << std::endl;
```

- `\n` inserisce un a capo.
- `std::endl` inserisce un a capo **e** forza la scrittura immediata del buffer.

Per un programma normale `\n` è sufficiente e leggermente più veloce. `std::endl` si usa quando serve vedere subito l'output, per esempio prima di un input.

### Leggere con std::cin

`std::cin` si usa con l'operatore `>>` e salva il valore letto in una variabile:

```cpp
#include <iostream>

int main() {
    int eta;

    std::cout << "Quanti anni hai? ";
    std::cin >> eta;
    std::cout << "Hai " << eta << " anni.\n";

    return 0;
}
```

Output:

```text
Quanti anni hai? 17
Hai 17 anni.
```

`std::cin` converte il testo digitato nel tipo della variabile. Se inserite una lettera dove serve un numero, la lettura fallisce e la variabile resta senza un valore valido.

### Testo con spazi: getline

`std::cin >> nome` legge una sola parola, perché si ferma al primo spazio. Per leggere un nome completo si usa `std::getline`:

```cpp
#include <iostream>
#include <string>

int main() {
    std::string nomeCompleto;

    std::cout << "Nome e cognome: ";
    std::getline(std::cin, nomeCompleto);

    std::cout << "Ciao " << nomeCompleto << "!\n";

    return 0;
}
```

Input e output:

```text
Nome e cognome: Anna Rossi
Ciao Anna Rossi!
```

### Testo e numeri non sono la stessa cosa

Il testo inserito dall'utente viene convertito nel tipo della variabile. Questo codice legge due numeri e li somma:

```cpp
int a, b;
std::cin >> a >> b;
std::cout << "Somma: " << a + b << "\n";
```

Con input `3 4` stampa `7`, non `34`, perché `a` e `b` sono `int`.

### Un dettaglio: mescolare cin e getline

Se leggete un numero con `>>` e subito dopo una riga con `getline`, l'Invio rimasto nel buffer può essere letto come riga vuota. La soluzione semplice è chiamare `std::cin.ignore()` prima della `getline`:

```cpp
int eta;
std::string indirizzo;

std::cin >> eta;
std::cin.ignore();          // consuma l'Invio rimasto
std::getline(std::cin, indirizzo);
```

Per ora basta sapere che esiste questo caso: lo incontrerete quando mescolate numeri e righe.

### Errori comuni

- Dimenticare `std::` davanti a `cout` e `cin`.
- Usare `getline` dopo `>>` senza `ignore`.
- Aspettarsi che `>>` legga una frase con spazi.
- Dimenticare `#include <string>` quando si usa `getline` con `std::string`.

## Micro-esercizio

Chiedete all'utente nome ed età e stampate un saluto.

Output atteso (esempio):

```text
Nome: Anna
Eta: 17
Ciao Anna, hai 17 anni.
```

### Variante

Chiedete anche la città e stampate una frase su tre righe diverse. Provate a inserire un nome con lo spazio per verificare che `getline` legga tutto.
