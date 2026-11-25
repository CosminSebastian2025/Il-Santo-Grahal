In questo laboratorio costruisci `biblio-api`, un servizio Django che espone un catalogo di libri in JSON, con filtro per autore, paginazione, comando di importazione da CSV e test automatici. L'obiettivo non è ripetere i tutorial "hello world" ma seguire il ciclo completo che incontri in un progetto reale: modelli e migrazioni, endpoint senza il pannello admin, importazione idempotente e verifica con `manage.py test`. Alla fine la stessa applicazione deve partire con WSGI o ASGI e passare `check --deploy`.

## Obiettivi

- Creare il progetto `config` e l'app `catalogo` con una struttura di cartelle stabile.
- Definire modelli con vincoli nel database e generare due migrazioni, di cui una con indice.
- Esporre due endpoint JSON con paginazione su cursore e filtro validato.
- Scrivere un comando di management che importa un CSV senza duplicare righe.
- Scrivere test che coprono gli endpoint, il comando e le protezioni di base.
- Avviare l'applicazione con un server ASGI e controllare la configurazione di deploy.

## Il contratto di `biblio-api`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| `GET /api/libri/` | lista paginata, default 20 elementi | evita risposte enormi |
| `?autore=<id>` | filtro per autore, intero positivo | parametro validato, 400 se invalido |
| `?cursore=<opaco>` | `next`/`previous` rimandati dal server | stabile durante gli inserimenti |
| `GET /api/libri/<id>/` | dettaglio o 404 JSON | nessuna pagina HTML di errore |
| `importa_libri CSV` | inserimento idempotente per `isbn` | rilanciabile senza duplicati |
| `OPTIONS` | 405 gestito, non 500 | client che sonda l'endpoint non lo rompono |

La paginazione su cursore è preferibile a quella per numero di pagina per un motivo concreto: con `?page=3` un inserimento sposta gli elementi e il client salta o ripete righe. Il cursore codifica l'ultima chiave vista, quindi l'elenco non si sposta.

## Passo 1: progetto, app e modelli

```bash
mkdir biblio-api && cd biblio-api
python -m venv .venv && . .venv/Scripts/activate
pip install "Django==5.2.*"
django-admin startproject config .
python manage.py startapp catalogo
```

```python
# catalogo/models.py
from django.db import models

class Autore(models.Model):
    nome = models.CharField(max_length=120, unique=True)
    paese = models.CharField(max_length=2, blank=True)

    def __str__(self):
        return self.nome

class Libro(models.Model):
    isbn = models.CharField(max_length=13, unique=True)   # chiave naturale per l'import
    titolo = models.CharField(max_length=200, db_index=True)
    autore = models.ForeignKey(Autore, on_delete=models.PROTECT, related_name="libri")
    prezzo = models.DecimalField(max_digits=6, decimal_places=2)
    anno = models.PositiveSmallIntegerField()
    creato_il = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creato_il", "-pk"]
        constraints = [
            models.CheckConstraint(check=models.Q(prezzo__gte=0), name="prezzo_non_negativo"),
            models.CheckConstraint(check=models.Q(anno__gte=1450), name="anno_plausibile"),
        ]
```

```bash
python manage.py makemigrations catalogo
python manage.py sqlmigrate catalogo 0001
python manage.py migrate
```

`sqlmigrate` va letto prima di `migrate`: mostra il `CREATE TABLE` con i `CHECK` e le foreign key reali. `unique=True` su `isbn` è anche l'indice che serve all'import, mentre `anno__gte=1450` impedisce date impossibili a livello di database, non solo di validazione.

## Passo 2: endpoint JSON con paginazione

Il progetto resta senza admin per non allargare la superficie esposta; `CommonMiddleware` e `SecurityMiddleware` restano attivi.

```python
# catalogo/views.py
from django.http import JsonResponse
from django.core.paginator import Paginator, EmptyPage
from django.shortcuts import get_object_or_404
from .models import Libro

def lista_libri(request):
    autore = request.GET.get("autore", "")
    if autore and not autore.isdigit():
        return JsonResponse({"errore": "autore deve essere un intero"}, status=400)

    qs = Libro.objects.select_related("autore").all()
    if autore:
        qs = qs.filter(autore_id=int(autore))

    paginatore = Paginator(qs, 20)
    try:
        pagina = paginatore.page(request.GET.get("page", 1))
    except EmptyPage:
        pagina = paginatore.page(paginatore.num_pages)

    return JsonResponse({
        "count": paginatore.count,
        "next": pagina.next_page_number() if pagina.has_next() else None,
        "libri": [
            {"id": l.id, "isbn": l.isbn, "titolo": l.titolo,
             "autore": l.autore.nome, "prezzo": str(l.prezzo), "anno": l.anno}
            for l in pagina.object_list
        ],
    })

def dettaglio_libro(request, pk):
    libro = get_object_or_404(Libro.objects.select_related("autore"), pk=pk)
    return JsonResponse({"id": libro.id, "titolo": libro.titolo,
                         "autore": libro.autore.nome, "prezzo": str(libro.prezzo)})
```

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

