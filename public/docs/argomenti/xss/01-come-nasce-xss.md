Il cross-site scripting nasce da una confusione di ruoli: l'applicazione prende dati che considera testo e li fa diventare struttura dentro una pagina. Quando i dati provengono da un utente e la pagina li interpreta come markup o codice, il browser esegue istruzioni che non hai scritto. In questa lezione vediamo perché accade, come si riconosce e come si previene.

## Obiettivi

- Distinguere XSS riflesso, memorizzato e basato sul DOM.
- Capire il ruolo dei contesti di output: HTML, attributo, URL, CSS e JavaScript.
- Riconoscere perché la codifica degli output è la difesa principale.
- Spiegare l'impatto di uno script eseguito nell'origine dell'applicazione.

## Il contesto di output

Ogni dato inserito in una pagina viene interpretato secondo il contesto in cui compare. Un nome tra due tag di paragrafo è testo; lo stesso nome dentro un attributo tra virgolette è un valore; dentro un blocco `script` è codice. La difesa segue da qui: dipende dal contesto, e una codifica pensata per HTML non protegge un valore che finisce in JavaScript.

| Contesto | Esempio | Codifica corretta |
| --- | --- | --- |
| Corpo HTML | `<p>{{ testi }}</p>` | caratteri speciali HTML |
| Attributo quoted | `<input value="{{ v }}">` | attributi di entità |
| URL | `<a href="{{ url }}">` | validazione e percent-encoding |
| JavaScript inline | `<script>const v = "{{ v }}";</script>` | serializzazione JSON, idealmente evitato |
| CSS | `style="color: {{ c }}"` | lista di valori ammessi |

La codifica degli output è la difesa principale perché non indovina quali ingressi siano malevoli: garantisce che qualunque in ingresso resti testo. La validazione degli input serve alla forma dei dati, non basta come difesa, perché campi ricchi come commenti e nomi file esistono e vanno trattati come non fidati.

Il lavoro più produttivo non è cercare input malevoli ma elencare i punti in cui i dati entrano nella pagina. Un punto non mappato è un punto in cui la codifica non può essere verificata, e il bug arriverà dal percorso che nessuno ha considerato.

## XSS riflesso

Nel caso riflesso il dato viaggia nella richiesta e viene restituito nella risposta immediata. Una pagina di ricerca che mostra "Nessun risultato per: <parametro>" senza codifica ne è l'esempio tipico. Chi costruisce il collegamento fornisce la richiesta; la vittima deve aprirlo e lo script viene eseguito nel suo browser, nell'origine del sito. Lo script non gira nel sito dell'attaccante ma in quello vulnerabile, con accesso ai cookie non protetti da `HttpOnly`, allo storage e alle API della pagina.

```text
Percorso di un XSS riflesso

richiesta:  /cerca?q=<parametro non codificato>
risposta:   <p>Nessun risultato per: <parametro non codificato></p>
nel browser: la pagina contiene markup o script interpretato
conseguenza: codice eseguito nell'origine dell'applicazione
```

La mitigazione è codificare l'output per il contesto del parametro. In più, cookie con `HttpOnly` impediscono la lettura diretta da JavaScript e una CSP restrittiva riduce l'impatto degli errori residui. Nessuna delle due sostituisce la codifica: sono strati.

## XSS memorizzato

Il caso memorizzato non richiede un inganno al momento dell'esecuzione: il dato viene salvato dal servizio, per esempio in un commento, e rieseguito ogni volta che qualcuno apre la pagina. Il danno può colpire molte persone, compresi utenti con privilegi superiori che aprono un pannello di moderazione.

La mitigazione principale è la stessa: codificare all'output. Quando i dati devono contenere markup, si usa un sanitizzatore con lista bianca di elementi e attributi, mantenuto aggiornato. Uno strato aggiuntivo è isolare i contenuti non fidati in un'origine distinta con sandbox, scelta consigliata quando il contenuto è molto ricco o proviene da fornitori.

## XSS basato sul DOM

Nel caso basato sul DOM la vulnerabilità non sta nel server: l'applicazione client-side prende dati dalla URL, dallo storage o da un messaggio e li inserisce nel documento usando API che interpretano markup. Se il server non riflette nulla, i filtri lato server non vedono il problema.

Due famiglie di API vanno conosciute. Quelle che interpretano HTML, come l'assegnazione a `innerHTML` o `insertAdjacentHTML`, costruiscono struttura ed eseguono script o gestori di eventi. Quelle che trattano il valore come testo, come `textContent`, non interpretano markup ed è il default per contenuti non fidati. Per URL assegnati a `href` o `src` serve validare lo schema, perché valori con schemi come `javascript:` o `data:` cambiano il comportamento dell'elemento.

```js
const params = new URLSearchParams(location.search);
const nome = params.get("nome") ?? "";
const punto = document.querySelector("#saluto");

// da evitare con dati non fidati: interpreta markup
// punto.innerHTML = "Ciao " + nome;

// da preferire: il valore resta testo
punto.textContent = "Ciao " + nome;
```

Anche i messaggi tra finestre meritano attenzione: un listener su `message` che usa il dato senza verificare l'origine accetta input da qualunque pagina, e lo stesso vale per dati letti da `localStorage` in ambienti in cui uno script terzo può scriverli. La difesa è confrontare `event.origin` in modo esatto e trattare il contenuto come non fidato.

## Perché conta l'origine

Tutti e tre i casi hanno lo stesso effetto: codice eseguito nell'origine dell'applicazione, da cui può leggere ciò che la pagina espone, agire con la sessione dell'utente, mostrare interfacce ingannevoli e modificare contenuti. La codifica degli output si applica quindi a ogni dato non scritto da te.

## Errori comuni

- **Fidarsi della validazione degli input da sola**: un input che sembra innocuo per forma può contenere caratteri che diventano markup nel contesto di output; la codifica resta necessaria.
- **Usare la stessa codifica in tutti i contesti**: la codifica HTML dentro un attributo JavaScript non protegge e può creare errori di sintassi; ogni contesto ha la sua regola.
- **Pensare che i framework eliminino il problema**: framework con escaping automatico proteggono solo quando si usano le loro API; i punti in cui si inietta HTML fidato sono ancora a rischio.
- **Dimenticare il lato client**: filtrare sul server non copre il DOM; un parametro della URL letto direttamente da JavaScript resta una superficie d'attacco.

## In sintesi

XSS è un problema di contesti di output, non di caratteri cattivi negli input. Riflesso, memorizzato e DOM si distinguono per dove il dato transita, ma la mitigazione di base è una: codificare per il contesto. API testuali, cookie `HttpOnly` e CSP sono strati aggiuntivi. Mappare i punti di inserimento è il primo passo per non lasciare percorsi scoperti.

## Fonti

- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [PortSwigger Web Security Academy – Cross-site scripting](https://portswigger.net/web-security/cross-site-scripting)
- [MDN – Node.textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)
- [MDN – Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
