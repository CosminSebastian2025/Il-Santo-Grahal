La prima lezione ha mostrato cosa fa Multer; qui lo usi come si usa in produzione: storage engine su disco con nomi generati, limiti che fermano gli abusi, `MulterError` tradotti in risposte HTTP coerenti e file che vengono eliminati se l'handler fallisce. Il tema di fondo è che tutto ciò che arriva dal client — nome, MIME, dimensione — è una proposta, non un fatto.

## Obiettivi

- Scrivere un `diskStorage` che genera nomi sicuri e separa le cartelle per utente.
- Distinguere `cb(null, false)`, `cb(error)` e i limiti di busboy.
- Mappare i codici `MulterError` su risposte 4xx senza esporre dettagli interni.
- Usare `flush` e uno storage engine custom per controllare scrittura e distruzione del file.

## Storage engine: dove e con quale nome

Il `filename` di `diskStorage` è l'unico punto in cui decidi il nome reale sul filesystem. La regola è: non derivarlo dal client, o derivarlo solo dopo aver rimosso ogni separatore.

```javascript
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join("uploads", String(req.user.id));
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const ammesse = new Set([".png", ".jpg", ".jpeg", ".webp"]);
    cb(null, `${randomUUID()}${ammesse.has(ext) ? ext : ""}`);
  },
  flush: false, // true = fsync prima dell'handler
});
```

Tre comportamenti da tenere a mente. Se `destination` è una funzione, la cartella va creata da te, come sopra; se è una stringa, la crea Multer. L'estensione non viene aggiunta automaticamente. Il nome originale resta in `file.originalname` e, se il client lo ha inviato con caratteri UTF-8, va letto passando `defParamCharset: "utf8"` all'istanza, altrimenti arriva decodificato in `latin1`.

`flush: true` esegue un `fsync` del file prima di chiamare l'handler: costa tempo ma evita che un crash del processo, con i dati ancora nella page cache del sistema, lasci un file troncato. Non sincronizza la voce di directory: per quello va fatto un `fsync` sulla directory.

## Errori tra `fileFilter` e `limits`

Le tre vie di uscita sono semanticamente diverse e vanno scelte in base a cosa deve vedere il client.

| Situazione | Come si esprime | Cosa succede |
| --- | --- | --- |
| file non ammesso ma innocuo | `cb(null, false)` | file scartato, nessun errore, `req.file` assente |
| file non ammesso per policy | `cb(new Error(...))` | errore inoltrato a Express, upload interrotto |
| file troppo grande | `limits.fileSize` | `LIMIT_FILE_SIZE` dopo aver scritto i byte iniziali |
| campo file inatteso | metodo `.single()`/`.fields()` | `LIMIT_UNEXPECTED_FILE` |
| troppi file o parti | `limits.files`, `limits.parts` | `LIMIT_FILE_COUNT`, `LIMIT_PART_COUNT` |

Gli errori di Multer sono istanze di `multer.MulterError` con un `code` stabile; i messaggi sono in inglese e non vanno mostrati all'utente. Con `fileSize` il file parziale viene già scritto su disco: uno storage custom che cancella su errore evita residui.

```javascript
const upload = multer({ storage, limits: { fileSize: 4 * 1024 * 1024, files: 1 } });

app.post("/avatar", (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const stato = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(stato).json({ errore: err.code, campo: err.field });
    }
    next(err); // errori non-Multer: gestione centralizzata
  });
});
```

Invocare il middleware a mano permette di intercettare l'errore prima che arrivi al gestore globale; in alternativa si lascia passare e si controlla `err instanceof multer.MulterError` nel middleware di errore a quattro argomenti. In Express 5, se `fileFilter` chiama `cb` due volte o dopo un errore, il framework segnala l'incoerenza: ogni ramo deve chiamare `cb` esattamente una volta.

## Validare il contenuto, non l'header

