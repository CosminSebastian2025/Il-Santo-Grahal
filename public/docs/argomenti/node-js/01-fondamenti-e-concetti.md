Node.js è il runtime JavaScript più diffuso sul server: prende il motore V8 di Chrome, gli aggiunge accesso a file, rete e processi, e lo esegue fuori dal browser. Nel novembre 2026 la linea LTS attuale è la 24.x (con la 26.x in arrivo come prossima LTS), quindi questa lezione usa API stabili della 24 e segnala dove una funzione richiede una versione recente. Capire architettura, ciclo di eventi e sistema dei moduli è ciò che distingue un server che regge il carico da uno che si blocca al primo file letto.

## Obiettivi

- Descrivere l'architettura di Node: V8, libuv, binding nativi e thread pool.
- Distinguere codice sincrono, callback, Promise e `async/await` e sapere cosa blocca l'event loop.
- Usare i moduli ES e CommonJS con le regole corrette di risoluzione.
- Conoscere `process`, le variabili d'ambiente e i segnali minimi per gestire un processo in produzione.

## Architettura: V8, libuv e il thread pool

Node non è un interprete: il codice JavaScript viene compilato da V8 in bytecode e poi in codice macchina con JIT. Tutto ciò che non è JavaScript, cioè socket, file, DNS, timer e crittografia, è delegato a libuv tramite binding C++ esposti all'utente come moduli `node:*`.

| Componente | Ruolo | Conseguenza pratica |
| --- | --- | --- |
| V8 | compila ed esegue JS, gestisce la memoria con GC generazionale | una funzione CPU-bound occupa l'unico thread JS |
| libuv | event loop, timer, I/O asincrono multipiattaforma | le API `fs`, `net`, `dns` sono asincrone |
| Thread pool libuv | 4 thread per default (`UV_THREADPOOL_SIZE`) | file, DNS (`c-ares`), `zlib` e `crypto` competono per 4 slot |
| Binding nativi | N-API per addon, `node:worker_threads` per parallelismo JS | il codice CPU pesante va spostato in un worker |

Il punto centrale: l'event loop gira su un solo thread JS. Se una richiesta HTTP esegue un ciclo da 200 ms, per 200 ms nessun'altra richiesta avanza, indipendentemente da quanti core abbia la macchina. Il rimedio è o rendere asincrona l'operazione, o distribuire il codice su più processi (`cluster`, container, PM2) o su worker thread.

```js
import { pbkdf2 } from "node:crypto";
import { performance } from "node:perf_hooks";

const inizio = performance.now();
pbkdf2("password", "sale", 310000, 32, "sha256", (err, chiave) => {
  console.log("hash in", Math.round(performance.now() - inizio), "ms", chiave.length);
});
```

`pbkdf2` occupa uno slot del thread pool, non l'event loop: durante il calcolo il processo può servire altre richieste. `pbkdf2Sync` invece blocca tutto.

## Event loop, callback e Promise

L'event loop di Node ha fasi ordinate (timer, pending callbacks, poll, check, close callbacks) e tra un ciclo e l'altro svuota le microtask queue di Promise e `process.nextTick`. L'ordine osservabile è preciso e conviene memorizzarlo: `nextTick` prima delle microtask, entrambe prima dei `setImmediate` se si è nella fase di I/O.

```js
setTimeout(() => console.log("timeout"), 0);
setImmediate(() => console.log("immediate"));
process.nextTick(() => console.log("nextTick"));
Promise.resolve().then(() => console.log("promise"));
// output: nextTick, promise, timeout, immediate (in esecuzione top-level)
```

Le callback si trasformano in Promise con `promisify` o usando direttamente le API `node:fs/promises`. `async/await` non cambia il modello: `await` sospende la funzione, non il thread. Un loop `while` dentro una funzione async blocca comunque il processo.

```js
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("./config.json", import.meta.url), "utf8"));
console.log(Object.keys(config).length);
```

Il top-level `await` funziona solo nei moduli ES, non in CommonJS.

## Moduli ES e CommonJS

