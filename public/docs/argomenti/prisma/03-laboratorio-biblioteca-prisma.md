In questo laboratorio porti un'applicazione Node che usa `pg` grezzo su Prisma: schema, migrazione, refactoring delle query, seed ripetibile e test con rollback. Alla fine hai `prisma/` versionato, un seed idempotente e test sulla forma dell'SQL generato, cioè il percorso reale di una codebase che adotta un ORM.

## Obiettivi

- Creare lo schema Prisma per un dominio minimo di biblioteca (autori, libri, prestiti).
- Generare e leggere la migrazione SQL prima di applicarla.
- Risolvere il problema del database già popolato con una migrazione di baseline.
- Scrivere un seed idempotente con `upsert` e un test di isolamento con transazione e rollback.
- Confrontare la query scritta a mano con quella generata, leggendo il log.

## Passo 1: preparare il progetto

Servono Node 22 o 24 e un PostgreSQL 16 raggiungibile. Il codice di partenza è una funzione che usa `pg`; la tieni come riferimento per confrontare risultati e latenze.

```bash
mkdir lab-prisma && cd lab-prisma
npm init -y
npm install @prisma/client
npm install -D prisma typescript tsx @types/node pg @types/pg vitest
npx tsc --init --target es2022 --module nodenext --strict
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lab"
npx prisma init --datasource-provider postgresql
```

Con un database già popolato non lasciare che Prisma lo consideri vuoto: la baseline al passo 2 è il punto dove si sbaglia più spesso.

## Passo 2: schema e prima migrazione

```prisma
model Author {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  books     Book[]
  createdAt DateTime @default(now())

  @@index([name])
}

model Book {
  id        Int      @id @default(autoincrement())
  title     String
  isbn      String   @unique
  year      Int
  available Boolean  @default(true)
  authorId  Int
  author    Author   @relation(fields: [authorId], references: [id], onDelete: Restrict)
  loans     Loan[]

  @@index([authorId, year])
}

model Loan {
  id        Int      @id @default(autoincrement())
  bookId    Int
  book      Book     @relation(fields: [bookId], references: [id])
  reader    String
  loanedAt  DateTime @default(now())
  returnedAt DateTime?

  @@unique([bookId, reader, loanedAt])
}
```

`onDelete: Restrict` è la scelta che impedisce di cancellare un autore con libri in catalogo, mentre `@@unique([bookId, reader, loanedAt])` rende il seed ripetibile senza duplicare un prestito. La migrazione si crea con un nome parlante:

```bash
npx prisma migrate dev --name init
cat prisma/migrations/*_init/migration.sql
```

Leggi l'SQL prima di applicarlo: se compare un `DROP TABLE`, fermati e ricontrolla lo schema. Con database già esistenti, `prisma db pull` porta dentro il modello corrente, e la prima `migrate dev` chiede una baseline.

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql
mkdir -p prisma/migrations/0_init && mv baseline.sql prisma/migrations/0_init/migration.sql
npx prisma migrate resolve --applied 0_init
npx prisma migrate dev --name add_loan_returned_at
```

Da quel momento `migrate dev` produce solo differenze rispetto allo schema.

## Passo 3: refactoring delle query

La query originale, con stringhe e tipi `any`, era più o meno così:

```ts
// prima
const { rows } = await pg.query(
  "SELECT b.id, b.title, a.name FROM books b JOIN authors a ON a.id = b.author_id " +
  "WHERE b.available = $1 ORDER BY b.year DESC LIMIT $2", [true, 10]);
```

Dopo il refactoring la traduzione diretta è una `findMany` con `select`, e il risultato ha lo stesso contenuto con tipi derivati dallo schema:

```ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });

const libri = await prisma.book.findMany({
  where: { available: true },
  select: { id: true, title: true, author: { select: { name: true } } },
  orderBy: { year: "desc" },
  take: 10,
});
```

Con il log attivo annota quante query partono: con `include` e `_count` su 10 libri sono tre (libri, autori, conteggi), non undici. Per la ricerca case-insensitive serve `mode: "insensitive"` con un indice dedicato, che il client non crea.

## Passo 4: seed idempotente

Il seed deve poter girare due volte senza errori e senza duplicati. `upsert` con `where` su un campo `@unique` è il mattone; per i prestiti la chiave composta garantisce l'idempotenza.

```ts
async function main() {
  const autori = [
    { name: "Italo Calvino", email: "calvino@example.com" },
    { name: "Natalia Ginzburg", email: "ginzburg@example.com" },
  ];
  for (const a of autori) {
    await prisma.author.upsert({ where: { email: a.email }, update: {}, create: a });
  }
  const autore = await prisma.author.findUniqueOrThrow({ where: { email: "calvino@example.com" } });
  const libro = await prisma.book.upsert({
    where: { isbn: "9788804215898" },
    update: {},
    create: { title: "Le città invisibili", isbn: "9788804215898", year: 1972, authorId: autore.id },
  });
  const loanedAt = new Date("2026-11-01T09:00:00Z");
  await prisma.loan.upsert({
    where: { bookId_reader_loanedAt: { bookId: libro.id, reader: "mario", loanedAt } },
    update: {},
    create: { bookId: libro.id, reader: "mario", loanedAt },
  });
}
main().finally(() => prisma.$disconnect());
```

Il nome `bookId_reader_loanedAt` è il nome generato per la chiave composta; si vede nell'autocompletamento dell'editor. Esegui `npx prisma db seed` due volte e controlla che `SELECT COUNT(*) FROM "Loan"` resti stabile.

## Passo 5: test con transazione e rollback

I test di integrazione su database reale sono fragili se scrivono dati persistenti. Avvolgi ogni test in una transazione che lancia un errore alla fine: con `$transaction` interattiva il rollback riporta il database allo stato iniziale.

```ts
import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROLLBACK = new Error("rollback");

