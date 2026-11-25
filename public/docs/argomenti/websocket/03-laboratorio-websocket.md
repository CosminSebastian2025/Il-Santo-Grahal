In questo laboratorio costruisci una stanza di chat in tempo reale completa: un server WebSocket in Node.js che autentica il client, gestisce le stanze, inoltra i messaggi e tiene traccia degli utenti; un client browser che si riconnette, mostra lo stato della connessione e non duplica i messaggi. L'obiettivo non è la chat bella, ma il comportamento corretto di un socket: handshake controllato, heartbeat, chiusura pulita, backoff. Serve Node.js 20 o superiore e un browser moderno; niente framework esterni oltre a `ws`.

## Obiettivi

- Realizzare un server WebSocket con `ws` che rifiuta le connessioni non autorizzate all'handshake.
- Gestire stanze, broadcast e stato in memoria senza perdite.
- Implementare heartbeat con `ping`/`pong` e chiusura dei client inattivi.
- Scrivere un client con riconnessione a backoff esponenziale e identificativi dei messaggi.
- Verificare il comportamento con strumenti di rete e casi negativi.

## Passo 1 - Preparare il progetto

```bash
mkdir chat-lab && cd chat-lab
npm init -y
npm pkg set type=module
npm i ws
```

Crea `server.js` e `public/index.html`. Il server servirà anche i file statici, così eviti un secondo processo e le complicazioni di CORS sull'handshake. Per la verifica manuale degli header userai `curl` e gli strumenti di sviluppo del browser.

## Passo 2 - Il server: autenticazione nell'handshake

```js
// server.js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";

const sessions = new Map([["token-demo", { id: "u-1", name: "Ada" }]]);
const rooms = new Map();

const http = createServer(async (req, res) => {
  if (req.url === "/") {
    const html = await readFile(new URL("./public/index.html", import.meta.url), "utf8");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(html);
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true });

http.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, "http://localhost");
  const user = sessions.get(url.searchParams.get("token"));
  const originOk = req.headers.origin === "http://localhost:3000";

  if (url.pathname !== "/ws" || !user || !originOk) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    return socket.destroy();
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.user = user;
    wss.emit("connection", ws, req);
  });
});

http.listen(3000, () => console.log("http://localhost:3000"));
```

Tre scelte deliberate. `noServer: true` con la gestione manuale di `upgrade` permette di rifiutare la connessione prima dello switch di protocollo, restituendo un errore HTTP leggibile invece di un socket aperto e poi chiuso. Il token in query string compare nei log: qui è accettabile solo per il laboratorio; in produzione usa cookie di sessione o un sottoprotocollo, e fai il controllo di `Origin`. Nel ramo di `upgrade` non serve mai `socket.end()` dopo `destroy()`.

## Passo 3 - Stanze, broadcast e heartbeat

```js
// server.js (continua)
const MAX_BUFFERED = 1024 * 1024;

function broadcast(room, payload, except) {
  for (const client of rooms.get(room) ?? []) {
    if (client === except) continue;
    if (client.bufferedAmount > MAX_BUFFERED) {
      client.close(1013, "slow consumer");
      continue;
    }
    client.send(JSON.stringify(payload));
  }
}

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    if (raw.length > 8 * 1024) return ws.close(1009, "too large");
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return ws.close(1003, "json"); }

    if (msg.type === "join" && typeof msg.room === "string") {
      for (const [name, set] of rooms) set.delete(ws);
      if (!rooms.has(msg.room)) rooms.set(msg.room, new Set());
      rooms.get(msg.room).add(ws);
      ws.room = msg.room;
      ws.send(JSON.stringify({ type: "welcome", room: msg.room, me: ws.user.name }));
      broadcast(msg.room, { type: "presence", room: msg.room, count: rooms.get(msg.room).size });
      return;
    }

    if (msg.type === "chat" && ws.room && typeof msg.text === "string") {
      const event = { id: randomUUID(), type: "chat", room: ws.room, from: ws.user.name, text: msg.text.slice(0, 500), at: Date.now() };
      broadcast(ws.room, event);
    }
  });

  ws.on("close", () => {
    if (ws.room) rooms.get(ws.room)?.delete(ws);
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);
```

