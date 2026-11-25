La reattività è il cuore di Svelte e anche il punto in cui gli sviluppatori arrivati da altri framework sbagliano più spesso. Svelte 5 ha sostituito il vecchio modello "il compilatore riscrive le assegnazioni" con le rune, un insieme di primitive esplicite: uno stato profondo, valori derivati con memoizzazione, effetti con tracciamento automatico, contesto e moduli reattivi. Questa lezione mostra come combinare questi strumenti in applicazioni reali, incluse le API asincrone di SvelteKit e gli store di compatibilità.

## Obiettivi

- Controllare la granularità della reattività con `$state`, `$state.raw` e `$state.snapshot`.
- Derivare dati costosi con `$derived.by` e distinguere `$effect` da `$effect.pre`.
- Condividere stato tra componenti con `getContext`/`setContext` invece di prop drilling.
- Usare store e moduli reattivi (`.svelte.js`) dove le rune non bastano.
- Gestire dati asincroni con `{#await}` e le promise nei template.

## Granularità dello stato

`$state` crea un proxy profondo: array e oggetti annidati diventano reattivi e ogni proprietà letta in un template registra una dipendenza fine. Per strutture grandi o immutabili conviene `$state.raw`, che non crea proxy e reagisce solo alla riassegnazione. `$state.snapshot` estrae una copia semplice, utile quando si passa un oggetto a API che non accettano proxy (`structuredClone`, `postMessage`, `JSON.stringify`).

```svelte
<script>
  let punti = $state.raw([]);           // reattivo solo alla riassegnazione
  const filtri = $state({ testo: "", tag: [] }); // proxy profondo

  function aggiungi(p) {
    punti = [...punti, p];            // nuovo array, non push
  }

  function esporta() {
    return JSON.stringify($state.snapshot(filtri));
  }
</script>
```

| Primitive | Traccia | Quando usarla |
| --- | --- | --- |
| `$state` | letture profonde | stato UI mutabile |
| `$state.raw` | solo riassegnazione | liste grandi, dati immutabili |
| `$state.snapshot` | nessuna, copia | serializzazione, test, worker |
| `$derived` | dipendenze ricavate | valori semplici e memoizzati |
| `$derived.by` | idem, con blocco | calcoli con più passaggi |

`$derived` è memoizzato: se nessuno legge il valore, l'espressione non viene rivalutata. Nei template Svelte 5 calcola i valori usando un doppio contatore di dirty/possibly_dirty, quindi anche un `filter` su 5.000 elementi viene rieseguito solo quando l'array o il filtro cambiano davvero.

## Effetti, contesto e moduli reattivi

`$effect` serve per parlare con il mondo esterno: DOM, timer, storage, WebSocket. Non serve per sincronizzare uno stato con un altro: per quello ci sono `$derived`. `$effect.pre` gira prima dell'aggiornamento del DOM e sostituisce l'ex `beforeUpdate`. Un effetto tipico è quello che salva su `localStorage`, che deve leggere il valore nel corpo per registrarlo come dipendenza.

```svelte
<script>
  let tema = $state("chiaro");

  $effect(() => {
    localStorage.setItem("tema", tema); // si riesegue al cambio di tema
    return () => document.body.classList.remove(`tema-${tema}`);
  });
</script>

<select bind:value={tema}>
  <option value="chiaro">Chiaro</option>
  <option value="scuro">Scuro</option>
</select>
```

La funzione restituita dall'effetto è la sua pulizia, eseguita prima della riesecuzione e allo smontaggio. Per condividere stato tra componenti lontani si usa `setContext` in un componente padre e `getContext` nei figli: il valore resta legato all'albero e non attraversa i confini di un componente come farebbe un import.

```js
// carrello.svelte.js — modulo reattivo fuori da un componente
export function creaCarrello() {
  let voci = $state([]);
  let totale = $derived(voci.reduce((s, v) => s + v.prezzo * v.qta, 0));
  return {
    get voci() { return voci; },
    get totale() { return totale; },
    aggiungi(v) { voci.push(v); },
  };
}
```

