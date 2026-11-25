In questo laboratorio costruisci due gateway ridondanti con VRRP e li metti alla prova: un IP virtuale come default gateway, priorità decrescente quando l'uplink si guasta e failover misurato. Poi confronti VRRP con HSRP, perché gran parte del lavoro reale consiste nel conoscere le differenze dei due protocolli.

Alla fine devi rispondere con dei numeri: chi è Master, quanto dura il passaggio, quanto traffico si perde.

## Obiettivi

- Configurare due router come gruppo VRRP coerente e verificarne lo stato.
- Correggere la priorità tramite object tracking dell'uplink.
- Misurare il failover con traffico reale e timer compatibili.
- Confrontare VRRP e HSRP sugli stessi indirizzi e mettere in sicurezza il gruppo.
- Scrivere un criterio di accettazione ripetibile per il cambio di ruolo.

## Topologia e contratto

| Elemento | R1 (primario) | R2 (secondario) |
| --- | --- | --- |
| IP reale sulla LAN | 192.0.2.11/24 | 192.0.2.12/24 |
| IP virtuale | 192.0.2.1 | 192.0.2.1 |
| priorità | 150 | 100 |
| uplink verso Internet | GigabitEthernet0/0 | GigabitEthernet0/0 |
| oggetto tracciato | uplink, decremento 60 | uplink, decremento 60 |
| VRID | 10 | 10 |

Criterio di accettazione: un solo Master per gruppo, failover sotto i 5 secondi, ritorno del ruolo entro 10 secondi dalla riparazione.

```text
R1(config)# track 1 ip route 0.0.0.0/0 reachability
R1(config-track)# exit
R1(config)# interface GigabitEthernet0/1
R1(config-if)# vrrp 10 ip 192.0.2.1
R1(config-if)# vrrp 10 priority 150
R1(config-if)# vrrp 10 preempt
R1(config-if)# vrrp 10 track 1 decrement 60

R2(config)# track 1 ip route 0.0.0.0/0 reachability
R2(config)# interface GigabitEthernet0/1
R2(config-if)# vrrp 10 ip 192.0.2.1
R2(config-if)# vrrp 10 priority 100
R2(config-if)# vrrp 10 preempt
R2(config-if)# vrrp 10 track 1 decrement 60
```

Il decremento di 60 porta R1 a 90, sotto il 100 di R2. Tracking sulla rotta di default è più adatto dell'interfaccia fisica: l'uplink può restare `up` senza raggiungibilità.

## Verifica dello stato e failover

Prima del test verifica che non ci siano altri VRID sull'interfaccia.

```text
R1# show vrrp brief
Interface          Grp Prio  State    Master addr    Group addr
Gi0/1              10  150   Master   192.0.2.11     192.0.2.1

R2# show vrrp brief
Interface          Grp Prio  State    Master addr    Group addr
Gi0/1              10  100   Backup   192.0.2.11     192.0.2.1
```

```bash
# traffico continuo verso il gateway virtuale, con timestamp dei salti
ping -O -i 0.2 192.0.2.1 | ts '%.s' | tee failover.log
# in un altro terminale: rimuovi la rotta che l'oggetto traccia
ssh r1 'configure terminal; no ip route 0.0.0.0 0.0.0.0 GigabitEthernet0/0'
```

Nel log si contano le righe `no answer yet`. Se l'interruzione supera i 5 secondi, la causa tipica è un timer diverso tra i due router.

## Confronto con HSRP e sicurezza

HSRP risolve lo stesso problema con nomi, MAC e timer diversi. Vedere le due configurazioni affiancate evita gli errori in ambienti misti.

| Aspetto | VRRP | HSRP |
| --- | --- | --- |
| Terminologia | Master e Backup | Active e Standby |
| Standard | RFC 5798, multiproduttore | Cisco, proprietario |
| Default priority | 100, owner 255 | 100 |
| Priorità del proprietario | 255, IP virtuale posseduto | nessun owner, IP virtuale può essere assegnato |
| MAC virtuale | `0000.5e00.01VRID` | `0000.0c07.ac` + group in esadecimale |
| Preemption | attiva di default nella RFC | disattiva di default su IOS |
| Failover tipico | subsecondo con VRRPv3 | hello 3 s, hold 10 s |
| Tracking | oggetto tracciato con decremento | `standby track` con decremento |

```text
R1(config)# interface GigabitEthernet0/1
R1(config-if)# standby 20 ip 192.0.2.33
R1(config-if)# standby 20 priority 120
R1(config-if)# standby 20 preempt
R1(config-if)# standby 20 track 1 decrement 30
```

