In questo laboratorio costruisci `dtrack`, una web app che mostra in tempo reale una posizione 2D: datagram per gli aggiornamenti frequenti, uno stream unidirezionale per il log degli eventi e un canale WebSocket di fallback quando QUIC non passa. Server Node con TLS locale, client con un modulo che espone la stessa interfaccia sui due trasporti.

## Obiettivi

- Avviare un endpoint HTTP/3 con un certificato effimero e un subprotocollo dichiarato.
- Aprire datagram e stream dal browser e verificare l'handshake con Chrome.
- Gestire il caso di rete che blocca UDP con un fallback WebSocket misurato.
- Diagnosticare la connessione con `chrome://net-export` e `getStats()`.

## Passo 0: ambiente e certificato

Serve Node 22 o superiore, Chrome e un `curl` con HTTP/3. Un certificato self-signed usato con `serverCertificateHashes` deve avere chiave ECDSA P-256 e durata sotto i 14 giorni, altrimenti Chrome rifiuta la sessione anche con l'hash corretto.

```bash
openssl ecparam -name prime256v1 -genkey -noout -out chiave.pem
openssl req -new -x509 -key chiave.pem -days 13 -out cert.pem \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"
openssl x509 -in cert.pem -pubkey -noout | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary | base64   # hash per serverCertificateHashes
curl --version | grep HTTP3                   # deve stampare "HTTP3"
```

| Componente | Requisito | Perché |
| --- | --- | --- |
| Node | 22 o superiore | `node:http2` stabile, API QUIC sperimentale |
| Chrome | release recente | implementazione di riferimento |
| OpenSSL | 3.x | chiave P-256 e estensione SAN |
| curl | build con HTTP/3 | prova che QUIC passa |

## Passo 1: server e stream

Il server deve rispondere alla `CONNECT` con l'header `sec-webtransport-http3-draft` e mantenere la sessione viva oltre la richiesta. Lo scheletro sotto mostra il contratto atteso dal client.

```javascript
// server.js (scheletro sul contratto della session API)
import { createWebTransportServer } from "./wt-server.js";

createWebTransportServer({
  cert: "./cert.pem", key: "./chiave.pem", port: 4433,
  subprotocol: "dtrack-v1",
  onSession(sessione) {
    sessione.onDatagram((buf) => {
      const { id, x, y, t } = decodifica(buf);   // header applicativo nel primo byte
      sessione.sendDatagram(ack(id, Date.now()));
    });
    const log = sessione.acceptUnidirectionalStream(); // log verso il client
    setInterval(() => log.write("tick\n"), 1000);
  },
});
```

Il vincolo è che la `CONNECT` termina subito: se il server lascia cadere la sessione dopo il 200, il browser emette `closed` rigettata e il client non vede mai dati. Lo stream unidirezionale non ha conferme: se il client legge in ritardo, QUIC rallenta il mittente per controllo di flusso.

```bash
node server.js
curl -3 -v --http3-only https://localhost:4433/ -k
# deve rispondere 200 o 404, mai "failed to connect"
```

## Passo 2: client con datagram e stream

Il modulo `canale.js` espone una sola interfaccia: all'apertura prova WebTransport con timeout di 2,5 secondi, poi WebSocket. Il payload è `Uint8Array` con un primo byte di tipo.

```javascript
export async function apri(urlWt, urlWs, hashes) {
  if ("WebTransport" in window) {
    const wt = new WebTransport(urlWt, {
      protocol: "dtrack-v1", serverCertificateHashes: hashes,
    });
    try { await conTimeout(wt.ready, 2500); return datagram(wt); } catch {}
  }
  return websocket(urlWs);
}

function datagram(wt) {
  const w = wt.datagrams.writable.getWriter();
  const r = wt.datagrams.readable.getReader();
  return {
    tipo: "webtransport",
    invia: (bytes) => w.write(bytes).catch(() => {}),
    ricevi: (cb) => (async () => {
      for (;;) { const { value, done } = await r.read(); if (done) break; cb(value); }
    })(),
  };
}
```

L'invio deve tollerare il fallimento: `w.write` su una sessione chiusa rigetta, e il `catch` vuoto evita che un datagram perso fermi il loop di gioco. Si scarta ogni stato con `t` inferiore all'ultimo applicato: i datagram arrivano fuori ordine e un `x` vecchio farebbe tornare indietro l'elemento.

