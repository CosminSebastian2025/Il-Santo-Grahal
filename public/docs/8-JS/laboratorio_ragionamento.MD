# Laboratorio di ragionamento: JavaScript

**Obiettivo:** allenare il passaggio dalla richiesta scritta in italiano al codice JavaScript, decidendo dati, passi, casi limite e correzioni senza copiare esempi.

### Perché serve un laboratorio

Sapere la sintassi significa riconoscere `map` e `filter` in un file già scritto. Sapere dove applicarli significa leggere "mi serve il totale delle spese della trasferta" e arrivare da soli a un array di oggetti, un filtro e una somma. Sono due competenze diverse: la prima si studia, la seconda si allena.

Chi ha imparato solo a memoria mostra tre sintomi tipici:

- copia gli esempi e li adatta per tentativi, cambiando i nomi delle variabili finché l'output non assomiglia a quello atteso;
- si blocca davanti a una richiesta nuova: conosce `filter` ma non sa dire se il problema chiede un filtro, una somma o entrambi;
- davanti a un errore non sa da dove partire: legge il messaggio, non riconosce il valore sospetto e riscrive il file da capo.

Il laboratorio allena il contrario: un metodo ripetibile che parte dalla richiesta, passa dai dati e arriva al codice verificabile. Lo stesso metodo vale per uno script da console, per una pagina che usa il DOM e per una chiamata di rete.

### Cinque contesti reali

**Prenotazioni di una palestra.** Lo usa il receptionist. I dati sono corsi, sale, orari, posti disponibili e prenotazioni con lo stato. Le azioni sono prenotare, annullare, spostare un posto e vedere chi arriva oggi. Se è fatto male, due persone ottengono lo stesso posto: il controllo è stato messo nell'interfaccia e non nel dato.

**Magazzino.** Lo usa chi carica e scarica merce. I dati sono articoli con codice, reparto, pezzi e scorta minima. Le azioni sono registrare un movimento, vedere i reparti sotto scorta, stampare un report. Se è fatto male, le giacenze diventano negative o i totali sommano stringhe: il report è inattendibile e nessuno lo usa più.

**Spese condivise.** Lo usa un gruppo di amici o di colleghi. I dati sono spese con importo, categoria, chi ha pagato e chi partecipa. Le azioni sono aggiungere una spesa, vedere il totale per categoria, sapere quanto deve versare ciascuno. Se è fatto male, il totale non torna per via di decimali o di importi letti come testo, e il gruppo torna al foglio di calcolo.

**Quiz.** Lo usa chi studia o chi insegna. I dati sono domande con risposte, indice corretto, risposte scelte e punteggio. Le azioni sono mescolare le domande, rispondere, calcolare il punteggio, salvare i risultati in `localStorage`. Se è fatto male, il punteggio include domande non ancora risposte o sparisce al refresh.

**Dashboard.** La usa chi deve decidere. I dati arrivano da più fonti: ordini, utenti, tempi di consegna. Le azioni sono filtrare per periodo, ordinare, leggere i totali. Se è fatto male, lo stesso numero è calcolato e salvato in due punti, e la testata mostra un totale che non corrisponde alla lista sottostante.

### Il metodo in sei passi

1. **Riformula la richiesta** con parole tue, senza termini tecnici. Cosa si guadagna: emergono subito le informazioni mancanti (quale periodo, quali categorie, chi vede il risultato).
2. **Elenca i dati** uno per uno, con nome e tipo. Cosa si guadagna: sai se ti serve un array, un oggetto o un valore singolo, e la struttura decide quali metodi userai.
3. **Disegna il flusso**: da dove entrano i dati, quale passaggio li trasforma, dove finiscono. Cosa si guadagna: separi lettura, calcolo e stampa, e puoi provare ogni pezzo da solo.
4. **Decidi che cosa è dato e che cosa è calcolato**: il totale si ricava, non si conserva. Cosa si guadagna: nessun valore duplicato da tenere allineato a mano.
5. **Scrivi il minimo**: solo il caso normale, con dati piccoli scritti nel file e `console.log` intermedi. Cosa si guadagna: un risultato verificabile in pochi secondi, prima di aggiungere rete, DOM e storage.
6. **Prova i casi limite**: lista vuota, campo mancante, maiuscole, rete assente. Cosa si guadagna: scopri le assunzioni nascoste prima dell'utente.

