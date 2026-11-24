# Settimana 5: Browser, storage e qualità del codice

**Obiettivo:** usare il tempo (callback, timer, date), gestire gli errori, conservare dati nel browser con `localStorage` e lavorare con metodo nei DevTools, riscrivendo lo script in funzioni piccole.

### Callback, setTimeout e higher-order functions

Una funzione è un valore: si può passare come argomento. La funzione che la riceve si dice **higher-order**, quella passata è la **callback**. `setTimeout(callback, millisecondi)` la esegue una volta dopo l'attesa, senza bloccare il resto del programma: per questo l'ordine di stampa non è quello di scrittura.

```js
console.log("Inizio");

setTimeout(() => {
  console.log("Promemoria: bevi acqua");
}, 1000);

console.log("Fine");
```

Output:

```text
Inizio
Fine
Promemoria: bevi acqua
```

`setTimeout` restituisce un id, e `clearTimeout(id)` annulla l'attesa. Il ritardo è in millisecondi e non è una garanzia esatta: il browser esegue la callback appena può. Anche `map`, `filter` e `reduce` sono higher-order, perché separano il **che cosa** dal **quante volte**.

```js
function ripeti(volte, azione) {
  for (let i = 1; i <= volte; i += 1) {
    azione(i);
  }
}

ripeti(3, (numero) => console.log(`Passo ${numero}`));
```

L'output è `Passo 1`, `Passo 2`, `Passo 3`. Una sola funzione con parametri chiari sostituisce tre copie dello stesso blocco, e la callback può cambiare senza toccare `ripeti`.

### Errori: try/catch e tipi

Un errore non gestito ferma lo script. `try` contiene il codice rischioso, `catch` riceve l'oggetto con `name`, `message` e `stack`, `finally` esegue sempre. `throw new Error("testo")` segnala una situazione che il codice non può risolvere da solo.

```js
function leggiTema(testo) {
  try {
    const dati = JSON.parse(testo);
    return dati.tema;
  } catch (errore) {
    console.log(`Errore ${errore.name}: uso il tema chiaro`);
    return "chiaro";
  }
}

console.log(leggiTema('{"tema":"scuro"}'));
console.log(leggiTema("non-json"));
```

Output:

```text
scuro
Errore SyntaxError: uso il tema chiaro
chiaro
```

I tipi più frequenti sono quattro: `SyntaxError` (`JSON.parse` o codice malformato), `TypeError` (proprietà di `undefined`, chiamare un non-funzione), `ReferenceError` (variabile mai dichiarata) e `RangeError` (`toFixed(200)`). Il `try` cattura solo errori sincroni: una callback di `setTimeout` lancia fuori da quel blocco. Un `catch` vuoto rende il bug invisibile; se gestisci l'errore, scrivi che cosa hai deciso di fare.

### Date e differenza in giorni

`new Date()` è l'istante attuale, `Date.parse` converte una stringa ISO in millisecondi. Due date si confrontano con `getTime()`, non con `===`, che confronta due oggetti distinti. I mesi partono da `0`: `new Date(2026, 10, 7)` è il 7 novembre.

```js
function giorniTra(dataInizio, dataFine) {
  const inizio = Date.parse(`${dataInizio}T00:00:00Z`);
  const fine = Date.parse(`${dataFine}T00:00:00Z`);
  return Math.round((fine - inizio) / 86400000);
}

console.log(`Giorni: ${giorniTra("2026-11-07", "2026-12-07")}`);
```

Output:

```text
Giorni: 30
```

Si lavora in UTC e si arrotonda con `Math.round` perché nei giorni di cambio dell'ora legale l'intervallo dura 23 o 25 ore e la divisione produrrebbe una frazione. Per la data di oggi in formato ISO si usa `new Date().toISOString().slice(0, 10)`, che è in UTC.

### setInterval e orologio

`setInterval(callback, millisecondi)` ripete la callback finché non chiami `clearInterval(id)`. L'id va salvato in una variabile: senza, l'intervallo resta attivo anche quando l'utente ha finito. `toLocaleTimeString("it-IT")` formatta l'ora corrente, mentre `String(n).padStart(2, "0")` è la via manuale per ottenere `09` invece di `9`.

```html
<p id="orologio">--:--:--</p>
<button id="stop">Stop</button>
```

```js
const orologio = document.querySelector("#orologio");
const intervallo = setInterval(() => {
  orologio.textContent = new Date().toLocaleTimeString("it-IT");
}, 1000);

document.querySelector("#stop").addEventListener("click", () => {
  clearInterval(intervallo);
});
```

L'orologio mostra `09:05:03` e si ferma al clic. Dentro l'intervallo si ricalcola sempre `new Date()`: salvare la data fuori dal timer bloccherebbe l'orologio sull'ora di partenza.

### localStorage e JSON

`localStorage` conserva solo stringhe, per origine del sito e senza scadenza: sopravvive al refresh e alla chiusura del browser. `setItem(chiave, valore)` scrive, `getItem` restituisce `null` quando la chiave manca e non un array vuoto (il valore di riserva lo decide il tuo codice), `removeItem` cancella. Un numero salvato torna stringa: `setItem("punti", 42)` seguito da `getItem` restituisce `"42"`, da convertire con `Number(...)`.

```js
localStorage.setItem("nome", "Anna");
console.log(localStorage.getItem("nome"));   // Anna
console.log(localStorage.getItem("citta"));  // null
```

```js
const spesa = [
  { nome: "Pane", prezzo: 2.5 },
  { nome: "Latte", prezzo: 1.2 },
];

localStorage.setItem("spesa", JSON.stringify(spesa));
const salvata = JSON.parse(localStorage.getItem("spesa") ?? "[]");

console.log(`Elementi: ${salvata.length}`);
console.log(salvata.map((voce) => voce.nome).join(", "));
```

Output:

```text
Elementi: 2
Pane, Latte
```

`JSON.stringify` trasforma l'array in testo, `JSON.parse` fa il percorso inverso; senza `stringify` lo storage salverebbe `"[object Object]"`. Il `?? "[]"` copre il primo avvio, e il `parse` va comunque dentro un `try` perché il contenuto può essere stato modificato a mano. Non salvare password o dati personali: chiunque apra i DevTools li legge.

### Debug e refactoring

Il flusso è sempre lo stesso: **riproduci** il bug, **osserva** i valori, **formula un'ipotesi**, **verifica** con un breakpoint, **correggi**, **ricontrolla**. `console.log("totale:", totale)` con etichette e `console.table(array)` per gli elenchi; nella scheda Sources un clic sul numero di riga ferma l'esecuzione, i pannelli Scope e Watch mostrano le variabili e Step over/into/out avanzano di una istruzione. La parola `debugger;` nel codice fa la stessa cosa di un breakpoint.

Dopo aver capito il bug si rifattorizza: funzioni piccole, nomi che dicono l'intento, nessuna duplicazione. Il tema persistente mescola classe, storage e testo del pulsante, quindi è l'esempio giusto per separare i tre compiti.

```js
function applicaTema(tema) {
  const scuro = tema === "scuro";
  document.body.classList.toggle("scuro", scuro);
  document.querySelector("#tema").textContent = scuro ? "Tema chiaro" : "Tema scuro";
  localStorage.setItem("tema", tema);
}

applicaTema(localStorage.getItem("tema") ?? "chiaro");
```

Al clic il pulsante chiama `applicaTema` con il tema opposto, quindi esiste un solo punto che tocca classe, storage e testo. `classList.toggle(classe, forza)` con il secondo argomento è idempotente: due chiamate con `"scuro"` lasciano lo stesso stato.

### Errori comuni

- Perdere l'id di `setInterval`: l'orologio continua e ne parte un secondo a ogni clic.
- Scrivere `setTimeout(aggiorna(), 1000)` con le parentesi: la funzione parte subito e il timer riceve `undefined`.
- Confrontare `localStorage.getItem("punti")` con un numero o aspettarsi un array al posto di una stringa.
- Chiamare `JSON.parse` fuori da `try`: un dato corrotto blocca l'intero script.
- Dividere i millisecondi per `86400000` senza arrotondare: con l'ora legale escono valori come `29.958`.
- Costruire `new Date(2026, 11, 7)` pensando a dicembre: i mesi vanno da `0` a `11`.
- Catturare l'errore e non fare nulla: il programma continua con dati sbagliati e nessuno se ne accorge.
- Salvare un oggetto con `setItem(chiave, oggetto)`: viene memorizzato `"[object Object]"`.

