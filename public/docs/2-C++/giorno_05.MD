# Giorno 5: Condizioni con if

**Obiettivo:** far scegliere al programma quale blocco di istruzioni eseguire.

### La struttura if

```cpp
if (condizione) {
    // istruzioni eseguite se la condizione è vera
}
```

La condizione va tra parentesi tonde e produce un `bool`. Il blocco tra graffe viene eseguito solo se la condizione è `true`.

```cpp
#include <iostream>

int main() {
    int eta;

    std::cout << "Eta: ";
    std::cin >> eta;

    if (eta >= 18) {
        std::cout << "Sei maggiorenne.\n";
    }

    return 0;
}
```

### else

Con `else` si indica cosa fare quando la condizione è falsa:

```cpp
if (eta >= 18) {
    std::cout << "Sei maggiorenne.\n";
} else {
    std::cout << "Sei minorenne.\n";
}
```

Viene eseguito sempre **uno solo** dei due blocchi.

### else if

Quando le possibilità sono più di due si concatenano le condizioni:

```cpp
if (voto >= 10) {
    std::cout << "Ottimo\n";
} else if (voto >= 8) {
    std::cout << "Buono\n";
} else if (voto >= 6) {
    std::cout << "Sufficiente\n";
} else {
    std::cout << "Insufficiente\n";
}
```

Le condizioni vengono controllate dall'alto verso il basso e il programma si ferma alla prima vera. Per questo l'ordine è importante: `voto >= 6` va dopo `voto >= 8`, altrimenti un voto alto verrebbe classificato come sufficiente.

### Condizioni booleane

Una condizione può essere una variabile `bool` già pronta:

```cpp
bool maggiorenne = eta >= 18;

if (maggiorenne) {
    std::cout << "Puoi entrare.\n";
}
```

Oppure può combinare più confronti:

```cpp
if (temperatura >= 18 && temperatura <= 25) {
    std::cout << "Temperatura gradevole.\n";
}
```

### Blocchi di codice

Le graffe delimitano un blocco. Se il blocco contiene una sola istruzione potrebbero essere omesse, ma è buona abitudine metterle sempre: il codice resta chiaro e meno soggetto a errori.

```cpp
if (numero > 0)
    std::cout << "Positivo\n";   // funziona, ma meglio con le graffe
```

### Esempio: numero pari o dispari

```cpp
#include <iostream>

int main() {
    int numero;

    std::cout << "Numero: ";
    std::cin >> numero;

    if (numero % 2 == 0) {
        std::cout << "Il numero è pari.\n";
    } else {
        std::cout << "Il numero è dispari.\n";
    }

    return 0;
}
```

### Esempio: positivo, negativo o zero

```cpp
if (numero > 0) {
    std::cout << "Positivo\n";
} else if (numero < 0) {
    std::cout << "Negativo\n";
} else {
    std::cout << "Zero\n";
}
```

### Errori comuni

- Scrivere `if (x = 5)` invece di `if (x == 5)`: il primo assegna, il secondo confronta.
- Mettere un `;` subito dopo la condizione: `if (x > 0);` chiude l'`if` e il blocco successivo viene eseguito sempre.
- Dimenticare le graffe quando il blocco ha più di un'istruzione.
- Invertire l'ordine delle condizioni in una catena `else if`.

## Micro-esercizio

Leggete un numero intero e stampate se è pari o dispari.

Output atteso con `8`:

```text
Il numero è pari.
```

### Variante

Estendete il programma: se il numero è pari stampate anche il suo doppio, se è dispari stampate il suo triplo.
