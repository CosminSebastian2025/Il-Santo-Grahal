Redux è una libreria per gestire lo stato applicativo in un unico contenitore osservabile: invece di distribuire lo stato fra decine di componenti React che si passano callback, l'applicazione descrive cosa è successo con un oggetto immutabile e una funzione pura calcola il nuovo stato. Questa lezione costruisce il modello mentale completo — store, action, reducer, selector — partendo da `@reduxjs/toolkit` 2.x, oggi l'unico modo raccomandato di scrivere Redux: la API classica con `createStore` è deprecata dalla versione 5 di `redux`.

## Obiettivi

- Spiegare il flusso unidirezionale di Redux e perché lo stato vive in un solo posto.
- Creare store e slice con `configureStore` e `createSlice` di Redux Toolkit.
- Scegliere fra `useSelector`, `useDispatch` e `useStore` in un componente React.
- Riconoscere quando Redux è la scelta sbagliata.

## Il flusso unidirezionale

Redux impone un ciclo rigido con quattro pezzi. Lo stato è un oggetto JavaScript nativo, non una classe: solo dati serializzabili. Ogni modifica passa da un'action, un oggetto con un campo `type` stringa e, se serve, un `payload`. Il reducer è una funzione `(state, action) => nuovoState` senza effetti collaterali: non chiama API, non legge l'ora di sistema, non modifica l'argomento ricevuto. Lo store tiene insieme stato, reducer, dispatch e sottoscrizioni.

```text
UI (click) → dispatch(action) → reducer(state, action) → nuovo state
                                        │
                        sottoscrittori ← ┴→ UI ri-renderizzata
```

Il vincolo di immutabilità non è estetica: Redux confronta i riferimenti per capire cosa è cambiato, quindi se muti l'oggetto esistente i componenti non si aggiornano. Redux Toolkit risolve il problema con Immer, che dentro `createSlice` ti lascia scrivere codice "mutabile" e produce comunque un nuovo stato per le porzioni toccate.

| Pezzo | Responsabilità | Dove vive |
| --- | --- | --- |
| Action | descrive un evento (`todos/aggiunto`) | dispatch da un handler |
| Reducer | calcola il nuovo stato in modo puro | dentro una slice |
| Store | conserva lo stato e notifica i cambi | creato una volta per app |
| Selector | estrae e deriva dati per la UI | accanto alla slice |

La regola pratica: nel reducer finiscono solo trasformazioni sincrone dello stato. Il recupero dati, il salvataggio, il logging e la navigazione sono "effects" e si gestiscono con thunk o listener middleware.

## Store, slice e TypeScript

Una slice raggruppa lo stato di una feature, i suoi reducer e le sue action creator. `createSlice` genera il tipo dell'action a partire dal nome della slice e dal nome del reducer, in formato `nomeSlice/nomeReducer`.

```ts
// features/todos/todosSlice.ts
import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export interface Todo {
  id: string;
  testo: string;
  fatto: boolean;
}

interface TodosState {
  items: Todo[];
  filtro: "tutti" | "aperti" | "fatti";
}

const iniziale: TodosState = { items: [], filtro: "tutti" };

const todosSlice = createSlice({
  name: "todos",
  initialState: iniziale,
  reducers: {
    aggiunto: {
      reducer(state, action: PayloadAction<Todo>) {
        state.items.push(action.payload);
      },
      // il prepare callback costruisce il payload: niente id generato nel componente
      prepare(testo: string) {
        return { payload: { id: nanoid(), testo, fatto: false } };
      },
    },
    alternato(state, action: PayloadAction<string>) {
      const todo = state.items.find((t) => t.id === action.payload);
      if (todo) todo.fatto = !todo.fatto;
    },
    filtrato(state, action: PayloadAction<TodosState["filtro"]>) {
      state.filtro = action.payload;
    },
  },
});

export const { aggiunto, alternato, filtrato } = todosSlice.actions;
export const selezionaTodos = (s: { todos: TodosState }) => s.items;
export default todosSlice.reducer;
```

