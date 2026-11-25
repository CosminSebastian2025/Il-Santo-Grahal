In questo laboratorio costruisci `flask-biblioteca`, una piccola applicazione web con Flask 3.1, SQLite e Jinja: pagine per elencare e creare libri, un endpoint JSON per la ricerca e un comando CLI per caricare i dati di prova. Python 3.10 o superiore. Il codice segue la struttura canonica di Flask (factory, blueprint, `g` per la connessione) ma la esercita su tutti i pezzi che incontri in produzione: render di template, CSRF sulle form, validazione del corpo JSON, validazione dell'input e un test suite con fixture isolate. Alla fine avrai un'applicazione che passa i test e parte con Waitress o Gunicorn.

## Obiettivi

- Strutturare un progetto Flask con `create_app`, blueprint e cartella `instance/`.
- Scrivere un comando CLI idempotente e dati iniziali ripetibili.
- Rendere template Jinja con escaping attivo e un frammento condiviso.
- Leggere e validare form HTML e corpo JSON senza dipendenze extra.
- Scrivere test per HTML, JSON, 400, 404 e CSRF attivo.

## Il contratto di `flask-biblioteca`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| `GET /libri` | lista HTML, 50 elementi per pagina | leggibile, senza paginazione infinita |
| `GET /libri/nuovo` + `POST /libri` | form con token CSRF | utente umano |
| `GET /api/libri?q=` | ricerca JSON, `q` minimo 2 caratteri | consumo da script |
| `POST /api/libri` | `application/json`, 415 se `Content-Type` errato | client API espliciti |
| `flask init-db` | crea schema e 3 libri di prova | ambiente nuovo in un comando |
| errori | JSON sotto `/api`, HTML altrove | un solo formato per consumatore |

La regola dell'ultima riga evita il classico problema in cui lo script riceve una pagina HTML di errore e fallisce nel `json.loads` con un messaggio illeggibile.

## Passo 1: struttura e schema

```
flask-biblioteca/
  instance/                  # database locale, non versionato
  biblioteca/__init__.py     # factory
  biblioteca/db.py           # connessione, schema, CLI
  biblioteca/libri.py        # blueprint HTML
  biblioteca/api.py          # blueprint JSON
  biblioteca/templates/libri/lista.html, nuovo.html
  tests/conftest.py, test_libri.py
  run.py                     # solo per il server di sviluppo
```

```python
# biblioteca/__init__.py
from flask import Flask, request
from . import db, libri, api

def create_app(config: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY="dev-cambia-me",
        DATABASE=app.instance_path + "/biblioteca.sqlite",
        MAX_LIBRI_PER_PAGINA=50,
    )
    app.config.from_prefixed_env()
    if config:
        app.config.update(config)
    db.init_app(app)
    app.register_blueprint(libri.bp)
    app.register_blueprint(api.bp, url_prefix="/api")

    @app.errorhandler(404)
    def non_trovato(errore):
        if request.path.startswith("/api/"):
            return {"errore": "risorsa non trovata"}, 404
        return "Non trovato", 404

    return app
```

Il valore `SECRET_KEY` è solo per lo sviluppo: in produzione `FLASK_SECRET_KEY` dall'ambiente lo sostituisce grazie a `from_prefixed_env`, e il token CSRF usa quella chiave per firma.

```python
# biblioteca/db.py
import sqlite3, click
from flask import current_app, g

SCHEMA = """
DROP TABLE IF EXISTS libro;
DROP TABLE IF EXISTS autore;
CREATE TABLE autore (id INTEGER PRIMARY KEY, nome TEXT NOT NULL UNIQUE);
CREATE TABLE libro (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT NOT NULL UNIQUE,
  titolo TEXT NOT NULL,
  autore_id INTEGER NOT NULL REFERENCES autore(id) ON DELETE RESTRICT,
  prezzo NUMERIC NOT NULL CHECK (prezzo >= 0)
);
CREATE INDEX idx_libro_titolo ON libro(titolo);
"""

def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")     # spento di default in SQLite
    return g.db

def chiudi_db(eccezione=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

@click.command("init-db")
def init_db_command():
    db = get_db()
    db.executescript(SCHEMA)
    db.executemany("INSERT INTO autore (nome) VALUES (?)", [("Italo Calvino",), ("Umberto Eco",)])
    db.executemany(
        "INSERT INTO libro (isbn, titolo, autore_id, prezzo) VALUES (?, ?, ?, ?)",
        [("9788804668237", "Se una notte", 1, 12.5),
         ("9780156001311", "Il nome della rosa", 2, 15.0),
         ("9788807883612", "Il barone rampante", 1, 10.0)],
    )
    db.commit()
    click.echo("database inizializzato con 3 libri")

def init_app(app):
    app.teardown_appcontext(chiudi_db)
    app.cli.add_command(init_db_command)
```

