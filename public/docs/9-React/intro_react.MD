# Introduzione a React

**React** è una libreria JavaScript per costruire interfacce. Non manipola il DOM a mano: descrivi **come deve apparire l'interfaccia in base allo stato**, e React aggiorna la pagina quando lo stato cambia. Nasce nel 2013 in Meta ed è oggi una delle basi dello sviluppo web moderno.

React non sostituisce JavaScript: lo usa. Prima di iniziare questo percorso conviene aver fatto il corso JavaScript, perché componenti, stato ed effetti sono funzioni e oggetti JavaScript.

### Obiettivo del percorso

Il corso segue un piano di **90 giorni** diviso in **6 blocchi da 15 giorni**. Ogni blocco contiene lezioni, un progetto e quindici esercizi progressivi, uno per giorno.

| Settimana | Giorni | Argomenti | Progetti |
| --- | --- | --- | --- |
| 1 | 1-14 | HTML, CSS, JavaScript, DOM, ES6, fetch | Pagina personale, contatore, lista dinamica |
| 2 | 15-30 | Componenti, JSX, props, stato, eventi, liste, `useEffect` | Profilo, contatore avanzato, todo list |
| 3 | 31-45 | React Router, hook personalizzati, API, tema | Ricerca utenti, app meteo |
| 4 | 46-60 | Context, `useReducer`, Zustand, Tailwind, TypeScript | Carrello, task manager |
| 5 | 61-75 | Vitest, Testing Library, performance, Next.js | Dashboard testata, blog |
| 6 | 76-90 | Server Components, deploy, progetto finale | Progetto personale |

I primi 14 giorni costruiscono le fondamenta web senza React: senza HTML, CSS e JavaScript non si capisce che cosa React automatizza. Dal giorno 15 si entra nei componenti.

### Come ragionare (e come si applica)

React chiede un cambio di prospettiva: non "cambio questo elemento", ma "cambio lo stato e lascio che l'interfaccia si ridisegni". Questa sezione mostra il ragionamento da fare prima di scrivere codice.

#### Dove si applica

- **Web app** (dashboard, gestionali, e-commerce): componenti riutilizzabili e stato condiviso.
- **Siti con Next.js**: rendering lato server, pagine statiche e routing basato su file.
- **App mobile** con React Native: gli stessi componenti e lo stesso stato, su iOS e Android.
- **App desktop** con Electron o Tauri: il frontend è una pagina React.
- **Prototipi e design system**: ogni elemento dell'interfaccia diventa un componente con props documentate.

In tutti questi casi contano tre idee: l'interfaccia è una **funzione dello stato**, i **componenti** sono mattoni riutilizzabili, gli **effetti** gestiscono ciò che sta fuori (rete, storage, timer).

#### La logica in sei passi

1. **Disegna l'interfaccia a blocchi**: ogni blocco con un nome e una responsabilità è un componente.
2. **Decidi quali dati sono stato**: se cambia nel tempo e l'interfaccia deve reagire, è stato; se si calcola dagli altri dati, è derivato.
3. **Stabilisci chi possiede lo stato**: vive nel componente antenato comune più vicino; gli altri ricevono dati e callback.
4. **Scrivi la versione statica**: componenti con props fisse, senza `useState`, per vedere la struttura.
5. **Aggiungi interazione**: eventi che chiamano `setQualcosa`, stato aggiornato senza mutare l'oggetto esistente.
6. **Aggiungi gli effetti**: `useEffect` per fetch, storage e timer; gestisci caricamento, errore e stato vuoto.

#### Esempio guidato 1: lista filtrabile

**Problema**: mostrare un elenco di prodotti e filtrarlo con una casella di ricerca.

