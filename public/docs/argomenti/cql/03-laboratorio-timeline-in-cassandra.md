In questo laboratorio costruisci un servizio di timeline in Cassandra: due tabelle per due query, un carico di 50.000 eventi e la verifica che nessuna query richieda `ALLOW FILTERING`. Lavori con Docker e con uno script Python sul driver, e alla fine hai un ambiente riproducibile per testare partizioni, indici e consistenza prima di giudicare una query su un cluster vero.

## Obiettivi

- Avviare un nodo Cassandra 5.0 `single-node` e creare un keyspace con `NetworkTopologyStrategy`.
- Tradurre due schermate applicative in due tabelle CQL con chiavi dedicate.
- Caricare dati con statement preparati e un batch controllato.
- Misurare latenza p50/p95 per tre query e riconoscere quella problematica.
- Riprodurre un errore di filtro e correggerlo con la chiave giusta.

## Passo 1: ambiente

Il modo più rapido è il container ufficiale, che espone 9042 per il protocollo CQL. Una sola macchina basta per il laboratorio; non serve un cluster per capire il costo di una query.

```bash
docker run --rm --name cass-lab -p 9042:9042 -d cassandra:5.0.9
sleep 40 && docker exec -it cass-lab nodetool status
docker exec -it cass-lab cqlsh -e "SELECT release_version FROM system.local;"
```

Il container è preferibile perché si azzera in un comando. Verifica che `nodetool status` mostri `UN` sul nodo prima di procedere.

```bash
python -m venv .venv && . .venv/bin/activate
pip install "cassandra-driver>=3.29"
python -c "import cassandra; print(cassandra.__version__)"
```

## Passo 2: schema a due tabelle

Le schermate sono "timeline di un utente" e "post di un tag", dal più recente: la seconda non può riusare la tabella della prima.

```sql
CREATE KEYSPACE lab WITH replication = {
  'class': 'NetworkTopologyStrategy', 'datacenter1': 1
};

CREATE TABLE lab.timeline_by_user (
  user_id      text,
  year_month   text,
  event_time   timestamp,
  event_id     timeuuid,
  tag          text,
  payload      text,
  PRIMARY KEY ((user_id, year_month), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC, event_id DESC);

CREATE TABLE lab.timeline_by_tag (
  tag          text,
  year_month   text,
  event_time   timestamp,
  event_id     timeuuid,
  user_id      text,
  payload      text,
  PRIMARY KEY ((tag, year_month), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC, event_id DESC);
```

`year_month` come `text` `2026-11` rende evidente il bucket. `event_id` in coda evita collisioni di millisecondo: senza, due eventi simultanei avrebbero la stessa chiave di riga.

| Query | Tabella | Predicato chiave | Ordinamento |
| --- | --- | --- | --- |
| ultimi eventi di un utente | `timeline_by_user` | `(user_id, year_month)` | `event_time DESC` |
| ultimi eventi di un tag | `timeline_by_tag` | `(tag, year_month)` | `event_time DESC` |
| dettaglio di un evento | `timeline_by_user` | tupla completa | — |

## Passo 3: ingestione controllata

Lo script genera 50.000 eventi su 1.000 utenti, 20 tag e 3 mesi, con statement preparati e senza `IF NOT EXISTS`.

```python
import random, time, uuid
from datetime import datetime, timedelta, timezone
from cassandra.cluster import Cluster

cluster = Cluster(["127.0.0.1"], port=9042)
session = cluster.connect("lab")
session.default_consistency_level = ConsistencyLevel.LOCAL_QUORUM

ins_user = session.prepare(
    "INSERT INTO lab.timeline_by_user "
    "(user_id, year_month, event_time, event_id, tag, payload) "
    "VALUES (?, ?, ?, ?, ?, ?)"
)
ins_tag = session.prepare(
    "INSERT INTO lab.timeline_by_tag "
    "(tag, year_month, event_time, event_id, user_id, payload) "
    "VALUES (?, ?, ?, ?, ?, ?)"
)

base = datetime(2026, 9, 1, tzinfo=timezone.utc)
random.seed(7)
start = time.perf_counter()
for i in range(50_000):
    user = f"user-{random.randint(1, 1000):04d}"
    tag = f"tag-{random.randint(1, 20)}"
    ts = base + timedelta(minutes=random.randint(0, 90 * 24 * 60))
    ym = ts.strftime("%Y-%m")
    eid = uuid.uuid1()
    session.execute(ins_user, (user, ym, ts, eid, tag, f"payload {i}"))
    session.execute(ins_tag, (tag, ym, ts, eid, user, f"payload {i}"))
print(f"50k coppie in {time.perf_counter() - start:.1f}s")
```

La scrittura in due tabelle è denormalizzazione consapevole, e il tempo totale è dominato dal round trip. Prova anche `BatchStatement(BatchType.UNLOGGED)` sulle due righe dello stesso evento: partono insieme, ma restano due partizioni e il costo non sparisce.

## Passo 4: misurare le tre query

Esegui ogni query 200 volte e calcola i percentili; su un nodo locale p50 e p95 dovrebbero stare sotto i 10 ms.

