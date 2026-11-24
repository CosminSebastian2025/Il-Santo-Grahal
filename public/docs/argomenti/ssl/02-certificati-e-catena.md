Un certificato è un documento firmato che lega una chiave pubblica a un nome. Il client non deve conoscere in anticipo ogni sito: conosce una manciata di radici fidate e verifica il resto attraverso la catena. Qui vedi com'è fatto un certificato X.509, come si costruisce la catena e come si legge un errore di verifica senza aggirarlo.

## Obiettivi

- Descrivere i campi principali di un certificato X.509.
- Ricostruire la catena foglia → intermedia → radice e spiegare perché la radice è fidata.
- Distinguere `CN` e `SAN` e spiegare perché `SAN` conta.
- Sapere cosa sono scadenza, revoca (CRL/OCSP) e CAA.

## Anatomia di un certificato X.509

```text
Certificate:
    Data:
        Version: 3 (0x2)
        Serial Number: 01:ee:e6:aa:bb:52:1d:5e:14:fc:31:5f:d9:98:56:90
        Signature Algorithm: ecdsa-with-SHA256
        Issuer: C=US, O=SSL Corporation, CN=Cloudflare TLS Issuing ECC CA 3
        Validity
            Not Before: Sep 26 22:49:11 2026 GMT
            Not After : Dec 25 22:56:35 2026 GMT
        Subject: CN=example.com
        Subject Public Key Info:
            Public Key Algorithm: id-ecPublicKey
                Public-Key: (256 bit)
    X509v3 extensions:
        X509v3 Subject Alternative Name:
            DNS:example.com, DNS:*.example.com
        X509v3 Basic Constraints: critical
            CA:FALSE
        X509v3 Extended Key Usage:
            TLS Web Server Authentication, TLS Web Client Authentication
```

- **Issuer e Subject**: chi ha firmato e chi è il titolare.
- **Validity**: intervallo di validità. Scaduto è scaduto, non "quasi valido".
- **Subject Public Key Info**: la chiave pubblica che il server dimostra di possedere con la chiave privata.
- **Subject Alternative Name (`SAN`)**: i nomi per cui il certificato è valido. È questo che i client moderni confrontano, non il `CN`.
- **Basic Constraints**: `CA:TRUE` sui certificati che possono firmare altri certificati, `CA:FALSE` sulla foglia.
- **Extended Key Usage**: per cosa può essere usato (`TLS Web Server Authentication`, `TLS Web Client Authentication`).
- **Signature**: la firma dell'issuer sul contenuto, con l'algoritmo dichiarato.

Il formato è definito dalla RFC 5280, che estende X.509 v3.

## La catena di fiducia

I client non si fidano di qualsiasi certificato: solo di quelli che portano a una **radice** presente nel loro trust store.

```text
[Radice CA]  (nel trust store del sistema/browser)
      | firma
[CA intermedia]  (inviata dal server insieme alla foglia)
      | firma
[Certificato foglia]  (nome del sito + chiave pubblica)
```

Il server invia normalmente **foglia + intermedie**; la radice è nel client. La verifica procede al contrario: la foglia deve essere firmata dall'intermedia, l'intermedia dalla radice, e ogni firma viene controllata con la chiave pubblica dell'emittente. In più il client controlla:

1. validità temporale di tutti i certificati della catena;
2. nome (`SAN`) corrispondente all'host contattato;
3. scopi (`EKU`) e vincoli (`Basic Constraints`, `Name Constraints`);
4. stato di revoca, se il client ha modo di consultarlo.

Se un anello manca — l'errore più frequente in produzione — il client non riesce a chiudere la catena e rifiuta.

## Autorità di certificazione e fiducia

Una CA è un'entità che firma certificati. La fiducia in una radice è una decisione altrui: sistemi operativi e browser mantengono la loro lista di radici pubbliche, le aziende possono distribuire una CA interna, i container hanno il proprio bundle (spesso `ca-certificates`). Quando un certificato non viene riconosciuto, la domanda da fare è "quale trust store sta usando *questo* client", non "il certificato funziona?".

