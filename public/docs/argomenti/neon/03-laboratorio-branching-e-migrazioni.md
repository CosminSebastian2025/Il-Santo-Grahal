In questo laboratorio porti un'applicazione Postgres esistente su Neon usando il branching come parte del flusso di lavoro, non come funzione da provare una volta. Costruisci una CLI di migrazione idempotente, un test di migrazione su branch effimero, un endpoint serverless con il driver HTTP che resta stabile anche quando il compute si sospende, e un ripristino di un singolo record da un branch puntuale. Alla fine hai un metodo ripetibile: `main` protetto, una migrazione validata su una copia gratuita, e un endpoint con retry e pooling corretti.

## Obiettivi

- Creare un branch effimero da un LSN preciso, applicarvi una migrazione e distruggerlo.
- Scrivere una migrazione idempotente e verificarla con query di controllo.
- Collegare `@neondatabase/serverless` a un endpoint HTTP con retry e gestione del compute sospeso.
- Ripristinare un singolo record da un branch storico senza toccare `main`.

## Predisporre il progetto e i branch

Serve un progetto Neon con un branch `main` che contiene lo schema esistente e dati realistici: anche 10.000 righe bastano per notare la differenza tra una copia e un branch. Lavora da terminale con una variabile `DATABASE_URL` in sola lettura su `main` per i controlli, e una variabile separata per i branch.

| Concetto | Valore usato qui |
| --- | --- |
| branch protetto | `main`, con compute sempre in produzione |
| branch di lavoro | `mig-<timestamp>`, creato da `main`, cancellato a fine test |
| branch storico | `snapshot-<data>`, creato a un LSN precedente alla cancellazione da investigare |
| connessione | diretta per `psql` e migrazioni, pooling per l'endpoint serverless |

La sequenza di lavoro è questa: annota il LSN corrente su `main`, crea il branch da quel punto, applica la migrazione sul branch, esegui i controlli, cancella il branch. Il tempo di creazione non dipende dai dati, quindi il ciclo regge anche su database grandi.

```bash
# LSN corrente: da qui in poi il branch vede esattamente questo stato
psql "$DATABASE_URL_MAIN" -Atc "SELECT pg_current_wal_lsn()"

# creazione del branch di lavoro dal punto indicato (via API Neon)
curl -sS -X POST "https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"branch\":{\"name\":\"mig-$(date +%s)\",\"parent\":\"main\"}}" \
  | jq -r '.branch.connection_uris[0].connection_uri' > .env.branch
```

Se non vuoi usare l'API, la console fa la stessa cosa: ogni branch nuovo espone il proprio connection string e conserva database, schema e role del genitore.

Da memorizzare subito: il branch è la copia usa e getta, `main` è il database che serve i client. Ogni operazione distruttiva si prova sul primo, e solo dopo la verifica si applica al secondo.

## Migrazione idempotente e verifica

La migrazione di esempio aggiunge una colonna `archived_at` e un indice parziale. Deve poter essere rieseguita senza errori sul branch, perché è quella proprietà che ti farà dormire bene in produzione.

```sql
-- 001_add_archived_at.sql
ALTER TABLE posts ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- indice parziale: indicizza solo i post attivi, resta piccolo
CREATE INDEX IF NOT EXISTS posts_attivi_idx
  ON posts (created_at DESC)
  WHERE archived_at IS NULL;
```

Subito dopo la migrazione servono controlli che non si limitano a "è andata": numero di righe, indici presenti e piano di interrogazione. Un `EXPLAIN` sul branch è la prova che l'indice parziale viene usato davvero, perché con statistica vecchia il planner può scegliere un seq scan.

```sql
-- le righe non sono cambiate (stesso conteggio di main al momento del branch)
SELECT count(*) FILTER (WHERE archived_at IS NULL) AS attivi,
       count(*) AS totali
FROM posts;

-- il nuovo indice esiste ed è parziale
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'posts';

-- il planner lo usa per la query dell'endpoint
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title FROM posts
WHERE archived_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

Due verifiche specifiche di Neon: la migrazione non deve dipendere da `neon_superuser` (niente estensioni non supportate, niente `CREATE TABLESPACE`), e non deve creare oggetti che il compute perde, cioè tabelle `UNLOGGED` o temp table usate come stato persistente. Un grep sul file di migrazione su `UNLOGGED|TEMP` ti salva da un bug che si manifesta solo dopo il primo scale to zero.

```bash
grep -nEi "unlogged|create temp" 001_add_archived_at.sql || echo "ok: nessuno stato volatile"
psql "$(cat .env.branch | tr -d '\"')" -v ON_ERROR_STOP=1 -f 001_add_archived_at.sql
psql "$(cat .env.branch | tr -d '\"')" -v ON_ERROR_STOP=1 -f 001_add_archived_at.sql  # seconda volta: deve passare
```

## Endpoint serverless stabile

Ora l'endpoint che serve la lista dei post attivi. Usa il driver HTTP, apre la connessione per richiesta, non mantiene stato e applica un retry sui soli errori transitori. Il compute sospeso aggiunge latenza al primo colpo: per questo il timeout del `fetch` dell'endpoint deve essere più alto del tempo di avvio del compute, altrimenti il primo request fallisce.

```ts
import { neon } from "@neondatabase/serverless";
import retry from "async-retry";

