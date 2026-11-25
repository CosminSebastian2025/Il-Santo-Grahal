Un progetto MATLAB non è solo un file `.m`: è una cartella con percorso aggiunto, dipendenze dichiarate, test ripetibili e dati di esempio. Gli strumenti che rendono questo ciclo prevedibile sono la documentazione con `help`, il debugger, i test per file o per classe e il sistema di login alla licenza. Molti di questi passaggi hanno un equivalente in GNU Octave, che rilegge i file `.m` con alcune limitazioni sui toolbox e sul framework `matlab.unittest`.

In questa lezione vedi come organizzare il codice, come scriverlo per essere trovato, come testarlo e come gestire dati e formati senza perdere riproducibilità.

## Obiettivi

- Organizzare un progetto con cartelle, percorso e documentazione degli header.
- Scrivere test basati su file e riconoscere i criteri di fallimento.
- Eseguire codice con il debugger e leggere la pila di chiamata.
- Scegliere tra `mat` e formati aperti per i dati.
- Scrivere lo stesso codice in modo portabile verso GNU Octave.

## Percorsi, pacchetti e documentazione

MATLAB trova le funzioni solo nelle cartelle del percorso (path) corrente. Un progetto lo dichiara esplicitamente, senza dipendere dalla cartella di avvio, e documenta la versione in un file di setup che aggiunge i folder necessari.

```matlab
% setup.m - eseguito una volta per sessione
progetto = fileparts(mfilename('fullpath'));   % cartella di questo file
addpath(fullfile(progetto, 'src'));
addpath(fullfile(progetto, 'lib'));
fprintf('progetto caricato: %s\n', progetto);
```

L'header di una funzione non è un commento decorativo: le prime righe fino alla prima riga non vuota sono ciò che `help nome` mostra in console. Le funzioni dentro una cartella `+pacchetto` si chiamano con `pacchetto.nome` e servono a evitare collisioni di nomi tra moduli.

| Elemento | Scopo | Comando |
| --- | --- | --- |
| `addpath` / `rmpath` | modifica il percorso | `addpath('src')` |
| `savepath` | rende il percorso persistente | `savepath` |
| `+cartella` | namespace di pacchetto | `mio.utils.f` |
| `@cartella` | metodi di una classe | usati da `classdef` |
| header `.m` | aiuto in console | `help f` |
| `doc f` | documentazione completa | apre il browser |

## Test basati su file e su classe

Il modo più economico per testare una funzione numerica è un file `test_*.m` con blocchi `%%` e `assert`. MATLAB li esegue come un normale script, mentre `runtests` su una cartella raccoglie tutti i test. I test per classe usano `matlab.unittest.TestCase` e aggiungono dipendenze e teardown.

```matlab
% test_statistiche.m
%% media di un vettore semplice
assert(statistiche([1 2 3 4]) == 2.5);   % relazione esatta su valori razionali

%% input vuoto: deve lanciare un errore identificato
try
    statistiche([]);
    error('test:fallito', 'atteso errore');
catch e
    assert(strcmp(e.identifier, 'statistiche:vuoto'));
end

%% vettore colonna e riga danno lo stesso risultato
assert(statistiche([1;2;3]) == statistiche([1 2 3]));
```

`runtests` restituisce una tabella con passati, falliti e non eseguiti: controlla sempre `nFailed`, perché un test saltato non è un test superato. Le tolleranze vanno dichiarate: `assert(abs(a - b) < 1e-12)` esplicita il criterio, mentre `==` su numeri in virgola mobile è quasi sempre una scelta sbagliata.

```matlab
% esecuzione e lettura del risultato
risultati = runtests('test_statistiche.m');   % o runtests('tests')
fprintf('%d passati, %d falliti\n', nnz([risultati.Passed]), ...
        nnz([risultati.Failed]));
```

## Debug e formati dati

Il debugger è integrato nell'editor con un breakpoint e il comando `dbstop if error` che blocca l'esecuzione alla prima eccezione. `dbstack` mostra la pila, `dbup` e `dbdown` cambiano frame, `whos` elenca le variabili del workspace corrente con dimensioni e tipo.

