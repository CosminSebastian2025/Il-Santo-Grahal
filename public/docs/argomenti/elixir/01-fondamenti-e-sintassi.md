Elixir è un linguaggio funzionale dinamico che gira sulla macchina virtuale Erlang (BEAM) e ne eredita la concorrenza leggera e la tolleranza ai guasti. A differenza di molti linguaggi moderni non nasce con lo scopo di essere "il più veloce": nasce per gestire tanti processi isolati che comunicano a messaggi e continuano a vivere anche quando qualcosa va storto. In questa lezione vedi la sintassi essenziale, l'immutabilità dei dati, il pattern matching e il modo in cui un file Elixir viene compilato ed eseguito.

## Obiettivi

- Riconoscere i tipi di base e distinguere valori immutabili da variabili riassegnabili.
- Usare il pattern matching come strumento di assegnazione e di controllo.
- Scrivere funzioni con clausole e guardie invece di lunghi `if`.
- Comprendere la pipeline `|>` e le strutture `Enum` e `Stream`.
- Spiegare come uno script viene compilato in bytecode e caricato nella BEAM.

## Tipi, moduli e immutabilità

Elixir ha numeri interi e in virgola mobile, atomi, stringhe UTF-8, liste, tuple, mappe e `nil`/`true`/`false` come atomi speciali. Tutti i valori sono immutabili, ma un binding può essere riassegnato a un nuovo valore: le strutture vecchie restano intatte.

```elixir
# valori di base: nessun tipo viene dichiarato, la forma dice tutto
eta = 42                 # integer, senza limite di dimensione
prezzo = 19.90           # float
nome = "Ada"             # binary UTF-8
stato = :attivo          # atomo: costante nominata, confrontabile in O(1)
lista = [1, 2, 3]        # linked list, prepend economico
tupla = {:ok, 42}        # tupla: accesso per posizione, dimensione fissa
mappa = %{nome: "Ada"}   # mappa con chiavi atomo

# le strutture non cambiano: si producono nuove versioni
altra = [0 | lista]      # altra è [0, 1, 2, 3]; lista resta [1, 2, 3]
IO.inspect({lista, altra})
```

Le **liste** sono linked list: aggiungere in testa costa un passo, accedere all'ennesimo elemento costa proporzionale alla posizione. Le **tuple** hanno dimensione fissa e sono la scelta tipica per i ritorni multipli come `{:ok, valore}` o `{:error, motivo}`. Le **mappe** sono hash map immutabili che condividono la struttura tra versioni, quindi aggiornare un campo di una grande mappa è economico.

## Pattern matching: `=` non è assegnazione

Il segno `=` confronta i due lati e lega le variabili a sinistra ai valori corrispondenti a destra. Se la forma non combacia, il programma solleva `MatchError`: l'errore arriva subito, non dopo tre chiamate.

```elixir
{:ok, utente} = {:ok, "ada"}   # utente vale "ada"
%{nome: n} = %{nome: "Ada", eta: 42}   # n vale "Ada", le altre chiavi sono ignorate
[primo, secondo | resto] = [1, 2, 3]   # primo=1, secondo=2, resto=[3]

# il valore atomo :error non coincide con la forma {:ok, _}: il match fallisce
{:ok, x} = :error
# ** (MatchError) no match of right hand side value: :error

# il pin operator impedisce il rebinding: confronta col valore esistente
atteso = 3
^atteso = 3
```

Il pin `^` mostra che `=` non "sovrascrive" sempre: con il pin la variabile diventa un valore da confrontare. Lo stesso meccanismo compare nelle clausole e in `case`, dove ogni pattern è una condizione strutturale.

## Funzioni, clausole e guardie

Le funzioni si raggruppano in moduli. Una funzione può avere più clausole con lo stesso nome e la stessa arità: Elixir prova dalla prima e usa la prima che combacia. Le **guardie** aggiungono condizioni sui valori ma usano solo espressioni limitate, senza chiamate arbitrarie.

