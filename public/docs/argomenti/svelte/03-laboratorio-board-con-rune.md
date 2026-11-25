In questo laboratorio costruisci **`Svelte Attività`**, una board di task Kanban a tre colonne, con Svelte 5, SvelteKit e TypeScript, testata con Vitest e Testing Library. Il percorso è quello di un'app reale: scaffolding, modello di stato con rune fuori dal componente, componenti con props ed eventi, persistenza su `localStorage` e test che verificano sia il comportamento visibile sia la logica pura. Alla fine avrai una build statica eseguibile con `node build` e un criterio di uscita verificabile a mano.

## Obiettivi

- Creare il progetto con `npx sv create` e leggere la struttura di SvelteKit.
- Mettere la logica di dominio in un modulo `.svelte.ts` testabile senza DOM.
- Comporre componenti con `$props`, `$bindable` e callback tipizzate.
- Persistere lo stato con `$effect` e leggere il valore iniziale da `localStorage`.
- Scrivere test con Vitest: unitari sul modulo, di componente con `render`.

## Setup e struttura

```bash
npx sv create svelte-attivita --template minimal --types ts
cd svelte-attivita
npm install
npm run dev          # http://localhost:5173
```

Struttura dei file che tocchi nel laboratorio:

| Percorso | Contenuto |
| --- | --- |
| `src/routes/+page.svelte` | pagina con la board |
| `src/lib/board.svelte.ts` | stato, azioni, serializzazione |
| `src/lib/Card.svelte` | scheda con titolo e bottoni |
| `src/lib/Column.svelte` | colonna con contatore |
| `src/lib/board.test.ts` | test unitari |

La scelta chiave è tenere la logica fuori dai componenti: un modulo `.svelte.ts` compilato dal plugin Vite di Svelte permette di usare le rune e di testarlo con Vitest senza montare nulla.

## Dominio e componenti

Il modello prevede tre stati `todo`, `doing`, `done` e transizioni solo adiacenti. `creaBoard` restituisce uno stato reattivo e le azioni, e legge un valore iniziale opzionale: così i test forniscono dati deterministici.

```ts
// src/lib/board.svelte.ts
export type Stato = "todo" | "doing" | "done";
export type Attivita = { id: string; titolo: string; stato: Stato };

const successivo: Record<Stato, Stato | null> = {
  todo: "doing", doing: "done", done: null,
};

export function creaBoard(iniziale: Attivita[] = []) {
  let attivita = $state(iniziale);
  const conta = (s: Stato) => attivita.filter((a) => a.stato === s).length;

  return {
    get attivita() { return attivita; },
    get totale() { return attivita.length; },
    conta,
    aggiungi(titolo: string) {
      const id = crypto.randomUUID();
      attivita.push({ id, titolo, stato: "todo" });
    },
    avanza(id: string) {
      const a = attivita.find((x) => x.id === id);
      const prossimo = a && successivo[a.stato];
      if (a && prossimo) a.stato = prossimo;
    },
    ripristina(dati: Attivita[]) { attivita = dati; },
  };
}
```

Il componente `Card` riceve l'attività e un callback, senza sapere nulla dello stato globale. `Column` accetta un `children` snippet per il contenuto: i snippet sostituiscono gli slot di Svelte 4 e sono tipizzati come funzioni.

```svelte
<!-- src/lib/Card.svelte -->
<script lang="ts">
  import type { Attivita } from "./board.svelte";
  let { attivita, onAvanza }: { attivita: Attivita; onAvanza: (id: string) => void } = $props();
</script>

<article class="card" data-stato={attivita.stato}>
  <p>{attivita.titolo}</p>
  {#if attivita.stato !== "done"}
    <button onclick={() => onAvanza(attivita.id)}>Avanza</button>
  {/if}
</article>
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { creaBoard, type Stato, type Attivita } from "$lib/board.svelte";
  import Card from "$lib/Card.svelte";

  const CHIAVE = "svelte-attivita:v1";
  let salvate: Attivita[] = [];
  try {
    salvate = JSON.parse(localStorage.getItem(CHIAVE) ?? "[]");
  } catch { /* storage corrotto: si parte vuoti */ }

  const board = creaBoard(salvate);
  let titolo = $state("");
  const colonne: Stato[] = ["todo", "doing", "done"];

  $effect(() => {
    localStorage.setItem(CHIAVE, JSON.stringify($state.snapshot(board.attivita)));
  });

  function aggiungi() {
    if (!titolo.trim()) return;
    board.aggiungi(titolo.trim());
    titolo = "";
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); aggiungi(); }}>
  <input bind:value={titolo} aria-label="Nuova attività" />
  <button>Aggiungi</button>
</form>

<div class="board">
  {#each colonne as stato (stato)}
    <section>
      <h2>{stato} ({board.conta(stato)})</h2>
      {#each board.attivita.filter((a) => a.stato === stato) as a (a.id)}
        <Card attivita={a} onAvanza={(id) => board.avanza(id)} />
      {/each}
    </section>
  {/each}
</div>
```

