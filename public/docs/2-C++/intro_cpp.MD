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

### Come ragionare (e come si applica)

Prima della sintassi serve il contesto: il C++ si sceglie quando contano insieme il **controllo delle risorse**, le **prestazioni** e la possibilità di **astrarre senza costi nascosti**. In ogni ambito il filo comune è lo stesso: sapere **chi possiede i dati**, **quanto costa** un'operazione e **quale astrazione** rende il codice comprensibile senza rallentarlo.

#### Dove si applica

- **Giochi e motori grafici**: gestiscono memoria, geometrie e frame a 60 fps; un'allocazione sbagliata nel ciclo di gioco si sente subito, quindi si ragiona sempre su chi possiede ogni risorsa e quando la libera.
- **Software desktop**: editor, CAD e browser devono restare reattivi per ore; l'astrazione (classi, RAII) tiene il codice leggibile senza rinunciare al controllo della memoria.
- **Sistemi embedded**: sensori, auto ed elettrodomestici hanno pochi KB e nessun garbage collector; ogni byte e ogni ciclo conta, e il C++ permette di decidere esattamente cosa succede.
- **Finanza e trading**: i calcoli devono essere veloci e riproducibili; la scelta dei tipi numerici e delle strutture dati cambia latenza e precisione.
- **Strumenti ad alte prestazioni**: simulatori, database, elaborazione di immagini e audio; il costo di una copia o di un ciclo `for` mal fatto si moltiplica per milioni di elementi.

#### La logica in sei passi

1. **Leggi il problema**: riscrivilo con parole tue e sottolinea i verbi (leggere, calcolare, stampare, salvare). Se non sai riassumerlo in una frase, non sai ancora cosa programmare.
2. **Scrivi input e output**: elenca cosa entra (tipo, quantità, intervallo) e cosa deve uscire (formato esatto, spazi e righe compresi). Questo fissa il contratto del programma.
3. **Risolvi a mano un caso piccolo**: prendi 3 elementi e fai i conti su carta. Se a mano non torna, il codice non potrà tornare.
4. **Scomponi**: dividi il lavoro in passi nominabili (leggere, accumulare, dividere, stampare). Ogni passo diventerà un blocco, un ciclo o una funzione.
5. **Scrivi la versione minima**: implementa solo il caso normale, con nomi chiari e nessuna ottimizzazione. Prima funziona, poi migliora.
6. **Prova casi limite e generalizza**: zero elementi, uno, molti, valori negativi, input non numerico. Correggi e solo alla fine estendi il programma.

#### Esempio guidato 1: media dei voti con std::vector

**Problema**: leggere `n` voti e stampare la media. **Ragionamento**: la dimensione arriva dall'input, quindi non si conosce a priori e serve `std::vector<double>`, che cresce da solo. La somma parte da `0.0`, mai da una variabile non inizializzata. La divisione avviene tra `double`: dividendo due `int` otterremmo la media troncata. Il caso `n <= 0` va gestito prima dei calcoli, perché non ha senso dividere per zero.

```cpp
#include <iostream>
#include <vector>

int main() {
    int n = 0;
    std::cout << "Quanti voti? ";
    if (!(std::cin >> n) || n <= 0) {
        std::cout << "Numero non valido\n";
        return 0;
    }
    std::vector<double> voti;
    for (int i = 0; i < n; ++i) {
        double v = 0.0;
        std::cin >> v;
        voti.push_back(v);
    }
    double somma = 0.0;
    for (double v : voti) {
        somma += v;
    }
    const double media = somma / static_cast<double>(voti.size());
    std::cout << "Media: " << media << "\n";
    return 0;
}
```

**Output atteso** con i voti 6, 7 e 8: `Media: 7`. Con `n = 0` il programma stampa `Numero non valido` e termina.

#### Esempio guidato 2: conteggio parole con std::map

