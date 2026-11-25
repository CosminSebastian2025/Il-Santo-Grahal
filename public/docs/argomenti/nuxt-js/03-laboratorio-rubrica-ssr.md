In questo laboratorio porti `rubrica-vue` dei laboratori Vue su Nuxt 4 e la trasformi in un'app con SSR, endpoint Nitro su file JSON e due modalità di rendering nella stessa codebase. L'obiettivo è toccare i punti in cui una migrazione da SPA a meta-framework si rompe: `localStorage` nel setup, router importato a mano, chiavi non deterministiche e deploy su un server che non conosce i fallback. Alla fine avrai una build pronta per `node .output/server/index.mjs` con un criterio di uscita misurabile.

## Obiettivi

- Trasformare pagine e composables di una SPA Vue in pagine e composables Nuxt 4.
- Scrivere server route in `server/api/` con storage su file e validazione minimale.
- Usare `useAsyncData` per SSR dei contatti e `useState` per lo stato condiviso.
- Applicare `routeRules` diverse a `/` (prerender) e `/admin/**` (SPA).
- Verificare il risultato con curl sull'HTML e con `nuxt build` + `node .output/server/index.mjs`.

## Migrazione: da Vite a Nuxt

```bash
npm create nuxt@latest rubrica-nuxt
cd rubrica-nuxt && npm install
npm install -D @vue/test-utils vitest @nuxt/test-utils
npm run dev
```

| File della SPA | Destinazione in Nuxt | Cosa cambia |
| --- | --- | --- |
| `src/router/index.ts` | `app/pages/` | le rotte diventano file |
| `src/views/ListaView.vue` | `app/pages/index.vue` | niente `useRouter` manuale |
| `src/views/DettaglioView.vue` | `app/pages/contatti/[id].vue` | `id` da `useRoute()`, non da props del router |
| `src/composables/useContatti.ts` | `app/composables/useContatti.ts` | `localStorage` fuori dal setup |
| `src/components/RigaContatto.vue` | `app/components/RigaContatto.vue` | auto-import, niente `import` |
| — (API esterna) | `server/api/contatti/` | l'API entra nel repository |

La migrazione più delicata è `useContatti`. Nella SPA creava lo stato al primo uso e leggeva `localStorage` all'inizio: sul server quel codice non funziona, perché `localStorage` non esiste e lo stato di modulo sarebbe condiviso tra tutti gli utenti serviti dallo stesso processo. In Nuxt lo stato per richiesta si crea con `useState`, e la persistenza sul client avviene solo in un hook.

```ts
// app/composables/useContatti.ts
export interface Contatto { id: number; nome: string; email: string; tag: string[] }

export function useContatti() {
  const contatti = useState<Contatto[]>('contatti', () => [])
  const caricati = useState<boolean>('contatti-caricati', () => false)

  async function carica(segnale?: AbortSignal) {
    if (caricati.value) return
    const dati = await $fetch<Contatto[]>('/api/contatti', { signal: segnale })
    contatti.value = dati
    caricati.value = true
  }

  async function salva(patch: Omit<Contatto, 'id'> & { id?: number }) {
    const salvato = await $fetch<Contatto>('/api/contatti', { method: 'POST', body: patch })
    const i = contatti.value.findIndex((c) => c.id === salvato.id)
    if (i >= 0) contatti.value[i] = salvato
    else contatti.value.push(salvato)
  }

  function rimuovi(id: number) {
    contatti.value = contatti.value.filter((c) => c.id !== id)
    return $fetch(`/api/contatti/${id}`, { method: 'DELETE' })
  }

  return { contatti, carica, salva, rimuovi }
}
```

`useState` genera una chiave unica per richiesta e serializza il valore nel payload: le modifiche fatte sul server durante il SSR sopravvivono all'idratazione. Se usassi `ref` a livello di modulo, ogni utente vedrebbe i contatti dell'altro sul server: è il bug classico quando si copia il codice da una SPA.

## Da file JSON a endpoint Nitro

I server route leggono e scrivono un file JSON nella cartella di lavoro del processo. La prima versione può usare `node:fs/promises`, ma serve una coda perché due `POST` paralleli possono fare read-modify-write in modo intersecato e perdere una scrittura.

```ts
// server/utils/db.ts
import { readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'

const file = join(process.cwd(), 'data', 'contatti.json')
let scritture: Promise<unknown> = Promise.resolve() // coda: una sola scrittura alla volta

export async function leggiTutti() {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return []
  }
}

export function aggiornaJson(trasforma: (righe: any[]) => any[]) {
  scritture = scritture.then(async () => {
    const righe = trasforma(await leggiTutti())
    await writeFile(`${file}.tmp`, JSON.stringify(righe, null, 2))
    await rename(`${file}.tmp`, file) // rename atomico: niente file troncati
  })
  return scritture
}
```

La scrittura su file temporaneo più `rename` evita il caso in cui il processo muore a metà e lascia un JSON invalido. La coda serializza gli aggiornamenti dentro un processo; con più istanze il problema resta e va risolto con database o lock distribuito, quindi in produzione la strada è un adapter SQLite o Postgres.

```ts
// server/api/contatti/index.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<Contatto>>(event)
  const nome = String(body?.nome ?? '').trim()
  const email = String(body?.email ?? '').trim()

  if (nome.length < 2) throw createError({ statusCode: 400, statusMessage: 'Nome troppo corto' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email non valida' })
  }

  let creato: Contatto
  await aggiornaJson((righe) => {
    const id = righe.reduce((m, r) => Math.max(m, r.id), 0) + 1
    creato = { id, nome, email, tag: Array.isArray(body.tag) ? body.tag : [] }
    return [...righe, creato]
  })
  setResponseStatus(event, 201)
  return creato
})
```

