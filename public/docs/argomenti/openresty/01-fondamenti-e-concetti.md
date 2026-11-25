OpenResty non è un web server alternativo a Nginx: è il core Nginx con una pila di moduli mantenuti dallo stesso gruppo, il più importante dei quali (`ngx_lua`) incorpora LuaJIT e permette di eseguire codice Lua dentro le fasi di una richiesta. Ne esce un gateway programmabile, dove una regola di autenticazione o un rate limit si scrive in poche righe di Lua invece che in un modulo C da compilare. Qui vedi com'è fatto il pacchetto, dove gira il codice e in quale fase va messo.

## Obiettivi

- Distinguere i pezzi del bundle: core Nginx patchato, LuaJIT, `ngx_lua`, `lua-resty-*`.
- Capire perché ogni worker è a thread singolo e come le coroutine danno concorrenza.
- Scegliere la direttiva `*_by_lua*` giusta per la fase della richiesta.
- Scrivere un primo endpoint con `content_by_lua_block` e stato condiviso.

## Il bundle: cosa c'è dentro

La release corrente è OpenResty 1.31.9.1: core Nginx 1.31 con patch per lo yield in ogni fase, LuaJIT 2.1 e le librerie `lua-resty-*` che evitano di riscrivere in C client HTTP, Redis e Memcached.

| Componente | Ruolo | Nota pratica |
| --- | --- | --- |
| core Nginx | connessioni, TLS, proxy | patchato per sospendere il Lua a ogni fase |
| LuaJIT 2.1 | JIT per Lua 5.1 | traccia a caldo, GC incrementale |
| `ngx_lua` | direttive `*_by_lua*`, API `ngx.*` | il cuore dell'estensione |
| `lua-resty-core` | API via FFI | più veloci di quelle pure Lua |
| `lua-resty-lock`, `lua-resty-limit-traffic`, `lua-resty-lrucache` | lock, limitatori, cache | appoggiate a `lua_shared_dict` |

I pacchetti ufficiali (APT/YUM, `openresty.org/package`) installano tutto sotto `/usr/local/openresty/` con i binari in `bin/`. Il comando `openresty` ha la stessa interfaccia di `nginx`: `-s reload`, `-t`, `-c` con un file alternativo. Il binario `resty` serve invece a eseguire snippet Lua da riga di comando con il runtime completo di `ngx_lua`:

```bash
resty -e 'print("hello, world")'
resty --shdict 'cache 10m' -e 'ngx.shared.cache:set("k", 1) print(ngx.shared.cache:get("k"))'
openresty -t -p /usr/local/openresty/nginx
openresty -s reload
```

## Concorrenza: un thread per worker, mille richieste sospese

Un processo worker Nginx non ha thread: gestisce le connessioni con un event loop (epoll su Linux). `ngx_lua` esegue ogni richiesta in una coroutine Lua; quando il codice chiama un'API che bloccherebbe (lettura del body, `ngx.location.capture`, socket verso un upstream), la coroutine viene sospesa e il worker passa ad altro. Quando il dato arriva, la coroutine riprende esattamente dove si era fermata.

Ne derivano tre conseguenze operative.

- Il parallelismo arriva dallo sfasamento delle attese, non dalla CPU: 20 ms di calcolo puro tengono fermo il worker per 20 ms.
- Niente API bloccanti: `os.execute` e le letture di file sincrone sul percorso caldo vanno evitate.
- Lo stato globale Lua è per worker, e per contare serve `ngx.shared.DICT`. Un contatore "globale" aggiornato da `content_by_lua` su un nodo con `worker_processes auto` e 8 core risulterà sbagliato di un fattore 8.

## Le fasi della richiesta

Nginx elabora una richiesta per passaggi: risoluzione del `location`, rewrite, access, content, filtri di header e body, log. `ngx_lua` espone una direttiva per quasi ogni fase, e la scelta non è stilistica: in `rewrite_by_lua_block` non funzionano le API che sospendono la coroutine.

| Fase / direttiva | Cosa ci sta bene | Può sospendere? |
| --- | --- | --- |
| `init_by_lua_block` | caricare moduli, configurare `lua-resty-core` | solo API limitate |
| `init_worker_by_lua_block` | timer periodici, health check, connessioni a caldo | sì |
| `set_by_lua_block` | calcolare una variabile Nginx | no (delegato al thread rewrite) |
| `rewrite_by_lua_block` | riscrittura URI e redirect | no |
| `access_by_lua_block` | autenticazione, ACL, rate limit | sì |
| `content_by_lua_block` | generare la risposta da Lua | sì (unico content handler) |
| `header_filter_by_lua_block` | header aggiunti a monte | no |
| `log_by_lua_block` | metriche, invio asincrono con timer | no (usa `ngx.timer`) |

