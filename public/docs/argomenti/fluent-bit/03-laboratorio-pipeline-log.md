In questo laboratorio porti una pipeline Fluent Bit dal prototipo alla verifica numerica. Crei un generatore di log applicativi con stack trace su più righe, configuri tail con parser multilinea e JSON, aggiungi buffering su filesystem con limiti espliciti, simuli un backend lento e misuri scarto, retry e memoria. Tutto gira in Docker, senza cluster: la configurazione è la stessa che porterai nel DaemonSet.

## Obiettivi

- Scrivere una configurazione YAML valida e verificarla con `--dry-run`.
- Parsare un log con campi JSON e stack trace Java in un unico record.
- Attivare il buffering su filesystem e osservare il comportamento in caso di backend lento.
- Leggere le metriche Prometheus del server HTTP e interpretare pause e scarti.
- Produrre un test di regressione ripetibile sulla pipeline.

## Preparazione dell'ambiente

Serve Docker con un volume condiviso e la directory `lab/`. Il generatore è uno script `sh` che scrive ogni secondo due righe JSON e un errore multilinea, così il parser viene messo sotto stress con entrambe le forme.

```bash
mkdir -p lab/logs lab/storage
cat > lab/gen.sh <<'EOF'
#!/bin/sh
i=0
while true; do
  i=$((i+1))
  printf '{"ts":"2026-11-25T10:00:%02dZ","level":"info","msg":"tick %d"}\n' $((i%60)) "$i" >> /logs/app.log
  printf '{"ts":"2026-11-25T10:00:%02dZ","level":"warn","msg":"slow db","ms":%d}\n' $((i%60)) $((i*3)) >> /logs/app.log
  if [ $((i%10)) -eq 0 ]; then
    printf '2026-11-25T10:00:00Z java.lang.IllegalStateException: boom\n' >> /logs/broken.log
    printf '    at com.example.Svc.run(Svc.java:41)\n' >> /logs/broken.log
    printf '    at com.example.Main.main(Main.java:9)\n' >> /logs/broken.log
  fi
  sleep 1
done
EOF
chmod +x lab/gen.sh
docker run -d --name gen -v "$PWD/lab/logs:/logs" -v "$PWD/lab/gen.sh:/gen.sh" \
  alpine:3.20 sh /gen.sh
```

Il file `app.log` è JSON Lines, quindi va con `parser: json`. Il file `broken.log` ha un primo rigo con timestamp e due righe di stack: va con `multiline.parser: java`, la stessa regola dei log applicativi JVM, perché riconosce come continuazione le righe che iniziano con spazi.

## Configurazione con due input

Due input separati permettono parser diversi e tag diversi. Lo storage su filesystem è globale come percorso, ma si attiva per input.

```yaml
service:
  flush: 1
  log_level: info
  http_server: on
  http_listen: 0.0.0.0
  http_port: 2020
  storage.path: /storage/
  storage.max_chunks_up: 32
  storage.metrics: on

parsers:
  - name: app_json
    format: json
    time_key: ts
    time_format: '%Y-%m-%dT%H:%M:%SZ'

pipeline:
  inputs:
    - name: tail
      path: /logs/app.log
      tag: lab.json
      parser: app_json
      db: /storage/tail-json.db
      storage.type: filesystem
    - name: tail
      path: /logs/broken.log
      tag: lab.java
      multiline.parser: java
      db: /storage/tail-java.db
      read_from_head: true
      storage.type: filesystem

  filters:
    - name: grep
      match: lab.json
      exclude: level warn

  outputs:
    - name: file
      match: '*'
      file: /storage/out.txt
      format: out_file
      storage.total_limit_size: 50M
```

```bash
cat > lab/run.sh <<'EOF'
#!/bin/sh
docker rm -f fb >/dev/null 2>&1 || true
docker run -d --name fb -p 2020:2020 \
  -v "$PWD/lab/fluent-bit.yaml:/fluent-bit/etc/fluent-bit.yaml:ro" \
  -v "$PWD/lab/logs:/logs" -v "$PWD/lab/storage:/storage" \
  fluent/fluent-bit:5.2 -c /fluent-bit/etc/fluent-bit.yaml
EOF
sh lab/run.sh
docker logs fb --tail 20
```

Il filtro `grep` con `exclude: level warn` scarta la seconda riga di ogni tick: serve per verificare che conta scarto deliberato e non errore. Il `format: out_file` fa stampare i record già strutturati, modo migliore per vedere se il parsing ha prodotto i campi attesi.

## Verifica del parsing e delle metriche

I controlli sono tre e vanno fatti in ordine: validità della configurazione, forma del record, numeri del contatore.

```bash
docker exec fb fluent-bit -c /etc/fluent-bit/fluent-bit.yaml --dry-run
ls -la lab/storage/                # attesi i .db e i chunk
tail -n 3 lab/storage/out.txt      # atteso: campi level/msg, non una stringa
curl -s localhost:2020/api/v1/metrics | grep -E 'records_in|records_out|errors' | head
```

Il record giusto esce così: chiavi `ts`, `level`, `msg` per il flusso JSON, una sola riga con `log` e i tre passaggi dello stack per il flusso Java. Se compare `{"log":"{\"ts\":..."}` il parser non è stato applicato.

