In questo laboratorio costruisci una piccola applicazione HTTP/3 in Python con `aioquic`, la osservi con `qlog` e la confronti con lo stesso servizio su HTTP/2 per rendere visibili le differenze di latenza e di comportamento sotto perdita. Non serve un server di produzione: serve un contratto misurabile e un metodo per attribuire il tempo a handshake, trasporto o applicazione.

## Obiettivi

- Scrivere un server HTTP/3 che riflette metodo, percorso e header della richiesta.
- Misurare handshake, 0-RTT e tempo alla prima risposta con `curl` e qlog.
- Applicare il controllo di flusso di QUIC rispettando il limite di `MAX_STREAM_DATA`.
- Osservare l'effetto di una perdita con `tc netem` e confrontarlo con un client HTTP/2.
- Verificare i casi di fallback e di server irraggiungibile.

## Il contratto

| Elemento | Scelta | Motivo |
| --- | --- | --- |
| endpoint | `https://localhost:4433/` | locale, nessun DNS necessario |
| `/` | pagina riflessa con header ricevuti | verifica reale della richiesta |
| `/slow` | risposta di 512 KiB a blocchi | misura il controllo di flusso |
| certificato | self-signed con `openssl` | accettato esplicitamente dal client |
| log | qlog in `logs/` | analisi campo per campo |

Il server deve rendere visibile la richiesta e non solo rispondere 200: una pagina che mostra metodo, percorso e header è la parte di verifica che un semplice redirect non offre.

```bash
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -keyout key.pem -out cert.pem -subj "/CN=localhost"
python -m aioquic.asyncio.server \
  --certificate cert.pem --private-key key.pem --quic-log logs \
  aioquic/examples/http3_server.py
```

Il comando avvia il server dell'esempio, che espone una directory come sito statico: nel laboratorio si sostituisce l'handler con uno che riflette la richiesta. `--quic-log logs` scrive un file per connessione, quindi ogni misura ha la sua traccia.

## Server: handler e controllo di flusso

Il punto di aggancio è la classe protocollo: riceve eventi dal layer QUIC, li passa a `H3Connection` e reagisce agli header richiesti per generare la risposta.

```python
import json
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.h3.connection import H3Connection
from aioquic.h3.events import HeadersReceived

class App(QuicConnectionProtocol):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.h3 = H3Connection(self._quic)

    def quic_event_received(self, event):
        for ev in self.h3.handle_event(event):
            if isinstance(ev, HeadersReceived):
                percorso = dict(ev.headers).get(b":path", b"/").decode()
                corpo = json.dumps({"path": percorso, "versione": "h3"}).encode()
                self.h3.send_headers(ev.stream_id, [
                    (b":status", b"200"),
                    (b"content-type", b"application/json"),
                ])
                self.h3.send_data(ev.stream_id, corpo, end_stream=True)
```

L'handler mostra il flusso completo: eventi, parser HTTP/3, risposta. Un errore comune è considerare la richiesta completa all'arrivo dei soli header: con un corpo `POST` i dati arrivano in eventi `DataReceived` separati, e rispondere in anticipo taglia il corpo.

Il controllo di flusso è un limite reale: `MAX_STREAM_DATA` dice quanto il peer può ricevere su una stream e `MAX_DATA` quanto in totale. Per `/slow` conviene generare a blocchi e attendere gli aggiornamenti, invece di una `send_data` da 512 KiB che supera la finestra iniziale.

```python
# l'handler non deve inviare più del limite corrente della stream
# finché il client non alza la finestra con MaxStreamDataReceived
def residuo(self, stream_id) -> int:
    return self._quic.get_stream_max_data(stream_id) - self._quic.get_stream_pending_data(stream_id)
```

Le finestre iniziali sono transport parameters dell'handshake: troppo piccole penalizzano il throughput, troppo grandi spostano il problema sulla memoria del ricevente.

## Misure, perdita e confronto

Il confronto da fare è tra lo stesso contenuto su HTTP/3 e su HTTP/2: nginx può ascoltare entrambi e `curl` sceglie la versione. Per un'applicazione Python senza HTTP/2 si usa `nghttp2` o un server locale che serva gli stessi byte.

