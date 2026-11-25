Drizzle è un ORM TypeScript il cui schema è codice: definisci tabelle, colonne e vincoli con i builder di `drizzle-orm/pg-core`, e da quelli il compilatore deduce i tipi di riga. Non c'è un file di schema esterno né un client generato da un modello: il tipo `InferSelectModel` di una tabella diventa la tua entità, e una query che seleziona un campo inesistente non compila. In questa lezione impari a dichiarare lo schema Postgres con i tipi giusti e a distinguere il layer relazionale (API SQL-like) dal layer query (API dichiarativa annidata).

## Obiettivi

- Dichiarare tabelle, enum e vincoli con i builder di `pg-core` senza perdere tipi TypeScript.
- Scegliere tipi di colonna coerenti (identity, `timestamp` con mode, `numeric` per il denaro).
- Derivare i tipi di riga e distinguere `db.select()` da `db.query.*`.
- Evitare le trappole di naming tra camelCase TypeScript e snake_case Postgres.

## Schema come codice

Ogni tabella parte da `pgTable` e da almeno una colonna. Drizzle non ha un oggetto "tabella comune" fra dialetti: si sceglie il dialetto (Postgres, MySQL, SQLite) e i tipi del dialetto. Se il nome della chiave TypeScript coincide con il nome della colonna, la query usa quel nome; se no, si passa il nome reale come primo argomento del builder.

```ts
import {
  pgTable, pgEnum, integer, text, varchar, timestamp, boolean,
  numeric, uuid, index, uniqueIndex, primaryKey, serial, jsonb,
} from "drizzle-orm/pg-core";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export const statoOrdine = pgEnum("stato_ordine", ["bozza", "pagato", "spedito", "annullato"]);

export const clienti = pgTable("clienti", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 320 }).notNull(),
  nome: text("nome").notNull(),
  creatoIl: timestamp("creato_il", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("clienti_email_idx").on(t.email),
]);

export const ordini = pgTable("ordini", {
  id: serial("id").primaryKey(),          // int identity, montepremi 2^31
  clienteId: uuid("cliente_id").notNull().references(() => clienti.id, { onDelete: "cascade" }),
  stato: statoOrdine("stato").notNull().default("bozza"),
  totale: numeric("totale", { precision: 12, scale: 2 }).notNull(),
  evaso: boolean("evaso").notNull().default(false),
  metadati: jsonb("metadati").$type<{ canale: string; coupon?: string }>(),
}, (t) => [
  index("ordini_cliente_idx").on(t.clienteId),
  index("ordini_stato_data_idx").on(t.stato, t.creatoIl),
]);

export type Cliente = InferSelectModel<typeof clienti>;
export type NuovoOrdine = InferInsertModel<typeof ordini>;
```

Tre scelte meritano attenzione. `numeric` senza `mode` produce **stringhe**, e va bene: i soldi non passano dal float. `jsonb().$type<T>()` non cambia la colonna, cambia il tipo TypeScript, quindi il contratto con il database resta `jsonb` mentre il codice gode di un tipo. `serial` è compatibile con schemi preesistenti ma con `identity` in stile moderno puoi usare `integer().generatedAlwaysAsIdentity()`, che è la forma consigliata per nuove tabelle.

| Esigenza | Espressione Drizzle | Tipo TS risultante |
| --- | --- | --- |
| id numerico auto | `serial("id").primaryKey()` | `number` |
| id UUID v4 | `uuid("id").defaultRandom()` | `string` |
| importo esatto | `numeric("totale", { precision: 12, scale: 2 })` | `string` |
| data con timezone | `timestamp("x", { withTimezone: true })` | `Date` |
| data come stringa ISO | `timestamp("x", { mode: "string" })` | `string` |
| documento JSON tipizzato | `jsonb("m").$type<T>()` | `T` |
| enum Postgres | `pgEnum("n", [...])` | unione di letterali |

Per le chiavi composte si usa `primaryKey({ columns: [...] })` nell'array dei vincoli, e per i riferimenti una funzione `() => altraTabella.colonna` per evitare dipendenze circolari tra file.

## Due layer di query

Drizzle espone due modi di interrogare, e la scelta è di progettazione, non di gusto.

Il layer **relazionale** (`db.query.ordini.findMany({ with: { cliente: true } })`) richiede che le relazioni siano dichiarate con `relations()` e usa `with` per gli innesti. Il layer **SQL-like** (`db.select().from(ordini).leftJoin(...)`) non richiede relazioni dichiarate, compone come SQL e si avvicina alle prestazioni di una query scritta a mano.

```ts
import { eq, and, desc, sql } from "drizzle-orm";

// SQL-like: join esplicito, aggregazione, ordinamento
const riepilogo = await db
  .select({
    cliente: clienti.email,
    ordini: sql<number>`count(${ordini.id})`.mapWith(Number),
    ultimo: sql<string | null>`max(${ordini.creatoIl})`,
  })
  .from(ordini)
  .innerJoin(clienti, eq(ordini.clienteId, clienti.id))
  .where(and(eq(ordini.evaso, false), eq(ordini.stato, "pagato")))
  .groupBy(clienti.email)
  .orderBy(desc(sql`count(${ordini.id})`))
  .limit(20);
```