Se salti il passo 2, il passo 5 diventa un tentativo. Se salti il passo 6, il codice funziona solo con i dati che avevi in mente.

### Tre casi guidati

I tre casi usano lo stesso metodo su problemi di difficoltà crescente. Leggi la richiesta e prova a rispondere alle domande: solo dopo confronta con i passi e il codice.

#### Caso 1: filtro e totale di una lista di spese

**Richiesta:** "Abbiamo le spese della trasferta. Mi serve il totale della categoria che scelgo e l'elenco delle voci, con i centesimi."

**Domande da farsi**

- Quali campi compaiono in ogni spesa e quali sono sempre presenti?
- Il totale dipende da tutte le spese o solo da quelle filtrate?
- Che cosa mostro se non c'è nessuna spesa di quella categoria?
- Gli importi arrivano già come numeri o come testo?

**Dati:** un array di oggetti; ogni spesa ha `id`, `voce`, `categoria`, `importo` (numero). La categoria cercata è una stringa che sta fuori dall'array.

**Passi**

1. Filtro le spese con `filter`, confrontando `categoria` con `===`.
2. Sommo gli importi delle sole spese filtrate con `reduce` che parte da `0`.
3. Stampo il numero di voci, ogni voce con `toFixed(2)` e il totale.
4. Provo una categoria inesistente: deve uscire `0` e nessuna riga, non un errore.

**Codice**

```js
const spese = [
  { id: 1, voce: "Biglietto treno", categoria: "viaggio", importo: 32.5 },
  { id: 2, voce: "Pranzo", categoria: "cibo", importo: 14 },
  { id: 3, voce: "Taxi aeroporto", categoria: "viaggio", importo: 27.5 },
  { id: 4, voce: "Caffè", categoria: "cibo", importo: 2.2 },
  { id: 5, voce: "Hotel", categoria: "alloggio", importo: 96 },
];

const categoriaScelta = "viaggio";

const filtrate = spese.filter((s) => s.categoria === categoriaScelta);
const totale = filtrate.reduce((somma, s) => somma + s.importo, 0);

console.log(`Categoria: ${categoriaScelta}`);
console.log(`Voci: ${filtrate.length}`);
for (const s of filtrate) {
  console.log(`- ${s.voce}: ${s.importo.toFixed(2)} EUR`);
}
console.log(`Totale: ${totale.toFixed(2)} EUR`);
```

**Output**

```text
Categoria: viaggio
Voci: 2
- Biglietto treno: 32.50 EUR
- Taxi aeroporto: 27.50 EUR
Totale: 60.00 EUR
```

**Cosa cambia se...** la categoria arriva da un menu e vale `undefined`: il filtro restituisce un array vuoto, il totale è `0` e il programma non si rompe, ma l'utente legge "Voci: 0" senza capire se è un errore. La decisione è di prodotto: mostrare `Nessuna spesa per questa categoria`. Se invece un `importo` arrivasse come stringa `"14,50"`, la somma concatenerebbe testo e `totale.toFixed` fallirebbe con `TypeError: totale.toFixed is not a function`: il difetto non è nel `reduce`, è nel dato che entra.

#### Caso 2: report del magazzino con raggruppamento e ordinamento

**Richiesta:** "Per ogni reparto voglio i pezzi totali e quante referenze sono sotto scorta. In cima i reparti con più pezzi."

**Domande da farsi**

- Un reparto compare su più righe: come lo riduco a una riga sola?
- L'ordinamento è per nome o per quantità? E a parità di quantità?
- "Sotto scorta" significa minore o minore o uguale alla soglia?
- Dove finisce un articolo senza reparto?

**Dati:** un array di articoli con `codice`, `reparto`, `pezzi`, `scortaMinima`. Serve un secondo oggetto, costruito da noi, che accumuli per reparto.

**Passi**

