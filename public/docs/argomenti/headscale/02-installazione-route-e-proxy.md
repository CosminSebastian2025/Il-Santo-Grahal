Dopo il primo avvio, un Headscale di produzione vive di tre attività ricorrenti: aggiornarsi senza perdere il database, gestire le route di subnet router ed exit node, e mettere Headscale dietro un reverse proxy che parli il protocollo giusto. A queste si aggiunge il server DERP integrato, che in molti laboratori che si vogliono indipendenti da servizi esterni trasforma Headscale anche in relay. Questa lezione copre questi strumenti con i comandi della CLI e gli snippet di configurazione della documentazione ufficiale.

Un vincolo va tenuto a mente fin dall'inizio: Tailscale non ha un flusso di aggiornamento automatico per Headscale, e le migrazioni del database avvengono all'avvio del nuovo binario. Il backup, quindi, non è un'ottimizzazione ma parte del processo di upgrade.

## Obiettivi

- Installare o aggiornare Headscale rispettando il percorso tra versioni e il backup preliminare.
- Approvare route di subnet router ed exit node e automatizzare l'approvazione con `autoApprovers`.
- Mettere Headscale dietro Nginx o Caddy senza rompere il canale di controllo.
- Attivare e verificare il DERP integrato con STUN e controllo client.
- Riconoscere quando Headscale non va inserito dietro un proxy Cloudflare.

## Installazione, aggiornamento e backup

Esistono pacchetti ufficiali `.deb`, pacchetti della community e immagini container: tutti seguono le assunzioni di base, utente `headscale`, configurazione in `/etc/headscale/config.yaml` e dati in `/var/lib/headscale`. L'installazione dal binario richiede anche il service systemd, mentre il pacchetto lo fornisce già.

```bash
# installazione DEB (sostituire la versione con l'ultima stabile)
HEADSCALE_VERSION="0.29.7"
wget --output-document=headscale.deb \
  "https://github.com/juanfont/headscale/releases/download/v${HEADSCALE_VERSION}/headscale_${HEADSCALE_VERSION}_linux_amd64.deb"
sudo apt install ./headscale.deb
sudo nano /etc/headscale/config.yaml
sudo systemctl restart headscale
sudo systemctl status headscale

# backup completo prima di ogni aggiornamento
TIMESTAMP=$(date +%Y%m%d%H%M%S)
cp -aR /etc/headscale /etc/headscale.backup-$TIMESTAMP
cp -aR /var/lib/headscale /var/lib/headscale.backup-$TIMESTAMP
```

Il percorso di aggiornamento richiede di passare dalla versione stabile successiva senza saltare minor (per esempio da 0.28 a 0.29 prima di arrivare a 0.30), leggendo l'annuncio della release per le modifiche incompatibili. Dopo il riavvio confronta `config.yaml` con l'esempio della stessa tag e verifica con `headscale configtest` e `headscale nodes list`.

Una nota sulla documentazione online: la pagina TLS della documentazione stabile descrive ancora le chiavi piatte `tls_cert_path` e `tls_letsencrypt_hostname`, mentre l'esempio di configurazione della release usa la forma annidata `tls.cert_path` e `tls.acme.*`. La regola pratica è partire dall'esempio della tag in uso e, se una chiave non viene riconosciuta, cercarla lì: è l'unica fonte allineata al binario che hai installato.

## Route: subnet router ed exit node

Come in Tailscale, le route sono un doppio opt-in: il nodo le annuncia con il client, il server le approva. La CLI `headscale nodes list-routes` mostra le colonne Approved, Available e Serving, e `approve-routes` approva una lista separata da virgole. Un exit node è riconoscibile perché annuncia `0.0.0.0/0` e `::/0`; approvarlo come exit node si fa indicando `0.0.0.0/0`, che implica anche `::/0`.

| Comando | Effetto | Nota |
| --- | --- | --- |
| `headscale nodes list-routes` | mostra route annunciate | colonna Approved vuota = non usabile |
| `headscale nodes approve-routes -i 1 -r 10.0.0.0/8` | approva la route | identificativo del nodo obbligatorio |
| `headscale nodes list-routes` | verifica Serving | route in uso dal tailnet |
| `headscale nodes tag -i 1 -t tag:router` | assegna tag | abilita `autoApprovers` |

```bash
# sul nodo: annunciare le route e abilitare l'inoltro IP
sudo tailscale up --login-server https://headscale.example.com --advertise-routes=192.168.0.0/24

# sul server: approvare, poi consentire ai client di accettare le route
headscale nodes list-routes
headscale nodes approve-routes --identifier 1 --routes 192.168.0.0/24
sudo tailscale set --accept-routes

# exit node: annuncio, approvazione della default route, uso
sudo tailscale up --login-server https://headscale.example.com --advertise-exit-node
headscale nodes approve-routes --identifier 2 --routes 0.0.0.0/0
sudo tailscale set --exit-node=100.64.0.2
```

