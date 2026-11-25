Podman Compose è il modo per portare un file `compose.yaml` già esistente dentro Podman senza riscriverlo. L'obiettivo non è imitare Docker Compose in ogni dettaglio, ma leggere i servizi, creare container, reti e volumi con `podman` e restituire uno stato compatibile con le pipeline che usano Compose. In questa lezione vedi quali tool rispondono a `podman compose`, come vengono tradotti i concetti del file Compose e quali sono le differenze che contano davvero.

## Obiettivi

- Distinguere `podman compose` come dispatcher da `podman-compose` e `docker-compose`.
- Riconoscere la parte del file Compose che viene tradotta direttamente.
- Capire come vengono creati reti e volumi e dove finisce lo stato.
- Gestire build, variabili e file `.env` in un contesto rootless.
- Conoscere i punti in cui la compatibilità non regge e va validata.

## Il dispatcher: quale implementazione gira

`podman compose` è disponibile in Podman dalla versione 4.7 come sottocomando wrapper. Non è un'implementazione: legge la configurazione e lancia un provider esterno, in ordine `docker-compose` (plugin v2), `podman-compose` (lo script Python della comunità) o `compose` (plugin standalone). Il provider effettivo si sceglie in `containers.conf` o con variabili d'ambiente.

```ini
# ~/.config/containers/containers.conf
[engine]
compose_providers = ["/usr/bin/docker-compose", "/usr/bin/podman-compose"]
compose_warning_logs = true
```

```bash
podman compose version
podman compose --help | head -20
PODMAN_COMPOSE_PROVIDER=/usr/bin/podman-compose podman compose up -d
```

| Implementazione | Lingua | Prestazioni | Compatibilità |
| --- | --- | --- | --- |
| `docker-compose` v2 | Go | alta | massima (è il riferimento) |
| `podman-compose` | Python | più lenta su molti servizi | buona, copre i casi comuni |
| `compose` plugin | Go | alta | massima, con driver Podman |

`podman-compose` è su PyPI (`pip install podman-compose`) e in molte distribuzioni come pacchetto `podman-compose`. La compatibilità verso Podman passa da `DOCKER_HOST` puntato al socket Podman (`podman.sock`) quando si usa `docker-compose`. In rootless il socket vive in `$XDG_RUNTIME_DIR/podman/podman.sock` e va esposto con `podman system service --time=0`.

```bash
systemctl --user enable --now podman.socket
export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/podman/podman.sock"
podman compose ps
```

## Come viene tradotto il file

Il file Compose non è un formato Podman: ogni chiave viene mappata su un comportamento equivalente. Le chiavi che descrivono dipendenze e healthcheck diventano attese esplicite, mentre quelle legate a `docker swarm` o `buildx` non hanno equivalente.

```yaml
name: blog
services:
  db:
    image: docker.io/library/postgres:17-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD:?password richiesta}
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10
  api:
    build:
      context: ./api
      dockerfile: Containerfile
    depends_on:
      db:
        condition: service_healthy
    env_file: .env
    ports:
      - "127.0.0.1:8080:8080"
volumes:
  db-data:
```

| Chiave Compose | Traduzione Podman | Note |
| --- | --- | --- |
| `services.<n>.image` | `podman create` | immagine qualificata obbligatoria in `enforcing` |
| `build` + `dockerfile` | `podman build -f` | `Containerfile` è il nome usato da Podman |
| `ports` | `--publish` | in rootless niente porte sotto 1024 |
| `depends_on` con condizione | attende healthcheck del container | senza condizione non attende |
| `volumes` nominati | `podman volume create blog_db-data` | prefisso con `name:` del progetto |
| reti automatiche | rete `blog_default` | creata se non esiste |
| `restart: always` | politica accettata, senza demone | non equivalente a unità `systemd` |

