Una connessione WebSocket che sembra funzionare in locale può cadere in produzione per motivi che non hanno nulla a che vedere con il codice applicativo: un proxy che blocca l'upgrade, un client che non manda mai `pong`, una riconnessione che duplica i messaggi, un TLS che impedisce al browser di aprire la connessione. Questa lezione guarda dentro il protocollo e il ciclo di vita di una connessione: come si negozia l'upgrade, quali estensioni cambiano il comportamento, come gestire chiusure e riconnessioni, e come si comporta WebSocket quando la rete è instabile o le versioni di HTTP sono diverse.

## Obiettivi

- Analizzare header e risposta dell'handshake, incluso `Sec-WebSocket-Accept` e il valore di `Origin`.
- Comprendere l'estensione permessage-deflate e la negoziazione dei sottoprotocolli.
- Governare chiusura, codici e riconnessione con backoff, senza duplicare né perdere messaggi.
- Riconoscere le cause tipiche di fallimento dietro proxy, CDN e bilanciatori.
- Sapere quando entra in gioco HTTP/2 e RFC 8441 al posto del classico upgrade.

## L'upgrade, pezzo per pezzo

L'handshake è una richiesta HTTP con tre header obbligatori: `Upgrade: websocket`, `Connection: Upgrade` e `Sec-WebSocket-Version: 13`. Il client genera `Sec-WebSocket-Key`, un nonce casuale in base64, e il server deve rispondere con `101 Switching Protocols` e un `Sec-WebSocket-Accept` calcolato come SHA-1 della chiave concatenata alla GUID della specifica, poi codificato in base64. Il calcolo non è una firma: serve solo a escludere risposte di cache o proxy che non hanno capito la richiesta.

| Header | Lato | Ruolo |
| --- | --- | --- |
| `Upgrade: websocket` | richiesta | dichiara l'intento di cambiare protocollo |
| `Sec-WebSocket-Key` | richiesta | nonce anti-cache, base64 casuale |
| `Sec-WebSocket-Version: 13` | richiesta | versione del protocollo; le altre sono obsolete |
| `Sec-WebSocket-Protocol` | richiesta | elenco di sottoprotocolli preferiti |
| `Origin` | richiesta | provenienza della pagina, da validare sul server |
| `Sec-WebSocket-Accept` | risposta | prova che il server ha accettato davvero |
| `Sec-WebSocket-Protocol` | risposta | il sottoprotocollo scelto |
| `Sec-WebSocket-Extensions` | risposta | le estensioni accettate |

Due errori frequenti lato server: accettare qualsiasi `Origin`, aprendo la porta a richieste da siti di terze parti con i cookie dell'utente, e leggere l'utente da un parametro dell'URL invece che dalla sessione legata all'handshake.

## Estensioni: compressione e sottoprotocolli

Il protocollo base manda il testo senza compressione. Una chat con molti JSON brevi consuma banda e CPU; la RFC 7692 definisce permessage-deflate, un'estensione che comprime il payload di ciascun messaggio con DEFLATE e negozia parametri come `client_max_window_bits` e `server_no_context_takeover`. Sia il client sia il server scrivono `Sec-WebSocket-Extensions` e la compressione vale solo se entrambi l'hanno proposta e accettata. Il flag `RSV1` del primo frame indica che il payload è compresso. L'estensione aiuta su payload testuali grandi, ma aggiunge latenza e consumo di CPU; con messaggi da poche decine di byte il guadagno è nullo.

Sui sottoprotocolli la logica è diversa: sono stringhe concordate dall'applicazione, come `chat.v1` o `graphql-transport-ws`. Il client ne propone un elenco e il server ne sceglie uno, oppure nessuno. Servono alla compatibilità fra versioni dello stesso servizio: un server aggiornato può supportare sia `chat.v1` sia `chat.v2` durante la migrazione, ricavando dal valore scelto il formato dei messaggi.

## Chiusura e riconnessione

