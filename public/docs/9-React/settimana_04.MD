# Settimana 4: Stato, stile e TypeScript (giorni 46-60)

**Obiettivo:** condividere lo stato senza passare props a catena, gestirlo con azioni nominate, dare uno stile coerente con Tailwind e tipizzare dati e componenti con TypeScript. Il blocco si chiude con il carrello (progetto 9) e il task manager (progetto 10).

### Props drilling: quando basta e quando non basta

Passare props è il modo più esplicito di condividere dati, ma quando attraversano livelli che non li usano diventano rumore.

```jsx
import { useState } from "react";

export default function App() {
  const [utente, setUtente] = useState({ nome: "Anna" });

  return <Layout utente={utente} setUtente={setUtente} />;
}

function Layout({ utente, setUtente }) {
  return <Header utente={utente} setUtente={setUtente} />;
}

function Header({ utente, setUtente }) {
  return <button onClick={() => setUtente({ nome: "Luca" })}>{utente.nome}</button>;
}
```

**Comportamento atteso**: cliccando il bottone l'etichetta passa da `Anna` a `Luca`; `Layout` non usa `utente`, ma è costretto a trasportarlo. Se i dati passano per tre o più livelli e molti componenti li leggono, il costo supera il beneficio e serve Context.

### Context API: dati condivisi senza passaggi

Il Provider va messo il più in basso possibile: solo quella parte dell'albero si ridisegna quando il valore cambia.

```jsx
import { createContext, useContext, useState } from "react";

const TemaContext = createContext(null);

export function TemaProvider({ children }) {
  const [tema, setTema] = useState("chiaro");
  const alterna = () => setTema((t) => (t === "chiaro" ? "scuro" : "chiaro"));

  return <TemaContext.Provider value={{ tema, alterna }}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const contesto = useContext(TemaContext);
  if (!contesto) throw new Error("useTema va usato dentro TemaProvider");
  return contesto;
}
```

Un figlio lo legge con `const { tema, alterna } = useTema();`: **comportamento atteso**, il primo clic mostra `Tema: scuro`, il secondo torna a `Tema: chiaro`. Fuori dal Provider compare l'errore esplicito invece di un `undefined` silenzioso.

L'hook incapsula `useContext` e valida il contesto; React 19 accetta anche `<TemaContext value={...}>` senza `.Provider`. Il `value` è un oggetto nuovo a ogni render: con molti consumatori conviene `useMemo` o due contesti separati per dati e azioni.

### useReducer: stato complesso con azioni nominate

Con `useState` ogni aggiornamento è una funzione anonima sparsa nel componente. Quando le modifiche hanno un nome, `useReducer` le raccoglie in una funzione pura che riceve stato e azione.

```jsx
const statoIniziale = { elementi: [] };

function carrelloReducer(stato, azione) {
  switch (azione.type) {
    case "aggiungi": {
      const presente = stato.elementi.some((e) => e.id === azione.prodotto.id);
      const elementi = presente
        ? stato.elementi.map((e) =>
            e.id === azione.prodotto.id ? { ...e, quantita: e.quantita + 1 } : e
          )
        : [...stato.elementi, { ...azione.prodotto, quantita: 1 }];
      return { ...stato, elementi };
    }
    case "rimuovi":
      return { ...stato, elementi: stato.elementi.filter((e) => e.id !== azione.id) };
    default:
      return stato;
  }
}

const [stato, dispatch] = useReducer(carrelloReducer, statoIniziale);
```

Scegli `useReducer` per transizioni nominate e verificabili, quando lo stato successivo dipende dal precedente in più passaggi o quando un evento chiama più `setQualcosa`; resta su `useState` per un valore semplice. Il reducer non chiama `fetch` e non tocca il DOM: riceve dati e restituisce dati, quindi si testa senza React.

### Il carrello: la logica prima dell'interfaccia

Il totale è **derivato**: si calcola nel render, non vive nello stato. Salvarlo in un secondo `useState` creerebbe due verità da tenere allineate.

```js
export function calcolaTotale(elementi) {
  return elementi.reduce((somma, e) => somma + e.prezzo * e.quantita, 0);
}

export function formattaEuro(valore) {
  return valore.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
```