Il modulo `.svelte.js` viene compilato come un componente: le rune funzionano e lo stato è una singola istanza per import. È l'equivalente di uno store senza boilerplate, ma non è SSR-safe se è un singleton globale: su SvelteKit uno stato condiviso per request deve nascere in un `load` o nel contesto del layout.

## Dati asincroni e SvelteKit

Svelte 5 gestisce le promise direttamente nei template con `{#await}`, e SvelteKit espone i dati del server tramite `data` nelle `+page.svelte`. La combinazione tipica: un `+page.server.js` che carica e valida, una pagina che riceve `data` e uno stato locale per l'interazione.

```js
// src/routes/prodotti/+page.server.js
export function load() {
  return { prodotti: [{ id: 1, nome: "Tè verde", prezzo: 4.5 }] };
}

export const actions = {
  ordina: async ({ request }) => {
    const dati = await request.formData();
    if (!dati.get("email")) return { errore: "Email obbligatoria" };
    return { ok: true };
  },
};
```

La pagina riceve `data` dal `load` e `form` dall'ultima action inviata. La ricerca locale è uno `$state` derivato sui dati del server: nessuna copia, nessuna fetch aggiuntiva.

```svelte
<script>
  let { data, form } = $props();
  let ricerca = $state("");

  const visibili = $derived.by(() => {
    const q = ricerca.trim().toLowerCase();
    return q ? data.prodotti.filter((p) => p.nome.toLowerCase().includes(q)) : data.prodotti;
  });
</script>

{#if form?.errore}
  <p role="alert">{form.errore}</p>
{/if}

<ul>
  {#each visibili as p (p.id)}
    <li>{p.nome}</li>
  {/each}
</ul>
```

Nota due cose: `data` è una prop e non va mutata (arriva dal server a ogni navigazione), e per mutazioni del prototipo si usano le form actions, che restituiscono `form`. Gli store `writable`/`readable` di `svelte/store` restano utili per integrare librerie esterne: si leggono con `$store` nei template e con `get()` nel JavaScript.

Quando il dato non arriva dal `load` ma da una fetch avviata nel browser, `{#await}` a tre rami evita di inventare stati `loading`/`errore` a mano:

```svelte
{#await caricaRecensioni()}
  <p>Caricamento…</p>
{:then recensioni}
  <p>{recensioni.length} recensioni</p>
{:catch err}
  <p role="alert">Errore: {err.message}</p>
{/await}
```

## Errori comuni

- **Leggere uno stato dentro `$effect` senza volerlo**: basta una lettura per creare una dipendenza; se il valore serve solo nel cleanup, salvalo in una variabile esterna.
- **Scrivere stato dentro un effetto che dipende dallo stesso stato**: si genera un ciclo di aggiornamenti; il rimedio è un `$derived` o un event handler.
- **Mutare `data` di SvelteKit**: la prop è di sola lettura e viene sovrascritta alla navigazione successiva; copia in uno `$state` se ti serve modificarla.
- **Passare un proxy `$state` a `structuredClone` o a un worker**: va usato `$state.snapshot`, altrimenti si ottiene un errore di clonazione.
- **Global store SSR**: un singleton `.svelte.js` condiviso tra richieste su Node perde l'isolamento tra utenti.

## In sintesi

La reattività di Svelte 5 si costruisce con poche primitive esplicite: `$state` per i valori, `$derived` per i calcoli memoizzati, `$effect` per l'ambiente, contesto e moduli `.svelte.js` per lo stato condiviso. La granularità si sceglie con `raw` e `snapshot`, mentre la sincronizzazione con il server passa da `data` e dalle form actions di SvelteKit. Il criterio guida è uno: se un valore è calcolabile da altri, non è stato, è derivato.

## Fonti

- [Svelte - Runes](https://svelte.dev/docs/svelte/$state)
- [Svelte - Svelte reactivity](https://svelte.dev/docs/svelte/svelte-reactivity)
- [Svelte - {#await ...}](https://svelte.dev/docs/svelte/await)
- [SvelteKit - Introduction](https://svelte.dev/docs/kit/introduction)
