# Settimana 5: Testing, performance e Next.js (giorni 61-75)

**Obiettivo:** rendere verificabile ciò che costruisci: test con Vitest e Testing Library, componenti veloci da ridisegnare, errori confinati e il primo progetto Next.js con App Router.

### Testing: Vitest e React Testing Library

Un test è un esperimento ripetibile: ingresso, risultato atteso, esito automatico. Si scrive sui comportamenti che contano, non su ogni riga; **Vitest** gira su Vite, capisce JSX e usa la stessa API di Jest. `src/utils/prezzi.js` espone `export const conIva = (prezzo) => Number((prezzo * 1.22).toFixed(2));` e il test corrispondente vive in `src/utils/prezzi.test.js`.

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

In `package.json` aggiungi `"test": "vitest"` e `"test:run": "vitest run"`; in `vite.config.js` imposta `test: { environment: "jsdom", globals: true, setupFiles: "./src/test/setup.js" }`, dove il setup importa `@testing-library/jest-dom/vitest` per avere `toBeInTheDocument`.

```js
import { expect, it } from "vitest";
import { conIva } from "./prezzi";

it("aggiunge l'IVA", () => expect(conIva(100)).toBe(122));
it("arrotonda a due decimali", () => expect(conIva(10)).toBe(12.2));
```

```text
 ✓ src/utils/prezzi.test.js (2 test) 8ms
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

Il caso limite vale più di dieci test sul percorso felice. Con i componenti si interroga la pagina come farebbe un utente: `getByRole` per bottoni e titoli, `getByLabelText` per i campi, `getByText` per i testi, `queryByText` per l'assenza, `findByText` per l'attesa asincrona.

```jsx
// src/components/Contatore.jsx
import { useState } from "react";

export default function Contatore({ iniziale = 0 }) {
  const [valore, setValore] = useState(iniziale);
  return (
    <section>
      <p>Valore: {valore}</p>
      <button onClick={() => setValore((v) => v + 1)}>Aumenta</button>
      <button onClick={() => setValore(0)}>Azzera</button>
    </section>
  );
}
```

```jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import Contatore from "./Contatore";

it("mostra il valore e lo aumenta", async () => {
  const utente = userEvent.setup();
  render(<Contatore iniziale={3} />);
  expect(screen.getByText("Valore: 3")).toBeInTheDocument();
  await utente.click(screen.getByRole("button", { name: "Aumenta" }));
  expect(screen.getByText("Valore: 4")).toBeInTheDocument();
});
```

`userEvent` ricostruisce la sequenza reale di eventi e restituisce una Promise: senza `await` l'asserzione gira prima che React aggiorni il DOM.

### Hook, mock e dati asincroni

Gli hook si testano con `renderHook`: `const { result } = renderHook(() => useToggle());` seguito da `act(() => result.current.toggle())`. Per isolare il componente si usano le spie (`const onSalva = vi.fn();`), per la rete si sostituisce `fetch` con `vi.stubGlobal`.

```jsx
// src/components/Utenti.jsx
import { useEffect, useState } from "react";
export default function Utenti() {
  const [utenti, setUtenti] = useState(null);
  const [errore, setErrore] = useState(false);
  useEffect(() => {
    fetch("/api/utenti")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then(setUtenti)
      .catch(() => setErrore(true));
  }, []);
  if (errore) return <p role="alert">Errore nel caricamento.</p>;
  if (!utenti) return <p>Caricamento…</p>;
  return <ul>{utenti.map((u) => <li key={u.id}>{u.nome}</li>)}</ul>;
}
```

```jsx
import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Utenti from "./Utenti";

afterEach(() => vi.unstubAllGlobals());

it("mostra caricamento e nomi", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true, json: async () => [{ id: 1, nome: "Anna" }]
  }));
  render(<Utenti />);
  expect(screen.getByText("Caricamento…")).toBeInTheDocument();
  expect(await screen.findByText("Anna")).toBeInTheDocument();
});

