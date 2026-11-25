Una chiave hardware come la YubiKey non è un "token che genera codici": è un dispositivo che custodisce chiavi private in un elemento sicuro e le usa solo dopo un tocco fisico. Questo cambia il modello di minaccia rispetto a una password o a un TOTP: la chiave privata non è leggibile dal computer, quindi phishing, keylogger e malware che leggono la memoria del browser non bastano a impersonare l'utente. La YubiKey è compatibile con più standard contemporaneamente, e capire quale standard serve per quale scopo è la parte che più spesso si sbaglia.

## Obiettivi

- Distinguere FIDO2/WebAuthn, PIV e OATH sul modello di chiave e sull'uso.
- Capire perché WebAuthn lega la credenziale all'origine e interrompe il phishing.
- Scegliere la modalità giusta per login web, SSH, firma di documenti e codici OTP.
- Conoscere i limiti operativi: tocco, backup, sostituzione e compatibilità.

## Quattro protocolli nello stesso dispositivo

Una YubiKey 5 mostra al sistema operativo più interfacce USB contemporaneamente: una smart card per PIV, una tastiera HID per OTP, un'app FIDO per WebAuthn, e un canale CCID per OATH. Il sistema operativo vede quindi un dispositivo composto, e ogni funzione ha un'applicazione dedicata.

| Protocollo | Chiave privata | Secondo fattore o unico fattore | Uso tipico |
| --- | --- | --- | --- |
| FIDO2 / WebAuthn | coppia per sito, non esportabile | entrambi, secondo policy | login web con resistenza al phishing |
| PIV | certificato X.509 nello slot 9a | con PIN, quindi due fattori | SSH, VPN, firma codice, smart card |
| OATH | segreto TOTP/HOTP salvato nel dispositivo | secondo fattore | servizi che accettano solo TOTP |
| OTP (Yubico OTP) | segreto condiviso con il server | secondo fattore o password statica | legacy, rete aziendale, PAM |

Il punto da fissare: FIDO2 non è "un modo per generare codici". La credenziale è una coppia di chiavi legata a un'origine (`https://banca.example`), e il dispositivo firma una sfida insieme ai dati del sito. Il server verifica la firma con la chiave pubblica salvata alla registrazione. Nulla viaggia che possa essere riusato altrove: se l'utente viene portato su `banca-example.it` (con il trattino), l'autenticatore non produce alcuna firma, perché l'origine non corrisponde.

## Perché WebAuthn ferma il phishing

Un attaccante che clona perfettamente la pagina di login ottiene username e password, e anche un codice TOTP digitato dall'utente. Non ottiene la firma WebAuthn, perché il browser la genera sulla sfida del sito vero e la invia al sito vero. Per questo si parla di autenticatori *phishing-resistant*: non perché l'utente sia più attento, ma perché la crittografia lega la risposta all'origine.

```json
// PublicKeyCredentialCreationOptions semplificate dal RP
{
  "challenge": "gT3…",                          // casuale, monouso
  "rp": { "id": "example.com", "name": "Example" },
  "user": { "id": "dG9t…", "name": "tom@example.com", "displayName": "Tom" },
  "pubKeyCredParams": [{ "type": "public-key", "alg": -7 },
                       { "type": "public-key", "alg": -8 }],
  "authenticatorSelection": { "residentKey": "required",
                              "userVerification": "required" },
  "attestation": "none"
}
```

`-7` è ES256 e `-8` è EdDSA; la YubiKey supporta entrambi. Con `residentKey: required` la credenziale è memorizzata nella chiave (passkey), quindi non serve digitare l'username: la chiave lo fornisce. `attestation: none` è la scelta prudente per i siti consumer, perché l'attestazione può ridurre la privacy e non serve se non si distinguono modelli di autenticatore.

## PIV e OATH: gli altri due usi

PIV è il profilo che trasforma la chiave in una smart card X.509. Lo slot `9a` è pensato per l'autenticazione: si carica lì il certificato e la chiave privata, e il PIN ne protegge l'uso. Da lì nascono l'accesso SSH con `ssh-agent`, la VPN con certificato client e la firma di file. Il profilo è richiesto da molti ambienti che non supportano ancora WebAuthn, per esempio client VPN che accettano solo certificati.

```bash
# Una YubiKey come smart card per SSH
ssh-keygen -D "C:/Program Files (x86)/Yubico/yubico-piv-tool/libykcs11.dll" -e > key.pub
ssh-add -s "C:/Program Files/Yubico/yubico-piv-tool/libykcs11.dll"
ssh -o IdentitiesOnly=yes -i key.pub host.example.com
```

OATH è il caso grigio: il dispositivo salva un segreto TOTP e lo genera con un tocco, ma il segreto è in chiaro nel dispositivo e tutti i siti che usano TOTP restano vulnerabili al phishing. È utile per compatibilità con servizi che non offrono WebAuthn, non come scelta migliore.

Un'ultima distinzione pratica riguarda il numero di fattori. In WebAuthn il tocco dimostra il possesso, il PIN o la biometria del dispositivo dimostrano la conoscenza o l'inerenza: `userVerification: required` rende la credenziale un vero secondo fattore, mentre `preferred` la lascia dipendere dalla configurazione dell'autenticatore. Quando la chiave sostituisce la password invece di affiancarla, la sicurezza dipende interamente dalla custodia fisica: chi trova il dispositivo e ne conosce il PIN può entrare, e per questo su una chiave passkey conviene un PIN robusto e una regola di blocco dopo pochi tentativi.

## Errori comuni

- **Una sola chiave, zero backup**: la YubiKey si perde o si rompe; se lei era il secondo fattore, la recovery resta un fattore, quindi va pianificata in anticipo.
- **Trattare WebAuthn come secondo fattore obbligatorio**: con password + chiave il phishing è fermato solo per la parte WebAuthn; senza password si ha un fattore unico resistente al phishing.
- **PIN della PIV condiviso o scritto**: il PIN protegge la chiave in caso di furto, e deve seguire le stesse regole di una password.
- **Registrare una credenziale su un dominio sbagliato**: `www.example.com` e `example.com` sono origini diverse; cambiare dominio di login significa ri-registrare gli utenti.
- **Bloccare gli utenti su un solo trasporto**: una chiave NFC non funziona su un desktop senza lettore, e una USB-C su un telefono senza adattatore.
- **Attestation come controllo di sicurezza dei siti consumer**: raccoglie identificativi del modello e genera richieste di consenso; per un sito pubblico serve solo se si vuole limitare l'accesso a modelli specifici.

## In sintesi

La YubiKey copre quattro protocolli con lo stesso modello di protezione: la chiave privata resta dentro il dispositivo e non si esporta. WebAuthn è l'unico che lega la credenziale all'origine e quindi resiste al phishing; PIV serve per certificati X.509 e SSH; OATH è ponte con i servizi legacy. Il backup, la recovery e la compatibilità dei trasporti sono parte del progetto, non imprevisti.

## Fonti

- [W3C - Web Authentication (WebAuthn)](https://www.w3.org/TR/webauthn-3/)
- [Yubico - Product Overview](https://www.yubico.com/products/)
- [Yubico Developers - PIV](https://developers.yubico.com/PIV/)
- [FIDO Alliance - Specifications](https://fidoalliance.org/specifications/)
