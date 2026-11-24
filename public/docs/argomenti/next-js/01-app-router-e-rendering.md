L'App Router è il sistema di routing introdotto dalla generazione più recente di Next.js: le cartelle di `app/` diventano segmenti URL e ogni file speciale (`page.tsx`, `layout.tsx`, `loading.tsx`) ha un ruolo preciso nel ciclo di rendering. A differenza del modello classico, i componenti vengono per default eseguiti sul server, e il client riceve HTML e payload RSC già compositi. Capire chi renderizza cosa e quando è la chiave per usarlo bene.

## Obiettivi

- Descrivere le convenzioni di `app/` e la gerarchia di `layout`, `page` e segmenti dinamici.
- Distinguere rendering statico, dinamico e streaming e sapere cosa li attiva.
- Scegliere consapevolmente tra Server Component e Client Component.
- Usare `loading.tsx`, `error.tsx` e `not-found.tsx` per gestire gli stati.
- Spiegare la differenza tra App Router e Pages Router nell'organizzazione delle rotte.

## Convenzioni di routing

Ogni cartella dentro `app/` è un segmento di percorso. Una pagina è un file `page.tsx`; un layout è un file `layout.tsx` che avvolge i propri figli e resta montato tra navigazioni:

```text
app/
  layout.tsx          -> layout radice (<html>, <body>)
  page.tsx            -> /
  blog/
    layout.tsx        -> cornice comune del blog
    page.tsx          -> /blog
    [slug]/
      page.tsx        -> /blog/:slug
  (marketing)/
    offerte/page.tsx  -> /offerte (gruppo di rotte, non segmento URL)
```

I gruppi tra parentesi non compaiono nell'URL e servono a organizzare layout paralleli. I segmenti dinamici `[slug]` ricevono i parametri come `params`, che nelle versioni recenti è asincrono:

```tsx
export default async function Articolo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <h1>{slug}</h1>;
}
```

Accanto a `page.tsx` esistono file speciali: `loading.tsx` mostra un fallback mentre il segmento carica, `error.tsx` cattura gli errori di rendering e deve essere un Client Component, `not-found.tsx` gestisce `notFound()`, mentre `route.ts` definisce endpoint HTTP al posto di una pagina.

## Rendering, caching e streaming

Nel App Router il rendering di default è sul server e il risultato viene messo in cache dove possibile. Se una pagina non contiene API dinamiche né dati con cache "no-store", viene prerenderizzata in build e servita come statica. Le API dinamiche come `cookies()`, `headers()` o `searchParams` accedono alla richiesta e rendono il rendering dinamico. Il Server Component può fare streaming: l'HTML viene inviato per parti, e con `loading.tsx` o `<Suspense>` l'utente vede subito la cornice mentre le parti lente arrivano dopo.

| Modalità | Quando si attiva | Effetto |
| --- | --- | --- |
| Statico | nessuna API dinamica, dati cacheabili | HTML pronto in build |
| Dinamico | `cookies()`, `headers()`, `no-store` | render a ogni richiesta |
| Streaming | `Suspense` / `loading.tsx` | parti progressive via RSC |
| ISR | `revalidate` sulle fetch | rigenerazione a intervalli |

La regola pratica è partire statico e rendere dinamico solo ciò che dipende dall'utente: trasformare una pagina in dinamica "per sicurezza" annulla i vantaggi del framework.

## Server e Client Components

I componenti sono Server Components per default: possono accedere direttamente a database e file system, non spediscono JavaScript al browser e non possono usare stato o effetti. Per l'interattività si aggiunge la direttiva `"use client"` in cima al file, che segna il confine: quel modulo e i suoi import diventano Client Components.

```tsx
"use client";

import { useState } from "react";

export function Contatore() {
  const [n, setN] = useState(0);
  return (
    <button onClick={() => setN(n + 1)}>Clic {n}</button>
  );
}
```

Il confine si mette in basso nell'albero, sul componente interattivo, non sulla pagina. Dal Server Component puoi importare un Client Component e passargli dati serializzabili come props; il contrario non è sempre possibile, e le funzioni passate al client devono essere Server Actions o essere serializzabili.

## Stati di caricamento e errori

Accanto alla pagina si definiscono gli stati in modo dichiarativo: `loading.tsx` è l'attesa, `error.tsx` è il fallimento. L'errore deve essere gestito con un boundary di client per permettere il pulsante di retry.

```tsx
"use client";

export default function Errore({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <p>Qualcosa è andato storto: {error.message}</p>
      <button onClick={reset}>Riprova</button>
    </div>
  );
}
```

`notFound()` interrompe il rendering e mostra il `not-found.tsx` più vicino, con status 404. Insieme questi file coprono i tre stati che normalmente si dimenticano, senza scrivere logica di stato nei componenti.

## Errori comuni

- **Mettere `"use client"` sul layout radice**: tutto il sito diventa client, perdendo i vantaggi del server.
- **Aspettarsi che `params` sia sincrono**: nelle versioni attuali va atteso con `await`.
- **Usare `useState` in un Server Component**: errore di compilazione, non un comportamento silenzioso.
- **Rendere dinamica una pagina senza motivo**: una `fetch` con `no-store` o una `cookies()` disattivano il prerender statico.
- **Confondere file di rotta e file di layout**: senza `page.tsx` il segmento non produce un URL.

## In sintesi

Le cartelle di `app/` definiscono gli URL, e i file speciali definiscono pagina, layout e stati. Il rendering è server-first, statico quando possibile, dinamico quando le API di richiesta lo impongono, con streaming per le parti lente. Il confine client sta in basso nell'albero, sul componente interattivo. `loading`, `error` e `not-found` sostituiscono la gestione manuale degli stati di navigazione.

## Fonti

- [Next.js Docs - App Router](https://nextjs.org/docs/app)
- [Next.js Docs - Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [React - Server Components](https://react.dev/reference/rsc/server-components)
- [React - use client](https://react.dev/reference/rsc/use-client)
