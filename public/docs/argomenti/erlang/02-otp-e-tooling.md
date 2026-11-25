OTP è la ragione per cui Erlang sopravvive da decenni: i comportamenti `gen_server` e `supervisor` standardizzano il modo in cui i processi conservano stato e si riavviano dopo un guasto. Intorno a loro, rebar3 gestisce build, release e test, mentre la standard library fornisce I/O, binari e strumenti di diagnostica. In questa lezione impari come si organizza un'applicazione OTP completa.

## Obiettivi

- Riconoscere i concetti OTP: applicazione, comportamento, supervisor e supervision tree.
- Differenziare lo stato di un `gen_server` dalle variabili immutabili delle funzioni.
- Configurare un progetto con rebar3 e una release avviabile.
- Scrivere test unitari con EUnit e leggere i risultati di Common Test.
- Scegliere il livello di testing adeguato per ciascun componente.

## Gen server e comportamento

Un processo che deve ricevere richieste e ricordare uno stato ha sempre la stessa struttura: `gen_server` mette in comune il ciclo di ricezione e lascia al modulo la callback `handle_call/3`. Così ti concentri sulla logica invece che sul protocollo dei messaggi.

```erlang
-module(contatore).
-behaviour(gen_server).
-export([start_link/0, incrementa/0, valore/0]).
-export([init/1, handle_call/3, handle_cast/2]).

%% API pubblica: i dettagli dei messaggi restano privati
start_link() -> gen_server:start_link({local, ?MODULE}, ?MODULE, 0, []).
incrementa() -> gen_server:cast(?MODULE, incrementa).
valore() -> gen_server:call(?MODULE, valore).

init(Stato) -> {ok, Stato}.                      %% stato iniziale
handle_cast(incrementa, N) -> {noreply, N + 1}.  %% richiesta senza risposta
handle_call(valore, _Da, N) -> {reply, N, N}.    %% richiesta con risposta
```

`start_link` collega il server al processo chiamante: se uno dei due fallisce, l'altro riceve un segnale. `?MODULE` è una macro che espande al nome del modulo e sostituisce la stringa ripetuta. Lo stato non è una variabile modificata in loco: `handle_cast` **restituisce** uno stato nuovo, come una funzione pura.

| Callback | Quando | Risposta |
| --- | --- | --- |
| `init/1` | all'avvio | `{ok, Stato}` |
| `handle_call/3` | `gen_server:call` | `{reply, Risposta, Stato}` |
| `handle_cast/2` | `gen_server:cast` | `{noreply, Stato}` |
| `handle_info/2` | messaggi generici | `{noreply, Stato}` |
| `terminate/2` | arresto controllato | pulizia risorse |

## Supervision tree e applicazione

Un supervisor è un processo speciale che avvia altri processi e li riavvia secondo una strategia. Una `one_for_one` riavvia solo il figlio fallito, una `one_for_all` riavvia tutti i figli: la scelta dipende da quali processi hanno senso solo insieme.

```erlang
-module(contatore_sup).
-behaviour(supervisor).
-export([start_link/0, init/1]).

start_link() -> supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    Figli = [#{id => contatore,
               start => {contatore, start_link, []},
               restart => permanent,
               shutdown => 5000}],
    {ok, {#{strategy => one_for_one, intensity => 3, period => 10}, Figli}}.
```

`intensity` e `period` significano: se il supervisor riavvia più di 3 figli in 10 secondi, supera la soglia e si spegne anche lui, lasciando che sia il livello superiore a decidere. Il numero dipende dal componente: un processo che dipende da un servizio esterno tollera più riavvii di uno che rischia di corrompere dati.

## Rebar3, testing e strumenti

`rebar3` crea il progetto, compila, genera release autonome e lancia i test. La struttura `src`, `test` e `rebar.config` è lo standard dell'ecosistema.

```bash
rebar3 new release contatore
cd contatore && rebar3 compile
rebar3 shell                    # shell con il progetto caricato
rebar3 eunit                    # test unitari
rebar3 ct                       # Common Test
rebar3 release && _build/default/rel/contatore/bin/contatore console
```

EUnit verifica funzioni e moduli con asserzioni leggere; Common Test orchestra casi che avviano più nodi e processi, con setup e teardown espliciti.

| Strumento | Livello | Quando usarlo |
| --- | --- | --- |
| `eunit` | unitario | funzioni pure, callback isolate |
| `ct` | integrazione | processi, supervisione, rete |
| `rebar3 shell` | esplorazione | provare una funzione prima di testarla |
| `observer` | diagnostica | vedere processi, memoria e code live |
| `recon` | produzione | trovare code e processi patologici su nodi reali |

```erlang
%% test/contatore_tests.erl
-module(contatore_tests).
-include_lib("eunit/include/eunit.hrl").

incrementa_test() ->
    {ok, _} = contatore:start_link(),
    contatore:incrementa(),
    contatore:incrementa(),
    ?assertEqual(2, contatore:valore()).
```

I casi d'uso reali sono sistemi con molti eventi concorrenti che devono restare attivi: telecomunicazioni, messaggistica, pagamenti, trading e backend con molte connessioni persistenti. `rebar3 release` produce un pacchetto avviabile senza Erlang preinstallato, e `relx` gestisce gli upgrade a caldo dei moduli.

## Errori comuni

- **Mettere logica pesante in `handle_call`**: il server è seriale e diventa un collo di bottiglia.
- **Dimenticare `-behaviour(gen_server)`**: il compilatore non verifica le callback e il mismatch emerge a runtime.
- **Configurare `one_for_all` per componenti indipendenti**: un guasto locale riavvia anche processi sani.
- **Testare solo con `eunit` funzioni con stato globale**: il modulo passa i test e fallisce per ordine degli eventi.
- **Impostare `intensity` troppo alta**: un bug a cappio causa cicli di riavvio infiniti senza che nessuno se ne accorga.

## In sintesi

OTP trasforma la concorrenza in architettura: `gen_server` incapsula stato e messaggi, mentre i supervisor definiscono cosa sopravvive a un guasto. Rebar3 copre build, release e test, con EUnit per le funzioni e Common Test per i sistemi. `observer` e `recon` fanno parte del flusso lavorativo, non dell'eccezione. La combinazione tra comportamento standard e supervisione rende Erlang una piattaforma per sistemi che devono restare attivi.

## Fonti

- [OTP Design Principles](https://www.erlang.org/doc/system/design_principles.html), applicazioni, comportamenti e alberi di supervisione.
- [gen_server Concepts](https://www.erlang.org/doc/system/gen_server_concepts.html), ciclo di vita e callbacks del gen_server.
- [Supervisor Principles](https://www.erlang.org/doc/system/sup_princ.html), strategie e intensità dei riavvii.
- [rebar3: Getting Started](https://rebar3.org/docs/getting-started), creazione di progetti e primo ciclo di build.
