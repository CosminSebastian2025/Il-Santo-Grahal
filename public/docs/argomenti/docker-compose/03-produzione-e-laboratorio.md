Portare un file Compose in produzione significa fare i conti con ciò che in sviluppo non si vede: immagini pinnate, segreti reali, limiti di risorse, aggiornamenti senza downtime e log che finiscono da qualche parte. Compose non è un orchestratore, ma per un singolo nodo è uno strumento legittimo se trattato come infrastruttura dichiarativa. Il laboratorio costruisce un'applicazione a tre servizi con reverse proxy, database e worker, e la prepara per un ambiente reale, un passo alla volta.

## Obiettivi

- Scrivere un file di produzione con immagini pinnate, limiti e rotazione dei log.
- Gestire i segreti con `secrets` e permessi corretti.
- Eseguire aggiornamenti controllati e saper tornare indietro.
- Ridurre la superficie esposta e verificare lo stato con healthcheck e `ps`.

## Un file di produzione leggibile

Il file di produzione parte dal base e aggiunge solo ciò che cambia in quel contesto. Le immagini sono pinnate per digest o per tag di versione, le porte pubbliche sono ridotte a una sola su un reverse proxy, e ogni servizio ha limiti e policy di log esplicite. La posta in gioco è la riproducibilità: due deploy a settimane di distanza devono produrre lo stesso stato.

```yaml
name: shop
services:
  proxy:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    depends_on:
      api:
        condition: service_healthy
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  api:
    image: ghcr.io/esempio/api@sha256:9c1f0d...
    expose:
      - "3000"
    secrets:
      - db_password
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:3000/health"]
      interval: 10s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M

secrets:
  db_password:
    file: /etc/secrets/db_password
```

Con `deploy.resources` Compose applica i limiti al container anche in modalità non swarm; in alternativa funzionano `mem_limit` e `cpus` a livello di servizio. I log con `max-size` sono la difesa più semplice contro un disco che si riempie durante un incidente.

## Aggiornamenti, rollback e stato

L'aggiornamento di un servizio si fa ricreando il container: `docker compose up -d --no-deps --build api` aggiorna solo l'API e lascia in piedi il resto. Se il nuovo container non supera l'healthcheck, il vecchio è già stato fermato: il rollback consiste nel riportare la versione dell'immagine nel file e rieseguire `up -d`. Con un reverse proxy che rileva i container questo può essere quasi senza downtime, ma senza ridondanza c'è sempre una finestra.

```bash
docker compose config --quiet                  # validazione dei file
docker compose pull && docker compose up -d
docker compose ps --format json | jq '.[] | {Service,State,Health}'
docker compose logs --tail 100 --no-log-prefix api
```

`docker compose ps` è la prima fonte per capire lo stato reale: mostra se un servizio è `running` ma `unhealthy`, distinzione che un controllo basato solo sul processo non coglie. Prima di ogni deploy in produzione esegui `config --quiet` in CI: è il controllo più economico per intercettare un file malformato.

## Segreti, limite e ciò che Compose non fa

I segreti arrivano in `/run/secrets/<nome>` come file. Questo li tiene fuori dall'ambiente, ma non li cifra: chi ha accesso all'host o al file di origine li legge. Per requisiti più forti serve un vault esterno e un agente che li recuperi a runtime.

Compose eccelle nell'orchestrazione su un nodo, ma non offre scheduling su più macchine, strategie di deploy, autohealing con rischedula, o gestione dichiarativa dello stato delle repliche. Se hai bisogno di repliche su più nodi, scoperta di servizi, aggiornamenti rolling, la scelta naturale è un orchestratore come Kubernetes. Riconoscere il confine fa parte della competenza: Compose resta lo strumento giusto per l'ambiente di sviluppo, per i test di integrazione e per i piccoli deploy su singolo host.

Infine, verifica esplicitamente ciò che resta esposto: `docker compose port` elenca le porte pubblicate, e un `docker ps` sull'host svela servizi avviati fuori da Compose che potrebbero aggirare il reverse proxy. La disciplina vale più di qualsiasi flag.

## Esercizi

1. Aggiungi un `healthcheck` al servizio web e fai dipendere il proxy dallo stato `service_healthy`.
2. Separa la configurazione di sviluppo con `compose.override.yaml` e verifica il risultato con `docker compose config`.
3. Esegui il servizio con filesystem in sola lettura, `tmpfs` per i file temporanei e `no-new-privileges`.
4. Fissa un'immagine per digest invece che per tag e spiega perché il deploy diventa riproducibile.
5. Simula un rollback cambiando tag e rieseguendo `docker compose up -d`; verifica versione e salute.
6. Ispeziona `docker compose ps`, `logs` e `events` dopo un riavvio e indica quali segnali useresti in produzione.

<details><summary>Soluzione</summary>

1. Nel servizio web: `healthcheck: { test: ["CMD", "curl", "-f", "http://localhost:8080/health"], interval: 10s, timeout: 3s, retries: 3 }`; nel proxy: `depends_on: { web: { condition: service_healthy } }`.
2. Metti in `compose.override.yaml` solo le differenze di sviluppo (bind mount del codice, porta esposta, comando con reload) e lancia `docker compose -f compose.yaml -f compose.override.yaml config` per leggere la configurazione finale.
3. Aggiungi `read_only: true`, `tmpfs: ["/tmp"]`, `security_opt: ["no-new-privileges:true"]` e `cap_drop: ["ALL"]`; se il processo deve scrivere, monta un volume dedicato invece di rendere scrivibile tutto il container.
4. Usa `image: ghcr.io/org/app@sha256:...`; il digest identifica i byte esatti, mentre un tag può essere spostato e produrre deploy diversi con lo stesso file.
5. Cambia il tag a una versione precedente, esegui `docker compose up -d`, poi verifica con `docker compose ps`, l'endpoint di health e i log che il servizio risponda con la versione attesa.
6. `ps` mostra stato e health, `logs --since` gli errori recenti, `events` la sequenza di start/stop. In produzione aggiungi metriche e un alert sull'health, non solo il controllo manuale.

</details>

## Errori comuni

- **`docker compose down` con volume al posto di `rm`**: `down -v` cancella anche i volumi nominati, quindi i dati; usa `down` senza `-v` per fermare e rimuovere solo i container.
- **Tag `latest` nei file di produzione**: l'aggiornamento è non deterministico; pinna digest o versioni.
- **Log senza rotazione**: un container verboso riempie il disco dell'host e porta giù il nodo, non solo il servizio.
- **Supporre che Compose riavvii i servizi dipendenti**: se il database cade, l'API non riparte da sola; servono retry applicativi e politiche di restart coerenti.

## In sintesi

Un file di produzione si distingue per immagini pinnate, sole porte necessarie esposte, limiti di risorse, segreti montati come file e log ruotati. Gli aggiornamenti si fanno ricreando un servizio alla volta e il rollback ripristina la versione nel file. `compose config --quiet` in CI e `compose ps` in ogni diagnosi sono i due controlli minimi. Compose non sostituisce un orchestratore: conoscerne i limiti è parte del mestiere.

## Fonti

- [Docker Docs — Use Compose in production](https://docs.docker.com/compose/how-tos/production/)
- [Docker Docs — Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Docker Docs — Use secrets in Compose](https://docs.docker.com/compose/how-tos/use-secrets/)
- [OWASP — Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
