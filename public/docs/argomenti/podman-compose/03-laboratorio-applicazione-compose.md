In questo laboratorio porti un'applicazione a due servizi — un'API Flask e PostgreSQL — dal `podman compose up` di sviluppo fino a un ciclo completo di test in CI e a un servizio permanente sull'host. Usi solo Podman e un provider Compose, con database temporaneo, segreto fuori dal repository e healthcheck che decidono l'ordine di avvio. Alla fine avrai un comando `make verify` che fallisce in modo rumoroso quando qualcosa non è pronto.

## Obiettivi

- Scrivere un `Containerfile` multi-stage con target `dev` e `runtime`.
- Montare un database temporaneo con volume anonimo e segreto su file.
- Far dipendere l'API dalla salute del database, non solo dal suo avvio.
- Eseguire test dentro il progetto Compose con `exec -T`.
- Trasferire i servizi in unità `systemd` e verificare il riavvio automatico.

## Il contratto dell'esercizio

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| API | Flask 3 su porta 8080 | poche righe, testabile |
| DB | `postgres:17-alpine` | healthcheck `pg_isready` |
| progetto | `name: blog` | nomi prevedibili |
| segreto | file `secrets/db_password.txt` | fuori dal repository |
| test | `pytest` nel container `api` | nessuna installazione host |
| verifica | script `scripts/ci.sh` | un solo comando ripetibile |

```bash
mkdir -p ~/blog/{api/app,api/tests,secrets} && cd ~/blog
printf 'db-password-locale\n' > secrets/db_password.txt && chmod 600 secrets/db_password.txt
printf 'secrets/\n.env\n' > .gitignore
```

## Passo 1: applicazione e immagine

L'API espone `/healthz` che interroga il database e `/notes` che legge una tabella. La connessione usa le variabili `PGHOST`, `PGUSER` e un file di password, così il segreto non passa dall'ambiente.

```python
# api/app/app.py
import os
from flask import Flask, jsonify
import psycopg

def create_app():
    app = Flask(__name__)

    def dsn():
        pw = open("/run/secrets/db_password").read().strip()
        return f"host={os.environ['PGHOST']} user=postgres password={pw} dbname=postgres"

    @app.get("/healthz")
    def healthz():
        with psycopg.connect(dsn(), connect_timeout=2) as conn:
            conn.execute("SELECT 1")
        return {"status": "ok"}

    @app.get("/notes")
    def notes():
        with psycopg.connect(dsn()) as conn:
            rows = conn.execute("SELECT testo FROM note ORDER BY id").fetchall()
        return jsonify([r[0] for r in rows])

    return app
```

```dockerfile
# api/Containerfile
FROM docker.io/library/python:3.13-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS dev
RUN pip install --no-cache-dir pytest
COPY . .

FROM base AS runtime
RUN useradd -r -u 10001 app
COPY --chown=10001:10001 app ./app
USER 10001
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app.app:create_app()"]
```

`psycopg` in versione binaria evita la compilazione in immagine (`psycopg[binary]==3.2.10`), e `gunicorn==23.0.0` resta nella versione runtime. Il target `dev` esiste solo per i test: l'immagine `runtime` non contiene `pytest`.

## Passo 2: il progetto Compose

Il file base avvia i due servizi con il segreto condiviso. Il volume del database non è nominato per i test: `--volumes` lo elimina, ma su `down` normale un volume nominato sopravvive ed è quello che serve in sviluppo.

```yaml
# compose.yaml
name: blog
x-db-env: &db-env
  POSTGRES_PASSWORD_FILE: /run/secrets/db_password
services:
  db:
    image: docker.io/library/postgres:17-alpine
    environment: *db-env
    secrets: [db_password]
    volumes: [db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -q -d postgres"]
      interval: 3s
      timeout: 3s
      retries: 20
      start_period: 5s
  api:
    build: {context: ./api, dockerfile: Containerfile, target: dev}
    environment:
      PGHOST: db
    secrets: [db_password]
    depends_on:
      db: {condition: service_healthy}
    ports: ["127.0.0.1:8080:8080"]
    command: ["python", "-m", "gunicorn", "-b", "0.0.0.0:8080", "app.app:create_app()"]
secrets:
  db_password:
    file: ./secrets/db_password.txt
volumes:
  db-data:
```

La scheda YAML `x-db-env` evita di ripetere la variabile del file di password: entrambi i servizi del database devono leggere lo stesso segreto.

```bash
podman compose config --quiet && echo ok
podman compose up -d --wait --wait-timeout 90
podman compose ps
curl -s http://127.0.0.1:8080/healthz
podman compose logs db --tail 20
```

Se `up --wait` termina con successo, l'healthcheck ha restituito `healthy` e `/healthz` deve rispondere `{"status":"ok"}`. Se fallisce, la causa più frequente è il file del segreto assente sulla macchina: `config` non lo verifica perché Compose monta solo il percorso.

## Passo 3: test dentro il progetto

I test girano nel container `api`, non sull'host: nessuna sincronizzazione di dipendenze Python e stesso sistema operativo della produzione. Il compose di test non pubblica porte e riduce l'immagine al target `dev`.

```yaml
# compose.test.yaml
services:
  db:
    volumes: []   # volume temporaneo per ogni esecuzione
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
  api:
    ports: []
    environment:
      PGHOST: db
```

