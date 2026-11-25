In questo laboratorio applichi le VLAN a un caso concreto: un ufficio con tre segmenti, un trunk verso il router, un router-on-a-stick che instrada tra loro e una policy che tiene gli ospiti fuori dalla rete server. Non tocchi un apparato Cisco fisico, ma usi quello che hai sulla macchina: più VLAN su un ponte Linux e namespace di rete per isolare gli host e farne uno router. Alla fine avrai un banco di prova riproducibile da cui replicare la stessa topologia su qualsiasi switch.

## Obiettivi

- Ricostruire una topologia VLAN con porte access, un trunk e un router di livello 3.
- Creare, collegare e amministrare un ponte Linux con una VLAN per porta.
- Verificare l'instradamento tra VLAN con route connesse e traceroute.
- Applicare un filtro in avanti per isolare gli ospiti dai server.
- Documentare stato delle porte e prove di connettività come criteri di esito.

## Il piano di indirizzamento

| VLAN | Nome | Rete | Gateway | Host iniziali |
| --- | --- | --- | --- | --- |
| 10 | UFFICI | 10.10.0.0/24 | 10.10.0.1 | due workstation |
| 20 | SERVER | 10.20.0.0/24 | 10.20.0.1 | un servizio HTTP |
| 30 | OSPITI | 10.30.0.0/24 | 10.30.0.1 | una postazione ospite |
| 99 | NATIVA | 192.168.99.0/24 | assente | trunk e management |

Le porte 1 e 2 sono access in VLAN 10, la porta 3 access in VLAN 20, la porta 4 access in VLAN 30, la porta 24 è il trunk verso il router e la native VLAN è la 99. Il router ha una sottinterfaccia per ogni VLAN e nessuna interfaccia per la 99: il traffico non taggato non è instradato.

```bash
# switch: ponte con una VLAN per porta, trunk 802.1Q sulla porta 24
sudo ip link add name sw0 type bridge
for p in lan1 lan2 lan3 lan4 trunk0; do sudo ip link add $p type dummy; done
sudo ip link set lan1 master sw0
sudo ip link set trunk0 master sw0
bridge vlan add dev lan1 pvid 10 untagged master
bridge vlan add dev trunk0 vid 10,20,30 tagged master
bridge vlan add dev trunk0 pvid 99 untagged master   # native VLAN senza tag
```

`pvid` è la VLAN che il ponte assegna alle trame non taggate in ingresso: è il concetto di porta access. Il flag `tagged` sulla porta del trunk è l'equivalente di `switchport mode trunk`. Se hai già un bridge e due schede reali, sostituisci `lan1` e `trunk0` con i nomi delle tue interfacce.

## Router-on-a-stick e host

Sul lato router crei la sottinterfaccia con l'encapsulation dot1Q per ogni VLAN, come su Cisco ma con `ip link add ... type vlan`. Ogni namespace rappresenta una macchina finale con la propria interfaccia access, e il namespace router contiene solo le sottinterfacce taggate.

```bash
# router: una sottinterfaccia taggata per VLAN
sudo ip netns add router
sudo ip link set trunk0 netns router
sudo ip -n router link add link trunk0 name tr.10 type vlan id 10
sudo ip -n router addr add 10.10.0.1/24 dev tr.10
sudo ip -n router link set tr.10 up
sudo ip -n router link set lo up
ip -n router route show            # route connesse per la VLAN 10

# host in VLAN 20 con gateway 10.20.0.1
sudo ip netns add srv
sudo ip link set lan3 netns srv
sudo ip -n srv addr add 10.20.0.10/24 dev lan3
sudo ip -n srv route add default via 10.20.0.1
sudo ip -n srv link set lan3 up
```

Ripeti lo stesso schema per le altre VLAN cambiando id, rete e nome del namespace. Se `ip -n srv route show` non contiene la default, l'host non sa a chi consegnare il traffico diretto altrove; se il gateway non è raggiungibile in ARP, ritorna al laboratorio 01 e verifica il pvid della porta access.

```bash
# dalla postazione ospite verso il servizio della VLAN 20
sudo ip netns exec guest ping -c1 10.30.0.1
sudo ip netns exec guest traceroute -n 10.20.0.10
sudo ip netns exec guest curl -s -m 3 http://10.20.0.10:8000/ || echo "filtro attivo"
```

