Una regola che scrivi in fretta è una regola che nessuno riuscirà a diagnosticare sei mesi dopo: il traffico non passa, oppure passa troppo, e l'unica speranza è leggere la catena netfilter o i log di connessione. In questa lezione impari a progettare catene nftables con default deny, a gestire la tabella delle connessioni, a usare insiemi nominati e a registrare le decisioni senza sommergere i log. Gli stessi concetti tornano sui security group cloud, dove il default è già chiuso ma l'ordine e la visibilità delle regole restano il problema.

## Obiettivi

- Scrivere un set nftables completo per un server esposto solo su 22 e 443.
- Gestire casi limite del connection tracking: conntrack pieno, frammenti, `invalid`, protocolli senza porte.
- Usare set e map nftables per policy leggibili e aggiornabili senza riscrivere il ruleset.
- Distinguere health check, allowlist, log e sicurezza applicativa nel perimetro cloud.

## Il ruleset come documento versionato

Il ruleset va trattato come codice: un file in repository, applicato in modo atomico con `nft -f`, con un test di rollback se il comando fallisce. Su Debian e Ubuntu si installa `nftables` e si carica all'avvio il file `/etc/nftables.conf`; la vecchia `iptables` è solo un front-end che traduce verso netfilter, e `iptables-nft` continua a funzionare per compatibilità.

```nft
#!/usr/sbin/nft -f
flush ruleset

table inet filtro {
  set admin_rete { type ipv4_addr; flags interval; elements = { 10.20.0.0/24, 10.30.5.10 } }
  map port_settore { type inet_service : string; elements = { 5432 : "db", 6379 : "cache" } }

  chain input {
    type filter hook input priority filter; policy drop;
    ct state established,related accept
    ct state invalid log prefix "nft invalid: " level info drop
    iifname "lo" accept
    icmp type { echo-request, destination-unreachable } limit rate 5/second accept
    tcp dport 22 ip saddr @admin_rete accept
    tcp dport 443 accept
  }

  chain forward { type filter hook forward priority filter; policy drop; }
  chain output  { type filter hook output  priority filter; policy accept; }
}
```

Le scelte da notare: `flush ruleset` in testa rende il file autosufficiente e idempotente; `ct state invalid` viene registrato e scartato prima delle regole di servizio, altrimenti pacchetti fuori sequenza arrivano al demone SSH; il limite di rate su SSH non si mette sulla stessa regola che autorizza la rete admin: va posto in una catena separata o su una regola che intercetta tentativi fuori dall'allowlist, perché `limit` dentro un `accept` non riduce nulla; `policy drop` su `forward` impedisce al server di diventare un router inatteso.

| Hook | Quando scatta | Tipico contenuto |
| --- | --- | --- |
| `input` | pacchetti destinati all'host | servizi esposti, loopback, ICMP diagnostico |
| `forward` | pacchetti da inoltrare | su host non router: `drop` |
| `output` | pacchetti generati dall'host | di norma accept, con filtri per esfiltrazione |
| `prerouting` / `postrouting` | prima/dopo il routing | NAT, mark, limiti globali |

## Connection tracking: dove si rompe

`conntrack` crea una voce per ogni flusso nuovo e la tiene per il timeout del protocollo. La tabella ha una dimensione massima, `nf_conntrack_max`, e se si riempie il kernel scarta i nuovi flussi: web server con molte connessioni brevi possono saturarla. Il sintomo è tipico: servizi sani ma connessioni rifiutate a caso. Si monitora con `conntrack -C` contro `nf_conntrack_count`.

```bash
# Quante voci sono in uso e qual è il limite
cat /proc/sys/net/netfilter/nf_conntrack_count
cat /proc/sys/net/netfilter/nf_conntrack_max

# Flussi attivi verso una porta, per capire chi occupa la tabella
conntrack -L -p tcp --dport 443 2>/dev/null | head -20

# Verifica a mano che una regola blocchi davvero un servizio
nft list ruleset | grep -n "dport 5432"
ss -tlnp | grep 5432
```

Altri due casi ricorrenti sono i frammenti IP e UDP: i frammenti non contengono le porte e vengono riassemblati o scartati in base a `nf_defrag_ipv4`, quindi una regola che filtra per porta UDP può comportarsi in modo diverso per datagrammi grandi. Con `policy drop` conviene ammettere solo i protocolli che servono e non fidarsi mai della sola assenza di regole.

## Policy leggibile: set, map, commenti

Le regole con commenti non sono decorative: `nft -a list ruleset` mostra gli handle e i commenti associati, così una richiesta di apertura porta cita una regola precisa. I set nominati eliminano la duplicazione e permettono di aggiornare una lista di IP con `nft add element` senza ricaricare tutto.

```nft
set backup_target { type ipv4_addr; elements = { 10.40.2.8 } }
add rule inet filtro output ip daddr @backup_target tcp dport 22 comment "backup notturno"
```

Sui cloud il modello è lo stesso ma con nomi diversi: i security group sono stateful e permettono solo `allow`, il default è "nega il resto", le regole non hanno ordine di precedenza e sono valutate come permessi cumulativi; le network ACL sono stateless e vanno scritte in entrambe le direzioni. Su Kubernetes le NetworkPolicy applicano lo stesso default deny, ma solo se il CNI le supporta.

```yaml
# NetworkPolicy equivalente: solo il namespace "frontend" raggiunge gli ordini sulla 8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api-ordini, namespace: ordini }
spec:
  podSelector: { matchLabels: { app: ordini-api } }
  policyTypes: [Ingress]
  ingress:
    - from: [{ namespaceSelector: { matchLabels: { name: frontend } } }]
      ports: [{ protocol: TCP, port: 8080 }]
```

## Log, metriche e revisione

Ogni scarto inatteso è un dato. Un firewall ben gestito registra con prefissi distinguibili, inoltra verso il SIEM e definisce un periodo di conservazione coerente con gli obblighi di legge. Le regole che non generano traffico da novanta giorni sono candidate alla rimozione: è la manutenzione che mantiene la policy vera, perché il rischio maggiore non è la regola sbagliata ma quelle dimenticata.

## Errori comuni

- **Una regola `accept` prima di `ct state invalid`**: pacchetti anomali raggiungono i servizi e i log di applicazione si riempiono di più connessioni rotte.
- **Modificare a mano il ruleset in produzione**: alla successiva ricarica del file versionato le modifiche spariscono e nessuno se ne accorge.
- **Aprire 5432 per diagnosticare "solo dieci minuti"**: la regola temporanea diventa permanente e il database è esposto.
- **Ignorare `nf_conntrack_count`**: un picco di traffico satura la tabella e i servizi diventano indisponibili senza errore abbastanza chiaro.
- **Confondere security group e network ACL nel cloud**: la prima è stateful, la seconda no, e le risposte vanno ammesse esplicitamente.

## In sintesi

Un ruleset nftables è composto da poche scelte: default deny, stato delle connessioni, limiti di rate e un set nominato per ogni gruppo di sorgenti. La tabella `conntrack` è la risorsa che si esaurisce per prima e va monitorata come la memoria. Nel cloud si applica lo stesso ragionamento con stateful security group e network ACL stateless: ciò che cambia sono i nomi, non il modello di decisione.

## Fonti

- [nftables Wiki](https://wiki.nftables.org/wiki-nftables/index.php/Main_Page)
- [netfilter - documentazione](https://www.netfilter.org/documentation/)
- [Kubernetes - Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [NIST SP 800-41r1 - Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final)
