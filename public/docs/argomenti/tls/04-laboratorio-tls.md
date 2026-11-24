Un endpoint TLS si diagnostica osservando tre cose: quale versione e cipher suite negozia, se la catena del certificato è valida e se accetta solo configurazioni sicure. In questo laboratorio usi `openssl s_client`, `curl -v` e (se li hai) `testssl.sh` o `sslyze` per rispondere a queste domande su un endpoint reale e su uno locale.

## Obiettivi

- Osservare un handshake TLS 1.3 completo con `openssl s_client -msg`.
- Estrarre versione, cipher suite e certificato da un endpoint HTTPS.
- Provare cosa succede quando il client forza una versione o una cipher non supportate.
- Avviare un server TLS locale e verificarlo con la tua CA di test.
- Scrivere un piccolo script di verifica ripetibile.

## Prerequisiti

- Linux o macOS con `openssl` 3.x (su macOS: `brew install openssl@3` e usa `$(brew --prefix openssl@3)/bin/openssl`).
- `curl` recente. Su Windows `curl.exe` è incluso in Windows 10/11 e in Git for Windows c'è `openssl`.
- Facoltativi: `testssl.sh` (script bash), `sslyze` (Python).

## Esercizio 1 – Handshake a mano

Punta `openssl s_client` a un sito HTTPS reale. Sostituisci `example.com` con un dominio che controlli o con un sito pubblico usato solo per osservazione.

```bash
openssl s_client -connect example.com:443 -servername example.com -msg -tls1_3
```

L'output sfila a blocchi. Cerca:

- `>>> TLS 1.3, Handshake [length ...], ClientHello` (esce dal client);
- `<<< TLS 1.3, Handshake [length ...], ServerHello` (arriva dal server);
- `<<< TLS 1.3, Handshake [length ...], EncryptedExtensions` (da qui in poi è cifrato);
- alla fine `Verify return code: 0 (ok)` e la riga `Protocol : TLSv1.3`.

In fondo alla schermata, l'output riassuntivo contiene anche:

```text
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Server public key is 2048 bit
```

Che cosa hai imparato: i messaggi dopo ServerHello non sono leggibili senza chiavi, e il certificato arriva cifrato. Per uscire da `s_client` scrivi `Q` e premi Invio.

## Esercizio 2 – Forzare la versione

Prova a forzare TLS 1.2 su un server che supporta solo 1.3 (o viceversa). Il comando fallisce con un errore esplicito:

```bash
openssl s_client -connect example.com:443 -servername example.com -tls1_2
```

Se il server accetta anche 1.2, la riga finale sarà `Protocol : TLSv1.2` e la cipher sarà una suite ECDHE. Se non la accetta, vedrai qualcosa come `no protocols available` o `alert protocol version`.

Ripeti con `-tls1` e `-tls1_1`: un endpoint correttamente configurato oggi rifiuta entrambe.

## Esercizio 3 – curl -v e valori sintetici

`curl` è comodo per controllo automatico perché può stampare valori separati:

```bash
curl -sS -o /dev/null -w 'verify=%{ssl_verify_result} tls=%{tls_version} cipher=%{ssl_cipher}\n' https://example.com
```

Output atteso:

```text
verify=0 tls=TLSv1.3 cipher=TLS_AES_256_GCM_SHA384
```

`verify=0` significa catena valida. Se ottieni un codice diverso tipo `10` (certificato scaduto), `20` (impossibile ottenere il certificato locale del firmatario) o `60`, non è un problema di rete: è un problema di fiducia. Apri con `curl -v` e cerca la riga `SSL certificate verify` per il dettaglio.

Con `-v` puoi anche vedere la catena e l'SNI inviato:

```bash
curl -v https://example.com 2>&1 | grep -E '^\* (Trying|Connected|SSL|Server certificate|subject|issuer|start date|expire date|SSL certificate verify)' | head -20
```

## Esercizio 4 – Server locale e verifica della catena

Avvia un server TLS locale con un certificato che hai generato tu. Parti da una CA di test e da un certificato per `localhost` (o `127.0.0.1`).

