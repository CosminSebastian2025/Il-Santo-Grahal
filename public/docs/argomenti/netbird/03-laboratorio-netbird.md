Questo laboratorio monta una rete NetBird self-hosted con quattro peer e due policy, su una sola VM Linux con Docker. L'obiettivo non è ripetere la documentazione di installazione, ma attraversare il ciclo completo: piano di controllo, registrazione delle macchine, gruppi, policy, verifica di connettività e diagnosi del caso `Relayed`. Alla fine hai un ambiente che puoi distruggere e ricreare con un solo comando, e un elenco di prove da eseguire per certificarlo.

## Obiettivi

- Installare un piano di controllo NetBird self-hosted con Traefik e dominio pubblico.
- Registrare un server con setup key e una workstation con SSO o codice QR.
- Creare gruppi e due policy coerenti con il modello Zero Trust.
- Misurare la latenza per peer e classificare le connessioni come `P2P` o relè.
- Documentare uno scenario di guasto e il comando che lo ha individuato.

## Prerequisiti e topologia

Serve una VM con almeno 1 CPU e 2 GB di RAM, un dominio che risolva sull'indirizzo pubblico, TCP 443 e UDP 3478 raggiungibili dall'esterno e Docker con il plugin compose. Il server applicativo è un container che ascolta su `127.0.0.1:8080`; il database è un altro container con un volume persistente. La workstation dell'amministratore sta su un'altra rete, fuori dalla VLAN dei server: due reti reali diverse sono il modo più semplice per vedere il traffico attraversare davvero il tunnel.

| Nome peer | Ruolo | Gruppo | Rete fisica | Osservazione |
| --- | --- | --- | --- | --- |
| nb-01 | piano di controllo | management | cloud | non ospita peer applicativi |
| app-srv | servizio HTTP | app | VLAN server | registrato con setup key |
| db-srv | database | app | VLAN server | registrato con setup key |
| laptop-ops | postazione | ops | ufficio | registrato con SSO |
| jump-box | accesso amministrativo | ops | cloud | relè potenziale |

Le policy del banco sono due: `ops -> app` unidirezionale su TCP 22, 443 e 8000-8100, e `ops -> ops` bidirezionale sulla sola porta 22 per l'amministrazione tra postazioni. Il gruppo `All` resta non usato, e alla fine la policy `Default` viene cancellata. La tabella è la specifica del banco: se un peer manca o è nel gruppo sbagliato, ogni prova successiva misura un'altra rete.

## Installazione e registrazione

```bash
# su nb-01, in una directory vuota
export NETBIRD_DOMAIN=netbird.example.com
export NETBIRD_LETSENCRYPT_EMAIL=admin@example.com
curl -fsSL https://github.com/netbirdio/netbird/releases/latest/download/getting-started.sh | bash
docker compose ps                 # attesi management, signal, relay, dashboard
```

Apri `https://netbird.example.com/setup` e crea il primo utente: diventa owner. Da `Setup Keys` genera una chiave chiamata `bootstrap-app` con auto-group `app`, e da `Groups` crea `ops`. Sulle due VM applicative registra i peer con la stessa chiave, sull'amministratore usa il login interattivo.

```bash
# server applicativi: nessun browser, chiave e group assegnati
sudo netbird up --setup-key "$NB_SETUP_KEY" --management-url https://netbird.example.com:443
netbird status --json | grep -E '"fqdn"|"groups"'

# workstation: SSO, oppure QR su macchina senza browser
netbird up --management-url https://netbird.example.com:443
netbird login --qr --management-url https://netbird.example.com:443
```

Dopo la registrazione, assegna `laptop-ops` e `jump-box` al gruppo `ops` dal pannello, oppure lascia che l'auto-grouping della chiave lo faccia per `app`. Un peer senza gruppi non è raggiungibile da nessuna policy: è il primo controllo in caso di "peer visibile ma ping fallito".

## Policy, prove e diagnosi

```bash
# dalla postazione: connessione, tipo e latenza per peer
netbird status --table
netbird status -d --filter-by-names app-srv

# prova applicativa reale oltre al ping
curl -s -o /dev/null -w "%{http_code} %{time_total}\n" http://app-srv.netbird.cloud:8000/
```

`netbird status --table` mostra per ogni peer la colonna `CONN` con `P2P` o `Relayed`, la latenza e il traffico ricevuto e trasmesso. Una `curl` con codice 200 conferma che la policy sulla porta 8000 è attiva; una `ssh -p 22 jump-box` deve fallire con timeout e non con "connection refused", perché il rifiuto a livello di policy arriva come pacchetti scartati.