const sql = neon(process.env.DATABASE_URL!, {
  fetchOptions: { timeout: 20000 }, // il primo hit dopo lo scale to zero è lento
});

export async function GET(request: Request): Promise<Response> {
  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 20), 100);

  try {
    const rows = await retry(
      () => sql`SELECT id, title, created_at
                FROM posts
                WHERE archived_at IS NULL
                ORDER BY created_at DESC
                LIMIT ${limit}`,
      { retries: 4, factor: 2, minTimeout: 500, randomize: true },
    );
    return Response.json({ count: rows.length, rows });
  } catch (err) {
    return Response.json(
      { error: "database non raggiungibile", detail: String(err) },
      { status: 503 },
    );
  }
}
```

Da misurare in questo passo, non da assumere: tempo del primo request dopo 10 minuti di silenzio, tempo dei request successivi, e connessioni osservate durante un test con `autocannon -c 50`. Se il carico supera il pool utile, passa all'endpoint pooled con limiti espliciti invece di alzare le connessioni dirette.

## Ripristino di un singolo record

L'ultimo passo è il caso che rende Neon diverso da un backup notturno: hai cancellato per errore un post e vuoi solo quello, senza ripristinare tutto. Crea un branch a un LSN precedente alla cancellazione, leggi la riga, reinseriscila su `main`.

```sql
-- sul branch storico: il record esiste ancora
SELECT id, title, created_at, archived_at FROM posts WHERE id = 4242;

-- copia la riga su main dal branch storico (utente con permessi di scrittura)
INSERT INTO posts (id, title, created_at, archived_at)
VALUES (4242, 'titolo originale', '2026-11-03 10:12:00+00', NULL)
ON CONFLICT (id) DO NOTHING;
```

Il vincolo che conta: il ripristino di un branch fa rollback solo del timeline Postgres. Se nello stesso progetto hai bucket di storage o funzioni, il branch non li riporta indietro, quindi l'operazione da fare è "estrai dal branch e applica a `main`", non "promuovi il branch". Lo stesso vale per gli slot di logical replication, che non vengono copiati: se il branch deve pubblicare o sottoscrivere, la replica va riconfigurata.

## Esercizi

1. Aggiungi al flusso una migrazione distruttiva (`DROP COLUMN`) provata solo sul branch e verifica che `main` resti intatto.
2. Misura la differenza di latenza tra endpoint senza retry e con retry su un compute sospeso a mano.
3. Aggiungi un controllo che fallisce se `pg_indexes` non contiene `posts_attivi_idx`, così la migrazione fallisce invece di degradare le query.
4. Crea un branch per ogni pull request e cancella i branch più vecchi di 7 giorni.

<details>
<summary>Soluzione</summary>

1. La migrazione distruttiva va in un file separato e viene applicata con `psql` sul branch; il confronto è `SELECT count(*)` su `main` prima e dopo, più la presenza della colonna via `information_schema.columns`.
2. Con il compute sospeso il primo colpo include l'avvio Postgres; senza retry un timeout del client diventa un 500, con retry e timeout a 20 s diventa un 200 più lento. Il valore utile è la latenza p95, non la media.
3. Uno script Node che interroga `pg_indexes` e fa `process.exit(1)` se manca l'indice, chiamato in CI subito dopo `psql -f`.
4. L'API `/branches` restituisce `created_at` per branch; un job notturno cancella quelli con nome `pr-*` più vecchi della soglia, lasciando intatti `main` e lo snapshot storico.

</details>

## Errori comuni

- **Applicare la migrazione su `main` perché "tanto è un branch"**: il branch è la copia, `main` è il database dei client; invertirli è l'errore più costoso del laboratorio.
- **Dimenticare la seconda esecuzione**: una migrazione che passa una volta sola non è idempotente e in CI creerà un branch a metà schema.
- **Timeout del client più corto del cold start**: l'endpoint dichiara il database irraggiungibile mentre Neon sta solo avviando il compute.
- **Promuovere un branch credendo di ripristinare tutto**: il restore copre Postgres, non gli altri servizi del progetto.
- **Scegliere l'LSN giusto a occhio**: un LSN preso dopo la cancellazione non contiene la riga da recuperare, e il branch storico è inutile senza verificarlo.

## In sintesi

Il flusso Neon produttivo ha tre abitudini: branch effimeri per ogni migrazione, migrazioni idempotenti verificate con `EXPLAIN` e catalog, endpoint con retry e timeout compatibili con lo scale to zero. Il branch non sostituisce i backup, ma trasforma prove e ripristini puntuali in operazioni di secondi.

## Fonti

- [Neon Docs — Branching](https://neon.com/docs/guides/branching-intro)
- [Neon Docs — Serverless driver](https://neon.com/docs/serverless/serverless-driver)
- [Neon Docs — Postgres compatibility](https://neon.com/docs/reference/compatibility)
- [Neon API — branches](https://api-docs.neon.tech/reference/createprojectbranch)
