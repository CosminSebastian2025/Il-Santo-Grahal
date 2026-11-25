In questo laboratorio costruisci `bacheca`, una SPA React più TypeScript che gestisce progetti e attività su una API REST dimostrativa. Il perimetro è volutamente ridotto — lista, filtro, creazione, toggle, ottimismo e rollback — ma il codice finale copre i punti in cui Redux in produzione fa davvero la differenza: normalizzazione in `createEntityAdapter`, protezione dalle risposte obsolete, aggiornamento ottimistico con undo del rifiuto e test dei reducer senza browser. Usa Node 22 o superiore, Redux Toolkit 2.15, React 19 e `react-redux` 9.3.

## Obiettivi

- Creare il progetto con Vite e la struttura `app/` più `features/`.
- Definire il contratto dell'API e lo stato normalizzato con due slice.
- Implementare dispatch ottimistico con `condition` e rollback su `rejected`.
- Testare reducer e thunk con Vitest e un `fetch` simulato, senza server.
- Misurare il risultato con React DevTools, Redux DevTools e un controllo dei re-render.

## Contratto e setup

L'API è un mock locale servito da un plugin Vite (o da json-server con gli stessi endpoint). Il contratto va fissato prima del codice, perché il reducer dipende dalla forma delle risposte.

| Endpoint | Metodo | Corpo / risposta | Uso nell'app |
| --- | --- | --- | --- |
| `/api/progetti` | GET | `Progetto[]` | caricamento iniziale e refresh |
| `/api/progetti` | POST | `{ nome, budget }` → `Progetto` | creazione |
| `/api/attivita?progettoId=` | GET | `Attivita[]` | lista filtrata |
| `/api/attivita/:id` | PATCH | `{ fatto: boolean }` → `Attivita` | toggle ottimistico |
| errore | qualunque | `{ messaggio }`, status 4xx | mostrato in `errore` |

Il server può rifiutare una creazione o un toggle: il client deve tornare allo stato precedente senza chiedere all'utente di ricaricare la pagina.

```bash
npm create vite@latest bacheca -- --template react-ts
cd bacheca && npm i @reduxjs/toolkit react-redux
npm i -D vitest @testing-library/react jsdom
```

`Progetto` ha `id: string`, `nome: string`, `budget: number`; `Attivita` ha `id`, `progettoId`, `titolo`, `fatto`. Lo schema normalizzato mette le attività in un adapter unico indicizzato per id, con `progettoId` come chiave esterna: una sola fonte di verità, filtraggio nei selettori.

## Le slice: adapter, condition e rollback

La slice `attivita` usa l'adapter e due thunk. `alternaAttivita` è il caso interessante, perché aggiorna lo stato prima della risposta e deve saper tornare indietro.

```ts
// features/attivita/attivitaSlice.ts
import { createSlice, createAsyncThunk, createEntityAdapter, createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

export interface Attivita { id: string; progettoId: string; titolo: string; fatto: boolean }

const adapter = createEntityAdapter<Attivita>({
  sortComparer: (a, b) => Number(a.fatto) - Number(b.fatto) || a.titolo.localeCompare(b.titolo),
});

interface Stato { inVolo: Record<string, boolean>; errore: string | null }

const base = adapter.getInitialState<Stato>({ inVolo: {}, errore: null });

export const caricaAttivita = createAsyncThunk(
  "attivita/carica",
  async (progettoId: string, { signal, rejectWithValue }) => {
    const r = await fetch(`/api/attivita?progettoId=${progettoId}`, { signal });
    if (!r.ok) return rejectWithValue(`Impossibile caricare (${r.status})`);
    return (await r.json()) as Attivita[];
  },
);

export const alternaAttivita = createAsyncThunk(
  "attivita/alterna",
  async (a: Attivita, { rejectWithValue }) => {
    const r = await fetch(`/api/attivita/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fatto: !a.fatto }),
    });
    if (!r.ok) return rejectWithValue("Salvataggio fallito, modifica annullata");
    return (await r.json()) as Attivita;
  },
);

