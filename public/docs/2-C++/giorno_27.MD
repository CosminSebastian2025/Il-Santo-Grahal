# Giorno 27: Debug e warning

**Obiettivo:** leggere gli avvisi del compilatore e usare il debugger per trovare gli errori.

### I warning del compilatore

Compilate sempre con gli avvisi attivi:

```bash
g++ -std=c++17 -Wall -Wextra -g main.cpp -o main
```

- `-Wall` attiva gli avvisi più importanti.
- `-Wextra` attiva avvisi aggiuntivi.
- `-g` inserisce le informazioni per il debugger.

Un warning non impedisce la compilazione, ma spesso segnala un bug reale. Il codice con warning non è "codice pulito": correggetelo prima di andare avanti.

### Un esempio di warning

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> voti = {6, 7, 8};
    int somma = 0;
    int inutilizzata = 10;

    for (int i = 0; i < voti.size(); ++i) {
        somma += voti[i];
    }

    std::cout << "Somma: " << somma << "\n";

    return 0;
}
```

Il compilatore segnala:

- `inutilizzata` non viene mai usata;
- il confronto tra `int` e `std::size_t` (senza segno) può essere pericoloso.

Correzione:

```cpp
for (std::size_t i = 0; i < voti.size(); ++i) {
    somma += voti[i];
}
```

E rimuovete la variabile inutilizzata.

### Errori comuni e messaggi

| Messaggio | Significato tipico |
| --- | --- |
| `expected ';'` | Manca un punto e virgola nella riga indicata o in quella precedente |
| `was not declared in this scope` | Nome scritto male o variabile fuori dallo scope |
| `no matching function for call` | Parametri sbagliati o funzione non dichiarata |
| `undefined reference` | Funzione dichiarata ma non definita, oppure file non compilato |
| `redefinition` | Stessa funzione o variabile definita due volte |

Leggete sempre la **prima** riga di errore: le successive possono essere conseguenze.

### Il debugger

Il debugger permette di fermare il programma e guardare i valori mentre gira. Con `gdb`:

```bash
g++ -std=c++17 -g main.cpp -o main
gdb ./main
```

Comandi utili:

| Comando | Cosa fa |
| --- | --- |
| `break main` | Mette un punto di interruzione su `main` |
| `run` | Avvia il programma |
| `next` | Esegue la riga successiva |
| `print x` | Mostra il valore di `x` |
| `continue` | Continua fino al prossimo breakpoint |
| `quit` | Esce dal debugger |

Su Windows con Visual Studio Code potete usare l'interfaccia grafica: cliccate a sinistra del numero di riga per creare un breakpoint e avviate il debug.

### I breakpoint

Un **breakpoint** è una riga in cui il programma si ferma. Si usa per:

- controllare se una funzione viene chiamata;
- vedere il valore di una variabile prima di una condizione;
- capire perché un ciclo non termina;
- seguire passo passo un calcolo sbagliato.

Senza debugger, un'alternativa è stampare i valori con `std::cout` in punti strategici. È meno elegante ma spesso sufficiente per un programma piccolo.

### Esempio di bug da cercare

```cpp
int somma = 0;

for (int i = 1; i <= 5; ++i) {
    somma += i;
}

std::cout << somma << "\n";
```

Se il risultato non è quello atteso, il debugger vi permette di vedere `i` e `somma` a ogni iterazione. In alternativa:

```cpp
std::cout << "i=" << i << " somma=" << somma << "\n";
```

### Errori comuni

- Ignorare i warning perché "il programma funziona".
- Compilare senza `-Wall -Wextra`.
- Leggere solo l'ultima riga di errore invece della prima.
- Modificare il codice a caso senza verificare il valore delle variabili.
- Dimenticare di ricompilare dopo una modifica.

## Micro-esercizio

Compilate il programma dell'esempio con `-Wall -Wextra` e correggete tutti i warning: rimuovete la variabile inutilizzata e sistemate il confronto tra tipi con e senza segno.

Output atteso:

```text
Somma: 21
```

### Variante

Introducete di proposito un errore in un ciclo (`i <= 5` diventa `i <= 50`) e usate il debugger o delle stampe per capire perché il risultato è sbagliato. Poi correggete.
