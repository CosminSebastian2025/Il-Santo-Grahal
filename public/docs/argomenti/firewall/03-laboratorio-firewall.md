In questo laboratorio costruisci il firewall di un server web immaginario, `lab-web-01`, su una VM Linux: parte con tutto aperto, applica un ruleset nftables con default deny, verifica ogni regola con `nmap` e `curl`, riduce la superficie di exposure e misura la tabella `conntrack` sotto carico. Il criterio di successo non è "la regola c'è", ma "so dimostrare, comando alla mano, che ciò che deve passare passa e ciò che non deve viene scartato".

## Obiettivi

- Applicare un ruleset nftables in modo atomico, con rollback automatico in caso di errore.
- Verificare dall'esterno porta per porta con `nmap` e distinguere `filtered` da `closed`.
- Usare `nft monitor trace` per seguire una singola connessione nelle regole.
- Configurare rate limit e allowlist su SSH senza chiudersi fuori.
- Controllare l'occupazione e i timeout di `conntrack` con un carico di prova.

## Setup e regola zero

La macchina ha un servizio web su 80/443, un database su 5432 raggiungibile solo da `10.20.0.0/24`, e un demone SSH sulla 22. Prima di toccare il firewall apri una seconda sessione SSH (o una console del provider): è la tua rete di sicurezza.

```bash
# Ubuntu 24.04: verifica versione e stato
nft --version            # nftables 1.x
systemctl status nftables.service --no-pager

# Salva il ruleset attuale: punto di ripristino
sudo nft list ruleset | sudo tee /root/nft-prima.txt

# Servizi in ascolto prima di iniziare
ss -tlnp
```

| Porta | Servizio | Sorgente ammessa | Azione |
| --- | --- | --- | --- |
| 22/tcp | SSH | `10.20.0.0/24` | accept, rate limit fuori allowlist |
| 80/tcp | HTTP | chiunque | accept, redirect a 443 lato web server |
| 443/tcp | HTTPS | chiunque | accept |
| 5432/tcp | PostgreSQL | `10.20.0.0/24` | accept |
| altro | — | — | drop con log |

## Applicare il ruleset con rollback

Si scrive il file versionato, si controlla la sintassi con `nft -c`, si applica con un timer di rollback. La strategia classica: il comando programma `nft flush ruleset` fra due minuti; se la sessione regge, si cancella il job.

```bash
sudo nft -c -f /etc/nftables.conf || { echo "sintassi errata"; exit 1; }
sudo systemd-run --on-active=120 --unit=nft-rollback \
  /usr/sbin/nft flush ruleset
sudo nft -f /etc/nftables.conf
# se tutto funziona, annulla il rollback
sudo systemctl stop nft-rollback.timer nft-rollback.service 2>/dev/null
```

Il file `/etc/nftables.conf` riprende il ruleset della lezione precedente con le porte del lab: `22` con allowlist, `80` e `443` aperti, `5432` solo dalla rete admin, `ct state established,related accept` in testa, `policy drop` su input e forward.

```nft
table inet filtro {
  set admin_rete { type ipv4_addr; flags interval; elements = { 10.20.0.0/24 } }
  chain input {
    type filter hook input priority filter; policy drop;
    ct state established,related accept
    ct state invalid log prefix "invalid " drop
    iifname "lo" accept
    icmp type echo-request limit rate 5/second accept
    ip saddr @admin_rete tcp dport { 22, 5432 } accept
    tcp dport { 80, 443 } accept
  }
  chain forward { type filter hook forward priority filter; policy drop; }
}
```

## Verifica dall'esterno

`nmap` distingue tre esiti: `open` (connessione completata), `closed` (RST, porta raggiunta ma nessun servizio) e `filtered` (nessuna risposta, quindi un `drop`). La differenza è la prova che il firewall sta lavorando e non che il servizio è spento.

