Bun è un runtime JavaScript e TypeScript tutto in uno: interprete basato su JavaScriptCore, package manager, test runner, bundler e una decina di API native scritte in Zig. Nel novembre 2026 la versione stabile è la 1.4.x, che consolida l'HTTP server con le rotte statiche, il supporto a `node:*` quasi completo e i binari compilati. In questa lezione capisci cosa cambia rispetto a Node, perché è veloce e dove la velocità non basta.

## Obiettivi

- Distinguere i pezzi di Bun: runtime, package manager, test runner, bundler, API native.
- Spiegare il modello di concorrenza: event loop, `Bun.serve` e la condivisione del processo.
- Usare le API native (`Bun.file`, `Bun.serve`, `bun:sqlite`, `Bun.password`).
- Scegliere Bun o Node con criteri operativi, non solo di benchmark.

## Un runtime, quattro strumenti

La scelta progettuale di Bun è ridurre i tool: invece di `node` più `npm` più `jest` più `esbuild` più `tsx`, c'è un eseguibile che fa tutto. Il runtime usa WebKit's JavaScriptCore come motore invece di V8, e i componenti critici (bundler, server HTTP, risoluzione dei moduli, allocatori) sono scritti in Zig.

| Strumento | Comando | Sostituisce |
| --- | --- | --- |
| runtime | `bun run file.ts` | `node`, `tsx`, `ts-node` |
| package manager | `bun install`, `bun add` | `npm`, `pnpm`, `yarn` |
| test runner | `bun test` | `jest`, `vitest` |
| bundler | `bun build`, `Bun.build()` | `esbuild`, `webpack` |
| database | `bun:sqlite` | `better-sqlite3` |
| password | `Bun.password` | `bcrypt` (modulo nativo) |

TypeScript, JSX e CSS sono compilati al volo senza configurazione: `bun run app.tsx` funziona, e i tipi non vengono controllati (per quello serve `tsc --noEmit`, che Bun non sostituisce).

Un vantaggio operativo concreto: `bun install` legge i `package.json` e scrive `bun.lock` in formato testo, quindi il lockfile è diffabile in code review e il merge dei conflitti è leggibile. I progetti con `package-lock.json` o `pnpm-lock.yaml` esistenti convivono, ma mescolare i gestori nello stesso repo è la fonte più comune di dipendenze "invisibili".

## Modello di esecuzione: event loop e API native

Bun ha un event loop compatibile con le semantiche di Node (`setTimeout`, `process.nextTick`, microtask), quindi il codice asincrono esistente si comporta allo stesso modo. La differenza è nei punti in cui il runtime può evitare di attraversare il confine JavaScript/C++: le API `Bun.*` sono implementate direttamente nel runtime e non passano da binding generici.

```ts
const testo = await Bun.file("config.json").text();
const dati = JSON.parse(testo);
await Bun.write("copia.json", JSON.stringify(dati, null, 2));
```

`Bun.file` è un oggetto lazy: legge il file solo quando serve, e `Bun.write` accetta stringhe, `Blob`, `Response` e perfino `Bun.file` di un'altra sorgente, copiando in kernel space quando possibile. Per file grandi il guadagno rispetto a `fs.readFile` più `fs.writeFile` è misurabile; per file da pochi KB è rumore.

Il server HTTP è la parte più caratteristica. `Bun.serve` è implementato direttamente su HTTP/1.1 e HTTP/2 in Zig, con TLS, WebSocket e rotte statiche nello stesso oggetto.

```ts
const server = Bun.serve({
  port: 3000,
  routes: {
    "/": new Response("ok"),
    "/saluti/:nome": (req) => Response.json({ nome: req.params.nome }),
    "/api/*": (req) => new Response(`proxy: ${req.url}`),
  },
  async fetch(req) {
    return new Response("non trovato", { status: 404 });
  },
});

console.log(server.url.href);
```

