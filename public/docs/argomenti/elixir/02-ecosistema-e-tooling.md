Elixir senza il suo ecosistema sarebbe un linguaggio didattico: quello che lo rende produttivo è `mix`, il sistema di build che gestisce progetti, dipendenze e task, insieme a `hex` per i pacchetti e a `ExUnit` per i test. Attorno a queste basi sono cresciute librerie come Ecto per l'accesso ai database e Phoenix per il web. Qui vedi come si usa lo strumento prima del framework, quali convenzioni rendono un progetto leggibile e in quali sistemi reali Elixir sta dimostrando il suo valore.

## Obiettivi

- Creare e strutturare un progetto con `mix new` e riconoscere dove mettere codice e test.
- Aggiungere dipendenze da Hex e capire cosa finisce in `mix.lock`.
- Scrivere test con `ExUnit` usando `assert` e `assert_raise` sui casi significativi.
- Collocare Ecto e Phoenix senza confonderli con il linguaggio.
- Valutare casi d'uso reali in cui la BEAM conviene davvero.

## Mix: il progetto come unità

`mix new nome` genera un'applicazione OTP con una struttura fissa: `lib/` per il codice compilabile, `test/` per i test, `mix.exs` come manifest. Ogni cartella ha un significato, e rispettarlo evita configurazioni manuali.

```text
mia_app/
  mix.exs          # nome, versione, elixir richiesto, dipendenze
  lib/             # codice compilato nei moduli .beam
    mia_app.ex
  test/            # test ExUnit, uno specchio delle strutture in lib/
    test_helper.exs
    mia_app_test.exs
  _build/          # output della compilazione (da ignorare in git)
  deps/            # dipendenze scaricate (da ignorare in git)
  mix.lock         # versioni esatte delle dipendenze (da versionare)
```

```bash
mix new demo --sup     # con albero di supervisione già pronto
cd demo
mix test               # compila e lancia tutti i test
mix deps.get           # scarica le dipendenze dichiarate
mix format             # formatta secondo .formatter.exs
mix help               # elenco dei task disponibili
```

I task sono comandi estendibili: il nome `mix ecto.migrate` dice già che è un task del pacchetto Ecto, non del linguaggio. Questa convenzione permette a ogni libreria di aggiungere comandi senza creare script sparsi.

## Dipendenze, Hex e test

Le dipendenze si dichiarano in `mix.exs`, si scaricano da Hex e si bloccano in `mix.lock`. Il lock contiene hash delle versioni risolte: due sviluppatori con lo stesso lock ottengono le stesse dipendenze, e aggiornare richiede un comando esplicito.

```elixir
# mix.exs (estratto)
defp deps do
  [
    {:jason, "~> 1.4"},        # JSON
    {:req, "~> 0.5"},          # client HTTP
    {:ex_doc, "~> 0.34", only: :dev, runtime: false}  # documentazione HTML
  ]
end
```

```bash
mix deps.get           # risolve e scarica
mix deps.update jason  # aggiorna solo una dipendenza, aggiornando il lock
mix deps.tree          # mostra chi richiede cosa
mix docs               # genera HTML ed EPUB con ExDoc
```

`ExUnit` è il framework di test integrato. I test si organizzano in moduli `*Test` con `use ExUnit.Case`; `assert` verifica pattern e uguaglianza, `assert_raise` verifica gli errori previsti. Un test che non fallisce mai per un errore reale non è un test, è una decorazione.

```elixir
defmodule MiaApp.ScadenzeTest do
  use ExUnit.Case, async: true   # test isolati possono girare in parallelo
  alias MiaApp.Scadenze

  test "una data passata risulta scaduta" do
    assert Scadenze.clasifica(-1) == :scaduta
  end

  test "input non intero solleva FunctionClauseError" do
    assert_raise FunctionClauseError, fn -> Scadenze.clasifica("x") end
  end
end
```

| Strumento | Ruolo | Comando tipico |
| --- | --- | --- |
| `mix` | build, task, test, formattazione | `mix test`, `mix compile` |
| `hex` | repository di pacchetti | `mix hex.info jason` |
| `ExUnit` | test unitari e di integrazione | `mix test --trace` |
| `ExDoc` | documentazione dai docstring | `mix docs` |
| `Ecto` | mappatura dati e query SQL | `mix ecto.migrate` |
| `Phoenix` | framework web su OTP | `mix phx.server` |

Ecto è una libreria di persistenza con *changeset*, cioè validazione e conversione esplicite prima di scrivere sul database; Phoenix è il framework HTTP costruito sopra Plug e le supervisioni di OTP. Entrambi si installano come dipendenze: il linguaggio non li include.

## Casi d'uso reali

Il punto di forza della BEAM è il numero enorme di processi leggeri con isolamento dei guasti. Questo si traduce in software di messaggistica, sistemi di pagamento, IoT e piattaforme con molte connessioni contemporanee: Erik Stenman racconta in un intervento pubblico le scelte di Klarna, che ha basato parte della propria piattaforma su Erlang/Elixir. Oggi la piattaforma di messaggistica Discord mantiene milioni di connessioni realtime parallele con la BEAM.

I casi d'uso meno adatti sono invece i carichi CPU-bound di bassa latenza: il calcolo numerico intensivo o l'elaborazione di grandi volumi di dati in memoria restano più comodi in linguaggi con compilazione nativa aggressiva. Si sceglie Elixir quando contano concorrenza, riavvio selettivo e osservabilità, non quando conta il singolo ciclo di clock.

```bash
mix new monior --sup
# dentro: un GenServer che raccoglie metriche, supervisionato da un Supervisor
# mix phx.new web --no-ecto    # endpoint HTTP senza database
```

Lo sviluppo è interattivo: `iex -S mix` apre un REPL con il progetto e le dipendenze compilate, così ogni funzione è verificabile senza scrivere un file di prova.

## Errori comuni

- **Versionare `_build/` e `deps/`**: ingrandiscono il repository e producono conflitti; `mix new` genera già la `.gitignore` corretta.
- **Aggiornare le dipendenze senza leggere il lock**: un `mix deps.update` silenzioso può cambiare molte versioni in un commit.
- **Confondere Ecto con un ORM mutabile**: i changeset separano validazione e persistenza, e le mappe restano immutabili.
- **Lancio di `mix phx.new` al posto di `mix new` per librerie**: il framework aggiunge rumore inutile a pacchetti che non servono il web.
- **Test senza `async: true` per pigrizia**: si perde il parallelismo che rende la suite rapida e non si scoprono dipendenze globali.

## In sintesi

`mix` è il centro dell'ecosistema: crea progetti, compila, gestisce dipendenze da Hex e lancia i test. Il lock delle versioni è il contratto di riproducibilità, mentre `ExUnit` rende il testing parte del flusso normale. Ecto e Phoenix sono librerie aggiuntive, non il linguaggio. Elixir eccelle dove servono molti processi isolati e sistemi che si riprendono, non dove serve il massimo throughput su un singolo core.

## Fonti

- [Introduction to Mix](https://hexdocs.pm/elixir/introduction-to-mix.html): guida ufficiale a progetto, moduli, `mix test` e dipendenze.
- [ExUnit](https://hexdocs.pm/ex_unit/ExUnit.html): documentazione del framework di test, con `async` e formattazione dei fallimenti.
- [ExUnit.Case](https://hexdocs.pm/ex_unit/ExUnit.Case.html): macro `assert`, `assert_raise`, `setup` e struttura dei test.
- [ExDoc - Mix.Tasks.Docs](https://hexdocs.pm/ex_doc/Mix.Tasks.Docs.html): generazione della documentazione dai docstring del progetto.
