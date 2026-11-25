Nelle prime prove mTLS funziona sempre: si genera un certificato, curl lo presenta, il server risponde. Il problema arriva quando i client sono cento, i certificati scadono in momenti diversi e qualcuno deve revocarne uno in fretta. In questa lezione vediamo come si configura mTLS in nginx, cosa si mappa dal certificato client all'identità dell'applicazione, e come si organizza il ciclo di vita con rotazione, revoca e certificati a vita breve.

## Obiettivi

- Configurare nginx per richiedere e verificare un certificato client con una CA dedicata.
- Estrarre l'identità del client da `$ssl_client_*` e mapparla in modo esplicito.
- Organizzare rotazione, revoca e certificati brevi senza fermare i servizi.
- Diagnosticare gli handshake falliti e gli errori 495 e 496 di nginx.

## Configurazione nginx lato server

Le direttive chiave sono `ssl_client_certificate`, `ssl_verify_client` e `ssl_verify_depth`. Con `on` la connessione senza certificato viene rifiutata prima della richiesta HTTP; con `optional` o `optional_no_ca` il certificato è facoltativo e la verifica avviene a livello applicativo, un modello utile per mTLS progressivo. `ssl_verify_depth` limita la lunghezza della catena accettata: con CA root → intermedia → client servono almeno 2.

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /etc/nginx/tls/server.crt;
    ssl_certificate_key /etc/nginx/tls/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;

    # CA privata dedicata ai client, non un trust store pubblico
    ssl_client_certificate /etc/nginx/tls/client-ca.crt;
    ssl_verify_client      on;
    ssl_verify_depth       2;

    location /api/ {
        proxy_set_header X-Client-Verify  $ssl_client_verify;     # SUCCESS / FAILED
        proxy_set_header X-Client-Subject $ssl_client_s_dn;       # CN=..., O=...
        proxy_set_header X-Client-Serial  $ssl_client_serial;
        proxy_pass http://ordini:8080;
    }
}
```

| Errore HTTP nginx | Significato | Causa tipica |
| --- | --- | --- |
| 495 | certificato client non presentato | client non configurato, CA non richiesta |
| 496 | certificato client non valido | scaduto, EKU errato, catena incompleta |
| 400 con "No required SSL certificate" | verify `on` senza cert | test con browser, client senza keystore |
| handshake alert `bad_certificate` | verifica lato TLS fallita | CA di fiducia diversa |
| 502 immediato sul backend | header o certificato malformati | variabile SSL inattesa su versioni vecchie |

Prima di affidare la configurazione al traffico reale, tre prove rapide: `nginx -t` valida la sintassi e carica il certificato; una richiesta senza certificato deve restituire 495 (con `curl` il messaggio è un errore di handshake); una richiesta con un certificato emesso da un'altra CA deve restituire 496. Se invece si ottiene 403 dall'applicazione, la verifica TLS non è attiva e il problema è stato spostato al livello sbagliato.

## Dall'identità del certificato ai permessi

Il certificato client deve essere trasformato in un'identità applicativa in modo esplicito. `$ssl_client_s_dn` contiene il discriminator completo (`CN=settore-ordini,OU=prod,O=example`): un'applicazione che fa `split("=")[-1]` e usa il CN come ruolo è fragile, perché un cliente può avere un numero di attributi diverso. La pratica robusta è usare il SAN con un formato stabile (`URI:spiffe://example/ns/prod/sa/ordini` o `DNS:ordini.prod.svc`) e una tabella di mapping versionata.

```python
ROLES = {
    "ordini.prod.svc": "ordini",
    "pagamenti.prod.svc": "pagamenti",
    "reporting.prod.svc": "reporting-read",
}

def identita(headers):
    assert headers["X-Client-Verify"] == "SUCCESS"
    san = headers["X-Client-San"].split(",")
    for voce in san:
        if voce.startswith("DNS:"):
            ruolo = ROLES.get(voce[4:])
            if ruolo:
                return ruolo
    raise PermissionError("client non mappato")
```

Il proxy deve **sovrascrivere** gli header `X-Client-*` in ingresso, non aggiungerli: se un client esterno può inviare `X-Client-Verify: SUCCESS`, la fiducia nel certificato viene aggirata. Le applicazioni devono ascoltare solo dal proxy, su una rete interna, e il proxy deve svuotare quegli header prima di impostarli.

## Rotazione, revoca e vita del certificato

Il ciclo di vita è la parte che decide se mTLS è sostenibile. Tre strategie coesistono:

| Strategia | Come funziona | Quando usarla |
| --- | --- | --- |
| Vita breve | certificato di ore/giorni emesso da un CA interna autorizzata (SPIFFE, cert-manager, Vault) | servizi nel cluster |
| Rotazione con doppio certificato | due certificati attivi, il vecchio deprecato dopo la migrazione | flotte di dispositivi |
| Revoca | CRL o OCSP consultati dal server | certificati lungi, dispositivi fissi |

Con certificati a vita breve la revoca perde importanza perché il certificato compromesso scade presto: è la strategia preferita per i servizi. Per i dispositivi che non possono ottenere certificati automaticamente servono CRL distribuite e un processo rapido di rimozione dalla CA. Attenzione a OCSP: l'URL embedded nel certificato deve usare HTTPS e il server deve tollerare un OCSP responder non raggiungibile con una policy esplicita di soft-fail, altrimenti una rete isolata blocca tutti i client.

```bash
# diagnostica lato client: mostra la catena presentata dal server e i protocolli
openssl s_client -connect api.example.com:443 -servername api.example.com \
  -cert client.crt -key client.key -CAfile client-ca.crt -verify_return_error </dev/null

# senza certificato: deve fallire con handshake alert invece di un 403 applicativo
curl -sS https://api.example.com/api/ordini; echo "exit: $?"
```

## Errori comuni

- **CA pubblica come `ssl_client_certificate`**: chiunque abbia un certificato valido emesso da una qualsiasi CA radice può tentare l'accesso.
- **`ssl_verify_depth 1` con una CA intermedia**: la catena client → intermedia → root non viene validata e ogni connessione fallisce in modo opaco.
- **Header `X-Client-*` accettati da fuori**: il certificato non conta più nulla perché l'identità viene dall'header.
- **Certificati client con validità di cinque anni**: la rotazione diventa un evento traumatico e la revoca l'unica difesa.
- **OCSP con hard-fail su una rete isolata**: tutte le connessioni cadono quando il responder non è raggiungibile.

## In sintesi

mTLS in nginx si configura in una decina di righe, ma il valore sta nelle scelte: CA privata dedicata, EKU corretto, profondità della catena, header sovrascritti dal proxy e identità mappata dal SAN a una tabella esplicita. La sostenibilità del sistema dipende dal ciclo di vita: certificati brevi emessi automaticamente, doppio certificato per le flotte, revoca con un processo per i dispositivi fissi.

## Fonti

- [nginx - ngx_http_ssl_module](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [nginx - Securing HTTP Traffic to Upstream Servers](https://docs.nginx.com/nginx/admin-guide/security-controls/securing-http-traffic-upstream/)
- [RFC 8705 - OAuth 2.0 Mutual-TLS Client Authentication](https://www.rfc-editor.org/rfc/rfc8705)
- [openssl-verify - OpenSSL 3.0 documentation](https://www.openssl.org/docs/man3.0/man1/openssl-verify.html)
- [RFC 5280 - Internet X.509 Public Key Infrastructure Certificate](https://www.rfc-editor.org/rfc/rfc5280)