Le `routes` supportano parametri (`:nome`), wildcard (`*`) e metodi, e vengono risolte prima della `fetch` di fallback: le rotte statiche ed esatte sono più veloci di un router scritto in JavaScript.

| Bisogno | API nativa | Alternativa Node |
| --- | --- | --- |
| leggere un file | `Bun.file(p).text()` | `fs/promises.readFile` |
| password hash | `Bun.password.hash(p, { algorithm: "argon2id" })` | `crypto.scrypt` |
| SQLite embedded | `import { Database } from "bun:sqlite"` | `better-sqlite3` nativo |
| hash file | `Bun.CryptoHasher("sha256")` | `crypto.createHash` |
| variabili del processo | `Bun.env` | `process.env` |

## Compatibilità con Node e confini

Bun implementa la maggior parte dei moduli `node:*` e i moduli npm in CJS e ESM, compresa risoluzione di `node_modules`, `exports`, `import.meta.dirname` e `process`. Molte applicazioni Node girano con `bun run` senza modifiche; le eccezioni sono gli addon nativi compilati contro l'ABI di V8 (N-API funziona, ma non tutte le librerie sono testate), alcune API di diagnostica, e i comportamenti in cui la specifica Node è ambiguo.

```bash
bun install                    # installa e scrive bun.lock
bun run src/index.ts           # esegue TypeScript senza build
bun test                       # esegue *.test.ts, *.spec.ts
bun build src/client.ts --outdir dist --target browser --minify
bun build src/cli.ts --compile --outfile bin/cli   # binario autonomo
```

La compilazione in binario (`--compile`) produce un eseguibile che contiene il runtime: utile per CLI e strumenti distribuiti a chi non ha Bun installato. Il binario pesa decine di MB, quindi per un servizio in container conviene la normale immagine `oven/bun`.

Sui benchmark bisogna essere onesti: i numeri di `Bun.serve` su richieste banali sono molto alti, ma in applicazioni reali dominano database, serializzazione e logica. La velocità di avvio ridotta e il tool unico semplificano la CI più di quanto un fattore 2 su un endpoint `/ping` cambi la vita. La scelta ragionevole è: Bun per progetti nuovi con SQLite, CLI e strumenti; Node dove l'ecosistema nativo o la garanzia LTS a lungo termine contano.

## Errori comuni

- **Assumere che Bun verifichi i tipi**: esegue TypeScript cancellando i tipi; errori come `string | undefined` passano. Il type check va in CI con `tsc`.
- **Mescolare `npm install` e `bun install`**: due lockfile divergenti e dipendenze installate in modo imprevedibile; scegli un gestore e fissalo in `packageManager`.
- **Installare addon nativi compilati solo per Node**: moduli con `node-gyp` e binding V8 potrebbero non caricarsi; verifica i casi d'uso prima della migrazione.
- **Usare `Bun.serve` come se fosse stateless tra richieste**: lo stato condiviso è dello stesso processo; due richieste concorrenti vedono la stessa memoria, e questo è sia un vantaggio sia un rischio di race.
- **Distribuire un binario `--compile` su architetture diverse**: il binario è specifico per piattaforma; servono build separate per Linux e macOS, anche ARM.

## In sintesi

Bun è un runtime JSC con TypeScript nativo e API implementate in Zig, circondato da package manager, test runner e bundler nello stesso eseguibile. `Bun.serve` con `routes` e `Bun.file` evitano strati intermedi; `bun:sqlite` rimuove un addon nativo dall'equazione. La compatibilità con Node è ampia ma non totale, e i tipi non vengono controllati. Le lezioni successive costruiscono un servizio completo con queste API e lo confrontano, con misure, a Node.

## Fonti

- [Bun - Documentation](https://bun.com/docs)
- [Bun - Quickstart](https://bun.com/docs/quickstart)
- [Bun - HTTP server](https://bun.com/docs/runtime/http/server)
- [Bun - Node.js compatibility](https://bun.com/docs/runtime/nodejs-compat)
