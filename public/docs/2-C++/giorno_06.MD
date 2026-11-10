# Giorno 6: Cicli while

**Obiettivo:** ripetere istruzioni finché una condizione resta vera.

### La struttura while

```cpp
while (condizione) {
    // istruzioni ripetute
}
```

La condizione viene controllata **prima** di ogni ripetizione. Se è falsa fin dall'inizio, il blocco non viene eseguito nemmeno una volta.

```cpp
#include <iostream>

int main() {
    int i = 1;

    while (i <= 5) {
        std::cout << i << "\n";
        ++i;
    }

    return 0;
}
```

Output:

```text
1
2
3
4
5
```

### La condizione di uscita

Perché il ciclo finisca, dentro il blocco deve succedere qualcosa che rende falsa la condizione. Nell'esempio è `++i`: quando `i` diventa `6`, la condizione `i <= 5` è falsa.

Se dimenticate di aggiornare la variabile, il ciclo non termina mai:

```cpp
int i = 1;

while (i <= 5) {
    std::cout << i << "\n";
    // manca ++i: ciclo infinito
}
```

Se vi capita un ciclo infinito, fermate il programma con `Ctrl+C` nel terminale.

### Variabili contatore

Una variabile che viene aggiornata a ogni ripetizione si chiama **contatore**. Può contare anche al contrario:

```cpp
int i = 5;

while (i >= 1) {
    std::cout << i << "\n";
    --i;
}

std::cout << "Via!\n";
```

Output:

```text
5
4
3
2
1
Via!
```

### Sommare valori inseriti dall'utente

Il `while` è comodo quando non sappiamo in anticipo quante ripetizioni servono. Qui il programma continua finché l'utente non inserisce `0`:

```cpp
#include <iostream>

int main() {
    int numero;
    int somma = 0;

    std::cout << "Inserisci numeri (0 per terminare):\n";
    std::cin >> numero;

    while (numero != 0) {
        somma += numero;
        std::cin >> numero;
    }

    std::cout << "Somma: " << somma << "\n";

    return 0;
}
```

La prima lettura avviene prima del ciclo, così la condizione ha un valore su cui lavorare. L'ultima lettura avviene dentro il ciclo e prepara la condizione successiva.

### Un ciclo di validazione

Il `while` può anche servire a chiedere un dato finché non è valido:

```cpp
int eta = -1;

while (eta < 0) {
    std::cout << "Eta: ";
    std::cin >> eta;
}

std::cout << "Eta accettata: " << eta << "\n";
```

Qui non serve un contatore: la condizione dipende dal valore inserito.

### Errori comuni

- Dimenticare di aggiornare la variabile del ciclo: ciclo infinito.
- Controllare la condizione sbagliata (`i < 5` invece di `i <= 5`): una ripetizione in meno.
- Modificare la variabile del ciclo in più punti del blocco: il conteggio diventa difficile da seguire.
- Leggere l'input solo dentro il ciclo quando la condizione usa un valore non ancora inizializzato.

## Micro-esercizio

Stampate i numeri da 1 a 10 usando un ciclo `while`.

Output atteso:

```text
1
2
3
4
5
6
7
8
9
10
```

### Variante

Stampate i numeri pari da 2 a 20 usando un `while`. Poi provate a farli stampare al contrario, da 20 a 2.