Lo store si crea con `configureStore`, che aggiunge `combineReducers`, il middleware thunk, i controlli di immutabilità e serializzabilità in sviluppo e l'aggancio a Redux DevTools. Su Redux Toolkit 2.15 e `react-redux` 9.x, l'inferenza dei tipi è il punto da non sbagliare: state e dispatch tipizzati si derivano dallo store stesso.

```ts
// app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import todosReducer from "../features/todos/todosSlice";

export const store = configureStore({ reducer: { todos: todosReducer } });

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
```

```tsx
// app/hooks.ts
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

Nel componente si usano gli hook tipizzati e si estraggono solo i dati necessari: un selettore che restituisce un array nuovo a ogni chiamata (`items.filter(...)`) provoca un re-render a ogni cambio di stato, perché `useSelector` confronta con `===`.

```tsx
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { alternato, aggiunto, selezionaTodos } from "../features/todos/todosSlice";

export function Lista() {
  const dispatch = useAppDispatch();
  const todos = useAppSelector(selezionaTodos);
  const filtro = useAppSelector((s) => s.todos.filtro);

  return (
    <ul>
      {todos
        .filter((t) => filtro === "tutti" || t.fatto === (filtro === "fatti"))
        .map((t) => (
          <li key={t.id} onClick={() => dispatch(alternato(t.id))}>
            {t.fatto ? "✓" : "○"} {t.testo}
          </li>
        ))}
      <button onClick={() => dispatch(aggiunto("Nuova attività"))}>Aggiungi</button>
    </ul>
  );
}
```

## Quando Redux non serve

Redux coordina stato che vive in profondità e che più alberi di componenti devono leggere o modificare: sessioni, carrelli, preferenze salvate, cache di dati condivisi. Per uno stato locale a un form, un `useState` è più semplice e più veloce. Per i dati remoti conviene valutare RTK Query, o TanStack Query se il progetto non vuole dipendere dallo store.

| Situazione | Soluzione ragionevole |
| --- | --- |
| Stato di un singolo form o di un modale | `useState` / `useReducer` locale |
| Stato condiviso fra pochi fratelli | lifting dello stato o Context |
| Stato globale con logica complessa e DevTools | Redux Toolkit |
| Dati remoti con cache, polling, invalidazione | RTK Query |
| Tema, lingua, utente corrente | Context o Redux, in base al volume di consumatori |

## Errori comuni

- **Usare `createStore` da `redux`**: deprecato; `configureStore` include i middleware e i controlli che servono in sviluppo.
- **Scrivere `slice.reducer` invece di `slice.actions` nei componenti**: il reducer non è un'action creator, e il dispatch fallisce per il `type` mancante.
- **Restituire un array nuovo dal selettore senza memoizzazione**: il componente si ri-renderizza a ogni azione; usa `createSelector` o derivati memoizzati.
- **Mettere `Date.now()` o `Math.random()` nel reducer**: rende lo stato non riproducibile e rompe il replay del DevTools; genera i valori nei prepare callback o nei thunk.
- **Importare lo store direttamente nei componenti** invece degli hook tipizzati: perdi l'inferenza dei tipi e rendi difficile il test.

## In sintesi

Redux è un contenitore di stato immutabile aggiornato solo tramite action e reducer puri. `configureStore` e `createSlice` eliminano il boilerplate, Immer gestisce l'immutabilità e i tipi si derivano da `RootState` e `AppDispatch`. Il valore arriva con il DevTools, la testabilità dei reducer e un modello chiaro di chi può cambiare cosa; il costo è la disciplina sui selettori e sugli effetti fuori dal reducer. Nella prossima lezione questo modello si applica ai dati che arrivano da una API, dove entrano async thunk, stati di caricamento e normalizzazione.

## Fonti

- [Redux - Getting Started](https://redux.js.org/introduction/getting-started)
- [Redux Essentials, Part 1: Overview and Concepts](https://redux.js.org/tutorials/essentials/part-1-overview-concepts)
- [Redux Toolkit - Usage Guide](https://redux-toolkit.js.org/usage/usage-guide)
- [Redux - Usage with TypeScript](https://redux.js.org/usage/usage-with-typescript)
