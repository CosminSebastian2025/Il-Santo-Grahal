RTP trasporta i media e non sa nulla di come stanno andando. A raccontarlo ci pensa RTCP, il protocollo di controllo che viaggia sulla porta successiva e spedisce rapporti periodici con numeri precisi: quanti pacchetti sono arrivati, quanti mancano, con quale jitter, e a che ora è stato spedito l'ultimo report. Da quei numeri un sistema VoIP ricava la qualità e un browser decide se abbassare il bitrate.

## Obiettivi

- Descrivere i cinque tipi di pacchetto RTCP e la forma compound.
- Leggere un sender report con NTP timestamp, RTP timestamp e conteggi.
- Calcolare perdita, jitter e andata-ritorno da un reception report block.
- Spiegare il meccanismo del bandwidth limit e del back-off.
- Usare la cifratura SRTP per dare riservatezza ai report e al canale.

## Tipi di pacchetto e formato

RTCP non è un protocollo indipendente: viaggia su UDP sulla porta dispari accanto alla porta RTP pari, e i pacchetti si impilano in un unico datagramma compound. Ogni elemento ha un header di 4 byte con versione, padding, conteggio e tipo, più una lunghezza in parole di 32 bit che permette di concatenarli senza separatori.

| PT | Nome | Funzione |
| --- | --- | --- |
| 200 | SR | sender report: statistiche di chi invia e report sui ricevitori |
| 201 | RR | receiver report: solo report sui flussi ricevuti |
| 202 | SDES | item descrittivi, almeno CNAME |
| 203 | BYE | uscita dalla sessione |
| 204 | APP | estensioni applicative |

```text
         sender report (SR)
 0                   1                   2                   3
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|V=2|P|    RC   |   PT=200      |             length            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         SSRC of sender                        |
|               NTP timestamp (64 bit)                          |
|                         RTP timestamp                         |
|                     sender's packet count                     |
|                      sender's octet count                     |
|  SSRC_1 (SSRC of first source)                                |
| fraction lost | cumulative number of packets lost             |
|       extended highest sequence number received               |
|                      interarrival jitter                      |
|                         last SR (LSR)                         |
|                   delay since last SR (DLSR)                  |
```

I contatori SR sono cumulativi: se un report si perde, il successivo contiene ancora il totale, e la differenza tra due report misura l'intervallo anche quando un pacchetto intermedio manca. Questo è il motivo per cui la perdita si calcola come differenza, e perché un singolo report non basta mai a dire se la chiamata va bene adesso.

## Leggere un receiver report

Il blocco di report contiene i campi che un analizzatore mostra come una barra colorata. Proviamo a calcolarli a mano partendo dai nomi che compaiono nei log.

```text
fraction lost = 8 bit          -> perdita nell'ultimo intervallo, precisione grossolana
cumulative lost = 24 bit       -> totale dall'inizio della sessione
extended highest seq = 32 bit  -> 16 bit di ciclo + 16 di sequenza
interarrival jitter = 32 bit   -> in unità del clock del payload
LSR = 32 bit                   -> parte media dell'NTP dell'ultimo SR
DLSR = 32 bit                  -> in 1/65536 di secondo
```

```python
# Perdita nell'intervallo tra due report
def perdita(prev, cur):
    expected = (cur["ext_high"] - prev["ext_high"])      # pacchetti attesi
    lost = cur["cum_lost"] - prev["cum_lost"]            # persi nel periodo
    return 0.0 if expected <= 0 else lost / expected

# Jitter in millisecondi a partire dall'unità del clock
def jitter_ms(jitter_units, clock_hz=8000):
    return jitter_units / clock_hz * 1000
```

Il jitter mostrato nei report non è la differenza tra due arrivi consecutivi, ma lo stimatore ricorsivo della variabilità del ritardo:

```python
# J(i) = J(i-1) + (|D(i-1,i)| - J(i-1)) / 16
# D(i,j) = (Rj - Ri) - (Sj - Si), R istante di arrivo, S timestamp RTP
def aggiorna_jitter(j_prev, r_prev, s_prev, r_cur, s_cur):
    d = (r_cur - r_prev) - (s_cur - s_prev)   # va fatto in aritmetica modulare a 32 bit
    return j_prev + (abs(d) - j_prev) / 16
```

La costante 1/16 è il guadagno dello stimatore che RFC 3550 definisce obbligatorio: un filtro del primo ordine con convergenza ragionevole e un rumore residuo accettabile. Due implementazioni che misurassero in modo diverso non sarebbero confrontabili.

## Andata e ritorno, LSR e DLSR

