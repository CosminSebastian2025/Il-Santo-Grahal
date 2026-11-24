Nei Server Components i dati si leggono direttamente nel componente, con chiamate asincrone e senza hook di caricamento: il server attende la promessa, renderizza l'HTML e spedisce solo il risultato. Cambia però il modo di pensare a caching, rivalidazione ed errori, perché il componente gira in un contesto diverso dal browser. Questa lezione spiega come caricare dati, quando una risposta viene riusata, e come implementare le mutazioni con Server Actions e route handler.

## Obiettivi

- Caricare dati in un Server Component asincrono con `fetch` o accesso diretto alla sorgente.
- Distinguere le diverse modalità di cache e decidere la strategia di rivalidazione.
- Evolvere una fetch verso il caching dichiarativo con `cache()` e `cacheLife`/`cacheTag`.
- Scrivere route handler per endpoint HTTP e capire quando servono davvero.
- Evitare richieste duplicate e waterfall di caricamento.

## Caricare dati nel componente

Un Server Component può essere `async` e attendere direttamente i dati. Non servono `useEffect` né stati: se i dati cambiano, il componente viene ri-renderizzato dal server.

```tsx
type Prodotto = { id: string; nome: string; prezzo: number };

async function getProdotti(): Promise<Prodotto[]> {
  const res = await fetch("https://api.example.com/prodotti", {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Prodotto[]>;
}

export default async function Catalogo() {
  const prodotti = await getProdotti();
  return (
    <ul>
      {prodotti.map((p) => (
        <li key={p.id}>{p.nome} - {p.prezzo} EUR</li>
      ))}
    </ul>
  );
}
```

Se i dati sono in un database, la chiamata può essere diretta con il client del database: è il vantaggio principale dei Server Components, nessuna API intermedia solo per il frontend. Il costo è che la funzione gira sullo stesso processo dell'app, quindi deve usare credenziali server e non esporre mai segreti al client.

## Cache e rivalidazione

Le opzioni della `fetch` sono la principale leva di controllo. In sintesi:

| Opzione | Significato | Quando usarla |
| --- | --- | --- |
| `cache: "force-cache"` | usa la cache il più possibile | dati quasi statici |
| `cache: "no-store"` | nessuna cache | dati per-utente, prezzi live |
| `next: { revalidate: 60 }` | rivalida al massimo ogni 60 secondi | catalogo, news |
| `next: { tags: ["prodotti"] }` | cache con etichetta | invalidazione mirata |
| `revalidatePath()` | invalida un percorso | dopo una mutazione |

La rivalidazione con tag permette di scartare solo le voci collegate a un'entità quando cambia. Sulle api più recenti il caching dichiarativo si esprime con le funzioni `cache()` per deduplicare, `cacheLife` per la durata e `cacheTag` per le etichette, usate dentro una funzione dati:

```tsx
import { cacheLife, cacheTag } from "next/cache";

async function getArticolo(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(`articolo:${slug}`);
  const res = await fetch(`https://api.example.com/articoli/${slug}`);
  return res.json();
}
```

Il principio resta lo stesso: dichiarare nel componente dati la durata e l'etichetta, e invalidare per tag quando un contenuto cambia.

## Mutazioni: Server Actions e route handler

Le funzioni asincrone marcate `"use server"` possono essere chiamate da un form client e girano sul server: sono le Server Actions, il modo più naturale per le mutazioni interne. I route handler (`app/api/.../route.ts`) restano invece la scelta per API pubbliche, webhook e integrazioni esterne.

```ts
// app/api/prodotti/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const prodotti = await db.prodotti.findMany();
  return NextResponse.json(prodotti);
}
```

```ts
// app/actions/prodotti.ts
"use server";

import { revalidateTag } from "next/cache";

export async function creaProdotto(formData: FormData) {
  await db.prodotti.create({ nome: String(formData.get("nome")) });
  revalidateTag("prodotti");
}
```

La differenza pratica: una route handler riceve una `Request` e restituisce una `Response`; una Server Action è una funzione tipizzata chiamata dal componente e integrata con la rivalidazione della pagina corrente. Per i dati per-utente, come un carrello, il no-store e l'identità della richiesta vanno combinati con la sessione lette tramite `cookies()`.

## Waterfall e richieste duplicate

La trappola principale è il waterfall: ogni `await` sequenziale somma la latenza. Quando le richieste sono indipendenti, si avviano insieme con `Promise.all` o si spostano in componenti figli separati, così lo streaming parte prima.

```tsx
const [reparti, sconto] = await Promise.all([getReparti(), getSconto()]);
```

Per i duplicati, la funzione `cache()` di React memoizza il risultato per la durata della richiesta: se tre componenti chiedono lo stesso utente, la query viene eseguita una volta sola. È diverso dalla cache HTTP, che vive tra richieste diverse.

## Errori comuni

- **Usare `useEffect` per caricare dati**: nei Server Components non serve e nei Client Components introduce stati di caricamento inutili.
- **`no-store` su tutto**: ogni pagina diventa dinamica e perdi prerender, CDN e velocità.
- **Invalidare con `revalidatePath("/")` dopo ogni scrittura**: butta via tutta la cache invece del solo contenuto cambiato.
- **Chiamare l'API interna dell'app da un Server Component**: meglio leggere la sorgente dati direttamente o usare `cache()`.
- **Dimenticare la gestione di `res.ok`**: un 500 dell'API diventa un `json()` che lancia un errore poco chiaro.

## In sintesi

Nei Server Components i dati si attendono direttamente e si leggono dalla fonte, senza hook di caricamento. La `fetch` di Next.js aggiunge cache, rivalidazione per tempo e per tag, mentre `cache()` deduplica dentro la richiesta. Le Server Actions sono il canale naturale per le mutazioni, le route handler per API pubbliche e webhook. Waterfall e cache troppo aggressive sono gli errori più costosi.

## Fonti

- [Next.js Docs - Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data)
- [Next.js Docs - Caching](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js Docs - Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [MDN - Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
