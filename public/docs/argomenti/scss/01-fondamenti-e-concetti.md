SCSS è la sintassi più diffusa di Sass: un linguaggio che si compila in CSS e aggiunge variabili, annidamento, mixin, funzioni e un sistema di moduli. Non è un sostituto del CSS ma un suo preprocessore: il browser riceve CSS finale, quindi ogni astrazione deve produrre selettori sensati. Questa lezione copre la sintassi di base, le variabili con i loro limiti e il passaggio dai vecchi `@import` globali ai moduli `@use`/`@forward`.

## Obiettivi

- Distinguere SCSS da Sass indentato e riconoscere cosa il preprocessore aggiunge al CSS.
- Usare variabili Sass e capire quando conviene una custom property CSS.
- Annidare i selettori con misura, senza gonfiare la specificità.
- Organizzare i file con `@use` e `@forward` invece di `@import`.
- Compilare con Dart Sass e leggere l'output generato.

## Sintassi e compilazione

SCSS usa la sintassi a graffe e punto e virgola, un sovrainsieme del CSS: qualsiasi foglio CSS valido è SCSS valido. Il compilatore di riferimento è Dart Sass, distribuito come pacchetto npm `sass`; la versione stabile corrente è la 1.108. La compilazione da riga di comando produce un CSS leggibile e una source map.

```bash
npm install --save-dev sass
npx sass src/scss/main.scss dist/css/main.css --style=compressed --source-map
npx sass --watch src/scss/main.scss:dist/css/main.css
```

```scss
// src/scss/main.scss
$raggio: 8px;
$colore-testo: #1f2933;

.card {
  border-radius: $raggio;
  color: $colore-testo;
  padding: 1rem 1.25rem;

  &.card--attiva {
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.4);
  }
}
```

| Elemento | Example | Nota |
| --- | --- | --- |
| variabile | `$raggio: 8px;` | sostituita in compilazione |
| annidamento | `.card { &:hover { … } }` | `&` è il selettore padre |
| commento | `// nota` | non arriva nel CSS |
| interpolazione | `#{$nome}-btn` | stringhe nei selettori |
| file parziale | `_token.scss` | non genera output da solo |

## Variabili e costanti: Sass contro custom property

Le variabili Sass sono costanti di compilazione: vengono sostituite nel CSS prodotto e non esistono a runtime, quindi non possono cambiare con `:hover`, un media query o un tema scuro. Le custom property CSS (`--raggio`) funzionano a runtime e si possono sovrascrivere per contesto. La combinazione più solida usa Sass per calcolare i valori e le custom property per esporli.

```scss
$spazi: (0: 0, 1: 0.25rem, 2: 0.5rem, 3: 0.75rem, 4: 1rem);

:root {
  @each $nome, $valore in $spazi {
    --spazio-#{$nome}: #{$valore};
  }
  --colore-primario: #2563eb;
}

.tema-scuro {
  --colore-primario: #60a5fa;
}

.btn {
  gap: var(--spazio-2);
  background: var(--colore-primario);
}
```

Nell'esempio le mappe Sass restano nel codice sorgente, mentre l'output contiene solo le custom property che il browser può cambiare. `lighten()` e `darken()` sono deprecate: per le trasformazioni di colore si usano `color.adjust()`, `color.scale()` e `color.mix()` dal modulo `sass:color`.

## Annidamento, specificità e moduli

L'annidamento comodo ma pericoloso è quello che rispecchia interamente la struttura DOM: `#app .page .sidebar .menu .item a` ha una specificità che nessun override successivo batterà senza ripeterla. La regola di lavoro è annidare al massimo due livelli e usare `&` per modificatori e stati, non per scendere nell'albero.

```scss
// da evitare
.nav { ul { li { a { color: inherit; } } } }

// preferibile: BEM con annidamento piatto
.nav__link {
  color: inherit;

  &:hover,
  &:focus-visible { color: var(--colore-primario); }

  &--attivo { font-weight: 600; }
}
```

Dalla versione 1.80 Sass ha deprecato `@import`: i file si caricano con `@use` (namespace privato) o `@forward` (riesporta per chi usa il modulo). I nomi diventano espliciti, come `token.$raggio`, e ogni file vede solo ciò che importa.

| Direttiva | Visibilità | Uso |
| --- | --- | --- |
| `@import "x"` | globale, deprecata | ereditata dai progetti vecchi |
| `@use "x";` | namespace `x.$var` | dipendenze di un file |
| `@use "x" as t;` | namespace `t` | alias corti |
| `@use "x" as *;` | globale nel file | solo per librerie piccole |
| `@forward "x";` | riesporta | file indice di una cartella |
| `@use "sass:color"` | integrato | funzioni colore moderne |

```scss
// src/scss/_index.scss
@forward "tokens";
@forward "mixins";

// src/scss/components/_button.scss
@use "../index" as ds;
@use "sass:color";

.btn {
  padding: ds.$spazio-2 ds.$spazio-4;
  border-radius: ds.$raggio;
  background: ds.$primario;
  &:hover { background: color.scale(ds.$primario, $lightness: -10%); }
}
```

## Errori comuni

- **Aspettarsi che una variabile Sass cambi con il tema**: `$primario` è cotto nel CSS compilato; per i temi servono custom property.
- **Annidare come il DOM**: produce selettori lunghissimi e specificità difficile da battere; usa BEM o classi piatte.
- **Mescolare `@import` e `@use` nello stesso progetto**: ogni file con `@import` perde il namespace e riapre il rischio di nomi duplicati; migra un file alla volta.
- **Usare `lighten`/`darken`**: sono deprecate e verranno rimosse; sostituisci con `color.scale` o `color.mix`.
- **`&` attaccato al testo senza motivo**: `.blocco { &--grande {} }` è corretto, `.blocco { & .titolo {} }` è solo un modo più lungo per `>` implicito, spesso indesiderato.

## In sintesi

SCSS aggiunge un livello di programmazione al CSS, ma il risultato che conta è sempre il CSS emesso. Le variabili Sass sono costanti di compilazione, le custom property sono valori runtime: usarle insieme dà flessibilità senza perdere calcolo. L'annidamento serve per stati e modificatori, non per ricopiare il DOM. Il sistema `@use`/`@forward` sostituisce l'import globale e rende esplicite le dipendenze tra file.

## Fonti

- [Sass - Documentation](https://sass-lang.com/documentation/)
- [Sass - Variables](https://sass-lang.com/documentation/variables/)
- [Sass - @use](https://sass-lang.com/documentation/at-rules/use/)
- [Sass - @import deprecation](https://sass-lang.com/documentation/breaking-changes/import/)
