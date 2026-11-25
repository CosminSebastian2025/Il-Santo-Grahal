Nuxt 4 è il meta-framework costruito sopra Vue: aggiunge al framework di componenti un sistema di file che generano rotte, un server Nitro, rendering ibrido e una pipeline di build con deploy su Node, serverless o edge. La differenza pratica rispetto a un'app Vue con Vite non è "più funzioni": è che l'esecuzione si sdoppia tra server e browser, e capire dove gira ogni riga di codice è la competenza che decide se un progetto sarà veloce o pieno di bug che si vedono solo in produzione. Qui vedi come si struttura un'app Nuxt, come nasce una rotta da un file e come scegliere la modalità di rendering.

## Obiettivi

- Conoscere le directory di Nuxt 4 (`app/`, `server/`, `shared/`) e cosa genera ciascuna.
- Capire file-based routing, rotte dinamiche, `definePageMeta` e navigazione con `NuxtLink`.
- Distinguere SSR, SSG, SPA e ISR per contenuto, indicizzazione e costi.
- Riconoscere il codice che gira due volte e adottare la regola del "server-safe".

## Anatomia di un'app Nuxt 4

```bash
npm create nuxt@latest rubrica-nuxt
cd rubrica-nuxt && npm install
npm run dev          # http://localhost:3000, HMR + reload del server
npm run build        # build per produzione
npm run preview      # anteprima della build
```

| Percorso | Genera | Gira su |
| --- | --- | --- |
| `app/pages/` | rotte con Vue Router | server (SSR) e client |
| `app/components/` | auto-import dei componenti | entrambi |
| `app/composables/` | auto-import di funzioni `use*` | entrambi |
| `server/api/` | endpoint JSON Nitro da chiamare con `$fetch` | solo server |
| `server/routes/` | handler HTTP generici | solo server |
| `shared/utils/` | codice condiviso client/server | entrambi |
| `app/plugins/` | inizializzazione con hook (`nuxtApp`) | entrambi |
| `nuxt.config.ts` | configurazione e modulo del build | build |

Nuxt 4 ha spostato il codice dell'app dentro `app/` rispetto alla radice usata in Nuxt 3: `pages`, `components`, `layouts` e `plugins` stanno lì, mentre `server/` e `shared/` restano alla radice. Gli auto-import sono la comodità principale: non scrivi `import { ref }` per `ref`, `useFetch` o i tuoi componenti in `app/components`, perché il plugin di build genera i file `.nuxt/imports.d.ts` e il bundler li risolve. Il prezzo è che un componente "invisibile" sembra un errore di Typing editor: salva il file e l'IDE si allinea.

La configurazione minima contiene spesso solo qualche chiave.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  modules: ['@nuxtjs/seo'],
})
```

`compatibilityDate` fissa il comportamento dei preset Nitro e degli strumenti interni: aggiornarlo è un cambio da fare di proposito, non un dettaglio da ignorare perché un modulo lo suggerisce.

## Da file a rotta

Il file system è il router. Un file crea una rotta, un indice crea lo slash finale, una cartella con `[param]` crea un parametro dinamico.

| File | URL | Note |
| --- | --- | --- |
| `app/pages/index.vue` | `/` | home |
| `app/pages/contatti.vue` | `/contatti` | pagina semplice |
| `app/pages/contatti/[id].vue` | `/contatti/42` | parametro `id` |
| `app/pages/contatti/[...slug].vue` | `/contatti/a/b/c` | catch-all, `slug` è un array |
| `app/pages/contatti/index.vue` | `/contatti` | indice della sottocartella |
| `app/pages/contatti/[[status]].vue` | `/contatti` e `/contatti/attivi` | parametro opzionale |
| `app/pages/protetto.vue` | `/protetto` | con middleware in `definePageMeta` |

```vue
<!-- app/pages/contatti/[id].vue -->
<script setup lang="ts">
const rotta = useRoute()
const id = computed(() => Number(rotta.params.id))

definePageMeta({
  middleware: ['auth'],
  validate: (r) => Number(r.params.id) > 0, // 404 se false
})
</script>

<template>
  <h1>Contatto {{ id }}</h1>
  <NuxtLink to="/contatti">Torna alla lista</NuxtLink>
