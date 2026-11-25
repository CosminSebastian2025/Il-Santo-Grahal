Redpanda è una piattaforma di streaming distribuita compatibile con l'API Kafka, scritta in C++ e costruita sopra Seastar, un framework I/O asincrono a thread-per-core. Nasce per eliminare JVM, ZooKeeper e tuning di garbage collector da un cluster Kafka, mantenendo la stessa interfaccia lato client.

## Obiettivi

- Capire perché esiste Redpanda e in cosa differisce da Apache Kafka a livello di runtime.
- Riconoscere i componenti di un cluster: broker, controller, API Kafka, Admin API, HTTP Proxy e Schema Registry.
- Distinguere topic, partizioni, repliche, leader e offset, e scegliere un replication factor coerente.
- Leggere una configurazione di avvio reale e sapere quali porte espone un broker.

## Dal problema al modello

Un cluster Kafka classico si porta dietro tre costi: la JVM (heap, GC, pause che interagiscono con i timeout dei client), un ensemble ZooKeeper o KRaft per i metadati, e l'operazione di tuning di decine di parametri. Redpanda sostituisce tutto con un singolo binario che fa anche da controller: nessun coordinatore esterno, thread per core, memoria preallocata e un `rpk`, la CLI che parla sia con il broker sia con il cluster remoto.

| Aspetto | Kafka classico | Redpanda |
| --- | --- | --- |
| Runtime | JVM | C++ su Seastar, thread-per-core |
| Metadati | ZooKeeper o KRaft | controller interno al cluster |
| Buffer di pagina | page cache OS | page cache gestita dal broker |
| Pacchetto client | librerie Kafka | compatibili Kafka (API v0–v8) |
| CLI | `kafka-topics.sh`, `kafka-consumer-groups.sh` | `rpk` |
| Proxy HTTP | resta un servizio separato | endpoint `pandaproxy` incluso |

La compatibilità riguarda il protocollo, non l'interno: un consumer Kafka standard si collega a Redpanda senza modifiche, ma non ha senso chiedergli cose specifiche di Kafka come la struttura di `__consumer_offsets` o l'uso di KRaft.

## Anatomy of a broker

Ogni broker espone almeno quattro endpoint, ognuno con un `--*-addr` per l'ascolto e un `--advertise-*` per l'indirizzo che comunica ai client.

| Endpoint | Porta tipica | A cosa serve |
| --- | --- | --- |
| Kafka API | 9092 | produce, fetch, consumer group, admin admin |
| RPC | 33145 | traffico interno broker-to-broker e controller |
| Admin API | 9644 | stato cluster, partizioni, ACL di amministrazione |
| Schema Registry | 8081 | registri condivisi di Avro, Protobuf, JSON Schema |
| HTTP Proxy | 8082 | produce/consume via REST |

Un broker "solo" non digerisce autonomamente l'intera configurazione: la parte cluster-wide va in un file bootstrap (`bootstrap.yml`), la parte per processo si passa con `rpk redpanda start` o `--set`. Nella documentazione ufficiale il quickstart multi-broker usa `--mode dev-container`, che ammette piccole macchine e porta i parametri a valori da sviluppo.

```yaml
# frammento del bootstrap di un cluster a 3 broker
admin_api_require_auth: true
superusers:
  - superuser
enable_sasl: true
auto_create_topics_enabled: false
```

`admin_api_require_auth` e `enable_sasl` obbligano ad autenticarsi anche in locale: è la differenza tra un laboratorio e un cluster che qualcuno può raggiungere in rete.

## Topic, partizioni e repliche

Un topic è un log append-only diviso in partizioni. Ogni partizione ha un leader, che accetta scritture, e un insieme di follower che copiano. Il client produce con una chiave che determina la partizione: stessa chiave, stessa partizione, quindi stesso ordinamento.

```bash
docker exec -it redpanda-0 rpk topic create chat-room \
  --replicas 3 \
  --topic-config retention.ms=604800000 \
  -X user=superuser -X pass=secretpassword
```

Con tre broker il replication factor 3 permette di perdere un broker senza perdere il topic, ma non due: con due nodi su tre attivi resta una maggioranza per il controller, mentre un topic con `--replicas 3` e un solo broker rimasto diventerebbe under-replicated e non disponibile in scrittura. Regola pratica: RF uguale al numero di broker nelle installazioni piccole, RF 3 con almeno cinque broker in produzione, `min.insync.replicas` a 2 così un produce con `acks=all` fallisce esplicitamente invece di perdere dati.

| Parametro | Default Kafka | Nota Redpanda |
| --- | --- | --- |
| `retention.ms` | 604800000 (7 giorni) | uguale, ma con Tiered Storage si scarica il segmento su oggetto |
| `segment.bytes` | 134217728 (128 MiB) | uguale |
| `auto_create_topics_enabled` | `true` | disattivalo: i topic si creano con `rpk topic create` |
| `redpanda.remote.write` | `false` | accende il tiering per il singolo topic |

## Osservare il cluster con rpk

`rpk` non è solo un amministratore: `rpk cluster info` restituisce i broker visti dal controller, `rpk topic describe` mostra le partizioni con leader e repliche, `rpk group describe` mostra i lag dei consumer group. Tutti accettano `-X brokers=...`, `-X user=...` e `-X pass=...`, quindi funzionano identicamente dentro un container e da un laptop.

```bash
rpk cluster info
rpk topic list --detailed
rpk topic describe chat-room -p       # dettaglio per partizione
rpk group describe transactions-consumer
```

Un errore frequente è confondere `rpk topic consume` (semantica di reader, senza consumer group) con `rpk topic consume --group` (nuovo consumer group, offset durevoli). Il primo è ottimo per ispezionare un topic, il secondo per riprodurre un'applicazione.

## Errori comuni

- **Trattare Redpanda come Kafka identico**: le API sono compatibili, ma tool che si aspettano ZooKeeper o KRaft non hanno nulla a cui connettersi.
- **Lasciare `auto_create_topics_enabled: true`**: un typo del nome produce una nuova partizione singola senza repliche, invisibile fino al reload.
- **RF uguale al numero di broker con scalability a caldo**: aggiungere un broker non aumenta da solo l'RF dei topic esistenti, va fatto con `rpk topic alter-config`.
- **Dimenticare `advertise-*`**: in Docker il broker è raggiungibile all'indirizzo interno ma annuncia un hostname che il client fuori dalla rete non risolve.
- **Aumentare `--smp` senza iotune**: i core in più senza taratura del disco peggiorano la latenza di scrittura.

## In sintesi

Redpanda conserva il modello Kafka (log partizionato, replica, consumer group) e sostituisce il runtime: un broker C++ su Seastar, controller integrato, `rpk` come unico strumento operativo. Un broker espone Kafka API, RPC, Admin API, Schema Registry e HTTP Proxy, e ogni indirizzo va annunciato con `--advertise-*`. Replication factor, `min.insync.replicas` e auto-creazione sono le prime tre scelte che separano un laboratorio da un cluster che puoi riavviare senza perdere dati.

## Fonti

- [Redpanda - Architecture](https://docs.redpanda.com/streaming/current/get-started/architecture/)
- [Redpanda - Quickstart](https://docs.redpanda.com/current/get-started/quick-start/)
- [Redpanda - Manual deployment](https://docs.redpanda.com/streaming/current/deploy/redpanda/manual/production/)
- [Redpanda - rpk reference](https://docs.redpanda.com/streaming/current/reference/rpk/)
