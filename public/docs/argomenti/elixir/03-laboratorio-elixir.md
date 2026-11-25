In questo laboratorio costruisci `scadenze`, un piccolo programma Elixir che riceve una lista di scadenze `{nome, giorni}`, assegna a ciascuna una fascia e produce un riepilogo ordinato. L'obiettivo non è scrivere molto codice, ma farlo nel modo idiomatico: funzioni a clausole, guardie, pipeline e test `ExUnit`. Alla fine avrai un progetto `mix` vero, eseguibile da riga di comando e verificato.

## Obiettivi

- Creare un progetto `mix` con test automatici e struttura corretta.
- Distinguere le fasce con clausole e guardie invece che con `if`.
- Trasformare e aggregare dati con `Enum` in pipeline leggibili.
- Separare il modulo di dominio dal modulo d'ingresso da terminale.
- Scrivere test che coprono input validi, input anomali ed errori attesi.

## Setup del progetto

Parti da un progetto senza supervisione: non servono processi, qui si lavora su dati puri.

```bash
mix new scadenze
cd scadenze
mix test          # deve passare un test generato automaticamente
```

Il dominio sta in `lib/scadenze.ex`; l'ingresso da riga di comando può stare nello stesso file con un modulo separato, così i test non dipendono da `IO`. La regola è semplice: funzioni pure nel dominio, stampa solo nel modulo d'ingresso.

## Il modulo di dominio

Le fasce sono quattro e si decidono in ordine: scaduta, oggi, imminente entro sette giorni, futura. Le clausole con guardia rendono la regola visibile e il caso non gestito fallisce con un errore chiaro.

```elixir
defmodule Scadenze do
  @moduledoc "Classifica scadenze espresse in giorni."

  @imminente 7

  # clausole in ordine: vince la prima che corrisponde
  def fascia(giorni) when giorni < 0, do: :scaduta
  def fascia(0), do: :oggi
  def fascia(giorni) when giorni <= @imminente, do: :imminente
  def fascia(giorni) when is_integer(giorni), do: :futura

  def classifica(scadenze) do
    scadenze
    |> Enum.map(fn {nome, giorni} -> %{nome: nome, giorni: giorni, fascia: fascia(giorni)} end)
    |> Enum.sort_by(& &1.giorni)
  end

  def riepilogo(scadenze) do
    scadenze
    |> Enum.frequencies_by(fn {_nome, giorni} -> fascia(giorni) end)
    |> Enum.sort_by(fn {fascia, _conteggio} -> ordine_fascia(fascia) end)
  end

  defp ordine_fascia(:scaduta), do: 0
  defp ordine_fascia(:oggi), do: 1
  defp ordine_fascia(:imminente), do: 2
  defp ordine_fascia(:futura), do: 3
end
```

`@imminente` è un attributo di modulo: una costante usata durante la compilazione. `Enum.frequencies_by` aggrega in una mappa, e la sort successiva riporta le fasce in un ordine deterministico, che è ciò che vorrai mostrare. Attenzione a una cosa: `Enum.frequencies_by` conta solo le fasce presenti, quindi il riepilogo non contiene zeri. Se ti serve una tabella completa, parti da una lista fissa di fasce.

## Ingresso da terminale

Le poche funzioni qui sotto bastano per un eseguibile sincero: legge una riga per volta dal file passato come primo argomento, scarta le righe vuote e stampa. Gli errori vanno su stderr e l'exit code deve essere diverso da zero se il file manca.

```elixir
defmodule Scadenze.CLI do
  def main([percorso]) do
    case File.read(percorso) do
      {:ok, contenuto} ->
        contenuto
        |> String.split("\n", trim: true)
        |> Enum.map(&parse_riga(String.split(&1, ";")))
        |> Enum.reject(&is_nil/1)
        |> Scadenze.classifica()
        |> Enum.each(fn r -> IO.puts("#{r.nome}\t#{r.giorni}\t#{r.fascia}") end)

      {:error, motivo} ->
        IO.puts(:stderr, "scadenze: impossibile leggere #{percorso} (#{motivo})")
        System.halt(1)
    end
  end

  def main(_), do: System.halt(2)

  defp parse_riga([nome, giorni]) do
    case Integer.parse(String.trim(giorni)) do
      {n, ""} -> {String.trim(nome), n}
      _ -> nil
    end
  end

  defp parse_riga(_), do: nil
end
```

Uso: `mix run -e 'Scadenze.CLI.main(["/tmp/scadenze.txt"])'`, che compila il progetto e lancia la funzione. Un file di prova:

```text
affitto;3
rinnovo-dominio;-2
corso;30
```

