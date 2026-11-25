NetBird senza controllo degli accessi è una rete dove tutti parlano con tutti: la policy `Default` creata con l'account autorizza ogni peer verso ogni protocollo, compreso `ALL`. Il vero lavoro amministrativo inizia quando separi i gruppi, definisci policy direzionali, introduci setup key per il rilascio automatico dei server e decidi dove girare il piano di controllo. Questa lezione copre access control, setup key, self-hosting e il confronto con Tailscale e Headscale.

## Obiettivi

- Definire gruppi e policy con sorgente, destinazione, protocollo, porte e direzione.
- Usare setup key e auto-grouping per registrare le macchine senza intervento manuale.
- Installare un piano di controllo self-hosted con dominio, TLS e porte 443 e 3478.
- Verificare connettività e leggere gli esiti `P2P` e `Relayed`.
- Scegliere tra NetBird Cloud, NetBird self-hosted, Tailscale e Headscale.

## Gruppi e policy

Una policy mette in relazione due gruppi e indica cosa possono fare. NetBird consente solo regole di autorizzazione: non esiste una regola di negazione esplicita, e ciò che non è autorizzato resta bloccato, quindi non c'è ordine di priorità tra policy. Il gruppo `All` contiene ogni peer e non si modifica; le policy nuove non hanno effetto finché il `Default` non viene rimosso.

| Elemento | Valori | Nota |
| --- | --- | --- |
| Sorgente | uno o più gruppi | chi inizia la connessione |
| Destinazione | uno o più gruppi | chi la riceve |
| Protocollo | `ALL`, `TCP`, `UDP`, `ICMP` | con eventuali porte |
| Porte | singole o intervalli `8000-9000` | supportati da v0.48 |
| Direzione | bidirezionale o unidirezionale | onorata dal data plane |
| Posture check | predefiniti o personalizzati | esempio: versione OS, endpoint MDM |

Il pattern Zero Trust è la policy unidirezionale: gli utenti raggiungono i server solo sui protocolli necessari, mentre i server non possono iniziare connessioni verso le workstation. Se due gruppi devono comunicare in entrambe le direzioni, usa una policy bidirezionale oppure due regole speculari, senza allargare il perimetro a gruppi che contengono tutto.

```text
policy: utenti -> applicativi
  source:      group:utenti
  destination: group:app-prod
  protocol:    TCP, porte 443, 8000-8100
  direction:   unidirectional
  posture:     checks: [versione sistema, disco cifrato]
```

A livello di client, l'effetto si verifica in `netbird status -d`: se un peer è `Idle` o non compare nell'elenco dei peer autorizzati, il problema è quasi sempre nella policy e non nel tunnel.

## Setup key e auto-grouping

Le setup key evitano il flusso SSO su server e container, che non hanno un browser: si creano nel pannello, hanno una scadenza e possono essere a uso singolo o riutilizzabili, e possono assegnare automaticamente i peer a uno o più gruppi. È il modo corretto per registrare centinaia di macchine senza condividere un account umano.

```bash
# registrazione automatica di un server con gruppo assegnato dalla chiave
sudo netbird up --setup-key "$NB_SETUP_KEY" --management-url https://api.example.com:443

# macchina headless: codice QR invece del browser
netbird login --qr --management-url https://api.example.com:443

# verifica dei gruppi e dello stato
netbird status --json | grep -E '"status"|"groups"'
```

Usa una chiave per ambiente, ruota quella scaduta e revoca quella sospetta, invece di riassegnare la stessa. Se il peer non appartiene a nessun gruppo, anche una policy perfetta non lo rende raggiungibile: controlla i gruppi assegnati prima di aprire ticket sul tunnel.

## Self-hosting e confronto

Il piano di controllo si può installare su una VM Linux con un dominio pubblico e Docker: lo script di avvio chiede il tipo di reverse proxy (Traefik integrato, Traefik esterno, Nginx, Nginx Proxy Manager o Caddy) e genera i container di management, signal, relay, STUN, dashboard e, se vuoi, un proxy che espone servizi interni. Requisiti minimi della guida: almeno 1 CPU, 2 GB di memoria, TCP 443 e UDP 3478 pubblici.