```matlab
dbstop if error          % blocca su qualsiasi errore
parabola = @(x) x.^2 - 2; % handle, non funzione
disp(parabola(3))         % 7
clear parabola            % rimuove il nome dal workspace
```

Per i dati non inventare formati: `save` produce un `.mat`, comodo ma specifico, mentre `readtable`/`writetable` lavorano su CSV e fogli, condivisibili con altri strumenti. Esegui con `restoredefaultpath` solo in casi rari, perché cancella anche il percorso dei toolbox.

| Funzione | Dati | Nota |
| --- | --- | --- |
| `save` / `load` | `.mat` v7.3 | binario, accesso rapido |
| `readtable` / `writetable` | CSV, xlsx | tabella con nomi di colonna |
| `readmatrix` / `writematrix` | CSV numerico | nessun header |
| `jsondecode` / `jsonencode` | JSON | strutture annidate |
| `matfile` | `.mat` parziale | carica solo le variabili usate |

## Portabilità verso GNU Octave

GNU Octave è un interprete libero che accetta gran parte dei file `.m` con `--traditional` quando servono semantiche MATLAB. Le differenze pratiche sono nei toolbox (nessun simulink), nei grafici avanzati e in `matlab.unittest`, assente. Una scelta prudente è scrivere il core numerico con funzioni di base e isolare le chiamate specifiche dietro un wrapper.

```bash
octave --version                            # controlla l'interprete disponibile
octave --no-gui --eval "addpath('src'); test_statistiche"   # esegue il file di test
octave --eval "run('test_statistiche.m')"   # alternativa: script esplicito
```

Octave non ha un `runtests` equivalente: il file di test è uno script con `assert`, e l'esito lo decide il codice di uscita dell'interprete. Un wrapper bash che lancia ogni `test_*.m` e conta i fallimenti è sufficiente, purché gli `assert` non vengano disattivati. Per questo conviene tenere il core numerico in file che non usano `matlab.unittest`, così la stessa suite gira nei due ambienti.

## Errori comuni

- **Ignorare `nFailed` di `runtests`**: la tabella può avere test falliti mentre lo script termina con codice 0, e la CI resta verde.
- **Usare `==` sui numeri in virgola mobile**: la rappresentazione binaria di valori come 0.1 rende i confronti esatti fragili; confronta con una tolleranza.
- **Salvare il percorso con `savepath` su una macchina condivisa**: le cartelle assolute di un utente rompono l'ambiente per gli altri; usa `setup.m`.
- **Fare `restoredefaultpath` come rimedio generico**: riporta il percorso di installazione e toglie le cartelle aggiunte per la sessione, comprese quelle del setup del progetto.
- **Testare contro un `warning` invece di un errore**: un avviso non ferma l'esecuzione e il test passa comunque.

## In sintesi

Un progetto MATLAB si regge su percorso esplicito, header che documentano le funzioni, test ripetibili e dati in formati pubblici. Il debugger integrato e `dbstack` rendono leggibile la pila di chiamata, mentre `runtests` trasforma i test in un esito verificabile. La scelta `.mat` o CSV è una decisione di condivisione. Con GNU Octave la stessa struttura funziona sui calcoli di base, purché le dipendenze dei toolbox e i test non siano innestati nelle parti portabili.

## Fonti

- [MathWorks - MATLAB Documentation](https://www.mathworks.com/help/matlab/), manuali ufficiali su linguaggio, debugger, test e I/O dei file.
- [Create Functions in Files](https://www.mathworks.com/help/matlab/matlab_prog/create-functions-in-files.html), regole di naming e visibilità delle funzioni.
- [Write Simple Test Using Function-Based Unit Tests](https://www.mathworks.com/help/matlab/matlab_prog/write-simple-test-using-function-based-unit-tests.html), primo esempio ufficiale di test basato su file.
- [GNU Octave Manual - Functions and Scripts](https://docs.octave.org/latest/Functions-and-Scripts.html), capitolo sulle funzioni e gli script compatibili.
- [GNU Octave - Test Functions](https://docs.octave.org/latest/Test-Functions.html), supporto ai test nei file `.m` di Octave.
