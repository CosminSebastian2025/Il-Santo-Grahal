Leptos è un framework web scritto in Rust che compila i componenti in WebAssembly per il browser e, se vuoi, in codice nativo per il server. Il suo modello è a grana fine come quello di SolidJS: non esiste un virtual DOM da confrontare, ogni valore reattivo aggiorna direttamente i nodi del DOM che lo leggono. Questa lezione introduce il modello, la sintassi `view!` e le primitive reattive della versione 0.8, l'ultima stabile della serie.

## Obiettivi

- Montare un'applicazione Leptos in modalità CSR con Trunk e capire quali crate servono.
- Scrivere componenti con `#[component]` e la macro `view!`, usando attributi e gestori `on:`.
- Usare `signal`, `Memo` e `Effect` distinguendo chi legge e chi scrive.
- Evitare le closure inutili dove il compilatore può fare il lavoro al posto tuo.

## Un framework nativo che genera WASM

Un'applicazione Leptos in modalità client-only è un crate Rust compilato con `wasm32-unknown-unknown`. Il binario finale pesa decine di volte un bundle JavaScript equivalente, ma non contiene un interprete né un parser a runtime: il markup è costruito da chiamate DOM dirette. Leptos è la parte di rendering; il routing sta in `leptos_router`, la SSR e gli endpoint HTTP in `leptos_axum` o `leptos_actix`, e lo strumento di sviluppo `cargo-leptos` orchestra build, watcher e server.

| Crate | Ruolo | Features tipiche |
| --- | --- | --- |
| `leptos` | componenti, segnali, `view!` | `csr` oppure `ssr` e `hydrate` |
| `leptos_router` | rotte, `<A>`, parametri | stesso split CSR/SSR |
| `leptos_axum` / `leptos_actix` | integrazione server | `ssr` |
| `leptos_meta` | gestione di `<title>` e `<meta>` in SSR | `ssr` |
| `console_error_panic_hook` | panic leggibili in console | dipendenza solo per dev |

```toml
[package]
name = "contatore"
edition = "2021"

[dependencies]
leptos = { version = "0.8", features = ["csr"] }

[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
```

Il profilo con `opt-level = "z"`, `lto` e una sola codegen unit è quello raccomandato dal libro di Leptos; in un progetto `cargo-leptos` conviene dichiararlo come `[profile.wasm-release]` con `lib-profile-release = "wasm-release"`, così il server resta ottimizzato per la velocità. Il binario va sempre servito compresso: il WASM scende tipicamente sotto il 50% della dimensione originale.

## Componenti e macro view

Un componente è una funzione annotata con `#[component]` che riceve proprietà tipizzate e restituisce `impl IntoView`. La macro `view!` non fa parsing HTML a runtime: genera Rust che crea nodi, quindi errori di sintassi nel markup diventano errori di compilazione, e un attributo sbagliato non arriva mai al browser.

```rust
use leptos::prelude::*;

#[component]
fn Saluto(nome: String, #[prop(default = 3)] ripetizioni: u32) -> impl IntoView {
    view! {
        <section class="p-4">
            <h1 class="text-xl">{"Ciao, "}{nome}</h1>
            {(0..ripetizioni)
                .map(|i| view! { <p>{i}</p> })
                .collect_view()}
            <button on:click=move |_| web_sys::window().unwrap().alert_with_message("ok").unwrap()>
                "avvisa"
            </button>
        </section>
    }
}
```

Le graffe accettano espressioni Rust: `{move || testo.get()}` è un valore reattivo, `{(0..5).map(...)}` una collezione di viste convertita da `.collect_view()`. Gli attributi dinamici usano `class:attiva=move || ...` o `class=move || if x.get() { "a" } else { "b" }`.

