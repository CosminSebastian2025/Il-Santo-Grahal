# Settimana 7: Organizzazione e app intermedie

**Obiettivo:** dividere il codice in moduli, far dipendere la pagina da un unico stato, gestire eventi e form, rispettare l'accessibilità e costruire una todo list completa.

### Moduli ES6

Un file unico diventa ingestibile appena cresce. I moduli danno a ogni file uno scope proprio e rendono esplicite le dipendenze: ciò che non è esportato non è visibile dall'esterno, quindi due funzioni con lo stesso nome in file diversi non si pestano i piedi.

```js
// utils.js
export const ALIQUOTA_IVA = 0.22;
export function formattaPrezzo(valore) {
  return `${valore.toFixed(2)} EUR`;
}
```

```js
// main.js
import { ALIQUOTA_IVA, formattaPrezzo } from "./utils.js";

console.log(`Totale: ${formattaPrezzo(20 * (1 + ALIQUOTA_IVA))}`);
```

Output:

```text
Totale: 24.40 EUR
```

Nel documento HTML lo script va dichiarato `<script type="module" src="main.js"></script>`: senza `type="module"` il browser rifiuta `import` con `SyntaxError`. I moduli sono in strict mode, sono differiti per default e richiedono un server locale, perché da `file://` il browser li blocca per sicurezza. Il percorso deve iniziare con `./` e includere l'estensione `.js`. `export` nominato ammette più elementi per file, `export default` uno solo ed è comodo per il pezzo principale del modulo.

### Stato, render e event delegation

Con lo stato si decide una volta dove vivono i dati; con il render si decide una volta come si trasformano in pagina. Il DOM diventa una conseguenza dello stato, non una seconda copia da tenere allineata a mano.

```js
const state = {
  compiti: [
    { id: 1, testo: "Studiare i moduli", completato: true },
    { id: 2, testo: "Scrivere il render", completato: false },
  ],
};

function render() {
  listaEl.replaceChildren(
    ...state.compiti.map((compito) => {
      const li = document.createElement("li");
      li.textContent = compito.testo;
      li.dataset.id = compito.id;
      li.classList.toggle("fatto", compito.completato);
      return li;
    }),
  );
  const fatti = state.compiti.filter((c) => c.completato).length;
  conteggioEl.textContent = `Compiti: ${state.compiti.length}, completati: ${fatti}`;
}
render();
```

Con `listaEl` e `conteggioEl` già selezionati, il conteggio mostra `Compiti: 2, completati: 1`. Il flusso è sempre lo stesso: modifica `state`, poi chiama `render()`. `replaceChildren` svuota e ripopola in un colpo solo, e i valori derivati (il numero di completati) si calcolano nel render invece di essere salvati nello stato, dove si disallineerebbero.

Un solo listener sul contenitore gestisce anche gli elementi creati dopo, che un ciclo di `addEventListener` non conoscerebbe.

```js
listaEl.addEventListener("click", (evento) => {
  const bottone = evento.target.closest("button[data-azione]");
  if (!bottone) {
    return;
  }
  const id = Number(bottone.closest("li").dataset.id);
  console.log(`Elimino il compito ${id}`);
});
```

Al clic sul pulsante del secondo compito la console mostra `Elimino il compito 2`. `evento.target` è l'elemento colpito, che può essere un'icona dentro il pulsante: per questo si parte da lì con `closest` e si risale al pulsante e alla voce. Il controllo `if (!bottone)` scarta i clic sul testo della lista, dove non c'è nulla da fare.

### Form: validazione e accessibilità

Un form valida i dati prima di usarli, e mostra tutti i problemi insieme invece di uno alla volta: correggerli in tre tentativi separati è frustrante.

```js
formEl.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const nome = formEl.elements.nome.value.trim();
  const email = formEl.elements.email.value.trim();
  const errori = [];
  if (nome.length < 2) errori.push("Il nome deve avere almeno 2 caratteri.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errori.push("Email non valida.");
  if (formEl.elements.password.value.length < 8) {
    errori.push("La password deve avere almeno 8 caratteri.");
  }
  if (errori.length > 0) {
    console.log(errori.join(" "));
    return;
  }
  console.log(`Registrazione valida per ${nome}`);
});
```

