La crittografia asimmetrica usa una coppia di chiavi: una pubblica, distribuibile liberamente, e una privata, da custodire. Serve per due scopi diversi: **firmare** (dimostrare l'origine e l'integrità di un dato) e **stabilire un segreto condiviso** (scambio di chiavi). RSA, ECDSA ed Ed25519 risolvono il primo; ECDH e X25519 il secondo. Sapere quale usare, e quale non usare più, evita molti errori architetturali.

## Obiettivi

- Distinguere firma, cifratura asimmetrica e scambio di chiavi.
- Conoscere RSA, ECDSA, Ed25519, ECDH e X25519 e i loro limiti.
- Firmare e verificare un file con OpenSSL.
- Capire come gestire e ruotare le chiavi.
- Riconoscere gli errori più comuni (padding, parametri deboli, chiavi in chiaro).

## Tre usi, non uno

- **Firma**: con la chiave privata firmi un digest; chiunque con la chiave pubblica verifica. Garantisce autenticità e integrità, non riservatezza.
- **Cifratura asimmetrica**: cifri con la chiave pubblica del destinatario; solo lui decifra con la privata. Serve per messaggi piccoli (tipicamente una chiave simmetrica).
- **Scambio di chiavi**: entrambe le parti generano coppie effimere e calcolano un segreto comune; poi cifrano il traffico con un cifrario simmetrico molto più veloce.

Per questo i protocolli reali sono **ibridi**: TLS usa lo scambio di chiavi per creare un segreto, e AES/ChaCha20-Poly1305 per i dati.

## RSA: ancora utile, ma non per tutto

RSA (RFC 8017) si basa sulla difficoltà della fattorizzazione. Punti pratici:

- Chiavi da almeno **2048 bit**; 3072 o 4096 sono comuni per CA di lunga durata. 1024 è fuori uso.
- **Padding obbligatorio**: `RSA-OAEP` per cifrare, `RSA-PSS` per firmare. `PKCS#1 v1.5` senza protezioni è la fonte storica di attacchi oracle (Bleichenbacher); va evitato anche nelle firme, dove resta solo per compatibilità.
- RSA non cifra dati lunghi: cifri una chiave AES e il resto in simmetrico.

## Curve ellittiche: ECDSA, ECDH, Ed25519, X25519

Le curve ellittiche offrono lo stesso livello di sicurezza con chiavi molto più piccole:

- **Ed25519** (firma, RFC 8032): veloce, deterministica, senza opzioni pericolose. Preferiscila per nuove firme di file, token e release.
- **ECDSA** (P-256, P-384, RFC 5480 per l'uso con TLS): firmare con ECDSA richiede un nonce segreto unico; con un generatore difettoso la chiave privata si può ricostruire. Usa solo librerie che gestiscono il nonce correttamente.
- **X25519** (scambio di chiavi): semplice da usare, resistente ai parametri invalidi; è uno dei key share predefiniti di TLS 1.3.
- **ECDH su NIST P-256**: ammesso e supportato, usato ancora in moltissimi ambienti.

Regola generale: per firmare Ed25519 se il sistema lo supporta; per key exchange X25519 o P-256. RSA resta valido dove le piattaforme non supportano le curve o dove ci sono vincoli normativi.

## Firmare e verificare con OpenSSL

Genera una coppia Ed25519:

```bash
openssl genpkey -algorithm ED25519 -out signing.key
openssl pkey -in signing.key -pubout -out signing.pub
```

Firma un file:

```bash
openssl pkeyutl -sign -inkey signing.key -rawin -in report.pdf -out report.pdf.sig
```

Verifica:

```bash
openssl pkeyutl -verify -pubin -inkey signing.pub -rawin -in report.pdf -sigfile report.pdf.sig
```

Se tutto è corretto l'output contiene:

```text
Signature Verified Successfully
```

Se il file è cambiato, anche di un byte, la verifica fallisce con `Signature Verification Failure`. Con RSA il comando cambia leggermente (`openssl dgst -sha256 -sign` / `-verify`); con `-rawin` OpenSSL fa internamente l'hash, quindi non serve passare un digest precalcolato.

## Scambio di chiavi in pratica

Lo schema di base di Diffie-Hellman con curve ellittiche:

1. Alice genera una coppia effimera `(a, A = a·G)` e manda `A`.
2. Bob genera `(b, B = b·G)` e manda `B`.
3. Entrambi calcolano `S = a·B = b·A = a·b·G`.

`S` non viaggia mai sulla rete. Con l'autenticazione (certificato e firma nel CertificateVerify di TLS) sai anche **con chi** stai parlando, cosa che DH "puro" non garantisce: senza autenticazione uno scambio con un man-in-the-middle produce due segreti diversi.

## Gestione e rotazione delle chiavi

La parte più difficile non è l'algoritmo ma il ciclo di vita delle chiavi. Indicazioni di base (la NIST SP 800-57 è il riferimento):

- **Classifica**: chiavi di firma di release, chiavi di cifratura dei dati, chiavi di CA. Finalità diverse, blocchi diversi.
- **Separazione delle funzioni**: dove possibile, firma e decifratura usano chiavi distinte, in sistemi fisicamente o logicamente separati.
- **Custodia**: chiavi private in HSM o secret manager; permessi `600`; mai nel repository, mai in log, mai in immagini Docker.
- **Validità**: periodi diversi per firma (spesso qualche anno) e per chiavi simmetriche di dati (spesso mesi/anno). Non c'è un numero "universale", ma il calcolo va documentato.
- **Rotazione** con **overlap**: pubblica la nuova chiave, firma con quella nuova, mantieni la vecchia pubblica per verificare le firme storiche, poi ritira la privata.
- **Revoca**: per certificati CRL/OCSP; per chiavi applicative una lista di revoca o un id nel key store. Documenta come si revoca *prima* di averne bisogno.
- **Protezione del backup**: le chiavi hanno backup, ma i backup vanno cifrati e li fanno poche persone.

## Errori comuni

- **Usare RSA PKCS#1 v1.5 per cifrare dati nuovi**: attacchi padding oracle.
- **Firmare "a mano"**: non costruire una firma combinando hash e crittografia; usa le primitive della libreria, che gestiscono correttamente il padding e codificano la firma nel formato giusto.
- **Riusare la coppia di chiavi per usi diversi** (firma e TLS sullo stesso certificato) quando i sistemi lo permettono di separare.
- **Generare una chiave privata senza passphrase** e copiarla via chat o email.
- **Verificare una firma senza controllare il certificato o l'identità**: una firma valida di una chiave sconosciuta non ti dice nulla di utile.
- **Rompare il processo se la chiave pubblica cambia** senza prima pubblicare e documentare il nuovo fingerprint.
- **Credere che ECDSA e Ed25519 siano sinonimi**: sono entrambi firma su curve, ma hanno schemi e requisiti diversi (ECDSA usa un nonce, Ed25519 no).

## In sintesi

Firma, cifratura asimmetrica e scambio di chiavi sono tre problemi diversi. Per firmare preferisci Ed25519, per stabilire segreti X25519/P-256, per compatibilità RSA con OAEP/PSS e almeno 2048 bit. La sicurezza reale sta nella gestione del ciclo di vita: separazione delle chiavi, HSM, rotazione con overlap e revoca documentata.

## Fonti

- [RFC 8032 – EdDSA (Ed25519 ed Ed448)](https://www.rfc-editor.org/rfc/rfc8032.html)
- [NIST SP 800-57 Part 1 Rev. 5 – Recommendation for Key Management](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final)
