L'accessibilità non è una funzionalità da aggiungere a fine progetto: è una conseguenza di una pagina scritta bene. Un sito accessibile funziona con tastiera, lettori di schermo, zoom del 200% e contrasti forzati. Questa lezione riunisce i controlli principali e li mette in pratica in un laboratorio, correggendo una pagina volutamente problematica.

## Obiettivi

- Riconoscere e correggere i problemi di focus, contrasto e ordine di tabulazione.
- Rendere utilizzabile una pagina solo con la tastiera e con zoom elevato.
- Usare ARIA con moderazione, solo quando HTML semantico non basta.
- Applicare un metodo di verifica manuale e automatizzata.
- Mettere in pratica le correzioni in un laboratorio guidato.

## Le quattro aree di controllo

| Area | Domanda di verifica | Strumento rapido |
|:-----|:--------------------|:-----------------|
| Tastiera | Posso raggiungere e usare tutto con Tab, Invio, Spazio, frecce? | navigare senza mouse |
| Focus visibile | Vedo sempre dove sono? | Tab e osservazione |
| Contrasto | Il testo è leggibile su sfondo normale e in hover? | controllore di contrasto |
| Struttura | Titoli, landmark e nomi accessibili sono coerenti? | albero di accessibilità |

Un utente da tastiera si muove in ordine di documento: mai usare `tabindex` con numeri positivi, che riordinano la sequenza. Se l'ordine visivo diverge da quello del DOM, si corregge il layout, non si aggira il problema con scorciatoie di focus.

## Focus, tastiera e contrasto

Il focus va reso visibile e non rimosso: `outline: none` senza sostituzione è uno degli errori più diffusi. Una regola robusta combina `:focus-visible` con un contorno netto e uno scarto, così il contorno resta leggibile anche su elementi a bordo arrotondato.

```css
:focus-visible {
  outline: 3px solid #0f172a;
  outline-offset: 2px;
  border-radius: 4px;
}

.skip-link {
  position: absolute;
  left: -999px;
}

.skip-link:focus-visible {
  left: 1rem;
  top: 1rem;
  background: #0f172a;
  color: #ffffff;
  padding: 0.5rem 1rem;
}
```

Il collegamento "salta al contenuto" è la prima cosa raggiungibile con Tab e porta al `main`: risparmia decine di passaggi. Per il contrasto, il livello AA delle WCAG 2.2 richiede 4.5:1 per il testo normale e 3:1 per quello grande. Attenzione agli stati: un link grigio chiaro in hover ha ancora bisogno di contrasto sufficiente.

## ARIA con moderazione

ARIA descrive ruoli e stati che l'HTML non esprime, ma non aggiunge comportamento: un `role="button"` su un `div` non risponde al tasto Invio. La regola pratica è che HTML nativo viene prima, ARIA solo per elementi che non hanno equivalente semantico. Le proprietà più utili sono poche: `aria-label` e `aria-labelledby` per dare nome a regioni e controlli senza testo, `aria-describedby` per i messaggi, `aria-expanded` per aprire e chiudere menu, `aria-current` per la voce attiva nella navigazione.

```html
<nav aria-label="Navigazione principale">
  <a href="/" aria-current="page">Home</a>
  <a href="/archivio/">Archivio</a>
</nav>
<button type="button" aria-expanded="false" aria-controls="filtri">Filtri</button>
```

Gli errori tipici sono due e opposti: riscrivere semantica già presente, come `role="navigation"` su un `nav`, oppure dimenticare di aggiornare lo stato, per esempio lasciare `aria-expanded="false"` su un pannello aperto. Ricorda inoltre che `aria-label` sostituisce il nome accessibile: su un `nav` che contiene un titolo, quest'ultimo non viene più annunciato.

## Laboratorio: correggere una pagina problematica

Partiamo da questo frammento, che racchiude cinque problemi reali: intestazione non semantica, `div` cliccabile non raggiungibile da tastiera, salto di livello dei titoli, pulsante finto, campo senza etichetta e messaggio di errore con contrasto insufficiente.

```html
<div class="topbar" onclick="location.href='/'">
  <span class="title">Studio Forma</span>
</div>
<div class="card" tabindex="1">
  <h4>Preventivo</h4>
  <div class="btn" onclick="invia()">Richiedi</div>
  <input type="text" placeholder="La tua email" />
  <span class="errore" style="color:#b0b0b0">Email non valida</span>
</div>
```