Con Tastiera 45 × 1 e Mouse 25 × 2 il totale è:

```text
Totale: 95,00 €
```

Anche il numero di articoli è derivato: si sommano le quantità con una seconda `reduce`. Due trappole: `toFixed(2)` restituisce una stringa con il punto (`95.00`), mentre `toLocaleString` rispetta la virgola italiana, e il totale va arrotondato solo alla fine. Nel Provider il valore si compone con `totale: calcolaTotale(stato.elementi)` e azioni che chiamano `dispatch`; le funzioni pure restano in `utils/`.

### Zustand: l'alternativa leggera a Context

Context è nel React core e non richiede dipendenze: è la scelta giusta per tema, utente e carrello di un'app piccola. Zustand fa lo stesso lavoro senza Provider annidati e permette di leggere lo store fuori da React.

```bash
npm install zustand
```

```jsx
import { create } from "zustand";

export const useCarrelloStore = create((set) => ({
  elementi: [],
  aggiungi: (prodotto) =>
    set((stato) => ({ elementi: [...stato.elementi, prodotto] })),
  svuota: () => set({ elementi: [] }),
}));
```

Il selettore evita render inutili: `const elementi = useCarrelloStore((stato) => stato.elementi);` ridisegna il componente solo quando `elementi` cambia. Passa a Zustand quando lo stato tocca molte sezioni o serve in file che non sono componenti; non usare le due soluzioni per lo stesso dato.

### Tailwind CSS 4 con Vite

Tailwind 4 non usa più `tailwind.config.js` né le direttive `@tailwind`: è un plugin di Vite e si importa con una riga di CSS.

```bash
npm install tailwindcss @tailwindcss/vite
```

In `vite.config.js` aggiungi l'import del plugin e `tailwindcss()` all'array `plugins`; in `src/index.css` scrivi:

```css
@import "tailwindcss";
```

```jsx
export function Bottone({ variante = "primario", className = "", children, ...resto }) {
  const stile = variante === "pericolo" ? "bg-red-600 hover:bg-red-500" : "bg-slate-900 hover:bg-slate-700";

  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${stile} ${className}`}
      {...resto}
    >
      {children}
    </button>
  );
}

export function Card({ titolo, children }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-slate-900">{titolo}</h3>
      <div className="mt-2 text-sm text-slate-600">{children}</div>
    </article>
  );
}
```

`Badge` è una `span` con `rounded-full bg-emerald-100 px-2 text-xs`; `Input` cambia bordo con `errore ? "border-red-400" : "border-slate-300"` e mostra il messaggio sotto il campo. `className` va in coda alla stringa, così chi usa il componente aggiunge `w-full` o `mt-4` senza modificarlo. Se una classe non ha effetto, controlla che il CSS sia importato in `main.jsx` e che il plugin sia nella configurazione.

### Form, modali, toast e cartelle ordinate

La validazione manuale basta finché i campi sono pochi, e mostra che cosa fanno le librerie.

```jsx
function valida(valori) {
  const errori = {};
  if (valori.nome.trim().length < 2) errori.nome = "Inserisci almeno 2 caratteri.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valori.email)) errori.email = "Email non valida.";
  return errori;
}
```

Nel submit si chiama `evento.preventDefault()`, si salvano gli errori con `setErrori` e si procede solo se l'oggetto è vuoto. Con più campi conviene **React Hook Form** (`npm install react-hook-form`): `register` collega l'input, `handleSubmit` valida prima di eseguire, `formState.errors` contiene i messaggi.

Una modale va chiusa con `Escape`, ha `role="dialog"` e non lascia il focus sulla pagina sotto:

```jsx
function ModaleConferma({ aperta, onChiudi, onConferma }) {
  if (!aperta) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 grid place-items-center bg-slate-900/50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6">
        <p className="text-sm">Svuotare il carrello?</p>
        <div className="mt-4 flex justify-end gap-2">
          <Bottone variante="secondario" onClick={onChiudi}>Annulla</Bottone>
          <Bottone variante="pericolo" onClick={onConferma}>Conferma</Bottone>
        </div>
      </div>
    </div>
  );
}
```

Un toast è uno stato `{ id, messaggio }` con un `useEffect` che chiama `setTimeout` e restituisce `clearTimeout` nella pulizia: ogni nuovo messaggio riavvia il timer. Dopo il progetto 9 il codice va riordinato, non riscritto; la regola è un file per responsabilità.

```text
src/
  components/ui/        Bottone.jsx, Card.jsx, Input.jsx, Badge.jsx, Modale.jsx
  components/carrello/  ListaProdotti.jsx, RigaCarrello.jsx, Riepilogo.jsx
  context/              CarrelloContext.jsx
  hooks/ utils/         useToast.js, carrello.js
