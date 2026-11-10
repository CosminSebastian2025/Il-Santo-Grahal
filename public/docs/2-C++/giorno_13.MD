# Giorno 13: Struct

**Obiettivo:** raggruppare più dati che descrivono la stessa cosa.

### Dati separati e dati raggruppati

Senza una struttura, una persona richiede variabili separate:

```cpp
std::string nome = "Anna";
int eta = 17;
std::string citta = "Roma";
```

Se le persone diventano due o tre, le variabili si moltiplicano e diventa difficile ricordare quali appartengono a chi. Una `struct` raggruppa i campi sotto un unico nome:

```cpp
struct Persona {
    std::string nome;
    int eta;
    std::string citta;
};
```

`Persona` è ora un nuovo tipo. I campi sono `nome`, `eta` e `citta`.

### Creare e inizializzare una struct

```cpp
Persona p;
p.nome = "Anna";
p.eta = 17;
p.citta = "Roma";
```

Oppure con l'inizializzazione diretta, nell'ordine dei campi:

```cpp
Persona p = {"Anna", 17, "Roma"};
```

In C++ moderno si possono usare anche le graffe:

```cpp
Persona p{"Anna", 17, "Roma"};
```

### Accesso con l'operatore punto

Si accede ai campi con il punto `.`:

```cpp
std::cout << p.nome << "\n";
std::cout << p.eta << "\n";
std::cout << p.citta << "\n";

p.eta = 18;   // modifica un campo
```

### Esempio completo

```cpp
#include <iostream>
#include <string>

struct Persona {
    std::string nome;
    int eta;
    std::string citta;
};

int main() {
    Persona p{"Anna", 17, "Roma"};

    std::cout << "Nome: " << p.nome << "\n";
    std::cout << "Eta: " << p.eta << "\n";
    std::cout << "Citta: " << p.citta << "\n";

    return 0;
}
```

Output:

```text
Nome: Anna
Eta: 17
Citta: Roma
```

### Struct e funzioni

Una struct può essere passata a una funzione come qualsiasi altro tipo:

```cpp
void stampaPersona(const Persona& p) {
    std::cout << p.nome << ", " << p.eta << " anni, " << p.citta << "\n";
}
```

`const Persona&` evita la copia e impedisce alla funzione di modificare la persona. I riferimenti li approfondiremo il Giorno 18; per ora leggete questa firma come "passa la persona senza copiarla e senza modificarla".

### Perché usare le struct

- I dati correlati restano insieme.
- Il codice diventa più leggibile: `p.nome` spiega meglio di `nome1`.
- Le funzioni ricevono un solo parametro invece di tre o quattro.
- È il primo passo verso le classi.

### Errori comuni

- Dimenticare il punto e virgola dopo la chiusura della struct.
- Dimenticare il `;` dopo `struct Persona { ... };`.
- Inizializzare i campi in ordine sbagliato quando si usa la forma compatta.
- Usare una struct prima di dichiararla.
- Confondere `struct` con `class`: per ora la differenza principale è la visibilità predefinita, che vedremo il Giorno 15.

## Micro-esercizio

Create una `struct Persona` con i campi `nome`, `eta` e `citta`. Create una persona con i vostri dati e stampatene i tre campi.

Output atteso (esempio):

```text
Nome: Anna
Eta: 17
Citta: Roma
```

### Variante

Aggiungete alla struct un campo `bool studente` e stampate `Si` o `No` in base al valore, usando un `if`.
