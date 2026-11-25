In questo laboratorio costruisci **`ui-kit`**, un sistema di stile SCSS per un blog tecnico: token, mixin responsive, componenti (bottone, card, badge) e utilità generate da mappe, con pagina demo e verifica automatica dell'output CSS. Parti da una cartella vuota, arrivi a una build compilata da Dart Sass che produce un solo `main.css`, e controlli con `npm run build` più due test: uno sulle dimensioni del CSS e uno sulla presenza delle classi attese. Il percorso è quello che faresti in un progetto nuovo, senza framework CSS già pronti.

## Obiettivi

- Inizializzare il progetto con Dart Sass e la struttura a cartelle in moduli.
- Definire token (colori, spazi, breakpoint) e mixin `respond-to` con `@content`.
- Costruire componenti con BEM e `&`, più utilità generate con `@each`.
- Implementare il tema chiaro/scuro con custom property.
- Verificare l'output con `npm run build` e controlli sull'HTML demo.

## Setup e struttura

```bash
mkdir ui-kit && cd ui-kit
npm init -y
npm install --save-dev sass
```

```scss
// src/scss/main.scss — solo import di moduli, nessuna regola
@use "tokens";
@use "mixins";
@use "base";
@use "components/button";
@use "components/card";
@use "components/badge";
@use "utilities" as *;
```

| File | Contenuto | Regole emesse |
| --- | --- | --- |
| `abstracts/_tokens.scss` | mappe colore/spazio/breakpoint | nessuna |
| `abstracts/_mixins.scss` | `respond-to`, `focus-ring`, `centered` | nessuna |
| `base/_base.scss` | reset e tipografia | `html`, `body`, `h1` |
| `components/_button.scss` | `.btn` e modificatori | ~10 selettori |
| `utilities/_utilities.scss` | `.u-mt-*`, `.u-hide-*`, `.u-mt-*@md` | 20–40 selettori |

Il nome `abstracts/` non è convenzione pura: contiene solo variabili, funzioni e mixin, quindi non produce CSS e può essere usato da qualsiasi altro file senza rischio di ordine. `main.scss` è l'unico file che emette output.

## Token, mixin e componenti

I token sono mappe, non variabili sparse: prefissare tutto con `$c-`, `$s-`, `$bp-` rende le ricerche prevedibili ma le mappe restano leggibili e iterabili.

```scss
// abstracts/_tokens.scss
@use "sass:map";

$c: (
  testo: #1f2933,
  tenue: #52606d,
  bordo: #d9e2ec,
  primario: #2563eb,
  superficie: #ffffff,
  avviso: #d97706,
  errore: #dc2626,
);

$s: (0: 0, 1: 0.25rem, 2: 0.5rem, 3: 0.75rem, 4: 1rem, 6: 1.5rem, 8: 2rem);
$bp: (sm: 576px, md: 768px, lg: 1024px);
```

I mixin usano `map.get` e `@error` per fermare la build su un breakpoint sbagliato; `@content` inietta le regole del componente dentro la media query.

```scss
// abstracts/_mixins.scss
@use "sass:map";
@use "tokens" as t;

@mixin respond-to($nome) {
  @if not map.has-key(t.$bp, $nome) { @error "Breakpoint #{$nome} inesistente"; }
  @media (min-width: map.get(t.$bp, $nome)) { @content; }
}

@mixin focus-ring($colore: t.$c-primario) {
  &:focus-visible {
    outline: 2px solid $colore;
    outline-offset: 2px;
  }
}
```

Il bottone segue BEM piatto: niente selettori discendenti profondi, un modificatore per variante e uno stato `[disabled]` che vince perché ha la stessa specificità della classe base ma un selettore di attributo più specifico.

```scss
// components/_button.scss
@use "../abstracts/mixins" as m;

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--c-bordo);
  border-radius: 6px;
  background: var(--c-superficie);
  color: var(--c-testo);
  font: inherit;
  cursor: pointer;

  @include m.focus-ring;

  &--primario {
    border-color: var(--c-primario);
    background: var(--c-primario);
    color: #fff;
  }

  &--piccolo { padding: var(--sp-1) var(--sp-3); font-size: 0.875rem; }

  &[disabled] { opacity: 0.55; cursor: not-allowed; }

  @include m.respond-to(md) { padding: var(--sp-3) var(--sp-6); }
}
```

Le custom property (`--sp-2`, `--c-primario`) sono esposte in `base` da un loop sui token: cambiano a runtime, così il tema scuro non richiede una seconda compilazione.

```scss
// base/_base.scss
@use "../abstracts/tokens" as t;
@use "sass:map";

:root {
  @each $k, $v in t.$s { --sp-#{$k}: #{$v}; }
  @each $k, $v in t.$c { --c-#{$k}: #{$v}; }
}

[data-tema="scuro"] {
  --c-testo: #e5e7eb;
  --c-tenue: #9aa5b1;
  --c-bordo: #374151;
  --c-superficie: #111827;
  --c-primario: #60a5fa;
}
```

## Utilità generate, demo e criterio di uscita

```scss
// utilities/_utilities.scss
@use "../abstracts/tokens" as t;
@use "../abstracts/mixins" as m;

@each $k, $v in t.$s {
  .u-mt-#{$k} { margin-top: $v; }
}

@each $nome in (sm, md, lg) {
  @include m.respond-to($nome) {
    .u-hide-#{$nome} { display: none !important; }
  }
}
```

La pagina demo `demo/index.html` collega `../dist/main.css`, contiene un `<button class="btn btn--primario">`, una `card` con `badge`, un paragrafo `u-mt-4` e un bottone per commutare `data-tema` sul `<html>`. Serve a vedere il risultato e a verificare che il tema si applichi a runtime.

