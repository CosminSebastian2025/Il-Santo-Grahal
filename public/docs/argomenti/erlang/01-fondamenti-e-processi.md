Erlang nasce nel laboratorio Ericsson per costruire centralini telefonici che non potevano fermarsi, e le sue scelte linguistiche derivano da quel vincolo. Le variabili sono immutabili, i processi sono leggeri e comunicano solo con messaggi, e il pattern matching sostituisce quasi del tutto i controlli condizionali. In questa lezione impari la sintassi del modulo e il modello di esecuzione su cui si poggia tutto il resto.

## Obiettivi

- Scrivere un modulo con funzioni esportate e capire il ruolo della clausola finale con punto.
- Usare atomi, tuple, liste e pattern matching come costruzione primaria del codice.
- Distinguere il fallimento di un pattern da un errore: `case`, `if`, guard e `_`.
- Comprendere perché ogni processo ha la propria coda di messaggi e viene schedulato dal runtime.
- Riconoscere la concorrenza a messaggi come modello di errore, non solo di prestazioni.

## Moduli, funzioni e sintassi

Un file `.erl` è un modulo, il cui nome deve corrispondere a quello del file. Le funzioni sono dichiarate con `-export` per essere visibili dall'esterno; quelle non esportate sono private. In Erlang **le clausole sono separate dalla virgola e la definizione si chiude con un punto**: confonderli è un errore frequente dei primi giorni.

```erlang
-module(saluti).
-export([benvenuto/1, totale/1, leggi/1]).

%% una funzione può avere più clausole: si prova la prima che combacia
benvenuto(nome) -> io:format("Ciao ~s~n", [nome]).

totale([]) -> 0;                        %% virgola: altra clausola della stessa funzione
totale([_ | Coda]) -> 1 + totale(Coda). %% punto: fine della definizione

%% le mappe si destrutturano con := sui campi obbligatori
leggi(#{nome := Nome}) -> {ok, Nome};
leggi(_) -> {errore, campo_mancante}.
```

Il tipo dei valori si scopre dai dati: `ciao` è un atomo, `"ciao"` è una lista di codici carattere (integer) e `<<"ciao">>` è un binario UTF-8. Il pattern `#{nome := Nome}` combacia anche se la mappa ha altri campi: è il modo idiomatico per leggere una chiave obbligatoria.

| Costrutto | Esempio | Uso tipico |
| --- | --- | --- |
| Atomo | `ok`, `errore` | etichette, risultati, nomi |
| Tupla | `{ok, 42}`, `{errore, file_assente}` | risultati e record leggeri |
| Lista | `[1, 2, 3]`, `[Testa \| Coda]` | sequenze, stringhe |
| Mappa | `#{nome => "Ada", eta => 36}` | configurazioni, dati dinamici |
| Binario | `<<255, 0, 16>>` | protocolli, file, rete |

## Pattern matching e controllo di flusso

Erlang non ha il concetto di assegnazione: `X = 5` è un **match**. Se `X` è già legata, il match riesce solo se il valore coincide, altrimenti produce `badmatch`. Questa rigidità semplifica l'analisi del codice, perché un nome legato non cambia più significato.

```erlang
-module(scelta).
-export([stato/1]).

stato(Codice) when is_integer(Codice), Codice >= 500 -> server_errore;
stato(404) -> non_trovato;
stato(_) -> altro.

classifica(N) ->
    case N of
        X when X > 10 -> grande;   %% le guard filtrano senza sollevare
        _ -> piccolo
    end.
```

Le **guard** (`when`) sono espressioni limitate e pure: possono usare operatori di confronto, costrutti come `is_integer/1` e le BIF consentite, ma non funzioni arbitrarie. `case` segue la stessa regola delle clausole: il primo ramo che combacia vince, e l'ordine conta. Le variabili con underscore (`_Coda`) silenziano il warning di inutilizzata, mentre `_` accetta qualsiasi cosa senza legarla.

```erlang
-module(somma).
-export([somma/1]).

somma(Lista) ->
    lists:foldl(fun(X, Acc) -> X + Acc end, 0, Lista).
```

Per iterare si usano funzioni di ordine superiore (`lists:foldl`, `lists:map`, `lists:filter`): non esistono cicli `for` e `while`, e la ricorsione è il modo di esprimere le iterazioni che le librerie non coprono.

## Processi, messaggi e runtime

Un processo Erlang non è un thread del sistema operativo: è un'entità leggera gestita dalla macchina virtuale BEAM, con il proprio heap e la propria coda di messaggi. Se ne possono avviare milioni, e ogni processo ha un PID. Lo scheduling è preemptive, così un ciclo lungo non blocca gli altri processi per troppo tempo.

| Operazione | Sintassi | Effetto |
| --- | --- | --- |
| Avvio | `spawn(Fun)` | crea un processo, ritorna il PID |
| Invio | `Pid ! Messaggio` | accoda il messaggio, non attende |
| Ricezione | `receive ... end` | preleva il primo messaggio che combacia |
| Collegamento | `link(Pid)` | propaga gli usciti tra processi |

```erlang
-module(ping).
-export([avvia/0]).

avvia() ->
    Pid = spawn(fun() ->
        receive
            {ping, Da} -> Da ! {pong, self()}
        end
    end),
    Pid ! {ping, self()},
    receive {pong, Pid} -> Pid end.
```

`receive` è selettivo: se il primo messaggio non combacia viene lasciato in coda e si prova il successivo; se nessuno combacia, il processo attende. Per questo i messaggi inutilizzati restano in coda e vanno gestiti. `self()` restituisce il PID corrente, che i processi usano per rispondere.

```bash
erl -noshell -eval 'io:format("~p~n", [ping:avvia()]), halt().'
```

Il modello di errore è la parte che conta: un processo può morire senza coinvolgere il resto, e i processi legati con `link` falliscono insieme. Comprendere questa semantica ora è necessario per arrivare ai supervisor OTP.

## Errori comuni

- **Usare `,` invece di `.` dopo l'ultima clausola**: il compilatore segnala un errore di sintassi poco comprensibile vicino alla riga successiva.
- **Ritenere che `X = 5` assegni**: se `X` è già legata, il match fallisce con `badmatch`; per riusare un nome serve un nuovo ambito.
- **Scrivere una `receive` senza timeout**: un messaggio che non arriva blocca il processo per sempre, e il bug sembra un'app che si è fermata.
- **Aggiungere clausole con guard ambigue e ordine sbagliato**: il ramo `_` cattura i casi specifici che dovevano essere gestiti prima.
- **Confondere una stringa con un atomo**: `"ok"` non è uguale a `ok`, e il match tra i due non combacia mai.

## In sintesi

Erlang si basa su un modulo per file, esportazione esplicita e pattern matching come cuore del controllo di flusso. Le variabili sono legate una volta e il match confronta invece di assegnare. I processi sono leggeri, autonomi e comunicano solo con messaggi accodati. Il runtime gestisce heaps, scheduling e isolamento degli errori, ed è su queste basi che l'ecosistema OTP costruisce la tolleranza ai guasti.

## Fonti

- [Erlang: Getting Started](https://www.erlang.org/doc/system/getting_started.html), primo modulo e uso della shell.
- [Erlang: Expressions](https://www.erlang.org/doc/system/expressions.html), match, clausole, guard e `case`.
- [Erlang: Data Types](https://www.erlang.org/doc/system/data_types.html), atomi, tuple, liste, mappe e binari.
- [Erlang: Concurrent Programming](https://www.erlang.org/doc/system/conc_prog.html), processi, messaggi e ricezione.
