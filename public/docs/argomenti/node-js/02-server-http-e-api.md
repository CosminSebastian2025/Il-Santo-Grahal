Un server HTTP in Node si può scrivere in trenta righe con `node:http`, ma un server che sopravvive in produzione richiede streaming corretto del body, limiti dimensionali, timeout, propagazione di `AbortSignal` e strumenti di diagnostica. Questa lezione costruisce un servizio JSON con le sole API stabili della LTS 24, mostrando cosa fa il framework quando lo si usa, e chiude con l'osservabilità: `node:diagnostics_channel`, metriche e test con `node:test`.

## Obiettivi

- Scrivere un server con `node:http` che gestisce routing, parsing del body e status code coerenti.
- Applicare limiti e timeout per proteggere il processo da client lenti o payload abusivi.
- Trasmettere la cancellazione con `AbortSignal` verso I/O asincrono.
- Testare un server in-process con `node:test` su una porta effimera.

## Anatomia di una richiesta con `node:http`

`createServer` riceve `(req, res)` per ogni richiesta. `req` è uno stream leggibile del body, `res` uno stream scrivibile della risposta. Nulla è parsato automaticamente: `req.url` è il percorso con query string, `req.method` è una stringa maiuscola, gli header sono in `req.headers` con nomi in minuscolo.

```js
import { createServer } from "node:http";

const LIMITE_BODY = 64 * 1024; // 64 KiB

async function leggiJson(req) {
  const tipo = req.headers["content-type"] ?? "";
  if (!tipo.startsWith("application/json")) {
    throw Object.assign(new Error("content-type non supportato"), { status: 415 });
  }
  const blocchi = [];
  let totale = 0;
  for await (const blocco of req) {
    totale += blocco.length;
    if (totale > LIMITE_BODY) {
      throw Object.assign(new Error("payload troppo grande"), { status: 413 });
    }
    blocchi.push(blocco);
  }
  return JSON.parse(Buffer.concat(blocchi).toString("utf8"));
}
```

L'iterazione `for await` rispetta la backpressure: se il consumer è più lento, lo stream rallenta la lettura del socket invece di accumulare in memoria. Accumulare blocchi fino a un limite esplicito è la strategia corretta per payload JSON piccoli; per upload grandi si scrive su disco man mano.

| Errore | Status | Quando |
| --- | --- | --- |
| `content-type` non JSON | 415 | header assente o diverso |
| body oltre 64 KiB | 413 | limite superato durante la lettura |
| JSON sintatticamente invalido | 400 | `JSON.parse` lancia |
| corpo mancante per `POST` | 400 | `totale === 0` |
| metodo non gestito | 405 | con header `allow` |
| eccezione non prevista | 500 | log interno, messaggio generico al client |

Il corpo di risposta conviene scriverlo con helper tipizzati: `inviaJson(res, status, dati)` imposta `content-type` e `content-length` e chiude. Le risposte `HEAD` non devono avere body, e le risposte `304` nemmeno.

## Timeout, cancellazione e chiusura ordinata

Un server senza timeout è un server in attesa dello spegnimento: bastano pochi client che aprono la connessione e non inviano dati. In Node 18+ `server.requestTimeout` e `server.headersTimeout` hanno buoni default, ma vanno esplicitati e verificati contro il proxy davanti.

```js
const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/ordini") {
      const ordine = await leggiJson(req);
      // AbortSignal della richiesta: scatta se il client chiude la connessione
      const esito = await salvaOrdine(ordine, { signal: req.signal });
      return inviaJson(res, 201, esito);
    }
    inviaJson(res, 404, { errore: "rotta sconosciuta" });
  } catch (err) {
    const status = err.status ?? 500;
    if (status === 500) console.error(err);
    inviaJson(res, status, { errore: err.message });
  }
});

server.timeout = 0;              // niente timeout di inattività del socket
server.requestTimeout = 15_000;  // tempo massimo per completare la richiesta
server.headersTimeout = 10_000;  // deadline per gli header

server.listen(3000, () => console.log("in ascolto su 3000"));
```

