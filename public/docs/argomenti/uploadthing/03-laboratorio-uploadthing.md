In questo laboratorio costruisci end-to-end la funzione più richiesta in un gestionale: l'allegato di una pratica. Un utente autenticato carica un PDF dalla pagina della pratica, il file entra in una route privata con nome e `customId` controllati dal server, il database registra l'allegato, e un endpoint protetto restituisce una URL firmata temporanea. Chiudiamo con la cancellazione consistente e un checklist di verifica. Serve un progetto Next.js con App Router già avviabile; il codice è TypeScript e presuppone Prisma, ma qualunque ORM va bene.

## Obiettivi

- Configurare un FileRouter con una route `practiceAttachment` autenticata e a dimensione controllata.
- Collegare il componente React `UploadDropzone` alla route passando `practiceId` come input validato.
- Persistere l'allegato in `onUploadComplete` e servirlo con `generateSignedURL`.
- Cancellare in modo consistente storage e database, senza file orfani.
- Verificare il comportamento con casi negativi, non solo con il percorso felice.

## Passo 1 - Preparare l'ambiente e il modello

Installa i pacchetti: `npm i uploadthing @uploadthing/react zod` più il client ORM. Nel pannello di UploadThing crea l'app e copia il token in `.env` come `UPLOADTHING_TOKEN`, trattandolo come segreto: non deve mai comparire in variabili `NEXT_PUBLIC_*`.

```prisma
model Attachment {
  id        String   @id @default(cuid())
  practiceId String
  key       String   @unique
  name      String
  size      Int
  status    String   @default("pending")
  createdAt DateTime @default(now())
}
```

Il campo `status` distingue `pending` da `ready`: la riga nasce quando il client annuncia l'upload e diventa definitiva solo nella callback del server.

## Passo 2 - Definire la FileRoute

```ts
// src/app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { getSession } from "@/lib/session";

const f = createUploadthing();

export const ourFileRouter = {
  practiceAttachment: f({ pdf: { maxFileSize: "8MB", maxFileCount: 3 } })
    .input(z.object({ practiceId: z.string().cuid() }))
    .middleware(async ({ req, input }) => {
      const session = await getSession(req);
      if (!session) throw new UploadThingError("Non autenticato");
      const practice = await db.practice.findFirst({
        where: { id: input.practiceId, ownerId: session.user.id },
        select: { id: true },
      });
      if (!practice) throw new UploadThingError("Pratica non trovata");
      return { practiceId: practice.id, userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.attachment.create({
        data: {
          practiceId: metadata.practiceId,
          key: file.key,
          name: file.name,
          size: file.size,
          status: "ready",
        },
      });
      return { key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

Tre dettagli non negoziabili. Il controllo di appartenenza è nel `middleware`, perché è l'unico punto in cui la sessione è verificata prima che il file venga accettato. La dimensione è dichiarata nella route e non solo nel componente. Il valore restituito da `onUploadComplete` finisce in `onClientUploadComplete` come `serverData`: non metterci segreti, ma è il posto giusto per restituire l'`id` della riga creata.

## Passo 3 - Esporre l'handler HTTP

```ts
// src/app/api/uploadthing/route.ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
```

In development serve anche il plugin per gli stili:

```tsx
// src/app/layout.tsx (estratto)
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "./api/uploadthing/core";

<NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
```

## Passo 4 - Generare il componente e collegarlo

```ts
// src/utils/uploadthing.ts
import { generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadDropzone = generateUploadDropzone<OurFileRouter, "practiceAttachment">();
```

```tsx
// src/components/PracticeAttachment.tsx
"use client";
import { UploadDropzone } from "@/utils/uploadthing";

export function PracticeAttachment({ practiceId }: { practiceId: string }) {
  return (
    <UploadDropzone
      endpoint="practiceAttachment"
      input={{ practiceId }}
      onClientUploadComplete={(res) => {
        console.log("allegati caricati", res.map((r) => r.serverData?.key));
      }}
      onUploadError={(error) => alert(`Upload fallito: ${error.message}`)}
    />
  );
}
```

Il tipo generico `<OurFileRouter, "practiceAttachment">` vincola `endpoint` e `input`: se cambi lo schema Zod e dimentichi di aggiornare la pagina, il build fallisce.

## Passo 5 - Servire il file con URL firmata

La route usa `acl: "private"`; senza questo, `generateSignedURL` non è necessario ma il file è pubblico. Aggiungi `f({ pdf: { maxFileSize: "8MB", acl: "private" } })` e poi:

```ts
// src/app/api/attachments/[id]/route.ts
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession(req);
  if (!session) return new Response("Non autenticato", { status: 401 });
  const attachment = await db.attachment.findFirst({
    where: { id: params.id, practice: { ownerId: session.user.id } },
  });
  if (!attachment) return new Response("Non trovato", { status: 404 });
  const { ufsUrl } = await utapi.generateSignedURL(attachment.key, {
    expiresIn: "10 minutes",
  });
  return Response.redirect(ufsUrl);
}
```

La scadenza breve è intenzionale: un URL copiato in chat smette di funzionare.

## Passo 6 - Cancellazione consistente

```ts
// src/app/actions/deleteAttachment.ts
"use server";
export async function deleteAttachment(id: string) {
  const session = await getSession();
  if (!session) throw new Error("Non autenticato");
  const attachment = await db.attachment.findFirst({
    where: { id, practice: { ownerId: session.user.id } },
  });
  if (!attachment) throw new Error("Non trovato");
  const res = await utapi.deleteFiles([attachment.key]);
  if (res.error) throw new Error("Storage non raggiungibile");
  await db.attachment.delete({ where: { id } });
}
```

`deleteFiles` restituisce `{ success, deletedCount }` o `error` e non lancia. Se lo storage fallisce non devi cancellare la riga, altrimenti perdi il riferimento a un file che resta accessibile. L'ordine inverso, riga prima e file dopo, è accettabile solo con un job che ripassa gli orfani: qui scegliamo la variante più semplice da ragionare.

## Verifica

- Caricando un PDF valido dalla pratica propria, compare una riga `ready` e il file si apre dalla URL firmata.
- Caricando un file da un'altra pratica (modifica `practiceId` nella console del browser), il server risponde con errore di autorizzazione e nessuna riga viene creata.
- Un file da 20 MB viene rifiutato prima di occupare storage.
- Dopo la cancellazione, la URL firmata non serve più il file.
- Un utente non autenticato che apre `/api/attachments/<id>` riceve 401.

## Esercizi

Aggiungi un campo `note` opzionale all'input e salvalo in `metadata` della riga. Poi implementa un endpoint che elenca gli allegati di una pratica usando `utapi.listFiles` in un job notturno, confrontando lo storage con il database per individuare orfani.

## Errori comuni

- **Sostituire il `middleware` con un controllo nel componente**: il client non è affidabile; il controllo di appartenenza deve stare nel server.
- **Restituire `file.ufsUrl` per un file privato**: una URL `private` non è servibile direttamente; serve `generateSignedURL`.
- **Salvare `customId` come identità applicativa**: è un contatore di file della app, non una chiave esterna verso le tue pratiche.
- **Dimenticare il `type` generico in `generateUploadDropzone`**: perdi la validazione statica di `input` e `endpoint`.
- **Cancellare il database prima dello storage senza riconciliazione**: ogni errore lascia file pagati e invisibili.

## In sintesi

Il laboratorio tiene insieme i pezzi: la route dichiara limiti e ACL, il `middleware` autentica e lega il file alla pratica, `onUploadComplete` crea la riga `ready`, `generateSignedURL` serve il file privato per pochi minuti e `deleteFiles` chiude il ciclo con una guardia sull'errore.

## Fonti

- [UploadThing - Getting Started (App Router)](https://docs.uploadthing.com/getting-started/appdir)
- [UploadThing - Uploading Files](https://docs.uploadthing.com/uploading-files)
- [UploadThing - UTApi](https://docs.uploadthing.com/api-reference/ut-api)
- [UploadThing - Regions and ACLs](https://docs.uploadthing.com/concepts/regions-acl)