```bash
# installazione di una versione self-hosted con Docker
curl -fsSL https://github.com/netbirdio/netbird/releases/latest/download/getting-started.sh | bash
docker compose ps          # management, signal, relay, dashboard, proxy

# client puntato al piano di controllo locale
netbird up --management-url https://netbird.example.com:443 --setup-key <chiave>
```

Un'istanza self-hosted espone la pagina `/setup` solo finché non esiste un utente: il primo utente creato diventa owner. Gli utenti successivi possono essere locali (Dex integrato) o arrivare da un identity provider esterno con SSO. Sulla rete, il firewall perimetrale non richiede porte in ingresso per i client: aprono in uscita verso management, signal e relay.

| Soluzione | Piano di controllo | Open source | Adatta quando |
| --- | --- | --- | --- |
| NetBird Cloud | gestito da NetBird | sì, il server è disponibile su GitHub | vuoi zero manutenzione |
| NetBird self-hosted | tuo | sì | dati e identità restano tuoi |
| Tailscale | gestito da Tailscale | client sì, server no | vuoi un prodotto molto curato e poco configurazione |
| Headscale | tuo, reimplementazione open source | sì, progetto della community | hai un parco Tailscale e vuoi il controllo del server |

Tailscale e NetBird condividono il modello mesh con WireGuard e il focus sull'identità; NetBird espone più esplicitamente un'architettura a quattro servizi e permette di gestire gruppi, posture e relay nel proprio dominio. Headscale non è un fork ufficiale di Tailscale: è un'implementazione indipendente del protocollo lato server, utile quando serve un piano di controllo aperto senza rinunciare ai client Tailscale. In tutti i casi il data plane resta WireGuard punto-punto, e la differenza sta in chi gestisce identità, registrazione delle macchine e policy.

## Errori comuni

- **Creare policy senza togliere `Default`** — il default autorizza tutto e le regole nuove non cambiano il comportamento finché resta attivo.
- **Mettere lo stesso gruppo come sorgente e destinazione per "sicurezza"** — una policy così autorizza i peer a parlarsi fra loro senza limiti di protocollo, che di solito è l'opposto dell'intento Zero Trust.
- **Condividere una setup key tra ambienti** — una registrazione indesiderata non si distingue più da un server legittimo, e i gruppi ereditati rendono difficile la revoca.
- **Self-hosted senza dominio pubblico** — i client hanno bisogno di un endpoint HTTPS valido per il management; un indirizzo IP nudo non basta.
- **Confrontare `Relayed` con un guasto** — la connessione relè è prevista quando il NAT è simmetrico; se vuoi `P2P`, cambia la configurazione NAT o il firewall, non la policy.

## In sintesi

Il controllo accessi di NetBird si riduce a gruppi e policy esplicite: senza regole coerenti il traffico non passa e le politiche direzionali sono il pattern predefinito. Le setup key distribuiscono identità e gruppi alle macchine non umane. Il self-hosting richiede dominio e TLS ma mantiene dati e identità in casa. NetBird e Tailscale sono parenti stretti per modello mesh, mentre Headscale è la reimplementazione open del server.

## Fonti

- NetBird - Managing Access with Groups and Access Policies — https://docs.netbird.io/manage/access-control/manage-network-access
- NetBird - Self-Hosting Quickstart Guide — https://docs.netbird.io/selfhosted/selfhosted-quickstart
- NetBird - Register Machines Using Setup Keys — https://docs.netbird.io/manage/peers/register-machines-using-setup-keys
- NetBird - NetBird vs. Traditional VPN — https://docs.netbird.io/about-netbird/netbird-vs-traditional-vpn
- Headscale - Open source implementation of the Tailscale control server — https://github.com/juanfont/headscale
