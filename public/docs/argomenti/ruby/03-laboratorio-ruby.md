In questo laboratorio costruisci `report`, uno strumento che legge un JSON di vendite, valida i record e stampa i totali per reparto con un filtro opzionale. Classi, blocchi, hash ed eccezioni confluiscono in un modulo importabile con test Minitest.

## Obiettivi

- Descrivere argomenti, formati e codici di uscita.
- Trasformare dati non fidati in oggetti validati con classi dedicate.
- Usare blocchi ed `Enumerable` per aggregare e filtrare.
- Gestire errori di file e di formato con eccezioni specifiche.
- Scrivere test Minitest per la logica e per il comportamento da riga di comando.

## Il contratto dello strumento

Ogni riga della tabella diventa un ramo del codice e un test.

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `report FILE [--reparto NOME]` | un file, filtro opzionale |
| formato | array JSON di oggetti con `reparto`, `importo` | schema minimo |
| uscita | righe `reparto  totale` su stdout | leggibile e componibile |
| record invalido | scartato e contato | un record rotto non ferma gli altri |
| file mancante o JSON illeggibile | exit 2 su stderr | uso errato |
| nessuna vendita | exit 0, output vuoto | come `grep` senza risultati |

```bash
ruby report.rb vendite.json
ruby report.rb vendite.json --reparto nord
ruby report.rb mancante.json
```

L'errore d'uso richiede una correzione, il dato scartato deve restare visibile.

## Modello e parsing

La classe `Vendita` valida nel costruttore: se un oggetto esiste, è valido. Gli importi sono `Float`, un limite da documentare perché per i soldi serve `BigDecimal`.

```ruby
require "json"

class Vendita
  attr_reader :reparto, :importo

  def self.da_hash(dati)
    importo = Float(dati.fetch("importo"))
    reparto = dati.fetch("reparto").to_s.strip
    raise ArgumentError, "importo non positivo" unless importo.positive?
    raise ArgumentError, "reparto vuoto" if reparto.empty?
    new(reparto: reparto.downcase, importo: importo)
  end

  def initialize(reparto:, importo:)
    @reparto = reparto
    @importo = importo
  end
end

def carica(percorso)
  raw = JSON.parse(File.read(percorso, encoding: "UTF-8"))
  raise ArgumentError, "atteso un array" unless raw.is_a?(Array)

  vendite, scartate = [], 0
  raw.each do |dati|
    vendite << Vendita.da_hash(dati)
  rescue ArgumentError, KeyError, TypeError
    scartate += 1
  end
  [vendite, scartate]
end
```

Il `rescue` dentro `each` vale per ogni iterazione: una riga rotta non ferma le altre. `fetch` solleva `KeyError` sui campi mancanti e il conteggio evita sparizioni silenziose.

## Aggregazione e input

Un hash con valore di default e i blocchi di `Enumerable` bastano per l'aggregazione.

```ruby
def totali(vendite, reparto: nil)
  selezionate = reparto ? vendite.select { |v| v.reparto == reparto } : vendite
  selezionate.each_with_object(Hash.new(0.0)) do |v, somma|
    somma[v.reparto] += v.importo
  end.sort.to_h
end
```

La CLI gestisce solo argomenti e codici di uscita; per due opzioni un ciclo su `ARGV` basta.

```ruby
def interpreta(argv)
  reparto = nil
  file = nil
  argv.each_with_index do |arg, i|
    if arg == "--reparto"
      reparto = argv[i + 1]
      raise ArgumentError, "--reparto richiede un nome" if reparto.nil?
      file = nil                      # il nome non è il file
    elsif arg.start_with?("-")
      raise ArgumentError, "opzione sconosciuta: #{arg}"
    else
      file = arg
    end
  end
  [file, reparto&.downcase]
end

begin
  file, reparto = interpreta(ARGV)
  raise ArgumentError, "serve un file" if file.nil?
  vendite, scartate = carica(file)
  totali(vendite, reparto: reparto).each { |r, t| puts format("%-12s %8.2f", r, t) }
  warn "record scartati: #{scartate}" if scartate.positive?
rescue SystemCallError, JSON::ParserError, ArgumentError => e
  warn "report: #{e.message}"
  exit 2
end
```

`warn` scrive su stderr e `exit 2` segnala l'errore d'uso.

## Esercizi

1. Aggiungi `--json` per stampare i totali come oggetto JSON.
2. Rifiuta `--reparto` senza nome con exit 2.
3. Sostituisci il ciclo su `ARGV` con `OptionParser`.
4. Scrivi un test Minitest sul conteggio dei record scartati.
5. Ordina per importo decrescente, poi per nome.
6. Testa il codice di uscita 2 su un file inesistente.

<details><summary>Soluzione</summary>

1. `puts JSON.generate(totali(vendite, reparto: reparto))` sostituisce il ciclo di stampa.

2. Con `argv[i + 1]` nullo o che inizia con `--`, solleva `ArgumentError` per uscire con 2.

3. Dopo `parse!` con `o.on("--reparto NOME")`, `argv` contiene solo il file: valida `file.nil?`.

4. Un record valido e uno negativo nell'array devono dare `scartate == 1`.

5. `sort_by { |r, t| [-t, r] }`, poi `to_h`.

6. Con `Open3.capture3("ruby", "report.rb", "manca.json")`, verifica `status.exitstatus == 2`.

</details>

## Errori comuni

- **Affidarsi a `JSON.parse` per validare**: un parse riuscito non garantisce campi presenti e coerenti.
- **Catturare tutto fuori dal ciclo**: un record rotto interrompe l'intera elaborazione.
- **Scrivere errori su stdout**: dati e diagnosi diventano indistinguibili.
- **Confondere valori e opzioni**: un nome senza valore va rifiutato.
- **Testare solo funzioni pure**: anche l'exit code fa parte del contratto.

## In sintesi

Il laboratorio separa parsing con classi validate, aggregazione con blocchi e CLI con codici di uscita. `fetch` rende espliciti i campi obbligatori, il conteggio degli scarti evita silenzi e il `rescue` per iterazione isola i dati corrotti. I test coprono logica e comportamento.

## Fonti

- [Ruby Documentation - core classes](https://docs.ruby-lang.org/en/): `JSON`, `Enumerable` e classi standard.
- [Ruby Documentation - standard library](https://docs.ruby-lang.org/en/master/): riferimento delle librerie incluse.
- [Ruby in Twenty Minutes](https://www.ruby-lang.org/en/documentation/quickstart/): sintassi di base per rileggere gli esempi.
- [Minitest](https://github.com/minitest/minitest): repository ufficiale del framework di test.
