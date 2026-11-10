# Lezione 7: Stringhe

### Una stringa è un array di caratteri

In C non esiste un tipo "stringa" separato: una stringa è un array di `char` che termina con il carattere speciale **`\0`** (carattere nullo). È questo carattere a dire alle funzioni dove finisce il testo.

```c
char nome[20] = "Anna";
```

In memoria:

```text
A  n  n  a  \0  ...
```

L'array ha 20 posti, ma solo i primi 5 sono usati. Il `\0` viene aggiunto automaticamente quando si inizializza la stringa con le virgolette doppie.

La dimensione deve essere abbastanza grande da contenere il testo **più** il carattere `\0`. Per "Anna" servono almeno 5 posti.

### Stampare una stringa

```c
char nome[20] = "Anna";

printf("Ciao %s!\n", nome);
```

`%s` stampa i caratteri fino a quando incontra `\0`. Senza `\0` la funzione continuerebbe a leggere memoria oltre l'array.

### Leggere una stringa

Con `scanf` si legge una sola parola, senza `&` e con una larghezza massima:

```c
char nome[20];

printf("Nome: ");
scanf("%19s", nome);
printf("Ciao %s!\n", nome);
```

Per leggere anche gli spazi si usa `fgets`, che legge un'intera riga:

```c
char frase[50];

printf("Scrivi una frase: ");
fgets(frase, sizeof(frase), stdin);
printf("Hai scritto: %s", frase);
```

`fgets` conserva anche il carattere di Invio finale. Se dà fastidio, si può eliminare così:

```c
int len = strlen(frase);
if (len > 0 && frase[len - 1] == '\n') {
    frase[len - 1] = '\0';
}
```

### Le funzioni di string.h

Per usare queste funzioni bisogna includere `string.h`.

| Funzione | Cosa fa | Esempio |
| --- | --- | --- |
| `strlen(s)` | Restituisce la lunghezza, senza contare `\0` | `strlen("Anna")` vale 4 |
| `strcmp(a, b)` | Confronta due stringhe: `0` se uguali | `strcmp("ciao", "ciao") == 0` |
| `strcpy(dest, src)` | Copia `src` in `dest` | `strcpy(copia, nome);` |
| `strcat(dest, src)` | Aggiunge `src` in fondo a `dest` | `strcat(saluto, nome);` |

Attenzione: `strcpy` e `strcat` non controllano lo spazio disponibile. La destinazione deve essere abbastanza grande, altrimenti si corrompe la memoria.

### Scorrere una stringa carattere per carattere

```c
#include <stdio.h>
#include <string.h>

int main() {
    char parola[30];

    printf("Inserisci una parola: ");
    scanf("%29s", parola);

    for (int i = 0; parola[i] != '\0'; i++) {
        printf("Carattere %d: %c\n", i, parola[i]);
    }

    printf("Lunghezza: %d\n", (int)strlen(parola));

    return 0;
}
```

Il ciclo si ferma quando trova `\0`.

### Esempio: contare le vocali

```c
#include <stdio.h>
#include <string.h>

int main() {
    char parola[30];
    int vocali = 0;

    printf("Inserisci una parola: ");
    scanf("%29s", parola);

    for (int i = 0; i < (int)strlen(parola); i++) {
        char c = parola[i];

        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' ||
            c == 'A' || c == 'E' || c == 'I' || c == 'O' || c == 'U') {
            vocali++;
        }
    }

    printf("Vocali: %d\n", vocali);

    return 0;
}
```

Con "programmazione" il programma conta 6 vocali.

### Confrontare due stringhe

Non si possono confrontare due stringhe con `==`: l'operatore confronta gli indirizzi, non il contenuto. Si usa `strcmp`:

```c
if (strcmp(parola1, parola2) == 0) {
    printf("Le parole sono uguali.\n");
} else {
    printf("Le parole sono diverse.\n");
}
```

`strcmp` restituisce `0` quando le stringhe sono identiche, un valore negativo se la prima viene prima in ordine alfabetico e un valore positivo se viene dopo.

### Errori comuni

- Dimenticare lo spazio per `\0`: una stringa di 4 caratteri in un array di 4 posti non è valida.
- Usare `&` con `%s` nella `scanf` di un array.
- Confrontare stringhe con `==`.
- Copiare stringhe con `=` (`dest = src;` non è valido): si usa `strcpy`.
- Leggere con `%s` senza larghezza massima e superare la dimensione del buffer.

### Esercizi

**Esercizio 1.** Leggete un nome e stampate `Ciao` seguito dal nome.

**Esercizio 2.** Leggete una parola e contate i caratteri con un ciclo, poi confrontate il risultato con `strlen`.

**Esercizio 3.** Contate le vocali di una parola, sia minuscole sia maiuscole.

**Esercizio 4.** Leggete due parole e stampate se sono uguali o diverse usando `strcmp`.

**Esercizio 5.** Leggete una frase con `fgets` e stampatela al contrario, partendo dall'ultimo carattere fino al primo.
