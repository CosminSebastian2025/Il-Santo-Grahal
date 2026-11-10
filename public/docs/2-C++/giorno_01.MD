# Giorno 1: Introduzione e primo programma

**Obiettivo:** capire cos'è un programma C++, compilarlo ed eseguirlo.

### Che cos'è un programma?

Un programma è una sequenza di istruzioni che il computer esegue una dopo l'altra. Il codice che scriviamo è testo leggibile da una persona; per essere eseguito deve essere tradotto in istruzioni per la macchina.

### Che cos'è un compilatore?

Il **compilatore** legge il file sorgente (`.cpp`) e produce un file eseguibile. In questo corso useremo `g++`, ma esistono anche `clang++` e il compilatore di Visual Studio.

```text
main.cpp  →  g++  →  main.exe
```

Il compilatore controlla anche gli errori di sintassi: se manca un punto e virgola o una parentesi, il programma non viene creato.

### La struttura base di un programma C++

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, World!\n";
    return 0;
}
```

- `#include <iostream>` rende disponibili gli strumenti di input/output, tra cui `std::cout`.
- `int main()` è la funzione principale: l'esecuzione parte sempre da qui.
- `std::cout << ...` scrive nel terminale. `std::` indica che `cout` appartiene alla libreria standard.
- `\n` va a capo.
- `return 0;` indica che il programma è terminato correttamente.
- Ogni istruzione termina con `;`.

### Compilare ed eseguire

Salvate il codice in un file chiamato `main.cpp`, aprite il terminale nella cartella del file e scrivete:

```bash
g++ -std=c++17 -Wall -Wextra main.cpp -o main
```

Poi avviate il programma:

```bash
# Linux e macOS
./main

# Windows
main.exe
```

Output:

```text
Hello, World!
```

Se usate un compilatore online, incollate il codice e premete **Run**.

### Errori comuni dei primi giorni

- Dimenticare `;` alla fine di un'istruzione.
- Scrivere `Cout` o `Printf` con la maiuscola: i nomi distinguono maiuscole e minuscole.
- Dimenticare `#include <iostream>`.
- Dimenticare le parentesi graffe di `main`.
- Salvare il file come `.txt` invece che `.cpp`.

Se il compilatore segnala un errore, leggete la prima riga: spesso le righe successive sono conseguenze dello stesso problema.

## Micro-esercizio

Scrivete un programma che stampi esattamente questa riga:

```text
Ciao, sto imparando C++!
```

Poi provate a farlo stampare **due volte**: una con due istruzioni `std::cout` e una con una sola istruzione che contiene `\n` due volte.

Output atteso:

```text
Ciao, sto imparando C++!
Ciao, sto imparando C++!
```

### Variante

Aggiungete una seconda riga con la data di oggi, per esempio:

```text
Oggi è il 9 novembre.
```
