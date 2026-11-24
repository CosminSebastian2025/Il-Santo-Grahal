# Settimana 2: Funzioni, array e cicli

**Obiettivo:** racchiudere la logica in funzioni riutilizzabili, conservare più valori in un array e ripetere un'operazione con il ciclo adatto al caso.

### Funzioni, parametri e return

Una funzione è un blocco di codice con un nome: evita di ripetere le istruzioni e rende leggibile l'intenzione. I **parametri** sono i nomi nella definizione, gli **argomenti** i valori passati nella chiamata.

```js
function saluta(nome) {
  return `Ciao, ${nome}!`;
}

console.log(saluta("Anna"));
console.log(saluta("Luca"));
```

Il programma stampa `Ciao, Anna!` e `Ciao, Luca!`. `console.log` mostra un valore, `return` lo consegna al chiamante: solo il valore restituito si può riusare in un calcolo. `return` chiude la funzione e una funzione senza `return` vale `undefined`. Con `function` la funzione esiste anche prima della sua riga (hoisting). I parametri accettano un valore predefinito: `function prezzoConIva(prezzo, iva = 0.22)` usa `0.22` quando l'argomento manca.

### Arrow function e scope

Una arrow function è una funzione scritta come espressione: con una sola espressione il `return` è implicito, con le graffe va scritto.

```js
const doppio = (n) => n * 2;
const saluta = (nome) => `Ciao, ${nome}!`;

console.log(doppio(21));
console.log(saluta("Sara"));
```

L'output è `42` seguito da `Ciao, Sara!`. Rispetto a `function`, una arrow non ha un `this` proprio, non ha `arguments` e non esiste prima della sua riga (TDZ): va bene per i callback, non come metodo di un oggetto.

Lo **scope** è la zona in cui un nome esiste. `const` e `let` vivono nel blocco `{ }` più vicino, compreso quello di un `if` o di un `for`: una costante dichiarata lì dentro, fuori non esiste. Una funzione che dichiara `const nome = "Luca"` crea una variabile locale che **ombreggia** quella esterna, senza modificarla.

### Array: indici, length e metodi

Un array è un elenco ordinato indicizzato da `0`. `length` è il numero di elementi e l'ultimo indice è `length - 1`.

```js
const spesa = ["pane", "latte", "uova"];
console.log(spesa.length, spesa[0], spesa[spesa.length - 1], spesa[10]);
spesa.push("caffe");
spesa.unshift("acqua");
console.log(spesa.join(", "));
```

Output:

```text
3 pane uova undefined
acqua, pane, latte, uova, caffe
```

Un indice inesistente vale `undefined`, non è un errore: è la causa più frequente di `NaN` nelle somme. `push`/`pop` lavorano in fondo, `unshift`/`shift` in testa; `push` restituisce la nuova lunghezza, `pop` l'elemento rimosso. I metodi **non mutabili** (`slice`, `concat`, `join`, `includes`) restituiscono un nuovo valore e lasciano l'array com'è: la differenza conta quando lo stesso array è usato in due punti del programma.

### for, while e do...while

Il `for` serve quando conosci il numero di ripetizioni o ti serve l'indice; per sommare un array l'indice va da `0` a `length - 1` e l'accumulatore vive fuori dal ciclo.

```js
const prezzi = [12, 8, 25, 5];
let somma = 0;
for (let i = 0; i < prezzi.length; i += 1) {
  somma += prezzi[i];
}

let energia = 3;
while (energia > 0) {
  energia -= 1;
}
console.log(`Totale: ${somma}, energia: ${energia}`);
```

L'output è `Totale: 50, energia: 0`. `while` controlla la condizione prima di ogni giro e può non eseguire il corpo nemmeno una volta; `do...while` la controlla alla fine, quindi il corpo gira almeno una volta. Se dimentichi `energia -= 1` il ciclo non termina e la pagina si blocca: è il classico ciclo infinito.

### for...of e forEach

`for...of` scorre i **valori** senza indice: è la forma più leggibile quando l'indice non serve. `forEach` fa lo stesso con un callback e mette a disposizione anche la posizione.

```js
const voti = [6, 7, 9];
let somma = 0;

for (const voto of voti) {
  somma += voto;
}

voti.forEach((voto, indice) => {
  console.log(`Voto ${indice + 1}: ${voto}`);
});

console.log(`Somma: ${somma}`);
```

Output:

```text
Voto 1: 6
Voto 2: 7
Voto 3: 9
Somma: 22
```

Dentro `for...of` funzionano `break` e `continue`; `forEach` non si può interrompere e restituisce sempre `undefined`. Usa `forEach` per un effetto e `for...of` quando devi uscire prima o accumulare un risultato.

### Mini progetto: statistiche di un array

Quattro funzioni, una responsabilità ciascuna. La media chiama `somma` invece di ripetere il ciclo: se la formula cambia si corregge in un punto solo.

```js
const numeri = [12, 7, 19, 4, 15, 9];

function somma(valori) {
  let totale = 0;
  for (const valore of valori) totale += valore;
  return totale;
}

function media(valori) {
  return valori.length === 0 ? 0 : somma(valori) / valori.length;
}

function minimo(valori) {
  let min = valori[0];
  for (const valore of valori) if (valore < min) min = valore;
  return min;
}

function massimo(valori) {
  let max = valori[0];
  for (const valore of valori) if (valore > max) max = valore;
  return max;
}

console.log(`Numeri: ${numeri.length}`);
console.log(`Somma: ${somma(numeri)}`);
console.log(`Media: ${media(numeri).toFixed(2)}`);
console.log(`Minimo: ${minimo(numeri)}`);
console.log(`Massimo: ${massimo(numeri)}`);
```

Output:

```text
Numeri: 6
Somma: 66
Media: 11.00
Minimo: 4
Massimo: 19
```

Il caso limite è l'array vuoto: `media` restituisce `0` invece di `NaN`, mentre `minimo` e `massimo` leggerebbero `undefined`.

### Errori comuni

- Usare `console.log` dentro una funzione che deve calcolare un valore: il risultato non torna al chiamante.
- Dimenticare il `return` e ottenere `undefined` da una funzione che sembra corretta.
- Scrivere `i <= array.length`: l'ultimo giro legge `undefined` e la somma diventa `NaN`.
- Dichiarare l'accumulatore con `let` dentro il ciclo: si azzera a ogni giro, perché il blocco lo ricrea.
- Dimenticare l'incremento nel `while`: ciclo infinito e scheda bloccata.
- Credere che `push` restituisca l'array: restituisce la lunghezza, come `pop` restituisce l'elemento.
- Aspettarsi che `forEach` costruisca un nuovo array: restituisce `undefined`, per trasformare serve `map`.

### Esercizi progressivi

1. **Saluto parametrico.** Scrivi `saluta(nome)` che restituisce `Ciao, ${nome}!` e stampa il risultato per `"Marta"` e `"Luca"`: devono uscire `Ciao, Marta!` e `Ciao, Luca!` (esercizio base 1).
2. **Prezzo totale.** `prezzoTotale(prezzo, quantita)` restituisce prezzo per quantità; con `4.5` e `3` stampa `Totale: 13.50 EUR` (esercizio base 2).
3. **Arrow e IVA.** Riscrivi come arrow la funzione `prezzoConIva(prezzo, iva = 0.22)` e stampa `prezzoConIva(100)` e `prezzoConIva(100, 0.10)`: devono uscire `122.00` e `110.00` (esercizio base 3).
4. **Block scope.** Dentro una funzione dichiara `const esito` in un `if` e restituiscila, con soglia `30` e punteggi `34` e `21`. Poi stampa `esito` fuori dall'`if`, leggi il `ReferenceError` e spiega in un commento perché accade (esercizio base 4).
5. **Array della spesa.** Con `["pane", "latte", "uova", "caffe"]` stampa numero, primo e ultimo elemento usando `length`: `Articoli: 4`, `Primo: pane`, `Ultimo: caffe` (esercizio intermedio 5).
6. **Coda di stampa.** Parti da `["documento1.pdf", "foto.png"]`, aggiungi `"contratto.pdf"` in fondo e `"urgente.txt"` in testa, poi estrai il primo e l'ultimo con `shift` e `pop` (esercizio intermedio 6).

   Output atteso:

   ```text
   urgente.txt | documento1.pdf | foto.png | contratto.pdf
   Estratti: urgente.txt e contratto.pdf
   documento1.pdf | foto.png
   ```

7. **Somma 1..100.** Con un `for` somma i numeri da 1 a 100 e conta quanti sono pari (esercizio intermedio 7).

   Output atteso:

   ```text
   Somma 1..100: 5050
   Numeri pari: 50
   ```

8. **Risparmio con do...while.** Versi 150 EUR al mese fino a 1000 EUR: stampa `Mesi necessari: 7` e `Totale risparmiato: 1050.00 EUR` (esercizio intermedio 8).
9. **Report statistiche.** Applica il progetto a `[14, 6, 21, 9, 10]` con funzioni separate per somma, media, minimo e massimo (esercizio avanzato 9).

   Output atteso:

   ```text
   Numeri: 5
   Somma: 60
   Media: 12.00
   Minimo: 6
   Massimo: 21
   ```

10. **Debug: variabile fuori scope.** Questo codice lancia `ReferenceError: totale is not defined`: individualo, correggilo e ottieni l'output indicato (esercizio avanzato 10).

    ```js
    function calcolaTotale(prezzi) {
      for (let i = 0; i < prezzi.length; i += 1) {
        let totale = 0;
        totale += prezzi[i];
      }
      return totale;
    }

    console.log(`Totale: ${calcolaTotale([10.5, 20, 15])}`);
    ```

    Output atteso dopo la correzione:

    ```text
    Totale: 45.50
    ```

### Varianti

- Fai restituire `null` a `media` per un array vuoto e gestisci `null` nel chiamante.
- Aggiungi al report `contaPari(valori)` e `contaDispari(valori)`.
- Sostituisci il `for...of` di `somma` con `forEach` e verifica che l'output non cambi.
- Prova il report con `[-3, 0, 8]`: controlla che minimo e massimo restino corretti.
