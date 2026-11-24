Una configurazione Docker funzionante non è ancora una configurazione sicura: un container che gira come root, con capability inutili, segreti passati come variabili d'ambiente e accesso al socket del demone è un rischio reale. Questa lezione raccoglie le pratiche che riducono la superficie d'attacco e le mette alla prova in un laboratorio costruito su un'applicazione minima, immagine non root, segreti montati come file e limiti di risorse. Ogni esercizio produce un comando verificabile.

## Obiettivi

- Applicare il principio del minimo privilegio: utente non root, capability ridotte, filesystem di sola lettura.
- Gestire i segreti senza esporli nell'ambiente o nella storia delle immagini.
- Impostare limiti di CPU e memoria e leggerne il comportamento.
- Verificare con `docker inspect` e `trivy` che le misure siano effettivamente attive.

## Dal build sicuro all'esecuzione sicura

La sicurezza inizia nell'immagine. Usa una base minima e aggiornata, crea un utente non privilegiato e copia solo ciò che serve. Il blocco seguente è un `Dockerfile` di partenza da cui costruire il laboratorio.

```dockerfile
FROM node:20-alpine
RUN addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY --chown=app:app server.js package.json ./
RUN npm ci --omit=dev
USER app
EXPOSE 3000
ENTRYPOINT ["node", "server.js"]
```

`USER app` è la riga che conta: senza di essa il processo gira come `root` (uid 0) e, in caso di compromissione, le capacità disponibili crescono. `--chown` evita file di proprietà di root nel layer che l'utente non potrebbe riscrivere.

All'avvio, aggiungi `--read-only`, `--cap-drop=ALL`, `--security-opt=no-new-privileges` e un `--tmpfs` per i file temporanei. Se il container non ha motivo di leggere il socket `/var/run/docker.sock`, non montarlo mai: chi controlla il socket controlla il demone, quindi l'intero host.

| Controllo | Flag | Cosa previene |
| --- | --- | --- |
| Utente non root | `USER` nel Dockerfile | escalazione immediata a root |
| Capability | `--cap-drop=ALL --cap-add=NET_BIND_SERVICE` | uso di primitive di rete o mount |
| Filesystem | `--read-only --tmpfs /tmp` | modifica persistente in caso di compromissione |
| Escalazione | `--security-opt=no-new-privileges` | escalation via setuid |

## Segreti e limiti di risorse

Un segreto non è una variabile d'ambiente: l'ambiente di un processo è leggibile da `docker inspect` e da chiunque possa eseguire comandi nel container. Il modo corretto è montare il segreto come file, con permessi stretti, in un percorso dedicato, oppure usare un secret manager se disponibile nell'ambiente.

```bash
echo "s3cr3t" > /tmp/db_password && chmod 600 /tmp/db_password
docker run -d --name api -p 8080:3000 \
  --read-only --tmpfs /tmp --cap-drop=ALL --security-opt=no-new-privileges \
  --memory 256m --cpus 0.5 \
  --mount type=bind,src=/tmp/db_password,dst=/run/secrets/db_password,readonly \
  esempio/api:1.0
docker inspect api --format '{{.Config.User}} {{.HostConfig.Memory}} {{.HostConfig.ReadOnlyRootfs}}'
```

L'applicazione legge la password da `/run/secrets/db_password`, non da `DB_PASSWORD`. I limiti `--memory` e `--cpus` proteggono l'host da un processo che occupa tutto: senza di essi un memory leak porta il nodo in Out-Of-Memory e trascina giù altri container. Il limite `--pids-limit` contiene il fork bomb e `--cpus` viene applicato dal kernel, non dal processo.

## Verifica: rendere le misure dimostrabili

Una misura di sicurezza non verificata è una promessa. Dopo l'avvio controlla che l'utente sia corretto, che il filesystem sia di sola lettura e che i segreti non compaiano nell'ambiente. Scansiona l'immagine con uno scanner di vulnerabilità e rimuovi le dipendenze non usate: un'immagine con meno pacchetti ha meno CVE da ereditare.

```bash
docker exec api id
docker exec api sh -c 'touch /nuovo && echo scritto'    # deve fallire con read-only
docker inspect --format '{{.Config.Env}}' api | grep -i SECRET  # deve essere vuoto
trivy image --severity HIGH,CRITICAL esempio/api:1.0
```

L'obiettivo del laboratorio non è ottenere un'immagine perfetta, ma un ciclo ripetibile: costruisci, avvia con i flag, verifica, correggi. Le mitigazioni che reggono nel tempo sono quelle espresse come codice e non come istruzioni orali.

## Errori comuni

