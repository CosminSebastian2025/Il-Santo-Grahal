In questo laboratorio metti in ginocchio un'applicazione Flask e poi la ripari, lavorando solo su un ambiente locale. Costruisci un gestore di note con login, un endpoint `POST /api/note` e una pagina statica servita da un secondo dominio locale che simula il sito dell'attaccante. Prima dimostri che il CSRF funziona, poi aggiungi token, verifica dell'origine e SameSite, e infine scrivi test automatici che provano che l'attacco ormai viene rifiutato.

## Obiettivi

- Riprodurre un CSRF completo tra due origini locali distinguibili.
- Applicare `CSRFProtect`, header `X-CSRFToken` e verifica di `Origin` su un'app Flask.
- Costruire un harness di test con `pytest` che copre richieste con e senza token.
- Documentare i criteri di uscita: cosa deve fallire e con quale codice di stato.

## Ambiente e applicazione bersaglio

Serve Python 3.11 o superiore e l'accesso a `127.0.0.1` e a `localhost` come due origini diverse per il browser, perché il porto cambia l'origine. Su Windows gli host in `C:\Windows\System32\drivers\etc\hosts` possono aggiungere `attacker.test 127.0.0.1` per avere un nome più leggibile; in alternativa si usa `http://localhost:5001` come origine attaccante e `http://127.0.0.1:5000` come bersaglio.

```bash
python -m venv .venv
source .venv/Scripts/activate     # PowerShell: .venv\Scripts\Activate.ps1
pip install flask flask-wtf pytest
```

L'applicazione ha tre rotte: il login con cookie di sessione, la lista note e la creazione nota. La versione vulnerable non ha difese, la versione riparata aggiunge quelle della lezione precedente.

```python
# app.py - versione vulnerabile
from flask import Flask, request, jsonify, session

app = Flask(__name__)
app.secret_key = "lab-only-not-for-production"
NOTE = []

@app.post("/login")
def login():
    session["user"] = request.form["user"]  # nessuna password: solo lab
    return jsonify(ok=True)

@app.post("/api/note")
def crea_nota():
    if "user" not in session:
        return jsonify(error="unauthenticated"), 401
    NOTE.append({"user": session["user"], "testo": request.form.get("testo", "")})
    return jsonify(count=len(NOTE))
```

Il sito attaccante è un file statico con un form che punta al bersaglio. Non serve JavaScript: il browser invia il form e allega il cookie di sessione se la policy lo consente.

```html
<!-- attacker/index.html, servito con: python -m http.server 5001 -->
<form id="esca" method="POST" action="http://127.0.0.1:5000/api/note">
  <input type="hidden" name="testo" value="nota creata dall'attaccante">
</form>
<script>document.getElementById("esca").submit();</script>
```

Per verificare l'attacco senza browser si usa `requests`, che non applica SameSite ma riproduce il comportamento essenziale: il cookie viene allegato automaticamente perché il client manda tutti i cookie dell'host, a prescindere dalla pagina di provenienza.

```python
# exploit_test.py - dimostrazione, eseguilo due volte: prima e dopo la patch
import requests

s = requests.Session()
s.post("http://127.0.0.1:5000/login", data={"user": "mario"})
r = s.post("http://127.0.0.1:5000/api/note",
           data={"testo": "forgiata"},
           headers={"Origin": "http://127.0.0.1:5001"})
print(r.status_code, r.json())
```

Con la versione vulnerabile il risultato è `200` e il contatore sale: la richiesta con `Origin` estraneo è stata accettata. Questo è il criterio di uscita dell'attacco: se il codice è 200, la difesa non c'è.

## Patch: token, origine e SameSite

La patch tocca tre punti. Primo, `CSRFProtect` con `WTF_CSRF_SSL_STRICT` e cookie di sessione `SameSite=Strict` sul percorso API. Secondo, la verifica esplicita di `Origin` per le rotte `/api/*`, con l'elenco delle origini ammesse in configurazione. Terzo, la generazione del token lato pagina, da un endpoint che lo restituisce solo con sessione valida e con `Cache-Control: no-store`.

```python
# app.py - versione riparata
import secrets
from flask import Flask, request, jsonify, session, abort, g
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)
app.secret_key = "lab-only-not-for-production"
app.config.update(
    SESSION_COOKIE_SAMESITE="Strict",
    SESSION_COOKIE_SECURE=False,   # HTTP in locale: disattivato nel lab
    SESSION_COOKIE_HTTPONLY=True,
    WTF_CSRF_TIME_LIMIT=1800,
)
csrf = CSRFProtect(app)
ORIGINI_OK = {"http://127.0.0.1:5000"}

@app.before_request
def controlla_origine():
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.path.startswith("/api/"):
        if request.headers.get("Origin") not in ORIGINI_OK:
            abort(403, "origine non ammessa")

@app.post("/login")
def login():
    session["user"] = request.form["user"]
    session["csrf_extra"] = secrets.token_urlsafe(32)  # stato di sessione
    return jsonify(ok=True)

@app.post("/api/note")
def crea_nota():
    if "user" not in session:
        return jsonify(error="unauthenticated"), 401
    NOTE.append({"user": session["user"], "testo": request.form.get("testo", "")})
    return jsonify(count=len(NOTE))
```

