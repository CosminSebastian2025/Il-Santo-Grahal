CQL, Cassandra Query Language, è il linguaggio con cui si interroga Apache Cassandra. Sembra SQL, ma nasce da un modello dati diverso: niente join, niente transazioni multi-riga, e ogni tabella si progetta dalle query che dovrà servire. Chi arriva da PostgreSQL lo tratta come un SQL con qualche limite, ed è il modo più rapido per accumulare errori. Qui impari sintassi, chiave primaria, token e tipi.

## Obiettivi

- Riconoscere cosa CQL copre e cosa resta fuori rispetto a SQL.
- Scrivere `CREATE TABLE` con `PARTITION KEY`, `CLUSTERING COLUMN` e ordine di ordinamento.
- Usare i tipi nativi adatti, comprese `list`, `set`, `map` e `frozen`.
- Distinguere `INSERT` come upsert da `UPDATE`, e capire quando la `IF` trasforma la scrittura in una transazione leggera.
- Leggere un `SELECT` sapendo che il filtro deve passare dalla chiave di partizione.

## CQL non è SQL

CQL nasce dal Thrift API di Cassandra con una grammatica vicina a SQL, ma sotto c'è un archivio distribuito a chiave-valore ordinato. La documentazione Apache descrive il modello come "tabella con righe identificate da una chiave primaria", divisa in due parti funzionalmente diverse. Da qui un `WHERE` lontano da quello relazionale.

| Aspetto | SQL relazionale | CQL |
| --- | --- | --- |
| Join | supportati | assenti |
| Transazioni multi-riga | ACID completo | per partizione |
| `ORDER BY` | su qualunque colonna | solo clustering, asc/desc |
| `WHERE` | su qualunque colonna | chiave o indice/SASI |
| Aggregati | tutti | solo `count`, `min`, `max`, `sum`, `avg` |
| Consistenza | fissa | per richiesta: `ONE`, `QUORUM`, `ALL` |
| Schema | vincoli relazionali | denormalizzato per query |

La serie stabile più recente pubblicata è 5.0.9; il nucleo del linguaggio resta quello della 3.x: `CREATE TABLE`, `INSERT`, `UPDATE`, `DELETE`, `SELECT`, `BATCH`.

## La chiave primaria, pezzo per pezzo

Una tabella CQL si progetta prima della chiave. La sintassi:

```sql
CREATE KEYSPACE social WITH replication = {
  'class': 'NetworkTopologyStrategy', 'datacenter1': 3
} AND durable_writes = true;

CREATE TABLE social.timeline_by_user (
  user_id     uuid,
  bucket_date date,
  post_id     timeuuid,
  author      text,
  body        text,
  tags        set<text>,
  meta        map<text, text>,
  PRIMARY KEY ((user_id, bucket_date), post_id)
) WITH CLUSTERING ORDER BY (post_id DESC)
  AND default_time_to_live = 7776000;
```

La chiave `((user_id, bucket_date), post_id)` si legge in due livelli. Tra parentesi doppie c'è la **partition key**: il suo hash, il token, decide nodo e repliche della riga. Dopo la virgola esterna c'è la **clustering key**: `post_id` ordina le righe nella partizione fisica, e `CLUSTERING ORDER BY (post_id DESC)` dà la lettura inversa senza sort. È l'unico ordinamento che il modello sa offrire.

Il partition key composto ha un effetto pratico: `bucket_date` spezza i dati di un utente in più partizioni, una per mese, così nessuna cresce all'infinito. Una partizione è un'unità fisica: oltre le centinaia di migliaia di righe o i 100 MB la compaction rallenta e un solo nodo serve la lettura. Il bucket si sceglie insieme alla query: per il timeline completo dell'utente dovrai leggere più partizioni, una per bucket.

## Tipi nativi e collezioni

CQL usa tipi dal nome esplicito: `text` (o `varchar`), `int`, `bigint`, `uuid` e `timeuuid`, `timestamp`, `date`, `decimal`, `blob`, `boolean`, `inet`. Le collezioni `list`, `set` e `map` vivono dentro la riga e ogni aggiornamento di una cella non `frozen` riscrive l'intero valore: da usare con prudenza.

