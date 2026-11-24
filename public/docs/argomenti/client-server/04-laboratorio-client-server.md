In questo laboratorio scrivi un server HTTP minimo con la sola libreria standard di Python e lo osservi dall'esterno con `curl`, `nc` e `ss`. L'obiettivo non è costruire un prodotto, ma vedere il protocollo grezzo e collegare ciò che il client invia a ciò che il server risponde. Nessuna dipendenza da installare.

## Obiettivi

- Scrivere un server che ascolta su una porta e risponde con una risposta HTTP valida.
- Osservare richiesta, risposta e connessione con strumenti di rete.
- Spiegare keep-alive, codice di stato e comportamento del server sotto concorrenza semplice.

## Preparazione

Serve Python 3.8 o superiore (`python3 --version`). Su Windows il comando può essere `python` o `py -3`. Verifica anche di avere `curl` e, se possibile, `ss` (Linux) o `Get-NetTCPConnection` (PowerShell).

## Il server minimo

Salva questo file come `server.py`:

```python
import http.server
import socketserver

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = f"path={self.path}\n".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("log:", fmt % args)

with socketserver.TCPServer(("127.0.0.1", 8000), Handler) as httpd:
    print("in ascolto su http://127.0.0.1:8000")
    httpd.serve_forever()
```

Esegui `python3 server.py` e lascia il terminale aperto. `TCPServer` accetta con una connessione alla volta: se un client resta connesso, i successivi attendono. È voluto e serve per osservare l'effetto.

## Esercizi

### 1. Prima richiesta e prima risposta

In un secondo terminale:

```bash
curl -sS -i http://127.0.0.1:8000/hello
```

```text
HTTP/1.0 200 OK
Server: BaseHTTP/0.6 Python/3.12.10
Date: Tue, 24 Nov 2026 13:39:56 GMT
Content-Type: text/plain; charset=utf-8
Content-Length: 12

path=/hello
```

Domande:

- perché la versione è `HTTP/1.0` e non `HTTP/1.1`?
- che cosa è stato determinante perché `curl` sapesse quando finisce il corpo?
- se dai la stessa richiesta con `/hello?x=1`, cambia qualcosa nel corpo?

**Soluzione commentata**

`BaseHTTPRequestHandler` usa `protocol_version = "HTTP/1.0"` per default, quindi chiude la connessione dopo ogni risposta. Il corpo è di 12 byte (`path=/hello` più a capo) e `Content-Length` lo dichiara: senza, il client dovrebbe attendere la chiusura per capire dove finisce. La query string resta dentro `self.path`, quindi `path=/hello?x=1`: il server deve estrarla se gli serve.

### 2. Riuso della connessione e HTTP/1.1

Aggiungi `protocol_version = "HTTP/1.1"` nella classe `Handler` e riavvia. Poi:

```bash
curl -sv http://127.0.0.1:8000/a http://127.0.0.1:8000/b -o /dev/null -o /dev/null 2>&1 | grep -E "Re-using|Connection #|HTTP/1.1"
```

- quante connessioni TCP sono state aperte?
- perché con `Content-Length` la risposta resta valida anche su connessione persistente?

**Soluzione commentata**

Con `HTTP/1.1` e `Content-Length` presente, `curl` riusa la stessa connessione per entrambe le richieste: nel log vedi `Re-using existing connection`. Se togli `Content-Length` dal corpo, la risposta non ha fine determinabile e la connessione persistente non può funzionare: il client attende fino al timeout. È il motivo per cui HTTP/1.1 richiede `Content-Length` o `Transfer-Encoding: chunked` quando c'è un corpo.

### 3. Vedere la richiesta grezza con `nc`

```bash
printf 'GET /raw HTTP/1.1\r\nHost: 127.0.0.1:8000\r\nConnection: close\r\n\r\n' | nc 127.0.0.1 8000
```

- il server risponde anche senza `curl`?
- cosa succede se ometti la riga vuota finale?
- attenzione a `\r\n`: perché non bastano i soli `\n`?

**Soluzione commentata**

