VoIP è la trasmissione della voce come pacchetti IP: un codificatore trasforma la forma d'onda in un flusso di ottetti, RTP li spedisce a intervalli regolari e un buffer di ricezione li restituisce all'orecchio. Non c'è un circuito dedicato, quindi ogni problema di rete diventa una voce metallica, un singhiozzo o un silenzio. In questa lezione separi i due piani che in un sistema telefonico si toccano ma non si mescolano: la segnalazione che apre e chiude la chiamata e i media che riempiono il silenzio tra i parlanti.

## Obiettivi

- Distinguere il piano di segnalazione dal piano media e capire perché sono indipendenti.
- Calcolare il carico di un flusso RTP a partire da codec e intervallo di pacchettizzazione.
- Leggere jitter, latenza e perdita come grandezze misurabili, non come aggettivi.
- Spiegare perché NAT e firewall rompono il VoIP classico e come si aggirano con STUN, ICE e TURN.
- Descrivere cosa proteggono SRTP e TLS e cosa resta scoperto.

## Segnalazione e media: due piani separati

Una chiamata SIP si compone di messaggi di testo che viaggiano di solito su TCP o TLS, e di un flusso audio che viaggia su UDP con RTP. La segnalazione descrive la sessione con SDP: indirizzi, porte, codec offerti e direzione dei flussi. I media non passano dentro il canale di segnalazione, e questo è il punto che sorprende chi arriva dal web: il 200 OK non trasporta audio, dice solo dove mandarlo.

| Piano | Protocolli tipici | Trasporto | Cosa succede se si perde una unità |
| --- | --- | --- | --- |
| Segnalazione | SIP (RFC 3261), SDP (RFC 8866) | TCP, TLS o UDP con ritrasmissione | il ritentativo riprende la transazione |
| Media | RTP (RFC 3550) | UDP, raramente TCP | la perdita è compensata o ignorata |
| Controllo media | RTCP, RFC 4733 per il DTMF | UDP | statistiche in ritardo, tono mangia-cifra |

SIP numera le sue transazioni e ritrasmette su UDP finché non arriva una risposta, per questo è definito "best effort ma affidabile a livello applicativo". RTP fa l'opposto: nessuna ritrasmissione, perché una voce arrivata con 300 ms di ritardo non serve più. Il RFC 4594 riflette questa differenza nella rete: la portante vocale è marcata EF, la segnalazione CS5, con classi di servizio distinte.

## Codec e contabilità del pacchetto

Un codec campiona la voce a intervalli regolari: G.711 è PCM a 8 kHz e 64 kbit/s, G.722 è wideband 16 kHz con clock RTP di 8000 Hz per scelta storica documentata nel profilo RFC 3551, Opus è adattivo con frammenti da 2,5 a 20 ms e bitrate fino a 510 kbit/s secondo RFC 6716. L'intervallo di pacchettizzazione predefinito dell'audio in RTP è 20 ms, quindi si spediscono 50 pacchetti al secondo.

Il costo non è il codec, sono le intestazioni. Un pacchetto IPv4 con UDP e RTP aggiunge 40 byte: 12 di RTP, 8 di UDP, 20 di IP.

```text
G.711, 20 ms di audio:
  160 byte di payload + 40 byte di intestazioni = 200 byte
  200 byte x 50 pacchetti/s = 10.000 byte/s = 80 kbit/s
  il payload da solo sarebbe 64 kbit/s: il 20% se ne va in overhead
```

Lo stesso conto con Opus a 20 ms: 34 byte di payload più 40 di intestazioni danno 74 byte, cioè circa 30 kbit/s. Riducendo il payload si riduce il traffico ma non l'overhead, che cresce in proporzione.

Una intestazione RTP composta a mano serve in laboratorio per testare ricevitori: la sequenza deve avanzare di uno e il timestamp di 160 per ogni pacchetto G.711.

```python
import struct

def rtp_header(seq: int, ts: int, ssrc: int, pt: int = 0) -> bytes:
    # V=2, P=0, X=0, CC=0 -> 0x80; M=0, PT=0 per PCMU
    return struct.pack("!BBHII", 0x80, pt, seq & 0xFFFF, ts & 0xFFFFFFFF, ssrc)
```

