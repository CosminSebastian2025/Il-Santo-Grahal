In questo laboratorio monti un cluster Redpanda a tre broker con Docker Compose, verifichi la replica con `rpk`, aggiungi un utente con ACL limitate e chiudi con un consumer group che legge un topic partizionato. Ogni passo ha un controllo di verità: non "sembra funzionare", ma un comando che restituisce un valore atteso.

## Obiettivi

- Avviare un cluster a tre broker con autenticazione SASL attiva e topic replicato.
- Verificare leader e repliche per ogni partizione e provocare volutamente un errore di replica.
- Creare un utente con ACL di sola lettura e osservare il rifiuto su un topic non autorizzato.
- Misurare il comportamento di un consumer group con due consumatori e quattro partizioni.

## Prerequisiti e setup

Servono Docker con Compose, almeno 4 GB di RAM liberi, `rpk` e GNU tar. Su Windows conviene WSL2: `rpk container` e `rpk redpanda` non funzionano nativamente.

```bash
mkdir redpanda-lab && cd redpanda-lab
curl -sSL https://docs.redpanda.com/redpanda-quickstart.tar.gz | tar xzf -
cd docker-compose && docker compose up -d
docker compose ps
```

Il quickstart ufficiale porta tre broker sulla rete `redpanda_network`, Console su 8080 e un pipeline Redpanda Connect. Se parti da un file tuo, tieni tre servizi `redpanda` con `--mode dev-container`, `--smp 1` e il bind mount `./bootstrap.yml:/etc/redpanda/.bootstrap.yaml`; senza `bootstrap.yml` non esiste `superusers` e la prima chiamata autenticata finisce in `SASL authentication failed`.

```yaml
# bootstrap.yml minimo per il laboratorio
enable_sasl: true
admin_api_require_auth: true
superusers:
  - superuser
auto_create_topics_enabled: false
```

```bash
docker exec -it redpanda-0 rpk cluster info -X user=superuser -X pass=secretpassword
docker exec -it redpanda-0 rpk cluster health
```

`rpk cluster health` deve riportare `Healthy: true`, `Controller ID: 0` (o un altro broker) e nessuna entry in `Nodes down`.

## Topic, replica e produzione di dati

Crea un topic con quattro partizioni e RF 3: con due consumer in un gruppo la distribuzione finale deve essere 2+2.

```bash
docker exec -it redpanda-0 rpk topic create orders \
  --partitions 4 --replicas 3 \
  --topic-config retention.ms=3600000 \
  -X user=superuser -X pass=secretpassword

docker exec -it redpanda-0 rpk topic describe orders -p \
  -X user=superuser -X pass=secretpassword
```

L'output per partizione mostra `LEADER` e `REPLICAS`; con tre broker i leader devono essere distribuiti. Se stanno tutti sul broker 0, il controller non ha ribilanciato e conviene riavviare il cluster in modo ordinato prima di proseguire.

Produci un record per ogni chiave, usando `%k` per impostare la chiave:

```bash
docker exec -i redpanda-0 rpk topic produce orders --format '%k:%v\n' \
  -X user=superuser -X pass=secretpassword <<'EOF'
ord-1:{"id":1,"totale":19.90}
ord-2:{"id":2,"totale":42.00}
ord-3:{"id":3,"totale":7.50}
ord-1:{"id":1,"totale":19.90,"stato":"pagato"}
EOF
```

La quarta riga riusa la chiave `ord-1` e finisce sulla stessa partizione della prima: è la proprietà che rende possibile un'aggregazione per ordine senza stato esterno.

## ACL e lettura con consumer group

Crea un utente `analista` con sola lettura su `orders` e verifica il rifiuto su un altro topic.

```bash
docker exec -it redpanda-0 rpk security user create analista -p 'Anal1sta!' \
  -X user=superuser -X pass=secretpassword

docker exec -it redpanda-0 rpk security acl create \
  --allow-principal User:analista \
  --operation read --operation describe --topic orders \
  -X user=superuser -X pass=secretpassword

docker exec -it redpanda-0 rpk topic consume orders --num 1 \
  -X user=analista -X pass='Anal1sta!'

docker exec -it redpanda-0 rpk topic consume logins --num 1 \
  -X user=analista -X pass='Anal1sta!'
# atteso: TOPIC_AUTHORIZATION_FAILED
```

Il secondo `consume` deve fallire: se restituisce record, c'è un ACL wildcard rimasto da un test precedente. Controlla con `rpk security acl list --print-allow-principals`.

Ora avvia due consumer nello stesso gruppo, in due terminali separati:

```bash
# terminale A
docker exec -it redpanda-0 rpk topic consume orders --group lab-orders --offset start \
  -X user=superuser -X pass=secretpassword

# terminale B, stesso profilo e stesso gruppo
docker exec -it redpanda-0 rpk topic consume orders --group lab-orders \
  -X user=superuser -X pass=secretpassword

# terminale C
docker exec -it redpanda-0 rpk group describe lab-orders -X user=superuser -X pass=secretpassword
```

`--offset start` serve solo alla prima esecuzione del gruppo: in seguito il flag viene ignorato e si riprende dall'offset registrato. Il secondo consumatore non passa `--offset`, quindi non azzera nulla. Con entrambi attivi le quattro partizioni si dividono 2+2; chiudendo il terminale B, il coordinator riassegna al nodo A tutte e quattro e `TOTAL-LAG` scende a 0 quando ha consumato il residuo.

## Rotta la replica, osserva il cluster

Ferma un broker, che è il test che quasi nessuno fa:

```bash
docker stop redpanda-2
docker exec -it redpanda-0 rpk topic describe orders -p -X user=superuser -X pass=secretpassword
docker exec -it redpanda-0 rpk cluster health -X user=superuser -X pass=secretpassword
```

Le partizioni che avevano `redpanda-2` come leader vengono rielette; `REPLICAS` continua a elencare il broker fermo, perché il fattore non cambia, e l'`ISR` si riduce. Con due nodi attivi su tre il cluster resta scrivibile. Riavvia poi e controlla che il broker torni in ISR: se resta fuori, il disco non risponde o il recupero è in ritardo.

## Esercizi

1. Crea un topic da 3 partizioni con RF 1 e poi un secondo topic con RF 3: confronta `REPLICAS` e `ISR` in `describe -p` e spiega perché non puoi "promuovere" il primo.
2. Metti `enable_sasl: false` in `bootstrap.yml` e riavvia il cluster: quale comando fallisce e quale smette di fallire?
3. Su un topic con `redpanda.remote.write=true`, produci abbastanza dati per chiudere un segmento e verifica con `rpk cluster logdirs describe` quali byte sono locali e quali remoti.
4. Con `rpk group describe lab-orders`, spiega perché chiudere il terminale B produce un ribilanciamento e quanti secondi passano prima che A riceva tutte le partizioni.

<details>
<summary>Soluzione</summary>

1. Il topic RF 1 mostra una sola replica e un `ISR` di uno; il topic RF 3 ne mostra tre. `--replicas` vale solo alla creazione e `alter-config` non cambia il fattore: per correggere si ricrea il topic con RF 3, si copiano i record con `rpk topic consume` in pipe su `rpk topic produce` e si spostano i consumer.

2. Con `enable_sasl: false`, `rpk cluster info` senza credenziali funziona, mentre i comandi con `-X user=superuser` possono fallire perché il broker rifiuta un meccanismo non negoziabile. La proprietà è cluster-wide e si applica in pochi secondi senza riavviare i broker.

3. `logdirs describe` mostra una riga `/var/lib/redpanda/data` con la parte calda e una `remote://<bucket>` con i byte scaricati; la parte locale resta limitata da `retention.local.target.bytes` e `retention.local.target.ms`, il totale remoto cresce.

4. Il consumer B esce senza `leave group`, il coordinatore lo scopre alla scadenza di `session.timeout.ms` (45 secondi nei client Kafka moderni): dopo il ribilanciamento A riceve le quattro partizioni, quindi il ritardo misurato è quello di `session.timeout.ms` più il join.

</details>

## Errori comuni

- **Aprire solo la porta 9092** e dimenticare `--advertise-kafka-addr`: il container risponde, il client no.
- **Usare `superuser` in tutti i comandi** per poi scoprire in produzione che le ACL non sono mai state provate.
- **Fermare due broker su tre** e aspettarsi scritture: con un solo nodo su tre non c'è maggioranza e il controller non elegge leader.
- **Ricreare il cluster con `docker compose down -v`** per "pulire": il volume è l'unica copia dei dati di test.

## In sintesi

Il laboratorio verifica cinque cose che un `docker compose up` non dimostra: il cluster è sano secondo il controller, ogni partizione ha un leader su broker diversi, le ACL negano davvero, un gruppo distribuisce le partizioni, e un broker spento non spegne il cluster. Rifai la stessa sequenza dopo aver spento `redpanda-2`: il tempo di elezione che misuri è la metrica che conta nel tuo deploy reale.

## Fonti

- [Redpanda - Quickstart](https://docs.redpanda.com/current/get-started/quick-start/)
- [Redpanda - Security](https://docs.redpanda.com/streaming/current/manage/security/)
- [Redpanda - Produce data](https://docs.redpanda.com/streaming/current/develop/produce-data/)
- [Redpanda - rpk reference](https://docs.redpanda.com/streaming/current/reference/rpk/)