Con `CSRFProtect` attivo ogni richiesta `POST` senza token riceve `400` con `description` "The CSRF token is missing". Il test dell'attacco deve ora vedere `400` e il contatore restare fermo, mentre una richiesta legittima con token e `Origin` corretta resta `200`. Tre casi sono sufficienti per dire che la patch funziona.

```python
# test_csrf.py
import pytest
from app import app as flask_app

@pytest.fixture
def client():
    flask_app.config["WTF_CSRF_ENABLED"] = True
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as c:
        yield c

def _login(client):
    client.post("/login", data={"user": "mario"})
    with client.session_transaction() as s:
        return s["csrf_extra"]

def test_senza_token_e_rifiutato(client):
    _login(client)
    r = client.post("/api/note", data={"testo": "x"},
                    headers={"Origin": "http://127.0.0.1:5001"})
    assert r.status_code == 403  # bloccato prima dal controllo di origine

def test_con_origine_giusta_senza_token(client):
    _login(client)
    r = client.post("/api/note", data={"testo": "x"},
                    headers={"Origin": "http://127.0.0.1:5000"})
    assert r.status_code == 400  # CSRFProtect: token mancante

def test_flusso_legittimo(client):
    token = _login(client)
    r = client.post("/api/note", data={"testo": "ok"},
                    headers={"X-CSRFToken": token, "Origin": "http://127.0.0.1:5000"})
    assert r.status_code == 200
```

Il terzo test sembra un dettaglio ma è il più importante: dimostra che la difesa non blocca gli utenti reali. Un test che copre solo il rifiuto è un falso senso di sicurezza.

## Esercizi e verifica finale

1. Prova l'attacco dal browser servendo `attacker/index.html` su `http://127.0.0.1:5001` e nota la differenza con `requests`: con `SameSite=Strict` il cookie non parte e il server risponde `401`, prima ancora del controllo di `Origin`.
2. Rimuovi `SameSite` e lascia solo `Origin`: l'attacco viene rifiutato con `403`, ma se il server fosse dietro un proxy che riscrive `Origin` il controllo fallirebbe nel verso opposto. Quale test aggiungi?
3. Apri la lista note con `GET` allo stesso endpoint e conferma che il token non è richiesto; poi immagina un endpoint `GET /api/note/delete/<id>` e spiega perché va vietato.
4. Introduci un endpoint per i token che accetta `GET` e risponde `Cache-Control: no-store`: verifica con `curl -I` che l'header ci sia.
5. Esegui `pytest -q` e annota quanti test passano; se `CSRFProtect` restituisce `400` anche sul flusso legittimo, controlla che `session["csrf_extra"]` venga popolato prima della richiesta.

Il criterio di uscita del laboratorio è un elenco di tre righe, verificate a mano: attacco con origine estranea rifiutato, richiesta senza token rifiutata, flusso legittimo con token e origine corretta accettato. Se le tre righe non sono tutte verdi, il prossimo passo non è aggiungere funzionalità ma trovare quale presupposto del CSRF è rimasto aperto.

## Errori comuni

- **Servire entrambe le app sulla stessa porta con due percorsi**: la same-origin policy non scatta e il test non prova nulla.
- **Usare `TESTING = True` e dimenticare `WTF_CSRF_ENABLED`**: Flask-WTF disabilita il token nei test per default in alcune versioni e il caso "senza token" passa.
- **Cookie `Secure` su HTTP in locale**: il browser lo scarta e il login non mantiene la sessione; in locale lo si lascia disattivato e si documenta.
- **Controllare `Origin` solo se presente**: un client che non manda l'header passa; la regola deve essere "assente o diversa, rifiuta" sulle rotte mutanti.
- **Fidarsi del `Referer`**: può mancare per impostazioni di privacy e non è un segnale affidabile.

## In sintesi

Il laboratorio mostra il CSRF dall'interno: una richiesta che l'attaccante non può leggere diventa un'azione eseguita, e la difesa si costruisce aggiungendo dimostrazioni d'intento indipendenti. Il token dimostra che la pagina giusta ha costruito la richiesta, l'origine dimostra da dove arriva, SameSite limita l'invio del cookie. I tre test del flusso sono l'unico modo per sapere che la patch funziona anche per chi ha diritto di usare l'applicazione.

## Fonti

- [Flask-WTF Documentation](https://flask-wtf.readthedocs.io/)
- [OWASP - CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN - Origin header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin)
- [MDN - Sec-Fetch-Site header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site)
