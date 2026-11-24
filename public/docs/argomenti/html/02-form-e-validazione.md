Un modulo web ben scritto è una conversazione: chiede poco alla volta, spiega cosa si aspetta e segnala gli errori prima che l'utente li scopra dopo l'invio. HTML offre gli strumenti per fare quasi tutto questo senza una riga di JavaScript, grazie ai tipi di `input` e alla validazione nativa gestita dal browser. In questa lezione impari a costruire moduli accessibili, a scegliere il tipo di campo corretto e a capire dove la validazione nativa basta e dove serve un controllo lato server.

## Obiettivi

- Associare correttamente `label`, `input` e messaggi di aiuto senza usare il `placeholder` come etichetta.
- Scegliere il tipo di `input` adatto al dato richiesto, con i suoi attributi.
- Usare gli attributi di validazione nativa e personalizzare i messaggi.
- Comprendere il ruolo di `fieldset`, `legend` e dei gruppi di opzioni.
- Saper distinguere la validazione del browser da quella lato server.

## Etichette, campi e aiuto contestuale

Un campo senza etichetta programmaticamente associata è invisibile a chi usa un lettore di schermo. La forma più robusta è racchiudere il campo nella `label` oppure collegarlo con `for` e `id`. Il `placeholder` è solo un suggerimento visivo: sparisce appena si digita e non è un'etichetta affidabile.

```html
<form action="/iscrizione" method="post" novalidate>
  <div>
    <label for="nome">Nome</label>
    <input id="nome" name="nome" type="text" autocomplete="given-name" required />
  </div>
  <div>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email"
           aria-describedby="email-hint" required />
    <p id="email-hint">Ti scriveremo solo per confermare l'iscrizione.</p>
  </div>
  <button type="submit">Iscrivimi</button>
</form>
```

`aria-describedby` collega il messaggio di aiuto all'input: il lettore di schermo lo annuncia insieme all'etichetta. Inserire un attributo `novalidate` nel `form` disattiva la validazione automatica del browser e ti restituisce il controllo dell'invio, utile quando vuoi mostrare i messaggi con un design coerente.

## Tipi di input e attributi

Il tipo influenza tastiera su mobile, comportamento del browser e validazione implicita. Scegliere `type="text"` per una data significa perdere il selettore di calendario e la verifica del formato.

| Tipo | Uso tipico | Validazione implicita | Note |
|:-----|:-----------|:----------------------|:-----|
| `email` | indirizzi | formato di base | `multiple` per più valori |
| `tel` | numeri di telefono | nessuna | serve `pattern` per la forma locale |
| `url` | link completi | schema e formato | richiede `https://` o `http://` |
| `number` | quantità | numerico | `min`, `max`, `step` |
| `date` | calendario | data valida | restituisce `YYYY-MM-DD` |
| `password` | credenziali | nessuna | mai come unico controllo |
| `checkbox` / `radio` | scelte | nessuna | gruppi con `name` uguale |
| `file` | caricamenti | `accept` solo suggerimento | controlla sul server |
| `search` | filtri | nessuna | tastiera con tasto cerca |

Altri attributi contano quanto il tipo: `autocomplete` aiuta il riempimento automatico e chi ha difficoltà motorie, `inputmode` suggerisce la tastiera, `required` rende il campo obbligatorio, `minlength` e `maxlength` limitano la lunghezza, `pattern` accetta un'espressione regolare.

```html
<label for="cap">CAP</label>
<input id="cap" name="cap" type="text" inputmode="numeric"
       pattern="[0-9]{5}" maxlength="5" required />
```

## Gruppi di scelte e struttura del modulo

Quando due o più campi formano un insieme (indirizzi, scelte esclusive, opzioni multiple), avvolgili in un `fieldset` e dai al gruppo un titolo con `legend`. Per i `radio` il valore di `name` deve essere lo stesso in tutto il gruppo, altrimenti il browser li tratta come scelte indipendenti e la selezione non è esclusiva.

```html
<fieldset>
  <legend>Frequenza delle notifiche</legend>
  <label><input type="radio" name="frequenza" value="giornaliera" /> Giornaliera</label>
  <label><input type="radio" name="frequenza" value="settimanale" /> Settimanale</label>
</fieldset>
```

Le etichette uniche valgono anche per i pulsanti: `<button type="submit">` è preferibile a `<input type="submit">` perché accetta contenuto ricco e un valore predefinito corretto. Un pulsante di annullamento va dichiarato con `type="reset"`, altrimenti il browser ne assume implicitamente il tipo `submit`.

## Validazione nativa e oltre

La validazione nativa mostra i suoi messaggi all'invio e, nei browser più recenti, anche quando si esce da un campo già modificato. Il CSS espone gli stati corrispondenti con le pseudo-classi `:valid`, `:invalid`, `:user-invalid` e `:required`, mentre l'API Constraint Validation in JavaScript permette di leggere `validity`, invocare `checkValidity()` e impostare un messaggio con `setCustomValidity`.

Per un messaggio personalizzato in italiano su un campo singolo agisci con `oninput` oppure in fase di invio:

```js
const cap = document.querySelector("#cap");
cap.addEventListener("input", () => {
  cap.setCustomValidity(/^[0-9]{5}$/.test(cap.value) ? "" : "Inserisci cinque cifre.");
});
```

Un accorgimento importante: la validazione del browser è un aiuto per l'utente, non una protezione. Chiunque può inviare una richiesta senza passare dal modulo, quindi ogni regola va ripetuta sul server, che resta l'unica fonte di verità.

## Errori comuni

- **Usare il `placeholder` al posto della `label`**: il testo sparisce al primo carattere e il campo resta senza nome accessibile.
- **Omettere `name` sugli `input`**: il valore non viene inviato al server nemmeno se il campo è compilato.
- **Dare `name` diversi ai `radio` dello stesso gruppo**: la selezione diventa multipla e confusa.
- **Scrivere `pattern` senza ancoraggio o con classi non supportate**: il browser valida l'intera stringa e il risultato può sorprendere.

## In sintesi

Ogni campo ha bisogno di una `label` associata e, quando serve, di un messaggio collegato con `aria-describedby`. Il tipo di `input` decide tastiera e validazione implicita. `fieldset` e `legend` danno nome ai gruppi di scelte. La validazione nativa migliora l'esperienza, ma il controllo lato server resta indispensabile.

## Fonti

- [MDN – Elementi HTML: input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input)
- [MDN – Constraint validation](https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation)
- [HTML Living Standard – Form control infrastructure](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html)
- [W3C WAI – Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
