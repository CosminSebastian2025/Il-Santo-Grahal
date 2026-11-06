# Stringhe

<div class="not-prose">
  <aside style="position: sticky; top: 1rem; margin-bottom: 1.5rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; max-width: 260px;">
    <p style="margin: 0 0 0.75rem; font-weight: 700; color: #0f172a;">Menu del corso C</p>
    <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.35rem; font-size: 0.92rem;">
      <li><a href="./intro_c.MD">Introduzione</a></li>
      <li><a href="./page_1.MD">1. Variabili e tipi</a></li>
      <li><a href="./page_2.MD">2. Librerie</a></li>
      <li><a href="./page_3.MD">3. Input/Output</a></li>
      <li><a href="./page_4.MD">4. Operazioni e condizioni</a></li>
      <li><a href="./page_5.MD">5. Cicli</a></li>
      <li><a href="./page_6.MD">6. Funzioni</a></li>
      <li><a href="./page_7.MD">7. Array</a></li>
      <li><a href="./page_8.MD">8. Stringhe</a></li>
      <li><a href="./page_9.MD">9. Puntatori</a></li>
      <li><a href="./page_10.MD">10. Memoria dinamica</a></li>
      <li><a href="./page_11.MD">11. File</a></li>
      <li><a href="./page_12.MD">12. Progetto finale</a></li>
      <li><a href="./page_13.MD">13. Indice conclusivo</a></li>
    </ul>
  </aside>
</div>

## Obiettivi di apprendimento

- capire come una stringa viene rappresentata in C
- conoscere il significato del terminatore `\0`
- usare `scanf` e `fgets` in modo corretto
- applicare funzioni come `strlen`, `strcmp` e `strcpy`

### Che cos'è una stringa?

Una stringa in C non è un tipo primitivo come `int` o `float`, ma è un array di caratteri terminato da un carattere speciale chiamato `\0` (terminatore nullo).

```c
char nome[20] = "Marco";
```

Qui `nome` contiene i caratteri `M`, `a`, `r`, `c`, `o`, e poi il terminatore `\0`.

### Perché serve il terminatore nullo?

Il compilatore deve sapere dove finisce la stringa. Per questo motivo, in C ogni stringa termina con `\0`.

```c
char parola[] = "ciao";
```

Il programma salva in memoria: `c`, `i`, `a`, `o`, `\0`.

### Leggere una stringa

```c
#include <stdio.h>

int main() {
    char nome[30];

    printf("Inserisci il tuo nome: ");
    scanf("%s", nome);
    printf("Ciao %s!\n", nome);

    return 0;
}
```

### Attenzione

`scanf("%s", nome);` legge una sola parola, cioè fino allo spazio. Per leggere una frase intera si usa `fgets()`.

```c
char frase[100];

printf("Scrivi una frase: ");
gets(frase); // da evitare in programmi reali, meglio fgets
```

### Funzioni utili per le stringhe

Includendo `string.h`, possiamo usare funzioni come:

- `strlen` → lunghezza della stringa
- `strcpy` → copia una stringa
- `strcmp` → confronta due stringhe
- `strcat` → concatena due stringhe

Esempio:

```c
#include <stdio.h>
#include <string.h>

int main() {
    char parola[] = "Ciao";
    printf("Lunghezza: %zu\n", strlen(parola));
    return 0;
}
```

### Esempio con confronto

```c
#include <stdio.h>
#include <string.h>

int main() {
    char a[] = "casa";
    char b[] = "cane";

    if (strcmp(a, b) < 0) {
        printf("%s e' minore di %s\n", a, b);
    } else {
        printf("%s e' maggiore o uguale a %s\n", a, b);
    }

    return 0;
}
```

### Errori comuni

- dimenticare il terminatore `\0`
- scrivere una stringa più lunga della dimensione del vettore
- usare `scanf` per leggere frasi complete

### Esercizi

1. Leggere una stringa e stamparla al contrario.
2. Contare quante vocali contiene una parola.
3. Controllare se una parola è palindroma.
4. Confrontare due parole e dire quale viene prima alfabeticamente.
5. Leggere una frase e contare quante parole contiene.

<a href="/esercizi/1-C/es_8.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizi sulle stringhe</a>

---

### Esercizio pratico finale

```c
#include <stdio.h>
#include <string.h>

int main() {
    char parola[] = "radar";

    if (strcmp(parola, "radar") == 0) {
        printf("La parola e' palindroma.\n");
    } else {
        printf("La parola non e' palindroma.\n");
    }

    return 0;
}
```

Le stringhe sono fondamentali perché permettono di gestire nomi, frasi, testo e messaggi all'interno del programma.

<a href="./page_9.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
