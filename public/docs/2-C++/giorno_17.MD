# Giorno 17: Metodi const e incapsulamento

**Obiettivo:** proteggere i dati interni di una classe e offrire un'interfaccia controllata.

### Incapsulamento

L'**incapsulamento** significa nascondere i dettagli interni e permettere l'accesso solo attraverso metodi controllati. I dati diventano `private`, i metodi pubblici esprimono ciò che si può fare.

```cpp
class ContoBancario {
public:
    void deposita(double importo) {
        if (importo > 0) {
            saldo += importo;
        }
    }

    bool preleva(double importo) {
        if (importo > 0 && importo <= saldo) {
            saldo -= importo;
            return true;
        }
        return false;
    }

    double getSaldo() const {
        return saldo;
    }

private:
    double saldo = 0.0;
};
```

Qui `saldo` non può essere modificato dall'esterno: nessuno può scrivere `conto.saldo = 1000000;`. Si passa solo da `deposita` e `preleva`, che rispettano le regole.

### Perché proteggere i dati

Se il saldo fosse pubblico, qualsiasi parte del programma potrebbe impostarlo a un valore impossibile. Con l'incapsulamento:

- le regole sono scritte in un solo posto;
- il resto del programma non può romperle;
- potete cambiare l'implementazione interna senza modificare chi usa la classe.

### Metodi const

Un metodo `const` promette di **non modificare** l'oggetto:

```cpp
double getSaldo() const {
    return saldo;
}
```

Se dentro un metodo `const` provate a modificare un membro, il compilatore segnala un errore. È una garanzia utile e rende possibile chiamare il metodo su oggetti dichiarati `const`.

```cpp
const ContoBancario conto;
double s = conto.getSaldo();   // ok: getSaldo è const
// conto.deposita(10);         // errore: deposita non è const
```

### Getter e setter

- Un **getter** legge un valore: `getSaldo()`.
- Un **setter** modifica un valore, spesso con controlli: `deposita()` non è un setter classico, ma svolge lo stesso ruolo in modo sicuro.

Non serve creare un getter e un setter per ogni campo: create solo i metodi che servono davvero. Un setter senza controlli può annullare i vantaggi dell'incapsulamento.

### Esempio completo

```cpp
#include <iostream>

class ContoBancario {
public:
    ContoBancario(double saldoIniziale)
        : saldo{saldoIniziale} {
    }

    void deposita(double importo) {
        if (importo > 0) {
            saldo += importo;
        }
    }

    bool preleva(double importo) {
        if (importo > 0 && importo <= saldo) {
            saldo -= importo;
            return true;
        }
        return false;
    }

    double getSaldo() const {
        return saldo;
    }

private:
    double saldo;
};

int main() {
    ContoBancario conto{100.0};

    conto.deposita(50.0);

    if (!conto.preleva(30.0)) {
        std::cout << "Prelievo rifiutato\n";
    }

    if (!conto.preleva(200.0)) {
        std::cout << "Prelievo rifiutato\n";
    }

    std::cout << "Saldo: " << conto.getSaldo() << "\n";

    return 0;
}
```

Output:

```text
Prelievo rifiutato
Saldo: 120
```

### Errori comuni

- Rendere pubblici i dati e poi aggiungere controlli ovunque.
- Dimenticare `const` sui metodi che non modificano l'oggetto.
- Restituire un riferimento modificabile a un membro privato.
- Creare setter che accettano qualsiasi valore senza validare.
- Chiamare un metodo non `const` su un oggetto `const`.

## Micro-esercizio

Create una classe `ContoBancario` con `saldo` privato, un costruttore che riceve il saldo iniziale, i metodi `deposita`, `preleva` e `getSaldo`. Provate un deposito valido, un prelievo valido e un prelievo troppo grande.

Output atteso (esempio):

```text
Prelievo rifiutato
Saldo: 120
```

### Variante

Aggiungete un metodo `void applicaInteresse(double percentuale)` che aumenta il saldo di una percentuale, solo se il saldo è positivo. Rendete `getSaldo` const.
