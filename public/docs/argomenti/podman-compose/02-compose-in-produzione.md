Un file Compose di sviluppo funziona; un file Compose che entra in test automatici o in un server condiviso ha bisogni diversi: avvio deterministico, niente stato residuo tra le esecuzioni, segreti fuori dal repository, log leggibili e un modo per attendere che i servizi siano davvero pronti. Questa lezione prende lo stesso file e lo rimodella per Podman: override separati, profili, build riproducibili, healthcheck veri e un ponte verso `systemd` per quando il servizio deve restare attivo sull'host.

## Obiettivi

- Organizzare `compose.yaml` più override per sviluppo, test e produzione leggera.
- Separare build e runtime: cache, argomenti e multipli `Containerfile`.
- Usare profili e dipendenze con condizione per accendere solo i servizi necessari.
- Testare in CI con `podman compose` senza demone e senza stato condiviso.
- Ripulire automaticamente risorse e tradurre un servizio in unità `systemd`.

## Un file, tre contesti

Compose permette di sovrapporre più file con `-f`. Il file base contiene solo ciò che vale sempre; gli override aggiungono mount di sviluppo, porte, debug o limiti di produzione. Questa struttura evita `if` dentro il YAML e mantiene leggibili i diff.

```yaml
# compose.yaml - base
name: blog
services:
  db:
    image: docker.io/library/postgres:17-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes: [db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -q"]
      interval: 5s
      timeout: 3s
      retries: 12
      start_period: 10s
  api:
    build: {context: ./api, dockerfile: Containerfile}
    depends_on:
      db: {condition: service_healthy}
    ports: ["127.0.0.1:8080:8080"]
secrets:
  db_password:
    file: ./secrets/db_password.txt
volumes:
  db-data:
```

```yaml
# compose.override.yaml - sviluppo
services:
  api:
    build: {target: dev}
    volumes: ["../api:/app:ro,Z"]
    command: ["python", "-m", "flask", "--app", "app", "run", "--debug", "--host", "0.0.0.0"]
```

| File | Contiene | Non deve contenere |
| --- | --- | --- |
| `compose.yaml` | servizi, reti, volumi, healthcheck | mount di codice locale |
| `compose.override.yaml` | hot reload, porte extra | immagini diverse da quelle base |
| `compose.test.yaml` | comandi di test, DB temporaneo | credenziali reali |
| `compose.prod.yaml` | limiti, `pull_policy: always`, log driver | `build` per servizi già pubblicati |

Compose legge `compose.override.yaml` automaticamente se presente accanto al file base. In CI conviene disabilitarlo con `-f compose.yaml -f compose.test.yaml`, altrimenti lo sviluppatore e la pipeline vedono differenze silenziose.

## Build riproducibili

`podman compose build` chiama `podman build` e quindi Buildah: accetta `args`, `target`, `labels`, `cache_from`, `network`. La cache predefinita è locale all'host e in rootless sta nel volume di storage; in CI senza cache il build parte freddo ogni volta. Due accorgimenti riducono il tempo: ordinare i layer dal meno al più variabile e usare `cache_from` con un'immagine di cache su un registry.

```dockerfile
# api/Containerfile
FROM docker.io/library/python:3.13-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS dev
COPY . .
CMD ["python", "-m", "flask", "--app", "app", "run", "--host", "0.0.0.0"]

FROM base AS runtime
RUN useradd -r -u 10001 app
COPY --chown=10001:10001 app ./app
USER 10001
CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:create_app()"]
```

```bash
podman compose --profile prod build --build-arg PIP_INDEX_URL="$PIP_INDEX_URL" api
podman images --filter label=com.docker.compose.project=blog
```

`--profile` non ha effetto sul build se il servizio non è attivo: per costruire un'immagine di servizio non avviato occorre selezionarlo esplicitamente con `podman compose build api`. I label `com.docker.compose.*` vengono aggiunti da `podman-compose` e permettono di filtrare le risorse del progetto con `podman ps --filter label=...`.

## Profili, test e CI

