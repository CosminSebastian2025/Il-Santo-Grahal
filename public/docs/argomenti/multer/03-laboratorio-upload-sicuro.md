In questo laboratorio costruisci `mini-album`, un servizio Express che accetta avatar PNG/JPEG fino a 2 MiB, li salva con nome generato, ne verifica i magic bytes e li elimina quando la richiesta è invalida. Scrivi anche i test con `supertest` che colpiscono le quattro rotture tipiche: file troppo grande, MIME sbagliato, campo inatteso e contenuto che mente sull'header. Il criterio di successo: suite verde e zero file orfani in `uploads/`.

## Obiettivi

- Organizzare l'upload in un modulo riutilizzabile con storage, `fileFilter` e limiti centralizzati.
- Comporre il middleware a mano per tradurre `MulterError` in risposte JSON coerenti.
- Verificare i magic bytes dopo il salvataggio ed eliminare il file se il controllo fallisce.
- Scrivere test con `supertest` e gli oggetti `FormData` e `Blob` nativi di Node.js.
- Ripulire `uploads/` tra un test e l'altro per avere una suite ripetibile.

## Il contratto di `mini-album`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| `POST /albums/:id/avatar` | un file, campo `avatar` | `.single("avatar")` |
| tipi ammessi | `image/png`, `image/jpeg` | `fileFilter` + magic bytes |
| dimensione | 2 MiB (`limits.fileSize`) | errore 413 `LIMIT_FILE_SIZE` |
| `originalname` | conservato solo nei log | input non fidato |
| nome su disco | `randomUUID` + estensione filtrata | niente path traversal |
| exit | 201 con id, 400/413/415 per rifiuti | semantica HTTP chiara |

`415 Unsupported Media Type` è la risposta giusta per un tipo non ammesso, `413 Content Too Large` per la dimensione, `400` per campo inatteso o file mancante. 

```bash
npm init -y
npm pkg set type=module
npm install express@5 multer@2
npm install --save-dev supertest
mkdir -p uploads
```

Lo script di test usa il runner incluso in Node: `npm pkg set scripts.test="node --test test/"`.

## Passo 1: il modulo di upload

La configurazione vive in `src/upload.js`, condivisa da rotte e test. `destination` stringa fa creare la cartella a Multer; il nome resta un UUID.

```javascript
// src/upload.js
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";

const estensioni = { "image/png": ".png", "image/jpeg": ".jpg" };

const storage = multer.diskStorage({
  destination: "uploads/",
  filename(req, file, cb) {
    cb(null, `${randomUUID()}${estensioni[file.mimetype] ?? ".bin"}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 4, parts: 5 },
  defParamCharset: "utf8",
  fileFilter(req, file, cb) {
    if (!estensioni[file.mimetype]) {
      const err = new Error("MIME non ammesso");
      err.status = 415;
      return cb(err);
    }
    cb(null, true);
  },
});

export const avatar = (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const stato = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(stato).json({ errore: err.code, campo: err.field });
    }
    next(err);
  });
};
```

`fileFilter` chiama `cb(err)`, non `cb(null, false)`: serve un 415, non un 201 senza file.

## Passo 2: verifica del contenuto e rotta

Il controllo dei magic bytes avviene dopo la scrittura, quindi un file che mente viene prima salvato e poi eliminato con `fs.rm`. La rotta usa `try/finally` per non lasciare orfani in caso di errore dell'handler.

```javascript
// src/server.js
import express from "express";
import fs from "node:fs/promises";
import { avatar } from "./upload.js";

const firme = { "image/png": [0x89, 0x50, 0x4e, 0x47], "image/jpeg": [0xff, 0xd8, 0xff] };

async function veraImmagine(file) {
  const fh = await fs.open(file.path, "r");
  try {
    const { buffer } = await fh.read(Buffer.alloc(4), 0, 4, 0);
    return firme[file.mimetype]?.every((b, i) => buffer[i] === b) ?? false;
  } finally {
    await fh.close();
  }
}

