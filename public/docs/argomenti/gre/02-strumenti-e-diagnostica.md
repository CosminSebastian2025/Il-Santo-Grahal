Un tunnel GRE è invisibile finché non si rompe: quando smette di passare traffico, l'interfaccia resta `up`, le rotte restano installate e gli utenti vedono solo timeout. Diagnosticarlo significa guardare tre piani separati, cioè trasporto, incapsulamento e traffico interno. Qui mettiamo in fila gli strumenti che servono, da `ip` a `tcpdump`, dalla configurazione Cisco allo stato di IPSec.

## Obiettivi

- Ispezionare un tunnel GRE con gli strumenti di sistema di Linux e di Cisco IOS.
- Catturare e leggere pacchetti GRE, compresi chiave e numero di sequenza.
- Distinguere i guasti di trasporto dai guasti di incapsulamento su entrambi i lati.
- Verificare l'MTU effettiva con test di frammentazione controllata.
- Controllare lo stato della combinazione GRE su IPSec e le sue negoziazioni.

## Guardare il tunnel dall'alto

Prima di catturare pacchetti conviene leggere la configurazione effettiva. Su Linux `ip tunnel show` riporta origine, destinazione, TTL e MTU, mentre `ip -s link show` espone i contatori che rivelano un tunnel che riceve ma non trasmette.

```bash
ip -d link show gre1          # dettagli: local/remote, ttl, link/ether
ip tunnel show gre1
ip -s link show gre1          # RX/TX, errori, scarti
ip route get 10.255.0.2       # la rotta usa il tunnel o l'interfaccia fisica?
ip addr show eth0 | grep -E 'inet |mtu'
```

```text
router01# show interfaces Tunnel0
Tunnel0 is up, line protocol is up
  Hardware is Tunnel
  Internet address is 10.255.0.1/30
  MTU 1476 bytes, BW 100 Kbit/sec
  Tunnel source 203.0.113.1, destination 198.51.100.2
  Tunnel protocol/transport GRE/IP
  encapsulations 12, decapsulations 12
```

La riga `line protocol` su Cisco deriva dallo stato della rotta verso la destinazione: se manca la rotta verso `198.51.100.2`, il tunnel va `down` e il guasto è di routing, non di incapsulamento. Su Linux questa protezione non esiste di default, per cui il tunnel resta `up` anche quando il peer è sparito.

| Sintomo | Comando di verifica | Causa probabile |
| --- | --- | --- |
| tunnel `up`, zero traffico | `ip -s link show gre1` | MTU, firewall o peer non configurato |
| decapsulamenti a zero | `show ip interface` e contatori tunnel | pacchetti GRE scartati o non arrivano |
| tunnel Cisco `down` | `show ip route <peer>` | rotta verso la destinazione mancante |
| TX cresce, RX fermo | `tcpdump -i eth0 proto gre` | il ritorno è bloccato da ACL |

## Leggere i pacchetti

GRE su IPv4 ha numero di protocollo 47, quindi il filtro BPF corretto è `proto gre`, non una porta. Sull'interfaccia fisica si vede l'incapsulamento, sull'interfaccia tunnel si vede il payload decapsulato: catturare su entrambe chiarisce subito dove il pacchetto si perde.

```bash
# interfaccia fisica: IP esterno + intestazione GRE
sudo tcpdump -ni eth0 -vv 'proto gre'
# interfaccia tunnel: solo il payload interno
sudo tcpdump -ni gre1 -vv
# con chiave e sequenza visibili nell'esadecimale
sudo tcpdump -ni eth0 -XX 'proto gre' -c 3
```

`tcpdump -vv` riporta `gre-proto-0x800` e, se presenti, `GREv0, key=0x102` e `seq 42`. Se non arriva nulla mentre il peer trasmette, il problema è nel mezzo: una ACL che blocca il protocollo 47 o un NAT che riscrive l'IP di origine.

## Verificare MTU e frammentazione

