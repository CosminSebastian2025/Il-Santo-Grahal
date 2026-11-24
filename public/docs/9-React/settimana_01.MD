# Settimana 1: Fondamenta web (giorni 1-14)

**Obiettivo:** costruire una pagina con HTML e CSS, manipolarla con JavaScript, leggere input, usare ES6 e chiamare un'API. Sono le fondamenta su cui poggia React.

### L'ambiente di lavoro

Servono due strumenti: **Visual Studio Code** e **Node.js LTS**. Controlla Node dal terminale:

```bash
node --version
npm --version
```

Crea una cartella per i progetti e, dentro, una cartella `fondamenta` con tre file: `index.html`, `style.css`, `script.js`.

```text
fondamenta/
  index.html
  style.css
  script.js
```

Apri la cartella in VS Code e trascina `index.html` nel browser, oppure usa l'estensione **Live Server**. Apri gli strumenti di sviluppo con `F12`: la scheda Console mostra gli errori e i `console.log`.

### HTML: la struttura della pagina

HTML descrive il contenuto e la sua gerarchia. I tag semantici dicono che cosa rappresenta ogni blocco.

```html
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>La mia pagina</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <header>
      <h1>Il mio sito</h1>
      <nav>
        <a href="#chi-sono">Chi sono</a>
        <a href="#interessi">Interessi</a>
      </nav>
    </header>

    <main>
      <section id="chi-sono">
        <h2>Chi sono</h2>
        <p>Mi chiamo Anna e studio sviluppo web.</p>
      </section>

      <section id="interessi">
        <h2>Interessi</h2>
        <ul>
          <li>Fotografia</li>
          <li>Corsa</li>
          <li>Programmazione</li>
        </ul>
      </section>
    </main>

    <footer>
      <p>© 2026 Anna</p>
    </footer>

    <script src="script.js"></script>
  </body>
</html>
```

Regole che evitano problemi:
- un solo `<h1>` per pagina;
- `<link>` e `<script>` con percorso relativo corretto;
- `script` alla fine del `body`, così il DOM esiste già quando il codice parte;
- `meta viewport` per il mobile.

### CSS: stile e layout

CSS si collega con `<link rel="stylesheet" href="style.css">`. Le proprietà più usate:

```css
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  background: #f8fafc;
  color: #0f172a;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

nav a {
  margin-left: 16px;
  color: #1d4ed8;
  text-decoration: none;
}

.card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin: 24px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
}
```

**Flexbox** è il modo più semplice per disporre elementi in riga o colonna:

| Proprietà | Effetto |
| --- | --- |
| `display: flex` | attiva il layout flessibile |
| `justify-content` | distribuisce sull'asse principale |
| `align-items` | allinea sull'asse trasversale |
| `gap` | spazio tra gli elementi |
| `flex-direction: column` | dispone in colonna |

Per il responsive si usa una media query:

```css
@media (max-width: 600px) {
  header {
    flex-direction: column;
    gap: 12px;
  }
}
```

### JavaScript: dati e funzioni

Un rapido richiamo serve perché React è JavaScript. Tipi, variabili e funzioni:

```js
const nome = "Anna";
let eta = 17;
const attivo = true;

function saluta(persona) {
  return `Ciao, ${persona}!`;
}

console.log(saluta(nome));
console.log(typeof eta);
```

Output:

```text
Ciao, Anna!
number
```

Array e oggetti:

```js
const hobby = ["fotografia", "corsa", "cucina"];
const persona = { nome: "Anna", eta: 17, citta: "Torino" };

hobby.push("lettura");
console.log(hobby.length);
console.log(persona.nome);
console.log(`${persona.nome} ha ${persona.eta} anni`);
```

Output:

```text
4
Anna
Anna ha 17 anni
```

### DOM ed eventi

Il DOM è la rappresentazione della pagina che JavaScript può modificare.

```html
<p id="messaggio">Testo iniziale</p>
<button id="cambia">Cambia</button>
```

