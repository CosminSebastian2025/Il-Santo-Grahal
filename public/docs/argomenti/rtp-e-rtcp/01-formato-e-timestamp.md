Un pacchetto RTP arriva con dodici byte di header che dicono poche cose ma tutte decisive: chi ha inviato, quando, in che punto della sequenza e con quale formato. Non c'è connessione, non c'è ritrasmissione, non c'è ordine garantito. RTP è pensato per applicazioni che preferiscono perdere un pacchetto piuttosto che aspettarlo, e che sanno ricostruire la fluidità dal timestamp.

## Obiettivi

- Leggere i dodici byte dell'header RTP campo per campo, in esadecimale.
- Distinguere payload type statico e dinamico e sapere quale clock usa ogni codec.
- Spiegare il ruolo di sequenza, timestamp, SSRC e CSRC.
- Descrivere mixer e translator e il caso della telefonia con eventi.
- Individuare la sessione RTP da indirizzo, porta e SSRC.

## Header RTP in esadecimale

RFC 3550 definisce un header fisso di 12 byte, seguito da un eventuale extension header, dal payload e da padding opzionale. I primi byte sono i più densi: bit di versione, padding, extension, conteggio CSRC, marker e payload type.

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|V=2|P|X|  CC   |M|     PT      |       sequence number         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           timestamp                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           synchronization source (SSRC) identifier            |
+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+
|            contributing source (CSRC) identifiers             |
|                             ....                              |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

| Campo | Bit | Significato |
| --- | --- | --- |
| V | 2 | versione, oggi 2 |
| P | 1 | presenza di padding finale |
| X | 1 | presenza di extension header |
| CC | 4 | numero di CSRC che seguono |
| M | 1 | marker, semantica definita dal profilo |
| PT | 7 | payload type, formato e clock |
| sequence number | 16 | incrementa di 1 per ogni pacchetto, valore iniziale casuale |
| timestamp | 32 | istante di campionamento, unità del clock del payload |
| SSRC | 32 | identificatore della sorgente di sincronizzazione |
| CSRC | 32 ciascuno | sorgenti contribuenti, inserite dal mixer |

Prendiamo un pacchetto vero, con DSCP EF e payload G.711:

```text
b8 60 12 34 00 0a bc de 5f 3a 1c 0d ...
 |  |  |  |     |     |     |
 |  |  |  |     |     |     +-- SSRC 0x5F3A1C0D
 |  |  |  |     |     +-------- timestamp 0x000ABCDE = 703710
 |  |  |  |     +-------------- sequence number 0x1234 = 4660
 |  |  |  +------------------ PT 0x60 & 0x7F = 0, M = 0
 |  |  +----------------- CC = 0, X = 0, P = 0
 |  +------------------- V = 2 (0b10)
 +--------------------- byte DSCP EF (0xB8) nel TOS IP
```

`b8` è il byte DSCP del pacchetto IP, non di RTP: l'header RTP comincia da `60`. Sbagliare offset è l'errore più comune quando si legge un dump con un parser scritto a mano, e il risultato è una sequenza plausibile ma inventata.

## Payload type e clock

RFC 3551 fissa un insieme di payload type statici per audio e video e lascia a 96-127 quelli dinamici, i cui abbinamenti vengono negoziati in segnalazione (SDP). Il clock del timestamp non è sempre la frequenza di campionamento: per G.722 è 8000 Hz anche se il codec lavora a 16000 Hz, per i telefoni-evento telefonico (RFC 4733) il clock è 8000 Hz e i valori indicano i millisecondi.

| PT | Formato | Clock (Hz) | Uso tipico |
| --- | --- | --- | --- |
| 0 | G.711 PCMU | 8000 | voce US e molte reti aziendali |
| 8 | G.711 PCMA | 8000 | voce Europa |
| 9 | G.722 | 8000 | voce a banda larga |
| 13 | Comfort noise | 8000 | CN quando il parlante tace |
| 18 | G.729 | 8000 | voce compressa a 8 kbps |
| 96-127 | dinamici | dichiarato in SDP | Opus, H.264, H.265, SILK |
| 34, 31 | H.263 | 90000 | video |

Il clock del video è quasi sempre 90 kHz, ereditato da MPEG, così un frame a 30 fps avanza di 3000 unità. Per un pacchetto audio a 20 ms con clock 8000 Hz l'incremento è 160; con Opus a 48 kHz, 960. Il ricevitore ricostruisce il tempo solo se conosce il clock, e per questo SDP lo dichiara sempre.

