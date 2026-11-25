Un gateway che non applica policy è solo un proxy più complicato. In APISIX le policy sono plugin in Lua che girano in fasi precise del ciclo di vita della richiesta: è la fase a determinare ciò che il plugin può vedere e modificare, e capirlo spiega perché alcune combinazioni funzionano e altre producono header diversi da quelli attesi. Questa lezione copre l'ordine di esecuzione, il rate limiting con contatori locali o Redis, l'autenticazione e la trasformazione dell'URI.

## Obiettivi

- Collocare un plugin nella fase corretta (`rewrite`, `access`, `header_filter`, `body_filter`, `log`).
- Configurare `limit-req` e `limit-count` conoscendo l'effetto di `policy: redis`.
- Identificare i client con `key-auth` o `jwt-auth` e usare `consumer-restriction`.
- Riscrivere l'URI senza rompere i parametri né la rimozione delle credenziali.
- Distinguere un plugin compilato in C da uno scritto in Lua e scegliere di conseguenza.

## Fasi e ordine di esecuzione

Una richiesta attraversa fasi successive; ogni plugin dichiara in quali fasi vuole essere invocato. La tabella seguente riassume il contratto più utile da ricordare.

| Fase | Cosa si può fare | Plugin tipici |
| --- | --- | --- |
| `rewrite` | modificare URI, header, rispondere subito | `proxy-rewrite`, `redirect`, `echo` |
| `access` | autenticare, contare, autorizzare | `key-auth`, `jwt-auth`, `limit-req` |
| `header_filter` | aggiungere o togliere header in risposta | `cors`, `response-rewrite` |
| `body_filter` | riscrivere il corpo in streaming | `response-rewrite` con `filters` |
| `log` | spedire log a sorgenti esterne | `http-logger`, `kafka-logger` |

Dentro una fase i plugin vengono eseguiti in un ordine definito dall'id del plugin, non dall'ordine in cui compaiono nel JSON. Se due plugin devono cooperare, la coordinazione passa dalla fase: per esempio `proxy-rewrite` cambia l'URI in `rewrite`, e i plugin `access` che leggono l'URI vedono quello nuovo. Dalla 3.21 con `normalize_uri_like_servlet` attivo l'URI inoltrato rispetta gli argomenti rimasti dopo `rewrite` e `access`, preservando la rimozione delle credenziali fatta da `key-auth` e `jwt-auth`.

## Rate limiting: due algoritmi, due semantiche

`limit-count` conta le richieste in una finestra: è la scelta quando il limite è una quota (1000 richieste al giorno per cliente). `limit-req` usa un leaky bucket e ammette una `rate` più un `burst`: è la scelta quando serve proteggere il backend da picchi, con le richieste in eccesso ritardate o rifiutate.

```json
{
  "uri": "/ordini/*",
  "plugins": {
    "limit-req": {
      "rate": 20,
      "burst": 40,
      "key_type": "var",
      "key": "remote_addr",
      "rejected_code": 429,
      "rejected_msg": "troppe richieste",
      "policy": "redis",
      "redis_host": "redis.internal",
      "redis_port": 6379,
      "redis_password": "lab-pass",
      "redis_timeout": 1000
    },
    "key-auth": {
      "header": "X-Api-Key",
      "hide_credentials": true
    }
  },
  "upstream": {"type": "roundrobin", "nodes": {"ordini.internal:8080": 1}}
}
```

`policy` vale `local` per default: ogni istanza conta per conto suo e il limite complessivo è circa `rate × numero di istanze`. Con `redis` il contatore è condiviso ma ogni richiesta costa un round trip verso Redis, con `redis_timeout` a 1000 ms di default: un Redis lento diventa latenza del gateway, e `allow_degradation` decide se continuare senza limitare quando la dipendenza non risponde.

| Parametro | Default | Effetto pratico |
| --- | --- | --- |
| `rejected_code` | `503` | cambiarlo in `429` rende il rifiuto distinguibile da un errore di upstream |
| `key` | obbligatorio | variabile NGINX come `remote_addr`, oppure combinazioni con `key_type: var_combination` |
| `nodelay` (`limit-req`) | `false` | `true` serve le richieste nel burst senza ritardo |
| `allow_degradation` | `false` | `true` lascia passare il traffico se Redis è indisponibile |

Per contare per consumer, la chiave più robusta è un header che il plugin di autenticazione ha già validato e riscritto (per esempio `$http_x_consumer_id` impostato da un plugin o dal backend); la variabile `$consumer_name` esiste ma è popolata solo per i plugin che la impostano, e una chiave vuota fa ricadere il contatore su una voce comune per tutti.

## Trasformare la richiesta senza perdere informazione

`proxy-rewrite` è il coltellino svizzero dell'inoltro: cambia URI, host, schema, metodo e set di header. Le tre modalità che servono davvero sono `uri` (sostituzione fissa), `regex_uri` (gruppi di cattura) e `host` (vhost del backend).

```json
"proxy-rewrite": {
  "regex_uri": ["^/v2/ordini/(\\d+)/righe$", "/ordini/$1/lines"],
  "host": "ordini.internal",
  "headers": {"set": {"X-Gateway": "apisix"}, "remove": ["X-Debug-Token"]}
}
```

`remove` è la parte da non dimenticare: un header di debug lasciato passare arriva al backend e nei log. Per trasformazioni sul corpo la risposta non deve essere gonfiata a memoria: `response-rewrite` con `filters` lavora a blocchi e `buffer` forzato va evitato su payload grandi. Per logica che non sta in un JSON serve un plugin Lua; la documentazione di sviluppo distingue il plugin scritto a mano (Lua puro, eseguito dal worker) da un plugin con parti in C o Go compilate, che può essere molto più veloce ma richiede una build coerente con la versione del runtime.

## Errori comuni

- **Assumere che l'ordine nel JSON sia l'ordine di esecuzione**: la sequenza la decide la fase e l'id del plugin.
- **`limit-req` con default 503**: il client non distingue throttling e backend guasto; imposta `429`.
- **Contare su `local` in un cluster**: la quota reale è moltiplicata per le istanze.
- **Redis senza autenticazione raggiungibile dal gateway**: le chiavi di conteggio e i nomi dei consumer finiscono in chiaro sulla rete.
- **`proxy-rewrite` che rimuove il prefisso e rompe i link relativi**: al backend arriva un URI senza contesto e la sua risposta può puntare altrove.

## In sintesi

I plugin APISIX sono funzioni agganciate a fasi del ciclo di vita: la fase determina cosa vedono e cosa possono cambiare, l'id ne determina l'ordine. Per limitare il traffico conviene scegliere tra quota (`limit-count`) e throttling (`limit-req`) e decidere consapevolmente tra contatori locali e Redis condiviso, con `allow_degradation` come argine. `proxy-rewrite` cambia la richiesta in `rewrite`, quindi ogni plugin successivo ragiona sull'URI riscritto. Il laboratorio successivo mette insieme tutto questo su una catena reale.

## Fonti

- [Apache APISIX - Plugin limit-req](https://apisix.apache.org/docs/apisix/plugins/limit-req/)
- [Apache APISIX - Sviluppo di plugin](https://apisix.apache.org/docs/apisix/plugin-develop/)
- [Apache APISIX - Upstream](https://apisix.apache.org/docs/apisix/terminology/upstream/)
- [Apache APISIX - Consumer](https://apisix.apache.org/docs/apisix/terminology/consumer/)