La versione corretta:

```html
<header class="topbar">
  <a href="/" class="brand">Studio Forma</a>
</header>
<main>
  <section aria-labelledby="preventivo">
    <h2 id="preventivo">Preventivo</h2>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email"
           aria-describedby="errore-email" required />
    <span id="errore-email" class="errore">Inserisci un indirizzo email valido.</span>
    <button type="button">Richiedi</button>
  </section>
</main>
```

La soluzione sposta la semantica sugli elementi nativi: un link è un link, un pulsante è un `button`, il titolo scende a `h2` coerente con l'`h1` di pagina. Allo stile si aggiunge contrasto e, se serve, un'icona, perché il colore da solo non deve essere l'unico segnale.

## Esercizi

1. Aggiungi un collegamento "salta al contenuto" funzionante a una pagina con header e nav.
2. Sostituisci un `div` con `role="button"` e gestori `click` con l'elemento corretto.
3. Scegli due colori che raggiungano almeno 4.5:1 per il testo normale.
4. Correggi un salto di titolo da `h1` a `h4` in una sezione annidata.
5. Dai un nome accessibile a una navigazione secondaria con più elenchi di link.
6. Marca la voce attiva del menu con l'attributo ARIA adatto.

<details><summary>Soluzione</summary>

**1. Skip link**

```html
<body>
  <a class="skip-link" href="#contenuto">Salta al contenuto</a>
  <header><nav aria-label="Principale"><a href="/">Home</a></nav></header>
  <main id="contenuto" tabindex="-1"><h1>Contenuto</h1></main>
</body>
```

Il `tabindex="-1"` sul `main` permette al focus di atterrare lì dopo il salto; il collegamento è visibile solo quando riceve il focus.

**2. Pulsante vero**

```html
<button type="button">Invia richiesta</button>
```

`button` risponde a Invio e Spazio, ha un nome accessibile dal testo e un ruolo corretto. Il gestore va aggiunto come listener JavaScript su `click`, valido anche per attivazioni da tastiera.

**3. Colori contrastati**

```css
.text-sicuro {
  color: #1f2937;      /* testo */
  background: #ffffff; /* sfondo: rapporto circa 14:1 */
}
```

Se devi colorare un messaggio, usa `#991b1b` su bianco per l'errore: supera abbondantemente 4.5:1. Verifica sempre la coppia effettiva, inclusi gli sfondi semitrasparenti.

**4. Gerarchia dei titoli**

```html
<h1>Servizi</h1>
<section>
  <h2>Preventivi</h2>
  <section>
    <h3>Costi di apertura</h3>
  </section>
</section>
```

Basta inserire i livelli mancanti cambiando l'elemento, non la dimensione visiva, che resta governata dal CSS.

**5. Nome della navigazione**

```html
<nav aria-label="Navigazione secondaria">
  <a href="/blog/">Blog</a>
  <a href="/faq/">Domande frequenti</a>
</nav>
```

L'`aria-label` distingue questa landmark dalla navigazione principale, così chi usa l'elenco dei landmark sa quale è quale.

**6. Voce attiva**

```html
<nav aria-label="Principale">
  <a href="/" aria-current="page">Home</a>
  <a href="/contatti/">Contatti</a>
</nav>
```

`aria-current="page"` viene annunciata come "pagina corrente". Altri valori utili sono `step`, `location` e `true`.

</details>

## Errori comuni

- **Rimuovere l'outline del focus** senza fornire un'alternativa visibile: chi usa la tastiera perde l'orientamento.
- **Affidarsi al solo colore** per indicare errori o stati: serve anche testo o icona.
- **Usare `tabindex` positivi per riordinare i comandi**: spezza l'ordine naturale della pagina.
- **Aggiungere `role` o `aria-label` dove l'HTML nativo già basta**: crea duplicazioni e nomi incoerenti.

## In sintesi

Accessibilità significa innanzitutto struttura corretta e ordine logico del DOM. Il focus deve restare visibile e la tastiera deve coprire ogni funzione. Il contrasto va verificato sulle coppie reali di colori, non a occhio. ARIA è un'aggiunta mirata, mai un sostituto della semantica nativa.

## Fonti

- [W3C WAI – Introduzione all'accessibilità web](https://www.w3.org/WAI/fundamentals/accessibility-intro/)
- [W3C – Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C WAI – ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [W3C WAI – Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
