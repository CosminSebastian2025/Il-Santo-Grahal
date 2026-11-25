Podman non ha bisogno di un demone attivo per eseguire un container, ma un servizio che deve sopravvivere al riavvio della macchina ha comunque bisogno di qualcuno che lo avvii. In Podman quel qualcuno è `systemd`: i container diventano unità, i pod diventano unità, e la politica di restart diventa la politica di `systemd`. In questa lezione vedi come costruire un servizio reale, come isolarlo in modo che non possa chiedere privilegi in più e come tradurre la configurazione in un manifest Kubernetes quando l'infrastruttura cresce.

## Obiettivi

- Creare un container con limiti di risorse e opzioni di sicurezza.
- Generare unità `systemd` con `podman generate systemd` o scriverle come quadlet.
- Passare configurazione e segreti senza copiarli nell'immagine.
- Creare pod e tradurli in manifest Kubernetes con `generate kube` e `play kube`.
- Usare il socket API solo quando uno strumento lo richiede.

## Container come servizio: limiti e sicurezza

Un container di produzione ha un tetto di risorse e una superficie di privilegi minima. Podman espone gli stessi cgroup di `systemd`, quindi i limiti sono verificabili con `podman stats`.

```bash
podman run -d --name api \
  --memory 512m --cpus 1.5 \
  --read-only --tmpfs /tmp \
  --cap-drop ALL --cap-add NET_BIND_SERVICE \
  --security-opt no-new-privileges \
  --publish 127.0.0.1:8080:8080 \
  -e DATABASE_URL \
  --env-file ./app.env \
  quay.io/example/api:1.4.0

podman stats --no-stream api
podman inspect api --format '{{.HostConfig.Memory}} {{.HostConfig.CapDrop}}'
```

| Opzione | Effetto | Quando usarla |
| --- | --- | --- |
| `--read-only` | filesystem immutabile | servizi senza scrittura locale |
| `--tmpfs /tmp` | area scrivibile volatile | cache temporanee |
| `--cap-drop ALL` | azzera le capability | sempre, poi si aggiunge il minimo |
| `--security-opt no-new-privileges` | blocca escalation via setuid | sempre |
| `--memory`, `--cpus` | limiti cgroup | tutti i servizi condivisi |
| `-e VAR` senza valore | importa la variabile dalla shell | segreti che non finiscono in `ps` |

`-e DATABASE_URL` senza `=valore` prende la variabile dall'ambiente del client: il valore non compare nella riga di comando e quindi non finisce nella cronologia della shell. Per segreti più strutturati c'è `podman secret create` con storing in `~/.local/share/containers/storage/secrets` oppure in `pass` e systemd-creds.

## Da container a unità systemd

`podman generate systemd` legge lo stato di un container esistente e scrive un file `.service` che lo ricrea. È il modo più rapido per aggiungere al boot un container che hai già validato a mano.

```bash
mkdir -p ~/.config/systemd/user
podman generate systemd --new --name api --files --restart-policy=always
mv container-api.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now container-api.service
loginctl enable-linger "$USER"     # avvio anche senza login
```

L'opzione `--new` fa sì che l'unità crei un container nuovo a ogni avvio invece di riavviare quello esistente, così il container riflette davvero l'unità. Il comando è però deprecato in favore dei quadlet, file `.container` che `systemd` interpreta tramite il generatore incluso in podman.

```ini
# ~/.config/containers/systemd/api.container
[Unit]
Description=API web
Wants=network-online.target
After=network-online.target

[Container]
Image=quay.io/example/api:1.4.0
PublishPort=127.0.0.1:8080:8080
EnvironmentFile=%h/app/app.env
Secret=db_password,type=env,target=DATABASE_URL
ReadOnly=true
DropCapability=ALL
AddCapability=NET_BIND_SERVICE
NoNewPrivileges=true
Memory=512m

[Install]
WantedBy=default.target
```

Dopo `systemctl --user daemon-reload` il nome dell'unità diventa `api.service`. Il quadlet è preferibile perché il file è la configurazione dichiarativa e non l'output di uno stato; inoltre `podman auto-update` può aggiornare l'immagine di un quadlet con `AutoUpdate=registry` ricreando il container.

## Configurazione, segreti e pod

I pod raggruppano container che condividono lo stesso namespace di rete, come in Kubernetes: la porta è una sola, i container si raggiungono su `localhost`. Sono utili per sidecar come un proxy o un collector di log.

```bash
podman pod create --name web --publish 8080:80
podman run -d --pod web --name frontend docker.io/library/nginx:1.29-alpine
podman run -d --pod web --name exporter \
  --env NGINX_STATUS=http://localhost/stub_status quay.io/example/nginx-exporter

podman generate kube web > web.yaml
podman kube play web.yaml
```

`generate kube` produce un manifest con Deployment, ConfigMap e Service; `kube play` ricrea lo stesso pod su un'altra macchina Podman o su un cluster. Attenzione: i volumi nominati diventano `PersistentVolumeClaim`, quindi su un cluster Kubernetes senza storage class il pod resta in attesa, mentre in Podman diventa un volume locale. `podman kube play` accetta `--network net1` per usare una rete Podman anziché la rete di default.

| Strumento | Livello | Uso tipico |
| --- | --- | --- |
| `podman` | singolo host | comandi e test manuali |
| quadlet | boot dell'host | servizio persistente |
| `podman kube` | trasporto | passaggio a Kubernetes |
| socket API | compatibilità | IDE, librerie `docker-py` |

## Errori comuni

- **Non fare `loginctl enable-linger`**: le unità `--user` si fermano alla disconnessione dell'utente, e il container muore con la sessione.
- **Usare `--restart` con il quadlet**: non esiste, perché la politica è di `systemd`; va configurata con `Restart=` nella sezione `[Service]` o con `WantedBy`.
- **Copia del file `.service` generato in repo**: contiene ID del container e percorsi assoluti, va rigenerato o sostituito da un quadlet.
- **Mettere il secret in `-e VAR=valore`**: compare nella riga di comando e nella history; usare `podman secret` o `EnvironmentFile`.
- **Salvare manifest con immagini non qualificate**: `generate kube` può produrre `image: alpine` senza registro, che altrove viene risolto in modo diverso.

## In sintesi

Un container Podman pronto per la produzione è un processo con capability azzerate, filesystem in sola lettura dove possibile e limiti cgroup espliciti. La persistenza non è una bandiera di restart ma un'unità `systemd`, meglio se scritta come quadlet e con `linger` attivo. I pod danno la rete condivisa e sono la via di fuga verso Kubernetes tramite i manifest generati. Il resto — registri, aggiornamenti e compatibilità — resta dichiarato nella configurazione dell'host.

## Fonti

- [podman-run(1)](https://docs.podman.io/en/latest/markdown/podman-run.1.html)
- [podman-systemd.unit(5) - quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [podman-generate-systemd(1)](https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html)
- [Podman - Getting Started](https://podman.io/docs)
