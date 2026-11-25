Un componente Vue si regge su quattro pilastri: props in ingresso, eventi in uscita, `v-model` quando serve un valore a due vie e composables per condividere logica. La parte delicata non è la sintassi ma il disegno del confine: chi possiede lo stato, chi può mutarlo e come renderlo riusabile senza accoppiare i componenti all'applicazione. In questa lezione costruisci un campo quantitativo completo, con validazione, `defineModel` e un composable con cleanup, e vedi come combinare `input` e `change` senza duplicare gli aggiornamenti.

## Obiettivi

- Definire props tipizzate con default corretti, inclusi oggetti e array.
- Emettere eventi con validazione e usare `v-model` sul componente tramite `defineModel`.
- Separare logica riusabile in un composable con stato, computed e cleanup in `onScopeDispose`.
- Scegliere tra stato locale, props per riferimento e store Pinia.

## Props, eventi e `v-model`

`defineProps` accetta un oggetto di opzioni o, con il compilatore TypeScript, un tipo generico. I default di tipo oggetto vanno restituiti da una factory: un oggetto scritto inline viene condiviso da tutte le istanze e mutato in comune.

```vue
<script setup lang="ts">
export interface Opzione { id: string; etichetta: string }

const props = withDefaults(
  defineProps<{
    opzioni: Opzione[]
    selezionati?: string[]
    totale?: number
  }>(),
  { selezionati: () => [], totale: 100 }
)

const emit = defineEmits<{
  (e: 'update:selezionati', valore: string[]): void
  (e: 'oltre-limite', quantita: number): void
}>()
</script>
```

In Vue 3.4+ `defineModel` elimina il boilerplate di `props.modelValue` più `emit('update:modelValue')`: restituisce un `ref` scrivibile sincronizzato con il parent, e la prop obbligatoria diventa implicita.

```vue
<script setup lang="ts">
const modello = defineModel<number>({ default: 1 })
const ricerca = defineModel<string>('ricerca', { default: '' })

const props = withDefaults(defineProps<{ max: number; min?: number }>(), { min: 0 })

function aggiorna(evento: Event) {
  const n = Number((evento.target as HTMLInputElement).value)
  modello.value = Math.min(Math.max(Number.isFinite(n) ? n : props.min, props.min), props.max)
}
</script>

<template>
  <input :value="modello" type="number" @input="aggiorna" />
  <input v-model.trim="ricerca" type="search" />
</template>
```

L'uso nel parent è simmetrico: `<Quantita v-model="pezzi" v-model:ricerca="q" :max="5" />`. Su `v-model` di input nativi aggiungi i modificatori: `.lazy` si sincronizza su `change` invece che su ogni tasto, `.number` converte, `.trim` taglia gli spazi.

| Meccanismo | Direzione | Quando usarlo |
| --- | --- | --- |
| props | parent → figlio | dati immutabili dal punto di vista del figlio |
| evento `defineEmits` | figlio → parent | azioni discrete (`salva`, `chiudi`) |
| `v-model` / `defineModel` | due vie | controlli di form riutilizzabili |
| provide/inject | antenato → discendenti | tema, i18n, sessioni; non per stato applicativo che cambia spesso |
| composable `use*` | condiviso | logica riusabile anche tra rami diversi dell'albero |
| Pinia | globale | stato condiviso da rotte e moduli non imparentati |

## Composables: logica riusabile con cleanup

Un composable è una funzione che usa le API Vue e restituisce stato reattivo. La regola è che il suo nome inizia per `use`, così linters e lettori capiscono che può chiamare `onMounted` e simili. Il cleanup va registrato con `onScopeDispose`, che funziona sia dentro un componente sia dentro `effectScope`.

```ts
// composables/useRicerca.ts
import { ref, watch, onScopeDispose } from 'vue'

export function useRicerca<T>(cerca: (q: string, segnale: AbortSignal) => Promise<T[]>, attesa = 300) {
  const query = ref('')
  const risultati = ref<T[]>([])
  const caricamento = ref(false)
  const errore = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | undefined
  let inVolo: AbortController | null = null

  watch(query, (q) => {
    clearTimeout(timer)
    timer = setTimeout(async () => {
      inVolo?.abort()
      inVolo = new AbortController()
      caricamento.value = true
      try {
        risultati.value = await cerca(q, inVolo.signal)
        errore.value = null
      } catch (e) {
        if ((e as Error).name !== 'AbortError') errore.value = String(e)
      } finally {
        caricamento.value = false
      }
    }, attesa)
  })

  onScopeDispose(() => {
    clearTimeout(timer)
    inVolo?.abort()
  })

  return { query, risultati, caricamento, errore }
}
```