it("mostra l'errore", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  render(<Utenti />);
  expect(await screen.findByRole("alert")).toBeInTheDocument();
});
```

Le due prove coprono ciò che l'utente vede: prima il caricamento, poi i dati o l'errore. `vi.unstubAllGlobals()` in `afterEach` evita il classico "funziona da solo, fallisce in suite"; se un test fallisce senza motivo, `screen.debug()` stampa il DOM e spesso rivela un testo diverso da quello cercato.

La copertura si legge con `npm install -D @vitest/coverage-v8` e `npx vitest run --coverage`: 70-80% sulla logica basta. Il **progetto 11** (giorno 67) unisce tutto in una mini dashboard con statistiche, lista e dati caricati, con almeno cinque test su funzioni, titolo, caricamento, righe ed errore.

### Performance: memo, useMemo, useCallback

React ridisegna quando cambia lo stato o quando il genitore ridisegna. Prima si misura, poi si ottimizza: `memo` ovunque rende il codice più difficile e a volte più lento.

```jsx
import { memo, useCallback, useMemo, useState } from "react";

const Riga = memo(function Riga({ voce, onSeleziona }) {
  return <li><button onClick={() => onSeleziona(voce.id)}>{voce.nome}</button></li>;
});
export default function Lista({ voci }) {
  const [cerca, setCerca] = useState("");
  const [scelta, setScelta] = useState(null);
  const visibili = useMemo(
    () => voci.filter((v) => v.nome.toLowerCase().includes(cerca.toLowerCase())),
    [voci, cerca]
  );
  const seleziona = useCallback((id) => setScelta(id), []);
  return (
    <>
      <input value={cerca} onChange={(e) => setCerca(e.target.value)} />
      <p>Selezionato: {scelta ?? "nessuno"}</p>
      <ul>{visibili.map((v) => <Riga key={v.id} voce={v} onSeleziona={seleziona} />)}</ul>
    </>
  );
}
```

Le tre funzioni risolvono problemi diversi: `memo` salta il render se le props sono uguali per riferimento, `useMemo` evita di rifiltrare 2000 voci a ogni tasto, `useCallback` tiene stabile l'identità dell'handler che altrimenti cambierebbe a ogni render e renderebbe `memo` inutile. Per misurare si usa il Profiler, dentro `<Profiler id="Lista" onRender={(id, fase, ms) => console.log(id, fase, ms.toFixed(2))}>`: in React DevTools registri l'interazione e il pannello "Why did this render?" dice quale prop è cambiata. Conta la durata del commit, non il numero di render.

### Lazy loading, Suspense ed error boundaries

`lazy` scarica un componente solo quando serve: la pagina iniziale resta leggera e il codice pesante arriva a richiesta, con `Suspense` che mostra il fallback durante l'attesa.

```jsx
import { lazy, Suspense, useState } from "react";

const PannelloAnalisi = lazy(() => import("./PannelloAnalisi"));

