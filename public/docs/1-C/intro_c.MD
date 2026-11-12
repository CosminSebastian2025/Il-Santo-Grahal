# Introduzione al C

Il C è un linguaggio di programmazione compilato e di basso livello: il codice che scriviamo in un file di testo viene tradotto in istruzioni per la macchina da un programma chiamato **compilatore**. È stato creato negli anni '70 da Dennis Ritchie ai Bell Labs ed è ancora oggi la base di sistemi operativi, compilatori e programmi che richiedono prestazioni elevate.

### Perché si parte dal C?

Perché è vicino alla macchina: permette di capire come vengono gestite la memoria, le variabili e le istruzioni. I concetti che impari qui (tipi, condizioni, cicli, funzioni, puntatori, memoria) tornano in quasi tutti gli altri linguaggi di programmazione, quindi sono una base solida per chi vuole diventare un programmatore professionista.

### Come ragionare (e come si applica)

Il C non si impara partendo dalla sintassi: si impara partendo dal problema. Prima si capisce cosa deve entrare e cosa deve uscire, poi si sceglie come scriverlo. Qui vediamo dove il linguaggio si usa davvero, un metodo in sei passi, due esempi completi e un errore tipico da riconoscere.

#### Dove si applica

Il C è la scelta di chi vuole controllo diretto sulla macchina e costi prevedibili. In tutti questi casi tipi, memoria e puntatori contano perché il C non ti protegge dagli errori: il compilatore traduce quello che scrivi, anche quando è sbagliato.

- **Sistemi operativi**: il kernel di Linux è scritto in C. Contano i tipi esatti (`int`, `unsigned char`), perché si parla con l'hardware e un byte sbagliato rovina una struttura dati.
- **Firmware e microcontrollori**: il programma gira con pochi kilobyte di RAM. Sapere quanto occupa una variabile non è teoria: è il vincolo che decide se il codice ci sta.
- **Driver di dispositivi**: un driver riceve indirizzi di memoria e li interpreta. I puntatori sono lo strumento normale e un indice fuori limite può bloccare la macchina.
- **Librerie usate da altri linguaggi**: Python, PHP, Node.js e molti database hanno un cuore in C. La libreria deve reggere qualsiasi input, quindi il controllo dei limiti non è opzionale.
- **Strumenti da terminale**: compilatori, shell, utilità di sistema. Sono programmi piccoli e veloci, dove il C resta la via più diretta.

#### La logica in sei passi

1. **Leggi il problema**: riscrivilo con parole tue, finché non sai dire in una frase cosa deve fare il programma.
2. **Scrivi input e output attesi**: elenca quanti valori arrivano, di che tipo, con quali limiti, e che formato deve avere il risultato.
3. **Risolvi un esempio a mano**: usa numeri piccoli e trova il risultato senza computer, così sai quale risposta è giusta.
4. **Scomponi in passi**: trasforma il calcolo manuale in operazioni ripetibili, una per riga di codice.
5. **Scrivi la versione minima**: fai funzionare un solo caso, senza casi limite e senza abbellimenti, poi compila e verifica.
6. **Prova casi limite e generalizza**: zeri, negativi, array vuoti, dimensioni sbagliate; se il programma regge, aggiungi il resto.

#### Esempio guidato 1: media di tre voti

**Problema**: leggere tre voti interi e stampare la somma e la media con due decimali.

**Ragionamento prima del codice**: l'input sono tre `int`, quindi la somma è un `int`. La media no: in C `23 / 3` vale `7`, perché la divisione tra interi scarta i decimali. Serve un `double` e la divisione per `3.0`, non per `3`. Provo a mano con 7, 8, 8: somma 23, media 7,666..., quindi mi aspetto `7.67`.

```c
#include <stdio.h>

int main() {
    int voto1 = 7;
    int voto2 = 8;
    int voto3 = 8;
    int somma = voto1 + voto2 + voto3;
    double media = somma / 3.0;

    printf("Somma: %d\n", somma);
    printf("Media: %.2f\n", media);

    return 0;
}
```

Output atteso:

```text
Somma: 23
Media: 7.67
```

Con `somma / 3` al posto di `somma / 3.0` il programma compila lo stesso, ma stampa `Media: 7.00`. Il tipo delle variabili è parte della logica, non un dettaglio da scegliere alla fine.

#### Esempio guidato 2: somma di un array con controllo dei limiti

**Input**: cinque interi in un array e la loro dimensione. **Output**: numero di elementi e somma.

**Ragionamento**: gli indici validi di `valori[5]` vanno da `0` a `4`, quindi il ciclo si ferma a `dimensione - 1` e la condizione è `i < dimensione`. La somma parte da `0`, che è l'elemento neutro: con zero elementi il risultato è zero, non un errore. Provo a mano: 4 + 8 + 15 + 16 + 23 = 66.

```c
#include <stdio.h>

int main() {
    int valori[5] = {4, 8, 15, 16, 23};
    int dimensione = 5;
    int somma = 0;

    for (int i = 0; i < dimensione; i++) {
        somma = somma + valori[i];
    }

    printf("Elementi: %d\n", dimensione);
    printf("Somma: %d\n", somma);

    return 0;
}
```

Output atteso:

```text
Elementi: 5
Somma: 66
```

Cosa cambia negli altri casi:

