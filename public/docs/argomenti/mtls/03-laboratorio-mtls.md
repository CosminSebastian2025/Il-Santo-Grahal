In questo laboratorio metti in piedi un'API interna protetta da mTLS con una CA privata: generi le catene, configuri un gateway nginx che richiede il certificato client, verifichi il mapping dell'identità a livello applicativo e provi i casi negativi che in produzione fanno perdere ore — certificato scaduto, certificato emesso da un'altra CA, client senza chiave, revocation. Il risultato è una configurazione che sai spiegare riga per riga e un elenco di test da mantenere in CI.

## Obiettivi

- Generare una CA privata client con sub-CA per ambiente e certificati con SAN e EKU corretti.
- Configurare nginx per mTLS con verifica obbligatoria e inoltro sicuro dell'identità.
- Verificare con `curl` e `openssl s_client` i casi positivi e negativi.
- Provare la revoca via CRL e il comportamento del gateway dopo la scadenza.

## Passo 1: CA e catena di certificati

La struttura minima per un laboratorio: CA radice client (offline), una CA intermedia per `prod`, certificati foglia per i servizi. L'EKU `clientAuth` e il SAN sono le due estensioni che fanno la differenza.

```bash
# root CA client (la chiave resta in un HSM o su un supporto offline in produzione)
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -days 3650 -nodes \
  -keyout client-root.key -out client-root.crt -subj "/CN=Client Root CA" \
  -addext "basicConstraints=critical,CA:TRUE,pathlen:1" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# sub-CA prod
openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
  -keyout prod.key -out prod.csr -subj "/CN=Client Prod Sub CA"
printf 'basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\n' > prod.ext
openssl x509 -req -in prod.csr -CA client-root.crt -CAkey client-root.key \
  -CAcreateserial -days 1825 -out prod.crt -extfile prod.ext

# certificato client per il servizio ordini
openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
  -keyout ordini.key -out ordini.csr -subj "/CN=ordini.prod.svc"
printf 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=clientAuth\nsubjectAltName=DNS:ordini.prod.svc\n' > ordini.ext
openssl x509 -req -in ordini.csr -CA prod.crt -CAkey prod.key -CAcreateserial \
  -days 90 -out ordini.crt -extfile ordini.ext

# bundle del client per curl: foglia + intermedia
cat ordini.crt prod.crt > ordini-chain.crt
```

Il certificato client deve contenere l'intermedia nel bundle presentato, altrimenti il server non riesce a costruire la catena e risponde con un handshake fallito generico. Il SAN DNS `ordini.prod.svc` è l'identità su cui si baserà il mapping applicativo.

## Passo 2: gateway nginx

```nginx
server {
    listen 8443 ssl;
    ssl_certificate /etc/nginx/tls/server.crt;
    ssl_certificate_key /etc/nginx/tls/server.key;
    ssl_client_certificate /etc/nginx/tls/client-root.crt;   # solo la root
    ssl_verify_client on;
    ssl_verify_depth 2;
    ssl_crl /etc/nginx/tls/client.crl;                       # revoca esplicita

    location / {
        proxy_set_header X-Client-Verify $ssl_client_verify;
        proxy_set_header X-Client-San    $ssl_client_san;
        proxy_set_header X-Client-Serial $ssl_client_serial;
        proxy_set_header X-Client-Subject $ssl_client_s_dn;
        proxy_pass http://api:8080;
    }
}
```

`ssl_client_certificate` contiene la trust anchor: non serve includere anche la sub-CA, perché la catena presentata dal client la contiene. `ssl_verify_depth 2` corrisponde a root → prod → ordini.

## Passo 3: test positivi e negativi

| Test | Comando | Esito atteso |
| --- | --- | --- |
| client valido | `curl --cert ordini-chain.crt --key ordini.key https://localhost:8443/` | 200 |
| senza certificato | `curl https://localhost:8443/` | errore handshake (nginx 495 nei log) |
| CA estranea | `--cert fake-chain.crt` | handshake fallito (496) |
| certificato scaduto | `--cert scaduto-chain.crt` | handshake fallito |
| EKU serverAuth | `--cert server-only.crt` | rifiutato in verifica |
| identity spoof | `-H "X-Client-Verify: SUCCESS"` senza cert | handshake fallito |

