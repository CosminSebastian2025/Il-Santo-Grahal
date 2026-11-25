Con i fondamenti di SCSS si scrive CSS più breve; con mixin, funzioni e loop si costruisce un sistema di stile che si mantiene nel tempo. Questa lezione affronta i costrutti che fanno la differenza in un progetto medio-grande: mixin con argomenti e blocchi `@content`, funzioni personalizzate, strutture di controllo, `@extend` e `@at-root`, più l'architettura dei file con `@forward` e gli indice di cartella. L'obiettivo è produrre CSS piccolo, prevedibile e senza duplicazioni selvagge.

## Obiettivi

- Scrivere mixin con argomenti di default, keyword arguments e `@content`.
- Creare funzioni `@function` che restituiscono valori e validarli.
- Generare utility e varianti responsive con `@each` e mappe.
- Scegliere tra `@extend` e mixin con criteri concreti.
- Organizzare una struttura `7-1` semplificata con file indice.

## Mixin, funzioni e controllo di flusso

Un mixin è un blocco CSS riutilizzabile con parametri; una funzione restituisce un valore e si usa dentro le dichiarazioni. La distinzione è netta: se il risultato è una proprietà, è un mixin; se è un valore da calcolare, è una funzione. Gli argomenti possono avere default e si passano per nome, il che rende leggibili le chiamate con molti parametri.

```scss
@use "sass:math";
@use "sass:map";

$breakpoints: (sm: 576px, md: 768px, lg: 1024px, xl: 1280px);

@mixin respond-to($bp) {
  @if not map.has-key($breakpoints, $bp) {
    @error "Breakpoint sconosciuto: #{$bp}";
  }
  @media (min-width: map.get($breakpoints, $bp)) { @content; }
}

@mixin focus-ring($colore: currentColor, $spessore: 2px) {
  outline: $spessore solid $colore;
  outline-offset: 2px;
}

@function rem($px, $base: 16) {
  @if math.unit($px) != "px" { @error "rem() vuole px, ricevuto #{$px}"; }
  @return math.div($px, $base) * 1rem;
}

.btn {
  font-size: rem(15px);
  @include focus-ring($colore: #2563eb);
  @include respond-to(md) { font-size: rem(16px); }
}
```

`@content` permette al chiamante di iniettare dichiarazioni dentro il mixin, ed è ciò che rende `respond-to` utile: il mixin possiede la media query, il chiamante possiede le regole. `@error` blocca la compilazione con un messaggio, cosa molto più efficace di un valore silenziosamente sbagliato.

| Costrutto | Restituisce | Quando usarlo |
| --- | --- | --- |
| `@mixin` | dichiarazioni CSS | gruppi di proprietà ripetuti |
| `@function` | un valore | calcoli, validazioni, palette |
| `@each` | iterazione | generazione utility da mappe |
| `@for` | iterazione numerica | scale di spaziatura o z-index |
| `@if` / `@else` | rami | varianti e guardie |
| `@error` / `@warn` | diagnostica | input non validi |

## Generare utility e varianti con i loop

Le mappe con `@each` generano classi ripetitive in modo controllato: spaziature, colori semantici, varianti di un componente. Il trucco per non esplodere il peso del CSS è generare solo ciò che il design system usa davvero.

```scss
@use "sass:map";

$colori: (
  primario: #2563eb,
  successo: #16a34a,
  pericolo: #dc2626,
);

@each $nome, $valore in $colori {
  .testo-#{$nome} { color: $valore; }

  .btn--#{$nome} {
    background: $valore;
    color: #fff;

    &:hover { filter: brightness(0.92); }
  }
}
```

Per le media query responsive si costruisce una mappa di proprietà e valori e si itera anche sui breakpoint: si ottiene `.grid--md-2` senza scrivere a mano ogni combinazione. Attenzione alla cardinalità: 4 breakpoint per 12 colonne produce 48 classi, accettabili; 4 breakpoint per 40 utilità produce 160 classi, che conviene generare solo per quelle necessarie.

## @extend, @at-root e architettura dei file

`@extend` fonde un selettore in un altro: utile per placeholder (`%`) pensati come base di componenti, ma pericoloso perché agisce su tutti i selettori che corrispondono e può produrre liste enormi di selettori. Il criterio pratico è usare `@extend` solo con `%placeholder` dichiarati nello stesso file; per tutto il resto serve un mixin, che duplica ma resta locale e prevedibile.

```scss
%interattivo {
  cursor: pointer;
  transition: background-color 120ms ease;
}

.btn { @extend %interattivo; }
.link-azione { @extend %interattivo; }
```

`@at-root` sposta una regola alla radice, utile quando un componente deve sovrascrivere uno stile globale senza ereditare l'antenato. Sommato a `.dark` permette di scrivere varianti di tema dentro il file del componente.

```scss
@use "sass:map";

$temi: (
  chiaro: (fondo: #ffffff, testo: #1f2933),
  scuro: (fondo: #111827, testo: #e5e7eb),
);

:root {
  @each $nome, $mappa in $temi {
    &[data-tema="#{$nome}"] {
      --fondo: #{map.get($mappa, fondo)};
      --testo: #{map.get($mappa, testo)};
    }
  }
}

.card {
  background: var(--fondo);
  color: var(--testo);
  @at-root [data-tema="scuro"] & { border-color: #374151; }
}
```

L'architettura dei file segue un ordine di caricamento esplicito: token, funzioni, mixin, base, layout, componenti, utility, ciascuno in una cartella con un `_index.scss` che fa `@forward`. Il file `main.scss` contiene solo `@use` degli indici: nessun foglio viene caricato due volte, perché `@use` deduplica i moduli.

| Cartella | Contenuto | Dipendenze ammesse |
| --- | --- | --- |
| `abstracts/` | token, mixin, funzioni | nessuna altra sezione |
| `base/` | reset, tipografia | solo abstracts |
| `layout/` | griglia, container | abstracts |
| `components/` | bottoni, card | abstracts |
| `pages/` | stili specifici di pagina | tutte |
| `main.scss` | solo `@use` | tutte |

## Errori comuni

- **`@extend` dentro media query**: Sass non può estendere selettori esterni al blocco `@media` e solleva errore; in quel caso serve un mixin.
- **Mixin che emettono selettori**: un mixin con `&` non può essere incluso in contesti arbitrari; tieni i mixin limitati a dichiarazioni.
- **Loop su tutte le combinazioni**: la generazione automatica senza filtro gonfia il CSS e la build; genera solo le varianti usate.
- **Variabili globali con `@use ... as *` ovunque**: si perde la tracciabilità e i nomi collidono; riserva l'asterisco a librerie esterne piccole.
- **Funzioni che restituiscono più valori in una lista non documentata**: meglio una mappa con chiavi esplicite, così il chiamante usa `map.get`.

## In sintesi

Mixin, funzioni e loop trasformano SCSS in un linguaggio di costruzione del design system: il mixin possiede la struttura, la funzione possiede il calcolo, il loop genera le varianti. `@extend` resta confinato ai placeholder locali, `@at-root` serve per uscire dall'antenato quando un tema lo richiede. La struttura a cartelle con file indice rende esplicito l'ordine di caricamento e impedisce duplicazioni.

## Fonti

- [Sass - @mixin and @include](https://sass-lang.com/documentation/at-rules/mixin/)
- [Sass - @function](https://sass-lang.com/documentation/at-rules/function/)
- [Sass - @each](https://sass-lang.com/documentation/at-rules/control/each/)
- [Sass - @extend](https://sass-lang.com/documentation/at-rules/extend/)
