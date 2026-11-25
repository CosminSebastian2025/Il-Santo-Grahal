Un servizio in Bun si scrive con pochi pezzi: `Bun.serve` fa da server HTTP, `bun:sqlite` fa da database e `Bun.password` da libreria di hashing. In questa lezione costruisci le fondamenta di un'API di ordini con rotte dichiarative, persistenza embeddata con statement preparati, WebSocket e chiusura ordinata. Nessuna dipendenza npm: solo runtime.

## Obiettivi

- Scrivere un'applicazione con `Bun.serve`, `routes` dichiarative e `fetch` di fallback.
- Collegare un database SQLite con schema, statement preparati e attesa in modalità WAL.
- Esprimere errori di dominio con status code coerenti e `Response.json`.
- Gestire WebSocket nello stesso server e una chiusura ordinata con `server.stop`.

## Rotte dichiarative in `Bun.serve`

L'opzione `routes` riceve un oggetto che associa pattern a `Response` o a funzioni. Il match è sul metodo quando la chiave usa la sintassi `"POST /percorso"`; i parametri `:nome` finiscono in `req.params`, le wildcard `*` in `req.params["*"]`.

```ts
const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  routes: {
    "/api/salute": new Response("ok"),
    "GET /api/ordini/:id": (req) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return Response.json({ errore: "id non valido" }, { status: 400 });
      const ordine = db.query("select * from ordini where id = ?").get(id);
      return ordine ? Response.json(ordine) : Response.json({ errore: "non trovato" }, { status: 404 });
    },
    "POST /api/ordini": async (req) => creaOrdine(await req.json()),
    "/api/*": () => Response.json({ errore: "rotta sconosciuta" }, { status: 404 }),
  },
  error(error) {
    console.error(error);
    return Response.json({ errore: "errore interno" }, { status: 500 });
  },
});
```

Tre differenze rispetto a `node:http`: non c'è un oggetto `res` da gestire, il framework normalizza tutto in `Response`; il parsing JSON è `await req.json()`, che lancia una `SyntaxError` su body malformato; `error()` centralizza le eccezioni non gestite, incluso il timeout della richiesta. Le rotte vengono risolte con un router nativo prima della `fetch` di fallback, quindi una rotta statica non paga il costo di un match scritto in JavaScript.

| Caso | Risposta | Nota |
| --- | --- | --- |
| body non JSON | 400 | `req.json()` lancia, intercettare o usare `req.text()` |
| corpo oltre 1 GB (default) | 413 | `maxRequestBodySize` nell'opzione di `serve` |
| rotta non esistente | 404 | dalla `fetch` o dalla wildcard |
| parametro fuori formato | 400 | validare `req.params.id` prima della query |
| eccezione non catturata | 500 | `error()` |

## Persistenza con `bun:sqlite`

`bun:sqlite` impila SQLite dentro il processo: nessun addon da compilare, nessun server da gestire. `Database` è sincrono come `better-sqlite3`, ma il costo è basso e sotto i limiti del file basta. Per concorrenza con altri processi `PRAGMA journal_mode = WAL` è obbligatorio.

```ts
import { Database } from "bun:sqlite";

const db = new Database("data/app.db", { create: true });
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA busy_timeout = 5000");
db.run(`CREATE TABLE IF NOT EXISTS ordini (
  id INTEGER PRIMARY KEY,
  cliente TEXT NOT NULL,
  totale INTEGER NOT NULL CHECK (totale >= 0),
  creato TEXT NOT NULL
)`);

const inserisci = db.prepare(
  "insert into ordini (cliente, totale, creato) values ($cliente, $totale, $creato) returning *"
);
const leggi = db.prepare("select * from ordini where id = ?");

const ordine = inserisci.get({ $cliente: "Ada", $totale: 2599, $creato: new Date().toISOString() });
console.log(ordine, leggi.get(ordine.id));
```

`get` restituisce una riga o `null`, `all` un array, `run` un oggetto con `changes` e `lastInsertRowid`. I parametri con nome usano il prefisso `$` e un oggetto le cui chiavi **includono** il prefisso: `{ $cliente: "Ada" }`. Passando `{ cliente: "Ada" }` SQLite non trova il binding e inserisce `NULL`, che con un vincolo `NOT NULL` diventa un errore di vincolo e senza vincolo diventa un dato silenziosamente sbagliato. `INSERT ... RETURNING` evita una query di rilettura. Gli importi in centesimi come interi evitano gli errori di arrotondamento dei float, lo stesso criterio della contabilità.

