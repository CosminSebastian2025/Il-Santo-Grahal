Django è un framework web Python "batterie incluse": con un solo comando `django-admin startproject` ottieni routing URL, ORM relazionale, migrazioni dello schema, pannello di amministrazione, autenticazione e protezioni contro le classi di attacco più comuni. In questa lezione capisci da dove viene questa struttura, come si scompone in project e app, e come si scrive la prima vista che interroga il database.

## Obiettivi

- Distinguere il ruolo di project, app e settings dentro un progetto Django.
- Seguire una richiesta HTTP dall'URLconf alla vista fino al template di risposta.
- Modellare una entità con l'ORM e portarla in database con le migrazioni.
- Riconoscere le protezioni che Django applica di default e la loro dipendenza dal middleware.
- Avviare il server di sviluppo e verificare il risultato di ogni passaggio.

## Anatomia di un progetto

Un project è il contenitore della configurazione: `settings.py` con database, app installate e middleware, un `urls.py` radice e i file `wsgi.py`/`asgi.py` che espongono l'applicazione ai server di produzione. Una app è un blocco funzionale riutilizzabile, con il proprio `models.py`, `views.py`, `urls.py` e `migrations/`. Un progetto Django reale ha in genere una app per dominio (`catalogo`, `ordini`, `account`) e non una sola app gigantesca.

```bash
python -m venv .venv
. .venv/Scripts/activate        # Linux/macOS: source .venv/bin/activate
pip install "Django==5.2.*"
django-admin startproject config .
python manage.py startapp catalogo
python manage.py runserver 8000
```

Il punto della riga `startproject config .` è il punto finale: senza, Django crea una cartella annidata `config/config/settings.py` e i percorsi diventano scomodi. La struttura risultante è quella sotto, e `runserver` ricarica il codice a ogni salvataggio.

```
config/settings.py   config/urls.py   manage.py
catalogo/models.py   catalogo/views.py   catalogo/migrations/
```

| Comando | Effetto | Quando si usa |
| --- | --- | --- |
| `startproject` | crea settings, URLconf e i file ASGI/WSGI | una volta per progetto |
| `startapp` | crea un pacchetto app con struttura standard | una per dominio |
| `makemigrations` | genera i file di migrazione dalle differenze nei modelli | dopo ogni modifica al modello |
| `migrate` | applica le migrazioni al database | all'avvio e in deploy |
| `runserver` | server di sviluppo con autoreload | solo in locale |

Su Django 5.2 la versione minima di Python è la 3.10; l'ultima patch della serie supporta anche Python 3.14. Fissare `Django==5.2.*` con un vincolo di patch evita di scoprire incompatibilità di terze parti in produzione.

## Dalla richiesta HTTP alla risposta

Django non usa decoratori per instradare richieste: gli URL sono un elenco ordinato in `urls.py`, e ogni voce mappa un pattern a una vista. Il dispatcher prova i pattern nell'ordine dichiarato e si ferma al primo che corrisponde, quindi l'ordine conta quando esistono prefissi sovrapposti.

```python
# catalogo/urls.py
from django.urls import path
from . import views

app_name = "catalogo"
urlpatterns = [
    path("libri/", views.lista_libri, name="lista"),
    path("libri/<int:pk>/", views.dettaglio_libro, name="dettaglio"),
]
```

`<int:pk>` è un convertitore: Django valida il segmento, lo converte in intero e lo passa come argomento keyword alla vista. Un URL come `/libri/abc/` non arriva alla vista ma restituisce 404, e questo è già metà della validazione di input.

```python
# catalogo/views.py
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from .models import Libro

def lista_libri(request):
    libri = Libro.objects.filter(disponibile=True).order_by("titolo")
    return JsonResponse({"libri": [l.titolo for l in libri]})

def dettaglio_libro(request, pk):
    libro = get_object_or_404(Libro, pk=pk)     # 404 se non esiste
    return JsonResponse({"titolo": libro.titolo, "prezzo": str(libro.prezzo)})
```

`HttpRequest` è l'oggetto della richiesta (metodo, header, `GET`, corpo), `HttpResponse` e i suoi sottotipi sono la risposta. `JsonResponse` serializza un dizionario; valori come `Decimal` non sono serializzabili direttamente e vanno convertiti, come nel caso di `prezzo`.

Il flusso completo, con i nomi reali dei componenti, è questo:

1. Il server WSGI o ASGI chiama l'applicazione Django con l'ambiente della richiesta.
2. Il middleware `SecurityMiddleware` e gli altri dello stack elaborano richiesta e risposta.
3. L'URL resolver confronta il percorso con `urlpatterns` e richiama la vista.
4. La vista interroga l'ORM, che traduce le queryset in SQL e restituisce modelli.
5. Il template engine o `JsonResponse` produce il corpo, e gli header `Content-Type` e `X-Frame-Options: DENY` vengono aggiunti dal middleware.

## Modelli, ORM e migrazioni

L'ORM mappa classi Python su tabelle. Una classe `Model` dichiara campi tipizzati, e la chiave primaria `id` viene creata automaticamente se non ne dichiari un'altra. Non scrivi SQL per le operazioni comuni, ma ogni accesso a un campo correlato può generare una query: è il problema delle N+1 query.

