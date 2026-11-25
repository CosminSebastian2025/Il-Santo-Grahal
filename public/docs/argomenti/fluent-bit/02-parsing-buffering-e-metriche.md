Con il prototipo in YAML della lezione precedente i log arrivano a destinazione finché il backend risponde. In produzione il backend rallenta, il disco si riempie, l'applicazione scrive stack trace su dieci righe e il container scrive JSON generati da Docker. Questa lezione riguarda le tre aree che decidono se un agente di log sopravvive a quei casi: parsing multilinea, buffering e pressione, throughput e monitoraggio.

## Obiettivi

- Comporre parser JSON e regex e gestire messaggi multilinea senza perdere stack trace.
- Scegliere fra buffer in memoria e su filesystem, con limiti che evitano l'OOM kill.
- Leggere l'esito di `mem_buf_limit` e `storage.max_chunks_up` nei log e nelle metriche.
- Girare Fluent Bit come DaemonSet in Kubernetes con tail e filtro `kubernetes`.
- Misurare throughput e allocazioni dell'agente prima di cambiare configurazione.

## Parser e multilinea

Un parser ha un nome, un `format` e, se serve, una regex con gruppi nominati. Nel formato YAML i parser si dichiarano nella sezione `parsers` e si possono anche caricare da file separati con `parsers_file` per condividerli tra ambienti. Il formato `json` gestisce una riga con un oggetto completo: JSON Lines, non JSON indentato.

```yaml
parsers:
  - name: app_json
    format: json
    time_key: ts
    time_format: '%Y-%m-%dT%H:%M:%S.%LZ'
  - name: nginx
    format: regex
    regex: '^(?<remote>[^ ]*) - - \[(?<time>[^\]]*)\] "(?<method>\S+) (?<path>[^"]*) (?<proto>[^"]*)" (?<status>\d{3}) (?<bytes>\d+)'
    time_key: time
    time_format: '%d/%b/%Y:%H:%M:%S %z'
    types: status:integer bytes:integer
```

Con un formato indentato o con uno stack trace la riga singola non è un messaggio: serve un parser multilinea, che accumula righe finché non ne incontra una che apre un nuovo record. Nel tail si abilita con `multiline.parser` e si controlla con `multiline.key_content` e `flush_timeout`. Il criterio operativo è semplice: prima si decide dai primi caratteri di ogni riga se appartiene al record precedente, poi si assembla, e solo alla fine si struttura.

```yaml
pipeline:
  inputs:
    - name: tail
      path: /var/log/app/*.log
      tag: app
      multiline.parser: java
      multiline.key_content: log
      db: /var/log/flb-tail.db
  filters:
    - name: parser
      match: app
      key_name: log
      parser: app_json
```

| Forma del file | Parser corretto |
| --- | --- |
| JSON Lines, un oggetto per riga | `parser: json` sull'input |
| JSON indentato su più righe | `multiline.parser: json` più filtro `parser` |
| stack trace Java o Go | `multiline.parser: java` o `go` |
| log di container con output CRI | `multiline.parser: cri` o `parser: cri` |
| `syslog` | `parser: syslog-rfc5423` |

L'errore frequente è impostare `parser: json` su un file indentato: ogni riga viene interpretata da sola, le righe come `{` e `"id": 1,` falliscono e restano testo grezzo. Prima si concatena con il parser multilinea, poi si struttura il messaggio assemblato con il filtro `parser`.

## Buffering, pressione e scarto

Il motore raggruppa i record in *chunk* di circa 2 MB e di default li tiene in memoria. Quando il backend rallenta e i chunk si accumulano, la memoria dell'agente cresce: senza limiti il container viene ucciso dall'OOM killer e i log si perdono tutti insieme.

| Meccanismo | Chiave | Effetto | Default |
| --- | --- | --- | --- |
| limite memoria | `mem_buf_limit` | sospende l'input oltre il limite | nessuno |
| storage su disco | `storage.type: filesystem` | chunk mappati su filesystem | `memory` |
| chunk attivi | `storage.max_chunks_up` | chunk contemporaneamente in RAM | `128` |
| queue per output | `storage.total_limit_size` | scarta i chunk più vecchi oltre soglia | nessuna |
| sincronia disco | `storage.sync` | `normal` o `full` | `normal` |

