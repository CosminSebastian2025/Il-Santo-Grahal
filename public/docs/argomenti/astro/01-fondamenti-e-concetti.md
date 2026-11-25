Astro è un framework che parte dall'HTML e aggiunge JavaScript solo dove serve. Nella versione corrente (Astro 7, pacchetto `astro` 7.4.x) di default un progetto produce pagine statiche già pronte, senza runtime del framework nel browser; le parti interattive vengono dichiarate componente per componente con le direttive `client:*`. In questa lezione capisci struttura del progetto, file `.astro`, routing basato sui file e il confine tra HTML generato in build e isole idratate nel browser.

## Obiettivi

- Distinguere le due sezioni di un componente `.astro` (script di modulo e template) e sapere quando ogni parte viene eseguita.
- Collegare file in `src/pages/` alle URL generate, compresi parametri dinamici e `getStaticPaths`.
- Usare layout, `Astro.props` e slot per comporre pagine senza duplicare markup.
- Decidere per ogni componente se deve restare statico o diventare un'isola interattiva.

## Anatomia di un componente `.astro`

Un file `.astro` ha due zone separate da una recinzione `---`. La parte superiore è un modulo JavaScript/TypeScript eseguito in build (o sul server); sotto c'è il template, che è HTML con espressioni `{}` e regole specifiche del framework.

```astro
---
// Eseguito in build, mai spedito al browser
import Layout from '../layouts/Base.astro';
const ora = new Date().toISOString();
const articoli = await fetch('https://api.example.com/post').then((r) => r.json());
---
<Layout title="Home">
  <h1>Ultimi articoli</h1>
  <ul>
    {articoli.map((a) => <li><a href={`/post/${a.slug}`}>{a.title}</a></li>)}
  </ul>
  <p>Generato il {ora}</p>
</Layout>
```

Il confine è netto: un `fetch` fatto nel frontmatter viene eseguito al momento del `astro build` e il client riceve solo l'HTML risultante, non le credenziali API né la logica. Nello script NON si accede a `window` o `document`, perché quel codice gira in Node o in un worker, non nel browser.

| Zona | Linguaggio | Dove gira | Cosa può usare |
| --- | --- | --- | --- |
| frontmatter `---` | JavaScript/TypeScript | build o server | `fs`, `fetch`, variabili d'ambiente segrete |
| template | HTML + espressioni | build o server | `Astro.props`, `Astro.url`, `Astro.params` |
| `<script>` nel template | JavaScript | browser, in bundle | DOM, eventi |
| `<style>` | CSS | bundling, con scope | variabili CSS, `is:global` per uscirne |

## Routing basato sui file

`src/pages/` è la mappa delle URL: `index.astro` diventa `/`, `chi-siamo.astro` diventa `/chi-siamo`, `blog/index.astro` diventa `/blog`. Le parentesi quadre dichiarano segmenti dinamici, e un sito statico deve elencare in anticipo le combinazioni possibili con `getStaticPaths`.

```astro
---
// src/pages/post/[slug].astro
import Layout from '../../layouts/Base.astro';
const { slug } = Astro.params;
const res = await fetch(`https://api.example.com/post/${slug}`);
const post = res.ok ? await res.json() : null;
---
<Layout title={post?.title ?? 'Articolo non trovato'}>
  {post ? <article set:html={post.bodyHtml} /> : <p><a href="/archivio">Vai all'archivio</a></p>}
</Layout>
```

Per un elenco prefissato di pagine il pattern cambia: si esporta `getStaticPaths()`, che restituisce una voce per ogni pagina da generare, e il valore `props` di ogni voce arriva come `Astro.props`. Il nome del parametro (`[slug]`, `[lingua]`) deve coincidere con la chiave del `params`.

## Layout, props e isole

Un layout è un componente come gli altri che usa `<slot />` per inserire il contenuto del figlio e accetta frontmatter condiviso. Le props sono tipizzate con un'interfaccia TypeScript, così un refuso su `title` diventa errore di compilazione.

```astro
---
// src/layouts/Base.astro
interface Props { title: string; noindex?: boolean }
const { title, noindex = false } = Astro.props;
---
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
    {noindex && <meta name="robots" content="noindex" />}
  </head>
  <body><slot /></body>
</html>
```

Quando serve interattività si sceglie una direttiva. `client:load` idrata subito, `client:idle` quando il browser è inattivo, `client:visible` quando l'elemento entra nel viewport, `client:only="react"` salta il rendering lato server per componenti che dipendono dal browser. Tutto il resto della pagina resta HTML statico.

Un sito statico con percorsi dinamici ha bisogno di un ponte tra URL e dati: il listato seguente mostra il caso più diffuso, una cartella di articoli letta dal filesystem a ogni build.

```astro
---
// src/pages/post/[slug].astro
export async function getStaticPaths() {
  const articoli = await listaLocale('src/content/post');
  return articoli.map((a) => ({ params: { slug: a.slug }, props: { articolo: a } }));
}
const { articolo } = Astro.props; // deciso qui, non dall'utente
---
<article><h1>{articolo.titolo}</h1><div set:html={articolo.html} /></article>
```

| Direttiva | Quando idrata | Caso tipico |
| --- | --- | --- |
| nessuna | mai | testo, layout, elenchi |
| `client:load` | subito | menu con stato, carrello |
| `client:idle` | browser inattivo | widget secondari |
| `client:visible` | entra nel viewport | grafici sotto la piega |
| `client:only` | subito, senza SSR | editor che usa `localStorage` |

## Errori comuni

- **Usare `document` nel frontmatter**: il codice gira in Node durante la build e fallisce con `ReferenceError`; l'accesso al DOM va in un `<script>` o dentro un'isola.
- **Dimenticare `getStaticPaths`**: un file `[slug].astro` senza elenco di percorsi rompe l'output statico, il compilatore indica come risolvere.
- **Mettere uno `<script>` per pagina invece di un componente**: Astro raggruppa e deduplica gli script, ma duplicare la logica in ogni pagina annulla il vantaggio.
- **Rendere interattivo l'intero albero**: avvolgere in `client:load` un componente che contiene un intero layout spedisce al browser codice che non serve.
- **Confondere `Astro.params` e `Astro.props`**: il primo contiene i segmenti dell'URL validati da `getStaticPaths`, il secondo sono i dati aggiuntivi associati al percorso.

## In sintesi

Astro separa il lavoro pesante in build dal lavoro del browser: il frontmatter esegue codice server (dati, file, fetch), il template produce HTML, e solo le isole con direttiva `client:*` spediscono JavaScript. Il routing è la struttura di `src/pages/`, con `getStaticPaths` per i percorsi dinamici nei siti statici. Layout, props tipizzate e slot coprono la composizione; la scelta delle direttive è la decisione di performance più importante che prendi su una pagina.

## Fonti

- [Astro Docs - Getting Started](https://docs.astro.build/en/getting-started/)
- [Astro Docs - Astro Components](https://docs.astro.build/en/basics/astro-components/)
- [Astro Docs - Routing](https://docs.astro.build/en/guides/routing/)
- [Astro Docs - Islands](https://docs.astro.build/en/concepts/islands/)
