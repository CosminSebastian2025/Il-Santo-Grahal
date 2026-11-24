# Settimana 8: Progetti più complessi

**Obiettivo:** unire dati, stato, eventi e persistenza in due applicazioni complete, un quiz e un mini shop, e consegnare un progetto scelto da te con requisiti verificabili.

### Il modello dati del quiz

Un quiz è un array di oggetti: ogni domanda tiene insieme testo, opzioni e indice della risposta corretta. La risposta è un indice e non il testo, così maiuscole e spazi non possono rompere il confronto.

```js
const domande = [
  { testo: "Quale metodo trasforma ogni elemento di un array?", opzioni: ["filter", "map", "reduce"], corretta: 1 },
  { testo: "Che cosa restituisce typeof []?", opzioni: ["array", "object", "undefined"], corretta: 1 },
  { testo: "Quale confronto evita le conversioni implicite?", opzioni: ["==", "===", "="], corretta: 1 },
];
domande.forEach((domanda, i) => console.log(`${i + 1}. ${domanda.testo}`));
```

### Una domanda alla volta

Lo schermo mostra una sola domanda: il resto è stato che il codice conosce e non disegna ancora. Il rendering legge lo stato e ricostruisce il blocco, quindi nessun evento manipola il DOM per conto suo.

```html
<section id="quiz" aria-live="polite">
  <p id="progresso"></p>
  <h2 id="domanda"></h2>
  <div id="opzioni"></div>
  <p id="feedback"></p>
  <button id="avanti" hidden>Avanti</button>
</section>
```

```js
const stato = { indice: 0, punteggio: 0, risposte: [] };
function mostraDomanda() {
  const domanda = domande[stato.indice];
  document.querySelector("#progresso").textContent = `Domanda ${stato.indice + 1} di ${domande.length}`;
  document.querySelector("#domanda").textContent = domanda.testo;
  document.querySelector("#feedback").textContent = "";
  document.querySelector("#avanti").hidden = true;
  document.querySelector("#opzioni").innerHTML = domanda.opzioni
    .map((opzione, i) => `<button class="opzione" data-indice="${i}">${opzione}</button>`)
    .join("");
}

mostraDomanda();
```

Il testo delle opzioni è fidato perché lo scrivi tu: se arrivasse da un utente servirebbe `textContent`. Il contatore dice quanto manca e riduce l'abbandono.

### Punteggio, risultati e restart

Rispondere cambia lo stato e spiega l'esito; il punteggio si incrementa dove la risposta viene valutata, e i bottoni vanno disabilitati subito, altrimenti un doppio clic vale due punti.

```js
function rispondi(indiceScelto) {
  const domanda = domande[stato.indice];
  const corretta = indiceScelto === domanda.corretta;
  stato.punteggio += corretta ? 1 : 0;
  stato.risposte.push({ indice: stato.indice, scelta: indiceScelto, corretta });
  document.querySelector("#feedback").textContent = corretta
    ? "Corretto."
    : `Sbagliato. La risposta giusta è ${domanda.opzioni[domanda.corretta]}.`;
  document.querySelector("#avanti").hidden = false;
}
```

Il ternario aggiunge 1 o 0, quindi il punteggio non viene mai ricalcolato da capo. `#avanti` chiama `mostraRisultati()` all'ultima domanda e altrimenti passa alla successiva; `riavvia` azzera i tre campi e richiama `mostraDomanda()`.

```js
function mostraRisultati() {
  const totale = domande.length;
  const percentuale = Math.round((stato.punteggio / totale) * 100);
  const errate = stato.risposte.filter((r) => !r.corretta).length;
  document.querySelector("#quiz").innerHTML = `
    <h2>Risultato: ${stato.punteggio} / ${totale} (${percentuale}%)</h2>
    <p>Risposte errate: ${errate}</p>
    <button id="riavvia">Ricomincia</button>`;
}
```

Con risposte `1`, `0`, `1`:

```text
Risultato: 2 / 3 (67%)
Risposte errate: 1
```

### Mini shop: catalogo e carrello

L'`id` è il riferimento stabile: il nome può cambiare, il carrello no. Il carrello non copia i prodotti, conserva `id` e `quantita` e ricava il prezzo dal catalogo, così esiste una sola fonte di verità.

