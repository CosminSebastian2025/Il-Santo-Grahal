Headscale è un server di coordinamento per Tailscale scritto in Go e distribuito sotto licenza libera dal progetto juanfont/headscale: implementa dall'altro lato del filo il protocollo che i client Tailscale usano per registrarsi, ricevere le chiavi pubbliche dei peer e la policy. In pratica sostituisci `controlplane.tailscale.com` con un tuo server e mantieni lo stesso client, gli stessi comandi e lo stesso modello di rete. Il traffico resta punto-punto in tunnel WireGuard o passa da un relay DERP: Headscale coordina, non trasporta dati.

La differenza sostanziale rispetto a Tailscale è il perimetro di responsabilità. Con Headscale sei tu a gestire il server, i certificati TLS, il database SQLite o PostgreSQL, i backup e gli aggiornamenti; in cambio hai un tailnet che non dipende da servizi esterni, adatto a laboratori, homelab e reti isolate, con alcune funzioni commerciali (Funnel, Serve, network flow logs) ancora non implementate.

## Obiettivi

- Spiegare come Headscale si inserisce nel modello a due piani di Tailscale, con un focus sul ruolo di `server_url`.
- Descrivere utenti, nodi, tag e il binding del nodo a un utente o a `tagged-devices`.
- Distinguere registrazione via web authentication e via pre-auth key e sapere quando usarle.
- Riconoscere gli oggetti di `config.yaml` che servono al primo avvio e alla messa in sicurezza.
- Individuare le differenze attuali rispetto al servizio gestito: CGNAT, policy, DERP, funzioni mancanti.

## Ruolo e architettura

Il client contatta Headscale all'indirizzo indicato in `server_url`, che deve corrispondere esattamente a come i client raggiungono il server e deve essere in HTTPS sulla porta 443 per l'uso in produzione. Il server tiene il registro dei nodi, distribuisce le chiavi pubbliche secondo la policy, assegna gli indirizzi e serve la mappa DERP. Tutto il resto, dal tunnel all'applicazione, avviene tra i client.

| Componente | Piano | Responsabilità |
| --- | --- | --- |
| Headscale | controllo | registrazione, chiavi, policy, DNS, map DERP |
| Client Tailscale | dati e controllo | tunnel WireGuard, filtri, DNS locale |
| Embedded DERP | dati (relè) | inoltro cifrato quando il direct fallisce |
| STUN | supporto NAT | scoperta dell'indirizzo pubblico |
| Database | persistenza | nodi, utenti, chiavi pre-autenticate, policy |

Il server usa lo spazio 100.64.0.0/10 e fd7a:115c:a1e0::/48 come Tailscale; in `prefixes` puoi cambiarli, e gli indirizzi vengono assegnati in modo sequenziale di default. Headscale non fa autenticazione degli utenti: la fa il flusso di registrazione, con un amministratore che approva via CLI o API, oppure un identity provider via OpenID Connect. OIDC permette il login diretto, ma i gruppi dell'identity provider non possono essere usati nelle ACL: la policy si scrive con utenti, tag e autogruppi.

## Utenti, nodi e registrazione

Un utente Headscale è un contenitore di nodi, non un account con password: serve a raggruppare dispositivi e a dare un proprietario alle regole della policy. Il nome dell'utente non deve terminare con `@`; nelle regole si scrive come `alice@`. Un nodo tagged, invece, appartiene all'utente speciale `tagged-devices` e il suo nome non compare tra i proprietari: si gestisce con i tag.

| Metodo | Come funziona | Quando usarlo |
| --- | --- | --- |
| Web authentication | `tailscale up` apre un browser, l'admin esegue `headscale auth register` | primo nodo, macchine di persone |
| Pre-auth key | chiave creata con `headscale preauthkeys create`, passata a `tailscale up --authkey` | automazione, container, nodi smontabili |
| OIDC | login diretto dal browser sul provider configurato | team con identity provider |

Di default una pre-auth key è a uso singolo e vale un'ora: per un rollout serve crearne una per nodo o leggere il comportamento delle opzioni con `headscale preauthkeys --help`. La registrazione a nodo tagged richiede che l'utente sia elencato in `tagOwners` per quel tag, altrimenti Headscale rifiuta il nodo.

