# Fase 1: Fondamenta JavaScript e ambiente (giorni 1-14)

**Obiettivo:** preparare l'ambiente di sviluppo e costruire la logica di JavaScript — dati, funzioni, liste, oggetti e chiamate asincrone — fino a una mini dashboard stampata in console.

| Giorno | Argomento | Esercizio |
| --- | --- | --- |
| 1 | Node, VS Code, Expo Go, `create-expo-app`, `expo start` | 1 |
| 2 | Struttura del progetto, file di ingresso, prima modifica | 2 |
| 3 | `let`, `const`, tipi e `console.log` | 3 |
| 4 | Funzioni, parametri, `return`, arrow function | 4 |
| 5 | Array: `push`, `pop`, `shift`, `unshift`, `length` | 5 |
| 6 | Oggetti: punto, parentesi quadre, scheda utente | 6 |
| 7 | Array di oggetti e filtro semplice | 7 |
| 8 | `map`, `filter`, `find` | 8 |
| 9 | Destructuring, spread, dati immutabili | 9 |
| 10 | `import`/`export`, modulo utilities | 10 |
| 11 | Promise e `async`/`await` con risposta simulata | 11 |
| 12 | `fetch` e JSON su jsonplaceholder | 12 |
| 13 | `try`/`catch` e messaggi leggibili | 13 |
| 14 | Ripasso: mini dashboard in console | 14, 15 |

I giorni 1 e 2 si lavorano nel terminale e nell'editor. Dal giorno 3 al 14 il codice gira in un file `.js` con `node nomefile.js` oppure incollato nella console: React Native arriva dalla fase 2, e prima di disegnare schermate serve la logica che le riempie.

### Ambiente, progetto e primo avvio

Node esegue JavaScript fuori dal browser, VS Code è l'editor, Expo Go esegue sul telefono l'app servita dal computer. Si installa Node nella versione LTS, poi:

```bash
node -v
npx create-expo-app@latest mia-app
cd mia-app
npx expo start
```

`expo start` avvia Metro, il bundler, e mostra un QR da scansionare con Expo Go: telefono e computer devono stare sulla stessa rete Wi-Fi, altrimenti si usa `npx expo start --tunnel`. Dentro la cartella ci sono `App.tsx` (ingresso), `package.json` (dipendenze e script), `node_modules/` (librerie scaricate) e `assets/`; `package.json` va conservato, `node_modules` si ricrea con `npm install`. Se esiste una cartella `app/`, le schermate stanno lì, altrimenti si parte da `App.tsx`: in ogni caso c'è un solo file eseguito per primo.

```jsx
import { Text, View } from "react-native";

export default function App() {
  return (
    <View>
      <Text>Ciao dalla fase 1</Text>
    </View>
  );
}
```

### Variabili, tipi e console

`const` è la scelta di default: il nome non viene riassegnato. `let` si usa solo quando il valore cambia davvero, `var` mai.

```js
const nome = "Anna";
let eta = 17;
const iscritta = true;
eta = eta + 1;
console.log(nome, eta, iscritta);
console.log(typeof nome, typeof eta, typeof iscritta);
```

I tipi sono tre: `string`, `number` (interi e decimali insieme), `boolean`. `19.99` è un `number`, e per i soldi conviene contare in centesimi interi, perché i decimali binari producono `0.1 + 0.2 = 0.30000000000000004`. Qui l'input non esiste e i valori si scrivono nel codice; i campi di testo arriveranno con `TextInput`, ma il ragionamento è già lo stesso: un valore arriva, va controllato, poi usato.

### Funzioni, parametri e arrow function

Una funzione racchiude un calcolo: i parametri entrano, `return` esce.

```js
function prezzoIvato(prezzo) {
  return Math.round(prezzo * 122) / 100;
}

const sconto = (prezzo, percentuale) => prezzo - (prezzo * percentuale) / 100;

console.log(prezzoIvato(10));
console.log(sconto(80, 10));
```

```text
12.2
72
```

Le due forme sono equivalenti per il chiamante; con una sola espressione l'arrow ha il `return` implicito. Una funzione fa una cosa sola e il nome descrive il risultato: chi stampa dentro la funzione la rende difficile da riusare.