`PRAGMA foreign_keys = ON` è necessario: SQLite non applica le foreign key senza quel pragma, e le ON DELETE RESTRICT passano inosservate finché qualcuno non cancella un autore con libri.

## Passo 2: pagine HTML con Jinja e CSRF

Jinja ha l'autoescaping attivo per i template Flask `.html`: `{{ libro.titolo }}` con `<script>` nel titolo viene mostrato come testo. L'unico modo per iniettare HTML fidato è `|safe`, e va motivato.

```python
# biblioteca/libri.py
from flask import Blueprint, current_app, render_template, redirect, request, url_for
from .db import get_db

bp = Blueprint("libri", __name__)

@bp.get("/libri")
def lista():
    righe = get_db().execute(
        "SELECT l.id, l.titolo, l.prezzo, a.nome AS autore FROM libro l "
        "JOIN autore a ON a.id = l.autore_id ORDER BY l.titolo LIMIT ?",
        (current_app.config["MAX_LIBRI_PER_PAGINA"],),
    ).fetchall()
    return render_template("libri/lista.html", libri=righe)
```

Il `LIMIT` arriva dalla configurazione, non da un numero scritto nella query: cambiare la dimensione delle pagine diventa una modifica nella factory e non una caccia nei sorgenti.

```html
<!-- biblioteca/templates/libri/lista.html -->
<!doctype html>
<html lang="it"><head><meta charset="utf-8"><title>Biblioteca</title></head>
<body>
  <h1>Libri ({{ libri|length }})</h1>
  <ul>
  {% for l in libri %}
    <li>{{ l["titolo"] }} — {{ l["autore"] }} — {{ "%.2f"|format(l["prezzo"]) }} €</li>
  {% else %}
    <li>Nessun libro in archivio.</li>
  {% endfor %}
  </ul>
  <p><a href="{{ url_for('libri.nuovo') }}">Aggiungi un libro</a></p>
</body></html>
```

```python
import re

MAX_PREZZO = 999.99
ISBN_RE = re.compile(r"^\d{13}$")

@bp.route("/libri/nuovo", methods=["GET", "POST"])
def nuovo():
    errori, dati = [], {}
    if request.method == "POST":
        dati = {"isbn": request.form.get("isbn", "").strip(),
                "titolo": request.form.get("titolo", "").strip(),
                "autore": request.form.get("autore", "").strip(),
                "prezzo": request.form.get("prezzo", "").strip()}
        if not ISBN_RE.match(dati["isbn"]):
            errori.append("L'ISBN deve essere di 13 cifre.")
        if not dati["titolo"]:
            errori.append("Il titolo è obbligatorio.")
        try:
            prezzo = float(dati["prezzo"])
            if not 0 <= prezzo <= MAX_PREZZO:
                errori.append(f"Il prezzo deve stare tra 0 e {MAX_PREZZO}.")
        except ValueError:
            errori.append("Il prezzo deve essere un numero.")
        if not errori:
            db = get_db()
            autore = db.execute("SELECT id FROM autore WHERE nome = ?", (dati["autore"],)).fetchone()
            if autore is None:
                cur = db.execute("INSERT INTO autore (nome) VALUES (?)", (dati["autore"],))
                autore_id = cur.lastrowid
            else:
                autore_id = autore["id"]
            try:
                db.execute("INSERT INTO libro (isbn, titolo, autore_id, prezzo) VALUES (?, ?, ?, ?)",
                           (dati["isbn"], dati["titolo"], autore_id, prezzo))
                db.commit()
            except sqlite3.IntegrityError:
                db.rollback()
                errori.append("ISBN già presente in archivio.")
            else:
                return redirect(url_for("libri.lista"))
    return render_template("libri/nuovo.html", errori=errori, dati=dati), 400 if errori else 200
```

Il form deve includere il token, altrimenti il POST viene respinto con 400 anche se i campi sono corretti. Flask non genera un token CSRF automaticamente: il modo compatto è una hidden input con un valore firmato letto dalla sessione, oppure `Flask-WTF` che lo genera e lo verifica per te.

