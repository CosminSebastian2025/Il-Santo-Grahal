In questo laboratorio colleghi due applicazioni a un IdP reale messo in piedi in locale: Keycloak in container con realm dedicato, un backend "portale" che usa il pattern BFF e un'API "ordini" che accetta solo token firmati con il giusto audience. Alla fine devi dimostrare quattro cose: che il login PKCE funziona, che l'API rifiuta un token con audience errato, che il logout chiude l'accesso anche dopo un refresh e che la rimozione di un utente da un gruppo ha effetto alla successiva autenticazione.

## Obiettivi

- Avviare Keycloak e creare realm, client pubblico e client confidenziale con il minimo necessario.
- Implementare il flusso Authorization Code + PKCE nel portale con verifica di `state`, `nonce` e `id_token`.
- Proteggere l'API con JWKS, `aud`, `iss` ed `exp`, più controllo dello scope.
- Verificare in negativo: token con `aud` sbagliato, `state` alterato, logout con sessione attiva.

## Passo 1: IdP locale

Keycloak 26 si avvia con l'immagine ufficiale e un database di sviluppo; la modalità `start-dev` è solo per il laboratorio, perché non usa HTTPS e non ha persistenza adatta alla produzione.

```bash
docker run -d --name kc -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=cambiami \
  quay.io/keycloak/keycloak:26.0 start-dev

# later: apri http://localhost:8080/admin e crea il realm "lab"
curl -s http://localhost:8080/realms/lab/.well-known/openid-configuration \
  | jq '{issuer, authorization_endpoint, token_endpoint, jwks_uri, end_session_endpoint}'
```

Se `jwks_uri` risponde 404, il realm non esiste o ha un nome diverso: è il primo errore da escludere prima di toccare il codice. Da qui annota l'`issuer` esatto, che è sempre `http://localhost:8080/realms/lab`.

## Passo 2: i due client

| Proprietà | `portale` (BFF) | `api-ordini` (audience) |
| --- | --- | --- |
| Tipo | OpenID Connect, confidenziale | client con solo scope |
| Standard flow | attivo | disattivo |
| Secret | sì, custodito nel backend | nessuno |
| Valid redirect URI | `http://localhost:3000/callback` | — |
| Token audience | `api-ordini` come audience mapper | — |

Nell'ID token del portale aggiungi un mapper di audience verso `api-ordini`, così l'`access_token` che invierà all'API avrà `aud: "api-ordini"`. Senza il mapper l'API rifiuterà tutto con `401`, ed è il comportamento corretto: l'audience è il contratto di consumo del token, non un dettaglio.

```json
{ "aud": "api-ordini", "iss": "http://localhost:8080/realms/lab",
  "sub": "b7f1…", "scope": "openid ordini:lettura",
  "exp": 1793590800, "iat": 1793589900 }
```

## Passo 3: il login PKCE

Il portale genera `code_verifier` casuale, ne calcola lo SHA-256 in base64url come `code_challenge`, salva `state` e `nonce` nella sessione server-side e reindirizza l'utente.

```python
import base64, hashlib, secrets, urllib.parse

def inizio_login(sess) -> str:
    verifier = secrets.token_urlsafe(64)                      # 43–128 caratteri
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    sess["pkce_verifier"] = verifier
    sess["state"] = secrets.token_urlsafe(16)
    sess["nonce"] = secrets.token_urlsafe(16)
    q = {"response_type": "code", "client_id": "portale",
         "redirect_uri": "http://localhost:3000/callback",
         "scope": "openid ordini:lettura", "state": sess["state"],
         "nonce": sess["nonce"], "code_challenge": challenge,
         "code_challenge_method": "S256"}
    return "http://localhost:8080/realms/lab/protocol/openid-connect/auth?" + \
           urllib.parse.urlencode(q)

def fine_login(sess, code: str, state: str, token_json) -> dict:
    assert secrets.compare_digest(state, sess.pop("state")), "state non valido"
    idt = jwt.decode(token_json["id_token"], ...)              # firma, iss, aud, exp
    assert idt["nonce"] == sess.pop("nonce"), "nonce non valido"
    return idt                                                # sessione BFF: salva idt["sub"]
```

