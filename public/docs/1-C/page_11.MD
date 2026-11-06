# File

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

- capire come si apre e si chiude un file in C
- usare `fprintf` e `fscanf` per leggere e scrivere dati
- lavorare con file di testo in modo semplice
- distinguere tra lettura, scrittura e append

### Che cos'è un file?

Un file è un contenitore di dati salvato su disco. In C, i file servono per leggere informazioni da un documento esterno o per scrivere dati che devono essere conservati.

### Apertura di un file

Per lavorare con i file si usa `fopen()`.

```c
FILE *file;
file = fopen("dati.txt", "w");
```

### Modalità di apertura

- `"r"` → lettura
- `"w"` → scrittura (crea o sovrascrive)
- `"a"` → append (aggiunge in fondo)
- `"r+"` → lettura e scrittura

### Scrivere su un file

```c
#include <stdio.h>

int main() {
    FILE *file = fopen("dati.txt", "w");

    if (file == NULL) {
        printf("Errore nell'apertura del file\n");
        return 1;
    }

    fprintf(file, "Ciao mondo!\n");
    fclose(file);
    return 0;
}
```

### Leggere da un file

```c
#include <stdio.h>

int main() {
    FILE *file = fopen("dati.txt", "r");
    char testo[100];

    if (file == NULL) {
        printf("Errore nell'apertura del file\n");
        return 1;
    }

    while (fgets(testo, sizeof(testo), file) != NULL) {
        printf("%s", testo);
    }

    fclose(file);
    return 0;
}
```

### Perché usare i file?

I file servono per:

- salvare dati in modo permanente
- leggere informazioni da documenti esterni
- gestire database semplici
- salvare risultati di un programma

### Errori comuni

- non controllare il risultato di `fopen`
- dimenticare di chiudere il file con `fclose`
- usare la modalità sbagliata

### Esercizi

1. Scrivere 5 numeri in un file `.txt`.
2. Leggere un file e stamparne il contenuto a schermo.
3. Calcolare la somma dei numeri presenti in un file.
4. Copiare il contenuto di un file in un altro file.
5. Contare quante righe contiene un file.

<a href="/esercizi/1-C/es_11.txt" download class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Scarica esercizi sui file</a>

---

### Esercizio pratico finale

```c
#include <stdio.h>

int main() {
    FILE *file = fopen("numeri.txt", "w");

    if (file == NULL) {
        printf("Errore\n");
        return 1;
    }

    fprintf(file, "10\n20\n30\n");
    fclose(file);
    printf("Dati salvati nel file.\n");
    return 0;
}
```

I file permettono di conservare informazioni anche dopo la chiusura del programma.

<a href="./page_12.MD" class="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white no-underline hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">Vai alla prossima lezione</a>

<a href="./page_13.MD" class="inline-block rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white no-underline hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Vai all'indice del percorso</a>
