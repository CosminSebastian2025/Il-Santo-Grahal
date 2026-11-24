# Settimana 1: Fondamenti — console, variabili e condizioni

**Obiettivo:** eseguire le prime istruzioni nella console, conservare valori nelle variabili, riconoscere i tipi e scegliere un percorso con le condizioni.

### La console

La console del browser è il posto più veloce per provare il codice. Apri gli strumenti di sviluppo con `F12` e seleziona la scheda **Console**.

```js
console.log("Ciao, mondo!");
console.log(2 + 3);
```

Output:

```text
Ciao, mondo!
5
```

`console.log` stampa il valore tra parentesi. Non serve altro per iniziare: nessun progetto, nessuna configurazione.

### Variabili: let e const

Una variabile è un nome che punta a un valore. In JavaScript si dichiara con `let` (può cambiare) o `const` (non può essere riassegnata).

```js
const nome = "Anna";
let eta = 17;

eta = 18;                 // consentito: eta è let
console.log(`${nome} ha ${eta} anni`);
```

Output:

```text
Anna ha 18 anni
```

Se provi a riassegnare una `const`, il programma si ferma con `TypeError: Assignment to constant variable`. La regola pratica: **`const` per default**, `let` solo quando il valore deve davvero cambiare, `var` mai.

Attenzione a una distinzione che confonde molti principianti: `const` blocca la **riassegnazione del nome**, non la modifica del contenuto di un oggetto.

```js
const persona = { nome: "Anna" };
persona.nome = "Marta";   // consentito
console.log(persona.nome);
```

Output:

```text
Marta
```

### Tipi e typeof

JavaScript ha pochi tipi primitivi:

| Tipo | Esempio | `typeof` |
| --- | --- | --- |
| string | `"ciao"` | `"string"` |
| number | `42`, `3.5` | `"number"` |
| boolean | `true`, `false` | `"boolean"` |
| undefined | `let x;` | `"undefined"` |
| object | `{ nome: "Anna" }`, `[1, 2]` | `"object"` |
| function | `function f() {}` | `"function"` |

```js
const testo = "ciao";
const numero = 42;
const attivo = true;
let nonAssegnata;

console.log(typeof testo);
console.log(typeof numero);
console.log(typeof attivo);
console.log(typeof nonAssegnata);
```

Output:

```text
string
number
boolean
undefined
```

Due trappole note: `typeof null` restituisce `"object"` (un difetto storico del linguaggio) e `typeof []` restituisce `"object"`. Per riconoscere un array si usa `Array.isArray(valore)`.

### Stringhe e template literals

La concatenazione con `+` funziona, ma diventa illeggibile appena i valori aumentano:

```js
const nome = "Luca";
const eta = 17;
const citta = "Torino";

console.log("Mi chiamo " + nome + ", ho " + eta + " anni e vivo a " + citta + ".");
```

I **template literals** usano i backtick e `${}`:

```js
console.log(`Mi chiamo ${nome}, ho ${eta} anni e vivo a ${citta}.`);
```

Output in entrambi i casi:

```text
Mi chiamo Luca, ho 17 anni e vivo a Torino.
```

Con i template literals si scrivono anche stringhe su più righe e si inseriscono espressioni:

```js
console.log(`Tra un anno avrò ${eta + 1} anni.`);
console.log(`Nome in maiuscolo: ${nome.toUpperCase()}`);
```

Output:

```text
Tra un anno avrò 18 anni.
Nome in maiuscolo: LUCA
```

### Numeri e operatori

| Operatore | Significato | Esempio | Risultato |
| --- | --- | --- | --- |
| `+` | somma | `7 + 2` | `9` |
| `-` | sottrazione | `7 - 2` | `5` |
| `*` | moltiplicazione | `7 * 2` | `14` |
| `/` | divisione | `7 / 2` | `3.5` |
| `%` | resto | `7 % 2` | `1` |
| `**` | potenza | `2 ** 3` | `8` |

A differenza di C e Java, la divisione tra due interi produce un numero decimale:

```js
console.log(7 / 2);
console.log(7 % 2);
console.log((7 / 2).toFixed(1));
```

Output:

```text
3.5
1
3.5
```

`toFixed(1)` converte il numero in stringa con un decimale: serve per la stampa, non per i calcoli successivi.

I numeri JavaScript sono sempre `number` (virgola mobile a 64 bit). Questo spiega un risultato celebre:

```js
console.log(0.1 + 0.2);
```

Output:

```text
0.30000000000000004
```

Non è un errore del programma: è il modo in cui il computer rappresenta i decimali. Per i soldi si lavora in centesimi interi oppure si arrotonda solo alla fine.

### Booleani e confronti

| Operatore | Significato |
| --- | --- |
| `===` | uguale e stesso tipo |
| `!==` | diverso o tipo diverso |
| `>` `>=` | maggiore, maggiore o uguale |
| `<` `<=` | minore, minore o uguale |
| `&&` | e logico |
| `\|\|` | o logico |
| `!` | negazione |

La differenza tra `==` e `===` è sostanziale:

```js
console.log(5 == "5");
console.log(5 === "5");
console.log(0 == false);
console.log(0 === false);
```

Output:

```text
true
false
true
false
```

`==` converte i tipi prima di confrontare e produce risultati sorprendenti. Nel corso si usa sempre `===`.

Ogni valore, in una condizione, vale come vero o falso. Sono **falsy**: `false`, `0`, `""`, `null`, `undefined`, `NaN`. Tutto il resto è **truthy**, compresi `"0"` e `[]`.

### if / else if / else

```js
const eta = 17;

if (eta >= 18) {
  console.log("Maggiorenne");
} else {
  console.log("Minorenne");
}
```

Output:

```text
Minorenne
```

Con più fasce si usa `else if`, e l'ordine delle condizioni conta:

```js
const anni = 15;

if (anni < 13) {
  console.log("Bambino");
} else if (anni < 18) {
  console.log("Adolescente");
} else if (anni < 65) {
  console.log("Adulto");
} else {
  console.log("Anziano");
}
```

Output:

```text
Adolescente
```

Se invertissi l'ordine (`anni < 65` per primo), un quindicenne finirebbe in "Adulto": la prima condizione vera vince e le altre non vengono valutate.

### Esempio completo: bio personale

```js
const nome = "Marta";
const anni = 28;
const citta = "Bologna";
const hobby = ["fotografia", "corsa", "cucina"];

const fascia = anni < 18 ? "giovane" : "adulta";

console.log(`Mi chiamo ${nome}, ho ${anni} anni e vivo a ${citta}.`);
console.log(`Sono una persona ${fascia}.`);
console.log(`I miei hobby: ${hobby.join(", ")}.`);
```

Output:

```text
Mi chiamo Marta, ho 28 anni e vivo a Bologna.
Sono una persona adulta.
I miei hobby: fotografia, corsa, cucina.
```

L'operatore ternario `condizione ? valoreSeVero : valoreSeFalso` è solo una forma compatta di `if`/`else` quando il risultato è un valore.

### Errori comuni

- Usare `=` invece di `===` dentro una condizione: l'assegnazione restituisce un valore e la condizione diventa quasi sempre vera.
- Confondere `"5" + 1` (`"51"`, concatenazione) con `5 + 1` (`6`, somma).
- Riassegnare una `const` e interpretare il `TypeError` come un errore del browser.
- Scrivere `if (eta = 18)` invece di `if (eta === 18)`.
- Dimenticare che `typeof null` è `"object"`.
- Concatenare numeri e stringhe e poi sommarli: `"10" + 5` vale `"105"`.
- Chiudere una graffa in meno: l'errore indicherà una riga successiva, non quella vera.

### Esercizi progressivi

1. **Presentazione in console.** Crea tre variabili (`nome`, `eta`, `citta`) e stampa una frase completa (esercizio base 1).

   Output atteso con `Luca`, `17`, `Torino`:

   ```text
   Mi chiamo Luca, ho 17 anni e vivo a Torino.
   ```

2. **let e const.** Crea una `const` per il nome e una `let` per il contatore delle visite. Incrementa il contatore due volte e stampa il valore; poi spiega in un commento perché la `const` non può essere incrementata (esercizio base 2).

   Output atteso:

   ```text
   Visite: 2
   ```

3. **Tipi e typeof.** Crea quattro variabili (testo, numero, booleano, oggetto) e stampa per ciascuna nome, valore e `typeof` (esercizio base 3).

   Output atteso:

   ```text
   testo -> ciao (string)
   numero -> 42 (number)
   attivo -> true (boolean)
   persona -> [object Object] (object)
   ```

4. **Template literal.** Riscrivi una concatenazione con `+` usando i template literals e aggiungi una riga con un calcolo dentro `${}` (esercizio base 4). Verifica che l'output sia identico.

5. **Operazioni e media.** Con due numeri calcola somma, differenza, prodotto, quoziente e resto; poi calcola la media dei due con due decimali (esercizio base 5).

   Output atteso con `8` e `3`:

   ```text
   Somma: 11
   Differenza: 5
   Prodotto: 24
   Quoziente: 2.67
   Resto: 2
   Media: 5.50
   ```

6. **Confronti.** Con due numeri stampa il risultato di `>`, `<`, `===` e `!==`; aggiungi un confronto tra `"5"` e `5` con `==` e con `===` e spiega la differenza in un commento (esercizio intermedio 6).

7. **Fasce di età.** Chiedi (con una variabile) un'età e stampa `Bambino`, `Adolescente`, `Adulto` o `Anziano` con le soglie 13, 18 e 65 (esercizio intermedio 7). Prova i valori 7, 15, 30 e 70.

8. **Sconto con controllo.** Dato un prezzo e una percentuale di sconto, calcola il prezzo finale solo se lo sconto è tra 0 e 100; altrimenti stampa un messaggio di errore (esercizio intermedio 8).

   Output atteso con `80` e `10`:

   ```text
   Prezzo finale: 72.00
   ```

   Con sconto `120`:

   ```text
   Sconto non valido: usa un valore tra 0 e 100.
   ```

9. **Validazione semplice.** Data una password, stampa il primo problema trovato tra: meno di 8 caratteri, nessuna cifra, nessuna lettera maiuscola. Se va bene stampa `Password valida.` (esercizio intermedio 9).

   Output atteso con `"ciao"`:

   ```text
   Errore: almeno 8 caratteri.
   ```

10. **Trova e correggi.** Questo codice contiene tre errori. Copialo, individua gli errori leggendo il messaggio della console, correggilo e ottieni l'output indicato (esercizio avanzato 10).

    ```js
    const nome = "Anna"
    let eta = "17";
    if (eta = 18) {
      console.log("Maggiorenne");
    } else {
      console.log(nome + " ha " + eta + " anni");
    }
    ```

    Output atteso dopo la correzione (con `eta = 17`):

    ```text
    Anna ha 17 anni
    ```

### Varianti

- Nell'esercizio 1, se il nome è una stringa vuota, stampa `Ciao, sconosciuto.`.
- Nell'esercizio 7 accetta anche un'età negativa e stampa `Età non valida`.
- Nell'esercizio 8 arrotonda il prezzo finale a due decimali con `toFixed(2)` e aggiungi il simbolo `EUR`.
- Nell'esercizio 9 restituisci **tutti** i problemi invece del solo primo.
