Questo laboratorio mette in piedi un Headscale completo su una singola VM Linux: installazione DEB, configurazione con TLS via ACME, policy huJSON, embedded DERP e registrazione di tre nodi client, uno dei quali diventa exit node e uno subnet router. È il gemello self-hosted del laboratorio Tailscale, e serve a vedere direttamente sul server tutto ciò che nel servizio gestito è nascosto: approvazioni, ricariche di policy, log e mappe DERP.

Servono un dominio con DNS puntato sulla VM, le porte TCP 80 e 443 e UDP 3478 libere dall'esterno, e almeno due client Tailscale aggiornati (un client molto vecchio non parla il protocollo della versione attuale di Headscale). I nomi usati qui sono `headscale.example.com` per il server e `node-a`, `node-b`, `router` per i client.

## Obiettivi

- Installare Headscale e completare `config.yaml` con TLS, DNS e policy.
- Registrare nodi personali e tagged, via web authentication e via pre-auth key.
- Approvare un exit node e un subnet router e verificare il traffico dal client.
- Scrivere una policy con tag, grants e `autoApprovers`, ricaricarla e leggerne i log.
- Ripetere backup e verifica del servizio con una checklist finale.

## Contratto del laboratorio

| Passo | Risultato atteso | Comando di verifica |
| --- | --- | --- |
| 1. pacchetto installato | servizio attivo | `systemctl status headscale` |
| 2. configurazione valida | nessun errore | `headscale configtest` |
| 3. nodo personale | colonna User = utente | `headscale nodes list` |
| 4. nodo tagged | colonna User = tagged-devices | `headscale nodes list` |
| 5. exit node approvato | Approved `0.0.0.0/0` | `headscale nodes list-routes` |
| 6. DERP integrato | relay raggiungibile | `tailscale debug derp headscale` |

Il contratto è soddisfatto quando la sequenza di comandi della verifica finale, eseguita su una macchina pulita, produce gli stessi esiti della prima esecuzione.

## Installazione e configurazione

Il pacchetto DEB crea utente, service e directory standard. Dopo l'installazione apri `/etc/headscale/config.yaml` e imposta almeno `server_url`, `tls.acme.hostname`, `policy` e la sezione `derp`; `listen_addr` resta su `0.0.0.0:8080` perché il TLS è di Headscale stesso, davanti non c'è un proxy.

```bash
# installazione e primo avvio
HEADSCALE_VERSION="0.29.7"
wget --output-document=headscale.deb \
  "https://github.com/juanfont/headscale/releases/download/v${HEADSCALE_VERSION}/headscale_${HEADSCALE_VERSION}_linux_amd64.deb"
sudo apt install ./headscale.deb
sudo nano /etc/headscale/config.yaml
sudo systemctl restart headscale
sudo systemctl status headscale
headscale configtest
```

Il certificato arriva da ACME con la challenge HTTP-01 sulla porta 80, quindi il DNS del dominio deve essere attivo prima del primo avvio. Ricorda che Headscale rinnova i certificati Let's Encrypt solo poco prima della scadenza e non scrive log a ogni rinnovo: un test periodico con `openssl s_client` è più affidabile della lettura dei log.

```yaml
# configurazione minimale del laboratorio (estratto)
server_url: https://headscale.example.com
listen_addr: 0.0.0.0:8080
prefixes:
  v4: 100.64.0.0/10
  v6: fd7a:115c:a1e0::/48
policy:
  path: /etc/headscale/policy.hujson
  mode: file
database:
  type: sqlite
  sqlite:
    path: /var/lib/headscale/db.sqlite
dns:
  magic_dns: true
  base_domain: tailnet.internal
tls:
  acme:
    hostname: headscale.example.com
    challenge_type: HTTP-01
    listen: :http
    cache_dir: /var/lib/headscale/cache
derp:
  server:
    enabled: true
    ipv4: 198.51.100.1
    ipv6: 2001:db8::1
```

## Registrazione, route e policy

Crea l'utente e registra il primo nodo in modo interattivo: `tailscale up` apre la pagina sul server, che stampa l'auth-id da passare a `headscale auth register`. Il secondo nodo lo registri con pre-auth key, e il terzo con un tag, che deve essere autorizzato in `tagOwners` nella policy.

```bash
# utente e primo nodo via browser
headscale users create alice
tailscale up --login-server https://headscale.example.com
headscale auth register --user alice --auth-id <AUTH_ID>

# secondo nodo non interattivo
headscale preauthkeys create --user <USER_ID>
tailscale up --login-server https://headscale.example.com --authkey <YOUR_AUTH_KEY>

# router tagged: pre-auth key con tag (il tag deve avere un owner nella policy)
headscale preauthkeys create --tags tag:router
sudo tailscale up --login-server https://headscale.example.com --authkey <YOUR_AUTH_KEY> \
  --advertise-routes=192.168.0.0/24
headscale nodes list-routes
headscale nodes approve-routes --identifier 3 --routes 192.168.0.0/24
```

La policy di laboratorio concede al gruppo `lab` l'accesso alla rete dietro il router, l'uso dell'exit node via `autogroup:internet` e l'approvazione automatica di `192.168.0.0/24` per i nodi `tag:router`. Dopo ogni modifica esegui `sudo systemctl reload headscale` e controlla nel journal il risultato dell'elaborazione: Headscale logga la policy compilata o l'errore di parsing.