- **Segreti nelle variabili d'ambiente**: compaiono in `docker inspect`, nei log dei processi e nei dump dell'ambiente.
- **Mount del socket Docker nei container applicativi**: dà al container il controllo del demone e quindi dell'host intero.
- **`--privileged` per aggirare un problema di permessi**: disattiva quasi tutte le protezioni; cerca invece il flag specifico che serve.
- **Limiti di memoria senza percepirlo nell'applicazione**: il runtime deve leggere il limite del cgroup, altrimenti sceglie dimensioni heap sbagliate.

## Esercizi

1. **Costruisci l'immagine non root.** Parti dal `Dockerfile` proposto e verifica che `id` dentro il container non restituisca `uid=0`. Perché `USER` va dopo `npm ci` e non prima?
<details><summary>Soluzione</summary>

Costruisci con `docker build -t lab/api:1 .` e avvia con `docker run --rm lab/api:1 id`. Se `npm ci` girasse con l'utente `app`, il processo non potrebbe scrivere in `node_modules`. Conviene quindi installare le dipendenze come root e poi scendere di privilegio: `USER app` è l'ultima istruzione prima di `EXPOSE` e `ENTRYPOINT`.
</details>

2. **Filesystem di sola lettura.** Avvia l'immagine con `--read-only --tmpfs /tmp` e dimostra che la scrittura nella root fallisce ma quella in `/tmp` riesce.
<details><summary>Soluzione</summary>

`docker run --rm --read-only --tmpfs /tmp lab/api:1 sh -c 'touch /x; touch /tmp/y; ls /tmp'`. Il primo `touch` restituisce `Read-only file system` ed esce con codice diverso da zero; la shell si interrompe, quindi per vedere entrambi usa `touch /x || true; touch /tmp/y; ls /tmp`. Il file `/tmp/y` esiste perché tmpfs è montato in scrittura.
</details>

3. **Segreto come file.** Avvia il container con la password montata in `/run/secrets/db_password` e mostra che non appare nell'ambiente.
<details><summary>Soluzione</summary>

`docker inspect --format '{{.Config.Env}}' api` non contiene la password. Il controllo `docker exec api cat /run/secrets/db_password` la stampa, perché il file è leggibile dall'utente `app`; in un sistema reale limita anche i permessi del file sull'host a `600` e considera `docker secrets` o un vault esterno.
</details>

4. **Limiti di risorse.** Avvia due container, uno con `--memory 128m` e uno senza, esegui un carico che alloca memoria e osserva cosa accade.
<details><summary>Soluzione</summary>

Nel container con limite il processo viene terminato dal kernel (OOM kill) e `docker inspect --format '{{.State.OOMKilled}}'` restituisce `true`; senza limite il processo cresce fino alla memoria dell'host. Verifica anche che il runtime legga il limite: con Node servono `--max-old-space-size` o un avvio che rispetti `NODE_OPTIONS` coerenti con il cgroup.
</details>

5. **Riduzione delle capability.** Avvia con `--cap-drop=ALL --security-opt=no-new-privileges` e verifica cosa cambia con `docker inspect`; identifica la capability necessaria per ascoltare sulla porta 80.
<details><summary>Soluzione</summary>

`docker inspect --format '{{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}' api` mostra `[ALL]` e l'opzione di sicurezza attiva. Con `ALL` la porta privilegiata 80 non è più disponibile: aggiungi `--cap-add=NET_BIND_SERVICE` oppure, meglio, ascolta su 3000 e pubblica con `-p 80:3000`. Nota che `no-new-privileges` impedisce comunque l'escalation tramite binari setuid.
</details>

6. **Scansione dell'immagine.** Esegui `trivy image` sull'immagine e confronta il numero di vulnerabilità con una base `debian` equivalente.
<details><summary>Soluzione</summary>

`trivy image --severity HIGH,CRITICAL lab/api:1` elenca le CVE ereditate dai pacchetti base. Un'immagine `*-alpine` o una base minima riduce il conteggio, ma non lo azzera: il punto è tenere le dipendenze aggiornate e ricostruire periodicamente. Confronta anche dopo `npm prune --omit=dev` per misurare quanto incidono le dipendenze di sviluppo.
</details>


## In sintesi

La sicurezza parte dal `Dockerfile`: base minima, utente non root, file con proprietario corretto. All'avvio riduci capability, rendi la root di sola lettura, disattiva l'escalazione e non montare il socket del demone. I segreti si montano come file, mai come variabili d'ambiente, e i limiti di memoria e CPU vanno accompagnati da una applicazione che li rispetta. Ogni misura va dimostrata con un comando.

## Fonti

- [Docker Docs — Engine security](https://docs.docker.com/engine/security/)
- [Docker Docs — Resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [OWASP — Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Docker Docs — Best practices for building images](https://docs.docker.com/build/building/best-practices/)
