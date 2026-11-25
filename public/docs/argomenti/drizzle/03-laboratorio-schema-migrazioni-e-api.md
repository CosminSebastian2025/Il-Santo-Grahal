In questo laboratorio porti un mini e-commerce con clienti, ordini e righe d'ordine da zero schema TypeScript fino a migrazioni versionate, seed idempotente e API tipizzata con Vitest. Il database è Postgres su Neon, così provi anche il percorso serverless con `drizzle-orm/neon-http` e con il driver `pg` in locale. Il criterio di successo non è "l'app parte": è che lo schema generi le migrazioni attese, che il seed non duplichi righe, che gli importi non passino mai da un float e che le query abbiano gli indici attesi.

## Obiettivi

- Organizzare schema e relazioni in file separati con tipi derivati esportati.
- Generare e revisionare le migrazioni, poi applicarle su database locale e su Neon.
- Scrivere un seed idempotente con upsert e ordine di inserimento corretto.
- Testare query e transazioni con Vitest, isolando il database di test.

## Impostare progetto e configurazione

Il progetto ha tre file di schema, un config del kit e uno script di test. La separazione per dominio evita i cicli di import: `clienti` non importa `ordini`, e le relazioni arrivano in un file dedicato che importa entrambi.

| File | Contenuto | Perché separato |
| --- | --- | --- |
| `src/db/schema/clienti.ts` | tabella e enum di stato cliente | dominio autonomo |
| `src/db/schema/ordini.ts` | righe e ordini con FK | importa solo `clienti` |
| `src/db/schema/relations.ts` | `relations()` fra tabelle | evita cicli |
| `drizzle.config.ts` | dialetto, schema, output | unico punto di verità del kit |
| `src/db/client.ts` | connessione e `drizzle(..., { schema })` | un client per ambiente |

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  casing: "snake_case",           // camelCase nel codice, snake_case nel DB
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,                    // chiede conferma prima di operazioni distruttive
  verbose: true,
});
```

La riga che salva più tempo è `casing: "snake_case"`: senza, ogni colonna creata con nome esplicito e ogni colonna lasciata al default convivono, e il database finisce con una convenzione mista.

```bash
npm i drizzle-orm @neondatabase/serverless pg
npm i -D drizzle-kit vitest tsx @types/pg

