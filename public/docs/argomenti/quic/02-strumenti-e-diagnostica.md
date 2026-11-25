QUIC è interessante perché è implementato nello spazio utente, quindi si può misurare, osservare e aggiornare senza riavviare il sistema operativo. Il prezzo è che quasi tutto il traffico è cifrato e i tool tradizionali non lo capiscono. Questa lezione mette insieme i comandi per riconoscere QUIC e HTTP/3, una piccola implementazione minimale in Python con la libreria `aioquic`, il tuning del buffer UDP e l'uso di `qlog` per leggere gli eventi interni di una connessione.

## Obiettivi

- Riconoscere QUIC e HTTP/3 con `curl` e con gli strumenti di rete del sistema.
- Avviare un server HTTP/3 locale con `aioquic` e interrogarlo dalla riga di comando.
- Riconoscere i limiti pratici: UDP, firewall, amplificazione e cicli di vita della stream.
- Abilitare l'HTTP/3 in nginx e mantenerne il fallback verso TCP.
- Raccogliere e leggere un file `qlog` per capire dove si perde tempo.

## Riconoscere QUIC sulla rete

L'indizio più diretto è la porta: un servizio HTTP/3 ascolta UDP 443. In rete, `ss -lunp` e `ss -lntp` mostrano separatamente i listener UDP e TCP, e la presenza di entrambi su 443 indica che il servizio parla sia HTTP/3 sia HTTP/2.

```bash
ss -lunp '( sport = :443 )'   # listener UDP: candidati QUIC
ss -lntp '( sport = :443 )'   # listener TCP: fallback di solito H2

# curl con HTTP/3 esplicito, senza fallback silenzioso
curl -sS --http3-only -o /dev/null -w '%{http_version} %{http_code}\n' https://www.cloudflare.com

# senza --http3-only curl prova HTTP/3, poi torna a H2/H1.1
curl -sS -o /dev/null -w '%{http_version}\n' https://www.google.com
```

`curl -V` deve elencare `HTTP3` tra le feature; se manca, la build non ha `ngtcp2` o `quiche`. Il flag `--http3-only` rende visibile il fallimento invece di nasconderlo, ed è la scelta giusta quando si verifica se una rete lascia passare UDP 443.

A livello di pacchetti, QUIC si riconosce solo all'inizio: `Initial` ha un header visibile con flag, numero di versione e Connection ID. Dopo il primo scambio tutto è cifrato, quindi uno sniffer mostra datagrammi UDP incomprensibili. Per questo nelle reti aziendali il blocco di UDP 443 non è visibile nei log applicativi: il client fa semplicemente fallback e l'analista deve sapere che sta guardando TCP.

| Segnale | Come si osserva | Interpretazione |
| --- | --- | --- |
| UDP 443 aperta | `ss -lunp` | servizio QUIC in ascolto |
| `HTTP3` in `curl -V` | `curl -V` | client in grado di negoziare |
| `Alt-Svc: h3` | header di risposta | l'origine annuncia HTTP/3 |
| versione `3` | `curl -w '%{http_version}'` | risposta arrivata su QUIC |
| niente UDP | firewall o NAT | fallback a TCP |

L'header `Alt-Svc` è il meccanismo con cui un server annuncia endpoint alternativi: il client memorizza il valore e prova l'endpoint nella richiesta successiva, non nella corrente. Un TTL breve (`ma=86400`) invita il client a ricontrollare periodicamente.

Il buffer UDP è l'altra leva di base. QUIC in user space non gode del buffer autoregolato di TCP, quindi un buffer troppo piccolo perde datagrammi in caso di burst e fa crescere le ritrasmissioni. Servono `net.core.rmem_max` e `wmem_max` di qualche centinaio di kilobyte, come indicano le guide delle implementazioni.

## Un server HTTP/3 minimale

La libreria `aioquic` implementa QUIC e HTTP/3 in Python, con un esempio client e server pronti. Serve per sperimentare in locale: certificato self-signed, server su UDP e client che accetta il certificato.

```bash
python -m venv .venv && . .venv/bin/activate
pip install aioquic

# server HTTP/3 su localhost:4433 con il certificato di esempio del pacchetto
python -m aioquic.asyncio.server \
  --certificate aioquic/examples/certificate.crt \
  --private-key aioquic/examples/certificate.key \
  --quic-log logs aioquic/examples/http3_server.py

# client: scarica / e accetta il certificato self-signed
python -m aioquic.asyncio.client localhost 4433 / -o out.html --ca-certs aioquic/examples/certificate.crt
```