Nella `$page.svelte` il `$effect` legge `board.attivita` tramite `JSON.stringify` sullo snapshot: la lettura registra la dipendenza, quindi ogni mutazione riscrive la chiave. Leggere `localStorage` nel corpo dello script è sicuro solo se la pagina è resa lato client (`ssr = false` oppure un controllo `browser`): su SvelteKit il codice server non ha `localStorage`.

## Test e criterio di uscita

```bash
npm install -D vitest jsdom @testing-library/svelte @testing-library/user-event
npx vitest run
```

I test partono dal dominio, il posto dove i bug costano di più, e poi verificano un'interazione reale nel componente.

```ts
// src/lib/board.test.ts
import { describe, it, expect } from "vitest";
import { creaBoard } from "./board.svelte";

describe("board", () => {
  it("avanza solo verso lo stato successivo", () => {
    const b = creaBoard([{ id: "1", titolo: "Scrivi test", stato: "todo" }]);
    b.avanza("1");
    expect(b.attivita[0].stato).toBe("doing");
    b.avanza("1");
    b.avanza("1"); // già done: nessun effetto, nessun errore
    expect(b.attivita[0].stato).toBe("done");
  });

  it("conta per colonna e ignora i titoli vuoti", () => {
    const b = creaBoard();
    b.aggiungi("Deploy");
    b.aggiungi("   ");
    expect(b.totale).toBe(1);
    expect(b.conta("todo")).toBe(1);
  });
});
```

Criterio di uscita da verificare a mano in `npm run dev`:

1. Aggiungere "Prova" crea una scheda in `todo` e il contatore passa da 0 a 1.
2. "Avanza" porta la scheda in `doing`, poi in `done`, e in `done` il bottone sparisce.
3. Ricaricando la pagina le schede restano; svuotando la chiave `svelte-attivita:v1` si riparte da zero.
4. `npx vitest run` è verde; `npm run build` e `node build` servono la board statica.

## Esercizi

1. Aggiungi un bottone "Indietro" con transizione inversa e un tipo `indietro(id)` nel modulo.
2. Migra lo stato dalle rune del modulo a `svelte/store`, mantenendo gli stessi test: quali cambi nelle API?
3. Aggiungi la modifica del titolo con doppio clic e `contenteditable`, con test di componente.
4. Rendila SSR-safe: sposta la lettura di `localStorage` in `onMount` e verifica che il primo render non mostri schede.
5. Introduci `{#key}` sulla colonna per animare l'ingresso con `svelte/transition` e confronta le prestazioni con 500 schede.

<details>
<summary>Soluzione</summary>

1. `indietro` usa una mappa inversa (`doing → todo`, `done → doing`); la transizione può essere una `fly` con `y` negativo, applicata con `transition:`.

2. Uno store `writable<Attivita[]>` sposta le letture su `$board` nei componenti e rende il modulo testabile con `get(store)`; `$state` non è più necessario dentro il modulo, ma i test vanno riscritti perché la sincronia diventa una sottoscrizione.

3. Il doppio clic mette l'elemento in `contenteditable`, `onblur` legge `innerText`, chiama `rinomina(id, testo)` e riporta `contenteditable="false"`; il test usa `userEvent.dblClick` e `userEvent.type`.

4. Con `onMount` lo stato iniziale è l'array vuoto passato a `creaBoard`, poi `board.ripristina(dati)`; serve un flag `caricato` per evitare che `$effect` sovrascriva lo storage prima del ripristino.

5. `{#key stato}` fa ricreare il blocco quando la lista cambia identità; con 500 schede conviene `keyed each` su `id` e `animate:flip`, perché ricreare il DOM costa più di spostare nodi.

</details>

## Errori comuni

- **Leggere `localStorage` nel corpo del componente senza guardia**: durante SSR l'oggetto non esiste e il build fallisce con `localStorage is not defined`.
- **Passare il proxy `$state` a `JSON.stringify` aspettandosi stabilità**: per dati annidati e per worker serve `$state.snapshot`.
- **Definire lo stato dentro il componente e poi importarlo nei test**: il modulo `.svelte.ts` esiste proprio per rendere la logica istanziabile e verificabile.
- **Scrivere `board.attivita = ...` dall'esterno**: il getter restituisce l'array, non un setter; servono azioni come `ripristina`.
- **Montare i componenti nei test senza `svelte/client` di Vitest**: senza il plugin di Svelte configurato, import e rune non compilano e i test falliscono in fase di parsing.

## In sintesi

Hai separato dominio, componenti e persistenza: il modulo `.svelte.ts` contiene le regole e si testa in isolamento, i componenti ricevono props e callback, la pagina collega storage e UI. La `$effect` salva lo snapshot, `$state.snapshot` evita i proxy nei dati serializzati. Il passo successivo è sostituire `localStorage` con una form action di SvelteKit, così lo stesso dominio gira sul server e le verifiche diventano condivise.

## Fonti

- [Svelte - Getting started](https://svelte.dev/docs/svelte/getting-started)
- [Svelte - Testing](https://svelte.dev/docs/svelte/testing)
- [Svelte CLI - sv create](https://svelte.dev/docs/cli/sv-create)
- [Svelte - Legacy: export let](https://svelte.dev/docs/svelte/legacy-export-let)
