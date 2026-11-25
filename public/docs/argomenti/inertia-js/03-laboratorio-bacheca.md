In questo laboratorio estendi la bacheca Inertia con una pagina progetti paginata e con debounce del filtro, un form di creazione con upload PDF e anteprima, un'eliminazione con conferma in modale e feedback flash, e una suite di test Laravel che verifica sia il protocollo Inertia sia gli endpoint. Alla fine avrai un flusso completo con una sola regola di validazione scritta, test che girano con `php artisan test` e un payload misurato prima e dopo le visite parziali. Presuppone Laravel 11+, PHP 8.3, Node 22 e `@inertiajs/react` 3.x.

## Obiettivi

- Costruire una tabella con filtro debounced e paginazione senza perdere la posizione di scroll.
- Implementare un form con upload, `forceFormData`, progresso e gestione degli errori del server.
- Eliminare un elemento con modale e conferma, controllando il tipo di risposta.
- Testare pagine Inertia con `AssertableInertia` e gli endpoint con test HTTP di Laravel.
- Misurare il payload delle visite e ridurlo con `only` e props lazy.

## Filtro, paginazione e payload

Il controller filtra, ordina e pagina sul database; il client non riceve mai la collezione intera. Il filtro parte da un input controllato con debounce di 300 ms: ogni carattere non deve produrre una visita, solo la pausa di digitazione.

```php
// app/Http/Controllers/ProgettoController.php
public function index(Request $request): Response
{
    $validati = $request->validate([
        'q' => ['nullable', 'string', 'max:80'],
        'ordina' => ['nullable', 'in:recenti,budget,nome'],
    ]);

    return Inertia::render('Progetti/Index', [
        'progetti' => Progetto::query()
            ->when($validati['q'] ?? null, fn ($q, $testo) => $q->where('nome', 'like', "%{$testo}%"))
            ->orderBy(match ($validati['ordina'] ?? 'recenti') {
                'budget' => 'budget',
                'nome' => 'nome',
                default => 'created_at',
            }, 'desc')
            ->withCount('attivita')
            ->paginate(15)
            ->withQueryString(),
        'filtri' => ['q' => $validati['q'] ?? '', 'ordina' => $validati['ordina'] ?? 'recenti'],
        'statistiche' => Inertia::lazy(fn () => Progetto::selectRaw('sum(budget) as totale, count(*) as numero')->first()),
    ]);
}
```

`withQueryString()` conserva `q` e `ordina` nei link di paginazione: senza, il passaggio a pagina 2 perde il filtro.

```tsx
// resources/js/Pages/Progetti/Index.tsx
import { useEffect, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";

interface Link4 { url: string | null; label: string; active: boolean }

export default function Index({ progetti, filtri }: { progetti: { data: any[]; links: Link4[] }; filtri: { q: string; ordina: string } }) {
  const [q, setQ] = useState(filtri.q);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (q === filtri.q) return;               // nessuna visita se il testo non cambia davvero
    timer.current = setTimeout(() => {
      router.get("/progetti", { q, ordina: filtri.ordina }, {
        only: ["progetti"],
        preserveState: true,
        preserveScroll: true,
        replace: true,
      });
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q, filtri.q, filtri.ordina]);

  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca progetto…" />
      <table>
        <tbody>
          {progetti.data.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/progetti/${p.id}`}>{p.nome}</Link></td>
              <td>{p.budget}</td>
              <td>{p.attivita_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <nav aria-label="Paginazione">
        {progetti.links.map((l, i) => (
          <Link key={i} href={l.url ?? ""} preserveScroll preserveState as={l.url ? "a" : "span"}
            className={l.active ? "attivo" : ""}>
            <span dangerouslySetInnerHTML={{ __html: l.label }} />
          </Link>
        ))}
      </nav>
    </>
  );
}
```

La `only: ["progetti"]` evita di ricalcolare `statistiche` a ogni tasto: prima del debounce ogni visita caricherebbe anche l'aggregato `sum(budget)`, che su 50.000 righe costa decine di millisecondi. Per navigare usando la sola props `progetti`, la pagina deve tollerare che `statistiche` sia quella della visita precedente; è esattamente il contratto delle visite parziali.

## Creazione con upload ed eliminazione

Il form riusa `useForm` già visto e aggiunge la modale di eliminazione, che deve chiamare `router.delete` e leggere la risposta per distinguere un redirect (successo) da una risposta con errori.

```tsx
// resources/js/Pages/Progetti/Dettaglio.tsx (estratto)
import { useForm, router } from "@inertiajs/react";
import { useState } from "react";

