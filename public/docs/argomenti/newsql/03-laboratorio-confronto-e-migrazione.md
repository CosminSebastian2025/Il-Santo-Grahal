In questo laboratorio smonti i luoghi comuni sui database distribuiti con due esperimenti riproducibili: in locale, con un cluster CockroachDB, misuri il costo del consenso e della contesa mostrando cosa succede quando le chiavi sono incrementali; poi stimi la latenza di commit multi-regione per livelli di replica diversi, e chiudi con i controlli da mettere in una checklist di migrazione. Nessun numero arriva da un blog: ogni valore lo produci tu, con comandi ripetibili.

## Obiettivi

- Avviare un cluster CockroachDB a tre nodi in locale e inizializzarlo correttamente.
- Misurare scritture seriali su chiave incrementale e su UUID, con piano dei range a supporto.
- Modellare la latenza di commit geografica e confrontarla con il costo di un retry.
- Eseguire una checklist di compatibilità prima di migrare uno schema Postgres.

## Avviare il cluster e la baseline

Un cluster di tre nodi è il minimo per avere la replica di default senza perdite: con tre nodi su tre repliche, un nodo perso lascia il quorum. Avvia i nodi con il server `start-single-node` **solo** per lo sviluppo rapido, e usa il cluster quando vuoi misurare qualcosa di reale.

| Ruolo | Comando | Verifica |
| --- | --- | --- |
| nodo iniziale | `cockroach start --insecure --store=node1 --listen-addr=localhost:26257 --http-addr=localhost:8080 --join=localhost:26257,localhost:26258,localhost:26259` | SQL su 26257 |
| nodo 2 e 3 | stesso comando con `--store=node2/3` e porte 26258/26259 | `cockroach node status` |
| inizializzazione | `cockroach init --insecure --host=localhost:26257` | eseguita una sola volta |
| creazione database | `cockroach sql --insecure -e "CREATE DATABASE bench"` | `SHOW DATABASES` |

Prima di misurare, stabilisci la baseline: una scrittura singola su una tabella con PK UUID e nessuna contesa. Serve a sapere quanto costa il protocollo (round-trip al leaseholder e quorum Raft) senza l'effetto che vuoi studiare.

```bash
cockroach sql --insecure -d bench -e "
CREATE TABLE eventi_uuid (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), creato TIMESTAMPTZ DEFAULT now());
CREATE TABLE eventi_ser (id SERIAL PRIMARY KEY, creato TIMESTAMPTZ DEFAULT now());"

# ogni INSERT è una transazione implicita: 200 scritture
time (for i in $(seq 1 200); do
  cockroach sql --insecure -d bench -e "INSERT INTO eventi_uuid DEFAULT VALUES" >/dev/null
done)
```

## L'esperimento sulle chiavi

Ora ripeti gli stessi 200 inserimenti sulla tabella con `SERIAL` e confronta i tempi. Se il cluster è su una sola macchina la differenza sarà modesta, perché tutti i nodi parlano via loopback; quello che cambia in modo netto, e che vedi anche in locale, è il piano dei range.

```sql
-- quanti range contiene la tabella e su quale nodo stanno le repliche
SHOW RANGES FROM TABLE eventi_ser;
SHOW RANGES FROM TABLE eventi_uuid;

-- il range più caldo: quante richieste per range
SELECT range_id, node_id, lease_holder, request_count
FROM crdb_internal.node_statement_statistics -- vista di esempio, cambia con la versione
LIMIT 10;

-- metriche aggregate più affidabili nella UI su localhost:8080
```

```bash
# contatore conteso: 20 processi x 20 incrementi, con retry applicativo
cockroach sql --insecure -d bench -e "CREATE TABLE contatori (id INT PRIMARY KEY, n INT); INSERT INTO contatori VALUES (1, 0);"

seq 1 20 | xargs -P 20 -I{} cockroach sql --insecure -d bench -e "
  BEGIN; UPDATE contatori SET n = n + 1 WHERE id = 1; COMMIT;"
cockroach sql --insecure -d bench -e "SELECT n FROM contatori;"  # atteso 400
```

L'osservazione attesa: la tabella con `SERIAL` concentra le scritture sull'ultimo range e su un solo leaseholder, quella con UUID distribuisce su più range. Su una sola macchina la differenza nei tempi è modesta, perché tutto passa dal loopback, ma il piano dei range cambia in modo netto; con node2 su un'altra VM il tempo mediano del caso `SERIAL` si allontana. Annota anche i retry: un contatore unico aggiornato in transazione ne mostra già a 20 client concorrenti.

## Stimare la latenza geografica