L'output ordinato per giorni colloca `rinnovo-dominio` in cima con fascia `:scaduta`. `Integer.parse` con il controllo `""` scarta valori come `3x` invece di accettarli in silenzio, e le righe malformate vengono saltate: è una scelta da documentare, non da subire.

## Test e rifiniture

I test devono coprire le quattro fasce, l'ordinamento e il caso anomalo. `assert_raise` verifica che un input non intero fallisca con `FunctionClauseError` invece di restituire una fascia inventata.

```elixir
defmodule ScadenzeTest do
  use ExUnit.Case, async: true

  test "le quattro fasce" do
    assert Scadenze.fascia(-1) == :scaduta
    assert Scadenze.fascia(0) == :oggi
    assert Scadenze.fascia(7) == :imminente
    assert Scadenze.fascia(8) == :futura
  end

  test "classifica ordina per giorni" do
    esito = Scadenze.classifica([{"b", 10}, {"a", -1}])
    assert Enum.map(esito, & &1.nome) == ["a", "b"]
  end

  test "un non intero non produce una fascia" do
    assert_raise FunctionClauseError, fn -> Scadenze.fascia("x") end
  end
end
```

Esegui `mix format` e `mix test`: la formattazione è parte del contratto nel progetto, non un gusto personale.

## Esercizi

1. Completa il riepilogo includendo anche le fasce con conteggio zero, in ordine fisso.
2. Gestisci `giorni` oltre il limite di `@imminente` con una quinta fascia `:lontana`.
3. Rendi `parse_riga/1` tollerante a righe con spazi attorno al `;`.
4. Aggiungi una funzione che restitua solo le scadenze con fascia `:scaduta`.
5. Fai in modo che l'ingresso accetti più file e unisca i risultati.
6. Scrivi un test che verifichi l'exit code 2 quando gli argomenti mancano.

<details>
<summary>Soluzione</summary>

1. Costruisci la mappa con i conteggi, poi `Enum.map([:scaduta, :oggi, :imminente, :futura], fn f -> {f, Map.get(mappa, f, 0)} end)`: l'ordine è esplicito e gli zeri sono legittimi.

2. Aggiungi in fondo `def fascia(giorni) when is_integer(giorni), do: :lontana` e aggiorna `ordine_fascia/1` con `4`: le clausole si leggono in ordine, quindi la più specifica va prima.

3. Sostituisci `String.split(&1, ";")` con una funzione che fa `String.split(riga, ";") |> Enum.map(&String.trim/1)` prima del match: il parse resta nel dominio dei dati.

4. `scadenze |> Enum.filter(fn {_n, g} -> fascia(g) == :scaduta end)` restituisce una nuova lista, senza modificare quella originale.

5. `def main(percorsi) when is_list(percorsi)` che mappa ogni percorso su `File.read/1`, scarta gli `{:error, _}` con un messaggio su stderr ed esce con 1 se nessun file è leggibile, altrimenti unisce le liste e classifica.

6. `assert System.halt/1` non è testabile direttamente: estrai la logica in `esegui(percorsi) :: :ok | {:error, term}`, testala, e lascia a `main/1` il solo compito di convertire il risultato in exit code con `System.halt`.

</details>

## Errori comuni

- **Usare `if` annidati al posto delle clausole**: le guardie rendono visibile l'ordine delle regole e il caso mancante.
- **Parsare con `String.to_integer` senza gestire l'errore**: su input sporco lancia un'eccezione e interrompe tutta la riga di comando.
- **Stampare dentro le funzioni di dominio**: i test diventano fragili e il riuso del modulo è impossibile.
- **Lasciare il riepilogo con le sole fasce presenti**: l'ordine e la completezza vanno decisi, non dedotti dalla mappa.
- **Tornare `nil` per gli errori senza documentarlo**: meglio un risultato esplicito o un'eccezione, come fa `Integer.parse`.

## In sintesi

Un progetto Elixir parte da `mix new` e mantiene separati dominio puro e ingresso da terminale. Le clausole con guardie esprimono le regole in ordine e fanno fallire gli input inattesi. `Enum` in pipeline trasforma, filtra e aggrega liste, mentre `ExUnit` protegge le fasce e l'ordinamento. Stampa su stdout, errori su stderr ed exit code distinti rendono il programma utilizzabile dentro uno script.

## Fonti

- [Introduction to Mix](https://hexdocs.pm/elixir/introduction-to-mix.html): creazione del progetto e primo test con Mix.
- [Patterns and guards](https://hexdocs.pm/elixir/patterns-and-guards.html): regole delle guardie e clausole di funzione.
- [Enum](https://hexdocs.pm/elixir/Enum.html): `map`, `sort_by`, `frequencies_by` e `filter`.
- [String](https://hexdocs.pm/elixir/String.html): `split`, `trim` e gestione delle stringhe UTF-8.
