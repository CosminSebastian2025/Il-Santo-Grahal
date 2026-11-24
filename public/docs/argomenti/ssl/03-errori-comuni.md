Un errore di certificato non è un blocco casuale: ogni messaggio corrisponde a una verifica precisa che è fallita. Imparare a leggerli ti risparmia ore e, soprattutto, ti impedisce di aggirarli con `-k` o "accetta comunque". Qui vedi i quattro errori che coprono la grande maggioranza dei casi, con il comando per riprodurli e la correzione giusta.

## Obiettivi

- Riconoscere scadenza, nome errato, catena incompleta e hostname mismatch dai messaggi di `curl` e `openssl`.
- Distinguere un problema di certificato da un problema di TLS o di rete.
- Correggere con verifiche precise, senza disattivare la validazione.

## Il messaggio conta

```bash
curl -v https://example.com 2>&1 | grep -iE "SSL|certificate|verify"
```

Il messaggio finale di `curl` è l'indizio più utile: contiene il livello (TCP, TLS, HTTP), il codice (`error:14094410`, `error:10`) e la verifica fallita (`unable to get local issuer certificate`, `certificate has expired`, `Hostname mismatch`). Copia quel testo nella diagnosi: è la stessa informazione che `openssl verify` riprodurrà offline.

## Certificato scaduto

```text
curl: (60) SSL certificate problem: certificate has expired
```

Il periodo `Not Before`/`Not After` è nel certificato: non c'è ambiguità.

```bash
echo | openssl s_client -connect www.example.com:443 -servername www.example.com 2>/dev/null \
  | openssl x509 -noout -dates
```

```text
notBefore=Jan 15 00:00:00 2026 GMT
notAfter=Apr 15 23:59:59 2026 GMT
```

Cause tipiche: rinnovo automatico rotto (certbot, ACME, job cron fallito), macchina con data sbagliata, catena con un'intermedia scaduta (poco visibile: la foglia è valida, l'intermedia no). Correzione: rinnovare, verificare i timer, controllare `notAfter` di **tutti** i certificati della catena, ad esempio con `openssl x509 -noout -dates` su ciascun blocco `BEGIN CERTIFICATE` del file della catena.

## Nome errato e hostname mismatch

Sono due nomi dello stesso problema, con origini diverse.

```text
curl: (60) SSL: no alternative certificate subject name matches target host name 'api.example.com'
```

Il client ha chiesto `api.example.com`, ma il `SAN` del certificato non lo elenca. Verifica:

```bash
openssl x509 -in leaf.pem -noout -ext subjectAltName
```

```text
X509v3 Subject Alternative Name: 
    DNS:example.com, DNS:*.example.com
```

`*.example.com` copre `api.example.com` ma **non** `example.com` ed è a livello singolo: non copre `a.b.example.com`. Se usi `openssl s_client` senza `-servername`, il server può mostrarti il certificato sbagliato: è un errore del comando, non del server. Lato server, il mismatch nasce da una configurazione con un `server_name` diverso da quello richiesto, da un certificato emesso per il nome vecchio, o da un dominio che punta a un host che non conosce quel nome.

## Catena incompleta

```text
curl: (60) SSL certificate problem: unable to get local issuer certificate
```

Il client ha la foglia, ma non riesce a risalire alla radice fidata. Significa che manca almeno un'intermedia nel pacchetto inviato dal server. Prova a verificare solo la foglia con il bundle di sistema:

```bash
echo | openssl s_client -connect example.com:443 -servername example.com -showcerts 2>/dev/null \
  | sed -n '/BEGIN CERTIFICATE/,$p' > chain.pem
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt chain.pem
```

```text
CN=example.com
error 20 at 0 depth lookup: unable to get local issuer certificate
error chain.pem: verification failed
```

`error 20` è l'errore "emittente non trovato": la catena è davvero incompleta, oppure `chain.pem` non contiene le intermedie. Per verificare una catena completa aggiungi il file delle intermedie con `-untrusted`:

```bash
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt -untrusted intermediates.pem leaf.pem
```

