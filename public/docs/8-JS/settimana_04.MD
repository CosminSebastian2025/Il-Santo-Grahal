# Settimana 4: DOM ed eventi

**Obiettivo:** collegare il codice alla pagina: selezionare elementi, cambiarne testo e classi, crearli da un array e reagire a clic, input e form, fino a una calcolatrice funzionante.

### Dove va il codice

Fino alla settimana 3 il programma stampava in console; da oggi modifica la pagina. Lo script va caricato **dopo** gli elementi, altrimenti `querySelector` vale `null` e `addEventListener` lancia `TypeError`. In alternativa si dichiara nella `head` e si avvolge tutto in `document.addEventListener("DOMContentLoaded", () => { ... })`: quella callback parte quando il browser ha costruito l'albero degli elementi.

```html
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>Primo DOM</title>
  </head>
  <body>
    <h1 id="titolo">Ciao</h1>
    <button id="cambia">Cambia titolo</button>
    <script src="script.js"></script>
  </body>
</html>
```

```js
const titolo = document.querySelector("#titolo");
const bottone = document.querySelector("#cambia");

bottone.addEventListener("click", () => {
  titolo.textContent = "Titolo aggiornato";
});
```

### Selezionare elementi e cambiare il testo

`querySelector` accetta un selettore CSS e restituisce il primo elemento o `null`; `querySelectorAll` restituisce una NodeList **statica**, percorribile con `forEach` (per `map` e `filter` serve `Array.from(voci)`). Per il testo si usa `textContent`, che scrive caratteri letterali: `innerHTML` interpreta il contenuto come HTML e con dati digitati dall'utente permette di iniettare tag e script.

```js
const titolo = document.querySelector("#titolo");
titolo.textContent = "Ciao, mondo";

const voci = document.querySelectorAll(".voce");
console.log(voci.length);
voci.forEach((voce) => {
  voce.textContent = voce.textContent.toUpperCase();
});
```

Con tre elementi `.voce` l'output del `console.log` è `3`.

### classList: classi invece di stili inline

`element.style.color = "red"` funziona, ma sparpaglia la grafica nel JavaScript e non si annulla con facilità. La classe è un'etichetta che il CSS interpreta: si cambia l'etichetta, non la grafica. Bastano un paragrafo `#prezzo` e un pulsante `#sconto`.

```js
const prezzo = document.querySelector("#prezzo");

document.querySelector("#sconto").addEventListener("click", () => {
  prezzo.classList.toggle("scontato");
  console.log(`Scontato: ${prezzo.classList.contains("scontato")}`);
});
```

Con `.scontato { color: #b00020; font-weight: 700; }` nel CSS il primo clic stampa `Scontato: true`, il secondo `Scontato: false`. I metodi sono quattro: `add`, `remove`, `toggle` e `contains`; `toggle` accetta un secondo argomento per forzare lo stato (`toggle("scuro", true)` aggiunge sempre).

### Creare elementi da un array

