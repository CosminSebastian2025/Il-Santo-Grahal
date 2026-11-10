# Giorno 18: Passaggio per valore e riferimento

**Obiettivo:** capire quando una funzione riceve una copia e quando lavora sull'originale.

### Passaggio per valore

Di default i parametri vengono passati **per valore**: la funzione riceve una copia dell'argomento.

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

La variabile `x` originale non cambia.

### Passaggio per riferimento

Con la `&` nella firma della funzione il parametro diventa un **riferimento** all'argomento:

```cpp
#include <iostream>

void raddoppia(int& n) {
    n = n * 2;
}

int main() {
    int x = 5;
    raddoppia(x);
    std::cout << "x: " << x << "\n";
    return 0;
}
```

Output:

```text
x: 10
```

`n` non è una copia: è un altro nome per `x`. Modificare `n` modifica `x`.

### const reference

Per oggetti grandi (stringhe, vector, struct) copiarli a ogni chiamata è costoso. Si usa `const&` per passare un riferimento senza copiare e senza permettere modifiche:

```cpp
#include <iostream>
#include <string>

void saluta(const std::string& nome) {
    std::cout << "Ciao " << nome << "!\n";
}

int main() {
    std::string nome = "Anna";
    saluta(nome);
    return 0;
}
```

- `&` evita la copia.
- `const` impedisce alla funzione di modificare la stringa.

Questa è la scelta più comune per i parametri di sola lettura che non sono tipi base.

### Riferimento o valore?

| Situazione | Scelta consigliata |
| --- | --- |
| Tipi piccoli (`int`, `double`, `bool`, `char`) | Per valore, salvo necessità di modifica |
| Oggetti grandi in sola lettura (`std::string`, `std::vector`, struct) | `const&` |
| Oggetto da modificare dentro la funzione | `&` non const |
| Oggetto da copiare intenzionalmente | Per valore |

### Esempio: modificare un vector

```cpp
#include <iostream>
#include <vector>

void aggiungiVoto(std::vector<int>& voti, int voto) {
    voti.push_back(voto);
}

void stampaVoti(const std::vector<int>& voti) {
    for (int v : voti) {
        std::cout << v << " ";
    }
    std::cout << "\n";
}

int main() {
    std::vector<int> voti = {6, 7};

    aggiungiVoto(voti, 8);
    aggiungiVoto(voti, 9);

    stampaVoti(voti);

    return 0;
}
```

Output:

```text
6 7 8 9
```

`aggiungiVoto` riceve un riferimento e modifica il vector originale; `stampaVoti` riceve un riferimento costante e non può modificarlo.

### Riferimenti e aliasing

Un riferimento è un altro nome per lo stesso oggetto. Per questo:

```cpp
int x = 5;
int& r = x;

r = 10;
std::cout << x << "\n";   // 10
```

`r` e `x` sono la stessa variabile. Un riferimento deve essere inizializzato subito e non può essere riassegnato a un altro oggetto.

### Errori comuni

- Dimenticare `&` e aspettarsi che la funzione modifichi l'argomento.
- Usare `const&` e poi provare a modificare il parametro.
- Restituire un riferimento a una variabile locale: è un errore grave.
- Passare per valore un vector grande senza necessità: copia inutile.
- Confondere `int&` (riferimento) con `&x` (indirizzo).

## Micro-esercizio

Scrivete una funzione `void raddoppia(int& n)` che raddoppia il valore ricevuto. Nel `main` leggete un numero, chiamate la funzione e stampate il risultato.

Output atteso con `7`:

```text
Prima: 7
Dopo: 14
```

### Variante

Scrivete `void riempi(std::vector<int>& numeri, int n)` che aggiunge al vector i numeri da 1 a `n`, e `void stampa(const std::vector<int>& numeri)` che li stampa. Usate entrambe nel `main`.
