# Giorno 7: Cicli for

**Obiettivo:** usare il `for` quando il numero di ripetizioni è noto, anche con cicli annidati.

### La struttura for

```cpp
for (inizializzazione; condizione; aggiornamento) {
    // istruzioni ripetute
}
```

Esempio:

```cpp
#include <iostream>

int main() {
    for (int i = 1; i <= 5; ++i) {
        std::cout << "Iterazione " << i << "\n";
    }

    return 0;
}
```

Output:

```text
Iterazione 1
Iterazione 2
Iterazione 3
Iterazione 4
Iterazione 5
```

Il funzionamento:

1. `int i = 1` viene eseguito una sola volta.
2. Prima di ogni ripetizione si controlla `i <= 5`.
3. Dopo ogni ripetizione si esegue `++i`.
4. Quando `i` diventa `6`, il ciclo termina.

La variabile `i` esiste solo dentro il ciclo.

### Cicli annidati

Un ciclo può contenere un altro ciclo. Qui l'esterno scorre le righe e l'interno le colonne:

```cpp
for (int riga = 1; riga <= 3; ++riga) {
    for (int colonna = 1; colonna <= 4; ++colonna) {
        std::cout << riga << "-" << colonna << " ";
    }
    std::cout << "\n";
}
```

Output:

```text
1-1 1-2 1-3 1-4
2-1 2-2 2-3 2-4
3-1 3-2 3-3 3-4
```

Per ogni valore di `riga`, il ciclo interno esegue tutte le colonne.

### Range-based for

Il **range-based for** attraversa direttamente tutti gli elementi di una collezione, senza gestire indici:

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

Funziona con `std::string` e, come vedremo, con `std::vector`. È comodo quando serve visitare tutti gli elementi e non serve sapere la posizione.

### Quando usare for e quando while

- Usate `for` quando sapete quante ripetizioni servono: "stampa 10 numeri", "leggi 5 voti".
- Usate `while` quando la ripetizione dipende da una condizione: "continua finché l'utente non inserisce 0".
- Usate il range-based for quando dovete attraversare tutti gli elementi di una collezione.

In pratica, il `for` classico è la scelta più frequente per contare.

### Esempio: somma dei primi N numeri

```cpp
#include <iostream>

int main() {
    int n;
    int somma = 0;

    std::cout << "N: ";
    std::cin >> n;

    for (int i = 1; i <= n; ++i) {
        somma += i;
    }

    std::cout << "Somma: " << somma << "\n";

    return 0;
}
```

Con `n = 5` stampa `15`.

### Errori comuni

- Dimenticare l'aggiornamento `++i`: ciclo infinito.
- Usare una variabile del ciclo fuori dal ciclo: non esiste più.
- Sbagliare il limite (`<` invece di `<=`).
- Scrivere un `;` subito dopo la parentesi del `for`: il ciclo non esegue il blocco.
- Confondere l'ordine dei cicli annidati: l'interno viene eseguito tutto per ogni passo dell'esterno.

## Micro-esercizio

Stampate la tavola pitagorica da 1 a 10 usando due cicli `for` annidati. La prima riga deve essere `1 2 3 ... 10`, la seconda `2 4 6 ... 20` e così via.

Output atteso (prime righe):

```text
1 2 3 4 5 6 7 8 9 10
2 4 6 8 10 12 14 16 18 20
3 6 9 12 15 18 21 24 27 30
...
```

### Variante

Scegliete un numero con `std::cin` e stampate solo la sua tabellina, da 1 a 10.