1. `reduce` costruisce un oggetto con chiave il reparto e valore `{ pezzi, sottoScorta }`.
2. Per ogni articolo sommo i pezzi e incremento il contatore se `pezzi < scortaMinima`.
3. Converto l'oggetto in array con `Object.entries`, perché gli oggetti non si ordinano.
4. Ordino per pezzi decrescenti e, a parità, per nome con `localeCompare`.
5. Stampo una riga per reparto; l'avviso compare solo se il contatore è maggiore di zero.

**Codice**

```js
const articoli = [
  { codice: "A-01", reparto: "ferramenta", pezzi: 12, scortaMinima: 10 },
  { codice: "A-02", reparto: "elettrico", pezzi: 4, scortaMinima: 8 },
  { codice: "A-03", reparto: "ferramenta", pezzi: 30, scortaMinima: 15 },
  { codice: "A-04", reparto: "giardinaggio", pezzi: 7, scortaMinima: 7 },
  { codice: "A-05", reparto: "elettrico", pezzi: 9, scortaMinima: 5 },
];

const riepilogo = articoli.reduce((acc, a) => {
  const voce = acc[a.reparto] ?? { pezzi: 0, sottoScorta: 0 };
  voce.pezzi += a.pezzi;
  if (a.pezzi < a.scortaMinima) voce.sottoScorta += 1;
  acc[a.reparto] = voce;
  return acc;
}, {});

const righe = Object.entries(riepilogo)
  .map(([reparto, v]) => ({ reparto, ...v }))
  .sort((a, b) => b.pezzi - a.pezzi || a.reparto.localeCompare(b.reparto));

for (const r of righe) {
  const avviso = r.sottoScorta > 0 ? ` | ${r.sottoScorta} sotto scorta` : "";
  console.log(`${r.reparto}: ${r.pezzi} pezzi${avviso}`);
}
```

**Output**

```text
ferramenta: 42 pezzi
elettrico: 13 pezzi | 1 sotto scorta
giardinaggio: 7 pezzi
```

**Cosa cambia se...** un articolo ha `reparto: "Ferramenta"` con la maiuscola: nasce un secondo gruppo, perché il raggruppamento è sensibile alla forma del testo. Va normalizzato prima o corretto nei dati. Se i `pezzi` arrivassero come stringhe, `b.pezzi - a.pezzi` produrrebbe `NaN` e `sort` lascerebbe l'ordine di partenza senza segnalare nulla: un ordinamento che non ordina è uno degli errori più silenziosi. Infine `sort` modifica l'array su cui è chiamato: ordinare direttamente `articoli` cambierebbe i dati di partenza, e la seconda esecuzione partirebbe già ordinata.

#### Caso 3: ricerca asincrona degli iscritti

**Richiesta:** "In reception vorremmo cercare un iscritto per nome mentre scriviamo: un messaggio mentre carica, uno se non trova niente, uno se la rete non risponde."

**Domande da farsi**

- Quante situazioni diverse vede la persona davanti allo schermo?
- Quando parte la richiesta e quando è inutile partire?
- "Non ho trovato niente" è un errore o un risultato valido?
- Che cosa succede se la risposta arriva dopo che l'utente ha cambiato idea?

**Dati:** il termine cercato (stringa, può essere vuota o piena di spazi) e la lista degli iscritti che arriva dalla rete, con `id`, `name`, `email`.

**Passi**

1. Normalizzo il termine con `trim` e `toLowerCase`; se è troppo corto mi fermo prima di chiamare la rete.
2. Segnalo il caricamento, perché la rete non è istantanea.
3. `fetch` più `await`, controllo `risposta.ok`, poi `await risposta.json()`.
4. Filtro l'array per nome, confrontando testi già normalizzati.
5. Distinguo tre uscite: risultati, nessun risultato, errore nel `catch`.

**Codice**