const slice = createSlice({
  name: "attivita",
  initialState: base,
  reducers: {
    erroreDismesso(state) { state.errore = null; },
  },
  extraReducers: (b) => {
    b.addCase(caricaAttivita.pending, (s) => { s.errore = null; })
      .addCase(caricaAttivita.fulfilled, (s, a) => {
        adapter.setAll(s, a.payload);
      })
      .addCase(caricaAttivita.rejected, (s, a) => {
        if (a.meta.aborted) return; // richiesta annullata: stato invariato
        s.errore = typeof a.payload === "string" ? a.payload : "Errore di rete";
      })
      // ottimistico: aggiorna subito, poi conferma o annulla
      .addCase(alternaAttivita.pending, (s, a) => {
        s.inVolo[a.meta.arg.id] = true;
        s.errore = null;
        adapter.updateOne(s, { id: a.meta.arg.id, changes: { fatto: !a.meta.arg.fatto } });
      })
      .addCase(alternaAttivita.fulfilled, (s, a) => {
        delete s.inVolo[a.meta.arg.id];
        adapter.upsertOne(s, a.payload);
      })
      .addCase(alternaAttivita.rejected, (s, a) => {
        delete s.inVolo[a.meta.arg.id];
        adapter.updateOne(s, { id: a.meta.arg.id, changes: { fatto: a.meta.arg.fatto } });
        s.errore = typeof a.payload === "string" ? a.payload : "Errore di rete";
      });
  },
});

export const { erroreDismesso } = slice.actions;
export const selettori = adapter.getSelectors<RootState>((s) => s.attivita);
export const selezionaPerProgetto = (progettoId: string) =>
  createSelector([selettori.selectAll], (tutte) => tutte.filter((a) => a.progettoId === progettoId));
