Nella lezione precedente hai visto che un proxy decide per conto di qualcuno, con regole di ACL e un caching da proteggere. Questo passaggio guarda il lato operativo: come si configura Squid per inoltrare e conservare, come nginx sceglie il backend, come si racconta al codice chi ha fatto davvero la richiesta, e come si diagnostica quando la risposta arriva ma è sbagliata.

## Obiettivi

- Scrivere una configurazione Squid minima con ACL ordinate e cache su disco.
- Usare nginx come reverse proxy con `proxy_pass`, header e `upstream`.
- Distinguere il problema nel client, nel proxy o nel backend durante una diagnosi.
- Riconoscere gli effetti di `X-Forwarded-*` sul framework che sta dietro al proxy.
- Validare le due configurazioni prima del riavvio, con gli strumenti del pacchetto.

## Squid: inoltro, ACL e cache

Squid è un forward proxy e una cache HTTP. Le ACL dichiarano insiemi di richieste: indirizzi sorgente, metodi, domini, utenti autenticati. La direttiva `http_access` le confronta con la richiesta e la prima regola che combacia decide.

```squid
http_port 3128
visible_hostname proxy.esempio.it

acl lan src 10.0.0.0/24
acl siti_riservati dstdomain .interno.esempio.it
acl metodi_sicuri method GET HEAD
http_access deny siti_riservati
http_access allow lan metodi_sicuri
http_access deny all

cache_dir ufs /var/spool/squid 10000 16 256
maximum_object_size 20 MB
```

Il blocco nega per primi i domini riservati, permette solo `GET` e `HEAD` dalla LAN e chiude con `deny all`. La cache su disco da 10 GB con 16 directory di primo livello e 256 di secondo è la struttura tradizionale di Squid, che distribuisce gli oggetti su più inode. La prima volta serve `squid -z` per inizializzare la struttura.

Le risposte senza direttive di cachatura esplicite ricevono una scadenza calcolata da `Last-Modified` con l'algoritmo euristico, di solito limitata con `refresh_pattern` per non conservare troppo a lungo contenuti che cambiano. Le direttive `no-cache` e `no-store` dell'origine si rispettano sempre.

## nginx: reverse, upstream e header

Un reverse proxy nginx riceve la richiesta dal client e la riscrive verso un upstream. `proxy_pass` determina l'URL di destinazione, e il suffisso del path decide se la parte iniziale del percorso viene sostituita o aggiunta.

```nginx
upstream app {
    server 10.0.1.10:8080 max_fails=3 fail_timeout=10s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

server {
    listen 443 ssl;
    server_name app.esempio.it;
    ssl_certificate     /etc/ssl/fullchain.pem;
    ssl_certificate_key /etc/ssl/privkey.pem;

    location /api/ {
        proxy_pass http://app/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_next_upstream error timeout http_502;
    }
}
```

`proxy_pass http://app/;` con lo slash finale toglie `/api/` dal percorso; senza slash finale lo lascia passare. È la sorgente più comune di 404 dopo la messa in produzione. `Connection ""` si abbina a `proxy_http_version 1.1` per riusare le connessioni keepalive verso l'upstream, e `max_fails` toglie temporaneamente un backend guasto dalla rotazione.

| Direttiva | Effetto | Valore abituale |
| --- | --- | --- |
| `proxy_pass` | destinazione dell'inoltro | `http://upstream/` |
| `proxy_set_header Host` | header `Host` inviato al backend | `$host` |
| `proxy_read_timeout` | attesa massima della risposta | 60s |
| `proxy_buffering` | buffer delle risposte del backend | attivo |
| `proxy_next_upstream` | condizioni di retry su un altro server | `error timeout` |

Con `proxy_buffering on` nginx legge la risposta dal backend e la consegna al client con il ritmo di quest'ultimo, così un client lento non occupa una connessione verso il backend. Per gli stream di eventi, come `text/event-stream`, si disattiva per non ritardare l'invio.

## Diagnosi: dove sta il problema

Un `502 Bad Gateway` indica che nginx non ha ottenuto una risposta valida dall'upstream; un `504 Gateway Timeout` che l'upstream non ha risposto entro `proxy_read_timeout`. Un `407` viene dal forward proxy, un `403` può venire da un'ACL o dal backend. Ogni codice ha un proprietario diverso, e questo dimezza lo spazio di indagine.

```bash
# salta il proxy per capire se il problema è suo
curl -sS --noproxy '*' -o /dev/null -w '%{http_code}\n' https://app.esempio.it/

# parla direttamente con il backend, bypassando nginx
curl -sS -H 'Host: app.esempio.it' http://10.0.1.10:8080/ -o /dev/null -w '%{http_code}\n'

# cosa pensa il server dell'indirizzo del client
curl -sS -x http://proxy.esempio.it:3128 https://ifconfig.me
```

Il primo comando esclude il proxy dalla catena, il secondo verifica il backend da dentro la rete, il terzo mostra l'indirizzo pubblico visto dall'esterno. Se il backend risponde e nginx no, il difetto è nella configurazione di nginx o nella rete tra i due. Se nginx risponde ma l'applicazione genera link a `http://10.0.1.10:8080`, il backend non legge `X-Forwarded-Proto` e `X-Forwarded-Host`.

```bash
squid -k parse -f /etc/squid/squid.conf   # valida la configurazione senza avviare
nginx -t                                  # verifica sintassi e percorsi dei certificati
squidclient -h proxy.esempio.it mgr:info  # statistiche della cache corrente
```

I log sono l'altro punto di osservazione: Squid scrive per default in `cache.log` e `access.log`, e la richiesta in formato proxy-style con URL assoluto si riconosce subito proprio lì.

## Errori comuni

- **Dimenticare lo slash in `proxy_pass`**: il percorso viene duplicato o troncato e il backend risponde `404` senza errori nei log di nginx.
- **Inviare `Connection: keep-alive` al backend**: è hop-by-hop e va svuotato dal proxy, altrimenti l'upstream chiude o interpreta male la connessione.
- **Configurare `cache_dir` senza `squid -z`**: Squid segnala l'errore in `cache.log` e non parte con la cache richiesta.
- **Leggere solo i log del backend dietro un reverse proxy**: l'indirizzo registrato è quello del proxy, e senza `X-Forwarded-For` l'abuso è invisibile.
- **Mettere `deny all` in cima alle ACL di Squid**: le regole sono ordinate e il resto della configurazione non viene mai valutato.

## In sintesi

Squid rende esplicite le decisioni di accesso con ACL ordinate e con la cache definita da spazio, dimensioni e `refresh_pattern`. nginx separa upstream e location, e la posizione dello slash in `proxy_pass` è la trappola più frequente. I codici di stato raccontano a quale nodo appartiene il problema, e i comandi di validazione (`squid -k parse`, `nginx -t`) intercettano gli errori prima del riavvio. Dietro un reverse proxy, il backend deve fidarsi degli header `X-Forwarded-*` solo se il proxy li riscrive sempre.

## Fonti

- [Squid - cache_dir](https://www.squid-cache.org/Doc/config/cache_dir/)
- [Squid - refresh_pattern](https://www.squid-cache.org/Doc/config/refresh_pattern/)
- [nginx - ngx_http_upstream_module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [nginx - ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [nginx - Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
