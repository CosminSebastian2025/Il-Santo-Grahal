Quando OpenResty sta davanti a un'API il suo valore non è il proxy — Nginx lo fa già — ma il fatto che autenticazione, limiti, trasformazioni e log girano nello stesso processo che muove i byte. Qui componi un gateway coerente: token validato in `access`, rate limit su `lua_shared_dict`, introspezione su un servizio interno, header propagati al backend e metriche raccolte in `log_by_lua`.

## Obiettivi

- Scrivere un guardiano `access_by_lua_block` che rifiuta con 401 e 429 senza chiamare il backend.
- Usare `ngx.location.capture` per l'introspezione senza duplicare la rotta.
- Implementare un rate limit con `incr` atomico su memoria condivisa.
- Propagare identità e header al backend senza rompere body, `Host` e timeout.
- Evitare le trappole di isolamento: subrequest, `location` interna, buffer del body.

## Fasi e flusso di una richiesta protetta

L'ordine delle direttive decide dove mettere la logica. Con `access_by_lua_block` in `location` la sequenza è: match del `location`, eventuali `rewrite`, poi Lua, che può terminare con `ngx.exit`. Se Lua non esce, Nginx prosegue verso il content handler, qui un `proxy_pass`.

| Esigenza | Fase | API tipica |
| --- | --- | --- |
| rifiutare senza token | access | `ngx.exit(401)` |
| introspezione token | access | `ngx.location.capture` |
| contare richieste per chiave | access | `ngx.shared.limits:incr` |
| aggiungere header al backend | access | `ngx.req.set_header` |
| misurare durata e status | log | `$request_time`, `ngx.status` |
| inviare batch di metriche | init_worker | `ngx.timer.every` |

```nginx
location /api/ {
    access_by_lua_file /etc/openresty/acl.lua;
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Autenticazione e rate limit in Lua

`acl.lua` valida l'header `Authorization: Bearer`, poi limita a 100 richieste al minuto per token. `incr` con inizializzazione e TTL per chiave è atomico anche se dieci worker incrementano nello stesso microsecondo.

```lua
local function bearer()
    local auth = ngx.var.http_authorization
    if not auth then return nil end
    return auth:match("^Bearer%s+(.+)$")
end

local token = bearer()
if not token then
    ngx.header["WWW-Authenticate"] = 'Bearer realm="api"'
    return ngx.exit(401)
end

local lim = ngx.shared.ratelimit
local chiave = "rl:" .. ngx.md5_bin(token)      -- mai il token in chiaro in memoria
local n, err = lim:incr(chiave, 1, 0, 60)
if not n then
    ngx.log(ngx.ERR, "shdict: ", err)
    return ngx.exit(503)
end
if n > 100 then
    ngx.header["Retry-After"] = tostring(lim:ttl(chiave) or 60)
    return ngx.exit(429)
end
ngx.req.set_header("X-Api-Key-Id", ngx.md5(token))
```

La memoria condivisa si ispeziona con tool di debug e finisce nei core dump: la chiave è un hash, mai la credenziale. Per un'introspezione reale usa una subrequest verso un `location` interno, che non consuma il body del client e sfonda il keepalive già configurato:

```nginx
location = /auth/check {
    internal;
    proxy_pass http://authsvc:9000/validate;
    proxy_pass_request_body off;
    proxy_set_header Content-Length "";
}

# in acl.lua
local res = ngx.location.capture("/auth/check", { vars = { token = token } })
if res.status == 401 then return ngx.exit(401) end
if res.status ~= 200 then return ngx.exit(503) end
```

`internal;` impedisce ai client di chiamare la rotta di introspezione direttamente. Per POST con body, upload in streaming o firma HMAC serve `lua-resty-http`, con `set_keepalive` obbligatorio a fine richiesta.

## Verso il backend: body, header e timeout

Le rotture più frequenti sono tre: corpi grandi, `Host` sbagliato e un timeout unico per tutto.

```nginx
proxy_connect_timeout 1s;    # l'upstream è in rete locale: deve essere veloce
proxy_read_timeout 30s;
proxy_request_buffering off; # streaming verso il backend, niente scritture su disco

location /upload/ {
    client_max_body_size 200m;
    client_body_buffer_size 32k;
    access_by_lua_file /etc/openresty/acl.lua;
    proxy_pass http://backend;
}
```

Se in `access` chiami `ngx.req.read_body()`, oltre la soglia di buffer il body finisce in un file temporaneo: `ngx.req.get_body_data()` restituisce `nil` e serve `ngx.req.get_body_file()`. Un filtro che riscrive il body va in `body_filter_by_lua_block`, dove `ngx.arg[1]` sono i chunk e `ngx.arg[2]` il flag di ultimo chunk, e ogni chunk arriva in una coroutine diversa: lo stato va tenuto in `ngx.ctx`.

Per le metriche `log_by_lua_block` gira dopo l'invio e non può più cambiare la risposta: accumula in `lua_shared_dict` e lascia che un timer periodico creato in `init_worker_by_lua_block` invii il batch senza bloccare le richieste. Il timer riceve `premature = true` allo spegnimento del worker: in quel caso non fare I/O, esci subito.

## Errori comuni

- **Creare un client `lua-resty-http` per richiesta senza keepalive**: si accumulano connessioni in TIME_WAIT fino a esaurire le porte effimere.
- **Rispondere 429 senza `Retry-After`**: i client ignorano il limite e ritentano a raffica.
- **Leggere il body in `access` sempre**: la latenza raddoppia e gli upload finiscono su disco inutilmente.
- **Usare `proxy_pass http://$host`**: obbliga un `resolver` a runtime e salta gli `upstream` statici con i loro keepalive.
- **Confondere 401 e 403**: token assente o invalido è 401 con `WWW-Authenticate`; permesso mancante è 403, senza header di challenge.
- **Memoria condivisa senza tetto**: quando è piena, `set` restituisce `no memory`; monitora `capacity()` e `free_space()`.

## In sintesi

Un gateway OpenResty si progetta per fasi: `access` decide, il backend serve, `log` misura. `lua_shared_dict` dà stato atomico senza uscire dal processo, le subrequest coprono le chiamate laterali con il keepalive di Nginx, e gli header sono il contratto verso l'applicazione: identità, IP reale e trace id sono compito del gateway. Restare senza I/O bloccanti è ciò che rende questo codice più prevedibile di un servizio scritto a mano.

## Fonti

- [lua-nginx-module - API e direttive](https://github.com/openresty/lua-nginx-module)
- [Lua Nginx API Reference](https://openresty-reference.readthedocs.io/en/latest/Lua_Nginx_API/)
- [lua-resty-limit-traffic](https://github.com/openresty/lua-resty-limit-traffic)
- [OpenResty - Components](https://openresty.org/en/components.html)
