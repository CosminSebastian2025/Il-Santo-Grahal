In questo laboratorio costruisci `cifratore`, un archivio cifrato da riga di comando che usa AES-256-CTR per la confidenzialità e HMAC-SHA256 calcolato sul ciphertext per l'integrità, quindi verifica il tag **prima** di decifrare qualsiasi byte. Il formato è volutamente esplicito — un header binario leggibile con `xxd` — perché l'obiettivo didattico è vedere dove finiscono nonce, sale e tag, e cosa succede quando uno dei tre viene alterato. Alla fine avrai un file che si rompe in modo rumoroso, non silenzioso.

## Obiettivi

- Definire un formato binario con magic, versione, nonce, sale e tag.
- Derivare due chiavi da una password con PBKDF2 e separazione di dominio.
- Cifrare il contenuto in streaming e MAC-are il ciphertext completo.
- Rifiutare file alterati con un codice di uscita dedicato.
- Verificare con test di riuso del nonce, di bit flip e di troncamento.

## Il formato `GRH1`

| Offset | Byte | Campo | Contenuto |
| --- | --- | --- | --- |
| 0 | 4 | magic | `47 52 48 31` = "GRH1" |
| 4 | 1 | versione | `01` |
| 5 | 8 | sale | casuale, per PBKDF2 |
| 13 | 8 | base nonce | casuale, contatore parte da qui |
| 21 | 32 | tag HMAC | HMAC-SHA256 sul ciphertext |
| 53 | n | ciphertext | AES-256-CTR del plaintext |

L'header è in chiaro e **va autenticato anche lui**: nel calcolo del tag si concatena magic, versione, sale e nonce prima del ciphertext, altrimenti chi modifica il nonce produce un plaintext diverso senza far scattare il MAC. Il formato è a lunghezza fissa in testa, quindi il tag si può verificare senza leggere tutto il resto in memoria solo se il file sta in RAM: per il laboratorio va bene un limite di 64 MiB, con un errore esplicito oltre.

```bash
# preparazione
mkdir -p ~/lab-aes && cd ~/lab-aes
printf 'chiave-master della squadra\n' > password.txt
head -c 1000000 /dev/urandom > documenti.bin
```

## Generare l'header e cifrare

Il costo di PBKDF2 è la parte lenta: con 600000 iterazioni una run dura secondi, quindi mettilo in una variabile per poterlo abbassare nei test. Le due chiavi derivano dallo stesso salt ma con scopi diversi: includi una stringa di dominio nel salt, così compromettere una chiave non aiuta sull'altra.

```bash
export OPENSSL_CONF="C:/Program Files/Git/mingw64/etc/ssl/openssl.cnf"   # solo Git Bash su Windows
ITER=600000
SALT=$(openssl rand -hex 8)
BASEN=$(openssl rand -hex 8)
KENC=$(openssl kdf -keylen 32 -kdfopt digest:SHA256 -kdfopt pass:"$(cat password.txt)" \
       -kdfopt salt:${SALT}656e63 -kdfopt iter:$ITER PBKDF2 | tr -d ':' | tr 'A-F' 'a-f')
KMAC=$(openssl kdf -keylen 32 -kdfopt digest:SHA256 -kdfopt pass:"$(cat password.txt)" \
       -kdfopt salt:${SALT}6d6163 -kdfopt iter:$ITER PBKDF2 | tr -d ':' | tr 'A-F' 'a-f')
# 656e63 = "enc", 6d6163 = "mac": separazione di dominio nel salt
```

Il nonce del CTR con `-iv` ha 16 byte: gli 8 di base casuale e un contatore a 64 bit in coda, che per un file da 1 MB è al sicuro. Se il file può superare i 64 GiB, il contatore a 64 bit si esaurisce e serve una nuova base: il controllo va nell'applicazione. Il contatore vero è gestito dal cifrario, che lo incrementa blocco per blocco; il valore scritto in `-iv` ne è solo l'origine.