Gli ADVERTISEMENT VRRPv3 non sono autenticati: chiunque sulla LAN può annunciarsi con priorità 255 e dirottare il gateway. Il rimedio non è una password ma il controllo degli accessi sulla rete, la protezione ARP e il monitoraggio dei cambi di ruolo.

## Esercizi

1. Calcola il `Master_Down_Interval` per priorità 100, 150 e 200 con advertisement da 1 secondo e spiega l'ordine di failover.
2. Porta l'advertisement a 30 centisecondi e misura il failover: cosa cambia e quale rischio introduce sulla LAN.
3. Aggiungi un secondo gruppo con VIP per la rete applicazioni e spiega come i due router restino Master di gruppi diversi.
4. Simula il guasto del solo uplink e verifica che R1 ceda il ruolo: riporta il numero di pacchetti persi.
5. Prova a configurare lo stesso VIP con HSRP su un terzo router e spiega perché non può coesistere con VRRP.
6. Descrivi come un attaccante sulla LAN impadronirsi del gateway e quali controlli lo fermano.

<details>
<summary>Soluzione</summary>

1. Con advertisement di 1 s: priorità 100 dà 3,61 s, priorità 150 dà 3,41 s, priorità 200 dà 3,22 s. Il router con priorità più alta calcola un timer più corto, quindi vince la corsa.

2. Con 30 centisecondi il Master Down scende attorno al secondo e il failover è quasi trasparente; il costo è un ADVERTISEMENT ogni 0,3 s per gruppo, che somma traffico di controllo su tutti gli switch e può saturare il control plane di apparati lenti.

3. Ogni gruppo ha VRID e VIP distinti, con priorità invertite tra i due router: R1 è Master sul gruppo della subnet web, R2 sul gruppo della subnet applicazioni. Il VIP non deve essere usato come indirizzo di interfaccia su nessuno dei due router.

4. Con `track 1 ip route 0.0.0.0/0 reachability`, la perdita dell'uplink decrementa R1 a 90: R2 promuove dopo il Master Down e invia l'ARP gratuito. I contatori `show vrrp` mostrano un advertisement mancante nell'intervallo; il ping misura i pacchetti persi.

5. VRRP e HSRP usano MAC virtuali e protocolli diversi ma lo stesso IP virtuale: se due apparati annunciano lo stesso IP, i client ricevono ARP da entrambi e il gateway diventa indecidibile. Si usano VRID e gruppi HSRP distinti con VIP distinti.

6. Un nodo sulla LAN può inviare ADVERTISEMENT con priorità 255 e divenire Master: per difendersi si limitano le porte accessi, si abilita il DHCP snooping e il dinamico ARP inspection, e si monitorano gli eventi con un log centralizzato.

</details>

## Errori comuni

- **Tracker di default non aggiornato**: se il decremento lascia la priorità sopra il secondario, la perdita dell'uplink non sposta il ruolo.
- **Timer asimmetrici**: un advertisement diverso tra i membri rende il Master Down calcolato diversamente e il failover imprevedibile.
- **VIP configurato come indirizzo dell'interfaccia**: due apparati divergono sul routing e il ping al VIP può rispondere dal router sbagliato.
- **Preemption sempre attiva**: in una rete con flapping dell'uplink il ruolo oscilla e ogni passaggio causa un breve blackout.
- **Nessun controllo di stato indipendente**: senza monitoraggio del ruolo, il failover resta invisibile finché un utente non apre un ticket.

## In sintesi

VRRP in laboratorio si riduce a configurazioni coerenti e a un tracker che descrive la salute dell'uplink. La verifica passa da `show vrrp` e da un ping con timestamp. HSRP risolve lo stesso problema con altri nomi e altri default: conoscerli evita incidenti nelle migrazioni. La sicurezza del gruppo dipende dalla LAN, non da una password.

## Fonti

- [RFC 5798 - VRRP Version 3 for IPv4 and IPv6](https://www.rfc-editor.org/rfc/rfc5798)
- [RFC 3768 - Virtual Router Redundancy Protocol (VRRP)](https://www.rfc-editor.org/rfc/rfc3768)
- [Cisco - Configuring VRRP](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp_fhrp/configuration/xe-16/fhp-xe-16-book/fhp-vrrp.html)
- [Cisco - Understand the Hot Standby Router Protocol Features and Functionality](https://www.cisco.com/c/en/us/support/docs/ip/hot-standby-router-protocol-hsrp/9234-hsrpguidetoc.html)
- [RFC 4541 - IGMP and MLD Snooping Switches](https://www.rfc-editor.org/rfc/rfc4541)
