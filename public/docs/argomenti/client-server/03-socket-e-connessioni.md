Una connessione HTTP non è magia: è una sequenza di byte su un socket TCP identificato da un indirizzo IP e una porta per ciascun estremo. Qui segui la vita di una connessione, dall'handshake TCP fino alla chiusura, e impari a vederla con `ss` e `nc`. È la base per capire timeout, keep-alive e i limiti del server.

## Obiettivi

- Distinguere indirizzo IP da porta e spiegare cosa sono le porte effimere.
- Descrivere le chiamate `socket`, `bind`, `listen`, `accept`, `connect`.
- Ricostruire le fasi dell'handshake TCP e della chiusura.
- Misurare keep-alive e timeout di connessione.

## Indirizzi e porte

Un **socket** è la coppia indirizzo+porta di un estremo. Una connessione attiva è univoca grazie alla coppia di socket dei due estremi:

```text
192.168.1.10:51234  <-->  93.184.215.14:443
```

- **IP** identifica l'interfaccia e il percorso verso la macchina.
- **Porta** identifica il processo o il servizio dentro la macchina.
- **Porta nota** (80, 443, 22): è quella su cui il server ascolta.
- **Porta effimera** (di solito 32768-60999 su Linux, in base a `net.ipv4.ip_local_port_range`): scelta dal kernel per il client.

Su un server che ascolta sulla 443 la porta locale è sempre la stessa, ma la quintupla `(IP sorgente, porta sorgente, IP destinazione, porta destinazione, protocollo)` è diversa per ogni connessione, e questo rende le connessioni distinte.

## Il ciclo di vita del socket

Lato server:

1. `socket(AF_INET, SOCK_STREAM, 0)` crea un descrittore;
2. `bind()` associa l'indirizzo e la porta;
3. `listen()` mette il socket in ascolto con una coda di connessioni in attesa (`backlog`);
4. `accept()` estrae una connessione completata e restituisce un **nuovo** descrittore per essa;
5. `recv()`/`send()` scambiano dati; `close()` termina.

Il socket in ascolto resta aperto per sempre; ogni connessione ha il proprio socket accettato. Il backlog non è una coda infinita: quando è pieno, nuove connessioni vengono rifiutate o ritardate: è una difesa, ma anche un limite di throughput.

Lato client:

1. `socket()`;
2. `connect()` verso indirizzo e porta del server; la chiamata blocca fino al completamento dell'handshake o al timeout;
3. `send()`/`recv()`;
4. `close()`.

## Handshake TCP in breve

Un SYN ostile o un server occupato si manifestano tutti qui. Le fasi:

```text
client                                server
  |  SYN (seq=x)             --------->  |  SYN-Received
  |  <--------- SYN+ACK (seq=y, ack=x+1) |  SYN-Rcvd -> ESTABLISHED
  |  ACK (seq=x+1, ack=y+1)  --------->  |  ESTABLISHED
```

Dopo l'ESTABLISHED inizia HTTP: richiesta, risposta. La chiusura educata usa `FIN` e porta il socket a `TIME_WAIT` per il lato che chiude per primo: lo stato dura tipicamente `2 * MSL`, quindi circa 60 secondi su Linux.

La connessione è **affidabile e ordinata**: TCP ritrasmette pacchetti persi e riordina i segmenti. Questo significa che un client che non legge rallenta il server tramite il controllo di flusso, e un percorso molto lento produce ritrasmissioni e attese.

## Porte e servizi: leggerle con `ss`

```bash
ss -tlnp
```

```text
State  Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN 0       128     0.0.0.0:22          0.0.0.0:*
LISTEN 0       511     0.0.0.0:443         0.0.0.0:*
```

- `-t` TCP, `-l` in ascolto, `-n` numeri invece di nomi, `-p` processi. `0.0.0.0:443` significa "tutte le interfacce", `127.0.0.1:8080` solo connessioni locali.
- `Recv-Q` su un socket in ascolto mostra le connessioni complete in attesa di `accept`: se cresce, l'applicazione non consuma abbastanza velocemente.

