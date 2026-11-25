VRRP, Virtual Router Redundancy Protocol, risolve un problema che ogni rete ha: i client hanno un solo default gateway configurato, e se quel router si spegne il traffico si ferma anche se esiste un secondo router perfettamente funzionante. VRRP definisce un router virtuale condiviso da più router fisici, con un indirizzo IP e un MAC virtuali che i client usano come gateway.

La parte interessante non è l'indirizzo, ma il protocollo elettorale che decide chi risponde: priorità, timer, preemption e lo scambio di ADVERTISEMENT sulla rete locale.

## Obiettivi

- Spiegare il problema del primo hop e il contratto del router virtuale.
- Leggere il campo di priorità, il range riservato e la formula del Master_Down_Interval.
- Distinguere lo stato Master dallo stato Backup e descrivere le transizioni.
- Capire il ruolo di preemption, Virtual Router ID e TTL 255.
- Confrontare VRRP con HSRP senza confondere i timer dei due protocolli.

## Il router virtuale

Un gruppo VRRP è identificato da un `VRID` da 1 a 255 su una singola interfaccia, quindi coppie (interfaccia, VRID) devono essere uniche nella rete locale. Il gruppo espone un IP virtuale e un MAC virtuale nella forma `00-00-5E-00-01-VRID`, cioè l'OUI IANA riservato a VRRP. Un router con priorità 255, chiamato owner, possiede realmente quell'IP; tutti gli altri sono backup.

```text
|   host A   |   |   host B   |        default gateway: 192.0.2.1
      |               |                   (MAC 00-00-5E-00-01-0A)
   ---+---------------+-------------------- LAN 192.0.2.0/24
                    |
        |--- R1 (priority 150, Master) ---|
        |--- R2 (priority 100, Backup) ---|
```

I client non conoscono l'indirizzo reale di R1 né quello di R2: conoscono solo l'IP virtuale. Il passaggio di consegne è trasparente perché il MAC virtuale resta lo stesso, e gli host aggiornano solo la tabella ARP, che punta già a quel MAC.

## Priorità, timer e stati

La priorità decide l'elezione: il valore più alto vince, `100` è il default, `255` è riservato all'owner dell'IP e `0` è riservato al Master che vuole rilasciare il ruolo. Quando un backup non sente ADVERTISEMENT per un certo tempo si autopromuove. Il tempo non è uguale per tutti, altrimenti più backup promuoverebbero contemporaneamente.

```text
Skew_Time           = ((256 - priority) * Master_Adver_Interval) / 256
Master_Down_Interval = (3 * Master_Adver_Interval) + Skew_Time
```

Con `Master_Adver_Interval` di 1 secondo e priorità 100, lo Skew_Time è circa 0,61 s e il Master_Down_Interval circa 3,61 s. Con priorità 200 lo Skew scende a 0,22 s: il router più forte aspetta meno e vince la corsa. La RFC 5798 esprime i timer in centisecondi.

| Stato | Chi ci sta | Cosa fa |
| --- | --- | --- |
| Initialize | tutti | attesa di un evento di startup |
| Backup | priorità < 255 | ascolta gli ADVERTISEMENT, timer di master down |
| Master | election winner o owner | risponde ad ARP per l'IP virtuale, invia ADVERTISEMENT ogni intervallo |

L'owner con priorità 255 salta l'elezione e passa subito a Master. La transizione da Backup a Master richiede un ARP gratuito: la MAC virtuale deve essere rimappata sulle porte degli switch, altrimenti il traffico continua a puntare a un router spento. Lo stesso ARP gratuito è una richiesta di ARP non sollecitata, quindi alcuni host devono essere configurati per accettarla.

Il timer si misura in centisecondi e questo cambia la scala del problema: con VRRPv3 un intervallo di 30 centisecondi rende il failover quasi trasparente, ma ogni ADVERTISEMENT di un master aggiunge traffico di broadcast sulla LAN e carica il control plane dei CPU.

## Preemption, VRRPv3 e sicurezza

Con la preemption attiva, un router che rientra in rete con priorità più alta riconquista il ruolo di Master. È il default della RFC, e in una sede con un router primario più potente serve a ripristinare la situazione nominale dopo un riavvio. Il rovescio è un cambio di ruolo aggiuntivo: se si vuole stabilità, si disattiva la preemption sui backup.

| Aspetto | VRRP (RFC 3768, IPv4) | VRRPv3 (RFC 5798) |
| --- | --- | --- |
| Famiglie | solo IPv4 | IPv4 e IPv6 con lo stesso formato |
| Timer | 1 secondo intero | centisecondi, quindi sotto il secondo |
| Autenticazione | testo in chiaro, deprecata | rimossa |
| Campo riservato | parte del campo autenticazione | `Rsvd` a zero, ignorato in ricezione |
| Multicast | 224.0.0.18 | 224.0.0.18 per IPv4, `FF02::12` per IPv6 |

La RFC 5798 elimina l'autenticazione perché l'esperienza ha mostrato che le password condivise creano più problemi, cioè master multipli per misconfigurazione, di quanti ne risolvano. Restano due protezioni: il TTL deve essere 255 e i pacchetti con TTL diverso vanno scartati, e il checksum viene verificato. Il protocollo IP assegnato a VRRP è 112.

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Type  | Virtual Rtr ID|   Priority    |Count IP Addrs |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|   Auth Type   |   Adver Int   |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         IP Address (1)                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

Il campo `Count IP Addrs` permette più indirizzi virtuali nello stesso gruppo, utile per servire più subnet con un solo VRID.

## Errori comuni

- **Non verificare l'unicità della coppia interfaccia e VRID**: due gruppi con lo stesso numero sulla stessa LAN generano master multipli e ARP instabile.
- **Dare priorità 255 a più router**: il valore è riservato all'owner dell'IP virtuale, non è un trucco per vincere l'elezione.
- **Sottostimare il tempo di failover**: tre intervalli più lo skew significano secondi di interruzione, che le applicazioni con timeout corti notano.
- **Attivare la preemption senza motivo**: ogni rientro del router primario causa un ulteriore cambio di ruolo e un breve blackout.
- **Assumere che VRRP sia sicuro come IPSec**: gli ADVERTISEMENT non sono autenticati e chiunque sulla LAN può dichiararsi Master.

## In sintesi

VRRP dà ai client un gateway che sopravvive al guasto di un singolo router: stesso IP e stesso MAC virtuale, ruoli Master e Backup decisi dalla priorità. I timer derivano dall'intervallo di advertisement e dalla priorità, così l'elezione è deterministica. La preemption ripristina il router preferito ma costa un cambio di ruolo. VRRPv3 unifica IPv4 e IPv6, riduce i timer e rimuove l'autenticazione, affidando la difesa locale a TTL e checksum.

## Fonti

- [RFC 5798 - Virtual Router Redundancy Protocol (VRRP) Version 3 for IPv4 and IPv6](https://www.rfc-editor.org/rfc/rfc5798)
- [RFC 3768 - Virtual Router Redundancy Protocol (VRRP)](https://www.rfc-editor.org/rfc/rfc3768)
- [Cisco - Configuring VRRP](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipapp_fhrp/configuration/xe-16/fhp-xe-16-book/fhp-vrrp.html)
- [Cisco - Understand the Hot Standby Router Protocol Features and Functionality](https://www.cisco.com/c/en/us/support/docs/ip/hot-standby-router-protocol-hsrp/9234-hsrpguidetoc.html)