**Problema**: contare quante volte compare ogni parola di un testo. **Ragionamento**: la chiave è la parola (`std::string`), il valore è il conteggio (`int`). `std::map` mantiene le chiavi ordinate, quindi l'output è già alfabetico e ripetibile; `conteggio[parola]` crea la voce a zero se non esiste, poi `++` la incrementa.

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> conteggio;
    std::string parola;
    while (std::cin >> parola) {
        ++conteggio[parola];
    }
    for (const auto& voce : conteggio) {
        std::cout << voce.first << ": " << voce.second << "\n";
    }
    std::cout << "Parole distinte: " << conteggio.size() << "\n";
    return 0;
}
```

**Output atteso** con `ciao mondo ciao`: le righe `ciao: 2`, `mondo: 1` e infine `Parole distinte: 2`. **Testo vuoto**: il `while` non esegue nemmeno un giro, la mappa resta vuota e il programma stampa solo `Parole distinte: 0`, terminando con `return 0`: non serve un caso speciale, una struttura dati vuota è già corretta.

#### Debug: ragionare su un errore

Frammento che sembra giusto ma esce dai limiti:

```cpp
std::vector<int> v{3, 5, 7};
for (std::size_t i = 0; i <= v.size(); ++i) {
    std::cout << v[i] << "\n";
}
```

`v.size()` vale 3, ma gli indici validi sono 0, 1 e 2: con `<=` l'ultimo giro legge `v[3]`, che non esiste. `operator[]` non controlla nulla, quindi il comportamento è indefinito: il programma può stampare un numero casuale o bloccarsi.

Come individuarlo:

1. **Restringi il caso**: sostituisci l'input con `{3, 5, 7}` e nota che l'errore arriva sempre dopo tre valori stampati.
2. **Stampa i valori**: aggiungi `std::cout << "i=" << i << " size=" << v.size() << "\n";` dentro il ciclo e vedrai comparire `i=3 size=3`.
3. **Attiva gli avvisi**: compila con `g++ -std=c++17 -Wall -Wextra`; molti problemi di inizializzazione emergono qui (ad esempio `int somma;` letta prima di essere assegnata). Per i limiti dei contenitori aggiungi `-D_GLIBCXX_ASSERTIONS` oppure usa `v.at(i)`, che lancia un'eccezione invece di leggere memoria estranea.

**Correzione**: basta cambiare `<=` in `<`, cioè `for (std::size_t i = 0; i < v.size(); ++i)`. Se vuoi una rete di sicurezza, `v.at(i)` controlla il limite e lancia `std::out_of_range` invece di leggere memoria estranea.

#### Obiettivo -> Come ragionare -> Strumento C++

| Obiettivo | Come ragionare | Strumento C++ |
| --- | --- | --- |
| Raccogliere una quantità variabile di dati | La dimensione arriva dall'input: serve una sequenza che cresca | `std::vector<T>` |
| Gestire testo e parole | I caratteri sono dati, non numeri, e la lunghezza cambia | `std::string` |
| Collegare una chiave a un valore | Serve ricerca immediata e output stabile | `std::map<Chiave, Valore>` |
| Evitare copie costose | Passa l'oggetto, non la sua copia | `const T&` (riferimento) |
| Garantire la liberazione delle risorse | Chi crea possiede e libera quando esce dallo scope | RAII, `std::unique_ptr`, `std::shared_ptr` |

#### Esercizi di ragionamento

Per ogni esercizio scrivi **input, output, passi e casi limite** prima di aprire l'editor: il codice viene dopo.

**1. Conta i pari (facile)**
Input/output: una sequenza di interi terminata da `0` (che non va contato); deve uscire una riga `Pari: K`.
Passi: leggi un intero, fermati se è zero, controlla il resto per 2, incrementa un contatore.
Casi limite e verifica: sequenza vuota (solo `0`) deve dare `Pari: 0`; un solo valore; numeri negativi pari; con `2 3 4 0` l'output deve essere `Pari: 2`.

**2. Minimo e massimo senza ordinare**
Input/output: un intero `n` (tra 1 e 1000) e poi `n` interi; devono uscire `Minimo: X` e `Massimo: Y`, uno per riga.
Passi: usa il primo valore come riferimento e aggiorna solo se il nuovo è più piccolo o più grande.
Casi limite e verifica: `n = 1` (minimo e massimo coincidono); tutti i valori uguali; valori negativi; con `4` e `5 -2 9 -2` deve uscire `Minimo: -2` e `Massimo: 9`.

**3. Parola più frequente (media)**
Input/output: una riga di parole separate da spazi; deve uscire `Parola: W (N)` con la parola più frequente e il suo conteggio.
Passi: conta con `std::map`, poi scorri le voci cercando il massimo; a parità vince la prima in ordine alfabetico.
Casi limite e verifica: una sola parola; tutte con lo stesso conteggio; testo vuoto, che deve produrre `Nessuna parola`; con `pane latte pane` deve uscire `Parola: pane (2)`.

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