```python
# config/urls.py
from django.urls import include, path

urlpatterns = [path("api/", include("catalogo.urls"))]
```

Il `select_related("autore")` dentro la vista non è un dettaglio: senza, una pagina da 20 libri esegue 21 query, e con 50 pagine richieste al minuto il database diventa il collo di bottiglia. `get_object_or_404` restituisce una pagina 404 HTML di default; per un'API conviene un handler coerente, che si registra con `handler404` in `config/urls.py` e restituisce JSON.

## Passo 3: importazione CSV idempotente

Il comando vive in `catalogo/management/commands/importa_libri.py` e usa `update_or_create` sull'ISBN, così l'import può essere rilanciato dopo un errore di rete senza creare duplicati.

```python
# catalogo/management/commands/importa_libri.py
import csv
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from catalogo.models import Autore, Libro

class Command(BaseCommand):
    help = "Importa libri da un CSV con colonne isbn,titolo,autore,prezzo,anno"

    def add_arguments(self, parser):
        parser.add_argument("percorso")
        parser.add_argument("--secco", action="store_true", help="valida senza scrivere")

    def handle(self, percorso, secco, **opzioni):
        letti = creati = aggiornati = 0
        visti = set()
        with open(percorso, newline="", encoding="utf-8") as f, \
                transaction.atomic():
            for riga, r in enumerate(csv.DictReader(f), start=2):
                letti += 1
                isbn = (r.get("isbn") or "").strip()
                if len(isbn) != 13 or not isbn.isdigit():
                    raise CommandError(f"riga {riga}: isbn non valido {isbn!r}")
                if isbn in visti:
                    raise CommandError(f"riga {riga}: isbn duplicato {isbn!r}")
                visti.add(isbn)
                try:
                    prezzo = Decimal(r["prezzo"])
                    anno = int(r["anno"])
                except (InvalidOperation, KeyError, ValueError):
                    raise CommandError(f"riga {riga}: prezzo o anno non valido")
                autore, _ = Autore.objects.get_or_create(nome=r["autore"].strip())
                _, creato = Libro.objects.update_or_create(
                    isbn=isbn,
                    defaults={"titolo": r["titolo"].strip(), "autore": autore,
                              "prezzo": prezzo, "anno": anno},
                )
                creati += creato
                aggiornati += not creato
        self.stdout.write(self.style.SUCCESS(
            f"{letti} righe, {creati} nuovi, {aggiornati} aggiornati"))
```

```bash
cat > libri.csv <<'EOF'
isbn,titolo,autore,prezzo,anno
9788804668237,Se una notte,Italo Calvino,12.50,1979
9788807883612,Il barone rampante,Italo Calvino,10.00,1957
EOF
python manage.py importa_libri libri.csv --secco
python manage.py importa_libri libri.csv
python manage.py importa_libri libri.csv     # seconda esecuzione: 0 nuovi
```

Il `transaction.atomic()` intorno al ciclo è ciò che rende sicuro il "tutto o niente": con un ISBN duplicato alla riga 40, l'import non lascia 39 libri a metà. Il flag `--secco` serve a validare prima del deploy senza scrivere: si implementa restituendo dopo la validazione, oppure con `transaction.atomic()` e `raise` finale, ma il formato più leggibile è separare la lettura in una funzione pura che restituisce la lista di righe validate.

## Passo 4: test e avvio

```python
# catalogo/tests.py
from django.test import TestCase

from catalogo.models import Autore, Libro

class ApiLibriTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        a = Autore.objects.create(nome="Italo Calvino", paese="IT")
        for i in range(25):
            Libro.objects.create(isbn=f"978000000000{i:02d}", titolo=f"Libro {i:02d}",
                                 autore=a, prezzo="9.90", anno=1970)

    def test_lista_pagina_taglia_e_paginazione(self):
        r = self.client.get("/api/libri/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["count"], 25)
        self.assertEqual(len(r.json()["libri"]), 20)
        self.assertIsNotNone(r.json()["next"])

    def test_una_sola_query_per_pagina(self):
        with self.assertNumQueries(2):      # count + pagina
            self.client.get("/api/libri/")

    def test_filtro_autore_invalido(self):
        r = self.client.get("/api/libri/?autore=abc")
        self.assertEqual(r.status_code, 400)

    def test_dettaglio_inesistente_e_404(self):
        self.assertEqual(self.client.get("/api/libri/999999/").status_code, 404)
```

`assertNumQueries(2)` è la prova più utile in questa classe: la vista esegue una query per `count` del `Paginator` e una per la pagina, mentre `select_related` evita le 20 query degli autori. Se qualcuno lo rimuove, il test fallisce prima che il problema arrivi in produzione. `setUpTestData` crea i dati una volta per classe invece che per test.

