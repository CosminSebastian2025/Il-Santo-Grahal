Il valore di Inertia si vede quando la navigazione non è più un semplice cambio di pagina: tabelle paginate che cambiano filtro senza perdere la posizione del menu, form che mostrano gli errori di validazione Laravel accanto ai campi, liste in cui un elemento viene eliminato e la pagina non deve ricaricarsi interamente. Questa lezione copre le tre primitive che rendono tutto questo possibile — visite parziali, `useForm` e deduplicazione delle props — e il modo corretto di rimandare gli errori a Laravel invece di duplicare le regole nel browser.

## Obiettivi

- Gestire `persist`, `prefetch`, `preserveScroll` e `preserveState` sulle visite.
- Usare `<Link>` e `router.visit` con opzioni coerenti e capire quando forzarne una.
- Scrivere form con `useForm`: invio, upload, errori, reset e transform.
- Sfruttare le visite parziali con `only` e `Inertia::lazy` per non ricalcolare tutto a ogni cambio di filtro.
- Rimandare gli errori di validazione al server e mostrare i flash message.

## Visite, stato del client e memoria del server

Ogni click su `<Link>` è una visita. Le opzioni decidono cosa sopravvive: `preserveState` mantiene lo stato dei componenti React quando la pagina di destinazione è la stessa (per esempio cambiando `?page=2`), `preserveScroll` evita il salto in cima, `replace` sostituisce la voce di cronologia, `prefetch` scarica in anticipo al passaggio del mouse.

```tsx
<Link href={`/progetti?page=${n}`} preserveState preserveScroll prefetch="hover">
  Pagina {n}
</Link>

// visita programmata, per esempio dopo un filtro
router.visit("/progetti", {
  data: { stato: "attivi", ordina: "budget" },
  only: ["progetti"],
  preserveState: true,
  preserveScroll: true,
  replace: true,
});
```

`router.visit` con l'opzione `data` fa una GET con i parametri nell'URL; per un filtri complessi è preferibile costruire la query string con `URLSearchParams` e passare l'URL completo, così la barra degli indirizzi resta condivisibile con un collega. Sopra i 2000 caratteri la query string viene troncata dai proxy: se il filtro è grande, conviene passare a una POST verso un endpoint che reindirizza.

| Opzione | Effetto | Quando usarla |
| --- | --- | --- |
| `preserveState` | tiene lo stato dei componenti | stessa pagina, cambiano solo i dati |
| `preserveScroll` | non riporta in cima | paginazione, filtri in tabella |
| `replace` | non aggiunge voce cronologia | filtri automatici, autosave |
| `only` | richiede solo alcune props | tabelle grandi, dashboard con widget lenti |
| `prefetch` | precarica al passaggio | menu e link principali |
| `errorBag` | raccoglie errori in un contenitore dedicato | più form sulla stessa pagina |

## Form, errori e upload

`useForm` gestisce valori, errori, invio e stato di caricamento. Il flusso corretto è: il server valida con Form Request, redirige in caso di errore con la `ValidationException` e il client legge gli errori tramite `form.errors`.

```php
// app/Http/Requests/ProgettoRequest.php
public function rules(): array
{
    return [
        'nome' => ['required', 'string', 'max:120'],
        'budget' => ['required', 'integer', 'min:0', 'max:10000000'],
        'documento' => ['nullable', 'file', 'mimes:pdf', 'max:4096'],
    ];
}

// app/Http/Controllers/ProgettoController.php
public function store(ProgettoRequest $request): RedirectResponse
{
    $progetto = Progetto::create($request->safe()->except('documento'));

    if ($request->hasFile('documento')) {
        $progetto->attachDocumento($request->file('documento')); // salva e associa
    }

    return redirect("/progetti/{$progetto->id}")->with('successo', 'Progetto creato');
}
```

```tsx
import { useForm } from "@inertiajs/react";

interface DatiProgetto { nome: string; budget: number | string; documento: File | null }

export default function NuovoProgetto() {
  const form = useForm<DatiProgetto>({ nome: "", budget: 0, documento: null });

  function invia(e: React.FormEvent) {
    e.preventDefault();
    form.post("/progetti", {
      forceFormData: true,       // necessario con il file
      preserveScroll: true,
      onSuccess: () => form.reset(), // la navigazione la fa Inertia
    });
  }

  return (
    <form onSubmit={invia}>
      <input value={form.data.nome} onChange={(e) => form.setData("nome", e.target.value)} />
      {form.errors.nome && <p role="alert">{form.errors.nome}</p>}

      <input type="number" value={form.data.budget}
        onChange={(e) => form.setData("budget", e.target.value)} />

      <input type="file" accept="application/pdf"
        onChange={(e) => form.setData("documento", e.target.files?.[0] ?? null)} />
      {form.progress && <progress max={100} value={form.progress.percentage} />}

      <button disabled={form.processing}>{form.processing ? "Salvataggio…" : "Crea"}</button>
    </form>
  );
}
```

