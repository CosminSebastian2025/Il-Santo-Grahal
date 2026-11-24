Ottimizzare è un processo, non una tecnica: si misura, si isola un collo di bottiglia, si cambia una cosa per volta, si rimisura. La parte difficile non è trovare il miglioramento, ma dimostrare che è un miglioramento e che non ha rotto altro. In questa lezione metti insieme profiling, complessità e memoria in un laboratorio di sei esercizi, con caching, caricamento differito e misure pratiche sul browser.

## Obiettivi

- Condurre un ciclo di ottimizzazione con ipotesi, modifica e verifica.
- Applicare caching lato client e lato server rispettando la coerenza dei dati.
- Ridurre il lavoro del browser con caricamento differito e dimensioni delle risorse.
- Misurare l'impatto delle modifiche con metriche osservative e ripetibili.

## Il metodo in quattro passi

Un ciclo di ottimizzazione efficace parte da un'ipotesi scritta. "Se riduco il numero di richieste ripetute verso il servizio, il tempo di interazione deve scendere" è un'ipotesi verificabile. La modifica deve essere isolata: un commit con un solo cambiamento rende attribuibile l'effetto. La verifica deve usare la stessa procedura della linea di base, altrimenti stai confrontando cose diverse.

Tra un passo e l'altro serve una nota su cosa hai osservato. Le note brevi valgono più di un grafico che nessuno interpreta: due righe che dicono "la coda di richieste duplica le chiamate; cache da 60 secondi; p95 scesa del 40 per cento" raccontano la storia. Se il risultato non migliora, l'ipotesi era sbagliata, e anche questo va annotato: risparmi tempo a chi verrà dopo.

Il metodo funziona quando i passi sono piccoli. Modifiche grandi producono risultati ambigui: un miglioramento e due regressioni si compensano, e non sai quale parte ha funzionato. La disciplina di rimuovere un'ottimizzazione inutile è importante quanto aggiungerla.

## Cache, coerenza e misura

La cache più semplice è lato client, con intestazioni che dichiarano la validità di una risorsa. Una risposta statica con un identificativo nella URL può essere conservata a lungo perché il contenuto cambia solo quando cambia l'identificativo. Una risposta dell'applicazione dipendente dalla sessione non può avere la stessa politica. La regola è separare le risorse immutabili da quelle dinamiche, invece di applicare una durata unica a tutto.

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
ETag: "v17"
Vary: Accept-Encoding
```

L'intestazione `Vary` è la parte trascurata: dichiara su quali richieste la risposta cambia, per esempio per codifica o per lingua. Senza `Vary` corretto una cache può restituire a qualcun altro la variante sbagliata, e il costo di un errore di coerenza supera di gran lunga il guadagno di una cache. Un'altra strategia è la rilevazione di validità con `ETag`, che permette alla cache di richiedere conferma evitando di riscaricare il contenuto invariato.

Lato server, la cache riduce il ricalcolo, ma richiede una politica di scadenza o di invalida rilascio. Misura sempre l'efficacia: la percentuale di richieste servite dalla cache è più informativa del tempo medio. Se è bassa, la cache aggiunge complessità senza benefici e conviene rimuoverla.

## Il lavoro del browser

Sul frontend le ottimizzazioni riguardano tre categorie: meno byte, meno lavoro eseguito, meno lavoro atteso. Meno byte significa compressione, immagini dimensionate e formati adatti. Meno lavoro eseguito significa codice più snello e meno script che bloccano il parsing. Meno lavoro atteso significa spostare ciò che non serve subito: le immagini fuori schermo con attributi nativi di caricamento differito, gli script non critici con attributi di caricamento asincrono o differito.

```html
<!-- immagine fuori schermo caricata quando serve -->
<img src="/hero.webp" alt="Panorama" width="1200" height="600"
     loading="lazy" decoding="async">

