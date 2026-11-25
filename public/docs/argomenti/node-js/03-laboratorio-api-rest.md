In questo laboratorio costruisci `node-todo`, un servizio REST in Node 24 con moduli ES e senza dipendenze esterne: persistenza su file JSON con scrittura atomica, tre rotte, test di contratto con `node:test`. L'obiettivo non è il framework ma il controllo di dominio, I/O e concorrenza, gli stessi problemi che un framework nasconde.

## Obiettivi

- Inizializzare un progetto ESM con `package.json`, script e `engines` fissati sulla LTS.
- Separare dominio puro, repository su file e livello HTTP per testare i primi due senza rete.
- Applicare la scrittura atomica (file temporaneo più `rename`) e serializzare le mutazioni.
- Esercitare gli endpoint con test di contratto e verificare il comportamento sotto concorrenza.

## Fase 1: progetto e struttura

```bash
mkdir node-todo && cd node-todo
npm init -y && mkdir -p src test data
```

Riscrivi `package.json` come manifesto ESM:

```json
{
  "name": "node-todo",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "engines": { "node": ">=24" },
  "scripts": { "start": "node src/main.js", "dev": "node --watch src/main.js", "test": "node --test" }
}
```

| File | Responsabilità | Test |
| --- | --- | --- |
| `src/dominio.js` | validazione e stato iniziale | unit test puri |
| `src/repository.js` | scrittura atomica, coda delle mutazioni | test su cartella temporanea |
| `src/http.js` | routing, JSON, errori, status code | test di contratto |
| `src/main.js` | ambiente, listen, segnali | verifica manuale |

Regola fissa: il dominio non importa `node:fs` né `node:http`.

## Fase 2: dominio e repository atomico

`validaAttivita` ritorna `{ ok, errore }` o `{ ok, valore }` normalizzato: il chiamante non deve indovinare se un campo è stringa o `null`.

```js
// src/dominio.js
export function validaAttivita(input) {
  const titolo = typeof input?.titolo === "string" ? input.titolo.trim() : "";
  if (titolo.length < 3 || titolo.length > 120) return { ok: false, errore: "titolo: 3-120 caratteri" };
  const priorita = input.priorita ?? 2;
  if (!Number.isInteger(priorita) || priorita < 1 || priorita > 3) {
    return { ok: false, errore: "priorita: intero 1-3" };
  }
  return { ok: true, valore: { titolo, priorita, stato: "attiva" } };
}
```

Il repository tiene l'elenco in memoria e persiste a ogni mutazione su un file temporaneo nella stessa cartella, poi `rename`. Il `rename` sullo stesso volume è atomico: un processo ucciso lascia o il vecchio file o il nuovo, mai un JSON troncato.

```js
// src/repository.js
import { readFile, writeFile, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export async function apri(percorso) {
  let voci = [];
  try {
    voci = JSON.parse(await readFile(percorso, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  let coda = Promise.resolve(); // serializza le scritture

  const persisti = () => writeFile(`${percorso}.${process.pid}.tmp`, JSON.stringify(voci, null, 2))
    .then(() => rename(`${percorso}.${process.pid}.tmp`, percorso));

  function muta(fn) {
    const voce = fn();
    if (!voce) return null;
    coda = coda.then(persisti);
    return coda.then(() => voce);
  }

  return {
    elenco: () => voci.map((v) => ({ ...v })),
    crea: (dati) => muta(() => {
      const voce = { id: randomUUID(), ...dati, creatoIl: new Date().toISOString() };
      voci.push(voce);
      return voce;
    }),
    completa: (id) => muta(() => {
      const voce = voci.find((v) => v.id === id);
      if (voce) voce.stato = "completata";
      return voce ?? null;
    }),
  };
}
```

La coda serve perché due `crea` concorrenti scriverebbero lo stesso `.tmp` e una `rename` cancellerebbe il lavoro dell'altra: con la coda ogni chiamante attende il proprio flush. La mutazione (`voci.push`, `stato = "completata"`) avviene in memoria prima del flush, quindi le letture in `elenco` vedono sempre lo stato più recente, mentre le risposte attendono il disco. È un compromesso dichiarato: se il processo muore tra mutazione e flush, la risposta non è mai arrivata e il client può ritentare; il file resta coerente perché l'ultimo `rename` completato è l'unica verità.

## Fase 3: livello HTTP e rotte

Tre rotte, con una regex sull'UUID che evita di interrogare il repository per identificativi malformati.

```js
// src/http.js
import { createServer } from "node:http";
import { validaAttivita } from "./dominio.js";

const inviaJson = (res, status, corpo) => {
  const dati = JSON.stringify(corpo);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(dati) });
  res.end(dati);
};

export function creaServer({ repo, limiteBody = 32 * 1024 }) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (req.method === "GET" && url.pathname === "/attivita") {
        return inviaJson(res, 200, { voci: repo.elenco() });
      }
      if (req.method === "POST" && url.pathname === "/attivita") {
        const esito = validaAttivita(await leggiJson(req, limiteBody));
        if (!esito.ok) return inviaJson(res, 400, { errore: esito.errore });
        return inviaJson(res, 201, await repo.crea(esito.valore));
      }
      const m = url.pathname.match(/^\/attivita\/([\w-]{36})\/completa$/);
      if (req.method === "PUT" && m) {
        const voce = await repo.completa(m[1]);
        return voce ? inviaJson(res, 200, voce) : inviaJson(res, 404, { errore: "id sconosciuto" });
      }
      inviaJson(res, 404, { errore: "rotta sconosciuta" });
    } catch (err) {
      if (res.headersSent) return res.destroy();
      inviaJson(res, err.status ?? 500, { errore: err.status ? err.message : "errore interno" });
    }
  });
}
```