`req.signal` è un `AbortSignal` che diventa `aborted` quando il client interrompe la connessione: passarlo a `fetch`, a query di database o a `fs` permette di annullare il lavoro inutile. `AbortSignal.timeout(ms)` costruisce un segnale che scade da solo, utile per chiamate verso servizi esterni.

La chiusura deve essere ordinata: `server.close()` smette di accettare nuove connessioni e invoca la callback quando quelle attive terminano. Serve un timeout di sicurezza, perché una connessione keep-alive può restare aperta a lungo.

```js
async function spegni(signum) {
  console.log(`ricevuto ${signum}, chiusura`);
  server.closeIdleConnections(); // chiude i keep-alive inattivi
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref(); // uscita forzata dopo 10 s
}
process.on("SIGTERM", spegni);
process.on("SIGINT", spegni);
```

## Osservabilità e test in-process

Sapere perché un endpoint è lento richiede misure nel codice. `diagnostics_channel` permette di pubblicare eventi interni senza dipendenze e senza costo rilevante quando nessuno ascolta: la timeline HTTP di Node pubblica già eventi per richieste e socket.

```js
import diagnostics_channel from "node:diagnostics_channel";

const canale = diagnostics_channel.channel("api.ordini");
canale.subscribe((msg) => console.log("metric", msg));

function salvaOrdine(ordine, opzioni) {
  const t0 = performance.now();
  return db.insert(ordine, opzioni).finally(() => {
    canale.publish({ durataMs: performance.now() - t0, items: ordine.items.length });
  });
}
```

I test usano `node:test` e `node:assert/strict`, ascoltano su porta `0` per evitare conflitti e chiudono il server nel `t.after`.

```js
import { test } from "node:test";
import assert from "node:assert/strict";

test("POST /ordini rifiuta payload oltre il limite", async (t) => {
  const server = creaServer();
  await new Promise((ok) => server.listen(0, ok));
  t.after(() => server.close());
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/ordini`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: "x".repeat(70_000) }),
  });
  assert.equal(res.status, 413);
  assert.match(await res.text(), /grande/);
});
```

La porta effimera (`listen(0)`) è la scelta giusta nei test: il sistema assegna una porta libera e il test non collide con altri processi.

## Errori comuni

- **Fonti delle richieste senza limiti**: leggere tutto il body con `req.on("data")` senza contatore significa che un client può esaurire la memoria del processo.
- **Rispondere due volte**: chiamare `res.end()` e poi lanciare un errore nel `catch` produce `ERR_STREAM_WRITE_AFTER_END` e log confusi; controllare `res.headersSent` prima di inviare un errore.
- **Passare il testo della stack trace al client**: 500 con `err.message` interno espone percorsi e dettagli; loggarli su stderr, restituire un identificativo di correlazione.
- **Non gestire `SIGTERM`**: l'orchestratore uccide il processo dopo il grace period e le richieste in corso falliscono.
- **Usare `localhost` nei test**: su Windows e macOS risolve anche su IPv6, e un server in ascolto solo su IPv4 non risponde; usare `127.0.0.1`.
- **Trascurare la compressione e `content-length`**: risposte senza `content-length` e senza `transfer-encoding` vengono lette fino alla chiusura, rallentando i client.

## In sintesi

`node:http` espone gli stream del protocollo senza magia: si legge il body con limiti, si valida il `content-type`, si scrive JSON con helper unici e si mappano gli errori su status code stabili. Timeout espliciti e cancellazione tramite `AbortSignal` proteggono il processo, e la chiusura ordinata con `closeIdleConnections` evita di troncare richieste. Per l'osservabilità bastano `diagnostics_channel` e `node:test` con porta effimera: nessuna dipendenza per il primo server. Il laboratorio mette insieme questi pezzi in un servizio completo con persistenza su file e test di contratto.

## Fonti

- [Node.js API - HTTP](https://nodejs.org/api/http.html)
- [Node.js API - File system](https://nodejs.org/api/fs.html)
- [Node.js API - Test runner](https://nodejs.org/api/test.html)
- [Node.js API - Events](https://nodejs.org/api/events.html)
