# Settimana 2: React fondamentale (giorni 15-30)

**Obiettivo:** descrivere l'interfaccia con componenti e stato: JSX, props, `useState`, eventi, rendering condizionale, liste, form controllati e `useEffect`, fino alla todo list del giorno 30.

### Dal giorno 15: progetto Vite e primo componente

React non parte da un file HTML: serve un progetto con un bundler. Vite crea la struttura e ricarica il browser a ogni salvataggio.

```bash
npm create vite@latest mia-app -- --template react
cd mia-app
npm install
npm run dev
```

Il terminale mostra `http://localhost:5173`. `src/main.jsx` monta il componente dentro `<div id="root">`; il file da modificare è `src/App.jsx`:

```jsx
const nome = "Anna";
export default function App() {
  return <h1>Ciao, {nome}</h1>;
}
```

Comportamento: la pagina mostra `Ciao, Anna` e si aggiorna a ogni salvataggio, senza ricaricare il browser. JSX non è HTML: `className` al posto di `class`, `htmlFor` al posto di `for`, attributi in camelCase, tag sempre chiusi, un solo elemento radice. Dentro `{}` va un'espressione JavaScript. Le **props** sono i parametri del componente: il padre passa i dati, il figlio li legge con destructuring e non li modifica.

### Props e progetto 4: profilo a componenti

Il profilo della settimana 1 torna diviso in blocchi, ognuno con una responsabilità. `Card` usa `children`, la props speciale che contiene ciò che scrivi tra apertura e chiusura: il contenitore resta riutilizzabile senza sapere che cosa contiene. È la composizione del giorno 25, applicata al progetto 4.

```jsx
const Avatar = ({ src, alt }) => (
  <img className="avatar" src={src} alt={alt} width="96" height="96" />
);
const Nome = ({ testo }) => <h1>{testo}</h1>;
const Bio = ({ testo }) => <p className="bio">{testo}</p>;

function ListaInteressi({ interessi }) {
  return <ul>{interessi.map((i) => <li key={i}>{i}</li>)}</ul>;
}

function Card({ titolo, children }) {
  return <section className="card"><h2>{titolo}</h2>{children}</section>;
}

export default function App() {
  return (
    <Card titolo="Profilo">
      <Avatar src="/avatar.png" alt="Foto di Anna" />
      <Nome testo="Anna Bianchi" />
      <Bio testo="Studentessa di sviluppo web." />
      <ListaInteressi interessi={["Fotografia", "Corsa", "React"]} />
    </Card>
  );
}
```

Comportamento: la card mostra `Profilo`, nome, bio e tre interessi. I dati vivono in `App`: i figli non sanno da dove arrivano. `Avatar` è una funzione freccia perché il corpo è una sola espressione, come nelle funzioni JavaScript compatte.

### useState, eventi e immutabilità

`useState` restituisce il valore e la funzione che lo cambia. Chiamare la funzione provoca un **re-render**: React riesegue la funzione del componente e confronta il nuovo JSX con il precedente.

```jsx
import { useState } from "react";

export default function Contatore() {
  const [valore, setValore] = useState(0);
  return (
    <div>
      <p>Valore: {valore}</p>
      <button onClick={() => setValore((v) => v + 1)}>Aumenta</button>
      <button onClick={() => setValore((v) => v - 1)}>Diminuisci</button>
    </div>
  );
}
```

La forma `(v) => v + 1` riceve sempre il valore più recente ed è sicura anche con più aggiornamenti nello stesso gestore. Gli eventi sono funzioni (`onClick={...}`), non stringhe come `onclick="..."`: `onChange` legge l'input, `onSubmit` con `evento.preventDefault()` blocca il ricaricamento.

Lo stato non si muta mai: React confronta i riferimenti, non il contenuto. Con un oggetto nello stato si scrive `setUtente({ ...utente, citta: "Milano" })`, mai `utente.citta = "Milano"`; per gli array valgono `[...lista, nuovo]`, `lista.filter(...)` e `lista.map(...)`.

### Rendering condizionale

Tre sintassi, tre casi: `if` quando una parte della pagina è completamente diversa, ternario quando scegli tra due alternative, `&&` quando mostri o nascondi un dettaglio.

