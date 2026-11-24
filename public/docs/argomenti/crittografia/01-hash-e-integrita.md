Una funzione di hash prende un input di qualsiasi lunghezza e produce una stringa di lunghezza fissa: è lo strumento per verificare l'integrità di file, download e messaggi, e per generare identificatori stabili. Non è cifratura e non è reversibile. In questa lezione vedi come si usa SHA-2 e SHA-3, cosa significa collisione, e perché per le password serve un algoritmo diverso (con salt).

## Obiettivi

- Distinguere hashing, cifratura e encoding.
- Usare SHA-2 e SHA-3 con `sha256sum`, `shasum` e OpenSSL.
- Capire cosa sono resistenza alle collisioni e alle preimmagini.
- Usare HMAC per autenticare un messaggio con una chiave.
- Scegliere l'algoritmo giusto per un file scaricato e per una password.

## Tre cose che non sono la stessa cosa

- **Encoding** (Base64, URL-encoding, UTF-8): trasformazione reversibile per trasportare dati. Non protegge nulla.
- **Cifratura** (AES, RSA): reversibile con la chiave. Nasconde il contenuto.
- **Hashing**: irreversibile, senza chiave, produce un digest di lunghezza fissa. Serve per confrontare contenuti.

Base64 non protegge nulla: chiunque lo decodifica in un secondo. Per verificare l'integrità usi un hash; per la riservatezza, la cifratura.

## Cosa deve garantire un hash crittografico

- **Resistenza alle preimmagini**: dato un digest, non si può risalire all'input.
- **Resistenza alla seconda preimmagine**: dato un input, non si trova un altro input con lo stesso digest.
- **Resistenza alle collisioni**: non si trovano due input diversi con lo stesso digest (con una probabilità migliore di un attacco generico).

Il "paradosso del compleanno" dice che una collisione su un hash di `n` bit costa circa `2^(n/2)` operazioni: per SHA-256 circa 2^128, irraggiungibile.

## Algoritmi utili e algoritmi da evitare

- **SHA-256 e SHA-512** (FIPS 180-4): base della crittografia moderna, ancora validi.
- **SHA3-256, SHA3-512** (FIPS 202): costruzione Keccak, alternativa a SHA-2; le due famiglie possono convivere.
- **SHA-1**: rotto per le collisioni (SHAttered, 2017). Mai per firme o certificati.
- **MD5**: totalmente rotto. Alcuni sistemi lo usano ancora per checksum di integrità non crittografica; non va bene per la sicurezza.

## Hash non sono per le password

Per memorizzare password serve un algoritmo lento e parametrizzabile: **Argon2id** (raccomandato), **scrypt** o **bcrypt**. Ognuno:

- è lento per progetti (costa memoria o CPU) e quindi rende il brute force costoso;
- usa un **salt** unico e casuale per ogni utente, così due utenti con la stessa password hanno hash diversi e le rainbow table non funzionano;
- Argon2id va calibrato con memoria, iterazioni e parallelismo in base all'hardware di produzione.

Non concatenare mai il salt "a mano" a stringhe di hash generiche: usa la libreria standard della tua piattaforma (per esempio `password_hash()` in PHP, `argon2` in Python, `bcrypt` in Node.js), che gestisce salt e parametri nel digest memorizzato.

## HMAC: hash con una chiave

Un hash semplice non dice chi ha prodotto il messaggio: chiunque può ricalcolarlo. **HMAC** (RFC 2104) combina un hash con una chiave segreta condivisa tra due parti: se il MAC corrisponde, chi ha costruito il messaggio conosceva la chiave. Usalo per firmare webhook, token interni o messaggi tra servizi, dopo aver verificato il MAC in tempo costante (per esempio `hmac.compare_digest` in Python).

In alternativa, se tutte le parti sono d'accordo su un formato, puoi usare una firma con chiave asimmetrica (Ed25519): la lezione sulle firme digitali spiega la differenza.

## Esempi pratici

Hash di un file:

```bash
# Linux
sha256sum scaricato.tar.gz
# macOS (sha256sum di solito non c'è)
shasum -a 256 scaricato.tar.gz
```

Output:

```text
9f2e7c...  scaricato.tar.gz
```

Su Windows PowerShell:

```powershell
Get-FileHash .\scaricato.tar.gz -Algorithm SHA256
```

Hash di una stringa con OpenSSL:

```bash
printf 'ciao' | openssl dgst -sha256
```

```text
SHA2-256(stdin)= b133a0c0e9bee3be20163d2ad31d6248db292aa6dcb1ee087a2aa50e0fc75ae2
```

Il valore è reale: qualsiasi macchina che fa SHA-256 della stringa `ciao` senza newline finale ottiene gli stessi byte. Con `echo 'ciao'` il risultato cambia, perché `echo` aggiunge `\n`: è un classico falso negativo quando si confrontano digest.

Verifica del checksum rispetto a un file pubblicato dal fornitore:

```bash
grep scaricato.tar.gz SHA256SUMS | sha256sum -c -
```

Per una release firmata con GPG, il flusso è diverso: si verifica la **firma** dei file di checksum, non il checksum preso da una pagina HTTP non protetta. Checksum e file scaricati dagli stessi server non sono una verifica di provenienza.

## Errori comuni

- **Usare MD5 o SHA-1 per certificati, firme o password**: rotti da anni.
- **Confrontare hash con `==` per autenticazione**: vulnerabile a timing attack; usa il confronto in tempo costante fornito dalla libreria.
- **Fare l'hash della password con SHA-256 "conoscendo il sale"**: è ancora troppo veloce; usa Argon2id/bcrypt/scrypt.
- **Fidarsi del checksum recuperato dallo stesso sito**: un compromesso del sito compromette entrambi.
- **Credere che l'hash cifri**: il contenuto originale resta recuperabile in un attacco dizionario se lo spazio dei valori è piccolo (per esempio PIN, date di nascita).

## In sintesi

Gli hash servono a verificare l'integrità, non a cifrare né a memorizzare password. SHA-2 e SHA-3 vanno bene per file e digest; HMAC aggiunge una chiave per autenticare messaggi; password chiuse con Argon2id/scrypt/bcrypt e salt per utente. Base64 è encoding, non sicurezza.

## Fonti

- [NIST FIPS 180-4 – Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)
- [OWASP – Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
