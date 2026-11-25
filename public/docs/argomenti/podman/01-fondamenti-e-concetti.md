Podman è un motore per container compatibile con la riga di comando di Docker, ma con un'architettura diversa: non c'è un demone centrale che gira come root, ogni container è un processo figlio dell'utente che lo avvia. Questo cambia il modello di sicurezza, il modo di distribuire le immagini, la gestione dei servizi all'avvio del sistema e le opzioni disponibili. In questa lezione impari come funziona Podman, cosa fa quando lanci `podman run` e quali differenze rispetto a Docker contano nella pratica.

## Obiettivi

- Descrivere l'architettura daemonless e la differenza tra rootless e rootful.
- Distinguere i tre strati principali: il motore `podman`, il runtime OCI e lo spazio utente del container.
- Scegliere tra il motore nativo su Linux e la macchina virtuale Podman Desktop su macOS e Windows.
- Configurare registri e firma delle immagini per sostituire il pull senza verifica di Docker.
- Ricondurre i comandi Docker quotidiani ai comandi Podman equivalenti.

## Architettura: motore senza demone

Podman viene installato come un binario unico che contiene tutte le sottocomandi. Quando esegui `podman run`, il client si rivolge al motore locale tramite l'API libpod: se sei root, il motore parla direttamente con l'utente root; se sei un utente normale, il motore esegue in modalità rootless e usa un namespace utente dedicato. In entrambi i casi non resta un processo di background che gestisce tutti i container.

```bash
podman version
podman info --format '{{.Host.Security.Rootless}}'   # true su utente normale
podman info --format '{{.Store.GraphDriverName}}'     # overlay o fuse-overlayfs
```

| Componente | Ruolo | Conseguenza pratica |
| --- | --- | --- |
| `podman` (client) | interpreta i comandi | nessun socket richiesto |
| motore libpod | crea e governa i container | stato locale in `~/.local/share/containers` |
| runtime OCI (`crun` o `runc`) | avvia i processi isolati | `crun` è default nelle distribuzioni moderne |
| Conmon | sorveglia il processo principale | raccoglie log e gestisce l'uscita |
| network backend | `netavark`/`aardvark-dns` | DNS interno per i container |

`podman system service` avvia a richiesta un'API compatibile con Docker (socket Unix o TCP) quando serve a strumenti che parlano con il demone, come alcuni IDE o la libreria `docker-py`. Il socket viene chiuso dopo l'inattività, quindi non rappresenta l'architettura di default ma un adapter.

## Rootless: il container è tuo

In modalità rootless il processo del container gira con lo stesso UID che hai nella shell. Dentro il container può sembrare root (UID 0), ma l'host applica `newuidmap` e `newgidmap` per mappare un intervallo di UID subordinati. Se il container viene compromesso, l'attaccante non ha più privilegi del tuo utente sul sistema.

```bash
grep "^$(id -un):" /etc/subuid        # intervallo di UID delegati
podman run --rm --user 1000:1000 -it alpine:3.21 sh -c 'id; cat /proc/self/uid_map'
```

| Limite rootless | Motivo | Alternativa |
| --- | --- | --- |
| nessuna porta sotto 1024 | bind di porte privilegiate | `sysctl net.ipv4.ip_unprivileged_port_start=80` o redirect |
| IP del container spesso vuoto | rete in user namespace | rete slirp4netns o pasta, accesso via porta pubblicata |
| `podman unshare` per manipolare file | permessi dei sottouid | `podman unshare chown -R 0:0 vol` |
| cgroup v2 necessari per limiti CPU/RAM | delega dei controller | distribuzioni aggiornate, `systemd` attivo |

Dal 2023 le distribuzioni principali usano `pasta` al posto di `slirp4netns` per la rete rootless, con prestazioni migliori e supporto all'IPv6 in ingresso. Se `podman info` mostra `networkBackend: netavark`, sei sul percorso consigliato.

## Oltre Linux: la macchina virtuale

