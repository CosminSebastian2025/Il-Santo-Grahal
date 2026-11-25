Fluent Bit è un agente di raccolta log scritto in C, con footprint di memoria nell'ordine di qualche decina di megabyte e un modello a pipeline che ricorda quello di Fluentd ma senza runtime pesante. Legge da file, socket o API, applica parser e filtri, bufferizza e consegna a una o più destinazioni. In Fluent Bit 5.x la configurazione raccomandata è YAML; il formato classico a sezioni resta supportato ma è in fase di superamento.

## Obiettivi

- Riconoscere i quattro stadi della pipeline: input, parser, filtro, output, con buffer e routing in mezzo.
- Scrivere un file `fluent-bit.yaml` con sezioni `service` e `pipeline`.
- Leggere una configurazione classica e tradurla in YAML.
- Capire tag e matching, cioè come un record raggiunge uno o più output.
- Avviare Fluent Bit in container e interrogare le metriche interne.

## La pipeline in quattro stadi

Un record nasce da un input plugin, viene eventualmente interpretato da un parser, passa per zero o più filtri, entra nel buffer e viene instradato verso gli output il cui `match` corrisponde al tag. Il parser non è un filtro: è la fase che trasforma una riga di testo in un messaggio strutturato, e solo dopo la strutturazione i filtri possono agire sui campi.

| Stadio | Ruolo | Plugin tipici |
| --- | --- | --- |
| input | produce record con un tag | `tail`, `systemd`, `tcp`, `forward`, `http` |
| parser | dà struttura al campo `log` | `json`, `regex`, `syslog-rfc5423` |
| filtri | modifica, arricchisce o scarta | `modify`, `grep`, `parser`, `kubernetes` |
| buffer | coda in memoria, opzionalmente su disco | storage layer |
| output | consegna | `stdout`, `forward`, `opensearch`, `loki`, `s3` |

Ogni record è un messaggio MessagePack con timestamp, `metadata` e un insieme di chiavi. Se un input non ha parser, la riga finisce sotto la chiave `log` come stringa. Il filtro `modify` può rinominare o eliminare campi, ma non può creare campi che il parser non ha prodotto: se il campo manca, il problema è a monte nel parser.

## Configurazione YAML

Dalla versione 3.2 tutto ciò che si configura in modalità classica si può esprimere in YAML, con in più i *processors* agganciati direttamente all'input. Le sezioni di primo livello sono `service`, `pipeline`, `parsers`, `multiline_parsers`, `plugins`, `upstream_servers`, `env` e `includes`.

```yaml
service:
  flush: 1
  log_level: info
  http_server: on
  http_listen: 127.0.0.1
  http_port: 2020
  storage.path: /var/log/flb-storage/
  hot_reload: on

pipeline:
  inputs:
    - name: tail
      path: /var/log/app/*.log
      tag: app
      parser: json
      db: /var/log/flb-tail.db
      read_from_head: true

  filters:
    - name: modify
      match: app
      rename: level Level
    - name: grep
      match: app
      exclude: Level error_debug

  outputs:
    - name: stdout
      match: app
    - name: opensearch
      match: app
      host: opensearch.internal
      port: 9200
      index: app-${HOSTNAME}
```

`flush` è l'intervallo in secondi in cui il motore consegna i record accumulati; `db` nel tail è il database SQLite degli offset, indispensabile per non duplicare i log dopo un riavvio. `hot_reload: on` fa rileggere la configurazione a un `SIGHUP` senza perdere il buffering. La variabile `${HOSTNAME}` viene espansa nel valore, utile per rendere l'indice unico per host.

```bash
fluent-bit -c /etc/fluent-bit/fluent-bit.yaml --dry-run
fluent-bit -c /etc/fluent-bit/fluent-bit.yaml
curl -s localhost:2020/api/v1/metrics | head -30
```

`--dry-run` valida la configurazione senza avviare il motore: un errore di indentazione o un plugin inesistente emergono prima del deploy, non dal log di sistema del nodo.

