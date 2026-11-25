Con Drizzle lo schema vive nel codice, ma il database non si aggiorna da solo: serve un flusso di migrazione esplicito, e `drizzle-kit` ne offre due di segno opposto. `generate` confronta lo schema TypeScript con lo snapshot dell'ultima migrazione e produce file SQL versionati, che applichi poi con `migrate` o direttamente. `push` confronta lo schema con il database reale e applica le differenze al volo, senza file. In questa lezione impari quando usare l'uno e quando l'altro, come collegare Drizzle a Postgres o Neon, e come gestire transazioni e batch senza sorprese.

## Obiettivi

- Distinguere i flussi `generate` + `migrate` da `push` e dalla modalità database-first con `pull`.
- Applicare le migrazioni in CI o a runtime con `drizzle-orm/<driver>/migrator`.
- Collegare Drizzle a Postgres diretto e a Neon HTTP/WebSocket scegliendo il driver giusto.
- Gestire transazioni, batch e relazioni annidate con le API corrette.

## Generare, applicare, oppure spingere

Il modello mentale è questo: `drizzle-kit generate` è un compilatore di differenze fra il tuo schema e la storia delle migrazioni; `push` è un sincronizzatore fra il tuo schema e il database vivo. Il primo produce artefatti revisionabili, il secondo produce un `ALTER TABLE` immediato.

| Comando | Confronta con | Produce | Uso consigliato |
| --- | --- | --- | --- |
| `generate` | snapshot precedente in `drizzle/meta` | cartelle `migration.sql` + `snapshot.json` | tutte le applicazioni vere |
| `migrate` | database, tabella di storia | applica i file non ancora eseguiti | CI o deploy |
| `push` | schema reale del database | `ALTER` diretto, nessun file | prototipi, branch effimeri |
| `pull` | database reale | schema TypeScript | database-first, schemi legacy |
| `export` | schema TypeScript | SQL completo | audit, handoff a un DBA |

La modalità database-first è utile dove il DBA gestisce lo schema: `drizzle-kit pull` legge il catalogo Postgres e genera i file TypeScript con tipi, indici e vincoli, e da lì il codice ha tipi corretti senza che Drizzle possieda il database.

```bash
npx drizzle-kit generate --name add_archived_at
# drizzle/0007_add_archived_at/{migration.sql,snapshot.json}

# connessione usata dal kit: drizzle.config.ts o variabile
npx drizzle-kit migrate
npx drizzle-kit push            # solo su un database effimero, non su main
```

Un dettaglio operativo che evita incidenti: `generate` chiede conferma quando intuisce una rinomina di colonna. Se rispondi "crea nuova colonna e cancella la vecchia", migrazione è corretta ma perdi i dati. Rinomina confermata significa `ALTER TABLE ... RENAME COLUMN`, e vale la pena leggerlo prima di committare.

## Applicare le migrazioni dove serve

Le migrazioni si applicano in tre punti diversi a seconda dell'architettura. In un deploy classico è un passo prima del rilascio; in un monolite con zero-downtime può girare a runtime con il migrator; in un progetto Postgres unico, la migrazione si esegue una volta da un job dedicato, mai da più repliche in parallelo.

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const db = drizzle(process.env.DATABASE_URL!);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("migrazioni applicate");
```

Il migrator legge i file, interroga la tabella di storia del database, applica solo i non eseguiti e si protegge con un lock: due processi contemporanei di solito non si danneggiano, ma il lock non è una garanzia di idempotenza per le migrazioni scritte male. Per le migrazioni non coperte dalla generazione automatica (funzioni, trigger, estensioni) si usa una cartella di migrazioni custom dichiarata nel config, così i file SQL scritti a mano restano nella stessa sequenza.

## Collegare il database

La scelta del driver determina pool, transazioni e comportamento in ambienti senza socket TCP.

```ts
// Node classico: pool TCP gestito dal driver
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
export const db = drizzle({ client: pool, schema });

