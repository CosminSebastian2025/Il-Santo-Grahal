Implementare WebAuthn in un'app significa gestire due cerimonie, registrazione e autenticazione, con dati che il server deve verificare in modo rigoroso. Le API del browser fanno metà del lavoro, ma accettare la risposta senza controllare origine, challenge e tipo di credenziale annulla la protezione anti-phishing. In questa lezione vediamo il contratto lato server, i controlli che non si possono saltare, la scelta tra chiave passkey e secondo fattore e la gestione del ciclo di vita delle credenziali.

## Obiettivi

- Salvare correttamente una credenziale WebAuthn con chiave pubblica e contatore di firma.
- Verificare `clientDataJSON`, `authenticatorData` e la firma in entrambe le cerimonie.
- Distinguere passkey sincronizzate e chiavi hardware nel comportamento e nelle policy.
- Gestire più credenziali per utente, rename, revoca e perdita del dispositivo.

## Le due cerimonie e i dati da conservare

Alla registrazione il server genera una `challenge` casuale e la lega alla sessione dell'utente; alla risposta salva `credentialId` (già univoco per la coppia sito-autenticatore), `publicKey` in formato COSE, algoritmo, `signCount` e un soprannome scelto dall'utente. Alla verifica si ricostruisce la stringa firmata e si controlla con la chiave pubblica.

```python
# Verifica di una risposta di autenticazione (semplificata, con webauthn>=2.x)
from webauthn import verify_authentication_response, verify_registration_response

reg = verify_registration_response(
    credential=body["credential"],
    expected_challenge=sessione["challenge"].encode(),   # monouso, salvata lato server
    expected_rp_id="example.com",
    expected_origin="https://example.com",
    require_user_verification=True,
)
db.save_credential(user_id=sessione["uid"], cred_id=reg.credential_id,
                   public_key=reg.credential_public_key, sign_count=reg.sign_count)

auth = verify_authentication_response(
    credential=body["credential"],
    expected_challenge=sessione["challenge"].encode(),
    expected_rp_id="example.com",
    expected_origin="https://example.com",
    credential_public_key=row.public_key,
    credential_current_sign_count=row.sign_count,
    require_user_verification=True,
)
db.update_sign_count(row, auth.new_sign_count)   # solo se il contatore è avanzato
```

I controlli obbligatori sono cinque: la `challenge` è quella emessa e non è stata usata prima; l'origine corrisponde esattamente; l'`rpIdHash` nell'`authenticatorData` corrisponde al proprio domino; il flag `UP` (utente presente) è attivo e, se richiesto, anche `UV` (verifica utente); la firma è valida sulla chiave pubblica della credenziale. Se il nuovo `signCount` non è maggiore del precedente si registra un'anomalia: alcuni autenticatori restituiscono sempre zero, e la policy va scritta di conseguenza.

## Passkey o chiave hardware

Le passkey sincronizzate (iCloud Keychain, Google Password Manager, Windows Hello) sono credenziali FIDO2 salvate in un portachiavi protetto dal sistema e sincronizzate; le YubiKey sono credenziali `cross-platform` che vivono solo nel dispositivo. Il server non deve decidere per l'utente, ma può regolare il livello di garanzia: per il login consumer le passkey bastano; per accessi amministrativi a sistemi critici una policy "solo autenticatore hardware" va dichiarata, perché è ciò che distingue un fattore fisico custodito da una copia sincronizzata su più dispositivi.

```javascript
const cred = await navigator.credentials.get({
  publicKey: {
    challenge: Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0)),
    rpId: options.rpId,
    allowCredentials: options.allowCredentials,   // vuoto per passkey discoverable
    userVerification: "required",
    timeout: 60000,
  },
});
await fetch("/auth/verify", { method: "POST", body: JSON.stringify(cred) });
```