```jsx
function StatoRichieste({ caricamento, errore, richieste }) {
  if (caricamento) return <p>Caricamento…</p>;
  if (errore) return <p>Errore: {errore}</p>;
  if (richieste.length === 0) return <p>Nessuna richiesta.</p>;
  return <ul>{richieste.map((r) => <li key={r.id}>{r.testo}</li>)}</ul>;
}
```

Il ternario restituisce un valore e sta dentro `{}`: `{acceso ? "Spegni" : "Accendi"}`. `&&` restituisce il secondo operando solo se il primo è vero: `{acceso && <p>Luce accesa.</p>}`. Attenzione a `0 && <p>`: React stampa `0`, quindi con i numeri scrivi `conteggio > 0 && ...`.

### Progetto 5: contatore avanzato e liste con key

Il contatore della settimana 1 torna con passo configurabile e messaggio. Il messaggio non è stato: si calcola dal valore a ogni render, così non può essere disallineato.

```jsx
import { useState } from "react";

export default function ContatoreAvanzato() {
  const [valore, setValore] = useState(0);
  const [passo, setPasso] = useState(1);
  const messaggio =
    valore > 0 ? "Valore positivo" : valore < 0 ? "Valore negativo" : "Valore a zero";
  return (
    <main>
      <p>Valore: {valore}</p>
      <p>{messaggio}</p>
      <input
        type="number"
        value={passo}
        onChange={(e) => setPasso(Number(e.target.value) || 1)}
        aria-label="Passo"
      />
      <button onClick={() => setValore(valore + passo)}>Aumenta</button>
      <button onClick={() => setValore(valore - passo)}>Diminuisci</button>
      <button onClick={() => setValore(0)}>Reset</button>
    </main>
  );
}
```

```text
Aumenta con passo 5: Valore: 5, Valore positivo
Due Diminuisci: Valore: -5, Valore negativo
Reset: Valore: 0, Valore a zero
```

Le liste si generano con `map` e ogni elemento ha una `key` stabile: `attivita.map((a) => <li key={a.id}>{a.testo}</li>)`. La `key` identifica l'elemento, non la sua posizione: `a.id` va bene, l'indice no se la lista viene filtrata o riordinata, perché React riassocia lo stato alla riga sbagliata.

### Form controllati e stato sollevato

Un campo è **controllato** quando `value` viene dallo stato e `onChange` lo aggiorna: lo stato è l'unica verità, quindi puoi validare, svuotare e leggere il valore senza toccare il DOM.

```jsx
import { useState } from "react";

function ModuloNome({ onInvia }) {
  const [nome, setNome] = useState("");
  function gestisciSubmit(evento) {
    evento.preventDefault();
    const pulito = nome.trim();
    if (!pulito) return;
    onInvia(pulito);
    setNome("");
  }
  return (
    <form onSubmit={gestisciSubmit}>
      <input value={nome} onChange={(e) => setNome(e.target.value)} />
      <button type="submit">Invia</button>
    </form>
  );
}

export default function App() {
  const [saluto, setSaluto] = useState("");
  return (
    <main>
      <ModuloNome onInvia={(n) => setSaluto(`Ciao, ${n}!`)} />
      {saluto && <p>{saluto}</p>}
    </main>
  );
}
```

Scrivendo `Anna` e inviando compare `Ciao, Anna!` e il campo si svuota; con soli spazi non succede nulla. Il saluto non vive nel form perché serve anche al fratello che lo mostra: lo possiede `App`, l'antenato comune. Il form riceve una callback e comunica verso l'alto. Questo è il **lifting state up**: lo stato sale al componente più vicino che lo condivide, i figli restano senza stato proprio.

### useEffect: dipendenze, fetch e tre stati

Un effetto gestisce ciò che sta fuori dal render: titolo della pagina, timer, rete, `localStorage`. Gira dopo il render e si ripete quando cambiano le dipendenze dichiarate.

```jsx
import { useEffect, useState } from "react";

export default function ContatoreTitolo() {
  const [secondi, setSecondi] = useState(0);
  useEffect(() => {
    document.title = `Secondi: ${secondi}`;
  }, [secondi]);
  return <p>Secondi: {secondi}</p>;
}
```

`[]` significa una sola esecuzione, `[secondi]` riesegue l'effetto quando il valore cambia. Un effetto può restituire una funzione di **pulizia**: React la esegue allo smontaggio o prima di rieseguire l'effetto.