```bash
npx sass src/scss/main.scss dist/main.css --style=compressed --no-source-map
du -h dist/main.css            # circa 4-8 KB compresso su un kit di base
grep -c "u-hide-md" dist/main.css   # >= 1
grep -c "data-tema=\"scuro\"" dist/main.css  # >= 1
```

Criterio di uscita:

1. `npx sass src/scss/main.scss dist/main.css` termina senza warning (in particolare nessuno su `@import` o `lighten`).
2. `abstracts/_mixins.scss` compilato da solo produce un file vuoto: nessuna regola nel livello abstract.
3. In `demo/index.html` il bottone cambia colore in tema scuro senza ricaricare il CSS.
4. Aggiungere una chiave in `$bp` e usare `respond-to` con quel nome funziona; un nome assente fallisce con `@error` e messaggio esplicito.

Test automatico consigliato: uno script Node che legge `dist/main.css` e verifica con `assert.match` la presenza di `.btn--primario`, `@media (min-width: 768px)` e `--c-primario`, così una regressione su un token rompe la CI.

```js
// scripts/verifica-css.mjs — lanciato da "pretest"
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const css = readFileSync("dist/main.css", "utf8");
assert.match(css, /\.btn--primario/);
assert.match(css, /@media \(min-width: 768px\)/);
assert.match(css, /--c-primario:#/);
assert.ok(css.length < 40_000, `CSS troppo grande: ${css.length} byte`);
console.log(`ok: ${css.length} byte`);
```

`scripts/verifica-css.mjs` gira in pochi millisecondi e rende espliciti i tre contratti del kit: un componente esiste, il breakpoint `md` è stato emesso e i token sono esportati come custom property. Il limite di 40 KB è arbitrario ma utile: se le utilità esplodono, o qualcuno reintroduce `@import`, il test fallisce prima del deploy.

Se il kit finisce in un'app Vite, sostituisci i comandi npm con l'import in JavaScript (`import "./scss/main.scss"`) e lascia a Vite la compilazione; in produzione Vite rimuove il CSS non referenziato solo se il componente dichiara i propri stili, quindi valuta bene se tenere un unico `main.css` o spostare i componenti accanto al codice che li usa.

## Esercizi

1. Aggiungi un componente `badge` con varianti `info|warn|errore` generate da una mappa unica.
2. Sostituisci `@use "../abstracts/mixins"` nei componenti con un file `_index.scss` in `abstracts/` che fa `@forward`, e pulisci i percorsi.
3. Converti `.btn` da classe a placeholder `%btn` e verifica quante classi perde il CSS compilato.
4. Fai in modo che le utilità siano generate solo se presenti in `demo/index.html`, usando una lista `$utility-usate`.
5. Aggiungi una funzione `rem()` con validazione di unità e usala su tutta la tipografia.
6. Misura la build con `--style=expanded` e `--style=compressed` e confronta i byte prima e dopo il passaggio a custom property.

<details>
<summary>Soluzione</summary>

1. `$badge: (info: #2563eb, warn: #d97706, errore: #dc2626)` e un `@each` che genera `.badge--#{$k}` con `background: color-mix(in srgb, #{$v} 12%, white)`.

2. `abstracts/_index.scss` con `@forward "tokens"; @forward "mixins";` e nei componenti `@use "../abstracts" as a;`, chiamando `a.respond-to(md)`.

3. Con `%btn` il CSS mantiene solo le regole realmente estese; se nessun selettore estende, il placeholder sparisce e si riducono i byte, ma si perde la possibilità di usarlo dal markup.

4. `$utility-usate: (mt: (0, 2, 4), hide: (md, lg))` e un `@each` annidato che legge le coppie: il CSS generato scende di colpi.

5. `@function rem($px, $base: 16) { @if math.unit($px) != "px" { @error "px richiesti"; } @return math.div($px, $base) * 1rem; }` e tipografia come `rem(16px)`.

6. `compressed` riduce gli spazi e rimuove i commenti; le custom property aggiungono qualche byte al `:root` ma eliminano la duplicazione della palette nei componenti, quindi il guadagno cresce con il numero di componenti.

</details>

## Errori comuni

- **Mettere regole dentro `abstracts/`**: quel livello viene caricato da ogni modulo e le regole si duplicano nell'output.
- **Ordinare male `main.scss`**: se `utilities` precede `components`, le utilità perdono contro le regole dei componenti a parità di specificità.
- **Generare un'utilità per ogni combinazione**: 7 spazi × 3 breakpoint × 6 proprietà sono 126 classi; si generano solo quelle necessarie.
- **Dimenticare `!important` sulle utilità di visibilità**: `.u-hide-md` deve vincere sui componenti, oppure va gestita la specificità con una classe più mirata.
- **Il tema scuro applicato al `<body>` e non al `<html>`**: le custom property definite su `:root` continuano a vincere per gli elementi fuori dal body.

## In sintesi

Un sistema SCSS sano ha tre livelli separati: abstract senza output, componenti che usano mixin e custom property, utilità generate e limitate. I token come mappe permettono `@each` controllati e funzioni che falliscono su input invalidi, mentre il tema scuro diventa una ricolorazione di variabili a runtime. Il criterio di uscita non è "sembra bello" ma "la build non ha warning, l'output contiene solo ciò che serve e i token sono verificati da uno script".

## Fonti

- [Sass - CLI (dart-sass)](https://sass-lang.com/documentation/cli/dart-sass/)
- [Sass - @forward](https://sass-lang.com/documentation/at-rules/forward/)
- [Sass - Style rules and nesting](https://sass-lang.com/documentation/style-rules/declarations/)
- [Sass - Modules](https://sass-lang.com/documentation/modules/)