```bash
NONCE="${BASEN}0000000000000000"
openssl enc -aes-256-ctr -K "$KENC" -iv "$NONCE" -in documenti.bin -out corpo.enc
{ printf 'GRH1\001'; printf '%s' "$SALT"  | xxd -r -p; printf '%s' "$BASEN" | xxd -r -p; } > aad.bin
cat aad.bin corpo.enc > tag_input.bin
openssl mac -digest SHA256 -macopt hexkey:"$KMAC" -in tag_input.bin HMAC | xxd -r -p > tag.bin
cat aad.bin tag.bin corpo.enc > documenti.grh
xxd -l 53 documenti.grh   # ispezione: magic, versione, sale, nonce, tag
```

La decifratura ripete la derivazione dal salt letto nell'header, ricalcola HMAC su `aad || corpo` e confronta il tag con `cmp`, mai con un `==` che si ferma al primo byte diverso. I campi a offset fisso si estraggono con `dd` e `xxd`.

```bash
S=$(dd if=documenti.grh bs=1 skip=5  count=8 2>/dev/null | xxd -p -c 8)
N=$(dd if=documenti.grh bs=1 skip=13 count=8 2>/dev/null | xxd -p -c 8)
dd if=documenti.grh bs=1 skip=0  count=21 2>/dev/null > aad2.bin
dd if=documenti.grh bs=1 skip=53 2>/dev/null > corpo2.enc
cat aad2.bin corpo2.enc > input2.bin
echo "sale=$S nonce=$N"; openssl rand -hex 8   # il nonce estratto non deve mai ripetersi
```

Senza decodificare il file puoi anche chiedere direttamente tutte le informazioni: `openssl enc -d -aes-256-ctr -K ... -iv ... -in ...` rifiuta un IV di lunghezza sbagliata, ed è il controllo che scopre subito un header troncato.

## La verifica: tag prima, plaintext dopo

L'ordine delle operazioni è il punto: decifrare il bytes sbagliati in CTR non produce errori, produce spazzatura indistinguibile dal caso. Il tag è l'unica cosa che distingue un file corrotto da un file valido.

```bash
S=$(dd if=documenti.grh bs=1 skip=5 count=8 2>/dev/null | xxd -p -c 8)
N=$(dd if=documenti.grh bs=1 skip=13 count=8 2>/dev/null | xxd -p -c 8)
dd if=documenti.grh bs=1 skip=0  count=21 2>/dev/null > aad2.bin
dd if=documenti.grh bs=1 skip=53 2>/dev/null > corpo2.enc
cat aad2.bin corpo2.enc > input2.bin
K2=$(openssl kdf -keylen 32 -kdfopt digest:SHA256 -kdfopt pass:"$(cat password.txt)" \
     -kdfopt salt:${S}656e63 -kdfopt iter:$ITER PBKDF2 | tr -d ':' | tr 'A-F' 'a-f')
M2=$(openssl kdf -keylen 32 -kdfopt digest:SHA256 -kdfopt pass:"$(cat password.txt)" \
     -kdfopt salt:${S}6d6163 -kdfopt iter:$ITER PBKDF2 | tr -d ':' | tr 'A-F' 'a-f')
openssl mac -digest SHA256 -macopt hexkey:"$M2" -in input2.bin HMAC | xxd -r -p > tag2.bin
if cmp -s tag2.bin <(dd if=documenti.grh bs=1 skip=21 count=32 2>/dev/null); then
  openssl enc -d -aes-256-ctr -K "$K2" -iv "${N}0000000000000000" -in corpo2.enc
else
  echo "cifratore: integrità non verificata" >&2; exit 2
fi
```

Il test che conta si fa modificando un byte del ciphertext: il tag cambia e lo script esce con 2 senza scrivere nulla su stdout. Prova anche a modificare il nonce nell'header: cambia il plaintext e il tag, quindi il file viene rifiutato. Modifica infine il sale: la derivazione produce chiavi diverse e il file è rifiutato di nuovo.

| Test | Modifica | Esito atteso |
| --- | --- | --- |
| integro | nessuna | plaintext identico, exit 0 |
| bit flip | byte 200 del ciphertext | exit 2, nessun output |
| nonce alterato | byte 13 dell'header | exit 2 |
| password errata | altra password | exit 2 (chiavi diverse) |
| troncato | rimossi 16 byte in coda | exit 2 |