Per evitare l'approvazione manuale si usa `autoApprovers` nella policy, che mappa route verso tag. La policy può anche limitare l'uso delle route: un grant verso un host specifico consente di raggiungere l'applicazione dietro il router senza concedere l'accesso al router stesso.

## Reverse proxy, DERP e API

Il canale di controllo usa una connessione WebSocket con `Upgrade: tailscale-control-protocol`, un valore che i reverse proxy non riconoscono di default. In Nginx serve la coppia di header `Upgrade` e `Connection` mappati da `$http_upgrade`; in Apache serve `ProxyPass` con `upgrade=any`. Cloudflare, invece, non è supportato perché non inoltra POST WebSocket: un Headscale dietro Cloudflare semplice non funziona.

```nginx
# estratto Nginx: inoltro del controllo, TLS terminato dal proxy
server {
  listen 443 ssl;
  server_name headscale.example.com;
  ssl_certificate     /etc/ssl/headscale/fullchain.pem;
  ssl_certificate_key /etc/ssl/headscale/privkey.pem;
  location / {
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header True-Client-IP $remote_addr;
    proxy_pass http://127.0.0.1:8080;
  }
}
```

Con un reverse proxy in TLS, `listen_addr` va limitato a `127.0.0.1:8080`, `trusted_proxies` deve contenere gli indirizzi del proxy e i percorsi TLS di Headscale restano vuoti. STUN resta invece escluso dal proxy: la porta UDP 3478 va esposta direttamente.

Il DERP integrato si abilita nella sezione `derp.server`, con indirizzi pubblici IPv4 e IPv6 per stabilizzare le connessioni, e richiede la porta HTTP 80 per il check del captive portal e UDP 3478 per STUN. Per usare solo il proprio relay si svuota `derp.urls`, consapevoli che resta un singolo punto di fallimento. La verifica si fa dal client con `tailscale debug derp-map` e `tailscale debug derp headscale`.

```yaml
# Headscale come unico relay del tailnet
derp:
  server:
    enabled: true
    ipv4: 198.51.100.1
    ipv6: 2001:db8::1
    verify_clients: true      # solo nodi del tailnet possono usare il relay
  urls: []                    # nessuna mappa DERP di Tailscale

# porte da esporre: tcp/443, udp/3478, tcp/80 (captive portal e ACME HTTP-01)
```

La configurazione del client e degli strumenti automatici passa per la CLI unix socket o per le API. Per gli script si crea una API key con `headscale apikeys create`, così il processo non ha bisogno di permessi sul socket. La CLI resta lo strumento principale per l'amministrazione quotidiana: utenti, nodi, chiavi, route, policy e debug sono tutti raggiungibili con `headscale <comando> --help`.

```bash
# CLI locale: utenti, nodi, policy e route in un unico punto
headscale users list
headscale nodes list
headscale nodes list-routes
headscale configtest

# API key per automazioni che non usano il socket unix
headscale apikeys create
```

Per i team che modificano la policy a mano conviene tenere il file in un repository e caricarlo sempre con `policy.path`: l'editing tramite web UI deposita la policy nel database, e questo rende più difficile ricostruire la storia delle modifiche quando qualcosa smette di funzionare. Nello stesso spirito, lo stato di Headscale è quasi tutto nel database SQLite e in `/var/lib/headscale`: un file di backup copiato da lì, più la configurazione e la policy, ricostruisce il server su una macchina nuova in pochi minuti.

## Errori comuni

- **Aggiornare saltando una minor**: il database si migra una versione alla volta; passare da 0.28 a 0.30 direttamente non è supportato e il rollback richiede il backup.
- **Mettere Headscale dietro Cloudflare**: la versione con proxy non supporta il POST WebSocket richiesto dal protocollo, e i client restano in errore di registrazione.
- **Aprire solo TCP 443**: senza UDP 3478 lo STUN non funziona e il relay integrato non aiuta i client a scoprire il proprio indirizzo pubblico.
- **Usare l'IP di Headscale in `server_url`**: il valore deve essere il nome con cui i client lo raggiungono, altrimenti certificato e cookie di login non coincidono.
- **Approvare un exit node con `::/0` e poi stupirsi del traffico**: l'approvazione della default route abilita il gateway; limitane l'uso con un grant verso l'exit node specifico se non vuoi un internet condiviso.

## In sintesi

L'operatività di Headscale ruota attorno a backup e upgrade ordinati, approvazione delle route e uso di `autoApprovers`, reverse proxy compatibile con il protocollo di controllo e DERP integrato con STUN. CLI e API key coprono l'automazione, mentre la policy resta il punto in cui si decidono i permessi su route, tag e exit node. Tenere separati TLS, WebSocket del controllo e STUN è la chiave per un server stabile dietro un proxy.

## Fonti

- Headscale - Official releases — https://headscale.net/stable/setup/install/official/
- Headscale - Upgrade — https://headscale.net/stable/setup/upgrade/
- Headscale - Routes — https://headscale.net/stable/ref/routes/
- Headscale - Reverse proxy — https://headscale.net/stable/ref/integration/reverse-proxy/
- Headscale - DERP — https://headscale.net/stable/ref/derp/
