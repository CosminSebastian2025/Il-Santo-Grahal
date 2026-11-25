Questo laboratorio costruisce `job_queue`, un servizio che accetta lavori, li esegue in processi dedicati e tiene un contatore di completati. È l'occasione per mettere in pratica ciò che distingue Erlang: processi come unità di stato, messaggi come interfaccia e un supervisor che riparte dopo un crash intenzionale. Nessuna libreria esterna, solo OTP standard.

## Obiettivi

- Progettare una `gen_server` che tiene una coda di lavori e risponde ai clienti.
- Avviare il servizio sotto un supervisor con strategia `one_for_one`.
- Verificare il comportamento con `eunit` e messaggi controllati.
- Provocare un crash e osservare il riavvio controllato.

## Contratto del servizio

| Operazione | Messaggio | Risposta | Note |
| --- | --- | --- | --- |
| `accoda/1` | `{accoda, Fun}` | `{ok, Ref}` | sincrona, senza attendere il lavoro |
| `stato/0` | `stato` | `{in_coda, N, completati, M}` | sincrona |
| `ferma/0` | `stop` | `ok` | arresto controllato |
| coda piena | `{accoda, _}` | `{errore, piena}` | limite configurabile |

Lo stato del servizio è una tupla `{Coda, Completati, Limite}`: non c'è un oggetto condiviso, solo valori passati avanti e indietro. Restituire un riferimento permette al client di correlare l'esito.

## Il servizio e i worker

Il servizio accoda funzioni e le lancia in un processo effimero per ogni lavoro; quando un lavoro finisce il servizio conta l'evento e avvia il successivo. La logica resta seriale e senza race condition, mentre l'esecuzione è distribuita sui processi.

```erlang
-module(job_queue).
-behaviour(gen_server).
-export([start_link/1, accoda/1, stato/0, ferma/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

start_link(Limite) -> gen_server:start_link({local, ?MODULE}, ?MODULE, Limite, []).

accoda(Fun) -> gen_server:call(?MODULE, {accoda, Fun}).
stato() -> gen_server:call(?MODULE, stato).
ferma() -> gen_server:stop(?MODULE).

init(Limite) -> {ok, {[], 0, Limite}}.

handle_call({accoda, _}, _Da, {Coda, C, L}) when length(Coda) >= L ->
    {reply, {errore, piena}, {Coda, C, L}};
handle_call({accoda, Fun}, _Da, {Coda, C, L}) ->
    Ref = make_ref(),
    {reply, {ok, Ref}, {Coda ++ [{Ref, Fun}], C, L}};
handle_call(stato, _Da, {Coda, C, L}) ->
    {reply, {in_coda, length(Coda), completati, C}, {Coda, C, L}}.

%% un lavoro è finito: conta e lancia subito il successivo
handle_info({fatto, _Ref}, {[], C, L}) -> {noreply, {[], C + 1, L}};
handle_info({fatto, _Ref}, {[H | T], C, L}) ->
    spawn_job(H),
    {noreply, {T, C + 1, L}};
handle_info(_, Stato) -> {noreply, Stato}.

terminate(_Motivo, _Stato) -> ok.

spawn_job({Ref, Fun}) ->  %% worker effimero: esegue e avvisa il servizio
    spawn(fun() -> Fun(), ?MODULE ! {fatto, Ref} end).
```

`make_ref()` produce un riferimento unico e opaco: è il modo sicuro per correlare messaggi senza inventare numeri progressivi. Il worker è effimero e vive quanto il singolo lavoro: `spawn` non crea un legame con il servizio, quindi un lavoro che esplode non trascina giù la coda. `Coda ++ [...]` gira in tempo lineare, un limite da annotare: per code lunghe servono due liste.

## Supervisione e verifica

Il supervisor avvia il servizio con strategia `one_for_one`. Nella prima versione i worker sono effimeri; un pool stabile è l'estensione naturale, perché limita la concorrenza invece di lasciarla crescere con la coda.

```erlang
-module(job_queue_sup).
-behaviour(supervisor).
-export([start_link/1, init/1]).

start_link(Limite) -> supervisor:start_link({local, ?MODULE}, ?MODULE, Limite).

init(Limite) ->
    Figli = [#{id => job_queue,
               start => {job_queue, start_link, [Limite]},
               restart => permanent,
               shutdown => 5000}],
    {ok, {#{strategy => one_for_one, intensity => 5, period => 10}, Figli}}.
```

