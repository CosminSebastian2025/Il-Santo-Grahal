In questo laboratorio porti in esercizio un APISIX 3.21 con etcd su Docker Compose, due backend che si riconoscono dal nome, e una catena di policy composta da autenticazione con API key, throttling su Redis e riscrittura dell'URI. Ogni passo termina con un comando che produce un risultato osservabile: senza un'evidenza registrata, il laboratorio non è concluso.

## Obiettivi

- Avviare etcd e APISIX con chiave Admin esplicita e socket Unix disattivato.
- Creare service e upstream con peso e health check, poi una route che li usa.
- Applicare `key-auth`, `limit-req` con Redis e `proxy-rewrite` in un'unica route.
- Misurare le risposte 401, 429, 502 e documentare l'esportazione della configurazione.

## Compose e avvio

```yaml
# compose.yaml
services:
  etcd:
    image: quay.io/coreos/etcd:v3.5.21
    command: >-
      etcd --name etcd1 --data-dir /etcd-data
      --listen-client-urls http://0.0.0.0:2379
      --advertise-client-urls http://etcd:2379
    volumes: [etcd-data:/etcd-data]
    networks: [gw]
  apisix:
    image: apache/apisix:3.21.0-debian
    volumes: [./config.yaml:/usr/local/apisix/conf/config.yaml:ro]
    ports: ["9080:9080", "9180:9180"]
    depends_on: [etcd]
    networks: [gw]
  redis:
    image: redis:7.4-alpine
    command: ["redis-server", "--requirepass", "lab-pass"]
    networks: [gw]
  echo-a:
    image: hashicorp/http-echo:1.0
    command: ["-listen=:9000", "-text=backend-a"]
    networks: [gw]
  echo-b:
    image: hashicorp/http-echo:1.0
    command: ["-listen=:9000", "-text=backend-b"]
    networks: [gw]
volumes:
  etcd-data: {}
networks:
  gw: {}
```

La configurazione montata deve contenere l'endpoint etcd e una chiave di amministrazione, altrimenti l'Admin API usa quella di default documentata e finisce in un lab accessibile da tutti.

```yaml
# config.yaml
deployment:
  role: traditional
  admin:
    admin_key:
      - name: admin
        key: b8f1e2d4-6a17-4c33-9a52-0f7d3c1e88a1
        role: admin
  etcd:
    host: ["http://etcd:2379"]
    prefix: /apisix
```

## Costruzione della catena

```bash
export GW=http://127.0.0.1:9080
export ADM=http://127.0.0.1:9180
export KEY=b8f1e2d4-6a17-4c33-9a52-0f7d3c1e88a1
H=(-H "X-API-KEY: $KEY" -H "Content-Type: application/json")

curl -s "${H[@]}" -X PUT "$ADM/apisix/admin/upstreams/ordini-up" -d '{
  "type": "roundrobin",
  "scheme": "http",
  "nodes": {"echo-a:9000": 1, "echo-b:9000": 1},
  "checks": {"active": {"http_path": "/", "healthy": {"interval": 5, "successes": 2},
                        "unhealthy": {"interval": 3, "http_failures": 3}}}
}'

curl -s "${H[@]}" -X PUT "$ADM/apisix/admin/consumers/partner-demo" -d '{
  "username": "partner-demo",
  "plugins": {"key-auth": {"key": "8c2d7f10-4b3a-4e9c-91d5-2a6e7b0c3f55"}}
}'

curl -s "${H[@]}" -X PUT "$ADM/apisix/admin/routes/ordini-v1" -d '{
  "uri": "/v1/ordini/*",
  "name": "ordini-v1",
  "methods": ["GET"],
  "plugins": {
    "key-auth": {"header": "X-Api-Key", "hide_credentials": true},
    "limit-req": {"rate": 10, "burst": 20, "key_type": "var", "key": "remote_addr",
                  "rejected_code": 429, "nodelay": true,
                  "policy": "redis", "redis_host": "redis", "redis_port": 6379,
                  "redis_password": "lab-pass", "redis_timeout": 500},
    "proxy-rewrite": {"regex_uri": ["^/v1/ordini/(.*)", "/ordini/$1"]}
  },
  "upstream_id": "ordini-up"
}'
```

La route usa `upstream_id`, quindi modificare i nodi nell'upstream non richiede di riscrivere la route. `hide_credentials: true` toglie `X-Api-Key` prima dell'inoltro: il backend di test riceve un insieme di header ridotto.

Vale la pena leggere la risposta dell'Admin API dopo ogni `PUT`: contiene l'oggetto come APISIX lo ha memorizzato, con l'`id` assegnato e i campi che il server ha normalizzato. Se un campo manca, il plugin ha scartato una chiave non prevista dal suo schema; se compare un errore `400` con il nome del tipo sbagliato, il valore JSON non corrisponde allo schema del plugin e nessuna parte dell'oggetto viene applicata. Controllare la risposta evita di inseguire un comportamento sbagliato con un oggetto che non esiste.