```bash
# prima risposta: con e senza dati 0-RTT
curl -sS --http3-only -o /dev/null -w 'h3: %{http_version} %{time_appconnect} %{time_total}\n' https://localhost:4433/ -k
curl -sS --http2     -o /dev/null -w 'h2: %{http_version} %{time_appconnect} %{time_total}\n' https://localhost:8443/ -k

# perdita dell'1% sul loopback, in entrambe le direzioni
sudo tc qdisc add dev lo root netem loss 1%
curl -sS --http3-only -o /dev/null -w 'h3 loss: %{time_total}\n' https://localhost:4433/slow -k
sudo tc qdisc del dev lo root
```

Con `netem` la perdita è continua, mentre quella reale arriva a raffiche. I numeri servono a confrontare le due versioni sulla stessa macchina: su loopback l'RTT è quasi nullo e il vantaggio di QUIC emerge meno.

Per vedere il resumed, ripeti due volte nello stesso processo: la seconda richiesta usa il biglietto e permette di osservare 0-RTT. `time_appconnect` indica quando TLS è pronto, e in QUIC coincide con la fine dell'handshake.

## Esercizi

1. Aggiungi l'endpoint `/slow` con 512 KiB e verifica se il client riceve tutto: cosa succede se invii tutto in una sola `send_data`?
2. Raccogli un qlog per una connessione completa e indica il tempo tra `initial` e `handshake_done`.
3. Forza una `Retry` e spiega quale campo cambia prima del `handshake_done`.
4. Confronta `time_appconnect` di un primo collegamento e di uno ripreso con 0-RTT.
5. Servi lo stesso contenuto su HTTP/2 e HTTP/3 e confronta le misure con `netem` attivo.
6. Inventa un test che distingua un fallback a TCP da un errore applicativo.

<details>
<summary>Soluzione</summary>

1. Una `send_data` da 512 KiB supera la finestra iniziale e il flusso viene trattenuto fino agli aggiornamenti. L'approccio corretto è inviare a blocchi e attendere gli eventi `MaxStreamDataReceived`.

2. Il tempo tra `initial` e `handshake_done` sul loopback è di pochi millisecondi; su Internet si avvicina a un RTT. Un valore molto più alto indica un `Retry` o una catena di ritrasmissioni.

3. La `Retry` contiene un nuovo token che il client deve ripetere nel nuovo `Initial`. Il server rimanda così la creazione di stato a un client che ha dimostrato di avere quell'indirizzo, ed è la difesa contro l'amplificazione.

4. Con 0-RTT la risposta può arrivare nello stesso giro del `ClientHello`, quindi `time_appconnect` è minore. La differenza si misura su RTT ragionevoli, non su loopback.

5. La tabella deve avere le stesse righe per protocollo e le stesse condizioni di perdita. Il confronto dipende dal numero di risorse: un singolo oggetto grande non mostra il vantaggio di QUIC quanto una pagina con molti file. Nei file qlog, `packet_lost` conta le ritrasmissioni e `max_stream_data` il limite imposto al mittente.

6. Un test che usa `--http3-only` deve fallire se il server non è raggiungibile su UDP, mentre una richiesta senza il flag deve restituire 200 via TCP. Se anche `--http3-only` restituisce 200, la build di `curl` non ha HTTP/3 e la misura è priva di senso.

</details>

## Errori comuni

- **Confondere la risposta ai soli header con la richiesta completa**: il corpo arriva in eventi successivi e chiudere la stream taglia il `POST`.
- **Ignorare il controllo di flusso**: una scrittura grande viene trattenuta o rifiutata e sembra un errore di trasporto.
- **Misurare su loopback e trarre conclusioni su Internet**: senza RTT il vantaggio di QUIC è sottostimato.
- **Dimenticare `-k` o `--cacert` con un certificato self-signed**: l'handshake fallisce e l'errore sembra del protocollo.
- **Riavviare il server tra due misure di resumed**: il segreto del biglietto cambia e il 0-RTT non viene mai osservato.

## In sintesi

Un laboratorio QUIC credibile ha un server che riflette la richiesta, un log qlog e una misura ripetibile. Controllo di flusso e ciclo di vita delle stream sono le due differenze pratiche da gestire nel codice. I test negativi sono quelli che escludono il fallback silenzioso.

## Fonti

- [QUIC Transport (RFC 9000)](https://www.rfc-editor.org/rfc/rfc9000.html)
- [QUIC Recovery (RFC 9002)](https://www.rfc-editor.org/rfc/rfc9002.html)
- [HTTP/3 (RFC 9114)](https://www.rfc-editor.org/rfc/rfc9114.html)
- [nginx - ngx_http_v3_module](https://nginx.org/en/docs/http/ngx_http_v3_module.html)
- [curl - manual](https://curl.se/docs/manpage.html)
