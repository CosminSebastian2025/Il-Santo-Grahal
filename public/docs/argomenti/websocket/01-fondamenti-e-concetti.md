WebSocket è il protocollo che permette a un client e a un server di scambiarsi messaggi in entrambe le direzioni sulla stessa connessione TCP, per tutto il tempo della sessione. Nasce nel 2011 con la RFC 6455 per colmare un limite di HTTP: una richiesta produce una risposta e la connessione si chiude, quindi il server non può avvisare il browser quando accade qualcosa. Questa lezione chiarisce quando WebSocket è la scelta giusta, come funziona l'apertura della connessione e quali parti dell'API si usano in pratica.

## Obiettivi

- Distinguere i due canali di una connessione WebSocket, testo e binario, e la loro semantica.
- Riconoscere i casi d'uso in cui HTTP o Server-Sent Events bastano e WebSocket non serve.
- Descrivere l'handshake HTTP Upgrade e il suo esito, incluso il codice `101`.
- Usare l'API JavaScript `WebSocket` con gestione di eventi, invio e chiusura.
- Collegare i concetti ai principali scenari applicativi: chat, notifiche, giochi, telemetria.

## Dal polling alla connessione persistente

Prima di WebSocket le alternative erano due, entrambe povere. Il polling breve invia una richiesta HTTP ogni pochi secondi: il server non può anticipare nulla, ogni richiesta ripete header e cookie, e la latenza media è metà dell'intervallo. La long polling tiene aperta una richiesta finché il server ha dati: migliora la latenza ma consuma una connessione per client. WebSocket elimina il divario: dopo l'upgrade, entrambe le parti inviano frame senza richieste e senza header per messaggio, con un overhead di pochi byte.

| Caratteristica | HTTP polling | Server-Sent Events | WebSocket |
| --- | --- | --- | --- |
| Direzione | client verso server | server verso client | bidirezionale |
| Header per messaggio | sì | no | no |
| Formato | testo/JSON | testo UTF-8 | testo o binario |
| Riconnessione automatica | a carico del client | prevista dai browser | a carico dell'applicazione |
| Uso tipico | dati poco frequenti | feed e notifiche | chat, collaborazione, giochi |

La regola pratica: se al server basta parlare e il client invia solo richieste sporadiche, Server-Sent Events è più semplice; se servono messaggi frequenti in entrambe le direzioni lungo la sessione, WebSocket è la scelta naturale.

## L'handshake: da HTTP a WebSocket

Una connessione WebSocket inizia come una richiesta HTTP `GET` con header specifici:

```http
GET /chat HTTP/1.1
Host: esempio.it
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://esempio.it
```

Se il server accetta, risponde `101 Switching Protocols` con il valore `Sec-WebSocket-Accept`, ottenuto facendo l'hash SHA-1 della chiave del client concatenata a una stringa fissa, codificato in base64. Da quel punto la connessione non è più HTTP: i byte che seguono sono frame WebSocket sulla stessa connessione TCP. Due conseguenze pratiche: il proxy in mezzo deve supportare l'upgrade, e l'header `Origin` è l'unica informazione di provenienza disponibile per il server, quindi i controlli di autorizzazione vanno fatti a mano.

Se il server non riconosce l'upgrade, la risposta è un normale errore HTTP e il browser genera un evento `error`. Il WebSocket moderno viaggia sopra TLS con lo schema `wss://` come HTTP usa `https://`.

## Frame, messaggi e comandi di controllo

Il protocollo lavora a due livelli: i frame, unità trasportate dal protocollo, e i messaggi, unità logiche dell'applicazione. Un messaggio può essere frammentato in più frame, ma l'applicazione lo vede come un blocco continuo. Il primo byte di ogni frame dichiara il tipo tramite un opcode:

