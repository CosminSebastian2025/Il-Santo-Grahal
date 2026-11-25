UploadThing è un servizio di file hosting per applicazioni full-stack TypeScript, con adapter per Next.js, Express, Fastify, H3 e binding per React, Svelte, Vue e Solid. Non è un bucket generico: impone un contratto dichiarativo, la FileRoute, con tipi ammessi, dimensione, numero di file e autorizzazione.

## Obiettivi

- Distinguere upload lato client e lato server e sapere quale conviene.
- Leggere il protocollo reale: richiesta delle presigned URL, PUT sul dominio ingest, callback al tuo server.
- Definire una FileRoute completa con `maxFileSize`, `maxFileCount`, `input` e `middleware`.
- Esporre il router come route handler e montare i componenti React tipizzati.
- Riconoscere i limiti che vanno progettati fin dall'inizio: ACL, `awaitServerData`, dimensione massima per tipo.

## Due modalità di upload

UploadThing separa nettamente due flussi. Nell'upload lato client il file non attraversa mai il tuo server: il browser chiede le presigned URL, il tuo backend verifica il permesso e le firma, poi il browser manda il binario direttamente al dominio `ingest.uploadthing.com`. Nell'upload lato server il file arriva prima su di te (per esempio con una Server Action o un endpoint multipart), può essere validato e trasformato, e solo dopo viene inoltrato dall'istanza `UTApi` del server.

| Aspetto | Lato client | Lato server |
| --- | --- | --- |
| Traffico binario | browser verso UploadThing | server verso UploadThing |
| Validazione del contenuto | solo lato server nel callback | completa, prima dell'upload |
| Router coinvolto | sì, sempre | no, `utapi.uploadFiles` è fuori dal router |
| Costo egress del tuo hosting | nessuno | pagato dal tuo provider |
| Caso tipico | avatar, allegati, media da UI | import, elaborazione, generazione di file |

La documentazione raccomanda il flusso client nella maggior parte dei casi; quello server diventa necessario quando devi rifiutare un file in base al suo contenuto (per esempio un PDF con script incorporati). Attenzione: l'upload lato server non passa dal router, quindi `input`, `middleware` e ogni limite dichiarato in una FileRoute non si applicano e vanno replicati a mano.

## Il protocollo, in quattro passi

Il SDK nasconde quattro chiamate che conviene conoscere, perché le vedi tutte nel pannello Network quando qualcosa non funziona. La prima, `GET /api/uploadthing`, restituisce la configurazione pubblica del router (`extractRouterConfig`), usata dal client per filtrare la selezione.
2. `POST /api/uploadthing?slug=<route>&actionType=upload` esegue `input` e `middleware`; risponde con una presigned URL per ogni file, firmata HMAC SHA256 e valida per una finestra di tempo.
3. `PUT` sulla presigned URL con il corpo del file; UploadThing controlla che nome, dimensione, tipo e slug corrispondano alla firma.
4. Webhook `uploadthing-hook` verso il tuo `callbackUrl`, dove gira `onUploadComplete`. La firma arriva nell'header `x-uploadthing-signature` ed è un HMAC del corpo firmato con la tua API key.

```bash
# il primo passo, a mano, per capire cosa vede il client
curl -s https://tuo-dominio.it/api/uploadthing | jq '."imageUploader"'
# {"maxFileSize":"4MB","maxFileCount":1,"fileTypes":["image/*"]}
```

Il passo 4 è quello che le checklist dimenticano: in sviluppo `localhost` non è raggiungibile dai server UploadThing, quindi il SDK simula la callback con uno stream (`isDev: true`). In produzione un firewall che blocca i webhook lascia passare l'upload ma svuota la tua tabella.

## Dal router ai componenti

Il router è un oggetto le cui chiavi sono gli endpoint. Il tipo `OurFileRouter` derivato da quell'oggetto viene poi passato come generico ai componenti, così `endpoint="imageUploader"` è verificato dal compilatore e l'`input` della route è tipizzato anche nel browser.