### Array: aggiungere, togliere, contare

Un array è una sequenza ordinata: l'indice parte da 0, `length` dice quanti elementi ci sono.

```js
const spesa = ["pane", "latte"];
spesa.push("uova");
spesa.unshift("caffe");
console.log(spesa, spesa.length);
spesa.pop();
spesa.shift();
console.log(spesa);
```

```text
[ 'caffe', 'pane', 'latte', 'uova' ] 4
[ 'pane', 'latte' ]
```

`push` aggiunge in fondo, `pop` toglie dal fondo, `unshift` aggiunge in testa, `shift` toglie dalla testa. Attenzione: `push` e `unshift` restituiscono la lunghezza, non l'array, quindi `const nuova = lista.push("x")` assegna un numero.

### Oggetti, schede e array di oggetti

Un oggetto raggruppa campi con un nome. Si legge con il punto quando il campo è fisso, con le parentesi quadre quando il nome è in una variabile.

```js
const utenti = [
  { id: "u1", nome: "Anna", email: "anna@example.com", attivo: true },
  { id: "u2", nome: "Luca", email: "luca@example.com", attivo: false },
];
const campo = "email";
console.log(utenti[0].nome, utenti[0][campo]);
console.log(utenti.filter((u) => u.attivo).length);
```

Nelle app reali gli oggetti stanno dentro un array: utenti, prodotti, ordini. Il campo `id` non è un dettaglio: due utenti possono chiamarsi "Anna", e solo l'`id` dice quale modificare.

### Trasformare e selezionare: map, filter, find

`map` trasforma ogni elemento in una lista della stessa lunghezza, `filter` tiene quelli che passano la condizione, `find` restituisce il primo (oppure `undefined`).

```js
const prodotti = [
  { id: 1, nome: "Tastiera", prezzo: 49 },
  { id: 2, nome: "Mouse", prezzo: 19 },
  { id: 3, nome: "Monitor", prezzo: 149 },
];
console.log(prodotti.map((p) => p.nome));
console.log(prodotti.filter((p) => p.prezzo < 100).length);
console.log(prodotti.find((p) => p.id === 2).nome);
```

```text
[ 'Tastiera', 'Mouse', 'Monitor' ]
2
Mouse
```

La scelta dipende da cosa serve: una lista nuova (`map`), una lista più corta (`filter`), un elemento che può non esistere (`find`). Chi usa `find` e legge `.nome` senza controllare ottiene `TypeError`.

### Destructuring, spread e dati immutabili

Il destructuring estrae campi, lo spread ricopia in un oggetto nuovo.

```js
const prodotto = { id: 1, nome: "Tastiera", prezzo: 49 };
const { nome, prezzo } = prodotto;
const aggiornato = { ...prodotto, prezzo: 45 };
console.log(nome, prezzo);
console.log(prodotto.prezzo, aggiornato.prezzo, prodotto === aggiornato);
```

```text
Tastiera 49
49 45 false
```

`{ ...prodotto, prezzo: 45 }` copia i campi non elencati, sostituisce quelli elencati e lascia intatto l'originale. La copia non è un vezzo: React capisce che qualcosa è cambiato confrontando i riferimenti.

### Moduli, Promise, fetch ed errori

Un modulo è un file che esporta ciò che gli altri usano. In Node servono `"type": "module"` nel `package.json` oppure l'estensione `.mjs`.

```js
// utils.js
export const IVA = 0.22;
export const euro = (v) => v.toFixed(2).replace(".", ",") + " EUR";

// index.js
import { euro, IVA } from "./utils.js";
console.log(euro(49 * (1 + IVA))); // 59,78 EUR
```

Una Promise rappresenta un valore che arriverà. `await` permette di scriverlo come se fosse presente, ma il codice dopo viene eseguito più tardi.

```js
const rispostaFinta = (v, ms = 1000) =>
  new Promise((resolve) => setTimeout(() => resolve(v), ms));
async function main() {
  console.log("inizio");
  const dati = await rispostaFinta({ utenti: 10 });
  console.log("ricevuto:", dati.utenti);
}

main();
console.log("fine");
```

