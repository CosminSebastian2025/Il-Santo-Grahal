# Settimana 6: Asincrono e API

**Obiettivo:** capire perché il codice asincrono non blocca la pagina, usare Promise e `async`/`await` e leggere o inviare dati con `fetch` gestendo caricamento, dati ed errore.

### Codice asincrono ed event loop

Il browser esegue JavaScript su un solo thread: se il codice aspettasse davvero una risposta di rete, la pagina si congelerebbe. L'attesa viene quindi spostata fuori dal linguaggio e l'**event loop** ripesca il lavoro quando la pila delle chiamate è vuota.

```js
console.log("1 - inizio");
setTimeout(() => console.log("2 - timer"), 0);
Promise.resolve().then(() => console.log("3 - microtask"));
console.log("4 - fine");
```

Output:

```text
1 - inizio
4 - fine
3 - microtask
2 - timer
```

`setTimeout` non mette in pausa niente: anche con `0` la callback aspetta la fine del codice sincrono. I **microtask** (Promise) hanno precedenza sui **macrotask** (`setTimeout`, eventi), ed è per questo che un `console.log` dentro un `then` esce dopo righe che nel file sembrano successive.

### Promise: resolve, reject, then, catch, finally

Una Promise rappresenta un valore futuro e ha tre stati: `pending`, `fulfilled`, `rejected`. Da `pending` si esce una volta sola e non si torna indietro. `resolve` consegna il valore, `reject` il motivo del fallimento, di solito un `Error` perché porta con sé `message` e lo stack delle chiamate.

```js
function attendi(ms, esito) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (esito === "ok") {
        resolve(`atteso ${ms} ms`);
      } else {
        reject(new Error("richiesta fallita"));
      }
    }, ms);
  });
}

attendi(300, "ok")
  .then((messaggio) => console.log(messaggio))
  .catch((errore) => console.log(`Errore: ${errore.message}`))
  .finally(() => console.log("Operazione conclusa"));
```

L'output è `atteso 300 ms` seguito da `Operazione conclusa`; con `attendi(300, "errore")` le righe diventano `Errore: richiesta fallita` e `Operazione conclusa`. `catch` intercetta anche le eccezioni lanciate dentro un `then`; `finally` non riceve il valore e gira in entrambi i casi, quindi è il posto giusto per nascondere uno spinner o riabilitare un pulsante.

### async e await

`async`/`await` è la stessa catena scritta come codice sequenziale: la funzione `async` restituisce sempre una Promise e `await` sospende solo quella funzione, non la pagina.

```js
async function mostra() {
  try {
    const messaggio = await attendi(100, "ok");
    console.log(messaggio);
  } catch (errore) {
    console.log(`Errore: ${errore.message}`);
  } finally {
    console.log("Operazione conclusa");
  }
}
mostra();
```

L'output è `atteso 100 ms` seguito da `Operazione conclusa`. Con `await` le variabili sono normali variabili, quindi si usano `if`, cicli e `return` senza callback annidate. Due trappole: `await` è valido solo dentro funzioni `async`, e due `await` in fila mettono le richieste in sequenza; se sono indipendenti conviene `Promise.all`.

### fetch: GET, response.ok, json e rendering

`fetch` restituisce una Promise che si risolve quando arrivano gli **header**; il corpo si legge con un secondo `await`, perché scaricarlo è un'altra attesa.

```js
const statoEl = document.querySelector("#stato");
const listaEl = document.querySelector("#lista");

async function caricaPost() {
  statoEl.textContent = "Caricamento...";
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=3");
    if (!response.ok) {
      throw new Error(`Stato ${response.status}`);
    }
    const post = await response.json();
    const voci = post.map((elemento) => {
      const li = document.createElement("li");
      li.textContent = elemento.title;
      return li;
    });
    listaEl.replaceChildren(...voci);
    statoEl.textContent = `Post caricati: ${post.length}`;
  } catch (errore) {
    statoEl.textContent = `Errore: ${errore.message}`;
  }
}
caricaPost();
```

Output nella pagina:

```text
Post caricati: 3
```

