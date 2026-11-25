Vue 3 è un framework JavaScript per costruire interfacce dichiarative: descrivi lo stato con cui il componente deve apparire, e Vue calcola le mutazioni DOM minime per arrivarci. Il suo baricentro è il sistema di reattività basato su `Proxy`, esposto dalle API `ref` e `reactive`, e i Single-File Component (`.vue`), che tengono template, logica e stile nello stesso file. Questa lezione copre il modello che sta sotto: come si crea uno stato reattivo, come il template ci si aggancia e perché nella pratica conviene quasi sempre `ref`.

## Obiettivi

- Distinguere la reattività di `ref` da quella di `reactive` e sapere quando l'una smette di funzionare.
- Scrivere computed e watcher sapendo quando vengono ricalcolati e quando isolati.
- Capire la differenza tra setup iniziale, aggiornamento e ciclo di vita di un componente.
- Montare un'applicazione con la build senza toolchain (`createApp` + ESM) e con SFC compilati.

## Reactivity fundamentals: ref contro reactive

Vue 3 intercetta letture e scritture di proprietà tramite `Proxy`. `reactive(obj)` restituisce un Proxy sull'oggetto: le mutazioni su di esso notificano gli effetti che le hanno lette. `ref(value)` avvolge il valore in un oggetto con la proprietà `.value`, e serve perché i tipi primitivi non sono intercettabili. Dentro il template il compilatore "scompatta" automaticamente i `ref` di primo livello, quindi scrivi `{{ contatore }}` e non `{{ contatore.value }}`.

```js
import { reactive, ref, computed, isRef } from 'vue'

const stato = reactive({ filtri: [], nelCarrello: 0 }) // solo oggetti
const query = ref('') // stringhe, numeri, booleani

const filtrati = computed(() =>
  stato.filtri.filter((f) => f.includes(query.value))
)

stato.nelCarrello++      // intercettato: ok
query.value = 'rosso'    // intercettato: ok
console.log(isRef(query)) // true
```

| Criterio | `ref` | `reactive` |
| --- | --- | --- |
| tipi supportati | tutti (`string`, `number`, oggetti, array) | solo oggetti, array, `Map`, `Set` |
| accesso in JS | `.value` | diretto |
| accesso nel template | trasparente (top-level) | diretto |
| riassegnazione dell'intero valore | sì | no (perdi il Proxy) |
| destrutturazione | perde la reattività salvo `toRefs` | perde la reattività |
| stampa in console | oggetto che mostra il valore | Proxy |

La destrutturazione è la trappola principale: `const { filtri } = stato` copia il valore corrente e scollega il reference dal Proxy. Se ti serve destrutturare, usa `toRefs(stato)` oppure organizza lo stato come insieme di `ref`.

## Computed, watcher e ciclo di vita

Un `computed` è un effetto con cache: viene rivalutato solo quando una delle dipendenze reattive lette nell'ultima esecuzione cambia. Un `watch` invece esegue un callback a ogni cambiamento e riceve il valore nuovo e il vecchio.

```js
import { ref, computed, watch, onMounted } from 'vue'

const totale = ref(0)
const visibile = computed(() => totale.value > 0)

watch(
  totale,
  (nuovo, vecchio) => {
    console.log(`totale: ${vecchio} -> ${nuovo}`)
  },
  { flush: 'post' } // dopo che il DOM è stato aggiornato
)

onMounted(() => {
  totale.value = 10 // scatta watch, poi viene aggiornato il DOM
})
```

Tre dettagli che cambiano il comportamento reale:

- **`watch` su `reactive`** è implicito deep: modifica un campo e il callback parte, ma `nuovo === vecchio` perché l'oggetto è lo stesso Proxy. Per confronti usa getter: `watch(() => stato.nelCarrello, cb)`.
- **`watchEffect`** traccia automaticamente ogni proprietà letta nella sua funzione; comodo, ma un `console.log` extra dentro la funzione aggiunge dipendenze inattese e crea loop.
- **`flush`** decide il timing: `pre` (default, prima dell'aggiornamento del DOM), `post` (dopo), `sync` (immediato). Rileggere misure di layout richiede `post`.

Il ciclo di vita è quello dei componenti: `onMounted` gira quando il componente è nel DOM, `onUpdated` dopo ogni re-render, `onUnmounted` alla rimozione. Gli effetti creati in `setup` (computed, watch, watcher HTTP) vengono fermati automaticamente allo smontaggio, quindi niente `unwatch` manuale se sono registrati in modo sincrono.

## Da `createApp` ai Single-File Component

Il modo più rapido per vedere Vue funzionare è un file HTML con import map ESM: nessun bundler, template come stringa.

```html
<div id="app">{{ saluto }}</div>
<script type="importmap">
  { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
</script>
<script type="module">
  import { createApp, ref } from 'vue'
  createApp({ setup() {
    const saluto = ref('Ciao Vue')
    return { saluto }
  } }).mount('#app')
</script>
```

In un progetto reale si usa la SFC con `<script setup>`: la sintassi viene compilata in una funzione `setup()` che restituisce tutto ciò che serve al template, senza `return` manuale.

```vue
<script setup>
import { ref, computed } from 'vue'

const props = defineProps({ massimo: { type: Number, default: 100 } })
const emit = defineEmits(['cambia'])
const valore = ref(0)
const percentuale = computed(() => Math.round((valore.value / props.massimo) * 100))

function aumenta() {
  valore.value = Math.min(valore.value + 1, props.massimo)
  emit('cambia', valore.value)
}
</script>

<template>
  <button @click="aumenta">{{ valore }} / {{ props.massimo }} ({{ percentuale }}%)</button>
</template>

<style scoped>
button { padding: 0.4rem 0.8rem; }
</style>
```

`<style scoped>` aggiunge un attributo `data-v-*` al markup e riscrive i selettori, così gli stili non escono dal componente. Il template compilato usa un DOM virtuale: a ogni aggiornamento Vue differenzia l'albero e applica solo le patch necessarie, mentre le dipendenze sono tracciate a granularità di proprietà, quindi il re-render parte solo se qualcosa che il componente legge è cambiato.

## Errori comuni

- **Distruggere la reattività con la destrutturazione**: `const { conteggio } = useCounter()` perde il legame se `useCounter` restituisce un oggetto `reactive`; restituisci un oggetto di `ref` o usa `toRefs`.
- **Accedere a `reactive` prima che sia Proxy**: `const copia = { ...stato }` produce un oggetto piatto e non reattivo.
- **Mettere logica pesante dentro `computed`**: gli effetti collaterali in un computed vengono eseguiti durante il render e possono causare loop.
- **Aspettarsi che `watch` parta subito**: il default è pigro; serve `{ immediate: true }` per il primo giro.
- **Misurare il DOM in `onUpdated` con `flush: 'pre'`**: il DOM è ancora quello vecchio; usa `nextTick()` o `flush: 'post'`.

## In sintesi

Vue lavora su due livelli: `Proxy` per la reattività e un compilatore di template che converte i `ref` in valori. `ref` è la scelta di default perché copre anche i primitivi e sopravvive alle riassegnazioni; `reactive` va bene per oggetti-stato stabili e destrutturati con `toRefs`. Computed è cache e derivazione, watch è reazione e timing con `flush`. Il componente SFC con `<script setup>` rende esplicito il contratto con `defineProps` e `defineEmits`, e gli effetti registrati in `setup` si smontano da soli.

## Fonti

- [Vue.js - Reactivity Fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Vue.js - Computed Properties](https://vuejs.org/guide/essentials/computed.html)
- [Vue.js - Reactivity API: Core](https://vuejs.org/api/reactivity-core.html)
- [Vue.js - Quick Start](https://vuejs.org/guide/quick-start.html)
