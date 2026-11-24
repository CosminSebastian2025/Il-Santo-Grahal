La cifratura simmetrica usa la stessa chiave per cifrare e decifrare, ed è il motore dei protocolli reali: in TLS il traffico applicativo viaggia con AES-GCM o ChaCha20-Poly1305. Usare AES è semplice, ma usarlo male è facile: modalità operative sbagliate, nonce riutilizzati o dati senza autenticazione producono vulnerabilità gravi. In questa lezione impari a usare AES in modo authenticated e a riconoscere gli errori da non fare.

## Obiettivi

- Distinguere blocco (AES) e modalità operativa (GCM, CBC).
- Capire perché serve AEAD e perché non userai mai ECB.
- Gestire il nonce di AES-GCM senza riutilizzarlo.
- Cifrare e decifrare un file con strumenti standard.
- Scegliere tra AES-GCM e ChaCha20-Poly1305 in base al contesto.

## AES e modalità operative

AES è un cifrario a **blocchi** da 128 bit con chiavi da 128, 192 o 256 bit. Da solo trasforma 16 byte in 16 byte: serve una modalità operativa per cifrare messaggi più lunghi.

- **ECB**: cifra ogni blocco indipendentemente. Non va mai usata: blocchi identici producono ciphertext identici, e con l'immagine di un pinguino si capisce il contenuto a occhio.
- **CBC**: concatena i blocchi con un IV. Non è autenticata, quindi è esposta a padding oracle e a manipolazioni bit a bit. Se non puoi evitarla, devi aggiungere un MAC correttamente (encrypt-then-MAC).
- **CTR**: trasforma AES in un cifrario a flusso. Nessuna autenticazione, sensible al riuso del nonce.
- **GCM**: CTR più GHASH, cioè **AEAD**: cifra e autentica in un'unica operazione. È la modalità di riferimento per AES.

La guideline NIST SP 800-38D disciplina GCM in dettaglio; SP 800-38A copre le modalità classiche.

## Perché AEAD

Con un cifrario non autenticato un attaccante può modificare byte del ciphertext e il destinatario non se ne accorge: la decifratura produce plaintext alterato e nessun errore. Con AEAD la decifratura fallisce se un solo bit del ciphertext o dell'header associato è cambiato. Un errore di autenticazione va trattato come "dato non fidato": non loggare il plaintext parziale, non riprovare con altre chiavi, rispondi con un errore generico.

## Il nonce: l'errore più costoso

AES-GCM richiede un nonce (IV) di 96 bit univoco per ogni chiave. Riutilizzare un nonce con la stessa chiave su **due messaggi diversi** è un attacco quasi immediato: si recupera l'XOR dei due plaintext e si è compromessa anche l'autenticazione.

Regole pratiche:

- la coppia **(chiave, nonce) non deve mai ripetersi**;
- il nonce **non è segreto**, ma va trasmesso insieme al ciphertext (o derivato in modo concordato);
- se generi il nonce a caso (consigliato), usa 96 bit: la probabilità di collisione su 2^32 messaggi con la stessa chiave resta piccola, ma oltre quella soglia conviene ruotare la chiave;
- non riportare il messaggio a chiave fissa per anni: ruota la chiave prima di raggiungere il limite di messaggi per chiave indicato dalla specifica.

Un nonce incrementale è accettabile solo se sei sicuro della persistenza del contatore: dopo un crash e un riavvio che riparte dallo stesso valore, il riuso è certo.

## Esempi con strumenti standard

Attenzione a un limite pratico: **`openssl enc` non supporta AEAD**. Se provi:

```bash
openssl enc -aes-256-gcm -pbkdf2 -iter 600000 -in documento.txt -out documento.enc
```

Ottieni:

```text
enc: AEAD ciphers not supported
```

Il comando è pensato per modalità come CBC e CTR, quindi per GCM devi usare una libreria (`EVP_AEAD_*` in C, o l'AEAD del tuo linguaggio) oppure uno strumento che faccia AEAD per default.

Per vedere perché CTR da solo non basta, cifra lo stesso testo due volte con lo stesso nonce:

```bash
printf 'abcdefghi' | openssl enc -aes-256-ctr \
  -K 000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f \
  -iv 00000000000000000000000000000000 | xxd
```

Ripeti cambiando il primo carattere (`xbcdefghi`) e confronta gli output: il primo byte cambia, tutti gli altri restano uguali. Non è un caso isolato, è la definizione di riuso del nonce, e lo stesso vale per GCM.

Uno strumento che fa AEAD per default è `age`:

```bash
age -p -o documento.age documento.txt   # cifra con passphrase (ChaCha20-Poly1305 + scrypt)
age -d -o documento.txt documento.age   # decifra
```

`age` genera un salt per file, autentica l'header e usa una KDF lenta: un buon esempio di API "giusta per default" e di formato che non permette manipolazioni silenziose.

Per un formato standard trasportabile c'è **CMS** (`openssl cms`), usato in S/MIME: cifra con AES-GCM o AES-CBC e un certificato, ma è più macchinoso ed è pensato per lo scambio di messaggi con chiave asimmetrica.

Se hai solo GNU Privacy Guard, `gpg --symmetric --cipher-algo AES256` produce un formato con integrità (CFB con MDC) e non ti espone al rischio di nonce GCM riutilizzato.

## AES-GCM o ChaCha20-Poly1305?

- **AES-GCM**: hardware dedicato (AES-NI) su CPU moderne, molto veloce su server e desktop.
- **ChaCha20-Poly1305**: veloce anche su CPU senza accelerazione AES (dispositivi mobili, embedded) e resistente a certe analisi cache-based.
- Entrambi sono AEAD e sicuri se usati correttamente. In TLS la scelta spesso è delegata al client.

Per dati "a riposo" (file, database) l'algoritmo conta meno della gestione della chiave: chi può leggere la chiave può decifrare tutto. Vedi la gestione delle chiavi nella lezione sulle firme e sulle chiavi asimmetriche.

## Errori comuni

- **Usare ECB** per file o database.
- **Usare CBC senza MAC** e chiamarlo "cifrato": il dato non è autenticato.
- **Generare un nonce uguale per tutti i messaggi** (per esempio lo stesso IV per tutti i file).
- **Confondere IV e salt**: in `openssl enc` il `-salt` serve alla derivazione della password, in GCM il nonce è un'altra cosa.
- **Chiamare "cifratura" l'hash di una password**: sono due problemi diversi.
- **Scrivere una modalità di cifratura propria**: non farlo, e non combinare a mano blocchi e MAC.

## In sintesi

AES con GCM (o ChaCha20-Poly1305) è la scelta giusta: AEAD, nonce mai riutilizzato con la stessa chiave, errori di autenticazione trattati come dati non fidati. La derivazione delle chiavi da password usa KDF lente (PBKDF2, Argon2, scrypt). Non c'è nessun motivo di scrivere cifrari propri: usa API standard e testa il "nonce reuse" come bug di sicurezza.

## Fonti

- [NIST SP 800-38D – GCM and GMAC](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [OWASP – Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
