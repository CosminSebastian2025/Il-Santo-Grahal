In questo laboratorio monti una catena con Docker: un reverse proxy nginx davanti a due istanze dello stesso servizio, una cache Squid come forward proxy per un client nella rete dei container, e verifiche che dimostrano il comportamento invece di fidarsi della configurazione. Alla fine saprai dire quale nodo ha gestito una richiesta guardando solo header, log e codice di stato.

## Obiettivi

- Scrivere un `docker-compose.yml` con backend replicati e due proxy sulla stessa rete.
- Configurare nginx con `upstream`, header `X-Forwarded-*` e health check passivo.
- Usare Squid come forward proxy e verificare il tunnel `CONNECT` verso HTTPS.
- Provare il caching HTTP con `ETag` e `Cache-Control`.
- Misurare l'effetto del backend quando manca o è lento.

## Lo scenario

| Servizio | Ruolo | Porta esposta |
| --- | --- | --- |
| `edge` (nginx) | reverse proxy, TLS termination | 8443 |
| `app-a`, `app-b` | backend HTTP con `http.server` | nessuna |
| `squid` | forward proxy della rete interna | 3128 |
| `client` | container di prova con `curl` | nessuna |

`app-a` e `app-b` usano il modulo `http.server` di Python e servono la stessa directory: basta per verificare il bilanciamento e la riscrittura del percorso.

```yaml
services:
  app-a:
    image: python:3.12-alpine
    command: python -m http.server 8080 --bind 0.0.0.0 --directory /srv
    volumes: ["./sito:/srv:ro"]
  app-b:
    image: python:3.12-alpine
    command: python -m http.server 8080 --bind 0.0.0.0 --directory /srv
    volumes: ["./sito:/srv:ro"]
  edge:
    image: nginx:stable
    ports: ["8443:443"]
    volumes:
      - ./edge.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certi:/etc/ssl/local:ro
    depends_on: [app-a, app-b]
  squid:
    image: sameersbn/squid:3.5.27-2
    volumes: ["./squid.conf:/etc/squid/squid.conf:ro"]
  client:
    image: curlimages/curl
    command: sleep infinity
    depends_on: [squid, edge]
```

Tutti i servizi stanno nella rete di default creata da Compose, quindi `squid` e `client` raggiungono `edge` per nome. In nginx gli upstream sono indirizzi per nome del servizio, che Docker risolve via DNS interno.

## Il reverse proxy e il bilanciamento

```nginx
upstream backends {
    server app-a:8080 max_fails=2 fail_timeout=5s;
    server app-b:8080 max_fails=2 fail_timeout=5s;
    keepalive 16;
}

server {
    listen 443 ssl;
    server_name locale.test;
    ssl_certificate     /etc/ssl/local/site.crt;
    ssl_certificate_key /etc/ssl/local/site.key;

    location / {
        proxy_pass http://backends/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Il certificato è self-signed e serve solo in locale: il client lo accetta con `--cacert` o `-k`. Se `app-b` si spegne, `max_fails` lo toglie dalla rotazione per `fail_timeout` secondi: è un health check passivo, perché nginx impara dai fallimenti degli inoltri reali.

Il round-robin è il default. Se la connessione keepalive viene riusata, richieste successive restano sullo stesso upstream fino alla chiusura.

```bash
# due nuove connessioni: in round-robin toccano backend diversi
for i in 1 2; do
  docker compose exec client curl -sS -k --no-keepalive \
    -o /dev/null -w '%{http_code} %{remote_ip}\n' https://edge/
done
```

Se le risposte si alternano il bilanciamento funziona; se puntano sempre allo stesso servizio, `keepalive` sta riusando una sola connessione.

## Squid forward proxy e CONNECT

Il client interno esce con Squid. La configurazione deve permettere la rete dei container e il metodo `CONNECT`, che serve per HTTPS: senza di lui il client ottiene un `403` e nessun tunnel.

```squid
http_port 3128
acl rete src 172.16.0.0/12
acl metodo method CONNECT GET
http_access allow rete metodo
http_access deny all
```

Le due prove sono distinte: uno `GET` in chiaro passa dal proxy ed è visibile a lui, un `CONNECT` apre un tunnel e Squid vede solo `edge:443`.

```bash
docker compose exec client curl -x http://squid:3128 -sS -o /dev/null -w '%{http_code}\n' http://edge/
docker compose exec client curl -x http://squid:3128 -k -sS -o /dev/null -w '%{http_code}\n' https://edge/
```

Il secondo comando emette un `CONNECT edge:443` che Squid autorizza e poi inoltra byte. La prova negativa è rimuovere `CONNECT` dall'ACL `metodo`: il secondo comando deve fallire e il primo continuare a funzionare.

## Cache e criterio di verifica

Per verificare il caching serve una risposta con `ETag` e `Cache-Control`. Il server Python non li emette, quindi si aggiunge un wrapper o si serve un file statico configurato su nginx. Il criterio resta: una seconda richiesta ravvicinata deve mostrare la stessa risposta senza cambiare l'`ETag`, e una rivalidazione deve restituire `304 Not Modified` invece del corpo.

| Prova | Comando | Esito atteso |
| --- | --- | --- |
| balancer | `curl` ripetuto su `edge` | risposte alternate tra i backend |
| tunnel | `curl -x squid https://edge` | `CONNECT` autorizzato, 200 dopo TLS |
| ACL | `curl -x squid http://edge` | 200, l'ACL `metodo` combacia |
| rivalidazione | `curl -H 'If-None-Match: ...'` | `304` senza corpo |
| nodo giù | stop di `app-b` | nessun errore per i client dopo `fail_timeout` |