// Neon in runtime serverless: HTTP, nessun pool da gestire
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
const sql = neon(process.env.DATABASE_URL!);
export const dbHttp = drizzleNeonHttp({ client: sql, schema });
```

Passare `schema` al costruttore non è cosmetico: abilita `db.query` e i suoi `with`. Senza `schema` funzionano solo `select`/`insert`/`update`/`delete`. Per le transazioni interattive su Neon serve `drizzle-orm/neon-serverless` con un `Pool` aperto e chiuso dentro il handler; con `neon-http` hai `db.batch([...])` per inviare più statement in una sola richiesta, ma non un `BEGIN` personalizzato.

| Driver | Import | Transazioni | Note |
| --- | --- | --- | --- |
| `pg` | `drizzle-orm/node-postgres` | interattive | pool da dimensionare |
| Neon HTTP | `drizzle-orm/neon-http` | `db.batch` | ideale per query singole |
| Neon WS | `drizzle-orm/neon-serverless` | interattive | pool per richiesta |
| SQLite locale | `drizzle-orm/better-sqlite3` | interattive | sviluppo offline |

## Transazioni, batch e relazioni

```ts
// transazione interattiva: il callback riceve un tx con la stessa API
await db.transaction(async (tx) => {
  const [ordine] = await tx
    .insert(ordini)
    .values({ clienteId, totale: "99.90", stato: "bozza" })
    .returning({ id: ordini.id });

  await tx.insert(righeOrdine).values(righe.map((r) => ({ ...r, ordineId: ordine.id })));
}, { isolationLevel: "repeatable read" });

// batch: N statement in un round-trip, atomici dove il driver lo consente
const [clienti, ordini_aperti] = await db.batch([
  db.select().from(clienti).limit(10),
  db.select().from(ordini).where(eq(ordini.evaso, false)),
]);
```

La trappola più comune è la N+1 nelle relazioni annidate: `db.query.ordini.findMany({ with: { righe: true } })` su 100 ordini non fa 100 query, Drizzle raggruppa, ma un `with` dentro un altro `with` può aggiungere un round-trip per livello. Prima di ottimizzare, guarda il numero di query nel log del driver e usa `db.select` con join quando il conteggio non torna.

La lettura dentro la transazione deve rileggere il dato aggiornato, non riusare quello letto prima del `BEGIN`: con isolamento `read committed` una query successiva vede i commit altrui, con `repeatable read` vede lo snapshot iniziale e va gestito il conflitto di serializzazione. Drizzle traduce il livello di isolamento nel comando `BEGIN` corretto per il dialetto, ma la strategia di retry resta responsabilità dell'applicazione.

`db.batch` non è una transazione: è un pacchetto di statement inviato in un round-trip, e sui driver che lo supportano atomico, ma il rollback di un singolo elemento non annulla i precedenti nello stesso batch. Usalo per ridurre la latenza di letture indipendenti o di scritture correlate, non come sostituto di `transaction` quando la coerenza conta.

Un altro dettaglio: `.returning()` funziona su Postgres e SQLite, non su MySQL. Se stai scrivendo codice portabile fra dialetti, quella riga è la prima da isolare.

## Errori comuni

- **`push` su produzione**: non c'è storia, non c'è rollback, e una rinomina può arrivare come `DROP` + `ADD`.
- **Modificare i file generati a mano**: il prossimo `generate` parte dallo snapshot, non dai tuoi edit, e produce un diff inatteso.
- **Applicare migrazioni da più repliche**: il lock del migrator aiuta, ma migrazioni con `CREATE INDEX` non concorrente possono bloccare la tabella sotto carico.
- **Dimenticare `schema` nel costruttore**: `db.query` risulta `undefined` e sembra un problema di versioni.
- **Transazione con `neon-http`**: non è supportata come interattiva; per legger-in-mezzo serve il driver WebSocket.

## In sintesi

Il flusso affidabile è schema TypeScript, `generate` in locale, review del SQL, `migrate` in CI o deploy, e `pull` solo dove il database è la fonte di verità. Il driver cambia il contratto sulle transazioni, quindi la scelta fra `pg`, Neon HTTP e Neon WebSocket va fatta prima di scrivere la logica di scrittura, non dopo.

## Fonti

- [Drizzle ORM — Migrations](https://orm.drizzle.team/docs/migrations)
- [Drizzle ORM — drizzle-kit generate](https://orm.drizzle.team/docs/drizzle-kit-generate)
- [Drizzle ORM — Kit overview](https://orm.drizzle.team/docs/kit-overview)
- [Drizzle ORM — Get started with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
