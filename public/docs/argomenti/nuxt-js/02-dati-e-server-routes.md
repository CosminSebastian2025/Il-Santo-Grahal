In un'app Nuxt i dati non si scaricano "nel client al mount": si dichiarano e il framework decide se eseguire la richiesta sul server prima dell'HTML, trasferire il payload al client e idratare senza rieseguirla. Le API che rendono possibile questo sono `useAsyncData` e `useFetch`, i server route in `server/api/` e `$fetch` come client HTTP universale. Questa lezione spiega il contratto di queste funzioni, come evitare il doppio fetch e come proteggere il payload che finisce nell'HTML.

## Obiettivi

- Usare `useAsyncData` e `useFetch` conoscendo chiavi di cache, refetch e stato di errore.
- Creare server route Nitro con validazione, status code e accesso a runtime config.
- Evitare il doppio fetch (SSR + client) e capire quando usare `watch`.
- Riconoscere cosa finisce nel payload serializzato e cosa non deve finirci.

## `useFetch`: dati, chiavi e hydration

`useFetch` è un wrapper di `useAsyncData` più `$fetch`: prende un URL (o una funzione che costruisce la richiesta) e restituisce `data`, `pending`, `error`, `refresh`. La chiave di cache, se non la passi, è derivata da URL e opzioni; passarla esplicitamente è obbligatorio quando la richiesta dipende da parametri reattivi, altrimenti due componenti con la stessa rotta condividono il risultato sbagliato.

```vue
<!-- app/pages/contatti/index.vue -->
<script setup lang="ts">
interface Contatto { id: number; nome: string; email: string }

const ricerca = ref('')
const { data: contatti, pending, error, refresh } = await useFetch<Contatto[]>('/api/contatti', {
  query: { q: ricerca },        // diventa una query string riattiva
  key: 'contatti-ricerca',      // esplicita: include il parametro reattivo
  watch: [ricerca],             // refetch al cambio di `ricerca`
  default: () => [],
})
</script>

<template>
  <input v-model="ricerca" type="search" />
  <p v-if="pending">Caricamento…</p>
  <p v-else-if="error">Errore {{ error.statusCode }}: {{ error.message }}</p>
  <ul v-else>
    <li v-for="c in contatti" :key="c.id">{{ c.nome }}</li>
  </ul>
  <button @click="refresh()">Aggiorna</button>
</template>
```

Il `await` alla fine del `setup` è ciò che permette al server di aspettare i dati prima di serializzare l'HTML. Senza `await` la pagina arriva vuota e i dati entrano dopo l'idratazione: nei casi in cui il contenuto è dietro un'interazione va bene, nella maggior parte dei casi no.

| Funzione | Quando usarla | Specifiche |
| --- | --- | --- |
| `useFetch` | URL JSON, GET | query reattiva, `watch`, `headers`, `method` |
| `useAsyncData` | qualsiasi funzione (DB, file, SDK) | la funzione deve essere "server-safe" |
| `$fetch` | invio form, chiamate in eventi |nessuna cache, nessun payload |
| `callOnce` | operazione una volta per caricamento pagina | analytics, init |

`useAsyncData` ha la stessa superficie ma riceve una funzione: è il punto in cui un'app reale sostituisce la HTTP con una query al database o una chiamata a un CMS.

```ts
const { data: articolo } = await useAsyncData(
  () => `articolo-${rotta.params.slug}`,   // chiave esplicita nel primo argomento
  (_nuxtApp, { signal }) =>
    query(`SELECT titolo, corpo FROM articoli WHERE slug = $1`, [rotta.params.slug], { signal }),
  { watch: [() => rotta.params.slug] }
)
```

Il `signal` passato dal contesto aborta la richiesta quando la navigazione cambia: usarlo significa non lasciare connessioni aperte verso il DB quando l'utente cambia pagina a metà caricamento.

## Server route: l'API dentro lo stesso repository

Nella lezione precedente la rubrica chiamava una API esterna; in Nuxt puoi mettere gli endpoint accanto alla UI. Un file in `server/api/contatti/index.get.ts` risponde a `GET /api/contatti`, un file `[id].put.ts` a `PUT /api/contatti/:id`. Nei server route puoi leggere query, body, headers e scrivere lo status code.

```ts
// server/api/contatti/index.get.ts
export default defineEventHandler(async (event) => {
  const q = getQuery(event).q
  if (q !== undefined && typeof q !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Parametro q non valido' })
  }
  const qn = (q ?? '').trim().slice(0, 64)

  const righe = await $db.query(
    'SELECT id, nome, email FROM contatti WHERE ($1 = \'\' OR nome ILIKE $2) ORDER BY nome LIMIT 100',
    [qn, `%${qn}%`]
  )
  return righe
})
```

