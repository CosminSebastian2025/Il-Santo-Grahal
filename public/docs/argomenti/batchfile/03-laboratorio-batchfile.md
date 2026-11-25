In questo laboratorio costruisci `pulisci-log.bat`, uno script che scandisce una cartella di log, elimina i file più vecchi di una soglia in giorni, archivia il resto in una sottocartella datata, scrive un rapporto e restituisce codici di uscita distinti. Non serve alcun toolchain: bastano `cmd.exe`, `forfiles`, `robocopy`, `findstr` e un terminale Windows. L'obiettivo è interiorizzare i tre punti in cui i batchfile reali si rompono, cioè spazi nei percorsi, espansione ritardata e codici di ritorno dei comandi esterni.

## Obiettivi

- Scrivere uno script con interfaccia, validazione degli argomenti e codice di uscita documentato.
- Filtrare i file per età con `forfiles` e parsare l'output con `for /f`.
- Archiviare con `robocopy`, intercettando i codici di ritorno superiori o uguali a 8.
- Registrare un rapporto leggibile con data, conteggi e percorsi usati.
- Eseguire uno smoke test e la modalità `--dry-run` prima di toccare file veri.

## Il contratto di `pulisci-log.bat`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `pulisci-log.bat CARTELLA [GIORNI] [/dry]` | primo argomento obbligatorio |
| `GIORNI` | intero >= 1, default 30 | soglia di eliminazione |
| `/dry` | nessuna modifica | stampa solo le azioni previste |
| exit 0 | successo | anche con zero file trovati |
| exit 1 | cartella mancante o argomento non numerico | errore d'uso |
| exit 2 | `forfiles` o `robocopy` fallito | errore operativo |
| log | `rapporto-AAAA-MM-GG.txt` accanto alla cartella | tracciabilità |

Zero file trovati è un successo, non un errore: una cartella già pulita è una cartella sana. Un percorso che non esiste è invece un errore d'uso, perché lo script non può sapere se era un refuso o una macchina ancora non preparata. Tutto ciò che viene cancellato deve comparire nel rapporto, così che la modalità `--dry` e l'esecuzione reale siano confrontabili.

```batch
@echo off
setlocal EnableExtensions EnableDelayedExpansion
pushd "%~dp0.." || exit /b 1 & rem anello per il percorso del log

set "CARTELLA=%~1"
set "GIORNI=%~2"
set "MODO=%~3"
if "%GIORNI%"=="" set "GIORNI=30"

if "%CARTELLA%"=="" (echo Uso: pulisci-log.bat CARTELLA [GIORNI] [/dry] 1>&2 & popd & exit /b 1)
if not exist "%CARTELLA%\" (echo Cartella non trovata: "%CARTELLA%" 1>&2 & popd & exit /b 1)
echo %GIORNI%| findstr /r "^[0-9][0-9]*$" >nul || (echo GIORNI non numerico: "%GIORNI%" 1>&2 & popd & exit /b 1)
```

`pushd` accetta anche percorsi UNC e salva uno stack, `popd` lo ripristina: ogni `exit` dello script deve richiamarlo, oppure si lascia che `endlocal` ripristini directory e variabili alla fine del file. Qui `popd` compare accanto a ogni uscita anticipata.

## Nucleo: selezione, archiviazione, eliminazione

La selezione usa `forfiles /p`, che filtra per data di modifica: `/d -N` seleziona i file modificati negli ultimi `N` giorni, preceduto da `-` per escluderli, quindi una soglia più vecchia richiede `-N-1`. La particolarità è che `forfiles` riserva `@file`, `@fdate`, `@ftime` e simili: usare `for /f` su un comando `cmd /c` che invoca `forfiles` è la forma più controllabile.

