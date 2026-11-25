Code, shaping e policing sono i tre verbi con cui un router risponde alla congestione. Il primo decide l'ordine di uscita, il secondo rallenta il traffico prima che esca, il terzo lo lascia passare o lo scarta in base a un contratto. Confonderli costa caro: uno shaping impostato troppo basso produce ritardi su tutta la linea, un policer impostato sul traffico di segnalazione scarta le chiamate proprio quando servono.

## Obiettivi

- Distinguere shaping e policing e riconoscere quando usarli.
- Configurare CBWFQ con classi a banda garantita e una coda LLQ.
- Capire come fanno funzionare WRED e il livello di drop AF.
- Verificare con i contatori che la policy faccia ciò che promette.

## Shaping e policing

Policing applica il contratto subito: se il traffico supera il rate, gli scarti o lo ribassa, cioè riscrive il DSCP a un valore inferiore. Shaping mette il traffico in un buffer e lo rilascia al rate, quindi il traffico in eccesso diventa ritardo, non perdita. Un link lento che deve essere compresso verso un link ancora più lento è un problema di shaping; un contratto di provider con una porta da 10 Gbps e un CIR da 200 Mbps è un problema di policing.

| Aspetto | Policing | Shaping |
| --- | --- | --- |
| traffico in eccesso | scartato o rimarcato | messo in coda e rallentato |
| effetto sulla perdita | aumenta | non aumenta, aumenta la latenza |
| effetto sul jitter | nessuno se non scarta | alto, poi il traffico è regolare |
| punto tipico | ingress di un PE, upstream del cliente | uscita verso un link più lento |
| costo di memoria | nullo | buffer obbligatorio |

I parametri del policing standard sono tre: cir (committed information rate), bc (burst committed, in byte) e be (burst excess); il comando `police cir` accetta rate e burst, mentre i valori non specificati vengono dedotti.

```cisco
! Policing: traffico entro il contratto rimane, il resto viene scartato
policy-map POLICE-WEB
 class WEB
  police cir 20000000 bc 40000
   exceed-action drop
 class class-default
  police cir 5000000 bc 10000
   exceed-action drop
!
interface GigabitEthernet0/0
 service-policy input POLICE-WEB
```

```cisco
! Shaping: distribuisce la banda e ammorbidisce il picco verso l'ISP
policy-map SHAPE-WAN
 class class-default
  shape average 95000000
!
```

La quota di burst va dimensionata sul tempo e non sul gusto: a 20 Mbps un bc di 40 kB vale 16 ms di traffico, un valore che assorbe le raffiche TCP e non produce ritardo percepibile.

## Code e riduzione della congestione

