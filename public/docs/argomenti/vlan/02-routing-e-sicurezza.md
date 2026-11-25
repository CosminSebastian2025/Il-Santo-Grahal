Una VLAN segmenta il livello 2, ma quasi nessuna azienda vuole isole chiuse: la stampante deve raggiungere i server, gli utenti il gestionale, gli ospiti solo internet. Serve quindi un punto di livello 3 che instradi tra le VLAN, e una strategia per distribuire le informazioni sulle VLAN stesse tra gli switch. Questa lezione copre intervlan routing, i protocolli VTP e MST per propagare e aggregare le VLAN, le opzioni di protezione e la diagnostica di base.

## Obiettivi

- Scegliere tra router-on-a-stick e routing con SVI su switch di livello 3.
- Assegnare a ogni VLAN un indirizzo di gateway e una maschera coerente.
- Comprendere VTP nei tre modi (server, client, trasparente) e i suoi rischi.
- Applicare native VLAN dedicata, DTP disattivato e DHCP snooping sulle porte.
- Diagnosticare il traffico tra VLAN con ARP, tabelle di routing e traceroute.

## Intervlan routing: due modelli

| Modello | Cos'è | Vantaggi | Limiti |
| --- | --- | --- | --- |
| router-on-a-stick | un router con una sottinterfaccia per VLAN sul link trunk | poco hardware, adatto a reti piccole | il router è collo di bottiglia |
| SVI su switch L3 | un'interfaccia virtuale per VLAN sullo switch | routing in hardware, veloce | serve uno switch L3 |
| router fisico per VLAN | un'interfaccia fisica per VLAN | semplicità | costoso e poco scalabile |

Con router-on-a-stick il router riceve trame taggate sul trunk e le instrada tra sottinterfacce, ciascuna con il proprio indirizzo e il proprio VID. Con le SVI lo switch di livello 3 fa lo stesso lavoro in ASIC, senza uscire dall'apparato, ed è il modello preferito nelle reti moderne.

```cisco
! router-on-a-stick: una sottinterfaccia per VLAN
interface GigabitEthernet0/0
 no shutdown
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 10.10.0.1 255.255.255.0
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 10.20.0.1 255.255.255.0
```

```cisco
! alternativa su switch L3: SVI e default gateway
ip routing
interface Vlan10
 ip address 10.10.0.1 255.255.255.0
 no shutdown
interface Vlan20
 ip address 10.20.0.1 255.255.255.0
 no shutdown
ip route 0.0.0.0 0.0.0.0 192.0.2.1
```

In entrambi i casi, gli host ricevono un gateway che è l'indirizzo della SVI o della sottinterfaccia. Se il gateway è sbagliato, l'host raggiunge i pari nella stessa VLAN ma non esce: è il sintomo classico di un problema di routing e non di switching. Con il router-on-a-stick conta anche la banda del singolo link trunk: tutto il traffico tra VLAN attraversa quella porta, e un cavo a 1 Gbit/s diventa il limite anche se il resto dell'infrastruttura è a 10 Gbit/s. La scelta tra i due modelli dipende quindi dalla disponibilità di switch di livello 3 e dal volume di traffico east-west tra i segmenti.

## VTP, MST e propagazione delle VLAN

VTP (VLAN Trunking Protocol) propaga l'elenco delle VLAN da uno switch server ai client tramite annunci sul trunk, così non le crei su ogni apparato. La comodità è anche il pericolo: un server con configurazione diversa (revisione più alta) può cancellare VLAN su tutta la rete. Per questo VTP è considerato legacy e va disattivato (`vtp mode off`) o usato in trasparente, con le VLAN definite manualmente su ogni switch, meglio se in modo automatizzato.

```cisco
vtp version 2
vtp domain CORP
vtp mode transparent      # non accetta né propaga annunci
vtp pruning               # evita di trasportare VLAN senza porte attive

spanning-tree mode mst
spanning-tree mst configuration
 name CORP
 revision 1
 instance 1 vlan 10,20
 instance 2 vlan 30
exit
```

