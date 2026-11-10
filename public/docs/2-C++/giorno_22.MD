# Giorno 22: Mappe

**Obiettivo:** associare una chiave a un valore e cercare rapidamente.

### Che cos'è una mappa

Una mappa è una collezione di coppie **chiave-valore**. Ogni chiave è unica e permette di trovare il valore corrispondente.

```cpp
#include <map>

std::map<std::string, int> voti;
```

Questa mappa associa una stringa (il nome) a un intero (il voto).

### Inserimento

```cpp
voti["Anna"] = 8;
voti["Luca"] = 7;
voti["Sara"] = 9;
```

L'operatore `[]` inserisce la chiave se non esiste, oppure modifica il valore se esiste già.

```cpp
voti["Anna"] = 10;   // sovrascrive il voto precedente
```

### Ricerca

```cpp
std::cout << voti["Anna"] << "\n";
```

Attenzione: `voti["NomeCheNonEsiste"]` **crea** la chiave con valore `0`. Per controllare se una chiave esiste senza inserirla si usa `find`:

```cpp
auto it = voti.find("Marco");

if (it != voti.end()) {
    std::cout << "Voto: " << it->second << "\n";
} else {
    std::cout << "Non trovato\n";
}
```

- `it->first` è la chiave.
- `it->second` è il valore.

In alternativa, in C++20 esiste `voti.contains("Marco")`. Se il compilatore non supporta C++20, usate `find`.

### Attraversare una mappa

```cpp
for (const auto& coppia : voti) {
    std::cout << coppia.first << ": " << coppia.second << "\n";
}
```

Gli elementi di `std::map` sono ordinati per chiave.

### map e unordered_map

| Contenitore | Ordine | Uso tipico |
| --- | --- | --- |
| `std::map` | Ordinato per chiave | Serve un ordine stabile |
| `std::unordered_map` | Nessun ordine | Ricerca molto veloce |

```cpp
#include <unordered_map>

std::unordered_map<std::string, int> voti;
```

Per un programma piccolo la differenza è minima. `std::map` è più semplice da osservare perché stampa le chiavi in ordine.

### Esempio completo

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> voti;

    voti["Anna"] = 8;
    voti["Luca"] = 7;
    voti["Sara"] = 9;

    for (const auto& coppia : voti) {
        std::cout << coppia.first << ": " << coppia.second << "\n";
    }

    auto it = voti.find("Luca");

    if (it != voti.end()) {
        std::cout << "Voto di Luca: " << it->second << "\n";
    }

    return 0;
}
```

Output:

```text
Anna: 8
Luca: 7
Sara: 9
Voto di Luca: 7
```

### Quando usare una mappa

- Quando dovete cercare un valore tramite una chiave.
- Quando le chiavi sono uniche.
- Quando volete contare quante volte compare un elemento (chiave = elemento, valore = conteggio).

Per contare parole, per esempio:

```cpp
std::map<std::string, int> conteggio;

conteggio[parola]++;   // crea la chiave a 0 e poi incrementa
```

### Errori comuni

- Usare `[]` per controllare se una chiave esiste: la crea.
- Dimenticare che le chiavi sono uniche: due inserimenti sulla stessa chiave sovrascrivono.
- Usare un tipo non confrontabile come chiave.
- Modificare la chiave durante l'iterazione.

## Micro-esercizio

Create una mappa che associa nomi a voti, inserite tre persone e stampate tutte le coppie. Cercate un nome con `find` e stampate il voto se esiste, altrimenti un messaggio.

Output atteso (esempio):

```text
Anna: 8
Luca: 7
Sara: 9
Voto di Luca: 7
```

### Variante

Chiedete all'utente tre nomi e tre voti e inseriteli nella mappa. Alla fine chiedete un nome da cercare. Se la mappa è ordinata, notate che l'output è alfabetico.