```ts
// app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";

const f = createUploadthing();

export const ourFileRouter = {
  avatar: f({
    image: { maxFileSize: "2MB", maxFileCount: 1, minFileCount: 1 },
  })
    .input(z.object({ albumId: z.string().uuid() }))
    .middleware(async ({ req, input }) => {
      const user = await getUserFromRequest(req);
      if (!user) throw new UploadThingError("Non autenticato");
      return { userId: user.id, albumId: input.albumId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.avatar.create({
        data: { userId: metadata.userId, key: file.key, url: file.ufsUrl },
      });
      return { ok: true as const };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

```ts
// app/api/uploadthing/route.ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
```

I valori predefiniti cambiano per tipo di file e non sono uniformi, quindi è un errore comune assumere 4 MB ovunque: `image` e `pdf` partono da 4MB, `video` da 16MB, `audio` e `blob` da 8MB, `text` da 64kB. Se la tua UI promette «video fino a 100 MB» e non scrivi `maxFileSize`, il primo upload da 20 MB fallisce con un errore di validazione che sembra casuale.

```tsx
// utils/uploadthing.ts
import { generateUploadButton, generateUploadDropzone, generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "~/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();
```

I generatori (`generateUploadButton`, `generateUploadDropzone`, `generateReactHelpers`) sostituiscono il vecchio `generateComponents`, deprecato da v6.2.1 per migliorare il tree-shaking. I componenti vanno usati in un file con `"use client"` e richiedono gli stili di UploadThing, che con Tailwind v3 si attivano avvolgendo la configurazione in `withUt`.

## Dati, ACL e attese

`onUploadComplete` gira sul server e riceve `metadata` (ciò che ha restituito `middleware`) e `file`, con `key`, `name`, `size`, `type` e `ufsUrl`. Il valore ritornato, se serializzabile in JSON, arriva al client come `serverData`; `awaitServerData: false` fa chiudere la Promise dell'upload prima del webhook.

Ogni file ha un ACL `public-read` o `private`, che puoi forzare per route solo se nel dashboard hai abilitato la sovrascrittura. Per i file privati l'accesso diretto non basta: generi una URL firmata con `utapi.generateSignedURL(key, { expiresIn: "1 hour" })`, valida al massimo 7 giorni e calcolata in locale senza chiamate di rete. Memorizzare `key` e `ufsUrl` nel tuo database in `onUploadComplete` è la raccomandazione esplicita della documentazione: `listFiles` è uno strumento amministrativo, non una fonte dati per l'applicazione.

## Errori comuni

- **Importare `createUploadthing` dal pacchetto sbagliato**: `uploadthing/next`, `uploadthing/server` e `uploadthing/express` tipizzano `req` in modo diverso; quello sbagliato compila ma perde i tipi.
- **Autorizzare solo nel `middleware` dimenticando `input`**: l'`input` è validato prima di `middleware`, quindi un controllo su un campo di input va fatto dopo quella validazione.
- **Restituire dati non serializzabili da `onUploadComplete`**: `Date`, `Map` e istanze di classi non sopravvivono alla serializzazione; trasforma prima.
- **Usare i vecchi `getFileUrls` e `listFiles` come fonte dati**: la documentazione li indica come amministrativi o deprecati; salva `key` e `ufsUrl` nel tuo database.
- **Assumere che il file esista al ritorno di `onClientUploadComplete`**: senza `awaitServerData` il client può chiudere prima della callback.

## In sintesi

UploadThing è un insieme di vincoli dichiarativi sopra un flusso di presigned URL: il browser carica direttamente, il tuo server autorizza. La FileRoute concentra tipi, limiti, validazione e callback in un oggetto da cui deriva il tipo usato dai componenti. Le decisioni da prendere subito sono tre: client o server upload, ACL pubblico o privato, e se il client deve attendere `onUploadComplete`.

## Fonti

- [UploadThing - Documentazione](https://docs.uploadthing.com/)
- [UploadThing - File Routes](https://docs.uploadthing.com/file-routes)
- [UploadThing - Uploading Files](https://docs.uploadthing.com/uploading-files)
- [UploadThing - Next.js App Router Setup](https://docs.uploadthing.com/getting-started/appdir)
