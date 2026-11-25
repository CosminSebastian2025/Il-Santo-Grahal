Un progetto Django cresce in tre direzioni che non si vedono nelle prime prove: configurazioni diverse per sviluppo e produzione, viste che devono fare più di una cosa (validare, autorizzare, limitare) e query che moltiplicano il loro numero con i dati reali. Questa lezione tratta i tre strumenti che rispondono a queste esigenze: settings divisi per ambiente con variabili esterne, middleware e viste basate su classi, e infine la resa dell'ORM nella pratica con transazioni e permessi. Django 5.2 è la base di riferimento.

## Obiettivi

- Separare la configurazione in base/dev/prod leggendo i segreti da variabili d'ambiente.
- Scrivere un middleware che misura e arricchisce il ciclo richiesta-risposta.
- Usare le viste generiche di Django e mixin per ridurre codice ripetuto.
- Riconoscere e correggere N+1 query con `select_related` e `prefetch_related`.
- Applicare transazioni e vincoli di integrità dove servono.

## Configurazione per ambiente

Il template genera un `settings.py` unico con `DEBUG = True` e una `SECRET_KEY` in chiaro. In un progetto reale conviene una cartella `config/settings/` con un `base.py` comune e file che lo importano. Il segreto non sta nel repository: arriva da una variabile d'ambiente del processo o da un secret manager.

```python
# config/settings/base.py
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]        # KeyError all'avvio: meglio di un default
INSTALLED_APPS = [
    "django.contrib.admin", "django.contrib.auth",
    "django.contrib.contenttypes", "django.contrib.sessions",
    "catalogo", "ordini",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
DATABASES = {"default": {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": os.environ["DB_NAME"],
    "HOST": os.environ.get("DB_HOST", "localhost"),
    "CONN_MAX_AGE": 60,                              # riusa la connessione tra richieste
}}
```

```python
# config/settings/dev.py
from .base import *   # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
```

```python
# config/settings/prod.py
from .base import *   # noqa: F403

DEBUG = False
ALLOWED_HOSTS = ["api.esempio.it"]
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31_536_000
CSRF_TRUSTED_ORIGINS = ["https://api.esempio.it"]
```

| Impostazione | Sviluppo | Produzione | Effetto se sbagliata |
| --- | --- | --- | --- |
| `DEBUG` | `True` | `False` | pagine 500 con dettagli interni esposte |
| `ALLOWED_HOSTS` | localhost | domini reali | 400 DisallowedHost o header Host non validato |
| `CONN_MAX_AGE` | 0 | 60 o più | nuove connessioni per ogni richiesta |
| `SECURE_SSL_REDIRECT` | off | on | redirect loop dietro un proxy mal configurato |

Il comando `manage.py` deve puntare al file giusto: `DJANGO_SETTINGS_MODULE=config.settings.prod ./manage.py check --deploy` esegue il controllo di deploy di Django, che segnala `DEBUG`, HSTS, cookie non sicuri e segreti deboli.

## Middleware e viste basate su classi

Il middleware è una catena di oggetti che avvolgono il ciclo richiesta-risposta in ordine dichiarato; la risposta risale in ordine inverso. Serve per preoccupazioni trasversali: identificare la richiesta, misurare la durata, aggiungere un header. Non è il posto in cui mettere regole di dominio.

```python
# config/middleware.py
import time, uuid, logging

log = logging.getLogger("richieste")

class MisuraRichieste:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.id_richiesta = uuid.uuid4().hex[:12]
        inizio = time.perf_counter()
        response = self.get_response(request)
        response["X-Request-Id"] = request.id_richiesta
        log.info("%s %s %s %.1fms", request.id_richiesta, request.method,
                 response.status_code, (time.perf_counter() - inizio) * 1000)
        return response
```

Un middleware è una funzione o classe con `get_response`; il `return` anche sui rami di errore garantisce che la risposta sia sempre la stessa istanza modificata. Se gestisci eccezioni personalizzate conviene un `process_exception` o `process_view` esplicito, non un `try/except` che restituisce una risposta diversa per errori di sistema.

Le viste generiche eliminano la ripetizione di lista, dettaglio, create, update e delete, con `get_queryset()` e `get_context_data()` come punti di personalizzazione.

```python
# catalogo/views.py
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.views.generic import ListView, UpdateView
from .models import Libro

class LibroListView(LoginRequiredMixin, ListView):
    model = Libro
    paginate_by = 20
    context_object_name = "libri"

    def get_queryset(self):
        qs = Libro.objects.select_related("autore").filter(disponibile=True)
        autore = self.request.GET.get("autore")
        if autore and autore.isdigit():
            return qs.filter(autore_id=int(autore))
        return qs

class LibroUpdateView(PermissionRequiredMixin, UpdateView):
    permission_required = "catalogo.change_libro"
    model = Libro
    fields = ["titolo", "prezzo", "disponibile"]
```