export default function Dashboard() {
  const [aperto, setAperto] = useState(false);
  return (
    <div>
      <button onClick={() => setAperto(true)}>Mostra analisi</button>
      {aperto && (
        <Suspense fallback={<p>Caricamento pannello…</p>}>
          <PannelloAnalisi />
        </Suspense>
      )}
    </div>
  );
}
```

In build Vite crea un file separato (`PannelloAnalisi-*.js`) invece di gonfiare il bundle principale: è il vantaggio del code splitting, visibile nella scheda Network e nell'output di `npm run build`.

Un errore di render lontano non deve svuotare la pagina: l'**error boundary** è l'unico caso in cui serve ancora una classe.

```jsx
import { Component } from "react";
export default class ErrorBoundary extends Component {
  state = { errore: null };
  static getDerivedStateFromError(errore) {
    return { errore };
  }
  render() {
    if (!this.state.errore) return this.props.children;
    return <p role="alert">Qualcosa è andato storto.</p>;
  }
}
```

Va messa intorno alle parti che possono fallire, non intorno all'intera app: un confine troppo alto nasconde il problema invece di isolarlo. Non cattura errori in gestori di eventi, timer o Promise: lì serve `try`/`catch`.

### Sicurezza: XSS, ambiente e segreti

React protegge dall'XSS perché tratta i valori come testo; l'eccezione è `dangerouslySetInnerHTML`, che interpreta HTML e merita il nome che ha.

```jsx
<div dangerouslySetInnerHTML={{ __html: commento }} />   // rischioso
<p>{commento}</p>                                        // sicuro
```

Se l'HTML serve davvero, sanitizzalo con DOMPurify e controlla i link: un `href` che inizia con `javascript:` esegue codice. Sulle variabili d'ambiente la regola è netta: in Vite solo `VITE_` arriva al client, in Next solo `NEXT_PUBLIC_`. **Tutto ciò che ha quel prefisso è pubblico**, finisce nel bundle e chiunque lo legge dagli strumenti di sviluppo; chiavi e token restano sul server e il client chiama una tua rotta.

```js
// app/api/tempo/route.js — eseguito solo sul server
export async function GET() {
  const chiave = process.env.CHIAVE_METEO;
  const risposta = await fetch(`https://api.esempio.it/tempo?key=${chiave}`);
  const dati = await risposta.json();
  return Response.json({ temperatura: dati.temperatura });
}
```

Tieni `.env` in `.gitignore`, versiona un `.env.example` con i soli nomi e lancia `npm audit`: una dipendenza sconosciuta è codice che esegui.

### Next.js: App Router, page e layout

Un'app React pura arriva vuota al browser e mostra il contenuto dopo il download del JavaScript. Next.js rende la prima pagina già in HTML, quindi indicizzata meglio e visibile prima; in più il routing è basato su file e i **Server Component** leggono i dati senza `useEffect`.

```bash
npx create-next-app@latest blog
cd blog
npm run dev
```

Ogni cartella sotto `app` è un segmento di URL, `page.jsx` è la pagina, `layout.jsx` la cornice che resta montata tra una pagina e l'altra.

```jsx
// app/layout.jsx
import Link from "next/link";

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <nav><Link href="/">Home</Link> · <Link href="/about">About</Link></nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

```jsx
// app/page.jsx — Server Component: niente stato, niente eventi
import Link from "next/link";
import { posts } from "@/lib/posts";

export default function Home() {
  return <ul>{posts.map((p) => <li key={p.slug}><Link href={`/blog/${p.slug}`}>{p.titolo}</Link></li>)}</ul>;
}
```

```jsx
// app/blog/[slug]/page.jsx
import { notFound } from "next/navigation";
import { posts } from "@/lib/posts";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}
export default async function PostPage({ params }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();
  return <article><h1>{post.titolo}</h1><p>{post.testo}</p></article>;
}
```

In Next 15 `params` è una Promise, quindi `await params`; prima si leggeva `params.slug`. `generateStaticParams` genera le pagine in build, così l'apertura è immediata.

I componenti sono Server per default: possono essere `async` e leggere file o database, ma non usano `useState`, `useEffect` o `onClick`. Per un pezzo interattivo si mette `"use client";` in cima al file e quel componente, con i suoi figli, gira nel browser: tieni il confine basso, perché su una pagina intera annulla i vantaggi.

Il **progetto 12** (giorno 75) è un blog o sito semplice: home con elenco, dettaglio per slug, about, dati in un file o da un'API. Requisiti: layout condiviso, `notFound()` per slug inventati, nessun segreto nel client e un solo componente client, per esempio un contatore di "mi piace".

### Errori comuni

- Cercare gli elementi per classe o `data-testid` invece che per ruolo e testo: il test si rompe a ogni ritocco di stile.
- Dimenticare `await` su `userEvent.click` o `findByText`: l'asserzione gira prima dell'aggiornamento del DOM.
- Usare `getByText` con un testo spezzato da più elementi: serve una funzione matcher o una query per ruolo.
- Non ripristinare le spie tra i test: uno `stubGlobal` rimasto attivo fa fallire il test successivo.
- Testare i dettagli interni (nomi degli stati, chiamate a `setState`) invece del comportamento visibile.
- Aspettarsi che `React.memo` blocchi tutto: con props create inline l'identità cambia e il render avviene lo stesso.
- Mettere `"use client"` in cima a ogni file Next: si perde il rendering sul server e il bundle cresce.
- Scrivere un segreto in una variabile `NEXT_PUBLIC_` o `VITE_`: è nel bundle, quindi è pubblico.
- Credere che l'error boundary catturi ogni errore: eventi, timer e Promise restano fuori.

