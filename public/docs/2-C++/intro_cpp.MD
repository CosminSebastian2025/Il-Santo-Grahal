# Introduzione al C++

Il C++ è un linguaggio di programmazione compilato, nato come evoluzione del C. Mantiene il controllo diretto sulla memoria e aggiunge strumenti di alto livello come `std::string`, `std::vector`, le classi e gli smart pointer. In questo corso useremo il **C++ moderno** (C++17), evitando le parti più pericolose del linguaggio quando non servono.

### Obiettivo del mese

In 30 giorni imparerai a scrivere piccoli programmi completi:

- input e output da terminale;
- variabili, condizioni e cicli;
- funzioni, vector e stringhe;
- struct e classi semplici;
- programmi con menu e salvataggio su file.

Alla fine del percorso avrai costruito una piccola rubrica e saprai scegliere il prossimo progetto da affrontare.

### Il metodo

- Studia **30-60 minuti al giorno**.
- Scrivi sempre il codice: leggere non basta.
- Ogni giorno fai il micro-esercizio e prova almeno una modifica personale.
- Se qualcosa non funziona, leggi l'errore del compilatore con calma: indica il file e la riga.
- Non cercare di memorizzare tutto: cerca di capire il perché di ogni riga.

### Come è organizzato il corso

| Settimana | Giorni | Argomenti |
| --- | --- | --- |
| 1 | 1-7 | Fondamenti: compilatore, variabili, input/output, operatori, condizioni, cicli |
| 2 | 8-14 | Funzioni, array e vector, stringhe, iterazione, struct, vector di struct |
| 3 | 15-21 | Classi, costruttori, incapsulamento, riferimenti, puntatori, memoria e smart pointer |
| 4 | 22-30 | Mappe, algoritmi STL, lambda, eccezioni, file, debug e progetto finale |

Ogni giorno trovi una lezione con esempi e un **micro-esercizio** da completare.

### Gli strumenti

**Compilatore online** (nessuna installazione): OnlineGDB, selezionando C++ come linguaggio. Per esperimenti rapidi va benissimo.

**Compilatore locale**: su Windows potete installare MSYS2 con MinGW-w64, su macOS `xcode-select --install`, su Linux il pacchetto `build-essential`. In tutti i casi il comando sarà `g++`.

Controllate la versione:

```bash
g++ --version
```

Per compilare un file:

```bash
g++ -std=c++17 -Wall -Wextra main.cpp -o main
```

- `-std=c++17` sceglie lo standard del linguaggio.
- `-Wall -Wextra` attivano gli avvisi: sono vostri alleati, non nemici.
- `-o main` sceglie il nome dell'eseguibile.

Su Windows l'eseguibile sarà `main.exe` e si avvia con `main.exe` o `.\main.exe`. Su Linux e macOS sarà `./main`.

### Due convenzioni del corso

1. Useremo sempre `std::` davanti agli elementi della libreria standard (`std::cout`, `std::string`, `std::vector`). La riga `using namespace std;` è comoda ma viene sconsigliata nei progetti reali, quindi è meglio non prenderne l'abitudine.
2. Ogni programma avrà un `main` che restituisce `int` e termina con `return 0;`.

### Come usare gli esercizi

Il micro-esercizio è la parte più importante della giornata: provate a scriverlo senza copiare gli esempi. Se vi bloccate, rileggete la lezione e modificate il codice un pezzo alla volta. Sbagliare e correggere è il modo più veloce per imparare.

Nella prima lezione installiamo (o scegliamo online) il compilatore e scriviamo il primo programma.