```text
inizio
fine
ricevuto: 10
```

`fetch` scarica dati e restituisce una Promise con la risposta; `await risposta.json()` converte il corpo in oggetti. jsonplaceholder è un servizio pubblico di prova, senza chiavi. Senza il controllo `risposta.ok` un 404 passa come successo e il `json()` fallisce lontano dalla causa; il `try`/`catch` fa arrivare una frase comprensibile invece di uno stack trace.

```js
async function caricaUtenti() {
  const risposta = await fetch("https://jsonplaceholder.typicode.com/users");
  if (!risposta.ok) throw new Error("Risposta non valida: " + risposta.status);
  return (await risposta.json()).map((u) => ({ id: u.id, nome: u.name }));
}
try {
  console.log("Caricati:", (await caricaUtenti()).length);
} catch (errore) {
  console.log("Caricamento non riuscito:", errore.message);
}
```

### Come ragionare: dal problema allo schermo

In questa fase la schermata è la console: ciò che stampi è ciò che l'utente vedrebbe. Il ragionamento è già quello definitivo, perché dalla fase 2 cambia solo il modo di disegnare i dati.

#### Esempio guidato 1: gestionale della spesa in console

**Problema.** Devo annotare cosa comprare, segnare ciò che ho già preso e sapere quante cose restano.

**Dati.** Ogni prodotto ha `id`, `nome`, `comprato`. L'`id` è un progressivo, non il nome: "latte" può comparire due volte.

**Stato.** Due variabili: `prodotti` e `prossimoId`. Non c'è altro, perché non c'è interfaccia da aggiornare: nessun filtro, nessun testo digitato. Le azioni sono funzioni, l'evento è la chiamata.

```js
let prodotti = [];
let prossimoId = 1;

const aggiungi = (nome) => {
  const pulito = nome.trim();
  if (pulito === "") return "Nome vuoto: non aggiunto.";
  prodotti = [...prodotti, { id: prossimoId, nome: pulito, comprato: false }];
  prossimoId = prossimoId + 1;
  return "Aggiunto: " + pulito;
};
const segnaComprato = (id) => {
  if (!prodotti.some((p) => p.id === id)) return "Nessun prodotto con id " + id + ".";
  prodotti = prodotti.map((p) => (p.id === id ? { ...p, comprato: true } : p));
  return "Comprato: " + id;
};
const riepilogo = () => {
  if (prodotti.length === 0) return "Lista vuota.";
  const comprati = prodotti.filter((p) => p.comprato).length;
  const righe = prodotti.map((p, i) => `${i + 1}. ${p.nome} - ${p.comprato ? "comprato" : "da comprare"}`);
  return righe.concat(`Totale: ${prodotti.length}, comprati: ${comprati}`).join("\n");
};
```

**Casi limite.** Nome vuoto o fatto di spazi, id inesistente, lista vuota, stesso nome due volte.

```text
> aggiungi("pane")    Aggiunto: pane
> aggiungi("  ")      Nome vuoto: non aggiunto.
> aggiungi("latte")   Aggiunto: latte
> segnaComprato(2)    Comprato: 2
> segnaComprato(9)    Nessun prodotto con id 9.
> riepilogo()
1. pane - da comprare
2. latte - comprato
Totale: 2, comprati: 1
```

Perché l'`id` e non il nome: con il nome, due "latte" sarebbero lo stesso prodotto e segnare il secondo segnerebbe il primo. Perché `prodotti` viene sostituito invece di modificato: la stessa regola servirà con `useState`, dove la modifica in place non produce nessun ridisegno. Perché il controllo sul vuoto viene prima: un dato vuoto che entra sporca tutti i calcoli successivi.

#### Esempio guidato 2: mini dashboard con dati remoti

**Problema.** Voglio un riepilogo degli utenti scaricati da internet: quanti sono, in quante città diverse abitano, la lista leggibile.

**Dati.** Per ogni utente servono `id`, `name`, `address.city`. **Stato.** Non è solo "utenti": è anche "sto caricando" ed "è andato storto qualcosa"; in console i tre stati diventano tre messaggi possibili, da leggere in ordine.

