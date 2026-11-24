Una struttura dati è una promessa sul costo delle operazioni: se scegli la struttura giusta, le operazioni che usi di più costano poco, altrimenti paghi un prezzo nascosto a ogni chiamata. Scegliere su una sola operazione è l'errore più frequente: un elenco ben ordinato può rendere rapidissima una ricerca e lentissima un inserimento. In questa lezione confronti le strutture di uso quotidiano e chiudi con sei esercizi su un progetto locale tuo.

## Obiettivi

- Confrontare array, liste collegate, mappe, insiemi, pile, code e alberi per operazioni.
- Riconoscere il costo nascosto di inserimenti ed eliminazioni in mezzo a una sequenza.
- Scegliere una struttura in base al mix reale di operazioni, non a una sola.
- Verificare la scelta con test misurati sul proprio dominio di dati.

## Che cosa promette una struttura

Ogni struttura dati ha un contratto. Array e liste dinamiche garantiscono accesso costante per indice e aggiunte efficienti in fondo, ma inserimenti e rimozioni in mezzo richiedono di spostare elementi. Liste collegate rendono rimosse e inserimenti locali costanti una volta trovato il nodo, ma non permettono l'accesso diretto e per una ricerca devono scandire. Mappe e insiemi implementano l'accesso per chiave con costo mediamente costante, mentre alberi bilanciati e mappe ordinate mantengono le chiavi in ordine e pagano un fattore logaritmico.

| Struttura | Accesso per indice | Ricerca per chiave | Inserimento in mezzo | Ordine |
| --- | --- | --- | --- | --- |
| Array dinamico | O(1) | O(n) | O(n) | no |
| Lista collegata | O(n) | O(n) | O(1) con posizione | no |
| Insieme (hash) | - | mediamente O(1) | mediamente O(1) | no |
| Mappa ordinata / albero | - | O(log n) | O(log n) | sì |
| Pila e coda | - | - | O(1) alle estremità | parziale |

Il vocabolo "mediamente" nella riga dell'hash non è un dettaglio. Il costo costante dipende dalla distribuzione delle chiavi e dal fattore di carico: con funzioni di hash adatte e tabelle che si ridimensionano, la media resta bassa, ma chiavi costruite male possono concentrarsi e degradare le prestazioni. La mitigazione è scegliere strutture della libreria standard, che integrano il resizing, e non implementare una tabella a mano per un servizio in produzione.

## Il costo nascosto dell'ordine

Una delle confusioni più comuni è confondere "mantiene l'ordine" con "cerca per chiave". Una lista ordinata permette una ricerca binaria O(log n), ma ogni inserimento in posizione sposta gli elementi successivi. Un albero bilanciato fa entrambe le cose in O(log n); un insieme hash cerca in tempo mediamente costante senza mantenere l'ordine. La domanda da porsi non è quale struttura è migliore, ma quante volte faccio ciascuna operazione:

- se leggo per indice milioni di volte e inserisco raramente in coda, un array è quasi sempre la risposta;
- se inserisco e rimuovo continuamente in testa, una pila o una coda sono più adatte;
- se cerco per chiave senza ordine, un insieme o una mappa hash;
- se ho bisogno di intervalli ordinati, un albero bilanciato o una struttura equivalente.

In JavaScript, ad esempio, `Map` e `Set` mantengono l'ordine di inserzione pur garantendo accesso per chiave mediamente costante, una combinazione che spesso rende inutile costruire soluzioni a mano.

```js
// Deduplicare senza ricerca lineare: il Set evita O(n^2)
function unici(valori) {
  return [...new Set(valori)];
}

// Con conteggio delle occorrenze in un solo passaggio
function conteggi(valori) {
  const mappa = new Map();
  for (const valore of valori) mappa.set(valore, (mappa.get(valore) ?? 0) + 1);
  return mappa;
}
```

Nell'esempio della deduplicazione, la versione "ingenua" con un ciclo che verifica l'appartenenza in un array costa il prodotto delle dimensioni; il `Set` riduce il tutto a un passaggio. È il tipo di modifica che non cambia l'interfaccia e che rende osservabile la differenza solo su input grandi: proprio per questo va identificata per ragionamento, prima della misura.

## Scegliere e verificare

La scelta si fa su due livelli. Il primo è il modello: stime delle operazioni per uso tipico, con una tabella come quella sopra. Il secondo è la misura: un benchmark costruito con l'ordine di grandezza reale dei dati, non con cento elementi. Un test su cento elementi premia spesso la struttura sbagliata perché le costanti dominano.

