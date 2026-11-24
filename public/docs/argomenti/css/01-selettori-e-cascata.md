Chi comincia con il CSS scopre presto che due regole possono contendersi lo stesso elemento e che il risultato non è sempre quello atteso. La ragione è che il CSS non è un elenco di istruzioni da eseguire in ordine: è un insieme di dichiarazioni che il browser combina attraverso la cascata, confrontando origine, importanza e specificità. In questa lezione impari a prevedere quale valore vincerà prima ancora di aprire il browser, e a leggere il box model senza sorprese.

## Obiettivi

- Capire come la cascata risolve i conflitti tra dichiarazioni.
- Calcolare la specificità di un selettore e confrontarla con un altro.
- Scegliere tra `rem`, `em` e `%` sapendo come si propagano.
- Descrivere il box model e la differenza tra `content-box` e `border-box`.
- Prevedere l'effetto di margini, padding e `box-sizing` sul layout.

## La cascata: chi vince e perché

Quando più regole dichiarano la stessa proprietà sullo stesso elemento, il browser ricorre a un ordine preciso. Prima conta l'**importanza**: le dichiarazioni con `!important` hanno priorità, ma all'interno della stessa origine. Poi l'**origine**: gli stili dell'utente e del browser si collocano in posizioni diverse da quelli dell'autore. Infine la **specificità** e, a parità, l'**ordine di comparsa**: l'ultima dichiarazione equivalente vince.

| Livello | Esempio | Note |
|:--------|:--------|:-----|
| Stili del browser (user agent) | `h1 { font-size: 2em }` | base di partenza |
| Stili dell'utente | impostazioni del sistema | dopo quelli dell'autore |
| Stili dell'autore | `p { color: navy }` | scritti da te |
| Stili inline | `style="color: red"` | battono i fogli |
| `!important` | `color: red !important` | inverte gli ordini |

A parità di origine e importanza entra in gioco la specificità: un selettore più preciso vince sempre, indipendentemente dalla posizione nel foglio.

## Specificità e leggibilità

La specificità si esprime come una terna (identificatori, classi e attributi e pseudo-classi, elementi e pseudo-elementi). Il confronto avviene colonna per colonna, da sinistra a destra.

| Selettore | Punteggio | Commento |
|:----------|:----------|:---------|
| `p` | 0-0-1 | un elemento |
| `.nota` | 0-1-0 | una classe |
| `nav a` | 0-0-2 | due elementi |
| `.nota strong` | 0-1-1 | combinazione |
| `#main .nota` | 1-1-0 | un id |
| `a:hover` | 0-1-1 | pseudo-classe |
| `li::before` | 0-0-2 | pseudo-elemento |

Due buone abitudini riducono i conflitti: usa le classi come principale strumento di stile e evita gli `#id` nei selettori, perché pochi identici creano una barriera difficile da superare. Gli specificatori moderni `:where()` e `:is()` permettono di controllare la specificità senza alzare il punteggio: `:where()` azzera il peso di ciò che contiene, mentre `:is()` assume quello del suo argomento più specifico.

```css
/* Ogni regola qui vale 0-1-0, l'ultima vince sul bottone */
.bottone { padding: 0.75rem 1rem; }
.bottone { border-radius: 0.5rem; }

/* Il :not() non conta, il selettore interno sì */
input:not([type="submit"]) { border: 1px solid #94a3b8; }

/* Peso zero: un .bottone successivo può sovrascrivere */
:where(.bottone) { background: #1d4ed8; }
```

Le variabili CSS aiutano a centralizzare i valori, ma non toccano la cascata: ereditano come normali proprietà personalizzate e si possono sovrascrivere con la stessa logica.

## Unità, ereditarietà e valori calcolati

Le unità influenzano la leggibilità e il layout. `rem` si riferisce alla dimensione del font della radice e resta stabile; `em` si riferisce al font dell'elemento corrente e si moltiplica a ogni livello; `%` dipende dal contenitore. Per i testi usa `rem` per le dimensioni principali e `em` per spaziature proporzionali a un componente.

```css
:root { font-size: 100%; }        /* 16px tipici, rispettando le preferenze */
.card { font-size: 1.125rem; padding: 1em; }  /* padding = 18px */
.card h2 { font-size: 1.5em; }    /* 27px, perché eredita 18px */
```

L'ereditarietà vale per proprietà come `color`, `font-family` e `line-height`, ma non per `margin` e `border`. Quando una proprietà non eredita e serve nei figli, usa `inherit` in modo esplicito. Controllare `line-height` come valore senza unità è la scelta più prevedibile: si calcola sul font locale di ogni elemento.

## Il box model

Ogni elemento occupa uno spazio composto da quattro aree: contenuto, padding, bordo e margine. Con il valore predefinito `content-box`, larghezza e altezza dichiarate riguardano solo il contenuto: aggiungere 10px di padding su ogni lato rende l'elemento più largo di 20px, e questo è la fonte più comune di layout che "sborda".

```css
*, *::before, *::after { box-sizing: border-box; }

.box {
  width: 240px;
  padding: 16px;
  border: 2px solid #334155;
  margin: 8px auto;
}
```

Con `border-box` la larghezza dichiarata include padding e bordo: il blocco resta largo 240px e il contenuto si restringe. È la ragione per cui quasi tutti i fogli di stile moderni impostano il reset qui sopra. Ricorda anche la **collassazione dei margini**: due margini verticali adiacenti non si sommano, si fondono nel maggiore. Per evitare sorprese, usa padding o `gap` nei contenitori, oppure gestisci lo spazio con una classe dedicata.

## Errori comuni

- **Aggiungere `!important` per vincere una guerra di specificità**: nasconde il problema e rende ogni modifica successiva più difficile.
- **Usare gli `#id` come selettori di stile**: alza la specificità a 1-0-0 e costringe a contromisure sempre più complesse.
- **Dimenticare `border-box`**: larghezze che sommate al padding superano il contenitore e generano scroll orizzontale.
- **Aspettarsi che i margini verticali si sommino**: la collassazione fonde i valori e il risultato visivo è più piccolo del previsto.

## In sintesi

La cascata decide per origine, importanza, specificità e ordine. La specificità si compara a terne e si mantiene bassa usando le classi. Le unità relative vanno scelte in base a ciò che deve restare stabile. Il box model si governa con `box-sizing: border-box` e con una gestione esplicita degli spazi.

## Fonti

- [MDN – Cascata e ereditarietà in CSS](https://developer.mozilla.org/it/docs/Web/CSS)
- [CSS Cascading and Inheritance Level 5](https://drafts.csswg.org/css-cascade-5/)
- [Selectors Level 4](https://drafts.csswg.org/selectors-4/)
- [CSS 2.2 – The box model](https://www.w3.org/TR/CSS22/box.html)
