In questo laboratorio costruisci `bun-scadenze`, un servizio per gestire scadenze con SQLite, upload di allegati su disco e test con `bun test`. Il percorso è quello di un progetto nuovo: `bun init`, schema migrato all'avvio, rotte con parametri, validazione, test su database in memoria, build in binario. Alla fine hai un servizio avviabile con `bun run src/index.ts` e distribuibile come eseguibile singolo.

## Obiettivi

- Inizializzare il progetto con `bun init` e fissare la versione del runtime nel `package.json`.
- Migrare lo schema SQLite all'avvio con `bun:sqlite` e gestire le date come ISO 8601.
- Implementare creazione, elenco filtrato e upload di allegati con `Bun.write`.- Scrivere test con `bun test` su database in memoria e chiudere il server in `afterAll`.

## Fase 1: progetto e contratto

```bash
bun init -y            # crea package.json, tsconfig.json, index.ts e installa i tipi di Bun
bun add -d @types/bun  # se non è già presente
```

Riscrivi il manifesto con gli script:

```json
{
  "name": "bun-scadenze",
  "type": "module",
  "scripts": {
    "start": "bun run src/index.ts",
    "dev": "bun --watch src/index.ts",
    "test": "bun test",
    "build": "bun build src/index.ts --compile --outfile dist/scadenze"
  },
  "devDependencies": { "@types/bun": "latest" }
}
```

| Elemento | Scelta | Motivo |
| --- | --- | --- |
| forma | `GET/POST /scadenze`, `PUT /scadenze/:id/completa`, `POST /scadenze/:id/allegato` | REST minimo |
| stato | `aperta` o `completata` | nessuna transizione inversa in questa versione |
| data | stringa ISO 8601 validata con `Date.parse` | ordinabile e trasferibile senza fuso |
| allegato | multipart o corpo binario, max 2 MiB | upload diretto su disco |
| exit | 0 successo, 1 errore di avvio | pronto per systemd o Docker |

## Fase 2: database e migrazione

Lo schema si applica all'avvio con `CREATE TABLE IF NOT EXISTS`: per un servizio a singolo processo basta, e il test può usare `":memory:"` senza toccare il disco.

```ts
// src/db.ts
import { Database } from "bun:sqlite";

export function apriDatabase(percorso = Bun.env.DB ?? "data/scadenze.db") {
  const db = new Database(percorso, { create: true });
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA foreign_keys = ON");
  db.run(`CREATE TABLE IF NOT EXISTS scadenze (
    id INTEGER PRIMARY KEY,
    titolo TEXT NOT NULL CHECK (length(titolo) BETWEEN 3 AND 120),
    scade TEXT NOT NULL,
    stato TEXT NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta','completata')),
    allegato TEXT
  )`);
  return db;
}

export function valida(input: unknown) {
  const { titolo, scade } = (input ?? {}) as Record<string, unknown>;
  if (typeof titolo !== "string" || titolo.trim().length < 3) return { ok: false, errore: "titolo troppo corto" };
  if (typeof scade !== "string" || Number.isNaN(Date.parse(scade))) return { ok: false, errore: "scade non è una data ISO" };
  return { ok: true, valore: { $titolo: titolo.trim(), $scade: new Date(scade).toISOString() } };
}
```

Due livelli di validazione sono voluti: uno in JavaScript per rispondere 400 con un messaggio utile, e i `CHECK` nel database come rete di sicurezza per script di import o client che scrivono direttamente. Le chiavi di `valore` portano il prefisso `$` perché `inserisci.get()` le usa come named parameter: senza prefisso SQLite non trova i binding, inserisce `NULL` e il vincolo `NOT NULL` risponde con un errore opaco.

## Fase 3: rotte, errori e upload

Le rotte stanno in `src/index.ts` e usano solo `Response`. L'upload scrive il file con un nome generato, che non usa mai il nome scelto dal client: nome e cartella devono essere decisi dal server.

```ts
// src/index.ts
import { apriDatabase, valida } from "./db";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const db = apriDatabase();
const LIMITE_ALLEGATO = 2 * 1024 * 1024;
await mkdir("data/allegati", { recursive: true });

const elenca = db.prepare("select * from scadenze where ($stato is null or stato = $stato) order by scade");
const inserisci = db.prepare("insert into scadenze (titolo, scade) values ($titolo, $scade) returning *");
const completa = db.prepare("update scadenze set stato = 'completata' where id = $id returning *");
const allega = db.prepare("update scadenze set allegato = $nome where id = $id returning *");

export const server = Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  async fetch(req) {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/scadenze\/(\d+)\/allegato$/);
    if (req.method === "POST" && m) {
      const file = await Bun.write(`data/allegati/${randomUUID()}.bin`, req.body ?? "");
      const voce = allega.get({ $nome: String(file), $id: Number(m[1]) });
      return voce ? Response.json(voce, { status: 201 }) : Response.json({ errore: "non trovata" }, { status: 404 });
    }
    const c = url.pathname.match(/^\/scadenze\/(\d+)\/completa$/);
    if (req.method === "PUT" && c) {
      const voce = completa.get({ $id: Number(c[1]) });
      return voce ? Response.json(voce) : Response.json({ errore: "non trovata" }, { status: 404 });
    }
    if (url.pathname === "/scadenze" && req.method === "GET") {
      return Response.json({ voci: elenca.all({ $stato: url.searchParams.get("stato") }) });
    }
    if (url.pathname === "/scadenze" && req.method === "POST") {
      const esito = valida(await req.json());
      if (!esito.ok) return Response.json({ errore: esito.errore }, { status: 400 });
      return Response.json(inserisci.get(esito.valore), { status: 201 });
    }
    return Response.json({ errore: "rotta sconosciuta" }, { status: 404 });
  },
  maxRequestBodySize: LIMITE_ALLEGATO,
});
```

