# Settimana 3: Router, API e dati reali (giorni 31-45)

**Obiettivo:** spostarsi tra pagine senza ricaricare, leggere dati da API reali gestendo caricamento ed errore, salvare preferenze nel browser e costruire due progetti: ricerca utenti e app meteo responsive.

### Router: route base

Un'app React è una sola pagina: il router associa una URL a un componente senza ricaricare il documento. Installa React Router (v7, compatibile con React 19):

```bash
npm install react-router-dom
```

In `main.jsx` avvolgi `<App />` con `<BrowserRouter>`. Dentro l'app, `Routes` sceglie la `Route` corrispondente e `*` gestisce la pagina non trovata.

```jsx
import { Routes, Route } from "react-router-dom";
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<h1>Home</h1>} />
      <Route path="/contatti" element={<h1>Contatti</h1>} />
      <Route path="*" element={<h1>Pagina non trovata</h1>} />
    </Routes>
  );
}
```

In produzione il server deve restituire `index.html` per ogni percorso, altrimenti un refresh su `/contatti` dà 404. In sviluppo Vite lo fa già.

### Link, NavLink e route dinamiche

Un `<a href>` ricarica la pagina e azzera lo stato. `Link` cambia la URL tramite la History API; `NavLink` aggiunge la classe attiva.

```jsx
import { NavLink } from "react-router-dom";
const classe = ({ isActive }) => (isActive ? "nav-link attivo" : "nav-link");
<nav>
  <NavLink to="/" className={classe} end>Home</NavLink>
  <NavLink to="/utenti" className={classe}>Utenti</NavLink>
</nav>
```

`end` serve su `/`: senza, Home resterebbe attiva su ogni pagina, perché tutti i percorsi iniziano con la barra. Una route dinamica usa `:id`; `useParams` restituisce stringhe, quindi confronta con `String`.

```jsx
import { useParams } from "react-router-dom";
import { utenti } from "../data/utenti";
export default function DettaglioUtente() {
  const { id } = useParams();
  const utente = utenti.find((u) => String(u.id) === id);
  if (!utente) return <p>Utente non trovato.</p>;
  return (
    <article>
      <h2>{utente.name}</h2>
      <p>{utente.email}</p>
    </article>
  );
}
```

La route è `<Route path="/utenti/:id" element={<DettaglioUtente />} />`. Il caso "non trovato" è obbligatorio: la URL si può scrivere a mano.

### useNavigate e route protette

Nel modulo di accesso, `useNavigate` sposta l'utente dopo l'invio; `{ replace: true }` sostituisce la voce di cronologia, così il tasto Indietro non riporta al modulo già inviato.

```jsx
const navigate = useNavigate();
function invia(evento) {
  evento.preventDefault();
  onAccedi();
  navigate("/area-riservata", { replace: true });
}
```

Una route protetta è solo interfaccia, non sicurezza: il controllo vero resta sul server. Per il corso basta un componente che legge lo stato di accesso e rende `Navigate`, il redirect dichiarativo.

```jsx
function RouteProtetta({ children }) {
  const loggato = localStorage.getItem("loggato") === "si";
  return loggato ? children : <Navigate to="/accedi" replace />;
}
```

### Un custom hook per le fetch: useFetch

Lo stesso blocco con `loading`, `errore` e `AbortController` si ripete in ogni pagina. Un custom hook è una funzione che inizia con `use` e restituisce ciò che serve: la logica resta in un punto solo.

