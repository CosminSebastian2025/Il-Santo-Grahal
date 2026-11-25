COBOL è uno dei linguaggi più longevi ancora in produzione: nato nel 1959 per elaborare dati commerciali, gestisce oggi banche, assicurazioni e sistemi pubblici. La sua forma è diversa da qualsiasi linguaggio moderno: le strutture di dati si descrivono per campi contigui con scala fissa, le istruzioni sono verbi e frasi autoconclusive, e ogni riga del programma tradizionale ha un formato posizionale ben preciso. In questa lezione impari la struttura in divisioni, la sintassi di base e il modello di memoria, usando GnuCOBOL come compilatore libero per provare tutto quello che leggi.

## Obiettivi

- Riconoscere le quattro divisioni di un programma COBOL e il ruolo di ciascuna.
- Dichiarare dati con `PIC`, segno e decimali impliciti (`COMP-3`).
- Distinguere formato fisso (`-fixed`) e libero (`-free`) e usare le colonne correttamente.
- Scrivere istruzioni di controllo con `EVALUATE`, `PERFORM` e `EVALUATE TRUE`.
- Compilare ed eseguire con `cobc`, capendo il significato dei flag principali.

## Le divisioni del programma

Un programma COBOL è diviso in divisioni, ciascuna con una funzione precisa: `IDENTIFICATION` (metadati), `ENVIRONMENT` (configurazione del compilatore e dei file), `DATA` (memoria, cioè lo working-storage) e `PROCEDURE` (il codice). Non esiste una dichiarazione di tipo separata dall'uso: la dichiarazione crea spazio e il codice opera su quel nome.

```cobol
>>SOURCE FORMAT FREE
IDENTIFICATION DIVISION.
PROGRAM-ID. saluto.
DATA DIVISION.
WORKING-STORAGE SECTION.
01 WS-NOME       PIC X(20).
01 WS-CONTATORE  PIC 9(2) VALUE ZERO.
PROCEDURE DIVISION.
    MOVE "GRAHAL" TO WS-NOME
    PERFORM VARYING WS-CONTATORE FROM 1 BY 1
            UNTIL WS-CONTATORE > 3
        DISPLAY WS-NOME " #" WS-CONTATORE
    END-PERFORM
    STOP RUN.
```

Nessuna riga finisce con un `;`: la frase termina col punto, che separa le frasi logiche, non le righe. `STOP RUN` chiude il programma e restituisce il controllo al runtime. `DISPLAY` scrive su stdout, `ACCEPT` legge da stdin.

| Divisione | Contenuto | Note |
| --- | --- | --- |
| `IDENTIFICATION` | `PROGRAM-ID`, autore | obbligatoria |
| `ENVIRONMENT` | `CONFIGURATION`, `INPUT-OUTPUT` | file e dispositivi |
| `DATA` | `WORKING-STORAGE`, `FILE` | memoria statica |
| `PROCEDURE` | paragrafi e istruzioni | solo qui si esegue |

## Dati, PIC e formato fisso o libero

La clausola `PIC` descrive la rappresentazione in caratteri: `X(20)` è testo di venti caratteri, `9(5)V99` è un numero di cinque cifre intere e due decimali con il punto decimale implicito (non occupa spazio). Un segno esplicito si dichiara con `S` e `SIGN TRAILING`, mentre `COMP-3` indica l'archiviazione packed-decimal in cui ogni coppia di cifre occupa un mezzo byte.

```cobol
       01 WS-CONTO.
          05 WS-SALDO     PIC S9(7)V99 COMP-3 VALUE 1250.75.
          05 WS-NOME      PIC X(30).
          05 WS-CODICE    PIC X(4).
```

Il formato tradizionale è fisso: le colonne 1–6 contengono sequenze, la 7 un indicatore (`*` per i commenti), l'area 8–11 l'area A e la 12–72 l'area B. I paragrafi e i livelli `01` devono iniziare in area A. GnuCOBOL accetta anche il formato libero, con `>>SOURCE FORMAT FREE` come prima riga, in cui le colonne contano solo per ordine e i commenti si scrivono con `*>`. Gli esempi di questa lezione usano la direttiva perché un blocco di codice in una pagina web non conserva le colonne iniziali, che il compilatore invece controlla byte per byte.

```cobol
>>SOURCE FORMAT FREE
IDENTIFICATION DIVISION.
PROGRAM-ID. calcolo.
DATA DIVISION.
WORKING-STORAGE SECTION.
01 WS-QUANTITA PIC 9(3) VALUE 12.
01 WS-PREZZO   PIC 9(3)V99 VALUE 4.50.
01 WS-TOTALE   PIC 9(8)V99.
PROCEDURE DIVISION.
    COMPUTE WS-TOTALE = WS-QUANTITA * WS-PREZZO
    DISPLAY "totale: " WS-TOTALE
    STOP RUN.
```

## Istruzioni di controllo e aritmetica

