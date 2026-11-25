Multer è il middleware di Express per `multipart/form-data`, il formato con cui un browser spedisce file e campi testuali in un'unica richiesta POST. Non è un framework di upload né un gestore di file: è un parser che riempie `req.body`, `req.file` e `req.files` prima che il tuo handler venga chiamato. In questa lezione capisci cosa arriva davvero sul filo, cosa fa Multer e come si configura con le sue cinque opzioni.

## Obiettivi

- Leggere un corpo `multipart/form-data` e riconoscere boundary, part e header di parte.
- Istanziare Multer con `dest` o `storage`, `limits` e `fileFilter`.
- Scegliere tra `.single()`, `.array()`, `.fields()`, `.none()` e `.any()`.
- Sapere dove finiscono i file nei due storage engine inclusi e da quale versione.

## Dal form HTML al body multipart

Un form con `enctype="multipart/form-data"` produce un corpo con un `boundary` casuale. Ogni parte ha header propri (`Content-Disposition`, `Content-Type`) e Multer li consuma con [busboy](https://github.com/mscdex/busboy), parser in streaming che non carica l'intero upload in RAM.

```http
POST /profilo HTTP/1.1
Content-Type: multipart/form-data; boundary=----XyZ123

------XyZ123
Content-Disposition: form-data; name="nome"

Ada
------XyZ123
Content-Disposition: form-data; name="avatar"; filename="foto.png"
Content-Type: image/png

<byte PNG>
------XyZ123--
```

L'header della parte, non il contenuto, decide cosa vede applicazione: `name` è il campo su cui filtrare con `.single()`, `filename` è il nome che l'utente ha scelto, `Content-Type` è una dichiarazione del client e non una verifica. Formato e regole sono in [RFC 7578](https://www.rfc-editor.org/rfc/rfc7578.html), che ha sostituito RFC 2388.

Multer applica un solo vincolo di tipo: accetta esclusivamente richieste `multipart/form-data`. Se il client manda `application/json` o un form `urlencoded`, il middleware salta il parsing e l'handler trova `req.body` vuoto, senza alcun errore.

## Configurazione: le opzioni che contano

```javascript
import multer from "multer";

const upload = multer({
  dest: "uploads/", // cartella creata da Multer se manca
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 12 },
  fileFilter(req, file, cb) {
    if (!["image/png", "image/jpeg"].includes(file.mimetype)) {
      return cb(new Error("MIME non ammesso"));
    }
    cb(null, true); // false = scarta in silenzio
  },
});

app.post("/profilo", upload.single("avatar"), (req, res) => {
  res.status(201).json({ file: req.file.filename, nome: req.body.nome });
});
```

| Opzione | Effetto | Default |
| --- | --- | --- |
| `dest` | cartella su disco, nome casuale senza estensione | assente: memoria |
| `storage` | engine esplicito (disco o memoria) | `memoryStorage` implicito |
| `limits` | limiti passati a busboy, per richiesta | `fileSize`, `files`, `parts` illimitati |
| `fileFilter` | accetta, scarta o fallisce per ogni file | accetta tutto |
| `preservePath` | conserva il percorso client in `originalname` | `false` |

Da Multer 2.x `limits` può essere una funzione `(req) => ({...})`, chiamata una volta per richiesta prima del parsing, così un utente autenticato può avere un tetto diverso. I limiti valgono per l'intera richiesta: non esiste un limite per singolo file, e per distinguere i file si usa `fileFilter` o uno storage engine custom. Attenzione al secondo dettaglio della versione 2: il default di `defParamCharset` è `latin1`, quindi `originalname` con caratteri UTF-8 appare corrotto finché non passi `defParamCharset: "utf8"`.

## Metodi di accettazione

Il metodo decide quali campi file sono ammessi e in quale proprietà finiscono i risultati.

| Metodo | Campi accettati | Risultato |
| --- | --- | --- |
| `.single("avatar")` | uno solo, con quel nome | `req.file`, `req.body` |
| `.array("photos", 12)` | fino a 12 con lo stesso nome | `req.files` (array) |
| `.fields([{name:"a",maxCount:1},...])` | elenco esplicito | `req.files` (oggetto) |
| `.none()` | nessuno, solo testo | `req.body` |
| `.any()` | tutti | `req.files` (array) |

`.any()` non deve mai essere montato globalmente: accetta file su rotte che non li gestiscono, e un client può riempirle di dati. I file scartati da `fileFilter` non contano per il `maxCount` di `.array()`, mentre contano per `limits.files`.

## Storage engine e oggetto file

Senza `dest` né `storage`, Multer usa `memoryStorage`: il file diventa un `Buffer` in `file.buffer`, comodo per ridimensionare un'immagine prima di salvarla e pericoloso con upload grossi o numerosi.

```javascript
const disk = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), // la deve esistere
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
```

| Campo | `diskStorage` | `memoryStorage` |
| --- | --- | --- |
| `fieldname`, `originalname`, `mimetype`, `size` | sì | sì |
| `path`, `destination`, `filename` | sì | no |
| `buffer` | no | sì |

`diskStorage` richiede estensione esplicita nel `filename`: Multer non la aggiunge. Con `destination` come funzione sei tu a dover creare la cartella; con una stringa la crea Multer. Il `filename` fornito dal client è input non fidato: va ignorato o normalizzato, mai concatenato a una directory senza controlli.

## Errori comuni

- **Dimenticare `enctype` nel form**: il browser invia `urlencoded` e Multer non elabora nulla; `req.body` resta vuoto.
- **Usare `express.json()` come sostituto**: il middleware JSON non legge multipart e non solleva errori, quindi il bug sembra un campo mancante.
- **Concatenare `originalname` a un percorso**: con nomi come `../../etc/x` si esce dalla cartella; genera un nome lato server.
- **Lasciare `fileSize` illimitato**: un singolo client può riempire disco o memoria; i limiti sono la difesa contro il DoS.
- **Fidarsi di `mimetype`**: arriva dal client; per verificare il tipo servono magic bytes o un controllo a valle.

## In sintesi

Multer è un adattatore tra il formato multipart e le proprietà di `req`. Il client dichiara nome, tipo e dimensione in header che non sono garanzie; Multer fa parsing in streaming con busboy e poi delega a `storage`. La configurazione minima è una cartella (`dest`) più limiti prudenti; i metodi `.single/.array/.fields` sono un filtro sui nomi dei campi, non sui contenuti. Nella prossima lezione scrivi storage engine, gestisci gli errori `MulterError` e valuti i file prima di fidarti.

## Fonti

- [Multer - GitHub (expressjs/multer)](https://github.com/expressjs/multer)
- [multer middleware - Express.js](https://expressjs.com/en/resources/middleware/multer/)
- [RFC 7578 - Returning Values from Forms: multipart/form-data](https://www.rfc-editor.org/rfc/rfc7578.html)
- [busboy - GitHub](https://github.com/mscdex/busboy)