npx drizzle-kit generate --name iniziale
# revisione del SQL prima di applicarlo
cat drizzle/*_iniziale/migration.sql
npx drizzle-kit migrate        # su DATABASE_URL locale
DATABASE_URL="$NEON_URL" npx drizzle-kit migrate   # su Neon
```

## Schema, relazione e migrazioni revisionate

Il codice dello schema è simile a quello della lezione sui fondamenti, con due dettagli che in questo laboratorio contano davvero: l'indice sulla foreign key e il vincolo di unicità sul numero d'ordine, che è il riferimento che userebbe un operatore.

```ts
// src/db/schema/ordini.ts
import { pgTable, serial, uuid, text, numeric, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { clienti } from "./clienti";

export const ordini = pgTable("ordini", {
  id: serial("id").primaryKey(),
  numero: text("numero").notNull(),
  clienteId: uuid("cliente_id").notNull().references(() => clienti.id, { onDelete: "restrict" }),
  totale: numeric("totale", { precision: 12, scale: 2 }).notNull(),
  creatoIl: timestamp("creato_il", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("ordini_numero_uq").on(t.numero), index("ordini_cliente_idx").on(t.clienteId)]);

export const righeOrdine = pgTable("righe_ordine", {
  id: serial("id").primaryKey(),
  ordineId: integer("ordine_id").notNull().references(() => ordini.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
  quantita: integer("quantita").notNull(),
  prezzoUnitario: numeric("prezzo_unitario", { precision: 10, scale: 2 }).notNull(),
}, (t) => [index("righe_ordine_fk_idx").on(t.ordineId)]);
```

Il criterio di revisione del SQL generato è una lista corta:

- nessun `DROP` non voluto: una rinomina gestita male compare come `DROP COLUMN` + `ADD COLUMN`;
- `numeric(12,2)` presente per il totale, non `double precision`;
- `CREATE INDEX` sulle FK e unicità sul numero d'ordine;
- `ON DELETE RESTRICT` sui clienti, così un cliente con ordini non si cancella per errore.

Per leggere il piano sul database devi generare dati: 20.000 ordini su 2.000 clienti bastano perché `EXPLAIN` mostri la differenza tra un indice presente e uno mancante. Se lo schema esistente usa nomi diversi dai tuoi, `drizzle-kit pull` genera i file TypeScript dal catalogo e ti risparmia la riscrittura a mano.

## Seed idempotente

Il seed è il punto in cui i laboratori si rompono: se lo esegui due volte e i numeri d'ordine si duplicano, ogni test successivo è rumore. La soluzione è un upsert con `onConflictDoNothing` o `onConflictDoUpdate`, e un ordine di inserimento che rispetti le FK.

```ts
// scripts/seed.ts
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { clienti } from "../src/db/schema/clienti";
import { ordini, righeOrdine } from "../src/db/schema/ordini";

const CLIENTS = Array.from({ length: 2000 }, (_, i) => ({
  email: `cliente${i}@example.test`,
  nome: `Cliente ${i}`,
}));

async function seed() {
  await db.insert(clienti).values(CLIENTS).onConflictDoNothing();

  const rigaClienti = await db.select({ id: clienti.id }).from(clienti);
  const valori = Array.from({ length: 20000 }, (_, i) => ({
    numero: `ORD-${String(i).padStart(6, "0")}`,
    clienteId: rigaClienti[i % rigaClienti.length].id,
    totale: (Math.round(Math.random() * 100000) / 100).toFixed(2), // stringa: niente float
  }));

  await db.insert(ordini).values(valori).onConflictDoNothing();
  console.log("seed ok", await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(ordini));
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

Due accorgimenti: il totale si genera come stringa con due decimali, perché `numeric` torna stringa e non vuoi un `0.30000000000000004` in fattura; le righe d'ordine si inseriscono dopo gli ordini, in un secondo batch, altrimenti la FK fallisce.

## API tipizzata e test

L'API espone due funzioni: una lettura con join e aggregazione, e una scrittura transazionale che crea ordine e righe. I test girano su un database di test separato e verificano sia il tipo sia l'effetto.

```ts
// src/db/ordini.ts
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "./client";
import { ordini, righeOrdine } from "./schema/ordini";
import { clienti } from "./schema/clienti";

export async function ultimiOrdiniConCliente(limit = 50) {
  return db
    .select({
      numero: ordini.numero,
      totale: ordini.totale,          // string, non number
      email: clienti.email,
      righe: sql<number>`count(${righeOrdine.id})`.mapWith(Number),
    })
    .from(ordini)
    .innerJoin(clienti, eq(ordini.clienteId, clienti.id))
    .leftJoin(righeOrdine, eq(righeOrdine.ordineId, ordini.id))
    .groupBy(ordini.id, ordini.numero, ordini.totale, clienti.email)
    .orderBy(desc(ordini.creatoIl))
    .limit(limit);
}

export async function creaOrdine(clienteId: string, righe: { sku: string; q: number; p: string }[]) {
  return db.transaction(async (tx) => {
    const totale = righe.reduce((s, r) => s + Number(r.p) * r.q, 0).toFixed(2);
    const [ordine] = await tx.insert(ordini)
      .values({ numero: `ORD-${Date.now()}`, clienteId, totale })
      .returning({ id: ordini.id });
    await tx.insert(righeOrdine).values(
      righe.map((r) => ({ ordineId: ordine.id, sku: r.sku, quantita: r.q, prezzoUnitario: r.p })),
    );
    return ordine.id;
  });
}
```

```ts
// test/ordini.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { ultimiOrdiniConCliente, creaOrdine } from "../src/db/ordini";
import { db } from "../src/db/client";
import { clienti } from "../src/db/schema/clienti";
import { ordini } from "../src/db/schema/ordini";

beforeAll(async () => {
  await db.delete(ordini);
  await db.delete(clienti);
});

describe("ordini", () => {
  it("rileva il numero duplicato invece di inserirlo", async () => {
    const [c] = await db.insert(clienti).values({ email: "a@example.test", nome: "Ada" }).returning();
    await creaOrdine(c.id, [{ sku: "X1", q: 2, p: "10.00" }]);
    const [o] = await db.select().from(ordini);
    await expect(
      db.insert(ordini).values({ ...o, id: undefined }),
    ).rejects.toThrow(/ordini_numero_uq/);
  });

  it("aggrega le righe per ordine", async () => {
    const righe = await ultimiOrdiniConCliente(5);
    expect(righe[0].righe).toBeGreaterThanOrEqual(1);
  });
});
```

Il `beforeAll` che cancella in ordine inverso (figli prima dei padri) rende i test ripetibili con le FK; la verifica dell'errore sul numero duplicato documenta il vincolo, più utile di un test che si limita a "inserisce".

Due dettagli rendono la suite affidabile. Il primo è il database: i test devono puntare a un database di test dedicato, creato con lo stesso `drizzle-kit migrate`, altrimenti il seed del laboratorio e i test si disturbano a vicenda. Il secondo è la pulizia per test invece che per file: `TRUNCATE ... RESTART IDENTITY CASCADE` dentro un `beforeEach` costa poco su poche centinaia di righe e garantisce che l'ordine di esecuzione non conti, mentre con un solo `beforeAll` un test che modifica un cliente influenza il successivo.

Sul lato applicativo, il valore restituito da `creaOrdine` deve essere l'identificativo tipizzato, non la riga intera: l'API interna diventa piccola e stabile, e il chiamante non riceve accidentalmente campi che non dovrebbe esporre. Se il servizio è esposto via HTTP, la serializzazione della risposta è il punto dove `numeric` torna stringa e `timestamp` torna `Date`: documenta questo contratto nello schema OpenAPI o nei tipi condivisi, perché è la differenza che i consumer notano per prima.

## Verifiche finali

Chiudi con tre comandi, ognuno con una risposta attesa. `npx drizzle-kit generate` dopo aver aggiunto una colonna deve produrre un nuovo file e nessun `DROP`. `EXPLAIN` sulla query di `ultimiOrdiniConCliente` deve mostrare l'uso di `ordini_cliente_idx` o del primary key, non un seq scan su 20.000 righe. Il seed eseguito due volte deve lasciare lo stesso conteggio, non il doppio.

| Verifica | Comando | Atteso |
| --- | --- | --- |
| migrazione pulita | `npx drizzle-kit generate` | nuova cartella, zero drop |
| seed idempotente | `npx tsx scripts/seed.ts` due volte | conteggio invariato |
| piano d'accesso | `EXPLAIN (ANALYZE)` della query | nessun seq scan sulle FK |
| test | `npx vitest run` | verde, anche con DB sporco |

## Errori comuni

- **Applicare un `push` sul database di staging**: funziona fino alla prima rinomina, poi i dati spariscono senza un file che lo documenti.
- **Seed senza `onConflictDoNothing`**: il secondo run fallisce sul vincolo unitario e blocca tutto il resto del seed.
- **Dimenticare la cancellazione in ordine inverso nei test**: le FK bloccano il cleanup, e i test falliscono solo la seconda volta.
- **Totali calcolati con `Number` su importi reali**: gli arrotondamenti emergono nei report, non nei test.
- **Test con relazioni ma senza `schema` nel client**: `db.query` è indefinito e si incolpa la versione del pacchetto.

## In sintesi

Hai chiuso il ciclo completo: schema TypeScript con tipi derivati, migrazioni versionate e revisionate, seed idempotente, API con join aggregati e transazione, test ripetibili. La fiducia viene dalla ripetibilità: due `generate` di fila non producono diff, due seed non duplicano, il piano d'accesso non regredisce quando aggiungi un indice.

## Fonti

- [Drizzle ORM — Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle ORM — drizzle-kit generate](https://orm.drizzle.team/docs/drizzle-kit-generate)
- [Drizzle ORM — Batch API](https://orm.drizzle.team/docs/batch-api)
- [Drizzle ORM — Schema declaration](https://orm.drizzle.team/docs/sql-schema-declaration)