| Sintomo | Causa probabile | Correzione |
| --- | --- | --- |
| stack spezzato in tre record | `multiline.parser` assente | aggiungerlo al secondo input |
| JSON interpretato come stringa | `parser: json` su input o formatter sbagliato | spostare il parser sull'input |
| out.txt cresce ma niente in output | filtro `grep` che esclude tutto | verificare il nome del campo, è case sensitive |
| chunk non scritti su disco | `storage.type: filesystem` assente | abilitarlo per input, non solo il path |
| `paused (storage buf overlimit)` | troppi chunk attivi | alzare `storage.max_chunks_up` o ridurre la coda |

## Backend lento, scarto e recupero

Per simulare un output che non risponde basta puntare a un hostname inesistente con storage su filesystem attivo. Fluent Bit continua a ingerire, i chunk vanno `down` e su disco, e i retry crescono. La memoria non esplode perché il limitatore è `storage.max_chunks_up`.

```bash
docker rm -f fb
sed -i 's#      file: /storage/out.txt#      host: blackhole.invalid#' lab/fluent-bit.yaml
sed -i 's#    - name: file#    - name: opensearch#' lab/fluent-bit.yaml
sh lab/run.sh
sleep 90
docker logs fb | grep -c 'retry'
curl -s localhost:2020/api/v1/metrics | grep -E 'retried|dropped|errors' | head
docker stats --no-stream fb      # RSS stabile, non crescente
```

Il `docker stats` ripetuto ogni 30 secondi è la prova che il limite funziona: il RSS oscilla attorno a un valore, mentre senza limiti crescerebbe linearmente. Torna poi alla configurazione con output su file e verifica che i chunk rimasti su disco vengano consegnati al riavvio, senza perdita e senza duplicati: è il comportamento del backlog.

## Esercizi

1. Replicare `app.log` anche su un secondo output con `match` diverso e verificare che il filtro `grep` agisca solo sul primo flusso.
2. Aggiungere `mem_buf_limit: 10MB` all'input appena sufficiente e stabilire con le metriche qual è la dimensione minima che non fa mai pausolare il plugin.
3. Usare `storage.pause_on_chunks_overlimit: on` e misurare quanto tempo passare in pausa riduca il contatore di record consegnati.
4. Scrivere un test automatico che verifichi in dieci secondi la presenza di uno stack trace su una riga sola in `out.txt`.
5. Applicare la stessa configurazione in Kubernetes come ConfigMap in un DaemonSet, citando cosa cambia per i path.

<details>
<summary>Soluzione</summary>

1. Il filtro `grep` ha `match: lab.json`; l'output con `match: lab.raw` riceve solo copia del flusso. Serve un secondo input con lo stesso path e tag diverso, perché un record va nel filtro solo con un match corrispondente.

2. Si abbassa `mem_buf_limit` in un loop: alla prima occorrenza di `paused (mem buf overlimit)` nei log si risale al valore precedente e si aggiunge un margine del 30% sopra il picco osservato nella metrica.

3. In pausa `records_in` smette di crescere per l'input coinvolto; la differenza tra il tempo attivo e quello atteso misura la perdita indotta dalla pausa. Con `tcp` o `forward` la perdita è definitiva.

4. Lo script parses `out.txt` con `grep -c 'IllegalStateException'` e `grep -c 'at com.example'`: un solo record corretto produce due occorrenze nella stessa riga. In CI vale `test $(grep -c 'IllegalStateException.*at com' out.txt) -ge 1`.

5. Nel DaemonSet il tail legge `/var/log/containers`, con `db` in `hostPath` dedicato e filtro `kubernetes`; lo storage su un volume `emptyDir` o `hostPath`, mai su disco del container, altrimenti un riavvio cancella i chunk.

</details>

## Errori comuni

- **Lasciare il generatore acceso durante i test di scarto**: i numeri non tornano perché il flusso non si ferma mai.
- **Riavviare il container senza riusare la directory di storage**: i chunk in coda spariscono e sembra una perdita dell'agente.
- **Paragonare `records_in` e `records_out` senza considerare il filtro**: la differenza include gli scarti voluti dal `grep`.
- **Fare il dry-run senza montare il volume delle directory di storage**: la validazione passa ma l'avvio reale fallisce nell'apertura.
- **Usare `latest` come tag dell'immagine**: la configurazione testata e quella in produzione divergono alla prima pull.

## In sintesi

Hai verificato con numeri le tre proprietà che rendono Fluent Bit affidabile: parser coerente con la forma del file, storage su filesystem con limiti espliciti, metriche che distinguono scarto voluto, retry e pausa. Il passaggio a Kubernetes cambia solo i path e aggiunge il filtro `kubernetes`: la pipeline è la stessa.

## Fonti

- [Fluent Bit - Tail input](https://docs.fluentbit.io/manual/data-pipeline/inputs/tail)
- [Fluent Bit - Buffering and storage](https://docs.fluentbit.io/manual/administration/buffering-and-storage)
- [Fluent Bit - Monitoring](https://docs.fluentbit.io/manual/administration/monitoring)
- [Fluent Bit - Downloads](https://docs.fluentbit.io/manual/installation/downloads)