La verifica più utile resta il ping con bit `DF`: se un payload passa e uno più grande no, il percorso ha un MTU più basso del previsto. Si scende a passi finché non si trova il limite.

```bash
# 1476 MTU = 1448 byte di payload ICMP (1476 - 20 IP - 8 ICMP)
for s in 1448 1400 1300 1200; do
  printf '%s ' "$s"
  ping -c 1 -W 1 -M do -s "$s" 10.255.0.2 >/dev/null && echo ok || echo frammentato
done
# scoperta dell'MTU lungo il percorso sulla rete esterna
tracepath -n 198.51.100.2
```

Se il ping da 1448 fallisce ma quello da 1300 passa, il trasporto è più stretto del previsto o una rete intermedia aggiunge incapsulamento. Il MSS clamp è il rimedio applicativo: agisce sui SYN per impedire che TCP scelga segmenti più grandi del percorso.

## Controllare GRE con IPSec

Quando GRE è dentro IPSec la configurazione si distribuisce su due livelli e un guasto sull'uno non si vede dall'altro. L'ordine di verifica è: SA IPSec `up`, tunnel GRE `up`, rotte interne, traffico applicativo.

```text
router01# show crypto ikev2 sa
IPv2 SA ID: 101  status: READY
  local  203.0.113.1   remote  198.51.100.2

router01# show crypto ipsec sa interface Tunnel0
     pkts encaps: 4210, pkts decaps: 4188
     local ident (addr/mask/prot/port): (203.0.113.1/255.255.255.255/47/0)
     remote ident (addr/mask/prot/port): (198.51.100.2/255.255.255.255/47/0)
```

L'identità con protocollo `47` viene dalla selezione del traffico: se il crypto ACL permette solo TCP o solo ICMP, GRE non entra nel tunnel e la RFC 2401 ricorda che proprio la selezione dei flussi è il cuore di IPSec. Un contatore `encaps` che cresce mentre `decaps` resta fermo indica configurazioni dissimmetriche, di solito nella chiave GRE.

## Errori comuni

- **Filtrare per porta invece che per protocollo 47**: GRE non usa porte, `tcpdump port 47` non mostra nulla e sembra che il tunnel non parli.
- **Dimenticare la ACL sul transport**: il tunnel funziona a mano ma l'ISP o un firewall aziendale blocca il protocollo 47 tra i peer.
- **Fidarsi del solo `is up`**: un tunnel Linux senza keepalive resta `up` con il peer spento, e le rotte non vengono ritirate.
- **Testare l'MTU con pacchetti senza `DF`**: la frammentazione maschera il problema e il test passa anche con MTU scorretta.
- **Guardare solo un lato**: source e destination invertite in una delle due configurazioni producono lo stesso sintomo di un guasto di rete, e il test di ping sui due estremi del tunnel è l'unico modo per accorgersene.

## In sintesi

Diagnosticare GRE richiede tre livelli di lettura: lo stato dell'interfaccia, i contatori e il traffico catturato. Un tunnel Cisco segue la rotta verso la destinazione, uno Linux no, quindi il primo ha un segnale di stato in più ma non sufficiente. Il ping con `DF` e il `tcpdump` su fisica e tunnel localizzano il punto di rottura in pochi minuti. Quando c'è IPSec, si parte dallo stato delle SA e dalla selezione del traffico, che deve includere il protocollo 47.

## Fonti

- [Cisco - IP Routing Configuration Guide - Implementing Tunnels](https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/ip-routing/b-ip-routing/m_ir-impl-tun-xe.html)
- [RFC 2784 - Generic Routing Encapsulation (GRE)](https://www.rfc-editor.org/rfc/rfc2784)
- [RFC 2890 - Key and Sequence Number Extensions to GRE](https://www.rfc-editor.org/rfc/rfc2890)
- [RFC 1702 - Generic Routing Encapsulation over IPv4 networks](https://www.rfc-editor.org/rfc/rfc1702)
- [RFC 2401 - Security Architecture for the Internet Protocol](https://www.rfc-editor.org/rfc/rfc2401)
