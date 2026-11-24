# Settimana 6: Progetto finale e oltre (giorni 76-90)

**Obiettivo:** usare Server Components, cache e Server Actions con criterio, portare un progetto personale dalla scelta al deploy e chiudere i 90 giorni con qualcosa di online, testato e spiegabile.

### Server Components e Client Components

Nell'App Router ogni componente è un **Server Component** finché non dichiari `"use client"`. Gira sul server, legge dati e restituisce HTML: nel browser non arriva JavaScript del componente. Un Client Component serve per stato, eventi, `localStorage` e API del browser. Parti dal server e scendi al client solo per il pezzo interattivo.

```jsx
// src/app/ricette/page.jsx — Server Component (default)
import { getRicette } from "@/lib/ricette";
export default async function ElencoRicette() {
  const ricette = await getRicette();
  return (
    <ul>
      {ricette.map((ricetta) => (
        <li key={ricetta.slug}>
          {ricetta.titolo} — {ricetta.tempoMinuti} min
        </li>
      ))}
    </ul>
  );
}
```

Nessun `useEffect`, nessuno stato di caricamento. La ricerca richiede una casella di testo, quindi è client e riceve le ricette come props.

```jsx
// src/components/FiltroRicette.jsx
"use client";
import { useState } from "react";
export default function FiltroRicette({ ricette }) {
  const [cerca, setCerca] = useState("");
  const visibili = ricette.filter((ricetta) =>
    ricetta.titolo.toLowerCase().includes(cerca.toLowerCase())
  );
  return (
    <div>
      <label htmlFor="cerca">Cerca</label>
      <input id="cerca" value={cerca} onChange={(e) => setCerca(e.target.value)} />
      <p>Risultati: {visibili.length}</p>
    </div>
  );
}
```

**Comportamento atteso**: scrivendo `tor` compare `Risultati: 1`; svuotando il campo torna `Risultati: 3`. Le props tra server e client devono essere serializzabili: oggetti e stringhe sì, funzioni no.

### Dati, cache e revalidazione

Un Server Component legge i dati e Next.js **memorizza** il risultato: la pagina è statica per default e si rigenera solo quando lo decidi tu. È la differenza rispetto a `useEffect`, che scarica a ogni visita.

```jsx
// src/app/ricette/page.jsx
export const revalidate = 60;
export async function getRicetteRemoto() {
  const response = await fetch("https://dummyjson.com/recipes?limit=6", {
    next: { revalidate: 3600, tags: ["ricette"] }
  });
  if (!response.ok) throw new Error(`Stato ${response.status}`);
  return (await response.json()).recipes;
}
```

| Opzione | Effetto |
| --- | --- |
| `cache: "force-cache"` | usa la copia salvata, se esiste (default) |
| `next: { revalidate: 3600 }` | rigenera al massimo ogni ora |
| `cache: "no-store"` | chiede sempre dati freschi |
| `revalidatePath("/ricette")` | invalida una pagina dopo una modifica |
| `revalidateTag("ricette")` | invalida tutti i dati con quel tag |

Dopo una scrittura la cache va invalidata con `revalidatePath`, altrimenti l'utente salva e non vede. In sviluppo Next.js è sempre fresco, in produzione no: se "funziona in locale e non online", il primo sospetto è la cache. Con un JSON importato da `src/data` la pagina è statica e la revalidazione non serve; `no-store` va riservato ai dati personali.

### Layout e navigazione

Il `layout.jsx` avvolge le pagine e **non viene ridisegnato** quando navighi: header e navigazione restano montati. `Link` fa navigazione lato client con prefetch, quindi il cambio pagina è immediato e la URL resta la fonte di verità.

