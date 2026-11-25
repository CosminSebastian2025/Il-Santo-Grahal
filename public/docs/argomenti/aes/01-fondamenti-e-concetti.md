AES (Advanced Encryption Standard) è il cifrario a blocchi standardizzato dal NIST nel 2001 che cifra quasi tutto il traffico web, i dischi, i file di backup e le sessioni TLS 1.3 con cipher `AES_128_GCM` o `AES_256_GCM`. Non è una funzione magica: è una permutazione reversibile su blocchi di 16 byte pilotata da una chiave, e quasi tutte le vulnerabilità che lo riguardano nascono da come viene usato, non dall'algoritmo. In questa lezione smonti AES nelle sue parti verificabili, poi impari a leggere gli errori che produce quando la modalità è sbagliata.

## Obiettivi

- Descrivere lo stato AES di 16 byte e i quattro passaggi per round.
- Distinguere le varianti con chiave a 128, 192 e 256 bit e il costo in round.
- Scegliere tra le modalità di FIPS 197 e quelle con autenticazione (GCM, CCM).
- Usare `openssl enc` e `openssl dgst` per produrre vettori di test e verifiche.
- Riconoscere ECB, nonce riusati e padding mancante come difetti di progettazione.

## Lo stato, i round e le varianti

AES lavora su uno **stato** di 16 byte predisposto in una matrice 4×4 (column-major). Ogni round applica in sequenza `SubBytes`, `ShiftRows`, `MixColumns` e `AddRoundKey`; l'ultimo round salta `MixColumns`. La chiave si espande nella key schedule e ogni round consuma una porzione di round key. `SubBytes` è una sostituzione byte per byte (la S-box, costruita sull'inverso nel campo GF(2^8)), `ShiftRows` ruota di 0–3 posizioni le righe, `MixColumns` combina linearmente le colonne.

| Variante | Lunghezza chiave | Round | Espansione chiave |
| --- | --- | --- | --- |
| AES-128 | 16 byte | 10 | 11 round key da 16 byte |
| AES-192 | 24 byte | 12 | 13 round key |
| AES-256 | 32 byte | 14 | 15 round key |

La sicurezza aumenta poco con la chiave: AES-128 non è rotto da attacchi strutturali e i 10 round bastano per garantire ~128 bit di resistenza; AES-256 serve per scenari post-quantistici dove si vuole un margine extra su Grover. Il costo è quasi lineare nel numero di round.

```bash
# Vettore di test NIST SP 800-38A: blocco nullo, chiave 000102...0f, un blocco ECB
head -c 16 /dev/zero > zero.bin
openssl enc -aes-128-ecb -K 000102030405060708090a0b0c0d0e0f -nopad -in zero.bin | xxd -p -c 32
# output: c6a13b37878f5b826f4f8162a1c8d879
```

Quel ciphertext è il primo blocco di esempio di FIPS 197 e del NIST SP 800-38A: confrontarlo con la tua implementazione è il test minimo per verificare di aver capito lo stato, e costa un comando.

## Modalità operative: CBC, CTR, GCM

AES cifra un blocco solo; per cifrare un flusso di byte serve una **modalità operativa**, definita nel NIST SP 800-38A e nelle estensioni autenticate.

| Modalità | IV/Nonce | Integrità | Note pratiche |
| --- | --- | --- | --- |
| ECB | nessuno | nessuna | due blocchi uguali danno ciphertext uguali: mai usare |
| CBC | 16 byte IV | nessuna | richiede padding PKCS#7 e un MAC esterno |
| CTR | 16 byte nonce+counter | nessuna | trasforma AES in un cifrario di flusso |
| GCM | 12 byte nonce consigliati | Tag 128 bit | AEAD, raccomandato in TLS 1.3 |
| CCM | 7–13 byte nonce | Tag 64–128 bit | preferito su embedded per footprint |

CBC senza MAC è malleabile: chi può riscrivere byte del ciphertext modifica il plaintext del blocco successivo in modo prevedibile. GCM (NIST SP 800-38D) risolve il problema autenticando header e ciphertext e producendo un tag di 128 bit, ma introduce un vincolo assoluto: **il nonce con una data chiave si usa una volta sola**. Riusare un nonce GCM permette di recuperare l'autenticatore e, con due messaggi noti, la chiave di hash; è l'errore più grave che si possa fare con AES.

