In questo laboratorio costruisci `rubrica-vue`, una rubrica contatti a pagina singola con ricerca istantanea, form validato e persistenza locale. Il punto non è scrivere l'ennesima todo-list: è passare in rassegna le scelte che un progetto Vue deve fare davvero, cioè routing, stato condiviso, test dei composables, build e bundle. Ogni step produce un artefatto verificabile con comandi esatti, e alla fine avrai un'app pronta per `vite build`.

## Obiettivi

- Creare un progetto Vite + Vue 3.5 + TypeScript e strutturare cartelle e alias.
- Implementare lista, dettaglio e modifica con Vue Router in modalità history e guardia `beforeEnter`.
- Estrarre lo stato in un composable testabile con Vitest e `effectScope`.
- Limitare i re-render con `key` stabili e `v-memo`, e verificare il peso dei chunk della build.
- Verificare il criterio di uscita: ricerca fluida, test verdi, reload corretto lato server.

## Setup e struttura

```bash
npm create vue@latest rubrica-vue   # TypeScript + Router + Vitest, niente Pinia
cd rubrica-vue && npm install
npm run dev                         # http://localhost:5173
npm run test:unit -- --run          # Vitest una volta sola
npm run build                       # vite build, output in dist/ (chunk per rotta)
```

| Percorso | Contenuto | Perché lì |
| --- | --- | --- |
| `src/router/index.ts` | rotte `/`, `/contatto/:id` | un solo punto per le rotte |
| `src/composables/useContatti.ts` | stato + CRUD + persistenza | testabile senza DOM |
| `src/composables/useFiltro.ts` | filtro con `computed` | riusabile in ogni lista paginata |
| `src/views/ListaView.vue` | elenco + ricerca | componente rotta |
| `src/views/DettaglioView.vue` | form di modifica | riceve l'id da `props` della rotta |
| `src/components/RigaContatto.vue` | singola riga | `memo` per evitare re-render inutili |

Il router usa `createWebHistory()`: in sviluppo Vite gestisce il fallback, in produzione devi configurare il server per restituire `index.html` su ogni percorso sconosciuto, altrimenti un `F5` su `/contatto/3` dà 404.

```ts
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import ListaView from '@/views/ListaView.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'lista', component: ListaView },
    {
      path: '/contatto/:id(\\d+)',
      name: 'dettaglio',
      component: () => import('@/views/DettaglioView.vue'), // code splitting
      props: true,
      beforeEnter: (to) => (Number(to.params.id) > 0 ? true : { name: 'lista' }),
    },
  ],
})
```

La rotta del dettaglio è lazy: finisce in un chunk separato e non pesa sul first load. `props: true` passa `id` come prop, quindi il componente non legge `useRoute()` e si può testare con `mount(DettaglioView, { props: { id: '3' } })`.

## Stato, ricerca e persistenza

La logica sta fuori dai componenti. `useContatti` mantiene il repository come `ref` e salva su `localStorage` con un watcher `deep`, ma solo quando cambia un dato reale: un watcher che scrive a ogni render è uno dei modi più semplici per saturare il main thread.

```ts
// src/composables/useContatti.ts
import { ref, watch, readonly } from 'vue'

export interface Contatto { id: number; nome: string; email: string; tag: string[] }

const CHIAVE = 'rubrica-v1'

function carica(): Contatto[] {
  try {
    const raw = localStorage.getItem(CHIAVE)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useContatti() {
  const contatti = ref<Contatto[]>(carica()) // storage corrotto: si riparte vuoti

  watch(contatti, (v) => localStorage.setItem(CHIAVE, JSON.stringify(v)), { deep: true })

  function crea(nuovo: Omit<Contatto, 'id'>) {
    contatti.value.push({ ...nuovo, id: Date.now() })
  }

  function aggiorna(id: number, patch: Partial<Omit<Contatto, 'id'>>) {
    const c = contatti.value.find((x) => x.id === id)
    if (c) Object.assign(c, patch)
  }

  function rimuovi(id: number) {
    contatti.value = contatti.value.filter((c) => c.id !== id)
  }

  return { contatti: readonly(contatti), crea, aggiorna, rimuovi }
}
```

Due scelte pesano: `readonly()` impedisce ai componenti di fare `contatti.value.push(...)` e aggirare la validazione; lo stato è però globale al modulo e viene creato alla prima chiamata, quindi i test fra loro si contaminano. In un'app con più utenti o più istanze serve restituire un nuovo stato a ogni chiamata, oppure usare `effectScope` per isolarlo:

```ts
import { effectScope } from 'vue'
import { beforeEach, test } from 'vitest'
import { useContatti } from '@/composables/useContatti'

let use: ReturnType<typeof useContatti>
beforeEach(() => {
  localStorage.clear()
  const scope = effectScope()          // gli effetti del test finiscono qui
  use = scope.run(() => useContatti())!
})
```

La ricerca è un `computed` che normalizza query e testo una volta sola. Con 200 contatti il filtro costa meno di un millisecondo; su dataset da migliaia di voci conviene aggiungere un debounce sull'input, perché il costo dominante diventa il re-render delle righe visibili.

```ts
// src/composables/useFiltro.ts
import { ref, computed } from 'vue'

export function useFiltro<T>(sorgente: () => T[], estrai: (x: T) => string) {
  const query = ref('')
  const risultati = computed(() => {
    const q = query.value.trim().toLowerCase()
    const tutti = sorgente()
    return q ? tutti.filter((x) => estrai(x).toLowerCase().includes(q)) : tutti
  })
  return { query, risultati }
}
```