`content_by_lua_block` e `proxy_pass` non convivono nello stesso `location`: il contenuto lo produce uno solo dei due. Se devi chiamare un backend da Lua, la strada è `ngx.location.capture` verso una `location` interna con `proxy_pass`, oppure `lua-resty-http`.

## Primo endpoint

Un endpoint che restituisce IP, URI e un contatore per IP, senza file Lua esterni.

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
    lua_shared_dict hits 10m;
    server {
        listen 8080;
        server_name localhost;

        location /api/echo {
            default_type application/json;
            content_by_lua_block {
                local cjson = require "cjson"
                local hits = ngx.shared.hits
                local nuovo, err = hits:incr(ngx.var.binary_remote_addr, 1, 0, 120)
                if not nuovo then
                    ngx.log(ngx.ERR, "shdict: ", err)
                    return ngx.exit(500)
                end
                ngx.header["Cache-Control"] = "no-store"
                ngx.say(cjson.encode({
                    client = ngx.var.remote_addr,
                    uri    = ngx.var.request_uri,
                    hits   = nuovo,
                    trace  = ngx.var.request_id, -- header X-Request-Id del client, nil se assente
                }))
            }
        }

        location /healthz {
            default_type text/plain;
            content_by_lua_block { ngx.say("ok") }
        }
    }
}
```

Tre dettagli che contano più della sintassi:

- `ngx.say` aggiunge il ritorno a capo e scrive in streaming; `ngx.print` non aggiunge nulla. Il body viene inviato al client man mano, quindi non serve costruire una stringa grande.
- `ngx.shared.hits:incr` è atomico e condivide lo stato fra worker; `incr` con `init=0` e `init_ttl=120` crea la chiave se manca e la fa scadere dopo due minuti.
- Le variabili `ngx.var.*` sono quelle standard di Nginx: `ngx.var.request_id` legge l'header `X-Request-Id` inviato dal client e vale `nil` se manca. Una variabile con nome sbagliato non solleva errori, restituisce `nil` e il JSON esce silenziosamente con `trace: null`.

Con diecimila richieste ferme in attesa di un backend occupano spazio le coroutine, non diecimila thread: è questo che permette a un singolo nodo OpenResty di reggere decine di migliaia di connessioni.

## Errori comuni

- **Scrivere `proxy_pass` e `content_by_lua_block` nella stessa `location`**: Nginx accetta la configurazione ma il comportamento è indefinito tra versioni; usa un `location` interno per il proxy.
- **Memorizzare stato globale Lua aspettandosi condivisione**: ogni worker ha il proprio ambiente; per valori condivisi usa `lua_shared_dict`.
- **Chiamare API che sospendono nella `rewrite`**: `ngx.location.capture` e le cosocket lì falliscono; sposta la logica in `access` o `content`.
- **Dimenticare `lua_code_cache on` in produzione**: con cache spenta il file Lua viene riletto a ogni richiesta, con costo e comportamento diversi dalle prove.
- **Misurare il tempo con `os.time()`**: risoluzione a un secondo; per durate usa `$request_time` o `ngx.now()`.
- **Mischiare `ngx.now()` e l'orologio di sistema nei calcoli**: il primo ha una cache di millisecondo e va confrontato solo con sé stesso.

## In sintesi

OpenResty è Nginx più LuaJIT più un set di moduli coerenti: il server resta event-driven con un thread per worker, e Lua gira in coroutine sospendibili, quindi la concorrenza arriva dall'attesa non dalla CPU. Le direttive `*_by_lua` mappano le fasi della richiesta, e la fase scelta decide quali API sono legali. Lo stato condiviso passa da `lua_shared_dict`, non da variabili globali. Con questa mappa mentale il codice Lua diventa una configurazione eseguibile, non un plugin opaco.

## Fonti

- [OpenResty - Home](https://openresty.org/en/)
- [OpenResty - Getting Started](https://openresty.org/en/getting-started.html)
- [lua-nginx-module - README](https://github.com/openresty/lua-nginx-module)
- [lua-resty-core - README](https://github.com/openresty/lua-resty-core)
