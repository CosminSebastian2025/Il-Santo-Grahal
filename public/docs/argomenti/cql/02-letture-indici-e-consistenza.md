La tabella CQL è un indice scelto in anticipo: le stesse informazioni si scrivono più volte, una per ogni modo in cui vanno lette, e ogni copia ha la chiave di quella query. Con la chiave fissata, la lettura ha poche forme legittime: uguaglianza completa sulla partition key, poi range e ordinamento sulla clustering key. Qui vediamo perché `ALLOW FILTERING` e le lightweight transaction ingannano e come conciliare consistenza e latenza tramite le policy del driver.

## Obiettivi

- Scrivere `SELECT` che colpiscono una o più partizioni senza scan completo.
- Distinguere `ALLOW FILTERING`, indici secondari e indici SAI e sapere quando evitarli.
- Usare lightweight transaction e batch atomico con criterio.
- Scegliere consistenza per richiesta e capire l'effetto su latenza e correttezza.
- Controllare timeout e paging lato client per non saturare il coordinatore.

## Le forme del `SELECT`

Il motore legge una riga, un intervallo di clustering o un insieme esplicito di partizioni; tutto il resto è un filtro riga per riga. Ecco la query che funziona, poi quelle che no.

```sql
-- Serve: uguaglianza completa sulla partition key, range sulla clustering
SELECT post_id, body FROM social.timeline_by_user
WHERE user_id = 8c8c6c26-7b5a-4a1f-9e7e-0f7c1c1f9a11
  AND bucket_date = '2026-11-01'
  AND post_id >= minTimeuuid('2026-11-01 00:00:00+0000')
LIMIT 50;

-- Funziona solo con ALLOW FILTERING: nessun predicato di chiave utile
SELECT * FROM social.timeline_by_user WHERE author = 'ada';

-- Errore: partition key incompleta (manca bucket_date)
SELECT * FROM social.timeline_by_user
WHERE user_id = 8c8c6c26-7b5a-4a1f-9e7e-0f7c1c1f9a11;
```

`IN` sulla partition key funziona, ma ogni valore è un nodo diverso: con molti elementi ricrea il fan-out che Cassandra vuole evitare.

Senza `ALLOW FILTERING` servono partition key completa e clustering in ordine di prefisso: `post_id` va bene, una clustering dopo una saltata no. Per colonne normali servono indice o SAI.

## `ALLOW FILTERING`, indici secondari e SAI

| Meccanismo | Cosa fa | Costo | Uso corretto |
| --- | --- | --- | --- |
| `ALLOW FILTERING` | legge le righe e filtra a mano | cresce con le righe lette, può toccare tutti i nodi | mai su tabelle grandi |
| Indice secondario classico (`CREATE INDEX`) | colonna locale per nodo, interrogazione per partizione | legge una riga per partizione, adatto a poche partizioni | basse cardinalità, query interne a una partizione |
| Indice SAI (`StorageAttachedIndex`) | indice su SSTable, con range e `AND` | memoria del nodo, non distribuito | ricerca su attributi, cardinalità controllata |
| Materialized view | una tabella copiata con chiave diversa | riscrittura automatica, costo di scrittura doppio | casi stabili, stessi limiti di normale denormalizzazione |

```sql
CREATE CUSTOM INDEX timeline_author_idx ON social.timeline_by_user (author)
USING 'StorageAttachedIndex';

CREATE INDEX accounts_city_idx ON social.accounts (city);
```

L'indice SAI, introdotto nel ciclo 5.0, gestisce range, attributi numerici e più predicati in `AND`, ma resta locale ai nodi che hanno i dati. Per ricerca scalabile la via resta una tabella dedicata, riempita in scrittura.

## Transazioni leggere, batch e consistenza

La lightweight transaction (`IF NOT EXISTS`, `IF condition = value`) confronta il valore al momento della scrittura, ma richiede consenso Paxos, fino a quattro round trip tra repliche. Serve per unicità di email o prenotazioni contese, non per ogni inserimento.

Il batch atomico applica insieme scritture sulla stessa partition key; su più partizioni resta ammesso ma è più lento. Regola operativa: un batch è una partition, a meno di un'importazione esplicita.

```python
from cassandra.cluster import Cluster
from cassandra import ConsistencyLevel

cluster = Cluster(["127.0.0.1"])
session = cluster.connect("social")

select = session.prepare(
    "SELECT post_id, body FROM timeline_by_user "
    "WHERE user_id = ? AND bucket_date = ? LIMIT ?"
)
select.consistency_level = ConsistencyLevel.QUORUM

rows = session.execute(select, [user_id, bucket_date, 20])
for row in rows:  # paging via protocollo nativo, mai fetchall su grandi volumi
    print(row.post_id, row.body)
```

La consistenza si sceglie per richiesta. Con replication factor 3, `QUORUM` (2 su 3) in scrittura e lettura lascia nodi in comune, quindi la lettura vede l'ultima scrittura confermata; `ONE` è più rapido ma può restituire dati vecchi, e `ALL` cede se un nodo è giù. Lo stesso vale per `SERIAL`, usato dalle transazioni leggere.

## Timeout, paging e coordinatore

Mille richieste su partizioni diverse fanno del coordinatore un aggregatore che aspetta il nodo più lento. Tre difese lato client:

1. un timeout basso per query, con i parametri del driver (`read_timeout`, `request_timeout`), così una query lenta non occupa un thread del coordinatore;
2. un semaforo per partizione lato applicazione, così un hot key non genera una coda infinita;
3. `LIMIT` e paging invece di partizioni intere, con `bucket` che le tengono sotto le centinaia di migliaia di righe.

`nodetool tablestats` e `nodetool tablehistograms` riportano dimensione media e massima delle partizioni: una media alta è il segnale da seguire. Un `proxyhistograms` con latenze oltre i 100 ms è spesso la conseguenza di una sola query mal progettata, non dell'hardware.

## Errori comuni

- **`ALLOW FILTERING` per far passare il test**: su dati piccoli la query sembra rapida, su un milione di righe è un timeout.
- **`IN` con decine di valori di partition key**: ogni valore è una partizione diversa, con un fan-out senza limite; meglio più query parallele controllate.
- **`IF NOT EXISTS` su quasi tutte le scritture**: la latenza Paxos porta un inserimento da 2 ms a oltre 15 ms.
- **Batch con chiavi diverse per "garantire l'atomicità"**: il motore lo accetta, il costo no.
- **Consistenza `ONE` sui contatori critici**: la lettura può arrivare da una replica che non ha visto l'ultima scrittura.
- **Leggere grandi partizioni senza `LIMIT`**: il client riceve centinaia di MB e il coordinatore li tiene in memoria.

## In sintesi

In CQL la lettura deve corrispondere alla chiave; altrimenti si paga con `ALLOW FILTERING` o con un indice locale che dirotta su più nodi. Le lightweight transaction sono per l'unicità, non per le scritture normali; i batch convengono solo sulla stessa partizione; la consistenza si sceglie per richiesta. Timeout, `LIMIT` e paging difendono il coordinatore da query che altrimenti lo rendono il collo di bottiglia; paging e consistenza per richiesta sono le due leve quotidiane.

## Fonti

- [Apache Cassandra - CQL Data Manipulation](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/dml.html)
- [Apache Cassandra - CQL operators](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/operators.html)
- [Apache Cassandra - Secondary indexes](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/indexing-concepts.html)
- [Apache Cassandra - CQL commands reference](https://cassandra.apache.org/doc/latest/cassandra/reference/cql-commands/commands-toc.html)