```batch
set "ARCHIVIO=%CARTELLA%\archivio-%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%"
set "RAPPORTO=%~dp0rapporto-%DATE:~-4%-%DATE:~3,2%-%DATE:~0,2%.txt"
set "VECCHI=0"
set "ARCHIVIATI=0"

echo Rapporto di pulisci-log.bat > "%RAPPORTO%"
echo Cartella: "%CARTELLA%" >> "%RAPPORTO%"
echo Soglia: %GIORNI% giorni, modo: "%MODO%" >> "%RAPPORTO%"

rem conta i file oltre soglia senza ancora toccarli
for /f "usebackq delims=" %%F in (`cmd /c forfiles /p "%CARTELLA%" /m *.log /d -%GIORNI% /c "cmd /c echo @path" 2^>nul`) do (
    set /a VECCHI+=1
    echo [vecchio] %%F >> "%RAPPORTO%"
)
echo File oltre soglia: !VECCHI! >> "%RAPPORTO%"

if /i not "%MODO%"=="/dry" if !VECCHI! gtr 0 call :archivia || (popd & exit /b 2)
echo Eleggibili: !VECCHI!, archiviati: !ARCHIVIATI! >> "%RAPPORTO%"
popd
exit /b 0

:archivia
rem copia i vecchi nell'archivio e solo dopo li elimina dalla cartella di origine
if not exist "%ARCHIVIO%\" mkdir "%ARCHIVIO%" || exit /b 1
robocopy "%CARTELLA%" "%ARCHIVIO%" *.log /maxage:%GIORNI% /mov /njh /njs >nul
rem robocopy < 8 = successo; /mov sposta il file, cioè copia e cancella
if %ERRORLEVEL% GEQ 8 exit /b 1
set /a ARCHIVIATI=!VECCHI!
exit /b 0
```

`/mov` sposta i file, ma è un comando esterno che non conosce "spostamento atomico": l'ordine sicuro è copia, verifica del codice, e solo dopo la cancellazione. Qui `robocopy` con `/mov` fa entrambe le cose, e il controllo `GEQ 8` distingue i codici informativi, come "file copiati", dai veri errori di accesso o di percorso. `DATE` dipende dalla formattazione locale: le sottostringhe `%DATE:~-4%` funzionano su un formato `dd/mm/aaaa`, ma su impostazioni diverse producono nomi sbagliati. È il motivo per cui lo scripting batch non è portabile tra localizzazioni.

## Rendiconto e smoke test

Un rapporto utile contiene tutto ciò che serve a rifare l'operazione: percorso di origine, archivio usato, soglia, elenco dei file, codici di ritorno. Lo smoke test esegue la modalità `--dry` su una cartella temporanea creata ad hoc, con file di età controllata.

```batch
rem smoke test: crea una cartella, 3 file, 1 vecchio, poi dry-run e verifica
set "TEMP=%TEMP%\pulisci-log-test-%RANDOM%"
mkdir "%TEMP%" || exit /b 1
echo riga > "%TEMP%\a.log"
echo riga > "%TEMP%\b.log"
echo riga > "%TEMP%\c.txt"

rem trucco per retrodatare un file: copialo e riscrivi la data via PowerShell
powershell -NoProfile -Command "(Get-Item '%TEMP%\a.log').LastWriteTime=(Get-Date).AddDays(-90)"

call "%~dp0pulisci-log.bat" "%TEMP%" 30 /dry
if errorlevel 1 (echo smoke test fallito & rmdir /s /q "%TEMP%" & exit /b 1)

findstr /c:"[vecchio]" "%RAPPORTO%" >nul || (echo atteso 1 vecchio, trovato 0 & exit /b 1)
rmdir /s /q "%TEMP%"
echo Smoke test superato
exit /b 0
```

Il `--dry` è la rete di sicurezza, ma non sostituisce una revisione di ciò che il rapporto dichiara: prova sempre il primo passaggio su una cartella copiata, e solo dopo pianifica l'esecuzione via Task Scheduler.

## Esercizi

1. Aggiungi `/keep N` per conservare gli `N` file più recenti anche se superano la soglia, e documenta come cambia il contratto.
2. Sostituisci `DATE` con una data ricavata da PowerShell per rendere nomi di archivio e rapporto indipendenti dalla localizzazione.
3. Gestisci anche le sottocartelle con `forfiles /s` e verifica cosa cambia nei percorsi dell'archivio.
4. Aggiungi la modalità `/purge N` che elimina anche gli archivi più vecchi di `N` giorni, con un test che lo esegue in `--dry`.
5. Trasforma lo script in PowerShell mantenendo gli stessi codici di uscita e confronta le righe totali.
6. Aggiungi un blocco che rifiuta percorsi con `..` per evitare di cancellare fuori dalla cartella indicata, e spiega perché i controlli testuali non bastano.

