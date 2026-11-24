# Settimana 9: Progetto finale e autonomia

**Obiettivo:** portare un progetto personale dalla definizione alla pubblicazione: dati, stato, rendering, eventi, persistenza, stati di interfaccia, test, accessibilità e README.

### Scegliere il progetto e definire il problema

Un progetto finale si sceglie per utilità, non per ambizione: deve servire a te, usare dati che possiedi e stare in una schermata. Il brief si scrive prima del codice, e se una funzionalità non entra in una frase verificabile, va ridotta o rimossa.

- **Problema**: ricordare quali libri ho letto e quali devo ancora leggere.
- **Funzionalità minime**: aggiungere un libro, segnare letto, eliminare, filtrare, cercare.
- **Schermata**: form in alto, filtri al centro, elenco sotto.
- **Fuori scope**: account, sincronizzazione, copertine.
- **Criterio**: ogni funzionalità si verifica con una frase, per esempio "il filtro Letti mostra solo i libri letti".

Il progetto di questa settimana è una libreria personale, ma il metodo vale per qualsiasi traccia.

### Scheletro HTML e CSS funzionale

Prima lo scheletro usabile, poi l'estetica: senza CSS l'app deve già funzionare con la tastiera. Ogni campo ha una `label` che avvolge l'input, l'elenco è una `ul` e i messaggi hanno un ruolo ARIA.

```html
<h1>La mia libreria</h1>
<p id="riepilogo"></p>
<form id="form-libro">
  <label>Titolo <input name="titolo" required></label>
  <label>Autore <input name="autore" required></label>
  <label>Anno <input name="anno" type="number" min="1000" max="2100"></label>
  <button type="submit">Aggiungi</button>
  <p id="errore" role="alert" hidden></p>
</form>
<div id="filtri">
  <button data-filtro="tutti" aria-pressed="true">Tutti</button> <button data-filtro="letti" aria-pressed="false">Letti</button> <button data-filtro="da-leggere" aria-pressed="false">Da leggere</button>
</div>
<ul id="elenco"></ul>
<p id="vuoto" hidden>Nessun libro in questa vista.</p>
```

Lo stile resta minimo: tipografia leggibile, spaziatura tra le righe e un `:focus-visible` ben visibile sul bottone. Il colore non comunica mai un'informazione da solo, altrimenti chi non lo distingue perde un dato.

### Dati, stato e rendering

Lo stato è un solo oggetto: elenco, filtro attivo e testo di ricerca. Le tre informazioni cambiano insieme, quindi vivono nello stesso posto e il rendering parte sempre da lì; i tre libri di esempio servono a sviluppare subito e la persistenza li sostituirà con quelli salvati.

```js
const stato = {
  libri: [
    { id: "a1", titolo: "Il nome della rosa", autore: "Umberto Eco", anno: 1980, letto: true },
    { id: "a2", titolo: "Sapiens", autore: "Yuval Noah Harari", anno: 2011, letto: false },
    { id: "a3", titolo: "La coscienza di Zeno", autore: "Italo Svevo", anno: 1923, letto: true },
  ],
  filtro: "tutti",
  testo: "",
};

function libriVisibili() {
  const testo = stato.testo.trim().toLowerCase();
  return stato.libri
    .filter((l) => stato.filtro === "tutti" || (stato.filtro === "letti" ? l.letto : !l.letto))
    .filter((l) => l.titolo.toLowerCase().includes(testo) || l.autore.toLowerCase().includes(testo))
    .sort((a, b) => (b.anno ?? 0) - (a.anno ?? 0));
}

function render() {
  const visibili = libriVisibili();
  const letti = stato.libri.filter((l) => l.letto).length;
  document.querySelector("#riepilogo").textContent = `${stato.libri.length} libri, ${letti} letti`;
  document.querySelector("#vuoto").hidden = visibili.length > 0;
  document.querySelector("#elenco").innerHTML = visibili
    .map((l) => `<li>${l.titolo} - ${l.autore} (${l.anno ?? "s.d."}) - ${l.letto ? "letto" : "da leggere"}
      <button data-azione="letto" data-id="${l.id}">${l.letto ? "Da leggere" : "Letto"}</button> <button data-azione="elimina" data-id="${l.id}">Elimina</button></li>`)
    .join("");
}
```

`filter` restituisce un array nuovo, quindi `sort` non modifica lo stato: la vista è sempre una proiezione dei dati e non una seconda copia da tenere allineata.

### Eventi e interazioni