```bash
nmap -Pn -p 22,80,443,5432 203.0.113.10
# Atteso dall'esterno: 80 e 443 open, 22 e 5432 filtered

curl -s -o /dev/null -w "%{http_code}\n" https://203.0.113.10/
nc -z -w 3 203.0.113.10 5432 && echo "raggiungibile" || echo "bloccata"
```

Per capire quale regola decide, si traccia un pacchetto specifico: `nft monitor trace` mostra ogni regola attraversata, e un `meta nftrace set 1` applicato a una regola di test limita il rumore.

```bash
sudo nft add rule inet filtro input ip saddr 198.51.100.7 meta nftrace set 1
sudo nft monitor trace   # in un'altra shell: nc -z -w 2 203.0.113.10 5432
```

L'output elenca la catena, l'handle e la sentenza per ogni passo: è la lettura che serve quando "il traffico non passa e la regola sembra giusta".

## Rate limit e conntrack sotto carico

Il rate limit su SSH si applica a chi non è nella allowlist. Una catena dedicata con `limit rate 6/minute burst 4` e `counter drop` rende il blocco visibile nelle statistiche con `nft list ruleset -a`. Poi si misurano i timeout delle connessioni: aprire 200 connessioni TCP brevi verso la 443 e osservare la tabella.

```bash
# carico di prova: 200 connessioni in parallelo
seq 200 | xargs -P 50 -I{} curl -s -o /dev/null http://203.0.113.10/
sudo conntrack -C; cat /proc/sys/net/netfilter/nf_conntrack_count; \
  cat /proc/sys/net/netfilter/nf_conntrack_max
```

Se il valore di `nf_conntrack_count` sale verso il massimo, la soluzione non è alzare il limite ma ridurre i timeout `nf_conntrack_tcp_timeout_time_wait` e `nf_conntrack_generic_timeout` entro valori ragionevoli, oppure spostare il servizio dietro un load balancer che termina le connessioni.

## Errori comuni

- **Applicare il ruleset senza rollback programmato**: una svista sul `policy drop` chiude la sessione SSH e serve una console fisica.
- **Fermarsi a `nft list ruleset` come prova**: la verifica va fatta dall'esterno con `nmap`, perché il traffico locale non attraversa l'hook di input come quello remoto.
- **Confondere `closed` e `filtered`**: un servizio spento sembra funzionare bene come un firewall, e non lo è.
- **Alzare `nf_conntrack_max` per primi**: sposta il problema e consuma più memoria senza toccare la causa.
- **Rate limit che colpisce la allowlist**: il test di accesso legittimo fallisce e il team disattiva il controllo.
- **Non salvare il ruleset prima delle modifiche**: senza punto di partenza, il rollback diventa una ricostruzione a memoria.

## Verifica finale

Il laboratorio è concluso quando si dimostrano i cinque punti: `nmap` mostra solo 80 e 443 aperti dall'esterno; da `10.20.0.0/24` funzionano 22 e 5432; `nft monitor trace` mostra lo scarto di una connessione non autorizzata; il counter della catena di rate limit cresce con un burst di tentativi; `nf_conntrack_count` resta sotto il 50% del massimo durante il carico. Solo allora il ruleset va committato nel repository e caricato all'avvio.

## In sintesi

Il firewall si valida dall'esterno, si applica con rollback e si diagnostica con trace. La allowlist su SSH e il rate limit sono due controlli diversi che non vanno confusi. La tabella di connection tracking è la risorsa che si esaurisce per prima: va misurata e regolata con i timeout, non semplicemente alzata.

## Fonti

- [nftables Wiki - Upgrading from iptables](https://wiki.nftables.org/wiki-nftables/index.php/Moving_from_iptables_to_nftables)
- [nftables Wiki](https://wiki.nftables.org/wiki-nftables/index.php/Main_Page)
- [netfilter - documentazione](https://www.netfilter.org/documentation/)
- [Nmap Reference Guide](https://nmap.org/book/man.html)
