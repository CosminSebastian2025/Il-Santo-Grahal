Django e Flask espongono due modi opposti di trattare il CSRF: il primo lo considera infrastruttura del framework e lo applica per default a ogni vista, il secondo mette a disposizione componenti separati, `flask-wtf` per i form e un'estensione per le API JSON. In questa lezione mettiamo a confronto la pipeline di Django con il trio `CSRFProtect` più `WTF_CSRF` più `fetch` e capiamo come scegliere la difesa giusta per form HTML, chiamate `fetch` e API stateless.

## Obiettivi

- Descrivere il flusso completo del middleware CSRF di Django e della sua vista `csrf`.
- Configurare `flask-wtf` per i form HTML e `CSRFProtect` con header per `fetch`.
- Scegliere tra token in sessione, double-submit firmato e rotazione del token.
- Riconoscere le trappole di `SameSite=None` e delle API JSON.

## Django: middleware, token e vista

In un progetto Django moderno il CSRF è attivo senza configurazione: `CsrfViewMiddleware` compare in `MIDDLEWARE` e ogni `POST` senza token valido riceve `403 Forbidden`. Il template tag `{% csrf_token %}` stampa un `<input type="hidden" name="csrfmiddlewaretoken">`, mentre `@csrf_exempt` serve solo nelle integrazioni che verificano l'autenticità altrimenti, tipicamente webhook con firma HMAC.

```python
# settings.py
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]
CSRF_TRUSTED_ORIGINS = ["https://app.example.it"]
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False  # il token serve a JavaScript
SESSION_COOKIE_SAMESITE = "Lax"
```

Django non usa solo un token di sessione: aggiunge un "mascheramento" per ogni risposta, in modo che il tag possa generare varianti diverse dello stesso token, tutte validate dal middleware contro il segreto in cookie e la sessione. Nel 2024 Django ha introdotto il parametro `csrf_token` in `render()` e `TemplateResponse()` per il rendering asincrono, e la vista `django.views.decorators.csrf.csrf` è raggiungibile solo via `POST`. Il fetch di un token per le chiamate `fetch` si fa tipicamente da una pagina che contiene già il tag.

```html
<!-- template: kp su un form classico -->
<form method="post" action="/pagamenti/">
  {% csrf_token %}
  <input name="importo" inputmode="decimal">
  <button type="submit">Invia</button>
</form>

<script type="module">
  const cookie = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
  await fetch("/api/pagamenti/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRFToken": cookie },
    body: JSON.stringify({ importo: "120.00" }),
  });
</script>
```

Per le viste che non usano il template engine la difesa si esplicita, e il decoratore `ensure_csrf_cookie` scrive il cookie in una risposta che altrimenti non lo emetterebbe. La verifica dell'origine viene eseguita prima del confronto dei token quando `Origin` è presente.

## Flask: due estensioni, tre casi

Flask non impone alcuna difesa. Per i form HTML si usa `flask-wtf`, che verifica il token in ogni form creato con `FlaskForm`; per le richieste `fetch` e i form non gestiti da `FlaskForm` si attiva `CSRFProtect`, che controlla tutti i metodi insicuri e accetta il token anche dall'header `X-CSRFToken`.

```python
from flask import Flask, jsonify, render_template
from flask_wtf import CSRFProtect
from flask_wtf.csrf import generate_csrf, CSRFError

app = Flask(__name__)
app.config.update(
    SECRET_KEY=...,           # da variabile d'ambiente
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=True,
    WTF_CSRF_TIME_LIMIT=3600, # token valido un'ora
)
csrf = CSRFProtect(app)

@app.get("/note/nuova")
def pagina():
    return render_template("note.html", csrf_token=generate_csrf())

@app.errorhandler(CSRFError)
def csrf_error(e):
    return jsonify(error="csrf", reason=e.description), 400
```

Lato client il token viaggia nell'header, così non inquina il corpo JSON:

```javascript
const token = document.querySelector('meta[name="csrf-token"]').content;
const res = await fetch("/api/note", {
  method: "POST",
  credentials: "same-origin",
  headers: { "Content-Type": "application/json", "X-CSRFToken": token },
  body: JSON.stringify({ nota: "riordino" }),
});
if (res.status === 400) console.warn("token CSRF assente o scaduto");
```

| Scenario | Django | Flask |
| --- | --- | --- |
| form HTML | `{% csrf_token %}` | `form.hidden_tag()` di FlaskForm |
| fetch JSON | header `X-CSRFToken` dal cookie | header `X-CSRFToken` da `generate_csrf()` |
| webhook esterno | `@csrf_exempt` o verifica HMAC | `@csrf.exempt` o verifica HMAC |
| token scaduto | messaggio 403 con motivo | `CSRFError` con `description` |
| API per client non browser | token per cliente o autenticazione forte | idem, mai `csrf.exempt` generico |

## Criteri di scelta

Il token in sessione è il default e funziona quando il client è un browser con sessione. Quando l'API è consumata da client che non possono leggere cookie (app native, script) il CSRF non è il modello giusto: si passa a un'autenticazione esplicita, per esempio `Authorization: Bearer` con token che il browser non allega automaticamente, oppure a mutua TLS. In questi casi il CSRF esiste solo per il percorso browser, e l'eccezione va limitata a quelle rotte.

Il double-submit firmato serve quando non si vuole stato di sessione: il server emette un token firmato con HMAC, lo mette in cookie e il client lo ricopia in header; il server verifica la firma e l'uguaglianza. Django implementa già una variante robusta con mascheramento, `flask-wtf` quella con `WTF_CSRF_TIME_LIMIT`. La regola pratica: due implementazioni, due approcci; mischiarli nello stesso servizio causa 403 intermittenti, spesso difficili da riprodurre in locale.

Ultimo punto: le API che accettano `content-type: text/plain` senza controllare l'origine sono esposte, perché quel tipo è una richiesta semplice e non richiede preflight. Il controllo di `Content-Type`, unito a `Origin` e al token, chiude anche quella porta.

## Errori comuni

- **Leggere il token dalla sessione dopo il login**: Django ruota il token al login per evitare session fixation; un client che lo aveva memorizzato deve ricaricarlo.
- **Restituire 403 secco su un'API**: un client che gestisce solo 401 interpreta il 403 come problema di permessi e non riprova con il token aggiornato.
- **Marcare `csrf_exempt` tutto l'API router**: si annulla la protezione per tutti i client browser che usano quella rotta.
- **Fare il render di un template fuori da `render()` con il token creato a mano**: nel rendering asincrono serve passare `csrf_token` o usare la vista dedicata.
- **Testare il CSRF solo con curl senza Origin né cookie**: il test passa sempre e non dimostra nulla; serve un test che invii la richiesta senza token e si aspetti il rifiuto.

## In sintesi

Django applica il CSRF per default con middleware, mascheramento e vista dedicata; Flask lo lascia scegliere e va composto da `CSRFProtect`, `FlaskForm` e header espliciti. La scelta tra sessione, double-submit e autenticazione forte dipende dal client, non dal framework. Qualunque sia il meccanismo, la verifica dell'origine e il controllo del `Content-Type` restano i compagni obbligatori del token.

## Fonti

- [Django Documentation - Cross Site Request Forgery protection](https://docs.djangoproject.com/en/stable/ref/csrf/)
- [Flask-WTF Documentation](https://flask-wtf.readthedocs.io/)
- [OWASP - CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#token-based-mitigation)
- [MDN - Set-Cookie header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