```bash
# IV deterministico: utile per riprodurre un vettore CBC di SP 800-38A
head -c 16 /dev/zero > blocco0.bin
openssl enc -aes-128-cbc -K 2b7e151628aed2a6abf7158809cf4f3c \
  -iv 000102030405060708090a0b0c0d0e0f -nopad -in blocco0.bin | xxd -p -c 32
# output: 50fe67cc996d32b6da0937e99bafec60
```

Il ciphertext dipende dall'IV: cambia l'IV e cambia il primo blocco, quindi due invii dello stesso messaggio non sono distinguibili. IV deterministico nei test, IV casuale in produzione. Per generare IV e nonce serve un CSPRNG: `openssl rand -hex 12` produce 12 byte per un nonce GCM, `openssl rand -base64 16` un IV da 16 byte per CBC.

## Dove AES si incontra davvero

Accelerazione hardware (AES-NI dal 2010 circa sugli x86, ARMv8 Crypto Extensions) rende AES-GCM più veloce di ChaCha20 in quasi tutti i server, ma su CPU piccole e vecchie — microcontrollori, telefoni di fascia bassa — l'accelerazione manca o costa energia. Per questo TLS 1.3 definisce sia `TLS_AES_128_GCM_SHA256` sia `TLS_CHACHA20_POLY1305_SHA256` (RFC 8446) e i client mobili scelgono il secondo quando la CPU non è un punto di forza.

Le chiavi stesse vengono spesso protette con AES: Key Wrap (RFC 3394) è esposto da OpenSSL come cifrario `aes-256-wrap` e serve a trasportare una chiave di sessione sotto una master key senza cifrarla come dato generico, e `A256CBC-HS512` (RFC 7518) resta un algoritmo diffuso nei token JWE.

```bash
# 24 byte = 16 byte di chiave + 8 di integrità: la struttura del Key Wrap
openssl enc -aes-256-wrap -K $(openssl rand -hex 32) -iv A6A6A6A6A6A6A6A6 -in blocco0.bin | wc -c
```

## Errori comuni

- **Usare ECB per cose con struttura**: cifra con ECB un'immagine con aree uniformi e vedrai i contorni; è per questo che ECB non compare in nessuna raccomandazione moderna.
- **Riusare il nonce GCM**: non genera un avviso, cifra e decifra correttamente, ma rompe la confidenzialità e l'integrità su due messaggi. Conta i nonce con un contatore persistente o genera 12 byte casuali sapendo che la probabilità di collisione diventa concreta intorno ai 2^32 messaggi.
- **Aggiungere un MAC calcolato su plaintext e ciphertext**: encrypt-then-MAC va fatto sul ciphertext con chiavi separate (RFC 5116 raccomanda AEAD invece).
- **Derivare la chiave da una password con `-k`**: `openssl enc -pass pass:...` usa PBKDF2 (RFC 8018) ma l'iterazione predefinita in OpenSSL 3 è 10000: specifica `-iter 600000` o superiore.
- **Fidarsi del padding PKCS#7 per l'autenticità**: il padding oracle di CBC è una classe di attacchi ancora viva nei sistemi legacy.

## In sintesi

AES è una permutazione su 16 byte con 10, 12 o 14 round, e la sua robustezza dipende interamente dalla modalità: AEAD con nonce unico è la scelta corretta, CBC solo con un MAC separato, ECB mai. I vettori di test ufficiali ti danno un modo oggettivo per verificare che l'implementazione o la configurazione faccia quello che credi. Nella prossima lezione metterai questi concetti in un servizio reale, dove la gestione di chiavi e nonce diventa codice.

## Fonti

- [NIST FIPS 197 — Advanced Encryption Standard](https://csrc.nist.gov/pubs/fips/197/final)
- [NIST SP 800-38A — Recommendation for Block Cipher Modes of Operation](https://csrc.nist.gov/pubs/sp/800/38/a/final)
- [NIST SP 800-38D — Galois/Counter Mode (GCM) and GMAC](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [RFC 5116 — An Interface and Algorithms for Authenticated Encryption](https://www.rfc-editor.org/rfc/rfc5116)