Tre regole per un handler robusto: validare l'input in ingresso (Nitro non ha schema implicito), non restituire mai il record completo se contiene campi interni, e usare `createError` con `statusCode` per avere errori tipizzati che `useFetch` espone in `error.value.statusCode`. Gli endpoint relativi funzionano indifferentemente su server e client perché `$fetch` con path relativo usa il server Nitro nel SSR senza passare da Internet: un `useFetch('/api/contatti')` in fase SSR esegue la handler internamente.

Le variabili di configurazione seguono lo stesso principio: valori pubblici in `runtimeConfig.public`, segreti fuori da `public`, e accesso con `useRuntimeConfig(event)` dentro gli handler.

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    tokenServizio: '',               // solo server, mai nel bundle client
    public: { baseGeocoder: 'https://nominatim.openstreetmap.org' },
  },
})
```

Per sovrascrivere in produzione si usa una variabile d'ambiente con prefisso `NUXT_` e il nome convertito in maiuscolo con underscore: `NUXT_TOKEN_SERVIZIO` per `tokenServizio`, `NUXT_PUBLIC_BASE_GEOCODER` per `public.baseGeocoder`. Un errore di battitura non produce alcun errore: il valore resta quello di default, quindi conviene validare la config in un plugin all'avvio.

## Payload, caching e doppio fetch

Il payload serializzato contiene i risultati di `useAsyncData`/`useFetch` per la rotta corrente: ogni oggetto che restituisci finisce nell'HTML. Se un handler restituisce la riga completa del database con `passwordHash`, quel campo è nel sorgente della pagina. La pratica corretta è selezionare le colonne nel server route, non filtrare nel client.

Il doppio fetch succede quando la chiave cambia tra SSR e client: URL relativo risolto diversamente, `Date.now()` nella query, o un valore letto da `localStorage` nel setup. Il risultato è un secondo giro di rete e un lampo di contenuto cambiato. Si diagnostica confrontando i log delle richieste: nel server deve comparire una richiesta, nel browser zero finché non c'è interazione o `refresh()`.

| Sintomo | Causa tipica | Correzione |
| --- | --- | --- |
| `pending` solo lato client | `useFetch` senza `await` | `await useFetch(...)` nel setup |
| dati uguali ma richiesta doppia | chiave non deterministica | chiave esplicita su valori stabili |
| refetch a ogni purga di cache | `getCachedData` non definito | `getCachedData: (k) => nuxtApp.payload.data[k]` |
| dati personali nel sorgente | handler restituisce troppo | selezione colonne e test del payload |

Per le risposte con cache, `getCachedData` permette di riusare il payload per un periodo o per tutta la sessione; per contenuti che devono essere sempre freschi usa `server: false` (fetch solo client) oppure `cache: 'no-cache'` su `$fetch`.

## Errori comuni

- **`useFetch` chiamato in un event handler**: gli hook di dati funzionano in `setup`; per un click usa `$fetch` e gestisci lo stato a mano.
- **`watch` su un oggetto invece che su un getter**: `watch: [filtri]` non reagisce alle mutazioni interne; passa `() => filtri.value.q`.
- **Segreti in `runtimeConfig.public`**: quel contenuto è nel bundle client.
- **Dimenticare `await` davanti a `useAsyncData`**: il compilatore lo tollera, il SSR restituisce una pagina senza contenuto.
- **Gestire errori solo con `try/catch` nel componente**: `useFetch` espone già `error`; un throw in setup durante SSR produce una pagina di errore 500 invece di una UI utile.

## In sintesi

In Nuxt i dati si dichiarano nel componente con `useAsyncData`/`useFetch` e si producono nel server con i server route Nitro: stessa origine, stessa validazione, stesso payload. Il `await` abilita il SSR dei dati, la chiave esplicita evita risultati sbagliati e doppi fetch, `statusCode` e `createError` rendono gli errori trattabili. La configurazione separa ciò che può finire nel browser da ciò che deve restare sul server.

## Fonti

- [Nuxt - Data Fetching](https://nuxt.com/docs/getting-started/data-fetching)
- [Nuxt - Server Directory](https://nuxt.com/docs/guide/directory-structure/server)
- [Nuxt - Runtime Config](https://nuxt.com/docs/guide/going-further/runtime-config)
- [Nuxt - `useState`](https://nuxt.com/docs/api/composables/use-state)