`file.mimetype` è copiato dall'header `Content-Type` della parte. Un client qualsiasi può dichiarare `image/png` e inviare un eseguibile. La verifica reale legge i primi byte (magic numbers) o passa il file a una libreria che li interpreta; per le immagini più che il formato importa la libreria usata per processarle, perché i parser di immagini sono una superficie d'attacco nota.

```javascript
const firme = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
};

function intestaCorretto(buffer, mime) {
  const attesa = firme[mime];
  return Boolean(attesa) && attesa.every((b, i) => buffer[i] === b);
}
```

Con `memoryStorage` questo controllo è immediato sul `file.buffer`; su disco richiede una lettura dell'inizio file dopo l'upload. In entrambi i casi il file va rifiutato con cancellazione, non solo con un errore HTTP.

| Controllo | Fonte affidabile | Costo |
| --- | --- | --- |
| estensione | nome generato sul server | nullo, ma non prova nulla |
| `mimetype` | client | nullo, non affidabile |
| magic bytes | contenuto | una lettura dei primi byte |
| decodifica con libreria | contenuto | CPU, ma intercetta file malformati |

Un'altra pratica necessaria: i file caricati non vanno serviti dalla stessa origine dell'applicazione senza accorgimenti, perché un HTML caricato come "immagine" non lo è. Serve un tipo servito esplicito, `Content-Disposition: attachment` quando possibile e una cartella che non esegue nulla.

## Storage engine custom e pulizia

L'interfaccia di uno storage engine è una classe con `_handleFile(req, file, cb)` e `_removeFile(req, file, cb)`. Serve quando vuoi cifrare, calcolare un hash durante il flusso o mettere il file in un bucket.

```javascript
class HashStorage {
  _handleFile(req, file, cb) {
    const hash = createHash("sha256");
    const out = fs.createWriteStream(path.join("uploads", randomUUID()));
    file.stream.on("data", (chunk) => hash.update(chunk));
    pipeline(file.stream, out, (err) => {
      if (err) return cb(err);
      cb(null, { path: out.path, size: out.bytesWritten, sha256: hash.digest("hex") });
    });
  }
  _removeFile(req, file, cb) {
    fs.unlink(file.path, cb);
  }
}
```

Il valore passato a `cb` viene fuso con i metadati del file: qui `sha256` diventa visibile in `req.file`. `_removeFile` viene chiamato da Multer quando un errore sopraggiunge dopo la scrittura, ma non quando l'handler fallisce dopo: quella cancellazione è responsabilità del codice applicativo, di solito in un `try/finally` o in un job di pulizia per gli orfani.

## Errori comuni

- **Salvare in una cartella pubblica**: un upload è contenuto arbitrario; servirlo dallo stesso percorso delle pagine apre a XSS memorizzato.
- **Trattare `cb(null, false)` come errore**: il client non riceve 400, riceve un 201 con `req.file` assente; gestisci quel caso esplicitamente.
- **Controllare il formato solo con l'estensione**: `foto.png` può essere qualsiasi cosa; le estensioni sono decorative.
- **Ignorare i file parziali con `LIMIT_FILE_SIZE`**: restano su disco se lo storage non li rimuove.
- **Mettere `upload.any()` in `app.use`**: apre l'upload su ogni rotta, incluse quelle che non lo prevedono.

## In sintesi

Uno storage engine sicuro genera il nome, non lo eredita; i limiti sono la prima difesa, gli errori tipizzati la seconda, la validazione del contenuto la terza. `MulterError` si intercetta per `code`, si traduce in 4xx e non si mostra all'utente. La memoria del file è di chi lo riceve: se l'handler fallisce, il file va rimosso da te. Il laboratorio finale mette insieme tutto questo in un servizio con test.

## Fonti

- [Multer - GitHub (expressjs/multer)](https://github.com/expressjs/multer)
- [StorageEngine.md - expressjs/multer](https://github.com/expressjs/multer/blob/main/StorageEngine.md)
- [Error Handling - Express.js](https://expressjs.com/en/guide/error-handling/)
- [File system - Node.js Documentation](https://nodejs.org/api/fs.html)