```bash
# creare un utente e scoprirne l'ID
headscale users create alice
headscale users list

# registrazione interattiva: il client stampa l'auth-id da approvare
tailscale up --login-server https://headscale.example.com
headscale auth register --user alice --auth-id <AUTH_ID>

# alternativa non interattiva per automazioni
headscale preauthkeys create --user <USER_ID>
tailscale up --login-server https://headscale.example.com --authkey <YOUR_AUTH_KEY>

# listare i nodi e applicare tag
headscale nodes list
headscale nodes tag -i 1 -t tag:server,tag:prod
```

## Configurazione e sicurezza

Headscale legge `config.yaml` da `/etc/headscale`, da `$HOME/.headscale` o dalla directory corrente; con `-c/--config` o la variabile `HEADSCALE_CONFIG` scegli un altro file, e `headscale configtest` valida la sintassi. I valori minimi da rivedere sono `server_url`, `listen_addr`, la parte `prefixes`, `database` (SQLite è raccomandato), `policy` e `tls`. Il socket unix `unix_socket` è il canale della CLI locale: va reso accessibile solo all'utente `headscale` o al gruppo dedicato.

```yaml
# estratto di config.yaml per un server minimo con TLS e policy su file
server_url: https://headscale.example.com   # deve coincidere con l'URL usato dai client
listen_addr: 0.0.0.0:8080
unix_socket: /var/run/headscale/headscale.sock
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
  cert_path: /etc/headscale/tls/fullchain.pem
  key_path: /etc/headscale/tls/privkey.pem
```

Headscale può ottenere i certificati da solo con ACME (`tls.acme.hostname`, challenge HTTP-01 o TLS-ALPN-01), oppure usare un certificato già esistente, che deve contenere la catena completa perché alcuni client come quello Android la verificano. `derp` abilita il server DERP integrato (disattivato di default) e la lista `urls` della mappa DERP: di default è quella di Tailscale, e rimuoverla significa dipendere dal solo relay locale.

```bash
# lista dei peer con lo stato del canale di controllo
headscale nodes list
```

La policy è huJSON come in Tailscale. Senza `policy.path` non c'è nessuna policy e il traffico è tutto permesso; con un file presente ma senza `acls` o `grants` vale ancora allow all, mentre `{"grants": []}` nega tutto. Il server legge il file all'avvio e alle ricariche: `systemctl reload headscale` o un SIGHUP, e logga il risultato dell'elaborazione.

## Errori comuni

- **Sbagliare `server_url`**: deve coincidere con l'URL raggiunto dai client, schema e porta compresi; un valore diverso rompe la registrazione o i certificati.
- **Trattare Headscale come un VPN gateway**: il server non vede il traffico; un nodo continua a comunicare con i peer esistenti anche se Headscale è giù.
- **Usare il nome utente con la chiocciola**: l'utente si crea senza `@` (che compare solo nelle regole di policy), e un nome con `@` viene rifiutato.
- **Dimenticare `tagOwners`**: senza autorizzazione nel tag, la registrazione di un nodo tagged fallisce anche se la pre-auth key è valida.
- **Applicare a Headscale la documentazione di Tailscale per Funnel o postures**: funzioni non implementate vengono ignorate o vanno in errore; controlla la pagina delle feature prima di disegnare l'architettura.

## In sintesi

Headscale è il control server self-hosted compatibile con il client Tailscale: coordina identità, chiavi, policy e DERP senza trasportare traffico. Utenti, nodi, tag e pre-auth key sono gli oggetti di base; `config.yaml` e la policy huJSON sono le due sorgenti principali del comportamento del server. Il compito che riprende da Tailscale è solo quello del piano di controllo: il data plane resta su WireGuard, e le differenze da tenere a mente sono le funzioni non disponibili e la responsabilità operativa che passa interamente a te.

## Fonti

- Headscale - Documentation (stable) — https://headscale.net/stable/
- Headscale - Features — https://headscale.net/stable/about/features/
- Headscale - Getting started — https://headscale.net/stable/usage/getting-started/
- Headscale - Registration methods — https://headscale.net/stable/ref/registration/
- Headscale su GitHub — https://github.com/juanfont/headscale