`leggiJson` è la funzione della lezione precedente, che lancia errori con `status` 413 e 415. `main.js` legge `DATA_FILE` e `PORT`, valida la porta, apre il repository e gestisce `SIGTERM` con `server.close()` così le richieste in corso terminano; `--watch` in sviluppo riavvia il processo a ogni salvataggio, e la chiusura ordinata rende quel riavvio sicuro anche con scritture in coda.

```js
// src/main.js
import { apri } from "./repository.js";
import { creaServer } from "./http.js";

const porta = Number(process.env.PORT ?? 3000);
const repo = await apri(process.env.DATA_FILE ?? "data/attivita.json");
const server = creaServer({ repo }).listen(porta, "127.0.0.1", () => console.log(`http://127.0.0.1:${porta}`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
```

## Fase 4: test di contratto

Ogni test parte da cartella temporanea e porta effimera e chiude tutto in `t.after`: nessuno stato condiviso, nessun conflitto di porta in CI.

```js
// test/http.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apri } from "../src/repository.js";
import { creaServer } from "../src/http.js";

async function avvia(t) {
  const dir = await mkdtemp(join(tmpdir(), "todo-"));
  const server = creaServer({ repo: await apri(join(dir, "dati.json")) });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  t.after(async () => { server.close(); await rm(dir, { recursive: true, force: true }); });
  return `http://127.0.0.1:${server.address().port}`;
}

test("crea, elenca e completa", async (t) => {
  const base = await avvia(t);
  const post = await fetch(`${base}/attivita`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ titolo: "Scrivere i test", priorita: 1 }),
  });
  assert.equal(post.status, 201);
  const put = await fetch(`${base}/attivita/${(await post.json()).id}/completa`, { method: "PUT" });
  assert.equal((await put.json()).stato, "completata");
  assert.equal((await (await fetch(`${base}/attivita`)).json()).voci.length, 1);
});

test("rifiuta titolo corto e content-type errato", async (t) => {
  const base = await avvia(t);
  const corto = await fetch(`${base}/attivita`, {
    method: "POST", headers: { "content-type": "application/json" }, body: '{"titolo":"ab"}',
  });
  const testo = await fetch(`${base}/attivita`, { method: "POST", body: "ciao" });
  assert.equal(corto.status, 400);
  assert.equal(testo.status, 415);
});
```

## Fase 5: verifica manuale e concorrenza

```bash
npm start &
curl -si -X POST localhost:3000/attivita -H 'content-type: application/json' -d '{"titolo":"Revisione PR"}'
for i in $(seq 1 20); do curl -s -o /dev/null -X POST localhost:3000/attivita \
  -H 'content-type: application/json' -d "{\"titolo\":\"Voce $i\"}" & done; wait
curl -s localhost:3000/attivita | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).voci.length))'
```

Il criterio di uscita: 21 voci nel file, JSON valido, nessun errore in console. Se il conteggio è inferiore, la coda delle scritture è rotta. Se il file contiene JSON troncato, manca la scrittura atomica. Usa `DATA_FILE=/tmp/prova.json` per non mescolare i dati di prova a quelli di sviluppo.

## Esercizi

1. Aggiungi `DELETE /attivita/:id` con risposta 204 e il filtro `?stato=attiva`.
2. Passa a un log append-only di eventi, ricostruito in memoria all'avvio.
3. Aggiungi `etag` sull'hash del corpo e risposta 304 su `if-none-match`.

<details>
<summary>Soluzione</summary>

1. `DELETE` usa `voci.findIndex`, rimuove con `splice` dentro `muta` e risponde 204 con `res.writeHead(204).end()`; il filtro applica `filter` prima della serializzazione.

2. Ogni mutazione fa `appendFile` di `{"tipo":"crea","voce":{...}}` o `{"tipo":"completa","id":"..."}`; all'avvio si leggono le righe, si applicano in ordine e si ignorano le righe finali invalide.

3. `createHash("sha256").update(dati).digest("base64url")` produce l'`etag`; se coincide con `if-none-match` si risponde 304 senza body.

</details>

## Errori comuni

- **Serializzare anche le letture**: la coda serve solo alle mutazioni; un elenco non deve attendere il flush su disco.
- **Dimenticare l'`await` sulla coda**: si risponde 201 prima della scrittura e gli errori di I/O spariscono.
- **File temporaneo senza suffisso univoco**: due processi sovrascrivono lo stesso `.tmp`; includere `process.pid` o `randomUUID`.
- **Rispondere 500 su input invalido**: la validazione deve produrre 400 con il nome del campo.
- **Assumere `rename` atomico tra volumi diversi**: lo è solo sullo stesso filesystem; il `.tmp` va nella cartella di destinazione.

## In sintesi

Tre livelli separati: dominio puro, repository con scrittura atomica e coda, HTTP con routing e mappatura degli errori. I test usano `mkdtemp`, porta effimera e `t.after`, e la verifica con 20 `curl` in parallelo dimostra la correttezza sotto concorrenza. Il passo successivo è sostituire il file con un database transazionale lasciando invariati contratto e test.

## Fonti

- [Node.js API - Test runner](https://nodejs.org/api/test.html)
- [Node.js API - File system](https://nodejs.org/api/fs.html)
- [Node.js API - HTTP](https://nodejs.org/api/http.html)
- [Node.js API - Command-line options](https://nodejs.org/api/cli.html)