async function inTx<T>(fn: (tx: PrismaClient) => Promise<T>) {
  try {
    await prisma.$transaction(async (tx) => { await fn(tx as PrismaClient); throw ROLLBACK; });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
}

describe("prestiti", () => {
  it("non permette due prestiti contemporanei allo stesso libro", async () => {
    await inTx(async (tx) => {
      const libro = await tx.book.findFirstOrThrow({ where: { available: true } });
      await tx.loan.create({ data: { bookId: libro.id, reader: "sara" } });
      await tx.book.update({ where: { id: libro.id }, data: { available: false } });
      await expect(
        tx.loan.create({ data: { bookId: libro.id, reader: "luca" } })
      ).resolves.toBeTruthy(); // il vincolo applicativo è nel codice, non nello schema
    });
  });
});

afterAll(() => prisma.$disconnect());
```

Il test è volutamente debole: il database accetta due prestiti. La scelta consapevole è un vincolo `@@unique([bookId, status])` con stato attivo o una transazione con controllo, e il test va scritto prima del codice.

## Esercizi

1. Aggiungi un modello `Review` con chiave composta (`bookId`, `reader`) e una migrazione che la crei.
2. Sostituisci `findMany` con una query `$queryRaw` che usa `LEFT JOIN` per contare i prestiti attivi per autore e confronta i risultati.
3. Esegui `npx prisma migrate deploy` su un database vuoto e verifica che non generi nuove migrazioni.
4. Riduci una vista da 3 a 1 query usando `relationLoadStrategy` o una query nativa, e misura la latenza.
5. Cancella un autore con libri: che errore restituisce `Restrict`, e come lo scriveresti come test?

<details>
<summary>Soluzione</summary>

1. Il modello usa `@@id([bookId, reader])` e le due relazioni verso `Book` e verso una tabella dei lettori, se esiste.
2. La query nativa restituisce lo stesso conteggio solo se gestisci i libri senza prestiti con `COUNT` e non `COUNT(l.id)`; il confronto sui valori è l'esercizio vero.
3. `migrate deploy` applica le migrazioni esistenti senza crearne, e sul database vuoto serve la baseline.
4. Con caricamento tipizzato le query sono tre; la nativa ne fa una, con più SQL scritto a mano e meno margine di errore. Il trade-off va documentato.
5. `Restrict` produce un errore di vincolo esterno; il test usa `rejects.toThrow` e verifica che l'autore esista ancora dopo il tentativo.

</details>

## Errori comuni

- **Dimenticare `onDelete` e stupirsi per il vincolo**: il default è `Restrict` solo in alcuni provider, e in altri Prisma segnala un'ambiguità in validazione.
- **Seed non idempotente con `create`**: la seconda esecuzione fallisce sull'`@unique` e la CI si blocca.
- **Aprire `PrismaClient` dentro un handler HTTP**: il pool si esaurisce; il client va istanziato una volta e riusato.
- **Test che lasciano dati nel database condiviso**: la suite diventa non deterministica; usa la transazione con rollback.
- **Baseline dimenticata su database esistente**: la prima migrazione prova a creare tabelle già presenti e fallisce.

## In sintesi

Hai portato un dominio con tre entità da `pg` a Prisma: schema con indici e vincoli, migrazione letta prima di applicarla, baseline per il database esistente, seed idempotente e test in transazione con rollback. Il repository si apre con `migrate deploy` e `db seed`. Il guadagno non è l'assenza di SQL ma SQL generato, tipizzato e versionato: la difficoltà si sposta dalla sintassi delle query al progetto dello schema, ed è lì che serve attenzione.

## Fonti

- [Prisma ORM - Migrations, how they work](https://www.prisma.io/docs/orm/migrations/how-migrations-work)
- [Prisma ORM - Writing data](https://www.prisma.io/docs/orm/fundamentals/writing-data)
- [Prisma ORM - Raw queries](https://www.prisma.io/docs/orm/prisma-client/queries/raw-database-access/raw-queries)
- [Prisma ORM - Transaction (client reference)](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
