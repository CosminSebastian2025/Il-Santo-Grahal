In questo laboratorio colleghi due sedi con un tunnel GRE che trasporta OSPF e poi lo rendi sicuro con IPSec in modalità trasporto. L'obiettivo è costruire un tunnel verificabile: indirizzi interno ed esterno distinti, MTU calibrata, keepalive che spegne le rotte e selezione del traffico corretta. Il criterio di successo è una sessione OSPF `FULL` sul tunnel che resta stabile dopo la cifratura.

## Obiettivi

- Progettare indirizzamento esterno e interno senza sovrapposizioni.
- Configurare un tunnel GRE coerente su due router con stati verificabili.
- Trasportare OSPF attraverso il tunnel e verificare l'adiacenza.
- Misurare il sovraccarico e impostare MTU e MSS.
- Aggiungere IPSec in modalità trasporto e provare che il traffico è protetto.

## Topologia e contratto

| Elemento | Router R1 (sede A) | Router R2 (sede B) |
| --- | --- | --- |
| indirizzo esterno | 203.0.113.1/30 | 198.51.100.2/30 |
| indirizzo interno tunnel | 10.255.0.1/30 | 10.255.0.2/30 |
| rete interna | 192.168.10.0/24 | 192.168.20.0/24 |
| tunnel | `Tunnel0`, GRE/IP | `Tunnel0`, GRE/IP |

Le reti interne non devono comparire fuori dal tunnel: il trasporto conosce solo gli indirizzi esterni e la `/30` interna serve a OSPF.

```text
R1(config)# interface Tunnel0
R1(config-if)# ip address 10.255.0.1 255.255.255.252
R1(config-if)# ip mtu 1400
R1(config-if)# ip tcp adjust-mss 1360
R1(config-if)# keepalive 5 3
R1(config-if)# tunnel source 203.0.113.1
R1(config-if)# tunnel destination 198.51.100.2
R1(config-if)# tunnel key 100
R1(config-if)# tunnel mode gre ip
R1(config-if)# no shutdown
```

```text
R2(config)# interface Tunnel0
R2(config-if)# ip address 10.255.0.2 255.255.255.252
R2(config-if)# ip mtu 1400
R2(config-if)# ip tcp adjust-mss 1360
R2(config-if)# keepalive 5 3
R2(config-if)# tunnel source 198.51.100.2
R2(config-if)# tunnel destination 203.0.113.1
R2(config-if)# tunnel key 100
R2(config-if)# tunnel mode gre ip
R2(config-if)# no shutdown
```

`keepalive 5 3` invia un probe ogni 5 secondi e dichiara il tunnel `down` dopo tre mancati riscontri. `tunnel key 100` rende il flusso distinguibile: molti laboratori senza chiave funzionano ugualmente, la differenza emerge quando più tunnel condividono gli stessi peer.

## OSPF sul tunnel e MTU

Con Ethernet a 1500 byte e GRE su IPv4 l'MTU teorica del tunnel è 1476. `1400` è prudente: lascia margine all'IPSec che aggiungeremo, perché la regola è MTU del tunnel uguale al trasporto meno GRE, IP esterno e IPSec. OSPF resta sotto questa soglia, ma il traffico applicativo no.

```text
R1(config)# router ospf 1
R1(config-router)# network 10.255.0.0 0.0.0.3 area 0
R1(config-router)# network 192.168.10.0 0.0.0.255 area 0

R2(config)# router ospf 1
R2(config-router)# network 10.255.0.0 0.0.0.3 area 0
R2(config-router)# network 192.168.20.0 0.0.0.255 area 0
```

```bash
# verifica dell'adiacenza e del percorso interno
ssh r1 'show ip ospf neighbor'
ping -c 3 -M do -s 1372 10.255.0.2   # 1400 - 28
traceroute -n -w 1 192.168.20.1
```

Se `show ip ospf neighbor` mostra `INIT` o `exstart`, la causa più frequente è un mismatch di MTU: i due router devono annunciare lo stesso valore. Controlla `show interfaces Tunnel0` e `show ip ospf interface Tunnel0`.

## Aggiungere IPSec in modalità trasporto

GRE da solo è in chiaro. Con IPSec in modalità trasporto il pacchetto GRE resta visibile, ma il payload interno è cifrato con ESP e l'integrità copre tutta l'intestazione GRE. Il crypto ACL deve selezionare il protocollo 47 tra i due IP esterni, non le reti interne.

```text
R1(config)# crypto ikev2 proposal PROP1
R1(config-ikev2-proposal)# encryption aes-cbc-256
R1(config-ikev2-proposal)# integrity sha256
R1(config-ikev2-proposal)# group 14

R1(config)# crypto ikev2 keyring GRE-KEYS
R1(config-ikev2-keyring)# peer R2
R1(config-ikev2-keyring-peer)# address 198.51.100.2
R1(config-ikev2-keyring-peer)# pre-shared-key local <chiave-R1>

R1(config)# crypto ipsec profile GRE-PROFILE
R1(config-ipsec-profile)# set ikev2-profile PROP1

R1(config)# interface Tunnel0
R1(config-if)# tunnel protection ipsec profile GRE-PROFILE
```

