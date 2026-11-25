Un cluster Redpanda non è "tre broker e un topic": è un insieme di componenti con responsabilità diverse, ognuno con il proprio indirizzo annunciato, i propri permessi e il proprio costo di gestione. Questa lezione passa in rassegna la distribuzione, la sicurezza, il Tiered Storage e le Data Transforms, cioè i pezzi che decidono se il sistema regge in produzione.

## Obiettivi

- Distinguere configurazione broker, cluster-wide e bootstrap, e sapere dove scrivere cosa.
- Esporre correttamente gli indirizzi `internal` ed `external` in un deployment containerizzato.
- Impostare autenticazione SASL, ACL per topic e un superuser senza esporre le credenziali.
- Attivare il Tiered Storage e riconoscere quando il traffico locale e remoto convivono.
- Scrivere e distribuire una Data Transform WASM con `rpk transform deploy`.

## Configurazione su tre livelli

Redpanda separa i parametri in base al momento in cui devono esistere.

| Livello | Dove | Esempi | Effetto |
| --- | --- | --- | --- |
| processo | flag di `redpanda start`, `--set` | `--smp`, `--memory`, `--kafka-addr` | richiede riavvio del broker |
| cluster-wide | `bootstrap.yml` o Admin API | `enable_sasl`, `superusers`, `cloud_storage_enabled` | vale per tutto il cluster |
| topic | `rpk topic create --topic-config` | `retention.ms`, `redpanda.remote.write` | vale solo per il topic |

`rpk redpanda config` mostra solo la config del broker raggiunto, non quella di un altro nodo. In un cluster a tre broker con `--smp 1` ogni nodo processa con un core dedicato: un `--smp` più alto su una macchina con disco lento non migliora il throughput, perché il limite diventa il flush.

## Indirizzi: internal ed external

Ogni endpoint può essere dichiarato con due nomi, `internal` ed `external`, e il broker decide quale annunciare in base alla porta su cui il client si è connesso.

```yaml
redpanda-0:
  command:
    - redpanda
    - start
    - --kafka-addr internal://0.0.0.0:9092,external://0.0.0.0:19092
    - --advertise-kafka-addr internal://redpanda-0:9092,external://localhost:19092
    - --rpc-addr redpanda-0:33145
    - --advertise-rpc-addr redpanda-0:33145
    - --mode dev-container
    - --smp 1
  image: docker.redpanda.com/redpandadata/redpanda:v26.3.1
  ports:
    - 19092:19092
```

Regola generale: `--*-addr` è dove il processo ascolta (0.0.0.0 va bene), `--advertise-*` è come il client lo deve raggiungere. Se annunci `redpanda-0:9092` a un client fuori dalla rete Docker, la connessione iniziale riesce e il producer muore al primo redirect del metadata: nessun errore sul broker, solo timeout nel client.

```bash
rpk profile create quickstart --from-profile rpk-profile.yaml
rpk cluster info
```

Il profilo `rpk` contiene brokers, `sasl.mechanism: scram-sha-256`, Admin API e Schema Registry: senza profilo ogni comando richiede sei `-X` e prima o poi ne dimentichi uno.

## Sicurezza: utenti, SASL e ACL

Il bootstrap crea un superuser SCRAM, l'unico autorizzato a creare altri utenti.

```yaml
admin_api_require_auth: true
enable_sasl: true
superusers:
  - superuser
```

```bash
# nuovo utente applicativo e ACL di sola scrittura su un topic
rpk security user create orders-writer --password 'S3greto!' -p S3greto!
rpk security acl create --allow-principal User:orders-writer \
  --operation write --operation describe --topic orders
rpk security acl list --print-allow-principals
```

Con `enable_sasl: true` la connessione anonima viene rifiutata anche sulla porta Kafka, quindi un healthcheck con `rpk cluster info` senza credenziali riporta "not authorized" e non "down": sono due problemi diversi. Le ACL vivono nello stato del cluster e sopravvivono al riavvio dei broker, ma non vengono replicate in un altro cluster: dopo una migrazione vanno ricreate con `rpk security acl import` da un dump.

## Tiered Storage

