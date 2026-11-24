Ordinare e cercare sono le due operazioni che tornano più spesso quando i dati crescono: un elenco di clienti ordinato per cognome, una ricerca in un catalogo, un controllo di appartenenza in una lista di esclusioni. La scelta dell'algoritmo e della struttura cambia il comportamento da "istantaneo" a "dieci secondi" senza che il codice sembri diverso. In questa lezione confronti gli ordinamenti per confronti, i metodi di ricerca e le trappole che rendono inutile una struttura efficiente.

## Obiettivi

- Confrontare gli algoritmi di ordinamento principali per complessità e stabilità.
- Scegliere la ricerca lineare o binaria in base all'ordine e alla frequenza delle operazioni.
- Riconoscere perché la stabilità e il comparatore contano nei risultati reali.
- Collegare ordinamento e ricerca in una pipeline coerente, evitando lavori duplicati.

## Ordinare: dalla quadratica al confronto

Gli algoritmi per confronti si dividono in due famiglie. Quelli semplici, come l'inserimento e la selezione, costano O(n²) nel caso peggiore ma hanno costanti piccole e funzionano bene su liste piccole o quasi ordinate. Quelli efficienti, come il merge sort e il quick sort, scendono a O(n log n); il primo è stabile e prevedibile, il secondo in genere è più veloce in memoria cache ma ha caso peggiore quadratico se il pivot è scelto male.

| Algoritmo | Caso peggiore | Stabile | Note pratiche |
| --- | --- | --- | --- |
| Inserimento | O(n²) | sì | ottimo su liste piccole o quasi ordinate |
| Selezione | O(n²) | no | pochi scambi, sempre quadratico |
| Merge sort | O(n log n) | sì | richiede spazio ausiliario lineare |
| Quick sort | O(n²) teorico, O(n log n) tipico | no | buona località, attenzione al pivot |
| Ordinamento per confronti | limite O(n log n) | - | nessun algoritmo generico può fare meglio |

La stabilità significa che due elementi uguali mantengono l'ordine relativo di partenza. È una proprietà che conta quando si ordina due volte: prima per data, poi per categoria. Con un ordinamento instabile il secondo passaggio può mescolare le date all'interno della stessa categoria, con un risultato sorprendente ma corretto rispetto al contratto dell'algoritmo.

Il comparatore è parte dell'algoritmo. In JavaScript, ad esempio, l'ordinamento predefinito confronta le stringhe: numeri come 10 e 9 finiscono in ordine alfabetico. Anche un comparatore che restituisce un booleano è un errore: deve restituire un numero negativo, zero o positivo, e i valori devono essere coerenti, altrimenti il risultato dipende dall'implementazione.

```js
const numeri = [10, 9, 1, 100];

// ordinamento predefinito: confronto come stringhe
console.log([...numeri].sort()); // [1, 10, 100, 9]

// comparatore numerico
console.log([...numeri].sort((a, b) => a - b)); // [1, 9, 10, 100]
```

## Cercare: lineare contro binaria

La ricerca lineare esamina gli elementi uno per uno, costa O(n) e funziona su dati in qualunque ordine. La ricerca binaria richiede dati ordinati, divide lo spazio a ogni confronto e costa O(log n): su un milione di elementi sono circa venti confronti. Il costo dell'ordinamento iniziale è O(n log n), quindi la ricerca binaria conviene quando le ricerche sono molteplici rispetto alla dimensione dei dati; se si cerca una sola volta, l'ordinamento è più caro della scansione.

| Operazione | Dati non ordinati | Dati ordinati |
| --- | --- | --- |
| Ricerca singola | O(n) | O(log n) |
| Ordinamento iniziale | O(n log n) | nessuno |
| Molte ricerche | O(k·n) | O(n log n + k·log n) |
| Inserimenti frequenti | O(1) in coda | costo di mantenere l'ordine |

La ricerca binaria ha una trappola classica: il calcolo dell'indice centrale. Se si scrive `(basso + alto) / 2` con interi limitati, può esserci overflow su collezioni enormi; la forma robusta è `basso + (alto - basso) / 2`. Un'altra trappola è l'aggiornamento degli estremi, che deve escludere l'elemento appena confrontato per garantire la terminazione.

```python
from bisect import bisect_left


def indice(valori: list[int], obiettivo: int) -> int:
    posizione = bisect_left(valori, obiettivo)
    if posizione < len(valori) and valori[posizione] == obiettivo:
        return posizione
    return -1
```

Per dati già ordinati, la libreria standard offre funzioni specializzate che implementano la ricerca binaria senza reinventarla: in Python `bisect`, in Java `Arrays.binarySearch` e `Collections.binarySearch`. Ogni libreria documenta il punto di inserimento restituito quando il valore non c'è, un dettaglio che spesso viene letto male.

## Strutture e operazioni insieme

Un ordinamento efficiente e una ricerca veloce non servono a nulla se la struttura a valle riordina per ogni inserimento o se la ricerca avviene su una lista collegata senza indici. La regola pratica è allineare struttura e accesso: se servono molti lookup per chiave, una mappa o un insieme che implementano l'accesso per chiave sono più adatti della ricerca binaria; se serve la scansione ordinata, un albero bilanciato o una lista ordinata mantenuta con inserimenti a costo logaritmico è la risposta.

La classificazione dei dati è un caso in cui si dimentica l'ordinamento: una ricerca su stringhe con caratteri accentati produce ordini diversi a seconda della lingua se non si usa un criterio locale esplicito. In JavaScript il comparatore locale risolve questa esigenza, ma ha un costo per confronto sensibilmente più alto di un confronto semplice, quindi va applicato a volumi contenuti o a colonne selezionate.

Infine, l'ordinamento e la ricerca si combinano spesso in una pipeline che può ripetere lavoro: un servizio che ordina i risultati a ogni richiesta, anche quando la chiave di ordinamento non è cambiata, sposta un costo O(n log n) sotto un carico O(n). La soluzione architetturale, come una vista ordinata o una cache per chiave, vale più di qualsiasi micro ottimizzazione del comparatore.

## Errori comuni

- **Ordinare numeri come stringhe**: senza comparatore esplicito, molti linguaggi confrontano la rappresentazione testuale, e 10 viene prima di 9.
- **Ricerca binaria su dati non ordinati**: il risultato diventa casualmente sbagliato, e il bug passa i test perché su alcune liste sembra funzionare.
- **Ordinare a ogni richiesta**: se i risultati sono sempre gli stessi, il costo si ripete inutilmente; serve una vista ordinata o una cache.
- **Ignorare costo della libreria standard**: scrivere un ordinamento "personalizzato" senza motivo aumenta la superficie di bug e perde ottimizzazioni della piattaforma.

## In sintesi

Gli ordinamenti efficienti costano O(n log n) e il confronto per confronti non può scendere sotto quel limite. La stabilità e il comparatore determinano i risultati corretti, non solo la velocità. La ricerca binaria conviene solo su dati ordinati e con molte ricerche; il suo costo iniziale va sempre contato. Allineare struttura e tipo di operazione è la scelta più utile, più delle ottimizzazioni locali.

## Fonti

- [MDN – Array.prototype.sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
- [Python – bisect](https://docs.python.org/3/library/bisect.html)
- [Java – Arrays](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html)
- [MDN – Intl.Collator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator)