```bash
curl -sv --cert ordini-chain.crt --key ordini.key https://localhost:8443/api/ping 2>&1 \
  | grep -E "HTTP/1.1 200|200 OK"

# verifica della catena presentata dal server e del certificato richiesto
openssl s_client -connect localhost:8443 -servername localhost \
  -cert ordini-chain.crt -key ordini.key -CAfile client-root.crt -state </dev/null 2>&1 | head -30
```

Se il caso positivo dà 496 e `openssl` mostra `verify error:num=21:unable to verify the first certificate`, la catena è incompleta. Se dà `num=26:unsupported certificate purpose`, il problema è l'EKU: il certificato è stato emesso senza `clientAuth` o con `serverAuth`.

## Passo 4: revoca e scadenza

La CRL va generata dalla sub-CA con un file di indice; il gateway la ricarica al `nginx -s reload`. Il laboratorio deve dimostrare che un certificato revocato smette di funzionare senza riavviare nulla di più del reload.

```bash
# revoca del certificato ordini
openssl ca -config prod-ca.cnf -revoke ordini.crt
openssl ca -config prod-ca.cnf -gencrl -out client.crl
openssl crl -in client.crl -noout -nextupdate
sudo nginx -t && sudo nginx -s reload

curl -o /dev/null -w "%{http_code}\n" --cert ordini-chain.crt --key ordini.key \
  https://localhost:8443/api/ping     # handshake rifiutato

# scadenza: certificato di 1 giorno generato apposta
openssl x509 -req -in ordini.csr -CA prod.crt -CAkey prod.key -days 1 \
  -out breve.crt -extfile ordini.ext
openssl x509 -in breve.crt -noout -dates
```

Il test di scadenza va tenuto in CI simulando una data avanzata o usando un certificato già scaduto: il comportamento del cliente e del gateway deve essere documentato, perché alcuni client restituiscono errori generici difficili da attribuire.

Un ultimo accorgimento operativo riguarda il server: anche la chiave privata del gateway può essere compromessa. Se è custodita in un file `server.key` con permessi ampi, la protezione offerta dal mTLS si indebolisce senza che nessuno se ne accorga. In produzione la chiave va in un modulo HSM o almeno in un file leggibile solo dall'utente che esegue il processo, e il certificato del gateway deve essere a vita breve come quelli dei client: la simmetria delle garanzie è ciò che rende il laboratorio una configurazione trasferibile.

## Criterio di verifica

Il laboratorio è concluso quando tutti i sei test della tabella producono l'esito atteso, quando il valore di `X-Client-San` ricevuto dall'API è esattamente `ordini.prod.svc` mappato al ruolo `ordini`, e quando la revoca rende il certificato inutilizzabile dopo il solo `reload`. Da quel punto si può sostituire i certificati a 90 giorni con l'emissione automatica (cert-manager, Vault, SPIFFE) senza cambiare il gateway.

## Errori comuni

- **Presentare solo la foglia**: senza l'intermedia il server non costruisce la catena e l'errore è poco parlante.
- **Emettere il certificato client senza EKU**: viene rifiutato, oppure accettato per scopi sbagliati se il server non controlla.
- **CRL non aggiornata**: la revoca non ha effetto e il certificato compromesso resta valido; `nextupdate` va monitorato.
- **Fidarsi dell'header senza proxy**: se l'applicazione è raggiungibile direttamente, l'identità diventa auto-dichiarata.
- **Chiave privata nel repository del laboratorio**: la `.gitignore` deve escluderla fin dal primo commit.

## In sintesi

mTLS si costruisce in tre livelli: catena di certificati corretta, gateway che richiede e verifica, applicazione che mappa il SAN a un ruolo. I casi negativi (senza certificato, CA estranea, EKU sbagliato, revocato, scaduto) sono il vero collaudo. Certificati brevi con emissione automatica rendono il ciclo di vita un problema di configurazione e non di memoria.

## Fonti

- [nginx - ngx_http_ssl_module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [OpenSSL - x509 documentation](https://www.openssl.org/docs/man3.0/man1/openssl-x509.html)
- [RFC 5280 - Internet X.509 Public Key Infrastructure Certificate](https://www.rfc-editor.org/rfc/rfc5280)
- [ACME - RFC 8555 Automatic Certificate Management Environment](https://www.rfc-editor.org/rfc/rfc8555)
