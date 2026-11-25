Sapere che cosa fa AES non basta: in produzione devi scegliere la modalità giusta, generare nonce e IV senza collisioni, derivare le chiavi da password con un numero di iterazioni difendibile e ruotare le chiavi senza rompere i dati già cifrati. Qui passi da "AES è sicuro" a "questo servizio cifra 240 MB di log al giorno e riesco a dimostrare che non perde autenticità", usando solo strumenti che puoi verificare con `openssl` e pochi byte di shell.

## Obiettivi

- Derivare chiavi AES da una password con PBKDF2 e un costo misurato.
- Scegliere tra 128 e 256 bit in base al profilo di minaccia e al costo della CPU.
- Disporre nonce e IV in modo che il riuso generi un errore, non un silenzio.
- Usare Encrypt-then-MAC quando l'ambiente non offre GCM.
- Pianificare rotazione e wrapping delle chiavi con AES Key Wrap.

## Derivare la chiave: PBKDF2, costo e verifica

Una password non è una chiave: `openssl enc` con `-pbkdf2` applica HMAC-SHA256 per N iterazioni (RFC 8018) e produce 16 o 32 byte. Il numero giusto dipende dall'hardware: OpenSSL 3 usa 10000 iterazioni di default, l'OWASP consente 600000 per PBKDF2-HMAC-SHA256. Misura il costo invece di copiare un numero.

```bash
openssl enc -aes-256-ctr -pbkdf2 -iter 600000 -pass pass:s3gr3to -in registro.txt -out registro.enc
time openssl enc -d -aes-256-ctr -pbkdf2 -iter 600000 -pass pass:s3gr3to -in registro.enc
# su un laptop Windows con OpenSSL 3.2: circa 8-9 secondi per operazione
```

Con `openssl kdf` isoli la derivazione e ottieni la chiave in hex (maiuscolo, separata da `:`, quindi va normalizzata con `tr -d ':' | tr 'A-F' 'a-f'`) senza cifrare nulla: un test la confronta con una fixture e lo stesso comando misura il costo reale delle iterazioni.

```bash
openssl kdf -keylen 32 -kdfopt digest:SHA256 -kdfopt pass:s3gr3to \
  -kdfopt salt:0011223344556677 -kdfopt iter:600000 PBKDF2 | head -1
# 600000 iterazioni: ~4,8 s; 10000 iterazioni: ~0,5 s sullo stesso host
```

Il sale deve essere casuale per ogni file (`openssl rand -hex 8` basta per evitare rainbow table), e va conservato accanto al ciphertext. Per nuovi sistemi valuta Argon2id (RFC 9106), che resiste meglio alle GPU: OpenSSL non lo implementa, quindi lo script dovrà fare i conti con il formato specifico del tool che scegli.

## Scegliere la modalità e difendersi dal riuso

| Scenario | Scelta | Perché |
| --- | --- | --- |
| TLS 1.3, servizio HTTP | AES-128-GCM | AEAD, accelerato dalla CPU |
| archivio cifrato di lunga durata | AES-256-GCM | margine post-quantistico, 256 bit |
| file di configurazione con IV 16 byte | AES-256-CTR + HMAC | CTR accetta IV arbitrari, HMAC copre il malleamento |
| CPU senza AES-NI | ChaCha20-Poly1305 | più veloce in software |
| chiave da spedire a un server | AES Key Wrap | trasporto integro della chiave |

In CTR/GCM il nonce è l'unico elemento che non può ripetersi. La strategia che non sbaglia è un **nonce deterministico per file**: 8 byte casuali generati una volta e salvati in testa al file, più 4 byte contatore incrementato per ogni blocco di 16 byte, cioè 64 GiB prima del wrap con un contatore a 32 bit. Il nonce che passi al cifrario diventa così univoco per costruzione.

```bash
base=$(openssl rand -hex 8)            # 8 byte casuali, salvati in testa
printf '%s' "$base" > registro.nonce
head -c 65536 /dev/urandom > blocco64k.bin
openssl enc -aes-256-ctr -K "$(cat master.key | xxd -p -c 64)" \
  -iv "${base}00000000" -in blocco64k.bin -out blocco64k.part
```