```text
R1# show crypto ipsec sa
     pkts encaps: 512, pkts decaps: 509
     local ident (addr/mask/prot/port): (203.0.113.1/255.255.255.255/47/0)
     remote ident (addr/mask/prot/port): (198.51.100.2/255.255.255.255/47/0)

R1# show run interface Tunnel0 | include protection
 tunnel protection ipsec profile GRE-PROFILE
```

Se i contatori non crescono mentre il tunnel passa traffico, il flusso non è selezionato oppure l'interfaccia non ha la protezione applicata. L'identità con protocollo `47` conferma che IPSec sta proteggendo GRE e non le reti interne.

`ip mtu 1400` va riletta dopo IPSec: ESP in modalità trasporto aggiunge IV e padding, quindi l'MTU effettiva scende. Il test finale è `ping -M do` con payload pieno, che deve passare senza frammenti.

## Esercizi

1. Aggiungi un secondo tunnel GRE verso un terzo router usando una chiave diversa sugli stessi IP pubblici: cosa serve perché i flussi restino separati?
2. Prova a impostare `ip mtu 1500` sul tunnel e descrivi cosa succede a OSPF e al traffico TCP.
3. Scrivi una ACL estesa che consenta solo GRE e IKE/UDP 500 e 4500 tra i due peer, e spiega cosa succede al tunnel se togli UDP 4500.
4. Misura il sovraccarico con `tcpdump` su un ping di payload noto e confronta con il calcolo teorico.
5. Rompi la configurazione su un solo lato (chiave diversa) e descrivi i sintomi su entrambi i router.
6. Aggiungi una seconda metà della rete interna solo su una sede e prova a raggiungerla da un interfaccia downstream: cosa mostra il traceroute?

<details>
<summary>Soluzione</summary>

1. Serve una chiave GRE distinta per ogni flusso: senza di essa il router non distingue i tunnel e consegna il traffico decapsulato alla prima interfaccia che corrisponde.

2. Con MTU 1500 il pacchetto interno più le intestazioni supera il trasporto: OSPF scambia i `hello` piccoli ma resta in `exstart` sul database, e TCP dipende dal path MTU discovery, spesso bloccato.

3. Sull'interfaccia esterna: `permit gre host 203.0.113.1 host 198.51.100.2`, poi UDP 500 e 4500 tra i peer, infine `deny ip any any`. Senza UDP 4500 IKE continua su 500, ma ESP incapsulato in UDP per il NAT traversal non passa.

4. La differenza di dimensione tra pacchetto esterno e interno deve essere 24 byte con GRE base, 28 con la chiave.

5. Il lato corretto invia GRE ma non riceve payload utile: le encapsulazioni crescono, le decapsulazioni restano ferme e gli `hello` OSPF non arrivano al vicino.

6. Il traceroute si ferma al router di sede, perché la rete non è annunciata in OSPF; la rotta mancante si vede con `show ip route`.

</details>

## Errori comuni

- **Usare lo stesso indirizzo sull'interno e sull'esterno**: il tunnel richiama sé stesso e le rotte verso i peer diventano parte della rete trasportata.
- **Dimenticare `ip tcp adjust-mss`**: le sessioni TCP si bloccano a metà su pacchetti grandi, mentre `ping` piccoli funzionano.
- **Aggiungere IPSec senza rifare il calcolo dell'MTU**: il tunnel reggeva prima della cifratura e smette di reggere dopo.
- **Dimenticare il protocollo 47 nel crypto ACL**: il tunnel GRE resta scoperto e il traffico delle sedi esce in chiaro.
- **Configurare keepalive su un solo lato**: il router senza probe non può dichiarare il peer `down` e mantiene le rotte verso un tunnel nero.

## In sintesi

Un tunnel GRE in laboratorio serve a separare tre piani: trasporto, incapsulamento, instradamento interno. Il contratto di indirizzamento tiene fuori dal tunnel i peer esterni e dentro le reti trasportate, il keepalive dà al tunnel uno stato osservabile e l'MTU con MSS clamp evita i timeout. L'ultimo strato, IPSec in modalità trasporto, protegge il flusso GRE senza perdere il multicast, ma cambia di nuovo i conti dei byte.

## Fonti

- [Cisco - IP Routing Configuration Guide - Implementing Tunnels](https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/ip-routing/b-ip-routing/m_ir-impl-tun-xe.html)
- [RFC 2784 - Generic Routing Encapsulation (GRE)](https://www.rfc-editor.org/rfc/rfc2784)
- [RFC 2890 - Key and Sequence Number Extensions to GRE](https://www.rfc-editor.org/rfc/rfc2890)
- [RFC 4303 - IP Encapsulating Security Payload (ESP)](https://www.rfc-editor.org/rfc/rfc4303)
- [RFC 2401 - Security Architecture for the Internet Protocol](https://www.rfc-editor.org/rfc/rfc2401)