## Verifiche

| Caso | Comando | Atteso |
| --- | --- | --- |
| senza chiave | `curl -s -o /dev/null -w '%{http_code}' $GW/v1/ordini/1` | `401` |
| chiave errata | aggiungere `-H 'X-Api-Key: sbagliata'` | `401` |
| chiave valida | `-H 'X-Api-Key: 8c2d7f10-4b3a-4e9c-91d5-2a6e7b0c3f55'` | `backend-a` o `backend-b` |
| throttling | ciclo di 60 richieste con la chiave valida | una parte `429` |
| upstream vuoto | `docker compose stop echo-a echo-b` e ripetere | `503` |
| etcd guasto | `docker compose stop etcd` e ripetere | il traffico continua |

```bash
K=8c2d7f10-4b3a-4e9c-91d5-2a6e7b0c3f55
for i in $(seq 1 60); do
  printf '%s %s\n' "$(date +%s)" \
    "$(curl -s -o /dev/null -w '%{http_code}' -H "X-Api-Key: $K" $GW/v1/ordini/$i)"
done | awk '{n[$2]++} END {for (c in n) print c, n[c]}'
```

Con `rate: 10` e `burst: 20` in modalità `nodelay` ti aspetti circa 30 risposte accettate e il resto `429` in un ciclo breve, perché il token bucket si riempie a 10 token al secondo e parte pieno. Il conteggio reale dipende dalla durata del ciclo: registra i timestamp per giustificare le differenze invece di aggiustare i parametri fino a far tornare i numeri.

## Esercizi

1. Sostituisci `key: remote_addr` con una chiave per consumer usando un header dedicato e verifica che due consumer abbiano contatori separati.
2. Rimuovi `hide_credentials` e leggi l'header che arriva al backend con `kennethreitz/httpbin` come upstream.
3. Imposta `"policy": "local"` e ripeti il ciclo dopo aver spento Redis: il comportamento cambia? Con `allow_degradation: true` cambia ancora?
4. Aggiungi una seconda route `/v1/health` senza autenticazione che risponde con `echo` e verifica che il resto continui a chiedere la chiave.
5. Esporta gli oggetti con `curl` e ricostruisci etcd partendo solo dai file salvati: è il test che dimostra se la configurazione è davvero riproducibile.

<details>
<summary>Soluzione</summary>

1. Una variabile su un header stabile, unita a `key_type: var_combination`, separa i contatori senza concatenare stringhe a mano.
2. Con `hide_credentials` assente il backend riceve `X-Api-Key` in chiaro: è la prova che la credenziale può finire nei log applicativi.
3. Con `local` il contatore vive nel worker e un Redis spento non lo tocca; con `allow_degradation: true` anche la modalità `redis` smette di rifiutare quando la dipendenza non risponde.
4. Una route con priorità più alta e uri esatto `/v1/health`, senza plugin di autenticazione, risponde 200; le altre richieste restano sulla route protetta.
5. Gli oggetti esportati contengono gli id; un `PUT` sullo stesso id ricrea l'oggetto identico e il ciclo completa.
</details>

## Errori comuni

- **Admin API raggiungibile da tutti con la chiave di default**: chi legge la documentazione conosce quella chiave e può creare rotte.
- **Nessun `http_path` nei health check**: l'upstream verifica una pagina inesistente e marca i nodi come non sani.
- **`503` confuso con throttling**: `limit-req` risponde 503 per default; con `429` esplicito l'errore è leggibile.
- **Redis senza password sulla rete Compose**: qualunque servizio della rete può leggere i contatori.
- **Perdere etcd senza esportazione**: gli oggetti esistono solo nel volume; il laboratorio diventa irripetibile e non lo sai finché non cancelli il volume.

## In sintesi

Il laboratorio ha messo in fila etcd, data plane, autenticazione, contatore Redis e riscrittura URI. Le verifiche utili sono quelle negative: 401 senza chiave, 429 sotto carico, 503 con backend fermi. Il traffico continua a fluire anche con etcd spento, perché il data plane serve dalla memoria: è il motivo per cui la disponibilità della configurazione e la disponibilità del servizio vanno progettate separatamente. L'ultimo passo operativo è esportare e versionare gli oggetti.

## Fonti

- [Apache APISIX - Getting Started](https://apisix.apache.org/docs/apisix/getting-started/)
- [Apache APISIX - Admin API](https://apisix.apache.org/docs/apisix/admin-api/)
- [Apache APISIX - Plugin limit-req](https://apisix.apache.org/docs/apisix/plugins/limit-req/)
- [Apache APISIX - Repository GitHub](https://github.com/apache/apisix)
