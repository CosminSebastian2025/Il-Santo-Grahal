Lo stato locale non basta appena l'applicazione deve mostrare dati che arrivano da una API: servono stati di caricamento, gestione degli errori, annullamento delle richieste obsolete e una cache che non scarichi tutto a ogni navigazione. In Redux Toolkit le due risposte canoniche sono i thunk asincroni con `createAsyncThunk` e la normalizzazione con `createEntityAdapter`; sopra entrambe si può scegliere RTK Query, che genera gli stessi pezzi automaticamente. Questa lezione mostra il percorso esplicito, perché è quello che spiega cosa succede sotto il cofano.

## Obiettivi

- Scrivere thunk asincroni con `createAsyncThunk` e gestirne i tre stati in `extraReducers`.
- Annullare richieste obsolete e impedire aggiornamenti duplicati.
- Normalizzare collezioni con `createEntityAdapter` e selettori memoizzati con `createSelector`.
- Confrontare thunk, listener middleware e RTK Query e scegliere il livello giusto.

## Thunk asincroni e ciclo di vita delle richieste

`createAsyncThunk(typePrefix, payloadCreator)` produce una action creator che, quando viene dispatchata, esegue la funzione asincrona e poi dispatcha `pending`, `fulfilled` oppure `rejected`. Il secondo argomento del payload creator espone `signal` (per `AbortController`), `rejectWithValue` (per restituire un payload di errore tipizzato) e `getState`.

```ts
// features/progetti/progettiSlice.ts
import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";

export interface Progetto { id: string; nome: string; budget: number }

export const caricaProgetti = createAsyncThunk(
  "progetti/carica",
  async (filtro: { anno: number }, { signal, rejectWithValue }) => {
    const res = await fetch(`/api/progetti?anno=${filtro.anno}`, { signal });
    if (!res.ok) return rejectWithValue(`HTTP ${res.status}`);
    return (await res.json()) as Progetto[];
  },
  {
    // evita dispatch ripetuti identici mentre la richiesta è in volo
    condition: (filtro, { getState }) => {
      const { stato } = getState() as { progetti: ProgettiState };
      return stato !== "in-corso" ? true : false;
    },
  },
);

interface ProgettiState {
  lista: Progetto[];
  stato: "inattivo" | "in-corso" | "caricato" | "errore";
  errore: string | null;
  richiestaId: string | null;
}

const slice = createSlice({
  name: "progetti",
  initialState: { lista: [], stato: "inattivo", errore: null, richiestaId: null } as ProgettiState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(caricaProgetti.pending, (state, action) => {
        state.stato = "in-corso";
        state.errore = null;
        state.richiestaId = action.meta.requestId;
      })
      .addCase(caricaProgetti.fulfilled, (state, action) => {
        // scarta la risposta se nel frattempo è partita una richiesta più recente
        if (action.meta.requestId !== state.richiestaId) return;
        state.stato = "caricato";
        state.lista = action.payload;
      })
      .addCase(caricaProgetti.rejected, (state, action) => {
        if (action.meta.requestId !== state.richiestaId) return;
        state.stato = action.meta.aborted ? "inattivo" : "errore";
        state.errore = typeof action.payload === "string" ? action.payload : action.error.message ?? "errore";
      });
  },
});
```

La distinzione fra `action.payload` e `action.error` conta: quando il payload creator lancia, Redux Toolkit incapsula il messaggio in `action.error`; quando usi `rejectWithValue`, il valore finisce in `action.payload`. Il caso `meta.aborted` è vero quando la richiesta è stata annullata via `signal`: non è un errore da mostrare all'utente.

L'annullamento dal componente si fa con `dispatch(caricaProgetti(condizione)).abort()` oppure memorizzando la promise e chiamando `abort()` quando il filtro cambia. Per un effetto legato al ciclo di vita del componente il modo idiomatico è restituire la callback di cleanup:

```tsx
useEffect(() => {
  const p = dispatch(caricaProgetti({ anno }));
  return () => p.abort();
}, [dispatch, anno]);
```

| Stato | Significato | Cosa mostra la UI |
| --- | --- | --- |
| `inattivo` | nessuna richiesta o annullata | vuoto o invito all'azione |
| `in-corso` | richiesta in volo | skeleton, disabilita il bottone |
| `caricato` | payload applicato | dati |
| `errore` | rifiuto non abortito | messaggio + pulsante riprova |

## Normalizzare collezioni e derivare dati

Un array di oggetti diventa scomodo quando un elemento deve essere aggiornato per id: ogni `map` produce un array nuovo e ogni ricerca è lineare. `createEntityAdapter` mantiene la forma `{ ids: string[], entities: Record<string, T> }` e genera reducer CRUD e selettori pronti.