```js
const prodotti = [
  { id: 1, nome: "Tastiera meccanica", categoria: "periferiche", prezzo: 39.9 },
  { id: 2, nome: "Mouse wireless", categoria: "periferiche", prezzo: 12.5 },
  { id: 3, nome: "Cavo USB-C", categoria: "accessori", prezzo: 2.5 },
  { id: 4, nome: "Hub 4 porte", categoria: "accessori", prezzo: 18.9 },
  { id: 5, nome: "Monitor 24 pollici", categoria: "schermi", prezzo: 149.9 },
  { id: 6, nome: "Supporto monitor", categoria: "schermi", prezzo: 29.9 },
];
const carrello = [];
function cambiaQuantita(id, delta) {
  const riga = carrello.find((r) => r.id === id);
  if (!riga) {
    if (delta > 0) {
      carrello.push({ id, quantita: delta });
    }
    return;
  }

  riga.quantita += delta;
  if (riga.quantita <= 0) {
    carrello.splice(carrello.indexOf(riga), 1);
  }
}

function righeCarrello() {
  return carrello.map((riga) => {
    const p = prodotti.find((prodotto) => prodotto.id === riga.id);
    return { ...p, quantita: riga.quantita, subtotale: p.prezzo * riga.quantita };
  });
}

const totaleCarrello = (righe) => righe.reduce((somma, r) => somma + r.subtotale, 0);
```

Aggiungere è `cambiaQuantita(1, 1)`, rimuovere è `cambiaQuantita(1, -1)`: una sola regola, la quantità non scende sotto zero. Con tastiera, mouse e cavo il totale è `54.90 EUR`; un carrello vuoto vale `0.00` perché `reduce` parte da `0`.

### Persistenza, ricerca e ordinamento

`localStorage` salva solo stringhe: `JSON.stringify` per scrivere, `JSON.parse` per leggere. La lettura va difesa, perché il dato salvato può essere vecchio o corrotto.

```js
const CHIAVE = "shop.carrello";
const salvaCarrello = () => localStorage.setItem(CHIAVE, JSON.stringify(carrello));
function leggiCarrello() {
  try {
    const righe = JSON.parse(localStorage.getItem(CHIAVE) ?? "[]");
    return Array.isArray(righe)
      ? righe.filter((r) => Number.isInteger(r.id) && Number.isInteger(r.quantita) && r.quantita > 0)
      : [];
  } catch (errore) {
    localStorage.removeItem(CHIAVE);
    return [];
  }
}

carrello.push(...leggiCarrello());
```

Il filtro non è pedanteria: un `quantita: "2"` salvato da una versione precedente produrrebbe `"2" + 1 = "21"`. `salvaCarrello()` va chiamata dopo ogni modifica; filtri e ordinamento, che non sono dati da conservare, stanno in un oggetto separato:

```js
const filtri = { testo: "monitor", categoria: "schermi", ordine: "prezzo-crescente" };
function prodottiVisibili() {
  const testo = filtri.testo.trim().toLowerCase();
  const segno = filtri.ordine === "prezzo-crescente" ? 1 : -1;
  const filtrati = prodotti.filter((p) =>
    p.nome.toLowerCase().includes(testo) &&
    (filtri.categoria === "tutte" || p.categoria === filtri.categoria));
  return [...filtrati].sort((a, b) => (a.prezzo - b.prezzo) * segno);
}
```

Con `monitor` in `schermi` restano `Supporto monitor` (29.90 EUR) e `Monitor 24 pollici` (149.90 EUR). La copia `[...filtrati]` prima di `sort` è obbligatoria: `sort` modifica l'array su cui lavora e senza copia cambierebbe l'ordine del catalogo a ogni ricerca.

### Rifinitura e progetto del giorno 80

Stati vuoti e messaggi fanno parte della funzionalità: un carrello vuoto deve dirlo, un filtro senza risultati deve suggerire di cambiarlo, un'aggiunta deve confermare l'azione.

```js
function renderCarrello() {
  const righe = righeCarrello();
  const elenco = document.querySelector("#carrello");
  elenco.textContent = righe.length === 0
    ? "Il carrello è vuoto. Aggiungi un prodotto dal catalogo."
    : righe.map((r) => `${r.nome} x${r.quantita} = ${r.subtotale.toFixed(2)} EUR`).join(" | ");
  document.querySelector("#totale").textContent = `${totaleCarrello(righe).toFixed(2)} EUR`;
}
```

