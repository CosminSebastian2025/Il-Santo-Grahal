In questo laboratorio costruisci `resty-gw`, un gateway locale davanti a due servizi HTTP (catalogo e ricerca), con token, rate limit a token bucket su memoria condivisa, una cache di risposta e un endpoint di metriche. Ogni passo si verifica con `curl`, lo stato condiviso si ispeziona dal binario `resty` e tutto gira in un container OpenResty, senza compilare nulla.

## Obiettivi

- Avviare OpenResty in Docker con i volumi giusti e validare la configurazione con `openresty -t`.
- Instradare due prefissi verso due backend e iniettare l'identità con `proxy_set_header`.
- Impostare un token bucket con ricarica progressiva e leggere il 429 con `Retry-After`.
- Aggiungere una cache con TTL e bypass `?nocache=1`, capendo i limiti di `body_filter`.
- Distinguere latenza di attesa e uso di CPU di un gateway sotto carico.

## Requisiti e rete

Servono Docker e `curl`. I due backend sono container `whoami`, che restituiscono un JSON con gli header ricevuti: perfetti per verificare la propagazione.

```bash
mkdir -p ~/resty-gw/conf ~/resty-gw/lua
docker network create gwnet
docker run -d --name catalog --network gwnet --network-alias catalog containous/whoami
docker run -d --name search  --network gwnet --network-alias search  containous/whoami
```

Il passo è superato quando, da un contenitore qualsiasi nella stessa rete, `curl http://catalog` risponde 200. Il nome `catalog` esiste solo dentro `gwnet`, ed è ciò che il gateway risolverà.

## Passo 1: configurazione del gateway

Crea `conf/nginx.conf`. La cache è una zona da 50 MB, il bucket 10 MB, le metriche 5 MB.

```nginx
worker_processes 2;
error_log  stderr warn;
pid        /tmp/nginx.pid;
events { worker_connections 4096; }

http {
    lua_package_path "/etc/resty-gw/lua/?.lua;;";
    lua_shared_dict cache     50m;
    lua_shared_dict bucket    10m;
    lua_shared_dict telemetry  5m;

    # Docker assegna a 127.0.0.11 il DNS della rete definita dall'utente
    resolver 127.0.0.11 valid=30s ipv6=off;

    server {
        listen 8080;
        client_max_body_size 10m;

        location /api/catalog/ {
            access_by_lua_file /etc/resty-gw/lua/guard.lua;
            set $up_catalog catalog:80;
            proxy_pass http://$up_catalog/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Api-Key $api_key_hash;
            log_by_lua_file /etc/resty-gw/lua/log.lua;
        }

        location /api/search/ {
            access_by_lua_file /etc/resty-gw/lua/guard.lua;
            set $up_search search:80;
            proxy_pass http://$up_search/;
            proxy_set_header Host $host;
            proxy_set_header X-Api-Key $api_key_hash;
            body_filter_by_lua_file /etc/resty-gw/lua/store.lua;
            log_by_lua_file /etc/resty-gw/lua/log.lua;
        }

        location = /metrics {
            default_type text/plain;
            content_by_lua_file /etc/resty-gw/lua/metrics.lua;
        }
    }
}
```

Con `proxy_pass` su una variabile la risoluzione avviene a runtime, per questo serve `resolver`. Il `;;` in `lua_package_path` conserva invece i percorsi di default, dove vivono le librerie `resty.*`.

```bash
cd ~/resty-gw
docker run -d --name resty-gw --network gwnet -p 8080:8080 \
  -v "$PWD/conf:/etc/openresty/conf" -v "$PWD/lua:/etc/resty-gw/lua" \
  openresty/openresty:1.31.9.1-alpine openresty -g 'daemon off;' -c /etc/openresty/conf/nginx.conf
docker exec resty-gw openresty -t -c /etc/openresty/conf/nginx.conf
```

## Passo 2: token bucket

`lua/guard.lua` accetta un `X-Api-Key` di almeno 16 caratteri e applica 20 crediti con ricarica di 5 al secondo. Il lock per chiave evita che due worker leggano lo stesso valore e si sovrascrivano.

