In un progetto Compose le risorse non stanno più in flag sparsi su ogni comando: volumi, reti e variabili si dichiarano nel file e vengono create insieme al progetto. Questo rende il sistema riproducibile, ma richiede di capire come si compongono i file, quale configurazione prevale in ogni ambiente e come passare i segreti senza scriverli in chiaro. La lezione costruisce un file base, lo estende con un override di sviluppo e uno di produzione, e usa healthcheck e profili per distinguere ciò che serve sempre da ciò che serve solo in certi contesti.

## Obiettivi

- Dichiarare volumi nominati e reti personalizzate e collegarli ai servizi giusti.
- Sovrapporre più file Compose e prevedere la regola di merge.
- Gestire variabili per ambiente con `.env`, `--env-file` ed `env_file`.
- Usare healthcheck, profili e segreti montati come file.

## Volumi e reti nel file

Le risorse dichiarate a livello di primo livello esistono anche quando nessun servizio le usa; quelle create implicitamente da un servizio hanno il nome del progetto come prefisso ma non sono elencate né verificabili con `config`. Dichiararle esplicitamente è quindi preferibile: si vede cosa esiste e si può riusare la stessa rete in più file.

```yaml
services:
  api:
    networks:
      - backend
    volumes:
      - uploads:/app/uploads

  db:
    networks:
      - backend
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
  uploads:

networks:
  backend:
    driver: bridge
```

`external: true` indica che il volume o la rete esiste già e Compose non deve crearla: utile per condividere un'infrastruttura tra progetti diversi. Attenzione al prefisso del progetto: un volume dichiarato senza `name` viene creato come `nomeprogetto_nomevolume`, quindi due progetti con lo stesso file non condividono i dati.

## Override e merge per ambiente

Compose accetta più file con `-f` e li applica in ordine: i file successivi sovrascrivono i precedenti. Le regole di merge sono precise: gli scalari vengono sostituiti, le mappe unite ricorsivamente, le sequenze sostituite (non concatenate) tranne in casi espliciti come `dns` e `ports`, che si accumulano. `compose.override.yaml` viene caricato automaticamente se presente e non disattivato.

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d
docker compose --env-file .env.production config
docker compose -f compose.yaml -f compose.prod.yaml config --quiet
```

Il file di sviluppo monta il codice sorgente come bind mount e abilita un watcher; quello di produzione rimuove i bind mount, pinna i tag e aggiunge i limiti di risorse. Il base resta unico: così una correzione strutturale vale per tutti gli ambienti.

| Risorsa | Base | Dev override | Prod override |
| --- | --- | --- | --- |
| Codice | immagine | bind mount | immagine pinnata |
| Limiti | assenti | limiti leggeri | `deploy.resources` |

| Segreti | placeholder | variabili locali | file montati |
| Porte | interne | pubblicate su localhost | tramite reverse proxy |

## Variabili per ambiente

`.env` è il file predefinito per l'interpolazione; `--env-file` ne indica un altro. Le variabili destinate al container si dichiarano in `environment` (elenco o mappa) oppure si leggono da file con `env_file`, che accetta più file in ordine di precedenza. Le variabili nel file Compose, interpolate con `${...}`, agiscono invece al parse: un valore mancante senza default blocca l'avvio.

```yaml
services:
  api:
    env_file:
      - .env.common
    environment:
      APP_ENV: "${APP_ENV:-development}"
      DATABASE_URL: "postgres://app@db:5432/app"
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:3000/health"]
      interval: 10s
      timeout: 3s
      retries: 5
```

Le variabili servono per configurazione non segreta. Un segreto passato come variabile è leggibile da `docker inspect` e dai processi nel container: usa la sezione `secrets` di Compose, che monta il contenuto come file in `/run/secrets`, oppure un secret manager esterno. Anche i profili aiutano a tenere sotto controllo l'ambiente: un servizio con `profiles: ["debug"]` non parte se non attivi il profilo con `--profile debug`.

## Errori comuni

- **Credere che le sequenze si uniscano**: una lista `ports` nell'override sostituisce quella del base; i risultati a sorpresa vengono dalla regola di merge, non da un bug.
- **Segreti in `.env` versionato**: `.env` va in `.gitignore`, e i segreti veri non vanno affidati all'ambiente dei container.
- **Volumi anonimi per i dati**: `- /var/lib/postgresql/data` senza nome crea un volume anonimo difficile da ritrovare e da fare backup.
- **Healthcheck che dipende da strumenti assenti**: `curl` in un'immagine `distroless` non esiste e il controllo fallisce sempre; usa `CMD-SHELL` con strumenti presenti o modifica la healthcheck.

## In sintesi

Le risorse si dichiarano esplicitamente e hanno il prefisso del progetto, quindi il nome conta. Il merge di Compose è ricorsivo sulle mappe, sostitutivo sulle sequenze: con override piccoli e mirati si governa ogni ambiente partendo da un base comune. Le variabili si separano per ambiente con `.env`, `env_file` e `--env-file`, mentre i segreti vanno montati come file. Healthcheck e profili distinguono i servizi pronti da quelli facoltativi.

## Fonti

- [Docker Docs — Merge Compose files](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)
- [Docker Docs — Set environment variables in Compose](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/)
- [Docker Docs — Use secrets in Compose](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Compose Specification — spec.md](https://raw.githubusercontent.com/compose-spec/compose-spec/main/spec.md)