```jsx
// src/app/layout.jsx
import Link from "next/link";
import NavPrincipale from "@/components/NavPrincipale";
import "./globals.css";
export const metadata = { title: "Ricettario" };
export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <header>
          <Link href="/">Ricettario</Link>
          <NavPrincipale />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

La voce attiva richiede di leggere la URL: `usePathname` è un hook, quindi il componente è client e usa `aria-current` per comunicarlo anche a uno screen reader.

```jsx
// src/components/NavPrincipale.jsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavPrincipale() {
  const percorso = usePathname();
  return (
    <nav aria-label="Principale">
      <Link href="/ricette" aria-current={percorso.startsWith("/ricette") ? "page" : undefined}>Ricette</Link>
      <Link href="/preferiti" aria-current={percorso === "/preferiti" ? "page" : undefined}>Preferiti</Link>
    </nav>
  );
}
```

La pagina `[slug]` legge `const { slug } = await params` (nelle versioni recenti `params` è una Promise), chiama `trovaRicetta` e usa `notFound()` se lo slug non esiste; `generateStaticParams` prerenderizza le ricette note. Accanto alle pagine, `loading.jsx` gestisce l'attesa, `not-found.jsx` il 404 e `error.jsx` gli errori imprevisti: quest'ultimo è client perché riceve `reset`.

### Form, Server Actions e validazione

Una **Server Action** è una funzione `async` che gira sul server e viene chiamata dal form: il browser invia i dati, il server valida e salva. Non serve una route API per ogni form e la validazione server è l'unica affidabile; quella client è comodità, non sicurezza.

```jsx
// src/app/ricette/nuova/actions.js
"use server";
import { revalidatePath } from "next/cache";
import { aggiungiRicetta } from "@/lib/ricette";

export async function creaRicetta(_statoPrecedente, formData) {
  const titolo = String(formData.get("titolo") ?? "").trim();
  const tempo = Number(formData.get("tempoMinuti"));
  const errori = {};
  if (titolo.length < 3) errori.titolo = "Il titolo deve avere almeno 3 caratteri.";
  if (!Number.isFinite(tempo) || tempo <= 0) errori.tempoMinuti = "Inserisci un tempo maggiore di zero.";
  if (Object.keys(errori).length > 0) {
    return { errori, messaggio: "Controlla i campi." };
  }

  await aggiungiRicetta({ titolo, tempoMinuti: tempo });
  revalidatePath("/ricette");
  return { errori: {}, messaggio: `Ricetta "${titolo}" salvata.` };
}
```

Il form usa `useActionState`: riceve lo stato restituito dall'azione, la funzione da passare ad `action` e un booleano per disabilitare il pulsante durante l'invio.

```jsx
// src/app/ricette/nuova/FormRicetta.jsx
"use client";
import { useActionState } from "react";
import { creaRicetta } from "./actions";

const statoIniziale = { errori: {}, messaggio: "" };
export default function FormRicetta() {
  const [stato, azione, inCorso] = useActionState(creaRicetta, statoIniziale);
  return (
    <form action={azione}>
      <label htmlFor="titolo">Titolo</label>
      <input id="titolo" name="titolo" required minLength={3} />
      {stato.errori.titolo && <p role="alert">{stato.errori.titolo}</p>}
      <label htmlFor="tempoMinuti">Minuti</label>
      <input id="tempoMinuti" name="tempoMinuti" type="number" min="1" />
      {stato.errori.tempoMinuti && <p role="alert">{stato.errori.tempoMinuti}</p>}
      <button type="submit" disabled={inCorso}>
        {inCorso ? "Salvataggio..." : "Salva ricetta"}
      </button>
      {stato.messaggio && <p role="status">{stato.messaggio}</p>}
    </form>
  );
}
```

**Comportamento atteso**: inviando `Po` e `0` compaiono i due errori e nessuna ricetta viene creata; con `Focaccia` e `90` compare `Ricetta "Focaccia" salvata.` e la scheda appare in `/ricette` senza ricaricare.

### Build di produzione e deploy su Vercel

La build controlla tipi e lint e prerenderizza le pagine: se passa in locale, Vercel farà la stessa cosa sul suo server.

```bash
npm run build
npm run start
```

```text
 ✓ Compiled successfully
 ✓ Generating static pages (5/5)

