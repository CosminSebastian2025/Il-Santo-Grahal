# Lezione 10: Strutture e file

### Che cos'è una struttura

Una `struct` raggruppa più variabili, anche di tipo diverso, sotto un unico nome. È utile per rappresentare un oggetto del mondo reale, per esempio una persona con nome ed età.

```c
struct Persona {
    char nome[30];
    int eta;
};
```

La dichiarazione crea un nuovo tipo. Per usarlo bisogna creare una variabile:

```c
struct Persona p = {"Anna", 17};
```

I valori si assegnano nell'ordine dei campi, oppure si accede uno alla volta con il punto `.`:

```c
p.eta = 18;
printf("%s ha %d anni\n", p.nome, p.eta);
```

### typedef: un nome più comodo

Con `typedef` possiamo evitare di scrivere `struct` ogni volta:

```c
typedef struct {
    char nome[30];
    int eta;
} Persona;
```

Ora il tipo si chiama semplicemente `Persona`:

```c
Persona p = {"Anna", 17};
```

### Array di strutture

```c
#include <stdio.h>

typedef struct {
    char nome[30];
    int eta;
} Persona;

int main() {
    Persona classe[3] = {
        {"Anna", 17},
        {"Luca", 18},
        {"Sara", 16}
    };

    for (int i = 0; i < 3; i++) {
        printf("%s ha %d anni\n", classe[i].nome, classe[i].eta);
    }

    return 0;
}
```

Output:

```text
Anna ha 17 anni
Luca ha 18 anni
Sara ha 16 anni
```

### Scrivere su un file

Per lavorare con i file si usa il tipo `FILE *` e le funzioni di `stdio.h`.

| Modalità | Significato |
| --- | --- |
| `"w"` | Scrive un file nuovo; se esiste, lo svuota |
| `"a"` | Aggiunge in fondo a un file esistente |
| `"r"` | Legge un file esistente |

Esempio di scrittura:

```c
#include <stdio.h>

int main() {
    FILE *file = fopen("dati.txt", "w");

    if (file == NULL) {
        printf("Impossibile aprire il file.\n");
        return 1;
    }

    fprintf(file, "Anna 17\n");
    fprintf(file, "Luca 18\n");

    fclose(file);

    return 0;
}
```

`fopen` restituisce `NULL` se non riesce ad aprire il file. `fprintf` funziona come `printf`, ma scrive sul file. `fclose` chiude il file e salva il contenuto: va sempre chiamata.

Il file `dati.txt` viene creato nella cartella da cui si esegue il programma.

### Leggere da un file

```c
#include <stdio.h>

int main() {
    char nome[30];
    int eta;

    FILE *file = fopen("dati.txt", "r");

    if (file == NULL) {
        printf("File non trovato.\n");
        return 1;
    }

    while (fscanf(file, "%29s %d", nome, &eta) == 2) {
        printf("%s ha %d anni\n", nome, eta);
    }

    fclose(file);

    return 0;
}
```

- `fscanf` restituisce il numero di valori letti: la condizione `== 2` continua finché legge sia il nome sia l'età.
- `%29s` limita la lettura per non superare i 30 posti di `nome`.
- `fclose` chiude il file anche dopo una lettura.

### Esempio completo: salvare e rileggere le persone

```c
#include <stdio.h>

typedef struct {
    char nome[30];
    int eta;
} Persona;

int main() {
    Persona persone[3] = {
        {"Anna", 17},
        {"Luca", 18},
        {"Sara", 16}
    };

    FILE *file = fopen("persone.txt", "w");
    if (file == NULL) {
        printf("Errore di apertura.\n");
        return 1;
    }

    for (int i = 0; i < 3; i++) {
        fprintf(file, "%s %d\n", persone[i].nome, persone[i].eta);
    }
    fclose(file);

    file = fopen("persone.txt", "r");
    if (file == NULL) {
        printf("Errore di apertura.\n");
        return 1;
    }

    Persona letta;
    while (fscanf(file, "%29s %d", letta.nome, &letta.eta) == 2) {
        printf("%s ha %d anni\n", letta.nome, letta.eta);
    }
    fclose(file);

    return 0;
}
```

Il programma scrive le tre persone, chiude il file, lo riapre in lettura e stampa i dati. Questo è il ciclo tipico di ogni programma che salva informazioni su disco.

### Errori comuni

- Dimenticare `fclose`: il file può restare incompleto.
- Non controllare se `fopen` ha restituito `NULL`.
- Aprire in lettura un file che non esiste.
- Usare `"w"` su un file che si voleva conservare: il contenuto viene cancellato.
- Dimenticare `&` davanti ai campi numerici nella `fscanf`.
- Superare la dimensione degli array di `char` durante la lettura.

### Esercizi

**Esercizio 1.** Create una `struct Persona` con nome ed età, inizializzate una variabile e stampatene i campi.

**Esercizio 2.** Create un array di 3 `Persona` e stampate tutti i dati in una tabella con nome ed età.

**Esercizio 3.** Scrivete i numeri da 1 a 5 su un file `numeri.txt` con `fprintf`, poi riapritelo in lettura e calcolate la somma.

**Esercizio 4.** Salvate nome ed età di tre persone su un file, rileggetelo con `fscanf` e stampate i dati. Verificate che il contenuto del file sia corretto.

**Esercizio 5.** Aggiungete una nuova persona al file dell'esercizio 4 usando la modalità `"a"` e rileggete tutto il contenuto.

---

### Riepilogo del corso

Avete completato il percorso di base del C: compilazione, variabili, input/output, condizioni, cicli, funzioni, array, stringhe, puntatori, memoria dinamica, strutture e file.

I prossimi passi naturali sono:

- esercitarsi con piccoli programmi completi (rubrica, calcolatrice, gestione voti);
- imparare a dividere il codice in più file e a usare le librerie;
- approfondire l'allocazione dinamica con strutture collegate come liste e alberi;
- studiare il debugging e i test automatici.

La pratica vale più della teoria: scegliete un piccolo progetto e provate a realizzarlo una funzione alla volta.
