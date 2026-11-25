Il problema pratico che Astro affronta non è "come costruire una SPA" ma "come spedire meno JavaScript senza perdere le parti dinamiche". La risposta si regge su quattro meccanismi: rendering statico per default, isole interattive, server islands per contenuti personalizzati e rendering on demand selettivo con un adapter. In questa lezione impari a sceglierli insieme, misurando il costo di ogni scelta.

## Obiettivi

- Scegliere tra output statico e rendering on demand route per route con `prerender`.
- Configurare un adapter e capire cosa cambia nel processo di deploy.
- Usare le server islands per contenuti personalizzati senza rendere dinamica l'intera pagina.
- Comporre isole diverse nella stessa pagina senza duplicare framework o bundle.

## I tre livelli di rendering

Astro non ha una modalità unica: ogni pagina può essere pre-renderizzata in build, renderizzata su richiesta dal server, oppure statica con frammenti generati a runtime. Le server islands sono il caso ibrido: l'HTML della pagina è già pronto, ma il contenuto di un singolo componente arriva da una seconda richiesta.

| Livello | Dove gira | Quando aggiorna | Richiede adapter |
| --- | --- | --- | --- |
| statico | build | a ogni deploy | no |
| on demand | server | a ogni richiesta | sì |
| server island | server | a ogni richiesta, per componente | sì |

La scelta si fa a livello di pagina con `export const prerender`, non a livello di progetto: si può avere un blog interamente statico e una sola pagina `/account` renderizzata dal server.

```astro
---
// src/pages/account.astro
export const prerender = false; // questa pagina usa cookie e sessione
const utente = Astro.locals.utente ?? null;
---
{utente ? <p>Ciao, {utente.nome}</p> : <a href="/login">Accedi</a>}
```

L'adapter si aggiunge una volta sola e può essere installato con un comando che aggiorna la configurazione: `npx astro add node` oppure `npx astro add netlify`. L'adapter non cambia la sintassi delle pagine, cambia chi esegue il codice in produzione.

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
});
```

## Server islands e contenuti personalizzati

Una server island si dichiara con `server:defer`. Astro genera un'etichetta HTML statica con un contenuto di fallback, e la parte personalizzata viene sostituita via fetch dopo il caricamento della pagina. Il resto del documento resta in cache CDN. L'HTML dato al client contiene solo un placeholder con un URL firmato: il componente vero e proprio non viene pre-renderizzato, quindi non deve esportare `prerender = true`.

```astro
---
// src/components/Saldo.astro
const utente = Astro.locals.utente; // letto a ogni richiesta
const saldo = utente ? await saldoRisparmio(utente.id) : null;
---
<strong>{saldo ?? '—'}</strong>

<!-- src/pages/dashboard.astro -->
<Saldo server:defer>
  <span slot="fallback">Caricamento saldo…</span>
</Saldo>
```

I props delle server islands sono serializzabili in JSON: niente funzioni, niente valori che dipendono da `window`. Il fallback compare subito e deve avere dimensioni simili al contenuto reale, altrimenti la pagina si sposta quando il frammento arriva.

La stessa meccanica si estende ai frammenti HTML che non hanno un componente dedicato. Un endpoint in `src/pages/frammenti/` può generare markup da un database, e l'isola lo include con un `fetch` in uno script; è la strada usata quando il provider non supporta le server islands native ma si vuole conservare la cache della pagina.

```js
// src/pages/frammenti/avvisi.json.js
export const prerender = false; // endpoint on demand
export async function GET() {
  const avvisi = await ultimiAvvisi(); // dati freschi a ogni richiesta
  return Response.json(avvisi, { headers: { 'cache-control': 'private, max-age=60' } });
}
```

## Misurare il costo delle isole

Ogni isola carica il framework necessario una volta sola, ma il peso sulla pagina cresce con la quantità di codice idratato. La regola operativa è: la prima isola della pagina paga il runtime del framework, quelle successive pagano solo il proprio componente. Per questo la scelta `client:visible` è quasi sempre quella giusta sotto la piega.

Dopo la build vale la pena leggere i file generati in `dist/_astro/` e confrontare il peso totale dei `.js` con quello dell'HTML: su un blog tipico di sole pagine statiche il primo dato dovrebbe restare sotto i 50 kB compressi, altrimenti l'interattività si è estesa più del necessario.

```astro
---
import Grafico from '../components/Grafico.tsx';
import Menu from '../components/Menu.tsx';
import Commenti from '../components/Commenti.tsx';
const serie = await caricaSerie(); // array di numeri, serializzabile
const id = Astro.params.id; // presente solo con routing dinamico
---
<Menu client:load />
<main><slot /></main>
<Grafico client:visible dati={serie} />
<Commenti client:idle postId={id} />
```

Sul fronte dei dati conviene restare fedeli al confine: leggere i dati nel frontmatter e passarli come props garantisce che l'isola riceva JSON già pronto, senza richieste duplicate al primo render.

| Scelta | Effetto sul bundle | Quando |
| --- | --- | --- |
| `client:visible` | rimanda il download | contenuti sotto la piega |
| `client:idle` | ritarda l'idratazione | widget non critici |
| `client:only` | esclude il SSR | dipendenze su `window` |
| isola in `.astro` | nessun framework | interattività con eventi DOM puri |

```astro
---
// contatore interattivo senza framework: nessuna isola React, solo uno script
---
<button id="bump" type="button">0</button>
<script>
  const el = document.getElementById('bump');
  el?.addEventListener('click', () => {
    el.textContent = String(Number(el.textContent) + 1);
  });
</script>
```

## Errori comuni

- **Mettere `prerender = false` nel progetto intero**: ogni pagina perde la cache, anche quelle che non cambiano mai; usa il flag solo sulle route che lo richiedono.
- **Dimenticare che le server islands richiedono un adapter**: senza adapter `server:defer` non ha un runtime che serva il frammento, e la build lo segnala.
- **Passare funzioni a una server island**: i props devono essere serializzabili in JSON, una funzione diventa `undefined` in produzione.
- **Idratare con `client:load` tutto ciò che sta nella prima viewport**: header e menu spesso sono ottenibili con un `<script>` di poche righe.
- **Assumere che il fallback scompaia subito**: con rete lenta il fallback resta al primo paint, quindi conviene usarlo per mostrare uno skeleton con lo stesso ingombro.

## In sintesi

Astro tratta il rendering come una decisione per route: statico per default, on demand con `prerender = false` e un adapter, frammenti personalizzati con `server:defer`. Le isole portano JavaScript solo dove serve, e la direttiva scelta determina cosa paga il visitatore. Nel caso migliore la pagina gira senza framework nel browser: pochi script vanilla coprono l'interattività dei componenti più semplici.

## Fonti

- [Astro Docs - On-demand Rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Astro Docs - Server Islands](https://docs.astro.build/en/guides/server-islands/)
- [Astro Docs - Client-side Scripts](https://docs.astro.build/en/guides/client-side-scripts/)
- [Astro Docs - Configuration Reference](https://docs.astro.build/en/reference/configuration-reference/)