```js
const paragrafo = document.querySelector("#messaggio");
const bottone = document.querySelector("#cambia");

bottone.addEventListener("click", () => {
  paragrafo.textContent = "Testo cambiato";
  paragrafo.classList.add("evidenziato");
});
```

`textContent` cambia il testo in modo sicuro; `innerHTML` interpreta HTML e va evitato con dati inseriti dall'utente. `classList.add`, `remove` e `toggle` gestiscono le classi: lo stile resta nel CSS.

### Form e input

```html
<form id="modulo">
  <label for="nome">Nome</label>
  <input id="nome" name="nome" required />
  <button type="submit">Invia</button>
</form>
<p id="risultato"></p>
```

```js
const modulo = document.querySelector("#modulo");

modulo.addEventListener("submit", (evento) => {
  evento.preventDefault();                 // blocca il ricaricamento
  const nome = document.querySelector("#nome").value.trim();

  document.querySelector("#risultato").textContent =
    nome ? `Ciao, ${nome}!` : "Inserisci un nome.";
});
```

`preventDefault()` è essenziale: senza, il browser ricarica la pagina e perdi lo stato.

### ES6: le funzioni che servono a React

```js
const prodotti = [
  { nome: "Tastiera", prezzo: 45 },
  { nome: "Cavo", prezzo: 8 },
  { nome: "Monitor", prezzo: 180 },
];

const nomi = prodotti.map((p) => p.nome);
const economici = prodotti.filter((p) => p.prezzo < 50);
const monitor = prodotti.find((p) => p.nome === "Monitor");
const totale = prodotti.reduce((somma, p) => somma + p.prezzo, 0);

const { nome } = prodotti[0];
const copia = [...prodotti, { nome: "Mouse", prezzo: 25 }];

console.log(nomi.join(", "));
console.log(economici.length);
console.log(monitor.prezzo);
console.log(totale);
console.log(nome, copia.length);
```

Output:

```text
Tastiera, Cavo, Monitor
2
180
233
Tastiera 4
```

`map`, `filter` e `reduce` restituiscono **nuovi** array: non modificano l'originale. Questa idea, insieme allo spread, è la base dell'immutabilità richiesta da React.

### Asincrono e fetch

```js
async function caricaUtenti() {
  console.log("Caricamento...");

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) throw new Error(`Stato ${response.status}`);

    const utenti = await response.json();
    console.log(`Utenti: ${utenti.length}`);
    console.log(utenti[0].name);
  } catch (errore) {
    console.log(`Errore: ${errore.message}`);
  }
}

caricaUtenti();
```

Output:

```text
Caricamento...
Utenti: 10
Leanne Graham
```

### I tre progetti del blocco

1. **Pagina personale statica** (giorni 1-5): HTML e CSS, senza JavaScript. Nome, avatar, bio, interessi, contatti.
2. **Contatore senza React** (giorni 6-10): numero visibile, bottoni aumenta, diminuisci e reset.
3. **Lista dinamica** (giorni 11-14): input, aggiunta di elementi, lista aggiornata, salvataggio in `localStorage`.

### Errori comuni

