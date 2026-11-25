Un batchfile che funziona sul PC di chi lo scrive può fallire silenziosamente su un altro, perché dipende dal percorso di lancio, dalla codepage della console, dai permessi e dai binari presenti nel `PATH`. Questa lezione raccoglie gli strumenti che trasformano uno script artigianale in qualcosa di verificabile: struttura a subroutine, gestione degli errori, uso di programmi esterni come `findstr` e `robocopy`, test e automazione dell'esecuzione, con un confronto onesto con PowerShell, oggi la scelta consigliata da Microsoft per lo scripting Windows.

## Obiettivi

- Separare un batchfile in subroutine richiamabili con `call :nome`.
- Gestire l'esito dei comandi con `||`, `&&`, `errorlevel` e `exit /b`.
- Usare `for /f`, `findstr` e `robocopy` come mattoni di scripting.
- Controllare codepage, eco e stato con `chcp`, `setlocal` e `pushd`.
- Confrontare batch e PowerShell per scegliere lo strumento giusto.

## Strutturare uno script con le subroutine

Un file `.bat` può contenere più subroutine, richiamate con `call :etichetta argomenti`. Ogni `call` crea un nuovo contesto di argomenti `%1`…`%9`, e `exit /b N` ne esce con il codice `N`. Lo schema robusto mette in fondo al file le subroutine, separate dal corpo da un `exit /b` esplicito, così che il flusso non le esegua per caduta.

```batch
@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul & rem UTF-8, comunque la codepage attiva resta un fattore di rischio

set "RADICE=%~dp0"
set "ESITO=0"

call :pulisci "%RADICE%out" || set "ESITO=1"
call :compila "%RADICE%src" "%RADICE%out" || set "ESITO=2"

if "%ESITO%"=="0" (echo Build completata) else (echo Build fallita: %ESITO% 1>&2)
endlocal & exit /b %ESITO%

rem --- subroutine, mai raggiunte per caduta ---

:pulisci
rem %1 = directory da ricreare; errorlevel 0 se ok
if not exist "%~1" mkdir "%~1" || exit /b 1
del /q "%~1\*" >nul 2>&1
exit /b 0

:compila
rem %1 = src, %2 = out; lancia il toolchain e registra il log
if not exist "%~1" exit /b 1
call "%~dp0tool\csc.bat" /out:"%~2\app.exe" "%~1\*.cs" > "%~2\build.log" 2>&1
exit /b %ERRORLEVEL%
```

Il pattern `call :sub || set "ESITO=N"` è la versione batch del controllo degli errori: `||` esegue il secondo comando solo se il primo ha restituito un codice diverso da zero, `&&` solo se ha restituito zero. Non è un gestore di eccezioni: se il comando non viene eseguito affatto, come succede con un comando inesistente, il codice è 9009 e va comunque gestito.

| Costrutto | Significato | Esempio |
| --- | --- | --- |
| `a && b` | b se a ha successo | `mkdir out && echo creato` |
| `a \|\| b` | b se a fallisce | `call :x \|\| exit /b 1` |
| `2>&1` | stderr verso stdout | `tool.exe > log.txt 2>&1` |
| `>nul` | scarta stdout | `del /q *.tmp >nul` |
| `pushd` / `popd` | cambia directory e la ripristina | `pushd "%~dp0"& rem ... & popd` |
| `exit /b N` | esce da file o subroutine | `exit /b 3` |

## Tool esterni come libreria

Lo scripting batch più produttivo riusa programmi di sistema con output parsabile. `findstr` cerca testo e restituisce 0 se trova corrispondenze, 1 se non ne trova, 2 se c'è un errore: il suo codice di uscita è già una condizione. `where` verifica la presenza di un eseguibile nel `PATH`, `robocopy` copia alberi di file con codici di ritorno più articolati e `for /f` trasforma l'stdout di un comando in iterazione.

```batch
@echo off
setlocal EnableExtensions EnableDelayedExpansion
set "RAPPORTO=%~dp0rapporto.txt"

if not "%~1"=="" (set "RADICE=%~1") else (set "RADICE=%CD%")

rem 1) prerequisito: senza toolchain, esci presto
where git >nul 2>&1 || (echo git non trovato nel PATH 1>&2 & exit /b 1)

rem 2) elenca i file senza spazi nei nomi in modo stabile
for /f "delims=" %%F in ('dir /b /s /a-d "%RADICE%\*.md" 2^>nul') do (
    echo %%F>>"%RAPPORTO%"
)
rem 2^>nul: il caret protegge il reindirizzamento dentro la stringa di for /f

rem 3) cerca una parola e usa il codice di findstr come condizione
findstr /c:"TODO" /s /i "%RADICE%\*.md" >nul
if errorlevel 2 (goto :errore) else (if errorlevel 1 (
    echo Nessun TODO trovato
    exit /b 0
))
echo Trovati TODO nei sorgenti
exit /b 0

:errore
echo findstr ha riportato un errore di sintassi o accesso 1>&2
exit /b 2
```

