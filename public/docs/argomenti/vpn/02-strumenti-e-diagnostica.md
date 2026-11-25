Un tunnel che funziona è solo metà del lavoro: l'altra metà è riuscire a spiegare perché non funziona. Tra due estremità VPN ci sono sempre tre domande separate: le identità si riconoscono, il traffico è instradato verso il tunnel, i pacchetti attraversano la rete reale senza essere scartati. Questa lezione mette in fila gli strumenti per rispondere a ciascuna domanda, in ordine di costo crescente.

## Obiettivi

- Leggere lo stato di un tunnel a livello di negoziazione, di policy e di routing.
- Usare `wg`, `ip xfrm`, `swanctl` e `tcpdump` per isolare il punto di rottura.
- Riconoscere i sintomi tipici di NAT, MTU, firewall e rotte mancanti.
- Distinguere un problema di autenticazione da un problema di traffico.
- Impostare un ping di verifica che misuri il tunnel e non solo la rete locale.

## Un metodo in quattro passi

Prima di cambiare configurazione, si verifica in ordine: la negoziazione esiste? la policy di traffico seleziona i pacchetti giusti? la rotta manda i pacchetti nel tunnel? il pacchetto esce e rientra sulla rete reale? Ogni passo ha un comando osservabile e non richiede di indovinare.

```bash
# 1. Negoziazione
sudo wg show                          # WireGuard: ultimo handshake e contatori
sudo swanctl --list-sas               # IPsec: associazioni attive e child SA
# 2. Policy di traffico (IPsec: quali coppie sorgente/destinazione sono protette)
sudo ip xfrm policy list
# 3. Routing
ip route get 10.20.0.5                # mostra l'interfaccia scelta per un host remoto
# 4. Rete reale
sudo tcpdump -ni eth0 udp port 51820  # WireGuard: i pacchetti escono?
```

Se `wg show` riporta un handshake recente ma `ping` non risponde, la crittografia non è in causa. Se `ip xfrm policy list` non contiene la coppia di sottoreti attesa, i pacchetti viaggiano in chiaro e la risposta manca per un motivo diverso. La disciplina consiste nel non saltare passi.

## Comandi per wireguard e IPsec

WireGuard è volutamente minimale: l'interfaccia sa solo se un peer ha fatto handshake di recente e quanto traffico ha ricevuto. Tutto il resto, cioè indirizzi, rotte e regole, è del sistema operativo.

```bash
sudo wg showconf wg0                 # configurazione effettiva dell'interfaccia
sudo wg set wg0 peer <BASE64_PUBKEY> persistent-keepalive 25
ip -4 addr show dev wg0              # indirizzo assegnato al tunnel
```

WireGuard rifà l'handshake ogni due minuti se c'è traffico da inviare: un `latest handshake` molto vecchio indica che il peer remoto non risponde, una porta è chiusa o l'endpoint è sbagliato. I contatori `transfer` asimmetrici, cioè ricezione ferma e trasmissione che continua, indicano che la direzione di ritorno viene scartata da un firewall o da un problema di routing.

Per IPsec lo strumento dipende dall'implementazione. Con strongSwan basato su vici, `swanctl` elenca le associazioni e i contatori; le policy kernel si vedono con `ip xfrm`.

```bash
sudo swanctl --list-conns             # configurazioni caricate
sudo swanctl --list-sas               # IKE SA e child SA con byte e tempi di rekey
sudo ip xfrm state list               # chiavi e algoritmi installati nel kernel
```

Differenza importante: una IKE SA attiva senza child SA significa che le identità si autenticano ma le proposte per il traffico non coincidono. In quel caso il log mostra un mismatch di traffic selectors, e il `.conf` ha sottoreti diverse tra i due lati.

## Lettura degli errori frequenti

| Sintomo | Passo da controllare | Causa probabile |
| --- | --- | --- |
| handshake assente | 1 | endpoint o porta errati, chiave pubblica sbagliata, firewall in ingresso |
| handshake presente, `ping` fallisce | 2 e 3 | policy o rotte mancanti, ACL sul concentratore |
| si connette, la prima richiesta va e poi si blocca | 4 | MTU, frammentazione, MSS non ritoccato |
| funziona da una rete ma non da un'altra | 4 | UDP bloccato, NAT simmetrico, DPI dell'operatore |
| tunnel su, solo alcuni servizi raggiungibili | 2 | split tunneling parziale o regole DNS assenti |

Il caso MTU merita un esempio: se l'incapsulamento riduce il payload massimo, un handshake TLS da 1,5 KB può passare e poi fermarsi su un certificato più grande. Il test `ping -M do -s 1372` (Linux) o `ping -f -l 1372` (Windows) misura il limite reale senza frammentazione. Il valore di partenza 1372 è solo un'ipotesi: sottrai al risultato l'intestazione IP e UDP, oppure imposta direttamente la MTU del tunnel e verifica con TCP.

## NAT, keepalive e roaming

I client dietro NAT non hanno un indirizzo pubblico stabile, e il NAT può cambiare porta dopo un timeout di alcuni minuti. I keepalive mantengono la mappatura NAT attiva: WireGuard offre `persistent-keepalive` in secondi, IPsec usa NAT-T su UDP 4500 con pacchetti di keepalive dedicati.

```bash
# Osserva il traffico outer dopo un cambio di rete del client
sudo tcpdump -ni eth0 'udp port 4500' -c 10
```

Un peering che funziona in ufficio e fallisce in tethering è quasi sempre un doppio NAT che ostacola ESP: è uno dei motivi per cui le implementazioni IPsec moderne passano su UDP 4500 quando rilevano NAT.

## Errori comuni

- **Riavviare il tunnel prima di avere un'evidenza**: si perdono contatori e log utili, e si ricrea lo stesso errore.
- **Guardare solo `ping`**: ICMP può essere filtrato o passare da una rotta diversa dal traffico applicativo; prova anche verso la porta del servizio.
- **Fidarsi dei contatori senza guardare i tempi**: byte che crescono per keepalive non significano traffico utente funzionante.
- **Ignorare i log del piano di controllo**: un rifiuto di proposta o di identità appare solo lì, non nel kernel.
- **Cambiare MTU ovunque contemporaneamente**: isola un lato alla volta, altrimenti non sai quale correzione ha funzionato.

## In sintesi

- Si diagnostica in ordine: negoziazione, policy, routing, rete reale.
- `wg show`, `swanctl --list-sas` e `ip xfrm` coprono il piano di controllo del tunnel.
- `ip route get` spiega perché un pacchetto entra o non entra nel tunnel.
- MTU, NAT e UDP bloccato sono le cause di rottura più frequenti in produzione.
- La regola d'oro: non cambiare due cose insieme e conservare l'evidenza prima delle modifiche.

## Fonti

- [Manual page — wg(8)](https://man7.org/linux/man-pages/man8/wg.8.html)
- [Manual page — ip-xfrm(8)](https://man7.org/linux/man-pages/man8/ip-xfrm.8.html)
- [strongSwan — swanctl.conf](https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html)
- [strongSwan — NAT Traversal](https://docs.strongswan.org/docs/latest/features/natTraversal.html)
- [OpenWrt — WireGuard](https://openwrt.org/docs/guide-user/network/wireguard/start)
