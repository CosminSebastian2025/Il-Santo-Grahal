# Settimana 3: Oggetti e logica più solida

**Obiettivo:** descrivere dati reali con oggetti, aggiornarli senza errori e trasformare elenchi con `map`, `filter` e `reduce` invece di cicli scritti a mano.

### Oggetti: creare, leggere, modificare

Un oggetto raccoglie più informazioni sotto un solo nome: ogni proprietà ha una chiave e un valore. Serve quando i dati appartengono alla stessa entità e devono restare insieme.

```js
const libro = {
  titolo: "Il nome della rosa",
  autore: "Umberto Eco",
  anno: 1980,
};
libro.anno = 1981;
libro["editore"] = "Bompiani";
delete libro.autore;

const campo = "editore";
console.log(`${libro.titolo} (${libro.anno})`);
console.log(libro[campo], libro.autore);
```

Il codice stampa `Il nome della rosa (1981)` e `Bompiani undefined`. Il **dot** (`libro.titolo`) si usa con chiavi fisse, le **parentesi quadre** (`libro[campo]`) quando la chiave è il valore di una variabile. Leggere una proprietà assente restituisce `undefined`, non un errore: la riga successiva che chiama un metodo su quel valore esplode con `TypeError` e si evita con `libro.autore?.toUpperCase()`. `const` impedisce di riassegnare `libro`, non di modificarne le proprietà.

### Metodi e this

Un metodo è una funzione dentro un oggetto. Dentro il metodo `this` indica l'oggetto su cui il metodo è stato chiamato, cioè quello prima del punto.

```js
const conto = {
  saldo: 500,
  versa(importo) {
    this.saldo += importo;
    return this.saldo;
  },
  preleva(importo) {
    if (importo > this.saldo) return "Saldo insufficiente";
    this.saldo -= importo;
    return this.saldo;
  },
};
console.log(conto.versa(100));
console.log(conto.preleva(200));
console.log(conto.preleva(1000));
```

Output:

```text
600
400
Saldo insufficiente
```

`conto.versa(100)` imposta `this` a `conto`; `const versa = conto.versa; versa(100)` invece perde il legame e `this` non è più l'oggetto. Per questo i metodi si scrivono con la sintassi abbreviata o con `function`, mai come arrow: la arrow non ha un `this` proprio e leggerebbe quello esterno.

### Array di oggetti