Il parametro `--quic-log` scrive un file `qlog` per connessione nella directory indicata, senza dover modificare il codice. Il client dell'esempio permette di motivare un errore tipico: dopo aver inviato una richiesta su una stream, la stream è chiusa e scrivere di nuovo sullo stesso oggetto fallisce. Ogni richiesta HTTP/3 apre una stream e la chiude, quindi la gestione del ciclo di vita è parte dell'applicazione.

```python
from aioquic.asyncio.protocol import QuicConnectionProtocol
from aioquic.h3.connection import H3Connection

class Proto(QuicConnectionProtocol):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self.h3 = H3Connection(self._quic)

    def quic_event_received(self, event):
        # eventi di stream, non di pacchetto: un evento può unire
        # dati di più frame e di più pacchetti consecutivi
        for ev in self.h3.handle_event(event):
            if ev.__class__.__name__ == "HeadersReceived":
                print("richiesta", ev.stream_id)
```

Il codice mostra il punto di aggancio: il protocollo applicativo riceve eventi dal layer QUIC e li consegna a HTTP/3 con `handle_event`, che restituisce gli eventi interpretati.

## Diagnosi con qlog

`qlog` è un formato JSON di eventi che quasi tutte le implementazioni sanno produrre. Il file racconta handshake, perdite, RTT e frame ricevuti, elemento per elemento, cosa che i log applicativi non possono fare perché il trasporto è cifrato.

```bash
# servizio con HTTP/3: le due listen sulla stessa porta
grep -n "listen 443" /etc/nginx/conf.d/*.conf
curl -sS --http3-only -o /dev/null -w 'h3: %{http_version} %{http_code}\n' https://app.esempio.it/
curl -sS --http2   -o /dev/null -w 'h2: %{http_version} %{http_code}\n' https://app.esempio.it/
```

Due richieste, una forzata su HTTP/3 e una su HTTP/2, verificano il doppio percorso. Per abilitare il primo in nginx servono il modulo `ngx_http_v3_module` e una direttiva `listen 443 quic reuseport;` accanto alla `listen 443 ssl;`. Se la prima richiesta fallisce e la seconda riesce la catena funziona ma QUIC è bloccato; se falliscono entrambe il problema è più in basso o nell'applicazione.

Con qlog conviene cercare tre cose nell'ordine: il tempo tra `initial` e `handshake_done` (un RTT lento o un `Retry` racconta una rete ostile), gli eventi `packet_lost` raggruppati per percorso, e il completamento della stream principale. Un handshake veloce seguito da ritrasmissioni eccessive indica congestione, non applicazione.

## Errori comuni

- **Costruire `curl` senza HTTP/3 e fidarsi del risultato**: `curl -V` è la prima verifica, altrimenti `--http3-only` fallisce per ragioni di client e non di rete.
- **Interpretare il fallback come guasto**: QUIC è progettato per degradare a TCP, quindi un `1.1` o `h2` non è sempre un errore.
- **Tenere un buffer UDP minuscolo**: le perdite appaiono come ritrasmissioni e il sintomo è una lentezza inspiegabile.
- **Scrivere su una stream chiusa**: in HTTP/3 ogni richiesta ha la sua stream, e riutilizzarla genera errori applicativi.
- **Aspettarsi un upgrade in-place da HTTP/2**: l'annuncio arriva con `Alt-Svc` e le nuove connessioni sono su UDP, non sulla connessione corrente.

## In sintesi

QUIC si riconosce dalla porta UDP 443 e da `Alt-Svc`, e `curl -V` decide cosa possiamo misurare. `aioquic` offre un server e un client completi per provare in locale, con l'evento `StreamDataReceived` come punto di aggancio tra trasporto e applicazione. nginx abilita HTTP/3 con il modulo dedicato e mantiene il fallback TCP. Il tuning del buffer UDP e i file `qlog` sono le due leve che trasformano una sensazione di lentezza in un dato.

## Fonti

- [QUIC Transport (RFC 9000)](https://www.rfc-editor.org/rfc/rfc9000.html)
- [QUIC Recovery (RFC 9002)](https://www.rfc-editor.org/rfc/rfc9002.html)
- [nginx - ngx_http_v3_module](https://nginx.org/en/docs/http/ngx_http_v3_module.html)
- [curl - manual](https://curl.se/docs/manpage.html)
- [QUIC Working Group](https://quicwg.org/)