La verifica deve includere il caso peggiore plausibile, non solo quello medio. Una mappa hash con chiavi delimitate da un pattern prevedibile è un caso peggiore realistico; una lista che cresce solo in coda lo è meno. Un progetto maturo annota accanto alla struttura le ipotesi che la rendono conveniente, così una modifica futura sa cosa sta rompendo.

## Esercizi

1. **Mappa delle operazioni.** Prendi un tuo servizio locale e scrivi per ogni endpoint le operazioni svolte su ciascuna collezione. Identifica una collezione dove la struttura attuale è inadeguata.
2. **Deduplicazione.** Scrivi in due versioni una funzione che rimuove i duplicati da una lista e misura entrambe su 10.000 e 100.000 elementi.
3. **Coda contro array.** Implementa una coda con un array e con un indice di testa e confronta il costo di 50.000 accodamenti e svuotamenti.
4. **Insieme e conteggio.** Scrivi una funzione che conta le occorrenze di parole in un testo e restituisci le prime dieci per frequenza; spiega perché l'ordinamento finale non cambia la classe complessiva.
5. **Cache per chiave.** Introduci una cache verso una funzione costosa con `Map`, con limite di dimensione e politica di rimozione semplice; verifica con un test il numero di esecuzioni reali.
6. **Documenta le ipotesi.** Nella documentazione del tuo progetto locale aggiungi, accanto alla struttura scelta, una tabella con operazioni, ipotesi sui dati e come verificare che l'ipotesi regga.

<details><summary>Soluzione</summary>

**Esercizio 1.** La colonna più utile non è "quante operazioni", ma "quale operazione cresce con l'input". Una collezione scandita per ogni richiesta è candidata all'uso di un insieme o di una mappa.

**Esercizio 2.** La versione con `Set` è lineare nell'ordine; quella con verifica di appartenenza su un array è quadratica. Il confronto va fatto senza includere l'allocazione della stampa dei risultati, che domina su liste piccole.

```js
function uniciConIndice(valori) {
  const visti = new Set();
  return valori.filter((valore) => !visti.has(valore) && visti.add(valore));
}
```

**Esercizio 3.** Rimuovere dalla testa di un array sposta tutti gli elementi e rende il costo quadratico; un indice di testa evita lo spostamento e lo rende lineare, al prezzo di memoria da liberare periodicamente.

**Esercizio 4.** Il conteggio costa lineare con una mappa; l'ordinamento delle sole coppie costa O(m log m) dove m è il numero di parole distinte, in genere molto minore degli elementi totali. La classe complessiva resta dominata dal passaggio di conteggio quando il testo è lungo.

**Esercizio 5.** La cache va testata su hit e miss: il test che conta le esecuzioni reali della funzione costosa verifica che la politica di rimozione mantenga la dimensione entro il limite.

```js
function memo(fn, limite = 100) {
  const cache = new Map();
  return (chiave) => {
    if (cache.has(chiave)) return cache.get(chiave);
    const valore = fn(chiave);
    if (cache.size >= limite) cache.delete(cache.keys().next().value);
    cache.set(chiave, valore);
    return valore;
  };
}
```

**Esercizio 6.** Le ipotesi scritte rendono la struttura una decisione e non un'abitudine. Per esempio: "insiemi usati perché le chiavi sono identificativi con distribuzione uniforme; verificare con la percentuale di collisioni nei log".

</details>

## Errori comuni

- **Scegliere sul caso migliore**: misurare solo inserimenti in coda su un array dice poco se la produzione inserisce anche in mezzo.
- **Usare una lista collegata per la ricerca**: senza indice ogni ricerca è lineare, e il vantaggio dell'inserimento non compensa.
- **Confondere ordine e accesso per chiave**: mantenere una lista ordinata per ricerca non la rende efficiente per inserimenti frequenti.
- **Benchmark troppo piccoli**: con cento elementi le costanti dominano e la struttura sbagliata può sembrare superiore; usa l'ordine di grandezza reale.

## In sintesi

Ogni struttura è un contratto con costi diversi per operazione, e la scelta dipende dal mix reale. Mappe e insiemi rendono la ricerca mediamente costante, gli alberi mantengono l'ordine a costo logaritmico. L'ordine non implica efficienza negli inserimenti. Le decisioni vanno documentate con ipotesi e verificate con benchmark della giusta dimensione.

## Fonti

- [Java – Java Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)
- [MDN – Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN – Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [Python – Data Structures](https://docs.python.org/3/tutorial/datastructures.html)
