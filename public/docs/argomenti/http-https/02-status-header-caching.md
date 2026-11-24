Il codice di stato è la prima cosa che un client guarda, e gli header che lo accompagnano determinano se una risposta può essere riusata, per quanto tempo e da chi. Molti problemi di API "lente" o "incoerenti" nascono da header di cache assenti, mal configurati o contraddittori. In questa lezione impari a leggere le famiglie di status, a scegliere quello corretto per ogni situazione e a progettare una strategia di caching consapevole.

## Obiettivi

- Raggruppare i codici di stato per famiglia e usarli con la semantica prevista.
- Distinguere 401 da 403 e 404 da 410 nelle API.
- Spiegare freschezza, validazione, `Cache-Control` ed `ETag`.
- Usare le richieste condizionali per risparmiare banda senza servire dati obsoleti.
- Riconoscere header obbligatori e header di sicurezza di base.

## Le famiglie di stato

Il primo bit del codice racconta a chi legge se il problema è del client, del server o di altro. Un client automatico usa questa informazione per decidere se ritentare, correggere, seguire un redirect o arrendersi, e un middleware la usa per classificare gli errori.

| Famiglia | Significato | Esempi tipici |
| --- | --- | --- |
| 1xx | informativo, richiesta ancora in corso | 101 Switching Protocols, 103 Early Hints |
| 2xx | successo | 200, 201, 204, 206 |
| 3xx | redirect o cache | 301, 302, 304, 307, 308 |
| 4xx | errore del client | 400, 401, 403, 404, 409, 429 |
| 5xx | errore del server | 500, 502, 503, 504 |

La scelta tra codici vicini è la parte che distingue un'API chiara da una confusa. `401 Unauthorized` significa "manca o non è valida l'autenticazione": il client deve fornire credenziali e il server accompagna la risposta con `WWW-Authenticate`. `403 Forbidden` significa "so chi sei ma non puoi": fornire credenziali diverse non serve.

`404 Not Found` è appropriato anche per nascondere l'esistenza di una risorsa a chi non ha diritto di vederla, evitando di rivelare con `403` che l'oggetto esiste. `410 Gone` indica che la risorsa è esistita ed è stata rimossa definitivamente: è un'informazione utile ai client che mantengono una copia locale.

Nelle API JSON di validazione, il confine tra `400` e `422` è dibattuto. `400 Bad Request` copre sintassi illeggibile o parametri che non soddisfano il contratto, `422 Unprocessable Content` è usato per corpi validi ma semanticamente rifiutati. Scegli una convenzione e mantienila coerente su tutte le endpoint.

```http
HTTP/1.1 201 Created
Location: /api/v1/libri/42
Content-Type: application/json

HTTP/1.1 204 No Content

HTTP/1.1 429 Too Many Requests
Retry-After: 30
```

`201` deve indicare dove si trova la risorsa con `Location`; `204` non deve avere corpo; `429` deve suggerire un tempo di attesa con `Retry-After`, altrimenti i client ritentano immediatamente peggiorando la congestione.

## Header e negoziazione

Gli header si dividono in header di richiesta, come `Accept`, `Authorization`, `If-None-Match`, e header di risposta come `Content-Type`, `Vary`, `ETag`, `Cache-Control`. `Vary` dichiara quali header di richiesta hanno determinato la scelta: se una risposta dipende da `Accept-Language`, `Vary: Accept-Language` impedisce a una cache di servire la versione inglese a chi chiede quella italiana.

`Content-Type` include il parametro `charset` per i testi e non va confuso con `Accept`, che esprime la preferenza del client con i parametri di qualità. `Content-Encoding` dichiara la compressione applicata al corpo, non il formato dei dati.

Per la sicurezza, è buona norma includere almeno `X-Content-Type-Options: nosniff` e, nelle pagine, una `Content-Security-Policy` coerente. `Strict-Transport-Security` su HTTPS impone ai browser di non tornare a HTTP per quel dominio.

## Caching: freschezza e validazione

Una cache funziona con due meccanismi. La **freschezza** dice che, per un tempo dichiarato dal server, la copia è valida e può essere servita senza contattare il server. La **validazione** dice che, a copia scaduta, il client può chiedere se è cambiata e ricevere `304 Not Modified` con corpo vuoto se non è cambiata.

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600, must-revalidate
ETag: "v42-1732000000"
Vary: Accept-Language
```

La richiesta successiva del client diventa condizionale:

```http
GET /api/v1/libri/42 HTTP/1.1
If-None-Match: "v42-1732000000"
```

`Cache-Control` si compone di direttive che possono entrare in conflitto. `no-store` vieta qualsiasi memorizzazione; `no-cache` consente di memorizzare ma obbliga a validare prima di ogni uso; `max-age` dichiara i secondi di freschezza; `private` limita la cache al browser e vieta ai proxy condivisi di conservarla; `s-maxage` vale solo per cache condivise; `stale-while-revalidate` consente di servire una copia scaduta mentre si aggiorna in background.

| Direttiva | Effetto | Attenzione |
| --- | --- | --- |
| `max-age=N` | fresco per N secondi | non vale per `s-maxage` |
| `no-cache` | sempre validare | diverso da `no-store` |
| `no-store` | non memorizzare | non copre i log |
| `private` | solo cache del client | obbligatorio con dati sensibili |
| `immutable` | non rivalidare | per asset con hash nel nome |

`Age` indica da quanti secondi la copia è in una cache intermedia ed è utile per capire perché una risposta arriva "vecchia". `Expires` è il predecessore di `max-age` e, se presente insieme, `max-age` vince.

Le API autenticate devono fare attenzione: se una risposta contiene dati personali e manca `private`, un proxy può servirla a un altro utente. Usa quindi `Cache-Control: private, no-store` se la cache non serve, oppure `private` con `max-age` breve se la cache del browser conviene.

```bash
curl -sS -D - -o /dev/null https://example.com | grep -i -E 'cache|etag|age|vary'
```

L'uso di `-D -` stampa gli header senza corpo: è il modo più rapido per controllare la politica di cache di un servizio reale.

## Errori comuni

- **Rispondere `200 OK` con un campo `errore` nel corpo**: il client non sa distinguere l'esito senza leggere il payload e i middleware non applicano retry, log o alert corretti.
- **Confondere `no-cache` e `no-store`**: `no-cache` conserva la copia e la rivalida, `no-store` impone di non conservarla mai; per dati sensibili serve il secondo.
- **Aggiungere `Vary` solo per uno degli header usati**: la cache condivisa serve varianti sbagliate e il bug è difficile da riprodurre.
- **Cambiare il `Content-Type` senza aggiornare l'`ETag`**: un client riceve `304` per una rappresentazione che è in realtà diversa.

## In sintesi

- La famiglia del codice dice se intervenire, correggere o ritentare; usarla con la semantica prevista rende l'API prevedibile.
- Header di richiesta e di risposta negoziano formato, varianti e politica di memoria.
- La cache alterna freschezza dichiarata e validazione condizionale con `ETag` e `304`.
- Le risposte personali richiedono `private` o `no-store` per non finire in cache condivise.

## Fonti

- RFC 9111 — HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111.html
- RFC 9110 — HTTP Semantics (codici e header): https://www.rfc-editor.org/rfc/rfc9110.html
- MDN — HTTP headers: https://developer.mozilla.org/en-US/docs/Web/HTTP
- RFC 9112 — HTTP/1.1 (forma dei messaggi): https://www.rfc-editor.org/rfc/rfc9112.html