Quando `db.select()` coinvolge join 1-a-molti, le righe si moltiplicano e il codice deve raggruppare; `db.query` fa quel lavoro per te con `with`, a costo di una query in più o di un `JSON` lato database. Regola pratica: `db.query` per letture di schermata con relazioni dichiarate, `db.select` per aggregazioni, report e join che devono restare controllabili con `EXPLAIN`.

Un equivalente di `riepilogo` nel layer relazionale non esiste, perché le aggregazioni per gruppo sono SQL: forzarle in `with` produce dati da aggregare in memoria.

Il prezzo del layer relazionale è la configurazione: `relations()` va dichiarato per ogni coppia che vuoi attraversare, sia dal lato uno sia dal lato molti, e il client si costruisce passando l'intero oggetto `schema` a `drizzle()`. Se dimentichi il passaggio, `db.query` esiste ma le relazioni risultano vuote; se dichiari solo un lato, il `with` inverso non compila. È un setup una volta sola, ma va fatto prima di scrivere le schermate, altrimenti si finisce a mescolare i due layer nello stesso file.

Una nota sulle prestazioni: `db.select()` è pensato per comporre SQL senza sorprese. Le funzioni `sql\`\`` accettano frammenti parametrizzati e `mapWith()` converte il tipo di ritorno, necessario ad esempio per `count(*)`, che Postgres restituisce come `bigint` e quindi come stringa nel driver. Dimenticare `mapWith(Number)` non rompe la build, produce un `"20"` dove il codice si aspetta un numero, ed è il tipo di errore che emerge in produzione sotto forma di somma concatenata.

## Naming, schema Postgres e tipi

Il caso più frequente in un'azienda italiana è un database con `snake_case` e applicazione con `camelCase`. Passare il nome a ogni builder funziona ma è rumoroso; in alternativa si usa un builder che mappa automaticamente, oppure si scrivono i nomi espliciti e si tiene una sola convenzione.

```ts
// mapping automatico: chiavi TS in camelCase, colonne in snake_case
import { snakeCase, text, timestamp, serial } from "drizzle-orm/pg-core";

export const utenti = snakeCase.table("utenti", {
  id: serial().primaryKey(),
  nomeCompleto: text(),        // colonna nome_completo
  creatoIl: timestamp(),       // colonna creato_il
});
```

Per i domini con più schemi Postgres si usa `pgSchema("billing").table(...)`, che emette il nome qualificato e permette di tenere `public` e `billing` nello stesso progetto. Attenzione a un errore tipico: `varchar` senza lunghezza e `text` sono tipi diversi per il database, anche se Drizzle li tratta quasi uguali nel codice; se lo schema esistente usa `varchar(320)`, dichiaralo con la lunghezza per non generare migrazioni fantasma.

Infine i tipi derivati: `InferSelectModel` per una riga letta (campi `notNull` e con default sono non opzionali) e `InferInsertModel` per un inserimento (campi con default sono opzionali). Esportarli dalle tabelle evita di riscrivere a mano il tipo dell'API, che è la prima fonte di disallineamento quando lo schema cambia.

## Errori comuni

- **Usare `float` per il denaro**: `real`/`doublePrecision` introducono errori di arrotondamento; usa `numeric` e converti consapevolmente in stringa e ritorno.
- **Assumere che `db.query` sia sempre più efficiente**: con relazioni annidate può fare più round-trip del join equivalente.
- **Mescolare naming**: metà tabelle con nomi espliciti e metà con mapping automatico è il modo più rapido per avere migrazioni fantasma.
- **Dimenticare l'indice sulle foreign key**: Postgres non crea automaticamente l'indice sulla colonna referenziante, e ogni `ON DELETE CASCADE` diventa un seq scan.
- **Dichiarare tipi a mano**: un `type Ordine = { ... }` parallelo allo schema diverge al primo `ALTER`.

## In sintesi

Drizzle ti dà uno schema Postgres scritto in TypeScript e due layer di query complementari. Le scelte che pagano sono poche e precise: tipi di colonna fedeli al database, `numeric` per gli importi, `pgEnum` per gli stati, indici dichiarati accanto alla tabella e tipi derivati con `InferSelectModel`/`InferInsertModel`. Con lo schema sotto controllo, il passo successivo è la generazione delle migrazioni e il collegamento al database.

## Fonti

- [Drizzle ORM — Schema declaration](https://orm.drizzle.team/docs/sql-schema-declaration)
- [Drizzle ORM — Column types (PostgreSQL)](https://orm.drizzle.team/docs/column-types/pg)
- [Drizzle ORM — Relations](https://orm.drizzle.team/docs/relations)
- [Drizzle ORM — Overview](https://orm.drizzle.team/docs/overview)