Se il tool che usi non ti lascia disporre del nonce, `openssl enc` offre GCM ma senza protezione dal riuso: il controllo deve stare nell'applicazione, che deve rifiutarsi di cifrare due volte con lo stesso nonce.

## Integrità e rotazione delle chiavi

Quando la modalità non è AEAD, il MAC va calcolato sul ciphertext con una chiave **diversa** da quella di cifratura (Encrypt-then-MAC). Il comando sotto usa `openssl dgst` e il modulo `openssl mac`.

```bash
openssl rand -hex 32 > enc.key
openssl rand -hex 32 > mac.key
openssl enc -aes-256-ctr -K "$(cat enc.key)" -iv 00112233445566778899aabbccddeeff \
  -in blocco64k.bin -out blocco64k.enc
openssl mac -digest SHA256 -macopt hexkey:"$(cat mac.key)" -in blocco64k.enc HMAC
# in produzione: confronto a tempo costante del tag ricalcolato sul ciphertext ricevuto
```

La rotazione si gestisce con un **envelope**: una master key (KEK) cifra le chiavi di dati (DEK) con AES Key Wrap; per ruotare si riscrive l'header solo, senza toccare i volumi cifrati. Ogni record porta l'identificativo della DEK, così una decifratura fallisce con un errore esplicito se non trova la chiave giusta.

| Componente | Vita | Dove vive | Rotazione |
| --- | --- | --- | --- |
| KEK | 1–3 anni | KMS, HSM, file con permessi 0600 | riesegue il wrap delle DEK |
| DEK | per file o per periodo | header cifrato del dato | nuova DEK per nuovi file |
| Password | regolata dall'utente | memoria dell'utente | nuova derivazione PBKDF2 |
| Nonce/IV | per messaggio | in testa al messaggio | mai riusato |

Per la password di un archivio a lungo termine non c'è rotazione possibile se la password è dimenticata e solo l'utente la possiede: l'archivio va accompagnato da una copia della DEK sotto una chiave di recovery, altrimenti "rotazione" diventa "perdita dei dati".

## Errori comuni

- **Contare su `-k` o su `-pass pass:` per sicurezza**: la passphrase finisce nella history della shell e nei processi (`ps`); usa `-pass file:` con un file in `/dev/shm` o un password manager.
- **Salvare il sale insieme allo script invece che con il file**: due file con la stessa password diventano correlati e le rainbow table tornano utili.
- **Usare `-iter 10000` senza misurarlo**: sono circa 0,5 s sull'host di misura, un quarto di secondo in meno del necessario per rendere un attacco a dizionario abbastanza caro; 600000 richiedono invece 4–5 secondi per operazione, quindi valuta il caso d'uso prima di alzare il numero.
- **Decifrare prima di verificare il tag**: se il MAC è Encrypt-then-MAC, il tag si verifica su ciphertext prima di qualunque operazione di plaintext.
- **Ruotare sostituendo la master key senza riscrivere i wrap**: i dati vecchi diventano irrecuperabili e ci si accorge solo al primo restore.

## In sintesi

Usare AES bene è soprattutto gestire parametri: iterazioni della KDF misurate e non copiate, nonce che non si ripetono per costruzione, MAC separato quando GCM non è disponibile, envelope con KEK e DEK per poter ruotare senza riscrivere i dati. Ogni scelta si può provare in locale con `openssl enc`, `openssl mac` e `openssl kdf`, e la lezione successiva mette tutto insieme in un archivio cifrato con verifica del tag e test di riuso del nonce.

## Fonti

- [RFC 8018 — PKCS #5: Password-Based Cryptography Specification v2.1](https://www.rfc-editor.org/rfc/rfc8018)
- [NIST SP 800-38D — GCM and GMAC](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [RFC 3394 — Advanced Encryption Standard (AES) Key Wrap Algorithm](https://www.rfc-editor.org/rfc/rfc3394)
- [RFC 9106 — Argon2 Memory-Hard Function](https://www.rfc-editor.org/rfc/rfc9106)