I profili servono per servizi opzionali: un mail catcher, un frontend admin, un proxy di debug. Un servizio senza profilo è sempre attivo; un servizio con profilo parte solo con `--profile nome`.

```yaml
services:
  api:
    profiles: []
  db:
    profiles: []
  mailpit:
    image: axllent/mailpit:v1.27
    profiles: [debug]
  backup:
    image: docker.io/library/busybox:1.37
    profiles: [ops]
    depends_on: [db]
```

| Scenario | Comando | Risultato |
| --- | --- | --- |
| sviluppo | `podman compose up -d` | `api` e `db` |
| con debug mail | `podman compose --profile debug up -d` | aggiunge `mailpit` |
| test CI | `-f compose.yaml -f compose.test.yaml up --wait` | attende healthcheck |
| chiusura | `down --volumes --remove-orphans --time 5` | nessun residuo |

Per la CI il contorno conta più del file. `PODMAN_COMPOSE_PROVIDER` rende la scelta deterministica; `DOCKER_HOST` va impostato solo se il provider è `docker-compose`; `--remove-orphans` evita container di esecuzioni precedenti. Se la macchina è condivisa fra job, `podman system prune -f --volumes` alla fine del job è più semplice e sicuro di un `down` incompleto.

```bash
set -euo pipefail
export PODMAN_COMPOSE_PROVIDER=/usr/bin/podman-compose
podman compose -f compose.yaml -f compose.test.yaml config --quiet
podman compose -f compose.yaml -f compose.test.yaml up -d --wait --wait-timeout 120
podman compose -f compose.yaml -f compose.test.yaml exec -T api pytest -q
podman compose -f compose.yaml -f compose.test.yaml down --volumes --remove-orphans
```

## Dal test al ripostiglio: systemd

Compose è uno strumento di orchestrazione temporanea. Se il blog deve partire al boot, il passo successivo è tradurre i servizi in quadlet. `podman-compose` non genera unità, ma `podman generate systemd` accetta `--name` per creare un'unità per ogni container del progetto; in alternativa si scrivono quadlet e si tiene `compose.yaml` per lo sviluppo.

```bash
podman generate systemd --new --files --name blog_api_1 --restart-policy=always
podman generate systemd --new --files --name blog_db_1 --restart-policy=always
mv *.service ~/.config/systemd/user/ && systemctl --user daemon-reload
systemctl --user enable --now container-blog-db_1.service container-blog-api_1.service
```

Il risultato non è mai identico all'uno a uno di `depends_on`: `systemd` rispetta l'ordine con `After=` e `Requires=`, ma la disponibilità reale resta affidata a un retry nell'applicazione o a un servizio di attesa che chiama `pg_isready`.

## Errori comuni

- **Override automatico in CI**: `compose.override.yaml` viene letto e porta porte o comandi di sviluppo nella pipeline; usare `-f` espliciti.
- **Credenziali nei `secrets.file` commitati**: il file del segreto deve stare fuori dal repository o essere generato prima dell'avvio.
- **Profili usati per i servizi base**: `postgres` con profilo `dev` non parte in CI e l'API fallisce in dipendenza circolare; i profili vanno solo su servizi accessori.
- **`up` senza `--wait`**: lo script di test parte prima che il database accetti connessioni e fallisce a intermittenza.
- **Pulizia con `prune` sull'host di sviluppo**: su una macchina condivisa cancella immagini non collegate al progetto; limitarsi a `down`.

## In sintesi

Il file Compose diventa un artefatto di progetto quando è diviso in base, override e test, con build riproducibili e profili per gli accessori. In Podman la stessa combinazione funziona in CI senza demone, purché il provider sia scelto e i file siano passati esplicitamente. Per la persistenza il passaggio a `systemd` e quadlet è obbligatorio, e Compose resta lo strumento di sviluppo locale. la prossima lezione è il laboratorio che monta tutto insieme con un'applicazione vera.

## Fonti

- [podman-compose(1)](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)
- [podman-generate-systemd(1)](https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html)
- [podman-compose - repository](https://github.com/containers/podman-compose)
- [Podman Desktop - Running Compose](https://podman-desktop.io/docs/compose/running-compose)
