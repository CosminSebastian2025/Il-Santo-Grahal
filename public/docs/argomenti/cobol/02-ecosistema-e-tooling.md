Un programma COBOL in produzione non è un file isolato: legge file sequenziali, chiama sottoprogrammi, gira dentro un job di batch e, nei sistemi attuali, espone servizi utili anche da un'applicazione web. L'ecosistema attorno al codice è fatto di compilatore, runtime, formati di file e strumenti di verifica. GnuCOBOL porta gran parte di queste funzioni su Linux, Windows e macOS gratuitamente, mentre le specifiche storiche restano documentate da IBM.

In questa lezione vedi come organizzare un progetto COBOL moderno, come testarlo, come chiamare subroutine e come passare dal formato fisso a quello libero senza rompere le colonne.

## Obiettivi

- Ordinare un progetto con sorgenti, copybook e cartella di build.
- Compilare moduli (`-m`) ed eseguibili (`-x`) e collegarli insieme.
- Scrivere test eseguibili che confrontano l'output atteso.
- Leggere file sequenziali con `OPEN`, `READ`, `CLOSE` e controllare gli stati.
- Usare i copybook ed effettuare il passaggio controllato da fixed a free.

## Struttura del progetto e copybook

I copybook sono file `.cpy` inclusi con `COPY` all'interno della `DATA DIVISION`. Servono a condividere una struttura di dati tra più programmi senza duplicarla: cambiare un campo in un punto cambia tutti i programmi che la includono. La convenzione moderna mette i sorgenti in `src/`, i copybook in `copybooks/` e compila in `build/`.

```bash
mkdir -p build
cobc -m -free -I copybooks -o build/lettore.so src/lettore.cob   # modulo
cobc -x -free -I copybooks -o build/report src/report.cob \
     build/lettore.so                                            # eseguibile
ls build
```

Il flag `-I` aggiunge una cartella di ricerca per `COPY`. Il modulo `.so` su Linux corrisponde a `.dll` su Windows: il runtime di GnuCOBOL cerca il file compilato quando incontra una `CALL` verso il programma esterno.

```cobol
>>SOURCE FORMAT FREE
*> copybooks/registro.cpy - struttura condivisa, nessun codice
01 REG-ARTICOLO.
   05 REG-CODICE   PIC X(6).
   05 REG-QUANTITA PIC 9(4) COMP.
   05 REG-PREZZO   PIC S9(5)V99 COMP-3.
```

| Elemento | Percorso | Ruolo |
| --- | --- | --- |
| sorgente | `src/*.cob` | codice del programma |
| copybook | `copybooks/*.cpy` | strutture condivise |
| build | `build/` | moduli `.so` e eseguibili |
| dati | `data/*.dat` | file sequenziali di test |
| test | `tests/*.sh` | verifica dell'output |

## File sequenziali e stati

COBOL lavora con file, non con stream: si dichiarano nella `FILE SECTION` con un nome logico, un'organizzazione (`ORGANIZATION SEQUENTIAL`) e una `RECORD`. Nell'ambiente si collegano a un percorso reale con `SELECT ... ASSIGN`. Ogni operazione restituisce un codice in `FILE STATUS`: `00` è successo, `10` è fine file su `READ`, e ignorarlo è il difetto più diffuso.

```cobol
>>SOURCE FORMAT FREE
IDENTIFICATION DIVISION.
PROGRAM-ID. leggi-righe.
ENVIRONMENT DIVISION.
INPUT-OUTPUT SECTION.
FILE-CONTROL.
    SELECT F-ARTICOLI ASSIGN TO "data/articoli.dat"
        ORGANIZATION IS LINE SEQUENTIAL
        FILE STATUS IS WS-STATO.
DATA DIVISION.
FILE SECTION.
FD F-ARTICOLI.
01 F-ARTICOLO PIC X(60).
WORKING-STORAGE SECTION.
01 WS-STATO PIC 99 VALUE ZERO.
01 WS-FINE  PIC X  VALUE "N".
PROCEDURE DIVISION.
    OPEN INPUT F-ARTICOLI
    PERFORM UNTIL WS-FINE = "S"
        READ F-ARTICOLI
            AT END MOVE "S" TO WS-FINE
            NOT AT END DISPLAY F-ARTICOLO(1:6)
        END-READ
    END-PERFORM
    CLOSE F-ARTICOLI
    STOP RUN.
```