</template>
```

`NuxtLink` prefetcha le rotte in vista appena entra nel viewport: con una lista di 500 link ogni link diventa una richiesta, quindi su liste lunghe conviene `prefetch-on="interaction"` o disattivare il prefetch sulla lista stessa. Le animazioni tra rotte si dichiarano in `app/transition` (Nuxt 4) oppure con `pageTransition` nella config; i layout invece si scelgono con `definePageMeta({ layout: 'admin' })` e vivono in `app/layouts/`.

## Modalità di rendering

Nuxt decide per pagina se il server deve restituire HTML pronto, oppure se il client deve fare il lavoro. Il default globale si imposta in `nuxt.config.ts`, l'eccezione nella pagina.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { prerender: true },            // HTML generato in build (SSG)
    '/contatti/**': { swr: 60 },         // cache server per 60 s
    '/admin/**': { ssr: false },         // SPA solo per l'area admin
    '/api/**': { cors: true },
  },
})
```

| Modalità | HTML in prima risposta | Client-side JS | Caso d'uso |
| --- | --- | --- | --- |
| SSR | sì, renderizzato a ogni richiesta | idratazione completa | dati personalizzati, SEO |
| SSG (`prerender`) | sì, generato in build | idratazione | blog, documentazione |
| SPA (`ssr: false`) | shell vuota | render completo | dashboard dietro login |
| ISR/SWR (`swr`, `isr`) | sì, cache rigenerata a intervalli | idratazione | cataloghi con dati lenti |

La regola di scelta: se il contenuto dipende dall'utente e cambia spesso, SSR; se è lo stesso per tutti e cambia a ogni deploy, prerender; se è dietro autenticazione e non ha bisogno di indicizzazione, SPA. Il costo del SSR non è solo CPU: ogni pagina deve aspettare le chiamate dati prima di inviare il primo byte, quindi la differenza tra 80 e 800 ms di TTFB dipende da quante fetch hai messo nel percorso critico.

La conseguenza più concreta di questa doppia esecuzione è la regola del **codice condiviso**: tutto ciò che è in `app/` gira sia sul server sia nel browser. `window`, `document`, `localStorage` e le API dei browser non esistono durante il SSR, e usarli a livello di modulo produce un errore sul server, non un warning. Proteggili con `import.meta.client` o spostali in `onMounted`.

```ts
const tema = useState<'chiaro' | 'scuro'>('tema', () => 'chiaro') // serializzato nell'HTML

onMounted(() => {
  if (import.meta.client) tema.value = (localStorage.getItem('tema') as 'scuro') ?? 'chiaro'
})
```

## Errori comuni

- **Direttive e moduli solo-browser a livello di modulo**: `new IntersectionObserver()` fuori da `onMounted` rompe il SSR; spostalo nel ciclo di vita.
- **Dimenticare il fallback history lato server**: con `ssr: false` e deploy statico, ogni URL diverso da `/` richiede una regola di rewrite a `index.html`.
- **Chiamare `fetch` nativo invece di `$fetch`**: perdi il proxy delle chiamate relative durante il SSR e finisci sul server sbagliato.
- **Migliaia di prefetch**: una lista con `NuxtLink` ovunque satura la rete nel primo secondo.
- **Stato in variabili di modulo**: il modulo vive una volta per processo e viene condiviso tra utenti sul server; usa `useState` o `useAsyncData`.

## In sintesi

Nuxt è un'app Vue in cui la struttura dei file diventa routing, server e build. Le directory `app/`, `server/` e `shared/` dichiarano dove gira il codice, e il rendering si sceglie pagina per pagina con `routeRules`. La regola che tiene insieme tutto: ogni riga in `app/` può girare due volte, quindi serve "server-safe" per default e supporto esplicito al browser quando serve. Con questa mappa i prossimi passi, cioè dati e server route, diventano facili da collocare.

## Fonti

- [Nuxt - Introduction](https://nuxt.com/docs/getting-started/introduction)
- [Nuxt - Routing](https://nuxt.com/docs/getting-started/routing)
- [Nuxt - Rendering Modes](https://nuxt.com/docs/guide/concepts/rendering)
- [Nuxt - Nuxt Configuration](https://nuxt.com/docs/guide/directory-structure/nuxt-config)