Il form intercetta `submit`, non il clic sul bottone: così funzionano anche Invio e l'invio da tastiera. `preventDefault` blocca il ricaricamento della pagina, che azzererebbe lo stato.

```js
document.querySelector("#form-libro").addEventListener("submit", (evento) => {
  evento.preventDefault();
  const dati = new FormData(evento.target);
  const titolo = String(dati.get("titolo")).trim();
  const autore = String(dati.get("autore")).trim();
  if (titolo === "") {
    return mostraErrore("Il titolo è obbligatorio.");
  }
  stato.libri.push({ id: crypto.randomUUID(), titolo, autore, anno: Number(dati.get("anno")) || null, letto: false });
  evento.target.reset();
  document.querySelector("#errore").hidden = true;
  salvaLibri();
  render();
});

document.querySelector("#elenco").addEventListener("click", (evento) => {
  const bottone = evento.target.closest("button[data-azione]");
  if (!bottone) {
    return;
  }
  const libro = stato.libri.find((l) => l.id === bottone.dataset.id);
  if (bottone.dataset.azione === "elimina") {
    stato.libri = stato.libri.filter((l) => l.id !== libro.id);
  } else {
    libro.letto = !libro.letto;
  }
  salvaLibri();
  render();
});
```

Per centinaia di righe non si aggiunge un listener per bottone: se ne mette uno sul contenitore e si risale con `closest`, che continua a funzionare dopo ogni `render()`. I filtri seguono lo stesso schema: leggono `data-filtro`, aggiornano `stato.filtro`, richiamano `render()` e il rendering aggiorna `aria-pressed`, altrimenti lo screen reader annuncia uno stato falso.

### Persistenza o API

`localStorage` basta quando i dati sono tuoi e vivono sul dispositivo. La scrittura è immediata; la lettura si difende con `try`/`catch` e con un filtro sulla forma dei dati, perché il salvataggio può appartenere a una versione precedente.

```js
const CHIAVE = "libreria.libri";

function salvaLibri() {
  localStorage.setItem(CHIAVE, JSON.stringify(stato.libri));
}

function leggiLibri() {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) ?? "[]");
    return Array.isArray(dati) ? dati.filter((l) => typeof l.titolo === "string") : [];
  } catch {
    return [];
  }
}

const salvati = leggiLibri();
if (salvati.length > 0) {
  stato.libri = salvati;
}
```

Se invece vuoi importare libri da un catalogo, l'API di Open Library non richiede chiavi: si chiama con `fetch`, si controlla `risposta.ok` e si mappa `docs` sul tuo modello, dentro un `try`/`catch`. È lo stesso schema della settimana 6 applicato al progetto, e introduce gli stati della sezione seguente.

### Stati di caricamento, errore e vuoto

`localStorage` è sincrono e non ha un "sto caricando"; `fetch` sì, e può fallire. L'interfaccia deve prevedere tutti e tre gli stati prima di averne bisogno: caricamento visibile, errore con testo comprensibile, elenco vuoto con un suggerimento.

```js
function mostraErrore(messaggio) {
  Object.assign(document.querySelector("#errore"), { textContent: messaggio, hidden: false });
}
```

Lo stato vuoto non è un errore: dire "Nessun libro in questa vista" è meglio di una lista bianca, e il messaggio sparisce da solo quando `render()` trova risultati. Gli errori usano `role="alert"` e si nascondono alla prima azione riuscita, altrimenti restano a schermo per sempre.

### Test, accessibilità e pubblicazione

Il collaudo finale è una lista di casi da ripetere dopo ogni modifica: titolo vuoto, doppio invio, refresh, filtro senza risultati, dati corrotti, navigazione da tastiera.

```bash
git init && git add . && git commit -m "Libreria personale 1.0"
git branch -M main && git remote add origin https://github.com/utente/libreria.git
git push -u origin main
```

Su GitHub: Settings, Pages, Deploy from a branch, `main`, `/ (root)`. Alternativa: trascini la cartella nella dashboard di Netlify. I percorsi devono restare relativi (`./style.css`), perché su GitHub Pages il sito vive in una sottocartella.

```md
# Libreria personale
App per annotare i libri letti, senza account e senza server.

## Avvio
Apri index.html oppure visita https://utente.github.io/libreria/

## Test manuali
- titolo vuoto: compare il messaggio di errore
- refresh: i libri restano
- filtro senza risultati: compare lo stato vuoto
```