`LINE SEQUENTIAL` legge una riga per volta con separatore di riga, comodo con file di testo; `SEQUENTIAL` legge a record di lunghezza fissa, formato più vicino ai file mainframe. `COMP` e `COMP-3` cambiano la rappresentazione dei numeri, quindi un file scritto con una struttura non è leggibile con un'altra senza dichiarazioni identiche.

## Test e verifica dell'output

Non esiste un framework di test universale: la pratica consolidata è uno script di shell che compila, esegue e confronta l'output con quello atteso. Il criterio di accettazione è il codice di uscita più il contenuto, e i casi limite devono produrre una diagnostica su stderr.

```bash
set -eu
cobc -x -free src/report.cob -o build/report
build/report > build/uscita.txt            # set -e ferma il test su crash
diff -u tests/atteso.txt build/uscita.txt  # fallisce se l'output cambia
build/report data/vuoto.dat && echo "vuoto: ok"
```

Il confronto `diff` è rigoroso e segnala i cambi di spaziatura, utili perché in COBOL i campi `PIC X` si riempiono di spazi. Per i test unitari dei paragrafi si compila il programma come modulo e lo si chiama con `CALL`, passando i dati tramite linkage.

## Migrazione da fixed a free e compatibilità

La migrazione a formato libero si fa in modo incrementale: `-free` per i file nuovi, `-fixed` per il codice legacy, perché un file misto non è compilabile. Prima di ogni conversione bisogna trovare le sequenze in colonna 1–6 e convertirle in commenti `*>`, controllando che paragrafi e livelli `01` restino leggibili.

```cobol
>>SOURCE FORMAT FREE
IDENTIFICATION DIVISION.
PROGRAM-ID. migra-check.
DATA DIVISION.
WORKING-STORAGE SECTION.
01 WS-RIGA  PIC X(80).
01 WS-TOT   PIC 9(6) COMP VALUE ZERO.
PROCEDURE DIVISION.
    ADD 1 TO WS-TOT
    CALL "lettore" USING WS-RIGA
    DISPLAY "righe lette: " WS-TOT
    STOP RUN.
```

La `CALL "lettore"` con `USING` passa un riferimento alla memoria dei parametri: il chiamante deve allocare un campo della dimensione dichiarata dal chiamato, altrimenti la lettura esce dai confini.

| Scelta | Formato fisso | Formato libero |
| --- | --- | --- |
| colonne | significative | irrilevanti |
| commenti | `*` in colonna 7 | `*>` ovunque |
| codice nuovo | sconsigliato | preferito |
| diff e revisione | rumorosa | pulita |
| legacy | compatibile | conversione necessaria |

## Errori comuni

- **Ignorare il `FILE STATUS` su `OPEN`**: un file assente produce `35` e il programma continua con un descrittore non aperto.
- **Dichiarare nel chiamato una `PIC` più grande della memoria passata**: la `CALL USING` non controlla i confini e la scrittura corrompe campi vicini.
- **Mescolare fixed e free in un solo file**: il compilatore legge il file con un solo formato, e una riga di commento può diventare istruzione.
- **Confrontare output senza `diff`**: la verifica a occhio non nota uno spazio in più che cambia il layout di un report.
- **Dichiarare il copybook dopo l'uso**: `COPY` va nella `DATA DIVISION` prima del codice che usa la struttura, altrimenti i campi non sono visibili.

## In sintesi

Un progetto COBOL moderno ha contributi separati: sorgenti, copybook, build, dati e test. File e subroutine sono i punti di contatto con l'esterno, e in entrambi lo stato restituito è parte del contratto. GnuCOBOL eredita la semantica mainframe ma gira su macchine comuni, il che lo rende adatto alla formazione. La migrazione a formato libero è un investimento incrementale, con la compatibilità come vincolo.

## Fonti

- [GnuCOBOL Programmer's Guide](https://gnucobol.sourceforge.io/HTML/gnucobpg.html), guida su copybook, file, `CALL` e stati di file.
- [GnuCOBOL Programmer's Guide (PDF)](https://gnucobol.sourceforge.io/guides/grammar.pdf), riferimento sintattico completo del compilatore.
- [GnuCOBOL FAQ](https://gnucobol.sourceforge.io/faq/index.html), problemi comuni e differenze tra formati e sistemi operativi.
- [IBM Enterprise COBOL for z/OS - Fixed and Free Format](https://www.ibm.com/docs/en/cobol-zos/6.4.0?topic=programs-fixed-form-free-form-format), specifica IBM delle aree del sorgente.
- [IBM COBOL for z/OS](https://www.ibm.com/docs/en/cobol-zos), documentazione delle estensioni di produzione mainframe.