Podman su macOS e Windows non usa il kernel Linux nativo, quindi Podman Desktop crea una VM (di solito con provider `libkrun` o WSL2) e inoltra i comandi dal client al motore dentro la VM. Il risultato è che volumi e immagini vivono nella VM, non nel filesystem del computer.

```bash
podman machine init --cpus 2 --memory 4096 --disk-size 30
podman machine start
podman machine list
podman machine ssh
```

Su Windows l'opzione WSL2 integra una distribuzione dedicata: i file montati da `/mnt/c` sono lenti, quindi i bind mount di progetti conviene copiarli o montarli da una cartella dentro la VM. Su entrambi i sistemi `podman run -v ./app:/app` funziona, ma il percorso viene tradotto per la VM: attenzione a `:z` e ai permessi SELinux, che sulla VM non esistono.

## Registri, firma e compatibilità

Podman non verifica né scarica immagini senza un ordine esplicito. I registri vanno elencati in `containers-registries.conf` e la ricerca `podman search` non usa Docker Hub per default.

```ini
# ~/.config/containers/registries.conf
unqualified-search-registries = ["docker.io", "quay.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"
```

Con `short-name-mode = "enforcing"` (default) un nome senza dominio come `alpine` viene risolto solo se compare in `registries.conf`; altrimenti Podman chiede o fallisce. Questo evita il name squatting, il caso in cui un'immagine con nome corto viene presa da un registro non intenzionale. Le immagini possono essere firmate con `skopeo copy --sign-by` e verificate con `podman image trust set`; in ambienti chiusi si usa `--pull=never` oppure `--policy=...` per impedire qualunque scaricamento.

La compatibilità dei comandi è alta ma non totale: le sottocomandi `docker buildx`, `docker swarm`, `docker context` non hanno equivalente uno a uno. `podman generate kube` e `podman play kube` traducono container e pod in manifest Kubernetes, e `podman generate systemd` crea unità `systemd` per avviare i container al boot, cosa che sostituisce la politica `--restart=always` di Docker.

| Docker | Podman | Nota |
| --- | --- | --- |
| `docker run -d` | `podman run -d` | stesso comportamento |
| `docker-compose up` | `podman compose up` | plugin che chiama `docker-compose` o `podman-compose` |
| `docker build` | `podman build` | Buildah integrato nel binario |
| `--restart=always` | unità systemd (`podman-restart.service`) | niente demone che riavvia |
| `docker exec` | `podman exec` | identico |

## Errori comuni

- **Cercare un demone**: `systemctl status podman` non esiste come servizio sempre attivo; per l'API usare `podman system service --time=0` o l'unità socket.
- **Dimenticare `--userns=keep-id`**: senza questa opzione i file creati dal container diventano di proprietà dell'UID mappato, non del tuo.
- **Usare `chown` sull'host per i volumi**: in rootless conviene `podman unshare chown -R 0:0` per allineare i permessi al UID 0 del container.
- **Assumere IP del container**: in rootless l'IP non è instradabile dall'host; usare le porte pubblicate o `podman network` con `pasta`.
- **Confondere alias di comando**: uno `alias docker=podman` funziona per quasi tutto, ma gli script che leggono l'output JSON possono incontrare campi diversi.

## In sintesi

Podman fa gli stessi container di Docker ma senza demone e per default con l'utente che lo avvia. La mappatura degli UID subordinati limita il raggio d'azione di un container compromesso, al prezzo di qualche vincolo su porte e IP. Su macOS e Windows il motore vive in una VM gestita da Podman Desktop. Le immagini richiedono registri dichiarati e possono essere firmate. La gestione dei servizi non passa da una politica di restart ma da unità `systemd`, che è il ponte naturale verso `podman compose`, l'argomento della prossima lezione.

## Fonti

- [Podman - Getting Started](https://podman.io/docs)
- [Podman Documentation](https://docs.podman.io/en/latest/)
- [podman(1) - man page](https://docs.podman.io/en/latest/markdown/podman.1.html)
- [Podman Desktop Documentation](https://podman-desktop.io/docs)
