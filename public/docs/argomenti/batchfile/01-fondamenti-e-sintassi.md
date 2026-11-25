Un batchfile, o file `.bat`, è uno script di testo che `cmd.exe` interpreta riga per riga: nessun compilatore, nessun runtime aggiuntivo, solo il command interpreter presente su ogni Windows. Nato come sequenza di comandi DOS da concatenare, è ancora il collante di molti strumenti di build, installer e attività pianificate, e capirne le regole evita ore di diagnosi su script che "funzionano sul mio computer".

Il linguaggio ha poche costruzioni, ma il modello di espansione delle variabili e la gestione delle stringhe sono diversi da qualsiasi linguaggio moderno. In questa lezione impari variabili, espansione, condizioni, cicli, quoting, codice di uscita e il pattern `setlocal` che tiene isolato lo stato dello script.

## Obiettivi

- Scrivere uno script `.bat` con `@echo off`, commenti e intestazione.
- Usare `set` per variabili normali, argomenti posizionali e `shift`.
- Controllare il flusso con `if`, `if exist`, `if errorlevel` e `else`.
- Iterare con `for` nelle forme `for /f`, `for /d` e `for /r`.
- Gestire quoting, spazi nei percorsi e codice di uscita verso il chiamante.

## Anatomia di uno script

Un batchfile si esegue con `nome.bat` oppure `call nome.bat` da un'altra sessione. Ogni riga è un comando del command interpreter, le righe che iniziano con `rem` o `::` sono commenti, e le etichette `:nome` definiscono punti raggiungibili con `goto :nome` o con `call :nome`.

```batch
@echo off
rem @ disattiva anche l'eco della prima riga
setlocal EnableExtensions EnableDelayedExpansion
:: per convenzione, doppio due punti per i commenti fuori dai blocchi

set "APP=backup"
set "DESTINAZIONE=%~1"

if "%~1"=="" (
    echo Uso: backup.bat DESTINAZIONE
    exit /b 2
)

echo Avvio backup di %APP% verso "%DESTINAZIONE%"
endlocal
exit /b 0
```

`@echo off` impedisce che ogni comando venga stampato prima di eseguirlo: senza, l'output è un doppio log rumoroso. `exit /b N` chiude il batchfile e restituisce `N` al chiamante, senza chiudere la finestra come farebbe `exit` senza parametri.

| Costrutto | Sintassi | Nota |
| --- | --- | --- |
| commenti | `rem testo` oppure `:: testo` | `::` non è valido dentro un blocco `( )` |
| etichetta | `:inizio` | raggiunta da `goto :inizio` |
| variabile | `set "NOME=valore"` | senza `set "..."` gli spazi finali finiscono nel valore |
| espansione | `%NOME%` | avviene prima dell'esecuzione della riga |
| argomento | `%1` … `%9`, `%~nx0` | `%~` rimuove le virgolette |
| uscita | `exit /b 0` | termine del file o della subroutine |

## Variabili, argomenti ed espansione

`set` assegna una stringa; non esistono tipi e non esiste `null`, solo stringhe eventualmente vuote. Gli argomenti arrivano in `%1`…`%9`, `%0` è il nome dello script, `%*` è la riga completa e `shift` sposta di uno gli argomenti, così un ciclo può leggere tutti i parametri.

```batch
@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "TOTALE=0"

:leggi
if "%~1"=="" goto :fine
rem ogni argomento è un percorso, anche con spazi
echo - elaboro: "%~f1"
set /a TOTALE+=1
shift
goto :leggi

:fine
echo File trattati: %TOTALE%
exit /b 0
```

L'espansione `%VAR%` avviene quando la riga è interpretata, non quando è eseguita. Dentro un blocco `( )` tutte le righe sono già state espanse: il classico `set /a CONT+=1` in un ciclo `for` mostra sempre il valore iniziale. `EnableDelayedExpansion` attiva `!VAR!`, che viene espanso al momento dell'esecuzione e rende corretto il contatore.

```batch
@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "CONT=0"

for %%F in (*.log) do (
    set /a CONT+=1
    echo !CONT!: %%F          rem !CONT! è aggiornato, %CONT% no
    if !CONT! geq 5 goto :stop
)

:stop
echo Trovati !CONT! file di log
exit /b 0
```

| Forma dell'argomento | Significato | Esempio con `C:\dati\report.txt` |
| --- | --- | --- |
| `%~1` | senza virgolette | `C:\dati\report.txt` |
| `%~f1` | percorso completo | `C:\dati\report.txt` |
| `%~dp1` | sola directory | `C:\dati\` |
| `%~nx1` | nome ed estensione | `report.txt` |
| `%*` | tutti gli argomenti | invariate |

## Condizioni e cicli

`if` confronta stringhe con `==`, verifica l'esistenza di file e cartelle con `exist`, e confronta numeri con `EQU`, `NEQ`, `LSS`, `LEQ`, `GTR`, `GEQ` solo dentro `set /a` e `if`. Ha anche un modificatore `not`, e le clausole `else` devono stare sulla stessa riga logica.

```batch
@echo off
setlocal EnableExtensions
set "FILE=%~1"

