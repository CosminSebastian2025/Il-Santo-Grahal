Un'applicazione Leptos reale combina tre pezzi: rotte tipizzate, dati asincroni letti da risorse reattive e funzioni eseguite sul server richiamabili dal browser come normali `async fn`. In questa lezione costruisci la struttura di un elenco con dettaglio usando `leptos_router`, `Resource` e l'attributo `#[server]`, con il vincolo che ogni dato che attraversa il confine deve implementare `Serialize` e `Deserialize`.

## Obiettivi

- Definire rotte con `<Router>`, `<Routes>` e `path!()`, leggere parametri con `use_params`.
- Caricare dati con `Resource::new` e renderli con `<Suspense>`.
- Esporre endpoint con `#[server]` e chiamarli da un `Action` o da un gestore.
- Scegliere tra CSR, SSR e modalità ibride in base al profilo di caricamento.

## Rotte tipizzate con leptos_router

`<Router>` va montato una sola volta e governa lo stato globale della navigazione; `<Routes>` decide dove disegnare la pagina corrente, e ciò che sta fuori resta visibile su ogni rotta. I parametri si dichiarano nel percorso con la sintassi di `path!`: `:id` per un segmento, `*any` per la coda. Tipicamente i parametri si estraggono con `<ParentRoute>` e una funzione che li converte in un tipo `Params` proprio, così un id non valido diventa un `Result` e non una stringa ambigua.

```rust
use leptos::prelude::*;
use leptos_router::{
    components::{Route, Router, Routes},
    path,
};

#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <nav><a href="/note">"note"</a></nav>
            <main>
                <Routes fallback=|| "Pagina non trovata.">
                    <Route path=path!("/") view=Home />
                    <Route path=path!("/note") view=Note />
                    <Route path=path!("/note/:id") view=Dettaglio />
                </Routes>
            </main>
        </Router>
    }
}
```

| Elemento | Ruolo | Nota |
| --- | --- | --- |
| `<Router>` | stato di navigazione | uno solo per applicazione |
| `<Routes fallback=...>` | punto di render | il fallback è obbligatorio per una UX sensata |
| `path!("/note/:id")` | rotta con parametro | verificata a compile time contro la sintassi |
| `use_params::<P>()` | lettura parametri | restituisce `Result<P, ParamsError>` |
| `<A href=...>` | link client-side | non ricarica il documento |

## Risorse e dati asincroni

`Resource::new` accetta due funzioni: la prima restituisce l'input osservato, la seconda produce un `Future`. Con SSR si usa `Resource`, che è serializzabile e quindi viene popolato durante il render del server; `LocalResource` è la variante per dati che non escono dal browser. La lettura restituisce `Option<T>`, che è `None` fino al primo completamento, e `<Suspense>` mostra il fallback finché la risorsa non è pronta.

```rust
use leptos::prelude::*;

#[component]
fn Dettaglio() -> impl IntoView {
    let params = leptos_router::hooks::use_params_map();
    let nota = Resource::new(
        move || params.read().get("id").unwrap_or_default(),
        |id| async move { carica_nota(id).await },
    );

    view! {
        <Suspense fallback=|| view! { <p>"caricamento..."</p> }>
            {move || nota.get().map(|r| match r {
                Ok(n) => view! { <h1>{n.titolo}</h1> }.into_any(),
                Err(e) => view! { <p>{format!("errore: {e}")}</p> }.into_any(),
            })}
        </Suspense>
    }
}
```

Una risorsa si può anche attendere come un `Future` con `.await`, utile quando serve il valore completo senza gestire `None`; `.read()` e `.with()` danno l'accesso sincrono. `<Transition>` è come `<Suspense>` ma mantiene visibile il contenuto precedente durante il ricaricamento, evitando il lampeggio del fallback a ogni cambio di parametro.

## Funzioni server e azioni

`#[server]` trasforma una funzione in un endpoint HTTP: nella build server genera un handler e nel client un client HTTP con la stessa firma. Argomenti e risultato devono essere serializzabili, ed è convenzione restituire `Result<T, ServerFnError>` per non mascherare gli errori come assenza di dati.

```rust
use leptos::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Nota {
    pub id: u32,
    pub titolo: String,
}

#[server]
pub async fn carica_nota(id: String) -> Result<Nota, ServerFnError> {
    let id: u32 = id.parse().map_err(|_| ServerFnError::new("id non valido"))?;
    // qui si accede al database, mai al DOM
    Ok(Nota { id, titolo: format!("Nota {id}") })
}

#[server]
pub async fn crea_nota(titolo: String) -> Result<u32, ServerFnError> {
    if titolo.trim().len() < 3 {
        return Err(ServerFnError::new("titolo troppo corto"));
    }
    Ok(42)
}
```

Il valore di ritorno arriva al client come JSON e la funzione è un'API pubblica: l'autorizzazione va dentro, non nella UI. `#[server(input = ...)]` cambia la codifica degli argomenti, e `<ActionForm>` invia i dati come un POST classico, funzionando anche con WASM disabilitato.

## Modalità di rendering

| Modalità | Feature | HTML iniziale | Quando |
| --- | --- | --- | --- |
| CSR | `csr` | vuoto, app montata da WASM | dashboard, giochi, app interne |
| SSR | `ssr` + `hydrate` | completo dal server | contenuti indicizzati, primo byte veloce |
| Islands | `ssr` con `<Island>` | statico, idratazione per isola | pagine in prevalenza statiche |
| Hybrid | route-specific | misto | marketing statico e area privata interattiva |

In SSR, `cargo-leptos` compila due volte, per il target server e per `wasm32-unknown-unknown`, e serve le parti con un adapter Actix o Axum. Le versioni dei crate devono coincidere nelle due build: un disallineamento tra `leptos_axum` e `leptos` produce errori di idratazione silenziosi.

## Errori comuni

- **Leggere una `Resource` come se fosse un segnale sincrono**: `nota.get()` restituisce `Option<Result<...>>`, quindi servono due livelli di gestione.
- **Mettere `#[server]` su una funzione `pub` nelle feature CSR**: senza la feature `ssr` nel server il codice viene stubbato e la chiamata restituisce un errore in sviluppo.
- **Usare `LocalResource` in SSR aspettandosi il dato nell'HTML**: non è serializzabile e non viaggia con il documento.
- **Montare `<Router>` dentro un componente che viene ricreato**: lo stato di navigazione si azzera a ogni cambio di layout.
- **Restituire tipi non `Deserialize`**: la build client fallisce con un errore generico sull'implementazione mancante.

## In sintesi

Leptos separa tre livelli che di solito si confondono: rotte dichiarative, dati reattivi con `Resource` e logica server tipizzata con `#[server]`. Il rendimento arriva dalla scelta di modalità: CSR per applicazioni interattive senza SEO, SSR per contenuti indicizzati, Islands per pagine quasi statiche. La prossima lezione mette tutto in un progetto con `cargo-leptos` e misura l'impatto sul binario WASM.

## Fonti

- [Leptos Book - Defining Routes](https://book.leptos.dev/router/16_routes.html)
- [Leptos Book - Loading Data with Resources](https://book.leptos.dev/async/10_resources.html)
- [Leptos Book - Server Functions](https://book.leptos.dev/server/25_server_functions.html)
- [Leptos Book - SSR Modes](https://book.leptos.dev/ssr/23_ssr_modes.html)
