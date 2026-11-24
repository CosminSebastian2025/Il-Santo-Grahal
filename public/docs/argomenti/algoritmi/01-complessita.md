La notazione O descrive come cresce il costo di un algoritmo al crescere della dimensione dell'input, ignorando costanti e dettagli di implementazione. Permette di confrontare due soluzioni senza eseguirle su un milione di elementi e di prevedere dove arriverà il primo collo di bottiglia. In questa lezione stimi la complessità leggendo il codice e la colleghi alle misure reali.

## Obiettivi

- Leggere la notazione O, Omega e Theta su funzioni di costo comuni.
- Stimare la complessità di cicli, cicli annidati e ricorsioni.
- Distinguere caso peggiore, caso medio e ammortizzato.
- Evitare gli errori di interpretazione più frequenti, come sommare complessità e ignorare il dominio dell'input.

## Che cosa misura la notazione

La notazione O descrive un limite superiore: oltre una soglia, il costo reale non supera quella funzione a meno di un fattore costante. Omega descrive un limite inferiore, Theta indica che i due coincidono. Nella pratica si usa "O(n)" come abbreviazione di "cresce linearmente", anche quando il limite stretto sarebbe Theta.

Il modello misura il costo dominante, non i secondi: in un ciclo su memoria contigua il traffico verso la RAM può pesare più del numero di iterazioni. Resta utile perché la forma della curva determina se l'applicazione reggerà il doppio del traffico.

| Classe | Nome comune | Esempio tipico |
| --- | --- | --- |
| O(1) | costante | accesso a un array per indice, lookup in una mappa |
| O(log n) | logaritmica | ricerca binaria, albero bilanciato |
| O(n) | lineare | scansione di una lista, somma dei valori |
| O(n log n) | quasi lineare | ordinamenti efficienti per confronti |
| O(n²) | quadratica | cicli annidati su tutti i dati |

Le classi più alte emergono in produzione: un quadratico su mille elementi è invisibile, su un milione è interminabile.

## Stimare leggendo il codice

La regola pratica: un ciclo singolo su n elementi costa O(n); cicli annidati su insiemi indipendenti costano il prodotto delle dimensioni; un ciclo che dimezza lo spazio costa O(log n). La ricerca dentro un ciclo dipende dalla struttura: un array si scansiona, una mappa si interroga in tempo mediamente costante.

```java
// O(n): un solo passaggio
int somma(int[] valori) {
  int totale = 0;
  for (int valore : valori) totale += valore;
  return totale;
}

// O(n^2): ogni elemento confrontato con tutti gli altri
boolean haDuplicati(int[] valori) {
  for (int i = 0; i < valori.length; i++)
    for (int j = i + 1; j < valori.length; j++)
      if (valori[i] == valori[j]) return true;
  return false;
}
```

Nel secondo esempio l'indice interno parte da `i + 1`: i confronti sono circa n²/2, ancora O(n²), perché dimezzare le costanti non cambia la classe. Il passaggio che cambia davvero le cose è sostituire la ricerca interna con un insieme, riducendo la funzione da quadratica a lineare.

Le ricorsioni si leggono con relazioni di ricorrenza: dividere l'input in due e combinare i risultati in modo lineare costa O(n log n); dividere e fare un solo confronto costa O(log n). Se ogni chiamata crea nuove strutture, il costo per chiamata non è costante e la classe peggiora.

## Caso peggiore, medio e ammortizzato

La notazione non dice da sola quale input si considera. La ricerca binaria costa O(log n) nel caso peggiore, ma richiede dati ordinati, e l'ordinamento costa di più: dimenticarlo è un errore classico nella valutazione di un progetto completo.

Il caso medio richiede un'ipotesi sulla distribuzione: con input uniformi una ricerca lineare esamina metà degli elementi, con input sbilanciati la media si avvicina al caso peggiore. La media non è una promessa, va documentata con l'ipotesi che la sostiene.

L'analisi ammortizzata spalma su una sequenza di operazioni il costo di quelle rare e pesanti. È il caso dell'array dinamico: quasi tutte le aggiunte costano O(1) e la duplicazione della capacità avviene raramente, così il costo ammortizzato per aggiunta resta O(1).

Un aspetto spesso sottovalutato è il costo di memoria: due algoritmi con la stessa classe temporale possono avere spazio ausiliario molto diverso, per esempio una copia intera dei dati o una struttura di supporto lineare. Lo spazio si valuta con lo stesso linguaggio della notazione O, riferito agli elementi aggiuntivi in memoria.

## Dal modello alla macchina

La notazione ignora la cache: un accesso sequenziale in un array è spesso più veloce di uno sparso in una struttura collegata, a parità di operazioni nel modello. Un ciclo che sembra lineare può essere dominato dal costo delle allocazioni o della serializzazione, che crescono anch'esse con l'input ma con costanti molto più alte.

La regola operativa è: prima la forma, poi la misura. Classi diverse premiano sempre quella migliore quando l'input cresce; a parità di classe il confronto richiede profili reali sul dominio reale, con dati della stessa forma di quelli in produzione. Un benchmark su input sintetici ordinati, per esempio, può premiare una struttura che nella realtà è penalizzata da distribuzioni sbilanciate.

## Errori comuni

- **Sommare le classi**: due cicli consecutivi su n costano O(n), non O(n²); il massimo vince quando le fasi sono sequenziali.
- **Fermarsi al confronto di base**: dire che un array access è O(1) è vero, ma una ricerca in un array è O(n); la classe va riferita all'operazione che interessa.
- **Assumere una media senza dichiararla**: "in media va bene" è una frase vuota se non dici rispetto a quale distribuzione di input.
- **Ignorare i costi nascosti**: allocazioni, copie, ordinamenti impliciti e serializzazioni cambiano la classe di un percorso che sembra lineare nel codice dell'applicazione.

## In sintesi

La notazione O descrive la forma della crescita del costo, non i secondi, e si legge dal codice con poche regole. Caso peggiore, medio e ammortizzato rispondono a domande diverse e vanno dichiarati. A parità di classe contano cache e costanti, quindi dopo l'analisi arriva sempre la misura.

## Fonti

- [Java – Java Collections Framework](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html)
- [MDN – Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [Python – Data Structures](https://docs.python.org/3/tutorial/datastructures.html)
