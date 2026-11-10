# Giorno 4: Operatori ed espressioni

**Obiettivo:** eseguire calcoli e confronti con gli operatori del C++.

### Operatori aritmetici

| Operatore | Operazione | Esempio |
| --- | --- | --- |
| `+` | Addizione | `a + b` |
| `-` | Sottrazione | `a - b` |
| `*` | Moltiplicazione | `a * b` |
| `/` | Divisione | `a / b` |
| `%` | Resto della divisione | `a % b` |

Esempio:

```cpp
int a = 7;
int b = 2;

std::cout << a + b << "\n";   // 9
std::cout << a - b << "\n";   // 5
std::cout << a * b << "\n";   // 14
std::cout << a / b << "\n";   // 3  (divisione tra interi)
std::cout << a % b << "\n";   // 1  (resto)
```

Con due `int`, la divisione restituisce solo la parte intera. Per ottenere i decimali almeno uno dei due valori deve essere `double`:

```cpp
std::cout << 7.0 / 2 << "\n";   // 3.5
```

L'operatore `%` funziona solo con numeri interi e restituisce il resto: `7 % 2` vale `1`, `8 % 2` vale `0`.

### Operatori di confronto

| Operatore | Significato |
| --- | --- |
| `==` | uguale a |
| `!=` | diverso da |
| `<` | minore di |
| `>` | maggiore di |
| `<=` | minore o uguale a |
| `>=` | maggiore o uguale a |

Un confronto produce un `bool`, cioè `true` o `false`:

```cpp
int eta = 17;

bool maggiorenne = eta >= 18;   // false
bool minorenne = eta < 18;      // true
```

Attenzione: `=` assegna un valore, `==` confronta due valori.

### Operatori logici

| Operatore | Significato | Esempio |
| --- | --- | --- |
| `&&` | AND: entrambe vere | `eta >= 18 && patente == true` |
| `\|\|` | OR: almeno una vera | `giorno == 6 \|\| giorno == 7` |
| `!` | NOT: inverte | `!maggiorenne` |

Esempio:

```cpp
int temperatura = 20;

bool gradevole = temperatura >= 18 && temperatura <= 25;
std::cout << gradevole << "\n";   // 1 (true)
```

### Incremento e decremento

```cpp
int contatore = 0;

contatore++;   // contatore = contatore + 1
contatore--;   // contatore = contatore - 1
contatore += 5; // contatore = contatore + 5
```

`++` e `--` si useranno molto nei cicli. Nelle espressioni complesse esistono differenze tra `i++` e `++i`, ma per ora usateli come istruzioni separate, dove non cambia nulla.

### Precedenza

Le operazioni seguono le regole della matematica: prima moltiplicazione e divisione, poi addizione e sottrazione. Le parentesi permettono di cambiare l'ordine:

```cpp
int risultato = 2 + 3 * 4;       // 14
int altro = (2 + 3) * 4;         // 20
```

In caso di dubbio, aggiungete le parentesi: il codice diventa più chiaro.

### Esempio completo

```cpp
#include <iostream>

int main() {
    double a, b;

    std::cout << "Primo numero: ";
    std::cin >> a;
    std::cout << "Secondo numero: ";
    std::cin >> b;

    std::cout << "Somma: " << a + b << "\n";
    std::cout << "Differenza: " << a - b << "\n";
    std::cout << "Prodotto: " << a * b << "\n";

    if (b != 0) {
        std::cout << "Divisione: " << a / b << "\n";
    } else {
        std::cout << "Non si può dividere per zero.\n";
    }

    return 0;
}
```

### Errori comuni

- Confondere `=` con `==`.
- Usare `/` tra due `int` e aspettarsi i decimali.
- Usare `%` con `double`.
- Dividere per zero senza controllare.
- Dimenticare le parentesi in espressioni lunghe.

## Micro-esercizio

Leggete due numeri e stampate somma, differenza, prodotto e divisione. Se il secondo numero è zero, stampate un messaggio di errore invece della divisione.

Output atteso con `7` e `2`:

```text
Somma: 9
Differenza: 5
Prodotto: 14
Divisione: 3.5
```

### Variante

Calcolate anche il resto della divisione. Ha senso solo con numeri interi: provate a leggere due `int` e a stampare `a % b` dopo aver controllato che `b` non sia zero.
