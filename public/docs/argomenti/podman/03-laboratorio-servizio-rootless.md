In questo laboratorio metti in piedi `statsd-lite`, un piccolo servizio HTTP che espone metriche in stile Prometheus, e lo trasformi da comando `podman run` a servizio permanente su un host Linux rootless. Passi da un container avviato a mano a un quadlet, verifichi che sopravviva alla disconnessione della sessione, lo limiti in memoria e chiudi l'esercizio con un test che fallisce se il container può acquisire privilegi. Tutto senza demone e senza Docker.

## Obiettivi

- Costruire uno script Python minimo che risponde su `/metrics` e `/healthz`.
- Eseguirlo in un container rootless con cgroup, capability e filesystem vincolati.
- Scrivere il quadlet `statsd-lite.container` e attivarlo come unità utente.
- Verificare persistenza dopo `loginctl`, limiti e comportamento in caso di crash.
- Tradurre il servizio in manifest con `podman generate kube` e rigiocarlo.

## Il contratto di `statsd-lite`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| endpoint | `GET /metrics`, `GET /healthz` | formati testuali semplici |
| porta | 8000 dentro il container | nessuna porta privilegiata |
| dato | contatore di richieste + uptime | niente dipendenze esterne |
| utente | `nobody` (65534) | nessun privilegio dentro il container |
| filesystem | read-only con `/tmp` tmpfs | nessuno stato su disco |
| memoria | 64 MiB | sufficiente per Python standard |

```bash
mkdir -p ~/statsd-lite && cd ~/statsd-lite
cat > server.py <<'PY'
import http.server, socketserver, time, os
START = time.time()
HITS = 0

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global HITS
        if self.path == "/healthz":
            body = b"ok\n"
        elif self.path == "/metrics":
            HITS += 1
            body = f"statsd_hits_total {HITS}\nstatsd_uptime_seconds {time.time()-START:.0f}\n".encode()
        else:
            self.send_response(404); self.end_headers(); return
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers(); self.wfile.write(body)

with socketserver.TCPServer(("0.0.0.0", int(os.environ.get("PORT", "8000"))), Handler) as srv:
    srv.allow_reuse_address = True
    srv.serve_forever()
PY
```

Un `TCPServer` invece di `ThreadingTCPServer` evita problemi di chiusura socket in ambienti con cgroup stretti; se vuoi più throughput basta cambiare classe e rivedere i test.

## Primo avvio: dal comando al servizio

Il container usa `python:3.13-alpine`, monta lo script in sola lettura e limita le risorse. L'utente `nobody` esiste già nell'immagine Alpine.

```bash
podman run -d --name statsd-lite \
  --memory 64m --cpus 0.5 \
  --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges \
  --user 65534:65534 \
  --publish 127.0.0.1:8000:8000 \
  -v "$PWD/server.py:/app/server.py:ro,z" \
  python:3.13-alpine python /app/server.py

curl -s http://127.0.0.1:8000/healthz
curl -s http://127.0.0.1:8000/metrics
podman exec statsd-lite id
podman stats --no-stream statsd-lite
```

Il risultato atteso è `uid=65534(nobody)` dentro il container, mentre sull'host il processo appartiene al tuo utente. Se `podman stats` mostra un tetto di memoria diverso da `64MiB`, il tuo `systemd` non ha la delega dei cgroup attiva: verifica con `podman info --format '{{.Host.CgroupsVersion}}'` e `systemctl status user@$(id -u).service`.

## Da container a quadlet

Ora sostituisci il comando con un file dichiarativo. Il quadlet vive in `~/.config/containers/systemd/` e diventa `statsd-lite.service` dopo il `daemon-reload`.

```ini
# ~/.config/containers/systemd/statsd-lite.container
[Unit]
Description=statsd-lite metrics endpoint
After=network-online.target

[Container]
Image=docker.io/library/python:3.13-alpine
ContainerName=statsd-lite
PublishPort=127.0.0.1:8000:8000
Volume=%h/statsd-lite/server.py:/app/server.py:ro,Z
Exec=python /app/server.py
User=65534
ReadOnly=true
Tmpfs=/tmp
DropCapability=ALL
NoNewPrivileges=true
Memory=64m
AutoUpdate=registry

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

`%h` si espande nella home dell'utente e `Z` applica l'etichetta SELinux corretta al bind mount, necessaria su Fedora e RHEL. Rimuovi il container manuale prima di attivare l'unità, perché il nome è lo stesso.

```bash
podman rm -f statsd-lite
systemctl --user daemon-reload
systemctl --user enable --now statsd-lite.service
systemctl --user status statsd-lite.service --no-pager
loginctl enable-linger "$USER"
```

## Verifica: persistenza e confini

Il criterio di uscita dell'esercizio è un elenco di controlli osservabili. Eseguili nell'ordine, perché ognuno presuppone il precedente.

```bash
# 1. il servizio risponde dopo il riavvio dell'unità
systemctl --user restart statsd-lite.service && sleep 2
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/healthz