Con `mem_buf_limit` al raggiungimento del limite il plugin viene messo in pausa e i log fermati: per `tail` gli offset restano nel database SQLite e l'ingest riprende, ma con `tcp` e `forward` la pausa significa perdita. Con `storage.type: filesystem` il comportamento cambia: oltre il limite i chunk nuovi vanno su disco e restano `down`, quindi l'input continua e la memoria resta controllata.

```yaml
service:
  storage.path: /var/log/flb-storage/
  storage.sync: normal
  storage.max_chunks_up: 64
pipeline:
  inputs:
    - name: tail
      path: /var/log/app/*.log
      tag: app
      storage.type: filesystem
      mem_buf_limit: 100MB
  outputs:
    - name: opensearch
      match: app
      host: opensearch.internal
      storage.total_limit_size: 5GB
```

Nei log la differenza si riconosce subito: `paused (mem buf overlimit)` indica la pausa per memoria, `paused (storage buf overlimit)` quella per chunk attivi, chiamata solo se `storage.pause_on_chunks_overlimit` è attivo. `storage.total_limit_size` è per output: quando la sua coda occupa 5 GB, i chunk più vecchi per quella destinazione vengono eliminati, quindi un backend lento non consuma tutto lo spazio del nodo.

## Kubernetes, throughput e metriche

In un cluster il pattern standard è un DaemonSet con il tail che legge `/var/run/log` o `/var/log/pods`, il filtro `kubernetes` che arricchisce i record con namespace, pod e label, e un output che consegna all'infrastruttura di aggregazione. L'agente deve avere un namespace per il database dell'offset e una quarantena per i file rotati.

```bash
kubectl apply -f https://raw.githubusercontent.com/fluent/fluent-bit/master/packaging/fluent-bit.yaml
kubectl -n logging logs ds/fluent-bit --tail=20
```

Il throughput si misura con il contatore `fluentbit_input_records_total` e `fluentbit_output_retried_records_total` esposti dal server HTTP, più i contatori per output. Un picco di retry indica un backend lento, non un problema dell'agente; un rapporto basso tra record ricevuti e consegnati indica scarto o filtro troppo aggressivo.

```bash
curl -s localhost:2020/api/v1/metrics/prometheus | grep -E 'input_records_total|output_errors_total|output_retried'
```

Se serve più capacità, le strade sono il multithreading degli input (`threaded: on`) e dei filtri, e la rimozione dei filtri che ricalcolano regex costose su ogni record. Aumentare i buffer non aggiunge capacità: significa solo ritardare il problema fino al primo disastro di rete.

## Errori comuni

- **Mettere la stessa `path` di storage su più istanze senza isolamento**: chunk di processi diversi si sovrappongono e il backlog contiene dati ambigui.
- **Aumentare `mem_buf_limit` per far fronte ai picchi**: si sposta il limite fino al primo OOM kill, che perde tutto ciò che era in memoria.
- **Usare `storage.sync: full` per default**: ogni write fa sync su disco e il throughput crolla su volumi senza supporto `MAP_SYNC`.
- **Ignorare `output_retried_records_total`**: i retry crescono per giorni finché la coda non trabocca.
- **Leggere `/var/log/containers` senza filtro `kubernetes`**: i file CRI lasciano campi grezzi e nessuna informazione di namespace o pod.

## In sintesi

Le tre difese sono complementari: il parser multilinea evita record frammentati, il buffering su filesystem con limiti espliciti evita la morte per OOM e lo scarto indiscriminato, le metriche del server HTTP dicono dove si sta degradando la pipeline. In Kubernetes il DaemonSet con tail e filtro `kubernetes` è il default, e l'intervento corretto su un collo di bottiglia è quasi sempre a valle del buffer.

## Fonti

- [Fluent Bit - Parsers](https://docs.fluentbit.io/manual/data-pipeline/parsers)
- [Fluent Bit - Multiline parsing](https://docs.fluentbit.io/manual/data-pipeline/parsers/multiline-parsing)
- [Fluent Bit - Buffering and storage](https://docs.fluentbit.io/manual/administration/buffering-and-storage)
- [Fluent Bit - Monitoring](https://docs.fluentbit.io/manual/administration/monitoring)
