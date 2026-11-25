Una VLAN (Virtual LAN) è un dominio di broadcast logico costruito sopra una infrastruttura fisica condivisa: più gruppi di dispositivi che si comportano come se avessero uno switch dedicato, pur passando sugli stessi cavi e sugli stessi apparati. Il meccanismo che rende possibile tutto questo è lo standard IEEE 802.1Q, che inserisce nella trama Ethernet un identificatore di rete virtuale chiamato VLAN tag. In questa lezione impari come è fatto quel tag, quali porte lo trattano in modi diversi e come due VLAN comunicano quando serve.

## Obiettivi

- Capire perché la segmentazione a livello 2 riduce traffico di broadcast e superficie di attacco.
- Descrivere la trama 802.1Q: campo tag protocol identifier, priorità PCP, DEI e VLAN ID a 12 bit.
- Distinguere porta access, porta trunk e native VLAN su uno switch.
- Configurare e verificare VLAN su un apparato Cisco con interfacce switched e SVI.
- Riconoscere i limiti del dominio VLAN e quando è necessario il routing.

## Perché segmentare al livello 2

Uno switch lavora su indirizzi MAC e inoltra le trame broadcast su tutte le porte del dominio di broadcast. Con 300 host sullo stesso dominio, ogni richiesta ARP raggiunge 299 macchine che non la usano: il traffico cresce con il quadrato degli host e i problemi di uno diventano problemi di tutti. Una VLAN spezza questo dominio senza aggiungere cavi: ogni VLAN ha il proprio insieme di porte e il proprio spazio di broadcast. Il guadagno non è solo di prestazioni.

| esigenza | effetto della VLAN | esempio |
| --- | --- | --- |
| ridurre il broadcast | ogni VLAN è un dominio separato | 200 PC in tre VLAN |
| sicurezza | isolamento predefinito tra gruppi | ospiti fuori dalla rete interna |
| organizzazione logica | la topologia segue il ruolo | telefonia VoIP separata |
| qualità del servizio | priorità applicabile per gruppo | voce con PCP 5, dati con 0 |
| protezione delle risorse | accesso mediato dal livello 3 | server in una DMZ |

L'isolamento però vale solo tra VLAN: dentro la stessa VLAN due host si raggiungono in chiaro, quindi segmentare non sostituisce ACL o autenticazione. E soprattutto, se due VLAN devono parlarsi, serve un dispositivo di livello 3 che instradi tra loro: la VLAN non è una rete, è un'etichetta su una rete.

## La trama 802.1Q

Lo standard IEEE 802.1Q definisce il tag che gli switch aggiungono alla trama Ethernet quando la porta è in trunk. Il tag occupa 4 byte inseriti dopo il MAC di destinazione e prima del tipo di protocollo originale, e contiene TPID, PCP, DEI e VID. Il TPID vale 0x8100 e dichiara che la trama è taggata. Il VLAN ID è di 12 bit, quindi in teoria 0-4095, ma 0 e 4095 sono riservati: le VLAN usabili vanno da 1 a 4094. Il campo PCP a 3 bit (da 0 a 7) porta la priorità di classe di servizio, il DEI un bit di indicazione di scarto. Con la doppia taggatura (QinQ, 802.1ad) il TPID esterno diventa 0x88a8 e lo spazio di identificazione si amplia usando due tag in cascata.

```bash
# Su Linux lo switch virtuale della macchina parla già 802.1Q:
sudo ip link add link eth0 name eth0.20 type vlan id 20
sudo ip addr add 10.20.0.10/24 dev eth0.20
```

Creando una interfaccia `eth0.20` la scheda fisica continua a ricevere tutte le trame, ma solo quelle con VID 20 arrivano allo stack IP su quell'interfaccia: è la stessa logica di una porta access, spostata dallo switch al sistema operativo.

## Porte access, trunk e native VLAN

Una porta access appartiene a una sola VLAN e scambia trame non taggate con il dispositivo collegato: la scheda di un PC non deve sapere nulla di 802.1Q. Una porta trunk trasporta più VLAN contemporaneamente e per questo tagga ogni trama con il VID di appartenenza; l'altro capo del cavo deve essere un altro trunk. Il TAG viene rimosso in uscita verso una porta access e aggiunto in uscita verso un trunk.

