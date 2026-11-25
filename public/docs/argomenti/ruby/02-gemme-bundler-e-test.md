Un progetto Ruby vive di gemme, Bundler e test: la libreria standard copre molto, ma quasi ogni applicazione reale aggiunge dipendenze dichiarate in un `Gemfile`. Senza questa disciplina le versioni si scontrano tra macchine e i test non riproducono i bug. In questa lezione vedi come si isolano le dipendenze, come si legge un `Gemfile`, come si scrivono test con Minitest e come RSpec e RuboCop completano il ciclo di lavoro.

## Obiettivi

- Distinguere libreria standard, gemme installate e dipendenze di progetto.
- Leggere e scrivere un `Gemfile`, eseguire `bundle install` e usare il `Gemfile.lock`.
- Scrivere test con Minitest e riconoscere quando conviene RSpec.
- Usare RuboCop per lo stile e `rake` per automatizzare i compiti.
- Riconoscere gli ambiti in cui Ruby è scelto in produzione.

## Gemme, Bundler e Gemfile

Una gemma è un pacchetto distribuito su rubygems.org, con nome, versione e dipendenze proprie. `gem install` la installa globalmente, ma un progetto serio non si affida all'ordine casuale di quell'installazione: Bundler legge il `Gemfile`, risolve l'albero delle dipendenze e fissa le versioni nel `Gemfile.lock`, che va versionato.

```bash
bundle init                       # Gemfile minimo
bundle add minitest               # aggiunge e aggiorna il lock
bundle install                    # installa le versioni del lock
bundle exec rake test             # esegue con le versioni bloccate
```

```ruby
source "https://rubygems.org"

ruby "3.3.0"

gem "sinatra", "~> 4.0"          # compatibile con la 4.x
gem "rackup"

group :development, :test do
  gem "minitest", "~> 5.20"
  gem "rubocop", require: false   # strumento, non libreria da caricare
end
```

Il vincolo `~>` accetta aggiornamenti di patch e, con due cifre, di minor: `~> 4.0` include `4.1` ma non `5.0`. `bundle exec` è la regola d'oro: garantisce che il comando usi le versioni del lock e non quelle globali.

| Ambito | Comando | Effetto |
| --- | --- | --- |
| installazione | `bundle install` | installa secondo il lock |
| aggiornamento | `bundle update nome` | risolve una nuova versione |
| esecuzione | `bundle exec ...` | usa le gemme del progetto |
| verifica | `bundle check` | conferma che il lock sia soddisfatto |

## Minitest, RSpec e qualità

Minitest fa parte dell'ecosistema standard di test: classi che ereditano da `Minitest::Test` con metodi `test_*`, oppure la sintassi `describe`/`it` inclusa in `minitest/spec`. RSpec è la libreria più diffusa in ambito applicativo: linguaggio dichiarativo, matcher ricchi e una community ampia. Entrambi funzionano; la scelta dipende dalle convenzioni del progetto e dalla familiarità del team.

```ruby
require "minitest/autorun"

def parse_importo(testo)
  Integer(testo.strip)
rescue ArgumentError
  raise ArgumentError, "importo non numerico: #{testo.inspect}"
end

class ImportoTest < Minitest::Test
  def test_intero_valido
    assert_equal 42, parse_importo(" 42 ")
  end

  def test_stringa_non_numerica
    assert_raises(ArgumentError) { parse_importo("quaranta") }
  end
end
```

RuboCop applica il guide di stile della community e segnala violazioni con autocorrezione dove possibile. `rake` esegue i compiti definiti in un `Rakefile`, e una task `test` che lancia i test è il punto d'ingresso naturale per la CI.

```ruby
task default: :test

desc "Esegue i test"
task :test do
  ruby "-Itest", "test/importo_test.rb"
end
```

## Casi d'uso reali

Ruby resta forte in tre aree: applicazioni web, scripting e strumenti di sviluppo. Rails e Sinatra dominano il primo gruppo, la sintassi compatta rende rapido il secondo, e Homebrew, Vagrant e Jekyll sono scritti in Ruby. Sistemi ad alto carico come Shopify e GitHub lo usano in produzione da anni.

Alcune gemme richiedono estensioni native compilate: per questo la versione di Ruby si dichiara nel `Gemfile` e si ripete nel CI.

## Errori comuni

- **Non versionare `Gemfile.lock`**: ogni installazione può risolvere versioni diverse e i bug diventano irreproducibili.
- **Eseguire comandi senza `bundle exec`**: Rails, rake o rubocop potrebbero usare versioni globali diverse da quelle del progetto.
- **Aggiungere gemme senza gruppo**: le dipendenze di test finiscono in produzione e allungano i tempi di build.
- **Usare `gem install` come unico metodo di setup**: il progetto diventa dipendente dallo stato di quella singola macchina.
- **Ignorare gli avvisi di RuboCop in blocco**: le eccezioni silenziose nascondono problemi reali, meglio motivarle nel file di configurazione.

## In sintesi

Le gemme si dichiarano nel `Gemfile` e Bundler le rende riproducibili con il lock. `bundle exec` collega comandi e versioni corrette. Minitest è immediato, RSpec è più espressivo: entrambi verificano comportamento con asserzioni chiare. RuboCop e `rake` chiudono il ciclo, riducendo la divergenza dello stile tra chi scrive il codice.

## Fonti

- [Bundler - Gemfile](https://bundler.io/): dipendenze, gruppi e comandi di Bundler.
- [RubyGems Guides](https://guides.rubygems.org/rubygems-basics/): come funzionano gemme e repository.
- [RSpec](https://rspec.info/): documentazione ufficiale della libreria di test.
- [RuboCop](https://github.com/rubocop/rubocop): guide di stile e linting per Ruby.
