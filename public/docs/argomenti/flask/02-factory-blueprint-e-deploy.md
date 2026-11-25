Intorno a una ventina di endpoint una applicazione Flask smette di stare in un file `app.py`: serve una factory perché i test possano costruire app diverse, blueprint per separare i domini senza pacchetti separati, e un ciclo di vita delle connessioni che regga il server di produzione. Questa lezione parte da questi tre problemi e chiude sui comandi CLI, sul testing con fixture isolate e sul passaggio a Gunicorn. Il riferimento è Flask 3.1 con SQLite e Jinja, senza estensioni obbligatorie.

## Obiettivi

- Costruire l'applicazione con una factory e un `create_app(config)` testabile.
- Organizzare i domini in blueprint con prefisso URL e nome proprio.
- Gestire connessioni e transazioni con `g` e teardown per richiesta.
- Scrivere test isolati con fixture di pytest che ricreano il database.
- Configurare un comando CLI per inizializzare lo schema e avviare con Gunicorn.

## Application factory e configurazione

La factory risolve due problemi concreti: durante i test non vuoi condividere il database di sviluppo, e il modulo `app` a livello globale viene importato prima che la configurazione sia pronta. Con `create_app` l'ordine è esplicito.

```python
# catalogo/__init__.py
from flask import Flask
from .db import init_app as init_db
from .api import bp as api_bp

def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(DATABASE=app.instance_path + "/catalogo.sqlite")
    app.config.from_prefixed_env()
    if test_config:
        app.config.update(test_config)

    init_db(app)
    app.register_blueprint(api_bp, url_prefix="/api")
    return app
```

```bash
export FLASK_APP=catalogo:create_app
flask run --debug
flask --app catalogo:create_app routes
```

`instance_relative_config=True` fa puntare `app.instance_path` alla cartella `instance/`, esclusa dal versionamento, dove vivono database locale e file caricati. `FLASK_APP=catalogo:create_app` indica a Flask di chiamare la factory: nei test puoi chiamarla con un dizionario, in produzione le variabili `FLASK_*` arrivano dall'ambiente.

## Blueprint e separazione dei domini

Un blueprint è un gruppo di route registrabili su più applicazioni. Non ha stato proprio, condivide la configurazione dell'applicazione e può avere hook `before_request` prima e dopo la registrazione: quelli registrati sull'applicazione vengono eseguiti prima di quelli del blueprint.

```python
# catalogo/api.py
from flask import Blueprint, jsonify, request, abort
from .db import get_db

bp = Blueprint("api", __name__)

@bp.get("/libri")
def libri():
    autore = request.args.get("autore", type=int)
    sql = "SELECT id, titolo, autore FROM libro"
    parametri = ()
    if autore is not None:
        sql += " WHERE autore_id = ?"
        parametri = (autore,)
    righe = get_db().execute(sql + " ORDER BY titolo LIMIT 50", parametri).fetchall()
    return jsonify([dict(r) for r in righe])

@bp.get("/libri/<int:id>")
def libro(id):
    riga = get_db().execute("SELECT * FROM libro WHERE id = ?", (id,)).fetchone()
    if riga is None:
        abort(404, description=f"libro {id} non trovato")
    return jsonify(dict(riga))
```

La query è parametrizzata con `?` e i valori passano come tupla: è il punto in cui si previene l'iniezione SQL. `request.args.get("autore", type=int)` converte e scarta i valori non interi, restituendo `None` senza sollevare eccezioni. Un blueprint registrato due volte con prefissi diversi funziona, ma per prefix dinamici serve `url_for` con il nome del blueprint corretto.

| Elemento | Dove vive | Esempio |
| --- | --- | --- |
| nome blueprint | primo argomento | `Blueprint("api", __name__)` |
| endpoint | `bp.` + nome funzione | `url_for("api.libro", id=3)` |
| prefisso URL | `register_blueprint(url_prefix=...)` | `/api` |
| hook | `bp.before_request` | verifica token API |
| errori | `bp.errorhandler(404)` | JSON invece di HTML |

Usare `url_for("api.libro", id=3)` invece di stringhe letterali evita di riscrivere i test quando il prefisso cambia. Flask solleva `BuildError` se l'endpoint non esiste, quindi un refactor di route fallisce presto.

## Connessione, transazioni e CLI

```python
# catalogo/db.py
import sqlite3
from flask import current_app, g

SCHEMA = """
DROP TABLE IF EXISTS libro;
CREATE TABLE libro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titolo TEXT NOT NULL,
  autore_id INTEGER REFERENCES autore(id) ON DELETE RESTRICT,
  prezzo NUMERIC NOT NULL CHECK (prezzo >= 0)
);
"""

def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
    return g.db

def init_app(app):
    app.teardown_appcontext(chiudi_db)
    app.cli.add_command(init_db_command)

def chiudi_db(eccezione=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

import click
@click.command("init-db")
def init_db_command():
    db = get_db()
    db.executescript(SCHEMA)
    db.commit()
    click.echo("database inizializzato")
```

