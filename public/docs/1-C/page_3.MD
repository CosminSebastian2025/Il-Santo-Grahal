# Acquisizione e restituzione dei dati

Prima di passare alla parte pratica, vediamo come creare un file C e scrivere al suo interno il codice del programma. Per esempio, possiamo chiamare il file **hello_world.c**: il nome può essere diverso, ma l'estensione `.c` indica che contiene codice C.

```c
#include <stdio.h> // Include le funzioni per input e output, come printf

int main() {
    printf("Hello, World!\n"); // Mostra un messaggio nel terminale
    return 0; // Segnala che il programma è terminato correttamente
}
```

La funzione `main` è il punto da cui inizia l'esecuzione del programma. `printf` stampa un messaggio nel terminale; `\n` sposta il cursore alla riga successiva. `return 0` indica che il programma è terminato senza errori.

Per eseguire il programma, prima bisogna compilarlo. In VS Code, aprite il terminale nella cartella che contiene il file e lanciate il comando adatto al vostro sistema:

```powershell
gcc hello_world.c -o hello_world.exe
.\hello_world.exe
```

Su Linux o macOS:

```bash
gcc hello_world.c -o hello_world
./hello_world
```

Se usate un ambiente come OnlineGDB o CLion, potete invece premere il pulsante **Run** (di solito rappresentato da un triangolo verde): sarà l'ambiente a compilare e avviare il programma.

L'output sarà:

```text
Hello, World!
```

Perfetto: avete eseguito il vostro primo programma in C. Ora vediamo come chiedere all'utente di inserire un dato da tastiera e come mostrarlo nel terminale.

## Leggere un dato con `scanf`

Per acquisire un dato da tastiera si può usare `scanf`. Bisogna indicare il tipo di dato atteso con uno specificatore di formato e passare alla funzione la variabile in cui salvare il valore. Gli specificatori della tabella sono quelli da usare con `scanf`.

| Tipo di dato | Specificatore |
| --- | --- |
| `int` (numero intero) | `%d` |
| `float` (numero decimale) | `%f` |
| `double` (numero decimale a precisione maggiore) | `%lf` |
| `char` (singolo carattere) | `%c` |
| stringa di caratteri | `%s` |

Con `%s`, `scanf` legge una parola fino al primo spazio. Per stampare un valore `double` con `printf`, invece, si usa `%f`.

Per esempio, questo programma chiede un numero intero, lo salva nella variabile `numero` e poi lo stampa:

```c
#include <stdio.h>

int main() {
    int numero;

    printf("Inserisci un numero intero: ");
    scanf("%d", &numero);
    printf("Hai inserito: %d\n", numero);

    return 0;
}
```

Il simbolo `&` davanti a `numero` indica a `scanf` dove si trova la variabile, così la funzione può scrivere al suo interno il valore inserito. `%d` indica che il dato letto e stampato è un intero.

Una possibile esecuzione è:

```text
Inserisci un numero intero: 42
Hai inserito: 42
```

## Operatori in C

Gli operatori permettono di eseguire operazioni sui valori e sulle variabili. Si possono raggruppare in categorie diverse.

### Operatori aritmetici e di assegnazione

Gli operatori aritmetici comprendono `+` (addizione), `-` (sottrazione), `*` (moltiplicazione), `/` (divisione) e `%` (resto della divisione tra interi). L'operatore `=` assegna un valore a una variabile; per esempio, `x += 10` è una forma abbreviata di `x = x + 10`.

```c
int x = 5;
int y = 0;

x += 10; // x vale 15
x = x - 2; // x vale 13
y = x * 2; // y vale 26
y = y / 2; // y vale 13
```

### Operatori logici

Gli operatori logici combinano o invertono condizioni:

- `&&` (AND): il risultato è vero solo se entrambe le condizioni sono vere.
- `||` (OR): il risultato è vero se almeno una delle condizioni è vera.
- `!` (NOT): inverte il valore della condizione.

```c
#include <stdbool.h>

bool a = true;
bool b = false;

// a && b è false: non sono vere entrambe le condizioni
// a || b è true: almeno una delle condizioni è vera
// !a è false: il valore di a viene invertito
```


<a href="/esercizi/1-C/es_1.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Esercizio Finale</a>

Questi operatori sono utili, per esempio, nelle condizioni degli `if`. Gli operatori aritmetici, di assegnazione e logici esistono anche in altri linguaggi, ma alcuni dettagli possono variare.
Gli operatori logici ed aritmetici sono molto utili per determinare se vengono soddisfatte un insieme di condizioni usate nel `if-else` che adesso lo andremo a vedere.