Il punto che sorprende: `fetch` **non** rifiuta la Promise per un 404 o un 500, perché la richiesta è tecnicamente riuscita. La Promise si risolve con `ok: false` e tocca al nostro `if` lanciare l'errore: senza quel controllo un indirizzo sbagliato passa in silenzio. Il corpo si legge una volta sola, quindi `response.json()` non va chiamato due volte. I tre stati sono sempre gli stessi, "Caricamento...", "Post caricati: 3" ed "Errore: ...": se ne manca uno la pagina sembra rotta, perché senza "caricamento" l'utente non sa se sta accadendo qualcosa e senza "errore" resta davanti a uno spinner eterno. Il markup è minimo, `<p id="stato">Caricamento...</p>` e `<ul id="lista"></ul>`, e `createElement` con `textContent` evita che un titolo contenente HTML venga interpretato.

### Parametri di ricerca e POST

I parametri di ricerca sono la parte dell'URL dopo `?`. `URLSearchParams` li costruisce e codifica i caratteri speciali al posto nostro, cosa che la concatenazione a mano sbaglia appena compare uno spazio o una `&`.

```js
const parametri = new URLSearchParams({ userId: "2", _limit: "3" });
console.log(`https://jsonplaceholder.typicode.com/posts?${parametri}`);
```

L'URL stampato è `https://jsonplaceholder.typicode.com/posts?userId=2&_limit=3`. Gli stessi parametri si leggono dall'URL corrente con `new URLSearchParams(window.location.search)` e `get("pagina")`; un parametro che il server non conosce viene ignorato senza errore, quindi si legge la documentazione e si verifica la risposta invece di fidarsi del nome scelto.

Per inviare dati servono metodo, tipo di contenuto e corpo già serializzato. Il corpo di una richiesta HTTP è testo o binario, quindi un oggetto va convertito con `JSON.stringify`; l'header dice al server come interpretarlo.

```js
async function pubblica(titolo) {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: titolo, body: "Corpo del post", userId: 1 }),
  });
  if (!response.ok) {
    throw new Error(`Stato ${response.status}`);
  }
  const creato = await response.json();
  console.log(`Creato: id ${creato.id} - ${creato.title}`);
}

pubblica("Titolo di prova").catch((errore) => console.log(`Errore: ${errore.message}`));
```

Output:

```text
Creato: id 101 - Titolo di prova
```

jsonplaceholder risponde `201` e assegna `id: 101` ma non conserva nulla: è un simulatore, e va bene così per esercitarsi. La mini app del giorno 60 combina i pezzi: una `select` o un campo di ricerca, i parametri nell'URL, i tre stati in pagina e i risultati disegnati con `map` e `createElement`.

### Errori comuni

- Dimenticare `await` davanti a `response.json()`: si ottiene una Promise e `utenti.length` vale `undefined`.
- Credere che `fetch` rifiuti su un 404: si risolve, e senza `response.ok` l'errore passa in silenzio.
- Chiamare `response.json()` due volte: il corpo è già stato letto e la seconda chiamata fallisce.
- Passare un oggetto come `body` senza `JSON.stringify`: il server riceve `[object Object]`.
- Dimenticare l'header `Content-Type: application/json`: il corpo arriva come testo generico.
- Usare `await` in un ciclo per richieste indipendenti: sono in fila, `Promise.all` le fa partire insieme.

### Esercizi progressivi

1. **Promise risolta o rifiutata.** Scrivi `verificaEta(eta)` che risolve con `Accesso consentito: ${eta} anni` se l'età è almeno 18, altrimenti rifiuta con `new Error("Età insufficiente")`. Chiamala con 20 e con 16: atteso `Accesso consentito: 20 anni` e poi `Età insufficiente` (esercizio base 1).

2. **then, catch, finally.** Scrivi `scaricaFile(nome, esito)` che risolve con `Contenuto di ${nome}` dopo 200 ms oppure rifiuta con un `Error` dal messaggio `Download fallito: report.pdf`. Stampa `Avvio download` prima della chiamata e `Download concluso` nel `finally`: con esito positivo l'output è `Avvio download`, `Contenuto di report.pdf`, `Download concluso`; con esito negativo la riga centrale diventa `Errore: Download fallito: report.pdf` (esercizio base 2).

