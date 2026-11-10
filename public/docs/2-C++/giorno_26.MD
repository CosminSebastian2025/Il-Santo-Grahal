# Giorno 26: File input/output

**Obiettivo:** salvare dati su un file di testo e rileggerli.

### Le classi per i file

Per lavorare con i file si includono `fstream` e si usano:

- `std::ofstream` per scrivere;
- `std::ifstream` per leggere.

```cpp
#include <fstream>
```

### Scrivere su un file

```cpp
#include <fstream>
#include <iostream>

int main() {
    std::ofstream file("nomi.txt");

    if (!file) {
        std::cout << "Impossibile aprire il file.\n";
        return 1;
    }

    file << "Anna\n";
    file << "Luca\n";
    file << "Sara\n";

    file.close();

    return 0;
}
```

- Il file viene creato nella cartella da cui si esegue il programma.
- Se il file esiste già, viene svuotato.
- `if (!file)` controlla che l'apertura sia riuscita.
- `close()` chiude il file. Il distruttore lo chiude comunque, ma è chiaro chiuderlo quando si è finito.

### Leggere un file riga per riga

```cpp
#include <fstream>
#include <iostream>
#include <string>

int main() {
    std::ifstream file("nomi.txt");

    if (!file) {
        std::cout << "File non trovato.\n";
        return 1;
    }

    std::string riga;

    while (std::getline(file, riga)) {
        std::cout << riga << "\n";
    }

    file.close();

    return 0;
}
```

`std::getline` restituisce `false` quando arriva alla fine del file. Il ciclo legge una riga alla volta e la stampa.

### Scrivere aggiungendo in fondo

Di default `ofstream` svuota il file. Per aggiungere in fondo si usa la modalità `std::ios::app`:

```cpp
std::ofstream file("nomi.txt", std::ios::app);

if (file) {
    file << "Marco\n";
}
```

### File con più campi

Per salvare una struct si possono separare i campi con uno spazio o una virgola:

```cpp
struct Persona {
    std::string nome;
    int eta;
};

// scrittura
file << p.nome << " " << p.eta << "\n";

// lettura
Persona p;
while (file >> p.nome >> p.eta) {
    std::cout << p.nome << " ha " << p.eta << " anni\n";
}
```

Con `>>` si leggono campi separati da spazi. Se il nome contiene spazi, questo formato non basta: usate un separatore come `,` e leggete la riga con `getline`, poi estraete i campi con `std::stringstream`.

### Esempio completo: salvare e rileggere nomi

```cpp
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> nomi = {"Anna", "Luca", "Sara"};

    {
        std::ofstream file("nomi.txt");

        if (!file) {
            std::cout << "Errore di scrittura.\n";
            return 1;
        }

        for (const auto& nome : nomi) {
            file << nome << "\n";
        }
    }   // il file viene chiuso qui

    std::ifstream file("nomi.txt");

    if (!file) {
        std::cout << "Errore di lettura.\n";
        return 1;
    }

    std::string riga;

    while (std::getline(file, riga)) {
        std::cout << riga << "\n";
    }

    return 0;
}
```

Output:

```text
Anna
Luca
Sara
```

Il blocco interno con `{}` chiude il file automaticamente quando esce dallo scope: è un esempio di RAII applicato ai file.

### Errori comuni

- Dimenticare di controllare se il file si è aperto.
- Aprire in scrittura un file che si voleva conservare: il contenuto viene perso.
- Dimenticare `#include <fstream>`.
- Usare `>>` per leggere nomi con spazi.
- Lasciare il file aperto quando si riapre lo stesso file in lettura: chiudetelo prima.
- Assumere che il file si trovi sempre nella stessa cartella dell'eseguibile: dipende da come avviate il programma.

## Micro-esercizio

Salvate una lista di tre nomi in un file `nomi.txt`, poi riapritelo in lettura e stampate ogni nome su una riga.

Output atteso:

```text
Anna
Luca
Sara
```

### Variante

Aggiungete un quarto nome usando la modalità `std::ios::app` e rileggete il file. Contate quante righe contiene.