```bash
# sul peer che non vede nessuno
netbird status -d
sudo nft list ruleset | grep -i wt0        # regole applicate dal client
sudo netbird debug bundle --system-info    # per l'analisi successiva
```

Se ogni peer risulta `Connected` ma i ping non passano, il sospetto è l'ordine delle regole del firewall dell'host: `sudo ufw allow in on wt0` risolve i casi in cui UFW valuta prima i propri DROP. Se invece il traffico passa ma resta `Relayed`, il NAT di rete è simmetrico; per lo scenario di laboratorio è accettabile, in produzione si valuta una porta WireGuard stabile e un NAT che preserva la porta.

## Esercizi

1. Aggiungi il gruppo `monitoring` con una sola policy che autorizzi `jump-box` su TCP 9100 verso `app`, e verifica che `laptop-ops` non raggiunga la stessa porta.
2. Automatizza con Terraform o con l'API pubblica la creazione dei gruppi e delle due policy, e rendi idempotente il secondo run.
3. Introduci un posture check sul gruppo `ops` e prova un client con il check non soddisfatto: cosa cambia in `netbird status`?
4. Configura il relay self-hosted con la porta 443 UDP e TCP e osserva in `netbird status -d` quale trasporto viene scelto.
5. Misura la banda tra due peer `P2P` e tra gli stessi peer forzati in relè, con iperf3 sul tunnel.
6. Simula la caduta del management e verifica per quanto tempo i tunnel esistenti continuano a funzionare.

<details>
<summary>Soluzione</summary>

1. Nella policy `monitoring -> app` inserisci protocollo TCP e porta 9100, direzione unidirezionale; da ogni peer esegui `nc -z -w 3 app-srv.netbird.cloud 9100` e confronta gli esiti di `jump-box` e `laptop-ops`.

2. L'API pubblica espone risorse `groups`, `policies` e `setup-keys`; con Terraform si usa un provider REST generico o script con `curl -H "Authorization: Token ..."`. L'idempotenza si ottiene cercando per nome prima di creare e applicando `PATCH` invece di `POST` quando l'oggetto esiste.

3. Il posture check richiede un client aggiornato e i controlli configurati; con il check non soddisfatto il peer riceve la mappa senza le destinazioni protette, quindi la policy non produce raggiungibilità e `status -d` mostra il peer non connesso.

4. Nel file `config.yaml` della self-hosted si configura il relay con `listen-address` e il certificato TLS; il client preferisce QUIC su UDP 443 e ricade su WebSocket su TCP 443, e `netbird status -d` mostra il relay in uso.

5. `iperf3 -s` sull'app e `iperf3 -c app-srv.netbird.cloud` dalla postazione: con `P2P` il throughput segue la rete fisica, con relè dipende dalla VM del relay e dalla banda in uscita.

6. Ferma il container del management e continua a fare ping tra due peer già connessi: i tunnel WireGuard e le regole già applicate non dipendono dal server. Al riavvio i client si riconnettono e ricevono eventuali aggiornamenti di policy.

</details>

## Errori comuni

- **Usare la stessa setup key per ogni ambiente** — la chiave assegnata automaticamente al gruppo `app` finisce anche sui laptop e le policy diventano incoerenti; separa le chiavi e ruotale.
- **Verificare solo con ping** — il ping verso l'indirizzo del peer può passare anche quando la policy sulla porta applicativa è sbagliata: prova con `curl` o `nc` sulla porta reale.
- **Attendere un rifiuto immediato dal firewall** — le regole del client scartano i pacchetti, quindi la policy negata si manifesta come timeout e non come rifiuto.
- **Dimenticare la policy `Default`** — finché esiste, tutti i test sembrano superati e non stai verificando nulla.
- **Self-hosting senza redeploy del certificato** — un reverse proxy configurato a metà dà client con errori TLS sul management: controlla l'endpoint prima di registrare i peer.

## In sintesi

Un self-hosted NetBird si prova come un'applicazione qualunque: prerequisiti, installazione, policy e prove esplicite. La diagnosi ruota attorno a `status`, al tipo di connessione e alle regole del firewall. Il banco si distrugge e si ricrea.

## Fonti

- NetBird - Self-Hosting Quickstart Guide — https://docs.netbird.io/selfhosted/selfhosted-quickstart
- NetBird - Managing Access with Groups and Access Policies — https://docs.netbird.io/manage/access-control/manage-network-access
- NetBird - Register Machines Using Setup Keys — https://docs.netbird.io/manage/peers/register-machines-using-setup-keys
- NetBird - Ports & Firewalls — https://docs.netbird.io/about-netbird/ports-and-firewalls
