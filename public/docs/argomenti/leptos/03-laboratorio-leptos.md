In questo laboratorio costruisci `note-leptos`, un'applicazione SSR con `cargo-leptos` e Axum: elenco di note con dettaglio, una funzione server per la creazione e una build di produzione con WASM ottimizzato. Il focus è sui punti in cui Rust e il web si incontrano: feature `ssr`/`hydrate`, parametri, errori di rete e peso del `.wasm` da verificare con l'header `Content-Encoding`.

## Obiettivi

- Creare un progetto con il template `start-axum` e lanciare `cargo leptos watch`.
- Implementare rotte, un `Resource` con `<Suspense>` e una funzione `#[server]` protetta da validazione.
- Leggere parametri di percorso in modo tipizzato e restituire un errore 404 coerente.
- Misurare il `.wasm` di release, confrontarlo con la build di debug e servire gzip o brotli.
- Scrivere un test per la logica di dominio senza dipendere dal browser.

## Avvio del progetto

```bash
cargo install --locked cargo-leptos
cargo leptos new --git https://github.com/leptos-rs/start-axum
cd start-axum
cargo leptos watch        # http://127.0.0.1:3000
cargo leptos build --release
```

`cargo-leptos` compila in parallelo server e `.wasm`, gestisce CSS e file statici e in `watch` ricompila su salvataggio. La configurazione sta in `[package.metadata.leptos]`: `site-root`, `site-pkg-dir`, `output-name`, `lib-features`. In `src` convivono `app.rs` (componente `App`), `main.rs` (server Axum) e `lib.rs` (modulo esposto all'hydrate).

```toml
[package.metadata.leptos]
output-name = "note-leptos"
site-root = "target/site"
site-pkg-dir = "pkg"
style-file = "style/main.scss"
assets-dir = "public"
site-addr = "127.0.0.1:3000"
lib-features = ["hydrate"]
lib-profile-release = "wasm-release"
```

## Rotte, risorsa e funzione server

Nel componente `App` stanno le rotte; nel dettaglio il parametro è validato come `u32` prima della risorsa, così un id non numerico non genera una chiamata inutile.

```rust
use leptos::prelude::*;
use leptos_router::{components::{Route, Router, Routes}, path};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct Nota {
    pub id: u32,
    pub titolo: String,
}

#[server(ElencoNote, "/api")]
pub async fn elenco_note() -> Result<Vec<Nota>, ServerFnError> {
    // in produzione: pool sqlx o drizzle letto da environment
    Ok(vec![
        Nota { id: 1, titolo: "Ripresa contro idratazione".into() },
        Nota { id: 2, titolo: "WASM e dimensioni".into() },
    ])
}

#[component]
fn Elenco() -> impl IntoView {
    let note = Resource::new(|| (), |_| async { elenco_note().await });
    view! {
        <Suspense fallback=|| view! { <p>"carico..."</p> }>
            {move || note.get().map(|res| match res {
                Ok(lista) => view! {
                    <ul>{lista.into_iter().map(|n| view! {
                        <li><a href=format!("/note/{}", n.id)>{n.titolo}</a></li>
                    }).collect_view()}</ul>
                }.into_any(),
                Err(e) => view! { <p class="errore">{e.to_string()}</p> }.into_any(),
            })}
        </Suspense>
    }
}

#[component]
pub fn App() -> impl IntoView {
    view! {
        <Router>
            <nav><a href="/">"note"</a></nav>
            <Routes fallback=|| "Pagina non trovata.">
                <Route path=path!("/") view=Elenco />
                <Route path=path!("/note/:id") view=Dettaglio />
            </Routes>
        </Router>
    }
}
```

| Problema | Sintomo | Correzione |
| --- | --- | --- |
| id non numerico | la pagina resta sul fallback | valida il parametro con un messaggio esplicito |
| errore di rete | il `match` mostra `Err` | evita `unwrap` sul `Result` della chiamata |
| dato mancante | risorsa con `Ok(None)` | usa `Result<Option<Nota>, _>` per separare assenza e errore |

## Hydration, errori e test

Nel client `Effect` non gira durante l'hydrate, quindi un `localStorage` letto in un effetto arriva dopo il render e la UI appare diversa per un istante: se il valore deve stare nell'HTML iniziale, leggilo con una funzione `#[server]` che accede ai cookie. Per gli errori non gestiti c'è `<ErrorBoundary>`, che cattura l'esito di una vista figlia e mostra un fallback al posto del panic.

```rust
#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn nota_serializza_in_json() {
        let n = Nota { id: 7, titolo: "ciao".into() };
        let json = serde_json::to_string(&n).unwrap();
        assert!(json.contains("\"id\":7"));
    }
}
```

La logica pura, come la validazione di un titolo, va in un modulo `domain` fuori dalle funzioni `#[server]`: `cargo test` la verifica sul target nativo in pochi millisecondi, senza wasm-bindgen. Le funzioni `#[server]` non si testano in unit test diretti, perché richiedono il contesto della richiesta.

## Misura del WASM

```bash
cargo leptos build --release
gzip -9 -c target/site/pkg/note-leptos.wasm | wc -c
curl -sI http://127.0.0.1:3000/pkg/note-leptos.wasm | grep -i "content-encoding"
```

| Passo | Cosa fa | Valore atteso |
| --- | --- | --- |
| build debug | nessuna ottimizzazione | molto più grande del release |
| `[profile.wasm-release]` | `opt-level = "z"`, `lto`, `codegen-units = 1` | binario molto più piccolo |
| gzip | compressione statica | metà o meno del file |
| brotli | meglio di gzip | meno byte |
| `wasm-opt -Oz` | ottimizzazione binaria | da integrare nella pipeline |

Verifica l'header `Content-Encoding: gzip` o `br`: un `.wasm` non compresso è una causa frequente di lentezza apparente.

## Esercizi

1. Aggiungi la rotta `/note/:id/edit` con `<ActionForm>` e una funzione `#[server]` che aggiorna la nota.
2. Fai decidere al server il tema leggendo un cookie in una funzione `#[server]`, senza `Effect`.
3. Introduci 500 ms di ritardo nella funzione server e confronta `<Suspense>` e `<Transition>`.

<details>
<summary>Soluzione</summary>

1. La funzione server valida id e lunghezza del titolo; `<ActionForm>` invia il POST e, con `use_action`, la pagina si aggiorna senza ricaricare.

2. La funzione server legge il cookie dal contesto della richiesta e restituisce il tema: il valore arriva nel payload della risorsa e il primo render è già corretto.

3. Con `<Suspense>` il fallback copre lo schermo a ogni cambio di parametro; con `<Transition>` il contenuto precedente resta visibile fino al nuovo dato.

</details>

## Errori comuni

- **Lanciare `cargo run` invece di `cargo leptos`**: il `.wasm` non viene costruito e l'hydrate fallisce.
- **Selezionare `csr` insieme a `ssr`**: le feature vanno attivate per target tramite il manifest, non a mano nel `Cargo.toml`.
- **Leggere `localStorage` durante il render**: il server non lo ha, e il valore diverge dall'HTML generato, causando errori di idratazione.
- **Testare le funzioni `#[server]` con `cargo test` nel target wasm**: richiedono il contesto della richiesta; isola la logica pura in un modulo separato.
- **Servire il `.wasm` senza compressione**: Axum non comprime i file statici di default.

## In sintesi

Il percorso ha coperto `start-axum`, rotte, `<Suspense>`, `#[server]` e misura del `.wasm`: ogni valore che passa la rete è tipizzato, e il costo principale resta la dimensione del binario da contenere con compressione e profili di build.

## Fonti

- [Leptos Book - cargo-leptos](https://book.leptos.dev/ssr/21_cargo_leptos.html)
- [Leptos Book - Hydration Bugs](https://book.leptos.dev/ssr/24_hydration_bugs.html)
- [Leptos Book - Optimizing WASM Binary Size](https://book.leptos.dev/deployment/binary_size.html)
- [Leptos Book - ActionForm](https://book.leptos.dev/progressive_enhancement/action_form.html)