**Ragionamento**: il testo cercato è stato (cambia con l'input); la lista filtrata è **derivata**, non stato. Salvarla in un secondo `useState` creerebbe due verità da tenere allineate. Il filtro si calcola durante il render.

```jsx
import { useState } from "react";

const prodotti = ["Tastiera", "Monitor", "Cavo USB", "Mouse"];

export default function Catalogo() {
  const [cerca, setCerca] = useState("");

  const visibili = prodotti.filter((p) =>
    p.toLowerCase().includes(cerca.toLowerCase())
  );

  return (
    <div>
      <input
        value={cerca}
        onChange={(e) => setCerca(e.target.value)}
        placeholder="Cerca prodotto"
      />
      <p>Risultati: {visibili.length}</p>
      <ul>
        {visibili.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Comportamento atteso**: scrivendo `mo` la lista mostra solo `Monitor` e `Mouse`, e il contatore diventa `Risultati: 2`. Svuotando il campo tornano tutti e quattro.

La `key` non è decorativa: React la usa per capire quali elementi sono cambiati. Usare l'indice dell'array come key funziona finché la lista non viene riordinata o filtrata.

#### Esempio guidato 2: dati asincroni con tre stati

**Problema**: caricare utenti da un'API e mostrare caricamento, errore e lista vuota.

**Ragionamento**: lo stato non è un solo valore ma una situazione: `loading`, `error`, `data`. Se manca "loading" l'utente vede una pagina vuota; se manca "empty" non distingue "nessun risultato" da "errore".

```jsx
import { useEffect, useState } from "react";

export default function Utenti() {
  const [utenti, setUtenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function carica() {
      try {
        const response = await fetch(
          "https://jsonplaceholder.typicode.com/users",
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Stato ${response.status}`);
        setUtenti(await response.json());
      } catch (e) {
        if (e.name !== "AbortError") setErrore(e.message);
      } finally {
        setLoading(false);
      }
    }

    carica();
    return () => controller.abort();
  }, []);

  if (loading) return <p>Caricamento…</p>;
  if (errore) return <p>Errore: {errore}</p>;
  if (utenti.length === 0) return <p>Nessun utente.</p>;

  return (
    <ul>
      {utenti.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

**Comportamento atteso**: prima `Caricamento…`, poi una lista di 10 nomi. Se la rete non risponde compare il messaggio di errore, non una pagina bloccata.

La funzione restituita da `useEffect` è la **pulizia**: React la esegue quando il componente viene smontato o prima di rieseguire l'effetto. Annullare la richiesta evita di aggiornare uno stato che non esiste più.

#### Debug: lo stato mutato non aggiorna la pagina

```jsx
const [task, setTask] = useState([{ id: 1, testo: "Studiare" }]);

function aggiungi(nuovo) {
  task.push({ id: Date.now(), testo: nuovo });
  setTask(task);
}
```

L'interfaccia non cambia: `setTask(task)` passa **lo stesso oggetto** di prima, quindi React non rileva alcuna modifica. Il ragionamento è: React confronta il riferimento, non il contenuto.

Correzione: crea un nuovo array.

```jsx
function aggiungi(nuovo) {
  setTask([...task, { id: Date.now(), testo: nuovo }]);
}
```

La stessa regola vale per gli oggetti: `setUtente({ ...utente, nome: "Anna" })`, mai `utente.nome = "Anna"`. Se il problema sembra "lo stato non si aggiorna", la prima domanda è sempre: *sto creando un nuovo valore o mutando quello vecchio?*

#### Obiettivo -> Come ragionare -> Strumento React

| Obiettivo | Come ragionare | Strumento React |
| --- | --- | --- |
| Mostrare un dato che cambia | Chi lo modifica e chi lo legge? | `useState` |
| Calcolare una lista filtrata | Dipende da altri dati? Allora è derivata | calcolo nel render |
| Condividere stato tra fratelli | Qual è l'antenato comune? | sollevare lo stato + props |
| Mostrare dati da una API | Quali situazioni vede l'utente? | `useEffect` + loading/error/empty |
| Evitare di passare props a catena | Quanti componenti attraversano i dati? | Context |
| Gestire stato complesso | Le transizioni sono poche e nominate? | `useReducer` |
| Cambiare pagina senza ricaricare | La URL deve descrivere lo stato? | React Router |
| Migliorare le prestazioni | Il componente riceve le stesse props? | `memo`, `useMemo` |

#### Esercizi di ragionamento

Prima di scrivere codice, compila per ogni esercizio: componenti, stato, dati derivati e casi limite.

1. **Lista della spesa**. Componenti: input, lista, totale. Stato: gli articoli. Derivato: il totale. Casi limite: lista vuota, quantità zero. Output atteso con Pane 1.20 e Latte 1.50: `Totale: 2.70`.
2. **Filtro attività**. Stato: testo cercato e attività. Derivato: attività visibili. Casi limite: ricerca vuota, nessun risultato. Output atteso cercando `stu` tra "Studiare", "Cucinare", "Studiare React": `2 risultati`.
3. **Caricamento meteo**. Stato: città, dati, caricamento, errore. Derivato: messaggio da mostrare. Casi limite: città inesistente, richiesta lenta. Output atteso per una città valida: temperatura e descrizione; per una città inventata: `Città non trovata`.

### Il metodo

- Studia **60-120 minuti al giorno**, ma scrivi codice ogni giorno.
- Non saltare JavaScript: se un concetto non è chiaro, torna al corso JavaScript.
- Ogni concetto deve diventare un componente funzionante.
- Completa un progetto prima di passare al successivo.
- Usa Git e GitHub dal giorno 20 circa.
- Scrivi tre righe di diario: che cosa ho imparato, che cosa mi ha bloccato, che cosa farò domani.
- Leggi gli errori: sono indizi, non punizioni.

### Gli strumenti

Serve **Node.js LTS** e un editor, **Visual Studio Code**. Controlla le versioni:

```bash
node --version
npm --version
```

Il progetto React si crea con **Vite**:

```bash
npm create vite@latest mia-app -- --template react
cd mia-app
npm install
npm run dev
```

Il terminale mostra un indirizzo locale, di solito `http://localhost:5173`. Apri quel indirizzo nel browser: ogni modifica al codice aggiorna la pagina senza ricaricare.

Nel percorso useremo:

```text
React 19
Vite
React Router
Tailwind CSS (dalla settimana 4)
TypeScript (dalla settimana 4)
Vitest e React Testing Library (settimana 5)
Next.js (fine settimana 5)
```

Le versioni esatte non contano: i concetti restano gli stessi. Installa l'ultima versione stabile e segui la documentazione ufficiale quando un comando cambia.

### Il primo componente

`src/App.jsx`:

```jsx
import { useState } from "react";

export default function App() {
  const [contatore, setContatore] = useState(0);

  return (
    <main>
      <h1>Il mio primo componente</h1>
      <p>Hai cliccato {contatore} volte.</p>
      <button onClick={() => setContatore(contatore + 1)}>
        Aumenta
      </button>
    </main>
  );
}
```

Comportamento: il testo parte da `Hai cliccato 0 volte.` e aumenta di uno a ogni clic, senza ricaricare la pagina.

Tre cose da notare:
- il componente è una **funzione** che restituisce JSX;
- lo stato è una coppia `[valore, setValore]`;
- l'evento è una funzione, non una stringa come in HTML (`onClick={...}`, non `onclick="..."`).

### Convenzioni del corso

- Componenti e file dei componenti in `PascalCase`: `SchedaProdotto`, `SchedaProdotto.jsx`.
- Funzioni, variabili e hook in `camelCase`: `calcolaTotale`, `useUtenti`.
- Un componente per file quando cresce; più componenti piccoli nello stesso file quando sono correlati.
- Props lette come parametri: `function Card({ titolo, children })`.
- Stato mai mutato: spread per array e oggetti.
- Liste sempre con `key` stabile.
- Effetti con dipendenze esplicite e pulizia quando serve.
- Niente accesso diretto al DOM se React può descriverlo.
- CSS con classi; dalla settimana 4 Tailwind.
- Testi visibili in italiano, nomi del codice in italiano coerente con il resto del corso.

### Come è organizzato il corso

| Blocco | Giorni | Focus | Progetti |
| --- | --- | --- | --- |
| 1 | 1-14 | HTML, CSS, JavaScript, DOM, ES6, fetch | Pagina personale, contatore, lista dinamica |
| 2 | 15-30 | Componenti, JSX, props, stato, eventi, liste, effetti | Profilo, contatore, todo list |
| 3 | 31-45 | Router, hook personalizzati, API, accessibilità | Ricerca utenti, meteo |
| 4 | 46-60 | Stato globale, Tailwind, TypeScript | Carrello, task manager |
| 5 | 61-75 | Test, performance, sicurezza, Next.js | Dashboard, blog |
| 6 | 76-90 | Server Components, deploy, progetto finale | Progetto personale |

Ogni blocco contiene argomenti con esempi, **errori comuni**, **esercizi progressivi** (quindici per blocco, uno al giorno) e **varianti**. I progetti hanno requisiti e criteri di verifica.

### Come usare esercizi e progetti

Gli esercizi seguono il piano giorno per giorno: i primi verificano la sintassi, gli ultimi combinano più concetti e spesso preparano il progetto del blocco. Le varianti servono per chi vuole spingere l'esercizio oltre.

I progetti sono la parte più importante: scegli un progetto del blocco, portalo a termine e solo dopo passa avanti. Un progetto finito e spiegabile vale più di tre iniziati.

Nel primo blocco si costruiscono HTML, CSS e JavaScript senza React: sono le fondamenta su cui poggia tutto il resto.
