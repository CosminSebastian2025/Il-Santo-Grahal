QUIC è un protocollo di trasporto generico su UDP che porta affidabilità, controllo di congestione, cifratura e multiplexing in un unico livello. L'obiettivo è togliere al kernel la gestione del trasporto per poterla evolvere, e pagare un solo handshake invece di due. In questa lezione impari come si apre una connessione, come gli stream indipendenti evitano l'head-of-line blocking, e perché HTTP/3 è definito sulle stesse basi.

## Obiettivi

- Distinguere connessione e stream QUIC e leggere gli identificatori dei frame.
- Descrivere l'handshake TLS 1.3 integrato e l'uso di 0-RTT.
- Spiegare perché stream indipendenti eliminano l'head-of-line blocking del livello di trasporto.
- Collocare HTTP/3 nella numerazione dei protocolli e riconoscerne il version negotiation.
- Riconoscere i casi in cui QUIC peggiora le prestazioni rispetto a TCP.

## Una connessione, molte stream

QUIC (RFC 9000) gira sopra UDP ma non è UDP: è un trasporto completo con numeri di sequenza, ritrasmissioni, controllo di flusso per connessione e per stream, e controllo di congestione. La connessione è identificata da un Connection ID lungo fino a 20 byte, non dalla coppia di indirizzi, così sopravvive al cambio di IP passando per esempio dalla rete mobile al Wi-Fi.

Dentro la connessione vivono stream bidirezionali e unidirezionali, identificate da un numero. Ogni pacchetto trasporta uno o più frame: `STREAM`, `ACK`, `MAX_DATA`, `MAX_STREAM_DATA`, `CRYPTO`, `PING`, `PATH_CHALLENGE`. Il numero di stream e i dati in volo sono limitati dai frame `MAX_STREAMS` e `MAX_STREAM_DATA`, che i peer possono aumentare nel tempo. Le stream unidirezionali con numero più basso sono riservate all'handshake e ai flussi di controllo di HTTP/3.

| Livello di riferimento | Dove sta | Framing |
| --- | --- | --- |
| HTTP/3 | applicazione | frame HTTP su ogni stream |
| QPACK | applicazione | compressione degli header |
| QUIC | trasporto, sopra UDP | frame di trasporto |
| TLS 1.3 | integrato in QUIC | messaggi handshake cifrati |
| UDP / IP | rete | datagrammi |

La differenza decisiva rispetto a HTTP/2 su TCP è questa: TLS non è sopra il trasporto, è dentro di esso. I messaggi TLS viaggiano nei frame `CRYPTO`, con proprie soglie di ritrasmissione.

## Handshake integrato e 0-RTT

Il primo datagramma contiene il pacchetto `Initial`: il client invia il `ClientHello`, che in TLS 1.3 include le chiavi pubbliche di key share, e il server risponde combinando la risposta TLS con quella di trasporto in un solo round trip. Una nuova connessione è quindi pronta dopo un RTT, contro i due o tre di TCP più TLS.

Con un biglietto di sessione valido il client può inviare dati applicativi nel pacchetto iniziale: è la modalità `0-RTT`. Questi dati sono però vulnerabili agli attacchi di replay, perché un attaccante può ritrasmettere un pacchetto catturato senza essere il client, e RFC 9001 raccomanda di limitarli a richieste idempotenti. Il server li accetta solo dopo aver verificato il biglietto con il segreto di resumption emesso in precedenza.

```python
# Pseudocodice di accesso: il pacchetto arriva prima di ogni stato
# di connessione, quindi il parsing non deve mai fidarsi del frame
def on_initial(packet, sconosciuto):
    dcid = packet.dc_id                       # 0..20 byte, visibile
    chiavi = derive_initial_keys(dcid, packet.version)  # RFC 9001
    frame = decifra(packet, chiavi)
    if "CRYPTO" in frame:
        consegna_client_hello(frame.crypto_offset, frame.crypto_data)
    return rispondi_con_server_hello(frame)
```

Un `Initial` può arrivare da chiunque e per qualunque Connection ID, quindi un server deve proteggere la generazione degli handshake dall'esaurimento di risorse, tipicamente con una `Retry` che fa pagare al client un vero indirizzo prima di allocare stato.

