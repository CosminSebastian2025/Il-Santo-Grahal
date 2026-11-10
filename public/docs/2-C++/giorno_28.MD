# Giorno 28: Progetto guidato, parte 1

**Obiettivo:** iniziare una rubrica con struct, vector e menu.

### Il progetto

Costruiremo una **rubrica** da terminale. Alla fine del percorso dovrà:

- aggiungere contatti;
- mostrarli tutti;
- cercarli per nome;
- cancellarli;
- ordinarli;
- salvarli su file e ricaricarli.

Oggi implementiamo la base: struct, vector, menu e aggiunta.

### Analisi

Un contatto ha due informazioni:

```cpp
struct Contatto {
    std::string nome;
    std::string telefono;
};
```

La rubrica è una collezione di contatti:

```cpp
std::vector<Contatto> contatti;
```

Il programma mostra un menu in un ciclo e resta attivo finché l'utente non sceglie di uscire.

### Il codice completo di oggi

```cpp
#include <iostream>
#include <string>
#include <vector>

struct Contatto {
    std::string nome;
    std::string telefono;
};

void stampaMenu() {
    std::cout << "\n--- RUBRICA ---\n";
    std::cout << "1. Aggiungi contatto\n";
    std::cout << "2. Mostra contatti\n";
    std::cout << "3. Esci\n";
    std::cout << "Scelta: ";
}

void aggiungiContatto(std::vector<Contatto>& contatti) {
    Contatto c;

    std::cout << "Nome: ";
    std::getline(std::cin, c.nome);
    std::cout << "Telefono: ";
    std::getline(std::cin, c.telefono);

    contatti.push_back(c);
    std::cout << "Contatto aggiunto.\n";
}

void stampaContatti(const std::vector<Contatto>& contatti) {
    if (contatti.empty()) {
        std::cout << "Rubrica vuota.\n";
        return;
    }

    for (std::size_t i = 0; i < contatti.size(); ++i) {
        std::cout << i + 1 << ". "
                  << contatti[i].nome << " - "
                  << contatti[i].telefono << "\n";
    }
}

int main() {
    std::vector<Contatto> contatti;
    int scelta = 0;

    while (scelta != 3) {
        stampaMenu();
        std::cin >> scelta;
        std::cin.ignore();   // consuma l'Invio prima di getline

        if (scelta == 1) {
            aggiungiContatto(contatti);
        } else if (scelta == 2) {
            stampaContatti(contatti);
        } else if (scelta == 3) {
            std::cout << "Arrivederci.\n";
        } else {
            std::cout << "Scelta non valida.\n";
        }
    }

    return 0;
}
```

### Perché `std::cin.ignore()`

Dopo `std::cin >> scelta` l'Invio resta nel buffer. La successiva `std::getline` leggerebbe una riga vuota. `std::cin.ignore()` consuma quell'Invio. È lo stesso problema visto il Giorno 3.

### Un esempio di esecuzione

```text
--- RUBRICA ---
1. Aggiungi contatto
2. Mostra contatti
3. Esci
Scelta: 1
Nome: Anna Rossi
Telefono: 3331234567
Contatto aggiunto.

--- RUBRICA ---
1. Aggiungi contatto
2. Mostra contatti
3. Esci
Scelta: 2
1. Anna Rossi - 3331234567
```

### Errori comuni

- Dimenticare `std::cin.ignore()` prima di `getline`.
- Passare il vector per valore a `aggiungiContatto`: l'aggiunta andrebbe persa.
- Usare `contatti[i]` partendo da `1`: il primo elemento è `0`.
- Confondere la posizione mostrata all'utente (`i + 1`) con l'indice interno (`i`).
- Dimenticare di controllare la scelta non valida.

## Micro-esercizio

Scrivete il programma completo con menu, aggiunta e visualizzazione. Aggiungete due contatti e stampateli. Verificate che i nomi con lo spazio vengano letti correttamente.

Output atteso (esempio):

```text
1. Anna Rossi - 3331234567
2. Luca Bianchi - 3409876543
```

### Variante

Aggiungete al menu la voce `3. Conta contatti` e spostate `Esci` a `4`. Usate `contatti.size()` per stampare il numero.
