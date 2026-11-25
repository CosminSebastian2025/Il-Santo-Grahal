WebTransport è l'API browser che espone qualcosa di più di un WebSocket sulle reti moderne: stream affidabili multipli e datagram inaffidabili sopra una connessione QUIC, con handshake TLS 1.3 e nessun blocco in testa di riga tra flussi diversi. Dove una webcam, un canale di chat e posizioni di gioco viaggiano insieme, questa distinzione è la differenza tra un'app che regge e una che si impunta al primo pacchetto perso.

## Obiettivi

- Distinguere stream bidirezionali, stream unidirezionali e datagram e sceglierli in base al carico.
- Descrivere l'handshake WebTransport-over-HTTP/3 e il ruolo dell'header `protocol`.
- Aprire una sessione con l'API JavaScript e riconoscere gli stati `connecting`, `connected`, `closed`.
- Capire perché WebTransport non è una sostituzione automatica di WebSocket.
- Leggere la compatibilità reale dei browser con e senza fallback.

## Il modello di trasporto

WebTransport non definisce un nuovo protocollo di rete: è un livello applicativo su QUIC, mappato su HTTP/3, che riusa la connessione QUIC già aperta verso l'origine. Da HTTP/3 eredita la cifratura obbligatoria TLS 1.3 e la resistenza alla censura tramite l'aspetto di traffico HTTP normale; da QUIC eredita il controllo di congestione, la migrazione di percorso e la multiplexazione senza il blocco in testa di riga tipico di TCP.

| Primitive | Affidabilità | Ordine | Analogia | Uso tipico |
| --- | --- | --- | --- | --- |
| stream bidirezionale | completa | per stream | socket TCP | request/response, trasferimento file |
| stream unidirezionale | completa | per stream | pipe a senso unico | log, download, invio di metadati |
| datagram | nessuna | nessuno | UDP | posizioni, input, frame parziali |
| stream di controllo | completa | unica sequenza | canale di segnalazione | chiusura, errori di sessione |

La tabella spiega la scelta di progetto: mai mandare una posizione di gioco su uno stream, perché un pacchetto perso bloccherebbe i successivi fino al ritrasmesso; mai mandare un asset su un datagram, perché non esiste alcun meccanismo di ritrasmissione. La raccomandazione di progetto è dimensionare i datagram sotto il limite di una MTU tipica (1200 byte per il payload UDP di QUIC) e usare gli stream per ogni cosa che debba arrivare completa.

Due parametri arrivano dal server nel `WebTransport-Capsule` durante l'handshake: il numero massimo di stream bidirezionali concorrenti e il numero massimo di stream unidirezionali. Sono limiti di sessione, non di connessione, e sono competitivi: ogni stream aperto consuma uno slot fino a chiusura.

## Handshake e URL

`new WebTransport(url)` apre una richiesta HTTP/3 `CONNECT` verso un URL `https://...`. La risposta deve essere `2xx` e includere l'header `sec-webtransport-http3-draft: draft02`; senza di esso il browser chiude la sessione. Nell'header `protocol` il client dichiara un nome di subprotocollo: senza un valore concordato, l'endpoint può rifiutare la connessione o terminare lo stream già dopo il primo byte.

```javascript
const transport = new WebTransport("https://example.com/gioco", {
  serverCertificateHashes: [],   // solo per certificati self-signed in dev
  protocol: "gioco-v1",
});
await transport.ready;            // risolve quando la sessione è aperta
const scrittore = transport.datagrams.writable.getWriter();
await scrittore.write(new Uint8Array([1, 2, 3]));
```

Il campo `serverCertificateHashes` è documentato dal draft come unica via per bypassare la PKI fidata dal sistema: è pensato per certificati effimeri con chiave ECDSA P-256 valida per un massimo di 14 giorni, e in produzione Chrome lo accetta solo se il certificato è di quel tipo. Non è un'alternativa al TLS: è una mitigazione per sviluppo locale e simili.

`transport.ready` risolve quando l'handshake è concluso; `transport.closed` è una promise che rigetta quando la sessione cade, con `WebTransportError` che porta `streamErrorCode` e `source` (`"session"` o `"stream"`). Le sessioni inoltre si chiudono da sole quando il network change invalida il percorso senza migrazione riuscita, quindi ogni client deve prevedere una riconnessione.

| Stato | Come si osserva | Cosa fare |
| --- | --- | --- |
| connecting | `transport.ready` pendente | disabilitare i controlli di invio |
| connected | `ready` risolta | aprire stream o scrittori con pigrizia |
| draining | `transport.draining` non null | avviare una nuova sessione |
| closed | `transport.closed` rigettata | riconnettersi con backoff |

## Datagram e stream in codice

Un datagram è un `Uint8Array` senza identificativo di mittente: se più produttori scrivono sullo stesso `datagrams.writable`, il ricevente non può separarli. Conviene quindi un solo scrittore per flusso logico, oppure un header applicativo nel primo byte. Sul lato ricevente, `transport.datagrams.readable` è un `ReadableStream`: la lettura va tenuta in un loop asincrono e non deve fermare l'event loop.

```javascript
const letto = transport.datagrams.readable.getReader();
(function ricevi() {
  letto.read().then(({ value, done }) => {
    if (done) return;
    gestisciPosizione(value);   // nessuna garanzia di arrivo o di ordine
    ricevi();
  });
})();

const stream = await transport.createBidirectionalStream();
const out = stream.writable.getWriter();
await out.write(new TextEncoder().encode("hello\n"));
```

La sessione deve sopravvivere alla richiesta che l'ha aperta: se la risposta lato server non mantiene lo `WebTransportSession` vivo, la connessione viene chiusa e sul client arriva solo un `closed` rigettata. Per la chiusura ordinata si scrive su uno stream e si invoca `transport.close({ closeCode, reason })`, poi si attende `closed`: chiudere bruscamente provoca un abort per i peer.

## Errori comuni

- **Trattare i datagram come TCP**: chi assume ordine o consegna riceve uno stato applicativo vecchio senza accorgersene; ogni datagram va reso versionato con un contatore.
- **Aprire uno stream per carattere**: gli stream hanno un costo di creazione e un limite concorrente, quindi i messaggi corti vanno accodati su un solo stream.
- **Chiudere il transport quando la pagina resta aperta**: il server non deve chiudere la sessione alla fine della richiesta CONNECT, altrimenti il client perde il canale appena dopo il primo invio.
- **Dimenticare il fallback**: Safari non espone ancora l'API, quindi senza un percorso WebSocket l'app si limita a non partire.
- **Usare self-signed senza hash del certificato**: `QUIC_PROTOCOL_ERROR` senza dettagli; in sviluppo serve `serverCertificateHashes` con il certificato corretto, non solo la chiave.

## In sintesi

WebTransport mette a disposizione della pagina il meglio di QUIC: più flussi indipendenti e datagram ottimi per lo stato che si aggiorna. Il modello è asincrono e basato su stream WHATWG, con un handshake HTTP/3 che riusa l'infrastruttura esistente. Scegliere la primitiva giusta per ogni carico, dimensionare i datagram, gestire `draining` e prevedere un fallback sono le quattro decisioni che determinano se la tecnologia aiuta o complica.

## Fonti

- [W3C - WebTransport specification (Editor's Draft)](https://w3c.github.io/webtransport/)
- [W3C - WebTransport (Working Draft)](https://www.w3.org/TR/webtransport/)
- [MDN - WebTransport API](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport_API)
- [IETF - WebTransport over HTTP/3](https://datatracker.ietf.org/doc/html/draft-ietf-webtrans-http3)
