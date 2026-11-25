Un file `.mdx` isolato non basta: per usarlo in un sito servono un'integrazione per il bundler, una pipeline di plugin e una convenzione per mappare i tag del contenuto sui componenti del progetto. Con Astro la strada è `@astrojs/mdx` (8.1.x) più le content collections; con React puro è `@mdx-js/rollup` o `@mdx-js/esbuild`. In questa lezione configuri la pipeline, estendi la sintassi con remark e rehype, e sostituisci i tag con componenti personalizzati.

## Obiettivi

- Aggiungere MDX a un progetto Astro e usarlo in una content collection tipizzata.
- Ordinare la pipeline: parse, remark (AST Markdown), rehype (AST HTML), compilazione JSX.
- Applicare plugin mirati per GFM, titoli con ID e link esterni sicuri.
- Sostituire elementi Markdown con componenti tramite mapping invece di riscrivere il contenuto.

## Installazione e prima pagina

In Astro l'integrazione si aggiunge con il comando dedicato, che installa il pacchetto e modifica `astro.config.mjs`. Da quel momento ogni `.mdx` sotto `src/pages` diventa una route, esattamente come un `.astro`.

```bash
npx astro add mdx
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx({
    syntaxHighlight: 'shiki',
    extendMarkdownConfig: true,
    optimize: false, // alza il valore solo con molte pagine: l'HTML può risultare meno escapato
  })],
});
```

`extendMarkdownConfig: true` è il default e fa sì che le opzioni dei plugin dichiarate per il Markdown in Astro valgano anche per MDX. Se un progetto ha le due pipeline separate, i contenuti si comportano in modo diverso per lo stesso identico testo, ed è uno dei bug più confusi da trovare.

| Opzione | Default | Effetto |
| --- | --- | --- |
| `extendMarkdownConfig` | `true` | eredita i plugin di `markdown` in `astro.config` |
| `syntaxHighlight` | `'shiki'` | evidenzia i blocchi di codice |
| `optimize` | `false` | rehype interno per build più rapide |
| `gfm` | `true` | attiva GitHub Flavored Markdown |

## La pipeline in ordine

Il file attraversa più fasi con alberi diversi: `micromark` produce l'AST Markdown, `remark` lo trasforma, `rehype` trasforma l'AST HTML e infine `recma` può ritoccare il JavaScript generato. Sapere in quale fase agisce un plugin evita l'errore classico: un plugin rehype non vede i nodi Markdown, e uno remark non può aggiungere attributi a un elemento HTML già prodotto.

| Fase | Ecosistema | Esempio di plugin | Tipico uso |
| --- | --- | --- | --- |
| parse | micromark | estensioni sintassi | tabelle, note |
| Markdown | remark | `remark-gfm` | tabelle, caselle, pedice |
| HTML | rehype | `rehype-slug` | ID sui titoli, link esterni |
| JSX | recma | rehype interno | ottimizzazioni output |

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';

export default defineConfig({
  markdown: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] },
  integrations: [mdx()],
});
```

Con `rehypeSlug` ogni `## Titolo` ottiene un `id` stabile, e la pagina può mostrare un sommario costruito dagli heading restituiti dal render della entry. In un sito reale la pipeline non è fine a se stessa: serve a normalizzare l'HTML prodotto da decine di autori, e ogni plugin aggiunto va pesato perché viene eseguito su ogni file a ogni build.

Un albero Markdown molto ripetitivo si accorcia con la mappa dei componenti: `unified()` può ricevere `components: { img: LazyImg }`, così un nodo prodotto da `![alt](foto.jpg)` viene reso con il componente indicato senza toccare il testo. Nell'uso quotidiano con Astro si preferisce spesso il componente esplicito, perché non richiede un file di configurazione e rende visibile nel sorgente quale immagine viene ottimizzata. `img` e `a` diventano componenti che aggiungono caricamento lazy, dimensioni e `rel` sugli URL esterni; il resto del contenuto resta Markdown normale.

```mdx
{/* src/pages/guida.mdx */}
import { Image } from 'astro:assets'
import Foto from '../assets/schema.png'
import { Avviso } from '../components/Avviso'

# Guida al deploy

<Avviso tipo="nota">Il build fallisce se una variabile d'ambiente manca.</Avviso>

<Image src={Foto} alt="Flusso di deploy" width={640} />

Testo Markdown con una [fonte esterna](https://example.org/doc).
```

I componenti importati nel corpo funzionano perché MDX li tratta come variabili nel modulo: il nome deve esistere, non c'è risoluzione automatica per cartella. In Astro un componente `.mdx` può anche importare `.astro`, quindi l'editor di contenuto non è obbligato a passare per React.

## Mapping dei tag su componenti

La mappa dei componenti si passa all'albero in fase di render, non alla configurazione: in React il provider di `@mdx-js/react` riceve `components` con chiavi come `img: LazyImg`, e un'immagine Markdown diventa `<LazyImg />` senza modificare il testo. In Astro l'ecosistema preferisce componenti importati esplicitamente, perché il file dichiara quali asset passano dalla pipeline di ottimizzazione; la mappa resta utile quando lo stesso Markdown arriva da autori esterni e non si vuole chiedere loro di scrivere JSX.

## Errori comuni

- **Passare plugin nel posto sbagliato**: in Astro `remarkPlugins` e `rehypePlugins` non sono più opzioni di `mdx()`; vanno nella chiave `markdown` di `astro.config`, oppure in un `unified()` esplicito con `extendMarkdownConfig: false`.
- **Collegare due pipeline diverse**: Markdown e MDX con plugin diversi producono titoli con ID in una pagina e senza nell'altra, e i link `#ancora` si rompono solo in metà del sito.
- **Attivare `optimize` per default**: l'ottimizzazione migliora i tempi di build ma può emettere HTML meno escapato, da valutare con contenuti non fidati.
- **Importare un componente e dimenticarne l'uso**: il bundler lo elimina, ma l'errore si vede solo come voce mancante nel rendering, non come errore di compilazione.
- **Usare attributi HTML in React**: `class`, `for` e `tabindex` non sono validi alias in JSX, e MDX non li converte.

## In sintesi

MDX si integra con una configurazione breve ma con un ordine preciso: integrazione per il bundler, plugin remark per la sintassi, plugin rehype per l'HTML, componenti importati per l'interattività. Il mapping dei tag permette di migliorare immagini e link senza riscrivere i contenuti, e l'ereditarietà dalla configurazione Markdown garantisce che i due formati producano lo stesso risultato.

## Fonti

- [Astro Docs - MDX Integration](https://docs.astro.build/en/guides/integrations-guide/mdx/)
- [MDX - Extending MDX](https://mdxjs.com/docs/extending-mdx/)
- [MDX - Using MDX](https://mdxjs.com/docs/using-mdx/)
- [Astro Docs - Markdown Content](https://docs.astro.build/en/guides/markdown-content/)