Un `Database` è un handle sincrono sul file: le query bloccano il thread che le esegue per tutta la durata della scansione. Per tabelle da milioni di righe conviene indicizzare le colonne di filtro (`CREATE INDEX ... ON ordini(cliente)`) e usare `EXPLAIN QUERY PLAN` per verificare che la query non faccia `SCAN`.

## Password, sessioni e chiusura ordinata

`Bun.password` incapsula Argon2id e bcrypt senza moduli nativi. `hash` è asincrono e usa il thread pool, quindi non blocca l'event loop; `verify` ricava i parametri dall'hash salvato.

```ts
const hash = await Bun.password.hash("password-utente", { algorithm: "argon2id", memoryCost: 65536, timeCost: 3 });
if (!(await Bun.password.verify("password-utente", hash))) {
  throw new Error("credenziali errate");
}

process.on("SIGTERM", async () => {
  await server.stop(); // smette di accettare e attende le richieste in corso
  db.close();
  process.exit(0);
});
```

`server.stop()` accetta un timeout in secondi e restituisce una Promise. Chiudere prima il server e poi il database è l'ordine corretto: il contrario produce query su un database chiuso durante le richieste finali. In un container Bun è il gestore del processo, quindi `SIGTERM` arriva direttamente all'event loop.

WebSocket convive con HTTP nello stesso server: un handler in `websocket` e l'upgrade manuale con `server.upgrade(req)`, che restituisce `true` se la richiesta è stata promossa. Se restituisce `false` bisogna rispondere con un errore esplicito (426 Upgrade Required).

```ts
Bun.serve({
  port: 3001,
  fetch(req, server) {
    return server.upgrade(req) ? undefined : new Response("atteso websocket", { status: 426 });
  },
  websocket: {
    open(ws) { ws.subscribe("ordini"); },
    message(ws, msg) { ws.publish("ordini", `eco: ${msg}`); },
    close(ws) { ws.unsubscribe("ordini"); },
  },
});
```

I topic (`subscribe`/`publish`) sono nativi: niente da implementare per il broadcast di gruppo.

## Errori comuni

- **Dimenticare `req.json()` in un `try`**: una richiesta con body malformato produce 500 invece di 400, e il log mostra una stack trace inutile.
- **Usare `lastInsertRowid` senza controllo di tipo**: è `number | bigint`; con tabelle grandi serve gestire il caso `bigint`.
- **Aprire il database senza WAL**: due processi (per esempio un job e il server) vanno in conflitto e producono `SQLITE_BUSY`.
- **Interpolare stringhe nelle query**: un `cliente` con apice rompe la query; usare sempre i parametri o i named parameter.
- **Omettere il `$` nelle chiavi dei named parameter**: `{ cliente: "Ada" }` non fa errore, inserisce `NULL`; con i vincoli `NOT NULL` si vede, senza si salva un dato vuoto.
- **Hashare password con `hashSync` in un loop**: blocca l'event loop per centinaia di millisecondi per richiesta; usare `await Bun.password.hash`.
- **Chiudere il database prima del server**: le richieste in volo falliscono durante lo spegnimento.

## In sintesi

`Bun.serve` con `routes` dichiarative riduce il server a una tabella di caso e risposta, con gestione centralizzata degli errori. `bun:sqlite` in modalità WAL dà persistenza transazionale senza servizi esterni, e gli statement preparati evitano sia SQL injection sia il costo di preparazione per richiesta. `Bun.password` copre Argon2id con API asincrona, i WebSocket vivono nello stesso processo. Il laboratorio mette insieme questi pezzi con test veri e un endpoint di upload su disco.

## Fonti

- [Bun - HTTP server](https://bun.com/docs/runtime/http/server)
- [Bun - SQLite](https://bun.com/docs/runtime/sqlite)
- [Bun - Bun APIs](https://bun.com/docs/runtime/bun-apis)
- [Bun - Test runner](https://bun.com/docs/test)