```

### TypeScript: tipi, interfacce e React

TypeScript controlla i tipi prima dell'esecuzione. Il template dedicato genera file `.tsx` e un `tsconfig.json` con `strict` attivo:

```bash
npm create vite@latest task-manager -- --template react-ts
cd task-manager
npm install
```

Per gli oggetti si usa `interface`, perché è estendibile e produce messaggi leggibili; `type` serve per unioni, alias di primitivi e tipi che non ha senso estendere.

```tsx
import type { ReactNode } from "react";

interface Task {
  id: string;
  titolo: string;
  completata: boolean;
  priorita: "bassa" | "media" | "alta";
}

type Filtro = "tutte" | "attive" | "completate";

interface SchedaTaskProps {
  task: Task;
  onCompleta: (id: string) => void;
  children?: ReactNode;
}

export const SchedaTask = ({ task, onCompleta, children }: SchedaTaskProps) => (
  <li onClick={() => onCompleta(task.id)}>
    {task.titolo} <Badge>{task.priorita}</Badge> {children}
  </li>
);
```

`ReactNode` è tutto ciò che React può mostrare: testo, numero, elemento, `null`, array. È il tipo corretto per `children`. Lo stato si tipizza con il generico: `const [task, setTask] = useState<Task[]>([]);` e `const [filtro, setFiltro] = useState<Filtro>("tutte");`. Così `task[0].titolo` è una stringa e `setTask([{ id: 1 }])` viene segnalato subito.

Il task manager salva in `localStorage`, dove il tipo va verificato al confine con il mondo esterno:

```tsx
const [task, setTask] = useState<Task[]>(() => {
  try {
    return JSON.parse(localStorage.getItem("task") ?? "[]") as Task[];
  } catch {
    return [];
  }
});
```

`as Task[]` è una promessa, non una verifica; `useEffect(() => localStorage.setItem("task", JSON.stringify(task)), [task])` riscrive i dati a ogni cambio. In un progetto reale il contenuto va validato, non solo convertito.

### Errori comuni

- Mettere il Provider in `main.jsx` quando serve a una sola pagina: tutto l'albero si ridisegna a ogni cambio.
- Usare Context per uno stato che un solo componente legge: bastano `useState` e props.
- Mutare lo stato nel reducer (`stato.elementi.push(...)`) e restituire lo stesso oggetto: nessun re-render.
- Mettere `fetch` o `localStorage` nel reducer: deve restare puro, altrimenti non è prevedibile.
- Dimenticare il caso `default`: un'azione sconosciuta restituisce `undefined` e l'app si rompe.
- Calcolare il totale con `useState` e scordarsi di aggiornarlo: il totale è derivato.
- Scrivere props come `props: any`: il tipo c'è ma non controlla nulla, l'errore si sposta a runtime.

### Esercizi progressivi

1. **Props drilling e primo Context.** Albero di tre livelli che passa `tema` fino al bottone, poi sostituisci le props con un `TemaContext` (esercizio base 1). Output atteso dopo un clic: `Tema: scuro`.

2. **useContext.** Aggiungi `Riepilogo`, che legge il tema senza props, e verifica che il cambio raggiunga entrambi i consumatori (esercizio base 2). Comportamento atteso: fuori dal Provider, `useTema` lancia `useTema va usato dentro TemaProvider`.

3. **useReducer.** `carrelloReducer` con `aggiungi`, `rimuovi` e `svuota`; parti da Tastiera 45 e Mouse 25, aggiungi entrambi, poi rimuovi Tastiera (esercizio base 3). Output atteso:

   ```text
   Articoli: 1
   Totale: 25,00 €
   ```

4. **Store Zustand.** Rifai il carrello con `create`: stato `elementi`, azioni `aggiungi` e `svuota`, lettura con selettore (esercizio base 4). Output atteso dopo due aggiunte e una rimozione: `Elementi: 1`.

5. **Carrello con Context e useReducer.** Unisci i due strumenti in `CarrelloProvider` con `aggiungi`, `rimuovi`, `totale`; crea `ListaProdotti` e `Riepilogo` come consumatori (esercizio base 5). Il totale resta corretto dopo ogni azione.

6. **Tailwind setup.** Installa Tailwind 4, aggiungi il plugin in `vite.config.js`, importa `@import "tailwindcss";` e applica a un `div` le classi `bg-white rounded-xl p-6` (esercizio intermedio 6). Output atteso negli strumenti di sviluppo: `padding: 24px` e `border-radius: 12px`.

7. **Componenti UI.** Crea `Bottone`, `Card`, `Input` e `Badge` in `src/components/ui/` con la variante `pericolo` e lo stato di errore (esercizio intermedio 7). Comportamento atteso: `<Input errore="Email non valida." />` mostra bordo rosso e messaggio sotto il campo.

8. **Progetto 9: carrello completo.** Lista prodotti, aggiunta, rimozione, quantità modificabile, totale, messaggio per carrello vuoto e persistenza in `localStorage` (esercizio intermedio 8). Output atteso dopo Tastiera 1, Mouse 2 e un refresh:

   ```text
   Articoli: 3
   Totale: 95,00 €
   ```

9. **Validazione form.** Form con nome, email e quantità: valida al submit, mostra un errore per campo e non ricarica la pagina (esercizio intermedio 9). Output atteso con i campi vuoti: `nome: Inserisci almeno 2 caratteri.` e `email: Email non valida.`

10. **Modale di conferma.** Prima di svuotare il carrello mostra una modale con `Annulla` e `Conferma`; `Escape` e `Annulla` non modificano nulla, `Conferma` porta a `Il carrello è vuoto.` (esercizio intermedio 10).

11. **Toast di feedback.** Dopo `Aggiungi` compare un toast con il nome del prodotto, che scompare dopo 2,5 secondi; due aggiunte rapide riavviano il timer (esercizio intermedio 11). Output atteso: `Aggiunto: Tastiera`.

12. **Refactoring della struttura.** Sposta i componenti in `components/ui/` e `components/carrello/`, il Provider in `context/`, le funzioni pure in `utils/carrello.js`; nessun file oltre 150 righe (esercizio avanzato 12).

13. **TypeScript base.** Nel progetto `react-ts` definisci `interface Prodotto` con `id`, `nome`, `prezzo`, `quantita` e `calcolaTotale(prodotti: Prodotto[]): number` (esercizio avanzato 13). Output atteso passando una stringa al posto del prezzo: `Type 'string' is not assignable to type 'number'.`

14. **Props e state tipizzati.** Tipizza `SchedaTask` con `ReactNode` per i `children` e `onCompleta: (id: string) => void`; dichiara `useState<Task[]>` e prova `setTask([{ id: 1 }])` (esercizio avanzato 14). Output atteso in editor: `Type 'number' is not assignable to type 'string'.`

15. **Progetto 10: task manager TypeScript.** Tipo `Task` con `id`, `titolo`, `completata`, `priorita`; aggiunta, completamento, eliminazione, filtri, contatore e persistenza (esercizio avanzato 15). Output atteso con tre task, uno completato e filtro `attive`:

    ```text
    Totale: 3
    Attive: 2
    ```

### Varianti

- Sostituisci il Context del carrello con Zustand e confronta i componenti attraversati: nessuna props, un solo hook.
- Aggiungi al carrello un codice sconto (`-10%` sopra i 100 euro) come campo dello stato, calcolando il totale scontato nel reducer.
- Nel task manager aggiungi il riordino per priorità e colora il `Badge` in base al valore.
- Estrai `useToast` in un Provider, così più pagine condividono la coda dei messaggi.
