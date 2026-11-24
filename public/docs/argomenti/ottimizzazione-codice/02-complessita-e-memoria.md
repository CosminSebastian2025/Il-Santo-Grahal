Tempo e memoria sono due risorse legate: spesso un programma impiega più tempo proprio perché tocca memoria in modo inefficiente, e a volte usa più memoria perché risparmia ricalcoli. Capire questa relazione trasforma le ottimizzazioni da tentativi a decisioni. In questa lezione vedi come la complessità si riflette su CPU e memoria, quanto pesa la località della cache e quando scambiare spazio per tempo conviene davvero.

## Obiettivi

- Distinguere complessità temporale e spaziale, compreso lo spazio ausiliario.
- Riconoscere l'impatto della località e del traffico di memoria.
- Valutare i costi di allocazione, copia e garbage collection.
- Decidere in modo consapevole gli scambi tra memoria e tempo, come cache e precalcolo.

## Due forme di costo

La complessità temporale descrive come cresce il lavoro, quella spaziale come cresce la memoria aggiuntiva. Lo spazio ausiliario è la differenza più interessante: due algoritmi con lo stesso O(n log n) possono differire per memoria, uno ordinando in loco e l'altro creando copie complete. Su un servizio che gestisce richieste concorrenti, lo spazio conta quanto il tempo, perché ogni copia grande riduce il numero di richieste che stanno in memoria contemporaneamente.

Un algoritmo in loco tende ad avere un rilascio prevedibile: non amplia il picco di memoria e non crea pressione sul garbage collector. Un algoritmo che alloca molto costruisce strutture che il sistema deve poi ripulire, e la pulizia costa tempo, spesso proprio nel momento di picco del traffico. La misura di memoria deve quindi includere il picco e non solo il consumo medio.

## Località, cache e traffico

I processori moderni non leggono la memoria principale un elemento alla volta: caricano blocchi contigui, e le strutture che si visitano in ordine sequenziale sfruttano meglio la cache. Un array di numeri elaborato in ordine è molto più veloce di una lista collegata con la stessa quantità di dati, perché ogni nodo della lista richiede un accesso sparso. Il modello asintotico non vede questa differenza, e per questo due algoritmi con la stessa classe possono variare di un fattore significativo.

| Struttura | Accesso sequenziale | Accesso sparso |
| --- | --- | --- |
| Array | molto efficiente | efficiente per indice |
| Lista collegata | inefficiente | costo per nodo |
| Mappa hash | dipende dal ridimensionamento | costo per chiave |
| Albero | dipende dalla profondità | costo per livello |

La conseguenza pratica è preferire le strutture contigue quando i volumi sono grandi e le operazioni sono sequenziali. Il profiling mostra i tempi, ma una conoscenza del modello di memoria permette di prevedere dove arrivano i problemi prima di misurare. Attività come copiare, concatenare e ordinare in memoria si concentrano nel traffico di dati, non nella logica applicativa.

## Allocazione e raccolta

In linguaggi con raccolta automatica, allocare molto ha costi che non compaiono nel codice. Ogni oggetto creato aumenta il lavoro del collettore, e le pause diventano visibili con l'aumentare della memoria viva. Ridurre le allocazioni temporanee, riutilizzare buffer e preferire strutture che non copiano dati sono misure che migliorano sia tempo sia memoria.

Anche le stringhe meritano attenzione: un ciclo che concatena in linguaggi in cui le stringhe sono immutabili crea una nuova stringa per passo e rende la funzione quadratica anziché lineare. Le librerie standard offrono per questo costruttori dedicati, come `StringBuilder` in Java o l'accumulo in una lista e la giunzione finale in Python, che trasformano il costo da quadratico a lineare.

```java
// da evitare: crea una nuova stringa a ogni iterazione
String risultato = "";
for (String parte : parti) {
  risultato += parte;
}

// da preferire: buffer riutilizzato, costo lineare
StringBuilder accumulatore = new StringBuilder();
for (String parte : parti) {
  accumulatore.append(parte);
}
String testo = accumulatore.toString();
```

Per la memoria esiste anche il caso opposto: strutture che risparmiano spazio ma rendono più lento l'accesso. Una rappresentazione compatta con codici interi al posto di oggetti complessi riduce il consumo, ma richiede traduzioni; la scelta dipende dal volume e dalla frequenza di lettura.

## Scambiare memoria e tempo

La cache è lo scambio più comune: conservare un risultato costoso in memoria per evitare di ricalcolarlo. È conveniente quando il costo del ricalcolo supera il costo dello spazio e quando i risultati si richiedono più volte. Una cache senza limite è un modo per alleggerire il tempo e creare un problema di memoria; con limite richiede una politica di rimozione e una verifica del comportamento su miss.

Altri scambi sono il precalcolo di tabelle, l'indicizzazione di una collezione e l'uso di strutture ausiliarie come gli insiemi per evitare ricerche lineari. Ogni scambio deve essere dichiarato insieme all'ipotesi che lo rende conveniente, altrimenti diventa un'ottimizzazione che nessuno sa valutare. La domanda utile è sempre quanto spazio posso permettermi, per quanto tempo e con quale frequenza i dati sarebbero riletti.

Il costo del ricalcolo non è l'unica variabile: una cache introduce coerenza da gestire. Se la fonte dei dati cambia, la copia in memoria può diventare stantia, e l'ottimizzazione diventa un errore di correttezza. Le invalide esplicite o le scadenze brevi vanno progettate insieme alla cache, non aggiunte dopo.

## Errori comuni

- **Ottimizzare il tempo ignorando il picco**: una strategia con più memoria può peggiorare il throughput complessivo o provocare rallentamenti improvvisi quando la memoria si esaurisce.
- **Concatenare stringhe nei cicli**: la funzione sembra lineare ma è quadratica, e su testi medi diventa l'attività dominante; usa i buffer della libreria standard.
- **Cache senza limite o invalida**: guadagni un po' di tempo e introduci memoria senza controllo e risultati obsoleti.
- **Giudicare le strutture solo dall'analisi asintotica**: località e costanti decidono su volumi reali; serve una misura dopo la scelta.

## In sintesi

Tempo e memoria sono due dimensioni dello stesso costo, e lo spazio ausiliario è un vincolo reale nei servizi concorrenti. La località della cache spiega le differenze tra strutture con la stessa classe. Allocazioni e concatenazioni peggiorano entrambe le dimensioni. Cache e precalcolo sono scambi utili purché limitati, misurati e progettati insieme alla coerenza.

## Fonti

- [Brendan Gregg – The USE Method](https://www.brendangregg.com/usemethod.html)
- [Java – StringBuilder](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html)
- [Python – Data Structures](https://docs.python.org/3/tutorial/datastructures.html)
- [web.dev – Web Vitals](https://web.dev/articles/vitals)