export function BarraAzioni({ progetto, puoModificare }: { progetto: { id: number; nome: string }; puoModificare: boolean }) {
  const [aperta, setAperta] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const form = useForm({ nome: progetto.nome });

  function salva(e: React.FormEvent) {
    e.preventDefault();
    form.patch(`/progetti/${progetto.id}`, { preserveScroll: true });
  }

  function elimina() {
    setEliminando(true);
    router.delete(`/progetti/${progetto.id}`, {
      preserveScroll: true,
      onFinish: () => { setEliminando(false); setAperta(false); },
      onError: (errori) => console.warn("Eliminazione rifiutata", errori),
    });
  }

  if (!puoModificare) return null; // la stessa regola è applicata dal controller
  return (
    <>
      <form onSubmit={salva}>
        <input
          value={form.data.nome}
          onChange={(e) => form.setData("nome", e.target.value)}
          disabled={form.processing}
        />
        {form.errors.nome && <p role="alert">{form.errors.nome}</p>}
      </form>
      <button onClick={() => setAperta(true)}>Elimina</button>
      {aperta && (
        <div role="dialog" aria-modal="true">
          <p>Eliminare «{progetto.nome}»? L'operazione non è reversibile.</p>
          <button onClick={elimina} disabled={eliminando}>{eliminando ? "Elimino…" : "Conferma"}</button>
          <button onClick={() => setAperta(false)}>Annulla</button>
        </div>
      )}
    </>
  );
}
```

Nel controller l'`authorize` deve rifiutare la richiesta anche se il client nasconde il bottone: le props sono un'indicazione per l'interfaccia, non un controllo di sicurezza.

```php
public function destroy(Progetto $progetto): RedirectResponse
{
    $this->authorize('delete', $progetto);
    $progetto->delete();
    return redirect('/progetti')->with('successo', 'Progetto eliminato');
}
```

## Upload, progresso e anteprima

L'upload merita un passaggio separato, perché è il caso in cui le scelte di default di Inertia non bastano. Con `forceFormData: true` il payload diventa un `FormData` multipart; senza, un oggetto con un `File` viene serializzato in JSON e il server riceve una stringa vuota. Su Laravel la validazione di un `UploadedFile` con `mimes:pdf` e `max:4096` copre tipo e dimensione, ma il controllo del contenuto reale (MIME sniffing, firma `%PDF`) va aggiunto se il file viene poi servito al browser.

Per l'anteprima senza caricare il file si usa `URL.createObjectURL` e si revoca l'URL quando il file cambia o il componente viene smontato, altrimenti il blob resta in memoria per tutta la sessione. `form.progress` è popolato solo per i payload multipart e fornisce `percentage` più `total` e `loaded`: negli altri casi vale `null` e la barra va semplicemente nascosta.

| Caso | Impostazione | Rischio se manca |
| --- | --- | --- |
| file singolo | `forceFormData: true` | il file non arriva |
| file grandi (> 10 MB) | limite PHP `upload_max_filesize` e `post_max_size` | 413 senza messaggio utile |
| più file | campo array, `multiple` sull'input | il server valida solo il primo |
| sostituzione file con `patch` | `UploadedFile` nel request come per la creazione | vecchio file orfano su disco se non si cancella l'originale |

La misura di `form.processing` va usata anche sul bottone, non solo per il testo: senza `disabled` un doppio click parte con due richieste e crea due progetti, perché il primo non ha ancora completato il round-trip.

## Test e misura

`AssertableInertia` verifica che una rotta risponda con il componente e le props attese, incluse le props lazy richieste esplicitamente. I test HTTP normali verificano validazione e autorizzazione.

```php
// tests/Feature/ProgettiTest.php
use Inertia\Testing\AssertableInertia as Assert;