**Casi limite.** Rete assente, risposta di errore, lista vuota, campo mancante.

```js
async function dashboard() {
  try {
    const risposta = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!risposta.ok) throw new Error("HTTP " + risposta.status);
    const utenti = await risposta.json();
    if (utenti.length === 0) {
      console.log("Nessun utente da mostrare.");
      return;
    }
    utenti.forEach((u) => console.log(`${u.id} | ${u.name} | ${u.address.city}`));
    const citta = new Set(utenti.map((u) => u.address.city));
    console.log(`Utenti: ${utenti.length}, citta diverse: ${citta.size}`);
  } catch (e) {
    console.log("Dati non disponibili: " + e.message);
  }
}
dashboard();
```

```text
1 | Leanne Graham | Gwenborough
2 | Ervin Howell | Wisokyburgh
...
10 | Clementina DuBuque | Lebsackbury
Utenti: 10, citta diverse: 10
```

Con la rete spenta la funzione stampa una sola riga: `Dati non disponibili: Network request failed`. Le decisioni: l'errore è uno stato come gli altri e si controlla prima dei dati; `return` interrompe appena non c'è nulla da mostrare; le righe si costruiscono solo quando i dati esistono. Nella fase 2 lo stesso schema diventa tre `useState` e una schermata con tre rami.

### Come ragiona un informatico

- **Parte dai dati, non dalle funzioni.** Prima campi e identificatore, poi il codice che li muove: se il modello è sbagliato, ogni funzione va riscritta.
- **Tratta l'assenza come caso normale.** `find` restituisce `undefined`, `fetch` può fallire, la lista può essere vuota: il controllo viene prima della lettura.
- **Sostituisce invece di modificare.** Le copie con spread rendono chiaro chi possiede il dato; le modifiche in place creano effetti a distanza.
- **Usa i nomi del problema.** `comprato`, `disponibile`, `citta`: chi legge ritrova le parole del colloquio con il committente.
- **Isola ciò che parla con l'esterno.** Una funzione scarica, una trasforma, una stampa: l'errore di rete non si confonde con un errore di calcolo.
- **Definisce l'output prima di scrivere.** Se non sa dire cosa deve apparire, non potrà dire se funziona.

### Errori comuni

- **`=` dentro un `if`.** `if (eta = 18)` assegna e restituisce `18`, quindi è sempre vero. Correzione: `===`, senza ignorare il segnale dell'editor.
- **`==` invece di `===`.** `"5" == 5` è vero e nasconde un tipo sbagliato. Correzione: confronto stretto e conversione esplicita con `Number(...)`.
- **Credere che `const` renda immutabile un oggetto.** Blocca la riassegnazione del nome, non la modifica dei campi. Correzione: copie con spread, originale in sola lettura.
- **`await` dimenticato.** `const dati = fetch(...)` assegna una Promise e `dati.length` è `undefined`. Correzione: `await` davanti alla chiamata, dentro una funzione `async`.
- **`fetch` senza controllo di `ok`.** Un 404 passa come successo e il `json()` fallisce lontano dalla causa. Correzione: controllare `risposta.ok` subito.
- **Import senza configurazione.** `Cannot use import statement outside a module`. Correzione: `"type": "module"` nel `package.json` o file `.mjs`.

### Esercizi progressivi

Gli esercizi da 1 a 14 si eseguono con Node o nella console, in un file `.js`; solo i primi due richiedono terminale e telefono.

1. **Ambiente e primo avvio.** Installa Node LTS, VS Code e Expo Go; esegui i comandi di creazione e avvio, scansiona il QR. Comportamento atteso: `node -v` stampa una versione e l'app di esempio si apre sul telefono (base 1).
2. **Esplorazione e personalizzazione.** Apri `package.json`, individua gli script, trova il file di ingresso e sostituisci il testo con `Ciao dalla fase 1`. Comportamento atteso: al salvataggio il telefono mostra il nuovo testo senza riavvii (base 2).
3. **Variabili e tipi.** Crea `nome`, `eta`, `iscritta` e stampa valore e `typeof` di ciascuna (base 3).

   ```text
   nome: Anna (string)
   eta: 17 (number)
   iscritta: true (boolean)
   ```

