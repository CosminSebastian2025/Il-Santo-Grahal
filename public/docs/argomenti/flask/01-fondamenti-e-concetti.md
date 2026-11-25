Flask è un micro-framework WSGI per Python: la versione 3.1.3, pubblicata a novembre 2025, occupa poche migliaia di righe e offre solo due cose obbligatorie, il routing e l'oggetto richiesta-risposta. Tutto il resto, dal database alle migrazioni all'autenticazione, lo scegli tu. Questa lezione spiega il modello mentale di Flask, che è diverso da quello di Django e va capito prima di scrivere codice: l'oggetto applicazione globale, il contesto della richiesta e le funzioni che lavorano su un contesto implicito.

## Obiettivi

- Creare un'applicazione Flask minimale e avviarla con `flask run` o `app.run`.
- Distinguere route statiche, con convertitori e con metodi HTTP.
- Usare `request`, `g` e `session` capendo a quale richiesta appartengono.
- Restituire risposte JSON con stato e header espliciti.
- Riconoscere quando un micro-framework conviene e quando diventa un costo.

## Un'applicazione minima e il suo contesto

```python
# app.py
from flask import Flask, g, jsonify, request

app = Flask(__name__)

@app.get("/")
def indice():
    return {"messaggio": "catalogo online"}

@app.get("/libri/<int:libro_id>")
def dettaglio(libro_id: int):
    return jsonify(id=libro_id, titolo=f"Libro {libro_id}")

@app.post("/libri")
def crea():
    dati = request.get_json(silent=False)     # 415 se Content-Type non è JSON
    return jsonify(creato=dati["titolo"]), 201
```

```bash
python -m venv .venv && . .venv/Scripts/activate
pip install "Flask==3.1.*"
flask --app app run --debug --port 5000
```

Il costruttore `Flask(__name__)` riceve il nome del modulo e lo usa per localizzare `templates/` e `static/` accanto al file. In Flask 3.x `@app.get`, `@app.post` e i colleghi sostituiscono `@app.route(methods=[...])` per le forme comuni; restituire un dizionario da una vista viene convertito in JSON automaticamente, mentre una stringa diventa `text/html; charset=utf-8`.

La parte che confonde chi arriva da Django: non passi `request` come argomento alle funzioni di supporto. `request`, `session`, `g` e `current_app` sono oggetti proxy che leggono da un contesto legato al thread o alla task corrente.

| Oggetto | Contesto | Durata | Uso tipico |
| --- | --- | --- | --- |
| `current_app` | applicazione | tutta l'app | configurazione, estensioni |
| `request` | richiesta | una richiesta | query string, corpo, header |
| `session` | richiesta | cookie firmato, cross-request | dati utente leggeri |
| `g` | richiesta | una richiesta | connessione DB condivisa |

```python
from flask import current_app, g
import sqlite3

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"], detect_types=sqlite3.PARSE_DECLTYPES)
    return g.db

@app.teardown_appcontext
def chiudi_db(eccezione=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()
```

`g` è il posto canonico per la connessione al database: una apertura per richiesta, chiusura garantita da `teardown_appcontext` anche quando la vista solleva un'eccezione. Fuori da un contesto attivo, accedere a `request` solleva `RuntimeError: Working outside of request context`: è il segnale che il codice va spostato in una funzione che riceve i dati come argomenti, così è testabile.

## Routing: convertitori, metodi e URL

I convertitori di Flask coprono i tipi comuni e applicano la conversione prima di chiamare la vista: `<int:id>` accetta solo cifre e converte in `int`, `<uuid:id>` valida il formato, `<path:resto>` cattura anche le barre. Un valore fuori formato produce 404 senza che la vista venga eseguita.

```python
from flask import send_from_directory
@app.route("/catalogo/<categoria>/<int:anno>")
def per_categoria(categoria, anno):
    ...

@app.route("/download/<path:nome_file>")
def scarica(nome_file):
    return send_from_directory(app.config["CARTELLA_FILE"], nome_file)
```

| Convertitore | Accetta | Esempio |
| --- | --- | --- |
| `string` (default) | testo senza `/` | `/autori/calvino` |
| `int` | cifre, positivo | `/anno/1979` |
| `float` | decimali con punto | `/prezzo/9.90` |
| `path` | testo con `/` | `/file/2026/report.csv` |
| `uuid` | UUID canonico | `/job/6f1c...` |

L'ordine di registrazione conta: `/libri/nuovo` va dichiarata prima di `/libri/<int:id>`, ma con il convertitore `int` non c'è ambiguità. Il rischio è con `<string:slug>`, che accetterebbe anche `nuovo`. Le regole statiche sono più veloci e non vengono mai interpretate come parametri.