### Esercizi progressivi

1. **Primo test con Vitest.** Crea `src/utils/statistiche.js` con `somma` e `media` che non divide per zero; scrivi tre test, incluso il caso della lista vuota (esercizio base 1). Comportamento atteso: `npm run test:run` riporta `Tests 3 passed (3)` e `media([])` vale `0`.

2. **Render con RTL.** Componente `Badge({ testo, tono })` reso come `span` con classe `badge badge-{tono}`; verifica testo e classe (esercizio base 2). Comportamento atteso: `render(<Badge testo="Nuovo" tono="successo" />)` produce `<span class="badge badge-successo">Nuovo</span>`.

3. **Test di un click.** Riprendi il `Contatore`: due clic su `Aumenta`, verifica del valore, poi `Azzera` (esercizio base 3). Comportamento atteso: `Valore: 2` dopo i due clic, `Valore: 0` dopo il reset.

4. **Test di un hook.** `useToggle` con `toggle`, `attiva` e `disattiva`; testa la sequenza con `renderHook` e `act` (esercizio base 4).

5. **Mock di fetch.** `CaricaPost` legge `/api/post` e mostra i titoli; sostituisci `fetch` con `vi.stubGlobal` e conta le voci con `findAllByRole("listitem")` (esercizio base 5). Comportamento atteso: con due post nello stub la lista ha 2 elementi.

6. **Loading ed errore.** Stesso componente con una Promise mai risolta per il caricamento e una risposta 500 per l'errore, in due test separati (esercizio intermedio 6). Comportamento atteso: prima `Caricamento…`, poi `Errore nel caricamento.`

7. **Progetto 11: dashboard testata.** Statistiche in alto, lista al centro, dati da API; almeno cinque test e `npm run test:run` (esercizio intermedio 7). Comportamento atteso: tutti verdi, nessun avviso `act(...)` in console.

8. **Memo.** Lista di 50 righe con un `console.log` per riga: conta i render prima e dopo `memo` (esercizio intermedio 8).

9. **useMemo e useCallback.** Filtro su 2000 voci con `useMemo` e handler stabilizzato: cambiare un secondo stato non deve ridisegnare le righe (esercizio intermedio 9).

10. **Lazy e Suspense.** Pannello pesante caricato al clic, con fallback visibile; controlla l'output della build (esercizio intermedio 10). Comportamento atteso: un chunk separato per il pannello, non incluso in `index-*.js`.

11. **Error boundary.** Componente che lancia un errore nel render quando la prop `esplode` è `true`, avvolto da `ErrorBoundary`; verifica `role="alert"` (esercizio intermedio 11).

12. **Controlli di sicurezza.** Cerca chiavi nel codice, elenca le variabili esposte al client, sostituisci un `dangerouslySetInnerHTML`, lancia `npm audit` (esercizio avanzato 12). Comportamento atteso: nessuna chiave nel bundle, variabili pubbliche solo URL.

13. **Setup Next.** Crea il progetto con `create-next-app`, sostituisci `app/page.jsx` con titolo e paragrafo, avvia `npm run dev` (esercizio avanzato 13).

14. **Routing Next.** Aggiungi `app/about/page.jsx`, tre post in `lib/posts.js` e la rotta `app/blog/[slug]/page.jsx`; prova anche uno slug inesistente (esercizio avanzato 14).

    Output atteso:

    ```text
    /                     200
    /about                200
    /blog/primo-post      200
    /blog/inesistente     404
    ```

15. **Progetto 12: blog Next completo.** Home, dettaglio, about, layout con navigazione, dati statici o da API e un solo componente client (esercizio avanzato 15). Comportamento atteso: tre titoli in home, link funzionanti, `"use client"` in un solo file.

### Varianti

- Aggiungi alla dashboard un test per la lista vuota e uno per una risposta JSON malformata.
- Sposta il filtro in un hook `useFiltro(voci, cerca)` e testalo da solo, così il componente resta corto.
- Nel blog aggiungi `loading.jsx` e `not-found.jsx` sotto `app/blog/[slug]/` e confronta il comportamento con e senza.
- Sostituisci i dati statici del blog con un'API letta in un Server Component e aggiungi `revalidate`.