SQLite con `check_same_thread` predefinito è legato al thread che apre la connessione: `g` è legata alla richiesta, quindi va bene finché una richiesta non delega il lavoro a un altro thread, caso in cui la connessione non è più utilizzabile. Per PostgreSQL la connessione va restituita a un pool (`psycopg_pool` o `SQLAlchemy`), e il teardown restituisce al pool invece di chiudere.

`flask init-db` funziona perché `app.cli.add_command` registra il comando sulla CLI dell'applicazione, che riconosce la app tramite `FLASK_APP`. In test il comando si esegue con `app.test_cli_runner()`, lo stesso nei deploy: la migrazione non è un'operazione manuale.

## Testing isolato

```python
# tests/conftest.py
import pytest
from catalogo import create_app
from catalogo.db import get_db, init_db_command

@pytest.fixture
def app(tmp_path):
    app = create_app({"TESTING": True, "DATABASE": str(tmp_path / "test.sqlite")})
    with app.app_context():
        app.test_cli_runner().invoke(args=["init-db"])
        db = get_db()
        db.execute("INSERT INTO autore (id, nome) VALUES (1, 'Italo Calvino')")
        db.execute("INSERT INTO libro (titolo, autore_id, prezzo) VALUES (?, 1, 12.5)", ("Se una notte",))
        db.commit()
    yield app

@pytest.fixture
def client(app):
    return app.test_client()
```

```python
# tests/test_api.py
def test_lista_con_filtro(client):
    r = client.get("/api/libri?autore=1")
    assert r.status_code == 200
    assert r.get_json()[0]["titolo"] == "Se una notte"

def test_filtro_non_numerico_ignorato(client):
    assert client.get("/api/libri?autore=abc").get_json()

def test_libro_inesistente(client):
    r = client.get("/api/libri/999")
    assert r.status_code == 404
    assert r.get_json()["errore"]
```

Le fixture usano `tmp_path`: ogni test ottiene un file SQLite nuovo e non eredita dati da esecuzioni precedenti. `with app.app_context()` è necessario perché `get_db()` usa `g`, che esiste solo dentro un contesto. `TESTING=True` fa propagare le eccezioni invece di restituire una pagina 500, e rende visibile un errore di programmazione dove deve.

Il server di produzione non è `flask run`: Gunicorn avvia più worker, ognuno con il proprio ciclo di vita, e la connessione va aperta per richiesta o gestita da un pool condiviso per worker.

```bash
pip install gunicorn
gunicorn --workers 3 --bind 0.0.0.0:8000 "catalogo:create_app()" --access-logfile -
```

Ogni worker Gunicorn è un processo (`gunicorn --worker-class sync` predefinito): con `g` e SQLite hai tre file separati o accessi concorrenti allo stesso file, e per questo PostgreSQL diventa la scelta praticabile già a due worker. Su Windows Gunicorn non è disponibile: si usa `waitress-serve --port=8000 "catalogo:create_app()"`.

## Errori comuni

- **Registrare il blueprint con `url_prefix` dentro `Blueprint(...)` e anche alla registrazione**: i due prefissi si concatenano e le URL diventano `/api/api/...`.
- **Aprire la connessione dentro la vista e non chiuderla**: un errore a metà vista lascia il file aperto e le scritture non vanno a commit.
- **Usare `get_db()` fuori dal contesto**: `RuntimeError` in test e nei comandi CLI se non si apre `app_context()`.
- **Database dei test condiviso con quello di sviluppo**: un test che cancella una tabella rompe lo sviluppo locale.
- **`url_for` con stringa letterale del endpoint**: errore solo a runtime, con `BuildError` in produzione.
- **Avviare con `flask run` dietro un reverse proxy**: niente timeout, un worker e ricarica automatica che in produzione è un rischio.

## In sintesi

La factory rende l'applicazione un oggetto configurabile, i blueprint separano i domini con un prefisso e un nome di endpoint stabile, `g` e i teardown danno un ciclo di vita per richiesta alla connessione. La CLI di Flask è l'unico punto per inizializzare lo schema, i test usano una factory con database temporaneo e contesto esplicito, e il deploy passa da Gunicorn o Waitress con un pool di connessioni adatto al database scelto.

## Fonti

- [Application factories](https://flask.palletsprojects.com/en/stable/patterns/appfactories/)
- [Blueprints](https://flask.palletsprojects.com/en/stable/blueprints/)
- [Testing Flask applications](https://flask.palletsprojects.com/en/stable/testing/)
- [Deploying to production](https://flask.palletsprojects.com/en/stable/deploying/)