**Criteri di verifica.** Funzionalità minima: aggiungere, segnare letto, eliminare, filtrare, cercare, e i dati sopravvivono al refresh. Casi limite: titolo vuoto rifiutato, anno non numerico accettato come `null`, JSON corrotto senza crash, filtro senza risultati. Accessibilità: label su ogni campo, focus visibile, contrasto almeno 4.5:1, messaggi con `role="alert"`, filtri con `aria-pressed`. README: descrizione, funzionalità, avvio locale, indirizzo pubblicato, test manuali.

### Errori comuni

- Aggiungere listener dentro `render()`: a ogni ridisegno se ne accumulano di nuovi e un clic viene eseguito più volte.
- Confrontare `dataset.id` con un id numerico: `dataset` restituisce stringhe; usare id stringa o `Number(...)`.
- Salvare in `localStorage` senza `JSON.stringify`: si ottiene `[object Object]` e la lettura successiva fallisce.
- Filtrare il nodo DOM invece dei dati: la vista si svuota e non torna più.
- Mostrare l'errore senza nasconderlo dopo un'azione riuscita, oppure pubblicare con percorsi assoluti (`/style.css`) che su GitHub Pages non esistono.
- Scrivere il README alla fine senza rileggerlo: chi arriva non capisce come avviare il progetto.

### Esercizi progressivi

Le dieci tappe sono il progetto: ognuna si appoggia alla precedente e la estende, senza riscrivere da zero.

1. **Definizione del progetto.** Scrivi il brief con problema, funzionalità minime, schermata e fuori scope; per ogni funzionalità indica la frase che la verifica (base 1).

2. **Scheletro HTML e CSS.** Crea la pagina con titolo, form, filtri, lista e stato vuoto; verifica che sia usabile solo con la tastiera, prima di aggiungere stili (base 2).

3. **Dati e stato iniziale.** Definisci `stato` con i tre libri di esempio, `filtro` e `testo`; stampa in console numero di libri, letti e da leggere (base 3).

4. **Rendering dell'elenco.** Scrivi `libriVisibili()` e `render()`: riepilogo, lista ordinata per anno decrescente, stato vuoto nascosto quando ci sono risultati (base 4).

   Output atteso:

   ```text
   3 libri, 2 letti
   Sapiens - Yuval Noah Harari (2011) - da leggere
   Il nome della rosa - Umberto Eco (1980) - letto
   La coscienza di Zeno - Italo Svevo (1923) - letto
   ```

5. **Eventi: aggiunta, letto, eliminazione.** Gestisci `submit` con `preventDefault`, delega i clic su `#elenco` con `data-azione` e aggiorna i filtri con `aria-pressed` (intermedio 5).

   Output atteso:

   ```text
   Dopo l'aggiunta: 4 libri, 2 da leggere
   Dopo il toggle: 1 da leggere
   Dopo l'eliminazione: 3 libri
   ```

6. **Persistenza o API.** Salva e ricarica i libri; poi scegli una delle due strade: `localStorage` con lettura difensiva oppure `fetch` su un'API senza chiave con mappatura sul modello (intermedio 6).

   Output atteso:

   ```text
   libreria.libri: 4 libri salvati
   Dopo il refresh: 4 libri, 2 letti
   ```

7. **Stati di caricamento, errore e vuoto.** Aggiungi i tre stati, svuota la chiave salvata e verifica che l'app non si rompa: deve mostrare lo stato vuoto, non un errore (intermedio 7).
8. **Refactoring finale.** Estrai `creaLibro(titolo, autore, anno)` e usala nel `submit`, elimina le funzioni oltre le 15 righe, sostituisci i valori ripetuti con costanti e controlla che nessuna variabile globale resti fuori da `stato` (intermedio 8).
9. **Test e accessibilità.** Esegui i casi limite, naviga solo con Tab e Invio, controlla i contrasti e annota l'esito in una lista (avanzato 9).

   Output atteso:

   ```text
   [ok] Titolo vuoto: "Il titolo è obbligatorio."
   [ok] Doppio invio: 1 libro aggiunto
   [ok] Refresh: 4 libri presenti
   [ok] Tastiera: form e filtri raggiungibili, focus visibile
   ```

10. **Pubblicazione e README.** Pubblica su GitHub Pages o Netlify, verifica i percorsi relativi e scrivi il README con avvio, funzionalità, indirizzo e test manuali (avanzato 10).

### Varianti

- Aggiungi un voto da 1 a 5 per libro e mostra la media nella testata, gestendo il caso "nessun voto".
- Salva anche `filtro` e `testo` in `localStorage`, così dopo il refresh la vista resta quella che stavi guardando.
- Aggiungi l'esportazione in JSON con un pulsante che crea un `Blob` e lo scarica: nessuna libreria esterna.
