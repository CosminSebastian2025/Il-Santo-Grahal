Il driver serverless di Neon esiste perché un runtime serverless o edge non può mantenere un pool TCP come un server Node tradizionale: ogni invocazione può nascere e morire, e un `Pool` di `pg` creato fuori dal handler viene chiuso senza preavviso. Il pacchetto `@neondatabase/serverless` porta il protocollo Postgres sopra HTTP e WebSocket, con due percorsi che hanno costi e limiti diversi. In questa lezione impari quando usare l'uno e quando l'altro, e come far convivere Neon con le sessioni.

## Obiettivi

- Scegliere tra `neon()` via HTTP e `Pool`/`Client` via WebSocket in base al tipo di query.
- Usare template tag parametrici ed esplicitare i casi in cui serve `sql.query` o `sql.unsafe`.
- Gestire transazioni non interattive con `sql.transaction` e riconoscere quando servono quelle interattive.
- Applicare retry e timezone/encoding corretti in una pipeline serverless.

## Due percorsi, due contratti

Il driver documenta una regola semplice: **HTTP per default**, WebSocket solo quando serve una sessione vera.

| Aspetto | HTTP (`neon()`) | WebSocket (`Pool`, `Client`) |
| --- | --- | --- |
| Trasporto | una `fetch` per query | connessione persistente sul handler |
| Costo tipico | latency di un round-trip HTTP, nessun handshake TCP Postgres | handshake Postgres una volta, poi query pipelined |
| Transazioni | solo non interattive via `sql.transaction([...])` | interattive, `BEGIN`/`COMMIT` espliciti |
| Compatibilità | API dedicata | compatibile `node-postgres` (`pg`) |
| Limite pratico | richiesta e risposta fino a 64 MB | limiti del compute e dei slot di connessione |
| Runtime | Worker, Edge, Vercel Functions | richiede `WebSocket` nativo (Node 22+) o `ws` |

Un dettaglio che sorprende: dal driver 1.0.0 (marzo 2025) la funzione restituita da `neon()` **è solo un tagged template**. La vecchia forma `sql("SELECT ...", [param])` lancia un errore e va riscritta come `sql.query(...)`. Non è pedanteria: l'API a template rende impossibile concatenare stringhe nella query, che è la difesa strutturale contro l'injection. I frammenti sono componibili, perché la numerazione dei parametri viene risolta al momento dell'invio.

| Caso | API |
| --- | --- |
| valore interpolato (`WHERE id = ${id}`) | template tag, diventa `$1` |
| query costruita a runtime | `sql.query("... $1", [id])` |
| identificatore noto (tabella, colonna) | frammento `sql\`posts\`` oppure `sql.unsafe(...)` |
| più query atomiche | `sql.transaction([...])` |

```ts
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// parametro interpolato: diventa $1 lato server, mai concatenato
const id = 42;
const [post] = await sql`SELECT id, title FROM posts WHERE id = ${id}`;

// forma parametrizzata manuale, per query costruite a runtime
const rows = await sql.query("SELECT * FROM posts WHERE id = $1", [id]);

// identificatori: solo da valori noti, mai da input utente
const table = process.env.ARCHIVE === "1" ? sql`archived_posts` : sql`posts`;
const archived = await sql`SELECT count(*) FROM ${table}`;
```

I frammenti sono componibili: `sql\`WHERE title = ${title}\`` produce un frammento che puoi innestare in un'altra query, e la numerazione dei parametri viene risolta al momento dell'invio.

## Transazioni: non interattive e interattive

In HTTP non puoi tenere aperta una transazione tra due richieste: non c'è un canale. Esiste però `sql.transaction`, che racchiude più query in un'unica transazione lato server, atomiche o tutte fallite, con opzioni per isolation level e read-only. Perché conti davvero: la coppia di scritture resta coerente anche se la seconda fallisce, e il blocco `{ isolationLevel: "RepeatableRead", readOnly: true }` ti dà uno snapshot stabile su più `SELECT` consecutive.

Quando invece devi leggere un valore e decidere sulla base di quello (controllare il saldo, poi scalare), serve una transazione interattiva: si passa a `Pool`, aprendolo **dentro** il handler e chiudendolo prima della risposta. In Vercel Functions si usa `waitUntil(pool.end())`, in Next.js `after(() => pool.end())`. In ambienti edge la connessione WebSocket non sopravvive alla richiesta, quindi un pool creato fuori dal handler è un bug silenzioso. In entrambi i casi il `FOR UPDATE` sulla riga letta è ciò che rende il controllo e la scrittura una sola decisione.

