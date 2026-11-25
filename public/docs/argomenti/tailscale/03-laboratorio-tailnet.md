Un laboratorio con Tailscale si fa in mezz'ora, senza macchine enormi: bastano tre piccole VM Linux o container con rete host, un nome di dominio per i certificati e un account con un tailnet. L'obiettivo è costruire un tailnet realistico con tre ruoli: una workstation che consuma i servizi, un nodo che fa da subnet router per una rete isolata e un nodo che fa da exit node. Chiudi il laboratorio con una policy che limita l'accesso e verifica con i comandi di diagnosi visti nelle lezioni precedenti.

Tutti i comandi sono quelli della documentazione ufficiale e presuppongono il client installato con le istruzioni per la propria distribuzione. Sostituisci nomi e indirizzi di esempio con i tuoi: `ws` per la workstation, `router` per il subnet router, `exit` per l'exit node, `192.0.2.0/24` per la rete "sanbox" a valle del router.

## Obiettivi

- Installare il client su tre nodi e portarli nello stesso tailnet.
- Annunciare e approvare le route di un subnet router, verificando la raggiungibilità.
- Configurare un exit node e una policy che ne consenta l'uso solo a un gruppo.
- Pubblicare un servizio interno con Serve e controllarne la risposta HTTP.
- Racchiudere il tutto in una checklist di verifica ripetibile.

## Contratto del laboratorio

| Nodo | Ruolo | Indirizzo atteso | Verifica |
| --- | --- | --- | --- |
| `ws` | client consumatore | 100.64.0.0/10 | `tailscale status` senza errori |
| `router` | subnet router | 100.x + 192.0.2.0/24 | `tailscale status` mostra le route approvate |
| `exit` | exit node | 100.x | `tailscale set --exit-node=...` applicato |
| `svc` | host con servizio HTTP su 8080 | 100.x | `curl https://svc.<tailnet>.ts.net` risponde |

La policy finale deve permettere a `ws` di raggiungere la rete 192.0.2.0/24 e l'internet, di usare SSH su `router` e di non vedere nulla d'altro. La prova del contratto è una sequenza di comandi che, eseguita da capo, deve produrre gli stessi esiti.

## Costruzione del tailnet

Comincia dai tre nodi, ognuno con il proprio login. Per evitare sessioni interattive multiple usa auth key pre-generate dalla console e con scadenza breve, una per nodo.

```bash
# su router: inoltro IP e annuncio della rete isolata
sudo echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf
sudo tailscale up --advertise-routes=192.0.2.0/24 --hostname router

# su exit: annuncio come exit node
sudo tailscale up --advertise-exit-node --hostname exit

# su ws: accettare le route e scegliere l'exit node
sudo tailscale up --accept-routes --hostname ws
sudo tailscale set --exit-node=100.101.102.103
```

In console, nella pagina Machines, approva le route del router e l'exit node. Senza questa approvazione l'annuncio non ha effetto e `tailscale status` sul client mostra le route in attesa. Da `ws` prova a raggiungere un host in 192.0.2.0/24, che non ha il client installato: se non risponde, controlla in ordine inoltro IP, route approvate e policy.

```json
// policy del laboratorio: grants espliciti, deny-by-default
{
  "tagOwners": {
    "tag:infra": ["autogroup:admin"]
  },
  "groups": {
    "group:lab": ["alice@example.com"]
  },
  "grants": [
    {
      "src": ["group:lab"],
      "dst": ["tag:infra", "192.0.2.0/24"],
      "ip": ["*"]
    },
    {
      "src": ["group:lab"],
      "dst": ["autogroup:internet"],
      "ip": ["*"]
    }
  ],
  "autoApprovers": {
    "routes": {
      "192.0.2.0/24": ["group:lab"]
    }
  }
}
```

Con questa policy il gruppo `lab` vede la rete e può usare un exit node, e le route di `tag:infra` vengono approvate da sole in futuro. Per la parte servizi, su `svc` pubblica la porta 8080 con Serve, che richiede di aver abilitato HTTPS per il tailnet.

```bash
# su svc: abilitare i certificati HTTPS e servire la porta locale
tailscale cert svc.<tailnet>.ts.net
tailscale serve --bg 8080
tailscale serve status

# da ws: la richiesta passa dalla rete overlay cifrata
curl -sS https://svc.<tailnet>.ts.net | head -n 5
tailscale status | grep -E "svc|router|exit"
```

## Esercizi

