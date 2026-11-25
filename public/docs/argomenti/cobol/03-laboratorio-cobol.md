In questo laboratorio costruisci `conta-articoli`, un programma batch COBOL che legge un file con un articolo per riga, calcola il totale arrotondato a due decimali e stampa un riepilogo. Il programma usa il formato libero, si compila con GnuCOBOL e viene verificato da uno script che confronta l'output atteso. L'obiettivo è un programma di cui si possa dimostrare il comportamento su file mancante e righe malformate. Tutti gli esempi usano la direttiva `>>SOURCE FORMAT FREE`, perché un blocco di codice Markdown non conserva le colonne iniziali che il formato fisso richiede.

## Obiettivi

- Definire il formato del file di input e rifiutare le righe non valide.
- Leggere un file sequenziale gestendo `FILE STATUS` e fine file.
- Calcolare totali con decimali impliciti e arrotondamento esplicito.
- Usare un paragrafo riutilizzabile e un copybook per la struttura.
- Verificare l'output con uno script e un file atteso.

## Contratto di `conta-articoli`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| input | `data/articoli.dat`, una riga per articolo | file di testo confrontabile |
| formato riga | codice 6, quantità 4, prezzo 8 (due decimali) | colonne fisse, nessun separatore |
| output | riga per articolo valido, poi riepilogo | leggibile e diffabile |
| errore riga | contatore `SCARTATI`, nessuna interruzione | il batch non si ferma |
| file assente | messaggio su stderr, uscita non zero | il job deve fallire |

La riga è a colonne fisse, il modello reale dei file COBOL: niente virgole, niente intestazione. Una riga più corta di 18 caratteri è malformata e va scartata senza fermare il job. Il prezzo è in centesimi impliciti (`000450` vale 4,50).

## Copybook e totale

Il copybook dichiara la struttura del record nel `WORKING-STORAGE`. I campi numerici sono in `COMP-3`, lo standard per gli importi: conserva esattamente le cifre dichiarate.

```cobol
*> copybooks/articolo.cpy - un record del file
01 AR-ARTICOLO.
   05 AR-CODICE     PIC X(6).
   05 AR-QUANTITA   PIC 9(4).
   05 AR-PREZZO     PIC 9(8).
01 WS-RIGA          PIC X(80).
01 WS-LETTI         PIC 9(6) COMP-3 VALUE ZERO.
01 WS-SCARTATI      PIC 9(6) COMP-3 VALUE ZERO.
01 WS-TOTALE        PIC S9(11)V99 COMP-3 VALUE ZERO.
01 WS-IMPORTO       PIC S9(11)V99 COMP-3 VALUE ZERO.
```

Il paragrafo `VALIDA-E-SOMMA` verifica le cifre, sposta la riga nei campi del copybook e somma, così il calcolo resta separato dal ciclo `READ` e testabile.

```cobol
>>SOURCE FORMAT FREE
IDENTIFICATION DIVISION.
PROGRAM-ID. conta-articoli.
ENVIRONMENT DIVISION.
INPUT-OUTPUT SECTION.
FILE-CONTROL.
    SELECT F-ARTICOLI ASSIGN TO "data/articoli.dat"
        ORGANIZATION IS LINE SEQUENTIAL
        FILE STATUS IS WS-STATO.
DATA DIVISION.
FILE SECTION.
FD F-ARTICOLI.
01 F-RIGA PIC X(80).
WORKING-STORAGE SECTION.
    COPY "articolo.cpy".
    01 WS-STATO PIC 99 VALUE ZERO.
    01 WS-FINE  PIC X  VALUE "N".
PROCEDURE DIVISION.
    OPEN INPUT F-ARTICOLI
    IF WS-STATO NOT = "00"
        DISPLAY "errore apertura: " WS-STATO UPON STDERR
        STOP RUN WITH ERROR
    END-IF
    PERFORM UNTIL WS-FINE = "S"
        READ F-ARTICOLI
            AT END   MOVE "S" TO WS-FINE
            NOT AT END
                ADD 1 TO WS-LETTI
                PERFORM VALIDA-E-SOMMA
        END-READ
    END-PERFORM
    CLOSE F-ARTICOLI
    DISPLAY "letti: " WS-LETTI " scartati: " WS-SCARTATI
    DISPLAY "totale: " WS-TOTALE
    STOP RUN.

VALIDA-E-SOMMA.
    IF F-RIGA(1:18) IS NOT NUMERIC
        ADD 1 TO WS-SCARTATI
        EXIT PARAGRAPH
    END-IF
    MOVE F-RIGA(1:6)  TO AR-CODICE
    MOVE F-RIGA(7:4)  TO AR-QUANTITA
    MOVE F-RIGA(11:8) TO AR-PREZZO
    COMPUTE WS-IMPORTO ROUNDED =
        AR-QUANTITA * AR-PREZZO / 100
    ADD WS-IMPORTO TO WS-TOTALE
    DISPLAY AR-CODICE " " WS-IMPORTO.
```

`ROUNDED` applica l'arrotondamento commerciale al risultato, senza la clausola i decimali in eccesso vengono troncati. `F-RIGA(1:6)` è una referenza modificata, più leggibile di uno spostamento manuale; `IS NUMERIC` su una slice è vero solo se tutti i caratteri sono cifre.

