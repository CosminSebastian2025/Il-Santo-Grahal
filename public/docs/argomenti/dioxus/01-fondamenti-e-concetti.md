Dioxus è un framework Rust per costruire interfacce con una sola codebase su web, desktop e mobile. La versione stabile attuale è la 0.7, arrivata a settembre 2025 e oggi distribuita come patch release della serie 0.7: dal 0.7 il framework usa il comando `dx` come strumento unico di build e ha reso i `Signal` il centro del modello reattivo. In questa lezione impari come si compone un'app desktop, come si aggiorna lo stato e come `dx` trasforma il tutto in un binario nativo.

## Obiettivi

- Descrivere l'architettura a componenti di Dioxus e il ruolo di `rsx!`.
- Usare `Signal`, `Memo` e gli hook di base per gestire stato ed effetti.
- Differenziare i tre renderer ufficiali: web, webview e native.
- Avviare, servire e impacchettare un'app desktop con la CLI `dx`.

## Componenti, RSX e stato

Un componente è una funzione Rust che prende proprietà e restituisce `Element`. `#[component]` trasforma gli argomenti in una struct `Props` con `Clone + PartialEq`, mentre `rsx!` converte la sintassi simile a HTML in un albero di template compilato.

```rust
use dioxus::prelude::*;

fn main() {
    dioxus::launch(App);
}

#[component]
fn App() -> Element {
    let mut contatore = use_signal(|| 0);

    rsx! {
        h1 { "Clic appoggiati: {contatore}" }
        button { onclick: move |_| contatore += 1, "Aggiungi" }
        Fascia { valore: contatore() }
    }
}

#[component]
fn Fascia(valore: i32) -> Element {
    rsx! { p { "Ultimo valore: {valore}" } }
}
```

Due dettagli contano più di tutto il resto: `launch` sceglie il runtime in base alla feature Cargo attiva (`desktop`, `web`, `mobile`), e le props sono confrontate per decidere se rieseguire un componente.

| Concetto | API | Nota |
| --- | --- | --- |
| stato locale | `use_signal(|| valore)` | copiabile anche tra callback `move` |
| lettura | `contatore()` o `contatore.read()` | `()` richiede `Clone` |
| scrittura | `contatore.set(v)`, `contatore += 1`, `*contatore.write() = v` | notifica i subscriber |
| derivato | `use_memo(move || ...)` | ricalcola solo se le dipendenze cambiano |
| effetto | `use_effect(move || ...)` | gira dopo il render, sul runtime UI |
| futuro | `use_resource(move || async move { ... })` | ritorna `Resource<T>`, con stati loading/error |
| contesto | `use_context::<T>()` | stato globale di sottoalbero, senza prop drilling |

La reattività è "a grana fine": un componente si iscrive solo ai signal che legge durante il render, quindi scrivere un signal non osservato non causa re-render. `use_effect` e `use_memo` creano scope reattivi fuori dal ciclo di render, e le scritture multiple nello stesso evento vengono raggruppate.

## I renderer: web, webview e native

Dioxus non disegna direttamente: produce un albero di elementi HTML-like e lo passa a un renderer. Il renderer desktop classico usa il WebView di sistema tramite `wry`, quindi su Windows serve WebView2 e su Linux `libwebkit2gtk-4.1` e `xdotool`. Il risultato pesa poco (spesso sotto i 5 MB) ma non ha accesso alle API browser, mentre il filesystem funziona perché il codice Rust gira nativamente.

La novità del 0.7 è Dioxus Native, un renderer basato su WGPU che non usa il WebView: interpreta HTML e CSS con il motore Blitz (Taffy per il layout, Stylo per i CSS, Vello per il disegno). È promettente ma ancora in sviluppo, con copertura CSS parziale.

| Renderer | Crate/feature | Vantaggi | Limiti |
| --- | --- | --- | --- |
| Web | `dioxus/web` | DOM reale, ecosistema browser | API native assenti |
| Webview (desktop/mobile) | `dioxus/desktop`, `dioxus/mobile` | binario piccolo, API native | dipendenze di sistema (WebView2/WebKitGTK) |
| Native (WGPU) | `dioxus/native` | nessun WebView, controllo rendering | CSS incompleto, API in evoluzione |

Nella 0.7 il vecchio crate `dioxus-desktop` è confluito in `dioxus`.

## Toolchain: dx serve e dx bundle

La CLI si installa con lo script ufficiale, senza `cargo binstall`:

```bash
curl -sSL https://dioxus.dev/install.sh | bash
dx new deposito   # scegli template e piattaforma nei prompt
cd deposito
dx serve --desktop                    # hot reload + hot patching Subsecond
dx bundle --desktop --release         # installer nativo
```

`dx serve` rileva i file, ricompila in modo incrementale e applica il hot patching del codice Rust tramite Subsecond. `dx bundle` crea i pacchetti in `target/dx/<app>/bundle/`, in formati per piattaforma (`.msi`/`.exe`, `.app`/`.dmg`, `.deb`/`.rpm`), scelti con `--package-types`; identificativo, publisher e icona stanno in `Dioxus.toml`.

```toml
# Cargo.toml generato da dx new
[dependencies]
dioxus = { version = "0.7" }
[features]
default = ["web"]
desktop = ["dioxus/desktop"]}
```

Il bundle desktop si compila solo per la piattaforma host: servono tre job di CI.

## Errori comuni

- **Confondere `dioxus-desktop` con `dioxus`**: dalla 0.7 la feature è `desktop` sul crate `dioxus`.
- **Dimenticare `PartialEq` sulle props**: un campo con `Vec` o una struct senza `PartialEq` fa fallire `#[component]`.
- **Scrivere state nel corpo del componente**: `contatore += 1` fuori da un handler produce un loop di re-render; usa `use_effect` o `use_memo`.
- **Tenere un `.read()` attivo mentre si chiama `set`**: il lock di `Signal` non è rientrante e il programma va in panic.
- **Aspettarsi che una variabile locale si aggiorni**: solo il signal notifica i cambi, una copia letta prima resta ferma.
- **Usare `std::thread` per toccare la UI**: il runtime usa `spawn` e `use_future`; i thread nativi devono tornare tramite canali.

## In sintesi

Dioxus compila Rust in un albero di elementi dichiarato con `rsx!`, e la reattività a segnali decide cosa ridisegnare. La stessa app gira sul web con `dioxus/web`, sul desktop con il WebView di sistema e sullo stesso desktop senza browser con il nuovo renderer WGPU. `dx serve` è il ciclo di sviluppo, `dx bundle` produce l'installer; capire quale feature Cargo è attiva spiega gran parte dei comportamenti sorprendenti.

## Fonti

- [Dioxus — Getting Started (0.7)](https://dioxuslabs.com/learn/0.7/getting_started/)
- [Dioxus 0.7 Release Blog](https://dioxuslabs.com/blog/release-070/)
- [Dioxus — Reactive Signals](https://dioxuslabs.com/learn/0.7/essentials/basics/signals)
- [Dioxus su docs.rs](https://docs.rs/dioxus)