I mixin si leggono da sinistra a destra: `LoginRequiredMixin` redirige l'anonimo al login, `PermissionRequiredMixin` restituisce 403 se manca il permesso, e la vista generica gestisce il resto. `paginate_by` è il punto in cui una lista di 5000 righe smette di essere un problema.

## ORM in pratica: query, transazioni, permessi

Una queryset è pigra: costruire il filtro non esegue SQL, lo eseguono l'iterazione, `len()`, `list()` o l'indicizzazione. Questo permette di comporre filtri, ma rende invisibili le query nei template.

| Pattern | Query SQL | Rischio |
| --- | --- | --- |
| `for l in Libro.objects.all(): l.autore.nome` | 1 + N | N+1 |
| `Libro.objects.select_related("autore")` | 1 con JOIN | nulla |
| `Libro.objects.prefetch_related("tag")` | 2 | memoria per oggetto |
| `qs.filter(titolo__icontains=q)` | 1, senza indice | full scan |
| `qs.exists()` | 1, senza carcare righe | nulla |

L'indicatore pratico è `django.db.connection.queries` in `DEBUG`, oppure la `django-debug-toolbar`; il numero di query deve dipendere dalla forma della vista, non dal numero di righe. `only()` e `defer()` riducono le colonne lette quando la lista è molto grande, ma un campo escluso poi usato genera una query per oggetto: si usano insieme a `select_related` o non si usano.

Le transazioni proteggono operazioni composte: creare un ordine, scalare la disponibilità, registrare il movimento di magazzino devono essere una sola unità atomica.

```python
from django.db import transaction
from django.db.models import F

@transaction.atomic
def evadi(ordine_id: int):
    righe = Ordine.objects.select_for_update().get(pk=ordine_id).righe.all()
    for r in righe:
        Libro.objects.filter(pk=r.libro_id).update(giacenza=F("giacenza") - r.quantita)
```

`atomic` fa commit solo se tutto il blocco termina senza eccezioni; `select_for_update()` blocca le righe dentro la transazione, evitando che due richieste leggano la stessa giacenza. `F("giacenza") - r.quantita` calcola in SQL, quindi due aggiornamenti concorrenti si sommano invece di sovrascriversi.

I permessi integrati sono la granularità più piccola di autorizzazione: `auth.Permission` definisce add, change, delete e view per ogni modello, e `user.has_perm("catalogo.change_libro")` funziona anche su gruppi. Per regole su singoli oggetti servono controlli nella vista o una libreria dedicata: i permessi Django non sono per oggetto.

Nei test serve cautela con le transazioni. `TransactionTestCase` esegue i commit reali e svuota il database tra un test e l'altro, mentre `TestCase` avvolge ogni test in una transazione annullata alla fine: il codice con `on_commit` non farà commit dentro `TestCase` a meno di usare `self.captureOnCommitCallbacks(execute=True)`. Se il test deve verificare che dopo un errore non resti nulla di scritto, il `TransactionTestCase` è il contesto giusto, al costo di essere più lento.

## Errori comuni

- **`from .base import *` con valori ambientali calcolati nel base**: le variabili non si sovrascrivono con le liste, e `ALLOWED_HOSTS` duplicato crea confusione.
- **Middleware che accede al database per ogni richiesta**: aggiunge una query globale, meglio farlo lazily o in cache.
- **Vista generica senza `get_queryset`**: il filtro di visibilità va nel queryset, non nel `get_context_data`.
- **Mischiare `TransactionTestCase` e `TestCase` per lo stesso codice**: velocità e copertura dei commit diventano incoerenti.
- **Contare su `user.has_perm` per autorizzare una singola riga**: è un controllo globale, non per oggetto.
- **Caricare tutto con `values()` per risparmiare**: si perde la tipizzazione e i campi correlati tornano a generare query.

## In sintesi

La configurazione si costruisce come un albero: `base` comune, file per ambiente, segreti dall'esterno e `check --deploy` come guardrail. Il middleware gestisce ciò che riguarda ogni richiesta, le viste generiche e i mixin fanno il resto con poche righe e punti di override chiari. L'ORM è comodo ma va misurato: `select_related` e `prefetch_related` eliminano le N+1, `atomic` e `select_for_update` rendono le operazioni composte corrette sotto concorrenza, e i permessi restano di livello globale finché non aggiungi controlli ad hoc.

## Fonti

- [Settings](https://docs.djangoproject.com/en/5.2/ref/settings/)
- [Middleware](https://docs.djangoproject.com/en/5.2/topics/http/middleware/)
- [Class-based views](https://docs.djangoproject.com/en/5.2/topics/class-based-views/)
- [QuerySet API reference](https://docs.djangoproject.com/en/5.2/ref/models/querysets/)