public function test_index_rende_il_componente_con_i_progetti_paginati(): void
{
    Progetto::factory()->count(3)->create();

    $this->get('/progetti?ordina=budget')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Progetti/Index')
            ->has('progetti.data', 3)
            ->where('filtri.ordina', 'budget')
            ->missing('statistiche')            // lazy: non calcolata senza richiesta
            ->reloadOnly('statistiche', fn (Assert $r) => $r
                ->has('statistiche')
                ->missing('progetti')),         // la visita parziale non rimanda tutto
}

public function test_store_valida_e_redirige(): void
{
    $this->actingAs(User::factory()->create())
        ->post('/progetti', ['nome' => '', 'budget' => -5])
        ->assertSessionHasErrors(['nome', 'budget']);
}
```

Sul lato client i test con Vitest e Inertia mockato verificano una sola cosa utile: che il debounce produca una visita dopo 300 ms e non una per carattere. Per misurare il payload, apri le DevTools di rete, filtra le richieste con header `X-Inertia` e confronta la dimensione della risposta prima e dopo aver aggiunto `only`: con un aggregato lento rimosso dall'insieme delle props il tempo di risposta scende spesso del 40-70%, e la dimensione del JSON cala in proporzione ai dati dell'aggregato, non della tabella.

La checklist finale: digitare velocemente nel filtro e verificare che la cronologia non si riempia di voci (`replace`); premere Invio per salvare due volte e controllare che la seconda richiesta non parta (`form.processing`); eliminare un progetto di cui non si è autore e verificare il 403 con messaggio; deployare una nuova build a browser aperto e verificare il reload automatico per il 409 di versione.

## Esercizi

1. Aggiungi `prefetch="mount"` sui link del menu e misura con DevTools quante richieste avvengono al passaggio del mouse.
2. Sposta il filtro in un componente con `useForm` e invia con `get`, confrontando le opzioni con `router.get`.
3. Aggiungi una prop `Inertia::optional` per i commenti del progetto, caricata solo su richiesta con un pulsante.
4. Scrivi un test che verifichi il 403 su `destroy` per un collaboratore senza permesso.
5. Introduci un criterio di errore globale: ogni `onError` mostra un toast e non cambia pagina.

## Errori comuni

- **Navigare a ogni carattere del filtro**: senza debounce e senza il confronto `q !== filtri.q` si generano decine di visite, che Inertia annulla in parte ma che occupano comunque la connessione.
- **Perdere il filtro nella paginazione**: senza `withQueryString()` i link tornano a `/progetti?page=2` e il risultato cambia appena cambi pagina.
- **Filtrare solo nel client su una collezione già caricata**: funziona in demo, crolla a 10.000 righe; il filtro va sul database.
- **Testare la UI solo con E2E**: `AssertableInertia` copre componenti e props in millisecondi, senza browser; usa gli E2E per i flussi e i test Inertia per i contratti.
- **Considerare `puoModificare` una protezione**: il bottone nascosto non c'è, ma l'endpoint resta raggiungibile con curl; l'autorizzazione va nel controller.

## In sintesi

Il laboratorio ha unito filtro server-side, debounce, paginazione con memoria del filtro, form con upload, eliminazione con modale e test del protocollo. Le visite parziali riducono il costo delle navigazioni ripetute, e `AssertableInertia` rende verificabile il contratto fra controller e componente. La misura del payload chiude il cerchio: ogni nuova prop va giustificata, non solo aggiunta.

## Fonti

- [Inertia.js - Partial Reloads](https://inertiajs.com/partial-reloads)
- [Inertia.js - Forms](https://inertiajs.com/forms)
- [Inertia.js - Testing](https://inertiajs.com/testing)
- [Laravel - Validation](https://laravel.com/docs/validation)