Per le connessioni attive e i timer: `ss -tno state established '( dport = :443 )'` oppure `ss -tan`. Su Windows `netstat -ano` o `Get-NetTCPConnection` in PowerShell.

## Keep-alive: riusare la connessione

Aprire una connessione TCP costa un handshake e, in TLS, altro lavoro crittografico. `keep-alive` permette di inviare più richieste HTTP sulla stessa connessione.

- In HTTP/1.1 la connessione è persistente per default; si chiude con l'header `Connection: close`.
- In HTTP/2 e HTTP/3 più richieste viaggiano in parallelo su una sola connessione.
- I server impongono limiti: numero massimo di richieste per connessione, tempo di inattività. Nginx usa `keepalive_timeout` (75 s di default) e `keepalive_requests` (1000).

Verifica dal lato client inviando due richieste allo stesso host nella stessa invocazione:

```bash
curl -sv https://example.com -o /dev/null https://example.com -o /dev/null 2>&1 | grep -E "Re-using|Connection #|Connected to"
```

Se l'output contiene `Re-using existing connection`, la connessione è stata riusata. Con `Connection: close` non succede.

## Timeout

Tre timeout diversi vanno distinti:

- **connect timeout**: quanto attendi l'handshake TCP. Se scade, non c'è connettività o il firewall scarta i pacchetti.
- **idle/read timeout**: quanto attendi dati una volta stabilita la connessione.
- **request/response timeout**: quanto tempo un proxy o un load balancer concede all'intera transazione verso il backend.

`curl --connect-timeout 3 --max-time 10` limita i primi due. Un load balancer con timeout di 10 secondi verso un backend che impiega 30 restituirà `504 Gateway Timeout` anche se il backend poi finisce con successo: la risposta viene buttata.

## Chiuse brutali e `rst`

- Se l'applicazione chiude un socket con dati non letti, il kernel può inviare un `RST` invece di `FIN`.
- Un firewall con regole che scartano pacchetti produce timeout silenziosi; un firewall che li rifiuta produce errore immediato (`Connection refused`).
- `TIME_WAIT` accumulato su un server che chiude per primo è normale, ma può esaurire le porte se il throughput è molto alto: soluzione corretta è il riuso della connessione, non l'abbassamento di `tcp_tw_reuse` alla cieca.

## Esempio: connessione grezza con `nc`

```bash
nc -l 127.0.0.1 9000          # terminale 1: ascolta
echo "CIAO" | nc -N 127.0.0.1 9000   # terminale 2: connette, invia e chiude
```

Il secondo comando apre una connessione, invia i byte e chiude; il primo stampa `CIAO`. Se `nc` manca, installa `netcat-openbsd` (Debian/Ubuntu) o `nmap-ncat` (RHEL/Fedora). Su Windows `Test-NetConnection -Port 9000` verifica invece solo che la porta risponda.

## Errori comuni

- **Confondere `Connection refused` con "server giù"**: il server risponde ma nessun processo ascolta su quella porta, oppure ascolta solo su `127.0.0.1`.
- **Associare `bind` a `0.0.0.0` un servizio che non deve essere pubblico**: lo esponi su ogni interfaccia; usa `127.0.0.1` o l'indirizzo privato corretto.
- **Ignorare il backlog**: un `accept()` lento fa riempire la coda, e i client vedono ritardi o errori di connessione.
- **Nessun timeout**: una connessione verso un IP che scarta i pacchetti resta in `SYN-SENT` molto a lungo e logora i worker del client.
- **Trattare `TIME_WAIT` come errore**: è il comportamento previsto del protocollo.

## In sintesi

- Un socket è indirizzo+porta; una connessione è la coppia dei socket di client e server.
- `connect` avvia l'handshake; il server fa `bind`/`listen`/`accept`.
- Keep-alive riusa le connessioni e riduce latenza e `TIME_WAIT`.
- Connect timeout, read timeout e timeout del proxy sono problemi diversi.

## Fonti

- RFC 9293 — Transmission Control Protocol (TCP): https://www.rfc-editor.org/rfc/rfc9293.html
- `ss(8)` su man7.org: https://man7.org/linux/man-pages/man8/ss.8.html
