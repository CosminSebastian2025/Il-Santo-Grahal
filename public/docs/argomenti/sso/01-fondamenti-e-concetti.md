Il Single Sign-On (SSO) è la promessa di autenticarsi una volta sola e accedere a molti servizi. Dietro questa frase semplice c'è una divisione precisa dei ruoli: un provider di identità autentica la persona e rilascia un'asserzione firmata; i servizi applicativi si fidano di quella asserzione e decidono cosa consentire. Capire dove finisce l'autenticazione e dove inizia l'autorizzazione è la chiave per non confondere SSO, OAuth e un semplice cookie di sessione condiviso.

## Obiettivi

- Distinguere identità, autenticazione, autorizzazione e sessione nel flusso SSO.
- Confrontare SAML 2.0, OIDC e Kerberos sui ruoli e sul tipo di token scambiato.
- Scegliere il flusso OAuth/OIDC giusto per un'app web, una SPA o un'app desktop.
- Riconoscere i rischi ricorrenti: fixation, redirect non validati, logout incompleto.

## I quattro ruoli

| Ruolo | Funzione | Esempio |
| --- | --- | --- |
| IdP (Identity Provider) | autentica l'utente, emette asserzioni o token | Entra ID, Keycloak, Okta |
| SP / RP (relying party) | si fida dell'IdP, crea la propria sessione | gestionale, wiki, dashboard |
| Utente | si autentica una volta all'IdP | dipendente |
| Broker / discovery | indirizza l'utente verso l'IdP giusto | indirizzo email → IdP, `authorize` con `acr_values` |

Il servizio applicativo **non vede mai la password**: riceve un'asserzione o un token firmato, ne verifica la firma e i claim (`iss`, `aud`, `exp`, `nbf`) e solo dopo crea una sessione locale, di solito un cookie opaco. Questo ha un effetto importante: la revoca all'IdP non chiude automaticamente le sessioni già aperte sui servizi, perché ognuno ha il proprio cookie con la propria durata. Il logout SSO richiede una catena di chiamate (SAML `LogoutRequest`, OIDC `end_session_endpoint` e `back-channel logout`) e va progettata, non improvvisata.

La federazione è la generalizzazione: due organizzazioni diverse (un'università e un fornitore SaaS) si fidano delle rispettive identità in base a una relazione di trust documentata. In SAML questa fiducia si materializza nello scambio di metadati con certificati di firma; in OIDC nella registrazione del client, con `client_id` e un segreto o una chiave.

## SAML, OIDC e Kerberos: quando usare cosa

SAML 2.0 usa messaggi XML firmati e si scambia tramite redirect del browser (POST binding): l'utente viene portato all'IdP, si autentica, torna all'SP con un'`Assertion` XML. OIDC è un livello sopra OAuth 2.0: il flusso restituisce un `id_token` JWT con i claim dell'utente e un `access_token` per le API. Kerberos lavora invece su rete interna con ticket `TGT` e `TGS`, senza browser tra i due sistemi: è l'SSO nativo di Active Directory.

```text
# OIDC Authorization Code + PKCE (RP confidenziale o SPA)
GET /authorize?response_type=code
    &client_id=dashboard
    &redirect_uri=https://dashboard.example.com/callback
    &scope=openid%20profile%20email
    &state=8f3c1a&nonce=4b2e9d
    &code_challenge=...&code_challenge_method=S256
  → 302 a IdP → login → callback con ?code=...&state=8f3c1a
POST /token  code + code_verifier + client_secret
  → id_token (JWT firmato) + access_token + refresh_token
```

| Criterio | SAML 2.0 | OIDC | Kerberos |
| --- | --- | --- | --- |
| Formato | XML firmato | JWT JSON | ticket binari |
| Tipo di client | browser, applicazioni enterprise | browser, API, mobile, desktop | client integrati nel dominio |
| Revoca | come back-channel o `NotOnOrAfter` | back-channel logout, introspection | durata del ticket, `krb5` policy |
| Comune in | SaaS aziendali, PA | consumer, API, cloud | reti Windows, database interni |

La scelta pratica: SAML quando il fornitore lo impone o si integrano sistemi legacy burocratici; OIDC quando si parte nuovi, perché lo stesso `id_token` contribuisce all'identità e l'`access_token` serve l'API; Kerberos quando l'SSO deve essere trasparente nella rete aziendale senza browser.

Un dettaglio che distingue chi ha già integrato un IdP: i claim di SAML arrivano come attributi XML con nomi lunghi e varianti di formato, quelli OIDC come JSON con chiavi corte. In entrambi i casi la mappatura verso i ruoli locali è una configurazione da versionare, e il gruppo `admins` dell'IdP non deve diventare un amministratore dell'app senza una regola esplicita: la federazione trasporta un'identità, non un'autorizzazione. Prima di scrivere il primo login conviene fissare tre cose: chi è l'IdP di riferimento, quali claim descrivono la persona e con quale nome, e per quanto tempo la sessione locale può restare valida senza rivalidare l'IdP. Sono tre decisioni che cambiano il codice più di qualunque libreria.

## Flussi OAuth: cosa non fare

OAuth 2.0 è un framework di **delega** delle autorizzazioni, non un protocollo di autenticazione; OIDC aggiunge l'autenticazione con `id_token`. Il flusso corretto per un'app è Authorization Code con PKCE: il `code` viene scambiato direttamente dal client con `client_secret` (RP confidenziale) o con `code_verifier` (SPA e app mobile, senza segreto). Il vecchio Implicit Flow consegnava token nell'URL del browser ed è deprecato dalla RFC 9700 (OAuth 2.0 Security Best Current Practice).

| Pratica | Perché | Conseguenza se assente |
| --- | --- | --- |
| `state` verificato | anti-CSRF sul callback | attaccante forza un login con un altro account |
| `nonce` nell'`id_token` | anti-replay | token di un altro flusso riutilizzato |
| `redirect_uri` esatta | nessun open redirect | `code` o token esfiltrabili altrove |
| validazione `iss`, `aud`, `exp` | il token è per il tuo servizio | token emesso per altri accettati |
| PKCE su public client | il `code` non basta da solo | interception su redirect non HTTPS |

## Errori comuni

- **Usare il cookie SSO come autorizzazione**: ruoli e permessi vanno nella tua applicazione, non dedotti dalla presenza della sessione.
- **Dimenticare la durata e la revoca delle sessioni locali**: un utente licenziato conserva l'accesso fino alla scadenza dei cookie di ogni servizio.
- **Costruire un IdP interno per un'app sola**: si accumulano password, reset e MFA da mantenere; meglio un IdP standard anche self-hosted.
- **Token in `localStorage` per comodità**: un XSS esfiltra il token; su SPA si preferisce cookie `HttpOnly` con BFF o token a vita breve con rotazione.
- **Logout che pulisce solo il servizio corrente**: la sessione all'IdP resta attiva e un nuovo accesso ricrea la sessione all'insaputa dell'utente.

## In sintesi

SSO separa l'autenticazione (IdP) dall'autorizzazione (applicazione) e dalla sessione locale (cookie per servizio). SAML, OIDC e Kerberos rispondono allo stesso problema con formati e contesti diversi. Il flusso corretto per nuovi sistemi è Authorization Code con PKCE e validazione rigorosa di `state`, `nonce` e claim; la revoca è un processo, non un pulsante.

## Fonti

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OASIS - SAML 2.0 Core](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)
- [RFC 9700 - Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)
- [RFC 6750 - The OAuth 2.0 Bearer Token Usage](https://www.rfc-editor.org/rfc/rfc6750)
