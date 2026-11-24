Il protocollo TLS protegge la comunicazione tra un client e un server: riservatezza dei dati, integrità e autenticazione del server. TLS 1.3, definito nella RFC 8446, ha semplificato il vecchio handshake e ha ridotto il numero di scambi necessari. In questa lezione segui un handshake TLS 1.3 messaggio per messaggio e capisci dove nascono le chiavi di sessione e dove viene verificato il certificato del server.

## Obiettivi

- Descrivere la sequenza di messaggi di un handshake TLS 1.3 completo.
- Capire come funziona lo scambio di chiavi con Diffie-Hellman effimero (ECDHE) e perché è "effimero".
- Riconoscere il ruolo del certificato, della firma e del messaggio Finished.
- Saper distinguere un handshake completo da un resume con PSK e da un 0-RTT.

## L'idea di fondo

TLS 1.3 fa tre cose in un solo handshake:

1. **Autentica il server** con un certificato X.509 firmato da una CA fidata.
2. **Deriva un segreto condiviso** con un key exchange ECDHE, senza mai trasmetterlo in chiaro.
3. **Verifica l'integrità** con i messaggi Finished, così un attaccante attivo non può alterare la negoziazione senza farsi scoprire.

Il traffico applicativo viaggia poi cifrato con AEAD (AES-GCM o ChaCha20-Poly1305), e in TLS 1.3 il certificato del server viene sempre inviato cifrato.

## La sequenza dei messaggi

### 1. ClientHello

Il client apre con un messaggio che contiene:

- versioni TLS supportate (per TLS 1.3 è `supported_versions`, non il campo legacy `version`);
- un `random` di 32 byte;
- un **key_share**: la chiave pubblica effimera della curva scelta, per esempio X25519;
- le **cipher suite** preferite (in TLS 1.3 solo le suite AEAD);
- opzionalmente l'estensione **SNI** con il nome del server.

Il client può già includere una PSK (session ticket da una connessione precedente) e la richiesta di 0-RTT.

### 2. ServerHello

Il server risponde scegliendo una versione, una cipher suite e un key_share. Da questo punto client e server calcolano lo stesso segreto DH: nessuna delle due parti lo ha inviato sulla rete. Il resto dell'handshake viaggia già cifrato con chiavi derivate da quel segreto.

### 3. Messaggi cifrati del server

Con le chiavi "handshake" il server invia, in ordine:

- **EncryptedExtensions** (parametri aggiuntivi, come ALPN);
- **Certificate** e **CertificateVerify**: il certificato del server e una firma sul transcript dell'handshake, fatta con la chiave privata del certificato;
- **Finished**: un MAC sul transcript calcolato con gli output del key schedule.

### 4. Messaggi del client

Se il server ha chiesto un certificato, il client risponde con `Certificate`/`CertificateVerify` (è la base di mTLS). Poi il client calcola le chiavi applicative e invia il proprio **Finished**.

### 5. Traffico applicativo

Dopo i due Finished, client e server usano le chiavi applicative: qui passano HTTP/1.1, HTTP/2 o HTTP/3 su QUIC. In HTTPS la prima richiesta è quindi già coperta da cifratura.

Rispetto a TLS 1.2, in 1.3 spariscono molti round trip: su una connessione nuova serve **un solo round trip (1-RTT)**, e con una sessione precedente si può arrivare a **0-RTT**.

## Perché ECDHE cambia le cose

Con RSA key exchange (vecchio stile TLS 1.2) il segreto di sessione era cifrato con la chiave pubblica del server: chi fosse riuscito a rubare in futuro la chiave privata poteva decifrare tutto il traffico registrato. Con ECDHE ogni connessione usa una coppia di chiavi temporanea, così i dati passati restano protetti anche se la chiave privata viene compromessa: è la cosiddetta **forward secrecy**. TLS 1.3 non ammette più RSA key exchange; ammette solo (EC)DHE e PSK.

## 0-RTT e il rischio di replay

Nella ripresa di sessione (PSK) il client può inviare dati applicativi insieme al ClientHello, senza aspettare la risposta del server: è il **0-RTT**. Riduce la latenza, ma questi dati iniziali **non sono protetti contro il replay**: un attaccante che intercetta il pacchetto può reinviarlo e il server potrebbe eseguirlo due volte.

Conseguenze pratiche:

- usa 0-RTT solo per richieste **idempotenti** (GET, HEAD), mai per pagamenti o operazioni che cambiano stato;
- il server può rifiutare i primi dati e chiedere un handshake completo;
- in contesti di sicurezza alta conviene disattivare 0-RTT.

## Come osservare un handshake

```bash
openssl s_client -connect example.com:443 -servername example.com -tls1_3 -brief
```

L'output riporta una riga come `Protocol version: TLSv1.3` e `Ciphersuite: TLS_AES_256_GCM_SHA384`. Con `-msg` vedi i messaggi in ordine (ClientHello, ServerHello, EncryptedExtensions, Certificate, CertificateVerify, Finished). Senza `-quiet` puoi anche verificare che la catena del certificato sia valida.

Su macOS `openssl` è il LibreSSL di sistema: per osservare TLS 1.3 in modo affidabile installa OpenSSL con Homebrew (`brew install openssl@3`). Su Windows usa una build OpenSSL (per esempio quella inclusa con Git for Windows) oppure `curl -v`.

## Errori comuni

- **Credere che il Certificate sarà visibile in chiaro**: in TLS 1.3 è cifrato, quindi vedere il "pacco" del certificato nel pcap richiede le chiavi di sessione.
- **Pensare che la firma del certificato protegga i dati**: la firma nel CertificateVerify dimostra solo che il server possiede la chiave privata; la riservatezza viene dal key exchange.
- **Confondere 1-RTT con 0-RTT**: 1-RTT è la connessione nuova, 0-RTT solo la ripresa con PSK.
- **Disattivare la verifica del certificato "solo per provare"**: anche in test usa una CA locale e fai puntare l'app a quella radice, non `-k` o `NODE_TLS_REJECT_UNAUTHORIZED=0`.

## In sintesi

TLS 1.3 fa stare tutto in un round trip: ClientHello con key_share, ServerHello, messaggi cifrati con certificato e Finished. La chiave arriva da ECDHE, quindi la connessione ha forward secrecy; il certificato autentica il server; il 0-RTT esiste ma non è idempotente-safe. Capire la sequenza rende molto più facili le diagnosi di errori TLS in produzione.

## Fonti

- [RFC 8446 – TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446.html)
- [OpenSSL – s_client](https://docs.openssl.org/master/man1/openssl-s_client/)
