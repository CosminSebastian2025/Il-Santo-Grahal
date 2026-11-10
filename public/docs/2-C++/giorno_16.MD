# Giorno 16: Costruttori

**Obiettivo:** inizializzare un oggetto nel momento in cui viene creato.

### Che cos'è un costruttore

Un **costruttore** è un metodo speciale che viene chiamato automaticamente quando si crea un oggetto. Ha lo stesso nome della classe e non ha un tipo di ritorno.

```cpp
class Persona {
public:
    Persona(std::string nome, int eta)
        : nome{nome}, eta{eta} {
    }

private:
    std::string nome;
    int eta;
};
```

Creazione:

```cpp
Persona p{"Anna", 17};
```

Il costruttore riceve `"Anna"` e `17` e li assegna ai membri.

### Member initializer list

La parte dopo i due punti si chiama **lista di inizializzazione**:

```cpp
Persona(std::string nome, int eta)
    : nome{nome}, eta{eta} {
}
```

Inizializza i membri direttamente, prima del corpo del costruttore. È il modo corretto e più efficiente: i membri non vengono creati vuoti e poi riassegnati.

### Costruttore di default

Se non scrivete nessun costruttore, il compilatore ne crea uno di default che lascia i membri senza inizializzazione (per i tipi base). Per evitare valori casuali si possono inizializzare i membri direttamente:

```cpp
class Persona {
public:
    Persona() = default;

    void stampa() const {
        std::cout << nome << ", " << eta << " anni\n";
    }

private:
    std::string nome = "Sconosciuto";
    int eta = 0;
};
```

Ora `Persona p;` crea una persona valida.

### Più costruttori

Una classe può avere più costruttori, con parametri diversi:

```cpp
class Persona {
public:
    Persona() : nome{"Sconosciuto"}, eta{0} {}

    Persona(std::string nome, int eta)
        : nome{nome}, eta{eta} {}
};
```

Il compilatore sceglie quello che corrisponde agli argomenti usati.

### Esempio completo

```cpp
#include <iostream>
#include <string>

class Persona {
public:
    Persona(std::string nome, int eta)
        : nome{nome}, eta{eta} {
    }

    void stampa() const {
        std::cout << nome << ", " << eta << " anni\n";
    }

private:
    std::string nome;
    int eta;
};

int main() {
    Persona p{"Anna", 17};
    Persona q{"Luca", 18};

    p.stampa();
    q.stampa();

    return 0;
}
```

Output:

```text
Anna, 17 anni
Luca, 18 anni
```

### Perché usare il costruttore

- Garantisce che un oggetto nasca in uno stato valido.
- Evita di dover chiamare un metodo `inizializza()` dopo la creazione.
- Rende impossibile creare una persona senza nome o età.

### Errori comuni

- Mettere un tipo di ritorno al costruttore (`void Persona(...)` è sbagliato).
- Dimenticare il nome uguale a quello della classe.
- Assegnare nel corpo invece di usare la lista di inizializzazione.
- Dichiarare un costruttore con parametri e poi provare a creare l'oggetto senza argomenti.
- Confondere il parametro `nome` con il membro `nome`: la lista `nome{nome}` funziona, ma nomi identici possono confondere.

## Micro-esercizio

Create una classe `Persona` con `nome` ed `eta` privati, un costruttore che li riceve e un metodo `stampa()` che li mostra. Nel `main` create due persone e stampatele.

Output atteso (esempio):

```text
Anna, 17 anni
Luca, 18 anni
```

### Variante

Aggiungete un secondo costruttore senza parametri che crea una persona con nome `Sconosciuto` ed età `0`. Create un oggetto con ciascun costruttore.