```bash
python manage.py test catalogo -v 2
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py check --deploy
pip install "gunicorn" "uvicorn[standard]"
gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3
uvicorn config.asgi:application --port 8000
```

Gunicorn e Uvicorn leggono l'oggetto `application` esposto da `wsgi.py` e `asgi.py`; `--workers 3` vale per un container con 1 vCPU perché ogni worker è un processo separato con il proprio spazio di memoria. Il server di sviluppo `runserver` non è adatto a essere esposto: non ha timeout, non gestisce lo slowloris e ricarica il codice.

## Esercizi

1. Sostituisci `Paginator` con la paginazione su cursore usando un campo `creato_il` e `pk`: quale condizione `WHERE` sostituisce l'offset?
2. Aggiungi un'azione `POST /api/libri/` con validazione del corpo JSON e risposta 201 con header `Location`.
3. Rendi l'import parallelo leggibile: separa validazione e scrittura, e scrivi un test che su riga 40 non valida non crei nulla.
4. Aggiungi l'indice `(autore_id, -creato_il)` in una seconda migrazione e verifica con `sqlmigrate`.
5. Scrivi un handler `handler404` che restituisce JSON con un formato di errore stabile e testalo con `raise_request_exception = False`.
6. Prova il comando con AWS S3 o con un file da 1 milione di righe: dove finisce la memoria, e come cambieresti l'import?

<details>
<summary>Soluzione</summary>

1. Il cursore codifica `(creato_il, pk)` dell'ultimo elemento: la condizione è `Q(creato_il__lt=t) | Q(creato_il=t, pk__lt=p)` con l'ordinamento `("-creato_il", "-pk")`, così non c'è lo scambio di righe durante gli inserimenti.

2. La vista distingue `request.method`, legge `json.loads(request.body)` e usa un `Form` non legato a un modello per validare i campi; `HttpResponse(status=201, headers={"Location": ...})` non ha bisogno di `render`.

3. La funzione di validazione restituisce `list[Riga]` o solleva `CommandError` con il numero di riga; la scrittura itera su righe già validate dentro `transaction.atomic()`, e il test usa un CSV con la riga 40 rotta verificando che `Libro.objects.count()` resti invariato.

4. `models.Index(fields=["autore", "-creato_il"], name="catalogo_autore_creato")` in `Meta.indexes`, poi `makemigrations`; `sqlmigrate catalogo 0002` deve mostrare il `CREATE INDEX`.

5. `handler404 = "catalogo.views.non_trovato"` in `config/urls.py`, e il test usa `self.settings(DEBUG=False)` insieme a `raise_request_exception = False`.

6. La memoria cresce perché `csv.DictReader` è a flusso ma il `visti` set cresce con il file: per 1 milione di ISBN servono circa 25 MB solo per gli hash. Oltre quella scala l'import passa a `bulk_create` a blocchi e a un controllo di esistenza per blocchi con `isbn__in`.

</details>

## Errori comuni

- **Applicare `migrate` prima di leggere `sqlmigrate`**: i vincoli sbagliati si scoprono solo con i dati dentro.
- **Restituire `Decimal` dentro `JsonResponse`**: `TypeError` non serializzabile nei log, meglio `str()` esplicito o un serializer.
- **Filtro `?autore=` senza validazione**: `ValueError` diventa 500 invece di 400, perché `filter(autore_id="abc")` non è una query valida.
- **Import con `create()` invece di `update_or_create`**: la seconda esecuzione viola `unique` e lascia il lavoro a metà.
- **Testare solo il caso felice**: 400, 404 e la seconda esecuzione dell'import sono i casi che rompono in produzione.
- **Avviare con `runserver` dietro un reverse proxy**: nessun timeout, nessuna gestione di richieste lente.
- **Lasciare `DEBUG` o `ALLOWED_HOSTS` larghi**: il check `--deploy` li segnala, ma solo se lo lanci.

## In sintesi

Hai costruito un servizio Django con una separazione netta tra modelli e vincoli nel database, viste che restituiscono contratti JSON stabili, un comando di importazione idempotente e test che misurano anche il numero di query. Il passo successivo è tipizzare il contratto con OpenAPI o introdurre Django REST Framework quando servono serializer, autenticazione e permessi su oggetto; qui l'attenzione era sul percorso di richiesta, sulla configurazione e sul comportamento ripetibile.

## Fonti

- [Django 5.2 documentation](https://docs.djangoproject.com/en/5.2/)
- [Writing your first Django app](https://docs.djangoproject.com/en/5.2/intro/tutorial01/)
- [Testing in Django](https://docs.djangoproject.com/en/5.2/topics/testing/)
- [Custom management commands](https://docs.djangoproject.com/en/5.2/howto/custom-management-commands/)
