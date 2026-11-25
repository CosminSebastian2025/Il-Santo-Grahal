Inertia.js non è un framework né un router: è un protocollo e un insieme di adattatori che permettono a un backend classico — Laravel, Rails, Django — di servire pagine a un frontend React, Vue o Svelte, senza costruire una API REST separata e senza scaricare un JSON e riconciliarlo a mano. Il server continua a fare routing, autenticazione e validazione; Inertia si occupa solo di consegnare dati ai componenti e di intercettare i link. In questa lezione impari come funziona lo scambio, come si installa con Laravel e React (`@inertiajs/react` 3.x) e quali confini non va superato.

## Obiettivi

- Descrivere il ciclo richiesta-risposta di Inertia e cosa contengono le props di pagina.
- Installare gli adattatori server e client e creare la prima pagina con `Inertia::render`.
- Cablare l'entrypoint client con `createInertiaApp` e il component resolver.
- Riconoscere per quali progetti Inertia è adatto e per quali è un ostacolo.

## Come funziona: un solo protocollo, due modalità

Inertia lavora su normali richieste HTTP. La prima visita a un URL è un full page load: il server risponde con un documento HTML che contiene un `div` con l'ID configurato e uno `<script>` con `data-page`, un JSON serializzato con nome del componente, props e URL. Da lì in poi il client intercetta i link e i `router.visit`, invia richieste con l'header `X-Inertia: true` e il server risponde con JSON invece che con HTML. Il client verifica l'header `X-Inertia-Version` contro la versione degli asset: se non coincide riceve `409 Conflict` e forza un full reload, così un utente che ha il browser aperto da ieri non continua a usare chunk JS vecchi dopo un deploy.

```text
GET /progetti                       → HTML con <div id="app" data-page="{...}">
click su <Link href="/progetti/7">  → GET /progetti/7   X-Inertia: true
                                    ← 200 JSON { component: "Progetti/Dettaglio", props, url }
                                    → il client monta un altro componente, la pagina non si ricarica
```

