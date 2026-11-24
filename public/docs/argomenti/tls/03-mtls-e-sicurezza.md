Nel TLS "normale" solo il server presenta un certificato: il client è anonimo a livello di protocollo. Con mTLS (mutual TLS) anche il client presenta un certificato e il server lo verifica, così un servizio può accettare connessioni solo da client autorizzati. mTLS è molto usato tra microservizi, gateway e API interne, ma richiede una gestione ordinata di CA, rotazione e revoca.

## Obiettivi

- Capire cosa aggiunge mTLS rispetto a TLS standard.
- Generare una CA privata e certificati client per il laboratorio.
- Configurare un server Nginx che richiede un certificato client.
- Gestire rotazione e revoca senza interruzioni.
- Riconoscere i rischi operativi più comuni.

## Cosa fa mTLS

1. Il server presenta il suo certificato e il client lo verifica (come sempre).
2. Il server invia un `CertificateRequest` con la lista delle CA accettate.
3. Il client risponde con il proprio certificato e una `CertificateVerify` firmata con la sua chiave privata.
4. Il server verifica la catena del certificato client e la firma, poi l'applicazione decide se quel client è autorizzato.

L'autenticazione è **al livello del canale**: il server sa che chi apre la connessione possiede la chiave privata del certificato client. L'autorizzazione (a quali dati accedere) resta un problema dell'applicazione.

In pratica: mTLS serve per comunicazioni service-to-service, API private tra partner, ambienti di amministrazione e dispositivi con certificato emesso dalla tua CA. Non basta per autenticare un utente finale nel browser (serve un certificato personale distribuito e protetto), non sostituisce l'autorizzazione applicativa e non protegge da un client compromesso: certifica "è quel client", non "quel client è sano".

## Generare una CA e i certificati client

In un laboratorio locale crea una CA privata. OpenSSL 3:

```bash
# 1. CA privata (validità 10 anni)
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
  -days 3650 -nodes -keyout ca.key -out ca.crt \
  -subj "/CN=Laboratorio CA" \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# 2. Chiave e CSR del client
openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
  -keyout client.key -out client.csr -subj "/CN=job-runner"

# 3. Estensioni del certificato client
printf 'keyUsage=critical,digitalSignature\nextendedKeyUsage=clientAuth\n' > client.ext

# 4. Firma del certificato client da parte della CA
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -days 365 -out client.crt -extfile client.ext
```

Il punto chiave è `extendedKeyUsage=clientAuth`: un certificato con solo `serverAuth` viene rifiutato in fase di verifica client, e il messaggio d'errore è spesso generico. Verifica il risultato con `openssl x509 -in client.crt -noout -ext extendedKeyUsage`.

Il file `client.ext` funziona anche su Windows PowerShell, dove la sintassi `<(...)` di bash non esiste. Su Git Bash per Windows attenzione al path conversion di MSYS: con `-subj "/CN=..."` il percorso può essere riscritto (per esempio in `/C:/Program Files/Git/CN=...`); se accade, usa `MSYS2_ARG_CONV_EXCL='*'` prima del comando.

## Server che richiede il certificato client

Nginx:

```nginx
server {
    listen 443 ssl;
    server_name interno.example.com;

    ssl_certificate     /etc/ssl/certs/server-fullchain.pem;
    ssl_certificate_key /etc/ssl/private/server.key;

    ssl_client_certificate /etc/ssl/certs/ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    location / {
        proxy_pass http://app:8080;
        proxy_set_header X-Client-DN $ssl_client_s_dn;
        proxy_set_header X-Client-Verify $ssl_client_verify;
    }
}
```

`ssl_client_certificate` è la CA di fiducia per i client, non il loro certificato. Con `ssl_verify_depth` limiti la catena accettata. L'applicazione riceve il DN del client in un header e deve trattarlo come qualsiasi input non fidato: è sicuro solo perché il proxy lo imposta dopo una verifica TLS andata a buon fine, e solo se l'app è raggiungibile esclusivamente dal proxy.

## Verificare lato client

```bash
curl -v --cert client.crt --key client.key --cacert ca.crt https://interno.example.com/
```