Node supporta entrambi i sistemi. Il disambiguatore è il campo `"type"` in `package.json`: `"module"` rende `.js` moduli ES, l'assenza del campo li rende CommonJS. L'estensione `.mjs` e `.cjs` forza il tipo senza ambiguità ed è la scelta più leggibile per script singoli.

| Aspetto | CommonJS (`.cjs`) | Moduli ES (`.mjs`) |
| --- | --- | --- |
| caricamento | sincrono, `require()` | asincrono, legami statici live |
| export | `module.exports` | `export`, `export default` |
| import nativi | `require("node:fs")` | `import fs from "node:fs"` |
| `__dirname` | disponibile | assente, si usa `import.meta.dirname` (Node 20.11+) |
| top-level await | no | sì |
| import di CJS | nativo | ammesso, default = `module.exports` |

La risoluzione dei percorsi segue regole diverse: in ESM lo specificatore deve essere completo, con estensione e senza cartelle implicite, mentre `require` accetta risoluzione tipo `./lib` verso `lib/index.js`. Per i pacchetti vale il campo `exports` in `package.json`, che può restringere i sottopercorsi importabili e scegliere build diverse per `import` e `require`.

```json
{
  "name": "api-ordini",
  "type": "module",
  "engines": { "node": ">=24" },
  "exports": { ".": { "import": "./src/index.js", "require": "./src/index.cjs" } }
}
```

## Processo, ambiente e codici di uscita

`process` è l'oggetto che rappresenta il processo: `argv`, `env`, `cwd()`, `version`, `platform`, e i metodi `exit`, `on`. In un container `process.pid` è 1 e i segnali vanno gestiti esplicitamente: senza handler, `SIGTERM` chiude il processo senza completare le richieste in corso.

```js
const porta = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
  console.error(`PORT non valida: ${process.env.PORT}`);
  process.exit(1); // codice 1 = errore di configurazione
}

process.on("SIGTERM", () => {
  console.log("chiusura ordinata");
  server.close(() => process.exit(0));
});
```

Le variabili d'ambiente arrivano come stringhe: la conversione a numero e la validazione vanno fatte subito, all'avvio, non alla prima richiesta. Un errore di configurazione deve far fallire il processo, non degradare in silenzio.

## Errori comuni

- **Bloccare l'event loop con cicli sincroni**: `JSON.parse` su payload da 50 MB, `pbkdf2Sync`, regex catastrofiche. Ogni millisecondo sincrono si paga su tutte le richieste concorrenti.
- **Mischiare `require` e `import` nello stesso file senza capire il contesto**: `require` di un modulo ESM fallisce, e `require` dentro ESM richiede `createRequire` (o il supporto ai moduli ESM da `require` introdotto nelle versioni recenti).
- **Assumere che `await` metta in parallelo le operazioni**: due `await` consecutivi sono sequenziali, servono `Promise.all` o `Promise.allSettled`.
- **Leggere `__dirname` in ESM**: non esiste, si usa `import.meta.dirname` o `fileURLToPath(import.meta.url)`.
- **Ignorare il thread pool**: quattro thread condivisi tra file system, DNS e hashing; con 8 hashing lenti in parallelo gli altri I/O si accodano.
- **Uscire con `process.exit(0)` senza chiudere il server**: le connessioni aperte vengono troncate e il chiamante vede un errore di rete.

## In sintesi

Node è V8 più libuv più un insieme di API standard: il JavaScript è a thread singolo, l'I/O no. L'event loop ordina timer, callback e microtask, e ogni operazione sincrona pesante va spostata su worker o su un altro processo. I moduli ES sono lo standard consigliato, con `"type": "module"` e `import.meta.dirname`. Il processo va configurato all'avvio, con validazione delle variabili d'ambiente e gestione di `SIGTERM`. La lezione successiva costruisce su queste basi un server HTTP con `node:http` e le sue API di produzione.

## Fonti

- [Node.js - Introduction to Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- [Node.js API - Documentation (v24 LTS)](https://nodejs.org/api/documentation.html)
- [Node.js API - ECMAScript modules](https://nodejs.org/docs/latest/api/esm.html)
- [Node.js API - Command-line options](https://nodejs.org/api/cli.html)
