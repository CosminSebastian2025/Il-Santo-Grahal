Scrivere YAML è facile, farlo leggere correttamente a un tool è un'altra cosa: l'indentazione cambia il significato, gli anchor nascondono logica, le variabili vengono interpolate da qualcun altro. Questo laboratorio ti mette davanti a sei file problematici, uno alla volta, con la soluzione commentata. Usa un parser reale (per esempio PyYAML) e un lint (`yamllint`) per verificare ogni passaggio.

## Obiettivi

- Correggere errori di indentazione e riconoscere il loro effetto.
- Distinguere "errore di sintassi" da "documento valido ma sbagliato".
- Usare anchor e merge key per evitare duplicazioni.
- Scrivere variabili Compose senza default insicuri.
- Eseguire un ciclo di validazione ripetibile.

## Preparazione

Crea una cartella di lavoro e verifica di avere un parser:

```bash
mkdir -p yaml-lab && cd yaml-lab
python -c "import yaml; print(yaml.__version__)"
```

Se manca, `pip install pyyaml`; per il lint `pipx install yamllint`.

## Esercizio 1 – Tab, spazi e chiavi

File `01-indent.yaml`:

```yaml
servizi:
    api:
	image: esempio/api:1.0
      ports:
        - "8080:8080"
```

Che cosa cerca di fare: una mappa `servizi` che contiene `api` con `image` e `ports`.

Soluzione commentata:

- riga 3 usa un **tab**: errore di sintassi, perché l'indentazione YAML è solo con spazi;
- riga 4 è indentata con 6 spazi, incoerente con `api` (4 spazi per l'immagine, ma deve essere dentro la mappa `api`).

Versione corretta:

```yaml
servizi:
  api:
    image: esempio/api:1.0
    ports:
      - "8080:8080"
```

Verifica con `python -c "import yaml,json; print(json.dumps(yaml.safe_load(open('01-indent.yaml')), indent=2))"`.

## Esercizio 2 – Lista o mappa?

File `02-lista.yaml`:

```yaml
database:
  host: db
  port: 5432

servizi:
  - api:
      image: esempio/api:1.0
    worker:
      image: esempio/worker:1.0
```

Domanda: `servizi` è una lista di due servizi o una lista con un solo elemento che contiene due chiavi?

Risposta: una lista con **un solo item** (la mappa con `api` e `worker`), perché il secondo blocco è indentato allo stesso livello del primo. Se l'intento era due servizi, va scritto:

```yaml
servizi:
  - name: api
    image: esempio/api:1.0
  - name: worker
    image: esempio/worker:1.0
```

Prima di correggere, leggi la struttura con il parser: `print(type(d['servizi']), len(d['servizi']))`. Il tipo e la lunghezza ti dicono cosa ha capito davvero.

## Esercizio 3 – Il Norway problem in un file di configurazione

File `03-paesi.yaml`:

```yaml
paesi:
  - IT
  - NO
  - FR
attivo: yes
versione: 1.10
```

Attività:

1. Carica con `yaml.safe_load` e stampa i tipi di ogni elemento.
2. Correggi il file in modo che `NO` resti una stringa, `attivo` sia un booleano e `versione` sia una stringa `"1.10"`.

Con PyYAML (loader YAML 1.1) gli elementi della lista risultano: `IT` stringa, `NO` **booleano `False`**, `FR` stringa; `attivo` è `True`; `versione` è il float `1.1`.

Soluzione:

```yaml
paesi:
  - "IT"
  - "NO"
  - "FR"
attivo: true
versione: "1.10"
```

Lezione: quota tutti i codici a due lettere e le versioni; nei file di configurazione preferisci `true`/`false` espliciti ed evita `yes`/`on`.

## Esercizio 4 – Anchor: sul valore o sulla mappa?

File `04-anchor.yaml`:

```yaml
timeout: &default_timeout 30

client:
  timeout: *default_timeout

server:
  timeout: &default_timeout 60
```

Attività: il file è valido? Che cosa contiene `client.timeout`?

Risposta: il file è YAML valido ma contiene un **anchor duplicato** (`&default_timeout`), che è un errore semantico: i parser lo rifiutano. Se il server deve avere 60, non serve un nuovo anchor, basta il valore letterale:

```yaml
timeout: &default_timeout 30

client:
  timeout: *default_timeout

server:
  timeout: 60
```

Se invece è il default a cambiare, cambia l'anchor e non duplicarlo.

## Esercizio 5 – Merge key in Compose

File `05-compose.yaml`:

```yaml
x-defaults: &defaults
  restart: unless-stopped
  healthcheck:
    interval: 30s
    retries: 3

services:
  api:
    <<: *defaults
    image: esempio/api:1.0
  worker:
    image: esempio/worker:1.0
    restart: always
```

Attività:

1. Quali servizi hanno `healthcheck` dopo il merge?
2. Che cosa succede se aggiungi `<<: *defaults` anche a `worker`, che ha già `restart`?

Risposta: solo `api` ha `healthcheck`, perché solo `api` fa il merge. Su `worker`, la chiave esplicita `restart: always` **vince** sulla mappa mergiata: il merge aggiunge solo le chiavi non presenti.

Verifica con:

```bash
python -c "import yaml; d=yaml.safe_load(open('05-compose.yaml')); print(sorted(d['services']['api']), d['services']['worker'].get('restart'))"
```

## Esercizio 6 – Variabili Compose e default

File `06-variabili.yaml`:

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: "${DB_PASSWORD:-changeme}"

  api:
    image: "esempio/api:${TAG}"
    depends_on:
      - db
```

Attività:

1. Elenca due problemi di sicurezza/affidabilità.
2. Riscrivi il file con un default sicuro e un fail-fast per `TAG`.

Risposta commentata:

- `POSTGRES_PASSWORD` ha un default noto (`changeme`): chiunque conosca il file può entrare se la variabile manca. Deve essere obbligatoria: `"${DB_PASSWORD:?DB_PASSWORD non impostata}"`.
- `TAG` senza default rende l'immagine `esempio/api:` (tag vuoto) se non è definita: un default esplicito di sviluppo (`:-dev`) va bene in locale, ma in produzione preferisci il fail-fast `:?` e un pin esplicito.

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: "${DB_PASSWORD:?DB_PASSWORD obbligatoria}"

  api:
    image: "esempio/api:${TAG:?TAG obbligatorio}"
    depends_on:
      - db
```

Ricorda che `docker compose config` **interpola** i valori: se controlli con `docker compose config` senza impostare la variabile, il comando fallisce ed è il comportamento che vuoi.

## Il ciclo di validazione

Metti tutti gli esercizi in una cartella e ripeti sempre lo stesso flusso:

```bash
yamllint -d relaxed .   # controllo forma e stile
for f in *.yaml; do python -c "import sys,yaml; list(yaml.safe_load_all(open(sys.argv[1])))" "$f" || echo "KO: $f"; done
```

La seconda riga carica **tutti** i documenti di ogni file: `safe_load` fermerebbe il parsing al primo `---`.

Per i file Compose aggiungi lo schema:

```bash
check-jsonschema --schemafile compose-spec.json 05-compose.yaml
DB_PASSWORD=test TAG=1.0 docker compose -f 05-compose.yaml config -q
```

L'ordine conta: un errore di parse rende inutili lint e schema, mentre un errore di schema rende inutile il `config` di Compose. Risolvi sempre il livello più basso.

## Riepilogo degli errori visti

1. Tab e indentazione incoerente → parsing fallito.
2. Lista contro mappa → struttura sbagliata, nessun errore.
3. Tipi impliciti → valori reinterpretati (Norway problem).
4. Anchor duplicati → errore del parser; anchor sul nodo sbagliato → struttura diversa.
5. Merge key e priorità → una chiave esplicita vince, le altre vengono ereditate.
6. Default in Compose → sicurezza: i segreti non hanno default.

## In sintesi

YAML è "a forma libera" solo in apparenza: ogni errore di indentazione cambia l'albero del documento, e ogni valore non quotato può cambiare tipo. Il ciclo che funziona è parse, lint, schema, config. Gli anchor sono utili ma piccoli e nomi chiari: se un file richiede tre livelli di merge, probabilmente serve un template o un parametro unico.

## Fonti

- [yaml.org – YAML 1.2.2 Specification](https://yaml.org/spec/1.2.2/)
- [Docker Docs – Variable interpolation in Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