Il Connection ID consente anche la migrazione: il client che cambia IP continua la connessione senza rihandshake, e `PATH_CHALLENGE` e `PATH_RESPONSE` validano il nuovo percorso. Finché non è validato, il server non può inviare più di un multiplo dei byte ricevuti, per limitare l'amplificazione.

## Stream indipendenti e head-of-line blocking

Con TCP un byte perso blocca la consegna di tutti i successivi, anche di altre risposte HTTP multiplexate su HTTP/2: è l'head-of-line blocking del trasporto. In QUIC ogni stream ha un proprio flusso di sequenza; una perdita ferma solo la stream che contiene quel byte.

```c
/* Offset per stream: un buco su una stream non blocca le altre */
struct quic_stream { uint64_t id; uint64_t rx_off; uint64_t fin_off; };

static int pronta(const struct quic_stream *s) {
    return s->buffer_da == s->rx_off;  /* arrivo contiguo */
}
```

Restano però le perdite condivise: un pacchetto può contenere frame di stream diverse, e la congestione limita la finestra di tutta la connessione, quindi una richiesta lenta rallenta anche le altre. L'head-of-line blocking è molto ridotto rispetto a HTTP/2 su TCP, non eliminato in assoluto.

## HTTP/3 e numerazione delle versioni

HTTP/3 è la mappatura HTTP su QUIC, definita in RFC 9114. Ogni richiesta e risposta occupa una stream e i campi di controllo viaggiano su stream dedicate all'inizio della connessione. La compressione degli header è QPACK (RFC 9204), pensata per una tabella dinamica che non blocchi tra loro le stream, mentre le priorità sono trattate in RFC 9218.

La negoziazione avviene in due passaggi. Il server annuncia HTTP/3 con l'header `Alt-Svc` e il client tenta i collegamenti successivi su UDP/443; il protocollo applicativo è scelto con ALPN durante l'handshake TLS con il valore `h3`. Non esiste upgrade da TCP: le implementazioni fanno fallback a HTTP/2 quando UDP è bloccato.

QUIC ha un numero di versione nell'header di ogni pacchetto, indipendente dal numero di RFC: v1 vale `0x00000001`, e una versione successiva, QUIC v2, è definita in RFC 9369. Chi riceve una versione sconosciuta risponde con un `Version Negotiation` packet in chiaro.

## Errori comuni

- **Considerare QUIC una semplice evoluzione di UDP**: è un trasporto completo che usa UDP solo come veicolo per attraversare il NAT e i firewall esistenti.
- **Usare 0-RTT per richieste che modificano stato**: i dati possono essere riprodotti, quindi le richieste non idempotenti vanno spedite solo dopo l'handshake completo.
- **Credere che QUIC elimini ogni head-of-line blocking**: riduce il blocco tra stream, ma la congestione resta condivisa da tutta la connessione.
- **Aspettarsi un upgrade da HTTP/1.1 a HTTP/3**: la negoziazione passa da `Alt-Svc` e ALPN, non dall'header `Upgrade`.
- **Aprire uno stato di connessione a ogni pacchetto `Initial`**: senza `Retry` un attaccante può esaurire memoria con pacchetti non verificati.

## In sintesi

QUIC sposta affidabilità, cifratura e multiplexing in un unico trasporto sopra UDP, con handshake TLS 1.3 dentro i frame `CRYPTO`. Una connessione ha più stream indipendenti, quindi una perdita ferma una stream e non tutte, e il Connection ID permette di migrare il percorso. 0-RTT riduce la latenza ma va riservato alle richieste idempotenti. HTTP/3 è la mappatura HTTP di QUIC, negoziata via ALPN e `Alt-Svc`.

## Fonti

- [QUIC Transport (RFC 9000)](https://www.rfc-editor.org/rfc/rfc9000.html)
- [Using TLS to Secure QUIC (RFC 9001)](https://www.rfc-editor.org/rfc/rfc9001.html)
- [HTTP/3 (RFC 9114)](https://www.rfc-editor.org/rfc/rfc9114.html)
- [QUIC Working Group](https://quicwg.org/)
- [Cloudflare - The Road to QUIC](https://blog.cloudflare.com/the-road-to-quic/)
