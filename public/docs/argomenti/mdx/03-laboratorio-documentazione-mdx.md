In questo laboratorio trasformi una cartella di appunti in una documentazione navigabile: ogni file `.mdx` diventa una pagina con titolo, data e sommario, con controlli di schema, un componente `Avviso` riutilizzabile e un plugin Rehype che aggiunge `rel="noopener"` ai link esterni. Il progetto parte da `npm create astro@latest` e finisce con una build statica verificata. Ogni passo ha un controllo eseguibile.

## Obiettivi

- Configurare Astro con l'integrazione MDX e una content collection che accetta `.mdx`.
- Scrivere frontmatter validato con Zod e usarlo nel layout.
- Creare un componente MDX riutilizzabile e mapparlo sulle immagini del contenuto.
- Aggiungere un plugin Rehype personalizzato, con test batteria sull'output.

## Passo 1: progetto e integrazione

```bash
npm create astro@latest docs-mdx -- --template minimal --no-git --no-install
cd docs-mdx && npm install
npx astro add mdx --yes
```

Il comando `astro add` installa `@astrojs/mdx` e inserisce l'integrazione in `astro.config.mjs`. Crea `src/content/documenti/` e due file `.mdx` di prova; la verifica del passo è che `npx astro dev` serva `/documenti/...` dopo il passo 3.

| Passo | File | Verifica |
| --- | --- | --- |
| 1 | `astro.config.mjs` | `astro add mdx` senza errori |
| 2 | `src/content.config.ts` | `astro check` pulito |
| 3 | `src/pages/[slug].astro` | una pagina per ogni documento |
| 4 | `src/components/Avviso.astro` | box colorato nel contenuto |
| 5 | plugin Rehype | link esterni con `rel` |

## Passo 2: collection con schema

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

export const collections = {
  documenti: defineCollection({
    loader: glob({ base: './src/content/documenti', pattern: '**/*.mdx' }),
    schema: z.object({
      titolo: z.string().max(80),
      aggiornato: z.coerce.date(),
      ordine: z.number().int().default(0),
      bozza: z.boolean().default(false),
    }),
  }),
};
```

`z.coerce.date()` accetta la data come stringa YAML e la converte in `Date`, così nel template puoi formattarla con `toLocaleDateString('it-IT')` senza parsing manuale. Aggiungi in un secondo file la stessa chiave ma senza `titolo`: `astro check` deve fallire, e questo è il controllo del passo.

## Passo 3: pagina con render e sommario

```astro
---
// src/pages/documenti/[slug].astro
import { getCollection, render } from 'astro:content';
import Documento from '../../layouts/Documento.astro';

export async function getStaticPaths() {
  const voci = await getCollection('documenti', ({ data }) => !data.bozza);
  voci.sort((a, b) => a.data.ordine - b.data.ordine);
  return voci.map((voce) => ({ params: { slug: voce.id }, props: { voce } }));
}
const { voce } = Astro.props;
const { Content, headings } = await render(voce);
---
<Documento titolo={voce.data.titolo} aggiornato={voce.data.aggiornato} headings={headings.filter((h) => h.depth <= 2)}>
  <Content />
</Documento>
```

Il layout riceve gli heading già estratti dal compilatore MDX: non serve un plugin per il sommario, e il filtro a `depth <= 2` evita voci nidificate inutili nella barra laterale.

## Passo 4: componente riutilizzabile nel contenuto

```mdx
{/* src/content/documenti/deploy.mdx */}
---
titolo: Deploy del sito
aggiornato: 2026-10-02
ordine: 2
---
import Avviso from '../../components/Avviso.astro'

## Requisiti

<Avviso tipo="errore">
  Il token di deploy scade ogni 90 giorni: rinnovalo prima della build.
</Avviso>

