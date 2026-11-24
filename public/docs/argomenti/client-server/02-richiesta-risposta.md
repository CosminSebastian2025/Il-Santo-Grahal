Una richiesta HTTP è un testo con una riga di apertura, header e corpo opzionale; la risposta ha la stessa forma con un codice di stato. HTTP è **stateless**: il protocollo non ricorda nulla tra una richiesta e l'altra. Lo stato, quando serve, lo aggiunge l'applicazione, con sessioni o token. Capire questa separazione evita i bug più comuni della programmazione web.

## Obiettivi

- Riconoscere le parti di una richiesta e di una risposta HTTP.
- Spiegare stateless e perché l'autenticazione deve portare l'identità in ogni richiesta.
- Confrontare sessioni lato server e token.
- Osservare richieste e risposte reali con `curl -v`.

## Anatomia di una richiesta

```http
GET /prodotti?page=2 HTTP/1.1
Host: api.example.com
User-Agent: curl/8.5.0
Accept: application/json

```

- **metodo** (`GET`): l'intenzione. `GET` legge, `POST` crea, `PUT` sostituisce, `PATCH` modifica, `DELETE` elimina.
- **target** (`/prodotti?page=2`): percorso e query string, visibili in log e history.
- **versione**: `HTTP/1.1`, `HTTP/2`, `HTTP/3`.
- **header**: `Host` è obbligatorio in HTTP/1.1 e determina quale sito risponde su un IP condiviso.
- **corpo**: assente per `GET`, presente per `POST`/`PUT`/`PATCH`.

## Anatomia di una risposta

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 57
Cache-Control: max-age=60

{"items":[{"id":1,"nome":"Tastiera"},{"id":2,"nome":"Cavo"}]}
```

Le classi di stato:

| Codice | Significato |
| --- | --- |
| `2xx` | successo (`200 OK`, `201 Created`, `204 No Content`) |
| `3xx` | redirect o cache (`301`, `302`, `304 Not Modified`) |
| `4xx` | errore del client (`400`, `401`, `403`, `404`, `429`) |
| `5xx` | errore del server (`500`, `502`, `503`, `504`) |

`502` e `504` sono tipici di un proxy che non riesce a parlare con il backend: errore del server, ma spesso causato da un problema di rete a monte.

## Cosa significa stateless

Stateless non significa "nessuna informazione": significa che **il server non assume** che questa richiesta appartenga alla stessa conversazione della precedente. Ogni richiesta deve bastare a sé stessa: URL, metodo, header e corpo contengono tutto ciò che serve.

Vantaggi:

- il server può ripartire le richieste su qualsiasi istanza, senza affinità di sessione;
- un nodo che cade non porta via la conversazione;
- le cache intermedie funzionano meglio;
- i retry sono più sicuri.

Il costo: se serve ricordare "chi sei" o "cosa avevi nel carrello", qualcuno deve trasportarlo o conservarlo.

## Lo stato lato server

Due approcci dominanti.

### Sessione lato server

Il server crea un identificativo, salva i dati in memoria o in un archivio condiviso, e invia al client solo l'ID nel cookie.

```http
Set-Cookie: sid=a3f1c9e2; HttpOnly; Secure; SameSite=Lax; Path=/
```

Il client lo rimanda automaticamente:

```http
Cookie: sid=a3f1c9e2
```

- `HttpOnly` rende il cookie invisibile a JavaScript (difesa contro XSS);
- `Secure` lo invia solo su HTTPS;
- `SameSite=Lax` limita l'invio nelle richieste cross-site (difesa CSRF);
- con più istanze del server, la sessione deve stare in uno store condiviso (Redis, database) oppure servono sticky session sul load balancer.

Il token di sessione è una **credenza**: chi lo possiede impersona l'utente. Va rigenerato al login, invalidato al logout e protetto come una password.

### Token

Il server rilascia un token firmato che il client invia in ogni richiesta, tipicamente nell'header `Authorization`.

```http
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

Il server verifica firma, scadenza e permessi senza consultare una tabella di sessioni a ogni richiesta. È comodo con più servizi, ma ha conseguenze:

- **la revoca è più difficile**: il token resta valido fino alla scadenza, salvo liste di revoca;
- **i dati nel token sono leggibili**: la firma garantisce l'integrità, non il segreto; non mettere informazioni sensibili nel payload;
- **scadenze brevi più refresh token** riducono la finestra d'uso di un token rubato.

Da qui discende un errore comune: il token nel `localStorage` è accessibile a qualsiasi script in pagina. Un cookie `HttpOnly` è meno esposto a XSS.

## Osservare il ciclo con `curl`

```bash
curl -sv https://example.com/ -o /dev/null 2>&1 | sed -n '1,20p'
```

Puoi vedere la riga di richiesta, gli header inviati, la riga di stato e gli header di risposta. Aggiungi `-H` per inviare header custom.

```bash
curl -sS -i -X POST https://httpbin.org/post \
  -H "Content-Type: application/json" \
  -d '{"nome":"Tastiera"}'
```

Lo stato del carrello e dell'utente non è "nel protocollo": è in cookie, token o parametri che il client rimanda. Se disattivi i cookie nel browser e il sito mostra il carrello vuoto a ogni passaggio, hai appena visto dove vive lo stato.

## Errori comuni

- **Salvare lo stato nel processo del server senza condividerlo**: con due istanze, la richiesta successiva può finire sull'istanza che non conosce la sessione.
- **Credere che la query string sia privata**: finisce nei log, nella cronologia e nel `Referer`; mai token o password in URL.
- **Usare `GET` per operazioni che modificano dati**: cache o crawler possono ripetere la richiesta.
- **Nessun timeout né retry con backoff**: senza limite, un backend lento blocca i worker del client.
- **Confondere la cache HTTP con la sessione**: `Cache-Control` governa la copia delle risposte, non "chi sei tu". Un `304 Not Modified` può restituire una pagina personalizzata sbagliata se la cache non tiene conto degli header `Vary`.

## In sintesi

- Richiesta e risposta hanno metodo, target, header e corpo: tutto ciò che serve a capirsi sta lì.
- HTTP è stateless: l'identità viaggia a ogni richiesta.
- Le sessioni spostano lo stato sul server con un ID nel cookie; i token lo portano al client firmato.
- Cookie `HttpOnly`, `Secure`, `SameSite` e token con scadenza breve sono le difese di base.

## Fonti

- RFC 9110 — HTTP Semantics: statelessness e metodi: https://www.rfc-editor.org/rfc/rfc9110.html
- MDN — Using HTTP cookies: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies
