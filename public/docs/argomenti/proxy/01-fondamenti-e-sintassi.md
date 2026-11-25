Un proxy è un programma che si interpone tra un client e un server: riceve richieste, le inoltra per conto di qualcuno, restituisce la risposta a chi ha chiesto. Il dettaglio che cambia tutto è "per conto di chi": un forward proxy agisce per il client e verso il server si presenta con la propria identità, un reverse proxy agisce per il server e verso il client si presenta come se fosse lui. Qui impari a distinguere le due direzioni, a leggere il metodo `CONNECT` e a riconoscere le richieste che un proxy può servire senza aprire una connessione.

## Obiettivi

- Distinguere forward e reverse proxy dagli effetti osservabili, non solo dal nome.
- Leggere una richiesta proxy-style con URL assoluto e capire come viene instradata.
- Spiegare il tunnel aperto dal metodo `CONNECT` e perché serve trovare un endpoint, non una risorsa.
- Descrivere il caching condiviso e il ruolo di `Via`, `Cache-Control` e della cache-key.
- Riconoscere i meccanismi di autenticazione e controllo di accesso usati dai proxy.

## Due direzioni, un solo intermediario

In un forward proxy il client è configurato per usarlo: il browser o `curl` consegnano la richiesta al proxy, che risolve il nome, apre la connessione verso la destinazione e riporta indietro la risposta. Il server vede l'indirizzo del proxy, non quello del client. È il ruolo del proxy aziendale, che centralizza l'uscita, filtra i domini e registra i log.

In un reverse proxy il client non sa nulla: risolve `www.esempio.it` e arriva al proxy, che decide a quale backend inoltrare in base a host, percorso o header. Il backend vede l'indirizzo del proxy e il client non conosce l'identità reale del server. È il ruolo del frontend di un sito, che termina TLS, distribuisce il carico e serve la cache.

| Aspetto | Forward proxy | Reverse proxy |
| --- | --- | --- |
| Chi lo configura | il client | il server |
| Indirizzo noto al client | quello del proxy | quello del proxy, preso per il server |
| Uso tipico | uscita controllata, filtro, anonimato | TLS termination, load balancing, cache |
| Header aggiunto | `Via`, `X-Forwarded-For` | `Via`, `X-Forwarded-For`, `X-Forwarded-Proto` |

La richiesta in formato proxy-style usa l'URL assoluto proprio perché il proxy deve sapere per conto di chi inoltrare, mentre il reverse proxy riceve un path relativo e ricava la destinazione dalla propria configurazione. È il primo segnale che distingue i due casi in un log.

```bash
# Forward: il client dice al proxy quale origine contattare
curl -x http://10.0.0.10:3128 http://example.com/indice.html

# Reverse: il client contatta quello che crede l'origine
curl -H 'Host: example.com' http://10.0.0.5/indice.html
```

Nel secondo comando il server risponde per `example.com` anche se il nome non punta al suo indirizzo IP: la decisione è del reverse proxy, che legge l'header `Host`.

## Richieste, hop-by-hop e CONNECT

Un proxy non è un passacarte trasparente. Alcuni header sono hop-by-hop, validi solo tra due nodi adiacenti: `Connection`, `Keep-Alive`, `Proxy-Authorization`, `TE`, `Trailer`, `Transfer-Encoding` e `Upgrade`. Vanno consumati e non copiati al destinatario successivo. Gli header legati all'applicazione, come `Authorization` o `Cookie`, viaggiano invece fino al server, a meno che la configurazione dica il contrario.

Il metodo `CONNECT` (RFC 9110, sezione 9.3.6) chiede al proxy una connessione TCP verso `host:porta` e poi passa a trasportare byte opachi. Non c'è richiesta HTTP dopo la riga iniziale: dentro il tunnel passa TLS, quindi il proxy non può leggere né modificare il contenuto. Per questo un proxy trasparente deve autorizzare `CONNECT` in modo esplicito, e i filtri basati su URL funzionano solo sulle richieste in chiaro.