```bash
# CA
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -days 30 -nodes \
  -keyout ca.key -out ca.crt -subj "/CN=CA di laboratorio"

# Certificato server per localhost, con SAN
openssl req -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
  -keyout server.key -out server.csr -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -days 30 -out server.crt \
  -extfile <(printf "subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth")

# Server
openssl s_server -accept 8443 -cert server.crt -key server.key -www -tls1_3
```

Nota sul file `server.csr`: le `-addext` del `req` **non** finiscono nel certificato emesso da `x509 -req`; devi ripetere le estensioni in `-extfile`, come nello snippet. Su Windows PowerShell, o se bash non accetta `<(...)`, crea un file `server.ext` con le due righe e usa `-extfile server.ext`.

In un secondo terminale:

```bash
curl -v --cacert ca.crt https://localhost:8443/
```

L'handshake deve produrre `Verify return code: 0 (ok)` e la richiesta HTTP deve arrivare al server. Se ometti `--cacert` fallisce con `60 (certificate is not trusted)` o un errore equivalente: è corretto, perché `ca.crt` non è una radice pubblica. La soluzione non è `-k`, ma dire a client e applicazione di fidarsi della tua CA (per esempio con `SSL_CERT_FILE=ca.crt` per OpenSSL/curl oppure caricandola esplicitamente nel client HTTP).

Su Windows, `curl.exe` usa Schannel: a seconda della configurazione può rifiutare la concatenazione CA anche con `--cacert` (errore di revoca) oppure non negoziare affatto TLS 1.2. In caso di comportamento diverso, ripeti lo stesso controllo con `openssl s_client -connect localhost:8443 -CAfile ca.crt` o con curl incluso in Git for Windows, che usa OpenSSL.

## Esercizio 5 – Uno script di verifica ripetibile

Metti il controllo in uno script bash così da poterlo rilanciare in CI:

```bash
#!/usr/bin/env bash
set -euo pipefail

host="${1:?uso: ./check-tls.sh host}"
expected="${2:-TLSv1.3}"

result=$(curl -sS -o /dev/null -w '%{ssl_verify_result}|%{tls_version}|%{ssl_cipher}' "https://$host/")

IFS='|' read -r verify tls cipher <<< "$result"
echo "host=$host verify=$verify tls=$tls cipher=$cipher"

[[ "$verify" == "0" ]] || { echo "catena non valida (verify=$verify)" >&2; exit 1; }
[[ "$tls" == "$expected" ]] || { echo "versione attesa $expected, trovata $tls" >&2; exit 1; }
```

```bash
chmod +x check-tls.sh
./check-tls.sh example.com
```

Lo script fallisce se la catena è invalida o se la versione è diversa da quella attesa. Per i servizi interni aggiungi un controllo sulla scadenza con `openssl x509 -enddate -noout`.

## Esercizio 6 (facoltativo) – Scansione con tool dedicati

Se hai `testssl.sh`:

```bash
./testssl.sh --quiet --protocols --server-defaults https://example.com
```

Se hai `sslyze`:

```bash
sslyze --regular example.com:443 --json_out scan.json
```

Entrambi riportano protocolli abilitati, cipher suite per versione, certificato e eventuali weak protocols. Usali solo su endpoint tuoi o su siti che consentono esplicitamente di essere scansionati: una scansione aggressiva su host di terzi può essere rilevata e bloccata.

## Cosa controllare in una radiografia

- TLS 1.3 abilitato e preferito.
- TLS 1.0 e 1.1 disabilitati; TLS 1.2 solo se serve.
- Cipher suite solo AEAD e ECDHE su 1.2.
- Certificato con SAN corretto, catena completa, validità residua > 30 giorni.
- SNI coerente con il nome cercato.
- 0-RTT valutato consapevolmente, non abilitato per errore.
- Redirect HTTP → HTTPS e HSTS presente.

## In sintesi

Con tre comandi hai un quadro completo: `openssl s_client -msg` per l'handshake, `openssl s_client`/`curl -v` per versione e catena, `curl -w` per un controllo ripetibile. Un server locale con CA di test insegna il flusso di verifica e permette di provare gli errori **senza** disattivare la verifica del certificato. Gli scanner automatici completano lo scenario ma vanno usati responsabilmente.

## Fonti

- [OpenSSL – s_client](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OWASP – TLS Cipher String Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/TLS_Cipher_String_Cheat_Sheet.html)
