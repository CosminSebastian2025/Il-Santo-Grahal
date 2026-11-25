In questo laboratorio si misura la QoS invece di dichiararla. Si parte da un link da 2 Mbps che trasporta voce, video e backup, si costruisce una policy, si genera congestione con il traffico di prova e si legge il risultato con i comandi di diagnostica. Il metodo è quello che serve in produzione: misurare prima, configurare dopo, verificare sempre.

## Obiettivi

- Misurare latenza, jitter e perdita su un link sotto carico.
- Costruire una policy CBWFQ con LLQ per la voce e verificarla con contatori reali.
- Confrontare l'effetto di policing e shaping sullo stesso profilo di traffico.
- Documentare le classi con una tabella DSCP condivisa con la segnalazione SIP.
- Riconoscere dalla metrics quale strato va corretto.

## Scenario e misure iniziali

La rete di prova ha due router collegati da un seriale a 2 Mbps, un telefono SIP marcato EF, una stazione per la videoconferenza con AF41 e un server di backup massimo sforzo. Prima di configurare una policy si prende un rumore di fondo.

```bash
# Misura base: latenza e jitter in assenza di regole
ping -c 50 -i 0.2 -s 1200 10.0.0.2
ping -c 50 -i 0.2 -s 1200 -Q 0xb8 10.0.0.2   # DSCP EF sul ping
mtr -n --report -c 100 10.0.0.2

# Congestione controllata: due flussi grossi saturano il link
iperf3 -c 10.0.0.2 -t 60 -P 4
```

Con i ping in parallelo al trasferimento si vede il numero che conta: in assenza di coda dedicata la latenza della voce sale da 4 ms a centinaia di millisecondi. La baseline è il valore rispetto al quale misurerai l'effetto della policy.

| Misura | Senza QoS | Target voce |
| --- | --- | --- |
| latenza una via | 4 ms a vuoto, oltre 200 ms in congestione | sotto 150 ms |
| jitter | variabile, da 1 a 40 ms | sotto 30 ms |
| perdita | scarti in coda a casaccio | sotto 1% |

## Costruire la policy

La policy segue la tabella delle classi: EF per la voce con un tetto, CS5 per SIP, AF41 per la videoconferenza, AF21 per il traffico interattivo e il resto in best effort con fair-queue.

```cisco
ip access-list extended VOICE-RTP
 permit udp any any range 16384 32767
!
class-map match-any VOCE
 match dscp ef
 match access-group name VOICE-RTP
class-map match-any SEGNALAZIONE
 match dscp cs5
 match access-group name SIP-PORTS
class-map match-any VIDEO
 match dscp af41
class-map match-any DATI
 match dscp af21
!
policy-map LAB-OUT
 class VOCE
  priority percent 25
 class SEGNALAZIONE
  bandwidth percent 5
 class VIDEO
  bandwidth percent 25
  random-detect dscp-based
 class DATI
  bandwidth percent 20
 class class-default
  bandwidth percent 25
  fair-queue
!
interface Serial0/0/0
 bandwidth 1984
 service-policy output LAB-OUT
```

Le percentuali sono calcolate sulla banda dichiarata dall'interfaccia. Un seriale da 2048 kbps con header di livello 2 e tunnel perde qualche bit: da qui l'1984 e la somma al 100%. Adattare i numeri al caso concreto è parte del lavoro.

## Esercizi

1. Riscrivi `LAB-OUT` usando valori in kbps invece delle percentuali e spiega quale configurazione preferisci su un link che cambia.
2. Aggiungi una policer sul traffico in ingresso da una VLAN ospiti che abbassa a AF11 i pacchetti oltre 5 Mbps invece di scartarli.
3. Misura con `show policy-map interface` gli scarti della classe VOCE dopo dieci minuti di telefonata con un backup in parallelo.
4. Prova a togliere `random-detect` dalla classe VIDEO: cosa cambia nei contatori di drop e nella latenza della voce?
5. Confronta policing e shaping sul flusso di backup rimarcato AF11: documenta per ciascuno latenza, perdita e ritardo medio.
6. Scrivi un paragrafo di runbook con i tre comandi e le tre misure che faresti se la chiamata si sentisse metallica solo nei minuti di punta.