`state` va confrontato con `secrets.compare_digest` e consumato una sola volta. Il `nonce` lega l'`id_token` a questa specifica richiesta: se manca, un token catturato da un altro flusso può essere rigiocato.

## Passo 4: l'API che rifiuta

L'API verifica con JWKS locale, poi accetta solo `aud: "api-ordini"` e lo scope `ordini:lettura`. Il test negativo è la prova che la configurazione funziona.

```bash
# token valido
TOKEN=$(curl -s -X POST http://localhost:8080/realms/lab/protocol/openid-connect/token \
  -d grant_type=password -d client_id=portale -d client_secret=$SECRET \
  -d username=mario -d password=mario -d scope="openid ordini:lettura" | jq -r .access_token)

curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $TOKEN" \
  http://localhost:8090/ordini                     # atteso 200

# token emesso per un client diverso: audience diversa, l'API deve rifiutarlo
curl -s -X POST http://localhost:8080/realms/lab/protocol/openid-connect/token \
  -d grant_type=password -d client_id=report -d username=mario -d password=mario \
  | jq -r .access_token > /tmp/altro.jwt
# atteso 401: il token non ha aud "api-ordini"
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $(cat /tmp/altro.jwt)" \
  http://localhost:8090/ordini
```

Se l'API risponde 200 anche al secondo token, il controllo dell'audience non è attivo: è l'errore più frequente nelle prime integrazioni, e il test negativo va tenuto in CI come qualunque altro test.

## Passo 5: logout e gruppi

Il logout chiama `end_session_endpoint` con `id_token_hint` e `post_logout_redirect_uri` registrato. Il test: prendi il cookie di sessione, fai logout, riprova l'accesso con lo stesso cookie → il portale deve rimandare al login. Poi aggiungi `backchannel logout URL` a un secondo client del realm (`report`) e osserva la POST `logout_token` sul tuo endpoint: il payload è un JWT firmato con i claim `sid` e `sub`, e deve corrispondere alla sessione che vuoi chiudere. La richiesta più comune da sbagliare è il client "client-initiated backchannel": va abilitato sulla scheda del client, altrimenti la chiamata non parte e il servizio resta autenticato.

```bash
# rimuovi mario dal gruppo "ordini-admin" con la Admin REST API
TOKEN=$(curl -s -d client_id=admin-cli -d username=admin -d password=cambiami \
  -d grant_type=password http://localhost:8080/realms/master/protocol/openid-connect/token \
  | jq -r .access_token)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/admin/realms/lab/users/$UID/groups/$GID -o /dev/null -w "%{http_code}\n"
```

Dopo la rimozione, il vecchio `access_token` continua a funzionare fino a `exp`: è il motivo per cui la vita dei token va richiesta corta (5–15 minuti) e i permessi sensibili vanno rivalidati.

## Errori comuni

- **Avviare Keycloak con `start-dev` e credenziali predefinite**: l'ambiente viene esposto su Internet e nessuno se ne accorge.
- **Redirect URI con wildcard**: il laboratorio corretto usa l'URL esatto di callback, altrimenti un `code` può finire su un altro host.
- **Riutilizzare `state` o `nonce`**: nessuna verifica, quindi nessuna protezione contro CSRF e replay.
- **Dimenticare il mapper di audience**: l'API risponde 401 e si finisce per disattivare il controllo `aud`, che era la difesa migliore.
- **Considerare il logout del portale un logout globale**: chi ha un'altra scheda sui servizi resta autenticato fino alla scadenza.

## In sintesi

Un'integrazione SSO si valida nei casi negativi: audience sbagliata, `state` alterato, sessione riutilizzata dopo il logout. Keycloak in `start-dev` è sufficiente per provare PKCE, mapper di audience, `end_session_endpoint` e back-channel. La revoca dei gruppi ha effetto alla successiva autenticazione: token brevi e rivalidazione per le azioni sensibili.

## Fonti

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 9700 - Best Current Practice for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)
- [Keycloak - Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Keycloak - Guides](https://www.keycloak.org/guides)
