In questo laboratorio scrivi una regola Starlark che genera un manifesto dei file sorgenti e la proteggi con un test di analisi. Parti da un `.bzl` minimo, aggiungi un attributo booleano, generi target con una macro e verifichi i contratti con `unittest.bzl`. Serve Bazel installato.

## Obiettivi

- Creare un workspace minimo con un modulo `.bzl` e un file BUILD.
- Scrivere una regola che dichiara un output e lo restituisce con `DefaultInfo`.
- Aggiungere un attributo tipizzato e usarlo nell'azione.
- Generare più target con una macro e verificare il grafo con `query`.
- Testare gli attributi della regola senza eseguire azioni.

## Preparare il workspace

`MODULE.bazel` abilita il sistema di moduli moderno, mentre `BUILD.bazel` descrive i target.

| Percorso | Ruolo |
| --- | --- |
| `MODULE.bazel` | identità del workspace |
| `tools/manifest.bzl` | regola e macro |
| `tools/BUILD.bazel` | istanzia i target |
| `data/a.txt`, `data/b.txt` | file di input |
| `tools/manifest_test.bzl` | test di analisi |

```bash
mkdir -p tools data && touch MODULE.bazel
printf 'a\n' > data/a.txt && printf 'b\n' > data/b.txt
```

## Scrivere la regola

La regola dichiara un file di output, raccoglie i nomi dei sorgenti e li restituisce con `DefaultInfo`. L'attributo `strict` è un booleano tipizzato, validato prima dell'analisi.

```python
# tools/manifest.bzl
def _manifest_impl(ctx):
    out = ctx.actions.declare_file(ctx.label.name + ".manifest")
    nomi = [f.basename for f in ctx.files.srcs]
    if ctx.attr.strict:
        nomi = [n for n in nomi if n.endswith(".txt")]
    ctx.actions.write(
        output = out,
        content = "\n".join(sorted(nomi)) + "\n",
    )
    return [DefaultInfo(files = depset([out]))]

manifest = rule(
    implementation = _manifest_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "strict": attr.bool(default = False),
    },
)
```

`declare_file` crea il nome dell'output senza scrivere nulla; `ctx.actions.write` delega la scrittura a Bazel, che gestisce cache e sandbox; `depset` raccoglie i file per i consumatori a valle.

## Una macro e i target

La macro genera un target per ogni gruppo e applica `strict` dall'esterno.

```python
# in tools/manifest.bzl, sotto la regola
def manifest_bundle(name, gruppi, strict = False):
    for g in gruppi:
        manifest(
            name = name + "_" + g,
            srcs = ["//data:" + g],
            strict = strict,
        )
```

```python
# tools/BUILD.bazel
load(":manifest.bzl", "manifest_bundle")
load(":manifest_test.bzl", "manifest_attrs_test")

package(default_visibility = ["//visibility:private"])

manifest_bundle(name = "docs", gruppi = ["a", "b"], strict = True)

manifest_attrs_test(
    name = "docs_a_test",
    target_under_test = ":docs_a",
)
```

I file vanno esposti con `exports_files`, altrimenti `//data:a` non esiste e l'analisi fallisce.

```python
# data/BUILD.bazel
exports_files(["a.txt", "b.txt"])
```

## Verificare con query e test

Prima di eseguire, si controlla il grafo: `query` legge il caricamento, `cquery` mostra i risultati dopo l'analisi.

```bash
bazel query '//tools:all'
bazel build //tools:docs_a
bazel cquery --output=files //tools:docs_a
```

Il test di analisi legge il target senza generare azioni e verifica il provider restituito.

```python
# tools/manifest_test.bzl
load("@bazel_skylib//lib:unittest.bzl", "analysistest", "asserts")

def _attrs_impl(ctx):
    env = analysistest.begin(ctx)
    target = analysistest.target_under_test(env)
    asserts.equals(env, True, target[DefaultInfo].files.to_list() != [])
    return analysistest.end(env)

manifest_attrs_test = analysistest.make(_attrs_impl)
```

```bash
bazel test //tools:docs_a_test
```

Se il test fallisce su `files`, la regola non restituisce più un output e i consumatori si romperebbero; il contenuto del manifesto richiede invece un test sui file generati.

## Esercizi

1. Aggiungi un attributo `prefix` anteposto a ogni riga del manifesto.
2. Genera dalla macro un `filegroup` `*_all` con tutti i gruppi.
3. Emetti un `fail()` se `srcs` è vuoto: in quale fase accade?
4. Aggiungi un test che verifichi che `strict = False` mantenga anche i file non `.txt`.
5. Aggiungi `is_executable = False` all'azione: che differenza produce?
6. Perché la macro non può leggere i sorgenti?

<details>
<summary>Soluzione</summary>

1. `attrs["prefix"] = attr.string(default = "")` e `content = "\n".join(prefix + n for n in nomi)`: l'attributo arriva come `ctx.attr.prefix`.

2. `filegroup(name = name + "_all", srcs = [name + "_" + g for g in gruppi])`: l'insieme compare nel grafo come `//tools:docs_all`.

3. Con `if not ctx.files.srcs: fail("srcs vuoto in " + ctx.label.name)` l'errore esce in fase di analisi: `ctx` esiste solo nel contesto dell'implementazione.

4. Secondo target con `strict = False` e un sorgente `.sh`: il test verifica che `DefaultInfo` non sia vuoto; il contenuto resta da controllare su file.

5. Poco: il default è già falso, ma dichiararlo rende l'intento esplicito; con `True` il file diventa eseguibile e cambiano i permessi in sandbox.

6. Il caricamento deve essere puro: leggere un file richiede filesystem, escluso dalla valutazione di BUILD e `.bzl`.

</details>

## Errori comuni

- **Chiamare `ctx.actions.write` fuori dall'implementazione**: `ctx` esiste solo nella funzione della regola.
- **Mettere creazione di file nella macro**: gli effetti restano nelle azioni, non nel caricamento.
- **Dimenticare `exports_files`**: i file non sono target raggiungibili da altre package.
- **Test che generano azioni**: un test di analisi deve restare veloce.
- **Restituire file al posto di `DefaultInfo`**: i consumatori cercano provider.

## In sintesi

Una regola dichiara output e azioni, una macro genera target e un test di analisi protegge il contratto. `query` mostra il grafo caricato, `cquery` quello analizzato, `bazel build` esegue le azioni. Il confine tra caricamento e analisi spiega i messaggi d'errore e i limiti delle macro.

## Fonti

- [Extending Bazel with Starlark rules](https://bazel.build/extending/rules), implementazione delle regole e degli attributi.
- [Testing Starlark rules](https://bazel.build/rules/testing), uso di `analysistest` e degli assert.
- [Build file globals](https://bazel.build/rules/lib/globals/build), funzioni disponibili nei file BUILD.
- [Starlark language specification](https://github.com/bazelbuild/starlark/blob/master/spec.md), regole di sintassi e semantica usate anche dalle regole Bazel.
