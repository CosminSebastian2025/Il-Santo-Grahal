Un'API nasce con la versione 1 ma deve sopravvivere alla versione 4 senza rompere i client che non si sono aggiornati. In parallelo deve dire in modo inequivocabile chi sta chiamando e come può chiamare, e deve rispondere agli errori con la stessa precisione con cui risponde ai successi. Questa lezione affronta i tre pilastri della manutenzione di un contratto: versioning, errori coerenti e autenticazione.

## Obiettivi

- Distinguere i cambiamenti compatibili da quelli che rompono il contratto.
- Scegliere una strategia di versioning e applicarla in modo uniforme.
- Usare status HTTP e Problem Details per errori prevedibili.
- Confrontare API key e OAuth 2.0 e il loro ruolo nell'autorizzazione.
- Applicare i controlli di rate limiting e identificazione degli errori di sicurezza.

## Versioning: cosa rompe e cosa no

Prima di scegliere la sintassi (`/v1/` nel percorso, header `Accept: application/vnd.example.v2+json`, parametro di query) bisogna sapere cosa merita una nuova versione. Un client si rompe quando cambia il significato di qualcosa che già usava.

| Cambiamento | Compatibile | Rompe il contratto |
| --- | --- | --- |
| Aggiungere un campo nuovo alla risposta | Sì | No |
| Aggiungere un endpoint nuovo | Sì | No |
| Aggiungere un valore a un'enumerazione | Con cautela | Spesso sì |
| Rendere obbligatorio un campo in input | No | Sì |
| Rinominare o rimuovere un campo | No | Sì |
| Cambiare il tipo di un campo (`string` → `integer`) | No | Sì |
| Cambiare il codice di stato di un caso esistente | No | Sì |

I principi da tenere presenti sono due. Il primo: gli aggiungere sono quasi sempre innocui, ma solo se i client ignorano i campi che non conoscono. Il secondo: i cambiamenti distruttivi vanno raggruppati e annunciati, non introdotti alla chetichella perché "tanto nessuno li usa".

Il versioning nell'URL è il più visibile e il più semplice da cablare in un gateway; il versioning tramite header media type è più "puro" ma quasi invisibile in log e browser. Per la maggior parte dei team il primo vince in chiarezza operativa. Qualunque scelta, serve una regola: la vecchia versione resta in piedi per un periodo definito e documentato, con un header di deprecazione.

```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 31 Jan 2027 23:59:59 GMT
Link: <https://api.example.com/v2/orders>; rel="successor-version"
```

Il `Sunset` comunica una data concreta: i client possono loggare avvisi in anticipo invece di scoprire la rottura il giorno stesso.

## Errori coerenti e osservabili

L'uso di codici HTTP corretti non basta se i messaggi sono diversi a ogni endpoint. RFC 9457 definisce un formato che i framework moderni espongono senza inventare nulla.

```json
{
  "type": "https://api.example.com/problems/rate-limited",
  "title": "Troppe richieste",
  "status": 429,
  "detail": "Hai superato il limite di 100 richieste al minuto.",
  "retryAfter": 42
}
```

Le buone pratiche in fase di errore:

- **`401` contro `403`**: `401` significa "credenziali assenti o non valide, autenticati prima"; `403` significa "so chi sei, ma non puoi". Accompagna sempre il `401` con `WWW-Authenticate`.
- **`429` con `Retry-After`**: il client deve sapere quando riprovare, altrimenti insiste e peggiora il carico.
- **`409` per i conflitti di stato**, come due pagamenti sullo stesso ordine.
- **`500` senza dettagli interni**: restituisci un identificativo di correlazione, non la traccia.

In OWASP API Security Top 10 il problema API4 del 2023 è il consumo illimitato di risorse, API8 la configurazione errata, che comprende messaggi di errore troppo verbosi. Un formato uniforme è quindi anche una misura di sicurezza: sai esattamente cosa stai rivelando.

## Autenticazione: API key, OAuth 2.0 e token

L'autenticazione risponde a "chi sei", l'autorizzazione a "cosa puoi fare". Si confondono spesso perché lo stesso header le trasporta.

- **API key**: una stringa segreta associata a un client, semplice e adatta ai servizi server-to-server interni. Non identifica un utente, non scade per default e non dice *cosa* il client può fare: va affiancata da scope o permessi espliciti, trasmessa su TLS e mai in query string.
- **OAuth 2.0**: un framework di delega in cui il client ottiene un access token da un authorization server, senza vedere le credenziali dell'utente. Il token è tipicamente un Bearer token, presentato in `Authorization: Bearer ...` secondo RFC 6750.

```http
GET /v2/orders HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9....
```

Un access token ha vita breve; il client lo rinnova con un refresh token o con il flusso *client credentials* per le chiamate server-to-server. Per le applicazioni che agiscono per conto di un utente lo standard è *authorization code con PKCE*.

Qualunque schema scegli, applica gli stessi controlli di base:

| Controllo | Perché conta |
| --- | --- |
| TLS obbligatorio | Un token in chiaro è una credenziale compromessa |
| Scadenza breve del token | Riduce il danno in caso di furto |
| Scope o claims espliciti | Impedisce che un token "generico" acceda a tutto |
| Rate limiting per chiave | Blocca abuso e tentativi di forza bruta |
| Log delle chiamate fallite | Rende rilevabile un credential stuffing |

Attenzione al problema API1 del 2023, il Broken Object Level Authorization: ogni endpoint che accetta un ID deve controllare che l'utente del token possa accedere a quella specifica risorsa.

## Errori comuni

- **Versionare alla cieca**: introdurre `/v2` per un campo aggiuntivo aggiunge manutenzione senza proteggere nessuno.
- **Mescolare autenticazione e autorizzazione**: controllare solo la presenza di un token valido senza verificare i permessi sulla risorsa specifica.
- **Mettere l'API key nella query string**: basta un log di accesso condiviso perché la chiave finisca dove non dovrebbe.
- **Restituire `500` per errori di input**: sposta la colpa sul client e rende impossibile distinguere un bug del server da una richiesta sbagliata.

## In sintesi

- Versiona solo per cambiamenti che rompono il contratto, con una data di sunset dichiarata.
- Errori uniformi su RFC 9457, con status distinti tra autenticazione e autorizzazione.
- API key per fiducia server-to-server; OAuth 2.0 quando serve delega e token a vita breve.
- Ogni endpoint con un ID deve verificare i permessi sulla risorsa, non solo la validità del token.

## Fonti

- RFC 9457 — Problem Details for HTTP APIs: https://www.rfc-editor.org/rfc/rfc9457.html
- RFC 6750 — Bearer Token Usage: https://www.rfc-editor.org/rfc/rfc6750.html
- OWASP API Security Top 10 (2023): https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OAuth 2.0: https://oauth.net/2/
