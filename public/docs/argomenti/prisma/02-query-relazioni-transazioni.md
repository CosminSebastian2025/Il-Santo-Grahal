Il client Prisma diventa utile quando la query è la parte più complessa del lavoro: relazioni annidate, filtri su più campi, aggregazioni, paginazione e transazioni. In questa lezione impari a modellare il caricamento dei dati con `include` e `select`, a scrivere filtri compositi e a misurare il costo delle query con il logging. Impari anche quando scendere a `$queryRaw` e come gestire le transazioni senza bloccare la connessione del pool.

## Obiettivi

- Scegliere fra `include` e `select` per limitare i dati e le query generate.
- Filtrare con operatori (`OR`, `AND`, `not`, `some`, `every`) e ordinare con relazioni.
- Gestire paginazione a offset e a cursore senza duplicare risultati.
- Usare `$transaction` interattiva e batch con i giusti tempi di timeout.
- Scrivere SQL tipizzato con `$queryRaw` solo quando serve.

## Caricare relazioni senza esagerare

`include` aggiunge relazioni al risultato, `select` sceglie le colonne. Sono esclusivi e si compongono: un `select` con `author: { select: { name: true } }` restituisce solo alcuni campi del padre e del figlio. Differenza pratica: con `include` ottieni anche `passwordHash` degli utenti, con `select` no.

```ts
// solo i campi che servono, con autore ridotto al nome
const posts = await prisma.post.findMany({
  where: { published: true },
  select: {
    id: true,
    title: true,
    author: { select: { id: true, name: true } },
    _count: { select: { tags: true } },
  },
  orderBy: { createdAt: "desc" },
  take: 20,
});
```

Il problema classico è l'N+1: una query per la lista e una per riga. Prisma usa query separate con join in memoria, quindi sul database compaiono due o tre query. Per relazioni rischiose (un autore con 10.000 post) limita i figli con `take`:

```ts
const autori = await prisma.user.findMany({
  select: {
    id: true, name: true,
    posts: { select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 3 },
  },
});
```

| Bisogno | Opzione | Effetto |
| --- | --- | --- |
| tutti i campi più una relazione | `include: { author: true }` | più dati, più payload |
| campi scelti | `select: { ... }` | payload minimo |
| conteggio relazioni | `_count: { select: { tags: true } }` | una query di conteggio |
| figli limitati | `posts: { take: 3 }` | evita relazioni enormi |
| filtro sui figli | `where: { posts: { some: { published: true } } }` | filtra i padri |

## Filtri e ordinamento

Gli operatori si scrivono come oggetti, non come stringhe: `contains`, `startsWith`, `endsWith`, `in`, `notIn`, `gt`, `lte`, `not`, e i combinatori `OR`, `AND`, `NOT`. Per le relazioni esistono `some`, `every` e `none`. Il testo `contains` su PostgreSQL è case sensitive con `mode: "insensitive"` come opzione esplicita.

```ts
const annunci = await prisma.post.findMany({
  where: {
    published: true,
    createdAt: { gte: new Date("2026-01-01") },
    OR: [
      { title: { contains: "prisma", mode: "insensitive" } },
      { tags: { some: { name: { in: ["orm", "typescript"] } } } },
    ],
    AND: [{ author: { email: { endsWith: "@example.com" } } }],
  },
  orderBy: [{ createdAt: "desc" }, { id: "asc" }],
});
```

Il secondo `orderBy` esiste perché `createdAt` può ripetersi: senza un criterio deterministico due pagine possono contenere la stessa riga. Il difetto emerge tardi, come duplicati in fondo alla lista.

## Paginazione e aggregazioni

L'offset è semplice e fragile: con `skip: 1000` il database scarta comunque 1.000 righe. Il cursore riparte dall'ultimo elemento ordinato:

```ts
async function pagina(cursor?: number) {
  const items = await prisma.post.findMany({
    where: { published: true },
    orderBy: { id: "asc" },
    take: 21, // 20 + 1 per capire se esiste la pagina dopo
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const hasMore = items.length === 21;
  return { items: items.slice(0, 20), nextCursor: hasMore ? items[19].id : null };
}
```

Le aggregazioni si fanno con `count`, `aggregate` e `groupBy`, con nomi riservati `_avg`, `_sum`, `_min`, `_max`, `_count`:

```ts
const perAutore = await prisma.post.groupBy({
  by: ["authorId"],
  where: { published: true },
  _count: { _all: true },
  _max: { createdAt: true },
  orderBy: { _count: { authorId: "desc" } },
  take: 10,
});
```

## Transazioni e SQL grezzo

`$transaction` accetta un array di operazioni (batch) o una callback con il client `tx`, da usare quando una query dipende dal risultato della precedente. La callback ha timeout predefinito di 5 secondi e attesa sul pool; alzali solo con una misura alla mano.

```ts
await prisma.$transaction(async (tx) => {
  const utente = await tx.user.create({ data: { email: "ada@example.com" } });
  await tx.credit.create({ data: { userId: utente.id, amount: 100 } });
  return utente;
}, { timeout: 10_000 });
```

Per SQL specifico (window function, `LATERAL`, `ON CONFLICT`) usa `$queryRaw` con `Prisma.sql`: mai interpolare stringhe, o ricrei la superficie di SQL injection che il client evita.

```ts
import { Prisma } from "@prisma/client";

const email = "ada@example.com";
const righe = await prisma.$queryRaw<{ id: string }[]>(
  Prisma.sql`SELECT id FROM "User" WHERE email = ${email}`
);
```

## Misurare il costo delle query

Scrivere query tipizzate non dice quanto costano. Prisma può emettere il log delle query con il tempo impiegato e il SQL prodotto: è la prima cosa da attivare quando una vista sembra lenta.

```ts
const prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
prisma.$on("query", (e) => {
  if (e.duration > 100) console.warn(e.duration, "ms", e.query, e.params);
});
```

Nel log tipico di una lista con autore e conteggio dei tag compaiono una query per i post, una con `IN (...)` per gli autori e una `GROUP BY` per i conteggi: sono le tre query attese, non un N+1. Se dieci post generano dieci query separate, di solito chiama Prisma una funzione dentro `map`, non l'`include`.

Due controlli che valgono più di molte ottimizzazioni: un `@@index` sulle colonne di `where` e `orderBy`, che il client non crea mai da solo, e un `EXPLAIN ANALYZE` a mano sullo stesso filtro. Il tipo `Json` e le colonne `String` con `mode: "insensitive"` sono i candidati più comuni a full scan: su PostgreSQL il confronto case-insensitive richiede un indice dedicato o una colonna normalizzata.

```sql
EXPLAIN ANALYZE
SELECT "id", "title" FROM "Post"
WHERE "published" = true ORDER BY "createdAt" DESC LIMIT 20;
-- Seq Scan se manca l'indice composto su (published, "createdAt")
```

## Errori comuni

- **`include: { author: true }` su liste grandi**: scarica tutti i campi di tutti gli autori; usa `select`.
- **`skip` profondo come paginazione principale**: il costo cresce con la profondità, e il cursore esiste apposta.
- **Transazione interattiva che chiama API esterne**: una chiamata da 4 secondi dentro la callback supera il timeout di 5 secondi e rollbacka tutto.
- **`$queryRawUnsafe` con stringhe concatenate**: diventa SQL injection classica; `Prisma.sql` con i parametri non lo è.
- **Filtri `mode: "insensitive"` senza indice**: ogni `contains` con `%...%` diventa un full scan, indipendente dall'ORM.

## In sintesi

Prisma è tipizzato e leggibile, ma le prestazioni dipendono dal caricamento: `select` invece di `include`, figli limitati con `take`, filtri con operatori. Cursore e ordinamento deterministico evitano duplicati; `$transaction` copre le sequenze logiche, `$queryRaw` resta per i casi non coperti, sempre parametrizzato. Il log delle query mostra forma e tempo dell'SQL generato; gli indici restano un compito dello schema, perché l'ORM tipizza la query ma non la rende veloce. La regola finale è misurare con dati veri: una lista con `take: 20` su 10.000 righe non dice nulla sull'ordine su 10 milioni, e `EXPLAIN ANALYZE` è il giudice che l'intellisense non sostituisce.

## Fonti

- [Prisma ORM - Reading data](https://www.prisma.io/docs/orm/fundamentals/reading-data)
- [Prisma ORM - Relations and joins](https://www.prisma.io/docs/orm/fundamentals/relations-and-joins)
- [Prisma ORM - Pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)
- [Prisma ORM - Transactions](https://www.prisma.io/docs/orm/fundamentals/transactions)