I metodi si dichiarano con i decoratori o con `methods`; su un percorso condiviso conviene leggere `request.method` oppure registrare viste separate con lo stesso percorso, cosa che Flask permette e che produce un `405 Method Not Allowed` automatico con l'header `Allow` corretto.

```python
@app.route("/libri/<int:id>", methods=["GET", "PATCH", "DELETE"])
def libro(id):
    if request.method == "PATCH":
        return jsonify(aggiornato=id)
    if request.method == "DELETE":
        return "", 204
    return jsonify(id=id)
```

## Risposte, errori e configurazione

Una vista può restituire una stringa, un dizionario, una tupla `(corpo, status)`, `(corpo, status, header)` oppure un oggetto `Response`. La forma a tupla è la più compatta per le API, ma per header ripetuti o per `send_file` conviene `make_response`.

```python
from flask import abort, make_response

@app.get("/salute")
def salute():
    r = make_response({"stato": "ok", "versione": app.config["VERSIONE"]})
    r.headers["Cache-Control"] = "no-store"
    r.status_code = 200
    return r

@app.errorhandler(404)
def non_trovato(errore):
    if request.path.startswith("/api/"):
        return {"errore": "risorsa non trovata", "codice": 404}, 404
    return "Pagina non trovata", 404
```

Gli errori HTTP standard generano pagine HTML: per un'API serve un `errorhandler` che risponda in JSON solo sui prefissi giusti, senza cambiare il comportamento delle pagine. `abort(400, description="...")` interrompe la vista e passa al gestore corrispondente.

La configurazione si carica da oggetti Python, da variabili d'ambiente con prefisso e da un oggetto della classe app. Il segreto delle sessioni deve arrivare dall'esterno, perché le sessioni Flask sono cookie firmati con `SECRET_KEY`: chi conosce la chiave può forgiare qualsiasi sessione.

```python
import os

app.config.from_mapping(
    SECRET_KEY=os.environ["FLASK_SECRET_KEY"],
    DATABASE="catalogo.sqlite",
    JSON_SORT_KEYS=False,
)
app.config.from_prefixed_env()    # FLASK_DATABASE, FLASK_DEBUG, ecc.
```

Flask non gestisce il database, il pannello admin, le migrazioni né i permessi. Questa è la sua forza e il suo limite: una API da 10 endpoint con SQLite e poche dipendenze si scrive in un pomeriggio, mentre un gestionale con utenti, ruoli, form e report richiede l'assemblaggio di quattro o cinque librerie e la loro coerenza. Flask conviene quando il dominio è piccolo, quando il team conosce già le librerie scelte o quando il servizio è un pezzo di un sistema più grande.

| Serve | Flask da solo | Estensione o libreria tipica |
| --- | --- | --- |
| ORM e query | no | SQLAlchemy, Flask-SQLAlchemy |
| migrazioni | no | Alembic, Flask-Migrate |
| form e validazione | no | WTForms, Pydantic |
| autenticazione | no | Flask-Login, Authlib |
| server di produzione | no | Gunicorn, Waitress |
| serializzazione | base (`jsonify`) | Marshmallow, Pydantic |

## Errori comuni

- **Usare `app.run()` in produzione**: il server integrato è di sviluppo, a processo singolo e senza timeout.
- **Leggere `request` dentro un modulo importato a livello globale**: fuori dal contesto solleva `RuntimeError` e rende il codice non testabile.
- **Dimenticare `app.config["SECRET_KEY"]`**: `session` solleva un errore alla prima richiesta, e in produzione il default è illeggibile.
- **Restituire `None` da una vista che deve dare 204**: Flask solleva `TypeError`, per un corpo vuoto si restituisce `""`.
- **Usare `@app.route` con `string` dove serve `int`**: `abc` arriva alla vista e la conversione fallisce con 500 invece di 404.
- **Salvare oggetti nel `session`**: il cookie ha un limite pratico di 4 KB e il contenuto è firmato ma leggibile.

## In sintesi

Flask è routing più request context: l'applicazione è un oggetto, le viste sono funzioni, e `request`, `g` e `session` esistono solo durante la richiesta. I convertitori dell'URL fanno la prima validazione, e la forma della risposta determina il tipo di contenuto. La configurazione e i segreti sono espliciti, e ogni capacità oltre il routing (database, migrazioni, auth) è una scelta da fare e giustificare.

## Fonti

- [Flask documentation](https://flask.palletsprojects.com/en/stable/)
- [Flask quickstart](https://flask.palletsprojects.com/en/stable/quickstart/)
- [Flask configuration handling](https://flask.palletsprojects.com/en/stable/config/)
- [The request context](https://flask.palletsprojects.com/en/stable/reqcontext/)