```erlang
%% test/job_queue_tests.erl
-module(job_queue_tests).
-include_lib("eunit/include/eunit.hrl").

accoda_e_completa_test_() ->
    {setup,
     fun() -> {ok, _} = job_queue:start_link(3) end,
     fun(_) -> job_queue:ferma() end,
     fun(_) ->
         {ok, Ref} = job_queue:accoda(fun() -> ok end),
         timer:sleep(20),
         ?assertMatch({in_coda, 0, completati, 1}, job_queue:stato()),
         ?assert(is_reference(Ref))
     end}.
```

`{setup, Setup, Cleanup, Test}` incapsula avvio e chiusura: senza, i test lasciano processi registrati con lo stesso nome e il secondo fallisce. Il `timer:sleep` è un compromesso didattico: in un test serio si aspetta un messaggio.

```bash
rebar3 eunit
erl -noshell -pa _build/default/lib/job_queue/ebin \
  -eval 'job_queue_sup:start_link(5), io:format("~p~n", [job_queue:stato()]), halt().'
```

## Esercizi

1. Rendi il limite di coda obbligatorio all'avvio e fai fallire l'avvio se non è un intero positivo.
2. Aggiungi `svuota/0` che scarta i lavori in coda e restituisce quanti ne ha scartati.
3. Fai fallire intenzionalmente `job_queue` con `erlang:error/1` e verifica che il supervisor lo riavvii.
4. Sostituisci `Coda ++ [...]` con due liste (ingresso e uscita) per avere accodamento in tempo costante.
5. Scrivi un test che accoda oltre il limite e verifica `{errore, piena}`.
6. Aggiungi un `handle_cast({accoda, ...})` asincrono e spiega cosa perde il client.

<details>
<summary>Soluzione</summary>

1. `init(Limite)` ha una clausola `init(L) when is_integer(L), L > 0 -> {ok, {[], 0, L}}` e una seconda con `{stop, limite_non_valido}`, cosi' `supervisor:start_link` fallisce subito con un motivo leggibile.

2. `handle_call(svuota, _, {Coda, C, L}) -> {reply, length(Coda), {[], C, L}}`; i riferimenti scartati non generano messaggi `{fatto, _}`, quindi il contatore dei completati non cambia.

3. Un `handle_cast(crash)` che chiama `erlang:error(crash)` fa terminare il servizio; dopo `timer:sleep(100)` la chiamata `job_queue:stato()` deve rispondere, perche' il supervisor ha riavviato il figlio e liberato il nome registrato.

4. Si tiene `{In, Out}`: l'accodamento diventa `[Item | In]` e la lettura usa `Out`; quando `Out` è vuota si inverte `In` una volta sola, con costo ammortizzato costante.

5. Con limite 1 si accoda un lavoro che dorme, poi un secondo: la seconda chiamata riceve `{errore, piena}`, perche' il primo lavoro non ha ancora liberato la coda.

6. `gen_server:cast` non ha risposta: il client non sa se il lavoro è stato escluso per coda piena. Per conservare la conferma serve l'API sincrona basata su `call`.

</details>

## Errori comuni

- **Fare stato con attributi del modulo**: `-define` e `-record` descrivono valori, non contengono stato: quello passa per i valori di ritorno.
- **Bloccare `handle_call` con un lavoro lungo**: le richieste successive aspettano e la latenza esplode.
- **Usare `timer:sleep` come sincronizzazione nei test**: il test passa localmente e fallisce in CI sotto carico.
- **Lasciare il servizio registrato col nome di modulo nei test**: il secondo avvio fallisce e i test non sono isolati.
- **Rispondere con `noreply` a una `call`**: il client resta in attesa fino al timeout invece di ricevere un errore chiaro.

## In sintesi

Il laboratorio mette insieme `gen_server`, worker effimeri e supervisor. La coda è uno stato immutabile che attraversa le callbacks, e i riferimenti correlano le risposte. La supervisione trasforma un crash in un evento normale, purché i test simulino anche il fallimento. Il limite vero del prototipo è il costo di accodamento, che un design a due liste risolve.

## Fonti

- [gen_server Concepts](https://www.erlang.org/doc/system/gen_server_concepts.html), riferimento ufficiale delle callback usate nel laboratorio.
- [EUnit User's Guide](https://www.erlang.org/doc/apps/eunit/chapter.html), fixture `setup`, `assertMatch` e scrittura dei test.
- [Supervisor Principles](https://www.erlang.org/doc/system/sup_princ.html), strategia e intensità dei riavvii.
- [Erlang: Module erlang](https://www.erlang.org/doc/man/erlang.html), `make_ref`, `spawn` e `error` con semantica ufficiale.