Il client non deve mai calcolare l'id: lo assegna il server dentro la sezione critica, altrimenti due schede aperte generano contatti con lo stesso identificativo.

## Pagine, rendering e verifica

La home è una pagina prerenderizzata con lista contatti, e usa `useAsyncData` per portare i dati dentro l'HTML. La parte admin è una SPA dietro un middleware che legge un cookie.

```vue
<!-- app/pages/index.vue -->
<script setup lang="ts">
const { contatti, carica } = useContatti()
const { data, pending } = await useAsyncData(
  'contatti-lista',
  async (_nuxtApp, { signal }) => {
    await carica(signal)          // abortita se l'utente cambia rotta durante l'attesa
    return contatti.value
  }
)

useHead({ title: `Rubrica — ${data.value?.length ?? 0} contatti` })
</script>

<template>
  <h1 v-if="pending">Caricamento</h1>
  <ul v-else><RigaContatto v-for="c in data" :key="c.id" :contatto="c" /></ul>
</template>
```

```ts
// app/middleware/admin.ts
export default defineNuxtRouteMiddleware((to) => {
  const autenticato = useCookie('sessione').value !== undefined
  if (!autenticato) return navigateTo('/login')
})
```

Le `routeRules` completano il quadro: home prerenderizzata in build, admin in modalità SPA, API senza SSR.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  routeRules: {
    '/': { prerender: true },
    '/admin/**': { ssr: false },
    '/api/**': { cors: true },
  },
})
```

Verifica passo passo, con il server di produzione avviato:

```bash
npm run build                     # crea .output/ e .output/public/
node .output/server/index.mjs     # ambiente Node >= 20, PORT di default 3000
curl -s localhost:3000/ | grep -c '<li'      # > 0: contatti nell'HTML
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/admin   # 200 (shell SPA)
curl -s -X POST localhost:3000/api/contatti -H 'content-type: application/json' \
  -d '{"nome":"Ada","email":"ada@esempio.it"}'                 # 201 con id
curl -s -X POST localhost:3000/api/contatti -H 'content-type: application/json' \
  -d '{"nome":"A","email":"x"}'                                # 400
ls .output/public/index.html .output/public/admin               # statico pronto
```

Se la home è in `prerender` ma contiene dati dinamici, la build congela lo stato al momento del build: è accettabile per una vetrina, non per una rubrica dove un utente aggiunge un contatto. La soluzione corretta è rendere la home SSR (`swr` o nessuna regola) e predisporre un hook `nitro.prerender` attento a questo dettaglio.

## Esercizi

1. Aggiungi `GET /api/contatti/:id` con gestione esplicita del 404 e test con `@nuxt/test-utils`.
2. Aggiungi `useAsyncData` nella pagina dettaglio con `watch` sul parametro `id` e verifica con DevTools che il refetch parta una volta sola.
3. Implementa un endpoint `GET /api/export` che restituisce `text/csv` con `setHeader` e `sendStream`.
4. Sposta lo storage su `better-sqlite3` e confronta il comportamento con 10 `POST` concorrenti.

<details>
<summary>Soluzione</summary>

1. `server/api/contatti/[id].get.ts` legge `getRouterParam`, cerca nell'array e lancia `createError({ statusCode: 404 })`; il test usa `$fetch` dalla `setup()` di `@nuxt/test-utils` e si aspetta un reject con `statusCode`.

2. Con `watch: [() => rotta.params.id]` e chiave `() => 'contatto-' + rotta.params.id` la richiesta parte per ogni id; se la chiave resta costante la cache restituisce il contatto precedente, bug visibile solo navigando tra due dettagli consecutivi.

3. `setResponseHeaders(event, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="contatti.csv"' })` e `send(event, csv)`; per dataset grandi si costruisce `Readable.from(righe)` e si passa a `sendStream`.

4. Con SQLite l'atomicità è delegata al database e la coda manuale diventa superflua; il test concorrente mostra id consecutivi senza duplicati e nessun 500. Con il file JSON e senza coda, invece, alcune POST si sovrascrivono.

</details>

## Errori comuni

- **Stato di modulo condiviso**: `const contatti = ref([])` fuori dalla funzione composable viene riusato tra utenti durante il SSR.
- **API chiamata con URL assoluto al proprio dominio**: nel SSR la richiesta esce al server e rientra, raddoppiando il costo; usa path relativi.
- **Prerender con dati personalizzati**: la home congelata al build mostra i contatti del momento della build.
- **`rename` su un mount diverso o assente**: con `data/` fuori dal processo, la scrittura atomica fallisce; verifica il percorso con `process.cwd()` nel container.
- **Build senza `PORT`**: in produzione `nuxt preview` non è il server; si usa `.output/server/index.mjs` con variabili dell'host.

## In sintesi

La migrazione da SPA a Nuxt sposta responsabilità: lo stato diventa per richiesta con `useState`, i dati vengono dichiarati con `useAsyncData` e prodotti dai server route Nitro, e il rendering si regola per rotta. Lo storage su file è un punto di partenza didattico che serve a capire atomicità e concorrenza, prima di passare al database. Il criterio di uscita, HTML che contiene i dati, 400 sugli input invalidi e artefatti in `.output`, distingue un laboratorio da una demo.

## Fonti

- [Nuxt - Directory Structure: Server](https://nuxt.com/docs/guide/directory-structure/server)
- [Nuxt - Data Fetching](https://nuxt.com/docs/getting-started/data-fetching)
- [Nuxt - Rendering Modes](https://nuxt.com/docs/guide/concepts/rendering)
- [Nuxt - Deployment](https://nuxt.com/docs/getting-started/deployment)
