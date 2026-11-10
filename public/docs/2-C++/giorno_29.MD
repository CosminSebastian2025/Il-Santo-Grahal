# Giorno 29: Progetto guidato, parte 2

**Obiettivo:** completare la rubrica con ricerca, cancellazione, ordinamento e file.

### Il progetto di oggi

Partiamo dal programma del Giorno 28 e aggiungiamo:

- ricerca per nome;
- cancellazione di un contatto;
- ordinamento alfabetico;
- salvataggio e caricamento da file.

### Ricerca

```cpp
void cercaContatti(const std::vector<Contatto>& contatti, const std::string& testo) {
    bool trovato = false;

    for (const auto& c : contatti) {
        if (c.nome.find(testo) != std::string::npos) {
            std::cout << c.nome << " - " << c.telefono << "\n";
            trovato = true;
        }
    }

    if (!trovato) {
        std::cout << "Nessun contatto trovato.\n";
    }
}
```

`std::string::npos` è il valore restituito da `find` quando il testo non c'è. Cercando `"Ros"` si trova `"Anna Rossi"`.

### Cancellazione

```cpp
void cancellaContatto(std::vector<Contatto>& contatti, const std::string& nome) {
    for (std::size_t i = 0; i < contatti.size(); ++i) {
        if (contatti[i].nome == nome) {
            contatti.erase(contatti.begin() + i);
            std::cout << "Contatto cancellato.\n";
            return;
        }
    }

    std::cout << "Contatto non trovato.\n";
}
```

`erase` rimuove l'elemento e sposta indietro i successivi. Dopo l'`erase` gli indici cambiano: non usate più `i` come posizione stabile.

### Ordinamento

```cpp
void ordinaContatti(std::vector<Contatto>& contatti) {
    std::sort(contatti.begin(), contatti.end(),
              [](const Contatto& a, const Contatto& b) {
                  return a.nome < b.nome;
              });
}
```

Serve `#include <algorithm>`. La lambda confronta i nomi e ordina in modo alfabetico.

### Salvataggio su file

Usiamo un separatore `|` per gestire nomi con spazi:

```cpp
bool salvaSuFile(const std::vector<Contatto>& contatti, const std::string& nomeFile) {
    std::ofstream file(nomeFile);

    if (!file) {
        return false;
    }

    for (const auto& c : contatti) {
        file << c.nome << "|" << c.telefono << "\n";
    }

    return true;
}
```

Il file risultante:

```text
Anna Rossi|3331234567
Luca Bianchi|3409876543
```

### Caricamento da file

```cpp
bool caricaDaFile(std::vector<Contatto>& contatti, const std::string& nomeFile) {
    std::ifstream file(nomeFile);

    if (!file) {
        return false;
    }

    std::string riga;

    while (std::getline(file, riga)) {
        std::size_t pos = riga.find('|');

        if (pos != std::string::npos) {
            Contatto c;
            c.nome = riga.substr(0, pos);
            c.telefono = riga.substr(pos + 1);
            contatti.push_back(c);
        }
    }

    return true;
}
```

`substr(0, pos)` prende la parte prima del separatore, `substr(pos + 1)` quella dopo.

### Il nuovo menu

```text
1. Aggiungi contatto
2. Mostra contatti
3. Cerca contatto
4. Cancella contatto
5. Ordina contatti
6. Salva su file
7. Carica da file
8. Esci
```

Nel `main` aggiungete i rami corrispondenti:

```cpp
} else if (scelta == 3) {
    std::string testo;
    std::cout << "Nome da cercare: ";
    std::getline(std::cin, testo);
    cercaContatti(contatti, testo);
} else if (scelta == 4) {
    std::string nome;
    std::cout << "Nome esatto da cancellare: ";
    std::getline(std::cin, nome);
    cancellaContatto(contatti, nome);
} else if (scelta == 5) {
    ordinaContatti(contatti);
    std::cout << "Contatti ordinati.\n";
} else if (scelta == 6) {
    if (salvaSuFile(contatti, "rubrica.txt")) {
        std::cout << "Rubrica salvata.\n";
    } else {
        std::cout << "Errore di salvataggio.\n";
    }
} else if (scelta == 7) {
    contatti.clear();
    if (caricaDaFile(contatti, "rubrica.txt")) {
        std::cout << "Rubrica caricata.\n";
    } else {
        std::cout << "File non trovato.\n";
    }
} else if (scelta == 8) {
    std::cout << "Arrivederci.\n";
}
```

### Errori comuni

- Confrontare i nomi con `==` distinguendo maiuscole e minuscole: `"anna"` e `"Anna"` sono diversi.
- Cancellare mentre si scorre il vector senza `return` o senza aggiornare l'indice.
- Dimenticare `#include <fstream>` e `#include <algorithm>`.
- Salvare senza separatore e poi non riuscire a distinguere nome e telefono.
- Ricaricare il file senza svuotare il vector: i contatti vengono duplicati.
- Non controllare se il file si apre.

## Micro-esercizio

Completate la rubrica con ricerca, cancellazione, ordinamento e salvataggio. Provate questo flusso:

1. aggiungete tre contatti;
2. cercate una parte del nome;
3. cancellate un contatto;
4. ordinate;
5. salvate e uscite;
6. riavviate il programma, caricate e stampate.

Output atteso: i contatti rimasti, in ordine alfabetico.

### Variante

Aggiungete la cancellazione per telefono oltre che per nome. Poi gestite il caso di due contatti con lo stesso nome: chiedete conferma prima di cancellare.