Output con i tre campi vuoti:

```text
Il nome deve avere almeno 2 caratteri. Email non valida. La password deve avere almeno 8 caratteri.
```

`preventDefault` blocca l'invio vero, che ricaricherebbe la pagina e perderebbe lo stato. `trim` evita che uno spazio conti come carattere, la regex accetta solo una chiocciola e un punto nel dominio, e `elements` raggiunge i campi per `name`, senza `querySelector` sparsi.

L'accessibilità non è un extra: un campo senza `<label for="email">` è invisibile a chi usa un lettore di schermo. Servono anche `alt` sulle immagini, `aria-describedby` che collega l'errore al campo, `role="alert"` sul messaggio, `type="button"` sui pulsanti che non inviano, un `:focus-visible` con outline visibile e la possibilità di usare tutto con Tab, Invio ed Escape. Un `div` con `onclick` non è raggiungibile da tastiera: al suo posto va un `button`.

### Modal e menu mobile

La finestra modale e il menu mobile sono lo stesso problema: un pezzo di interfaccia che compare e scompare. Lo stato decide se è aperto; il DOM e gli attributi ARIA seguono.

```js
const state = { modalAperto: false };
function imposta(aperto) {
  state.modalAperto = aperto;
  modaleEl.hidden = !aperto;
  apriEl.setAttribute("aria-expanded", String(aperto));
  if (aperto) {
    chiudiEl.focus();
  } else {
    apriEl.focus();
  }
}

apriEl.addEventListener("click", () => imposta(true));
chiudiEl.addEventListener("click", () => imposta(false));
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && state.modalAperto) {
    imposta(false);
  }
});
```

`hidden` toglie l'elemento dall'albero di accessibilità e dalla navigazione da tastiera, quindi è meglio di `display: none` gestito a mano. Il focus si sposta dentro la finestra all'apertura e torna sul pulsante alla chiusura, altrimenti chi naviga da tastiera si ritrova all'inizio della pagina. Per il menu mobile valgono le stesse regole, con `aria-expanded` sul pulsante che lo apre.

### Test manuali e codice organizzato

`console.assert` stampa solo quando la condizione è falsa, quindi un controllo silenzioso significa "tutto bene": è il modo più rapido per fissare il comportamento atteso prima di aggiungere codice.

```js
function verifica(descrizione, effettivo, atteso) {
  console.assert(effettivo === atteso, `${descrizione}: atteso ${atteso}, ottenuto ${effettivo}`);
}
verifica("2 + 2", 2 + 2, 4);
verifica("nome", "Anna".length, 5);
console.log("Controlli eseguiti");
```

Output:

```text
Controlli eseguiti
```

Se un controllo fallisce compare `Assertion failed: nome: atteso 5, ottenuto 4`, e il messaggio dice già quale caso è rotto. Un progetto come la todo list si organizza in tre file: `index.html` con il markup, `todo.js` con stato, azioni e render, `storage.js` con `salva` e `carica`. Le funzioni di salvataggio sono l'unico punto che conosce `localStorage`, quindi sostituirle domani con una chiamata al server non tocca il resto dell'app.

### Errori comuni

- Dimenticare `type="module"` nello script: `SyntaxError: Cannot use import statement outside a module`.
- Scrivere il percorso senza `./` o senza `.js`: il browser non trova il file e l'import fallisce.
- Aprire `index.html` con il doppio clic: da `file://` i moduli sono bloccati dalle regole di sicurezza.
- Modificare lo stato senza chiamare `render()` e aspettarsi che la pagina si aggiorni.
- Agganciare un listener a ogni voce creata: gli elementi aggiunti dopo restano senza eventi.
- Dimenticare `preventDefault` nel submit: la pagina si ricarica e lo stato sparisce.

### Esercizi progressivi

1. **Due file con export e import.** Crea `utils.js` che esporta `formattaPrezzo` e `ALIQUOTA_IVA`, e `main.js` che importa entrambi e stampa il totale di 20 EUR con IVA. Apri la pagina con un server locale e verifica la console (esercizio base 1).

   Output atteso:

   ```text
   Totale: 24.40 EUR
   ```