```elixir
defmodule Mie.Scadenze do
  @moduledoc "Classifica un giorno in base alla distanza dalla scadenza."

  def clasifica(giorni) when giorni < 0, do: :scaduta
  def clasifica(0), do: :oggi
  def clasifica(giorni) when is_integer(giorni), do: :futura
  # senza clausola corrispondente: FunctionClauseError

  # pipeline: il primo argomento passa da una funzione all'altra
  def nomi(utenti) do
    utenti
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.sort()
  end
end
```

`&String.trim/1` è una cattura di arity: passa la funzione a `Enum.map` senza definire un blocco. `Enum` consuma la collezione e restituisce una lista, `Stream` costruisce una catena pigra: la differenza conta quando i dati sono grandi o infiniti.

| Struttura | Valutazione | Uso tipico |
| --- | --- | --- |
| `def` / `defp` | compilata nel modulo | API pubblica e helper privati |
| `case` | confronto con più pattern | reagire a forme diverse di un risultato |
| `cond` | prima condizione vera | regole con espressioni booleane |
| `with` | sequenza di match annidati | catene di `{:ok, _}` / `{:error, _}` |

## Modello di esecuzione

Elixir non gira su un interprete propriamente detto: il compilatore produce file `.beam` con bytecode per la BEAM, che li carica come moduli. Ogni modulo compilato espone le funzioni pubbliche, mentre `defp` resta privato. Il processo che esegue il codice è esso stesso un processo Erlang, quindi mettere in pausa o far fallire uno script non blocca gli altri.

```bash
elixir -e 'IO.puts(1 + 2)'          # eval: compila ed esegue un'espressione
elixir script.exs                   # compila il file e lo esegue
iex                                 # REPL: prompt interattivo con auto-completamento
elixirc modulo.ex                   # produce Elixir.Modulo.beam
```

Nei progetti veri il compilatore invocato a mano è raro: `mix` orchestra compilazione, test e dipendenze. Il codice gira sempre dentro processi: anche un calcolo puro vive in un contesto con errore isolato, ed è questa base che rende naturale passare a `Task` e `GenServer`.

## Errori comuni

- **Usare `=` come assegnazione imperativa**: `x = x + 1` funziona, ma scrivere `^x = 5` quando `x` non è 5 fallisce: il pin va usato consapevolmente.
- **Modificare una lista nel posto**: le liste non hanno operazioni mutabili; si costruiscono nuove liste o si usano altri tipi.
- **Mettere chiamate arbitrarie nelle guardie**: funzioni personalizzate non sono ammesse, serve riscrivere la condizione con funzioni di `Kernel` o spostarla nel corpo.
- **Dimenticare la clausola di default**: una funzione con sole clausole guardate fallisce con `FunctionClauseError` sugli input inattesi.
- **Confondere `Enum` e `Stream`**: `Stream` è pigro, quindi nessun lavoro avviene finché non lo consumi con `Enum` o `Stream.run`.

## In sintesi

Elixir combina valori immutabili, pattern matching e funzioni a clausole in un linguaggio compatto. Il segno `=` confronta forme e lega variabili, mentre il pin `^` esprime il confronto con un valore esistente. Le guardie e le clausole sostituiscono gli `if` concatenati e rendono esplicito il caso non gestito. Il codice compila in bytecode `.beam` ed esegue dentro processi della BEAM, la base della concorrenza del linguaggio.

## Fonti

- [Introduction to Mix](https://hexdocs.pm/elixir/introduction-to-mix.html): primo progetto, `iex -S mix` e struttura delle cartelle.
- [Pattern matching](https://hexdocs.pm/elixir/pattern-matching.html): capitolo ufficiale su binding, pin e match nelle strutture.
- [Patterns and guards](https://hexdocs.pm/elixir/patterns-and-guards.html): clausole di funzioni, semantica delle guardie e casi d'uso.
- [Recursion](https://hexdocs.pm/elixir/recursion.html): come le funzioni ricorsive sostituiscono i cicli imperativi.