```jsx
import { useEffect, useState } from "react";

export function useFetch(url) {
  const [dati, setDati] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErrore(null);
    async function carica() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Stato ${response.status}`);
        setDati(await response.json());
      } catch (e) {
        if (e.name !== "AbortError") setErrore(e.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    carica();
    return () => controller.abort();
  }, [url]);
  return { dati, loading, errore };
}
```

`url` è una dipendenza: cambiandola l'effetto riparte. La pulizia annulla la richiesta precedente, così una risposta lenta non sovrascrive quella nuova; il controllo su `aborted` evita di aggiornare un componente smontato.

### localStorage e tema chiaro/scuro

`localStorage` salva stringhe e sopravvive al refresh; gli oggetti passano da `JSON.stringify` e `JSON.parse`. Il tema è un caso di **stato sollevato**: vive in `App`, l'antenato comune di pulsante e pagine, e scende come prop. Il Context arriverà la settimana prossima.

```jsx
function useTema() {
  const [tema, setTema] = useState(() => localStorage.getItem("tema") ?? "chiaro");
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem("tema", tema);
  }, [tema]);
  return { tema, alterna: () => setTema((t) => (t === "chiaro" ? "scuro" : "chiaro")) };
}
```

```css
:root { --sfondo: #f8fafc; --testo: #0f172a; }
[data-tema="scuro"] { --sfondo: #0f172a; --testo: #f8fafc; }
body { background: var(--sfondo); color: var(--testo); }
```

L'inizializzatore è una funzione: `useState(() => ...)` legge lo storage una volta sola. Per evitare il lampo bianco all'avvio, leggi il tema con uno script inline in `index.html` prima del bundle.

### Progetto 7: ricerca utenti

Servono input, lista filtrata, caricamento, errore e stato vuoto. I dieci utenti si scaricano una volta; il filtro è **derivato** da testo e lista, non un secondo stato: salvarlo creerebbe due verità da tenere allineate.

```jsx
import { useState } from "react";
import { useFetch } from "../hooks/useFetch";
export default function RicercaUtenti() {
  const { dati, loading, errore } = useFetch(
    "https://jsonplaceholder.typicode.com/users"
  );
  const [cerca, setCerca] = useState("");
  const visibili = (dati ?? []).filter((u) =>
    u.name.toLowerCase().includes(cerca.trim().toLowerCase())
  );
  if (loading) return <p>Caricamento utenti...</p>;
  if (errore) return <p role="alert">Errore: {errore}</p>;
  return (
    <section>
      <label htmlFor="cerca">Nome utente</label>
      <input id="cerca" value={cerca} onChange={(e) => setCerca(e.target.value)} />
      {visibili.length === 0 && <p>Nessun utente trovato.</p>}
      <ul>
        {visibili.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </section>
  );
}
```

I tre stati non sono decorativi: senza `loading` l'utente vede una pagina vuota, senza errore crede che non esistano utenti, senza stato vuoto non capisce se il filtro ha funzionato.

### REST, JSON e API meteo

Le API REST trattano gli URL come risorse e i metodi HTTP come azioni; il corpo è JSON.

| Metodo | Azione | Esempio | Esito |
| --- | --- | --- | --- |
| GET | legge | `/users` | 200 |
| POST | crea | `/posts` | 201 |
| PUT | sostituisce | `/posts/1` | 200 |
| DELETE | elimina | `/posts/1` | 204 |

I codici raccontano l'esito: `400` richiesta non valida, `401` non autenticato, `403` vietato, `404` non trovato, `500` errore del server. `fetch` non lancia eccezioni sui 4xx: senza `response.ok` un 404 sembra un successo.

Per il meteo scegliamo **Open-Meteo**: gratuita, senza registrazione, con geocoding e previsioni. Con un servizio a chiave useresti `.env.local`, da aggiungere a `.gitignore`:

```bash
VITE_METEO_KEY=la_tua_chiave
```

Il codice la legge con `import.meta.env.VITE_METEO_KEY`. Solo le variabili con prefisso `VITE_` arrivano al client, e per questo finiscono nel bundle: una chiave nel browser **non è segreta**. Va bene per API pubbliche o con restrizioni per dominio; i segreti veri restano su un server. Open-Meteo non richiede chiave: prima traduci il nome in coordinate.

```jsx
const GEO = "https://geocoding-api.open-meteo.com/v1/search";
async function trovaCitta(nome) {
  const url = `${GEO}?name=${encodeURIComponent(nome)}&count=1&language=it&format=json`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Stato ${response.status}`);
  const dati = await response.json();
  return dati.results?.[0] ?? null;
}
```

Per `Milano` la risposta contiene `latitude: 45.46427` e `longitude: 9.18951`; se `results` manca, la città non esiste. Le previsioni si chiedono a `api.open-meteo.com/v1/forecast` con `current=temperature_2m,weather_code&timezone=auto` e tornano `{ "current": { "temperature_2m": 12.4, "weather_code": 3 } }`.

### Meteo: UI, errori, accessibilità e responsive

Il componente `AppMeteo` tiene `citta`, `dati`, `loading` ed `errore`; il codice WMO va tradotto in testo, con fallback per i valori non previsti. La ricerca parte dal submit, non a ogni tasto: meno richieste e risultati stabili.

```jsx
const descrizioni = { 0: "Cielo sereno", 3: "Nuvoloso", 61: "Pioggia", 95: "Temporale" };
const descrivi = (codice) => descrizioni[codice] ?? "Condizioni sconosciute";
async function cerca(evento) {
  evento.preventDefault();
  setLoading(true);
  setErrore(null);
  try {
    const luogo = await trovaCitta(citta);
    if (!luogo) throw new Error(`Città non trovata: ${citta}`);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${luogo.latitude}&longitude=${luogo.longitude}&current=temperature_2m,weather_code&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Stato ${response.status}`);
    const meteo = await response.json();
    setDati({ nome: luogo.name, temperatura: meteo.current.temperature_2m, descrizione: descrivi(meteo.current.weather_code) });
  } catch (e) {
    setDati(null);
    setErrore(e.message);
  } finally {
    setLoading(false);
  }
}
```

```jsx
<form onSubmit={cerca}>
  <label htmlFor="citta">Città</label>
  <input id="citta" value={citta} onChange={(e) => setCitta(e.target.value)} required />
  <button type="submit">Cerca</button>
</form>
{dati && <article aria-live="polite"><h2>{dati.nome}</h2><p>{dati.temperatura} °C</p><p>{dati.descrizione}</p></article>}
```

"Città non trovata" è un esito previsto, "Stato 500" o "Failed to fetch" è un guasto: mostrare lo stesso testo confonde. Se parti con due ricerche di fila, tieni l'`AbortController` in un `useRef` e annulla la precedente.

Accessibilità minima: label collegate con `htmlFor`, bottoni veri raggiungibili da tastiera, focus sempre visibile, contrasto almeno 4.5:1, errori con `role="alert"` e dati aggiornati con `aria-live="polite"`.

Responsive mobile first: prima lo stile per 360 px, una colonna, poi la seconda con una media query; usa `max-width`, unità `rem` e aree toccabili di almeno 44 px.

```css
.meteo { display: grid; gap: 1rem; padding: 1rem; }
@media (min-width: 640px) { .meteo { grid-template-columns: 1fr 1fr; } }
```

### Errori comuni

- Dimenticare `BrowserRouter` in `main.jsx`: `Link` e `useNavigate` non trovano il contesto del router.
- Usare `<a href>` per la navigazione interna: la pagina si ricarica e perdi stato e cache.
- Mettere `NavLink to="/"` senza `end`: la voce Home resta attiva ovunque.
- Omettere `url` dalle dipendenze di `useFetch`: la pagina non ricarica quando la risorsa cambia.
- Non annullare la fetch nella pulizia: una risposta vecchia può sovrascrivere quella nuova.
- Trattare un 404 come successo: senza `response.ok` leggi dati che non esistono, o `json()` fallisce su un 204.
- Salvare oggetti senza `JSON.stringify` o mettere una chiave API nel bundle: nel client non è segreta.

### Esercizi progressivi

1. **Route base.** Crea un'app con `/`, `/chi-sono`, `/contatti` e `*` (esercizio base 1). Output atteso: `/x` mostra `Pagina non trovata`, le altre il titolo giusto.
2. **Link e NavLink.** Sostituisci i link del menu con `NavLink` e la classe `attivo` (esercizio base 2). Comportamento atteso: nessun ricaricamento e solo la voce corrente evidenziata.
3. **useParams.** Crea tre utenti in `src/data/utenti.js`, una lista con link e la rotta `/utenti/:id` (esercizio base 3).

   Output atteso su `/utenti/3`:

   ```text
   Clementine Bauch
   Nathan@yesenia.net
   ```
4. **useNavigate e route protetta.** Il modulo imposta `loggato=si` e naviga con `replace`; `/area-riservata` è protetta (esercizio base 4). Comportamento atteso: senza accesso si finisce su `/accedi`; dopo, Indietro non torna al login.
5. **useFetch.** Estrai l'hook in `src/hooks/useFetch.js` e usalo su `/users` (esercizio base 5). Comportamento atteso: prima `Caricamento...`, poi dieci nomi; cambiando `url` la richiesta precedente viene annullata.
6. **localStorage.** Salva `{ tema, lingua }` con `JSON.stringify`, rileggilo con `JSON.parse` e gestisci chiave assente o JSON corrotto (esercizio intermedio 6). Output atteso: `tema: chiaro, lingua: it` senza dati, `tema: scuro, lingua: en` dopo il salvataggio.
7. **Tema persistente.** Porta `useTema` in `App` e applica `data-tema` a `<html>` (esercizio intermedio 7). Comportamento atteso: dopo il refresh l'attributo vale ancora `scuro` e il pulsante mostra `Passa al tema chiaro`.
8. **Ricerca utenti con stati.** Input, lista filtrata, loading, errore e stato vuoto sul progetto 7 (esercizio intermedio 8). Output atteso: `an` trova solo `Leanne Graham`, `zzz` mostra `Nessun utente trovato.`
9. **Chiamata REST e status.** Invia un `POST` a jsonplaceholder e leggi un utente inesistente (esercizio intermedio 9).

   Output atteso:

   ```text
   Creato con id 101
   GET /users/999 -> Errore: stato 404
   ```
10. **Prima chiamata meteo.** Geocoding di `Milano` e richiesta di `temperature_2m` e `weather_code` (esercizio intermedio 10).

    Output atteso (valori di esempio):

    ```text
    Milano, Italia
    12.4 °C, Nuvoloso
    ```
11. **UI meteo.** Città, temperatura e descrizione in una card con `aria-live="polite"` (esercizio intermedio 11). Comportamento atteso: durante la richiesta compare `Caricamento...`, poi la card lo sostituisce.
12. **Città non trovata.** Cerca `Atlantide99` e distingui l'errore previsto da un guasto di rete (esercizio avanzato 12).

    Output atteso:

    ```text
    Città non trovata: Atlantide99
    ```
13. **Accessibilità.** Label collegate, bottone vero, focus visibile, contrasto sufficiente, errori annunciati (esercizio avanzato 13). Comportamento atteso: Tab raggiunge input e bottone nell'ordine giusto.
14. **Responsive.** Mobile first: una colonna a 360 px, due da 640 px, nessuno scroll orizzontale (esercizio avanzato 14). Output atteso: `360 px` una colonna, `768 px` due colonne.
15. **Progetto 8: app meteo completa.** Ricerca città, dati attuali, loading, errore, layout responsive e ultime ricerche in `localStorage` (massimo cinque, senza duplicati) (esercizio avanzato 15). Criteri: nessun errore in console, città inventata gestita, refresh che conserva le ricerche, uso corretto su telefono.

### Varianti

- Passa da `<BrowserRouter>` a `createBrowserRouter` con `RouterProvider` e rotte come oggetti.
- Aggiungi tre giorni di previsione con `daily=temperature_2m_max,temperature_2m_min`.
- Usa `prefers-color-scheme` come tema iniziale quando `localStorage` è vuoto.