Route (app)
┌ ○ /
├ ○ /ricette
├ ● /ricette/[slug]
├ ○ /ricette/nuova
└ ƒ /api/ricette
```

`○` è statica, `●` è generata con `generateStaticParams`, `ƒ` è eseguita a ogni richiesta. Poi il codice su GitHub e il progetto su Vercel: import del repository, framework riconosciuto, variabili d'ambiente, deploy. Ogni push su `main` aggiorna la produzione, ogni pull request crea un'anteprima con URL proprio.

```bash
git init
git add .
git commit -m "Struttura iniziale del Ricettario"
git branch -M main
git remote add origin https://github.com/tuo-utente/ricettario.git
git push -u origin main
```

Le variabili senza prefisso esistono solo sul server: `process.env.DATABASE_URL` va letto in un modulo server e controllato subito, con un errore chiaro se manca. `NEXT_PUBLIC_` finisce invece nel bundle, quindi non usarlo per password o chiavi. Su Vercel le variabili si impostano in **Settings > Environment Variables** e richiedono un nuovo deploy. Il filesystem è di sola lettura e temporaneo: un JSON scritto con `fs` funziona in locale e si perde online, quindi per i dati dell'utente servono un database, un servizio esterno o `localStorage` se devono restare sul dispositivo.

### Il progetto finale: scelta, MVP e tappe

Il progetto parte da un problema, non da una tecnologia. Traccia consigliata: un **Ricettario personale** per chi cucina le stesse cose e tiene le ricette in tre posti diversi. Utenti: chi pubblica e chi consulta dal telefono in cucina. Funzionalità minime: elenco, dettaglio, ricerca, inserimento validato, preferiti che sopravvivono al refresh. Pagine: `/`, `/ricette`, `/ricette/[slug]`, `/ricette/nuova`, `/preferiti`. Fuori ambito: login, commenti, upload, notifiche.

I dati sono ricette con `slug`, `titolo`, `tempoMinuti`, `difficolta`, `ingredienti`, `passi`, `immagine`. Lo `slug` è la chiave stabile: non cambia se cambia il titolo. Aggiungi tre ricette, poi il codice condiviso va in `src/lib`, i componenti in `src/components`, i dati in `src/data`.

```json
[
  {
    "slug": "pasta-al-pomodoro",
    "titolo": "Pasta al pomodoro",
    "tempoMinuti": 20,
    "difficolta": "facile",
    "ingredienti": ["320 g di pasta", "400 g di pomodori", "1 spicchio d'aglio"],
    "passi": ["Metti l'acqua sul fuoco.", "Prepara il sugo."],
    "immagine": "/images/pasta.jpg"
  }
]
```

| Giorni | Cosa fai | Fatto quando |
| --- | --- | --- |
| 81 | requisiti, utenti, pagine, dati | elenchi cinque funzionalità e i casi limite |
| 82 | repository, struttura, design base | il progetto parte e il primo commit è online |
| 83-84 | funzionalità core e UI responsive | il flusso elenco-dettaglio-inserimento funziona |
| 85 | API o persistenza | i dati sopravvivono al refresh o il POST risponde 201 |
| 86-87 | test, accessibilità, performance | test verdi, focus e contrasti a posto, Lighthouse buono |
| 88-90 | README, deploy, revisione, presentazione | il link pubblico funziona e sai spiegare le scelte |

Il progetto è guidato ma aperto: una **dashboard di spese** segue le stesse tappe con movimenti, form, totale per categoria e filtro per mese. Cambiano i dati, non il metodo. Scrivi i criteri di accettazione prima del codice: servono a decidere quando fermarsi.

### Test, accessibilità, README e presentazione

I test più utili sono quelli sulle funzioni pure: filtro, formattazione, validazione. In `src/lib/ricette.test.js` verifichi che `filtraRicette("  TOR ")` restituisca una ricetta, che il testo vuoto restituisca tutte e tre e che `formattaTempo` copra minuti e ore. Costano poco e proteggono la logica mentre rifinisci l'interfaccia.

```text
✓ src/lib/ricette.test.js (3 tests)

Test Files  1 passed (1)
     Tests  3 passed (3)