## Jitter, latenza e perdita

Il jitter è la variazione dei tempi di arrivo, e RFC 3550 ne dà una formula incrementale: `J(i) = J(i-1) + (|D(i-1,i)| - J(i-1))/16`, dove `D` è la differenza tra l'intervallo osservato e quello del mittente, in unità di timestamp. Il buffer di ricezione assorbe il jitter accumulando ritardo: più grande è la finestra, più voce entra in ritardo. La latenza unidirezionale si somma lungo la catena e G.114 la mantiene in una fascia di pianificazione che per la conversazione resta sotto i 150 ms; sopra i 300 ms il parlante inizia a sentirsi un turno dietro all'altro.

G.107, il modello E, combina in un unico numero gli effetti di perdita, ritardo e codec, mentre Y.1541 fissa obiettivi di rete per classi di servizio IP. Sono documenti di pianificazione, non garanzie: servono a decidere dove investire, non a certificare un link.

## NAT traversal e sicurezza

Un NAT traduce l'indirizzo privato in quello pubblico, quindi l'SDP dice "manda l'audio a 192.0.2.20:40000" e il pacchetto dall'esterno non arriva, oppure arriva da una porta che sembra un intruso. Le soluzioni seguono tre gradi: STUN (RFC 5389) scopre l'indirizzo riflesso dall'esterno, TURN (RFC 8656) aggiunge un relay per i casi peggiori, ICE (RFC 8445) prova in parallelo le coppie candidate e nomina quella che funziona. Un altro stratagemma classico è la simmetricità: se il ricevente manda il flusso di ritorno verso la porta da cui è arrivato il pacchetto, il NAT resta convinto di una conversazione interna.

Sul fronte sicurezza, TLS protegge solo la segnalazione e SRTP (RFC 3711) cifra e autentica i media con una chiave derivata in genere da SDES o dallo scambio DTLS. Un piano di autorizzazione del PBX è necessario quanto il cifrario: senza è possibile iniettare chiamate o sfruttare il server come centralino verso il mondo.

## Errori comuni

- **Confondere RTP con un protocollo affidabile**: ritrasmettere audio aumenta la latenza e peggiora la voce, la perdita si maschera con il jitter buffer o la sostituzione.
- **Contare il codec e ignorare le intestazioni**: un G.711 "da 64 kbit/s" in realtà consuma circa 80 kbit/s su Ethernet per via di RTP, UDP e IP.
- **Aumentare all'infinito il jitter buffer**: assorbe i disturbi ma aggiunge ritardo di conversazione, che nessun codec può compensare.
- **Aprire 5060 e 5061 senza limitare le sorgenti**: la segnalazione accetta registrazioni e tentativi di chiamata da chiunque raggiunga la porta.
- **Dare per sicuro il flusso perché la fattura non lo dice**: SIP e RTP viaggiano spesso in chiaro, e anche cifrati non dimostrano a chi sta chiamando.

## In sintesi

VoIP è una scommessa: si accetta ritardo e perdita per usare una rete packet-switched al posto di un circuito dedicato. Segnalazione e media vivono su piani separati, e il valore di un colloquio dipende dalla somma di codec, pacchettizzazione, jitter, latenza e percorso attraverso NAT e firewall. SRTP, TLS e ICE non migliorano la qualità della voce, proteggono il sistema che la produce; la qualità resta un problema di dimensionamento e misura.

## Fonti

- [RFC 3550 - RTP: A Transport Protocol for Real-Time Applications](https://www.rfc-editor.org/rfc/rfc3550.txt)
- [RFC 3551 - RTP Profile for Audio and Video Conferences with Minimal Control](https://www.rfc-editor.org/rfc/rfc3551.txt)
- [RFC 3261 - SIP: Session Initiation Protocol](https://www.rfc-editor.org/rfc/rfc3261.txt)
- [RFC 8445 - Interactive Connectivity Establishment (ICE)](https://www.rfc-editor.org/rfc/rfc8445.txt)
- [ITU-T G.114 - One-way transmission time](https://www.itu.int/rec/T-REC-G.114/en)