L'heartbeat segue il consiglio della documentazione di `ws`: si marca il client come vivo a ogni `pong`, si manda un `ping` ogni 30 secondi e si chiude in modo brusco chi non ha risposto entro il ciclo. Senza questa parte, un client disconnesso male resta in memoria e riceve messaggi inutili. Il controllo su `bufferedAmount` evita che un client lento faccia crescere la coda di invio senza limite. Il limite sul payload e la `try/catch` sul JSON chiudono la connessione con codici coerenti invece di crashare il processo.

## Passo 4 - Il client con riconnessione

```html
<!-- public/index.html (script principale) -->
<script>
const PROTO = location.protocol === "https:" ? "wss" : "ws";
let socket, attempt = 0, seen = new Set();

function connect() {
  socket = new WebSocket(`${PROTO}://${location.host}/ws?token=token-demo`);
  socket.addEventListener("open", () => { attempt = 0; socket.send(JSON.stringify({ type: "join", room: "generale" })); });
  socket.addEventListener("message", ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id && seen.has(msg.id)) return;
    if (msg.id) seen.add(msg.id);
    render(msg);
  });
  socket.addEventListener("close", ({ code }) => {
    if (code === 1000 || code === 1008) return;
    const delay = Math.min(30_000, 500 * 2 ** attempt++);
    setTimeout(connect, delay + Math.random() * 500);
  });
}
connect();
</script>
```

Il backoff triplica in pratica rispetto a un retry fisso: cresce a ogni fallimento e si azzera al primo `open`. `seen` deduplica i messaggi per identificativo, proteggendo dal caso in cui il server ritrasmetta dopo una riconnessione. Il client non si riconnette su `1000` e `1008`: la chiusura normale o un rifiuto esplicito non migliorano con un altro tentativo.

## Verifica

- `curl -i -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" -H "Origin: http://localhost:3000" "http://localhost:3000/ws?token=token-demo"` restituisce `101` e `Sec-WebSocket-Accept`.
- Lo stesso comando con token errato o `Origin` diverso restituisce `401`.
- Due schede aperte sulla stanza ricevono entrambe i messaggi; un messaggio inviato da una compare nell'altra in pochi millisecondi.
- Disattivando la rete dal pannello Network, la scheda riprova con intervalli crescenti e rientra nella stanza alla riattivazione.
- Inviando un JSON malformato la connessione si chiude con `1003` e il server resta in piedi.

## Esercizi

Aggiungi una cronologia degli ultimi 50 messaggi per stanza, inviata dopo il `join`, e verifica che la deduplica del client non nasconda i messaggi vecchi: gli identificativi devono arrivare prima del rendering. Poi misura la latenza con `ping`/`pong` applicativi e confrontala con la latenza di rete.

## Errori comuni

- **Gestire l'upgrade con `wss.handleUpgrade` senza controllo preliminare**: l'errore diventa un `error` sul client, senza un codice HTTP utile nei log.
- **Nessun heartbeat**: i client fantasma restano nelle stanze e gonfiano la memoria.
- **Retry senza jitter**: tutti i client riconnettono nello stesso istante dopo un riavvio e saturano il server.
- **Usare `ws.send` su un client `CLOSING`**: lancia un errore che può abbattere il processo; controlla `readyState` o incapsula il broadcast.
- **Tenere l'elenco delle stanze duplicato fra server e client**: lo stato valido è quello del server, il client deve accettarlo.

## In sintesi

Un laboratorio WebSocket solido è fatto di poche parti: rifiuto controllato nell'upgrade, stanze con pulizia alla chiusura, heartbeat e limiti di coda sul server, backoff e deduplica sul client. Il resto è applicazione: formato dei messaggi, cronologia, autorizzazioni per stanza.

## Fonti

- [ws - a WebSocket client and server for Node.js](https://github.com/websockets/ws)
- [MDN - Writing WebSocket servers](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers)
- [MDN - WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 6455 - The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