4. **Funzioni e arrow.** Scrivi `prezzoIvato` come funzione classica e `sconto` come arrow; stampa i risultati per `10` e per `80, 10`. Comportamento atteso: `12.2` e `72` (base 4).
5. **Array e lista della spesa.** Parti da `["pane", "latte"]`, aggiungi in fondo e in testa, poi togli da ciascun estremo. Output atteso: prima `4` elementi (`caffe`, `pane`, `latte`, `uova`), poi `2` (`pane`, `latte`) (base 5).

6. **Oggetti e scheda utente.** Crea un oggetto con `id`, `nome`, `email`, `attivo` e stampa tre righe, leggendo un campo col punto e uno con le parentesi quadre. Output atteso: `Anna Rossi - anna@example.com`, `Campi: 4`, `Attivo: si` (intermedio 6).
7. **Array di oggetti e filtro.** Crea quattro prodotti con `id`, `nome`, `comprato`; stampa il totale e quanti restano da comprare. Output atteso: `Totale: 4`, `Da comprare: 2` (intermedio 7).
8. **map, filter, find.** Sulla stessa lista produci i nomi, il conteggio sotto una soglia di prezzo e il prodotto cercato per `id`. Output atteso: i tre nomi, `2` elementi sotto i 100, `Mouse` per `id 2` (intermedio 8).
9. **Destructuring e spread.** Estrai `nome` e `prezzo`, crea una copia con prezzo ribassato e verifica che l'originale non sia cambiato. Output atteso: `49 -> 45` e `Originale invariato: 49` (intermedio 9).
10. **Moduli.** Spezza il codice in `utils.js` (funzione `euro`, costante `IVA`) e `index.js` che li importa e stampa un totale ivato. Output atteso: `Totale: 59,78 EUR` (intermedio 10).
11. **Promise e async/await simulata.** Scrivi `rispostaFinta` che risolve dopo un secondo e una funzione `async` che la attende; stampa una riga prima, una fuori dalla funzione e una dopo il risultato. Output atteso: `inizio`, `fine`, `ricevuto: 10 utenti` (intermedio 11).
12. **fetch e stampa dei dati.** Scarica gli utenti da jsonplaceholder e stampa `id - name` per ognuno, poi il totale. Comportamento atteso: dieci righe numerate da 1 a 10 e `Totale: 10` (avanzato 12).
13. **Errori gestiti.** Avvolgi la stessa chiamata in `try`/`catch`, usa un indirizzo sbagliato di proposito e stampa un messaggio comprensibile invece dello stack trace. Output atteso: `Rete non disponibile: impossibile contattare il server.` (avanzato 13).
14. **Mini dashboard in console.** Combina `fetch`, `filter` e `map`: tabella degli utenti, numero di città diverse, prima email. Comportamento atteso: dieci righe, poi `Citta diverse: 10` e `Prima email: Sincere@april.biz` (avanzato 14).
15. **Debug guidato.** Questo file contiene tre bug: uno di scope, un confronto debole con un valore del tipo sbagliato e un `await` dimenticato. Correggili e ottieni l'output indicato (avanzato 15).

    ```js
    function totale(prezzi) {
      for (let i = 0; i < prezzi.length; i++) {
        somma = somma + prezzi[i];
      }
      return somma;
    }

    const leggiPrezzi = () => Promise.resolve([0, 10, 15]);
    async function main() {
      const prezzi = leggiPrezzi();
      if (prezzi[0] == "0") console.log("Gratis");
      console.log("Totale:", totale(prezzi));
    }

    main();
    ```

    ```text
    Gratis
    Totale: 25
    ```

### Varianti

- Nell'esercizio 5 aggiungi `rimuovi(nome)` che toglie tutte le occorrenze e restituisce una lista nuova con `filter`.
- Nell'esercizio 7 ordina i prodotti per nome con `sort` e mostra prima i non comprati.
- Nell'esercizio 14 gestisci lista vuota e `address` mancante con un valore di riserva.