```python
def misura(q, params, n=200):
    lat = []
    for _ in range(n):
        t = time.perf_counter()
        session.execute(q, params)
        lat.append((time.perf_counter() - t) * 1000)
    lat.sort()
    return lat[n // 2], lat[int(n * 0.95)]

print("utente+mese", misura(session.prepare(
    "SELECT event_id, payload FROM lab.timeline_by_user "
    "WHERE user_id = ? AND year_month = ? LIMIT 20"),
    ("user-0042", "2026-10")))
print("tag+mese", misura(session.prepare(
    "SELECT event_id, payload FROM lab.timeline_by_tag "
    "WHERE tag = ? AND year_month = ? LIMIT 20"),
    ("tag-07", "2026-10")))
print("dettaglio", misura(session.prepare(
    "SELECT payload FROM lab.timeline_by_user "
    "WHERE user_id = ? AND year_month = ? AND event_time = ? AND event_id = ?"),
    ("user-0042", "2026-10", base, uuid.uuid1())))
```

Poi prova la query "da non fare": l'errore è la parte più istruttiva.

```sql
SELECT * FROM lab.timeline_by_user WHERE payload = 'payload 1234';
-- InvalidRequest: ... use ALLOW FILTERING

SELECT * FROM lab.timeline_by_user LIMIT 5 ALLOW FILTERING;
```

La prima rivela che `payload` non è indice; la seconda risponde, ma legge righe finché non riempie il `LIMIT`, e con un `WHERE` non filtrabile coinvolge tutto l'anello. La correzione non è `ALLOW FILTERING`: serve una terza tabella o un indice SAI con cardinalità controllata.

## Passo 5: esplorare consistenza e partizioni

Passa `default_consistency_level` a `ConsistencyLevel.ONE` e ripeti: con un solo nodo e RF 1 non cambia nulla, ma in cluster con RF 3 la lettura `ONE` può non vedere l'ultima scrittura. Per la dimensione delle partizioni esegui:

```bash
docker exec -it cass-lab nodetool tablestats lab.timeline_by_user | grep -i "partition"
docker exec -it cass-lab nodetool tablehistograms lab.timeline_by_tag
```

Poi concentra il carico su un solo utente: se la dimensione massima delle partizioni sale, il bucket `year_month` non basta per un utente molto attivo.

## Esercizi

1. Aggiungi `bucket_day` al posto di `year_month` e rifai la misura: quante partizioni in più, latenza diversa?
2. Crea una tabella `counters_by_tag (tag text, year_month text, total counter, PRIMARY KEY ((tag, year_month)))` e incrementala con `UPDATE ... SET total = total + ?`; verifica che non possa stare nella stessa tabella degli eventi.
3. Risolvi la query su `payload` con un indice SAI e confronta la latenza con `ALLOW FILTERING`.
4. Rompi il vincolo di prefisso: prova `WHERE user_id = ? AND event_id = ?` senza `event_time` e leggi il messaggio di errore.
5. Aggiungi `USING TTL 604800` sulle righe della tabella tag e controlla con `ttl(payload)` quanti secondi restano.

<details>
<summary>Soluzione parziale</summary>

1. Il bucket giorno produce più partizioni, quindi più entry di metadati e letture con fan-out maggiore; la latenza sulla singola partizione scende, la media su tutte le partizioni sale.
2. Una tabella con colonne `counter` ammette solo `UPDATE ... SET x = x + n`, e la regola è verificabile dal DDL stesso: la stessa tabella non può contenere le colonne normali degli eventi.
3. L'indice SAI su `payload` con cardinalità molto alta rende la query possibile, ma la latenza resta legata al numero di righe che soddisfano il predicato; la tabella dedicata è ancora la soluzione scalabile.
4. `event_id` è una clustering successiva a `event_time`: senza il prefisso il motore risponde `InvalidRequest` per clustering column saltata.
5. `ttl(payload)` restituisce i secondi rimanenti, con 0 se scaduta; i valori scaduti diventano tombe fino alla compaction.

</details>

## Errori comuni

- **Dimenticare `event_id` come seconda clustering**: due eventi nello stesso millisecondo producono la stessa chiave di riga e il secondo sovrascrive il primo senza errori.
- **Preparare lo statement a ogni chiamata**: un round trip di metadati per query; prepara una volta e riusa, come nello script.
- **Caricare con `IF NOT EXISTS` per sicurezza**: quadruplichi la latenza di scrittura e in un test da 50.000 eventi il tempo triplica.
- **Usare `docker run` senza `-p 9042`**: lo script vede `NoHostAvailable` e sembra un problema di driver.
- **Partire prima che il nodo sia `UN`**: `cqlsh` a volte risponde e a volte no, e le misure diventano casuali.

## In sintesi

Hai tradotto due schermate in due tabelle con chiavi diverse, caricato 50.000 eventi, misurato tre query e visto che la quarta è impossibile senza `ALLOW FILTERING`. La latenza dipende dalle partizioni coinvolte, non dalle righe cercate: le partizioni grandi sono il primo segnale da leggere con `nodetool`, ben prima di aggiungere macchine o cambiare hardware. Lo schema è il vero piano di performance, e ogni tabella in più che scrivi è il prezzo della lettura veloce che hai guadagnato.

## Fonti

- [Apache Cassandra - CQL Data Definition](https://cassandra.apache.org/doc/latest/cassandra/developing/cql/ddl.html)
- [Apache Cassandra - cqlsh](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/cqlsh.html)
- [Apache Cassandra - Getting started, querying](https://cassandra.apache.org/doc/latest/cassandra/getting-started/querying.html)
- [Apache Cassandra - nodetool](https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/nodetool.html)
