In questo laboratorio costruisci `ca-lab`, una piccola autorità di certificazione RSA con una radice e un certificato foglia per `api.lab.test`, e la usi per due scopi: verificare una catena come fa un client TLS e firmare un artefatto di build con RSA-PSS. Non è un esercizio teorico: i comandi sono gli stessi che usi per una CA di test in CI, e ogni passaggio produce un file che puoi ispezionare con `openssl x509` o `openssl asn1parse`. La parte finale è la diagnosi degli errori che si vedono in produzione.

## Obiettivi

- Creare una radice RSA-3072 con vincoli `CA:TRUE` e chiave protetta.
- Emettere un foglia con SAN, keyUsage e EKU corretti.
- Verificare la catena con `openssl verify` e assemblare un bundle server.
- Firmare un artefatto con RSA-PSS e verificarlo con la sola chiave pubblica.
- Riconoscere e correggere i fallimenti di verifica più comuni.

## Passo 1: la radice

Una radice si genera una volta e si protegge: la sua chiave privata deve stare offline o in un secret store, mai nel repository. Qui la teniamo su disco per il laboratorio, con passphrase.

```bash
mkdir -p ~/lab-rsa && cd ~/lab-rsa
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -aes-256-cbc \
  -pass pass:radice -out ca.key
openssl pkey -in ca.key -passin pass:radice -noout -text | head -1
# Private-Key: (3072 bit, 2 primes)
MSYS_NO_PATHCONV=1 openssl req -x509 -new -key ca.key -passin pass:radice \
  -subj "/C=IT/O=Grahal Lab/CN=Grahal Root CA" -days 3650 \
  -addext "basicConstraints=critical,CA:TRUE" \
  -addext "keyUsage=critical,keyCertSign,cRLSign" \
  -addext "subjectKeyIdentifier=hash" -out ca.crt
```

`-days 3650` è volutamente lungo per una radice: la sua scadenza non si rinnova, si sostituisce con una nuova radice distribuita nei trust store. Su Windows con Git Bash `openssl req -x509` applica la conversione dei path di MSYS (`/C=IT` diventa `C:/Program Files/Git/C=IT`), quindi anteponi `MSYS_NO_PATHCONV=1` o usa uno `.cnf` esterno.

Verifica subito che la radice abbia i vincoli giusti: senza `CA:TRUE` critico le librerie rifiutano di usarla per firmare certificati.

```bash
openssl x509 -in ca.crt -noout -text | sed -n '/X509v3 extensions/,/Signature Algorithm/p'
```

## Passo 2: la foglia

La chiave del server può essere più corta della radice: 2048 bit bastano per un certificato a 90 giorni, e la verifica con `e = 65537` resta veloce. Il CSR viene firmato dalla radice con un file di estensioni esplicito, perché `openssl x509 -req` senza `-extfile` produce un certificato senza SAN e i browser lo rifiutano.

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out leaf.key
openssl req -new -key leaf.key -subj "/C=IT/O=Grahal Lab/CN=api.lab.test" -out leaf.csr
cat > leaf.ext <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:api.lab.test,DNS:localhost
EOF
openssl x509 -req -in leaf.csr -CA ca.crt -CAkey ca.key -passin pass:radice \
  -CAcreateserial -days 90 -extfile leaf.ext -out leaf.crt
openssl verify -CAfile ca.crt leaf.crt     # leaf.crt: OK
```

`keyEncipherment` serve solo con cifrari RSA key transport di TLS 1.2; con TLS 1.3 e ECDHE è `digitalSignature` che viene usato nel `CertificateVerify`, ma la maggior parte dei client legacy richiede ancora il primo. Il bundle che un server deve presentare è `leaf.crt` seguito da `ca.crt`, in quest'ordine: la radice non va inclusa nella catena inviata, il client la conosce già.

| Errore di verifica | Causa | Correzione |
| --- | --- | --- |
| `error 20 ... unable to get local issuer certificate` | manca la CA intermedia nel bundle | concatenare leaf e intermedie |
| `error 10 ... certificate has expired` | `-days` troppo corto o orologio sbagliato | rinnovare, controllare NTP |
| `error 62 ... hostname mismatch` | SAN assente o su un altro nome | aggiungere il SAN corretto |
| `error 7 ... certificate signature failure` | byte alterati o chiave di firma diversa | rigenerare il certificato |
| `error 26 ... unsupported certificate purpose` | EKU diverso da `serverAuth` | rigenerare con `-extfile` |
| `error 19 ... self-signed certificate in certificate chain` | radice inclusa nel bundle inviato | togliere la radice dalla catena |

I codici numerici restano stabili tra versioni di OpenSSL, mentre il testo può cambiare: negli script controlla l'exit code, non il messaggio.

## Passo 3: firma di un artefatto con RSA-PSS

Simula una release: costruisci un archivio, calcola la hash, firma la hash con RSA-PSS e verifica con la sola chiave pubblica come farebbe un utente che scarica.

```bash
mkdir -p src && printf 'versione 1.0\n' > src/VERSION
tar -czf build.tar.gz src
sha256sum build.tar.gz | awk '{print $1"  build.tar.gz"}' > build.sha256
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -pass pass:build -aes-256-cbc -out build.key
openssl pkey -in build.key -passin pass:build -pubout -out build.pub
openssl pkeyutl -sign -inkey build.key -passin pass:build -rawin -digest sha256 \
  -pkeyopt rsa_padding_mode:pss -pkeyopt rsa_pss_saltlen:32 \
  -in build.sha256 -out build.sig
wc -c < build.sig            # 384, indipendente dalla dimensione dell'archivio
openssl pkeyutl -verify -pubin -inkey build.pub -rawin -digest sha256 \
  -pkeyopt rsa_padding_mode:pss -pkeyopt rsa_pss_saltlen:32 \
  -in build.sha256 -sigfile build.sig
