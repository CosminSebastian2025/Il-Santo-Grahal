In questo laboratorio costruisci `note-qwik`, una piccola applicazione Qwik City con elenco e dettaglio delle note, un form con validazione server-side e una build di produzione servita in modalità statica più adapter Node per le azioni. Il punto non è imitare un gestionario completo, ma misurare con mano il guadagno della ripresa: al termine confronti il JavaScript caricato all'apertura di una pagina con quello caricato dopo un clic, e vedi i chunk dei gestori arrivare solo quando servono.

## Obiettivi

- Creare il progetto con `create-qwik`, riconoscere i file generati e capire il ruolo di `adapters`.
- Implementare due rotte, un loader e un'azione con `zod$`, con dati in memoria lato server.
- Aggiungere un componente pesante ed estrarlo in un chunk caricato su interazione.
- Eseguire build di produzione, verificare `prerender` e leggere il `q-manifest.json`.
- Confrontare il peso del JS iniziale con quello dopo l'interazione usando la scheda Network.

## Setup e struttura

```bash
npm create qwik@latest note-qwik -- --starter basic --yes
cd note-qwik
npm install
npm run dev          # http://localhost:5173
```

Il progetto generato contiene `src/routes`, `src/components`, `vite.config.ts` con `qwikVite` più l'adapter scelto e `public/`. `npm run dev` usa Vite con SSR in sviluppo; `npm run build` produce le build client e server, e `npm run preview` avvia il server Node dell'adapter. Per un hosting statico si installa l'adapter `static` e l'output finisce in `dist/`.

| Script | Effetto | Note |
| --- | --- | --- |
| `npm run dev` | Vite con SSR, HMR | niente minificazione, misurazioni non valide |
| `npm run build` | build client + server | emette `dist/` e `server/` |
| `npm run preview` | server Node della build | comportamento più vicino alla produzione |
| `npm run qwik add` | installa adapter o integrazione | es. `static`, `node-server` |

## Dati, rotte e mutazione

Il deposito note è un array in memoria in `src/lib/db.ts`: su un deploy serverless lo stato non persiste tra invocazioni ed è la prima cosa da sostituire. `note/index.tsx` espone loader e azione, `note/[id]/index.tsx` legge il parametro della rotta.

```ts
// src/lib/db.ts
export type Nota = { id: number; titolo: string; corpo: string; creata: string };

const note: Nota[] = [
  { id: 1, titolo: "Riprendere è meglio di idratare", corpo: "Il server serializza lo stato.", creata: "2026-10-02" },
];

export const elenco = () => note.map(({ id, titolo, creata }) => ({ id, titolo, creata }));
export const perId = (id: number) => note.find((n) => n.id === id) ?? null;
export const inserisci = (titolo: string, corpo: string): Nota => {
  const nota = { id: note.length + 1, titolo, corpo, creata: new Date().toISOString().slice(0, 10) };
  note.push(nota);
  return nota;
};
```

```tsx
// src/routes/note/[id]/index.tsx
import { component$, useLocation } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import { perId } from "~/lib/db";

export const useNota = routeLoader$(({ params }) => perId(Number(params.id)));

export default component$(() => {
  const nota = useNota();
  return nota.value ? (
    <article>
      <h1>{nota.value.titolo}</h1>
      <p>{nota.value.corpo}</p>
      <small>rotta {useLocation().url.pathname}</small>
    </article>
  ) : (
    <p>Nota non trovata</p>
  );
});
```

L'elenco usa `<Form action={azione}>` e mostra `fieldErrors` quando `azione.value?.failed` è vero. Senza JavaScript l'invio è un POST classico che torna con l'elenco aggiornato: l'azione è un endpoint HTTP.

## Il chunk pesante e la misura

Per vedere la ripresa serve un componente che non deve essere scaricato all'apertura: uno che importa una libreria di grafici, reso visibile solo dopo un clic.