```python
# api/tests/test_api.py
from app.app import create_app

def test_healthz():
    c = create_app().test_client()
    assert c.get("/healthz").status_code == 200

def test_notes_list():
    c = create_app().test_client()
    assert c.get("/notes").get_json() == []
```

```bash
podman compose -f compose.yaml -f compose.test.yaml up -d --wait
podman compose -f compose.yaml -f compose.test.yaml exec -T api pytest -q
podman compose -f compose.yaml -f compose.test.yaml down --volumes
```

```bash
mkdir -p scripts
cat > scripts/ci.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
export PODMAN_COMPOSE_PROVIDER=${PODMAN_COMPOSE_PROVIDER:-/usr/bin/podman-compose}
FILES="-f compose.yaml -f compose.test.yaml"
podman compose $FILES config --quiet
podman compose $FILES up -d --wait --wait-timeout 120
trap 'podman compose $FILES down --volumes --remove-orphans' EXIT
podman compose $FILES exec -T api pytest -q
SH
chmod +x scripts/ci.sh
```

Il criterio da verificare è che la seconda esecuzione di `scripts/ci.sh` parta da un database vuoto: se `test_notes_list` trova righe, il volume del passo 2 è ancora in uso e `compose.test.yaml` non ha rimosso i volumi. Controlla con `podman volume ls --filter label=com.docker.compose.project=blog`.

## Passo 4: dal compose a systemd

Per lasciare il servizio attivo sull'host, senza Compose in esecuzione, genera le unità dai container validati e poi cancella il progetto Compose.

```bash
podman generate systemd --new --files --name blog_db_1
podman generate systemd --new --files --name blog_api_1
mkdir -p ~/.config/systemd/user && mv container-blog_*.service ~/.config/systemd/user/
podman compose down
systemctl --user daemon-reload
systemctl --user enable --now container-blog_db_1.service
sleep 2 && systemctl --user restart container-blog_api_1.service
curl -s http://127.0.0.1:8080/healthz
loginctl enable-linger "$USER"
```

Dopo il `down`, i container Compose sono rimossi ma i volumi nominati restano: le unità `--new` ricreano i container collegandoli allo stesso volume. Se `api` non parte perché il database non è ancora pronto, aggiungi `After=` e `Requires=` nel file `.service` e lascia il retry all'applicazione.

## Esercizi

1. Aggiungi un servizio `mailpit` con `profiles: [debug]` e verifica che non parta con `up -d` senza profilo.
2. Sostituisci il file del segreto con `podman secret create db_password -` e `secrets: {db_password: {external: true}}`.
3. Aggiungi `deploy: {resources: {limits: {memory: 256M}}}` all'API e verifica che il container rispetti il limite con `podman stats`.
4. Aggiungi un job CI che usa `compose.test.yaml`, il provider esplicito e un timeout di 5 minuti.
5. Modifica `compose.override.yaml` per il hot reload con mount di `./api/app:/app/app:ro,Z` e spiega perché `gunicorn` non lo vede.

<details>
<summary>Soluzione</summary>

1. Senza `--profile debug` il servizio non viene creato; `podman compose --profile debug up -d mailpit` lo avvia solo.

2. `printf '%s' db-password-locale | podman secret create db_password -` e nel servizio sostituisci il blocco top-level `secrets:` con `external: true`. In rootless il secret sta nello storage dell'utente e le unità `systemd --user` lo vedono.

3. Le chiavi `deploy.resources` sono accettate da Compose e tradotte in `--memory`; verifica con `podman stats --no-stream blog_api_1` e con `cat /sys/fs/cgroup/.../memory.max`.

4. Il job imposta `PODMAN_COMPOSE_PROVIDER`, esporta `podman compose -f compose.yaml -f compose.test.yaml config --quiet` come validazione e poi `up -d --wait --wait-timeout 120`, con `down --volumes` in `always()` come pulizia.

5. `gunicorn` senza `--reload` carica i moduli una volta all'avvio. Con montaggi in sola lettura e `--reload` il reloader funziona ma crea file temporanei; per lo sviluppo usa il server Flask con `--debug`, che rileva le modifiche.

</details>

## Errori comuni

- **Segreto committato**: il file `secrets/db_password.txt` deve stare in `.gitignore`; controlla con `git status` prima del commit.
- **`down` senza `--volumes` nei test**: lo stato sopravvive e i test dipendono dall'ordine delle esecuzioni.
- **`exec` senza `-T`**: in CI non c'è un TTY e il comando fallisce o blocca.
- **Unit generation con nomi diversi**: con `name:` nel file i container si chiamano `blog_db_1`; passare `--name db` non trova nulla.
- **Provare la persistenza con `restart` di Compose**: senza demone il riavvio del host non avvia i container Compose; serve systemd.

## In sintesi

Il ciclo completo tiene un solo descrittore di progetto Compose per lo sviluppo e i test, con un override per la produzione leggera e la stessa immagine per tutti gli ambienti. I test girano dove gira il servizio e il database è temporaneo per costruzione. La persistenza è un problema separato, risolto da `systemd`. Il risultato è uno script di poche righe che in pipeline riporta sempre lo stesso esito.

## Fonti

- [podman-compose(1)](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)
- [podman-generate-systemd(1)](https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html)
- [podman-compose - repository](https://github.com/containers/podman-compose)
- [Podman Desktop - Running Compose](https://podman-desktop.io/docs/compose/running-compose)