Per il progetto del giorno 80 scegli quiz **o** shop e rispetta questi requisiti: dati in un array di oggetti, un solo oggetto stato, una funzione di rendering che ridisegna da zero, almeno tre eventi con `addEventListener`, persistenza con lettura difensiva, stati vuoti e feedback. Un requisito che non sai verificare con una frase non è un requisito.

### Errori comuni

- Confrontare `dataset.indice` con un numero: `dataset` restituisce stringhe, quindi `"1" === 1` è `false`; serve `Number(...)`.
- Usare `sort` senza copiare l'array: l'ordine cambia anche dove non dovrebbe.
- Tenere il totale in una variabile separata: prima o poi diverge dal carrello.
- Fare `JSON.parse` senza `try`/`catch`: un dato corrotto blocca lo script successivo.
- Confondere `carrello.length` (righe) con il numero di pezzi (somma delle quantità).
- Inserire testo dell'utente con `innerHTML`: rischio di iniezione; usare `textContent`.

### Esercizi progressivi

1. **I dati del quiz.** Crea l'array `domande` con tre voci complete e stampa l'elenco numerato e la risposta corretta della prima domanda (base 1).

2. **Una domanda alla volta.** Costruisci la sezione HTML e `mostraDomanda()`; `Avanti` avanza senza valutare e all'ultima domanda diventa `Mostra risultati` (base 2).

3. **Calcolo del punteggio.** Con le risposte `[1, 0, 1]` calcola punteggio ed elenco delle domande sbagliate con `reduce` e `filter` (base 3).

   Output atteso:

   ```text
   Punteggio: 2 / 3
   Sbagliate: Che cosa restituisce typeof []?
   ```

4. **Risultati e restart.** Mostra punteggio, percentuale e messaggio, poi riporta indice e punteggio a `0` senza ricaricare la pagina (base 4).

5. **Catalogo a card.** Renderizza i sei prodotti con nome, categoria e prezzo a due decimali, generando le card con `map` e `join` (intermedio 5).

6. **Carrello con totale.** Aggiungi tastiera, mouse e cavo; poi aggiungi un secondo cavo e infine rimuovi il mouse (intermedio 6).

   Output atteso:

   ```text
   Dopo 3 aggiunte: 54.90 EUR (3 articoli, 3 pezzi)
   Dopo il secondo cavo: 57.40 EUR (3 articoli, 4 pezzi)
   Dopo la rimozione del mouse: 44.90 EUR (2 articoli, 3 pezzi)
   ```

7. **Persistenza del carrello.** Salva e ricarica il carrello, poi sostituisci il valore salvato con `"non-json"` (intermedio 7).

   Output atteso:

   ```text
   Salvato: [{"id":1,"quantita":1},{"id":3,"quantita":2}]
   Ricaricato: 2 righe, totale 44.90 EUR
   JSON corrotto: carrello vuoto e chiave rimossa
   ```

8. **Ricerca, filtro e ordinamento.** Ordina il catalogo per prezzo crescente, cerca `monitor` in `schermi`, poi cerca `tastiera` in `schermi` (intermedio 8).

   Output atteso:

   ```text
   Prezzo crescente: Cavo USB-C 2.50, Mouse wireless 12.50, Hub 4 porte 18.90, Supporto monitor 29.90, Tastiera meccanica 39.90, Monitor 24 pollici 149.90
   Ricerca "monitor" in schermi: Supporto monitor 29.90, Monitor 24 pollici 149.90
   Ricerca "tastiera" in schermi: Nessun prodotto trovato.
   ```

9. **Rifinitura dell'interfaccia.** Aggiungi stato vuoto del carrello, contatore articoli, conferma con `role="status"` che sparisce dopo due secondi e `aria-pressed` sui filtri (avanzato 9).

10. **Progetto completo.** Consegna quiz o shop con tutti i requisiti e verifica il percorso principale dopo un refresh: catalogo di 6 prodotti, ricerca `usb` con 1 risultato, carrello da `54.90 EUR` ripristinato, filtro `accessori` in ordine decrescente (Hub 4 porte 18.90, Cavo USB-C 2.50) (avanzato 10).

### Varianti

- Mescola le domande con l'algoritmo di Fisher-Yates e spiega in un commento perché `sort(() => Math.random() - 0.5)` non è un mescolamento uniforme.
- Salva i prezzi in centesimi interi e formatta solo in uscita, così i decimali non accumulano errore.
- Aggiungi la paginazione: tre prodotti per pagina, con stato `pagina` e bottoni disabilitati ai bordi.
