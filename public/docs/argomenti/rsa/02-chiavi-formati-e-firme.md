Una chiave RSA non è un numero: è un file con un formato, una protezione e una data di scadenza. In un sistema reale ti troverai a generare chiavi per certificati TLS, a verificarne l'integrità muovendoti tra PEM e DER, a diagnostificare handshake che negoziano RSA invece di ECDHE, e a firmare artefatti di build con una chiave che deve restare offline. Questa lezione collega l'aritmetica della prima parte agli strumenti che userai ogni giorno, con comandi che restituiscono informazioni verificabili.

## Obiettivi

- Generare chiavi RSA con parametri espliciti e proteggerle con una passphrase.
- Distinguere PEM testuale da DER binario e ispezionare la struttura ASN.1.
- Riconoscere il ruolo di RSA in TLS 1.3 e nei certificati X.509.
- Firmare artefatti di build e verificare una firma su un file scaricato.
- Misurare il costo di una firma e capire quando RSA non è la scelta giusta.

## Generazione, protezione e formati

`openssl genpkey` è il comando moderno; `openssl genrsa` resta per compatibilità. La differenza pratica è che `genpkey` accetta `-pkeyopt` per ogni parametro e scrive `-----BEGIN PRIVATE KEY-----` (PKCS#8, RFC 5958), mentre `genrsa` produce il formato PKCS#1 con `-----BEGIN RSA PRIVATE KEY-----`. I programmi moderni leggono entrambi, i parse fatti a mano no.

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out chiave.pem
openssl pkey -in chiave.pem -pubout -out chiave.pub
openssl pkey -in chiave.pem -aes-256-cbc -passout pass:changeme -out chiave.protetta.pem
head -1 chiave.protetta.pem      # -----BEGIN ENCRYPTED PRIVATE KEY-----
openssl pkey -in chiave.protetta.pem -passin pass:changeme -noout -text | head -1
```

`openssl pkey` è il coltellino che converte tra formati: `-pubout` estrae la pubblica, `-outform DER` produce il binario, `-text -noout` stampa i parametri. Il DER di una chiave privata RSA da 3072 bit è un `SEQUENCE` con versione, `rsaEncryption`, un `OCTET STRING` che contiene la struttura PKCS#1 e un `[0]` con gli attributi.

```bash
openssl pkey -in chiave.pem -outform DER -out chiave.der
openssl asn1parse -in chiave.der -inform DER | head -6
# 0:d=0 SEQUENCE
# 4:d=1 prim: INTEGER :00              versione PKCS#8
# 7:d=1 SEQUENCE ... rsaEncryption
# 22:d=1 OCTET STRING [HEX DUMP]       la chiave PKCS#1 dentro
```

Un PEM è solo Base64 `-----BEGIN/END` di quel DER. Se hai un blob pubblicato a mano, `openssl pkey -pubin -noout -text` ti dice se è davvero una chiave pubblica e di che tipo, senza provare ad aprirla.

## RSA in TLS e nei certificati

In TLS 1.3 RSA **non fa più key exchange**: lo scambio di chiavi usa gruppi ellittici (X25519, P-256) o FFDHE, e RSA serve solo per la firma nel messaggio `CertificateVerify` o per autenticare il certificato del server. Un certificato con chiave RSA può comunque essere usato con ECDHE, ed è la configurazione più comune sui server esistenti.

| Ruolo in TLS 1.3 | Algoritmo | Dove si vede |
| --- | --- | --- |
| scambio chiavi | X25519 o P-256 | `ServerHello.key_share` |
| autenticazione server | RSA-PSS (o ECDSA) | `CertificateVerify` |
| firma del certificato | RSA PKCS#1 v1.5 (o PSS) | campo `signatureAlgorithm` del certificato |
| cifratura applicativa | AES-GCM o ChaCha20 | cipher suite negoziata |

Per vedere cosa negozia davvero un endpoint:

```bash
openssl s_client -connect example.com:443 -tls1_3 -brief </dev/null 2>&1 | head -8
openssl s_client -connect example.com:443 -showcerts </dev/null 2>/dev/null \
  | openssl x509 -noout -text | grep -E "Public Key Algorithm|Public-Key|Signature Algorithm" | head -4
```

Se l'handshake fallisce con un server che accetta solo cipher RSA (TLS 1.2 legacy), il messaggio di errore è spesso `no shared cipher` o `sslv3 alert handshake failure`: è il segnale che dall'altra parte c'è una configurazione da aggiornare, non che il client sia rotto.

## Firmare artefatti e verificare download

Il caso d'uso più diffuso di RSA oggi è la firma di pacchetti: un file `SHA256SUMS` firmato con RSA-PSS, una release firmata, un token JWT con `RS256` (RSA + SHA-256 su PKCS#1 v1.5). Il flusso è sempre lo stesso: hash del file, firma del digest, distribuzione della chiave pubblica via canale separato.

```bash
sha256sum archivio.tar.gz > archivio.sha256
openssl dgst -sha256 -sign chiave.pem -out archivio.sig archivio.sha256
# sul client, con solo chiave.pub:
sha256sum -c archivio.sha256
openssl dgst -sha256 -verify chiave.pub -signature archivio.sig archivio.sha256
```

La riga che conta è la seconda: senza `Verified OK` la hash restituisce un codice diverso da zero e lo script deve fermarsi. Il verificatore deve fissare la chiave pubblica nel repository (`curl` da un URL variabile sarebbe un attacco di sostituzione). Per proteggere la chiave privata in CI usa un secret del runner, mai una copia nel repository, e ruota la chiave se il runner è condiviso.

## Costo e scelta dell'algoritmo

Misurare serve per decidere. Su una macchina Windows con OpenSSL 3.2 dieci operazioni di firma RSA-3072 con `openssl dgst -sign` richiedono circa 3,3 secondi, cioè oltre 300 ms per firma; Ed25519 impiega 64 byte per firma invece di 384. Per un server che firma token a ogni richiesta questo conta; per un job che firma dieci artefatti al giorno no.

| Vincolo | Scelta |
| --- | --- |
| interoperabilità con sistemi legacy | RSA-2048 o 3072, PKCS#1 v1.5 in verifica |
| nuovi protocolli, firme di dati | RSA-PSS o Ed25519 |
| milioni di firme | Ed25519 |
| chiavi in HSM con solo RSA | RSA-3072 con PSS |

## Errori comuni

- **Generare con `openssl genrsa 2048` e chiamarlo "sicuro"**: funziona, ma perde i controlli di `genpkey` e produce un formato legacy; la lunghezza va scelta in base alla vita dei dati.
- **Distribuire la chiave privata per firmare su ogni macchina**: la chiave privata firma, la pubblica verifica; se serve firmare ovunque, l'architettura è sbagliata.
- **Verificare solo la hash e non la firma**: la hash di accompagnamento può essere modificata insieme al file se non è firmata.
- **Leggere l'esito di `openssl dgst -verify` dal testo invece del codice di uscita**: negli script serve `if ! openssl dgst ... ; then exit 1; fi`.
- **Confondere `-pubout` con la conversione di formato**: `-pubout` estrae la chiave pubblica, non protegge né converte; per il DER serve `-outform DER`.

## In sintesi

RSA in pratica è formato e processo: PKCS#8 protetto con passphrase, DER ispezionabile con `asn1parse`, ruolo di firma dentro TLS 1.3, firma di hash distribuite con la pubblica su un canale separato. Il costo per firma è alto rispetto alle curve, quindi la scelta passa dai requisiti di interoperabilità prima che dalle preferenze. Il laboratorio successivo costruisce una CA di test e verifica una catena di certificati con chiavi RSA.

## Fonti

- [OpenSSL genpkey — manuale](https://www.openssl.org/docs/manmaster/man1/openssl-genpkey.html)
- [OpenSSL pkey — manuale](https://www.openssl.org/docs/manmaster/man1/openssl-pkey.html)
- [RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [RFC 5958 — Asymmetric Key Packages](https://www.rfc-editor.org/rfc/rfc5958)
