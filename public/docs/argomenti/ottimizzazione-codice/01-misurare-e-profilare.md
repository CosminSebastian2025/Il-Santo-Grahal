Ottimizzare senza misurare è un modo elegante per introdurre bug e complessità senza migliorare nulla. Il profilo, invece, risponde a una domanda diversa da quella che sembra: non "quale funzione è lenta" ma "dove il programma passa il tempo e quali parti di quel tempo sono sotto il nostro controllo". In questa lezione impari a costruire una misura ripetibile, a leggere un profilo e a distinguere rumore da segnali.

## Obiettivi

- Definire una linea di base ripetibile prima di qualsiasi modifica.
- Usare timer ad alta risoluzione e strumenti di profiling del proprio ambiente.
- Interpretare un profilo per funzione e un grafico a fiamma.
- Riconoscere le distorsioni dei benchmark e i costi del misurare.

## Una linea di base prima della modifica

La prima attività non è aprire uno strumento di profiling: è scrivere che cosa si vuole migliorare e con quale metrica. "Il caricamento è lento" non è una metrica. "La pagina è interattiva dopo 4,2 secondi sul mio dispositivo con rete simulata" lo è, perché è osservabile e ripetibile.

Un buon setup di misura contiene quattro elementi: un input rappresentativo, una procedura fissa di esecuzione, un dispositivo o un ambiente noto e un margine di variabilità accettato. Se la stessa esecuzione ripetuta produce valori che si discostano del trenta per cento, non hai una linea di base, hai rumore. Prima di confrontare versioni, riduci la variabilità con più ripetizioni e con un ambiente stabile.

Misurare richiede anche cautela: ogni strumento aggiunge costo. Un profilo dettagliato può rallentare il programma, e una misura in sviluppo con minificazione assente non rappresenta la produzione. La domanda corretta è sempre "questo numero serve a prendere quale decisione?", e la risposta orienta la scelta dello strumento.

## Cronometri e profili

Per un modulo isolato, un cronometro ad alta risoluzione risponde bene. In JavaScript `performance.now()` restituisce un tempo monotono con risoluzione sub-millisecondo, e gli strumenti del browser estendono la stessa API con marcatori e misure. In Python i moduli `timeit` e `cProfile` coprono i due casi: micro-misura di espressioni e profilo statistico di un programma.

```js
const inizio = performance.now();
for (let i = 0; i < iterazioni; i += 1) funzioneDaMisurare(dati);
const durata = performance.now() - inizio;
console.log(`${(durata / iterazioni).toFixed(3)} ms per chiamata`);
```

Un cronometro attorno a un ciclo misura il ciclo, non la funzione, e include il costo del loop e delle allocazioni fatte dentro. Per confrontare due varianti conviene isolare ciascuna in una misura separata e ripetere più volte, riportando mediana e dispersione anziché una singola esecuzione.

```python
import timeit

tempo = timeit.repeat(
    "somma_rapida(dati)",
    globals={"somma_rapida": somma_rapida, "dati": dati},
    number=1000,
    repeat=5,
)
print(min(tempo), sorted(tempo))
```

Il profilo invece raccoglie il tempo per funzione lungo un'esecuzione reale. In Java `jcmd` e i profiler del JDK mostrano dove si concentrano i campioni; in Python `cProfile` restituisce conteggi e tempi cumulativi; nel browser il pannello delle prestazioni registra attività, scripting e rendering. Lo strumento cambia, il principio no: si cerca dove si concentra il tempo, non la funzione scritta per ultima.

## Leggere un profilo senza farsi ingannare

Un profilo per funzione è un elenco di tempi cumulativi, e i tempi cumulativi includono le chiamate discendenti. Un metodo `main` è sempre in cima e non è il colpevole; la funzione interessante è quella che combina tempo proprio alto e molte chiamate. Per questo i grafici a fiamma sono più utili: la larghezza di un frame rappresenta il tempo, l'altezza la profondità della pila, e i frame larghi senza figli larghi indicano lavoro proprio.

Tre distorsioni da conoscere. La prima è il campionamento: un profiler statistico osserva la pila a intervalli e può perdere funzioni brevissime ma molto frequenti, che emergono solo con più campioni. La seconda è l'overhead: funzioni di tracciamento e strumentazione possono alterare il panorama, premiando chi fa meno chiamate invece di chi fa meno lavoro. La terza è l'ambiente: una macchina con carico di sottofondo, un profilo energetico o una CPU a frequenza variabile cambiano i numeri tra due sessioni identiche.

Infine, la misura non dice perché. Un picco di allocazione può essere sintomo di un algoritmo inefficiente o di un uso scorretto di una libreria; il profilo indica dove guardare, la lettura del codice dice cosa correggere.

## Misure nel tempo

Una linea di base serve se viene ripetuta. Misure automatiche in pipeline, con la stessa procedura e un margine di tolleranza, intercettano regressioni prima della produzione. Un grafico nel tempo è più informativo di una soglia: aiuta a vedere quando una regressione è iniziata e con quale modifica. Le metriche percepite dall'utente, come i tempi di caricamento e la reattività, vanno affiancate alle misure tecniche, perché un'ottimizzazione può migliorare un numero e peggiorare l'esperienza.

## Errori comuni

- **Misurare una sola esecuzione**: il primo giro include riscaldamento, cache fredde e compilazione; servono ripetizioni e una statistica robusta.
- **Benchmark in sviluppo senza minificazione**: il codice che esegui in locale può essere molto diverso per forma e dimensioni da quello in produzione.
- **Ottimizzare la funzione più grande del profilo**: i tempi cumulativi includono i discendenti; la funzione da correggere è quella con lavoro proprio più alto.
- **Confrontare senza controllare l'ambiente**: frequenza della CPU, carico di sottofondo e versione dello strumento devono restare fissi tra due misure.

## In sintesi

La misura parte da una domanda e da una linea di base ripetibile, non dagli strumenti. Cronometri per moduli isolati, profiler per percorsi completi, grafici per il tempo aggregato. Ogni profilo ha overhead e distorsioni che vanno dichiarati. Una misura ripetuta in pipeline rende visibili le regressioni, mentre un grafico nel tempo vale più di una soglia.

## Fonti

- [MDN – Performance.now()](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [web.dev – Core Web Vitals](https://web.dev/articles/vitals)
- [Brendan Gregg – Flame Graphs](https://www.brendangregg.com/flamegraphs.html)
- [Python – timeit](https://docs.python.org/3/library/timeit.html)