Nel template della lista usa `v-for` con `:key="contatto.id"` e `v-memo="[c.nome, c.email]"`: se la riga non è cambiata, Vue salta il diff del suo sottoalbero. Con chiavi basate sull'indice ottieni il classico bug delle righe che al filtro mostrano il testo dell'elemento precedente.

```vue
<template>
  <input v-model="query" placeholder="Cerca per nome o email" />
  <p>{{ risultati.length }} contatti</p>
  <ul>
    <li v-for="c in risultati" :key="c.id" v-memo="[c.nome, c.email]">
      <RouterLink :to="{ name: 'dettaglio', params: { id: c.id } }">{{ c.nome }}</RouterLink>
    </li>
  </ul>
</template>
```

## Form validato, test e build

Il form del dettaglio usa `defineModel` per i campi e una funzione pura per la validazione, così la stessa regola può essere testata senza montare il componente.

```ts
export function valida(c: { nome: string; email: string }) {
  const errori: Record<string, string> = {}
  if (c.nome.trim().length < 2) errori.nome = 'Almeno 2 caratteri'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) errori.email = 'Email non valida'
  return errori
}
```

I test coprono tre livelli: unità sul composable, componente con `@vue/test-utils`, integrazione della rotta.

```ts
import { mount } from '@vue/test-utils'
import RigaContatto from '@/components/RigaContatto.vue'
import { router } from '@/router'

test('link al dettaglio', async () => {
  const w = mount(RigaContatto, {
    props: { contatto: { id: 7, nome: 'Ada Lovelace', email: 'ada@esempio.it' } },
    global: { plugins: [router] },
  })
  await w.get('a').trigger('click')
  expect(router.currentRoute.value.params.id).toBe('7')
})
```

Criterio di uscita, da verificare a mano:

1. `npm run build` produce un chunk principale sotto i 100 kB gzip e un chunk separato per `DettaglioView`.
2. `npm run preview` serve l'app e `F5` sul dettaglio non restituisce 404 (con `--history-api-fallback` o server configurato).
3. Con 500 contatti generati in `localStorage`, la ricerca risponde sotto i 16 ms e la console non mostra warning di chiavi duplicate.
4. `npm run test:unit -- --run` verde e `npm run lint` senza errori.

## Esercizi

1. Aggiungi la creazione di un contatto con dialog modale e focus trap, usando `<Transition>` per l'ingresso.
2. Sostituisci `localStorage` con una API JSON e torna a gestire annullamento delle richieste al cambio di rotta.
3. Aggiungi `defineEmits` per gli eventi `crea`/`elimina` e misura il numero di re-render con l'overlay "Highlight updates" dei Vue DevTools.
4. Rompi intenzionalmente il `readonly` e osserva i warning: documenta perché le mutazioni dirette rompono la persistenza.

<details>
<summary>Soluzione</summary>

1. La modale è un componente con `v-if` e un `watch` su `open` che rimette il focus sull'elemento precedente; `<Transition>` gestisce fade e `pointer-events`. Il focus trap si implementa con keydown su Tab e query di tutti i focusabili nel contenitore.

2. Il composable accetta un `fetcher` iniettato, come `useRicerca` della lezione precedente; `flush: 'post'` nel watcher di persistenza è sostituito da una mutazione ottimistica più rollback in caso di errore HTTP.

3. Con `v-memo` corretto il contatore di render per modifica di un nome si ferma a 2 (lista e riga); senza, cresce con la lunghezza della lista, perché ogni `RigaContatto` riceve un nuovo oggetto se la sorgente viene ricreata con `map`.

4. `readonly` avvisa in dev e non modifica nulla: senza di esso il `watch` sulla `ref` originale non scatta per mutazioni dirette facendo perdere i dati a un refresh.

</details>

## Errori comuni

- **Keyggio con l'indice**: al filtro o alla rimozione l'input resta appeso alla posizione, non al contatto.
- **Router history senza fallback lato server**: in produzione ogni reload di `/contatto/:id` è un 404.
- **Persistenza in `onUpdated` invece che in un `watch`**: scrive su `localStorage` a ogni render, anche senza modifiche.
- **Test che dipendono dall'ordine**: senza `localStorage.clear()` e `beforeEach` il secondo test eredita lo stato del primo.
- **Composable che chiama `useRouter` fuori da un componente**: `inject` può essere usato solo in `setup`; passa il router come argomento o chiama il composable in `setup`.

## In sintesi

L'app separa rotta, componente e logica: il router risolve URL e code splitting, il composable possiede stato e persistenza, i componenti restano piccoli e testabili. Le chiavi stabili e `v-memo` mantengono il costo di re-render proporzionale alle modifiche, non alla lista. Il criterio di uscita implica build verificata, reload corretto lato server e test verdi: tre condizioni che distinguono un esempio da un progetto.

## Fonti

- [Vue.js - Routing](https://vuejs.org/guide/scaling-up/routing.html)
- [Vue.js - State Management](https://vuejs.org/guide/scaling-up/state-management.html)
- [Vue.js - Tooling](https://vuejs.org/guide/scaling-up/tooling.html)
- [Vue.js - Production Deployment](https://vuejs.org/guide/best-practices/production-deployment.html)
