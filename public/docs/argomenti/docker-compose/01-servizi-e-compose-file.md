Docker Compose descrive un'applicazione composta da più container in un solo file dichiarativo: servizi, immagini, porte, variabili e relazioni. Invece di ricordare sequenze di `docker run` con decine di flag, scrivi cosa vuoi ottenere e lasci che il tool costruisca nell'ordine giusto. Questa lezione spiega come è fatto un file `compose.yaml`, come si definiscono i servizi e come si governano dipendenze, variabili e comandi.

## Obiettivi

- Riconoscere la struttura di base di un file Compose: `name`, `services`, `networks`, `volumes`.
- Definire un servizio con `image` o `build`, `ports`, `environment` e `command`.
- Esprimere le dipendenze con `depends_on` e capire cosa garantisce davvero.
- Separare i valori dallo schema usando variabili e file `.env`.

## Anatomia del file Compose

Un file Compose moderno non richiede più la chiave `version`: lo schema è dedotto dal tool e la chiave era diventata una fonte di errori. Le sezioni di primo livello sono poche: `name` per il nome del progetto, `services` per i container, `networks` e `volumes` per le risorse condivise, più chiavi di estensione con prefisso `x-`.

```yaml
name: demo
services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
```

Il nome del progetto deriva da `name` se presente, altrimenti dal nome della directory: da qui nasce il prefisso dei container (`demo-web-1`) e dei volumi (`demo_db-data`). Un progetto è un insieme di risorse etichettate; `docker compose down` e `docker compose up` operano su tutto il progetto, non su singoli servizi.

## Servizi: immagine, build, porte e comandi

Ogni voce sotto `services` è un container. Un servizio ha `image` (immagine pronta dal registry) oppure `build` (contesto di build locale) con `context` e `dockerfile`. Le porte si dichiarano come `HOST:CONTAINER` in forma di stringa; la variante breve con `- "8080:80"` è equivalente alla forma lunga con `published` e `target`.

```yaml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    image: esempio/api:1.0
    ports:
      - "8080:3000"
    environment:
      LOG_LEVEL: "${LOG_LEVEL:-info}"
    command: ["node", "server.js", "--port", "3000"]
    restart: unless-stopped

  web:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

`build` con `image` insieme costruisce e tagga nello stesso passaggio. `command` sovrascrive il `CMD` dell'immagine, mentre `entrypoint` sovrascrive l'`ENTRYPOINT`: usare il primo per piccole regolazioni, il secondo solo se sai cosa stai sostituendo. `restart: unless-stopped` è una scelta ragionevole per un servizio che deve tornare su dopo un crash o un riavvio dell'host.

| Chiave | Significato | Esempio |
| --- | --- | --- |
| `image` | immagine da usare | `postgres:16` |
| `build.context` | directory di build | `./api` |
| `ports` | pubblicazione sull'host | `"8080:80"` |
| `environment` | variabili nel container | `LOG_LEVEL=info` |
| `command` | comando alternativo al `CMD` | `["node", "server.js"]` |
| `restart` | politica di riavvio | `unless-stopped` |

## Dipendenze e ordine di avvio

`depends_on` in forma breve controlla solo l'ordine di creazione, non la prontezza: Compose avvia il database e subito dopo l'API, anche se il database sta ancora inizializzando. Il servizio che dipende deve quindi gestire i tentativi di connessione, oppure usi la forma lunga con `condition: service_healthy` e un `healthcheck`, che aspetta un esito positivo prima di procedere.

```yaml
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: "${DB_PASSWORD:?manca DB_PASSWORD}"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10
      start_period: 10s

  api:
    depends_on:
      db:
        condition: service_healthy
```

`depends_on` non gestisce i riavvii: se il database cade dopo l'avvio, l'API non viene riavviata automaticamente. La resilienza applicativa (retry, backoff) resta necessaria anche con la forma lunga.

## Variabili: file, shell e interpolazione

Compose sostituisce `${VARIABLES}` leggendo il file `.env` nella directory del progetto e l'ambiente della shell; le variabili della shell hanno la precedenza su `.env` quando il file esiste solo come valore di default. Le variabili dichiarate sotto `environment` finiscono nell'ambiente del container, dove sono visibili con `docker inspect`: non metterci segreti.

```bash
docker compose config --environment      # valori usati per l'interpolazione
docker compose up -d --build
docker compose ps && docker compose logs -f api
docker compose exec api sh
```

`docker compose config` è il comando più utile in fase di revisione: risolve variabili, applica i merge e stampa la configurazione finale. Prima di avviare in un ambiente nuovo esegui `config` e leggi la sezione che ti interessa: è lì che un default sbagliato diventa visibile.

## Errori comuni

- **Aspettarsi che `depends_on` aspetti la prontezza**: in forma breve garantisce solo l'ordine di creazione; serve `condition: service_healthy`.
- **Reintrodurre `version:` nel file**: con Compose moderno è obsoleto e produce spesso un warning o comportamento inatteso.
- **Segreti in `environment`**: compaiono in `docker inspect` e nel file Compose versionato.
- **Confondere `command` ed `entrypoint`**: sovrascrivere l'entrypoint di un'immagine ufficiale può rompere la configurazione prevista dall'immagine.

## In sintesi

Un file Compose si legge come una dichiarazione: `services` per i container, `networks` e `volumes` per le risorse, `name` per il progetto. Ogni servizio sceglie `image` o `build` e regola porte, variabili e comando. `depends_on` governa l'ordine, ma solo con `condition: service_healthy` aspetta che un servizio sia realmente pronto. Variabili e `.env` separano i valori dallo schema, e `docker compose config` mostra il risultato finale prima dell'avvio.

## Fonti

- [Docker Docs — Compose](https://docs.docker.com/compose/)
- [Docker Docs — Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Docker Docs — Control startup and shutdown order](https://docs.docker.com/compose/how-tos/startup-order/)
- [Compose Specification](https://github.com/compose-spec/compose-spec)