<!-- script non critico che non blocca il parsing -->
<script src="/app.js" defer></script>
```

Le metriche si collegano a queste categorie: i tempi di caricamento misurano quanti byte arrivano e in che ordine, la reattività misura quanto lavoro c'è sulla thread principale. Una tabella di dimensioni del DOM aiuta a non peggiorare la reattività: nodi inutili e listener ridondanti costano anche quando non fai nulla.

La pressione sul layout merita una nota: leggere dimensioni e scrivere stili in sequenza costringe il browser a ricalcolare. Raggruppare le letture prima delle scritture è un'ottimizzazione che non cambia il risultato per l'utente ma riduce il lavoro per fotogramma. È utile quando le misurazioni mostrano tempo nel rendering di script, non prima.

## Esercizi

1. **Linea di base.** Prendi una pagina tua, definisci una metrica ripetibile e registra cinque esecuzioni con mediana e dispersione.
2. **Ciclo di ottimizzazione.** Applica una modifica isolata (una sola), rimisura e scrivi due righe di conclusioni. Ripeti con una modifica diversa.
3. **Cache e coerenza.** Classifica le risorse della pagina in immutabili e dinamiche e scrivi le intestazioni adatte, includendo `Vary` dove serve.
4. **Caricamento differito.** Aggiungi il caricamento differito a due immagini fuori schermo e un attributo di differimento a uno script non critico, poi confronta l'ordine di caricamento con l'elenco delle richieste.
5. **Spread per le dimensioni.** Introduci una newsletter o un sistema di commenti a pagina componenti da più file e confronta il numero di richieste del caso precedente.
6. **Reattività.** Misura la reattività su una pagina con un'azione utente costosa; sposta parte del lavoro fuori dalla thread principale o riduci il lavoro per fotogramma e confronta.

<details><summary>Soluzione</summary>

**Esercizio 1.** Una metrica ripetibile contiene input, procedura, ambiente e numero di ripetizioni. Se la dispersione è alta, prima di procedere riduci il rumore: chiudi processi concorrenti, ripeti più volte, confronta mediane e non massimi.

**Esercizio 2.** Un'ipotesi scritta e una modifica isolata rendono l'effetto attribuibile. Se il risultato non migliora, annota che l'ipotesi era sbagliata: è un dato utile per le prossime decisioni.

**Esercizio 3.** Gli asset con hash nel nome sono immutabili e possono avere durata lunga; le pagine dipendenti dalla sessione no. `Vary` deve dichiarare le dimensioni che cambiano la risposta, come `Accept-Encoding`.

```http
Cache-Control: no-store
Vary: Cookie
```

**Esercizio 4.** Il controllo è nell'elenco delle richieste: le immagini fuori schermo non devono partire all'inizio e gli script differiti non devono bloccare il parsing. Annota l'effetto sulle metriche di caricamento.

**Esercizio 5.** Il criterio è il costo per visitatore: caricare un widget da più file, per esempio uno script di controllo e un modulo nativo aggiuntivo, può essere più costoso di una pagina unica, e non tutte le piattaforme o gli utenti hanno accesso alle stesse integrazioni. Misura il numero di richieste e i byte trasferiti prima di concludere.

**Esercizio 6.** Se l'hardware è a risparmio energetico, i valori possono variare a frequenza diversa; la soluzione è ripetere in finestre di misura brevi e più ripetizioni, riportando la mediana.

</details>

## Errori comuni

- **Ottimizzare senza linea di base**: senza un numero di partenza non puoi dimostrare il miglioramento né accorgerti di una regressione.
- **Cambiare più cose insieme**: limitare a una modifica per passo mantiene attribuibile l'effetto e rende possibile rimuovere ciò che non serve.
- **Cache senza coerenza**: una cache che restituisce contenuti obsoleti o varianti sbagliate danneggia l'utente più di un tempo di caricamento alto.
- **Fidarsi di un numero isolato**: misure su una sola esecuzione con dispersione alta non permettono conclusioni; serve una procedura ripetibile.

## In sintesi

Ottimizzare è un ciclo di ipotesi, modifica isolata, misura e nota. La cache riduce lavoro ma richiede coerenza e una verifica dell'efficacia. Sul frontend conta meno byte, meno lavoro e meno lavoro atteso. Misure ripetibili e annotate sono il collante di tutto il processo.

## Fonti

- [web.dev – Core Web Vitals](https://web.dev/articles/vitals)
- [web.dev – Optimize long tasks](https://web.dev/articles/optimize-long-tasks)
- [MDN – PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [RFC 9110 – HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
