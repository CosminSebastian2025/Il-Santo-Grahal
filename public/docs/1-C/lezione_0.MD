# Lezione 0: Compilatore e Hello World

Prima di scrivere codice serve un **compilatore**: il programma che legge il nostro file `.c` e lo trasforma in un eseguibile che il computer può avviare.

### Che cos'è un compilatore?

Il codice C che scriviamo è testo leggibile da una persona. Il computer, però, esegue istruzioni in codice macchina. Il compilatore fa da ponte:

```text
hello_world.c  →  compilatore (gcc)  →  hello_world.exe
```

Senza questo passaggio il file `.c` non può essere eseguito.

### Installare il compilatore

**Windows**

La strada più semplice è installare **MSYS2** da `msys2.org` e poi il compilatore GCC. In alternativa potete usare **Visual Studio Code** come editor, ma ricordate che VS Code da solo non compila: serve comunque GCC installato sul computer (per esempio tramite MSYS2).

**macOS**

Aprite il Terminale e installate gli strumenti da riga di comando:

```bash
xcode-select --install
```

**Linux (Ubuntu/Debian)**

```bash
sudo apt install build-essential
```

**Senza installare nulla**

Potete iniziare subito con un compilatore online come **OnlineGDB** (`onlinegdb.com`): scrivete il codice, premete **Run** e vedete il risultato nel terminale.

In tutti i casi, per controllare che GCC sia installato, aprite il terminale e scrivete:

```bash
gcc --version
```

Se compare un numero di versione, siete pronti.

### Il primo programma

Create un file chiamato `hello_world.c`. L'estensione `.c` è importante: dice al compilatore che contiene codice C.

```c
#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}
```

Vediamo cosa fa ogni parte:

- `#include <stdio.h>` include la libreria standard di input/output, che contiene `printf`.
- `int main()` è la funzione principale: l'esecuzione del programma parte sempre da qui.
- `printf("Hello, World!\n");` stampa il testo nel terminale. Il simbolo `\n` va a capo.
- `return 0;` comunica che il programma è terminato senza errori.
- Ogni istruzione termina con un punto e virgola `;`.

### Compilare ed eseguire

**Windows (Prompt dei comandi o PowerShell)**

```powershell
gcc hello_world.c -o hello_world.exe
.\hello_world.exe
```

**Linux e macOS**

```bash
gcc hello_world.c -o hello_world
./hello_world
```

Il comando `-o` serve a scegliere il nome del file eseguibile. Se non lo indicate, GCC crea un file chiamato `a` (su Linux/macOS) oppure `a.exe` (su Windows).

L'output sarà:

```text
Hello, World!
```

Se usate OnlineGDB o un ambiente come CLion, basta premere **Run**: sarà l'ambiente a compilare e avviare il programma.

### Le librerie e la direttiva `#include`

Le librerie sono raccolte di funzioni già scritte che possiamo riutilizzare. In C si includono con `#include` prima di usarle. Le più comuni all'inizio sono:

| Libreria | A cosa serve | Funzioni utili |
| --- | --- | --- |
| `stdio.h` | Input e output | `printf`, `scanf`, `fopen` |
| `stdlib.h` | Utility generali e memoria | `malloc`, `free`, `exit` |
| `string.h` | Operazioni sulle stringhe | `strlen`, `strcpy`, `strcmp` |
| `math.h` | Funzioni matematiche | `sqrt`, `pow`, `sin` |
| `stdbool.h` | Valori booleani | `bool`, `true`, `false` |
| `limits.h` | Limiti dei tipi interi | `INT_MAX`, `INT_MIN` |
| `time.h` | Data e ora | `time` |

Ogni libreria copre un'area specifica: si include solo quella che serve. Se usate una funzione senza aver incluso la sua libreria, il compilatore vi segnala un errore o un avviso.

### Errori comuni dei primi giorni

- Dimenticare il punto e virgola `;` alla fine di un'istruzione.
- Dimenticare `#include <stdio.h>` e poi usare `printf`.
- Salvare il file come `.txt` invece che `.c`.
- Lasciare una parentesi o una virgoletta aperta.
- Scrivere `Printf` con la maiuscola: in C i nomi distinguono maiuscole e minuscole.

### Esercizi

**Esercizio 1.** Stampate il vostro nome sulla prima riga e la vostra età sulla seconda.

Output atteso (con i vostri dati):

```text
Nome: Anna
Eta: 17
```

**Esercizio 2.** Stampate questa cornice usando `printf`, una riga alla volta:

```text
+--------+
|  Ciao  |
+--------+
```

**Esercizio 3.** Questo programma contiene tre errori. Copiatelo, trovateli e fatelo funzionare:

```c
int main() {
    printf("Ciao mondo\n);
    retur 0;
}
```

Suggerimento: controllate la libreria inclusa, la virgoletta di chiusura e la parola `return`.

**Esercizio 4.** Modificate `hello_world.c` in modo che stampi tre righe: il vostro nome, il nome del corso e `Hello, World!`.
