CockroachDB, TiDB e YugabyteDB risolvono lo stesso problema con architetture che si somigliano molto e divergono nei dettagli che poi pesano in produzione: il modo in cui un nodo diventa responsabile di una parte di dati, il livello di isolamento offerto, il protocollo SQL e il costo di una transazione che attraversa più shard. In questa lezione leggi le tre architetture strato per strato, con i numeri che contano, e impari a scegliere la più adatta al tuo carico. Il riferimento pratico resta Postgres, di cui questi sistemi copiano il modello a transazioni e spesso il protocollo.

## Obiettivi

- Descrivere i layer di CockroachDB (SQL, transazione, distribuzione, replica Raft, storage) e il ruolo di range, leaseholder e write intent.
- Descrivere i componenti di TiDB (TiDB server stateless, PD, TiKV, TiFlash) e l'unità `region`.
- Confrontare isolamento, modello di replica e compromessi fra i tre sistemi.
- Tradurre le caratteristiche in una scelta operativa motivata.

## CockroachDB: cinque layer e un leaseholder per range

CockroachDB espone un protocollo compatibile Postgres e organizza il lavoro in cinque layer, ognuno trattato come un servizio opaco da quello superiore.

| Layer | Compito | Effetto per chi scrive applicazioni |
| --- | --- | --- |
| SQL | traduce query in operazioni key-value | compatibilità Postgres, driver `pg` |
| Transactional | rende atomici più KV | serializzabile per default, write intent |
| Distribution | presenta i range replicati come un unico dato | il router nasconde la posizione delle righe |
| Replication | replica sincrona con Raft | commit quando il quorum ha il log |
| Storage | scrittura su disco con timestamp | `AS OF SYSTEM TIME` permette letture storiche |

Il dato utente vive in un keyspace ordinato diviso in **range** contigui. Ogni range è replicato su almeno 3 nodi per default e superata la dimensione di default viene diviso. Su ogni range un replica fa da **leaseholder**: riceve e coordina letture e scritture, e per la maggior parte delle tabelle è l'unica che può servire letture coerenti. Il leaseholder coincide con il leader Raft tranne durante i trasferimenti di lease.

Il dettaglio operativo che conta è che i range dipendono dalle chiavi. Un ID incrementale concentra le scritture sull'ultimo range, e quindi su un nodo; un UUID casuale distribuisce. Le guide di performance di CockroachDB dedicano ampio spazio a contesa e retry, perché il serializzabile è il default: un conflitto che non può essere ordinato produce un errore che il client deve gestire.

## TiDB: SQL stateless, PD e TiKV

TiDB adotta una separazione più marcata fra calcolo e storage, con quattro ruoli distinti.

- **TiDB server**: layer SQL stateless che parla il protocollo MySQL, riceve le richieste, ottimizza e produce un piano di esecuzione distribuito. Non conserva dati, si scala aggiungendo istanze dietro un bilanciatore.
- **PD (Placement Driver)**: il "cervello" del cluster, conserva metadati di distribuzione e topologia, alloca gli ID di transazione e invia ordini di scheduling ai TiKV. Va deployato con numero dispari di nodi, almeno tre.
- **TiKV**: motore key-value transazionale e distribuito. L'unità di dati è la **region**, intervallo di chiavi semiaperto, replicato su tre copie per default con failover automatico. TiKV supporta transazioni distribuite a livello key-value con **Snapshot Isolation** come isolamento predefinito.
- **TiFlash**: storage colonnare replicato dal layer transazionale, per le query analitiche.

Il compromesso di TiDB è netto: compatibilità MySQL, snapshot isolation di default e un modello HTAP con TiFlash. Per il tuo dominio, se l'applicazione conosce già MySQL e ti serve anche analytics, l'integrazione colonnare è la ragione principale per sceglierlo, più della scala di scrittura.

## YugabyteDB e il confronto operativo