## Esercizi

1. Aggiungi il campo `iterazioni` nell'header per permettere la decifratura di file creati con un numero diverso di iterazioni, e rifiuta valori sotto una soglia minima.
2. Passa a GCM con `openssl enc -aes-256-gcm` e verifica che il tag sia di 16 byte: cosa cambia nel formato e quali controlli restano necessari?
3. Aggiungi l'identificativo della chiave di dati (DEK) e implementa il wrapping con `aes-256-wrap`, così la password protegge una KEK e non il file.
4. Scrivi un test che generi 1000 file filtrando i nonce già visti: quanti byte di base casuale servono per non avere collisioni?
5. Misura il tempo di decifratura con `ITER=10000` e `ITER=600000`: qual è il compromesso ragionevole per un archivio di backup umano?
6. Implementa una modalità `--inspect` che stampi versione, sale, nonce e tag in hex senza decifrare.

<details>
<summary>Soluzione</summary>

1. Il campo va autenticato come l'altro header; la soglia minima è un vincolo dell'applicazione, perché un file vecchio con meno iterazioni è un downgrade dell'attaccante se può riscriverlo.

2. GCM produce già un tag di 16 byte e rifiuta l'alterazione all'interno di `openssl`, ma il nonce resta a carico tua: un nonce riusato rompe tutto senza errori. Il formato può eliminare il tag separato e lasciarlo al cifrario.

3. La KEK deriva dalla password, la DEK è casuale per file e viene avvolta con `openssl enc -aes-256-wrap -K KEK -iv A6A6A6A6A6A6A6A6`; ruotare significa solo rilanciare il wrap.

4. Con 8 byte casuali la collisione diventa probabile intorno a 2^32 file: per 1000 file il test non trova collisioni, e non è una prova di sicurezza; il contatore esplicito è più robusto del caso.

5. Con 10000 iterazioni un attaccante può provare circa 2000 password al secondo su una CPU; con 600000 sono circa 0,2 al secondo. Per un backup personale 600000 è il minimo difendibile.

6. `dd` legge i campi a offset fissi e `xxd -p` li stampa; nessuna derivazione, quindi il comando è istantaneo e sicuro su file non fidati.

</details>

## Errori comuni

- **Verificare il tag dopo aver decifrato**: in CTR non c'è nessun errore da intercettare, solo plaintext sbagliato.
- **MAC-are solo il corpo e non l'header**: il nonce diventa modificabile e il MAC continua a passare.
- **Riusare la stessa chiave derivata per cifratura e MAC**: due usi della stessa chiave sono un difetto; deriva due chiavi con salt di dominio diversi.
- **Mettere la password in `-pass pass:`**: compare in `ps` e nella history; leggi da file con permessi stretti.
- **Ignorare l'errore di `openssl kdf` in una pipeline**: `$(...)` vuoto produce una chiave vuota e `openssl enc` potrebbe comunque procedere; controlla la lunghezza prima di usare la variabile.

## In sintesi

Il valore didattico di questo laboratorio è il formato: magic e versione per riconoscere un file, sale e nonce per la derivazione e per il CTR, tag calcolato su header e ciphertext, verifica prima di qualunque decifratura. Le tre prove — bit flip, nonce alterato, password errata — devono finire con lo stesso codice di uscita, perché per chi riceve il file sono lo stesso caso: contenuto non autentico. Da qui il passo successivo è spostare la chiave in un KMS e ridurre il file a un envelope con la DEK avvolta.

## Fonti

- [OpenSSL enc — manuale](https://www.openssl.org/docs/manmaster/man1/openssl-enc.html)
- [OpenSSL mac — manuale](https://www.openssl.org/docs/manmaster/man1/openssl-mac.html)
- [RFC 8018 — Password-Based Cryptography Specification v2.1](https://www.rfc-editor.org/rfc/rfc8018)
- [RFC 3394 — AES Key Wrap Algorithm](https://www.rfc-editor.org/rfc/rfc3394)