## Dal formato classico a YAML

Molte installazioni esistenti usano sezioni `[SERVICE]`, `[INPUT]`, `[FILTER]`, `[OUTPUT]` con le chiavi in CamelCase. La corrispondenza è meccanica: le chiavi diventano minuscole con underscore, tranne quelle con punto (`storage.path`, `storage.max_chunks_up`) che restano composte.

| Classico | YAML |
| --- | --- |
| `[SERVICE] Flush 1` | `service: flush: 1` |
| `[SERVICE] Storage.path /var/lib/flb` | `service: storage.path: /var/lib/flb` |
| `[INPUT] Name tail` | `pipeline: inputs: - name: tail` |
| `[INPUT] Path /var/log/*.log` | `path: /var/log/*.log` |
| `[OUTPUT] Name es, Match *` | `outputs: - name: es, match: '*'` |

```ini
[SERVICE]
    Flush        1
    Log_Level    info

[INPUT]
    Name         tail
    Path         /var/log/nginx/*.log
    Parser       nginx
    Tag          web

[OUTPUT]
    Name         forward
    Match        web
    Host         collector.internal
    Port         24224
```

La traduzione non è solo estetica: solo in YAML si possono usare i processors, e alcune funzionalità nuove non hanno equivalente in classico. Un file classico in produzione va quindi convertito appena possibile, mantenendo per un periodo le due versioni in parità per verificare che i record prodotti coincidano.

## Routing, tag e matching

Il tag identifica il flusso: gli output ricevono un record se il loro `match` lo intercetta, con `*` come jolly e coppie di valori separati da puntini. Un record può andare a più output contemporaneamente, e ogni destinazione ha una propria coda logica: una lenta non blocca l'altra finché il buffer ha spazio.

```yaml
pipeline:
  inputs:
    - name: systemd
      path: /run/systemd/journal/socket
      tag: host.systemd
  outputs:
    - name: loki
      match: host.systemd
      host: loki.internal
      port: 3100
      labels: job=systemd
    - name: stdout
      match: host.*
```

Il match `host.*` intercetta anche `host.systemd`, quindi il record va a Loki e a stdout. Se due output dichiarano lo stesso match senza distinzioni, ogni record viene consegnato due volte, e a valle sembra un'applicazione che scrive il doppio. Il tag non è solo un'etichetta: è la chiave di routing e va progettato come un namespace (`ambiente.sorgente.servizio`).

## Errori comuni

- **Aggiungere un parser senza fissare il tag**: con `*` come tag di default tutti i flussi finiscono nello stesso namespace e il matching diventa indistinguibile.
- **Dimenticare `db` nel tail**: dopo un riavvio il plugin riparte dalla coda del file o ricopia tutto, a seconda di `read_from_head`.
- **Mettere `storage.path` senza creare la cartella**: il buffering su filesystem non si attiva e il log mostra solo un errore di apertura.
- **Usare `read_from_head: true` su file enormi al primo avvio**: il primo riempimento della pipeline può saturare il buffer e generare backpressure.
- **Confondere parser e filtro `parser`**: il primo interpreta al momento dell'ingest, il secondo agisce su un campo già strutturato.

## In sintesi

Fluent Bit è una pipeline a stadi con un agente leggero: input con tag, parser che strutturano, filtri che modificano, buffer che assorbe i picchi e output scelti dal match. La configurazione moderna è YAML e convive con il formato classico solo per compatibilità. Capire dove nasce un record e quale tag porta è la base per leggere qualsiasi problema a valle.

## Fonti

- [Fluent Bit - YAML configuration files](https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/yaml)
- [Fluent Bit - Pipeline](https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/yaml/pipeline-section)
- [Fluent Bit - Classic mode configuration file](https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/classic-mode)
- [Fluent Bit - Monitoring](https://docs.fluentbit.io/manual/administration/monitoring)