<details>
<summary>Soluzione</summary>

1. `forfiles` non ordina: per conservare gli ultimi `N`, elenca i candidati con `dir /b /o-d "*.log"`, salta con un contatore fino a `N` con `skip=%N%` in `for /f`, e usa il resto come elenco. Il contratto diventa "elimina se oltre soglia e oltre i primi N inseriti".

2. Lancia `for /f %%D in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "DATA=%%D"` e usa `%DATA%` nei nomi di archivio e rapporto. Il testo diventa portabile tra localizzazioni, al prezzo di una dipendenza aggiuntiva.

3. `forfiles /s` restituisce percorsi completi: `robocopy` con `/s` replica l'albero in `%ARCHIVIO%` già strutturato, ma `/mov` su una selezione piatta non è equivalente; serve un `robocopy "%CARTELLA%" "%ARCHIVIO%" /s /maxage:%GIORNI%` e poi una seconda cancellazione, verificando sempre il codice `GEQ 8`.

4. Il `/purge` è un secondo `forfiles` e una seconda `robocopy` sulle directory `archivio-*`; tutti i rami condividono lo stesso controllo `if /i "%MODO%"=="/dry"` e scorrono senza modifiche. Il test verifica solo il contenuto del rapporto, che deve elencare gli archivi eleggibili.

5. In PowerShell diventano `Get-ChildItem -File -Filter *.log` con `Where-Object LastWriteTime -lt (Get-Date).AddDays(-$Giorni)` e `Move-Item`, con `exit` espliciti: le righe scendono in genere di un terzo e spariscono i problemi di espansione ritardata.

6. Rifiuta il valore che corrisponde a `..` o contiene `..\` dopo la normalizzazione: `for %I in ("%CARTELLA%") do set "REALE=%~fI"` e confronta il prefisso con una cartella consentita, perché i controlli testuali falliscono con collegamenti simbolici e nomi corti.

</details>

## Errori comuni

- **Eseguire la cancellazione prima della copia**: un `robocopy` fallito a metà lascia file eliminati e non archiviati; usa `/mov` solo dopo aver verificato il codice di ritorno.
- **Interpretare `robocopy` come qualsiasi comando**: i codici da 0 a 7 indicano successo con informazioni, e un `if errorlevel 1` blocca un'operazione sana.
- **Basarsi su `%DATE%` per i nomi file**: il formato segue la localizzazione; usare PowerShell o `wmic` per una data stabile.
- **Dimenticare `enableDelayedExpansion` sui contatori**: `set /a` dentro un blocco `( )` non aggiorna il valore letto con `%VAR%`, e i conteggi restano a zero.
- **Lasciare percorsi senza virgolette**: una cartella con spazi rompe `forfiles`, `robocopy` e i nomi nel rapporto in punti diversi e difficili da correlare.

## In sintesi

Hai costruito un batchfile con un contratto esplicito, validazione, modalità `--dry` e un rapporto che rende l'operazione ripetibile. Il nucleo usa `forfiles` per selezionare, `robocopy` per archiviare e i codici di ritorno come linguaggio di controllo degli errori. La lezione più grande è che ogni comando esterno ha la sua semantica di uscita e il suo comportamento di quoting, e che la portabilità non è un problema di sintassi ma di ambiente. Il passo successivo naturale è riscrivere lo stesso contratto in PowerShell, dove `Move-Item` e `try/catch` rendono superfluo gran parte di questo macchinario.

## Fonti

- [forfiles — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/forfiles)
- [robocopy — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy)
- [pushd — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pushd)
- [Windows commands — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/windows-commands)
- [Cmdlet Invoke-Expression, confronto con l'esecuzione nativa — Microsoft Learn](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-expression)