Let's Encrypt ha cambiato il panorama rendendo la firma dei certificati automatizzabile via ACME: per i dettagli consulta la documentazione ufficiale di **Let's Encrypt**. Nessuna CA può emettere per un dominio che non controlli, ma un attaccante che **controlla** il dominio può ottenere un certificato valido: è un problema di DNS e hosting, non di TLS.

## Scadenza e revoca

Un certificato ha una validità di poche settimane o mesi per i certificati pubblici; i certificati interni possono durare più a lungo, ma sono ugualmente soggetti a scadenza. Un certificato scaduto produce un errore netto e immediato, di solito il più facile da diagnosticare: la data è nel certificato stesso.

La revoca, quando una chiave è compromessa o una CA sbaglia, si gestisce con:

- **CRL** (Certificate Revocation List): un elenco pubblicato dalla CA, consultato a intervalli;
- **OCSP**: interrogazione puntuale per un singolo certificato, con la variante **stapling**, in cui il server include nella risposta TLS la prova di non revoca firmata dalla CA;
- **must-staple**: estensione con cui il dominio dichiara che il client deve pretendere lo stapling.

Molti browser non bloccano più hard-fail su OCSP per motivi di privacy e latenza: non assumere che la revoca sia sempre consultata. Il CAA è la difesa preventiva: dice quali CA possono emettere.

## CAA: limitare chi può firmare

```bash
dig +short CAA example.com
```

Un record come `0 issue "letsencrypt.org"` significa: solo Let's Encrypt può emettere per questo dominio. Una CA che riceve una richiesta non autorizzata deve rifiutarla. È utile soprattutto per domini esposti a errori di emissione, anche quando non usi Let's Encrypt.

## Leggere un certificato in pratica

Salva la catena offerta dal server (il `sed` scarta le righe di stato di `s_client`):

```bash
echo | openssl s_client -connect example.com:443 -servername example.com -showcerts 2>/dev/null \
  | sed -n '/BEGIN CERTIFICATE/,$p' > chain.pem
```

Estrai la foglia, cioè il primo certificato del file:

```bash
awk '/BEGIN CERTIFICATE/{n++} n==1' chain.pem | awk '/BEGIN/{p=1} p{print} /END CERTIFICATE/{exit}' > leaf.pem
openssl x509 -in leaf.pem -noout -subject -issuer -dates -ext subjectAltName
```

```text
subject=CN=example.com
issuer=C=US, O=SSL Corporation, CN=Cloudflare TLS Issuing ECC CA 3
notBefore=Sep 26 22:49:11 2026 GMT
notAfter=Dec 25 22:56:35 2026 GMT
X509v3 Subject Alternative Name: 
    DNS:example.com, DNS:*.example.com
```

Il `-servername` non è cosmetico: molti server moderni presentano certificati diversi in base al nome richiesto (SNI). Ometterlo può mostrare un certificato che non corrisponde.

## Errori comuni

- **Usare `CN` come unico identificatore**: il confronto dei client moderni avviene sul `SAN`. Un certificato con `CN` giusto e `SAN` diverso viene rifiutato.
- **Dimenticare le intermedie**: il browser può averle in cache e funzionare; `curl`, `openssl` e le app mobile no. Invia sempre la catena completa, escluse le radici.
- **Confondere "radice" e "intermedia"**: la radice va nel trust store, non nel bundle del server.
- **Pensare che la revoca sia garantita**: non tutti i client la consultano. Prepara la rotazione della chiave e tieni scadenze brevi.
- **Aggravare con `-k` o disattivando la verifica**: maschera il problema e crea un canale insicuro. Se un certificato non è valido, si corregge la configurazione.

## In sintesi

- X.509 (RFC 5280) definisce certificato, campi ed estensioni; `SAN` è il vero nome del servizio.
- La fiducia si trasmette tramite la catena fino a una radice nel trust store del client.
- Scadenza e revoca (CRL/OCSP, stapling) sono verifiche separate dalla firma.
- CAA limita chi può emettere certificati per un dominio.

## Fonti

- RFC 5280 — Internet X.509 Public Key Infrastructure: https://www.rfc-editor.org/rfc/rfc5280.html
- RFC 8659 — DNS Certification Authority Authorization (CAA): https://www.rfc-editor.org/rfc/rfc8659.html
