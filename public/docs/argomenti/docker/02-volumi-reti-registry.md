Il filesystem scrivibile di un container è temporaneo; per conservare dati, isolare servizi tra loro e distribuire immagini serve qualcosa di più: volumi, reti e un registry. Questi tre elementi trasformano Docker da esecutore di comandi isolati in una piattaforma dove più processi cooperano e il loro stato sopravvive ai riavvii. Qui impari a scegliere il tipo di mount corretto, a collegare due container su una rete utente e a spostare un'immagine su un registro.

## Obiettivi

- Scegliere tra volume, bind mount e tmpfs in base al bisogno.
- Creare e ispezionare un volume nominato e un bind mount di sola lettura.
- Collegare due container su una rete bridge definita dall'utente usando il DNS integrato.
- Autenticarsi a un registry, pushare, pullare e pulire le immagini inutilizzate.

## Volumi: la persistenza che sopravvive al container

Un volume è un'area di storage gestita da Docker, montata dentro il container in un percorso scelto da te. Vive oltre il ciclo di vita del container e si crea in modo implicito alla prima `docker run -v` oppure esplicito con `docker volume create`. Il contenuto sta in una directory del demone, non nel filesystem del container, ed è per questo che `docker rm` non lo tocca.

| Tipo | Dove vive | Uso tipico | Backup |
| --- | --- | --- | --- |
| Volume nominato | gestito da Docker | database, cache persistente | `docker run --rm -v dati:/x -v $(pwd):/b alpine tar czf /b/x.tgz -C /x .` |
| Bind mount | un percorso dell'host | codice in sviluppo, config | copia dell'host |
| tmpfs | memoria RAM | file temporanei, segreti volatili | non serve |

In sviluppo il bind mount rende il codice locale visibile al container e consente un hot reload; in produzione il volume nominato è più portabile perché non dipende dal layout dell'host. Le prestazioni dei bind mount cambiano anche a seconda del sistema operativo host, mentre i volumi hanno un percorso noto e gestito.

```bash
docker volume create dati-db
docker run -d --name db -v dati-db:/var/lib/postgresql/data postgres:16
docker run -it --rm -v "$(pwd):/src:ro" alpine ls /src
docker volume ls && docker volume inspect dati-db
```

Il suffisso `:ro` rende il bind mount in sola lettura: utile per file di configurazione che il container non deve riscrivere. Un volume vuoto montato su una directory già popolata dall'immagine viene inizializzato con il contenuto dell'immagine stessa, comportamento da conoscere quando si cambiano le versioni dell'immagine.

## Reti: come i container si parlano

Ogni container ottiene un indirizzo IP dalla rete di default, ma il modo corretto di collegare servizi è una rete bridge definita dall'utente: su quella rete Docker fornisce un resolver DNS interno che risolve il nome del container nel suo indirizzo. Sulla rete `bridge` predefinita il DNS non c'è e le connessioni via nome falliscono.

```bash
docker network create app-net
docker run -d --name db --network app-net postgres:16
docker run -d --name api --network app-net -e DATABASE_URL=postgres://app@db:5432/app esempio/api:1.0
docker network inspect app-net --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\n"}}{{end}}'
```

I container sulla stessa rete si vedono su tutte le porte, senza `-p`: le porte pubblicate servono solo all'host e al mondo esterno. `--network host` elimina il namespace di rete e condivide lo stack dell'host: è veloce ma rinuncia all'isolamento, quindi non è la scelta predefinita.

## Registry: distribuire le immagini

Un registry è un servizio HTTP che conserva immagini indicizzate per repository e tag. Docker Hub è il più diffuso, ma esistono registry self-hosted e registri gestiti dai principali cloud. L'autenticazione avviene con `docker login` (token nel file di configurazione del client), poi `tag` e `push` coprono solo i layer mancanti sul server.

```bash
docker login ghcr.io -u utente
docker tag esempio/api:1.0 ghcr.io/utente/api:1.0
docker push ghcr.io/utente/api:1.0
docker pull ghcr.io/utente/api:1.0@sha256:3f2b...   # pin per digest
docker image prune -a --filter "until=168h"          # pulizia periodica
```

Il registry non è solo distribuzione: abilitando il controllo di vulnerabilità e la firma delle immagini diventa anche un punto di controllo della supply chain. Ogni `push` conserva i layer con i loro digest, e un `pull` per digest garantisce che tu stia usando esattamente quella versione, non il tag che qualcuno ha sovrascritto ieri.

## Errori comuni

- **Dati persistiti nel container invece che su un volume**: la directory del database si svuota al primo `docker rm` o al ricreare il container.
- **`localhost` nelle stringhe di connessione**: dentro un container `localhost` è il container stesso; per raggiungere un altro servizio si usa il suo nome sulla rete.
- **Rete di default invece di una rete utente**: sulla `bridge` predefinita il DNS per nome non funziona e l'isolamento tra progetti non esiste.
- **Bind mount dei segreti in chiaro**: montare chiavi o password come file leggibili dall'host e scrivibili li espone a chiunque abbia accesso al filesystem.

## In sintesi

Scegli il mount in base alla vita dei dati: volume per la persistenza, bind mount per il codice di sviluppo, tmpfs per i file volatili. Le reti utente offrono DNS tra container e isolamento per progetto, quindi la rete di default è solo un ripiego. Il registry distribuisce immagini per tag o digest, e pin per digest è il modo per rendere il deploy riproducibile. Pulizia periodica di immagini e volumi inutilizzati evita di consumare il disco.

## Fonti

- [Docker Docs — Volumes](https://docs.docker.com/engine/storage/volumes/)
- [Docker Docs — Networking overview](https://docs.docker.com/engine/network/)
- [Docker Docs — Share your image on Docker Hub](https://docs.docker.com/learn/content/share-your-image-on-docker-hub/)
- [Docker Docs — Prune unused objects](https://docs.docker.com/engine/manage-resources/pruning/)