Lo spanning tree lavora per istanza: più VLAN sullo stesso albero condividono i percorsi e quindi il blocco. MST (IEEE 802.1s) raggruppa le VLAN in istanze, così puoi usare un albero per VLAN di utenti e un altro per il traffico server, bilanciando il carico sui link ridondanti. Il vecchio PVST+ assegna un albero per VLAN ma con consumo di CPU e di istanze superiore: entrambi restano validi, la scelta dipende dal parco apparati. Se cambi nome o revisione della regione MST su uno switch, il mapping con gli altri non corrisponde più e le VLAN possono finire su istanze diverse; l'errore si vede in `show spanning-tree mst configuration digest`, dove i digest devono combaciare.

## Sicurezza e diagnostica

L'isolamento tra VLAN non vale se un attaccante riesce a generare trame taggate: è il cosiddetto VLAN hopping. Due difese: native VLAN diversa da 1 e senza porte attive, DTP disattivato sulle porte access con `switchport nonegotiate`. Aggiungi la protezione delle porte senza host e le ACL di management. Un terzo accorgimento è non fidarsi di DHCP e ARP incondizionatamente: DHCP snooping filtra le risposte DHCP solo dalle porte degli uplink legittimi, e dynamic ARP inspection blocca gli ARP gratuiti falsi che dirottano il gateway. Con questi controlli una VLAN compromessa non può offrire un gateway falso alle altre.

```bash
# verifica che il tag sia presente in ingresso sul trunk
sudo tcpdump -i eth0 -e -n 'vlan && arp'

# ARP e route connesse su un host Linux
ip neigh show dev eth0.10
ip route show           # attese le route connesse per ogni VLAN attiva
traceroute -n 10.20.0.50
```

Se `ip neigh` resta in stato `INCOMPLETE`, l'host non riceve risposte ARP: controlla VID assegnato e porta access. Se invece ARP risponde ma il traffico si ferma al primo salto, il problema è nel routing: manca la route connessa per la VLAN di origine o una ACL la scarta.

## Errori comuni

- **Gateway fuori dalla VLAN dell'host** — l'host arriccia ma non esce: se il gateway è 10.20.0.1 e l'host è in 10.10.0.0/24, il router non ha route di ritorno per la VLAN 10.
- **VTP server duplicato in produzione** — un altro server con revisione alta cancella le VLAN su tutti i client; verifica `show vtp status` e la revisione prima di introdurre apparati.
- **Spanning tree e MST con VLAN non mapped** — una VLAN non assegnata a nessuna istanza finisce nell'istanza 0; un blocco inatteso su tutti i link può venire da qui.
- **Maschera sbagliata sulla SVI** — /24 su una VLAN che ospita 300 host produce indirizzi fuori subnet e gateway irraggiungibili per una parte del parco.
- **Trunk senza allowed vlan tra edifici** — la VLAN è configurata su entrambi gli switch ma non è permessa sul link: il debug tocca `show interfaces trunk`.

## In sintesi

Intervlan routing richiede un livello 3: router-on-a-stick o SVI, con la SVI più veloce e più diffusa. VTP propaga le VLAN ma è fragile: una revisione più alta può cancellare la configurazione di tutta la rete, quindi si usa in trasparente o disattivato. MST raggruppa le VLAN in istanze per gestire in modo efficiente lo spanning tree. La sicurezza passa da native VLAN dedicata, DTP disattivato e controlli su ARP e DHCP, la diagnostica da ARP, route connesse e stato del trunk.

## Fonti

- Cisco - Understanding VLAN Trunk Protocol (VTP) — https://www.cisco.com/c/en/us/support/docs/lan-switching/vtp/10558-21.html
- Cisco Catalyst 9300 - Configuring VLANs — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-6/configuration_guide/vlan/b_176_vlan_9300_cg.html
- IEEE 802.1Q - Bridges and Bridged Networks — https://standards.ieee.org/ieee/802.1Q/10323/