- **Array vuoto** (`dimensione = 0`): il ciclo non fa nemmeno un giro, `somma` resta `0` e l'output è `Elementi: 0` / `Somma: 0`. È corretto, ma solo perché l'accumulatore parte da zero.
- **Dimensione troppo grande** (`dimensione = 6`): il ciclo legge `valori[5]`, che non esiste. Il C non controlla e prende un valore casuale: la somma diventa imprevedibile. Il rimedio è non fidarsi del numero scritto a mano: `sizeof(valori) / sizeof(valori[0])` ricava la dimensione reale e non può essere sbagliato.
- **Dimensione negativa**: il ciclo non parte, però viene stampato `-1`: manca la validazione dell'input.

#### Debug: ragionare su un errore

Questo programma dovrebbe sommare i cinque valori, ma il risultato non torna:

```c
int valori[5] = {4, 8, 15, 16, 23};
int somma = 0;
for (int i = 0; i <= 5; i++) {
    somma = somma + valori[i];
}
printf("Somma: %d\n", somma);
```

Un informatico non cambia righe a caso. Procede così:

1. **Rilegge input e output**: l'input sono 5 valori, l'output atteso è 66. Se esce un numero più grande, il programma somma qualcosa in più.
2. **Restringe il caso**: riduce l'array a 2 elementi e conta i giri del ciclo. Con `i <= 5` i giri sono 6, uno in più degli elementi.
3. **Stampa i valori intermedi**: aggiunge `printf("i = %d, valori[i] = %d\n", i, valori[i]);` nel ciclo e vede `i = 5` con un valore mai inserito.

La correzione è `i < 5`, o meglio `i < dimensione`: l'ultimo indice valido è sempre `dimensione - 1`. Lo stesso ragionamento vale per `scanf("%d", numero)` senza `&`: compila, ma scrive in un indirizzo casuale, e il difetto si vede solo leggendo il codice o osservando un crash.

#### Obiettivo -> Come ragionare -> Strumento C

| Obiettivo | Come ragionare | Strumento C |
| --- | --- | --- |
| Leggere dati | Quanti valori, di che tipo, con quali limiti? | `scanf`, controllando il valore restituito |
| Validare | Quali valori sono ammessi e cosa faccio se non lo sono? | `if`, `while` di rilettura |
| Accumulare | Qual è il valore iniziale neutro? Sommo o moltiplico? | variabile accumulatore + ciclo `for` |
| Cercare | Cosa cerco, mi fermo al primo o conto tutti? | ciclo con condizione e `break` |
| Gestire memoria | Quanta ne serve e chi la libera? | array, `malloc`, `free` |
| Stampare | Che formato serve, quante cifre decimali? | `printf` con `%d`, `%f`, `%.2f` |

#### Esercizi di ragionamento

1. **Conta i positivi**: leggi quattro interi e stampa quanti sono maggiori di zero. Prima del codice scrivi input, output, passi e casi limite. Input di prova: `3 -1 0 7`. Output atteso: `Positivi: 2`. Casi limite da elencare: tutti zero, tutti negativi, un solo valore.
2. **Massimo di tre numeri**: leggi tre interi e stampa il maggiore. Prima del codice scrivi input, output, passi e casi limite. Input di prova: `-5 -2 -9`. Output atteso: `Massimo: -2`. Casi limite: tutti uguali, tutti negativi, massimo in prima o in ultima posizione.
3. **Pari e somma**: leggi cinque interi e stampa quanti sono pari e la somma dei pari. Prima del codice scrivi input, output, passi e casi limite. Input di prova: `2 3 4 5 6`. Output atteso: `Pari: 3` e `Somma pari: 12`. Casi limite: nessun pari (attesi `0` e `0`), tutti pari, valori negativi.

### Come è organizzato il corso

Il corso è diviso in **11 lezioni**, dalla 0 alla 10. Ogni lezione spiega un argomento con esempi di codice e termina con degli **esercizi da fare**.

| Lezione | Argomento |
| --- | --- |
| Lezione 0 | Installare il compilatore e scrivere il primo "Hello World" |
| Lezione 1 | Variabili e `printf` |
| Lezione 2 | Input con `scanf` |
| Lezione 3 | Condizioni `if` |
| Lezione 4 | Cicli `while` e `for` |
| Lezione 5 | Funzioni |
| Lezione 6 | Array |
| Lezione 7 | Stringhe |
| Lezione 8 | Puntatori |
| Lezione 9 | Memoria dinamica |
| Lezione 10 | Strutture e file |

### Come usare gli esercizi

Alla fine di ogni lezione trovi 3-4 esercizi semplici. Il consiglio è di **scriverli e provarli nel compilatore**, non solo leggerli: correggere gli errori è la parte più importante dell'apprendimento. Se un esercizio sembra troppo difficile, rileggi l'esempio della lezione e modificalo un pezzo alla volta.

Non serve imparare tutto a memoria. Serve capire cosa fa ogni riga e perché è scritta in quel modo.

### Un consiglio prima di iniziare

Il compilatore segnala gli errori: leggilo con calma, indica il file, la riga e spesso anche il motivo. Un errore non significa che non sei portato per la programmazione, significa solo che il computer non ha capito un'istruzione.

Nella prossima lezione installiamo (o usiamo online) il compilatore e scriviamo il nostro primo programma.
