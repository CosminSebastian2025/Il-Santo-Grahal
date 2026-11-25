RSA è il crittosistema a chiave pubblica più diffuso della storia: sta dietro a firme di documenti e artefatti software, certificati TLS emessi fino a poco tempo fa, token e protocolli legacy. La sua sicurezza si basa su un problema aritmetico semplice da enunciare — fattorizzare il prodotto di due primi grandi — e su una disciplina ferrea nell'uso del padding, perché la matematica da sola non basta: RSA "grezzo" è malleabile e deterministico. In questa lezione costruisci l'aritmetica, guardi cosa produce OpenSSL e impari a riconoscere gli usi che oggi sono da evitare.

## Obiettivi

- Ripercorrere generazione delle chiavi, cifratura e firma con l'aritmetica modulare.
- Leggere i parametri di una chiave RSA e capire cosa sono n, e, d, p, q.
- Distinguere PKCS#1 v1.5 da OAEP e da RSA-PSS.
- Generare e ispezionare una chiave con `openssl genpkey` e `openssl pkey`.
- Calcolare la dimensione massima del plaintext con OAEP e scegliere la lunghezza della chiave.

## L'aritmetica: due primi, un esponente, un inverso

RSA parte da due primi casuali `p` e `q` di circa la stessa lunghezza. Il modulo è `n = p·q`, il totiente è `φ(n) = (p-1)(q-1)` e si sceglie un esponente pubblico `e` coprimo con `φ(n)` (in pratica 65537 = 0x10001). L'esponente privato è l'inverso modulare `d = e⁻¹ mod φ(n)`, calcolato con l'algoritmo di Euclide esteso. Cifrare è `c = mᵉ mod n`, decifrare è `m = cᵈ mod n`, e il teorema di Eulero garantisce che le due operazioni si annullano per ogni `m` coprimo con `n`.

| Parametro | Ruolo | Dimensione tipica (3072 bit) | Sensibilità |
| --- | --- | --- | --- |
| n | modulo pubblico | 384 byte | pubblica |
| e | esponente pubblico | 65537 | pubblica |
| d | esponente privato | ~384 byte | riservata |
| p, q | fattori primi | 192 byte ciascuno | riservatissimi |
| dP, dQ, qInv | parametri per il CRT | ~192 byte | riservati |

La firma usa gli esponenti al contrario: si firma con `d` e si verifica con `e`, così chiunque può verificare ma solo il possessore della chiave privata può produrre la firma. Con il CRT la decifratura calcola due esponenziazioni modulari più piccole, dimezzando il costo.

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out chiave.pem
openssl pkey -in chiave.pem -pubout -out chiave.pub
openssl pkey -in chiave.pem -text -noout | sed -n '1,14p'
```

L'output mostra `Private-Key: (3072 bit, 2 primes)`, poi `modulus`, `publicExponent: 65537 (0x10001)` e gli altri parametri. Se leggessi `3 primes` significherebbe che qualcuno ha abilitato l'RSA multi-prime (`-pkeyopt rsa_keygen_primes:3`): OpenSSL lo accetta, ma è un profilo raro e va giustificato.

## Padding: dove RSA diventa sicuro

RSA grezzo è deterministico (lo stesso messaggio dà lo stesso ciphertext) e moltiplicativo: `(m₁m₂)ᵉ = m₁ᵉ·m₂ᵉ`. La soluzione è il padding (RFC 8017, PKCS#1 v2.2), che aggiunge casualità e struttura prima dell'esponenziazione.

| Uso | Schema | Sicurezza oggi | Note |
| --- | --- | --- | --- |
| cifratura | RSAES-OAEP con MGF1-SHA256 | raccomandato | plaintext massimo k − 2·hLen − 2 |
| cifratura | RSAES-PKCS1-v1_5 | sconsigliato | vulnerabile al Bleichenbacher; usato solo in legacy |
| firma | RSASSA-PSS | raccomandato | salt casuale, firma diversa ogni volta |
| firma | RSASSA-PKCS1-v1_5 | accettabile in verifica | deterministico, ancora diffuso nei certificati |
| firma | DigestInfo troncato o "raw" | mai | forgiatura per noia di implementazione |

Con OAEP la dimensione del messaggio è vincolata dal modulo. Per una chiave da 3072 bit con SHA-256 hai `k = 384`, `hLen = 32`, quindi al massimo 318 byte. Verificato con OpenSSL 3.2: 318 byte cifrano, 319 falliscono.

```bash
head -c 318 /dev/urandom > dati.bin
openssl pkeyutl -encrypt -pubin -inkey chiave.pub -in dati.bin \
  -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -out cifrato.bin