La chiusura segue una procedura precisa. Il primo lato che chiude invia un frame `close` con un codice; l'altro risponde con un proprio `close` e la connessione TCP si chiude. Non è garantito che il messaggio di chiusa arrivi in ordine: il protocollo dice che i dati inviati prima del `close` potrebbero non essere consegnati, quindi l'applicazione deve avere un riscontro applicativo per i messaggi critici.

I codici standard si dividono in famiglie:

| Codice | Significato |
| --- | --- |
| `1000` | chiusura normale, fine lavoro |
| `1001` | endpoint in partenza, riavvio |
| `1002` | errore di protocollo |
| `1003` | tipo di dato non supportato |
| `1006` | chiusura anomala, senza frame `close` (solo locale, mai inviato) |
| `1008` | violazione di policy, autenticazione rifiutata |
| `1011` | errore interno del server |
| `4000`-`4999` | codici applicativi riservati alle tue app |

Il fatto che `1006` non possa essere inviato è una spia importante: quando `event.code` vale `1006`, un proxy o un crash ha chiuso il TCP senza procedura, e la riconnessione deve essere automatica. Su `1000` e `1008` la riconnessione è invece controproducente: la seconda è un rifiuto esplicito e un loop di retry diventa un attacco.

Il client deve riconnettersi con backoff esponenziale e jitter, registrando ogni tentativo. La riconnessione apre una nuova connessione: l'applicazione deve ripristinare lo stato con un messaggio di `join` o di ripresa, e il server deve deduplicare i messaggi usando un identificativo univoco per messaggio.

## Dietro proxy, CDN e HTTP/2

Molti problemi arrivano da infrastrutture che non conoscono l'upgrade. Nginx richiede una configurazione esplicita con `proxy_http_version 1.1` e i due header `Upgrade` e `Connection`; un bilanciatore che chiude connessioni inattive dopo 60 secondi obbliga a `ping` periodici; una CDN che non supporta WebSocket restituisce `403` o un `502` all'handshake. Anche il timeout dei load balancer può generare `1006` periodici.

Su HTTP/2 l'upgrade classico non è consentito: il browser deve negoziare una nuova connessione WebSocket usando la RFC 8441, che definisce un metodo `CONNECT` esteso con lo pseudo-header `:protocol` impostato a `websocket`. In Chrome ed Edge funziona; in assenza, il browser ricade su HTTP/1.1. In HTTP/3 la storia è ancora diversa, e il consiglio pratico resta lo stesso: testare con il proxy reale, non solo in locale.

## Errori comuni

- **Ignorare `event.code` nella riconnessione**: riconnettersi su `1008` o `1003` significa ripetere un rifiuto a vuoto.
- **Accettare ogni `Origin`**: il browser non applica same-origin policy a WebSocket; il controllo spetta al server.
- **Mandare solo `ping` senza gestire il timeout di `pong`**: un socket aperto non garantisce un server vivo; chiudi e riapri se il `pong` non arriva.
- **Riconnettersi senza deduplicare**: i messaggi ritrasmessi dopo un errore vengono applicati due volte.
- **Dimenticare la configurazione del proxy**: in locale funziona, dietro Nginx si riceve un `502` all'handshake.

## In sintesi

L'handshake è un contratto verificabile: chiave, versione, `Accept` e `Origin`. Le estensioni e i sottoprotocolli negoziano compressione e formato applicativo. Chiusura e riconnessione vanno trattate come parte del protocollo, con codici interpretati correttamente, backoff e ripresa di stato. Dietro proxy, CDN o HTTP/2 il comportamento cambia, e la verifica va fatta nell'ambiente reale.

## Fonti

- [RFC 6455 - The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [RFC 7692 - Compression Extensions for WebSocket](https://datatracker.ietf.org/doc/html/rfc7692)
- [RFC 8441 - Bootstrapping WebSockets with HTTP/2](https://datatracker.ietf.org/doc/html/rfc8441)
- [MDN - CloseEvent: code property](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code)