Per un elenco si parte dai dati: un nodo per voce, `append` per inserirlo, `replaceChildren()` per svuotare il contenitore prima di ridisegnare. `render` riceve i dati e ridisegna tutto: quando i dati cambiano la richiami, senza toccare i singoli nodi (l'output è `Voci: 3`).

```js
const linguaggi = ["HTML", "CSS", "JavaScript"];
const lista = document.querySelector("#lista");

function render(voci) {
  lista.replaceChildren();
  voci.forEach((voce) => {
    const li = document.createElement("li");
    li.textContent = voce;
    lista.append(li);
  });
}

render(linguaggi);
console.log(`Voci: ${lista.children.length}`);
```

Per markup più ricco si usa un template literal dentro `innerHTML`, ma solo con testi fidati: il valore interpolato non deve arrivare da un campo di testo.

### Eventi: click, input e form

`addEventListener(tipo, funzione)` registra che cosa fare quando l'evento arriva. Nel contatore lo stato vive in una variabile esterna alla callback, altrimenti ripartirebbe da zero a ogni clic: il paragrafo passa da `Clic: 0` a `Clic: 1`.

```js
let clic = 0;
const contatore = document.querySelector("#contatore");

document.querySelector("#aggiungi").addEventListener("click", () => {
  clic += 1;
  contatore.textContent = `Clic: ${clic}`;
});
```

`input` scatta a ogni carattere, `change` solo quando il campo perde il focus: per un filtro in tempo reale serve `input`, e il valore si legge da `campo.value`, sempre come stringa.

```js
document.querySelector("#filtro").addEventListener("input", (evento) => {
  const testo = evento.target.value.trim().toLowerCase();
  console.log(`Filtro: "${testo}"`);
});
```

Un `submit` ricarica la pagina e cancella lo stato: `evento.preventDefault()` blocca quel comportamento. I valori si leggono **dentro** la callback, perché prima del submit sono vuoti o vecchi; `trim()` elimina gli spazi ai bordi.

```js
const form = document.querySelector("#contatti");
const esito = document.querySelector("#esito");

form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nome = document.querySelector("#nome").value.trim();
  const email = document.querySelector("#email").value.trim();

  if (nome === "" || !email.includes("@")) {
    esito.textContent = "Compila nome ed email valida.";
    return;
  }

  esito.textContent = `Inviato: ${nome} (${email})`;
  form.reset();
});
```

Output con `Anna` e `anna@example.com`:

```text
Inviato: Anna (anna@example.com)
```

### Progetti: sfondo, tema scuro e calcolatrice

Lo sfondo è una classe sul `body` scelta da un array: nessuno stile inline resta nel codice.

```js
const sfondi = ["sfondo-blu", "sfondo-verde"];
let indice = 0;
document.querySelector("#sfondo").addEventListener("click", () => {
  document.body.classList.remove(...sfondi);
  document.body.classList.add(sfondi[indice]);
  indice = (indice + 1) % sfondi.length;
});
```

Il tema scuro funziona allo stesso modo con una sola classe (`body.scuro { background: #111; color: #eee; }`): `document.body.classList.toggle("scuro")` restituisce `true` quando la aggiunge, e quel valore decide il testo del pulsante.

La calcolatrice somma due campi. `Number("")` vale `0`, quindi il campo vuoto si controlla sulla stringa; `Number("abc")` vale `NaN` e si riconosce con `Number.isNaN`.

```js
const risultato = document.querySelector("#risultato");

document.querySelector("#somma").addEventListener("click", () => {
  const testoA = document.querySelector("#a").value;
  const testoB = document.querySelector("#b").value;
  const a = Number(testoA);
  const b = Number(testoB);

  if (testoA === "" || testoB === "" || Number.isNaN(a) || Number.isNaN(b)) {
    risultato.textContent = "Inserisci due numeri";
    return;
  }

  risultato.textContent = `Risultato: ${a + b}`;
});
```

Con `7` e `5` si legge `Risultato: 12`; con un campo vuoto `Inserisci due numeri`.

### Errori comuni

- Mettere lo script nella `head` senza `DOMContentLoaded`: `querySelector` vale `null` e l'errore parla di `addEventListener` di `null`.
- Scrivere `addEventListener("click", aggiorna())` con le parentesi: la funzione parte subito e al clic non succede nulla.
- Usare `innerHTML` per testo semplice: `textContent` è più sicuro e non rielabora il contenuto.
- Cambiare `style` inline invece di una classe: dopo tre modifiche non si sa più quale stile vince.
- Confrontare `campo.value` con un numero (`"5" === 5` è `false`) o convertire senza controllare la stringa vuota.
- Dimenticare `preventDefault()`: la pagina si ricarica e i dati inseriti spariscono.
- Ridisegnare la lista senza svuotare il contenitore: le voci si duplicano a ogni clic.

### Esercizi progressivi

1. **Contatore di clic.** Un paragrafo `Clic: 0` e un pulsante: a ogni clic il numero aumenta di uno (esercizio base 1).

   Output atteso partendo da 0, dopo un clic:

   ```text
   Clic: 1
   ```

2. **Titolo che cambia.** Campo di testo, pulsante e `<h1>`: al clic il titolo diventa il valore del campo; se il campo è vuoto il titolo resta invariato e un paragrafo mostra `Scrivi un titolo.` (esercizio base 2).
3. **Lista generata da un array.** Da `["HTML", "CSS", "JavaScript"]` costruisci una `<ul>` con `createElement`; un pulsante inserisce `DOM` e ridisegna (esercizio base 3).
4. **Evidenzia una voce.** Tre voci in lista: al clic su `Home` la voce riceve la classe `attiva` e le altre la perdono, mentre un paragrafo mostra `Attiva: Home` (esercizio base 4).
5. **Filtro live.** Array di città (`Cagliari`, `Catania`, `Milano`, `Como`, `Roma`) e campo di ricerca: a ogni carattere restano solo le città che contengono il testo, senza distinzione tra maiuscole e minuscole (esercizio intermedio 5).

   Output atteso con `ca`:

   ```text
   Visibili: 2
   Cagliari, Catania
   ```

6. **Form contatti validato.** Nome vuoto mostra `Inserisci il nome.`, email senza `@` mostra `Email non valida.`, altrimenti `Inviato: Anna (anna@example.com)` e `form.reset()` (esercizio intermedio 6).
7. **Schede prodotto.** Da un array di oggetti (`nome`, `prezzo`, `inOfferta`) crea una scheda per prodotto; quelle in offerta ricevono la classe `offerta`, e i contatori mostrano `Schede: 3` e `In offerta: 2` con Pane 2.5 in offerta, Latte 1.2, Biscotti 3.4 in offerta (esercizio intermedio 7).
8. **Tema scuro on/off.** Un pulsante attiva e disattiva la classe `scuro` sul `body` e alterna il proprio testo; il paragrafo di stato mostra `Tema: scuro` o `Tema: chiaro` (esercizio intermedio 8).
9. **Calcolatrice a due campi.** Due input numerici, un pulsante `Somma` e uno `Azzera`: con un campo vuoto mostra `Inserisci due numeri`, altrimenti il risultato (esercizio avanzato 9).

   Output atteso con `7` e `5`:

   ```text
   Risultato: 12
   ```

10. **Lista della spesa con totale.** Parti da `[{ nome: "Pane", prezzo: 2.5 }, { nome: "Latte", prezzo: 1.2 }]`: una riga per prodotto con pulsante `Rimuovi`, un form per aggiungere voci e un totale aggiornato con `toFixed(2)` (esercizio avanzato 10).

    Output atteso all'avvio:

    ```text
    Totale: 3.70
    ```

    Dopo aver rimosso `Pane`: `Totale: 1.20`.

### Varianti

- Nell'esercizio 1 aggiungi un pulsante `Ripristina` che riporta il contatore a zero.
- Nell'esercizio 5 mostra `Nessun risultato` quando il filtro non trova voci.
- Nell'esercizio 9 aggiungi le quattro operazioni con `<select>` e gestisci la divisione per zero con `Non si divide per zero`.
- Nell'esercizio 10 crea `calcolaTotale(spesa)` che lavora sull'array e non legge il DOM per fare i conti.
