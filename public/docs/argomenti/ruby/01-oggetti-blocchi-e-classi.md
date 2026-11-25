Ruby è un linguaggio interpretato e orientato agli oggetti fino in fondo: ogni valore è un oggetto e ogni metodo che chiami appartiene a una classe. La sintassi è compatta, ma il modello di esecuzione è rigoroso e va conosciuto prima di scrivere codice che sembra magico. In questa lezione impari gli oggetti di base, i blocchi e il ciclo di vita del programma.

## Obiettivi

- Eseguire Ruby con `irb`, con `ruby -e` e da file.
- Riconoscere che ogni valore è un oggetto e leggere i metodi delle classi standard.
- Usare blocchi e `yield` per pianificare e combinare operazioni.
- Scrivere classi con `attr_accessor`, visibilità e metodi di istanza.
- Gestire eccezioni con `begin`/`rescue` e usare le convenzioni di naming.

## Oggetti e metodi di base

Ruby non distingue tra primitivi e oggetti: `42` è un'istanza di `Integer`, `"ciao"` di `String`, `nil` di `NilClass`. Si chiama quasi tutto con il punto, e le parentesi sono opzionali finché la chiamata resta priva di ambiguità. I metodi di `Kernel` come `puts` e `p` sono invocabili come funzioni perché `main`, l'oggetto di primo livello, eredita da `Object`.

```bash
ruby -v                       # versione dell'interprete
ruby -e 'puts 2 ** 10'        # esegue un frammento
irb                           # console interattiva
ruby app.rb                   # esegue un file
```

`irb` valuta un'espressione, ne mostra il valore e conserva lo stato della sessione. Un file invece è un programma eseguito dall'alto: le `def` creano metodi senza eseguirli, quindi conta l'ordine delle chiamate.

```ruby
x = 7
puts x.class                 # Integer
puts "abc".upcase            # ABC
puts [3, 1, 2].sort.join(",") # 1,2,3
puts (1..5).sum              # 15
```

Le stringhe sono mutabili: `<<` modifica l'oggetto, `+` ne crea uno nuovo.

## Valori, classi e blocchi

Un blocco è codice passato a un metodo, delimitato da `do...end` o da `{...}`. Il metodo lo invoca con `yield` oppure lo riceve come `Proc` con `&blocco`: è il motivo per cui `each`, `map` e `select` funzionano su quasi ogni collezione.

```ruby
def ripeti(n)
  n.times { |i| yield i }        # blocca fino al termine
end

ripeti(3) { |i| puts "passo #{i}" }

def saluta(nome)
  messaggio = block_given? ? yield(nome) : "Ciao #{nome}"
  messaggio
end

saluta("Ada") { |n| "Buongiorno, #{n}" }  # "Buongiorno, Ada"
```

| Concetto | Sintassi | Uso tipico |
| --- | --- | --- |
| blocco | `{ |x| ... }` o `do |x| ... end` | iterazioni e callback |
| simbolo | `:nome` | chiavi di hash, nomi di metodo |
| range | `1..5` (incluso), `1...5` (escluso) | intervalli e affettamento |
| hash | `{ nome: "Ada", eta: 36 }` | dati strutturati per chiave |

Un simbolo è un nome immutabile, ottimo come chiave. `h[:eta]` restituisce `nil` se la chiave manca, mentre `fetch` solleva `KeyError`: è quasi sempre la scelta corretta per un campo obbligatorio.

## Classi, visibilità ed eccezioni

Le classi aprono con `class`, gli attributi si dichiarano con `attr_reader`, `attr_writer` o `attr_accessor`, e l'inizializzazione avviene in `initialize`. `private` rende privato tutto ciò che segue: l'ordine nel file ha effetti reali.

```ruby
class Conto
  attr_reader :saldo          # metodi di sola lettura
  attr_accessor :intestatario

  def initialize(intestatario, saldo = 0)
    @intestatario = intestatario
    @saldo = saldo
  end

  def versa(importo)
    raise ArgumentError, "importo non positivo" if importo <= 0
    @saldo += importo
    self                       # supporta il chaining
  end
end

conto = Conto.new("Ada", 100).versa(50)
conto.saldo                    # 150
```

Le eccezioni si catturano con `rescue`; il nome della classe catturata decide quali errori trattare. `ensure` esegue sempre, come il `finally` di altri linguaggi, ed è il posto giusto per chiudere risorse. Un metodo che vuole segnalare un errore lo solleva con `raise` e una classe adeguata, non restituisce `nil` sperando che il chiamante se ne accorga.

```ruby
begin
  conto.versa(-5)
rescue ArgumentError => e
  puts "rifiutato: #{e.message}"
ensure
  puts "fine operazione"
end
```

Le convenzioni: classi in `CamelCase`, metodi in `snake_case`, costanti in `MAIUSCOLO`, predicati con `?`, metodi mutanti con `!`.

## Errori comuni

- **Usare `attr_accessor` per tutto**: esporre la scrittura di stati interni rende impossibile validare le invarianti.
- **Dimenticare che le stringhe sono mutabili**: `a = b` più `a << "x"` modifica anche `b`.
- **Leggere un hash con `[]` per un campo obbligatorio**: `nil` silenzioso e errore lontano dalla causa.
- **Avvolgere il codice in `rescue Exception`**: cattura interruzioni di sistema e maschera bug.
- **Mettere `private` in cima alla classe**: anche i metodi pubblici diventano privati.

## In sintesi

Ruby tratta ogni valore come oggetto e ogni chiamata come messaggio. I blocchi sono il meccanismo di astrazione più importante e spiegano l'eleganza delle collezioni. Le classi dichiarano attributi con `attr_*` e separano pubblico e privato con una parola chiave. Le eccezioni segnalano i fallimenti e `ensure` garantisce la pulizia.

## Fonti

- [Ruby Documentation](https://www.ruby-lang.org/en/documentation/): hub ufficiale verso guide e riferimenti.
- [Ruby in Twenty Minutes](https://www.ruby-lang.org/en/documentation/quickstart/): prima introduzione interattiva del linguaggio.
- [Ruby Documentation - core classes](https://docs.ruby-lang.org/en/): riferimento delle classi standard.
- [Ruby From Other Languages](https://www.ruby-lang.org/en/documentation/ruby-from-other-languages/): mappa dei concetti per chi arriva da altri linguaggi.