Il payload di pagina ha quattro campi: `component` (il percorso del file nella cartella `Pages`), `props` (i dati passati dal controller), `url` (l'URL corrente) e `version` (la versione degli asset compilati, calcolata dal manifest di Vite). La versione è il meccanismo che tiene allineati server e client: al primo caricamento il client memorizza il valore ricevuto e lo rimanda con ogni richiesta Inertia nell'header `X-Inertia-Version`; se il server ha una versione diversa risponde `409 Conflict` e il client esegue un full reload, rendendo visibili classi CSS e chunk JS nuovi.

| Elemento | Chi lo produce | A cosa serve |
| --- | --- | --- |
| `component` | `Inertia::render("Progetti/Index")` | sceglie il componente client |
| `props` | array passato al render o condiviso | dati della pagina |
| `url` | automatico | barra degli indirizzi e `usePage().url` |
| `version` | hash degli asset | invalida il client dopo un deploy |

Il confine importante: ogni navigazione richiede una risposta del server. Inertia non serve a costruire una SPA offline-first né a esporre un'API a terzi; se il client deve funzionare senza backend, o un'app mobile deve consumare gli stessi dati, l'API va fatta comunque.

## Installazione su Laravel e prima pagina

Su Laravel 11 o successivo (PHP 8.2+) l'installer `laravel new` propone lo starter kit React con Inertia, Tailwind e TypeScript. Per un progetto esistente si installa a mano con il comando ufficiale, che aggiunge il middleware e genera il file di configurazione.

```bash
composer require inertiajs/inertia-laravel
php artisan inertia:middleware          # app/Http/Middleware/HandleInertiaRequests.php
npm install @inertiajs/react react react-dom
```

Il middleware va registrato nel bootstrap dell'applicazione (`->withMiddleware(fn ($m) => $m->web(append: [HandleInertiaRequests::class]))` in Laravel 11). Il metodo `share` ritorna le props comuni a tutte le pagine: utente corrente, flash, notifiche.

```php
// routes/web.php
use Inertia\Inertia;
use App\Models\Progetto;

Route::get('/progetti', fn () => Inertia::render('Progetti/Index', [
    'progetti' => Progetto::withCount('attivita')->latest()->paginate(15),
]));

Route::get('/progetti/{progetto}', fn (Progetto $progetto) => Inertia::render('Progetti/Dettaglio', [
    'progetto' => $progetto->load('attivita'),
    'puoModificare' => auth()->user()?->can('update', $progetto) ?? false,
]));
```

```php
// app/Http/Middleware/HandleInertiaRequests.php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => ['utente' => fn () => $request->user()?->only('id', 'name', 'email')],
        'flash' => ['successo' => fn () => $request->session()->get('successo')],
    ];
}
```

Le closure nelle props condivise sono valutate solo se la pagina le richiede: una proprietà `auth.utente` mai usata non costa una query.

## Entrypoint client e primi componenti

Su Laravel con Vite l'entrypoint è `resources/js/app.tsx`, caricato dal blade `app.blade.php` con `@viteReactRefresh` e `@vite`. `createInertiaApp` monta il componente della pagina e gestisce titoli ed errori.

```tsx
// resources/js/app.tsx
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";

createInertiaApp({
  title: (title) => (title ? `${title} — Bacheca` : "Bacheca"),
  resolve: (name) => {
    const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
    return pages[`./Pages/${name}.tsx`];
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});
```

Il nome passato a `Inertia::render` e il percorso del file devono combaciare: `Progetti/Index` corrisponde a `resources/js/Pages/Progetti/Index.tsx`. Il layout si applica nel componente, oppure come default nel resolver, così ogni pagina non lo ripete.

```tsx
// resources/js/Pages/Progetti/Index.tsx
import { Head, Link, type PageProps } from "@inertiajs/react";
import Layout from "../../Layouts/Layout";

interface Progetto { id: number; nome: string; budget: number; attivita_count: number }

export default function Index({ progetti }: PageProps<{ progetti: { data: Progetto[]; links: { url: string | null; label: string; active: boolean }[] } }>) {
  return (
    <Layout>
      <Head title="Progetti" />
      <ul>
        {progetti.data.map((p) => (
          <li key={p.id}>
            <Link href={`/progetti/${p.id}`} preserveScroll>{p.nome}</Link> — {p.attivita_count} attività
          </li>
        ))}
      </ul>
      <nav>
        {progetti.links.map((l) => (
          <Link key={l.label} href={l.url ?? ""} preserveState as={l.url ? "a" : "span"} preserveScroll>
            <span dangerouslySetInnerHTML={{ __html: l.label }} />
          </Link>
        ))}
      </nav>
    </Layout>
  );
}
```

I link interni passano sempre da `<Link>`: se si usa `<a href>`, il browser fa un full reload e Inertia non può conservare lo stato dei componenti né applicare `preserveScroll`. `usePage()` espone le props condivise e la `url` corrente in qualsiasi componente, senza passarle di padre in figlio.

| Componente o hook | Scopo | Uso tipico |
| --- | --- | --- |
| `<Link>` | navigazione senza reload | menù, tabelle, paginazione |
| `router.visit(url, opzioni)` | navigazione programmatica | redirect dopo azione, filtri |
| `useForm` | stato del form e invio | creazione, modifica |
| `usePage` | props condivise e url | utente, flash, breadcrumb |
| `usePoll` / `router.reload` | aggiornamento dati | dashboard in tempo reale |

## Per quali progetti ha senso

Inertia è pensato per applicazioni "monolite moderno": un team che già conosce Laravel, Rails o Django e vuole componenti React senza mantenere due codebase e un contratto API separato. Il caso tipico è una dashboard interna, un gestionale, un back-office con molta autorizzazione e poco traffico anonimo. In questi contesti il server ha già sessioni, middleware, policy e validazione, e Inertia li riusa senza duplicarli.

| Scenario | Inertia | Alternativa |
| --- | --- | --- |
| Gestionale con ruoli e form complessi | adatto: policy e Form Request già pronte | Livewire, Rails con Hotwire |
| Sito pubblico con SEO e cache CDN | parziale: serve SSR per i crawler | framework full-stack con SSR |
| App mobile che usa gli stessi dati | inadatto: serve una API | API REST o GraphQL |
| SPA con funzionamento offline | inadatto: ogni visita richiede il server | client con cache locale e sync |
| Progetto con due team, frontend e backend separati | possibile ma con attrito | API + framework frontend |

Il punto di attrito non è tecnico ma organizzativo: Inertia accoppia il frontend alle rotte e alle props del backend, quindi ogni modifica alla pagina richiede modifiche coordinate sui due lati. Se i team sono separati e hanno ritmi diversi, una API esplicita resta più adatta.

## Errori comuni

- **Fare richieste `fetch` ai propri endpoint di pagina**: le props arrivano già dal render; se serve un endpoint JSON dedicato, Inertia non è il problema da risolvere con `fetch` a mano.
- **Usare `<a href>` per la navigazione interna**: rompe la conservazione dello stato e causa ricariche complete; usa `<Link>`.
- **Restituire un array PHP non serializzabile**: un modello Eloquent con relazioni caricate a metà o un `Closure` interno producono payload incoerenti; restituisci array espliciti con `only()` o API Resource.
- **Dimenticare il middleware `HandleInertiaRequests`**: senza di esso il client riceve HTML invece di JSON sulle visite Inertia e la pagina sembra "spezzata" solo dopo il primo click.
- **Aggiornare gli asset senza versione cambiata in sviluppo**: se il manifest non si rigenera, il client può servire chunk vecchi in cache e mostrare errori di import.

## In sintesi

Inertia è un contratto fra backend e frontend: il server dichiara componente e props, il client intercetta i link e scambia JSON. Il vantaggio è concreto — routing, sessioni e validazione restano dove sono già state scritte, e la UI diventa componenti React senza una API separata. Il costo è che ogni navigazione passa dal server e che non esiste una modalità offline. Nella prossima lezione si entrerà nel merito di visite parziali, form e validazione, dove il protocollo mostra i suoi dettagli più utili.

## Fonti

- [Inertia.js - How It Works](https://inertiajs.com/how-it-works)
- [Inertia.js - Server-side Setup](https://inertiajs.com/server-side-setup)
- [Inertia.js - Client-side Setup](https://inertiajs.com/client-side-setup)
- [Laravel - Starter Kits](https://laravel.com/docs/starter-kits)
