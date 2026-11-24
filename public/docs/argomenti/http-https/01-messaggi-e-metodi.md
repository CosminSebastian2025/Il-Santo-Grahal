Ogni volta che apri un sito o chiami un'API, il tuo programma e il server si scambiano messaggi di testo con una struttura precisa. HTTP è il protocollo applicativo che definisce quella struttura: una riga iniziale, un insieme di header e un corpo opzionale. Capire il formato dei messaggi e la semantica dei metodi è la base per usare, progettare e diagnosticare qualsiasi servizio web.

## Obiettivi

- Descrivere la struttura di una richiesta e di una risposta HTTP.
- Scegliere il metodo giusto in base alla semantica, non all'abitudine.
- Distinguere sicurezza e idempotenza dei metodi.
- Leggere una sessione HTTP/1.1 reale con `curl -v` e riconoscere le parti del messaggio.
- Riconoscere perché la semantica dei metodi è rilevante per retry, cache e intermediari.

## La forma dei messaggi

Un messaggio HTTP è testo strutturato. La richiesta inizia con il metodo, la destinazione e la versione del protocollo, seguita da header `Nome: valore` uno per riga e da una riga vuota che separa gli header dal corpo. La risposta inizia con la versione, il codice di stato e una frase descrittiva.

```http
POST /api/v1/libri?dry_run=true HTTP/1.1
Host: api.example.com
Content-Type: application/json
Content-Length: 47
Authorization: Bearer eyJhbGciOi...

{"titolo":"Il Gattopardo","pagina":320}
```

```http
HTTP/1.1 201 Created
Location: /api/v1/libri/42
Content-Type: application/json
Cache-Control: no-store

{"id":42,"titolo":"Il Gattopardo"}
```

L'header `Host` è obbligatorio in HTTP/1.1: su un unico indirizzo IP possono convivere molti nomi di dominio, e `Host` dice quale servizio virtuale è richiesto. La riga vuota è significativa: senza di essa il server interpreta tutto il seguito come header e resta in attesa, ed è il motivo per cui un terminale che dimentica `\r\n\r\n` sembra bloccato.

HTTP/1.1 richiede `CRLF` come terminatore di riga. Gli header sono case-insensitive nei nomi, ma i valori e la destinazione del percorso distinguono maiuscole e minuscole secondo le regole specifiche del componente. Un parametro di query `?ID=1` non è equivalente a `?id=1` per il server, anche se il nome dell'header `content-type` equivale a `Content-Type`.

## I metodi e la loro semantica

La semantica dei metodi è definita dalla specifica e non dal framework. Il metodo descrive un'intenzione: leggere, creare, sostituire, aggiornare parzialmente, eliminare, eseguire un evento. I client, le cache e i proxy si aspettano quel comportamento e ne approfittano senza chiedere permesso.

| Metodo | Intenzione | Sicuro | Idempotente | Corpo richiesta | Corpo risposta |
| --- | --- | --- | --- | --- | --- |
| GET | leggere una rappresentazione | sì | sì | sconsigliato | sì |
| HEAD | come GET, senza corpo | sì | sì | sconsigliato | no |
| POST | creare o eseguire un processo | no | no | sì | sì |
| PUT | sostituire una risorsa | no | sì | sì | opzionale |
| PATCH | modificare parzialmente | no | non garantito | sì | opzionale |
| DELETE | eliminare | no | sì | opzionale | opzionale |
| OPTIONS | interrogare le capacità | sì | sì | no | sì |

**Sicuro** significa che il metodo non deve modificare lo stato del server: un crawler può seguire qualsiasi `GET` senza effetti collaterali. **Idempotente** significa che ripetere la stessa richiesta ha lo stesso effetto sullo stato finale della prima esecuzione: due `PUT` identici producono lo stesso risultato, due `POST` identici possono creare due risorse.

L'idempotenza non è una garanzia contro gli effetti collaterali esterni: un `DELETE` ripetuto risponde 204 la prima volta e 404 la seconda, ma lo stato finale è lo stesso (risorsa assente). Un'interfaccia che invia email come effetto di un `DELETE` viola lo spirito dell'idempotenza, anche se il codice è "corretto".

`PATCH` merita attenzione. Il metodo è idempotente solo se l'implementazione lo è: un patch che incrementa un contatore non lo è, un patch che imposta un campo a un valore fisso lo è. Per questo la tabella dice "non garantito": dipende dal formato e dalla logica applicata.

## Retry, cache e intermediari

La distinzione tra sicurezza e idempotenza si traduce in comportamenti concreti. Un client che riceve un timeout può ritentare un `GET`, un `PUT` e un `DELETE` senza sapere se la prima richiesta è arrivata. Non può fare lo stesso con un `POST` senza una chiave di idempotenza condivisa con il server. Anche i proxy automatici applicano retry per i metodi idempotenti quando la connessione cade prima della risposta.

Le cache usano i metodi sicuri come punto di partenza: una risposta a `GET` è memorizzabile per default, una risposta a `POST` no, a meno che il server non dichiari esplicitamente header di cache appropriati come `Cache-Control` e, per il caching condiviso dei proxy, `public`. La ragione è semplice: se un client chiede due volte lo stesso `POST`, si aspetta due effetti.

```bash
curl -v -X GET https://httpbin.org/get 2>&1 | head -n 20
curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' -I https://httpbin.org/get
```

Il primo comando mostra la richiesta inviata e gli header della risposta. Il secondo usa `HEAD` per ottenere gli header senza corpo: `size_download` è zero, ma `Content-Length` dichiara la dimensione che avrebbe avuto la rappresentazione.

## Errori comuni

- **Usare `GET` per operazioni che modificano lo stato**: il browser, i crawler e i prefetcher possono ripetere una `GET` senza intenzione; una modifica distrugge il modello.
- **Usare `POST` per tutto**: funziona fino al primo retry, cache proxy o strumento di osservabilità che non sa distinguere la lettura dalla scrittura.
- **Considerare `PUT` un `POST` con un id nel percorso**: `PUT` sostituisce l'intera rappresentazione e deve essere idempotente; fare merge implicito crea comportamenti imprevedibili.
- **Dimenticare `Content-Length` o `Transfer-Encoding`**: con connessioni persistenti il server non sa dove finisce il corpo e la richiesta va in stallo.

## In sintesi

- Il messaggio HTTP è riga iniziale, header e, se presente, un corpo delimitato esplicitamente.
- `Host` è obbligatorio e identifica il servizio virtuale richiesto; la riga vuota separa header e corpo.
- Sicuro e idempotente sono proprietà della semantica del metodo, non implementazioni facoltative.
- Retry, cache e intermediari agiscono sulla base di quelle proprietà: cambiarne una cambia il contratto.

## Fonti

- RFC 9110 — HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 9112 — HTTP/1.1: https://www.rfc-editor.org/rfc/rfc9112.html
- MDN — HTTP: https://developer.mozilla.org/en-US/docs/Web/HTTP