```text
leaf.pem: OK
```

Due dettagli pratici: `s_client` scrive alcune righe (`CONNECTED`, i separatori `---`) su stdout, quindi filtra con `sed -n '/BEGIN CERTIFICATE/,$p'`; su macOS e Windows il bundle di sistema è in un percorso diverso e va indicato esplicitamente in `-CAfile`.

Il sintomo classico: il sito funziona nel browser ma le app mobile falliscono. È possibile perché il browser può recuperare l'intermedia tramite AIA o dalla cache; le app no. Correzione: concatenare foglia + intermedie (senza la radice) nel file servito. Con nginx:

```nginx
ssl_certificate     /etc/ssl/server/fullchain.pem;
ssl_certificate_key /etc/ssl/server/privkey.pem;
```

## Altri due errori frequenti

- **`self-signed certificate in certificate chain`**: il server invia una catena che include un certificato autofirmato (una CA interna o un certificato di sviluppo) che il client non conosce. In sviluppo è atteso: configura il client con la CA interna (`--cacert` in `curl`), non con `-k`. In produzione indica un certificato sbagliato o un trust store non aggiornato.
- **`certificate verify failed` con `error:num=20` / `error:num=21`**: rispettivamente mancanza dell'emittente (catena incompleta) e firma non verificabile con la chiave dell'emittente. Il messaggio esatto dipende dal client: `openssl s_client` li riporta con `Verify return code`.

## Sicurezza: perché non si disattiva la verifica

`curl -k`, `wget --no-check-certificate`, `openssl s_client` senza `-verify_return_error`, o un `verify=False` nel codice:

- rendono la connessione indistinguibile da un attacco man-in-the-middle;
- non "sistemano" il certificato: nascondono il problema e lo rendono permanente;
- nelle pipeline CI creano una cultura che un giorno applicherà lo stesso flag in produzione.

Le eccezioni legittime esistono — connessione a un host con certificato di sviluppo in un ambiente isolato — ma si gestiscono con **una CA di cui il client si fida**:

```bash
curl --cacert dev-ca.crt https://localhost:8443/
```

Questo mantiene la verifica attiva. Il browser ha lo stesso comportamento: se accetti manualmente un certificato non valido, vedi un avviso, e su alcuni sistemi l'eccezione è permanente finché non la rimuovi.

## Leggere lo stato di revoca

```bash
openssl s_client -connect example.com:443 -servername example.com -status </dev/null 2>/dev/null | grep -A2 "OCSP"
```

```text
OCSP response: 
======================================
OCSP Response Data:
    OCSP Response Status: successful (0x0)
    Cert Status: good
```

Se il server non ha lo stapling, la risposta può mancare e `s_client` non fa automaticamente una richiesta OCSP diretta a ogni CA. Un `unknown` non è necessariamente un errore: la CA può non avere dati. Non usare l'assenza di risposta come prova che il certificato è compromesso, ma indagala se il requisito di sicurezza lo richiede.

## Errori comuni

- **Aggirare con `-k` invece di leggere il messaggio**: l'errore dice esattamente quale verifica è fallita.
- **Dimenticare `-servername`**: il server restituisce il certificato di default e sembra un mismatch.
- **Rinnovare la foglia senza le intermedie**: la nuova catena è incompleta come la vecchia.
- **Testare solo con il browser**: `curl` e `openssl verify` mostrano ciò che il browser nasconde.
- **Ignorare la data di sistema**: una macchina con clock sbagliato rifiuta certificati validi e accetta quelli scaduti.

## In sintesi

- Scaduto, nome errato, catena incompleta e self-signed sono verifiche diverse con correzioni diverse.
- `openssl s_client` con `-servername -showcerts` e `openssl verify -untrusted` riproducono l'errore offline.
- Il browser nasconde i problemi di catena; le app e `curl` no.
- Si corregge la configurazione o si aggiunge una CA fidata: non si disattiva la verifica.

## Fonti

- MDN — Transport Layer Security (TLS): https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security
- OWASP — Transport Layer Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
