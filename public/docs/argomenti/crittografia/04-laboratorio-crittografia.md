Scegliere lo strumento giusto è il vero lavoro della crittografia applicata: la stessa persona a volte deve verificare un download, a volte memorizzare una password, a volte firmare un token. Questo laboratorio mette in fila quattro casi realistici e ti fa passare da hash, password, AEAD e firme, con esercizi da eseguire e una soluzione commentata.

## Obiettivi

- Scegliere la primitiva giusta per ogni caso d'uso.
- Verificare un download con checksum e firma.
- Memorizzare password con salt e KDF lenta.
- Cifrare dati con AES-GCM gestendo il nonce.
- Firmare e verificare un artefatto con Ed25519.
- Definire un piano minimo di rotazione delle chiavi.

## Regola zero: identifica il problema

Prima di scrivere codice, rispondi a tre domande:

1. Devo **nascondere** il contenuto? → cifratura (simmetrica con chiave gestita, o asimmetrica per scambiare la chiave).
2. Devo **dimostrare** che il dato viene da una fonte e non è stato modificato? → firma o HMAC.
3. Devo solo **confrontare** o **identificare** senza recuperare il contenuto? → hash, o KDF per password.

Se la risposta a nessuna delle tre è "sì", non aggiungere crittografia: Base64 o un `toString()` non sono una soluzione di sicurezza.

## Esercizio 1 – Verificare un download

Scenario: scarichi un archivio e un file `SHA256SUMS`.

```bash
curl -fLO https://esempio.org/tool-1.0.0.tar.gz
curl -fLO https://esempio.org/SHA256SUMS
sha256sum -c SHA256SUMS --ignore-missing
```

Su macOS, `shasum -a 256 -c SHA256SUMS`. Il risultato:

```text
tool-1.0.0.tar.gz: OK
```

Domanda: questo basta? No. Se chi controlla il sito può modificare sia l'archivio sia `SHA256SUMS`, l'attaccante ricalcola il checksum. Serve una **firma** su `SHA256SUMS` verificata con una chiave pubblica già nota. Se il progetto firma con GPG, verifica la firma, non il solo checksum.

## Esercizio 2 – Password: salt e KDF lenta

Scenario: memorizzare una password utente.

Attività: valuta ogni opzione e scarta quelle che non vanno:

- `sha256(password)` → no: troppo veloce e senza salt;
- `sha256(salt + password)` → no: ancora troppo veloce (il salt non aumenta il costo);
- `md5(password)` → no;
- `bcrypt`, `scrypt`, `argon2id` con salt casuale per utente → sì.

