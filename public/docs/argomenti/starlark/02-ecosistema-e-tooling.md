Starlark non si usa da solo: vive dentro Bazel, e l'ecosistema che lo circonda è quello delle regole, delle macro e degli strumenti di verifica. Scrivere un file BUILD funzionante richiede pochi minuti; rendere il build manutenibile richiede conoscere le convenzioni, i test delle regole e la formattazione automatica. In questa lezione vedi gli strumenti, come si testano le regole e dove Starlark viene impiegato in produzione.

## Obiettivi

- Distinguere regole native, regole personalizzate, macro e moduli `.bzl`.
- Scrivere una regola con attributi dichiarati e un provider di output.
- Testare gli attributi delle regole senza eseguire compilazioni.
- Formattare i file BUILD con buildifier e leggere i suoi avvisi.
- Riconoscere l'uso di Starlark fuori da Bazel, da Buck2 a Tilt.

## Regole, macro e moduli

Un file `.bzl` contiene le funzioni Starlark riutilizzabili. Una **regola** dichiara attributi tipizzati e restituisce provider, cioè informazioni che Bazel usa per calcolare il grafo. Una **macro** è invece una funzione che chiama regole native o personalizzate durante il caricamento, utile per generare più target con parametri comuni.

```python
# tools/rules.bzl
def _sh_bundle_impl(ctx):
    out = ctx.actions.declare_file(ctx.label.name + ".sh")
    contenuto = "\n".join([f.read().name for f in ctx.files.srcs])
    ctx.actions.write(out, contenuto)
    return [DefaultInfo(files = depset([out]))]

sh_bundle = rule(
    implementation = _sh_bundle_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "strict": attr.bool(default = False),
    },
)

def bundle_all(name, gruppi):
    for g in gruppi:
        sh_bundle(name = name + "_" + g, srcs = [g + ".sh"])
```

| Concetto | Dove si dichiara | Serve per |
| --- | --- | --- |
| attributo | `rule(attrs = ...)` | parametri tipizzati e validati |
| provider | valore restituito | passare informazioni ad altri target |
| `depset` | modulo | insiemi di file deduplicati e ordinati |
| macro | `.bzl` | generare più target in modo compatto |
| `select` | BUILD | valori condizionati alla configurazione |

La differenza tra macro e regola è sostanziale: una macro espande target durante il caricamento e non ha azioni proprie, una regola dichiara azioni che Bazel può analizzare e cachare. Quando la logica deve essere visibile al grafo, serve una regola; per ridurre ripetizioni nel BUILD basta una macro.

## Testare le regole

Bazel offre `unittest.bzl`, che valuta gli attributi di una regola durante l'analisi, senza eseguire azioni. `asserts.subjects` e `asserts.contains` verificano i valori, e il risultato è un normale target di test.

```python
# tools/rules_test.bzl
load("@bazel_skylib//lib:unittest.bzl", "analysistest", "asserts")

def _mio_test_impl(ctx):
    env = analysistest.begin(ctx)
    target = analysistest.target_under_test(env)
    asserts.equals(env, False, target[DefaultInfo].files.to_list()[0].is_source)
    return analysistest.end(env)

mio_test = analysistest.make(_mio_test_impl)
```

```python
# tools/BUILD.bazel
load(":rules.bzl", "sh_bundle")
load(":rules_test.bzl", "mio_test")

sh_bundle(name = "doc", srcs = ["a.sh", "b.sh"])

mio_test(
    name = "doc_test",
    target_under_test = ":doc",
)
```

```bash
bazel test //tools:doc_test
```

Questo tipo di test protegge il contratto pubblico di una regola: se qualcuno cambia un attributo o smette di restituire un provider, l'analisi fallisce e il problema emerge subito. Per verificare i contenuti generati servono invece test di integrazione su file di output.

## Formattazione, linting e convenzioni

`buildifier` è il formattatore ufficiale dei file BUILD e `.bzl`: ordina `load()`, uniforma l'indentazione e segnala pratiche rischiose con avvisi numerati. `buildozer` modifica i file BUILD da riga di comando, utile per migrazioni massive.

```bash
buildifier -mode=check -lint=warn $(git ls-files '*.bzl' 'BUILD*')
buildifier -mode=fix tools/rules.bzl
```

Gli avvisi tipici riguardano `load()` con simboli ridondanti, attributi obsoleti e ordine dei parametri. In CI il comando `-mode=check` fallisce se il file non è formattato, quindi la formattazione non diventa una discussione di stile nelle review ma una regola automatica. Conviene eseguire buildifier anche nell'editor, così il file è già corretto prima del commit.

## Casi d'uso reali

Starlark è usato da Bazel per l'intero modello di build, dai progetti che ne derivano e da chi lo incorpora come linguaggio di configurazione, proprio perché è deterministico e facile da sandboxare. Buck2 usa una variante del linguaggio per le proprie regole, e lo stesso approccio compare in tool di orchestrazione e di deploy che devono valutare configurazioni senza eseguire codice arbitrario. Il caso d'uso reale è il monorepo grande, dove cache e analisi delle dipendenze contano più della comodità di un singolo comando.

```bash
bazel query 'kind("sh_bundle", //tools:all)'   # elenca i target
bazel cquery --output=label //tools:doc        # dopo l'analisi
```

`query` lavora sul grafo caricato, `cquery` sui risultati dell'analisi: la differenza è la stessa distinzione tra le fasi vista nella lezione precedente.

## Errori comuni

- **Usare una macro dove serve una regola**: le azioni non esistono nel grafo e la cache non funziona.
- **Restituire un dizionario invece di un provider**: i consumatori non possono chiedere un tipo noto.
- **Testare solo output di file**: le violazioni di contratto della regola restano invisibili.
- **Ignorare gli avvisi di buildifier**: molti segnalano API deprecate che spariranno.
- **Ripetere attributi in ogni target**: meglio una macro o un valore centralizzato in un `.bzl`.

## In sintesi

L'ecosistema di Starlark è fatto di regole, macro e provider dentro Bazel, con strumenti di test e formattazione attorno. Regole e macro hanno ruoli diversi: le prime descrivono azioni, le seconde riducono ripetizioni. `unittest.bzl` verifica i contratti delle regole durante l'analisi, mentre `buildifier` li rende uniformi. Conoscere questi strumenti separa un build che funziona da uno che resta manutenibile nel tempo.

## Fonti

- [Extending Bazel with Starlark rules](https://bazel.build/extending/rules), guida ufficiale a regole, attributi e provider.
- [Testing Starlark rules](https://bazel.build/rules/testing), analisi dei test con `unittest.bzl`.
- [buildifier](https://github.com/bazelbuild/buildtools/tree/master/buildifier), formattatore e linter dei file BUILD.
- [Starlark in Bazel](https://bazel.build/rules/language), panoramica del linguaggio usato dalle regole.