2. **Render da stato.** Uno stato con tre prodotti (`nome`, `prezzo`, `disponibile`) e un filtro `"disponibili"`; la funzione `render` svuota la lista con `replaceChildren`, crea le voci con `createElement` e aggiorna il conteggio. Con due prodotti disponibili su tre il paragrafo di stato mostra `Visibili: 2 su 3` (esercizio base 2).

3. **Eliminazione con delegation.** Lista della spesa con `Pane`, `Latte` e `Uova`, un pulsante di eliminazione per voce e un solo listener sul contenitore. Al clic su `Pane` la console mostra `Rimosso: Pane` e il render successivo `Rimanenti: 2` (esercizio base 3).

4. **Validare email.** Scrivi `validaEmail(testo)` che fa `trim`, porta in minuscolo e verifica con una regex; restituisce `true` o `false`. Prova i quattro casi in elenco (esercizio base 4).

   Output atteso:

   ```text
   validaEmail("anna@example.com") -> true
   validaEmail("anna@example") -> false
   validaEmail(" anna@example.com ") -> true
   validaEmail("anna example.com") -> false
   ```

5. **Controlli di accessibilità.** Prendi un form con un input senza `label`, un'immagine senza `alt`, un `div` cliccabile e un `outline: none` globale; correggi i quattro problemi e annota per ciascuno la modifica fatta (esercizio intermedio 5).
6. **Modal con stato.** Realizza apertura e chiusura con un unico oggetto `state`, `hidden`, `aria-expanded` e chiusura con Escape; sposta il focus dentro alla apertura e riportalo sul pulsante alla chiusura. La console registra `Modal aperto` e `Modal chiuso con Escape` (esercizio intermedio 6).
7. **console.assert.** Scrivi `verifica(descrizione, effettivo, atteso)` e usala su tre casi di una funzione `somma` (due numeri, uno zero, un negativo). Se i tre casi passano la console mostra solo `Test superati: 3`; rompi apposta un caso e leggi il messaggio di asserzione (esercizio intermedio 7).

8. **Todo list, tappa 1: aggiunta e toggle.** Stato `{ compiti: [] }`, un form con campo di testo, `render` che elenca i compiti con una classe `fatto` e un listener sul contenitore che inverte `completato` al clic. Aggiungi `Studiare i moduli`, poi `Ripassare fetch`, poi clicca il primo (esercizio intermedio 8).

   Output atteso:

   ```text
   Compiti: 1, completati: 0
   Compiti: 2, completati: 0
   Compiti: 2, completati: 1
   ```

9. **Todo list, tappa 2: eliminazione e filtri.** Aggiungi un pulsante di eliminazione per voce e tre pulsanti Tutte, Attive, Completate che cambiano `state.filtro` e richiamano `render`. Parti da tre compiti con il primo completato (esercizio avanzato 9).

   Output atteso:

   ```text
   Tutte: 3
   Attive: 2
   Completate: 1
   ```

10. **Todo list completa con localStorage.** Collega `salva` a ogni modifica e `carica` all'avvio, gestendo JSON non valido e chiave assente; separa il salvataggio in `storage.js` esportato come nell'esempio. Al primo avvio la lista è vuota, dopo un compito e un refresh ne resta uno e il titolo è ancora `Studiare i moduli`. Il cuore del modulo è (esercizio avanzato 10):

    ```js
    export function salva(compiti) {
      localStorage.setItem("todo", JSON.stringify(compiti));
    }

    export function carica() {
      try {
        return JSON.parse(localStorage.getItem("todo")) ?? [];
      } catch {
        return [];
      }
    }
    ```

    Attenzione: `localStorage` conserva solo stringhe, e `JSON.parse(null)` restituisce `null`, quindi il `?? []` serve a distinguere "niente salvato" da "lista vuota".

### Varianti

- Nell'esercizio 1 aggiungi una funzione con `export default` e spiega in un commento quando preferirlo.
- Nell'esercizio 8 mostra nel render anche quante attive restano, calcolandole dai compiti e non salvandole.
- Nell'esercizio 6 chiudi il modal cliccando sullo sfondo e verifica che il focus torni sempre al pulsante.
- Nell'esercizio 10 permetti di modificare il testo con un doppio clic e salva subito dopo la modifica.