Il caso più frequente è caricare dati. Le dipendenze contengono tutto ciò che l'effetto legge dall'esterno, e `AbortController` annulla la richiesta allo smontaggio.

```jsx
import { useEffect, useState } from "react";

export default function Post() {
  const [post, setPost] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    async function carica() {
      try {
        const risposta = await fetch(
          "https://jsonplaceholder.typicode.com/posts?_limit=5",
          { signal: controller.signal }
        );
        if (!risposta.ok) throw new Error(`Stato ${risposta.status}`);
        setPost(await risposta.json());
        setLoading(false);
      } catch (e) {
        if (e.name !== "AbortError") setErrore(e.message);
      }
    }
    carica();
    return () => controller.abort();
  }, []);

  if (errore) return <p>Errore: {errore}</p>;
  if (loading) return <p>Caricamento…</p>;
  if (post.length === 0) return <p>Nessun post.</p>;
  return <ul>{post.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

Comportamento: prima `Caricamento…`, poi cinque titoli. Tre stati, tre schermate: senza `loading` l'utente vede una pagina vuota, senza `empty` non distingue "nessun risultato" da "errore".

### Progetto 6: todo list

Il progetto del blocco combina tutto: form controllato, liste con key, stato immutato, filtri derivati. Le voci visibili e il conteggio si calcolano durante il render, non si salvano in altri `useState`.

```jsx
import { useState } from "react";
const FILTRI = ["tutti", "attivi", "completati"];
export default function App() {
  const [attivita, setAttivita] = useState([
    { id: 1, testo: "Studiare React", completata: false },
    { id: 2, testo: "Fare gli esercizi", completata: true },
  ]);
  const [testo, setTesto] = useState("");
  const [filtro, setFiltro] = useState("tutti");
  const attive = attivita.filter((a) => !a.completata).length;
  const visibili = attivita.filter((a) =>
    filtro === "attivi" ? !a.completata : filtro === "completati" ? a.completata : true
  );
  function aggiungi(evento) {
    evento.preventDefault();
    if (!testo.trim()) return;
    setAttivita([...attivita, { id: Date.now(), testo: testo.trim(), completata: false }]);
    setTesto("");
  }
  const commuta = (id) =>
    setAttivita(attivita.map((a) => (a.id === id ? { ...a, completata: !a.completata } : a)));
  const elimina = (id) => setAttivita(attivita.filter((a) => a.id !== id));
  return (
    <main>
      <h1>Attività</h1>
      <form onSubmit={aggiungi}>
        <input value={testo} onChange={(e) => setTesto(e.target.value)} />
        <button type="submit">Aggiungi</button>
      </form>
      <p>Attive: {attive}</p>
      {FILTRI.map((f) => <button key={f} onClick={() => setFiltro(f)}>{f}</button>)}
      {visibili.length === 0 && <p>Nessuna attività.</p>}
      <ul>
        {visibili.map((a) => (
          <li key={a.id}>
            <input type="checkbox" checked={a.completata} onChange={() => commuta(a.id)} />
            {a.testo}
            <button onClick={() => elimina(a.id)}>Elimina</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Comportamento: all'avvio `Attive: 1` e due righe, una già spuntata. Cambiare filtro non modifica `attivita`: `visibili` viene ricalcolata. Il giorno 29 rifai da zero uno dei componenti senza guardare il codice: è il modo più affidabile per capire che cosa hai imparato.

### Errori comuni

- Dimenticare `import { useState } from "react"`: errore `useState is not defined`.
- Mutare lo stato con `lista.push(nuovo)` e poi `setLista(lista)`: stesso riferimento, nessun re-render.
- Scrivere `onClick={aumenta()}`: la funzione parte subito durante il render. Usa `onClick={aumenta}` o `onClick={() => aumenta()}`, con l'evento in camelCase e non `onclick`.
- Chiamare `setValore(valore + 1)` due volte nello stesso gestore: aggiunge uno solo. Serve `(v) => v + 1`.
- Usare l'indice come `key` in una lista filtrabile: React riusa lo stato della riga sbagliata.
- Dichiarare `[]` in `useEffect` e leggere props o stato: l'effetto resta congelato al primo valore.
- Scrivere `{conteggio && <p>...</p>}` con `conteggio` a zero: a schermo compare `0`.
- Dimenticare `preventDefault()`: il form ricarica la pagina e perdi lo stato.

### Esercizi progressivi

1. **JSX e primo componente.** Crea il progetto con Vite, sostituisci `App.jsx` con nome, città e un bottone `Aggiorna` senza effetto (base 1). Output atteso: `Anna` e `Torino`.
2. **Props.** Crea `Riquadro` con props `titolo` e `testo` (default `Nessun testo disponibile`); usalo tre volte, una senza `testo` (base 2). Comportamento atteso: la terza card mostra `Nessun testo disponibile`.
3. **Profilo a componenti.** Progetto 4: `Avatar`, `Nome`, `Bio` e `ListaInteressi` dentro una `Card` con `children`; i dati stanno in `App` (base 3). Aggiungendo un interesse all'array la lista cambia senza toccare i figli.
4. **Contatore con useState.** Parte da 10, `Aumenta` e `Diminuisci` di uno (base 4). Output atteso dopo `Aumenta`, `Aumenta`, `Diminuisci`: `Valore: 11`.
5. **Eventi e immutabilità.** Stato `{ nome, citta }`: un input cambia il nome, un bottone porta la città a `Milano` (base 5). Comportamento atteso: con `Luca` nell'input e città invariata la frase è `Ciao Luca da Torino`.
6. **Rendering condizionale.** `Messaggio` con props `stato` tra `caricamento`, `errore`, `ok` (intermedio 6). Output atteso: `Caricamento…`, `Errore di rete`, `Dati pronti`.
7. **Contatore avanzato.** Progetto 5: aumenta, diminuisci, reset, passo da 1 a 10 e messaggio positivo/negativo/zero (intermedio 7). Output atteso con passo 3 dopo due `Diminuisci`: `Valore: -6` e `Valore negativo`.
8. **Liste con key.** Tre libri con `id`: un bottone elimina il libro con `id` 2, uno aggiunge in fondo (intermedio 8). Output atteso dopo l'eliminazione: `Totale: 2`, senza cambi di contenuto nelle altre righe.
9. **Form controllato.** Nome ed email controllati, invio con `preventDefault`, campi vuoti bloccati (intermedio 9). Output atteso con Anna e anna@example.com: `Iscritto: Anna (anna@example.com)`.
10. **Lifting state up.** Due fratelli `Campo` e `Anteprima`: il testo vive nel padre (intermedio 10). Comportamento atteso: scrivendo `React` l'anteprima mostra `Hai scritto: React`.
11. **Children e composizione.** `Pannello` con `titolo`, `azione` e `children`; usalo per una scheda con bottone in testata (intermedio 11). Comportamento atteso: titolo e bottone sopra, contenuto sotto.
12. **useEffect con timer o titolo.** Cronometro con `Avvia` e `Ferma`: `document.title` segue i secondi e il timer si chiude con `clearInterval` (avanzato 12). Output atteso dopo 3 secondi: `Secondi: 3` con titolo `Secondi: 3`; dopo `Ferma` il numero non cresce più.
13. **Fetch con useEffect.** Carica 5 post da jsonplaceholder con `AbortController` e dipendenza `[]` (avanzato 13). Output atteso: `Post caricati: 5` e cinque titoli.
14. **Loading, errore, vuoto.** Riusa l'esercizio 13 con URL da stato: `?userId=1`, `?userId=999`, host inesistente (avanzato 14). Output atteso: lista, `Nessun post.`, `Errore: Failed to fetch`.
15. **Todo list completa.** Progetto 6: aggiungere, completare, eliminare, contare le attive e filtrare tutti/attivi/completati (avanzato 15). Output atteso all'avvio `Attive: 1`; dopo aver aggiunto e completato `Leggere` ancora `Attive: 1` e filtro `completati` con 2 voci; eliminata l'unica attiva, filtro `attivi` mostra `Nessuna attività.`

### Varianti

- Salva le attività in `localStorage` con un `useEffect` e rileggile con `JSON.parse` all'avvio.
- Nel profilo aggiungi un bottone `Segui` che cambia testo e contatore di follower.
- Nel contatore limita il valore tra -10 e 10 disabilitando i bottoni ai bordi.
- Nella todo list aggiungi la modifica inline del testo con doppio clic e un campo di ricerca.