```js
async function cercaIscritti(termine) {
  const pulito = termine.trim().toLowerCase();

  if (pulito.length < 2) {
    console.log("Scrivi almeno due lettere.");
    return;
  }

  console.log(`Caricamento per "${pulito}"...`);

  try {
    const risposta = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!risposta.ok) throw new Error(`Stato ${risposta.status}`);

    const iscritti = await risposta.json();
    const trovati = iscritti.filter((i) => i.name.toLowerCase().includes(pulito));

    if (trovati.length === 0) {
      console.log(`Nessun iscritto per "${pulito}".`);
      return;
    }

    console.log(`Trovati: ${trovati.length}`);
    trovati.forEach((i) => console.log(`- ${i.name}`));
  } catch (errore) {
    console.log(`Errore: ${errore.message}`);
  }
}

async function avvia() {
  await cercaIscritti("clem");
  await cercaIscritti("zzz");
  await cercaIscritti(" c ");
}

avvia();
```

**Output**

```text
Caricamento per "clem"...
Trovati: 2
- Clementine Bauch
- Clementina DuBuque
Caricamento per "zzz"...
Nessun iscritto per "zzz".
Scrivi almeno due lettere.
```

**Cosa cambia se...** il nome è scritto `CLEM`: funziona solo perché entrambi i lati sono in minuscolo. Togli `toLowerCase` dal nome e ottieni zero risultati, che sembra un problema di rete ed è invece un problema di confronto. Se sposti il messaggio di caricamento dopo `await`, l'utente vede una schermata ferma per tutta la durata della richiesta. Se dopo il messaggio di lista vuota togli il `return`, il codice prosegue e stampa anche `Trovati: 0`: due messaggi contraddittori per lo stesso stato. Se il server risponde `500`, `risposta.ok` è falso e il `throw` porta al `catch`; senza quel controllo, `json()` proverebbe a leggere una pagina di errore e l'utente vedrebbe un messaggio incomprensibile.

### Debug in cinque mosse

1. **Leggi il messaggio.** Dice il tipo di errore e la proprietà coinvolta: `undefined` e `null` non sono la stessa cosa.
2. **Individua la riga.** La console la indica; se lo stack è lungo, risali al primo file tuo.
3. **Chiediti quale valore può essere sbagliato.** Raramente la riga è scritta male: spesso il dato che arriva non è quello che credi.
4. **Riduci a un esempio minimo.** Tre elementi finti nello stesso file, senza rete e senza DOM: se l'errore resta, l'hai isolato.
5. **Correggi e verifica.** La correzione vale solo se il caso normale e i casi limite funzionano ancora.

**Errore 1: `TypeError: Cannot read properties of undefined (reading 'prezzo')`**

```js
const voci = spese.map((s) => {
  if (s.prezzo > 10) {
    return s;
  }
});

const totale = voci.reduce((somma, v) => somma + v.prezzo, 0);
```

`map` restituisce un array lungo quanto l'originale: per le spese sotto i 10 euro la funzione non restituisce nulla, quindi l'elemento diventa `undefined`. Nel `reduce` il secondo giro riceve `undefined` e chiedere `.prezzo` a `undefined` è impossibile. Il messaggio è preciso: è l'oggetto a essere `undefined`, non la proprietà.

La causa vera è che non stavi trasformando: stavi selezionando. Se l'array di partenza e quello di arrivo devono avere la stessa lunghezza, `map`; altrimenti quasi sempre `filter`.

```js
const voci = spese.filter((s) => s.prezzo > 10);
const totale = voci.reduce((somma, s) => somma + s.prezzo, 0);
```

**Errore 2: `NaN` in un totale**

```js
const totale = spese.reduce((somma, s) => somma + s.prezzo, 0);
console.log(totale.toFixed(2));
```

Output: `NaN`, senza alcun errore. `NaN` compare quando una somma incontra un valore che non è un numero: un prezzo assente, una stringa `"14,50"`, un campo letto da un input. Gli input del DOM restituiscono sempre testo e la virgola non è un separatore decimale valido per `Number`. `NaN` non si ferma: attraversa tutto il `reduce` e rovina il totale senza dire dove è nato.

```js
const prezzi = spese.map((s) => Number(String(s.prezzo).replace(",", ".")));
const nonValidi = prezzi.filter((n) => !Number.isFinite(n));

if (nonValidi.length > 0) {
  console.log(`Prezzi non validi: ${nonValidi.length}`);
} else {
  const totale = prezzi.reduce((somma, n) => somma + n, 0);
  console.log(`Totale: ${totale.toFixed(2)} EUR`);
}
```