| Azione | WebTransport | WebSocket |
| --- | --- | --- |
| apertura | `new WebTransport` + `ready` | `new WebSocket` + `open` |
| stato frequente | datagram con `t` | frame ogni 50 ms con ultimo stato |
| log | stream unidirezionale | messaggi |

## Passo 3: prova del fallback

Il fallback va provato davvero. Due modi: blocco UDP nel firewall (su Windows: `netsh advfirewall firewall add rule name="blocca-udp4433" dir=out protocol=UDP localport=4433 action=block`) oppure disattivare QUIC nel profilo di Chrome. In entrambi i casi il contatore `wt-fallback` deve incrementare e la pagina deve continuare a funzionare.

```javascript
window.dtrack.diagnostica = () => ({
  trasporto: canale.tipo,
  tentativiWt: metriche.tentativiWt,
  fallback: metriche.fallback,
  ultimoErrore: metriche.ultimoErrore,
});
```

Se anche il WebSocket non si connette, il problema è il certificato non fidato per `wss`: quello effimero vale solo per WebTransport con `serverCertificateHashes`.

## Passo 4: diagnosi

Da `chrome://net-export` si avvia la registrazione, si ricarica la pagina, si ferma il log e si apre il file in `https://netlog-viewer.appspot.com/`. Si cercano gli eventi `QUIC_SESSION`, `HTTP3_SESSION` e il `CONNECT` rifiutato. Un pulsante che stampa `getStats()` come JSON è più utile: le chiavi cambiano con la versione di Chrome.

| Avvio con | Errore tipico |
| --- | --- |
| UDP bloccato | `TimeoutError` su `ready` |
| subprotocollo errato | stream chiuso subito |
| chiave non P-256 o certificato scaduto | rifiuto prima del CONNECT |

## Esercizi

1. Aggiungi al datagram un contatore di sequenza a 16 bit e misura la perdita in 30 secondi con un `ping` applicativo.
2. Sposta il log su uno stream bidirezionale con un comando `set-frequenza` e confronta il traffico con la versione unidirezionale.
3. Aggiungi la riconnessione con jitter quando `closed` rigetta per un errore di sessione.
4. Verifica con ChromeDevTools cosa succede se il server smette di inviare datagram per 30 secondi: arriva un `closed` o il client aspetta?

<details>
<summary>Soluzione</summary>

1. Il contatore nel primo byte dopo il tipo permette di calcolare il gap massimo e il numero di buchi in una finestra: `persi = (ultimo - primo + 1) - ricevuti`.

2. Lato server serve `acceptBidirectionalStream`; i comandi vanno avanti e il log torna sullo stesso stream.

3. `delay = min(30000, 500 * 2 ** tentativo) * (0.5 + Math.random())`, con contatore azzerato solo dopo una `ready` stabile da 30 secondi.

4. Se il server non chiude e non c'è un timer di idle, il client resta `connected`: serve un ping applicativo per distinguere silenzio e connessione morta.

</details>

## Errori comuni

- **Considerare il fallback come ridondanza inutile**: è il percorso delle reti aziendali e dei paesi con filtraggio UDP.
- **Nessun timeout su `ready`**: con UDP scartato il `ready` resta pendente e l'app sembra bloccata.
- **Hash del certificato calcolato sulla chiave sbagliata**: l'hash è sullo SPKI DER dell'endpoint, e un `openssl` sbagliato produce un rifiuto indistinguibile da un certificato scaduto.
- **Applicare datagram senza controllare il timestamp**: dopo una riconnessione la posizione resta congelata.
- **Usare solo `wss` nel fallback con certificato self-signed**: il WebSocket non conosce `serverCertificateHashes`, va usato un certificato fidato o si resta senza fallback.

## In sintesi

`dtrack` ha un endpoint HTTP/3 con subprotocollo, un client che sceglie il trasporto con un timeout reale e un fallback verificato. I datagram portano lo stato con il timestamp che lo rende scartabile, lo stream i log. In produzione servono certificato fidato, metriche di fallback e riconnessione con jitter.

## Fonti

- [W3C - WebTransport specification (Editor's Draft)](https://w3c.github.io/webtransport/)
- [IETF - WebTransport over HTTP/3](https://datatracker.ietf.org/doc/html/draft-ietf-webtrans-http3)
- [MDN - WebTransport datagrams](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport/datagrams)
- [GoogleChrome samples - webtransport](https://github.com/GoogleChrome/samples/tree/gh-pages/webtransport)
