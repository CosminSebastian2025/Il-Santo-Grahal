Con il tailnet attivo, la domanda che conta diventa: come si controlla cosa può attraversarlo e come si estende ad apparecchiature che non possono installare il client? Tailscale risponde con il tailnet policy file, un file huJSON scritto nella console che definisce ACL, grants, tag e regole SSH, e con tre ruoli di nodo: subnet router, exit node e host che espongono servizi con Serve o Funnel. In questa lezione percorri questi strumenti nell'ordine in cui li useresti in produzione: permessi, routing, servizi minimi, ed esercizi di diagnosi.

Un dettaglio da tenere sempre a mente: Tailscale non tocca file di sistema come `/etc/ssh/sshd_config`. Tutti i controlli vivono nel piano di controllo e vengono replicati localmente, così modificarli o revocarli è immediato: un cambio di policy arriva in pochi secondi ai client e può interrompere sessioni già aperte.

## Obiettivi

- Scrivere una policy con gruppi, grants e tag, sapendo che il default è negare quando la sezione esiste.
- Configurare un subnet router Linux e un exit node con il doppio opt-in.
- Esporre un servizio locale con Serve e distinguerlo da Funnel, che lo pubblica su internet.
- Attivare Tailscale SSH con check mode per le connessioni ad alto rischio.
- Diagnosticare un percorso in relè e distinguere un problema di rete da un errore di policy.

## Policy: ACL, grants e tag

Il policy file segue la sintassi huJSON, che accetta commenti e virgole finali. Le ACL sono regole a livello di rete con sorgente e destinazione nel formato `ip:porta`; i grants sono la forma più recente, pensata per esprimere lo stesso permesso con `src`, `dst` e `ip`. Quando la sezione `acls` o `grants` è assente, Tailscale applica il default allow all; quando esiste, vale il deny-by-default, e una regola vieta tutto ciò che non è esplicitamente concesso.

Le policy sono direzionali e applicate localmente: consentire ad A di raggiungere B non abilita il contrario. Tag e `tagOwners` servono a distinguere dispositivi di servizio da quelli personali, e un nodo tagged non ha un proprietario umano, quindi la sua chiave non scade.

| Meccanismo | Sintassi tipica | Uso |
| --- | --- | --- |
| `acls` | `src`, `dst` con porta | rete classica, compatibile all'indietro |
| `grants` | `src`, `dst`, `ip` | forma raccomandata |
| `groups` | elenco di email | gruppi di persone |
| `tagOwners` | tag verso gruppi | gestione dei nodi tagged |
| `autoApprovers` | route verso tag | approvazione automatica di subnet e exit node |
| `ssh` | `action`, `src`, `dst`, `users` | Tailscale SSH |

```json
// grants con tag: i server di produzione sono raggiungibili
// solo dagli amministratori, sulla porta 22, e solo in check mode
{
  "tagOwners": {
    "tag:prod": ["autogroup:admin"]
  },
  "grants": [
    {
      "src": ["group:sre"],
      "dst": ["tag:prod"],
      "ip": ["22"]
    }
  ],
  "groups": {
    "group:sre": ["alice@example.com", "bob@example.com"]
  }
}
```

Per verificare prima di salvare, la console propone una pagina di test che valuta le regole in modo statico. Ogni errore di accesso inatteso, in pratica, è quasi sempre un destinazione sbagliata, una porta mancante o una regola di check che prevale su una di accept.

## Subnet router ed exit node

Un subnet router estende l'overlay a una rete dove Tailscale non gira, per esempio una VLAN di stampanti o un VPC: il nodo annuncia una route e fa da gateway. Il doppio opt-in è obbligatorio, prima l'annuncio del nodo e poi l'approvazione di un amministratore dalla pagina Machines o tramite `autoApprovers`. Di default il subnet router applica SNAT, quindi il server finale vede l'IP del router.

```bash
# 1. abilitare l'inoltro IP (Linux)
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf

# 2. annunciare le route (poi approvarle in console o via autoApprovers)
sudo tailscale set --advertise-routes=192.0.2.0/24

# 3. sul client che deve consumare le route (opt-in su Linux)
sudo tailscale set --accept-routes
```