Nel componente diventa una riga, con una funzione iniettata che riceve già il segnale di annullamento:

```ts
const ricercaLibri = (q: string, signal: AbortSignal) =>
  fetch(`/api/libri?q=${encodeURIComponent(q)}`, { signal }).then((r) => r.json())

const { query, risultati, caricamento } = useRicerca(ricercaLibri)
```

Quando il componente viene smontato, il timer e la richiesta pendente spariscono: senza questo cleanup una navigazione veloce lascia fetch fantasma e aggiornamenti su stato di componenti distrutti.

Lo stesso contratto vale per i pacchetti pubblici: VueUse fornisce centinaia di composables (`useDebounceFn`, `useIntersectionObserver`, `useStorage`) costruiti con le stesse convenzioni. Non riscriverli a mano se puoi dipendere da loro, ma leggi il loro codice sorgente: è la migliore documentazione di un composable ben fatto.

## Scegliere dove vive lo stato

La prima domanda in un'app reale è dove mettere un pezzo di stato. La regola pratica:

1. **Stato locale** se serve solo a quel componente e non a fratelli lontani: `ref` dentro `setup`.
2. **Stato sollevato** se due componenti vicini ne hanno bisogno: lo mette il parent e lo passa con props e `v-model`.
3. **Composable con `effectScope`** se la logica è condivisa ma le istanze sono indipendenti: ogni chiamata crea il proprio stato.
4. **Pinia** solo quando l'accesso è trasversale: una rotta scrive lo stato e un'altra lo legge, oppure un componente di layout ne ha bisogno senza essere imparentato.

Pinia offre anche errore utile: una store è un `reactive` gestito dal framework, quindi non conta come "scorciatoia" per evitare props: se nessun componente scorre props, aggiungere una store aumenta l'accoppiamento implicito e rende più difficile il testing isolato.

```ts
// stores/carrello.ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useCarrello = defineStore('carrello', () => {
  const articoli = ref<{ sku: string; prezzo: number; qta: number }[]>([])
  const totale = computed(() => articoli.value.reduce((s, a) => s + a.prezzo * a.qta, 0))

  function aggiungi(sku: string, prezzo: number, qta = 1) {
    const trovato = articoli.value.find((a) => a.sku === sku)
    if (trovato) trovato.qta += qta
    else articoli.value.push({ sku, prezzo, qta })
  }

  return { articoli, totale, aggiungi }
})
```

## Errori comuni

- **Default di props mutati**: `defineProps({ lista: { default: [] } })` condivide lo stesso array tra istanze; usa sempre una factory.
- **Mutare direttamente una prop**: Vue emette solo un warning in dev, ma il parent diventa incoerente; emetti un evento o usa `defineModel`.
- **`watch` su valore destrutturato**: `watch(model.value, cb)` lancia o non reagisce; passa sempre il ref o un getter.
- **Composable con stato condiviso per errore**: un `const stati = reactive({})` fuori dalla funzione condiviso tra tutte le chiamate; spostalo dentro o usa `effectScope`.
- **Dimenticare l'abort**: la ricerca parte due volte e vince la risposta più lenta, non quella giusta.
- **Usare Pinia per stato locale di pagina**: dopo la navigazione lo stato vecchio resta vivo e si mescola alla nuova rotta.

## In sintesi

Props, eventi, `v-model` e composables coprono casi diversi dello stesso problema: come far comunicare parti dell'applicazione senza accoppiarle. `defineModel` in 3.4 semplifica i form; `withDefaults` risolve i default dei tipi complessi; il composable con `onScopeDispose` rende riusabile anche il codice con side effect; e la scelta dello stato parte dal più locale per salire a Pinia solo quando l'accesso è davvero trasversale.

## Fonti

- [Vue.js - Props](https://vuejs.org/guide/components/props.html)
- [Vue.js - Component Events](https://vuejs.org/guide/components/events.html)
- [Vue.js - `v-model` on components](https://vuejs.org/guide/components/v-model.html)
- [Vue.js - Composables](https://vuejs.org/guide/reusability/composables.html)