Non si corregge il totale: si controlla il dato in ingresso. Un totale sbagliato è un sintomo, la malattia è più a monte.

**Errore 3: catena asincrona nell'ordine sbagliato**

```js
async function carica() {
  const risposta = await fetch("https://jsonplaceholder.typicode.com/users");
  const dati = risposta.json();
  const nomi = dati.filter((u) => u.name.startsWith("C"));
  console.log(nomi.length);
}
```

Messaggio: `TypeError: dati.filter is not a function`. `json()` restituisce una Promise: senza `await`, `dati` è una Promise e le Promise non hanno `filter`. Lo stesso difetto un passo prima è più subdolo: senza `await` su `fetch`, `risposta.ok` vale `undefined`, `!risposta.ok` è vero e il codice lancia `Stato undefined`.

La catena ha un ordine: `fetch` produce una Promise, `await` la apre, `json()` ne produce un'altra, il secondo `await` la apre. Ogni passaggio vuole il suo `await`.

```js
const risposta = await fetch("https://jsonplaceholder.typicode.com/users");
if (!risposta.ok) throw new Error(`Stato ${risposta.status}`);
const dati = await risposta.json();
const nomi = dati.filter((u) => u.name.startsWith("C"));
```

Quando il messaggio dice `... is not a function`, chiediti che tipo ha davvero quella variabile: `console.log(typeof dati)` avrebbe mostrato `object` per una Promise e ti avrebbe risparmiato mezz'ora.

### Esercizi di ragionamento

Otto esercizi senza scrivere codice, o con pochissimo. Per ognuno annota dati, passi e casi limite prima di leggere la soluzione.

1. **Spese di gruppo.** Ti viene chiesto quanto deve dare ogni persona per una cena pagata da una sola. Scrivi i dati e i passi, non il codice.
   Cosa osservare: se i dati non dicono chi ha partecipato, il problema non è il calcolo, è il modello.
2. **Il filtro nel posto giusto.** Hai 400 articoli e devi mostrare i 12 sotto scorta con il totale dei pezzi mancanti. Il filtro va prima della somma, dopo, o due volte?
   Cosa osservare: la somma richiede il dato già filtrato; filtrare due volte crea un doppione che si disallinea.
3. **Dato o calcolato.** In un quiz: punteggio, domanda corrente, risposte date, percentuale di risposte corrette. Quali sono dati e quali calcolati?
   Cosa osservare: la percentuale dipende da due valori; salvarla significa avere due verità.
4. **Codice fragile.** `spese.reduce((t, s) => t + s.importo, 0)` funziona con i dati di prova. Elenca tre situazioni in cui sbaglia.
   Cosa osservare: nessun controllo sul tipo, nessuna gestione di `undefined`, nessun messaggio per la lista vuota.
5. **Lista vuota.** La ricerca non trova risultati. Che messaggio mostri e in che cosa è diverso dall'errore di rete?
   Cosa osservare: "nessun risultato" è un esito normale, "errore" dice che il sistema non ha potuto rispondere.
6. **Ordine delle operazioni.** Hai spese da filtrare per mese, raggruppare per categoria e ordinare per totale. In che ordine esegui i tre passaggi?
   Cosa osservare: filtro per primo perché riduce il lavoro, raggruppamento prima dell'ordinamento, ordinamento su una copia.
7. **Persistenza.** Il punteggio di un quiz deve sopravvivere al refresh. Che cosa salvi in `localStorage`: domande, risposte, punteggio, o più di uno?
   Cosa osservare: `localStorage` salva solo testo e il punteggio è calcolato dalle risposte.
8. **Doppio clic.** Un utente clicca due volte su "Prenota". Che cosa deve succedere e quale informazione ti serve per impedirlo?
   Cosa osservare: serve uno stato "richiesta in corso" e un controllo sul dato, non solo un bottone disabilitato.

### Soluzioni guidate

