Un'applicazione Qwik reale non è fatta solo di componenti: serve un router basato sul filesystem, un modo per caricare dati sul server prima del render e un modo per inviare mutazioni che funzionino anche a JavaScript disattivato. Questo insieme è Qwik City, il meta-framework che nella versione 1.x è distribuito con Qwik e che organizza l'app attorno a rotte, loader e azioni. In questa lezione lo usi per costruire una pagina elenco con dettaglio e un form di creazione.

## Obiettivi

- Strutturare le rotte in `src/routes` con `index.tsx`, `layout.tsx` e segmenti dinamici `[id]`.
- Caricare dati con `routeLoader$` e leggere il risultato dal signal che restituisce, sapendo quando il loader gira sul server.
- Inviare mutazioni con `routeAction$`, `<Form>` e `zod$` per la validazione lato server.
- Distinguere i task dai segnali e usare `useTask$` per gli effetti legati allo stato.

## Rotte come albero di file

Qwik City mappa le cartelle a URL: `src/routes/index.tsx` è `/`, `src/routes/note/index.tsx` è `/note`, `src/routes/note/[id]/index.tsx` è `/note/42` con il parametro esposto da `useLocation()`. Un `layout.tsx` avvolge tutte le rotte figlie e riceve il contenuto tramite lo slot `<Slot />`, mentre `plugin.ts` e `middleware.ts` intercettano l'intera richiesta. Le pagine possono essere statiche: aggiungendo `export const prerender = true` la rotta viene generata in build e servita come file.

| File | Rotte coperte | Ruolo |
| --- | --- | --- |
| `src/routes/layout.tsx` | tutte | shell, `<Slot />`, contesti globali |
| `src/routes/index.tsx` | `/` | pagina pronta in build se `prerender = true` |
| `src/routes/note/index.tsx` | `/note` | elenco con loader |
| `src/routes/note/[id]/index.tsx` | `/note/:id` | dettaglio con parametro di rotta |
| `src/routes/note/index.tsx` + `action` | `/note` (POST) | mutazione con validazione |

```tsx
// src/routes/layout.tsx
import { component$, Slot } from "@builder.io/qwik";

export default component$(() => {
  return (
    <main class="mx-auto max-w-2xl p-4">
      <Slot />
    </main>
  );
});
```

## Loader: dati letti prima del render

`routeLoader$` dichiara una funzione asincrona che gira sul server durante il render, oppure nel browser durante una navigazione client successiva. Il risultato viene serializzato nell'HTML come dato, non come codice, quindi la pagina arriva già completa e il componente lo legge in modo sincrono con `useNote().value`.

```tsx
// src/routes/note/index.tsx
import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { elencoNote } from "~/lib/db";

export const useNote = routeLoader$(async () => {
  return elencoNote(); // gira sul server: può parlare con il database
});

export default component$(() => {
  const note = useNote();
  return (
    <ul>
      <li>{note.value.length} note disponibili</li>
    </ul>
  );
});

export const head: DocumentHead = {
  title: "Note",
  meta: [{ name: "description", content: "Elenco delle note" }],
};
```

Il dettaglio segue lo stesso schema: il loader legge `params.id`, verifica l'esistenza della nota e altrimenti lancia `error(404, ...)`. Gli oggetti restituiti devono essere serializzabili: `Date` è ammesso, istanze di classi e funzioni no.

## Azioni: mutazioni con e senza JavaScript

`routeAction$` crea un endpoint POST associato alla rotta. Se il componente usa `<Form>` di Qwik City invece del `<form>` nativo, l'invio avviene senza JavaScript: il browser fa un POST classico, il server esegue l'azione, i loader della rotta vengono rieseguiti e l'HTML aggiornato torna al client. Con JavaScript attivo, Qwik serializza i dati del form e aggiorna solo le parti che dipendono dal loader.

```tsx
import { component$ } from "@builder.io/qwik";
import { routeAction$, Form, zod$, z } from "@builder.io/qwik-city";
import { creaNota } from "~/lib/db";

export const useCreaNota = routeAction$(
  async (dati) => {
    const nota = creaNota(dati.titolo, dati.corpo); // dati già validati
    return { creato: true, id: nota.id };
  },
  zod$({
    titolo: z.string().min(3).max(80),
    corpo: z.string().max(5000).optional(),
  })
);

export default component$(() => {
  const azione = useCreaNota();
  return (
    <Form action={azione}>
      <input name="titolo" />
      {azione.value?.failed && <p>{azione.value.fieldErrors.titolo}</p>}
      <textarea name="corpo" />
      <button type="submit">salva</button>
    </Form>
  );
});
```

La validazione vive nel `zod$` dell'azione, quindi è condivisa tra il controllo client immediato e l'esecuzione server-side: non esiste un percorso in cui il server accetta dati non validati. Lo schema deve essere coerente con `FormData`, perciò i campi opzionali vanno marcati `optional()` e non `null`-safe a mano.

## Task, segnali e prestazioni

`useTask$` è un effetto reattivo che traccia i segnali letti nel suo corpo; con `track()` si controlla esplicitamente cosa innesca il rerun. Su Qwik il task viene serializzato insieme allo stato e, se non è asincrono né ha flag speciali, può girare anche durante il render sul server. `useVisibleTask$` invece lavora solo nel browser, dopo che l'elemento è visibile, e non partecipa alla serializzazione: usalo per code di terze parti, `IntersectionObserver` o misurazioni del DOM.

```tsx
import { component$, useSignal, useTask$, $ } from "@builder.io/qwik";

export default component$(() => {
  const testo = useSignal("");

  useTask$(({ track }) => {
    track(() => testo.value);
    if (testo.value.length < 2) return;
    console.log("ricerca:", testo.value); // eseguito anche durante il render nel server
  });

  return <input onInput$={$((e) => (testo.value = (e.target as HTMLInputElement).value))} />;
});
```

La regola operativa: con `useTask$` il lavoro è parte della pagina e viene ripreso dal browser; ogni `useVisibleTask$` reintroduce una porzione di idratazione e riduce il vantaggio della ripresa.

## Errori comuni

- **Chiamare un loader dentro un gestore di eventi**: `useNote()` restituisce un `Signal`; per un rifetch reagisci a un segnale dentro il loader.
- **Cercare un hook `useLoaderData` globale**: nella 1.x ogni loader è a sua volta un hook, va chiamato direttamente nel componente.
- **Mettere segreti nell'HTML tramite loader**: i dati del loader sono serializzati nel documento; token e chiavi restano nel codice server-only.
- **Validare solo con attributi HTML**: `required` e `type="number"` non bastano, la validazione dev'essere nell'azione con `zod$`.
- **Abusare di `useVisibleTask$`**: ogni istanza aggiunge codice da eseguire all'avvio; porta la logica in `useTask$` o in un handler.

## In sintesi

Qwik City trasforma il guadagno della ripresa in una struttura applicativa concreta: le cartelle diventano rotte, i loader consegnano dati già pronti dentro l'HTML e le azioni restituiscono mutazioni che funzionano anche senza JavaScript. I task restano il punto delicato, perché sono la porta da cui rientra il costo di avvio. Nella prossima lezione questa architettura diventa un progetto eseguibile con build, deploy e misura del bundle.

## Fonti

- [Qwik - Route Loader](https://qwik.dev/docs/route-loader/)
- [Qwik - Action](https://qwik.dev/docs/action/)
- [Qwik - Routing](https://qwik.dev/docs/routing/)
- [Qwik - Components and Tasks](https://qwik.dev/docs/components/tasks/)