La native VLAN è la VLAN che il trunk trasporta senza tag; per convenzione in Cisco IOS è la VLAN 1, ma va cambiata con una VLAN non usata per evitare VLAN hopping. Il protocollo DTP (Dynamic Trunking Protocol), attivo di default con `switchport mode dynamic auto` o `dynamic desirable`, negozia il trunk con l'altro capo: disattivalo con `switchport nonegotiate` su tutte le porte di accesso, altrimenti un host che finge di essere uno switch può diventare trunk.

```cisco
vlan 10
 name UFFICI
vlan 20
 name SERVER
vlan 99
 name NATIVA
exit

interface range GigabitEthernet1/0/1-10
 switchport mode access
 switchport access vlan 10
 switchport nonegotiate
 spanning-tree portfast
 no shutdown
exit

interface GigabitEthernet1/0/24
 description uplink verso lo switch di distribuzione
 switchport trunk encapsulation dot1q
 switchport mode trunk
 switchport trunk native vlan 99
 switchport nonegotiate
exit
```

`spanning-tree portfast` sull'accesso evita i 30 secondi di apprendimento sullo stato listening/learning; va messo solo su porte collegate a host, mai su trunk o su porte verso altri switch.

## Verifica e limiti della VLAN

Su uno switch Cisco la verifica si fa con pochi comandi e con l'occhio ai due dati che cambiano più spesso: il VID assegnato e lo stato del trunk.

```cisco
show vlan brief
show interfaces switchport
show interfaces trunk
show spanning-tree vlan 10
```

`show vlan brief` elenca le VLAN e le porte associate; `show interfaces trunk` mostra quali VLAN sono in forwarding sul trunk e quale è la native. Se una VLAN non compare sul trunk, o è stata potata con `switchport trunk allowed vlan`, o lo switch non la conosce. `bridge vlan show` stampa per ogni porta il VID e il flag di taggatura.

```bash
bridge link show                 # porte del bridge e stato
bridge vlan show                 # VID per porta, pvid e "untagged"
sudo tcpdump -i eth0 -e -n 'vlan'  # conferma la presenza del tag
```

La VLAN da sola non porta un indirizzo IP: per amministrare lo switch serve una SVI (`interface vlan 99`). E il traffico tra VLAN resta bloccato finché non esiste un percorso di livello 3.

## Errori comuni

- **Lasciare la native VLAN 1 sul trunk** — è la porta d'ingresso del VLAN hopping, perché una trama non taggata finisce nella VLAN di management; usa una VLAN dedicata e inutilizzata.
- **Dimenticare il trunk all'altro capo** — se una estremità è trunk e l'altra è access, l'altra VLAN diventa irraggiungibile senza alcun errore visibile sulla porta.
- **Credere che la VLAN cifri o protegga da tutto** — dentro la stessa VLAN il traffico resta in chiaro e due host si parlano direttamente.
- **Assegnare la VLAN sbagliata alla porta del telefono** — un telefono VoIP in una VLAN dati non riceve la configurazione e resta senza registro; verifica il VID con `show interfaces switchport`.
- **Dimenticare DTP sulle porte access** — la negoziazione automatica può trasformare una porta verso un host in un trunk se l'host lo richiede.

## In sintesi

La VLAN è un dominio di broadcast logico che riusa la stessa infrastruttura fisica. Il tag 802.1Q aggiunge 4 byte con VID a 12 bit, priorità e DEI; le porte access non taggano, i trunk sì, la native VLAN viaggia senza tag. Le VLAN isolano al livello 2 ma non instradano: per comunicare servono un router o un dispositivo di livello 3.

## Fonti

- IEEE 802.1Q - Bridges and Bridged Networks — https://standards.ieee.org/ieee/802.1Q/10323/
- Cisco - Inter-Switch Link and IEEE 802.1Q Frame Format — https://www.cisco.com/c/en/us/support/docs/lan-switching/8021q/17056-741-4.html
- Cisco Catalyst 9300 - Configuring VLANs — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-6/configuration_guide/vlan/b_176_vlan_9300_cg.html
