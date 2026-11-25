In questo laboratorio costruisci `spese`, uno strumento che legge un CSV, calcola i totali per categoria e riepiloga in JSON. Il percorso unisce libreria standard, `dataclasses`, eccezioni proprie e test con `unittest`. Il risultato è un modulo importabile e verificato, non uno script monolitico.

## Obiettivi

- Modellare i dati con `dataclass` e validare gli input non fidati.
- Progettare un'interfaccia `argparse` con valori di default e messaggi d'errore utili.
- Separare la logica pura dall'I/O per rendere il codice testabile.
- Gestire righe malformate senza interrompere l'elaborazione.
- Scrivere test con `unittest` su file temporanei e casi limite.

## Il contratto dello strumento

Ogni riga della tabella diventa un ramo del programma e un caso di test.

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `spese FILES... [--categoria C] [--json]` | uno o più file, filtro opzionale |
| formato | CSV con colonne `data,categoria,importo` | facile da produrre e ispezionare |
| `--json` | riepilogo su stdout | output machine-readable |
| righe invalide | ignorate e contate | un dato rotto non blocca gli altri |
| file mancante | exit 2 su stderr | uso errato |

```bash
spese ottobre.csv
spese ottobre.csv --categoria trasporti
spese ottobre.csv --json
```

Gli importi sono `Decimal`, perché `float` accumula errori di arrotondamento.

## Il modello dei dati

Il modulo `spese.py` inizia con il tipo dati e un parser puro: riceve righe già aperte e restituisce le spese valide e il numero di righe scartate.

```python
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

@dataclass(frozen=True)
class Spesa:
    giorno: date
    categoria: str
    importo: Decimal

class RigaInvalida(ValueError):
    """Sollevata quando una riga del CSV non è interpretabile."""

def leggi_spese(righe):
    import csv
    valide, scartate = [], 0
    for riga in csv.DictReader(righe):
        try:
            spesa = Spesa(
                giorno=date.fromisoformat(riga["data"].strip()),
                categoria=riga["categoria"].strip().lower(),
                importo=Decimal(riga["importo"]),
            )
            if spesa.importo <= 0 or not spesa.categoria:
                raise RigaInvalida("importo non positivo o categoria vuota")
            valide.append(spesa)
        except (RigaInvalida, InvalidOperation, KeyError, TypeError):
            scartate += 1
    return valide, scartate
```

`frozen=True` rende l'oggetto immutabile; il `try` copre solo la costruzione, così il resto del ciclo non inghiotte errori.

## Totali, CLI e integrazione

L'aggregazione usa una `defaultdict` che somma `Decimal`.

```python
from collections import defaultdict

def totali(spese, categoria=None):
    somma = defaultdict(Decimal)
    for s in spese:
        if categoria is None or s.categoria == categoria:
            somma[s.categoria] += s.importo
    return dict(sorted(somma.items()))
```

La CLI gestisce file, opzioni ed exit code; `json.dumps` con `default=str` serializza i decimali.

```python
import argparse, json, sys

def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="spese")
    p.add_argument("files", nargs="+")
    p.add_argument("--categoria")
    p.add_argument("--json", action="store_true")
    args = p.parse_args(argv)

    tutte, scartate = [], 0
    for nome in args.files:
        try:
            with open(nome, newline="", encoding="utf-8") as f:
                valide, scarti = leggi_spese(f)
        except OSError as errore:
            print(f"spese: {nome}: {errore.strerror}", file=sys.stderr)
            return 2
        tutte.extend(valide)
        scartate += scarti

    riepilogo = totali(tutte, args.categoria)
    if args.json:
        print(json.dumps({"totali": riepilogo, "scartate": scartate}, default=str))
    else:
        for cat, importo in riepilogo.items():
            print(f"{cat:20} {importo:>8}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
```

`main` restituisce un intero testabile al posto di `sys.exit`; `raise SystemExit` lo converte in exit code.

## Esercizi

1. Aggiungi `--mese AAAA-MM` e indica in quale funzione intervieni.
2. Gestisci un CSV senza intestazione in modo coerente col contratto.
3. Testa il conteggio delle righe scartate con un importo non numerico.
4. Ordina il riepilogo per importo decrescente invece che alfabetico.
5. Rendi `totali` capace di restituire anche il numero di spese per categoria.
6. Testa l'exit code 2 con un file inesistente e stdout vuoto.

<details><summary>Soluzione</summary>

1. Il filtro va in una funzione pura `filtra_mese(spese, "2026-10")` chiamata da `main`; `leggi_spese` resta invariata, perché il mese è un criterio d'uso e non di parsing.

2. `csv.DictReader` usa la prima riga come intestazione, quindi senza colonne attese ogni riga viene scartata. Si controlla `fieldnames` e si esce con 2.

3. `tempfile.TemporaryDirectory` crea un CSV con una riga valida e una con `importo=abc`; il test verifica `scartate == 1` e `len(valide) == 1`.

4. `sorted(somma.items(), key=lambda c: c[1], reverse=True)`, con la categoria come criterio secondario.

5. `totali` restituisce `Riepilogo(categoria, totale, numero)` per ogni categoria.

6. `redirect_stdout` e `redirect_stderr` su `io.StringIO`, poi `main(["inesistente.csv"])` deve restituire `2` con stdout vuoto.

</details>

## Errori comuni

- **Usare `float` per i soldi**: le somme accumulano errori invisibili che cambiano i totali.
- **Lasciare fuori dal `try` i campi mancanti**: un `KeyError` non gestito blocca l'intero file.
- **Stampare prima di validare i file**: l'exit code non distingue più gli esiti.
- **Non separare elaborazione e I/O**: i test diventano lenti e fragili.
- **Chiamare `sys.exit` in una funzione da testare**: il test muore prima delle asserzioni.

## In sintesi

Il laboratorio separa parsing, aggregazione e interfaccia, ognuno con una responsabilità verificabile. `dataclass(frozen=True)` modella dati immutabili e `Decimal` evita gli errori sulle somme. `argparse` e gli exit code formano una superficie stabile, e `main` restituisce un intero testabile su file temporanei.

## Fonti

- [argparse - Parser for command-line options](https://docs.python.org/3/library/argparse.html): opzioni, subcomandi ed errori.
- [dataclasses - Data Classes](https://docs.python.org/3/library/dataclasses.html): metodi generati e oggetti immutabili.
- [csv - CSV File Reading and Writing](https://docs.python.org/3/library/csv.html): `DictReader` e formati.
- [unittest - Unit testing framework](https://docs.python.org/3/library/unittest.html): asserzioni, fixture e file temporanei.