```lua
-- lua/guard.lua
local lock = require "resty.lock"
local key = ngx.var.http_x_api_key
if not key or #key < 16 then return ngx.exit(401) end
ngx.var.api_key_hash = ngx.md5_bin(key)

local b, campo = ngx.shared.bucket, "b:" .. ngx.md5(key)
local l = lock:new("bucket_lock", { timeout = 0.5 })
local _, err = l:lock(campo)
if err then ngx.log(ngx.ERR, "lock: ", err) return ngx.exit(503) end

local ora = ngx.now()
local crediti = b:get(campo .. ":c") or 20
local t = b:get(campo .. ":t") or ora
crediti = math.min(20, crediti + (ora - t) * 5)
if crediti < 1 then
    l:unlock()
    ngx.header["Retry-After"] = "1"
    return ngx.exit(429)
end
b:set(campo .. ":c", crediti - 1, 120)
b:set(campo .. ":t", ora, 120)
l:unlock()
```

`ngx.now()` ha una cache di millisecondo: confrontalo solo con sé stesso, mai con `ngx.time()`. Il TTL di 120 s elimina le chiavi inattive, così il bucket riparte pieno e la memoria non cresce senza limite.

## Passo 3: cache, metriche e criteri

`lua/store.lua` intercetta il body in uscita e salva solo GET 200 senza `?nocache`. `lua/log.lua` accumula status e classi di latenza, `lua/metrics.lua` li stampa.

```lua
-- lua/store.lua: il filtro vede un chunk alla volta, non l'intera risposta
if ngx.var.request_method ~= "GET" or ngx.var.arg_nocache then return end
if ngx.status ~= 200 or not ngx.arg[2] then return end
local ok, err = ngx.shared.cache:set(ngx.var.uri .. "|" .. ngx.var.api_key_hash, ngx.arg[1], 30)
if not ok then ngx.log(ngx.WARN, "cache: ", err) end

-- lua/log.lua: nessun I/O qui, solo contatori
local t = ngx.shared.telemetry
t:incr("status:" .. ngx.status, 1, 0)
t:incr("lat:100", 1, 0)   -- esempio: bucket sotto i 100 ms
```

Verifica il comportamento con questa sequenza: senza header 401; 25 richieste in raffica che passano da 200 a 429; quattro secondi di pausa e di nuovo 200; `?nocache=1` due volte che raggiunge sempre il backend; `/metrics` coerente con le chiamate fatte. L'ispezione della memoria condivisa si fa dentro il container.

```bash
docker exec resty-gw resty --shdict 'bucket 10m' \
  -e 'local b = ngx.shared.bucket print(b:free_space(), b:get("b:'$(echo -n chiavediluighettodalprovare | md5sum | cut -d" " -f1)'\:c"))'
```

Per l'ultimo obiettivo lancia carico a due valori di concorrenza e confronta il rapporto tra throughput e CPU: se il 99° percentile cresce poco passando da 20 a 200 client paralleli, il gateway sta sospendendo le coroutine; se crolla con due worker saturi, nel percorso caldo c'è lavoro sincrono.

```bash
docker run --rm --network gwnet williamyeh/hey -n 20000 -c 200 \
  -H 'X-Api-Key: chiavediluighettodalprovare' http://resty-gw:8080/api/catalog/
docker stats --no-stream resty-gw
```

## Esercizi

1. Completa la cache: accumula i chunk in `ngx.ctx`, salva a fine risposta e servi le hit in `access_by_lua` con header `X-Cache: HIT`.
2. Sostituisci il token bucket a mano con `resty.limit.req` di `lua-resty-limit-traffic` e confronta le righe di codice.
3. Aggiungi `proxy_read_timeout 800ms` e verifica il 504 con un backend che dorme due secondi.
4. Rendi `/metrics` conforme al formato testuale Prometheus, con istogrammi a bucket 10/25/50/100/250/1000 ms.
5. Dimostra con tre worker che un contatore in variabile globale Lua e uno in `lua_shared_dict` danno risultati diversi, e spiega perché.

<details>
<summary>Soluzione (punto 1)</summary>

La cache si scrive in `body_filter_by_lua_block` accumulando `ngx.arg[1]` in `ngx.ctx.body` fino a `ngx.arg[2]`; la hit si serve in `access_by_lua_block` chiamando `ngx.send_headers()` dopo aver impostato status e header salvati. La chiave deve includere metodo, uri, piano di autenticazione e `Vary` rilevante, altrimenti due piani diversi condividono la stessa entry: è un bug di sicurezza, non di prestazioni. Per oggetti grandi, una `lua-resty-lrucache` per worker più `lua_shared_dict` riduce la contesa sul lock globale.

</details>

## Fonti

- [OpenResty - Getting Started](https://openresty.org/en/getting-started.html)
- [OpenResty - Installation](https://openresty.org/en/installation.html)
- [lua-resty-lock](https://github.com/openresty/lua-resty-lock)
- [lua-nginx-module - Direttive per fase](https://github.com/openresty/lua-nginx-module)
