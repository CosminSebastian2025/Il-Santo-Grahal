Le prestazioni di una pagina moderna dipendono in larga parte dal protocollo di trasporto sottostante. HTTP/2 introduce framing binario e multiplexing su una sola connessione; HTTP/3 abbandona TCP e appoggia lo stesso modello su QUIC, riducendo la latenza. Questo laboratorio mette in pratica entrambi i passaggi osservando il traffico reale.

## Obiettivi

- Spiegare il ruolo del framing binario e del multiplexing in HTTP/2.
- Riconoscere i limiti di HTTP/1.1 che HTTP/2 risolve e quelli che non risolve.
- Descrivere QUIC e perché HTTP/3 riduce la latenza di handshake.
- Verificare il protocollo negoziato con `curl` e gli strumenti del browser.
- Distinguere i problemi di applicazione da quelli di trasporto durante una diagnosi.

## Da HTTP/1.1 a HTTP/2

HTTP/1.1 è testuale e gestisce una richiesta alla volta per connessione, in ordine. Le workaround sono note: fino a sei connessioni parallele per dominio, sprite e file accorpati. Tutte riducono il numero di richieste perché ognuna costa un giro di rete.

Il problema strutturale è l'head-of-line blocking: una risposta lenta blocca le successive sulla stessa connessione. HTTP/2 introduce il framing binario: i messaggi sono divisi in frame tipizzati, associati a uno stream tramite un identificatore, e più stream viaggiano interleaved sulla stessa connessione.

| Caratteristica | HTTP/1.1 | HTTP/2 | HTTP/3 |
| --- | --- | --- | --- |
| Codifica | testuale | binaria | binaria |
| Multiplexing | no, serve più connessioni | sì, su una connessione | sì, su una connessione |
| Compressione header | no | HPACK | QPACK |
| Trasporto | TCP | TCP | QUIC (UDP) |
| Negoziazione | testo | ALPN, via TLS | ALPN, via TLS |

`HPACK` (RFC 7541) comprime gli header con una tabella statica e una dinamica, indicizzando i nomi ripetuti: per questo una pagina con cookie pesanti costa molto meno in HTTP/2. La compressione aggressiva può però diventare un canale di fuga di informazioni, per questo le implementazioni limitano la tabella.

I server moderni, Ktor compreso, negoziano HTTP/2 in TLS tramite ALPN. Senza TLS servono meccanismi espliciti come l'upgrade, che i browser non usano: in pratica, con `http://` usi HTTP/1.1.

## HTTP/3 e QUIC

HTTP/3 (RFC 9114) mantiene la semantica HTTP ma la trasporta su QUIC, che gira su UDP e integra TLS 1.3 e controllo di congestione. L'handshake di trasporto e quello TLS avvengono insieme, con un giro di rete risparmiato rispetto a TCP più TLS. Gli stream sono indipendenti dalle perdite: se un pacchetto si perde solo lo stream interessato si blocca, mentre in HTTP/2 su TCP una perdita ferma tutti. Il connection migration sopravvive al cambio di indirizzo IP, utile sugli smartphone.

Il costo è la gestione: alcuni firewall bloccano UDP sulla porta 443 e i tool tradizionali non lo vedono, perché QUIC è cifrato per intero. Il fallback a TCP è quindi normale.

La compressione degli header in HTTP/3 si chiama `QPACK` e risolve il problema di ordine del trasporto: gli stream sono indipendenti, quindi la tabella dinamica si aggiorna con frame dedicati e riferimenti che possono attendere. HPACK indicizza per connessione, QPACK con una coda esplicita e limiti.

## Laboratorio

Serve una versione recente di `curl` con supporto HTTP/2 e HTTP/3, che `curl -V` elenca come `HTTP2` e `HTTP3`.

```bash
curl -sS -o /dev/null -w '%{http_version}\n' https://www.cloudflare.com
curl -sS --http2 -o /dev/null -w 'http2: %{http_version} %{http_code}\n' https://www.cloudflare.com
curl -sS --http3-only -o /dev/null -w 'http3: %{http_version} %{http_code}\n' https://www.cloudflare.com
```

Il secondo comando stampa la versione usata; il terzo fallisce se server o rete non supportano HTTP/3.

Per vedere il multiplexing, apri la sezione Network del browser, aggiungi la colonna `Protocol` e ricarica una pagina con molti asset: le richieste HTTP/2 mostrano `h2`, le HTTP/3 `h3`. Con un throttling di rete vedi quanto una connessione lenta penalizzi HTTP/1.1 più di HTTP/2.

Abilita infine HTTP/2 su un reverse proxy come nginx con `listen 443 ssl http2;` e un certificato locale, poi conta le connessioni con `ss -tn`: HTTP/1.1 ne apre più di una, HTTP/2 una sola con più stream.

## Esercizi

### 1. Identificare la versione negoziata

Usa `curl -w` su tre siti diversi e compila una tabella con la versione HTTP negoziata. Spiega perché un sito vecchio risponde `1.1` anche se il tuo client supporta HTTP/2.

<details><summary>Soluzione</summary>

