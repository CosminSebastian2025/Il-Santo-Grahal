Python non è un linguaggio da solo: è un ecosistema di libreria standard, pacchetti distribuiti su PyPI, ambienti virtuali isolati e strumenti di test che formano il ciclo di lavoro quotidiano. Chi impara solo la sintassi resta bloccato al secondo giorno, quando deve installare una dipendenza senza rompere l'ambiente di sistema. In questa lezione vedi come si organizzano un progetto, come si isolano le dipendenze e come si verificano i risultati con test automatici.

## Obiettivi

- Creare ambienti virtuali con `venv` e attivarli in modo affidabile.
- Distinguere la libreria standard dai pacchetti di terze parti e saperli cercare.
- Leggere un `pyproject.toml` e installare un progetto in modalità modificabile.
- Scrivere test con `unittest` e con `pytest` e usare i fixture per preparare i dati.
- Scegliere come gestire stile, tipi e automazione in un progetto nuovo.

## Libreria standard e pacchetti

Python arriva con una libreria standard ampia: `pathlib` per i percorsi, `csv` e `json` per i formati, `argparse` per la riga di comando, `http.server` per un piccolo servizio HTTP. Prima di cercare un pacchetto su PyPI vale la pena verificare se il problema è già coperto; ogni dipendenza aggiunta è codice che dovrai aggiornare e fidarti ad aggiornare.

```python
from pathlib import Path
import csv

for file in Path("dati").glob("*.csv"):
    with file.open(newline="", encoding="utf-8") as f:
        righe = list(csv.DictReader(f))
    print(file.name, len(righe))
```

| Ambito | Strumento | A cosa serve |
| --- | --- | --- |
| ambienti | `venv` | isolare i pacchetti di un progetto |
| installazione | `pip` | scaricare e registrare le dipendenze |
| metadati | `pyproject.toml` | dichiarare progetto, dipendenze e comandi |
| test | `unittest`, `pytest` | verifica automatica del comportamento |
| stile e tipi | `ruff`, `mypy` | errori evidenti prima dei test |

I pacchetti si installano da PyPI, il registro pubblico di default, ma `pip` accetta anche indici privati o percorsi locali. Le versioni si fissano con intervalli semver in `pyproject.toml` o con un file di lock generato dallo strumento scelto, così la build di domani non differisce da quella di oggi.

## Ambienti virtuali e packaging

Un ambiente virtuale è una cartella con un interprete collegato e un proprio `site-packages`: installare `pytest` lì non tocca il sistema. La regola pratica è una `.venv` per progetto, esclusa dal repository, ricostruibile con due comandi.

```bash
python3 -m venv .venv
source .venv/bin/activate        # Linux e macOS
.venv\Scripts\activate           # Windows
python -m pip install --upgrade pip
python -m pip install "pytest>=8,<9"
python -m pip freeze > requirements.txt
```

Il file `pyproject.toml` è ora lo standard per descrivere un progetto: nome, versione, dipendenze, comandi eseguibili e configurazione di strumenti come `pytest` o `ruff`. Un'installazione modificabile, `pip install -e .`, collega l'ambiente al sorgente e rende le modifiche immediatamente visibili.

```bash
python -m pip install -e ".[dev]"
python -m app --help             # script dichiarato nel progetto
```

## Test, casi d'uso e qualità

`unittest` è nella libreria standard e usa classi con metodi `test_*`; `pytest` richiede una dipendenza ma elimina il boilerplate con funzioni semplici e asserzioni native. Nei progetti nuovi `pytest` è la scelta più comune, con i fixture per preparare file temporanei e client finti.

```python
import json
from pathlib import Path

def carica_config(percorso: Path) -> dict:
    return json.loads(percorso.read_text(encoding="utf-8"))

def test_carica_config(tmp_path):
    p = tmp_path / "config.json"
    p.write_text('{"debug": true}', encoding="utf-8")
    assert carica_config(p)["debug"] is True
```

Gli usi reali più frequenti spiegano perché l'ecosistema è così ampio: scripting di sistema e automazione, elaborazione dati e statistica, servizi web, test e pipeline di qualità. Script brevi raccolgono dati e li trasformano; i servizi web aggiungono un framework e un server WSGI o ASGI; i notebook esplorano senza la struttura di un pacchetto. In tutte le varianti il ciclo di verifica resta lo stesso: ambiente isolato, dipendenze dichiarate, test eseguibili con un comando e un linter che segnala prima della revisione.

## Errori comuni

- **Installare pacchetti a livello globale**: conflitti fra progetti e un interprete di sistema potenzialmente inutilizzabile.
- **Non escludere `.venv` dal repository**: binari e percorsi assoluti spezzano il clone su un'altra macchina.
- **Versionare `requirements.txt` prodotto da `freeze` come contratto unico**: include le dipendenze transitive e va rigenerato con cura.
- **Mescolare test e codice di produzione nell'installazione**: i test appartengono a un extra `dev`, non alle dipendenze runtime.
- **Non fissare le versioni**: un aggiornamento minore di una libreria può cambiare comportamento e rompere la build senza modifiche al codice.

## In sintesi

La libreria standard copre molto; PyPI copre il resto ma va gestito con disciplina. Gli ambienti virtuali isolano le dipendenze, `pyproject.toml` le dichiara e un file di lock le rende riproducibili. `pytest` semplifica i test rispetto a `unittest` e i fixture preparano i dati senza effetti collaterali. Un progetto Python solido si riconosce da tre comandi: crea l'ambiente, installa, testa.

## Fonti

- [Python Packaging User Guide](https://packaging.python.org/en/latest/tutorials/packaging-projects/): creazione di un pacchetto con `pyproject.toml`.
- [venv - Creation of virtual environments](https://docs.python.org/3/library/venv.html): riferimento ufficiale degli ambienti virtuali.
- [unittest - Unit testing framework](https://docs.python.org/3/library/unittest.html): test e mock della libreria standard.
- [pytest documentation](https://docs.pytest.org/): fixture, parametrizzazione e asserzioni.