export const selezionaAperte = (progettoId: string) => {
  const perProgetto = selezionaPerProgetto(progettoId);
  return (s: RootState) => perProgetto(s).filter((a) => !a.fatto).length;
};
export default slice.reducer;
```

Il rollback funziona perché `action.meta.arg` contiene la `Attivita` originale: il rifiuto rimette il valore letto prima della modifica. Per evitare doppi click che generano due toggle sovrapposti si aggiunge `condition` al thunk: lo stato della slice ricorda quali id sono in volo e il dispatch viene scartato se l'id è già impegnato.

```ts
// nel contratto della slice: inVolo: Record<string, boolean>
export const alternaAttivita = createAsyncThunk(
  "attivita/alterna",
  async (a: Attivita, { rejectWithValue }) => {
    const r = await fetch(`/api/attivita/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fatto: !a.fatto }),
    });
    if (!r.ok) return rejectWithValue("Salvataggio fallito, modifica annullata");
    return (await r.json()) as Attivita;
  },
  {
    condition: (a, { getState }) => {
      const s = (getState() as RootState).attivita;
      return !s.inVolo[a.id]; // false: Redux Toolkit scarta il dispatch
    },
  },
);
```

Nella slice completa, `alternaAttivita.pending` imposta `s.inVolo[a.meta.arg.id] = true` e `fulfilled`/`rejected` lo riportano a `false`, insieme al rollback già visto.

Il filtro attivo vive in una slice `ui` separata (`{ progettoId: string | null, mostraFatti: boolean }`): lo stato della UI non finisce nella slice dei dati, così la persistenza dei dati può escludere il filtro.

## Test, diagnosi e chiusura

I reducer e i thunk si testano con Vitest senza montare React. Per i thunk si usa `configureStore` reale e si sostituisce `fetch` con `vi.stubGlobal`.

```ts
// features/attivita/attivitaSlice.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import reducer, { alternaAttivita, caricaAttivita, selettori } from "./attivitaSlice";

const attivita: Attivita[] = [{ id: "a1", progettoId: "p1", titolo: "Preventivo", fatto: false }];

describe("alternaAttivita", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("aggiorna subito e conferma con la risposta", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ...attivita[0], fatto: true }), { status: 200 })));
    const store = configureStore({ reducer: { attivita: reducer } });
    store.dispatch(caricaAttivita.fulfilled(attivita, "req-1", "p1")); // popola l'adapter con setAll
    const p = store.dispatch(alternaAttivita(attivita[0]));
    expect(selettori.selectById(store.getState(), "a1")?.fatto).toBe(true); // prima della risposta
    await p;
    expect(store.getState().attivita.errore).toBeNull();
  });

  it("torna indietro quando il server rifiuta", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ messaggio: "no" }), { status: 500 })));
    const store = configureStore({ reducer: { attivita: reducer } });
    store.dispatch(caricaAttivita.fulfilled(attivita, "req-1", "p1"));
    await store.dispatch(alternaAttivita(attivita[0]));
    expect(selettori.selectById(store.getState(), "a1")?.fatto).toBe(false);
    expect(store.getState().attivita.errore).toMatch(/annullata/);
  });
});
```

Simulare `caricaAttivita.fulfilled` con `actionCreator(payload, requestId, arg)` è il modo più breve per popolare lo store senza lasciare il `fetch` del caricamento aperto: il reducer `setAll` dell'adapter viene eseguito come in produzione.

La checklist di verifica manuale: apri Redux DevTools e controlla che ogni click produca la sequenza `pending` → `fulfilled` con un solo cambio di valore; simula offline nelle DevTools del browser e verifica che la casella torni allo stato precedente con il messaggio d'errore; filtra a metà caricamento e verifica che non compaia un errore quando la richiesta viene annullata. Con React DevTools, attiva *Highlight updates* e conta i re-render su una lista di 200 attività: se ogni toggle ridisegna tutte le righe, il componente riga legge un array filtrato non memoizzato.

## Esercizi

1. Aggiungi `condition` con `inVolo` e un test che dispatcha due toggle consecutivi e ne attende uno solo.
2. Sostituisci il filtro locale con un selettore parametrizzato memoizzato con `createSelector`.
3. Aggiungi `createListenerMiddleware`: dopo `alternaAttivita.rejected` mostra un toast e rilancia il caricamento della lista.
4. Calcola il budget totale dei progetti con un selettore derivato e un test che verifichi che non ricalcoli se una slice diversa cambia.
5. Valuta la migrazione della lista attività a RTK Query e annota quante righe di `extraReducers` spariscono.

## Errori comuni

- **Impostare il `preloadedState` con oggetti letterali al posto dello stato dell'adapter**: gli adapter si popolano con `setAll` o `adapter.getInitialState()` seguiti da `addMany`, altrimenti `ids` ed `entities` vanno fuori sincrono.
- **Dimenticare il rollback quando la richiesta viene abortita**: `rejected` riceve anche gli aborti; non annullare la modifica ottimistica per un abort di navigazione, altrimenti l'utente vede il toggle tornare indietro senza motivo.
- **Leggere `action.meta.arg` sbagliando il tipo**: con `createAsyncThunk<Attivita, Attivita>` la firma cambia; verifica che `meta.arg` sia l'oggetto e non l'id.
- **Test che passano solo perché la race condition non si è verificata**: simula con `vi.fn` una risposta lenta e una veloce sullo stesso id e verifica l'ultimo valore vincente.
- **Lasciare il mock `fetch` attivo fra i test**: `vi.unstubAllGlobals()` in `beforeEach` evita interferenze tra casi.

## In sintesi

Il laboratorio ha reso concreto il ciclo Redux: adapter per la normalizzazione, `pending`/`fulfilled`/`rejected` per il ciclo di vita, `meta.arg` per il rollback, `condition` per evitare doppie richieste. Il test dei thunk con un `fetch` simulato copre proprio i casi che a mano non si riproducono. Il passo successivo è confrontare questo impianto con RTK Query su un endpoint reale e misurare quanto codice resta.

## Fonti

- [Vite - Getting Started](https://vite.dev/guide/)
- [Vitest - Getting Started](https://vitest.dev/guide/)
- [Redux Toolkit - createAsyncThunk](https://redux-toolkit.js.org/api/createAsyncThunk)
- [Redux - Writing Tests](https://redux.js.org/usage/writing-tests)