## Test e uscita

Il test compara l'output con un file atteso e verifica i casi di errore. `diff` intercetta ogni cambio di spaziatura, `set -e` trasforma un crash in fallimento.

```bash
set -eu
cobc -x -free -I copybooks src/conta_articoli.cob -o build/conta_articoli

build/conta_articoli > build/uscita.txt
diff -u tests/atteso.txt build/uscita.txt      # fallisce su ogni differenza

printf 'ART0010002000450\nART\n' > data/articoli.dat
build/conta_articoli | grep -q 'scartati: 1'    # la riga corta viene scartata

mv data/articoli.dat data/articoli.bak
if build/conta_articoli 2>/dev/null; then echo "atteso fallimento"; exit 1; fi
mv data/articoli.bak data/articoli.dat
echo "test completati"
```

Il file assente deve uscire con un codice diverso da zero, perché `STOP RUN WITH ERROR` genera un'uscita di errore. La riga troncata incrementa `WS-SCARTATI` senza toccare il totale.

## Esercizi

1. Estendi il riepilogo con un conteggio per codice usando una tabella interna (`OCCURS`).
2. Sostituisci `LINE SEQUENTIAL` con `SEQUENTIAL` e una `RECORD` a lunghezza fissa: cosa cambia nel file di test?
3. Rifiuta le quantità zero registrando il motivo dello scarto.
4. Scrivi in un file di prova una riga di sintesi per codice con il totale parziale.
5. Crea un programma di test che chiama `VALIDA-E-SOMMA` via `CALL` con dati preparati nel working-storage.
6. Leggi il percorso del file con `ACCEPT FROM COMMAND-LINE` e verifica il caso di percorso mancante.

<details>
<summary>Soluzione</summary>

1. `01 WS-TABELLA OCCURS 100 TIMES INDEXED BY I.` con `05 WS-TCODICE PIC X(6).` e `05 WS-TTOTALE PIC S9(11)V99 COMP-3.`. Per ogni articolo si cerca il codice con `SEARCH` e si esegue `ADD`.

2. `SEQUENTIAL` legge record di lunghezza pari alla `RECORD`: il file di test deve avere righe riempite di spazi fino alla lunghezza esatta, altrimenti l'ultimo record arriva con `FILE STATUS 04`.

3. Prima del calcolo si aggiunge `IF AR-QUANTITA = 0 THEN ADD 1 TO WS-SCARTATI MOVE "Q0" TO WS-MOTIVO EXIT PARAGRAPH END-IF`.

4. Si dichiara un `SELECT F-SINTESI` aperto in `OUTPUT`, si scrive con `MOVE ... TO F-RIGA` e `WRITE`, poi `CLOSE` finalizza il file.

5. Il programma di test dichiara le stesse `PIC` del chiamato, esegue `CALL "conta-articoli" USING WS-RIGA` e confronta il totale restituito.

6. `ACCEPT WS-PERCORSO FROM COMMAND-LINE` riceve gli argomenti e `ASSIGN DYNAMIC WS-PERCORSO` sceglie il file; un percorso vuoto produce `FILE STATUS 35`.

</details>

## Errori comuni

- **Calcolare il totale senza dividere per 100**: con il prezzo in `PIC 9(8)` l'importo risulta cento volte più grande.
- **Dimenticare `ROUNDED` in `COMPUTE`**: i decimali in eccesso vengono troncati e i totali divergono di centesimi dopo molte righe.
- **Leggere oltre la lunghezza reale della riga**: `F-RIGA(1:18)` su una riga da 3 caratteri riempie di spazi, e il campo risulta non numerico per il troncamento, non per il contenuto.
- **Continuare dopo `OPEN` fallita**: con `WS-STATO` diverso da `00` un `READ` produce errori a catena e l'output è un riepilogo senza dati.
- **Confrontare solo il codice di uscita nel test**: il programma può uscire con 0 e stampare un totale sbagliato; serve anche `diff`.

## In sintesi

Il laboratorio mostra il ciclo completo di un programma batch: input dichiarato, lettura con stato, calcolo in packed-decimal, output confrontabile e test che coprono successo ed errori. Il copybook isola la struttura dei dati e il paragrafo separa la validazione dal ciclo.

## Fonti

- [GnuCOBOL Programmer's Guide](https://gnucobol.sourceforge.io/HTML/gnucobpg.html), sezioni su `FILE-CONTROL`, `READ`, `COMPUTE` e `COPY`.
- [GnuCOBOL Programmer's Guide (PDF)](https://gnucobol.sourceforge.io/guides/grammar.pdf), diagrammi sintattici e clausole complete.
- [GnuCOBOL FAQ](https://gnucobol.sourceforge.io/faq/index.html), risposte pratiche su file sequenziali e stati di errore.
- [IBM Enterprise COBOL for z/OS - Fixed and Free Format](https://www.ibm.com/docs/en/cobol-zos/6.4.0?topic=programs-fixed-form-free-form-format), regole di formattazione da usare durante la migrazione.
- [IBM COBOL for z/OS](https://www.ibm.com/docs/en/cobol-zos), documentazione di riferimento sul linguaggio Enterprise COBOL.