| Sintassi | Significato | Esempio |
| --- | --- | --- |
| `{"testo"}` | nodo di testo statico | `{"errore"}` |
| `{move \|\| sig.get()}` | nodo di testo reattivo | `{move \|\| nome.get()}` |
| `on:click` | listener DOM | `on:click=move \|_\| set(+1)` |
| `class:x=move \|\| bool` | classe condizionale | `class:attiva=move \|\| on.get()` |
| `prop:value` | proprietà del nodo | `prop:value=move \|\| sig.get()` |

## Segnali, memo ed effetti

`signal` restituisce una coppia `(ReadSignal, WriteSignal)`. Il lettore è `Copy`, quindi può essere passato in più closure senza `clone`; lo scrittore serve dove bisogna modificare il valore. Una closure che legge un segnale e viene passata a `view!` diventa essa stessa un nodo reattivo, e Leptos la riesegue solo quando uno dei segnali tracciati cambia.

```rust
use leptos::prelude::*;

#[component]
fn Contatore() -> impl IntoView {
    let (conteggio, set_conteggio) = signal(0);
    let doppio = Memo::new(move |_| conteggio.get() * 2);

    Effect::new(move |_| {
        // gira nel browser dopo il mount, e a ogni cambio di conteggio
        if conteggio.get() > 10 {
            leptos::logging::log!("superata la soglia");
        }
    });

    view! {
        <p>{move || conteggio.get()} " / " {move || doppio.get()}</p>
        <button on:click=move |_| set_conteggio.update(|n| *n += 1)>"più"</button>
    }
}
```

`Memo` è un segnale derivato con cache: chi lo legge si registra sul memo, non sui segnali che esso usa, quindi più lettori condividono un solo calcolo. `Effect::new` legge i segnali nel corpo e li registra come dipendenze, con esecuzione sul tick successivo a quello del render; per impostazione predefinita non gira sul server, quindi può usare API del browser, mentre `Effect::new_isomorphic` abilita l'esecuzione anche lato SSR. `Effect::watch` osserva valori specifici evitando dipendenze non volute, e le varianti `_local` e `_isolated` scelgono se l'effetto partecipa alla serializzazione e alla condivisione tra richieste.

## Il costo del tipo e l'operatore `.into()`

Ogni `view!` produce un tipo diverso, e i rami di un `if` o di un `match` restituiscono tipi incompatibili. Si risolve con `.into_any()` verso `AnyView`, che ha un piccolo costo a runtime, oppure usando `<Show>` e `<For>`, che evitano il problema alla radice.

## Errori comuni

- **Dimenticare `move` nelle closure dei gestori**: senza `move` la closure cattura per riferimento e il compilatore rifiuta il listener, che deve essere `'static`.
- **Chiamare `.get()` fuori da una closure reattiva**: leggere il segnale una volta ottiene il valore attuale e lo congela; il testo non si aggiornerà mai.
- **Creare un segnale dentro `view!`**: a ogni rerender del blocco si crea uno stato nuovo e il valore precedente si perde.
- **Abusare di `Effect` per calcolare valori derivati**: al posto suo usa `Memo` o una closure, che non comportano esecuzioni a cascata.
- **Usare `csr` e `ssr` insieme**: le feature sono mutuamente esclusive e vanno selezionate per target, altrimenti la build fallisce o idrata male.

## In sintesi

Leptos porta la reattività a grana fine di Solid nel mondo Rust: componenti tipizzati, `view!` che compila in codice DOM, segnali `Copy` e memo condivisi. Il prezzo è il peso del WASM, il beneficio è un controllo statico che JavaScript non offre. La prossima lezione aggiunge rotte, dati asincroni e funzioni server.

## Fonti

- [Leptos Book - Introduction](https://book.leptos.dev/01_introduction.html)
- [Leptos Book - Components](https://book.leptos.dev/view/03_components.html)
- [Leptos Book - Reactivity](https://book.leptos.dev/reactivity/index.html)
- [leptos - docs.rs](https://docs.rs/leptos/latest/leptos/)