Il comando `npm run build` produce l'output in `dist/`.
```

L'import è relativo al file `.mdx`, non alla pagina che lo renderizza: è un modulo, e i percorsi si risolvono come in qualsiasi altro file JavaScript. Il componente `Avviso.astro` riceve `tipo` come prop e sceglie la classe; un valore sconosciuto va gestito con un tipo `tipo: 'nota' | 'errore'` e un default esplicito.

## Passo 5: un plugin Rehype di poche righe

```js
// plugin-esterni.mjs
import { visit } from 'unist-util-visit';

export function linkEsterni() {
  return (albero) => {
    visit(albero, 'element', (nodo) => {
      if (nodo.tagName !== 'a' || !nodo.properties?.href) return;
      if (!/^https?:/.test(nodo.properties.href)) return;
      nodo.properties.rel = ['noopener', 'noreferrer'];
      nodo.properties.target = '_blank';
    });
  };
}
```

Registralo in `astro.config.mjs` dentro `markdown.rehypePlugins` e lascia `extendMarkdownConfig: true`: così vale per MDX e per il Markdown, senza doppie configurazioni. La verifica è un test che compila una stringa e cerca l'attributo, oppure un grep sull'HTML in `dist/`:

```bash
npm run build
grep -o 'rel="noopener noreferrer"' dist/documenti/deploy/index.html | wc -l
```

## Esercizi

1. Blocca il deploy quando due documenti hanno lo stesso `ordine`, con un controllo nel passo `getStaticPaths`.
2. Aggiungi un campo `fonte` opzionale e mostralo in fondo alla pagina con un componente dedicato.
3. Sostituisci `Avviso.astro` con un componente React e idratalo con `client:visible`: cosa guadagni e cosa perdi.
4. Scrivi un test con `gray-matter` e lo schema Zod che rifiuta un frontmatter con data nel futuro.

<details>
<summary>Soluzione</summary>

1. Raccogli gli `ordine` in un `Set` durante il `map` e lancia `new Error(...)` alla prima duplicazione: la build si blocca con un messaggio leggibile.

2. Il campo `fonte: z.url().optional()` entra nello schema, il layout condiziona il blocco e il componente usa `Astro.props.fonte`; le entry senza fonte non mostrano nulla.

3. Un componente React in isola aggiunge il runtime React anche per un box statico; il guadagno è avere logica di interazione, il costo è il bundle, quindi conviene solo se serve davvero.

4. `matter.test(date)` con `z.date().max(new Date())` rende la regola dichiarativa, e il test verifica che lo schema lanci su una data futura senza avviare Astro.

</details>

## Errori comuni

- **Import con percorso dalla pagina invece che dal file**: `../components/Avviso.astro` scritto dal punto di vista di `src/pages` porta a una cartella sbagliata e la build fallisce con "Cannot find module".
- **Sommario dai titoli del template**: i titoli scritti in `.astro` fuori dal contenuto MDX non compaiono in `headings`, quindi il sommario risulta incompleto.
- **Plugin rehype applicato solo a Markdown**: senza `extendMarkdownConfig: true` lo stesso link esterno ha `rel` solo nelle `.md`.
- **Data come stringa**: senza `z.coerce.date()` la prop resta una stringa e i metodi `Date` nel template lanciano a runtime.
- **Componente importato e mai usato**: JSX richiede il nome in scope, ma un import inutilizzato non dà errore e il componente "mancante" è solo assente dall'HTML.

## In sintesi

Il laboratorio collega i tre pezzi di MDX in produzione: il compilatore che produce componenti, la collection che valida il frontmatter, e la pipeline rehype che normalizza l'HTML generato. Il contenuto resta Markdown per il 90 percento delle righe, con componenti inseriti solo dove serve un comportamento diverso. La build statica pubblica tutto in `dist/`, e i controlli aggiunti nei passi diventano test di regressione per i contenuti futuri.

## Fonti

- [Astro Docs - MDX Integration](https://docs.astro.build/en/guides/integrations-guide/mdx/)
- [Astro Docs - Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [MDX - Troubleshooting MDX](https://mdxjs.com/docs/troubleshooting-mdx/)
- [MDX - Extending MDX](https://mdxjs.com/docs/extending-mdx/)