### Esercizi progressivi

1. **Promemoria ritardato.** Stampa `Inizio`, programma con `setTimeout` il messaggio `Promemoria: bevi acqua` dopo un secondo e stampa `Fine` (esercizio base 1).

   Output atteso:

   ```text
   Inizio
   Fine
   Promemoria: bevi acqua
   ```

2. **Funzione che riceve una callback.** Scrivi `esegui(valore, trasforma)` che restituisce `trasforma(valore)`; chiamala con `10` e `(n) => n * 2`, poi con `10` e `(n) => n + 5`, e stampa i due risultati (esercizio base 2).
3. **Orologio che si ferma.** Un contatore incrementato da `setInterval` ogni secondo stampa `Tick 1`, `Tick 2`, `Tick 3`; al terzo tick chiama `clearInterval` e stampa `Fermo` (esercizio base 3).

   Output atteso:

   ```text
   Tick 1
   Tick 2
   Tick 3
   Fermo
   ```

4. **Nome ricordato.** Un campo e un pulsante salvano il nome in `localStorage` alla chiave `"nome"`; al caricamento, se il nome esiste, il saluto mostra `Ciao, Anna`, altrimenti `Ciao, ospite` (esercizio base 4).
5. **Giorni a una data.** Scrivi `giorniTra(inizio, fine)` che restituisce i giorni interi tra due date ISO: con `2026-11-07` e `2026-12-07` stampa `Giorni: 30`, con `2026-11-01` come seconda data stampa `Giorni: -6`, cioè una data passata (esercizio intermedio 5).
6. **Lista salvata in JSON.** Salva in `localStorage` l'array `[{ nome: "Pane", prezzo: 2.5 }, { nome: "Latte", prezzo: 1.2 }]`, rileggilo e stampa `Elementi: 2` e i nomi separati da virgola. Al primo avvio la chiave manca: gestiscila con `?? "[]"` (esercizio intermedio 6).
7. **Errore di parsing gestito.** Scrivi `leggiLista(testo)` che restituisce l'array letto da JSON e, in caso di errore, stampa `Dati non validi: SyntaxError` e restituisce `[]`. Prova con `"non-json"` (esercizio intermedio 7).
8. **Refactoring di un contatore.** Questo script funziona ma è illeggibile: estrai `incrementa()`, `aggiornaVista()` e `salva()`, senza cambiare il comportamento (esercizio intermedio 8).

   ```js
   let c = 0;
   document.querySelector("#piu").onclick = function () {
     c = c + 1; document.querySelector("#vista").innerHTML = "Clic: " + c;
     localStorage.setItem("clic", c);
   };
   ```

9. **Tema persistente.** Un pulsante alterna la classe `scuro` sul `body`, salva la scelta in `localStorage` alla chiave `"tema"` e al caricamento riapplica il tema salvato. Stampa `Tema salvato: scuro` al clic e `Tema al caricamento: scuro` dopo il refresh (esercizio avanzato 9).

   Output atteso:

   ```text
   Tema salvato: scuro
   Tema al caricamento: scuro
   ```

10. **Bug da isolare.** Lo script legge un contatore salvato, calcola i giorni a una scadenza e legge una lista. Ha tre difetti: `getItem("clic") + 1` produce `"01"`, la differenza tra date non viene arrotondata e `JSON.parse` gira senza `try`. Trovali con i breakpoint e correggili (esercizio avanzato 10).

    Output atteso dopo la correzione:

    ```text
    Clic: 1
    Giorni: 30
    Elementi: 2
    ```

### Varianti

- Nell'esercizio 1 accetta un ritardo in secondi e annulla il timer con `clearTimeout` se l'utente clicca `Annulla`.
- Nell'esercizio 3 mostra anche i millisecondi e ferma l'orologio dopo cinque tick.
- Nell'esercizio 6 salva accanto alla lista la data di modifica con `new Date().toISOString()` e mostrala.
- Nell'esercizio 9, quando non esiste un tema salvato, rispetta la preferenza di sistema con `window.matchMedia("(prefers-color-scheme: dark)")`.