```html
<!-- biblioteca/templates/libri/nuovo.html -->
<form method="post">
  <input type="hidden" name="csrf_token" value="{{ session.csrf_token }}">
  <label>ISBN <input name="isbn" value="{{ dati.get('isbn', '') }}"></label>
  <label>Titolo <input name="titolo" value="{{ dati.get('titolo', '') }}"></label>
  <label>Autore <input name="autore" value="{{ dati.get('autore', '') }}"></label>
  <label>Prezzo <input name="prezzo" type="number" step="0.01" value="{{ dati.get('prezzo', '') }}"></label>
  <button type="submit">Salva</button>
</form>
{% for e in errori %}<p class="errore">{{ e }}</p>{% endfor %}
```

Per una verifica senza estensioni basta confrontare `session["csrf_token"]` con il valore del form in un `before_request` sul blueprint e usare `secrets.compare_digest`. `Flask-WTF` è la scelta più robusta in un progetto reale perché scade il token e lo rigenera.

## Passo 3: endpoint JSON e test

```python
# biblioteca/api.py
from flask import Blueprint, jsonify, request
from .db import get_db

bp = Blueprint("api", __name__)

@bp.get("/libri")
def cerca():
    q = request.args.get("q", "")
    if len(q) < 2:
        return {"errore": "q deve avere almeno 2 caratteri"}, 400
    righe = get_db().execute(
        "SELECT titolo, prezzo FROM libro WHERE titolo LIKE ? ESCAPE '\\' ORDER BY titolo LIMIT 20",
        ("%" + q.replace("%", "\\%").replace("_", "\\_") + "%",),
    ).fetchall()
    return jsonify({"risultati": [dict(r) for r in righe]})

@bp.post("/libri")
def crea():
    if not request.is_json:
        return {"errore": "Content-Type application/json richiesto"}, 415
    corpo = request.get_json(silent=True) or {}
    mancanti = [c for c in ("isbn", "titolo") if not str(corpo.get(c, "")).strip()]
    if mancanti:
        return {"errore": "campi mancanti", "campi": mancanti}, 400
    return {"creato": corpo["titolo"]}, 201
```

La `LIKE` con `ESCAPE` previene un errore sottile: senza escape, una `q` contenente `%` cerca "tutto" e una contenente `_` diventa wildcard. È SQL valido, eseguito come parametro, ma restituisce risultati sbagliati.

```python
# tests/conftest.py
import pytest
from biblioteca import create_app
from biblioteca.db import get_db

@pytest.fixture
def app(tmp_path):
    app = create_app({"TESTING": True, "SECRET_KEY": "test",
                      "DATABASE": str(tmp_path / "test.sqlite")})
    with app.app_context():
        app.test_cli_runner().invoke(args=["init-db"])
        assert get_db().execute("SELECT COUNT(*) FROM libro").fetchone()[0] == 3
    yield app

@pytest.fixture
def client(app):
    return app.test_client()
```

```python
# tests/test_libri.py
import pytest

def test_lista_html(client):
    r = client.get("/libri")
    assert r.status_code == 200
    assert "Se una notte".encode() in r.data

def test_titolo_escaped(client):
    with client.application.app_context():
        from biblioteca.db import get_db
        db = get_db()
        db.execute("INSERT INTO libro (isbn, titolo, autore_id, prezzo) VALUES ('9780000000001', '<script>x</script>', 1, 1)")
        db.commit()
    assert b"<script>x" not in client.get("/libri").data

def test_cerca_troppo_corta(client):
    assert client.get("/api/libri?q=a").status_code == 400

@pytest.mark.parametrize("ct,corpo,atteso", [
    ("application/json", {"isbn": "9780000000002", "titolo": "Nuovo"}, 201),
    ("application/json", {"isbn": "9780000000002"}, 400),
    ("text/plain", "isbn=1", 415),
])
def test_crea_api(client, ct, corpo, atteso):
    r = client.post("/api/libri", data=corpo if ct == "application/json" else corpo,
                    content_type=ct)
    assert r.status_code == atteso

def test_404_api_in_json(client):
    r = client.get("/api/inesistente")
    assert r.status_code == 404 and "errore" in r.get_json()
```

Il test sull'escaping è quello che di solito manca: verifica che un titolo con `<script>` non finisca nel DOM come markup. Il test parametrizzato copre in una funzione i tre casi che rompono le API scritte in fretta: successo, campo mancante, formato sbagliato.