Il `^` prima di `>` o `|` dentro un `for /f` è necessario: altrimenti il reindirizzamento viene applicato al `for` e non al comando interno. Anche `%%` va usato nei file, mentre da prompt interattivo si scrive `%`. `robocopy` invece è più utile per copie resilienti: restituisce codici inferiori a 8 quando non ci sono errori, quindi un controllo come `if %ERRORLEVEL% GEQ 8 exit /b 1` è la forma corretta, e richiede una valutazione al momento giusto per non confondersi con l'espansione ritardata.

## Test, automazione e PowerShell

Non esiste un framework di test nativo: il modo affidabile è far restituire allo script un codice e verificarlo in un altro script. Task Scheduler, hook di pre-commit o pipeline CI possono chiamare il batchfile e interpretare l'esito, e la stessa CLI di test può essere scritta in PowerShell per leggere l'output con oggetti.

```powershell
# smoke test che esegue un batchfile e verifica sia l'esito sia l'output
$script = Join-Path $PSScriptRoot 'build.bat'
$output = & $script 2>&1
$code   = $LASTEXITCODE   # codice di uscita dell'ultimo programma nativo

if ($code -ne 0) { throw "build.bat è fallito con codice $code`n$output" }
if (($output -join "`n") -notmatch 'Build completata') { throw 'messaggio atteso assente' }
```

PowerShell ha ambienti che `cmd.exe` non ha: oggetti invece di stringhe, pipe che non sono solo testo, `try/catch`, `ErrorActionPreference`, e `Set-StrictMode`. Microsoft lo presenta come successore della command-line classica per l'amministrazione e l'automazione, mentre `cmd.exe` resta per compatibilità. Nella pratica conviene scegliere batch quando serve un file che gira senza prerequisiti su Windows legacy e quando si mantiene uno script esistente, e PowerShell per tutto ciò che è nuovo: task pianificati, parser di file strutturati, gestione delle policy di esecuzione.

```powershell
# equivalente compatto della logica di for /f + findstr
param([string]$Radice = '.', [string]$Modello = 'TODO')

$colpi = Get-ChildItem -LiteralPath $Radice -Filter *.md -Recurse -File |
    Select-String -Pattern $Modello -SimpleMatch
if (-not $colpi) { Write-Host 'Nessun TODO trovato'; exit 0 }
$colpi | ForEach-Object { '{0}:{1}' -f $_.Path, $_.LineNumber }
exit 0
```

Quando si è costretti al batch, la regola è tenere la logica corta e far fare il lavoro pesante ai comandi nativi o a PowerShell invocato con `-File`; con `powershell.exe -NoProfile -ExecutionPolicy Bypass -File script.ps1` si evita di dipendere dal profilo dell'utente, ma la policy resta un tema di sicurezza da trattare con l'amministratore e non aggirarla come default.

## Errori comuni

- **Testare solo l'esito 0 e 1**: molti comandi usano codici distinti, come `findstr` con 2 o `robocopy` con valori fino a 16, e trattarli tutti come successo nasconde errori.
- **Fidarsi del `PATH` del singolo utente**: uno script avviato dal Task Scheduler non vede lo stesso ambiente della console interattiva; verifica i prerequisiti con `where`.
- **Lasciare i log in codepage diverse**: output di comandi diversi mescolati in un file producono caratteri corrotti; registra la codepage e preferisci UTF-8 nei file di log.
- **Chiamare un altro batch senza `call`**: il controllo passa al file chiamato e non torna mai, perché il batchfile non è una funzione per default.
- **Scrivere la logica di dominio in batch**: parsing di JSON o gestione di strutture complesse è più fragile e insicuro; delega a PowerShell.

## In sintesi

Il batchfile maturo è piccolo, strutturato in subroutine e verifica i prerequisiti prima di agire. `call :nome` con `||` e `exit /b` sostituisce un sistema di eccezioni, mentre tool di sistema come `findstr`, `where` e `robocopy` diventano le primitive che rendono lo script utile. Ogni file comunica un codice di uscita che un altro processo può testare, e questo è il vero contratto da mantenere. Per nuovi progetti PowerShell è la scelta moderna, ma comprendere batch aiuta a mantenere e leggere il software Windows che esiste già.

## Fonti

- [call — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/call)
- [findstr — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr)
- [robocopy — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy)
- [where — Microsoft Learn](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/where)
- [PowerShell overview — Microsoft Learn](https://learn.microsoft.com/en-us/powershell/scripting/overview)
