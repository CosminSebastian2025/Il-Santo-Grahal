In questo laboratorio costruisci da zero `Manuale Astro`, un sito documentale che raccoglie gli appunti delle lezioni in una content collection tipizzata, genera le pagine con `getStaticPaths()`, rende interattivo solo il sommario laterale e infine sposta il filtro di ricerca in una server island. Ogni passo ha un criterio verificabile, così alla fine sai esattamente quando un contenuto deve essere statico e quando deve diventare dinamico.

## Obiettivi

- Inizializzare un progetto Astro e leggere la struttura generata dal comando di setup.
- Definire una content collection con loader `glob()` e schema Zod per gli appunti.
- Generare pagine di dettaglio dai contenuti con `getStaticPaths()` e renderizzare il corpo.
- Isolare in una server island un dato che cambia a ogni richiesta, misurando prima e dopo.

## Passo 1: progetto e struttura

Crea il progetto con il comando ufficiale e verifica la versione del pacchetto: `npm create astro@latest manuale -- --template minimal --no-install --no-git` e poi `cd manuale && npm install && npx astro --version`. La struttura che conta è piccola: `src/pages` per le URL, `src/components` e `src/layouts` per il markup riusabile, `public` per i file serviti così come sono.

| Percorso | Ruolo | Tocca al browser |
| --- | --- | --- |
| `src/pages/index.astro` | home | HTML statico |
| `src/content.config.ts` | definizione collection | no |
| `src/content/appunti/*.mdx` | contenuti | no |
| `astro.config.mjs` | integrazioni e adapter | no |

Avvia `npm run dev` e controlla che `http://localhost:4321` risponda. Se la porta è occupata, Astro sceglie la successiva e la stampa nel terminale.

## Passo 2: content collection tipizzata

Il file `src/content.config.ts` dichiara il loader e lo schema. Lo schema è la ragione per cui la collection vale la pena: un articolo con `tags` scritto come stringa invece che come lista fa fallire la build, non arriva in produzione.

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const appunti = defineCollection({
  loader: glob({ base: './src/content/appunti', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    titolo: z.string().min(3),
    capitolo: z.number().int().positive(),
    tags: z.array(z.string()).default([]),
    bozza: z.boolean().default(false),
  }),
});

export const collections = { appunti };
```

Crea due file di prova con frontmatter coerente, ad esempio `01-introduzione.mdx` e `02-routing.mdx`, e lancia `npx astro check`: i tipi delle entry compaiono nelle autocompletazioni del editor, e un campo mancante emerge subito.

## Passo 3: pagine generate dai contenuti

Con la collection pronta, le pagine si generano da `getCollection()` filtrando le bozze. Il `render()` dell'entry restituisce il componente del contenuto, che si inserisce nel template come `<Content />`; il layout riceve le props tipizzate e unisce tutto.

```astro
---
// src/pages/appunti/[slug].astro
import { getCollection, render } from 'astro:content';
import Layout from '../../layouts/Base.astro';

export async function getStaticPaths() {
  const voci = await getCollection('appunti', ({ data }) => !data.bozza);
  return voci.map((voce) => ({ params: { slug: voce.id }, props: { voce } }));
}
const { voce } = Astro.props;
const { Content, headings } = await render(voce);
---
<Layout titolo={voce.data.titolo} headings={headings}>
  <nav aria-label="Sommario">
    {headings.map((h) => <a href={`#${h.slug}`}>{h.text}</a>)}
  </nav>
  <article><Content /></article>
</Layout>
```

Il criterio di verifica è concreto: `npm run build` deve stampare una pagina per ogni file non bozza, e `npx astro preview` deve servire le stesse URL senza server Node in esecuzione.

## Passo 4: un solo pezzo interattivo, poi una server island

Il sommario con evidenziazione della voce attiva è un buon candidato per uno script vanilla: nessun framework, poche righe, funziona anche se il JavaScript viene caricato dopo.

```astro
<script>
  const link = document.querySelectorAll('nav[aria-label="Sommario"] a');
  const osserva = new IntersectionObserver((voci) => {
    for (const v of voci) if (v.isIntersecting) {
      link.forEach((l) => l.toggleAttribute('aria-current', l.hash === `#${v.target.id}`));
      break;
    }
  }, { rootMargin: '-20% 0px -70% 0px' });
  document.querySelectorAll('article h2[id], article h3[id]').forEach((h) => osserva.observe(h));