Il ping verso il gateway conferma l'instradamento; il traceroute mostra il primo salto sull'indirizzo della sottinterfaccia. Per isolare gli ospiti aggiungi una regola di forward nella catena `FORWARD` del namespace router, con `-i tr.30 -o tr.20 -j DROP`, e sposta le regole in una catena dedicata se le devi ripetere.

## Esercizi

1. Aggiungi la VLAN 40 per la telefonia, con rete 10.40.0.0/24, e collegalci una postazione che deve raggiungere solo la VLAN 10.
2. Scrivere lo script che ricrea tutto il banco da zero, idempotente, con un `cleanup` che rimuove namespace e ponti.
3. Aggiungi DHCP per le VLAN 10 e 30 con un server nel namespace router e verifica che gli host ricevano gateway e DNS.
4. Simula il VLAN hopping: invia una trama non taggata verso il trunk e spiega perché finisce nella VLAN 99 e non nella 10.
5. Applica una ACL equivalente a quella Cisco che permette agli ospiti la sola porta 53 verso un resolver e nessun'altra destinazione.
6. Misura il traffico per VLAN con `nft` o `tc` e confronta il risultato di un trasferimento intra-VLAN con uno intervlan.

<details>
<summary>Soluzione</summary>

1. Crea `lan5` con `bridge vlan add dev lan5 pvid 40 untagged` e aggiungi `vid 40 tagged` sul trunk. Sul router aggiungi `tr.40` con `10.40.0.1/24` e una regola `FORWARD` che accetta `-i tr.40 -o tr.10` e scarta il resto.

2. Lo script memorizza le VLAN in un array, controlla con `ip link show` se un oggetto esiste prima di crearlo, e il cleanup ricorsivo su namespace è `ip netns del` seguito da `ip link del sw0`. L'ordine conta: prima gli host, poi il router, poi il ponte.

3. `dnsmasq` nel namespace router con `interface=tr.10`, `interface=tr.30` e due blocchi `dhcp-range` è sufficiente; gli host devono avere `lan1 up` e la porta access nel pvid corretto.

4. La trama non taggata arriva sul pvid del trunk, cioè la 99: è il comportamento previsto e la ragione per cui una native VLAN dedicata senza host e senza routing rende il vettore inefficace.

5. Una regola `FORWARD` con `-i tr.30 -p udp --dport 53 -j ACCEPT`, poi `-i tr.30 -j DROP`, replica l'ACL Cisco con la stessa semantica di ordine.

6. `nft add table inet conta` con catene per interfaccia e `tc -s qdisc show` mostrano i byte: intra-VLAN non toccano il router, intervlan passano dal namespace e il contatore cresce solo nel secondo caso.

</details>

## Errori comuni

- **Namespace senza interfaccia up** — l'host non risponde ad ARP e sembra un problema di VLAN, ma manca solo `ip -n <ns> link set <if> up`.
- **Pvid aggiunto senza flag master** — il comando `bridge vlan add` va eseguito con `master dev sw0`, altrimenti il mapping finisce sull'interfaccia sbagliata.
- **Trunk senza vid 99 ma native 99** — il traffico non taggato viene scartato e la gestione del trunk sparisce senza errori chiari.
- **Regole di forward in ordine errato** — l'ordine di `FORWARD` decide tutto; un DROP generico in testa rende irraggiungibile anche la VLAN 10.
- **Gateway nel namespace sbagliato** — host e router in namespace diversi non si vedono, anche con l'indirizzo corretto: sono reti separate per definizione.

## In sintesi

Il laboratorio riproduce con strumenti Linux la stessa struttura di uno switch con access e trunk. Le porte access diventano pvid, il trunk diventa `tagged`, il router-on-a-stick diventa una sottinterfaccia VLAN. In sintesi, il piano di indirizzamento precede ogni comando: VLAN, rete, gateway e ruolo delle porte sono la specifica, i comandi sono solo la sua traduzione. La verifica è parte del lavoro: `bridge vlan show` mostra i pvid reali, traceroute mostra il salto, il curl senza risposta mostra il filtro attivo. Da qui puoi replicare la stessa topologia su Cisco IOS cambiando solo la sintassi, non il modello.

## Fonti

- Cisco Catalyst 9300 - Configuring VLANs — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-6/configuration_guide/vlan/b_176_vlan_9300_cg.html
- Cisco - Inter-Switch Link and IEEE 802.1Q Frame Format — https://www.cisco.com/c/en/us/support/docs/lan-switching/8021q/17056-741-4.html
- IEEE 802.1Q - Bridges and Bridged Networks — https://standards.ieee.org/ieee/802.1Q/10323/