```ts
import { createEntityAdapter, createSelector } from "@reduxjs/toolkit";

export const progettiAdapter = createEntityAdapter<Progetto>({
  sortComparer: (a, b) => b.budget - a.budget,
});

const slice = createSlice({
  name: "progetti",
  initialState: progettiAdapter.getInitialState({ stato: "inattivo" as string }),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(caricaProgetti.fulfilled, (state, action) => {
        progettiAdapter.setAll(state, action.payload);
      })
      .addCase(aggiornaProgetto.fulfilled, (state, action) => {
        progettiAdapter.upsertOne(state, action.payload); // inserisce o sostituisce per id
      });
  },
});

const selettoriAdapter = progettiAdapter.getSelectors<{ progetti: ProgettiState }>(
  (s) => s.progetti,
);
export const selezionaTutti = selettoriAdapter.selectAll;
export const selezionaPerId = selettoriAdapter.selectById;

// selettore derivato: ricalcolato solo se gli input cambiano
export const selezionaBudgetTotale = createSelector([selezionaTutti], (progetti) =>
  progetti.reduce((somma, p) => somma + p.budget, 0),
);
```

`createSelector` memoizza l'ultimo risultato: finché l'array `items` ha lo stesso riferimento (perché l'azione ha toccato un'altra slice) il calcolo non viene ripetuto. Attenzione a dove sta il selettore: `getSelectors` è chiamato fuori dalla slice, perché crea funzioni nuove e ricrearle nel render annullerebbe la memoizzazione.

## Thunk, listener e RTK Query

| Strumento | Usa quando | Costo |
| --- | --- | --- |
| `createAsyncThunk` | poche richieste esplicite, logica di orchestrazione propria | scrivi pending/fulfilled/rejected a mano |
| listener middleware | reazioni a una action con altri effetti (salvataggio, redirect, invalidazione) | più codice, ma fuori dal reducer |
| RTK Query (`createApi`) | CRUD su API REST con cache, polling, invalidazione | curva iniziale, codice generato |
| TanStack Query | stesso scopo senza Redux nello store | stato dei dati fuori dal DevTools Redux |

```ts
// reazione a un'action: dopo il login ricarica i progetti
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
export const listener = createListenerMiddleware();
listener.startListening({
  matcher: isAnyOf(login.fulfilled, logout.fulfilled),
  effect: async (_action, api) => {
    await api.dispatch(caricaProgetti({ anno: new Date().getFullYear() }));
  },
});
```

## Perché serializzabile conta

Redux conserva lo stato in memoria come oggetto semplice e lo serializza quando parla con il DevTools, con il salvataggio su `localStorage` e con l'eventuale trasferimento allo stato iniziale del server. Una `Date` dentro lo store funziona finché nessuno prova a leggerla dopo un reload: diventa una stringa ISO, e il componente che chiamava `data.getFullYear()` va in errore solo per gli utenti che ricaricano la pagina. Il middleware `serializableCheck`, attivo di default in sviluppo, intercetta questi oggetti al dispatch e lancia un errore con il percorso del campo. Per questo le risposte API vanno mappate prima di finire nello store: numeri e stringhe restano, oggetti di dominio e classi no; le conversioni verso `Date` si fanno nei selettori o direttamente nel componente. Lo stesso vale per `Map`, `Set` e `Promise`: restano fuori dallo stato, oppure vanno gestiti come eccezioni esplicite con `ignoredPaths`.

## Errori comuni

- **Mettere `fetch` dentro un reducer**: il reducer deve restare puro; le chiamate stanno nel payload creator del thunk o nei listener.
- **Scrivere l'esito in un unico flag booleano**: serve distinguere `inattivo`, `in-corso`, `errore` e `aborted`, altrimenti lo skeleton resta visibile per sempre dopo un annullamento.
- **Mostrare errori di richieste abortite**: controlla `action.meta.aborted` prima di passare allo stato `errore`.
- **Chiamare `progettiAdapter.getSelectors()` dentro un componente**: crea un selettore nuovo a ogni render e perde la memoizzazione.
- **Salvare oggetti non serializzabili (Date, classi, Blob) nello store**: il controllore di serializzabilità lancia in sviluppo; usa stringhe ISO e converti in render o nei selettori.

## In sintesi

Le richieste asincrone in Redux sono un ciclo di tre azioni per thunk, con meta-informazioni utili (`requestId`, `aborted`) per scartare risposte obsolete. `createEntityAdapter` dà al progetto la forma normalizzata che rende gli aggiornamenti economici, e `createSelector` evita ricalcoli inutili. Sopra questo strato RTK Query può eliminare il codice ripetitivo, ma capire pending/fulfilled/rejected resta indispensabile per diagnosticare la UI che non si aggiorna. La prossima lezione mette tutto insieme in un laboratorio completo.

## Fonti

- [Redux Toolkit - createAsyncThunk](https://redux-toolkit.js.org/api/createAsyncThunk)
- [Redux Toolkit - Usage Guide](https://redux-toolkit.js.org/usage/usage-guide)
- [Redux - Writing Tests](https://redux.js.org/usage/writing-tests)
- [Redux - Style Guide](https://redux.js.org/style-guide/)