- Dimenticare `defer` o mettere lo `script` nell'`head`: il codice cerca elementi che non esistono ancora.
- Scrivere `onclick="..."` in HTML invece di `addEventListener` in JavaScript.
- Usare `innerHTML` con dati dell'utente: rischio di iniettare HTML.
- Dimenticare `preventDefault()` nel submit: la pagina si ricarica.
- Modificare un array con `push` e aspettarsi un nuovo array: `map`/`filter` restituiscono copie, `push` muta.
- Confondere `value` (testo dell'input) con `textContent` (testo di un elemento).
- Chiamare `fetch` senza `await` e leggere una Promise invece dei dati.
- Salvare in `localStorage` un oggetto senza `JSON.stringify`.

### Esercizi progressivi

1. **Prima pagina.** Crea `index.html` con titolo, un paragrafo e un'immagine; collega `style.css` e verifica che il titolo del browser sia corretto (esercizio base 1).

2. **HTML semantico.** Costruisci una pagina con `header`, `nav`, `main`, due `section` e `footer`; ogni sezione ha un titolo e una lista (esercizio base 2). Verifica che i link interni portino alle sezioni.

3. **Card CSS.** Crea un div `.card` con titolo, testo e bordo arrotondato; aggiungi padding, ombra e larghezza massima di 320 px (esercizio base 3).

4. **Navbar con Flexbox.** Metti logo a sinistra e tre link a destra sulla stessa riga; sotto i 600 px devono andare in colonna (esercizio base 4).

5. **Progetto 1: pagina personale.** Realizza la pagina con nome, avatar, bio, interessi e contatti (esercizio base 5). Criteri: nessun errore in console, layout leggibile da telefono, link funzionanti.

6. **Variabili e tipi.** Stampa nome, età e stato iscritto con i rispettivi `typeof` (esercizio base 6).

   Output atteso:

   ```text
   Anna (string)
   17 (number)
   true (boolean)
   ```

7. **Array e funzioni.** Crea un array di cinque hobby, aggiungine uno con `push`, stampa la lunghezza e tutti gli elementi con `forEach` (esercizio intermedio 7).

   Output atteso:

   ```text
   Totale hobby: 6
   fotografia
   corsa
   cucina
   lettura
   musica
   cinema
   ```

8. **Oggetti e cicli.** Crea un oggetto `persona` con nome, età, città e un array di interessi; stampa una frase e gli interessi con un ciclo `for...of` (esercizio intermedio 8).

9. **DOM: testo e classe.** Crea un paragrafo e un bottone: al clic il testo diventa `Aggiornato` e il paragrafo riceve la classe `evidenziato` (esercizio intermedio 9).

10. **Progetto 2: contatore.** Numero al centro, bottoni `+`, `-` e `Reset`; il numero non scende sotto zero e il reset torna a `0` (esercizio intermedio 10).

    Output atteso dopo `+`, `+`, `-`, `Reset`:

    ```text
    0
    ```

11. **Form contatti.** Form con nome ed email; al submit valida entrambi i campi e mostra `Ciao Anna, ti scriverò a anna@example.com` oppure un messaggio di errore (esercizio intermedio 11).

12. **ES6 in azione.** Da un array di prodotti ricava i nomi con `map`, i prodotti sotto 50 euro con `filter`, il primo monitor con `find` e il totale con `reduce`; usa destructuring e spread almeno una volta (esercizio avanzato 12).

13. **Prima fetch.** Chiedi i post a `https://jsonplaceholder.typicode.com/posts` e stampa numero di post e titolo del primo (esercizio avanzato 13).

    Output atteso:

    ```text
    Post: 100
    Titolo: sunt aut facere repellat provident occaecati excepturi optio reprehenderit
    ```

14. **Progetto 3: lista dinamica.** Input e bottone `Aggiungi`; la lista si aggiorna, il campo si svuota, gli elementi si possono eliminare e la lista sopravvive al refresh con `localStorage` (esercizio avanzato 14).

15. **Debug.** Questo script contiene tre errori. Individuali con la console, correggili e ottieni l'output indicato (esercizio avanzato 15).

    ```js
    const bottone = document.querySelector("#bottone");
    const output = document.querySelector("#output");
    let contatore = 0;

    bottone.addEventListener("click", () => {
      contatore = contatore + 1;
      output.innerHTML = contatore;
    });
    ```

    Output atteso dopo tre clic:

    ```text
    3
    ```

### Varianti

- Nella pagina personale aggiungi una griglia di card con `display: grid` e `grid-template-columns`.
- Nel contatore aggiungi un passo personalizzabile letto da un input numerico.
- Nella lista dinamica aggiungi un filtro di ricerca che nasconde gli elementi non corrispondenti.
- Nella fetch mostra un messaggio `Caricamento...` prima dei dati e `Errore` se la risposta non è valida.