Un exit node instrada tutto il traffico internet di chi lo usa: si annuncia con `--advertise-exit-node`, si approva in console e si seleziona con `--exit-node=<ip>`. La policy deve contenere un grant verso `autogroup:internet`: senza di esso l'uso dell'exit node viene negato anche se il nodo è raggiungibile. Da notare che il client non vede più la propria LAN, a meno di `--exit-node-allow-lan-access`.

```bash
# nodo exit: annuncio e (dopo approvazione) uso
sudo tailscale set --advertise-exit-node
sudo tailscale set --exit-node=100.101.102.103

# Serve: pubblica una porta locale solo dentro il tailnet
tailscale serve --bg 3000
tailscale serve status

# Funnel: la stessa porta diventa pubblica su internet (solo 443, 8443, 10000)
tailscale funnel 3000
```

Serve inoltra una porta locale su `https://host.tailnet.ts.net` e richiede certificati HTTPS validi; aggiunge header come `Tailscale-User-Login` per il servizio a valle. Funnel usa relay dedicati e solo il dominio ts.net, è in beta e l'accesso è regolato dall'attributo `funnel` nella policy. La stessa porta non può essere contemporaneamente privata con Serve e pubblica con Funnel: l'ultimo comando vince. Tailscale SSH, attivato con `tailscale set --ssh`, intercetta la porta 22 del solo indirizzo Tailscale e autentica con le chiavi dei nodi.

## Diagnostica e limiti di rete

Quando la connessione è lenta, il sospetto è un percorso in relè. `tailscale status` mostra `relay <città>` invece di `direct`, e `tailscale ping` dice quale percorso è stato usato e se ne esiste uno diretto. `netcheck` spiega perché il direct non si stabilisce: NAT difficile, UDP bloccato, assenza di port mapping. Per un percorso punto-punto conviene aprire in modo mirato la porta UDP del peer (di default 41641) sul firewall.

```bash
tailscale status               # direct, relay o idle per ogni peer
tailscale ping db.internal      # percorso scelto e latenza
tailscale netcheck              # UDP, NAT, DERP più vicino
tailscale whois 100.101.102.103 # utente, tag e route del peer
tailscale status --json | jq '.Peer | to_entries[] | {k: .key, relay: .value.Relay}'
```

Un ulteriore livello di tessitura è Peer Relay, che lascia che un device del tailnet funga da relay al posto di DERP: si abilita con `--relay-server-port`. Per ambienti distribuiti esistono anche DERP personalizzati, che sostituiscono o affiancano i relay Tailscale; conviene sceglierli solo quando si ha bisogno di deterministico controllo del percorso.

## Errori comuni

- **Dimenticare l'approvazione delle route**: l'annuncio di un subnet router o di un exit node senza approvazione resta inattivo, e in `tailscale status` la route compare ma non funziona.
- **Permettere la connessione al device ma non all'internet**: un grant verso l'IP dell'exit node abilita solo l'accesso al nodo, non l'uso come gateway; serve `autogroup:internet`.
- **Esporre con Funnel ciò che doveva restare interno**: Serve e Funnel configurano la stessa porta, e l'ultimo comando determina se il servizio è privato o pubblico.
- **Assumere che le ACL siano bidirezionali**: una regola da A verso B non consente a B di tornare verso A; la risposta segue la connessione TCP, la nuova connessione no.
- **Diagnosticare con `ping` normale**: se `tailscale ping` funziona e `ping` fallisce, il problema è DNS o OSI, non l'overlay; inversamente, `ping` senza output non dice nulla sul tipo di percorso.

## In sintesi

Il policy file è il cuore del controllo di accesso: deny-by-default, direzionale e applicato sui client. Subnet router ed exit node estendono la rete, con doppio opt-in e regole di accesso. Serve e Funnel espongono servizi locali, uno dentro il tailnet e l'altro verso internet, mentre Tailscale SSH sposta l'autenticazione delle sessioni sulla policy. La diagnosi si fa leggendo `status`, `netcheck` e `ping` insieme a `whois`, che svela quali regole ha il peer.

## Fonti

- Tailscale - Manage permissions using ACLs — https://tailscale.com/docs/features/access-control/acls
- Tailscale - Subnet routers — https://tailscale.com/docs/features/subnet-routers
- Tailscale - Exit nodes — https://tailscale.com/docs/features/exit-nodes
- Tailscale - Tailscale SSH — https://tailscale.com/docs/features/tailscale-ssh
- Tailscale - Tailscale Serve — https://tailscale.com/docs/features/tailscale-serve