| Opcode | Tipo | Significato |
| --- | --- | --- |
| `0x0` | continuazione | parte successiva del messaggio frammentato |
| `0x1` | text | payload UTF-8, stringa |
| `0x2` | binary | payload binario arbitrario |
| `0x8` | close | inizio della chiusura, con codice di stato |
| `0x9` | ping | richiesta di `pong` |
| `0xA` | pong | risposta a `ping` (o keepalive) |

I frame di controllo `ping`, `pong` e `close` non possono essere frammentati e hanno payload di al massimo 125 byte. Il `ping`/`pong` rileva connessioni morte: il browser non espone un metodo per inviare `ping`, ma il server può farlo. La RFC 6455 impone inoltre che i frame dal client al server siano mascherati con una chiave casuale, per evitare che infrastrutture intermedie reinterpretino i byte come comandi.

## L'API del browser

```js
const socket = new WebSocket("wss://esempio.it/chat", ["chat.v1"]);

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ type: "join", room: "generale" }));
});

socket.addEventListener("message", (event) => {
  const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
  console.log("ricevuto", data);
});

socket.addEventListener("close", (event) => {
  console.log("chiuso", event.code, event.reason);
  if (event.code !== 1000) retryWithBackoff();
});
```

L'oggetto `WebSocket` ha quattro eventi: `open`, `message`, `error`, `close`, e la proprietà `readyState` con gli stati `CONNECTING` (0), `OPEN` (1), `CLOSING` (2), `CLOSED` (3). `send` accetta stringhe, `Blob`, `ArrayBuffer` o `ArrayBufferView`: il browser sceglie l'opcode. Il costruttore accetta un secondo argomento opzionale con i protocolli: il server ne sceglie uno, esposto in `socket.protocol`. I cookie viaggiano con l'handshake, quindi l'autenticazione a sessione funziona; i token in query string finiscono nei log, meglio mandarli come sottoprotocollo o nel primo messaggio.

Il metodo `close(code, reason)` invia un frame `close` con un codice consentito: `1000` per chiusura normale, `1001` per partire, `1002` per errore di protocollo, `1003` per tipo non supportato, range `4000`–`4999` per codici applicativi. Un codice fuori standard o una `reason` oltre 123 byte generano una `SyntaxError`.

## Dove entra nella realtà

Una chat trasmette messaggi brevi e frequenti: la connessione persistente paga. Una dashboard di telemetria riceve campioni ogni secondo per decine di client: la parsimonia di header conta. Un gioco in tempo reale usa il canale binario per pacchetti compatti. Invece un feed di notifiche con interazione solo REST è più semplice con Server-Sent Events. Scegliere WebSocket significa accettare un protocollo stateful: server orizzontali, bilanciamento, riconnessione e scala diventano compiti dell'applicazione.

## Errori comuni

- **Usare WebSocket per ogni richiesta**: una REST con POST è più semplice; un socket stateless non aggiunge nulla se la latenza non è un problema.
- **Fidarsi dell'evento `open` senza timeout**: con una rete bloccata l'evento può non arrivare mai; imposta un timer e chiudi la connessione.
- **Ignorare i codici di chiusura**: senza distinguere `1000` da `1006` non puoi decidere se riconnetterti.
- **Inviare prima dell'`open`**: `send` in stato `CONNECTING` lancia un'eccezione; accoda i messaggi o attendi l'evento.
- **Autenticare con un token nell'URL**: finisce nei log e nella cronologia; usa cookie, sottoprotocollo o primo messaggio.

## In sintesi

WebSocket apre una connessione TCP tramite un handshake HTTP che diventa persistente, poi scambia frame testuali e binari in entrambe le direzioni con overhead minimo. La RFC 6455 definisce opcode, mascheramento, ping e codici di chiusura; il browser espone una piccola API a eventi. Sceglilo quando i messaggi sono frequenti e bidirezionali, e accetta la responsabilità che uno stato lungo il tempo porta con sé.

## Fonti

- [MDN - The WebSocket API (WebSockets)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [MDN - WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 6455 - The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [RFC 7692 - Compression Extensions for WebSocket](https://datatracker.ietf.org/doc/html/rfc7692)