1. Servono le spese (chi ha pagato, importo) e le persone coinvolte. Il passo è: totale, divisione per numero di partecipanti, sottrazione di quanto già versato. Se manca l'elenco dei partecipanti, va aggiunto al modello: un array di nomi per spesa.
2. Un filtro solo, all'inizio: `const sottoScorta = articoli.filter(...)`, poi `sottoScorta.reduce(...)`. Filtrare dopo la somma darebbe il totale di tutto il magazzino, non dei pezzi mancanti; filtrare due volte è codice che prima o poi cambia in un punto solo.
3. Dati: domanda corrente e risposte date (array di indici scelti). Calcolati: punteggio e percentuale, con una guardia sullo zero per evitare la divisione per zero. Salvare il punteggio creerebbe due verità da riconciliare.
4. Sbaglia con un `importo` stringa, che concatena invece di sommare; con un `importo` mancante, che produce `NaN`; con un array vuoto, dove `0` è corretto ma va comunicato come "nessuna spesa". La correzione è normalizzare il dato prima e gestire la lista vuota a monte.
5. Per la lista vuota: "Nessun risultato per «termine»", con il termine visibile, così la persona può correggerlo. Per l'errore: "Non riesco a contattare l'archivio, riprova". Il primo invita a cambiare la ricerca, il secondo segnala un problema esterno.
6. Filtro per mese, raggruppamento per categoria, somma dentro ogni gruppo, ordinamento dei gruppi. L'ordinamento va sull'array risultante, mai su quello di partenza, perché `sort` lavora sul posto.
7. Salvo le risposte date (id della domanda e indice scelto) in JSON e al riavvio ricalcolo punteggio e percentuale. Salvare il punteggio è più breve ma non permette di riprendere il quiz né di correggere un calcolo sbagliato.
8. Deve partire una sola prenotazione. Serve uno stato "in corso" che blocca il secondo invio e, soprattutto, un controllo sul dato (posto già occupato) lato archivio. Il `disabled` è cortesia verso l'utente, il controllo sul dato è la garanzia.

### Come capire di aver capito

- Leggi una richiesta e scrivi i dati su carta prima di aprire l'editor.
- Sai dire, per ogni variabile, se è un dato di partenza o un valore calcolato.
- Prima di eseguire sai già quale output aspettarti, riga per riga.
- Davanti a un errore costruisci un esempio con tre elementi invece di indovinare.
- Sai elencare almeno tre casi limite per il problema che stai risolvendo.
- Sai spiegare a voce perché hai usato `filter` invece di `map`, o `await` invece di `.then`.

### Errori comuni

- **Filtro dentro il ciclo.** Un `for` che scandaglia l'array per ogni elemento funziona con dieci voci e diventa lento con diecimila. Causa: si pensa all'array come a una lista da percorrere, non a una sequenza di trasformazioni. Correzione: `filter` e `reduce` una volta sola.
- **Confronto tra tipi diversi.** Un `id` preso dalla URL è la stringa `"3"`, quello nei dati è il numero `3`: `===` è falso e la ricerca non trova nulla. Causa: qualcuno ha usato `==` e il problema è rimasto nascosto. Correzione: converti alla frontiera con `Number(id)` e confronta sempre con `===`.
- **`sort` che modifica l'originale.** `articoli.sort(...)` riordina i dati condivisi e la funzione successiva riceve una lista diversa. Causa: `sort` lavora sul posto. Correzione: `[...articoli].sort(...)`.
- **`NaN` ignorato.** Un totale `NaN` supera i controlli, perché ogni confronto con `NaN` è falso, anche `NaN === NaN`. Causa: nessuna validazione in ingresso. Correzione: `Number.isFinite` sul valore normalizzato, prima della somma.
- **`await` dimenticato.** `risposta.json()` senza `await` restituisce una Promise e il codice successivo lavora su un oggetto che non contiene i dati. Causa: la sintassi è corretta, quindi nessun errore di scrittura. Correzione: un `await` per ogni passaggio e `console.log(typeof variabile)` quando il messaggio è `... is not a function`.
- **`localStorage` letto senza controllo.** `JSON.parse(localStorage.getItem("spese"))` restituisce `null` al primo avvio e `null.filter` lancia `TypeError: Cannot read properties of null`. Causa: la chiave non esiste ancora. Correzione: `JSON.parse(localStorage.getItem("spese") ?? "[]")` e un controllo con `Array.isArray`.
