# Giorno 9: Funzioni e scope

**Obiettivo:** capire dove vivono le variabili e organizzare il codice in funzioni piccole.

### Variabili locali

Una variabile dichiarata dentro una funzione esiste solo in quella funzione:

```cpp
#include <iostream>

void esempio() {
    int locale = 10;
    std::cout << locale << "\n";
}

int main() {
    esempio();
    // std::cout << locale;   // errore: locale non esiste qui
    return 0;
}
```

`locale` nasce quando la funzione viene chiamata e muore quando termina.

### Scope

Lo **scope** è la parte di programma in cui un nome è visibile. Le graffe delimitano uno scope:

```cpp
int main() {
    int x = 5;

    if (x > 0) {
        int y = 10;
        std::cout << x + y << "\n";   // x e y visibili
    }

    // std::cout << y;   // errore: y non esiste fuori dal blocco
    return 0;
}
```

Regola pratica: dichiarate una variabile il più vicino possibile al punto in cui serve. Così è più facile capire dove viene usata.

### Variabili globali

Una variabile dichiarata fuori da tutte le funzioni è **globale** e visibile ovunque. È meglio evitarle: rendono difficile capire chi modifica un valore. Usate parametri e valori di ritorno.

### Passaggio per valore

Quando chiamate una funzione, i parametri ricevono una **copia** degli argomenti:

```cpp
#include <iostream>

void raddoppia(int n) {
    n = n * 2;
    std::cout << "Dentro: " << n << "\n";
}

int main() {
    int x = 5;
    raddoppia(x);
    std::cout << "Fuori: " << x << "\n";
    return 0;
}
```

Output:

```text
Dentro: 10
Fuori: 5
```

La modifica avviene sulla copia. Per modificare l'originale servirà il passaggio per riferimento, che vedremo il Giorno 18.

### Funzioni helper

Una funzione **helper** è una funzione piccola che svolge un compito secondario e viene usata da altre funzioni. Serve a tenere il `main` corto e leggibile.

```cpp
#include <iostream>

void stampaMenu() {
    std::cout << "1. Saluta\n";
    std::cout << "2. Esci\n";
}

int leggiScelta() {
    int scelta;
    std::cout << "Scelta: ";
    std::cin >> scelta;
    return scelta;
}

int main() {
    stampaMenu();
    int scelta = leggiScelta();

    if (scelta == 1) {
        std::cout << "Ciao!\n";
    }

    return 0;
}
```

Il `main` racconta la storia del programma senza dettagli: mostra il menu, legge la scelta, agisce.

### Buona organizzazione

- Una funzione dovrebbe fare **una cosa sola**.
- Il nome dovrebbe descrivere l'azione: `calcolaMedia`, `stampaVoti`, `leggiNumero`.
- Evitate funzioni lunghe decine di righe: se serve, dividetele.
- Mettete le funzioni nello stesso ordine logico in cui vengono usate.

### Esempio completo

```cpp
#include <iostream>

int somma(int a, int b) {
    return a + b;
}

int differenza(int a, int b) {
    return a - b;
}

int main() {
    int x, y;

    std::cout << "Primo numero: ";
    std::cin >> x;
    std::cout << "Secondo numero: ";
    std::cin >> y;

    std::cout << "Somma: " << somma(x, y) << "\n";
    std::cout << "Differenza: " << differenza(x, y) << "\n";

    return 0;
}
```

### Errori comuni

- Usare una variabile fuori dal suo scope.
- Assegnare a un parametro pensando di modificare l'argomento originale.
- Fare tutto nel `main` e creare un blocco lungo e difficile da leggere.
- Usare variabili globali solo per comodità.

## Micro-esercizio

Create quattro funzioni separate: `somma`, `sottrazione`, `moltiplicazione` e `divisione`. Leggete due numeri nel `main` e stampate i quattro risultati. Nella divisione controllate che il secondo numero non sia zero.

Output atteso con `8` e `2`:

```text
Somma: 10
Sottrazione: 6
Moltiplicazione: 16
Divisione: 4
```

### Variante

Scrivete una funzione `void stampaRisultato(std::string etichetta, double valore)` che stampa l'etichetta e il valore, e usatela per tutti e quattro i risultati.