Il secondo esperimento non richiede un cluster globale: basta un modello di latenza. Una transazione con repliche in `eu-west`, `eu-central` e `us-east`, con quorum di due, ha commit determinato dal secondo nodo più veloce fra i due europei. Aggiungendo un quinto nodo, il quorum è tre, e a quel punto un collegamento lento entra nel calcolo.

```python
# stima del commit: quorum = floor(repliche / 2) + 1, latenza = k-esimo RTT più piccolo
from statistics import median

RTT_MS = {"eu-west": 2, "eu-central": 18, "us-east": 95, "ap-south": 140}

def commit_ms(nodi):
    rtts = sorted(RTT_MS[n] for n in nodi)
    quorum = len(nodi) // 2 + 1
    return rtts[quorum - 1]

for scenario in (
    ["eu-west", "eu-central", "eu-central"],
    ["eu-west", "eu-central", "us-east"],
    ["eu-west", "eu-central", "us-east", "ap-south", "us-east"],
):
    print(scenario, "commit ~", commit_ms(scenario), "ms andata")
```

Le cifre sono indicative e vanno sostituite con `ping` reali verso le region del tuo provider, ma il comportamento è quello che conta: la replica sincrona protegge dalla perdita di una regione e la paga ogni scrittura, e una transazione con 5 scritture sequenziali costa circa 5 volte un singolo commit.

## Checklist di migrazione

Prima di spostare uno schema su un NewSQL, passa questa lista e registra l'esito: ogni voce è un potenziale blocco, e nessuna si scopre in produzione senza costo.

| Controllo | Comando | Blocco se |
| --- | --- | --- |
| chiavi incrementali | `SELECT count(*) FROM tabella` e forma della PK | PK `SERIAL` su tabella ad alta scrittura |
| sequenze e `nextval` | `grep -r nextval migrations/` | uso massiccio di sequenze condivise |
| transazioni lunghe | log delle query > 5 s | transazioni che durano secondi sotto carico |
| `SERIALIZABLE` implicito | test di concorrenza | codice senza retry |
| funzioni e tipi Postgres | `dblink`, `pg_catalog` custom, estensioni | dipendenze non supportate |
| migrazioni | `drizzle-kit pull` o `pg_dump --schema-only` | oggetti non replicabili |

## Esercizi

1. Ripeti il test di contesa con un contatore per cliente invece che globale: il throughput cambia come previsto?
2. Aggiungi una transazione che tocca due tabelle con PK UUID diverse e conta i retry a 50 client.
3. Cambia il modello di latenza mettendo le tre repliche in tre continenti e calcola il costo di un lotto di 1000 transazioni a 20 ms di commit.
4. Scrivi un test che fallisce se una migrazione usa una PK `SERIAL` su una tabella dichiarata calda.

<details>
<summary>Soluzione</summary>

1. Con un contatore per cliente la contesa si distribuisce sui range di `clienti`; il throughput cresce finché il carico non si concentra su pochi clienti grandi.
2. Il retry compare quando le due transazioni scrivono in ordine inverso le stesse righe; ridurre le transazioni multi-shard o ordinare gli accessi riduce i conflitti.
3. La latenza dipende dal quorum: con tre continenti il secondo nodo più veloce può essere già intercontinentale, quindi il costo per transazione sale al livello del collegamento più lento del quorum.
4. Una regola lint sul file SQL generato: se `CREATE TABLE ... SERIAL` compare su una tabella presente in una lista di tabelle calde, lo script esce con codice 1.

</details>

## Errori comuni

- **Misurare con `start-single-node`**: senza replica e senza rete i numeri non dicono nulla sul comportamento distribuito.
- **Dimenticare `cockroach init`**: i nodi si avviano ma restano in attesa e ogni query fallisce.
- **Confrontare mediane senza contare i retry**: il throughput di successo è più basso dei tempi mediani, e il divario cresce con la concorrenza.
- **Usare una vista interna come contratto**: i nomi di `crdb_internal` cambiano fra versioni, i numeri stabili vanno presi dalle metriche.
- **Stimare la latenza geografica con ping a un solo nodo**: è il quorum che determina il commit, non il nodo più vicino.

## In sintesi

Hai prodotto tre risultati: il costo di contesa su chiavi concentrate, la forma del piano dei range per due tipi di chiave e un modello di latenza di commit per quorum. La checklist trasforma questi numeri in decisioni: se le tue chiavi sono incrementali e il codice non ha retry, il NewSQL non è ancora la scelta ma un progetto di rifattorizzazione.

## Fonti

- [CockroachDB — Architecture overview](https://docs.cockroachlabs.com/docs/stable/architecture/overview)
- [CockroachDB — Vectorized execution](https://docs.cockroachlabs.com/docs/stable/vectorized-execution)
- [TiDB — Architecture](https://docs.pingcap.com/tidb/stable/tidb-architecture)
- [PostgreSQL — Routine vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html)