YugabyteDB punta sull'idea opposta a TiDB sul piano del linguaggio: mette un dialetto Postgres sopra un motore distribuito DocDB con tablet Raft, così il codice esistente resta quasi identico. È la scelta di chi ha investito su Postgres e cerca scala senza riscrivere lo strato applicativo, mentre TiDB è la scelta speculare per chi vive già in MySQL.

| Criterio | CockroachDB | TiDB | YugabyteDB |
| --- | --- | --- | --- |
| Protocollo SQL | Postgres | MySQL | Postgres, anche YCQL |
| Isolamento predefinito | serializzabile | Snapshot Isolation | serializzabile per YSQL |
| Unità di replica | range, almeno 3 repliche | region, 3 repliche TiKV | tablet con Raft |
| Componenti | nodi simmetrici, ogni nodo fa tutto | TiDB + PD + TiKV (ruoli separati) | tserver e master |
| Analytics integrata | colonnare separato non predefinito | TiFlash | non enfatizzata |
| Ostacolo principale | retry lato client, hot range | contesa su `AUTO_INCREMENT` | ecosistema più piccolo |

Tre domande chiudono la scelta. La prima: quale protocollo ha il tuo codice esistente, perché il costo di migrazione domina tutto il resto. La seconda: quanto tollera la tua latenza p95 un retry, perché il serializzabile di CockroachDB e YugabyteDB lo rende parte del contratto. La terza: le tue scritture sono su chiavi distribuite o concentrate su un contatore o un `SERIAL`, perché su un solo hot range nessuno dei tre ti salva.

## Retry, contesa e schema

```sql
-- CockroachDB: chiave distribuita per carichi ad alta scrittura
CREATE TABLE eventi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- sparge i range
  type STRING NOT NULL,
  creato TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TiDB: AUTO_INCREMENT concentra le scritture, per tabelle calde servono
-- PK non monotona o indice secondario locale (SHARD_ROW_ID_BITS)
SHOW CREATE TABLE metrics;

-- lettura di uno snapshot storico nella history window
SELECT count(*) FROM eventi AS OF SYSTEM TIME '-10s';
```

Sul piano applicativo servono tre proprietà: retry con backoff esponenziale intorno alle transazioni che possono confliggere; un timeout per evitare che una transazione zombie blocchi una riga; un piano per le letture quando il leaseholder cambia nodo. Nessuna è nuova rispetto a Postgres, ma in un cluster distribuito diventano frequenti invece che eccezionali.

## Errori comuni

- **Portare su Cluster una PK incrementale senza pensarci**: le scritture vanno tutte sull'ultimo range, e i nodi si squilibrano anche se aggiungi macchine.
- **Contare su letture senza coordinamento**: le letture coerenti passano dal leaseholder, quindi replicare in lettura non è gratis come con una replica Postgres in streaming.
- **Confondere tre repliche con tre nodi**: il default richiede tre nodi distinti, e un cluster a 3 nodi perde quorum se ne perde due.
- **Ignorare la differenza di isolamento**: un test scritto con `READ COMMITTED` su MySQL non dimostra il comportamento in serializzabile su CockroachDB.
- **Misurare con range piccoli**: con pochi dati c'è un solo range, quindi non si vede nessun effetto di distribuzione.

## In sintesi

CockroachDB è un cluster simmetrico a cinque layer con serializzabile e leaseholder per range; TiDB separa SQL stateless, PD e TiKV con snapshot isolation e TiFlash; YugabyteDB porta il protocollo Postgres sopra tablet Raft. Il protocollo che parli, l'isolamento che tolleri e la forma delle tue chiavi sono i tre criteri che decidono, non il chip dei benchmark.

## Fonti

- [CockroachDB — Architecture overview](https://docs.cockroachlabs.com/docs/stable/architecture/overview)
- [CockroachDB — Vectorized execution](https://docs.cockroachlabs.com/docs/stable/vectorized-execution)
- [TiDB — Architecture](https://docs.pingcap.com/tidb/stable/tidb-architecture)
- [TiKV — Overview](https://docs.pingcap.com/tidb/stable/tikv-overview)
- [YugabyteDB — Replication](https://docs.yugabyte.com/stable/architecture/docdb-replication/replication/)
