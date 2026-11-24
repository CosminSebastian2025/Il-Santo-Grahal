Prima di Flexbox e Grid, impaginare una pagina richiedeva float, trucchi sui margini negativi e contorni vuoti: layout che si rompevano facilmente e codice difficile da mantenere. Oggi due sistemi sostengono quasi tutta l'impaginazione moderna, con responsabilità complementari: Flexbox dispone gli elementi lungo un asse, Grid costruisce una griglia bidimensionale. In questa lezione impari quando usare uno, quando l'altro e come combinarli, con esempi tratti da interfacce reali.

## Obiettivi

- Distinguere il modello di Flexbox da quello di Grid e scegliere il più adatto.
- Controllare direzione, allineamento e spaziatura con `justify-content`, `align-items` e `gap`.
- Definire tracce di griglia con `fr`, `minmax()` e `repeat()`.
- Posizionare elementi senza uscire dal flusso, anche in aree nominate.
- Compiere scelte di layout corrette per componenti e per pagine.

## Scegliere il sistema giusto

La regola più utile è breve: **una dimensione, Flexbox; due dimensioni, Grid**. Se gli elementi si dispongono in fila o in colonna e la seconda dimensione è conseguenza (altezza dell'elemento più alto in una barra), Flexbox è la scelta naturale. Se devo decidere sia righe sia colonne, per esempio una dashboard o un catalogo a schede, Grid esprime l'intento in modo diretto.

| Esigenza | Sistema | Proprietà chiave |
|:---------|:--------|:-----------------|
| barra di navigazione | Flexbox | `display: flex`, `gap` |
| elenco di schede che va a capo | Grid | `repeat(auto-fit, minmax(...))` |
| centrare un elemento nel contenitore | Flexbox o Grid | `justify-content`, `align-items` |
| layout di pagina con header, main, aside, footer | Grid | `grid-template-areas` |
| distribuire spazio tra pochi elementi | Flexbox | `flex: 1` |
| dimensionare colonne proporzionali | Grid | unità `fr` |

Entrambi i sistemi devono essere considerati contenitori: le proprietà di layout si applicano al genitore e agiscono sui figli diretti.

## Flexbox in pratica

Un contenitore `display: flex` dispone i figli lungo l'asse principale, orizzontale per impostazione predefinita. `justify-content` distribuisce lo spazio lungo quell'asse, `align-items` allinea sulla trasversale, `gap` crea distanze uniformi senza margini manuali. La direzione si cambia con `flex-direction`, e questo rende più semplice costruire layout verticali al passaggio a schermi stretti.

```css
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.toolbar .spacer { flex: 1 1 auto; }

.card-body {
  flex: 1 1 auto;    /* cresce, si restringe, parte dalla dimensione del contenuto */
  min-width: 0;      /* evita overflow del testo in un figlio flex */
}
```

L'attributo `flex` è una scorciatoia per `grow`, `shrink` e `basis`. Il valore `flex: 1` equivale a `1 1 0%` e distribuisce lo spazio in parti uguali. Un dettaglio che sorprende molti sviluppatori: i figli flex hanno `min-width: auto`, quindi un elemento con testo lungo può impedire il restringimento; impostare `min-width: 0` risolve il problema. La proprietà `flex-wrap` consente ai figli di andare a capo e, combinata con `gap`, è spesso sufficiente per layout "a schede" senza media query.

## Grid in pratica

Grid lavora con righe e colonne dichiarate dal contenitore. L'unità `fr` distribuisce lo spazio libero, `minmax()` definisce un intervallo di dimensioni per una traccia, `repeat()` evita ripetizioni. La tecnica `repeat(auto-fit, minmax(240px, 1fr))` è uno dei pattern più utili: crea tutte le colonne che entrano nel contenitore senza scendere sotto 240px, e quelle in più vengono eliminate automaticamente.

```css
.galleria {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.campo {
  grid-column: 1 / -1;  /* occupa tutte le colonne, dalla prima all'ultima */
  grid-row: span 2;     /* occupa due righe */
}
```

Per i layout di pagina le aree nominate rendono esplicito l'intento e permettono di riorganizzare tutto in un punto solo:

```css
.layout {
  display: grid;
  grid-template-areas:
    "header header"
    "aside  main"
    "footer footer";
  grid-template-columns: minmax(200px, 240px) 1fr;
  gap: 1.5rem;
}

.layout > header { grid-area: header; }
.layout > aside  { grid-area: aside; }
.layout > main   { grid-area: main; }
.layout > footer { grid-area: footer; }

@media (max-width: 640px) {
  .layout {
    grid-template-areas: "header" "main" "aside" "footer";
    grid-template-columns: 1fr;
  }
}
```

Il riordino su schermi stretti avviene solo ridichiarando le aree, mentre la struttura del contenuto resta la stessa. Attenzione: `order` e il posizionamento in aree diverse cambiano l'ordine visivo, non quello del DOM, quindi non vanno usati per spostare controlli che devono restare in sequenza logica da tastiera.

## Allineamento, spazio e contenuto

Le proprietà `justify-*` e `align-*` hanno nomi simili nei due sistemi ma assi diversi. In Grid `justify-content` distribuisce l'intera griglia quando le tracce non riempiono il contenitore; `justify-items` allinea il contenuto di ogni cella. In Flexbox `justify-content` lavora sull'asse principale e `align-items` su quello trasversale. `gap` è supportato da entrambi ed è sempre preferibile ai margini perché crea spazio solo tra gli elementi, non ai bordi.

Per i contenuti che devono restare centrati e leggibili, una combinazione robusta è un contenitore Grid con `justify-content: center` e una larghezza massima in `ch` per il testo. Infine, Flexbox e Grid convivono: un `nav` flex dentro un `main` di una griglia è un caso del tutto ordinario e non contraddittorio.

## Errori comuni

- **Applicare le proprietà di Flexbox o Grid a un elemento che non è il contenitore diretto**: le regole sui figli sono ignorate.
- **Dimenticare `min-width: 0` sui figli flex con testo lungo**: il contenuto impedisce il restringimento e crea overflow.
- **Usare margini tra le tracce Grid invece di `gap`**: gli spazi diventano irregolari ai bordi e nei layout che vanno a capo.
- **Riordinare con `order` controlli interattivi**: l'ordine visivo diverge da quello di tastiera e confonde chi naviga senza mouse.

## In sintesi

Flexbox dispone lungo un asse ed eccelle in barre, liste e componenti. Grid costruisce tracce bidimensionali ed è ideale per pagine e gallerie. `gap`, `fr` e `minmax()` riducono la necessità di media query. Le due tecniche si combinano, ma l'ordine logico del DOM va sempre preservato.

## Fonti

- [MDN – Concetti di base del Flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox)
- [MDN – Concetti di base del Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout)
- [CSS Flexible Box Layout Module Level 1](https://www.w3.org/TR/css-flexbox-1/)
- [CSS Grid Layout Module Level 1](https://www.w3.org/TR/css-grid-1/)
