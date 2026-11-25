GRE, Generic Routing Encapsulation, è un protocollo di incapsulamento definito nella RFC 2784 e pensato per trasportare un pacchetto di qualsiasi protocollo di rete dentro un altro pacchetto IP. Non cifra e non autentica nulla: è un involucro, non una VPN. Serve a far viaggiare traffico che la rete in mezzo non saprebbe instradare, per esempio IPv6 su un backbone IPv4 o un protocollo di routing multicast tra due sedi.

Qui guardiamo l'intestazione byte per byte, il comportamento di un tunnel punto a punto e perché quasi ogni tunnel GRE reale finisce dentro IPSec.

## Obiettivi

- Leggere i campi dell'intestazione GRE da 4 byte e riconoscere le estensioni della RFC 2890.
- Descrivere un tunnel GRE come interfaccia punto-punto con indirizzi interni.
- Calcolare il sovraccarico di incapsulamento e scegliere una MTU coerente.
- Capire i problemi di un tunnel non cifrato e la combinazione GRE su IPSec.
- Riconoscere quando GRE è la scelta giusta e quando serve un'altra tecnologia.

## L'intestazione GRE

L'intestazione base della RFC 2784 è lunga 4 byte: flag e versione nei primi due byte, poi 16 bit di `Protocol Type` (EtherType del payload, `0x0800` per IPv4, `0x86DD` per IPv6, `0x6558` per trasparent Ethernet bridging). Il bit `C` (Checksum Present) aggiunge 4 byte, la RFC 2890 aggiunge i bit `K` (Key Present) e `S` (Sequence Number Present).

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|C|R|K|S| Reserved0     | Ver |         Protocol Type         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|      Checksum (se C)          |     Reserved1 (se C)          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Key (se K)                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Sequence Number (se S)                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

`Version` vale 0 per GRE. I bit riservati vanno inviati a zero e ignorati in ricezione, come prescrive la RFC 2784. La chiave identifica il flusso, il contatore di sequenza serve a rilevare perdite e riordini.

| Campo | Byte | Presente se | Uso tipico |
| --- | --- | --- | --- |
| Flag, versione, Protocol Type | 4 | sempre | obbligatori |
| Checksum e Reserved1 | 4 | bit C | raro, spesso disattivato |
| Key | 4 | bit K | identificatore di flusso logico |
| Sequence Number | 4 | bit S | rilevamento perdite e riordino |

## Il tunnel punto a punto

Un tunnel GRE è un'interfaccia virtuale, `gre1` su Linux o `Tunnel0` su Cisco IOS, che si comporta come un collegamento punto a punto. I due router finali hanno un IP di origine e uno di destinazione per l'incapsulamento, e un indirizzo interno distinto che appartiene alla rete trasportata.

```bash
# linux: tunnel GRE punto a punto verso il router remoto
sudo ip tunnel add gre1 mode gre \
  local 203.0.113.1 remote 198.51.100.2 \
  ttl 64 dev eth0
sudo ip link set gre1 up
sudo ip addr add 10.255.0.1/30 dev gre1
```

```text
# Cisco IOS: stesso tunnel dall'altro lato
interface Tunnel0
 ip address 10.255.0.2 255.255.255.252
 tunnel source 198.51.100.2
 tunnel destination 203.0.113.1
 tunnel mode gre ip
```

La rete `10.255.0.0/30` esiste solo dentro il tunnel: i router la usano per scambiarsi traffico di routing, di solito con OSPF configurato sull'interfaccia del tunnel. GRE trasporta il multicast, che IPSec in modalità tunnel sola non gestisce, ed è per questo che le due tecnologie si combinano invece di escludersi.

## MTU, frammentazione e keepalive

GRE aggiunge 24 byte al pacchetto IPv4 originale: 20 byte di IP esterno e 4 di GRE. Se l'IP esterno è IPv6, che ha 40 byte di intestazione, il sovraccarico sale. Con un link di trasporto a 1500 byte l'MTU utile dell'interfaccia tunnel va abbassata a 1476 per IPv4.

