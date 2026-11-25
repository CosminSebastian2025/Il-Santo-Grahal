Un upload che funziona in demo si rompe in tre punti precisi: l'autorizzazione che deve sapere chi è l'utente, il file che arriva con metadati sbagliati o troppo grande, e il database che resta disallineato rispetto allo storage. Questa lezione costruisce le difese per ciascuno di quei punti usando le API di UploadThing: `UTFiles` per riscrivere nome e `customId` in `middleware`, `onUploadError` per la pulizia, `UTApi` per la gestione lato server e le URL firmate per i file privati.

## Obiettivi

- Proteggere una route con sessione e dati di dominio, passando metadati tipizzati al callback.
- Usare il simbolo `UTFiles` per riscrivere nomi e impostare `customId` prima dell'upload.
- Gestire errori e file orfani con `onUploadError` e `utapi.deleteFiles`.
- Distinguere ACL pubblico da privato e generare URL firmate di breve durata.
- Evitare le chiamate di rete inutili a `getFileUrls` e `listFiles`.

## Autorizzazione e metadati

Il `middleware` è l'unico punto in cui gira il tuo codice prima che le presigned URL vengano emesse. Ha accesso alla `req` dell'adapter, quindi alla sessione, ai cookie e agli header; ciò che restituisce diventa `metadata` in `onUploadComplete` e non transita mai dal browser. Tutto ciò che il client invia come `input` è invece dato non fidato, validato dallo schema ma comunque da non usare come prova di identità.

```ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTFiles } from "uploadthing/server";
import { z } from "zod";

const f = createUploadthing();

const addContractFile = z.object({
  contractId: z.string().uuid(),
  kind: z.enum(["allegato", "firmato"]),
});

export const documentsRouter = {
  contractFiles: f({
    "application/pdf": { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "8MB", maxFileCount: 10 },
  })
    .input(addContractFile)
    .middleware(async ({ req, files, input }) => {
      const session = await getSession(req);
      if (!session) throw new UploadThingError("Sessione scaduta");

      const contract = await db.contract.findFirst({
        where: { id: input.contractId, ownerId: session.user.id },
        select: { id: true },
      });
      if (!contract) throw new UploadThingError("Contratto non accessibile");

      // riscrive i nomi e imposta un customId per ogni file
      const tagged = files.map((file, index) => ({
        ...file,
        name: `${input.kind}-${index + 1}.pdf`,
        customId: `${contract.id}:${crypto.randomUUID()}`,
      }));

      return { contractId: contract.id, userId: session.user.id, [UTFiles]: tagged };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.contractFile.create({
        data: {
          contractId: metadata.contractId,
          key: file.key,
          customId: file.customId, // nessun ":" ambiguo, è un UUID composto
          name: file.name,
          url: file.ufsUrl,
        },
      });
      return { key: file.key };
    }),
} satisfies FileRouter;
```

| Campo del `file` | Significato | Uso consigliato |
| --- | --- | --- |
| `key` | chiave di storage, immutabile | salvala come chiave esterna nel DB |
| `ufsUrl` | URL pubblico o firmato stabile | usala per `<img>`, download, metadati |
| `name` | nome logico, modificabile | riscritto dal middleware con `UTFiles` |
| `customId` | identificatore tuo | inserito dal middleware, ricercabile con `keyType: "customId"` |
| `size`, `type` | byte e MIME | controlli di coerenza nel callback |

Il simbolo `UTFiles` viene rimosso dal `metadata` che arriva alla callback, quindi non puoi leggerlo lì: serve al SDK per sostituire gli attributi inviati al dominio di ingest. Con `customId` impostato, `deleteFiles`, `getSignedURL` e `updateACL` accettano `{ keyType: "customId" }` (o `defaultKeyType` nel costruttore), così cancelli un file partendo da un identificativo di dominio.

## Errori, pulizia e file orfani