Una policy senza vettori di coda non gestisce la congestione dei singoli flussi. Le due famiglie classiche sono FIFO (un'unica coda, scarto in coda quando piena) e le code basate su flusso (WFQ, CBWFQ), che distribuiscono la banda tra flussi o classi. CBWFQ garantisce un "minimum bandwidth" per classe ma lascia spazio al resto; LLQ aggiunge una coda a priorità stretta servita prima delle altre, con un tetto di banda per evitare che la priorità affami le altre classi.

```cisco
class-map match-any VOCE
 match dscp ef
class-map match-any SEGNALAZIONE
 match dscp cs5
class-map match-any VIDEO
 match dscp af41
class-map match-any DATI
 match dscp af21
!
policy-map EDGE-OUT
 class VOCE
  priority percent 20
  set dscp ef
 class SEGNALAZIONE
  bandwidth percent 5
 class VIDEO
  bandwidth percent 30
 class DATI
  bandwidth percent 25
  fair-queue
 class class-default
  fair-queue
!
interface Serial0/0/0
 bandwidth 2048
 service-policy output EDGE-OUT
```

La voce su un link da 2 Mbps riceve fino al 20% della banda disponibile in coda prioritaria, cioè circa 400 kbps. Con CBWFQ, se il traffico di una classe resta sotto la banda garantita ha una quota riservata, mentre il resto delle classi può occupare la banda non utilizzata.

WRED aggiunge un giudizio dentro la coda: quando il riempimento passa una soglia minima scarta con probabilità crescente i pacchetti a bassa priorità di drop, prima che la coda sia piena, in modo da far rallentare i flussi TCP che se ne accorgono. Con AF11, AF12 e AF13 la soglia si sposta in base al livello di drop.

```cisco
policy-map EDGE-OUT
 class DATI
  bandwidth percent 25
  random-detect dscp-based
  random-detect dscp af21 percent 40 80 10
  random-detect dscp af22 percent 30 70 10
  random-detect dscp af23 percent 20 60 10
```

Il primo valore è la soglia minima, il secondo la massima, il terzo un fattore di probabilità di scarto espresso in un formato che dipende dal sistema operativo della piattaforma, da verificare nella documentazione del dispositivo in uso.

## Verifica e diagnosi

Il comando che conta è `show policy-map interface`, che restituisce classi, pacchetti, byte, scarti e ritardo medio nella coda. I contatori sono per classe e per direzione: un valore a zero su una classe che dovrebbe ricevere traffico significa che il classificatore non riconosce nulla.

```cisco
Router# show policy-map interface Serial0/0/0 output
 Serial0/0/0

  Service-policy output: EDGE-OUT

    Class-map: VOCE (match-any)
      31410 packets, 4711500 bytes
      5 minute offered rate 00 bps, drop rate 0000 bps
      Match: dscp ef (46)
      Queueing
        Strict Priority
        Output Queue: Conversation 264
        Bandwidth 20 (%)
        Packets 0 (size/max)
        discards 0, drops 0, 0 by priority bandwidth limit
```

Un contatore "by priority bandwidth limit" che cresce indica che la coda LLQ riceve più di quanto il tetto consenta: in quel caso il traffico in eccesso viene trattato come best effort, e i contatori delle altre classi spiegano dove finisce quel traffico.

## Errori comuni

- **Mettere in shaping tutto e policizzare la voce**: la voce va protetta dallo shaping, non sottoposta a un limite stretto che la scarta proprio nei momenti di picco.
- **Dimenticare il burst nelle policer**: un cir senza bc adeguato scarta raffiche legittime di TCP e anche i primi pacchetti di una chiamata.
- **Fare della priorità una garanzia senza tetto**: una LLQ senza limite cresce fino a divorare le altre classi e produce la congestione che doveva evitare.
- **Sovraccaricare il link di percentuali di banda**: se la somma delle percentuali supera la capacità reale, ogni classe ottiene meno del previsto e la documentazione della policy diventa finta.
- **Leggere solo il contatore di pacchetti e non il ritardo**: una coda può non scartare nulla e produrre 300 ms di ritardo, un valore sufficiente per rendere inudibile una telefonata.

## In sintesi

Policing tutela un contratto e shaping prepara il traffico per un link più lento. CBWFQ distribuisce la banda per classi, LLQ dà una corsia prioritaria con un tetto, WRED anticipa lo scarto per far rallentare i flussi. La verifica passa da `show policy-map interface`, dove drop e ritardo raccontano se la policy fa quello che scrivi.

## Fonti

- [Low Latency Queueing with Priority Percentage Support — Cisco IOS XE](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_conmgt/configuration/xe-16-12/qos-conmgt-xe-16-12-book/qos-conmgt-llq-pps.html)
- [QoS: Congestion Management Configuration Guide — Cisco IOS XE 15-MT](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_conmgt/configuration/15-mt/qos-conmgt-15-mt-book.html)
- [QoS Scheduling e multilevel priority queueing — Cisco IOS XE 17.x](https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/qos/b-quality-of-service/m_qos-scheduling.html)
- [Quality of Service Configuration Guide — Cisco IOS XE 17.x](https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/qos/b-quality-of-service.html)
- [Assured Forwarding PHB Group — RFC 2597](https://www.rfc-editor.org/rfc/rfc2597.html)
