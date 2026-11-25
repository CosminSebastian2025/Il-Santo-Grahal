In questo modulo impari a misurare il VoIP invece di descriverlo. Ogni anomalia vocale lascia una traccia: un codice di risposta SIP, un campo nel report RTCP, una riga di un registro, un pacchetto catturato fuori tempo. Gli strumenti che servono sono pochi e gratuiti, ma vanno usati nella sequenza giusta, perché un packet capture spesso non può rispondere alla domanda iniziale: chi sta parlando con chi.

## Obiettivi

- Leggere un dialogo SIP completo e riconoscere dove si rompe una chiamata.
- Interpretare i contatori RTCP che descrivono perdita e jitter sul percorso reale.
- Isolare in laboratorio il piano media simulando un flusso RTP di prova.
- Raccogliere tracce con `tcpdump` e interpretarle con `tshark` e Wireshark.
- Tradurre i sintomi uditivi in ipotesi verificabili e non in ipotesi da manuale.

## Diagnosticare la segnalazione

Il primo sospetto non è mai il codec: è la negoziazione. Una chiamata che non si stabilisce produce un codice di risposta, e ogni famiglia indica un colpevole diverso. Il 400 punta a una richiesta malformata, il 404 a un utente che il server non conosce, il 488 a un SDP che non piace al destinatario, il 500 a un difetto del server, il 603 a un utente che ha rifiutato. I 180 e i 183 riguardano l'avviso di chiamata: il primo è squillo, il secondo è audio precoce con SDP anticipato.

| Sintomo | Cosa guardare | Ipotesi frequente |
| --- | --- | --- |
| la chiamata resta in squillo | `180` senza `200 OK` | il callee non ha registrato o il contatto è irraggiungibile |
| audio solo in una direzione | SDP offerta e risposta, `c=` e `m=` | falso NAT, direzione `sendonly` non voluta |
| voce metallica o singhiozzo | report RTCP, jitter | congestione o Wi-Fi instabile |
| la chiamata cade dopo 30 minuti | `Session-Expires` | timer di sessione senza refresh |
| registro VoIP che compila da solo | registro delle registrazioni | credenziali rubate o scanner automatici |

Il timer di sessione di RFC 4028 è un caso tipico: un `Session-Expires` non rinnovato chiude la chiamata anche se i media sono perfetti, perché il BYE arriva dalla logica e non dall'audio. RFC 6076 definisce anche metriche end-to-end per SIP, utili a chi confronta venditori con numeri misurabili.

## Leggere i numeri RTCP

RTCP viaggia accanto a RTP e riporta, ogni pochi secondi, quanti pacchetti sono stati persi e quanto jitter ha visto il ricevente. Sono i numeri veri della voce, non quelli del link. Il calcolo di jitter di RFC 3550 è incrementale e va letto come stima del rumore di temporizzazione.

```python
# Stima del jitter interarrival secondo RFC 3550, in unità di timestamp.
# R = istante di arrivo locale, S = timestamp RTP del mittente.
def jitter_passaggio(j_prec: float, r_prev: float, r_now: float,
                     s_prev: int, s_now: int, clock: int) -> float:
    d = ((r_now - r_prev) * clock) - (s_now - s_prev)  # differenza di spaziatura
    return j_prec + (abs(d) - j_prec) / 16.0           # media esponenziale 1/16
```

Con `clock` a 8000 per G.711 e un intervallo di 20 ms, un `d` di 160 significa "arrivato esattamente in tempo". Se il valore oscilla oltre i 30 ms per un tratto, il buffer del ricevente accumula ritardo e la voce diventa a tratti ritardata.

```bash
# Cattura RTP di prova verso una porta locale, per misurare in isolamento
# senza dipendere dal PBX o dal provider
ffmpeg -re -f lavfi -i "sine=frequency=440:sample_rate=8000" \
       -c:a pcm_mulaw -ar 8000 -ac 1 -f rtp rtp://127.0.0.1:40000
```

```text
Output di tshark su una cattura RTP (frammento):
  10:12:31.020  RTP Payload    172  PT=0, SSRC=0x1a2b3c4d, Seq=1043, TS=166880
  10:12:31.052  RTP Payload    172  PT=0, SSRC=0x1a2b3c4d, Seq=1044, TS=167040
  10:12:31.084  RTP Payload    172  PT=0, SSRC=0x1a2b3c4d, Seq=1045, TS=167200
```

Qui i 32 ms tra un pacchetto e l'altro, contro i 20 ms prodotti da `ffmpeg`, dicono che qualcuno sta assorbendo il flusso a raffiche: il jitter buffer del ricevente, o il sistema operativo. La prova si ripete con il ricevente spento: se i pacchetti continuano ad arrivare, il problema è a monte.

## Strumenti di cattura e lettura

`tcpdump` acquisisce, `tshark` filtra e riassume, Wireshark mostra il dialogo e ricostruisce i flussi. La sequenza vincente è catturare poco, con un filtro preciso, e leggere dopo.

```bash
# 1) cattura della sola segnalazione, per vedere chi parla e chi registra
sudo tcpdump -i eth0 -s 0 -w sip.pcap 'udp port 5060 or tcp port 5061'

# 2) riassunto dei dialoghi in formato testuale, senza GUI
tshark -r sip.pcap -Y sip -T fields -e ip.src -e ip.dst \
       -e sip.Method -e sip.Status-Code -e sip.CSeq.method

# 3) separare i media e leggere i contatori RTCP
tshark -r media.pcap -q -z rtp,streams
```