```json
// policy.hujson del laboratorio
{
  "groups": {
    "group:lab": ["alice@"]
  },
  "tagOwners": {
    "tag:router": ["alice@"],
    "tag:exit": ["alice@"]
  },
  "grants": [
    { "src": ["group:lab"], "dst": ["192.168.0.0/24"], "ip": ["*"] },
    { "src": ["group:lab"], "dst": ["autogroup:internet"], "ip": ["*"] }
  ],
  "autoApprovers": {
    "routes": { "192.168.0.0/24": ["tag:router"] }
  }
}
```

## Esercizi

1. Rendi `node-b` un exit node, approvalo e verifica da `node-a` che il traffico internet passi da lui.
2. Riscrivi la policy in modo che solo `alice@` possa registrare nodi con `tag:router`.
3. Metti Headscale dietro Nginx sulla stessa macchina e spiega quali valori di `config.yaml` cambiano.
4. Rimuovi le mappe DERP di Tailscale e verifica con `tailscale netcheck` quanti relay restano.
5. Simula un guasto di Headscale con `systemctl stop` e misura per quanto i nodi continuano a comunicare.
6. Scrivi una procedura di upgrade che salti una minor (per esempio da 0.28 a 0.30) e spiega cosa aggiungere.

<details>
<summary>Soluzione</summary>

1. Sul nodo `node-b` esegui `sudo tailscale up --login-server https://headscale.example.com --advertise-exit-node`, poi sul server `headscale nodes list-routes` per trovare l'ID e `headscale nodes approve-routes --identifier <ID> --routes 0.0.0.0/0`. Da `node-a` seleziona l'exit node con `sudo tailscale set --exit-node=<IP>` e verifica che il traffico internet esca dall'exit node: basta controllare l'IP pubblico. La policy deve permettere `autogroup:internet` per il gruppo a cui appartiene `node-a`.

2. Nella policy, `tagOwners` deve elencare solo `alice@` per `tag:router`, e la pre-auth key con tag va creata da un utente autorizzato. Headscale verifica il permesso alla registrazione: un altro utente che prova a registrare un nodo tagged ottiene un errore e il nodo non compare in `headscale nodes list`.

3. Lo snippet con Nginx raccoglie le modifiche tipiche: `server_url` resta il nome pubblico, mentre `listen_addr` scende su `127.0.0.1:8080` e i percorsi TLS di Headscale diventano vuoti perché il certificato lo gestisce il proxy; `trusted_proxies` deve contenere gli IP del proxy. STUN resta fuori dal proxy e deve arrivare direttamente alla porta UDP 3478, e in Nginx servono gli header `Upgrade` e `Connection` per il WebSocket del controllo.

4. Svuota `derp.urls` e riavvia Headscale. `tailscale netcheck` mostrerà un solo relay disponibile, quello integrato, e il tempo di latenza verso di esso; la rimozione delle regioni di Tailscale rende il server un singolo punto di fallimento. Lascia comunque le regioni di Tailscale se il server è su un collegamento instabile.

5. Con Headscale fermo i tunnel già stabiliti tra i nodi continuano; un nodo che riavvia o un client nuovo non riesce a registrarsi e a ottenere la mappa dei peer. Il comportamento atteso è lo stesso di Tailscale: il piano di controllo è necessario per nuovi rapporti, non per il traffico già in corso.

6. Non è possibile: l'aggiornamento richiede di passare dalla stabile successiva, quindi 0.28 → 0.29.x (ultima patch) → 0.30.x. Ogni tappa segue lo stesso ciclo: annuncio della release letto, stop del servizio, copia di `/etc/headscale` e `/var/lib/headscale`, upgrade, confronto di `config.yaml` con l'esempio della tag, avvio e verifica di nodi, route e policy. Se una tappa fallisce si ripristina il backup prima di continuare, perché il database è già migrato.

</details>

## Errori comuni

- **Svuotare `derp.urls` senza controllare il relay**: il DERP integrato va verificato con `tailscale debug derp headscale` prima di rimuovere i relay di Tailscale, altrimenti si perde la connettività nelle reti dove il direct non funziona.
- **Registrare un nodo tagged senza `tagOwners`**: la pre-auth key con tag viene accettata ma la registrazione fallisce; la policy va osservata nel log dopo il reload.
- **Reload dimenticato**: Headscale non usa il file watcher; senza `systemctl reload` le modifiche a `policy.hujson` non hanno effetto.
- **Confondere porta del controllo e porta DERP**: posare Headscale su una porta diversa da 443 richiede di esporre la 443 per l'ACME TLS-ALPN-01 e per il relay, e i client possono assumere HTTPS su 443.
- **Wget della release senza verificare la tag**: il pacchetto DEB va scaricato dalla release corrispondente alla documentazione che stai leggendo, perché le chiavi di configurazione cambiano tra minor.

## In sintesi

Il laboratorio porta un Headscale da zero a servizio operativo: pacchetto, configurazione con TLS e DERP, registrazione interattiva e non, route approvate, policy con gruppi e tag. Le verifiche con `nodes list`, `list-routes` e `tailscale debug` rendono visibili i passaggi che nel servizio gestito sono trasparenti. La lezione che resta è operativa: backup, reload della policy e approvazioni esplicite non sono automatismi, ma parte del contratto di chi gestisce il server.

## Fonti

- Headscale - Requirements and assumptions — https://headscale.net/stable/setup/requirements/
- Headscale - Getting started — https://headscale.net/stable/usage/getting-started/
- Headscale - Policy — https://headscale.net/stable/ref/policy/
- Headscale - Routes — https://headscale.net/stable/ref/routes/
- Headscale - Upgrading — https://headscale.net/stable/setup/upgrade/
