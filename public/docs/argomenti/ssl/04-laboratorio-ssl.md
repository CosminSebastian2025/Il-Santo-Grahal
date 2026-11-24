Un certificato è leggibile con gli strumenti giusti: non serve fidarsi del lucchetto del browser. In questo laboratorio usi `openssl s_client` per catturare la catena, `openssl x509` per estrarne i campi e `openssl verify` per ricostruire la fiducia. Tutto offline dopo la cattura, senza disattivare mai la verifica.

## Obiettivi

- Catturare la catena di un sito in un file e isolare ogni certificato.
- Leggere subject, issuer, validità, `SAN` e vincoli `CA`.
- Verificare la catena con un trust store esplicito.
- Riconoscere i casi in cui un certificato non verifica e perché.

## Preparazione

Serve OpenSSL 3.x (`openssl version`). Su macOS è già presente ma è il build di sistema: se `openssl` è troppo vecchio, usa quello di Homebrew (`/opt/homebrew/opt/openssl@3/bin/openssl`). Su Windows l'installer di OpenSSL fornisce `openssl.exe` da PowerShell o Git Bash.

Crea una cartella di lavoro vuota: tutti i file di questo laboratorio finiscono lì e possono essere cancellati alla fine.

```bash
mkdir -p ~/ssl-lab && cd ~/ssl-lab
```

Usa un dominio pubblico di controllo (il tuo sito, un dominio di test) oppure `example.com` per gli esempi di sola lettura.

## Esercizi

### 1. Catturare la catena e contare gli anelli

```bash
echo | openssl s_client -connect example.com:443 -servername example.com -showcerts 2>/dev/null \
  | sed -n '/BEGIN CERTIFICATE/,$p' > chain.pem
grep -c "BEGIN CERTIFICATE" chain.pem
```

- quanti certificati ci sono nel file?
- quanti sono in genere: foglia, una o due intermedie?
- la radice è presente nel file?

**Soluzione commentata**

`grep -c` restituisce 3 per molti siti: foglia, una o due intermedie, a volte anche la radice di emissione. La radice nel pacchetto è ridondante (il client ce l'ha nel trust store) e la sua presenza è innocua, ma non aiuta. Se il conteggio è 1, il server invia solo la foglia e la catena è incompleta per i client che non conoscono l'intermedia. Il `sed` scarta righe come `CONNECTED(...)` e `---` che `s_client` scrive su stdout e che impedirebbero a `openssl x509` di leggere il file.

### 2. Leggere la foglia

```bash
awk '/BEGIN CERTIFICATE/{n++} n==1' chain.pem | awk '/BEGIN/{p=1} p{print} /END CERTIFICATE/{exit}' > leaf.pem
openssl x509 -in leaf.pem -noout -subject -issuer -dates
openssl x509 -in leaf.pem -noout -ext subjectAltName,basicConstraints,extendedKeyUsage
```

```text
subject=CN=example.com
issuer=C=US, O=SSL Corporation, CN=Cloudflare TLS Issuing ECC CA 3
notBefore=Sep 26 22:49:11 2026 GMT
notAfter=Dec 25 22:56:35 2026 GMT
X509v3 Subject Alternative Name: 
    DNS:example.com, DNS:*.example.com
X509v3 Basic Constraints: critical
    CA:FALSE
```

- il nome che hai contattato è nel `SAN`?
- il certificato può firmare altri certificati (`CA:TRUE`)?
- quanto manca alla scadenza? Se `notAfter` è passato, quanti giorni sono?

**Soluzione commentata**

`CA:FALSE` è corretto per una foglia. Il `SAN` è l'elenco che il client confronta: se il nome contattato non c'è, l'errore è di nome, non di catena. Le date sono in GMT: confronta con `date -u` e non con l'ora locale. Un certificato scaduto di pochi giorni è, nell'ordine, un problema di automazione del rinnovo, non di crittografia.

### 3. Verificare la catena con un trust store esplicito

```bash
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt chain.pem
```

```text
chain.pem: OK
```

Su Debian/Ubuntu il bundle è `/etc/ssl/certs/ca-certificates.crt`; su RHEL/Fedora `/etc/pki/tls/certs/ca-bundle.crt`; su macOS `-CAfile` punta a un file esportato dal Portachiavi. Poi prova a verificare la sola foglia:

```bash
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt leaf.pem
```

- perché la verifica della foglia da sola fallisce?
- quale `error number` compare?
- che cosa cambia aggiungendo `-untrusted chain.pem`?

**Soluzione commentata**

Verificare `leaf.pem` senza intermedie produce:

```text
CN=example.com
error 20 at 0 depth lookup: unable to get local issuer certificate
```

`error 20` indica che l'emittente non è disponibile: `openssl verify` non usa le intermedie del file foglia perché non ci sono. `-untrusted chain.pem` fornisce le intermedie non fidate, lasciando la fiducia alle sole radici in `-CAfile`: è il modo corretto di testare una catena senza aggiungere la radice. Non serve `-k` né alcun flag che salti la verifica.

### 4. Osservare SNI e certificato predefinito

```bash
openssl s_client -connect example.com:443 </dev/null 2>/dev/null | openssl x509 -noout -subject
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -subject
```

- le due risposte coincidono?
- su un host che serve più siti sullo stesso IP, quale certificato vedi senza `-servername`?
- che errore produrrebbe in un client reale la versione senza SNI?

**Soluzione commentata**

Il server decide il certificato in base al nome inviato nell'estensione SNI. Senza `-servername`, molti server rispondono con il certificato del primo sito configurato (o con un certificato di default): se quel certificato non copre il dominio che stai provando, il client lo rifiuta. È la causa più frequente di falsi "hostname mismatch" durante i test. Per testare un nome reale, passa sempre `-servername`.

### 5. Controllare la versione TLS negoziata e la revoca

```bash
echo | openssl s_client -connect example.com:443 -servername example.com -brief 2>&1 | head -8
openssl s_client -connect example.com:443 -servername example.com -status </dev/null 2>/dev/null | grep -A2 "OCSP Response Status"
```

```text
Protocol version: TLSv1.3
Ciphersuite: TLS_AES_256_GCM_SHA384
Peer certificate: CN=example.com
Verification: OK
```

```text
    OCSP Response Status: successful (0x0)
    Cert Status: good
```

- `Verification: OK` è mostrato anche senza flag aggiuntivi?
- che cosa dice `Cert Status: good`?
- `Verification: OK` implica che la revoca sia stata controllata?

**Soluzione commentata**

Con `-brief` OpenSSL mostra l'esito della verifica senza bisogno di altri flag. `good` significa che la CA ha risposto "non revocato"; l'assenza della risposta non è un errore di per sé. `Verification: OK` non garantisce che la revoca sia stata consultata: sono controlli diversi. Se `Verification` è diverso da OK, leggi il `Verify return code` nella parte estesa dell'output.

### 6. Verificare un certificato di sviluppo con una CA locale

Genera una CA locale e un certificato per `localhost`: è un esercizio di catena, non una scorciatoia per aggirare la verifica.

```bash
cat > est.cnf <<'EOF'
[req]
distinguished_name = dn
[dn]
[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical,keyCertSign,cRLSign
[v3_leaf]
subjectAltName = DNS:localhost,IP:127.0.0.1
basicConstraints = critical,CA:FALSE
EOF

openssl req -x509 -newkey rsa:2048 -nodes -keyout ca.key -out ca.pem \
  -days 365 -subj "/CN=Lab CA" -config est.cnf -extensions v3_ca

openssl req -newkey rsa:2048 -nodes -keyout leaf.key -out leaf.csr \
  -subj "/CN=localhost" -config est.cnf

openssl x509 -req -in leaf.csr -CA ca.pem -CAkey ca.key -CAcreateserial \
  -days 30 -out leaf.crt -extfile est.cnf -extensions v3_leaf
```

```bash
openssl verify -CAfile ca.pem leaf.crt
```

- il risultato è `OK`?
- perché senza `-CAfile ca.pem` lo stesso comando fallisce?
- che differenza c'è tra questo e aggiungere `-k` a `curl`?

**Soluzione commentata**

Con le estensioni di cui sopra `openssl verify -CAfile ca.pem leaf.crt` risponde `leaf.crt: OK`. Se ometti `basicConstraints=critical,CA:TRUE` dall'estensione della CA, `openssl verify` restituisce invece `error 79 at 1 depth lookup: invalid CA certificate`: un certificato senza `CA:TRUE` non può firmare altri certificati. Senza `-CAfile`, `openssl verify` usa solo il trust store di sistema e risponde `error 20 at 0 depth lookup: unable to get local issuer certificate`.

Con `curl --cacert ca.pem https://localhost:8443/` mantieni la verifica attiva e ti fidi della tua CA solo per quegli host. `-k` invece accetta qualsiasi certificato, anche uno contraffatto: è la differenza tra "conosco questa CA" e "non verifico nulla". Su Windows PowerShell la sintassi `<<'EOF'` non esiste: scrivi le righe del file con un editor e passa `-config est.cnf` come negli esempi; in Git Bash il prefisso `/CN=` passato a `-subj` può essere convertito in un percorso, quindi usa `MSYS_NO_PATHCONV=1 openssl ...`.

## Errori comuni

- **Dimenticare `-servername`**: il certificato restituito può appartenere a un altro sito.
- **Scrivere `s_client` output direttamente in un file PEM senza filtrarlo**: il file conterrà `CONNECTED` e righe di stato, e `openssl x509` lo rifiuterà.
- **Usare `-cipher` con nomi TLS 1.3**: i cipher suite di TLS 1.3 si configurano con `-ciphersuites`, non con `-cipher`.
- **Confondere "verifica OK" con "revoca controllata"**: sono due cose diverse.
- **Lasciare la CA locale e la sua chiave nel progetto**: `ca.key` va tenuto fuori dal repository: chi la possiede può firmare certificati accettati dai tuoi client.

## In sintesi

- `s_client` cattura la catena; `x509` la legge; `verify` la valida contro un trust store esplicito.
- `-servername` è obbligatorio per testare il certificato del sito reale.
- `error 20` è catena incompleta, non un certificato invalido.
- La fiducia si costruisce con una CA nota, non disattivando la verifica.

## Fonti

- OpenSSL — `openssl s_client`: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenSSL — `openssl x509`: https://docs.openssl.org/master/man1/openssl-x509/
