Configurare un IdP richiede una giornata; farlo in modo che regga tre anni richiede di decidere dove vivono le sessioni, come si propagano i gruppi, cosa succede quando un dipendente lascia l'azienda e dove si fidano del token. In questa lezione vediamo la configurazione concreta dei pezzi che di solito si sbagliano: client OIDC registrati con precisione, verifica dei token lato API, sessioni e logout, mappatura dei gruppi e flusso per le applicazioni desktop.

## Obiettivi

- Registrare un client OIDC pubblico e uno confidenziale con differenze di sicurezza corrette.
- Verificare un `access_token` in un'API tramite JWKS, scoping e audience.
- Progettare logout e back-channel logout con sessioni server-side.
- Usare `groups`/`roles` con mappatura esplicita e gestire la revoca degli ex dipendenti.

## Client: pubblico, confidenziale, e la scelta del BFF

Un **client pubblico** (SPA, desktop, mobile) non può custodire un segreto: usa Authorization Code + PKCE e riceve il token direttamente. Un **client confidenziale** (backend) ha un `client_secret` e può anche svolgersi come BFF (backend for frontend): il browser riceve solo un cookie `HttpOnly` di sessione, mentre il back end custodisce i token. Il BFF è la soluzione più robusta per la web app: elimina il token dal JavaScript, quindi un XSS non può esfiltrare l'`access_token` né i refresh token.

| Scelta | Client pubblico | Client confidenziale | BFF |
| --- | --- | --- | --- |
| Segreto | nessuno | sì, custodito | sì, nel backend |
| Token nel browser | access token in memoria | no | mai |
| PKCE | obbligatorio | consigliato comunque | sì |
| Refresh token | rotazione obbligatoria | sì | sì, in cookie o store |
| Rischio XSS | token esfiltrabile | — | limitato al cookie di sessione |

## Verifica del token nelle API

Un'API non deve fidarsi di un JWT senza verificarlo: firma con la chiave pubblica dell'IdP (endpoint JWKS), algoritmo ammesso esplicitamente, `iss` atteso, `aud` uguale a quello del servizio, `exp`/`nbf` controllati. Un JWT verificato dice *chi*, ma non *cosa può fare*: il claim `scope` o `roles` va confrontato con i permessi che l'endpoint richiede, e le risorse vanno filtrate anche per essere sicuri che il soggetto appartenga al tenant.

```python
import jwt
from jwt import PyJWKClient

jwks = PyJWKClient("https://idp.example.com/.well-known/jwks.json")
signing_key = jwks.get_signing_key_from_jwt(token).key

claims = jwt.decode(
    token,
    signing_key,
    algorithms=["RS256"],            # niente "none", niente HS256 con chiave dell'IdP
    audience="api-ordini",           # il token è emesso per questa API
    issuer="https://idp.example.com/realms/prod",
    leeway=30,
)
if "ordini:lettura" not in claims.get("scope", "").split():
    raise PermissionError("scope insufficiente")
```

La validazione locale della firma rende le API veloci ma non conosce le revoche: un token a vita breve (5–15 minuti) limita la finestra. Per azioni sensibili, come il cambio di metodo di pagamento o il rilascio di crediti, conviene una rivalidazione all'IdP (introspezione) o un secondo fattore appena verificato ricondotto in un claim. Un dettaglio operativo: le chiavi di firma dell'IdP ruotano, quindi il JWKS va letto con una cache breve (cinque minuti) e un reload forzato quando la firma non si valida, altrimenti dopo la rotazione tutte le richieste falliscono senza una causa evidente nei log.

## Sessioni, logout e back-channel

La sessione vive in due posti: all'IdP (cookie SSO) e su ogni applicazione (cookie di sessione). Il logout federato ha tre parti: il servizio termina la propria sessione, chiama l'`end_session_endpoint` con `id_token_hint`, l'IdP chiude la sessione SSO e — se configurato — invia `back-channel logout` a tutti i client registrati con un `sid` o `sub`. Senza back-channel, l'IdP chiude la sessione ma gli altri servizi continuano a fidarsi del proprio cookie.