## Esercizi

1. Aggiungi un terzo backend e descrivi come cambia la distribuzione.
2. Introduci una `location /health` che risponde da nginx e spiega perché è utile per i probe esterni.
3. Configura una `proxy_auth` su Squid e mostra la differenza tra `407` e `401` con due `curl`.
4. Crea un file con `Cache-Control: max-age=60` e osserva con `curl -v` se la seconda richiesta passa da Squid o dall'origine.
5. Simula un backend lento e distingui `502` da `504` modificando `proxy_read_timeout`.
6. Spiega cosa succede se il client invia già un `X-Forwarded-For` e chi deve leggere la lista.

<details>
<summary>Soluzione</summary>

1. Un terzo `server` in `upstream` riceve circa un terzo delle risposte. Con keepalive il client resta invece legato all'upstream della connessione aperta.

2. nginx risponde senza consultare il pool, quindi la probe verifica solo che il proxy sia vivo: serve a escludere il proxy prima di guardare i backend.

3. Senza credenziali Squid risponde `407 Proxy Authentication Required` con `Proxy-Authenticate`; il `401` arriva dall'origin quando manca la credenziale per la risorsa.

4. Squid conserva la risposta per 60 secondi se la chiave combacia. `curl -v` mostra `Age` crescente sulla seconda richiesta, segno che è servita dalla cache.

5. Un errore di protocollo del backend produce `502`, un timeout produce `504`.

6. `$proxy_add_x_forwarded_for` aggiunge l'indirizzo osservato alla lista esistente, così `X-Forwarded-For: 1.2.3.4, 10.0.0.9` conserva il valore del client. Il backend deve leggere l'ultima voce aggiunta dal proxy e non la prima, controllata dal client.

</details>

Si prova anche il caso di indisponibilità: un `docker compose stop app-a app-b` deve portare a `502` fino a quando nginx non ripristina il pool, e il riavvio dei backend deve bastare senza riavviare `edge`.

```bash
docker compose exec client curl -sS -k -o /dev/null -w '%{http_code}\n' https://edge/  # prima
docker compose stop app-a app-b
docker compose exec client curl -sS -k -o /dev/null -w '%{http_code}\n' https://edge/  # 502
docker compose start app-a app-b
```

È la prova che il laboratorio serve: non la configurazione scritta, ma il comportamento osservato in tre stati.

## Errori comuni

- **Usare `localhost` al posto del nome del servizio**: dentro un container `localhost` è il container stesso e nginx risponde `502`.
- **Non permettere `CONNECT` a Squid**: le richieste HTTPS del client interno falliscono con `403`, mentre l'HTTP in chiaro funziona e maschera il problema.
- **Confondere `407` e `401`**: il primo viene dal proxy, il secondo dall'origin, e correggere l'uno quando serve l'altro non porta da nessuna parte.
- **Affidarsi al certificato self-signed senza `-k` o `--cacert`**: il client fallisce sull'handshake TLS e sembra un errore del proxy.
- **Mettere nel pool un backend non sano**: gli errori diventano intermittenti e la diagnosi dura più del fix.

## In sintesi

Compose permette di provare la catena client, forward proxy, reverse proxy e backend sullo stesso host. nginx con `upstream` bilancia e impara dai fallimenti reali, Squid filtra con ACL ordinate e richiede `CONNECT` per il TLS. Header `X-Forwarded-*` e codici di stato sono i punti di osservazione che rendono la diagnosi una verifica.

## Fonti

- [nginx - ngx_http_proxy_module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Squid - acl](https://www.squid-cache.org/Doc/config/acl/)
- [Squid - auth_param](https://www.squid-cache.org/Doc/config/auth_param/)
- [MDN - Proxy servers and tunneling](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Proxy_servers_and_tunneling)
- [curl - manual](https://curl.se/docs/manpage.html)
