# Giorno 15: Classi base

**Obiettivo:** creare un tipo che contiene dati e funzioni che lavorano su quei dati.

### Struct e class

Una `class` è molto simile a una struct: raggruppa dati e funzioni. La differenza principale è la visibilità predefinita:

- in una `struct` i membri sono pubblici;
- in una `class` i membri sono privati.

```cpp
class Contatore {
public:
    int valore;

    void incrementa() {
        ++valore;
    }
};
```

### public e private

```cpp
class Contatore {
public:
    void incrementa() {
        ++valore;
    }

    int leggi() const {
        return valore;
    }

private:
    int valore = 0;
};
```

- I membri `public` sono accessibili dall'esterno.
- I membri `private` sono accessibili solo dalle funzioni della classe.

Qui `valore` è privato: chi usa `Contatore` non può scrivere `c.valore = 10;`, ma deve passare dai metodi pubblici.

### Membri dati e metodi

- I **membri dati** sono le variabili della classe (`valore`).
- I **metodi** sono le funzioni della classe (`incrementa`, `leggi`).

Ogni oggetto creato dalla classe ha i propri membri dati:

```cpp
Contatore a;
Contatore b;

a.incrementa();
a.incrementa();
b.incrementa();

std::cout << a.leggi() << "\n";   // 2
std::cout << b.leggi() << "\n";   // 1
```

`a` e `b` sono indipendenti.

### Esempio completo

```cpp
#include <iostream>

class Contatore {
public:
    void incrementa() {
        ++valore;
    }

    void decrementa() {
        if (valore > 0) {
            --valore;
        }
    }

    int leggi() const {
        return valore;
    }

private:
    int valore = 0;
};

int main() {
    Contatore c;

    c.incrementa();
    c.incrementa();
    c.incrementa();
    c.decrementa();

    std::cout << "Valore: " << c.leggi() << "\n";

    return 0;
}
```

Output:

```text
Valore: 2
```

### Perché usare una classe

Una classe permette di tenere insieme i dati e le regole che li proteggono. Nel contatore, `decrementa` impedisce di scendere sotto zero: la regola vive dentro la classe e non può essere dimenticata dall'esterno.

### Oggetti

Un oggetto è una variabile di tipo classe:

```cpp
Contatore contatore;   // oggetto creato sullo stack
```

I metodi si chiamano con il punto: `contatore.incrementa()`.

### Errori comuni

- Dimenticare `public:` prima dei metodi che devono essere usati dall'esterno.
- Dimenticare il `;` dopo la chiusura della classe.
- Accedere a un membro privato dall'esterno.
- Confondere la classe (il tipo) con l'oggetto (la variabile).
- Definire metodi che modificano i dati ma dichiararli `const` per errore.

## Micro-esercizio

Create una classe `Contatore` con un membro privato `int valore = 0` e un metodo pubblico `incrementa()`. Aggiungete un metodo `leggi()` che restituisce il valore. Nel `main` incrementate tre volte e stampate il risultato.

Output atteso:

```text
Valore: 3
```

### Variante

Aggiungete un metodo `reset()` che riporta il contatore a zero e un metodo `decrementa()` che non scende sotto zero. Provate la sequenza: incrementa, incrementa, decrementa, reset, leggi.