```sql
INSERT INTO social.timeline_by_user
  (user_id, bucket_date, post_id, author, body, tags, meta)
VALUES (now(), '2026-11-01', now(), 'ada', 'primo post',
        {'cassandra', 'cql'}, {'lang': 'it'});

SELECT post_id, body, tags FROM social.timeline_by_user
WHERE user_id = 8c8c6c26-7b5a-4a1f-9e7e-0f7c1c1f9a11
  AND bucket_date = '2026-11-01'
  LIMIT 20;
```

La tabella è senza contatori di proposito: un `likes counter` in mezzo ai campi è ammesso in definizione, ma poi vieta sulla riga ogni scrittura diversa da `UPDATE ... SET likes = likes + 1`. I contatori si isolano in una tabella dedicata, e la riga resta l'unità di scrittura.

## Scrivere in CQL: upsert e TTL

`INSERT` in CQL è un upsert: se la riga esiste con la stessa chiave, i valori non specificati restano. `UPDATE` non richiede che la riga esista; se non esiste la crea con le sole colonne indicate nel `SET`. Questa è la differenza sostanziale rispetto agli RDBMS, dove `UPDATE` di una riga assente non fa nulla.

```sql
UPDATE social.timeline_by_user
SET body = 'primo post, corretto'
WHERE user_id = 8c8c6c26-7b5a-4a1f-9e7e-0f7c1c1f9a11
  AND bucket_date = '2026-11-01' AND post_id = ...;

UPDATE social.timeline_by_user USING TTL 86400
SET body = 'post che scade domani'
WHERE user_id = 8c8c6c26-7b5a-4a1f-9e7e-0f7c1c1f9a11
  AND bucket_date = '2026-11-01' AND post_id = ...;

DELETE FROM social.timeline_by_user USING TIMESTAMP 1762000000000000
WHERE user_id = 8c8c6c26-7b5a-4a1f-9e7e-0f7c1c1f9a11
  AND bucket_date = '2026-11-01' AND post_id = ...;
```

`USING TTL` imposta la scadenza in secondi, `USING TIMESTAMP` la versione della scrittura. Cassandra risolve i conflitti con last-write-wins, quindi vince il timestamp maggiore: un `TIMESTAMP` manuale va riservato a import massivi e replay.

Il `IF` trasforma la scrittura in una lightweight transaction: legge il valore corrente e applica il cambio solo se la condizione è vera. Funziona, ma costa consenso Paxos su più nodi, quindi non va nei percorsi ad alta frequenza.

```sql
INSERT INTO social.accounts (id, email, balance)
VALUES (now(), 'ada@example.com', 0) IF NOT EXISTS;
```

## Errori comuni

- **Filtrare su una colonna fuori chiave**: `WHERE body = 'x'` fallisce con `ALLOW FILTERING` richiesto. Il messaggio è esplicito, e attivarlo su una tabella grande è un modo per fermare un nodo.
- **Usare `ORDER BY` su una colonna non clustering**: errore immediato; l'ordine si progetta nello schema.
- **Partition key enormi**: un `user_id` unico per milioni di righe è una hot partition su un solo nodo.
- **Confondere `INSERT` e `UPDATE`**: entrambi creano righe; il controllo è la chiave.
- **Tabella pensata prima delle query**: si parte dagli accessi reali, una tabella per query.
- **Counter insieme ai dati normali**: la definizione è rifiutata dal motore.

## In sintesi

CQL è dichiarativo ma su un archivio distribuito: la chiave primaria separa distribuzione (`partition key` → token → nodo) e ordinamento (`clustering key`). Niente join, gli `UPDATE` sono upsert, gli ordinamenti li decide lo schema. La tabella nasce dalla query, non dal dominio normalizzato, e le collezioni non `frozen` si riscrivono intere a ogni cambio.

## Fonti

- [Apache Cassandra - CQL documentation](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/index.html)
- [Apache Cassandra - CQL Data Definition](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra - CQL Data Manipulation](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/dml.html)
- [Apache Cassandra - Data modeling, conceptual view](https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/data-modeling_conceptual.html)
