Il Cross-Site Request Forgery sfrutta una proprietà scomoda del web: il browser allega da solo le credenziali di un sito a ogni richiesta che quel sito riceve, anche quando la richiesta è partita da una pagina di un altro dominio. Se il server autentica le operazioni solo guardando il cookie di sessione, allora chiunque riesca a far partire una richiesta dal browser della vittima può far eseguire un'azione a suo nome. Questa lezione spiega il meccanismo, i tre ingredienti che lo rendono possibile e perché SameSite e i token sincronizzati sono le difese che contano.

## Obiettivi

- Ricostruire con precisione la sequenza di richieste che porta a un CSRF riuscito.
- Distinguere CSRF da XSS e spiegare perché la stessa difesa non copre entrambi.
- Riconoscere i tre presupposti necessari: credenziale ambientale, azione con effetti e assenza di verifica sull'intento.
- Spiegare come SameSite, token e controlling origin riducono la superficie d'attacco.

## Il meccanismo in tre passi

Il CSRF funziona quando il browser è già autenticato verso il bersaglio e l'attaccante riesce a provocare una richiesta verso quel bersaglio mentre la vittima naviga altrove. Non c'è furto di credenziali: il cookie di sessione resta nel browser e resta valido, l'attaccante non lo vede mai. Il server riceve una richiesta che, dal suo punto di vista, è indistinguibile da una fatta dall'utente.

```text
1. login    vittima -> banca.example   Set-Cookie: sid=...; HttpOnly; Secure
2. esca     vittima apre evil.example, che contiene un form verso banca
3. invio    il browser invia POST /bonifico con il cookie sid (SameSite=None)
4. effetti  banca non distingue la richiesta: il bonifico parte
```

Per montare l'esca non serve JavaScript. Un form inviato automaticamente al caricamento basta, e anche un'immagine con un URL che provoca un'azione in `GET` funziona. Oggi la maggior parte dei browser adotta `SameSite=Lax` come valore predefinito per i cookie privi di attributo, e Lax non invia il cookie sulle `POST` cross-site: questo ha tagliato molto la superficie pratica del CSRF, ma non l'ha eliminata, perché i cookie `SameSite=None` (tipici delle integrazioni cross-site), gli schemi a più sottodomini e le richieste `GET` mutanti restano esposti.

| Elemento | Ruolo nel CSRF | Se manca |
| --- | --- | --- |
| credenziale ambientale | il cookie viene allegato automaticamente | l'attaccante non può agire come la vittima |
| azione con effetti | modifica stato: bonifico, cambio email, cancellazione | nessun danno, solo lettura |
| assenza di prova d'intento | server non distingue richiesta propria da altrui | il CSRF fallisce per costruzione |

## CSRF non è XSS

Con XSS l'attaccante esegue codice nell'origine del sito e può leggere la pagina, quindi anche il token anti-CSRF. Con CSRF l'attaccante non vede niente: manda una richiesta cieca e non legge la risposta, perché la Same-Origin Policy gli impedisce di leggere il contenuto di `banca.example` dalla pagina di `evil.example`. Le richieste partono, le risposte no.

Da qui seguono due conseguenze pratiche. La prima: una CSP restrittiva e la codifica degli output, che difendono da XSS, non bloccano il CSRF. La seconda: il token CSRF è efficace solo se XSS non è presente, perché uno script nell'origine può leggere il token dal DOM o dalle API. Le due vulnerabilità vanno trattate come strati separati, e un test di sicurezza deve cercarle entrambe indipendentemente.

| Caratteristica | CSRF | XSS |
| --- | --- | --- |
| codice dell'attaccante gira dove | pagina dell'attaccante | origine del sito |
| legge la risposta? | no | sì |
| difesa principale | token, SameSite, controllo dell'origine | codifica output, CSP |
| effetto tipico | azione eseguita a nome della vittima | furto dati, session hijacking |

## Come si rompe la catena

Le difese si applicano in profondità, e ciascuna copre un punto diverso della catena.

La prima è il cookie stesso: `SameSite=Lax` o `Strict`, insieme a `Secure` e `HttpOnly`, riduce le situazioni in cui il cookie viaggia su richieste cross-site. `HttpOnly` impedisce a JavaScript di leggere il cookie, ma non impedisce al browser di allegarlo.

La seconda è il token sincronizzato: il server emette un valore casuale legato alla sessione, la pagina lo inserisce in un campo nascosto o in un header, e il server rifiuta le richieste che non lo riportano. Lo standard OWASP aggiunge una variante più robusta, la *signed double-submit cookie*: il token è anche in un cookie, il client lo ricopia in un header e il server verifica firma e uguaglianza. Così il token non deve restare in stato sul server e non serve una sessione già aperta.

La terza è il controllo dell'origine: rifiutare le richieste con effetto collaterale che arrivano con `Origin` diversa da quella attesa. È il principio del *controlling origin* usato da Django, che limita l'uso delle sole `GET` sicure e impone la verifica su `POST`, `PUT`, `PATCH` e `DELETE`.

```http
POST /bonifico HTTP/1.1
Host: banca.example
Origin: https://evil.example
Cookie: sid=abc123
Sec-Fetch-Site: cross-site
Content-Type: application/x-www-form-urlencoded

importo=5000&iban=IT00...
```

Con queste righe il server ha tre segnali indipendenti per dire no: il cookie potrebbe non arrivare (SameSite), l'header `Origin` è estraneo e `Sec-Fetch-Site: cross-site` è esplicito. Un controllo su un solo segnale è fragile; tre insieme costringono l'attaccante a un errore molto più difficile.

Un'ultima nota di progettazione: le azioni con effetti collaterali non vanno mai esposte in `GET`. Un'immagine `<img src="https://banca.example/elimina?id=7">` è una `GET` cross-site, e con Lax il cookie parte perché la richiesta è di primo livello in navigazione. Solo il vincolo di metodo semantico rende prevedibile quale protezione si applica.

## Errori comuni

- **Mettere il token in un cookie senza confrontarlo con il corpo della richiesta**: è doppio invio solo sulla carta; senza confronto non prova nulla.
- **Accettare token riusabili per sempre**: un token legato a un'origine sola e mai ruotato facilita il furto tramite XSS e l'analisi offline.
- **Affidarsi solo a `Referer`**: l'header può mancare per policy sulla privacy e per questo è un controllo di fallback, non principale.
- **Disabilitare SameSite su tutto per un'integrazione**: `SameSite=None` va ristretto ai percorsi necessari, non applicato al dominio intero.
- **Considerare sicura una API solo perché usa JSON**: `text/plain` e `application/x-www-form-urlencoded` sono "simple requests" e partono cross-site senza preflight CORS.

## In sintesi

Il CSRF è un attacco di confusione dei ruoli: il browser della vittima diventa il client dell'attaccante, e il server non ha modo di saperlo se crede solo al cookie. Le difese riducono i presupposti: SameSite limita l'invio automatico, il token dimostra che la richiesta è stata costruita dalla pagina giusta, il controllo di `Origin` e `Sec-Fetch-Site` aggiunge un segnale indipendente. XSS e CSRF vanno trattati separatamente perché guardano lati diversi della stessa richiesta.

## Fonti

- [MDN - Cross-site request forgery (CSRF)](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF)
- [OWASP - Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [web.dev - SameSite cookies explained](https://web.dev/articles/samesite-cookies-explained)
- [MDN - Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