La wiki di Wireshark dedica una pagina al dissector SIP, e la documentazione dei campi `sip.*` indica i nomi esatti da usare nei filtri. Kamailio espone un modulo `siptrace` che replica i messaggi verso un collector HEP, così la diagnosi funziona anche quando Wireshark non è sulla macchina giusta; è la strada normale quando il problema è su una tratta che non puoi raggiungere.

Il limite pratico è la privacy: una cattura contiene identità, numeri e credenziali nei messaggi di autenticazione. Nelle reti con dati personali la cattura va dichiarata, limitata nel tempo e conservata con le stesse regole di un registro telefonico: senza questa disciplina il supporto ottiene prove che non può usare.

## Esercizi

1. Con una cattura del registro di esempio, elenca i dialoghi per `Call-ID` e trova quello che non ha mai ricevuto un 200 OK.
2. Simula con `ffmpeg` 12 pacchetti RTP e verifica con `tshark` che il timestamp cresca di 160 per pacchetto.
3. Ricalcola il jitter RFC 3550 a mano su tre pacchetti dove il secondo arriva 15 ms dopo il previsto.
4. Trasforma tre sintomi uditivi in altrettante catture da fare, indicando filtro e campo da guardare.
5. Cattura 200 registrazioni SIP e costruisci una lista di sorgenti che, senza autenticarsi, tentano INVITE verso l'esterno.
6. Spiega perché un 200 OK non implica che l'audio sia passato, e quale pacchetto bisogna cercare dopo.

<details>
<summary>Soluzione</summary>

1. Si raggruppa per `sip.Call-ID`, si segna per ogni gruppo la sequenza `INVITE -> 100 -> 180 -> 200 -> ACK`; i gruppi senza `200 OK` sono di solito chiamate in squillo mai risposte o fallite con `404` o `488`.

2. `ffmpeg` emette G.711 a 8 kHz; con intervallo 20 ms ogni pacchetto porta 160 campioni, quindi `TS(n+1) - TS(n) = 160`. Con `tshark -T fields -e rtp.timestamp` si verifica aritmeticamente.

3. Il primo `D` è zero perché manca un riferimento precedente; il secondo vale `+120` unità (15 ms per 8000 Hz); con `1/16` la stima dopo un passo è circa `7,5` unità, cioè meno di 1 ms: un singolo ritardo non deve cambiare il buffer.

4. Per un "singhiozzo" la cattura è RTP filtrata per SSRC con `-z rtp,streams` per vedere perdita e jitter; per "voce metallica" si confronta il codec negoziato con quelli offerti; per "una via sola" si leggono `c=` e `m=` nelle due SDP e la direzione `sendonly`/`recvonly`.

5. Si filtra `sip.Method == "INVITE"` e si esclude tutto ciò che ha `sip.auth` o un `401` prima del `200`; le sorgenti con INVITE diretti e senza sfida sono candidati a colloquio non autorizzato, da verificare sulle regole del PBX.

6. Il 200 OK conclude la negoziazione ma non garantisce che i media siano raggiungibili: un NAT asimmetrico o un `c=` sbagliato produce un 200 OK e un flusso RTP muto. Dopo il 200 si cercano i pacchetti RTP verso la porta dell'SDP e si controlla che l'SSRC atteso sia presente.

</details>

## Errori comuni

- **Catturare tutto e sperare**: pacchetti enormi e media cifrati rendono il file illeggibile, conviene catturare per piano con filtri minimi.
- **Affidarsi all'aggettivo "lento"**: senza un numero di jitter o di perdita il supporto rimanda sempre la colpa alla rete dell'altro.
- **Leggere lo status SIP senza seguire il Call-ID**: un 404 apparente può essere il retry di un dialogo già chiuso.
- **Ignorare RTCP perché viaggia su un'altra porta**: le statistiche di ricezione sono l'unica fonte indipendente dal server.
- **Provare solo in orario di ufficio**: i difetti di dimensionamento emergono proprio nei minuti di punta.

## In sintesi

La diagnosi VoIP è un imbuto: prima la segnalazione, poi i media, poi la rete. I codici SIP dicono subito se l'utente esiste, se il SDP è accettabile e se la chiamata è stata autorizzata; RTCP dice quanto male va il percorso; `tcpdump`, `tshark` e Wireshark trasformano i sospetti in prove. Se un solo passaggio manca, la conclusione resta un racconto e non un dato.

## Fonti

- [RFC 3261 - SIP: Session Initiation Protocol](https://www.rfc-editor.org/rfc/rfc3261.txt)
- [RFC 3550 - RTP, con RTCP e il calcolo del jitter](https://www.rfc-editor.org/rfc/rfc3550.txt)
- [RFC 4028 - Session Timers in SIP](https://www.rfc-editor.org/rfc/rfc4028.txt)
- [Wireshark wiki - SIP](https://gitlab.com/wireshark/wireshark/-/wikis/SIP)
- [Kamailio - modulo siptrace](https://www.kamailio.org/docs/modules/stable/modules/siptrace.html)