<details>
<summary>Soluzione</summary>

1. `priority percent` risponde alla banda dichiarata: su un link che oscilla (ADSL, QoS su tunnel) è più prevedibile usare `bandwidth 500` e `priority 500` in kbps, mentre con interfacce stabili le percentuali restano più leggibili. Documenta la scelta accanto alla policy.

2. Nella policy di ingresso si usa `police cir 5000000` con `exceed-action set-dscp-transmit af11`: il traffico in eccesso non perde pacchetti ma scende di priorità nelle code dell'hop successivo. È la variante di policing con remark che un provider applica al traffico oltre il profilo contrattuale.

3. Con la voce in LLQ gli scarti sulla classe VOCE restano a zero finché il rate della classe non supera il tetto del 25%, che a 2 Mbps vale circa 496 kbps: la misura di controllo è quindi il rate di picco della classe rispetto al tetto.

4. Senza WRED la coda VIDEO cresce fino al limite, poi scarta in blocco, e i flussi TCP che la attraversano perdono pacchetti a raffiche; la latenza della voce non peggiora grazie alla LLQ, ma il traffico video soffre e le finestre di congestione degli altri flussi oscillano.

5. Un policing a 1 Mbps sul backup produce una perdita immediata e un TCP che rallenta; uno shaping a 1 Mbps produce latenza crescente e nessuna perdita, con un ritardo misurabile in `show policy-map interface`. Con la voce in LLQ questa non cambia, ma il tempo di completamento del backup sì.

6. Verifica `show policy-map interface` sull'uscita della WAN, `show interfaces` per errori e carico, e una misura di ping con DSCP EF in parallelo al picco; se la classe VOCE ha drop da priorità, il tetto è troppo basso, se il ritardo è alto la causa è fuori dalla classe.

</details>

## Errori comuni

- **Configurare la policy sull'uscita sbagliata**: su un link bidirezionale con traffico asimmetrico la coda che conta è quella del router che consegna, non quella del router che riceve.
- **Fidarsi della banda dichiarata dall'interfaccia**: `bandwidth` è una dichiarazione manuale, non una misura, e su tunnel o interfacce logiche spesso non riflette la capacità reale.
- **Mettere la voce e la segnalazione nella stessa classe prioritaria**: SIP e RTP hanno profili diversi e la segnalazione non deve rubare il tetto della voce.
- **Verificare solo con un ping di piccole dimensioni**: i pacchetti grandi e le raffiche rivelano la coda, mentre un ping da 64 byte quasi non la tocca.
- **Disattivare la misura di base prima della policy**: senza un valore di confronto non c'è modo di dimostrare che il nuovo markup abbia migliorato qualcosa.

## In sintesi

La QoS si dimostra con numeri: baseline misurata, policy con classi esplicite, verifica con contatori e ritardi. In questo laboratorio la voce resta in LLQ con un tetto, la videoconferenza usa WRED, il backup in best effort cede il passo. Il runbook ripete il metodo su ogni link che deve portare traffico real-time.

## Fonti

- [QoS: Congestion Management Configuration Guide — Cisco IOS XE 15-MT](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_conmgt/configuration/15-mt/qos-conmgt-15-mt-book.html)
- [Low Latency Queueing with Priority Percentage Support — Cisco IOS XE](https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/qos_conmgt/configuration/xe-16-12/qos-conmgt-xe-16-12-book/qos-conmgt-llq-pps.html)
- [Configurazione di valori DSCP — Cisco IOS](https://www.cisco.com/c/en/us/support/docs/quality-of-service-qos/qos-packet-marking/10103-dscpvalues.html)
- [An Architecture for Differentiated Services — RFC 2475](https://www.rfc-editor.org/rfc/rfc2475.html)