Il server parla HTTP, non accetta il comando di `curl`: qualsiasi client che invii testo valido funziona, incluso `nc`. La riga vuota (`\r\n\r\n`) separa header e corpo: senza, il server resta in attesa. HTTP/1.1 richiede `CRLF` (`\r\n`) come terminatore di riga; inviare solo `\n` può produrre un errore 400 o una risposta incompleta, a seconda del parser.

### 4. Porta occupata e `ss`

Apri un secondo server sulla stessa porta:

```bash
python3 server.py
```

```text
OSError: [Errno 98] Address already in use
```

Su Windows il messaggio è diverso (`[Errno 10048]`), ma la causa è la stessa. Poi:

```bash
ss -tlnp | grep 8000
```

- chi occupa la porta?
- perché il socket è in ascolto su `127.0.0.1:8000` e non su `0.0.0.0:8000`?
- che cosa cambierebbe usando `"0.0.0.0"` in `TCPServer`?

**Soluzione commentata**

L'indirizzo è già associato al socket in ascolto dal primo processo: il secondo `bind()` fallisce con `EADDRINUSE`. `ss -tlnp` mostra l'ascolto con il processo (se hai i permessi). `127.0.0.1` accetta solo connessioni locali: un client da un'altra macchina fallisce con `Connection refused` o timeout. Con `0.0.0.0` il server è raggiungibile su tutte le interfacce, che è ciò che vuoi solo se c'è un firewall o un proxy davanti.

### 5. Client lento e concorrenza

Con il server in esecuzione, apri una connessione senza inviare richieste:

```bash
nc 127.0.0.1 8000
```

Lascia questo terminale aperto e da un altro esegui:

```bash
time curl -sS --max-time 5 http://127.0.0.1:8000/dopo
```

- la richiesta arriva subito o aspetta?
- cosa succede se chiudi `nc` con `Ctrl+C`?
- come cambierebbe usando `ThreadingTCPServer`?

**Soluzione commentata**

`TCPServer` gestisce una connessione per volta e legge fino alla fine della richiesta: la seconda richiesta resta nella coda di `listen` finché `nc` non libera la connessione. `curl` con `--max-time 5` termina dopo 5 secondi senza risposta. Chiudendo `nc` il server torna libero. `ThreadingTCPServer` accetta ogni connessione in un thread separato e il problema sparisce: è la versione "concorrente" del modello, quella che i server reali combinano con pool e limiti.

### 6. Codici di stato e `curl -i`

Modifica il server per rispondere `404` su `/missing` e `405` su `POST`. Poi:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/missing
curl -sS -X POST -d 'x=1' -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/
```

- per quale motivo `POST` su un server che non lo implementa restituisce già `501`?
- che differenza c'è tra `404` e `405`?

**Soluzione commentata**

`BaseHTTPRequestHandler` risponde `501 Not Implemented` per i metodi senza un metodo `do_*` corrispondente: è già un comportamento HTTP corretto. `404` dice che la risorsa non esiste, `405` che esiste ma il metodo non è ammesso; il `405` va accompagnato dall'header `Allow`, che elenca i metodi accettati. Implementa `do_POST` se vuoi restituire `405` con `Allow: GET, HEAD`.

## Errori comuni

- **Avviare su `0.0.0.0` senza sapere perché**: espone il server alla rete locale. Usa `127.0.0.1` per gli esperimenti.
- **Non gestire le eccezioni nel handler**: un errore non catturato chiude la connessione e il client vede un taglio improvviso, non un `500`.
- **Dimenticare `Content-Length`**: con connessioni persistenti il client resta in attesa.
- **Lasciare il server acceso**: il processo occupa la porta finché non lo interrompi con `Ctrl+C`. Su Windows verifica con `Get-NetTCPConnection -LocalPort 8000`.
- **Confondere test e produzione**: questo server non ha TLS, timeout, limiti di dimensione, autenticazione e concorrenza: non esporlo mai.

## In sintesi

- Un server HTTP è un socket in ascolto che legge testo e scrive una risposta con riga di stato, header e corpo.
- `Content-Length` e versione del protocollo determinano la vita della connessione.
- `nc` mostra il protocollo crudo; `curl` ne è un client completo; `ss` mostra lo stato dei socket.
- Un server a connessione singola rende tangibili backlog e timeout.

## Fonti

- Python — `http.server`: https://docs.python.org/3/library/http.server.html
- RFC 9110 — HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