```bash
# Linux: MTU sull'interfaccia del tunnel e MSS clamp sulle connessioni TCP
sudo ip link set gre1 mtu 1476
sudo iptables -t mangle -A FORWARD -o gre1 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1436   # 1476 - 40 byte di IPv4 + TCP
```

Il sintomo classico di una MTU sbagliata è una connessione che si apre e poi si blocca al primo pacchetto grande: il three-way handshake passa, mentre un ping con `DF` fallisce. Il test corretto usa il payload massimo e vale `1476 - 28 = 1448` byte di dati ICMP.

```bash
ping -c 3 -M do -s 1448 10.255.0.2   # massimo senza frammentazione
```

Il tunnel GRE non ha un protocollo di stato: se la rete sottostante perde la destinazione, l'interfaccia resta `up` e le rotte che ci puntano restano installate. Cisco risolve con `keepalive` sull'interfaccia tunnel, Linux con un timer esterno o rotte condizionate. Il rilevamento richiede sempre un timer e traffico di prova.

## GRE con IPSec

GRE non offre riservatezza né integrità: chi attraversa il percorso vede il payload, e chi conosce gli IP degli endpoint può iniettare pacchetti GRE. La soluzione standard è incapsulare GRE dentro IPSec in modalità trasporto: il pacchetto GRE diventa payload ESP e il multicast continua a funzionare, perché la selezione IPSec si applica al GRE stesso.

| Aspetto | GRE puro | GRE su IPSec | IPSec tunnel |
| --- | --- | --- | --- |
| Cifratura | no | sì | sì |
| Multicast e protocolli non IP | sì | sì | no |
| Overhead IPv4 | 24 byte | 24 + ESP + IV | ESP + IV |
| Identità del tunnel | chiave GRE / IP | IP + selezione dei flussi | selettori IPSec |

Quando GRE è dentro IPSec, la chiave GRE diventa il discriminante del flusso: la RFC 2890 la definisce come identificatore di un flusso logico tra incapsulatore e decapsulatore, e così più tunnel GRE possono condividere la stessa coppia di indirizzi pubblici. Nelle configurazioni Cisco la chiave va allineata alla policy crypto, perché i due lati devono selezionare lo stesso traffico.

## Errori comuni

- **Aspettarsi riservatezza da GRE**: il protocollo non cifra, chi intercetta il link legge il payload interno.
- **Disattivare il controllo di raggiungibilità della destinazione**: senza keepalive il tunnel resta `up` e nero, e le rotte non vengono ritirate.
- **Lasciare l'MTU a 1500**: i pacchetti grandi vengono frammentati o scartati, e applicazioni come TLS falliscono a metà handshake.
- **Aprire GRE a tutti su Internet**: un tunnel GRE accetta segmenti da chiunque, per questo va vincolato con ACL e IPSec.
- **Dimenticare che il traffico di controllo è separato**: le rotte verso gli IP pubblici di origine e destinazione devono essere fuori dal tunnel per non creare un loop.

## In sintesi

GRE è un incapsulatore semplice e senza stato: 4 byte di intestazione, estensioni opzionali per chiave e sequenza. Diventa un tunnel punto-punto con un indirizzo interno e trasporta anche multicast, cosa che lo rende il vettore naturale per il routing tra sedi. Non ha sicurezza propria, per cui va sempre affiancato da IPSec. Il sovraccarico va scalato nell'MTU e il tunnel va sorvegliato con keepalive o con rotte condizionate.

## Fonti

- [RFC 2784 - Generic Routing Encapsulation (GRE)](https://www.rfc-editor.org/rfc/rfc2784)
- [RFC 2890 - Key and Sequence Number Extensions to GRE](https://www.rfc-editor.org/rfc/rfc2890)
- [RFC 1701 - Generic Routing Encapsulation (GRE), predecessore storico](https://www.rfc-editor.org/rfc/rfc1701)
- [RFC 1702 - Generic Routing Encapsulation over IPv4 networks](https://www.rfc-editor.org/rfc/rfc1702)
- [Cisco - IP Routing Configuration Guide - Implementing Tunnels](https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/ip-routing/b-ip-routing/m_ir-impl-tun-xe.html)