```

Accessibilità: contrasto almeno 4.5:1, focus visibile, ogni input con `<label>`, ogni immagine con `alt` utile, titoli in ordine, `aria-current` sulla voce attiva, niente contenuti persi con lo zoom al 200%. Verifica con Tab, axe DevTools e senza mouse.

Performance: `next/image` con `width` e `height` per evitare salti di layout, `priority` solo sull'immagine principale, font con `next/font`, `"use client"` solo dove serve. Obiettivo: Lighthouse mobile con Performance sopra 90 e LCP sotto 2.5 secondi.

README: nome e descrizione, link alla demo, due screenshot, funzionalità, stack, avvio in tre comandi, variabili, test, scelte tecniche, limiti. Refactoring: via i `console.log`, nomi che dicono cosa fanno, funzioni estratte oltre le venti righe, file morti cancellati; `npm run lint` e `npm run build` senza warning.

La presentazione dura cinque minuti: problema e utenti, demo del flusso principale, una scelta tecnica spiegata, cosa non funziona ancora, prossimi 90 giorni. Dopo il percorso le strade naturali sono tre: TypeScript e test di integrazione, database con autenticazione, rendering misto e ottimizzazioni di Next.js. Scegline una e continua a costruire.

### Errori comuni

- Mettere `"use client"` nel `layout.jsx` radice: l'intera app diventa client e perdi i vantaggi dei Server Components.
- Usare `useState` o `onClick` in un Server Component: gli eventi non si possono passare al client, il componente va diviso.
- Dichiarare `async` un Client Component: non è supportato, l'asincronia va nel Server Component o in una Server Action.
- Passare una funzione come prop da server a client: le props devono essere serializzabili.
- Dimenticare `await params`: nelle versioni recenti di Next.js è una Promise e lo `slug` risulta `undefined`.
- Salvare senza `revalidatePath`: la pagina resta in cache e la nuova voce non compare.
- Scrivere file con `fs` e aspettarsi che sopravvivano su Vercel: il filesystem è di sola lettura e temporaneo.
- Mettere un segreto in una variabile `NEXT_PUBLIC_`: finisce nel bundle ed è visibile a tutti.
- Lasciare immagini senza dimensioni: il layout salta durante il caricamento e il CLS peggiora.

### Esercizi progressivi

1. **Definizione del progetto.** Scegli il progetto e scrivi problema, due utenti, cinque funzionalità, cinque pagine, dati e fuori ambito (esercizio base 1). Criterio: ogni funzionalità si verifica con un'azione concreta.
2. **Repository e struttura.** Crea progetto Next.js, repository GitHub e cartelle `app`, `components`, `lib`, `data`; fai il primo commit (esercizio base 2). Criterio: `npm run dev` parte, `git log --oneline` mostra un commit, nessun `.env` tracciato.
3. **Dati e stato.** Crea tre ricette in `src/data/ricette.json` e la funzione `getRicette`; mostrale in una pagina server (esercizio base 3). Criterio: nessun `useState`, nessun `useEffect`.
   Output atteso:
   ```text
   Pasta al pomodoro — 20 min
   Minestrone — 45 min
   Torta di mele — 60 min
   ```
4. **Funzionalità core.** Scrivi `filtraRicette`, `trovaRicetta` e `formattaTempo` in `src/lib/ricette.js`; la ricerca ignora maiuscole e spazi (esercizio base 4).
   Output atteso:
   ```text
   filtraRicette("tor")  → 1
   filtraRicette("  ")   → 3
   formattaTempo(45)     → "45 min"
   formattaTempo(75)     → "1 h 15 min"
   ```
5. **Prima UI.** Costruisci `SchedaRicetta` ed `ElencoRicette` con griglia responsive, senza curare lo stile (esercizio base 5). Criterio: sotto 640 px una colonna, sopra tre colonne, nessun overflow.
   Comportamento atteso: a 375 px le schede sono impilate; a 1024 px affiancate.
6. **Routing e pagine.** Aggiungi `/ricette`, `/ricette/[slug]`, `/ricette/nuova`, `loading.jsx` e `not-found.jsx`; usa `Link` e `generateStaticParams` (esercizio intermedio 6). Criterio: nessun ricaricamento, titolo del documento aggiornato.
   Comportamento atteso: `/ricette/minestrone` mostra il dettaglio; `/ricette/inventata` mostra `Ricetta non trovata` con stato 404.
7. **Form e validazione.** Crea il form con Server Action, validazione server e messaggi vicini ai campi (esercizio intermedio 7). Criterio: usabile da tastiera e senza duplicati.
   Output atteso inviando titolo `Po` e tempo `0`:
   ```text
   Il titolo deve avere almeno 3 caratteri.
   Inserisci un tempo maggiore di zero.
   ```
8. **API o persistenza.** Scegli una strada: route API `GET`/`POST` in `src/app/api/ricette/route.js` oppure preferiti in `localStorage` con un hook dedicato (esercizio intermedio 8). Criterio: la scelta e il motivo sono nel README.
   Output atteso con la route API:
   ```text
   GET  /api/ricette → 200, totale 3
   POST /api/ricette → 201, slug "focaccia"
   GET  /api/ricette → 200, totale 4
   ```
9. **Test base.** Aggiungi test per filtro, formattazione e validazione, inclusi ricerca vuota, nessun risultato e tempo zero (esercizio intermedio 9). Criterio: almeno sei test e nessuno dipendente dalla rete.
10. **Accessibilità.** Sistematizza contrasti, focus, label, `alt`, ordine dei titoli e `aria-current`; prova con Tab e axe DevTools (esercizio intermedio 10). Criterio: zero violazioni critiche.
    Comportamento atteso: Tab attraversa logo, navigazione, ricerca e pulsanti, con anello di focus sempre visibile.
11. **Performance.** Usa `next/image`, `priority` solo sull'immagine principale, `"use client"` al livello più basso possibile (esercizio intermedio 11). Criterio: Lighthouse mobile con Performance sopra 90, LCP sotto 2.5 secondi e nessun salto di layout.
12. **README e screenshot.** Scrivi il README con descrizione, demo, due screenshot, stack, avvio, test, variabili e limiti (esercizio avanzato 12). Criterio: una persona esterna avvia il progetto in meno di cinque minuti.
13. **Deploy.** Porta il progetto su Vercel da GitHub, configura le variabili e verifica la produzione (esercizio avanzato 13). Criterio: build verde, URL pubblico funzionante, nessun segreto nel bundle.
    Comportamento atteso: elenco, dettaglio e form funzionano sull'URL pubblico; in locale `npm run build` termina con `Compiled successfully`.
14. **Refactoring finale.** Elimina i `console.log`, rinomina i componenti ambigui, estrai la validazione, cancella i file inutilizzati (esercizio avanzato 14). Criterio: lint e build puliti, test verdi.
    Output atteso:
    ```text
    $ grep -rn "console.log" src
    $ npm run lint
    No ESLint warnings or errors
    ```
15. **Revisione e presentazione.** Verifica i criteri di accettazione (funzionalità minima, casi limite, accessibilità, README) e prepara cinque minuti di presentazione con demo e prossimi passi (esercizio avanzato 15). Criterio: sai spiegare una scelta tecnica e un limite senza appunti.
    Output atteso (scaletta):
    ```text
    0:00 problema e utenti
    0:30 demo: elenco, dettaglio, nuova ricetta
    2:30 una scelta tecnica: Server Components e cache
    3:30 cosa non funziona ancora
    4:00 prossimi 90 giorni
    ```

### Varianti

- Trasforma il Ricettario in una **dashboard di spese**: movimenti con importo e categoria, totale del mese, filtro per categoria e persistenza; le tappe restano le stesse.
- Aggiungi filtri con `searchParams` (`?categoria=dolci&ordine=tempo`) e lascia che sia la URL a descrivere lo stato: ricaricabile, condivisibile, testabile.
- Introduci i preferiti con un Context client e `localStorage`, mostrando un contatore nell'header e la pagina `/preferiti`.
- Migra i dati su Postgres gestito (Neon o Supabase) con variabile solo server, script di seed e un test di integrazione sulla lettura.
