Python è un linguaggio interpretato, dinamico e con indentazione significativa: il codice si legge quasi come prosa, ma l'interprete esegue le istruzioni una dopo l'altra senza produrre un eseguibile. La semplicità della sintassi sposta l'attenzione sui concetti che contano davvero: oggetti, riferimenti, mutabilità e ciclo di vita dei nomi. In questa lezione costruisci quel modello mentale con esempi verificabili.

## Obiettivi

- Eseguire codice Python con l'interprete, in modalità REPL e da file.
- Distinguere tipi immutabili e mutabili e capire cosa succede assegnando un nome.
- Scrivere funzioni con argomenti di default sicuri e valori di ritorno espliciti.
- Usare blocchi `if`, `for` e `with` rispettando l'indentazione.
- Leggere messaggi di errore e tracce di stack senza andare nel panico.

## L'interprete e il modello di esecuzione

Un programma Python non viene tradotto in un eseguibile: il sorgente viene compilato in bytecode per la macchina virtuale `CPython`, che poi esegue le istruzioni. Quando lanci `python file.py`, l'interprete legge il file dall'alto verso il basso e valuta ogni istruzione nel momento in cui la incontra. Principio cardine: un file è un modulo, e le definizioni al suo interno non avvengono prima ma nell'ordine in cui le trovi.

```bash
python3 --version            # conferma l'interprete in uso
python3 -c "print(2 ** 10)"  # esegue una sola istruzione
python3 app.py               # esegue un file come script
python3                      # apre la REPL interattiva
```

La **REPL** (Read, Eval, Print, Loop) legge un'espressione, la valuta, ne stampa il risultato e ricomincia: utile per capire come viene valutato un frammento, ma non conserva nulla al termine. Il guard `if __name__ == "__main__":` separa il codice eseguibile dalle definizioni, così il modulo può essere importato altrove senza effetti collaterali.

```python
def somma(a: int, b: int) -> int:
    return a + b

if __name__ == "__main__":   # eseguito solo come script
    print(somma(2, 3))
```

## Nomi, oggetti e mutabilità

In Python un nome non è una scatola che contiene un valore: è un'etichetta che punta a un oggetto. L'assegnazione `a = b` copia l'etichetta, non l'oggetto, e il tipo appartiene all'oggetto, non al nome. Da qui nascono quasi tutti i comportamenti "sorprendenti" del linguaggio.

```python
a = [1, 2]
b = a          # stesso oggetto, due nomi
b.append(3)
print(a)       # [1, 2, 3]

c = [1, 2]
d = c[:]       # copia superficiale: nuovo oggetto
```

| Tipo | Esempio | Mutabile | Se lo si modifica... |
| --- | --- | --- | --- |
| `int`, `float`, `str`, `tuple` | `42`, `"abc"`, `(1, 2)` | no | nasce un nuovo oggetto |
| `list`, `dict`, `set` | `[1, 2]`, `{"k": 1}`, `{1}` | sì | cambia l'oggetto condiviso |
| `None` | `None` | — | singolo oggetto speciale |

Fra parametri e argomenti vale il passaggio per riferimento: una funzione che modifica una lista la modifica anche per il chiamante, a meno che non riceva una copia. Questo spiega perché gli argomenti di default mutabili sono pericolosi: vengono valutati una sola volta, alla definizione.

```python
def accumula(valore, acc=None):
    if acc is None:      # corretto: nessun default condiviso
        acc = []
    acc.append(valore)
    return acc

def difettosa(valore, acc=[]):   # errore classico
    acc.append(valore)
    return acc

print(difettosa(1), difettosa(2))  # [1, 2] [1, 2]
```

## Controllo di flusso e blocchi

L'indentazione non è stile: è struttura. Un blocco è delimitato dai due punti e da una rientranza coerente, di solito quattro spazi. Per iterare si usano `for` su qualsiasi iterabile, e `range`, `enumerate` e `zip` coprono gran parte dei cicli numerati senza gestione manuale dell'indice.

```python
frutti = ["mela", "pera", "kiwi"]
for indice, frutto in enumerate(frutti):
    print(indice, frutto)

with open("dati.txt", encoding="utf-8") as f:   # chiusura garantita
    for riga in f:
        print(riga.rstrip())
```

Il costrutto `with` usa il protocollo dei gestori di contesto: la risorsa viene chiusa anche in caso di eccezione. La comprensione di liste, `[x * 2 for x in valori if x > 0]`, sostituisce i cicli di accumulo. Per gli errori attesi si usa `try`/`except` su tipi specifici, mai un `except` nudo, e l'ultimo frame della traccia indica il punto in cui l'eccezione è nata.

## Errori comuni

- **Usare un argomento di default mutabile**: la lista condivisa tra chiamate è il bug Python più diffuso.
- **Credere che `b = a` copi una lista**: copia il riferimento; serve `a[:]`, `a.copy()` o `copy.deepcopy`.
- **Miscelare tab e spazi**: l'errore `IndentationError` blocca il file prima di qualunque logica.
- **Assumere che il file sia letto interamente prima di eseguire**: le definizioni diventano disponibili solo quando la riga viene raggiunta.
- **Catturare ogni eccezione con `except:`**: nasconde anche gli errori di programmazione e rende i test inutili.

## In sintesi

Python esegue bytecode su una macchina virtuale seguendo l'ordine del sorgente. I nomi sono etichette verso oggetti e la mutabilità decide se una modifica è visibile anche agli altri nomi. L'indentazione è sintassi e `with` garantisce il rilascio delle risorse. Gli argomenti di default si valutano una sola volta: proteggili con `None`.

## Fonti

- [Python Tutorial](https://docs.python.org/3/tutorial/index.html): panoramica ufficiale del linguaggio, dai tipi ai moduli.
- [Executable model](https://docs.python.org/3/reference/executionmodel.html): come nomi, ambiti e blocchi vengono valutati.
- [The Python Data Model](https://docs.python.org/3/reference/datamodel.html): definizione ufficiale di oggetti, tipi e mutabilità.
- [Errors and Exceptions](https://docs.python.org/3/tutorial/errors.html): gestione delle eccezioni e lettura delle tracce.
