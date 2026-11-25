Prisma è un ORM per Node.js e TypeScript che sostituisce il classico "query builder con stringhe SQL" con uno schema dichiarativo, un client generato tipizzato e migrazioni che allineano il database. La differenza è il punto di partenza: si parte dal file di schema, non dalle classi del dominio. In questa lezione impari le tre parti di Prisma, come si modella il dominio con `model` e `relation` e perché il client generato rende impossibile interrogare un campo che non esiste.

## Obiettivi

- Distinguere schema, client generato e migrazioni, e capire chi legge cosa.
- Modellare entità e relazioni con `model`, `@id`, `@unique`, `@relation` e `@@index`.
- Collegare Prisma a PostgreSQL in un progetto Node con la configurazione attuale.
- Eseguire le prime query con `findMany`, `findUnique` e `create`.
- Riconoscere il ciclo di lavoro fra modifica dello schema, generazione cliente e migrazione.

## Tre pezzi che lavorano insieme

Prisma si compone di:

1. **Schema** (Prisma Schema Language, o PSL): descrizione dei modelli, delle relazioni, delle connessioni e delle viste. È la fonte di verità.
2. **Client generato**: codice TypeScript che espone metodi come `prisma.user.findUnique({ where: { email } })` e tipi derivati dallo schema.
3. **CLI e migrazioni**: comandi `npx prisma` che leggono lo schema, producono migrazioni SQL e applicano i cambiamenti.

Il client supporta join lato applicazione, transazioni, paginazione a cursore e aggregazioni di base; non è un ActiveRecord, ma un oggetto con un namespace per tabella.

Nota sulle versioni: la documentazione del 25 novembre 2026 è centrata su Prisma ORM 8, ancora in release candidate, mentre la 7 resta pienamente supportata. Gli esempi usano la sintassi 6/7, la più diffusa in produzione, e segnalano le differenze della 8. La 8 richiede Node.js 22.18+, 24.11+ o 26+.

```bash
npm init -y
npm install -D prisma typescript tsx @types/node
npm install @prisma/client
npx prisma init --datasource-provider postgresql
```

Il comando crea `prisma/schema.prisma` con `datasource db`, `generator client` e la variabile `DATABASE_URL`. Nella release candidate 8 il file si chiama `contract.prisma` e sta in `src/prisma/`, e `npx prisma contract emit` sostituisce `generate`: il concetto non cambia, cambiano i nomi. Controlla il major nel `package.json` prima di copiare comandi dai vecchi tutorial.

## Lo schema: modelli e relazioni

```prisma
// prisma/schema.prisma (Prisma 6/7)
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  posts     Post[]
  profile   Profile?

  @@index([createdAt])
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Post {
  id         Int       @id @default(autoincrement())
  title      String
  body       String?   @db.Text
  published  Boolean   @default(false)
  createdAt  DateTime  @default(now())
  authorId   String
  author     User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  tags       Tag[]     @relation("PostToTag")

  @@index([authorId, createdAt])
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[] @relation("PostToTag")
}
```

`@id` definisce la chiave primaria, `@unique` il vincolo di unicità, `?` la nullabilità. Le relazioni non sono implicite: il lato con la chiave estera (il "proprietario") dichiara `fields` e `references`, mentre il lato opposto ha solo la lista del tipo opposto (`posts Post[]`). La relazione uno-a-uno fra `User` e `Profile` è indicata dal fatto che `profile` è singolare (`Profile?`) e da `@unique` su `userId`. Le relazioni molti-a-molti implicite si scrivono con due liste e un nome di relazione, `@relation("PostToTag")`, che il database traduce in una tabella di join gestita da Prisma. `@@index` anticipa i filtri che userai nelle query.

## Un client generato

Dopo `npx prisma generate` il client si importa così:

```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: { email: "ada@example.com", name: "Ada L.", profile: { create: { bio: "matematica" } } },
  });

  const posts = await prisma.post.findMany({
    where: { published: true, author: { email: { endsWith: "@example.com" } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { author: { select: { name: true } } },
  });

  const novita = await prisma.post.count({
    where: { createdAt: { gte: new Date("2026-11-01") } },
  });

  console.log(posts.length, novita);
}

main().finally(() => prisma.$disconnect());
```

Il vantaggio è il compilatore: `where: { autohr: ... }` fa fallire `tsc`, e `posts[0].author.name` è `string | null` perché `name` è opzionale. Il prezzo è che i tipi sono generati: senza `generate` l'editor mostra campi vecchi.

| Operazione | Metodo Prisma | SQL equivalente |
| --- | --- | --- |
| chiave | `findUnique({ where: { id } })` | `WHERE id = $1 LIMIT 1` |
| lista | `findMany({ where, orderBy, take })` | `WHERE ... ORDER BY ... LIMIT` |
| conteggio | `count({ where })` | `COUNT(*)` |
| upsert | `upsert({ where, create, update })` | `INSERT ... ON CONFLICT` |
| gruppo | `groupBy({ by, _count, _avg })` | `GROUP BY` |

## Il ciclo di lavoro

Il ciclo è sempre lo stesso:

1. modifichi lo schema;
2. la migrazione di sviluppo confronta schema e database e scrive un file SQL;
3. rigeneri il client;
4. usi il nuovo client, poi ripeti.

Aggiungere `phone String?` produce `ALTER TABLE "User" ADD COLUMN "phone" TEXT;` e la rigenerazione del client. Le migrazioni stanno in `prisma/migrations/<timestamp>_<nome>/migration.sql` e si committano con lo schema. Con il provider `prisma-client-js` le tabelle prendono il nome del modello, quindi `SELECT * FROM "User"` richiede le virgolette; `@@map("users")` sposta tutto su snake_case.

## Errori comuni

- **Nessun `@relation` sul lato con la chiave estera**: Prisma chiede la validazione e il modello non compila; l'errore cita la relazione mancante per campo e modello.
- **Dimenticare `@unique` sul lato dell'FK della relazione uno-a-uno**: il codice diventa uno-a-molti senza avviso, e il client restituisce array dove ne aspettavi uno.
- **Lanciare le query prima di `prisma generate`**: TypeScript non conosce i nuovi modelli e l'esecuzione fallisce con un client vecchio.
- **Mettere `provider = "postgresql"` e usare una connessione con `sslmode=disable` in cloud**: la connessione fallisce dopo qualche secondo con un errore di driver, non di Prisma.
- **Chiamare `prisma.$disconnect()` dopo ogni richiesta HTTP**: il pool viene chiuso e riaperto, e in sviluppo si vede una latenza che non esiste.

## In sintesi

Prisma trasforma lo schema in codice: i modelli dichiarano tabelle e relazioni, il client li rende tipi TypeScript, le migrazioni tengono il database allineato. Uno-a-uno, uno-a-molti e molti-a-molti si distinguono per la forma del campo e per `@unique` sull'FK, e il ciclo schema → migrazione → generate è la disciplina quotidiana, con l'SQL della migrazione letto prima di applicarlo ai dati. Le versioni 7 e 8 cambiano nomi di file e comandi, non il modello concettuale.

## Fonti

- [Prisma ORM - Introduction](https://www.prisma.io/docs/orm/overview/introduction/what-is-prisma)
- [Prisma ORM - Schema overview](https://www.prisma.io/docs/orm/prisma-schema/overview)
- [Prisma ORM - Data model and models](https://www.prisma.io/docs/orm/prisma-schema/data-model/models)
- [Prisma ORM - Supported databases](https://www.prisma.io/docs/orm/supported-databases)