Esegui `curl -sS -o /dev/null -w '%{http_url_effective} %{http_version}\n' <url>` per ogni sito e annota i risultati. Un server che non dichiara `h2` in ALPN risponde in HTTP/1.1 perché la versione è negoziata dall'estremo server, non imposta dal client: se il server non la supporta, il client ricade sulla versione comune più alta.

</details>

### 2. Misurare l'handshake con e senza HTTP/3

Esegui `curl -sS -w '%{time_connect} %{time_appconnect} %{time_total}\n'` cinque volte per HTTP/2 e cinque per HTTP/3. Confronta `time_appconnect`.

<details><summary>Soluzione</summary>

Su HTTP/2 `time_appconnect` include TCP e TLS, quindi la prima connessione è più lenta; le successive no, grazie alla session resumption. Su HTTP/3, se la rete non blocca UDP, l'handshake combinato è più rapido di circa un giro di rete e nei restart di connessione può essere quasi nullo grazie al resumption di QUIC. Se `time_connect` non è disponibile per HTTP/3, il motivo è che curl usa il percorso UDP e non ha un `connect` TCP da misurare.

</details>

### 3. Provocare e osservare il fallback

Blocca UDP sulla porta 443 (per esempio con una regola di firewall locale in una macchina virtuale) e verifica che il browser o curl ricada su HTTP/2 senza errori visibili.

<details><summary>Soluzione</summary>

Con `--http3-only` il comando fallisce; senza il flag, curl prova HTTP/3 e ricade su HTTP/2. È il comportamento previsto: il supporto HTTP/3 è un'opportunità, non un requisito. Nel browser lo vedi nella colonna Protocol passare da `h3` a `h2` dopo il timeout iniziale.

</details>

### 4. Confrontare il numero di connessioni

Con nginx locale abilitato per HTTP/2, carica una pagina con venti immagini in HTTP/1.1 e in HTTP/2, contando le connessioni con `ss -tn state established '( dport = :443 )'`.

<details><summary>Soluzione</summary>

In HTTP/1.1 i browser aprono più connessioni parallele, quindi vedi più tuple stabilite verso la porta 443. In HTTP/2 la stessa pagina viaggia su una sola connessione con stream interleaved: una sola tupla, salvo connessioni usate per scopi diversi come i preconnect. Servono due profili browser puliti per evitare che la cache mascheri i risultati.

</details>

### 5. Verificare la compressione degli header

Carica la stessa pagina con un cookie grande (per esempio aggiungendo un cookie di test da 4 KB) in HTTP/2 e osserva la dimensione complessiva delle richieste nella rete.

<details><summary>Soluzione</summary>

In HTTP/2 la prima richiesta paga il costo pieno del nuovo cookie, ma le successive riferiscono il nome e il valore nella tabella dinamica HPACK e il costo scende. In HTTP/1.1 ogni richiesta ripete il cookie per intero. Il confronto si vede meglio con molte richieste allo stesso dominio, che in HTTP/2 condividono la tabella per connessione.

</details>

### 6. Distinguere errore di trasporto da errore applicativo

Chiama un endpoint inesistente sia in HTTP/2 sia in HTTP/3 e classifica la risposta.

<details><summary>Soluzione</summary>

Un `404` è un errore applicativo: il trasporto ha funzionato e il server ha risposto. Un fallimento di handshake, un `ERR_QUIC_PROTOCOL_ERROR` o un timeout sono errori di trasporto o di rete. La distinzione guida la diagnosi: nel primo caso il problema è l'URL o il contratto dell'API, nel secondo la rete, il firewall o la configurazione TLS.

</details>

## Errori comuni

- **Credere che HTTP/2 risolva ogni lentezza**: il processing lato server, una query lenta o una risposta grande restano costosi; il multiplexing non riduce i byte.
- **Forzare `--http3-only` in produzione**: nei client reali si prova HTTP/3 e si accetta il fallback; forzarlo espone a reti che bloccano UDP.
- **Assumere che HTTP/2 sia disponibile su HTTP in chiaro**: i browser negoziano HTTP/2 solo con TLS e ALPN.
- **Misurare le prestazioni con la cache calda**: i tempi e le connessioni cambiano radicalmente; usa profili puliti e ripeti le misurazioni.

## In sintesi

- HTTP/2 risolve l'head-of-line blocking di HTTP con frame e stream su una sola connessione e comprime gli header con HPACK.
- HTTP/3 porta lo stesso modello su QUIC: handshake combinato, stream indipendenti dalle perdite e migrazione di connessione.
- La versione è negoziata dal server via ALPN: il client propone, il server sceglie.
- Le misure con `curl` e gli strumenti del browser distinguono i problemi di trasporto da quelli di applicazione.

## Fonti

- RFC 9113 — HTTP/2: https://www.rfc-editor.org/rfc/rfc9113.html
- RFC 9114 — HTTP/3: https://www.rfc-editor.org/rfc/rfc9114.html
- RFC 7541 — HPACK Header Compression: https://www.rfc-editor.org/rfc/rfc7541.html
- MDN — HTTP: https://developer.mozilla.org/en-US/docs/Web/HTTP