Il nome del progetto viene da `name:` nel file, altrimenti dalla directory in minuscolo: i nomi risultanti sono `<progetto>_<servizio>_1`, quindi diversi dallo schema Docker che usa un trattino solo. Gli script che cercano per nome devono usare `podman compose ps --format json` invece di costruire stringhe.

## Costruire, avviare e ripulire

`podman-compose` mantiene uno stato leggero nella directory del progetto, in `~/.local/share/containers/podman-compose` e nel file `podman-compose.$progetto.yaml`; lì registra pod, container, volumi e reti create, così `down` sa cosa rimuovere. Modificare il file Compose senza rifare `down` può lasciare risorse orfane.

```bash
cd ~/blog
podman compose config           # normalizza e valida il file
podman compose build --no-cache api
podman compose up -d --wait     # attende gli healthcheck
podman compose logs -f --tail 50 api
podman compose ps
podman compose exec api sh -lc 'env | grep -c ^'
podman compose down --volumes --remove-orphans
```

`--wait` è supportato dalle implementazioni recenti e attende che tutte le istanze siano `running` e sane, oppure fallisce dopo un timeout con `--wait-timeout`. `--remove-orphans` rimuove i container di servizi cancellati dal file senza toccare i volumi.

## Variabili, segreti e rootless

L'interpolazione segue la sintassi Compose: `${VAR}`, `${VAR:-default}`, `${VAR:?messaggio}`. Lo script legge `.env` nella directory del file Compose, non quella corrente. In un solo ambiente vengono risolti `.env`, variabili della shell e `--env-file`. Il valore `${DB_PASSWORD:?password richiesta}` produce un errore esplicito se manca, invece di avviare un servizio con DB vuoto.

```bash
podman compose config --quiet && echo "file valido"
podman compose config | grep -E 'POSTGRES_PASSWORD|published'
```

In rootless i container non mappano l'`user:` dell'immagine sul tuo UID: se un servizio monta un volume su una cartella dove il container scrive come root, i file finiscono di proprietà dell'UID mappato. `--userns keep-id` e `userns_mode: keep-id` in Compose risolvono il caso dei linguaggi che girano con lo stesso UID dell'host, ma non si applicano ai servizi che vogliono essere root (per esempio `postgres`, che rifiuta di partire come root). Per questi servizi lascia che il container usi il suo utente interno.

## Errori comuni

- **Installare solo `podman` e usare `podman compose`**: il dispatcher esiste ma senza un provider risponde con un errore "no provider found"; serve `podman-compose` o `docker-compose`.
- **Assumere `docker compose` come provider**: con `DOCKER_HOST` non impostato, il plugin parla al socket Docker di default e fallisce se il demone non c'è.
- **Scrivere `dockerfile: Dockerfile` con Podman**: funziona, ma i team che vogliono immagini con buildah usano `Containerfile` e magari un `Dockerfile` simbolico.
- **Usare `env_file` per i segreti**: il file è letto e iniettato in chiaro, non è un secret; per i segreti usa `podman secret` o un file con permessi 600.
- **Aspettarsi `restart: always` al reboot**: senza sistema che avvia i container, dopo il riavvio la macchina non li riavvia; serve `podman-restart.service` o unità `systemd`.

## In sintesi

Podman Compose non è una riscrittura del file: è un livello di traduzione che sfrutta il dispatcher di Podman verso un provider compatibile. Rete, volumi, healthcheck e dipendenze funzionano; nomi, restart e privilegi cambiano. La regola pratica è validare il file con `config`, usare `--wait`, tenere le risorse in `down` pulite e passare a quadlet quando un servizio deve restare attivo stabilmente. Il laboratorio mostra l'intero ciclo su un'applicazione con database e API.

## Fonti

- [podman-compose(1)](https://docs.podman.io/en/latest/markdown/podman-compose.1.html)
- [podman-compose - repository](https://github.com/containers/podman-compose)
- [Podman Desktop - Running Compose](https://podman-desktop.io/docs/compose/running-compose)
- [Podman Documentation](https://docs.podman.io/en/latest/)