Soluzione concettuale con un CLI di Argon2 (`argon2` del pacchetto `argon2-cffi`, o l'equivalente della tua piattaforma):

```bash
echo -n 'password-esempio' | argon2 'sale-casuale-di-16-byte' -id -t 3 -m 12 -p 1 -l 32 -r
```

Il `-m 12` indica 2^12 KiB (4 MiB) per installazione: è un valore **da laboratorio**. L'output codifica algoritmo e parametri (`$argon2id$v=19$m=4096,t=3,p=1$...`). In produzione scegli la memoria in base all'hardware (OWASP indica un minimo di 19 MiB con t=2), poi quando l'utente fa login usi la funzione di verifica della libreria, che estrae salt e parametri dal digest.

Se non puoi usare una libreria adatta, segui la documentazione della piattaforma (per esempio `password_hash` in PHP, `bcrypt`/`argon2` in Node). Non improvvisare un formato `salt:sha256`.

## Esercizio 3 – AES-GCM e nonce

Scenario: cifrare un record (per esempio un token salvato in un database) con una chiave simmetrica gestita dal servizio.

Pseudo-flusso con libreria standard (esempio in Python con `cryptography`, equivalente a quanto faresti con le primitive del tuo linguaggio):

```python
# NON in produzione così: è solo la struttura da riconoscere
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

key = AESGCM.generate_key(bit_length=256)
aes = AESGCM(key)
nonce = os.urandom(12)              # 96 bit, unico per ogni messaggio
aad = b"utente:42:campo:token"      # dati associati, autenticati ma non cifrati
ct = aes.encrypt(nonce, b"segreto", aad)
assert aes.decrypt(nonce, ct, aad) == b"segreto"
```

Il `nonce` va salvato insieme al ciphertext. L'`aad` (associated data) è il posto giusto per metadati come l'id utente: se qualcuno li sposta da un record a un altro, la decifratura fallisce.

Attività: rispondi a queste dure domande.

- Il nonce è `os.urandom(12)` a ogni chiamata? → sì, bene.
- La chiave viene ruotata prima di superare i limiti di messaggi per chiave indicati dalla spec? → va documentato.
- Cosa accade se la decifratura fallisce? → errore generico, nessun plaintext parziale, nessun retry con altre chiavi.

## Esercizio 4 – Firma Ed25519 di un artefatto

Scenario: firmi un report o una release.

```bash
openssl genpkey -algorithm ED25519 -out release.key
openssl pkey -in release.key -pubout -out release.pub
openssl pkeyutl -sign -inkey release.key -rawin -in report.pdf -out report.pdf.sig
openssl pkeyutl -verify -pubin -inkey release.pub -rawin -in report.pdf -sigfile report.pdf.sig
```

Attività:

1. Modifica un byte di `report.pdf` e riverifica: deve fallire.
2. Firma due file diversi e confronta la dimensione delle firme: un Ed25519 produce sempre 64 byte.
3. Calcola l'impronta della chiave pubblica e pubblicala insieme al progetto:

```bash
openssl pkey -pubin -in release.pub -outform DER | sha256sum
```

Chi scarica deve poter confrontare quell'impronta con una fonte nota, altrimenti una chiave pubblica falsa rende tutto inutile.

## Esercizio 5 – Piano di gestione delle chiavi

Scrivi un piano breve per un'applicazione con tre tipi di chiavi. Includi: chi possiede cosa, dove vive, ogni quanto ruota, come si revoca, come si recupera dopo un disastro.

Soluzione commentata schematica:

- **Chiave AEAD dei dati**: gestita dal secret manager, caricata in memoria all'avvio, non persistita su file; rotazione ogni 12 mesi e alla compromissione; cifratura dei backup; decifratura dei dati vecchi con la chiave precedente in sola lettura durante l'overlap.
- **Chiave di firma degli artefatti**: in HSM o sistema offline; la privata non tocca mai i server di build; pubblica con impronta documentata; rotazione ogni 2-3 anni con pubblicazione anticipata della nuova pubblica.
- **Segreto di servizio** (token API tra servizi): generato casualmente con 32 byte, distribuito tramite il secret manager, rotazione ogni 90 giorni con validità doppia durante il cambio.

Per ogni chiave aggiungi: `owner`, `storage`, `rotation`, `revocation`, `last_rotated`. Se un campo è vuoto, hai trovato un buco.

## Esercizio 6 – Scegli l'algoritmo

Per ognuno, scegli e giustifica:

1. Checksum per un file su un sito senza firma.
2. Memorizzazione password.
3. Firma di un token JWT interno.
4. Cifratura di dati a riposo in un database relazionale.

Soluzione: 1) SHA-256 (utile ma non sufficiente); 2) Argon2id con salt; 3) HMAC-SHA256 se tutte le parti sono tue, Ed25519 se serve verifica pubblica; 4) AEAD su libreria o estensione del DB (per esempio pgcrypto con `pgp_sym_encrypt` in PostgreSQL), con chiavi gestite dal secret manager e non dentro il DB.

## In sintesi

Il laboratorio riduce quattro casi alla scelta della primitiva: hash per confrontare, KDF lenta per password, AEAD per cifrare, firma per autenticare. La domanda che torna sempre è "chi possiede la chiave e come la cambi": un piano di rotazione esplicito vale più di qualsiasi scelta di algoritmo. In ogni caso mai disattivare verifiche e mai inventare primitive.

## Fonti

- [OWASP – Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP – Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