Il calcolo dell'RTT usa tre numeri che viaggiano tra le due parti. Il ricevitore rilegge dall'ultimo SR l'NTP timestamp, ne prende la metà centrale e la salva in LSR; poi registra quanto tempo è passato da quel momento a quando spedisce il report, in unità di 1/65536 di secondo, e lo mette in DLSR. Il mittente, quando riceve il report all'istante A, calcola A meno LSR meno DLSR e ottiene il tempo che il report ha passato in rete, cioè l'andata e ritorno.

```text
RTT = A - LSR - DLSR

A     = istante di ricezione del report RR
LSR   = (NTP dell'ultimo SR) >> 16, 32 bit centrali
DLSR  = (istante di invio RR - istante ricezione SR) in 1/65536 s
```

Un valore di LSR a zero significa che nessun SR è ancora arrivato: il ricevitore non può misurare l'RTT e il campo va ignorato, non interpretato come zero millisecondi.

## Frequenza e cifratura

RTCP non deve diventare un problema di banda: RFC 3550 raccomanda di dedicarvi il 5% della session bandwidth, con un'ulteriore divisione in cui circa un quarto va a chi invia (1.25% e 3.75% sono i valori suggeriti come default per il profilo audio/video). Ogni partecipante calcola l'intervallo in base al numero di membri, alla media dei pacchetti RTCP inviati e al proprio ruolo di mittente o ricevitore.

```text
C = media_dimensione_rtcp / banda_rtcp_destinata_alla_classe
Tmin = 2.5 s per il primo invio, 5 s dopo
Td = max(Tmin, n * C)          -> n = numero di partecipanti della classe
T  = casuale tra 0.5 e 1.5 * Td, poi diviso per 1.21828
```

Il fattore 1.21828 compensa la convergenza del timer verso un valore sotto la media prevista, e la casualizzazione distribuisce le partenze simultanee. Il primo pacchetto, e ogni invio che segue una collisione di SSRC, ricade nel caso iniziale con il ciclo raddoppiato fino a un limite.Lo stesso canale che rivela perdita e jitter va protetto. SRTP, descritto in RFC 3711, mantiene l'header RTP in chiaro ma cifra payload e informazioni di autenticazione, e definisce un'estensione RTCP cifrata con protezione dell'header. In una rete con più sedi, dove TLS copre solo la segnalazione, un RTCP in chiaro racconta agli ascoltatori chi parla, quando e con quale qualità.

```bash
# Flusso RTCP su una cattura: la porta dispari e i pacchetti tipo 200/201
tshark -r capture.pcap -Y "rtcp" -T fields -e ip.src -e udp.dstport -e rtcp.packet_type -e rtcp.ssrc
```

## Errori comuni

- **Misurare l'RTT senza LSR**: se il campo è zero non c'è stato un SR e ogni sottrazione restituisce un tempo inventato; bisogna aspettare il primo sender report.
- **Interpretare la perdita cumulata come perdita istantanea**: il contatore cresce dall'inizio della sessione, quindi va differenziato tra due report per ottenere la percentuale dell'intervallo.
- **Ignorare il clock del payload nel jitter**: il campo è in unità del clock e un confronto tra 8000 e 90000 senza conversione produce valori in scala diversa.
- **Assumere RTCP in chiaro come inoffensivo**: SR e SDES rivelano SSRC, CNAME, tempi e qualità della chiamata, informazioni preziose per un osservatore.
- **Inviare RTCP a raffica dopo la perdita di un report**: la regola è la media mobile e il back-off, inviare subito tutti i report accumulati viola il limite di banda e peggiora la congestione.

## In sintesi

RTCP chiude il cerchio per RTP: SR e RR raccontano perdita, jitter e RTT con contatori cumulativi, LSR e DLSR permettono la misura dell'andata e ritorno. Il limite di banda RTCP, la randomizzazione e il back-off evitano che il feedback diventi un problema. SRTP protegge il canale, e una lettura corretta dei report è la base di qualsiasi diagnosi VoIP.

## Fonti

- [RTP: A Transport Protocol for Real-Time Applications — RFC 3550, sezioni 6 e 7](https://www.rfc-editor.org/rfc/rfc3550.html)
- [The Secure Real-time Transport Protocol (SRTP) — RFC 3711](https://www.rfc-editor.org/rfc/rfc3711.html)
- [RTP Profile for Audio and Video Conferences — RFC 3551](https://www.rfc-editor.org/rfc/rfc3551.html)
- [Extended RTP Profile for Real-time Transport Control Protocol (RTCP)-Based Feedback — RFC 4585](https://www.rfc-editor.org/rfc/rfc4585.html)
- [Wireshark User's Guide — analisi di flussi RTP e RTCP](https://www.wireshark.org/docs/)