```bash
python -m pytest -q
waitress-serve --port=8000 "biblioteca:create_app()"
```

## Esercizi

1. Aggiungi la paginazione con `?pagina=` che restituisce 404 oltre l'ultima pagina, e testala sul confine.
2. Sostituisci il token CSRF artigianale con `Flask-WTF` e verifica che un POST senza token dia 400.
3. Sposta `SECRET_KEY` in una variabile d'ambiente e fallisci all'avvio se è la stringa di sviluppo e `FLASK_DEBUG` è spento.
4. Aggiungi un endpoint `DELETE /api/libri/<id>` che rispetti la `ON DELETE RESTRICT` dell'autore e restituisca 409 sul conflitto.
5. Rendi `cerca` case-insensitive per lettere accentate: `LIKE` non basta, serve una colonna normalizzata o `COLLATE NOCASE` — quali differenze?
6. Misura con `time` un test che crea 10.000 libri con `execute` singolo e con `executemany`: perché cambia molto?

<details>
<summary>Soluzione</summary>

1. `LIMIT 50 OFFSET (pagina-1)*50` con `pagina` letto con `request.args.get("pagina", 1, type=int)`; se il conteggio è inferiore all'offset si fa `abort(404)`. Il test verifica `pagina=2` con 3 libri come 404.

2. `FlaskWTF(app)` in `create_app`, `{{ form.csrf_token }}` nel template e un `CSRFProtect` che intercetta i POST; il test invia un POST senza `csrf_token` attendendo 400.

3. `app.config["SECRET_KEY"] = os.environ["FLASK_SECRET_KEY"]` con `KeyError` esplicito; se `FLASK_DEBUG` è assente e la chiave è quella di sviluppo, si solleva `RuntimeError` nella factory.

4. `DELETE` con `execute` ed eccezione `sqlite3.IntegrityError` catturata come 409; con `PRAGMA foreign_keys = ON` il vincolo scatta e la riga resta.

5. `LIKE` in SQLite è case-insensitive per ASCII ma non per Unicode: `COLLATE NOCASE` ha la stessa portata. Per `É` contro `é` serve una colonna `titolo_norm` in minuscolo senza accenti, calcolata in Python con `unicodedata.normalize("NFKD", t)` e un indice su quella.

6. `executemany` fa un solo passaggio di preparazione e commit rispetto a 10.000 `execute` separati, ma il guadagno vero è la transazione unica: ogni `commit` è una `fsync` su disco. Con `executemany` il tempo scende da secondi a frazioni di secondo.

</details>

## Errori comuni

- **Dimenticare `PRAGMA foreign_keys = ON`**: `ON DELETE RESTRICT` non viene applicato e la cancellazione di un autore cancella la coerenza.
- **Interpolare la query nel template con `|safe`**: `markupsafe` ha `escape`, e `|safe` va riservato ad HTML prodotto da te.
- **Costruire il pattern `LIKE` senza escape**: `%` e `_` nell'input cambiano la semantica della ricerca.
- **Restituire 400 con un corpo HTML su un endpoint JSON**: lo script fallisce nel parsing e il vero errore si perde.
- **Fixture che usano lo stesso file SQLite**: `init-db` fa `DROP TABLE` e ogni test interferisce con gli altri.
- **Testare l'escaping con un carattere innocuo**: solo `<script>` dimostra che l'autoescaping è attivo.
- **Mostrare il prezzo con `float` in JSON senza formato**: `12.5` invece di `12.50` rompe i confronti nel client, meglio `str()` di `Decimal` o un campo stringa.

## In sintesi

Hai costruito una applicazione Flask completa: factory con configurazione per test, blueprint HTML e JSON con errori distinti, schema con vincoli attivi, comando CLI ripetibile e test che coprono rendering, escaping, validazione e formati di errore. I prossimi passi naturali sono un ORM con migrazioni (SQLAlchemy e Alembic) al posto del SQL scritto a mano, un rate limit sugli endpoint pubblici e una pipeline che esegue `pytest` e il deploy con Gunicorn prima del rilascio.

## Fonti

- [Flask documentation](https://flask.palletsprojects.com/en/stable/)
- [Tutorial: develop a Flask application](https://flask.palletsprojects.com/en/stable/tutorial/)
- [Using SQLite 3 with Flask](https://flask.palletsprojects.com/en/stable/patterns/sqlite3/)
- [Templates and Jinja](https://jinja.palletsprojects.com/en/stable/)