```ts
import { Pool } from "@neondatabase/serverless";
import { waitUntil } from "@vercel/functions";

export async function POST(request: Request) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT saldo FROM conti WHERE id = $1 FOR UPDATE",
      [1],
    );
    if (rows[0].saldo < 100) throw new Error("fondi insufficienti");
    await client.query("UPDATE conti SET saldo = saldo - 100 WHERE id = $1", [1]);
    await client.query("COMMIT");
    return Response.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    return Response.json({ ok: false }, { status: 409 });
  } finally {
    client.release();
    waitUntil(pool.end());
  }
}
```

## Robustezza: retry, errori e configurazione

Neon può chiudere connessioni inattive per manutenzione, e in autoscaling il compute può ripartire a metà traffico: il driver non nasconde questi eventi. Servono retry con backoff sugli errori transitori, mai su violazioni di vincoli o errori di sintassi; su Node 21 e precedenti serve `neonConfig.webSocketConstructor = ws`, perché `WebSocket` nativo arriva con Node 22. Attenzione anche a encoding e collation: Neon parte da UTF-8 con collation `C.UTF-8`, quindi l'ordinamento di testo accentato non coincide con un Postgres configurato con locale italiano, e per ordinamenti linguistici serve una collation ICU.

```ts
import retry from "async-retry";

const sql = neon(process.env.DATABASE_URL!);

export async function caricaUtente(userId: number) {
  return retry(
    () => sql`SELECT id, email FROM utenti WHERE id = ${userId}`,
    { retries: 5, factor: 2, minTimeout: 1000, randomize: true },
  );
}
```

Con `Pool` non si libera solo la connessione: la transazione va scritta con `BEGIN`, `COMMIT` e `ROLLBACK` gestiti dal driver, e un `throw` dentro il callback lancia il rollback. Se leggi dentro il blocco e poi decidi di annullare, usa `tx.rollback()` con un errore dedicato, non `return` silenzioso: il commit avverrebbe comunque.

Il costo nascosto del WebSocket è la latenza di setup: una connessione nuova costa un handshake TCP e TLS, quindi riusarla per più statement dentro la stessa richiesta è quasi sempre più veloce che fare cinque chiamate HTTP separate, ma se il handler esegue una sola query isolata l'HTTP vince perché evita l'handshake. La regola pratica è contare i round-trip logici: uno solo verso l'HTTP, due o più verso il WebSocket, e transazioni sempre verso il WebSocket.

Sul lato runtime, il pool va trattato come una risorsa di breve vita. Su Vercel la funzione può essere congelata dopo la risposta: se il pool sopravvive a `return`, la chiusura avviene dopo l'invio, quindi `waitUntil(pool.end())` va chiamato prima di rispondere. In Next.js e nei runtime che espongono `after()`, si registra la chiusura nello stesso modo. Se il runtime non offre né l'uno né l'altro, chiudi il pool in un `finally` intorno al lavoro principale, accettando che il tempo di chiusura entri nella latenza misurata.

Un consiglio pratico: scegli un solo percorso per file. Usa il driver HTTP con Drizzle (`drizzle-orm/neon-http`) oppure `Pool` con `drizzle-orm/neon-serverless`, senza mescolare due connessioni nella stessa richiesta: due percorsi significano due interpretazioni diverse di "transazione" nello stesso modulo.

## Errori comuni

- **Creare `Pool` al modulo**: al primo cold start funziona, poi il runtime lo chiude e le richieste falliscono con "socket already closed".
- **Usare `sql.transaction` e leggere in mezzo**: le query le costruisci tutte prima, il server le esegue in blocco e non puoi ramificare sul risultato.
- **Dimenticare il `client.release()`**: il pool non si svuota e si consumano slot di connessione utili.
- **Esporre `DATABASE_URL` al browser**: il driver stampa un avviso perché SQL dal client è superficie d'attacco.

## In sintesi

In Neon HTTP e WebSocket non sono due varianti ma due contratti: HTTP per query singole e transazioni predefinite, WebSocket per sessioni e transazioni interattive con compatibilità `pg`. L'API a template protegge dall'injection, `sql.transaction` copre il caso batch, e aprire e chiudere il pool dentro il handler è ciò che distingue una pipeline serverless stabile da una che fallisce a ogni raffreddamento.

## Fonti

- [Neon Docs — Serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [Neon Docs — Architecture overview](https://neon.com/docs/introduction/architecture-overview)
- [Neon Docs — Postgres compatibility](https://neon.com/docs/reference/compatibility)
- [neon-serverless — repository e changelog](https://github.com/neondatabase/serverless)