```tsx
// src/components/GraficoNote.tsx
import { component$ } from "@builder.io/qwik";
import { Chart } from "chart.js/auto";

export default component$<{ valori: number[] }>(({ valori }) => {
  return (
    <canvas
      ref={(el) =>
        new Chart(el, {
          type: "bar",
          data: { labels: valori.map((_, i) => `#${i + 1}`), datasets: [{ data: valori }] },
        })
      }
    />
  );
});
```

```tsx
// dentro src/routes/note/index.tsx
const mostra = useSignal(false);
// ...
<button onClick$={() => (mostra.value = !mostra.value)}>grafico</button>
{mostra.value && <GraficoNote valori={[3, 1, 4, 1, 5]} />}
```

Apri DevTools, filtro JS: ricarica e annota il trasferito totale, poi clicca e invia il form annotando i nuovi chunk. Ripeti in produzione.

| Misura | Cosa verificare |
| --- | --- |
| JS all'apertura | usa gzip, non il numero di richieste |
| JS dopo clic "grafico" | il chunk di `chart.js` deve comparire dopo |
| JS dopo submit form | il chunk dell'azione non deve essere nel bundle iniziale |
| HTML iniziale | gli attributi `q:*` non devono contenere dati sensibili |

```bash
npm run build && npm run preview
curl -s http://localhost:4173/ | grep -o 'q:[a-z]*="[^"]\{0,40\}' | head
node -e "const m=require('./server/q-manifest.json');console.log(Object.keys(m.symbols||{}).length, Object.keys(m.bundles||{}).length)"
```

## Esercizi

1. Aggiungi `note/[id]/edit/index.tsx` con un'azione di modifica e verifica che il loader si aggiorni dopo il submit.
2. Metti in cache il loader dell'elenco con `cacheControl` e osserva l'header `Cache-Control` nella risposta SSR.
4. Aggiungi `src/routes/api/note/index.ts` con un `onGet` che restituisce JSON e confrontalo con il loader.

<details>
<summary>Soluzione</summary>

1. Il loader del dettaglio rilegge il dato per parametro; dopo un'azione sulla stessa rotta Qwik riesegue i loader e il nuovo titolo compare senza ricaricare.

2. `cacheControl` in `onGet` emette l'header sulla risposta SSR e viene applicato anche alle richieste di navigazione client, riducendo le chiamate ripetute allo stesso loader entro la finestra di validità.

3. L'endpoint `onGet` restituisce JSON puro; il loader incorpora i dati nell'HTML e li rende sincroni al componente. Endpoint per consumatori esterni, loader per la pagina.

</details>

## Errori comuni

- **Misurare `npm run dev`**: in sviluppo Vite serve moduli non bundlati, i numeri non valgono per la produzione.
- **Importare la libreria pesante a livello di modulo nella pagina**: `import { Chart } from "chart.js/auto"` nella rotta trascina la libreria nel bundle della rotta, non nel chunk dell'interazione.
- **Assumere che lo stato in memoria sopravviva al deploy**: in un ambiente serverless ogni richiesta può finire su un'istanza nuova, quindi `src/lib/db.ts` va sostituito prima di credere ai test.
- **Dimenticare `npm run qwik add` dopo il cambio di hosting**: senza adapter la build non sa dove mettere asset e azioni.
- **Leggere i loader come valori**: `useNota()` restituisce un `Signal`.


## In sintesi

Il laboratorio ha trasformato i concetti in numeri: loader e azioni consegnano l'HTML completo al primo byte, e il grafico dimostra che i chunk arrivano solo dopo l'interazione. Il `q-manifest.json` mappa ogni QRL al proprio chunk, e l'adapter decide se l'app gira su Node, su un edge runtime o su file statici. I passi successivi: sostituire il deposito in memoria, autenticare le azioni, monitorare i chunk con Insights.

## Fonti

- [Qwik - Getting Started](https://qwik.dev/docs/getting-started/)
- [Qwik - Deployments](https://qwik.dev/docs/deployments/)
- [Qwik - Cookbook](https://qwik.dev/docs/cookbook/)
- [Qwik - Insights](https://qwik.dev/docs/labs/insights/)