</script>
```

Nel passaggio successivo immagina di voler mostrare, accanto al titolo, il numero di visite del capitolo, letto da un servizio interno. Questo valore cambia a ogni richiesta e non deve invalidare la cache della pagina. La soluzione è una server island: `npx astro add node` per l'adapter, poi un componente con `server:defer` e un fallback della stessa altezza del testo finale.

| Passo | Comando o file | Verifica |
| --- | --- | --- |
| 1 | `npm create astro@latest` | la home risponde sulla 4321 |
| 2 | `src/content.config.ts` | `astro check` non segnala errori di schema |
| 3 | `[slug].astro` | una pagina per ogni entry non bozza |
| 4 | `<script>` e `server:defer` | sommario attivo e contatore asincrono |

## Esercizi

1. Aggiungi una collection `faq` con loader `file()` che legge un unico `faq.yaml` e una pagina che la renderizza.
2. Mostra i contenuti correlati filtrando per `tags` condivisi, limitando a tre risultati.
3. Sostituisci il `fetch` della server island con un endpoint `src/pages/api/visite.json.ts` e descrivi chi paga il costo in ogni caso.
4. Sposta il sommario dentro un'isola con `client:visible`: confronta peso del bundle e tempo di interattività.

<details>
<summary>Soluzione</summary>

1. Il loader `file()` accetta `base` e ricava `id` da un campo della voce; lo schema deve dichiarare esplicitamente quel campo con `z.string()`.

2. `getCollection('appunti')` restituisce tutte le entry, il filtro va fatto in memoria con `Set` sui tag e `slice(0, 3)` dopo un ordinamento stabile per `capitolo`.

3. L'endpoint è una route on demand, quindi resta presente nel sito anche senza visita; la server island evita che il contatore blocchi il primo render della pagina, perché arriva dopo.

4. Il sommario in isola aggiunge il runtime del framework per una funzione che si copre con poche righe di DOM; `client:visible` migliora il caricamento iniziale ma resta più pesante dello script puro.

</details>

## Errori comuni

- **ID duplicati nella collection**: due file nella stessa cartella generano ID diversi finché il nome del file differisce, quindi non usare `slug` come campo manuale quando il loader lo calcola.
- **Dimenticare `Astro.props` tipizzato**: senza interfaccia il layout accetta qualsiasi prop e un refuso su `titolo` diventa `undefined` in produzione.
- **Rendere dinamica la pagina intera per un contatore**: `prerender = false` sull'articolo disattiva la cache di tutto il documento, anche se solo una cifra cambia.
- **Placeholder con altezza diversa dal contenuto**: la server island sposta il testo già letto quando arriva la risposta, danneggiando il CLS.
- **Costruire senza `astro check`**: gli errori di schema nelle collection emergono in build, ed è meglio vederli prima di un deploy.

## In sintesi

Le content collection trasformano una cartella di file in dati tipizzati e verificati, e `getStaticPaths()` trasforma quei dati nelle pagine HTML del sito. Il laboratorio ha mantenuto statico tutto ciò che non cambia, ha coperto il sommario con uno script vanilla e ha riservato la server island all'unico dato che dipende dalla richiesta. Il criterio finale è quello di sempre: JavaScript e rendering on demand solo dove il valore per il lettore lo giustifica.

## Fonti

- [Astro Docs - Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro Docs - Install and Setup](https://docs.astro.build/en/install-and-setup/)
- [Astro Docs - On-demand Rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Astro Docs - Deploy](https://docs.astro.build/en/guides/deploy/)