openssl pkeyutl -decrypt -inkey chiave.pem -in cifrato.bin \
  -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 | wc -c
```

Per questo RSA non cifra contenuti: cifra **chiavi**. Il pattern corretto è ibrido: una chiave AES casuale cifra i dati e RSA-OAEP (o RSA-KEM) cifra la chiave AES; è il modello del RSA key transport in TLS 1.2.

## Firme: PSS, PKCS#1 v1.5 e verifiche

```bash
printf 'contratto v1\n' > contratto.txt
openssl dgst -sha256 -sign chiave.pem -out contratto.sig contratto.txt
openssl dgst -sha256 -verify chiave.pub -signature contratto.sig contratto.txt
# Verified OK ; con un byte diverso: Verification failure
openssl pkeyutl -sign -inkey chiave.pem -rawin -digest sha256 \
  -pkeyopt rsa_padding_mode:pss -pkeyopt rsa_pss_saltlen:32 -in contratto.txt -out contratto.pss
```

Con una chiave da 3072 bit la firma occupa sempre 384 byte, qualunque sia la lunghezza del messaggio: quello che si firma è il digest, non il file. `openssl dgst -sign` produce PKCS#1 v1.5; `openssl pkeyutl` con `rsa_padding_mode:pss` produce PSS ed è la scelta per nuovi protocolli. Con PSS la firma cambia a ogni esecuzione perché il salt è casuale, mentre PKCS#1 v1.5 è deterministica: utile per test ripetibili, irrilevante per la sicurezza.

## Scegliere la lunghezza e il futuro

NIST SP 800-56B r3 consente RSA da almeno 2048 bit e ne raccomanda 3072 per dati con vita utile oltre il 2030: 2048 bit offrono circa 100 bit di sicurezza, 3072 circa 128. La verifica con `e = 65537` costa poco, la firma molto più che con Ed25519: se il componente firma milioni di artefatti, la curva è più adatta; se devi interoperare con sistemi che conoscono solo RSA, resta su RSA-PSS a 3072.

| Lunghezza | Byte della firma | Uso consigliato |
| --- | --- | --- |
| 2048 | 256 | legacy, compatibilità, chiavi entro il 2030 |
| 3072 | 384 | default per nuovi sistemi |
| 4096 | 512 | solo se richiesto da policy, costo elevato |

## Errori comuni

- **Cifrare dati con RSA grezzo o PKCS#1 v1.5**: un oracolo di padding anche parziale permette di decifrare a poco a poco.
- **Confondere firma e cifratura**: "firmare" con la chiave pubblica non autentica nulla, e "cifrare" con la chiave privata non offre confidenzialità.
- **Firmare il digest con schema sbagliato**: i verificatori tolleranti che accettano DigestInfo parziali sono una superficie d'attacco; usa PSS o PKCS#1 v1.5 con SHA-256.
- **Riusare la stessa chiave RSA per firme e cifratura senza motivo**: è comune e consentito, ma in architetture nuove separare i ruoli riduce il raggio d'azione di una chiave compromessa.
- **Salvare `p`, `q` e `d` in un file PEM senza protezione**: `-text -noout` li stampa in chiaro, e chi legge il file può ricostruire tutto.

## In sintesi

RSA trasforma la fattorizzazione in un servizio: modulo pubblico, esponente 65537, inverso privato calcolato con Euclide. La sicurezza operativa vive nel padding, quindi OAEP per cifrare chiavi e PSS per firmare; la lunghezza minima è 2048, quella consigliata 3072. Nella prossima lezione sposti l'attenzione sul modo in cui RSA sta in un protocollo reale: parametri di keygen, formati PEM/DER, TLS con certificati RSA e firme su artefatti di build.

## Fonti

- [RFC 8017 — PKCS #1: RSA Cryptography Specifications v2.2](https://www.rfc-editor.org/rfc/rfc8017)
- [NIST SP 800-56B Rev. 3 — Pair-Wise Key-Establishment Using Integer Factorization Cryptography](https://csrc.nist.gov/pubs/sp/800/56/a/r3/final)
- [RFC 4055 — Additional Algorithms and Identifiers for RSA Cryptography](https://www.rfc-editor.org/rfc/rfc4055)
- [OpenSSL pkeyutl — manuale](https://www.openssl.org/docs/manmaster/man1/openssl-pkeyutl.html)