```yaml
# Regole da rispettare, non solo da documentare
sessioni:
  durata_sessione_app: 8h            # allineata alla giornata lavorativa
  idle_timeout: 30m
  reauth_operazioni_sensibili: sì
  refresh_token_rotazione: sì
  revoca_per_disattivazione: immediata
logout:
  back_channel: configurato
  front_channel_fallback: sì
```

Su applicazioni con sessioni server-side l'`sid` del `id_token` va salvato: arriva nel logout back-channel e permette di cancellare proprio quella sessione, senza toccare le altre sessioni dello stesso utente aperte da un altro dispositivo.

## Gruppi, ruoli e ciclo di vita

Il claim `groups` dell'IdP diventa utile solo se c'è una mappatura versionata: `gruppo_idp → ruolo_app`, con un default minimo per chi non ricade in alcun gruppo. Le autorizzazioni si aggiornano alla successiva autenticazione, quindi la rimozione temporanea di un utente dal gruppo ha effetto reale solo dopo il rinnovo del token o del cookie; per i casi urgenti serve una revoca lato applicazione, non l'attesa della scadenza.

La disattivazione dell'account all'IdP è l'unico punto di controllo per tutti i servizi: va automatizzata (provisioning SCIM o API amministrative) e verificata con un controllo periodico che confronta l'elenco degli utenti attivi con quello delle identità dell'IdP. Gli account "orfani" — utenti presenti nell'app ma non nell'IdP — sono il residuo più comune dopo una migrazione, e vanno disattivati in blocco prima di considerare chiusa la migrazione verso l'SSO.

## Desktop, CLI e mobile

Un'app desktop usa Authorization Code + PKCE con `redirect_uri` di loopback (`http://127.0.0.1:porta/callback`) oppure il flusso device (RFC 8628) per dispositivi senza browser. Per le CLI il flusso device mostra un codice da digitare e l'utente conferma da un telefono: è lo stesso meccanismo che rende possibile l'SSO su attrezzature di rete senza interfaccia grafica.

| Client | Flusso | Attenzione |
| --- | --- | --- |
| Web con backend | BFF con code + PKCE | cookie `SameSite=Lax`, CSRF token |
| SPA senza backend | code + PKCE | token in memoria, no `localStorage` |
| Desktop | loopback + PKCE | non registrare `redirect_uri` wildcard |
| CLI / dispositivo | device flow | polling con `interval` rispettato |
| Mobile | code + PKCE con `state` | app switch e verifica del chiamante |

## Errori comuni

- **Un token emesso per il portale accettato dall'API di amministrazione**: `aud` non controllato; la separazione degli audience è la difesa più semplice.
- **Fidarsi della libreria per la scelta dell'algoritmo**: passare l'intero set di algoritmi ammette `HS256` con la chiave pubblica dell'IdP come segreto; dichiarare solo `RS256` o il set previsto.
- **Logout che non cancella il refresh token**: la sessione "chiusa" si riapre al primo accesso.
- **Claim `groups` usati per autorizzare senza mappatura**: il gruppo `staging-users` può diventare `admin` per un errore di nome.
- **Account orfani dopo migrazione**: utenti presenti nell'app ma assenti dall'IdP continuano ad autenticarsi con credenziali locali.

## In sintesi

Il client si sceglie in base a dove vive il token: BFF per abilitare, PKCE per i client pubblici. L'API verifica firma, algoritmo, issuer, audience ed exp, poi applica scope e tenant. La sessione vive in due posti e il logout federato deve cancellare entrambi, con back-channel per gli altri servizi. I gruppi diventano ruoli solo attraverso una mappatura versionata, e la disattivazione passa da un unico flusso automatizzato.

## Fonti

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 9700 - Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)
- [RFC 6750 - The OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750)
- [RFC 7517 - JSON Web Key (JWK), usata dagli endpoint JWKS](https://www.rfc-editor.org/rfc/rfc7517)
- [RFC 8628 - OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628)