3. **Riscrittura con async/await.** Riscrivi l'esercizio 2 come funzione `async` con `try`/`catch`/`finally`, senza `then`, e verifica che l'output del caso negativo sia identico (esercizio base 3).
4. **fetch utenti.** Carica `https://jsonplaceholder.typicode.com/users`, controlla `response.ok` e stampa quanti utenti sono arrivati, il nome del primo e quello dell'ultimo (esercizio base 4).

   Output atteso:

   ```text
   Utenti caricati: 10
   Primo utente: Leanne Graham
   Ultimo utente: Clementina DuBuque
   ```

5. **Caricamento ed errore.** Crea `caricaPost(url)` che mostra `Caricamento...`, poi `Post caricati: N` oppure `Errore: Stato 404` quando `response.ok` è falso. Prova con `https://jsonplaceholder.typicode.com/posts?_limit=5` e poi con `https://jsonplaceholder.typicode.com/post`, che non esiste (esercizio intermedio 5).

   Output atteso:

   ```text
   Caricamento...
   Post caricati: 5
   Caricamento...
   Errore: Stato 404
   ```

6. **Rendering lista nel DOM.** Prendi cinque post e inseriscili in una `<ol>` con `createElement`; aggiorna lo stato con `Post mostrati: 5` e verifica con `console.assert` che la lista abbia cinque figli (esercizio intermedio 6).

7. **Ricerca con parametri.** Costruisci l'URL con `URLSearchParams` usando `userId: "2"` e `_limit: "3"`, stampa l'URL completo, quanti post tornano e quanti utenti distinti compaiono nei risultati (esercizio intermedio 7).

   Output atteso:

   ```text
   URL: https://jsonplaceholder.typicode.com/posts?userId=2&_limit=3
   Post trovati: 3
   Utenti distinti: 1
   ```

8. **POST e risposta.** Invia un post con `method: "POST"`, `headers: { "Content-Type": "application/json" }` e `body` serializzato; stampa lo status della risposta, l'`id` assegnato e il titolo ricevuto (esercizio intermedio 8).

   Output atteso:

   ```text
   Stato: 201
   Creato: id 101
   Titolo: Promemoria
   ```

9. **Mini app con filtro.** Una `select` con gli utenti 1, 2 e 3, un pulsante "Carica", un paragrafo di stato e una lista. Al clic leggi l'id scelto, richiedi `posts?userId=...&_limit=3`, disabilita il pulsante durante l'attesa e riabilitalo nel `finally`. Con id 3 l'app mostra `Post caricati: 3` (esercizio avanzato 9).

10. **Debug e timeout con AbortController.** Questo codice stampa `Utenti: undefined`: trova il motivo e correggilo fino a ottenere `Utenti caricati: 10`. Poi aggiungi un timeout di 5 secondi con `AbortController` che trasformi l'annullamento in `Errore: richiesta annullata` (esercizio avanzato 10).

    ```js
    async function carica() {
      try {
        const response = await fetch("https://jsonplaceholder.typicode.com/users");
        const utenti = response.json();
        console.log(`Utenti: ${utenti.length}`);
      } catch (errore) {
        console.log(`Errore: ${errore.message}`);
      }
    }

    carica();
    ```

    Per il timeout, dentro la funzione `async`, crea il controller, passa il segnale a `fetch` e annulla dopo 5 secondi; nella versione completa `clearTimeout` sta nel `finally` e il `catch` controlla `errore.name === "AbortError"` prima di trasformarlo nell'errore da mostrare:

    ```js
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer); // nella versione completa va nel finally
    ```

### Varianti

- Nell'esercizio 4 mostra nome ed email in una tabella invece che in una riga di testo.
- Nell'esercizio 7 affianca alla `select` un campo che filtra i titoli già scaricati con `filter` e `toLowerCase`.
- Nell'esercizio 9 ritenta la richiesta una volta se fallisce, prima di mostrare lo stato di errore.
- Nell'esercizio 10 sostituisci il timer con `AbortSignal.timeout(5000)`, se il browser lo supporta.