La combinazione più usata: un array di oggetti, dove ogni elemento è una riga di una tabella. Due array paralleli (titoli da una parte, anni dall'altra) si disallineano al primo errore.

```js
const libreria = [
  { titolo: "Il nome della rosa", autore: "Umberto Eco", anno: 1980 },
  { titolo: "Se questo è un uomo", autore: "Primo Levi", anno: 1947 },
];

let recenti = 0;
for (const libro of libreria) {
  console.log(`${libro.titolo} - ${libro.anno}`);
  if (libro.anno > 1960) recenti += 1;
}

console.log(`Recenti: ${recenti}`);
```

L'output è `Il nome della rosa - 1980`, `Se questo è un uomo - 1947` e `Recenti: 1`. Il ciclo legge un oggetto alla volta e ne usa i campi per nome: se domani aggiungi `editore`, il codice esistente continua a funzionare.

### switch e operatore ternario

`switch` confronta un valore con più casi usando `===`. Ogni `case` termina con `break`, altrimenti l'esecuzione continua nel caso successivo (fall-through); `default` copre i valori non previsti.

```js
const ruolo = "editor";
switch (ruolo) {
  case "admin":
    console.log("Accesso completo");
    break;
  case "editor":
    console.log("Puoi modificare i contenuti");
    break;
  default:
    console.log("Sola lettura");
}

const scorte = 3;
const stato = scorte === 0 ? "esaurito" : "disponibile";
console.log(`${stato}, allarme: ${scorte < 5}`);
```

Il programma stampa `Puoi modificare i contenuti` e poi `disponibile, allarme: true`. Il **ternario** `condizione ? valoreSeVero : valoreSeFalso` è un `if` che restituisce un valore: usalo quando assegni un risultato, non per eseguire azioni. Per le fasce numeriche si può usare `switch (true)` con casi booleani, ma spesso una catena di `if`/`else if` è più leggibile.

### Stringhe e numeri: metodi utili e Math

Le stringhe sono immutabili: ogni metodo restituisce una nuova stringa e l'originale resta com'è.

```js
const grezzo = "  Anna Rossi  ";
const pulito = grezzo.trim();

console.log(pulito.toUpperCase());
console.log(pulito.includes("Rossi"));
console.log(pulito.slice(0, 4));
console.log(pulito.split(" ").length);
```

Output:

```text
ANNA ROSSI
true
Anna
2
```

`trim` toglie gli spazi ai bordi, `toUpperCase` e `toLowerCase` cambiano il caso, `includes` risponde a una domanda booleana, `slice(0, 4)` prende i caratteri dall'indice `0` al `3`, `split(" ")` divide in un array di parole.

```js
const dado = Math.floor(Math.random() * 6) + 1;
console.log(Math.floor(4.9), Math.ceil(4.1), Math.max(3, 9, 2));
```

L'output è `4 5 9`. `Math.random()` restituisce un decimale tra `0` incluso e `1` escluso: moltiplicando per 6 si ottiene `0..5.99`, `floor` taglia i decimali e `+ 1` porta a `1..6`. Senza `floor` il dado produrrebbe decimali, senza `+ 1` anche lo zero.

### map, filter, reduce e inventario

I tre metodi sostituiscono i cicli con un'intenzione dichiarata: `map` trasforma ogni elemento (stessa lunghezza), `filter` tiene solo quelli che superano una condizione, `reduce` riduce l'elenco a un solo valore partendo dall'accumulatore iniziale.

```js
const magazzino = [
  { nome: "Tastiera", prezzo: 45, quantita: 1 },
  { nome: "Mouse", prezzo: 20, quantita: 2 },
  { nome: "Cavo USB", prezzo: 5, quantita: 5 },
];
const nomi = magazzino.map((prodotto) => prodotto.nome);
const sottoScorta = magazzino.filter((p) => p.quantita < 2).map((p) => p.nome);
const totale = magazzino.reduce((somma, p) => somma + p.prezzo * p.quantita, 0);
console.log(nomi.join(", "));
console.log(`Sotto scorta: ${sottoScorta.join(", ")}`);
console.log(`Totale magazzino: ${totale.toFixed(2)} EUR`);
```

Output:

```text
Tastiera, Mouse, Cavo USB
Sotto scorta: Tastiera
Totale magazzino: 110.00 EUR
```

Nessuno dei tre modifica l'array di partenza. Il valore iniziale `0` di `reduce` non è un dettaglio: senza di esso un array vuoto lancia `TypeError` e, con gli oggetti, il primo prodotto verrebbe usato come accumulatore.

### Errori comuni

- Scrivere `map` senza `return` nel callback: si ottiene un array di `undefined`.
- Chiamare `reduce` senza valore iniziale: errore su array vuoto e accumulatore del tipo sbagliato.
- Dimenticare `break` nello `switch`: vengono eseguiti anche i `case` successivi.
- Confrontare due oggetti con `===`: confronta il riferimento, non il contenuto.
- Usare una arrow come metodo o estrarre un metodo (`const preleva = conto.preleva`): `this` non punta più all'oggetto.
- Scrivere `utente.campo` al posto di `utente[campo]`: legge la chiave `"campo"`, non il suo valore.
- Usare `Math.random() * 6` senza `Math.floor` e `+ 1`: escono decimali o zero.

### Esercizi progressivi

1. **Scheda libro.** Crea un oggetto con titolo, autore, anno e pagine, poi stampa una riga per campo (esercizio base 1).

   Output atteso:

   ```text
   Titolo: Se questo è un uomo
   Autore: Primo Levi
   Anno: 1947
   Pagine: 208
   ```

2. **Aggiornamento proprietà.** Parti da `{ nome: "Giulia", ruolo: "junior" }`: porta `ruolo` a `"mid"` con il dot, aggiungi `sede: "Milano"` con le parentesi quadre ed elimina `nome`. Stampa `Ruolo: mid`, `Sede: Milano` e poi `undefined` (esercizio base 2).
3. **Metodi con this.** Crea un termostato con `temperatura: 18`, `alza(gradi)` e `abbassa(gradi)` che non scende sotto 5. Con `alza(4)` stampa `Temperatura: 22`, con `abbassa(30)` stampa `Temperatura: 5` (esercizio base 3).
4. **Array di oggetti.** Tre studenti con nome e voto: stampa `Nome: voto` per ciascuno e quanti hanno almeno 18. Con Anna 28, Bruno 17, Carla 24 il conteggio è `Promossi: 2` (esercizio base 4).
5. **switch sui voti.** `giudizio(voto)` restituisce `Ottimo` da 28, `Buono` da 24, `Sufficiente` da 18, altrimenti `Insufficiente`: risolvilo con `switch (true)` e casi booleani. Con 27, 18 e 12 stampa rispettivamente `Buono`, `Sufficiente`, `Insufficiente` (esercizio intermedio 5).
6. **Pulizia stringhe.** Da `"  mARiO   rOSSI  "` ottieni `"Mario Rossi"` con `trim`, `toLowerCase`, `split(/\s+/)`, iniziale maiuscola e `join`; calcola anche le iniziali (esercizio intermedio 6).

   Output atteso:

   ```text
   Nome pulito: Mario Rossi
   Iniziali: M. R.
   ```

7. **Dado.** `lanciaDado()` restituisce un intero da 1 a 6. Lancia 6000 volte contando le uscite in un oggetto: la somma dei conteggi deve dare `Totale lanci: 6000`, mentre i singoli valori cambiano a ogni esecuzione (esercizio intermedio 7).
8. **Raddoppio e pari.** Con `[3, 8, 12, 5, 20, 7]` usa `map` per raddoppiare e `filter` per tenere i pari: i due array stampati con `join` sono `6, 16, 24, 10, 40, 14` e `8, 12, 20` (esercizio intermedio 8).
9. **reduce sul carrello.** Penna 1.50 x 4, Quaderno 3.20 x 2, Zaino 45 x 1: calcola totale, numero di pezzi e media per pezzo con tre `reduce` separati (esercizio avanzato 9).

   Output atteso:

   ```text
   Totale: 57.40 EUR
   Pezzi: 7
   Media per pezzo: 8.20 EUR
   ```

10. **Inventario.** Magazzino con Tastiera (45 x 2), Mouse (20 x 1) e Hub USB (15 x 0): stampa il valore di ogni riga, il totale, il valore medio per articolo e i nomi sotto scorta (quantità minore di 2) (esercizio avanzato 10).

    Output atteso:

    ```text
    Tastiera x2: 90.00 EUR
    Mouse x1: 20.00 EUR
    Hub USB x0: 0.00 EUR
    Totale magazzino: 110.00 EUR
    Valore medio per articolo: 36.67 EUR
    Sotto scorta: Mouse, Hub USB
    ```

### Varianti

- Nel report inventario escludi gli articoli con quantità `0` dal calcolo della media.
- Stampa la scheda libro con `Object.entries` nel formato `chiave: valore`.
- Sostituisci il `for` della libreria con `filter` e `map` e confronta la leggibilità.
- Nel dado conta quante volte esce 6 su 6000 lanci e confronta il valore con i 1000 attesi.