COBOL è verboso per scelta: `EVALUATE` copre sia lo switch che il pattern matching su condizioni multiple, `PERFORM` è la forma strutturata delle chiamate interne, e `ADD`/`SUBTRACT`/`COMPUTE` sono equivalenti ma con regole di arrotondamento diverse.

```cobol
>>SOURCE FORMAT FREE
IDENTIFICATION DIVISION.
PROGRAM-ID. scelta.
DATA DIVISION.
WORKING-STORAGE SECTION.
01 WS-TIPO PIC X VALUE "B".
PROCEDURE DIVISION.
    EVALUATE TRUE
        WHEN WS-TIPO = "A"
            DISPLAY "contante"
        WHEN WS-TIPO = "B" OR WS-TIPO = "C"
            DISPLAY "elettronico"
        WHEN OTHER
            DISPLAY "sconosciuto"
    END-EVALUATE
    STOP RUN.
```

`PERFORM paragrafo` esegue uno o più paragrafi come subroutine senza argomenti espliciti: i dati si scambiano tramite working-storage, una scelta che rende il codice globalmente leggibile ma difficile da testare in isolamento. `EVALUATE` non "cade" nel ramo successivo: ogni ramo è esclusivo, e `WHEN OTHER` è opzionale ma fortemente raccomandato.

## Compilare con GnuCOBOL

`cobc` compila in C e linka con una libreria di runtime. Il flag `-x` produce un eseguibile autonomo, `-free` attiva il formato libero, `-fixed` lo disattiva esplicitamente. Su Windows e Linux il comando è identico, e per i programmi complessi `cobc` accetta più file e direttive `-C`.

```bash
cobc -x -free saluto.cob -o saluto     # eseguibile in formato libero
./saluto
cobc -x -fixed calcolo.cob -o calcolo  # formato tradizionale
cobc --version                          # versione e supporto
```

| Flag | Effetto | Quando usarlo |
| --- | --- | --- |
| `-x` | crea un eseguibile | programmi con `PROCEDURE` principale |
| `-m` | crea un modulo | subroutine chiamabili |
| `-free` | formato libero | codice nuovo, Git-friendly |
| `-fixed` | formato fisso | codice legacy, disallineamenti |
| `-Wall` | avvisi di compilazione | sviluppo |

Senza `-x` o `-m`, `cobc` compila un modulo condiviso che il runtime carica a chiamata. Il formato fisso è la causa numero uno di errori di compilazione per chi arriva da altri linguaggi: una tabulazione che sposta l'`*` in colonna 8 diventa contemporaneamente indicatore di commento e nasconde la riga successiva.

## Errori comuni

- **Mandare in area A una riga di istruzione**: le istruzioni nel `PROCEDURE DIVISION` devono stare in area B, quindi la colonna 12 deve essere libera.
- **Usare il punto decimale dentro `PIC`**: `9(5).99` non è valido, la forma corretta è `9(5)V99`, con `V` implicito che non occupa posizione.
- **Dimenticare il punto finale della frase**: `PERFORM ... END-PERFORM` senza punto può fondersi con l'istruzione successiva e produrre scope diversi da quelli attesi.
- **Dichiarare `PIC S9(7)V99` senza `COMP-3` per importi grandi**: la rappresentazione in caratteri occupa spazio e gli spostamenti sono più lenti; per importi è la packed-decimal lo standard.
- **Leggere la documentazione senza distinguere fisso e libero**: gli esempi IBM con colonne non si compilano con `-free`, e viceversa.

## In sintesi

COBOL separa in modo rigido metadati, memoria e codice in quattro divisioni, e descrive i dati con `PIC` invece di tipi generici: la rappresentazione è dichiarata, non nascosta. Il formato fisso spiega gran parte della sintassi storica, ma il formato libero rende il codice nuovo leggibile e diffabile. `EVALUATE`, `PERFORM` e `COMPUTE` bastano per programmi lineari enormi, e il costo di questa semplicità è lo scambio di dati tramite working-storage globale. GnuCOBOL permette di sperimentare tutto questo gratuitamente, con flag che rendono esplicito il formato attivo.

## Fonti

- [GnuCOBOL Programmer's Guide](https://gnucobol.sourceforge.io/HTML/gnucobpg.html), guida ufficiale su sintassi, divisioni e clausole del compilatore libero.
- [GnuCOBOL Documentation](https://gnucobol.sourceforge.io/doc/gnucobol.html), manuale di riferimento con opzioni del compilatore e runtime.
- [GnuCOBOL FAQ](https://gnucobol.sourceforge.io/faq/index.html), domande frequenti su installazione, formato e compatibilità.
- [IBM Enterprise COBOL for z/OS - Fixed and Free Format](https://www.ibm.com/docs/en/cobol-zos/6.4.0?topic=programs-fixed-form-free-form-format), specifica ufficiale delle aree e delle colonne.
- [IBM COBOL for z/OS](https://www.ibm.com/docs/en/cobol-zos), raccolta della documentazione IBM sul linguaggio.
