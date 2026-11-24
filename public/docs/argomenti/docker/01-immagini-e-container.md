Un'immagine Docker è un archivio immutabile che contiene un filesystem e i metadati necessari ad avviarlo; un container è un processo isolato che nasce da quell'immagine e aggiunge uno strato scrivibile. Capire questa distinzione e il ciclo di vita del container è il primo passo per usare Docker senza sorprese. In questa lezione costruisci un'immagine da un `Dockerfile`, la esegui, la ispezioni e la fermi, leggendo quello che accade a ogni comando.

## Obiettivi

- Distinguere immagine, layer e container, e riconoscere cosa viene condiviso.
- Scrivere un `Dockerfile` con `FROM`, `COPY`, `RUN`, `CMD` ed `ENTRYPOINT`.
- Gestire il ciclo di vita di un container con `run`, `ps`, `logs`, `exec` e `rm`.
- Capire perché l'immagine è immutabile e ogni modifica a runtime produce un nuovo layer.

## Immagini, layer e Dockerfile

Un'immagine è una sequenza ordinata di layer in sola lettura. Ogni istruzione che modifica il filesystem (`RUN`, `COPY`, `ADD`) crea un layer; le istruzioni di configurazione (`ENV`, `EXPOSE`, `CMD`, `LABEL`) cambiano solo i metadati dell'immagine. I layer sono memorizzati dal demone con un digest e sono condivisi tra immagini che hanno gli stessi passaggi iniziali: due servizi che partono da `ubuntu:24.04` occupano lo spazio dei layer comuni una sola volta.

Il nome di un'immagine ha la forma `registry/namespace/nome:tag`; se manca registry si intende Docker Hub, se manca il tag si intende `latest`. Il tag è un'etichetta mobile, il digest è immutabile: `sha256:...` identifica esattamente quei byte.

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

L'ordine conta: copiare prima `package*.json` e poi il codice fa sì che una modifica al sorgente non invalidi il layer con `npm ci`. È la logica della cache dei layer, l'unico vero motivo per cui si ordinano le istruzioni con cura.

| Istruzione | Effetto | Crea layer |
| --- | --- | --- |
| `FROM` | immagine di partenza | no |
| `RUN` | esegue un comando in fase di build | sì |
| `COPY` / `ADD` | copia file nel filesystem | sì |
| `ENV` / `LABEL` | metadati | no |
| `CMD` / `ENTRYPOINT` | comando di avvio | no |

## Il container e il suo ciclo di vita

Un container è un processo, non una macchina virtuale: non avvia un init completo, non ha un kernel proprio e termina quando il processo principale termina. Il filesystem che vede è l'immagine in sola lettura più un layer scrivibile temporaneo. Quando il container viene rimosso, quel layer sparisce: ogni file scritto senza un volume è perso.

```bash
docker run -d --name web -p 8080:3000 esempio/app:1.0
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker logs --tail 50 web
docker exec -it web sh
docker stop web && docker rm web
```

Gli stati si susseguono in modo lineare: `created` alla creazione, `running` all'avvio, `exited` alla chiusura del processo. Un container `exited` conserva lo strato scrivibile e i metadati finché non lo rimuovi; `--rm` lo elimina appena termina ed è la scelta giusta per i comandi usa e getta. `docker exec` non riavvia nulla: apre un secondo processo dentro lo stesso namespace, utile per diagnosi ma non per correggere l'immagine.

## Immutabilità e dove finiscono le modifiche

Poiché l'immagine non cambia mai, correggere un bug significa costruire una nuova immagine con un tag nuovo. Fare `docker exec` e modificare un file dentro il container è una riparazione che sparisce al primo riavvio: non è debugging, è debito tecnico differito.

```bash
docker build -t esempio/app:1.1 .
docker images --digests | head -5
docker image inspect esempio/app:1.1 --format '{{.Id}} {{.Config.Cmd}}'
```

`docker image inspect` mostra l'identificatore del contenuto insieme alla configurazione finale, cioè come l'immagine ha applicato in cascata `ENV`, `WORKDIR`, `CMD` e così via. È il modo più rapido per rispondere alla domanda "cosa c'è davvero dentro questa immagine?" senza avviarla.

## Errori comuni

- **Tag `latest` in produzione**: l'immagine cambia senza un commit nel repository e un rollback diventa un rebus; pinna tag di versione o digest.
- **Modifiche fatte dentro il container**: file toccati con `exec` o servizi avviati a mano spariscono al riavvio e non sono riproducibili.
- **`COPY` prima di `RUN npm ci`**: ogni modifica al codice invalida la cache delle dipendenze e ogni build ricompila tutto.
- **Aspettarsi persistenza dallo strato scrivibile**: dati scritti nel filesystem del container senza volume vengono persi con `docker rm`.

## In sintesi

L'immagine è una lista immutabile di layer in sola lettura; il container aggiunge uno strato scrivibile e vive quanto il suo processo principale. Il `Dockerfile` va ordinato per massimizzare la cache, partendo dalle dipendenze e chiudendo con il codice. Il ciclo di vita si gestisce con `run`, `ps`, `logs`, `stop`, `rm` e `--rm` per i comandi usa e getta. Ogni correzione reale passa da una nuova immagine, mai da modifiche a caldo.

## Fonti

- [Docker Docs — Get started: cos'è un container](https://docs.docker.com/learn/content/what-is-a-container/)
- [Docker Docs — Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Docs — Best practices for building images](https://docs.docker.com/build/building/best-practices/)
- [Docker Docs — docker container run](https://docs.docker.com/reference/cli/docker/container/run/)