if not exist "%FILE%" (
    echo Errore: "%FILE%" non esiste 1>&2
    exit /b 1
)

for /f "usebackq delims=" %%R in ("%FILE%") do (
    rem con usebackq le virgolette indicano un file, non una stringa
    echo riga: %%R
)

if /i "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo Sistema a 64 bit
) else (
    echo Sistema a 32 bit
)
exit /b 0
```

`for` ha diverse forme: `for %%F in (*.txt) do` itera sui file, `for /d` sulle directory, `for /r` in modo ricorsivo, `for /l %%I in (1,1,10) do` su un intervallo numerico e `for /f` sulle righe di un file o di un comando. Nei batchfile le variabili di ciclo usano `%%`, mentre la riga di comando usa `%`. Per catturare l'output di un programma si usa `for /f "delims=" %%L in ('comando') do` oppure il reindirizzamento `> file`.

| Forma | Uso tipico |
| --- | --- |
| `for %%F in (*.txt) do` | file della directory corrente |
| `for /d %%D in (*) do` | sottodirectory |
| `for /r "C:\src" %%F in (*.cs) do` | ricerca ricorsiva |
| `for /l %%I in (0,2,10) do` | sequenza numerica con passo |
| `for /f "tokens=2 delims=," %%A in ("%RIGA%") do` | campo di una riga CSV |

## Quoting, errorlevel e il pattern setlocal

Il quoting in `cmd.exe` è più debole che in bash: le virgolette proteggono gli spazi ma non impediscono l'espansione di `%` e `!`. La regola pratica è racchiudere sempre i percorsi in virgolette, scrivere `set "NOME=valore"` e non concatenare comandi con `&` dentro stringhe che contengono caratteri speciali come `^`, `&`, `|`, `>`.

```batch
@echo off
setlocal EnableExtensions EnableDelayedExpansion & rem isolamento dello stato
set "LOG=%~dp0build.log"
set "ESITO=0"

call :compila "%~dp0src" || set "ESITO=1"
if not "%ESITO%"=="0" (
    echo Build fallita, vedi "%LOG%" 1>&2
    exit /b %ESITO%
)

:compila
rem %1 è la directory ricevuta; errorlevel viene propagato con exit /b
if not exist "%~1" exit /b 1
call "%~1\..\tool\build.bat" > "%LOG%" 2>&1
exit /b %ERRORLEVEL%

endlocal
```

Il `%ERRORLEVEL%` non è una variabile impostata con `set`: è un valore mantenuto dall'interprete, aggiornato dall'ultimo comando esterno. Conviene catturarlo subito, perché qualsiasi comando successivo, compreso `echo`, non lo azzera ma un `if` ben collocato lo rende ambiguo. La forma `if errorlevel 1` è vera per ogni valore maggiore o uguale a uno, mentre `if %ERRORLEVEL% GEQ 1` richiede che la variabile sia espansa correttamente.

`setlocal` salva copia di variabili e directory corrente; `endlocal` la ripristina, e anche la fine del file la ripristina implicitamente. È il motivo per cui ogni script dovrebbe aprirsi con `setlocal EnableExtensions EnableDelayedExpansion`: evita che `set` interne modifichino l'ambiente della finestra chiamante. Nota che `endlocal` dopo `exit /b` non viene mai raggiunto: quando serve passare un valore fuori basta concatenarlo nell'`endlocal`, come `endlocal & set "RISULTATO=%VALORE%"`.

## Errori comuni

- **Dimenticare `@echo off`**: ogni comando viene stampato e l'output diventa illeggibile, soprattutto nei log di build.
- **Usare `%VAR%` dentro un blocco `( )`**: il valore è quello di prima del blocco, perché l'espansione avviene prima; serve `!VAR!` con `EnableDelayedExpansion`.
- **Scrivere `set NOME = valore` con spazi**: in `cmd.exe` gli spazi fanno parte del nome e del valore, quindi la variabile sarà `NOME ` e il confronto successivo fallirà.
- **Non mettere tra virgolette i percorsi**: un'installazione in `C:\Program Files` spezza il comando in due argomenti.
- **Confondere `exit` con `exit /b`**: `exit` chiude anche la finestra `cmd.exe`, mentre `exit /b` restituisce solo il controllo al chiamante.

## In sintesi

Un batchfile è una sequenza di comandi `cmd.exe` con poche strutture e un'espansione testuale che precede l'esecuzione. Le variabili sono stringhe, gli argomenti si leggono con `%1` e `shift`, e le trasformazioni passano da `%~`. `if` e `for` coprono decisioni e iterazioni, `errorlevel` è il canale con cui uno script comunica l'esito. `setlocal` isola lo stato, e il quoting con `set "NOME=valore"` più percorsi tra virgolette previene la maggior parte dei bug. Per script nuovi, PowerShell resta l'alternativa consigliata.

## Fonti

- [Windows commands — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands)
- [cmd — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/cmd)
- [set — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/set_1)
- [if — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/if)
- [for — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/for)