```text
CONNECT example.com:443 HTTP/1.1
Host: example.com:443
Proxy-Authorization: Basic dXNlcjpwYXNz

HTTP/1.1 200 Connection Established
<byte TLS da qui in poi>
```

Prima del 200 il proxy può applicare ACL e autenticazione; dopo il 200 vede soltanto, al massimo, il nome host della richiesta `CONNECT` o il campo SNI dell'handshake TLS.

## Caching, autenticazione e accesso

Un proxy condiviso può conservare risposte per riutilizzarle: è un beneficio in una rete con molti client e rispetta le regole del caching HTTP, con `Cache-Control`, `ETag`, `Last-Modified` e `Vary`. La cache-key nasce da metodo, URL e header di `Vary`: se non include `Authorization` o `Cookie`, due utenti diversi rischiano di condividere la stessa risposta. Il default prudente è non fare cache delle risposte a richieste autenticate.

| Direttiva | Effetto in un proxy condiviso |
| --- | --- |
| `no-store` | nessuna scrittura, la risposta non è riutilizzabile |
| `no-cache` | si conserva ma va rivalidata con l'origine |
| `private` | nessuna cache condivisa: vale per browser e proxy di un singolo utente |
| `s-maxage` | scadenza specifica per le cache condivise |
| `public` | conservabile anche quando di solito non lo sarebbe |

L'autenticazione del proxy è distinta da quella dell'applicazione. Squid usa una ACL `proxy_auth` con uno schema definito in `auth_param`: quando il client non presenta credenziali valide, il proxy risponde `407 Proxy Authentication Required` con l'header `Proxy-Authenticate`. Il codice 407 riguarda il proxy, il 401 il server finale. L'accesso è poi governato da `http_access allow` e `http_access deny`, letti in ordine: la prima regola che combacia decide, quindi negare per ultimo è la pratica sicura.

```squid
auth_param basic program /usr/lib/squid/basic_ncsa_auth /etc/squid/passwd
acl lan src 10.0.0.0/24
acl utenti proxy_auth REQUIRED
http_access allow lan utenti
http_access deny all
```

Le regole vanno lette dall'alto: solo i client della `lan` con credenziali valide passano, e il resto viene respinto con un 403.

Un reverse proxy nginx aggiunge invece gli header che raccontano la catena: `X-Forwarded-For`, `X-Forwarded-Proto` e `Host`. Il backend deve usarli per costruire redirect e link, altrimenti risponde con URL interni inaccessibili dall'esterno, e deve fidarsi del proxy: un client può inviare gli stessi header da solo.

## Errori comuni

- **Confondere forward e reverse proxy leggendo solo il nome del software**: nginx e squid possono fare entrambi, la direzione si ricava da chi contatta chi.
- **Filtrare URL dentro un tunnel CONNECT**: dopo il 200 il traffico TLS è opaco, il filtro deve agire sul nome host o sull'SNI.
- **Copiare header hop-by-hop al backend**: `Connection` e `Transfer-Encoding` devono fermarsi al proxy, altrimenti il backend interpreta male il framing.
- **Fare cache di risposte autenticate senza Vary adeguato**: la cache-key condivisa può restituire contenuti di un altro utente.
- **Dimenticare che le ACL sono ordinate**: una `deny all` in cima rende inutile il resto della configurazione.

## In sintesi

Un proxy è un intermediario e la direzione dipende da chi lo ha configurato. Le richieste con URL assoluto sono la firma del forward proxy, mentre `CONNECT` apre un tunnel opaco che nasconde il contenuto al proxy. Il caching condiviso funziona solo se cache-key e direttive non mescolano utenti diversi. Squid gestisce accesso e autenticazione con ACL ordinate, nginx aggiunge header per raccontare la catena al backend.

## Fonti

- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110.html)
- [MDN - Proxy servers and tunneling](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Proxy_servers_and_tunneling)
- [Squid - Config file directives](https://www.squid-cache.org/Doc/config/)
- [nginx - HTTP Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
- [Apache mod_proxy](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html)