export function creaApp() {
  const app = express();
  app.post("/albums/:id/avatar", avatar, async (req, res, next) => {
    if (!req.file) return res.status(400).json({ errore: "file mancante" });
    try {
      if (!(await veraImmagine(req.file))) {
        await fs.rm(req.file.path, { force: true });
        return res.status(415).json({ errore: "contenuto non coerente" });
      }
      res.status(201).json({ id: req.file.filename, byte: req.file.size });
    } catch (err) {
      await fs.rm(req.file.path, { force: true });
      next(err);
    }
  });
  return app;
}
```

## Passo 3: test delle quattro rotture

`FormData` e `Blob` sono globali in Node.js: nessuna dipendenza extra per il corpo multipart.

```javascript
// test/avatar.test.js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import request from "supertest";
import { creaApp } from "../src/server.js";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const form = (bytes, nome = "a.png", tipo = "image/png") => {
  const fd = new FormData();
  fd.set("avatar", new Blob([bytes], { type: tipo }), nome);
  return fd;
};

test.afterEach(async () => {
  const nomi = await fs.readdir("uploads").catch(() => []);
  await Promise.all(nomi.map((n) => fs.rm(`uploads/${n}`, { force: true })));
});

test("PNG valido: 201 e un file su disco", async () => {
  const res = await request(creaApp()).post("/albums/1/avatar").send(form(png));
  assert.equal(res.status, 201);
  assert.match(res.body.id, /^[0-9a-f-]{36}\.png$/);
  assert.equal((await fs.readdir("uploads")).length, 1);
});

test("file oltre 2 MiB: 413", async () => {
  const grande = Buffer.alloc(2 * 1024 * 1024 + 1);
  const res = await request(creaApp()).post("/albums/1/avatar").send(form(grande));
  assert.equal(res.status, 413);
  assert.deepEqual(await fs.readdir("uploads"), []);
});
```

Senza il `test.afterEach` i residui alterano il conteggio; il test `413` verifica che il parziale non resti.

## Esercizi

1. Aggiungi il caso `LIMIT_UNEXPECTED_FILE`: invia il file con `name="photo"` e attenditi 400.
2. Aggiungi il caso "header mente": `Blob` con tipo `image/png` e byte `PK\x03\x04`, attendendoti 415.
3. Passa a `memoryStorage` e verifica i magic bytes su `file.buffer`.
4. Introduci `limits: (req) => ({ fileSize: req.user ? 4 * 1024 * 1024 : 512 * 1024 })` e scrivi un test per entrambi.
5. Aggiungi un job che cancella i file più vecchi di 24 ore, testato con `fs.utimes`.

<details>
<summary>Soluzione</summary>

1. `.single()` dichiara a busboy un solo nome: il resto diventa `LIMIT_UNEXPECTED_FILE` con `field` valorizzato.

2. Il MIME dichiarato passa `fileFilter`, `veraImmagine` fallisce, la rotta cancella e il test trova `readdir` vuoto.

3. Con `memoryStorage` il controllo lavora su `req.file.buffer` e non serve cancellare nulla: test più veloci, RAM proporzionale all'upload.

4. `limits` è chiamata una volta per richiesta, prima del parsing: senza autenticazione un file da 1 MiB riceve `LIMIT_FILE_SIZE`.

5. Il job confronta `mtimeMs` con `Date.now() - 24 * 3600 * 1000`.

</details>

## Errori comuni

- **Non ripulire `uploads/` nei test**: i residui fanno fallire il conteggio.
- **Usare `express.json()` sulla rotta di upload**: il body multipart non viene letto e `req.file` resta `undefined` senza errori.
- **Generare il nome dal `originalname`**: nomi con `../` o con caratteri strani finiscono nel percorso.

## In sintesi

Multer decide cosa accettare e dove scrivere, la rotta verifica il contenuto e risponde, i test riproducono i rifiuti reali. `creaApp()` e la cartella pulita rendono la suite ripetibile; i magic bytes chiudono il buco che `fileFilter` non copre. Il passo naturale è uno storage esterno con engine custom.

## Fonti

- [Multer - GitHub (expressjs/multer)](https://github.com/expressjs/multer)
- [multer middleware - Express.js](https://expressjs.com/en/resources/middleware/multer/)
- [Error Handling - Express.js](https://expressjs.com/en/guide/error-handling/)
- [FormData - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
