Starlark è un dialetto di Python progettato come linguaggio di configurazione deterministico e sicuro: lo usano Bazel per i file BUILD e le regole, e Buck2 per i modelli di build. La sintassi ricorda Python, ma l'esecuzione è deliberatamente limitata: niente import, niente accesso al filesystem, mutazioni contenute. In questa lezione impari la sintassi, i tipi e il modello di esecuzione che rende Starlark prevedibile.

## Obiettivi

- Riconoscere la sintassi Python-like di Starlark e le sue differenze principali.
- Distinguere tipi immutabili, liste, dict e insiemi di dipendenze.
- Scrivere funzioni pure e capire perché gli effetti collaterali sono esclusi.
- Conoscere le fasi di caricamento, analisi ed esecuzione di Bazel.
- Riconoscere `load()`, i parametri `visibility` e le direttive di build.

## Sintassi e tipi di base

Starlark ha numeri, stringhe, booleani, `None`, liste, tuple e dizionari. Le liste e i dizionari sono mutabili, ma le tuple e le stringhe no. L'indentazione è significativa, come in Python, e il commento è `#`.

```python
# variabili e tipi
nome = "app"                # str
versione = 3               # int
attivo = True              # bool
mancante = None            # None

dipendenze = ["lib", "proto"]           # list, mutabile
coppie = {"regione": "eu", "tier": 2}  # dict
firma = ("1.0", True)                  # tuple, immutabile
```

Le stringhe supportano formattazione con `{}` e `%`, e le operazioni più comuni sono `split`, `join`, `replace` e `startswith`. L'ordine di iterazione dei dizionari è quello di inserimento, quindi un dict costruito in un certo ordine produce sempre lo stesso output, dettaglio che in contesti di build significa cache stabile. Non esistono classi né decoratori: la programmazione è procedurale, con funzioni e valori.

```python
def tag(nome, versione):
    base, minor, patch = versione.split(".")
    return "{}:{}.{}".format(nome, base, minor)

print(tag("api", "2.14.0"))   # api:2.14
```

Una differenza concreta rispetto a Python: Starlark non permette statement nelle funzioni lambda e non supporta `while`, perché il ciclo con condizione arbitraria renderebbe difficile garantire la terminazione. Restano `for`, `if` e le comprehension di lista e dizionario, che coprono quasi tutti i calcoli di configurazione.

## Funzioni, purezza e variabili speciali

Le funzioni si dichiarano con `def` e possono avere parametri con default e `*args`. Non esistono chiusure mutabili: una funzione non può modificare variabili esterne, e questo rende ogni chiamata riproducibile.

```python
def sources(globs, escludi = []):
    return [s for s in globs if s not in escludi]

def somma(*numeri):
    totale = 0
    for n in numeri:
        totale += n
    return totale

print(sources(["a.py", "b_test.py"], ["b_test.py"]))
print(somma(1, 2, 3))
```

Nei file BUILD esistono variabili e funzioni predefinite, fornite dall'ambiente di esecuzione. `glob(["*.txt"])` elenca i file della package, `select({...})` sceglie valori per piattaforma e `package(default_visibility = ...)` imposta la visibilità predefinita.

| Elemento | Dove si usa | Significato |
| --- | --- | --- |
| `load()` | BUILD e `.bzl` | importa simboli da un altro file |
| `glob()` | solo BUILD | espande pattern sui file della package |
| `select()` | BUILD | scelte condizionate per configurazione |
| `visibility` | regole | chi può dipendere dal target |
| `native` | macro | chiama regole native di Bazel |

`load()` deve stare all'inizio del file, prima di ogni altra istruzione, e i simboli caricati devono essere espliciti: non c'è un import a stella.

## Modello di esecuzione: caricamento, analisi, esecuzione

Bazel legge i file BUILD in una fase di caricamento: ogni file è valutato una sola volta in un ambiente isolato, e i risultati sono memorizzati. Il codice Starlark non lancia processi né tocca la rete, quindi ogni regola diventa una descrizione di azioni da eseguire dopo.

```text
1. load     -> Starlark valuta BUILD e .bzl, costruisce i target
2. analyze  -> le regole generano azioni (compile, link, test)
3. execute  -> le azioni girano in sandbox, con output cachati
```

Perché questa separazione conta: la fase Starlark è veloce e non può fare danni, mentre la fase di esecuzione è quella in cui si compila davvero. Un errore di sintassi in un BUILD blocca tutto al caricamento, e un target non dichiarato non può essere eseguito per sbaglio. Il risultato è un grafo di dipendenze completamente calcolabile prima di toccare un compilatore.

```python
# BUILD: descrive, non esegue
load("//tools:rules.bzl", "my_binary")

package(default_visibility = ["//visibility:private"])

my_binary(
    name = "server",
    srcs = glob(["src/**/*.go"], exclude = ["src/gen/**"]),
    deps = ["//lib:core"],
)
```

Il file BUILD qui non compila nulla: dichiara che il target `server` esiste, quali sorgenti lo compongono e da quali librerie dipende. Il debug dei problemi di build parte quasi sempre da questa distinzione.

## Errori comuni

- **Inserire `load()` a metà file**: deve essere la prima istruzione, altrimenti la valutazione fallisce.
- **Assumere import o classi**: Starlark non ha sistema di moduli Python né classi, solo `load()` e funzioni.
- **Modificare una lista durante l'iterazione**: il comportamento è vietato per garantire il determinismo.
- **Usare `glob()` dentro un `.bzl`**: `glob` esiste nel contesto dei file BUILD, non nelle regole caricate.
- **Dimenticare `visibility`**: senza la direttiva, la visibilità segue il default della package e le dipendenze vengono rifiutate.

## In sintesi

Starlark è un Python semplificato pensato per descrivere build in modo deterministico e sicuro. Ha tipi semplici, funzioni pure e un ambiente predefinito con `glob`, `select` e `load`. Bazel lo esegue in una fase di caricamento separata dall'esecuzione delle azioni, e questa divisione spiega sia la velocità sia i messaggi d'errore. Capire quel confine è la chiave per leggere un BUILD senza confondere configurazione ed esecuzione.

## Fonti

- [Starlark Language Specification](https://github.com/bazelbuild/starlark/blob/master/spec.md), specifica ufficiale di sintassi, tipi e semantica.
- [Starlark documentation in Bazel](https://bazel.build/rules/language), guida al linguaggio nel contesto delle regole Bazel.
- [BUILD file globals](https://bazel.build/rules/lib/globals/build), funzioni e variabili disponibili nei file BUILD.
- [Repository starlark](https://github.com/bazelbuild/starlark), implementazioni e riferimenti del progetto.