Con `allowCredentials` vuoto il browser propone le credenziali discoverable e l'utente sceglie la chiave senza digitare l'username: è il vero "tocco e sei dentro". Il server deve comunque identificare l'utente dalla `userHandle` restituita, mai dall'username inviato in una richiesta precedente non firmata.

## Ciclo di vita delle credenziali

| Evento | Azione lato server | Verifica |
| --- | --- | --- |
| Registrazione | salva credenziale, contatore | challenge consumata, origine esatta |
| Seconda chiave | consenti fino a N credenziali con nome | avviso se non esiste backup |
| Login | verifica firma e contatore | anomalia se il contatore regredisce |
| Sospetto clone | marca la credenziale come revocata | richiede re-registrazione |
| Sostituzione | revoca credenziale persa, registra la nuova | conferma da canale secondario |

La policy va scritta come codice e non come buona intenzione: limite massimo di credenziali per utente, notifica a ogni nuova registrazione, blocco delle registrazioni da sessioni molto vecchie o con IP inatteso, e un tempo massimo entro cui il nome della credenziale deve essere compilato. Senza questi controlli un pannello "gestisci le tue chiavi" diventa il punto di accesso più semplice per chi ha già rubato una sessione, e la resistenza al phishing si riduce a un dettaglio della pagina di login.

Il flusso di recupero resta il punto delicato: se il secondo fattore è la chiave, la recovery tramite email può diventare il punto debole, quindi va protetta con un codice di recupero monouso conservato fuori banda e con una notifica al login riuscito. Un modello solido è "due chiavi registrate, una delle quali custodita in cassaforte", che evita sia il blocco dell'utente sia la riduzione della sicurezza.

Per un'organizzazione, la procedura di enrolment va scritta prima dell'acquisto delle chiavi, perché determina modifiche ai processi: chi consegna il dispositivo (di persona o con spedizione tracciata e attivazione successiva), chi registra la credenziale e con quale identità verificata, dove finisce la chiave di riserva e con quale periodo di revisione. Un'attivazione che chiede all'utente di registrare la chiave da solo apre una finestra in cui un account compromesso può registrare una chiave dell'attaccante, nota come "enrolment hijack": la finestra si chiude chiedendo un'autenticazione forte esistente o una conferma fuori banda prima di accettare una nuova credenziale. Lo stesso controllo va applicato alla perdita del telefono, perché il recupero non deve mai essere più debole del fattore che sostituisce.

## Errori comuni

- **Origine o `rpId` derivati dall'header `Origin`**: bisogna confrontarli con una whitelist fissa; fidarsi dell'input è il modo più diretto per annullare la resistenza al phishing.
- **Challenge statica o riutilizzabile**: permette il replay di un'autenticazione già vista.
- **Un solo fattore senza dichiararlo**: se la chiave sta in tasca al dipendente insieme al badge, il possesso è doppio solo sulla carta.
- **Salvare la chiave pubblica in un formato non documentato**: senza il formato COSE standard la verifica di domani non è compatibile.
- **Non mostrare le credenziali all'utente**: senza elenco e nome, non si può capire quale chiave è stata persa né revocarla.

## In sintesi

WebAuthn è semplice solo in superficie: le due cerimonie richiedono challenge monouso, origine verificata, rpId corretto e firma controllata. Le passkey sincronizzate semplificano la vita, le chiavi hardware alzano il livello di garanzia. Il progetto non finisce con la registrazione: più credenziali, nomi leggibili, revoca e un flusso di recupero diventano requisiti operativi.

## Fonti

- [W3C - Web Authentication (WebAuthn)](https://www.w3.org/TR/webauthn-3/)
- [FIDO Alliance - Specification Overview](https://fidoalliance.org/specifications/fido2/)
- [RFC 8152 - COSE: CBOR Object Signing and Encryption](https://www.rfc-editor.org/rfc/rfc8152)
- [Yubico Developers - WebAuthn](https://developers.yubico.com/WebAuthn/)