```

La verifica deve stampare `Signature Verified Successfully` e restituire zero. Prova gli scenari negativi: modifica un byte di `build.sha256` e la verifica fallisce; modifica `build.tar.gz` e la hash ricalcolata non coincide più con quella firmata. Con `-pkeyopt rsa_pss_saltlen:auto` il verificatore deduce la lunghezza del salt dalla firma, ma è meglio fissarla in entrambi i comandi invece di dipendere dal default del build OpenSSL installato.

```bash
printf 'versione 1.1\n' >> build.sha256
openssl pkeyutl -verify -pubin -inkey build.pub -rawin -digest sha256 \
  -pkeyopt rsa_padding_mode:pss -in build.sha256 -sigfile build.sig
# Signature Verification Failure, exit 1
```

## Passo 4: prove di rottura controllate

| Test | Comando | Esito atteso |
| --- | --- | --- |
| SAN sbagliato | `openssl verify -CAfile ca.crt -verify_hostname www.lab.test leaf.crt` | `error 62 ... hostname mismatch` |
| certificato alterato | `printf 'X' \| dd of=leaf.crt bs=1 seek=300 conv=notrunc` | `error 7 ... certificate signature failure` |
| chiave non corrispondente | usare `leaf.key` con un altro `leaf.crt` | handshake fallito |
| SHA-1 nella firma | `openssl x509 -req -sha1 ...` | rifiutato da `-auth_level 2` |
| vita oltre 398 giorni | calcolare differenza tra `-startdate` e `-enddate` | rifiutato dai browser pubblici |

```bash
openssl verify -CAfile ca.crt -verify_hostname www.lab.test leaf.crt
openssl x509 -in leaf.crt -noout -text | grep -E "Signature Algorithm|DNS:" | head -3
```

## Esercizi

1. Aggiungi un'intermedia: radice firma `inter.crt` con `CA:TRUE, pathlen:0`, che firma il foglia. Verifica con `-untrusted inter.crt`.
2. Sostituisci la foglia con una chiave RSA-4096 e misura con `time` il costo di 100 verifiche: la verifica dipende dalla dimensione della chiave?
3. Genera un certificato scaduto con `-not_after` o `-days 0` e mostra il messaggio esatto di `openssl verify`.
4. Crea un `openssl cnf` con una sezione `[req]` e `[v3_ca]` per non usare `-addext` e rendi il processo portabile su sistemi senza quella opzione.
5. Confronta una firma RSA-PSS di `build.sha256` con una Ed25519 su `leaf.key`: dopo quanti artefatti la differenza di tempo diventa rilevabile in un job di CI?
6. Aggiungi un controllo che rifiuti i certificati con vita oltre 398 giorni, replicando il limite dei browser pubblici.

<details>
<summary>Soluzione</summary>

1. `openssl x509 -req -in inter.csr -CA ca.crt -CAkey ca.key -extfile <(printf 'basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\n')` crea l'intermedia; il bundle del server è `leaf.crt inter.crt` e `openssl verify -CAfile ca.crt -untrusted inter.crt leaf.crt` conferma.

2. La verifica usa solo `e` e il modulo: il costo cresce con la dimensione del modulo, quindi RSA-4096 è più lento anche in verifica, non solo in firma.

3. Con `-days 0` il certificato nasce già scaduto e `openssl verify` risponde `error 10 at 0 depth lookup: certificate has expired`.

4. Le sezioni `[v3_ca]` e `[v3_leaf]` vanno indicate con `-extensions`; è il modo che funziona anche su OpenSSL 1.0.x e con versioni diverse.

5. Con 300 ms per firma RSA-3072, un job che firma 100 artefatti spende circa 30 secondi in più; Ed25519 impiega microsecondi per firma e dimezza anche le dimensioni.

6. `openssl x509 -in leaf.crt -noout -enddate` e `-startdate`, poi si confrontano in uno script: è il controllo che fanno i browser e che CA di test interne tendono a dimenticare.

</details>

## Errori comuni

- **Firmare il CSR senza `-extfile`**: OpenSSL produce un foglia senza SAN né vincoli, e la verifica fallisce su hostname o su `unsupported certificate purpose`.
- **Mettere la radice nel bundle inviato al client**: il client la considera una CA fidata ma la presenza in catena viene rifiutata da alcune librerie.
- **Usare la stessa coppia per CA e server**: chi ha la chiave del server potrebbe emettere certificati; le chiavi si separano per ruolo.
- **Verificare la firma di `build.tar.gz` invece di `build.sha256`**: va firmato il digest prodotto dal processo di build, e il verificatore deve calcolare la hash del file scaricato e controllare che coincida.
- **Contare sul CN per l'hostname**: dai RFC 6125 in poi i client guardano il SAN, e un certificato con solo CN viene rifiutato dai browser.

## In sintesi

Una CA di laboratorio si costruisce in quattro atti: radice con vincoli `CA:TRUE`, foglia con SAN e EKU espliciti, bundle `leaf + intermedie` senza la radice, verifica con `openssl verify` e `-verify_hostname`. La firma di un artefatto segue la stessa logica a due chiavi e usa RSA-PSS sul digest. Le prove di rottura controllate sono la documentazione più utile del laboratorio, perché ognuna spiega un messaggio d'errore che incontrerai davvero.

## Fonti

- [OpenSSL x509 — manuale](https://www.openssl.org/docs/manmaster/man1/openssl-x509.html)
- [OpenSSL verify — manuale](https://www.openssl.org/docs/manmaster/man1/openssl-verify.html)
- [RFC 8017 — PKCS #1 v2.2](https://www.rfc-editor.org/rfc/rfc8017)
- [RFC 5280 — Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280)
