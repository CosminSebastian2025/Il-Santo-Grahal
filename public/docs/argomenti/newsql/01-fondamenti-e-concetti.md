NewSQL è una categoria di database, non un prodotto: raccoglie i sistemi che promettono le garanzie del database relazionale (SQL, transazioni ACID, serializzabilità) insieme alla scalabilità orizzontale e alla tolleranza ai guasti di un sistema distribuito. In pratica sono motori nati dopo il 2012 che sostituiscono il disco locale con un consenso distribuito, e che devono risolvere i problemi che un Postgres singolo non ha: cosa vuol dire "committed" quando il commit passa da tre macchine, e quanto costa un contatore incrementato da mille client. In questa lezione metti a fuoco i concetti che rendono la categoria riconoscibile e i compromessi che porta con sé.

## Obiettivi

- Definire NewSQL distinguendolo da NoSQL, da Postgres scalato verticalmente e da un servizio gestito qualsiasi.
- Riconoscere i componenti comuni: layer SQL stateless, collocazione dei dati in shard o region, replica Raft, timestamp globale.
- Confrontare isolamento e latenza dei principali esponenti con criteri operativi.
- Scrivere applicazioni che convivono con retry, contesa e distribuzione dei dati.

## Che cosa rende un database NewSQL

La definizione utile è per proprietà, non per tecnologia. Un sistema è NewSQL quando soddisfa insieme quattro requisiti: accetta SQL e transazioni multi-riga, isola le transazioni almeno come snapshot con conflitti rilevati (o serializzabile), replica sincronamente i dati su più nodi con failover automatico, e distribuisce i dati su più macchine senza che l'applicazione sappia dove sta una riga.

Questo lo separa dai vicini più prossimi:

| Sistema | SQL e transazioni | Distribuzione | Cosa manca per essere NewSQL |
| --- | --- | --- | --- |
| Postgres su una VM grande | complete | nulla, un solo nodo | scala orizzontale e failover automatico |
| Postgres con replica streaming | complete | letture su replica | scritture concentrate su un primario |
| Cassandra, DynamoDB | no transazioni multi-riga generali | sharding nativo | isolamento e join |
| CockroachDB, TiDB, YugabyteDB | complete | shard con consenso per shard | — |
| Spanner | complete | shard globali con TrueTime | servizio cloud con vincoli propri |

L'idea comune è che lo **shard** diventa l'unità di replica e di consenso. CockroachDB chiama "range" un blocco contiguo di chiavi, con repliche su almeno 3 nodi per default e un leaseholder che serve letture coerenti e scritture; TiDB chiama "region" l'unità che TiKV replica per default su tre repliche; YugabyteDB usa tablet e Raft per ogni tablet. In tutti i casi la transazione deve toccare più shard, quindi il coordinamento fra shard è dove nasce la complessità.

## Timestamp e consenso: il costo del commit

Un database single-node può ordinare le transazioni con un lock sul buffer pool. In un sistema distribuito l'ordine deve essere globale, e da qui nascono le architetture dei timestamp.

CockroachDB ordina con timestamp assegnati dal transaction layer e usa un closed timestamp per servire letture coerenti senza contattare il leader; gli shard comunicano tramite Raft e i conflitti sono rilevati con write intent e timestamp cache. Spanner usa TrueTime, un intervallo di incertezza con orologio atomico e GPS, e aspetta che l'incertezza sia passata prima di dichiarare il commit. TiDB assegna gli ID di transazione con PD e usa la Snapshot Isolation di default, con TiKV che implementa il key-value transazionale. In tutti questi modelli il commit attraversa un quorum.

Il costo pratico si vede nei numeri:

- una scrittura su un range/region replicato costa almeno un round-trip al quorum: l'aggiunta di una replica geografica aumenta la latenza del commit;
- una transazione che tocca shard diversi paga un coordinamento in più, e più le righe sono distribuite, più è probabile che serva un retry;
- un contatore globale diventa un punto di contesa: mille `UPDATE` sullo stesso contatore sono serializzati, quindi il throughput è limitato dal singolo shard.

Per questo tutte le guide di produzione insistono sulle **chiavi che distribuiscono**: in CockroachDB una chiave con un UUID casuale sparpaglia bene, mentre un `serial` incrementale crea un hot range finale; in TiDB la primary key consigliata per tabelle ad alta scrittura è spesso un indice secondario a monte perché `AUTO_INCREMENT` crea scritture concentrate.

## Contro chi lo stai scegliendo

La scelta non è NewSQL sì o no, è quanto vale la tua disponibilità e dove si trova il tuo traffico.

| Situazione | Scelta ragionevole | Motivo |
| --- | --- | --- |
| un'istanza, pochi TB, traffico europeo | Postgres gestito con HA | meno complessità, latenza locale, ecosistema estensioni |
| crescita dei dati oltre un nodo | NewSQL o sharding manuale | lo sharding manuale costa ingegneria continua |
| requisito di sopravvivere alla perdita di una regione | NewSQL multi-regione | replica sincrona con consenso |
| analytics e transazioni sullo stesso dato | TiDB con TiFlash o soluzioni HTAP | copia colonnare replicata dal layer transazionale |
| microservizi con scritture su singola riga | qualsiasi opzione va bene | il vincolo è la latenza di commit, non la scala |

Il punto onesto: se il tuo database ci sta in una macchina con margine, un NewSQL aggiunge complessità di deployment (almeno 3 nodi per avere la ridondanza che promette), regole di chiavi, gestione dei retry e un'osservabilità più difficile. Lo si sceglie quando il vincolo è davvero la scalabilità o la sopravvivenza geografica.

## Errori comuni

- **Valutare un NewSQL su un singolo nodo**: il cluster da un nodo non ha ridondanza e ha prestazioni che non rappresentano la produzione: si misura su 3 o 5 nodi.
- **Portare `SERIAL` senza guardare il piano di distribuzione**: l'incremento crea un hot range e il carico va su un solo nodo.
- **Trattare i retry come bug**: in isolamento serializzabile un retry è parte del contratto e va gestito nel client.
- **Confondere compatibilità di protocollo con compatibilità semantica**: TiDB parla MySQL e CockroachDB parla Postgres, ma dettagli come funzioni, tipi e hint differiscono.
- **Sottostimare le regioni**: la replica geografica sincrona protegge da guasti, ma sposta la latenza di ogni commit sul collegamento più lento del quorum.

## In sintesi

NewSQL è l'intersezione fra relazionale e distribuito: SQL e ACID da una parte, shard replicati con consenso dall'altra. Il prezzo è la latenza del consenso e la necessità di progettare chiavi e transazioni sapendo che il commit passa da più nodi. Nella prossima lezione leggi le architetture di CockroachDB, TiDB e YugabyteDB pezzo per pezzo, per scegliere con criteri.

## Fonti

- [CockroachDB — Architecture overview](https://docs.cockroachlabs.com/docs/stable/architecture/overview)
- [TiDB — Architecture](https://docs.pingcap.com/tidb/stable/tidb-architecture)
- [YugabyteDB — Architecture](https://docs.yugabyte.com/stable/architecture/)
- [PostgreSQL — Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
