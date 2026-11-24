# Introduzione a JavaScript

JavaScript è il linguaggio del web. È nato nel 1995 per rendere interattive le pagine HTML, oggi è lo standard **ECMAScript** e gira praticamente ovunque: nel browser, su un server con **Node.js**, dentro applicazioni desktop e su mobile. Non serve compilare: il motore del browser (V8 in Chrome, SpiderMonkey in Firefox, JavaScriptCore in Safari) legge il codice e lo esegue.

Con JavaScript si costruiscono pagine interattive, web app complete, API e servizi backend, strumenti da riga di comando e app mobile o desktop.

### Obiettivo del percorso

Il corso segue un piano di **90 giorni** diviso in **9 settimane**. Ogni settimana contiene dieci giorni di studio, un argomento per giorno e un esercizio progressivo per giorno.

| Settimana | Giorni | Argomenti | Progetti |
| --- | --- | --- | --- |
| 1 | 1-10 | Console, `let`/`const`, tipi, stringhe, operatori, condizioni | Bio personale |
| 2 | 11-20 | Funzioni, array, cicli | Statistiche numeri |
| 3 | 21-30 | Oggetti, stringhe, `Math`, `map`/`filter`/`reduce` | Inventario |
| 4 | 31-40 | DOM ed eventi | Calcolatrice, dark mode |
| 5 | 41-50 | Callback, `Date`, `localStorage`, debugging | Tema persistente |
| 6 | 51-60 | Promise, `async`/`await`, `fetch` | Mini app con API |
| 7 | 61-70 | Moduli, stato, form, accessibilità | Todo list |
| 8 | 71-80 | Quiz, carrello, ricerca e ordinamento | Quiz, mini shop |
| 9 | 81-90 | Progetto finale, pubblicazione | Progetto personale |

Le prime tre settimane usano solo la console o un file HTML: nessuna installazione obbligatoria. Dalla quarta settimana il codice lavora sulla pagina, dalla sesta parla con un'API.

### Come ragionare (e come si applica)

JavaScript non chiede di memorizzare metodi: chiede di capire **che forma hanno i dati** e **quali passi trasformano un dato nel risultato**. Questa sezione mostra il ragionamento da fare prima di scrivere codice.

#### Dove si applica

- **Pagine web** (siti, landing, blog): il DOM permette di cambiare testo, stile e contenuti in risposta all'utente.
- **Web app** (dashboard, gestionali, e-commerce): stato, eventi e chiamate API sostengono interfacce che sembrano applicazioni desktop.
- **Backend con Node.js**: le stesse funzioni e gli stessi oggetti gestiscono richieste HTTP, file e database.
- **App mobile e desktop** (React Native, Electron, frontend Tauri): la logica scritta in JavaScript viene riusata in contesti diversi.
- **Automazione e script**: rinominare file, leggere CSV, chiamare API; Node.js esegue lo script da terminale.

In tutti questi casi contano tre cose: i **dati** (array e oggetti) sono la materia prima, le **funzioni** trasformano i dati, gli **eventi** decidono quando eseguire le funzioni.

#### La logica in sei passi

1. **Leggi il problema** e riscrivilo con parole tue, senza termini tecnici.
2. **Definisci input e output**: che cosa entra (numero, testo, elenco, oggetto) e che cosa deve uscire.
3. **Risolvi un esempio a mano** con dati piccoli: se non funziona a mano, non funzionerà nel codice.
4. **Scegli la struttura**: un valore singolo, un array, un oggetto? La struttura decide quali metodi userai.
5. **Scrivi la versione minima**: solo il caso normale, con `console.log` che mostra i passaggi intermedi.
6. **Prova i casi limite** (array vuoto, `null`, testo vuoto, numeri negativi) e generalizza solo dopo.

#### Esempio guidato 1: dal carrello al totale

**Problema**: dato un elenco di prodotti con prezzo e quantità, calcolare il totale del carrello e stampare i prodotti sopra i 20 euro.