```python
# Timestamp atteso per il prossimo pacchetto audio, clock 8000 Hz
clock = 8000
ptime_ms = 20
step = clock * ptime_ms // 1000        # 160
ts_atteso = (ts_precedente + step) & 0xFFFFFFFF
print(ts_atteso)                       # il timestamp RTP è a 32 bit e gira
```

## SSRC, CSRC e l'incontro tra sorgenti

L'SSRC identifica una sorgente di sincronizzazione all'interno di una sessione RTP: un telefono che manda tre flussi (audio G.711, video H.264, evento DTMF) usa tre SSRC distinti, ciascuno con il proprio spazio di sequenza e timestamp. Il valore è scelto casualmente, con collisioni risolte dall'interruzione del flusso più recente.

Il CSRC compare nei pacchetti che attraversano un mixer. Un mixer riceve più flussi, ne fa una somma (o una selezione audio) e riscrive sequenza e timestamp come un unico flusso, mettendo gli SSRC originali nell'elenco CSRC. Un translator invece cambia formato o cifratura senza ricostruire la sincronizzazione e lascia SSRC e timestamp coerenti.

```text
mixer:   A(audio) + B(audio) -[mix]- C (SSRC nuovo, CSRC = A, B)
translator:   A(audio) -[transcode]- A' (SSRC e timestamp invariati)
```

Il campo M ha significato definito dal profilo: nel profilo audio/video segnala un punto importante nel flusso, nei profili di conferenza spesso l'ultimo pacchetto di un frame o l'inizio di un periodo di attività, nel profilo T.140 l'inizio di un testo. Un ricevitore non deve dedurre l'ordine dei frame dal solo marker: il tempo viene dal timestamp.

## Sessioni e multiplexing

Una sessione RTP è una coppia di indirizzi di trasporto più un SSRC, e per UDP si usa una porta pari con RTCP sulla porta dispari successiva. Il viceversa è il caso che rompe: mettere audio e video nella stessa sessione e distinguerli per PT è esplicitamente sconsigliato da RFC 3550, perché tre spazi (clock, sequenza, report) non possono condividerli due media differenti.

```bash
# Analisi di un flusso reale con tshark
tshark -r capture.pcap -Y rtp -T fields \
  -e ip.src -e udp.srcport -e rtp.ssrc -e rtp.seq -e rtp.timestamp -e rtp.p_type
```

I browser moderni spesso trasportano più media su un'unica porta con il bundle: il meccanismo è descritto in RFC 7656 e non elimina la regola di base, cioè un SSRC per sorgente e una sessione con una sola media logica, perché i report RTCP restano per SSRC.

## Errori comuni

- **Leggere l'header RTP a partire dal byte del TOS IP**: `0xB8` è il DSCP, l'header comincia da `0x60`; il disallineamento produce PT e sequenza inventati.
- **Assumere che il timestamp parta da zero o sia "i secondi"**: il valore iniziale è casuale e la sua unità è il clock del payload, non i millisecondi.
- **Scegliere un SSRC predicibile**: RFC 3550 raccomanda valori casuali, perché un SSRC fermo facilita attacchi e collisioni.
- **Mettere audio e video nella stessa sessione**: rompe i report RTCP per SSRC e rende incomprensibile la perdita.
- **Confondere clock rate e sample rate**: G.722 a 16 kHz ha clock 8000, i telefoni-evento avanzano in millisecondi, e se il ricevitore presume male il jitter è falsato.

## In sintesi

RTP è un header minimo che porta identificazione, ordine e tempo. Il PT sceglie formato e clock, la sequenza misura la perdita, il timestamp ricostruisce il tempo, l'SSRC identifica la sorgente. Mixer e translator modificano l'elenco e la sorgente in modo diverso, e ogni medium vive in una sessione con il proprio spazio.

## Fonti

- [RTP: A Transport Protocol for Real-Time Applications — RFC 3550](https://www.rfc-editor.org/rfc/rfc3550.html)
- [RTP Profile for Audio and Video Conferences — RFC 3551](https://www.rfc-editor.org/rfc/rfc3551.html)
- [A Taxonomy of Semantics and Mechanisms for Real-Time Transport Protocol (RTP) Sources — RFC 7656](https://datatracker.ietf.org/doc/html/rfc7656)
- [RTP Payload for DTMF Digits, Telephony Tones and Telephony Signals — RFC 4733](https://www.rfc-editor.org/rfc/rfc4733.html)
- [Guidelines for DiffServ Service Classes — RFC 4594](https://www.rfc-editor.org/rfc/rfc4594.html)
