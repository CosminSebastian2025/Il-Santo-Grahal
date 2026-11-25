Svelte è un framework frontend che sposta il lavoro dal browser al momento della compilazione: i file `.svelte` non vengono interpretati a runtime, ma tradotti in JavaScript che aggiorna direttamente il DOM. Con Svelte 5 il modello di reattività è cambiato in profondità, passando da un compilatore che riscriveva le assegnazioni alle *rune*, funzioni speciali come `$state` e `$derived` che funzionano anche fuori dai componenti. In questa lezione impari la struttura dei componenti, il sistema delle rune e il ciclo di vita minimo per costruire un'interfaccia funzionante.

## Obiettivi

- Riconoscere la struttura di un file `.svelte`: script, markup, stile con scope locale.
- Usare le rune `$state`, `$derived` e `$effect` sapendo perché servono.
- Passare dati ai componenti con `$props` e farlo fluire verso l'alto con callback o `$bindable`.
- Scrivere condizioni e liste con `{#if}`, `{#each}` e chiavi stabili.
- Capire cosa finisce nel bundle e perché Svelte non ha un runtime virtual DOM.

## Anatomia di un componente Svelte

Un file `.svelte` contiene fino a tre blocchi opzionali, in qualsiasi ordine: `<script>` con la logica, il markup con le espressioni `{}`, e `<style>` che per default vale solo per quel componente. Il compilatore aggiunge una classe hash agli elementi e ai selettori, ottenendo lo scoping senza CSS-in-JS a runtime.

```svelte
<script>
  let contatore = $state(0);
  const doppio = $derived(contatore * 2);
</script>

<button onclick={() => contatore++}>
  Clic: {contatore} (doppio: {doppio})
</button>

<style>
  button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
  }
</style>
```

Il markup usa gli attributi evento nativi (`onclick`, non `on:click` come in Svelte 4) e le graffe interpolano espressioni JavaScript arbitrarie. La regola pratica: tutto ciò che è reattivo nasce nello `<script>` con una runa; ciò che è costante resta una normale `let`/`const`.

| Blocco | Ruolo | Note di compilazione |
| --- | --- | --- |
| `<script>` | stato, props, import | eseguito una volta per istanza |
| `<script module>` | codice condiviso | eseguito una volta per modulo |
| markup | vista dichiarativa | compilato in operazioni DOM mirate |
| `<style>` | stile locale | selettori scopati con hash |
| `{@html ...}` | HTML grezzo | non sanitizzato, da usare con cautela |

## Rune: stato, derivazione ed effetti

Le rune sono dichiarazioni di intento. `$state` crea un valore reattivo, `$derived` un valore calcolato che si aggiorna quando le dipendenze cambiano, `$effect` un blocco con effetti collaterali che viene rieseguito con tracciamento automatico delle dipendenze. Il vantaggio rispetto a Svelte 4 è che funzionano anche in file `.svelte.js`/`.svelte.ts`, quindi la logica di stato può vivere fuori dalla UI.

```svelte
<script>
  let filtro = $state("");
  const elenco = $state(["mela", "banana", "mirtillo"]);
  const filtrati = $derived(elenco.filter((f) => f.includes(filtro)));

  $effect(() => {
    console.log(`${filtrati.length} risultati per "${filtro}"`);
  });
</script>

<input bind:value={filtro} placeholder="Cerca frutto" />
<ul>
  {#each filtrati as frutto (frutto)}
    <li>{frutto}</li>
  {/each}
</ul>
```

`bind:value` collega in due direzioni l'input alla variabile: senza binding dovresti gestire `oninput`. Le rune non richiedono import espliciti: sono riconosciute dal compilatore, che le rimpiazza con chiamate interne al modulo `svelte/internal`.

| Runa | Scopo | Ri-esecuzione |
| --- | --- | --- |
| `$state` | valore o oggetto reattivo | quando viene riassegnato/mutato |
| `$derived` | espressione calcolata | quando cambiano le dipendenze |
| `$derived.by` | calcolo con blocco | idem, per più righe |
| `$effect` | sincronizzazione con il mondo esterno | al mount e alle dipendenze cambiate |
| `$props` | input del componente | alla ricezione di nuove props |

## Props, eventi e flusso dei dati

In Svelte 5 le props si dichiarano con `$props()` e la destrutturazione con default e rest: la stessa riga sostituisce `export let` e `$$restProps` di Svelte 4. Il flusso resta unidirezionale: il figlio comunica al padre invocando una funzione passata come prop, oppure usa una prop `$bindable()` che il padre collega con `bind:`.

```svelte
<!-- Contatore.svelte -->
<script>
  let { valore = 0, min = 0, onCambia } = $props();
</script>

<button disabled={valore <= min} onclick={() => onCambia(valore + 1)}>
  +1 ({valore})
</button>
```

```svelte
<!-- App.svelte -->
<script>
  import Contatore from "./Contatore.svelte";
  let totale = $state(0);
</script>

<Contatore valore={totale} onCambia={(v) => (totale = v)} />
<p>Totale: {totale}</p>
```

Il componente non modifica `valore`: riceve il numero e notifica il cambio. È lo stesso schema di React con le callback, ma senza `useState` né dipendenze negli array di `useEffect`. Per gli stati trasversali resta disponibile `svelte/store` con `writable` e `readable`, che convivono con le rune e si leggono nei componenti con il prefisso `$`.

## Errori comuni

- **Aspettarsi che un oggetto creato fuori da `$state` sia reattivo**: una `let` normale non fa aggiornare la vista; serve `$state` anche per oggetti e array.
- **Usare `$effect` per calcolare valori derivati**: per i calcoli si usa `$derived`; l'effetto non deve scrivere stato che uno `$derived` potrebbe produrre, altrimenti si creano aggiornamenti a catena.
- **Dimenticare la chiave in `{#each}`**: senza `(id)` Svelte riusa i nodi per indice e lo stato locale dei figli finisce sull'elemento sbagliato.
- **Scrivere `on:click` in un progetto Svelte 5**: la sintassi con due punti è legacy e genera avvisi; si usa `onclick`.
- **Presumere che lo `<style>` globale si applichi ai figli**: gli stili sono scopati; per arrivare a un componente serve `:global(...)` o una prop che esponga una classe.

## In sintesi

Svelte compila componenti `.svelte` in aggiornamenti DOM mirati, senza virtual DOM. Le rune rendono il modello di reattività esplicito: `$state` per lo stato, `$derived` per i calcoli, `$effect` per gli effetti, `$props` per gli input. Il flusso dei dati resta unidirezionale tramite callback o binding espliciti, e gli stili sono locali per default. Capito questo, il passo successivo è la composizione dell'applicazione: routing, dati asincroni e packaging.

## Fonti

- [Svelte - Overview](https://svelte.dev/docs/svelte/overview)
- [Svelte - $state](https://svelte.dev/docs/svelte/$state)
- [Svelte - $derived](https://svelte.dev/docs/svelte/$derived)
- [Svelte - $effect](https://svelte.dev/docs/svelte/$effect)