Il payload viene inviato al server insieme al form; i flash message arrivano dalle props condivise e si leggono con `usePage`. Il form non deve gestire la navigazione: Inertia la esegue sulla risposta del server, e se la risposta è un redirect la visita non ricarica il documento.

```tsx
const { flash } = usePage().props as { flash?: { successo?: string } };
return flash?.successo ? <div className="toast">{flash.successo}</div> : null;
```

## Visite parziali e props lazy

Con una tabella grande, o una dashboard con un widget che chiama una API esterna lenta, inviare tutte le props a ogni filtro è uno spreco di query. Le props dichiarate con `Inertia::lazy` o con una closure (`fn () => ...`) vengono valutate solo quando il client le richiede con `only`; `router.reload({ only: ["progetti"] })` chiede solo le props elencate e il resto resta quello già in pagina.

```php
Route::get('/dashboard', fn () => Inertia::render('Dashboard', [
    'progetti' => Progetto::latest()->take(5)->get(),
    'statistiche' => Inertia::lazy(fn () => StatisticheService::calcola()), // solo su richiesta
]));
```

```tsx
import { usePoll } from "@inertiajs/react";

// aggiorna solo le statistiche ogni 30 secondi, lasciando intatto il resto della pagina
usePoll(30_000, { only: ["statistiche"], preserveScroll: true }, []); // terzo argomento: dipendenze
```

Attenzione: le visite parziali con `only` restituiscono solo le chiavi richieste; il client le fonde con le props precedenti. Se una prop dipende da un'altra (per esempio `puoModificare` dipende dal progetto corrente), include entrambe in `only`, altrimenti React riceverà una prop aggiornata accanto a una vecchia.

## Errori in contesti multipli e flash message

Una pagina con due form — per esempio un pannello di modifica e un widget di commenti — non può condividere un unico insieme di errori: ogni `useForm` gestisce il proprio, ma la pagina deve sapere quale form ha fallito. Inertia risolve con `errorBag`: il server risponde con `->withErrors($validatore, 'commento')` e il client legge `usePage().props.errors.commento`. Il campo `errors` è fra le props condivise, quindi `useForm` lo consuma automaticamente solo quando l'`errorBag` corrisponde.

```tsx
const { errors } = usePage().props as { errors: Record<string, Record<string, string>> };
const erroreCommento = errors.commento?.testo;
```

I flash message seguono la stessa logica ma al contrario: non sono errori e non vanno dentro `useForm`, bensì fra le props condivise che il server imposta con `->with('successo', ...)` dopo un redirect. Il valore arriva per una sola visita e sparisce alla successiva, perché la sessione lo consuma. Non ricostruire i toast con `setTimeout` nel componente: un toast che vive nello stato React si perde al primo cambio di pagina, mentre il flash sopravvive alla navigazione e si mostra nella nuova pagina, che è il punto di arrivo del redirect.

## Errori comuni

- **Validare solo lato client**: Inertia non elimina la necessità di validare sul server; qualunque `fetch` diretto all'endpoint bypassa il form e le regole JS non vengono eseguite.
- **Dimenticare `forceFormData: true` con un file**: il file non arriva al server e la richiesta passa come JSON vuoto.
- **Usare `only` senza le props correlate**: la pagina mostra dati incoerenti perché le props non richieste restano quelle della visita precedente.
- **Chiamare `router.visit` dentro un `useEffect` senza guardie**: loop di visite; usa come dipendenze solo valori che cambiano per volontà dell'utente.
- **Gestire gli errori con `try/catch` intorno a `form.post`**: `form.post` non lancia; il fallimento arriva in `onError` e in `form.errors`.

## In sintesi

Le visite Inertia hanno quattro manopole che decidono cosa conservare e cosa ricaricare, e le visite parziali evitano di ricalcolare props non richieste. `useForm` incapsula invio, progresso, errori e reset, delegando al server la validazione che oggi scriveresti due volte. I flash message arrivano dalle props condivise, che sono anche il posto giusto per l'utente autenticato. Nella prossima lezione questo si trasforma in un laboratorio completo con test, controlli anti-doppio invio e una misura di quanto pesa davvero il payload.

## Fonti

- [Inertia.js - Pages](https://inertiajs.com/pages)
- [Inertia.js - Links](https://inertiajs.com/links)
- [Inertia.js - Forms](https://inertiajs.com/forms)
- [Inertia.js - Validation](https://inertiajs.com/validation)