**Modello dei dati**: ogni prodotto ha tre informazioni che devono restare insieme, quindi è un oggetto dentro un array. Due array paralleli (nomi da una parte, prezzi dall'altra) si disallineano al primo errore.

**Ragionamento**: sommare prezzi per quantità è un `reduce`; selezionare i prodotti costosi è un `filter`; mostrare i nomi è un `map` seguito da `join`.

```js
const carrello = [
  { nome: "Tastiera", prezzo: 45, quantita: 1 },
  { nome: "Cavo USB", prezzo: 8, quantita: 2 },
  { nome: "Monitor", prezzo: 180, quantita: 1 },
];

const totale = carrello.reduce((somma, p) => somma + p.prezzo * p.quantita, 0);
const costosi = carrello.filter((p) => p.prezzo > 20).map((p) => p.nome);

console.log(`Totale: ${totale.toFixed(2)} EUR`);
console.log(`Prodotti sopra 20 EUR: ${costosi.join(", ")}`);
```

**Output atteso**:

```text
Totale: 241.00 EUR
Prodotti sopra 20 EUR: Tastiera, Monitor
```

Prova a cambiare il carrello in `[]`: il totale diventa `0.00` e la lista resta vuota, senza errori. Il caso limite è già coperto perché `reduce` parte da `0`.

#### Esempio guidato 2: caricare dati con stati espliciti

**Problema**: mostrare un elenco di utenti letto da un'API, con messaggio di caricamento e messaggio di errore.

**Modello**: una richiesta di rete non è istantanea e può fallire. Servono quindi tre stati: "sto caricando", "ho i dati", "errore". Se manca lo stato di caricamento l'utente vede una pagina vuota; se manca l'errore la pagina resta bloccata.

**Ragionamento**: `fetch` restituisce una Promise; `response.ok` distingue successo e fallimento; `try`/`catch` intercetta gli errori di rete; `finally` riporta lo stato finale.

```js
async function caricaUtenti() {
  console.log("Caricamento...");

  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!response.ok) {
      throw new Error(`Stato ${response.status}`);
    }

    const utenti = await response.json();
    console.log(`Utenti caricati: ${utenti.length}`);
    console.log(utenti.map((u) => u.name).join(", "));
  } catch (errore) {
    console.log(`Errore: ${errore.message}`);
  }
}

caricaUtenti();
```

**Output atteso**:

```text
Caricamento...
Utenti caricati: 10
Leanne Graham, Ervin Howell, Clementine Bauch, Patricia Lebsack, Chelsey Dietrich, Mrs. Dennis Schulist, Kurtis Weissnat, Nicholas Runolfsdottir V, Glenna Reichert, Clementina DuBuque
```

Se la rete non funziona, la seconda riga diventa `Errore: Failed to fetch`: il programma non si blocca e l'utente capisce che cosa è successo.

#### Debug: ragionare su un errore

```js
const utente = { nome: "Anna" };
console.log(utente.nome.toUpperCase());
console.log(utente.indirizzo.citta);
```

La seconda riga produce `TypeError: Cannot read properties of undefined (reading 'citta')`. Ragionamento per isolare il problema: `utente.indirizzo` vale `undefined`, quindi chiedere `.citta` a `undefined` è impossibile. Il messaggio del browser indica il file e la riga: non serve indovinare.

Due correzioni possibili, con significati diversi:

```js
// 1. Il dato può mancare: mostro un valore di riserva.
console.log(utente.indirizzo?.citta ?? "Città non indicata");

// 2. Il dato deve esserci: blocco l'ingresso dei dati incompleti.
if (!utente.indirizzo) {
  console.log("Dati incompleti: manca l'indirizzo");
}
```

La prima scelta è permissiva e adatta alla visualizzazione; la seconda è severa e adatta alla validazione. Scegliere l'una o l'altra è una decisione di progetto, non un trucco di sintassi.

#### Obiettivo -> Come ragionare -> Strumento JavaScript

| Obiettivo | Come ragionare | Strumento JavaScript |
| --- | --- | --- |
| Trasformare ogni elemento di un elenco | La trasformazione riguarda un elemento alla volta? | `map` |
| Tenere solo alcuni elementi | Sai scrivere la condizione come vero/falso? | `filter` |
| Ridurre un elenco a un solo valore | Qual è il valore accumulato e da dove parte? | `reduce` |
| Conservare più dati dello stesso tipo | I campi sono sempre gli stessi? Allora è un oggetto | `{ }` dentro `[ ]` |
| Reagire a un'azione dell'utente | Quale evento, su quale elemento, con quale effetto? | `addEventListener` |
| Aspettare una risorsa lenta | Che cosa vede l'utente mentre aspetta? | `fetch` + `async`/`await` |
| Ricordare un dato dopo il refresh | Il dato deve sopravvivere alla chiusura? | `localStorage` + JSON |

#### Esercizi di ragionamento

Prima di scrivere codice, compila per ogni esercizio: input, output, passi e casi limite.

1. **Spesa totale**. Input: un array di prezzi. Output: il totale con due decimali. Casi limite: array vuoto, prezzo negativo. Output atteso con `2.5, 1.2, 3`: `Totale: 6.70`.
2. **Parole distinte**. Input: una frase. Output: quante parole diverse contiene, ignorando maiuscole e punteggiatura. Casi limite: stringa vuota, sole spazi, parole ripetute. Output atteso con `"ciao Ciao mondo"`: `Parole distinte: 2`.
3. **Utenti attivi**. Input: un array di utenti con `nome` e `attivo`. Output: i nomi degli utenti attivi in ordine alfabetico. Casi limite: nessun utente attivo, nomi con accenti. Output atteso con Ada attiva, Bruno non attivo, Carla attiva: `Ada, Carla`.

### Il metodo

- Scrivi codice **ogni giorno**, anche solo per 30 minuti.
- Non copiare senza capire: riscrivi con parole tue.
- Ogni errore è una lezione: leggi il messaggio, prova, correggi.
- Alla fine di ogni giorno spiega ad alta voce che cosa hai imparato.
- Se un giorno non riesci a finire, recupera il giorno dopo senza accumulare.
- Un progetto finito vale più di tre abbozzati.

### Gli strumenti

**Per iniziare non serve installare niente**: apri il browser, premi `F12` (o `Ctrl+Shift+I`) e usa la scheda **Console**. Puoi scrivere `console.log("Ciao")` e premere Invio.

Per i file veri serve un editor: **Visual Studio Code** con l'estensione JavaScript è la scelta più comune. Un file HTML con `<script src="script.js"></script>` esegue il codice nella pagina.

Per gli script da terminale serve **Node.js** (versione 22 LTS o superiore):

```bash
node --version
node script.js
```

Controlla di avere anche `npm`, che servirà solo nella seconda metà del corso:

```bash
npm --version
```

### Il primo programma

Nella console del browser:

```js
console.log("Ciao, mondo!");
```

In un file `script.js` eseguito con Node:

```js
function saluta(nome) {
  return `Ciao, ${nome}!`;
}

console.log(saluta("mondo"));
console.log(saluta("Anna"));
```

Output:

```text
Ciao, mondo!
Ciao, Anna!
```

`console.log` stampa un valore; il `return` restituisce un valore a chi ha chiamato la funzione. La differenza diventa centrale dalla settimana 2.

### Convenzioni del corso

- Variabili e funzioni in `camelCase`: `calcolaTotale`, `numeroStudenti`.
- Classi in `PascalCase`: `ContoBancario`.
- Costanti globali in `MAIUSCOLO_CON_UNDERSCORE`: `const MAX_TENTATIVI = 3;`.
- `const` è la scelta predefinita; `let` solo quando il valore deve cambiare; `var` mai.
- Confronto sempre con `===` e `!==`, mai con `==` e `!=`.
- Punto e virgola a fine istruzione.
- Due spazi di indentazione, niente tab.
- Template literals al posto della concatenazione con `+`.
- Un file per argomento o per componente; i nomi dei file in minuscolo: `carrello.js`.

### Come usare esercizi e progetti

Ogni settimana contiene:

- **argomenti** con esempi completi e output;
- **errori comuni** da riconoscere subito;
- **esercizi progressivi**: dieci per settimana, dal più semplice al più articolato;
- **varianti** per chi vuole un passo in più;
- **progetti** con requisiti e criteri di verifica.

I primi esercizi verificano la sintassi, gli ultimi richiedono di combinare più concetti. Non copiare gli esempi: riscrivili, modificali e rompili. Se un esercizio ti blocca, riducilo alla parte più piccola che sai già fare e ricostruisci da lì.

Nella settimana 1 si parte dalla console, dalle variabili e dalle condizioni.