`onUploadError` viene chiamata con `{ error, fileKey }` quando il file non arriva a destinazione: un errore utile per log e metriche, ma non una transazione. Il motivo è che il file **viene già caricato** su storage prima del webhook, quindi un `onUploadComplete` che lancia un'eccezione lascia un oggetto orfano che pagherai comunque. La strategia robusta è due fasi: primi il record su database in stato `pending` quando parli col client, poi in `onUploadComplete` confermi, e un job periodico cancella i `pending` più vecchi di N ore insieme al file.

```ts
// server/cleanup.ts, eseguito da un cron
import { utapi } from "~/server/uploadthing";

export async function purgeOrphans() {
  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const orfani = await db.uploadJob.findMany({
    where: { status: "pending", createdAt: { lt: limite } },
    select: { id: true, key: true },
    take: 500,
  });

  const keys = orfani.map((o) => o.key).filter(Boolean);
  if (keys.length > 0) {
    const res = await utapi.deleteFiles(keys); // restituisce successi ed errori
    console.log("cancellati", keys.length, res);
  }
  await db.uploadJob.deleteMany({ where: { id: { in: orfani.map((o) => o.id) } } });
}
```

Lo stesso principio vale per l'abbandono lato client: un utente che chiude la scheda dopo il `PUT` ma prima del webhook non deve produrre un record fantasma. Salvare la riga `pending` in `onUploadBegin` e confermarla in `onUploadComplete` rende il conteggio dei file verificabile in qualsiasi momento, e ti dà un elenco su cui far girare la pulizia. Le chiavi passate a `deleteFiles` possono essere al massimo centinaia per chiamata: paginare con `take` è parte del disegno, non un dettaglio.

## File privati, URL firmate e server upload

Il valore di `acl` nella configurazione della route (`"private"`) rende il file accessibile solo tramite URL firmata. Da v7.5 `generateSignedURL` firma in locale, senza latenza di rete, con scadenza massima 7 giorni.

```ts
const { ufsUrl } = await utapi.generateSignedURL(file.key, { expiresIn: "10 minutes" });

export async function uploadReport(formData: FormData) {
  "use server";
  const pdf = formData.get("report");
  if (!(pdf instanceof File) || pdf.type !== "application/pdf") throw new Error("PDF richiesto");
  const [res] = await utapi.uploadFiles([pdf], { acl: "private" });
  if (res.error) throw new Error(res.error.message);
  return db.report.create({ data: { key: res.data.key, url: res.data.url } });
}
```

`uploadFiles` restituisce una struttura `{ data, error }` per ogni file: non lancia in caso di fallimento applicativo, e controllare `error` è obbligatorio. Il metodo accetta anche `concurrency` (1–25) e `metadata` JSON, informativo e non sostituibile ai controlli nel database.

## Errori comuni

- **Fidarsi di `input` per l'identità**: un `userId` inviato dal client è una richiesta, non una prova; ricava l'utente dalla sessione in `middleware`.
- **Gestire la cancellazione solo in `onUploadError`**: l'errore noto non copre le eccezioni della callback né gli utenti che abbandonano; serve un job di riconciliazione.
- **Pensare che `private` significhi "non indicizzabile"**: il file è raggiungibile con la URL firmata; contingentane la scadenza e non loggarla.
- **Controllare `res.error` a memoria di `data`**: `utapi.uploadFiles` non lancia, quindi un `res.data.key` senza guardia produce un crash su `null`.
- **Usare `getFileUrls` in un ciclo di rendering**: è deprecata e fa una chiamata di rete; salva `ufsUrl` in fase di upload.

## In sintesi

La sicurezza di una route dipende dal `middleware`, che riscrive nome e `customId` con `UTFiles` e passa metadati affidabili al callback. La robustezza dipende dalla riconciliazione: `pending`, conferma in `onUploadComplete`, pulizia periodica con `UTApi`. I file privati si servono con `generateSignedURL`.

## Fonti

- [UploadThing - File Routes](https://docs.uploadthing.com/file-routes)
- [UploadThing - Authentication & Security](https://docs.uploadthing.com/concepts/auth-security)
- [UploadThing - UTApi](https://docs.uploadthing.com/api-reference/ut-api)
- [UploadThing - Regions and ACLs](https://docs.uploadthing.com/concepts/regions-acl)