In `curl -v` cerca `SSL certificate verify ok` e la sezione con il certificato client. Se il server non è d'accordo, il fallimento tipico è `400 No required SSL certificate was sent` (Nginx) o un alert TLS `bad_certificate` / `unknown_ca`.

## Rotazione delle credenziali

I certificati scadono, le chiavi possono essere compromesse. Regole operative:

- **doppia chiave durante il passaggio**: emetti il nuovo certificato client prima di revocare il vecchio, e accetta entrambe le CA per la finestra di migrazione;
- **fornisci l'overlap**: il client deve poter usare la nuova coppia cert/chiave mentre il vecchio è ancora valido, e solo dopo qualche ora / giorno rimuovi il vecchio;
- **certificati a breve scadenza**: per i workload interni certificate da 24-90 ore riducono la finestra di esposizione, ma servono automazione e monitoring;
- **rotazione della chiave privata con la stessa frequenza del certificato**: ruotare solo il certificato riciclando la chiave non riduce il rischio;
- **CA radice a vita lunga e protetta**: la radice della CA privata va tenuta offline o in un sistema di firma dedicato, con accesso ristretto.

## Revoca: come farla funzionare

Dopo una compromissione la domanda è: "come impedisco al certificato rubato di funzionare?". Le strade:

- **CRL**: lista firmata di certificati revocati, con `cRLDistributionPoints` nel certificato. Semplice, ma OpenSSL/Nginx la controlla solo se configuri `ssl_crl`; senza, la revoca non ha effetto.
- **OCSP**: il client chiede lo stato a un responder, con problemi di privacy (il responder vede chi contatta chi) e latenza; `OCSP stapling` alleggerisce.
- **Scadenza breve**: con certificati da poche ore la finestra di esposizione è piccola. È il modello dominante tra i servizi interni.
- **Revoca lato applicazione**: stato "certificato accettato" mantenuto per fingerprint o serial; utile quando CRL/OCSP sono scomodi.

In pratica, per mTLS interno la strategia più affidabile è **certificati brevi + revoca CRL come rete di sicurezza + monitoring delle scadenze**, con allarmi a 30, 7 e 1 giorno.

## Sicurezza operativa

- **La chiave privata del client vale una password**: file con permessi `600`, oppure HSM o secret manager.
- **Non includere la chiave nel repository**: solo certificati e CA nei repository; le chiavi in secret manager o variabili CI protette.
- **Segmenta il traffico**: mTLS non impedisce a un client autorizzato di accedere a ciò che non dovrebbe, quindi aggiungi autorizzazioni per ruolo (per esempio un proxy che mappa DN o OID in un ruolo).
- **Monitoring**: logga DN, issuer, serial e scadenza; un errore di revoca o una CA sbagliata blocca tutti i client insieme.
- **Mantieni TLS 1.2/1.3** anche in mTLS: renegotiation e cert client deboli restano un rischio.
- **Non disattivare la verifica** (`ssl_verify_client off`) "temporaneamente": un test di CI deve controllare che il server rifiuti un client senza certificato.

## Errori comuni

- **Usare come CA dei client il certificato del server** o una CA con `pathlen` eccessivi.
- **Dimenticare le estensioni `clientAuth`**: tutto sembra corretto, ma il verify fallisce con messaggi poco chiari.
- **Mettere il DN del client in un header applicativo e trattarlo come fidato** quando l'endpoint dell'app è raggiungibile direttamente senza proxy.
- **Revocare senza aver verificato che Nginx stia davvero controllando la CRL**: `ssl_crl` assente significa nessuna revoca effettiva.
- **Ruotare tutti i client nello stesso momento** senza periodo di sovrapposizione: è un outage programmato.

## In sintesi

mTLS aggiunge l'autenticazione del client al TLS ordinario, usando una CA privata che verifica i certificati client. Funziona bene quando la CA, le estensioni (`clientAuth`) e il proxy sono configurati correttamente. La sicurezza operativa si gioca su chiavi protette, certificati brevi, rotazione con overlap e revoca realmente applicata; niente di questo sostituisce l'autorizzazione dell'applicazione.

## Fonti

- [RFC 8446 – TLS 1.3 (sezione sull'autenticazione client)](https://www.rfc-editor.org/rfc/rfc8446.html)
- [OWASP – Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)