`maxRequestBodySize` è l'unico limite che protegge il processo: senza, un client può inviare un corpo da gigabyte e riempire la memoria prima che la `fetch` venga chiamata. `Bun.write` restituisce il numero di byte scritti, quindi il valore salvato nel campo `allegato` è una dimensione, non un percorso: nel resto del codice tieni traccia del nome generato, non di ciò che arriva dal client.

## Fase 4: test e build

`bun test` scopre `*.test.ts` e `*.spec.ts` senza configurazione. Il test chiama `apriDatabase(":memory:")`, quindi usa lo schema reale con i suoi `CHECK`: testare contro una tabella ridotta nasconderebbe proprio i vincoli. Un server `stub` in ascolto su porta `0` serve solo a verificare che il test chiuda tutto in `afterAll`.

```ts
// test/scadenze.test.ts
import { expect, test, afterAll } from "bun:test";
import { Database } from "bun:sqlite";

const db = new Database(":memory:");
db.run("create table scadenze (id integer primary key, titolo text, scade text, stato text default 'aperta', allegato text)");
const server = Bun.serve({ port: 0, fetch: () => new Response("stub") });
afterAll(() => server.stop());test("la tabella applica il default di stato", () => {
  const r = db.prepare("insert into scadenze (titolo, scade) values (?, ?) returning stato").get("Rinnovo", "2027-01-31") as { stato: string };
  expect(r.stato).toBe("aperta");
});

test("il check rifiuta titoli troppo corti", () => {
  expect(() => db.prepare("insert into scadenze (titolo, scade) values (?, ?)").run("ab", "2027-01-01")).toThrow();
});
```

La build in binario produce un eseguibile con il runtime incluso: si distribuisce su una macchina senza Bun installato, ma va compilato per ogni piattaforma.

```bash
bun run build
./dist/scadenze &   # oppure dist\\scadenze.exe su Windows
curl -s -X POST localhost:3000/scadenze -H 'content-type: application/json' \
  -d '{"titolo":"Revisione","scade":"2027-02-15"}'
curl -s "localhost:3000/scadenze?stato=aperta"
printf 'binario' | curl -s -X POST --data-binary @- localhost:3000/scadenze/1/allegato
```

Il criterio di uscita: la `POST` restituisce 201 con `stato: "aperta"`; il filtro `?stato=completata` restituisce lista vuota; la `PUT` cambia lo stato e una seconda `PUT` restituisce 200 con lo stesso valore, quindi la chiamata è idempotente; l'upload con corpo da 3 MiB restituisce 413.

## Esercizi

1. Aggiungi `DELETE /scadenze/:id` che rimuove anche il file allegato dal disco.
2. Sostituisci il `CREATE TABLE` con una tabella `migrazioni` che applica script numerati in ordine.
3. Aggiungi `GET /scadenze/oggi` che filtra per data locale, con test sul fuso orario.
4. Metti il servizio in un container `oven/bun:1` e confronta l'avvio a freddo con la stessa app su Node.

<details>
<summary>Soluzione</summary>

1. `DELETE` legge `allegato` prima di cancellare la riga, poi `unlink` del file ignorando `ENOENT`; se il file manca la riga viene comunque rimossa e la risposta è 204.

2. La tabella `migrazioni(nome text primary key, applicata text)` contiene una riga per migrazione; una transazione `db.transaction` applica gli script in ordine e inserisce la riga, quindi un errore a metà annulla tutto.

3. `new Date(voce.scade).toLocaleDateString("sv-SE")` restituisce `YYYY-MM-DD` locali, confrontabili con la data di oggi senza calcoli manuali.

4. Il binario Bun parte in pochi millisecondi; nel container conta anche la dimensione dell'immagine (`docker images`).

</details>

## Errori comuni

- **Scrivere l'allegato con il nome mandato dal client**: permette path traversal e collisioni; generare un nome.
- **Usare `req.body` senza limite**: `maxRequestBodySize` è l'unica barriera prima della `fetch`.
- **Dimenticare `PRAGMA foreign_keys = ON`**: SQLite non applica le foreign key per default, e gli orfani restano.
- **Testare su `data/scadenze.db`**: il test modifica i dati reali e lascia residui; `":memory:"` o un file temporaneo.
- **Distribuire `--compile` senza fissare la piattaforma**: il binario è specifico per OS e architettura.

## In sintesi

`bun init` dà un progetto TypeScript eseguibile senza build; `bun:sqlite` dà persistenza transazionale con schema idempotente all'avvio, validato sia in JavaScript sia nei `CHECK`; le rotte in `fetch` con `maxRequestBodySize` mantengono il confine di rete. I test girano su database in memoria e non toccano il disco. Il binario compilato chiude il cerchio per la distribuzione, con una build per piattaforma.

## Fonti

- [Bun - Quickstart](https://bun.com/docs/quickstart)
- [Bun - SQLite](https://bun.com/docs/runtime/sqlite)
- [Bun - Test runner](https://bun.com/docs/test)
- [Bun - Bundler](https://bun.com/docs/bundler)
