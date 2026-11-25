Un failover VRRP che funziona in laboratorio e fallisce in produzione quasi sempre nasconde un problema di osservabilità: nessuno sa quale router è Master finché il servizio non cade. Il protocollo è semplice, quindi la diagnostica vera sta nei dettagli, cioè nel VRID giusto, nel MAC virtuale corretto, nei timer simmetrici e nella propagazione del guasto verso il resto della rete.

Questa lezione mette insieme i comandi di stato, la cattura degli ADVERTISEMENT e le verifiche di correlazione che servono per un failover controllato.

## Obiettivi

- Leggere lo stato VRRP con i contatori di advertisement su Linux e Cisco IOS.
- Catturare ADVERTISEMENT e identificare VRID, priorità e timer.
- Distinguere i guasti di protocollo dai guasti di percorso e di ARP.
- Verificare la coerenza dei timer e della preemption tra i peer.
- Progettare un test di failover ripetibile con tempi misurati.

## Leggere lo stato

Prima della cattura conviene verificare la coerenza della configurazione effettiva: VRID, priorità, indirizzo virtuale e timer devono essere identici su tutti i membri del gruppo. Un solo valore diverso è sufficiente per avere due master contemporanei.

```bash
ip -s -d link show mesh0     # contatori rx/tx dell'interfaccia del gruppo
ip neigh show 192.0.2.1      # a quale MAC risolve l'IP virtuale
capsh --print | grep -i vrrp # con i privilegi giusti compare questa capability
ip route get 192.0.2.11      # la rotta verso il peer esiste?
```

Su una distribuzione con pacchetto `keepalived` i file di configurazione e lo stato runtime si leggono con `journalctl -u keepalived` e con le variabili esposte in `/proc`. La sostanza non cambia: l'interfaccia fisica deve trasmettere e ricevere ADVERTISEMENT con la capability VRRP abilitata.

```text
R1# show vrrp
GigabitEthernet0/1 - Group 10
  State is Master
  Virtual IP address is 192.0.2.1
  Virtual MAC address is 0000.5e00.010a
  Advertisement interval is 1.000 sec
  Preemption enabled
  Priority is 150 (cfgd 150)
  Track object 1 state Up decrement 40

R2# show vrrp
GigabitEthernet0/1 - Group 10
  State is Backup
  Master Router is 192.0.2.11, priority is 150
  Master Advertisement interval is 1.000 sec
  Master Down interval is 3.220 sec
```

Il Master Down di 3,220 secondi deriva dalla priorità 100 e dall'intervallo di 1 secondo: 3 s più circa 0,22 s di skew. Lo stesso valore deve comparire, calcolato, su tutti i backup. Su Cisco `show vrrp all` e `show vrrp brief` danno la vista d'insieme, utile per scovare VRID duplicati.

| Controllo | Comando | Valore atteso |
| --- | --- | --- |
| stato dei membri | `show vrrp brief` | un solo Master per gruppo |
| ICMP verso l'IP virtuale | `ping 192.0.2.1` | risponde solo il Master (o l'owner) |
| MAC virtuale | `show vrrp` | `0000.5e00.01<VRID>` |
| timer coerenti | `show vrrp` su ogni peer | stesso Adver Int |
| tracciamento delle interfacce | `track` o `show vrrp` | decremento o stato `Down` |

## Catturare gli ADVERTISEMENT

VRRPv3 viaggia su IP protocollo 112 verso il multicast `224.0.0.18`, con TTL 255. La cattura sull'interfaccia della LAN mostra un pacchetto al secondo circa, e il contenuto rivela subito chi è Master e con quale priorità.

```bash
# ADVERTISEMENT VRRP: protocollo 112, destinazione multicast
sudo tcpdump -ni mesh0 -c 5 'ip proto 112' -vv
# verifica del TTL e del VRID nell'esadecimale
sudo tcpdump -ni mesh0 -c 1 -XX 'ip proto 112'
# ARP gratuiti emessi al cambio di ruolo
sudo tcpdump -ni mesh0 'arp' -c 20
```

```text
13:42:01.004512 IP 192.0.2.11 > 224.0.0.18: VRRPv3 advert 10 prio 150
13:42:02.004488 IP 192.0.2.11 > 224.0.0.18: VRRPv3 advert 10 prio 150
```

Se il tcpdump mostra due sorgenti diverse con `prio` comparabile e VRID uguale, nella LAN ci sono due master. La causa quasi sempre è una split-brain da link perso tra i due membri o una differenza di configurazione. Se invece nessun pacchetto 112 compare, si deve controllare che le ACL non blocchino il protocollo 112 e che il multicast non sia filtrato dagli switch.

## Errori, ritardi e percorso

Un gruppo che dice Master mentre i client non raggiungono il gateway indica un problema dopo l'elezione, tipicamente ARP o instradamento. La sequenza è sempre la stessa: l'IP virtuale risponde al ping, il MAC virtuale è presente nella ARP cache degli host, il Master ha una rotta di ritorno verso i client, e ACL L2 non bloccano i pacchetti.

Una sorgente frequente di ritardo non è VRRP ma la convergenza del resto della rete, per esempio OSPF verso il bordo. Se il Master perde il proprio uplink e il ruolo resta a lui, i client hanno un gateway corretto e una destinazione irraggiungibile. Il rimedio è il tracking: l'oggetto tracciato (interfaccia o rotta) decrementa la priorità e sposta il ruolo.

```bash
# misurare il tempo di failover: un ping continuo e un cambio manuale di priorità
ping -i 0.2 -O 192.0.2.1 &
sleep 5 && ssh r1 'show vrrp' && ssh r2 'show vrrp'
kill %1
```

Con timer VRRPv3 da 30 centisecondi il failover si chiude sotto il secondo, ma un ping con intervallo di 200 ms dà la misura reale: si contano i pacchetti persi e si converte in secondi.

## Errori comuni

- **Non usare il filtro corretto**: cercare a una porta TCP ignora il protocollo 112 e fa concludere che il gruppo non parla.
- **Verificare solo il Master**: se il backup non calcola lo stesso Master Down, il guasto produrrà un failover lento o doppio.
- **Ignorare gli ARP gratuiti**: dopo un cambio di ruolo gli switch devono imparare il nuovo percorso, e un host che li rifiuta resta fermo.
- **Tracciare l'interfaccia sbagliata**: un oggetto che non contiene l'uplink mantiene il Master su un router senza uscita.
- **Confondere VRRP con un protocollo di routing**: VRRP non annuncia reti e non converge, il resto della rete deve già sapere dove trovare il Master.

## In sintesi

La diagnostica VRRP ruota attorno a tre letture: lo stato dei membri, la cattura degli ADVERTISEMENT e il comportamento dell'IP virtuale dopo il cambio. Un solo Master per gruppo, timer simmetrici e un MAC virtuale stabile sono le condizioni minime; ARP, rotte e tracciamento degli uplink completano il quadro. La verifica del failover si fa con un ping continuo e tempi misurati, non a occhio.

## Fonti

- [RFC 5798 - VRRP Version 3 for IPv4 and IPv6](https://www.rfc-editor.org/rfc/rfc5798)
- [Cisco - Configuring VRRP](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp_fhrp/configuration/xe-16/fhp-xe-16-book/fhp-vrrp.html)
- [Cisco - Understand the Hot Standby Router Protocol Features and Functionality](https://www.cisco.com/c/en/us/support/docs/ip/hot-standby-router-protocol-hsrp/9234-hsrpguidetoc.html)
