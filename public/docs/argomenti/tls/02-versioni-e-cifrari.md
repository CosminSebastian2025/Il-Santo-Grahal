Scegliere la versione di TLS e le cipher suite giuste è una decisione di configurazione, non di codice. TLS 1.3 è oggi la scelta predefinita, TLS 1.2 va mantenuto solo per i client che non supportano 1.3, mentre TLS 1.0 e 1.1 sono deprecati. In questa lezione impari a leggere una cipher suite, a capire cosa fa SNI e a scrivere una configurazione minima sicura.

## Obiettivi

- Leggere il nome di una cipher suite TLS 1.2 e TLS 1.3.
- Sapere quali versioni abilitare e quali no.
- Capire SNI e perché è necessario per l'hosting condiviso.
- Scrivere una configurazione minima (OpenSSL/Nginx) per TLS 1.2 e 1.3.
- Verificare quale versione ha negoziato un server.

## Versioni: cosa usare

- **TLS 1.3 (RFC 8446)**: attivalo sempre. Handshake 1-RTT, solo AEAD, forward secrecy obbligatoria, certificato cifrato.
- **TLS 1.2 (RFC 5246)**: tienilo attivo se hai client legacy (vecchi dispositivi IoT, Java vecchi, qualche SDK bancario). Configurato bene con ECDHE e AEAD è ancora accettabile.
- **TLS 1.0 e 1.1**: disattivali. Sono deprecati (RFC 8996) e vulnerabili a padding oracle e BEAST.
- **SSLv2/SSLv3**: mai. Su TLS 1.2 il protocollo ammette anche suite senza AEAD e senza forward secrecy: abilitarle è il vero rischio.

## Leggere una cipher suite

TLS 1.2 usa nomi lunghi, tipo:

```text
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
```

Significato:

- `ECDHE_RSA`: key exchange ECDHE, firma con RSA per autenticare il server;
- `AES_128_GCM`: cifratura AEAD a 128 bit;
- `SHA256`: hash per il PRF e per HMAC.

TLS 1.3 ha ridotto tutto: il key exchange e l'autenticazione sono scelti separatamente. Restano cinque suite, che cambiano solo la cifratura AEAD e l'hash:

```text
TLS_AES_128_GCM_SHA256
TLS_AES_256_GCM_SHA384
TLS_CHACHA20_POLY1305_SHA256
TLS_AES_128_CCM_SHA256
TLS_AES_128_CCM_8_SHA256
```

Le prime tre sono le più comuni. ChaCha20-Poly1305 è preferibile su CPU senza accelerazione AES (molti dispositivi mobili e CPU embedded).

## Cipher string: ordine e priorità

Nginx e OpenSSL usano una stringa tipo `HIGH:!aNULL:!MD5`. Le regole di base:

- includi solo **AEAD** e **ECDHE**;
- escludi `aNULL` (nessuna autenticazione), `eNULL` (nessuna cifratura), `MD5`, `RC4`, `3DES`, `DES`;
- attiva `server_preference` per imporre il tuo ordine, oppure lascialo al client se preferisci.

Una stringa ragionevole per TLS 1.2:

```text
ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
```

Su TLS 1.3 la cipher string di OpenSSL **non** ha effetto: devi restringere con `-ciphersuites` (OpenSSL/nginx 1.23+) se serve.

## Configurazione minima

Esempio Nginx:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    ssl_certificate     /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    add_header Strict-Transport-Security "max-age=63072000" always;
}
```

`fullchain.pem` deve contenere il certificato del server **e** la catena intermedia: senza intermediari molti client mobili falliscono la verifica.

Per un test locale, `openssl s_server -accept 4433 -cert server.pem -key server.key -tls1_2 -cipher 'ECDHE+AESGCM:ECDHE+CHACHA20' -www` avvia un server solo TLS 1.2 con cipher AEAD.

## SNI: un indirizzo IP, molti domini

Un server HTTPS può ospitare decine di siti sullo stesso IP. Il ClientHello tradizionale non conteneva il dominio richiesto, e il server non sapeva quale certificato mandare: **SNI (Server Name Indication)**, estensione della RFC 6066, risolve questo introducendo il nome host nel ClientHello.

Punti importanti:

- SNI è **in chiaro** in TLS 1.3, perché il server deve leggerlo per scegliere il certificato; non è un sistema di privacy.
- Con `curl`, `openssl s_client` e i browser moderni SNI è inviato automaticamente; con `openssl s_client` devi passare `-servername example.com`.
- Un endpoint che risponde diversamente con e senza SNI (certificato di default) è una causa classica di "nome ha mismatch" solo su alcuni client.
- La privacy verso un osservatore di rete richiede ECH (Encrypted Client Hello), non ancora uniformemente supportato.

## Come verificare cosa negozia un server

```bash
curl -sS -o /dev/null -w '%{ssl_verify_result} %{tls_version} %{ssl_cipher}\n' https://example.com
```

Output tipico (una sola riga):

```text
0 TLSv1.3 TLS_AES_256_GCM_SHA384
```

`ssl_verify_result` a `0` significa catena valida. Per un'analisi più completa puoi usare `openssl s_client` con `-tls1_2` o `-tls1_3`: se il server non accetta la versione, la connessione fallisce con un handshake failure, che è il comportamento atteso quando disattivi 1.0/1.1.

## Errori comuni

- **Lasciare TLS 1.0 attivo "per compatibilità"** senza verificare quali client reali ne hanno bisogno.
- **Scordare la catena intermedia** e limitarsi al certificato foglia: funziona su alcune macchine e fallisce su Android anziani.
- **Usare `ssl_ciphers` per TLS 1.3** e credere di aver ristretto qualcosa: su 1.3 serve `ssl_ciphersuites` / `-ciphersuites`.
- **Basarsi su SNI per l'autenticazione**: SNI è controllato dal client, quindi non è un dato affidabile per l'autorizzazione.
- **Disattivare la verifica del certificato** quando un test fallisce: capisci prima se manca la catena o se il nome è errato.

## In sintesi

TLS 1.3 prima di tutto, TLS 1.2 solo se indispensabile, tutto il resto disattivato. Le cipher suite sono oggi scelte di AEAD e hash; su 1.2 conta molto la stringa. SNI è indispensabile per l'hosting condiviso ma non è privacy né autenticazione. Una configurazione minima sicura ha tre righe di protocolli, una cipher string AEAD e una catena completa, e si verifica con `curl -w` o `openssl s_client`.

## Fonti

- [RFC 5246 – TLS 1.2](https://www.rfc-editor.org/rfc/rfc5246.html)
- [RFC 6066 – TLS Extensions: Extension Definitions (SNI)](https://www.rfc-editor.org/rfc/rfc6066.html)