# 2. i limiti sono applicati dal cgroup
systemctl --user show statsd-lite.service -p MainPID
cat /proc/$(systemctl --user show -p MainPID --value statsd-lite.service)/cgroup

# 3. nessuna capability effettiva sopra zero
podman inspect statsd-lite --format '{{.HostConfig.CapDrop}} {{.HostConfig.Privileged}}'

# 4. il container non scrive sul filesystem
podman exec statsd-lite sh -c 'touch /app/x 2>&1 || true'

# 5. un crash riparte grazie a Restart=on-failure
podman exec statsd-lite sh -c 'kill -9 1'
sleep 3; systemctl --user is-active statsd-lite.service
```

Il punto 5 è il più istruttivo: `podman exec ... kill -9 1` termina il processo principale con codice non zero, `systemd` riavvia l'unità e il container torna attivo senza intervento manuale. Se invece l'unità resta `failed`, controlla `journalctl --user -u statsd-lite.service -n 50`.

## Esercizi

1. Aggiungi un `HealthCmd` al quadlet che chiami `/healthz` e verifica che lo stato di salute compaia in `podman inspect`.
2. Sposta la porta su 80 sull'host con `sysctl net.ipv4.ip_unprivileged_port_start=80` e spiega perché nei container rootless non puoi pubblicarla senza questa impostazione.
3. Genera il manifest con `podman generate kube statsd-lite`, cancella il container e rigiocalo con `podman kube play`.
4. Aggiungi una seconda istanza con nome `statsd-lite-b` su porta 8001 e crea un pod che le unisca: quali conflitti emergono?
5. Scrivi uno script di test che fallisca se `CapDrop` non contiene `ALL`, e collegalo a un hook `ExecStartPre`.

<details>
<summary>Soluzione</summary>

1. `HealthCmd=curl -fsS http://localhost:8000/healthz` con `HealthInterval=30s`: Podman espone lo stato in `State.Health.Status`.

2. Le porte sotto 1024 sono privilegiate nel namespace di rete; in rootless il kernel le rifiuta. Il `sysctl` abbassa la soglia globale e va reso persistente in `/etc/sysctl.d/`. In alternativa si pubblica su 8000 e si mette un reverse proxy sul host.

3. `podman generate kube` produce un Pod con il container, il `hostPath` diventa un volume e la porta diventa quella del container. Su un cluster Kubernetes `hostPath` richiede attenzione ai permessi e al nodo di destinazione.

4. Due container con `PublishPort` sulla stessa porta host entrano in conflitto. In un pod condividono il namespace di rete: una sola pubblicazione deve stare sul pod, e le due istanze devono ascoltare su porte diverse dentro il pod.

5. Lo script legge `podman inspect --format '{{json .HostConfig.CapDrop}}'` e esce con 1 se `ALL` non è presente; `ExecStartPre` interrompe l'avvio dell'unità in caso di exit non zero.

</details>

## Errori comuni

- **Attivare il quadlet con il nome sbagliato**: l'unità si chiama come il file senza prefisso, quindi `statsd-lite.service`; `container-statsd-lite.service` non esiste con i quadlet.
- **Lasciare il container manuale**: il quadlet fallisce con `name already in use`; rimuovilo con `podman rm -f` prima del `daemon-reload`.
- **Dimenticare `Z` sul bind mount SELinux**: il container non legge lo script e `systemd` mostra un errore di permission denied.
- **Interpretare `Restart=on-failure` come sempre**: un'uscita con codice 0 non fa ripartire il servizio, e un'app che si spegne pulita resta spenta.
- **Montare la home intera**: `Volume=%h:/app` espone tutti i file personali; monta solo la directory del servizio.

## In sintesi

Un servizio Podman durevole nasce da un comando validato e diventa un quadlet versionato, con limiti espliciti e restart dichiarato. `systemd` è il vero orchestratore: `linger` garantisce l'avvio senza sessione, i cgroup impongono le risorse, il journal conserva i log. Il manifest generato serve per uscire dall'host singolo, ma il percorso resta lo stesso: container piccoli, stato fuori, configurazione nel repository.

## Fonti

- [podman-systemd.unit(5) - quadlet](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [podman-run(1)](https://docs.podman.io/en/latest/markdown/podman-run.1.html)
- [podman-generate-systemd(1)](https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html)
- [Podman Documentation](https://docs.podman.io/en/latest/)