Con `cloud_storage_enabled: true` e un bucket configurato, i segmenti chiusi vengono scaricati su object storage (S3, Azure ADLS, GCS) e restano leggibili dal broker. Il disco locale conserva la parte calda, definita da `retention.local.target.ms` e `retention.local.target.bytes`.

```yaml
cloud_storage_enabled: true
cloud_storage_region: local
cloud_storage_api_endpoint: rustfs
cloud_storage_api_endpoint_port: 9000
cloud_storage_bucket: redpanda
cloud_storage_segment_max_upload_interval_sec: 60
```

```bash
rpk cluster logdirs describe --topics chat-room
```

L'output mostra due righe per partizione e per broker, una su `/var/lib/redpanda/data` e una su `remote://<bucket>`. Il consumo da un consumer in tempo reale legge quasi sempre la parte locale; un consumer che rilegge dall'offset 0 fa fetch remoti, con latenza più alta. Se il `--advertise-*` non cambia, il client non vede la differenza: cambia solo il costo.

| Scenario | Consiglio |
| --- | --- |
| topic <= 24 ore di retention | Tiered Storage opzionale |
| topic con replay storico lungo | obbligatorio, con `rpk` per verificare i logdir |
| recupero di un cluster da bucket | `cloud_storage_enabled` + topic con `remote.read` |

## Data Transforms

Una Data Transform è un modulo WebAssembly scritto in Go o in Rust, compilato con `rpk transform build` in un `.wasm` e distribuito sul broker. Gira dentro Redpanda, senza un servizio sidelining da mantenere.

```go
// transform.go
package main

import (
	"github.com/redpanda-data/redpanda/src/go/transform-sdk"
	"fmt"
)

func main() {
	sdk.OnRecordWritten(func(r sdk.Record) {
		email, ok := r.Value.Get("email").(string)
		if ok && len(email) > 4 && email[len(email)-4:] == ".edu" {
			sdk.WriteToTopic("edu-filtered-domains", sdk.TopicRecord(r.Key, r.Value))
			fmt.Println("routed", email)
		}
	})
}
```

```bash
rpk transform build
rpk transform deploy --file=regex.wasm --name=regex \
  --input-topic=logins --output-topic=edu-filtered-domains \
  --var=PATTERN="[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu"
rpk transform list
```

Il transform legge solo il topic di ingresso dichiarato e scrive solo sul topic di uscita dichiarato: la coppia è parte del contratto di `deploy`, non un dettaglio. Cambiare topic di input significa ridistribuire.

## Errori comuni

- **Mettere `cloud_storage_*` in `--set`**: sono proprietà cluster-wide e vanno nel bootstrap o nell'Admin API.
- **Confondere utente broker e utente client**: `superusers` vale per Kafka e Admin API, non per il login di Console.
- **Annunciare `localhost` in un cluster multi-nodo**: ogni broker annuncia il proprio `localhost`, il client tenta connessioni che finiscono sulla macchina sbagliata.
- **Attivare il tiering su un topic senza `redpanda.remote.write=true`**: la prop di cluster è accesa ma il singolo topic non offloada nulla.
- **Riusare lo stesso `.wasm` per input diversi**: il nome del file non conta, contano i flag di deploy.

## In sintesi

La differenza tra un cluster Redpanda che si riavvia e uno che perde dati sta nella separazione di processo, cluster e topic, nella corretta coppia di indirizzi `--*-addr` / `--advertise-*` e nelle ACL applicate prima di pubblicare un nome. Il Tiered Storage sposta i segmenti vecchi sull'oggetto senza cambiare il contratto del client, e le Data Transforms eliminano un servizio esterno per filtrare o riscrivere record.

## Fonti

- [Redpanda - Manual deployment](https://docs.redpanda.com/streaming/current/deploy/redpanda/manual/production/)
- [Redpanda - Security](https://docs.redpanda.com/streaming/current/manage/security/)
- [Redpanda - Tiered Storage](https://docs.redpanda.com/streaming/current/manage/tiered-storage/)
- [Redpanda - Data Transforms](https://docs.redpanda.com/streaming/current/develop/data-transforms/how-transforms-work/)