1. Aggiungi un tag `tag:infra` ai nodi `router` ed `exit` e riscrivi la policy in modo che nessun altro membro possa usarli.
2. La rete a valle di `router` passa da 192.0.2.0/24 a 198.51.100.0/24: elenca tutti i punti da toccare, console compresa.
3. Fai un test A/B di latenza con e senza exit node verso lo stesso servizio pubblico: cosa cambia e perché?
4. Blocca UDP sul firewall di `ws` e verifica con `netcheck` e `status` l'effetto sui percorsi.
5. Sostituisci il grants con regole ACL equivalenti su ip:porta, mantenendo lo stesso comportamento.
6. Scrivere un `tailscale status --json | jq` che elenchi solo i peer su relay con la loro città.

<details>
<summary>Soluzione</summary>

1. Si applica il tag al momento del login o con `tailscale set --advertise-tags=tag:infra` sul nodo, dopo aver dichiarato il tag in `tagOwners` come "infra" gestito da `autogroup:admin`. Nella policy si sostituiscono i destinatari per IP con `tag:infra`, e si aggiunge la regola SSH solo per il gruppo che deve gestirli. Un nodo tagged non ha un utente proprietario: per raggiungerlo la regola deve usare il tag come destinazione, e per SSH `users` deve indicare utenti esistenti sull'host.

2. Sul nodo `router` si annuncia la nuova rete con `sudo tailscale set --advertise-routes=198.51.100.0/24`; in console si approva la nuova route e si toglie l'approvazione a quella vecchia; nella policy si aggiorna il `dst` del grant e la chiave dentro `autoApprovers.routes`; sui client Linux si esegue `tailscale set --accept-routes` se non era già attivo. La route vecchia resterebbe visibile come "Available" ma non approvata, senza traffico.

3. Con l'exit node attivo la latenza verso internet aumenta del tempo di andata e ritorno fino al nodo e di nuovo verso la destinazione; senza exit node il client esce dalla propria rete. Misura con `time curl -o /dev/null -s -w '%{time_total}\n' https://example.com` e ripeti tre volte per ogni configurazione.

4. Con UDP bloccato in uscita, `netcheck` marca `UDP: false` e quasi tutte le connessioni passano in relè: `status` mostra `relay` e le prestazioni calano. Il rimedio è permettere UDP verso la porta 41641 dei peer, oppure accettare il relè per i soli casi di emergenza.

5. L'ACL equivalente diventa `{"acls": [{"action": "accept", "src": ["group:lab"], "dst": ["tag:infra:22", "192.0.2.0/24:*"]}]}`, con una porta per destinazione; per l'internet serve la sintassi `autogroup:internet:*`. I grants restano comunque la forma raccomandata perché non richiedono di enumerare le porte.

6. `tailscale status --json | jq -r '.Peer | to_entries[] | select(.value.Relay != "") | "\(.value.DNSName) \(.value.Relay)"'` seleziona i peer con campo `Relay` valorizzato e stampa nome e relè, filtrando i diretti e gli inattivi.

</details>

## Errori comuni

- **Provare le route prima dell'approvazione**: la pagina Machines elenca la route come "Available" finché un admin non la approva; nessun comando lato client può accelerare questo passaggio.
- **Usare la stessa auth key per tutti i nodi**: la chiave pre-autenticata è a uso singolo per default; riusarla produce errori di registrazione e rende impossibile la revoca mirata.
- **Tagliare fuori il proprio accesso SSH**: dopo aver cambiato policy verificare sempre la regola SSH prima di chiudere la sessione, perché la revoca interrompe anche le connessioni già aperte.
- **Aprire Serve su una porta già usata da Funnel**: il comando sovrascrive la configurazione della porta; serve `tailscale serve reset` o usare porte diverse.
- **Ignorare lo stato del nodo di servizio**: se `svc` è in `idle` da giorni, la chiave potrebbe essere scaduta; controlla lo stato della chiave in console prima di indagare sulla policy.

## In sintesi

Il laboratorio ripete la catena completa: nodi nel tailnet, route annunciate e approvate, exit node consentito da un grant verso `autogroup:internet`, servizio interno pubblicato con Serve. La policy con gruppi e `autoApprovers` rende il tutto ripetibile e mostra perché deny-by-default cambia il modo di progettare gli accessi. Le verifiche con `status`, `netcheck` e `curl` chiudono il ciclo e preparano la diagnosi dei casi reali.

## Fonti

- Tailscale - Quickstart — https://tailscale.com/docs/how-to/quickstart
- Tailscale - Subnet routers — https://tailscale.com/docs/features/subnet-routers
- Tailscale - Exit nodes — https://tailscale.com/docs/features/exit-nodes
- Tailscale - Tailscale Serve — https://tailscale.com/docs/features/tailscale-serve