```python
# catalogo/models.py
from django.db import models

class Autore(models.Model):
    nome = models.CharField(max_length=120)

class Libro(models.Model):
    titolo = models.CharField(max_length=200, db_index=True)
    autore = models.ForeignKey(Autore, on_delete=models.PROTECT, related_name="libri")
    prezzo = models.DecimalField(max_digits=6, decimal_places=2)
    disponibile = models.BooleanField(default=True)
    creato_il = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(prezzo__gte=0), name="prezzo_non_negativo"),
        ]
```

`on_delete` è obbligatorio e dice cosa fare quando l'autore viene cancellato: `PROTECT` rifiuta la cancellazione finché ci sono libri, `CASCADE` li elimina. È una decisione di dominio, non un dettaglio tecnico. `CheckConstraint` sposta il vincolo `prezzo >= 0` nel database, dove vale anche per script e shell che aggirano Django.

```python
>>> from catalogo.models import Libro, Autore
>>> a = Autore.objects.create(nome="Italo Calvino")
>>> Libro.objects.create(titolo="Se una notte", autore=a, prezzo="12.50")
>>> Libro.objects.filter(disponibile=True).count()
1
>>> Libro.objects.select_related("autore").first().autore.nome
'Italo Calvino'
```

`select_related` fa una JOIN e carica l'autore insieme al libro; senza di esso ogni accesso a `libro.autore` costa una query. Per relazioni molti-a-molti o inverse si usa `prefetch_related`, che esegue una seconda query e le combina in Python.

Le migrazioni sono file Python versionati che descrivono un cambio di schema. `makemigrations` confronta i modelli con lo stato ricostruito dalle migrazioni precedenti e genera il diff; `migrate` registra l'applicazione della migrazione nella tabella `django_migrations`. Non è un'istantanea: aggiungere e poi rimuovere un campo produce due migrazioni, e il database le applica in ordine. Per questo le migrazioni dei file esistenti non si modificano a mano dopo un deploy.

| Operazione | Comando | Nota |
| --- | --- | --- |
| nuovo modello | `makemigrations catalogo` | genera un file con timestamp |
| applica | `migrate` | in deploy prima di avviare i worker |
| ispeziona SQL | `sqlmigrate catalogo 0001` | utile in revisione |
| stato | `showmigrations` | elenca applicate e pendenti |

## Protezioni di default e pannello admin

Django include `django.contrib.admin` e `django.contrib.auth` nelle app installate dal template. Il pannello admin è una interfaccia CRUD generata dal registro dei modelli, utile durante lo sviluppo e per operazioni amministrative controllate:

```python
# catalogo/admin.py
from django.contrib import admin
from .models import Autore, Libro

@admin.register(Libro)
class LibroAdmin(admin.ModelAdmin):
    list_display = ("titolo", "autore", "prezzo", "disponibile")
    list_filter = ("disponibile",)
    search_fields = ("titolo", "autore__nome")
```

Molte protezioni dipendono dal middleware e dai template. Il motore di template esegue autoescaping di variabili e attributi, `{% csrf_token %}` richiede e verifica il token sui POST, `SecurityMiddleware` aggiunge header come `X-Frame-Options`. Le consegne di default (CSRF, escaping, protezione delle sessioni con cookie firmati) spariscono se disattivi un middleware o marchi un dato come `SafeString`.

| Minaccia | Meccanismo | Dove si configura |
| --- | --- | --- |
| CSRF | token e cookie con verifica | middleware Csrf + `{% csrf_token %}` |
| XSS | autoescaping dei template | `Templates` in settings |
| SQL injection | query parametrizzate dell'ORM | uso dell'ORM, non SQL concatenato |
| clickjacking | header `X-Frame-Options` | `SecurityMiddleware` |

## Errori comuni

- **Una sola app per un progetto monolita**: `startapp core` con decine di modelli rende le migrazioni fragili e non permette di riusare nulla.
- **Modificare un file di migrazione già applicato**: il database e gli altri ambienti hanno una storia diversa da quella nel repository.
- **Dimenticare `select_related` in una lista**: una vista con 100 libri esegue 101 query e la latenza si moltiplica.
- **Lasciare `DEBUG = True` in produzione**: espone stack trace, impostazioni e tabelle SQL alle visite.
- **Registrare tutti i modelli nell'admin senza permessi**: l'admin diventa una seconda API non versionata e non testata.
- **Concatenare input utente in una query**: l'ORM è parametrizzato, `Libro.objects.raw(f"...{id}")` non lo è.

## In sintesi

Django offre un'ossatura completa: URL dichiarativi con convertitori, viste che ricevono un `HttpRequest` e restituiscono una risposta, ORM con migrazioni versionate, admin e middleware di sicurezza. La tua responsabilità è tenere project e app separati per dominio, conoscere il costo delle query, trattare `on_delete` e i vincoli come decisioni di dominio e non disattivare le protezioni predefinite senza sostituirle con qualcosa di equivalente.

## Fonti

- [Django 5.2 documentation](https://docs.djangoproject.com/en/5.2/)
- [URL dispatcher](https://docs.djangoproject.com/en/5.2/topics/http/urls/)
- [Models](https://docs.djangoproject.com/en/5.2/topics/db/models/)
- [Migrations](https://docs.djangoproject.com/en/5.2/topics/migrations/)
