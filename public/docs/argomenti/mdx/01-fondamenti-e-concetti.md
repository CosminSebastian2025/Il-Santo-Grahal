MDX è il formato che mette Markdown e JSX nello stesso file: il testo resta leggibile come Markdown, ma dentro la pagina puoi importare componenti React, Vue o Astro, usare espressioni JavaScript e dichiarare export ESM. Nella ecosistema attuale la catena di riferimento è `@mdx-js/mdx` 3.1.x, che compila il file in un modulo JavaScript; Astro e Next.js lo usano tramite le rispettive integrazioni. In questa lezione impari la sintassi, il risultato della compilazione e le regole che rendono un `.mdx` prevedibile.

## Obiettivi

- Scrivere MDX misto Markdown, JSX, espressioni ed export ESM senza rompere il parsing.
- Capire cosa produce il compilatore e perché MDX è ESM e non un formato dichiarativo.
- Distinguere ciò che viene valutato a build time da ciò che arriva al browser.
- Conoscere le differenze di sintassi rispetto a Markdown e HTML.

## Sintassi: quattro linguaggi nello stesso file

MDX non è Markdown "con qualche tag": è un superset in cui il parser passa da testo a JavaScript in punti precisi. Le parentesi graffe aprono espressioni, le parentesi angolari aprono JSX, `import` ed `export` stanno in cima e valgono per tutto il documento.

```mdx
import { Callout } from './components/Callout'
import dati from './dati.json'

export const titolo = 'Rilascio 3.1'

# {titolo}

Il pacchetto pesa **{dati.peso} kB** gzip.

<Callout tipo="attenzione">
  Questo blocco è JSX: le parentesi graffe interne valutano JavaScript.
</Callout>

- [ ] pubblicare il changelog
- [x] aggiornare gli esempi
```

Il primo titolo non è testo fisso: `# {titolo}` viene compilato in un header il cui figlio è la variabile esportata. La tabella con le caselle `[ ]` e `[x]` è una estensione GFM e richiede `remark-gfm`, che non è attiva per default in `@mdx-js/mdx`.

| Elemento | Sintassi | Valutato quando |
| --- | --- | --- |
| Markdown | `**grasso**`, `[link](url)` | compilazione |
| Espressione | `{1 + 1}` | render, nel componente |
| JSX | `<Box a={1} />` | render |
| Export ESM | `export const meta = {...}` | caricamento del modulo |
| Import ESM | `import X from './x.js'` | caricamento del modulo |

## Cosa produce il compilatore

Il formato nasce dalla esigenza di tenere contenuti e componenti nello stesso file; la specifica è oggi mantenuta dal progetto MDX, che distribuisce solo il compilatore: il rendering è delegato al framework. `compile()` restituisce codice JavaScript che esporta una funzione componente, oppure con `outputFormat: 'function-body'` un corpo eseguibile senza import. Capire questa forma aiuta a diagnosticare gli errori: tutto ciò che è testo diventa alberi di elementi, e le espressioni diventano il loro contenuto. Nella forma `function-body` la prima riga destruttura il runtime JSX dagli argomenti: `const { jsx: _jsx, jsxs: _jsxs } = arguments[0];`.

```js
import { compile } from '@mdx-js/mdx';

const sorgente = '# Ciao {nome}\n\n<Box info="x" />';
const codice = await compile(sorgente, { development: true }); // jsxDEV e nomi leggibili
console.log(String(codice).slice(0, 200));
```

Il risultato dipende dalle opzioni: con `development: true` compaiono chiamate `jsxDEV` con riferimenti alla posizione nel file, in produzione si usano `_jsx` e `_jsxs`. Non c'è HTML: l'output è un modulo, quindi MDX non può essere servito senza un bundler o un runtime che lo compili. L'opzione `jsx: false` produce invece un albero AST manipolabile con `recma`, utile quando il contenuto va analizzato e non eseguito.

```js
import { compile, run } from '@mdx-js/mdx';

const codice = String(await compile('Ciao **mondo**', { outputFormat: 'function-body' }));
const { default: Componente } = await run(codice, { baseUrl: import.meta.url });
// Componente è un componente; nell'AST si può ispezionare prima di renderizzare
```

`run()` esegue il modulo in un ambiente controllato e accetta `baseUrl` per risolvere gli import relativi. In un'applicazione di norma non si usa direttamente: il bundler carica il `.mdx` come modulo e la build fa il resto.

## Confine tra build e browser

Import ed export sono valutati quando il modulo viene caricato, cioè in build nel caso di un sito statico. Le espressioni dentro il corpo possono contenere codice arbitrario, incluso l'accesso a `window`: se il componente viene renderizzato durante il build, quel codice gira sul server e fallisce.

```mdx
export const dataBuild = new Date().toISOString() // fissata al momento della build

{/* commento JSX: non compare nell'HTML */}

Il documento è stato generato il {dataBuild}.
```

Per questo gli utilizzatori in Astro e Next.js spingono a tenere l'MDX "puro": dati nel frontmatter o in un export statico, componenti importati, niente side effect nel corpo. Se serve interattività, si importa un componente e gli si passa uno stato serializzabile, lasciando che sia il framework a decidere dove idratare.

## Errori comuni

- **Sintassi HTML al posto di JSX**: in MDX `<img>` va chiuso come `<img />`, gli attributi `class` diventano `className` in React, e i commenti HTML `<!-- -->` non existono.
- **Parentesi angolari nel testo**: scrivere `a < b` è tollerato solo in alcuni contesti; la forma robusta è `a \< b` o `{'<'}`. Anche `{` va escapato come `\{`.
- **Autolink senza parentesi**: gli URL nudi non diventano link automaticamente, perché `https://...` è ambiguo con JSX; usa `[testo](url)`.
- **Aspettarsi HTML dall'output**: MDX si compila in un modulo, non in markup; senza bundler o `run()` non c'è nulla da servire.
- **Dipendere dal fuso orario in un export**: `new Date()` nel modulo viene valutato a build time, e la data cambia il risultato di ogni build anche se il contenuto non è cambiato.
- **Leggere `<` o `{` nel testo senza escape**: un `{` non aperto da JavaScript non chiuso inizia un'espressione e il parser si ferma sulla riga successiva, con un errore che punta lontano dalla causa reale.

## In sintesi

MDX estende Markdown con JSX, espressioni ed ESM mantenendo il testo leggibile. La compilazione produce un modulo JavaScript componente, e quindi il formato richiede un bundler o un runtime. Import ed export esistono in fase di caricamento del modulo, il corpo viene valutato al render: confondere i due momenti è la causa più frequente dei problemi di build e di idratazione.

## Fonti

- [MDX - What is MDX](https://mdxjs.com/docs/what-is-mdx/)
- [MDX - Using MDX](https://mdxjs.com/docs/using-mdx/)
- [MDX - @mdx-js/mdx](https://mdxjs.com/packages/mdx/)
- [MDX - Extending MDX](https://mdxjs.com/docs/extending-mdx/)
