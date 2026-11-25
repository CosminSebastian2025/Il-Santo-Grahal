Con `rsx!` e i signal puoi disegnare una finestra, ma un'app desktop vera deve decidere quando un componente viene ricreato, come condividere stato tra pannelli lontani, come eseguire lavoro asincrono senza bloccare il render e come scrivere file sul disco. Questa lezione approfondisce composizione, hook di lifecycle e integrazione nativa del renderer WebView.

## Obiettivi

- Controllare l'identità dei componenti con `key` e capire quando lo stato viene preservato.
- Usare `use_hook`, `use_effect`, `use_memo`, `use_resource` e il contesto globale con criterio.
- Derivare stato invece di scriverlo durante il render.
- Accedere a funzionalità native tramite `use_window`, asset e `document::eval`.

## Identità dei componenti e liste

Dioxus confronta il vecchio e il nuovo albero per decidere quali pezzi conservare. In una lista l'ordine non basta: serve una `key` stabile per ogni elemento, altrimenti un filtro sposta lo stato di una riga sull'altra e gli input di testo "saltano".

```rust
#[component]
fn Lista(righe: Vec<Riga>) -> Element {
    rsx! {
        ul {
            for riga in righe.iter() {
                li { key: "{riga.id}", RigaView { riga: riga.clone() } }
            }
        }
    }
}
```

`key` deve essere univoca e identitaria (id del record, non l'indice): con chiavi corrette Dioxus sposta i nodi esistenti invece di ricrearli, e i figli mantengono il proprio `Signal`. Se la lista è molto grande conviene passare `ReadOnlySignal` invece di clonare il `Vec` a ogni render.

| Situazione | Cosa succede senza `key` | Cosa succede con `key` |
| --- | --- | --- |
| aggiunta in testa a una lista | tutti gli stati figli slittano | nuovo nodo, stati degli altri intatti |
| filtro che nasconde righe | l'input di A eredita il testo di B | ogni stato resta con il suo record |
| ordinamento scambiato | focus e scroll cambiano riga | la vista scorre con l'elemento |

## Hook: memo, effetti e risorse

`use_memo` deriva un valore e lo ricalcola solo quando cambiano i signal letti nella chiusura; è il posto giusto per filtri, ordinamenti e formattazioni. `use_effect` esegue un effetto dopo il render e si riesegue quando read cambiano: serve per operazioni collaterali come salvare un file, non per calcolare valori.

```rust
let mut filtro = use_signal(String::new);
let archivio = use_signal(|| vec![Riga::new(1, "Vite", 40)]);
let visibili = use_memo(move || {
    let q = filtro().to_lowercase();
    archivio.read().iter().filter(|r| r.nome.to_lowercase().contains(&q)).cloned().collect::<Vec<_>>()
});

use_effect(move || {
    let snapshot = archivio.read().clone();
    std::fs::write("deposito.json", serde_json::to_string(&snapshot).unwrap()).ok();
});
```

`use_resource` gestisce un futuro con stato: restituisce `Resource<T>` che espone `read()`, `state()` (`Pending`, `Fulfilled`, `Rejected`) e le API di suspense. Va usato quando il dato arriva da fuori (lettura file, rete) e non per ricalcoli sincroni.

```rust
let file = use_resource(move || async move {
    tokio::fs::read_to_string("deposito.json").await.unwrap_or_default()
});

rsx! {
    match &*file.read_unchecked() {
        Some(testo) => rsx! { pre { "{testo}" } },
        None => rsx! { p { "Caricamento…" } },
    }
}
```

Per stato condiviso tra pannelli distanti, `use_context_provider` in un antenato e `use_context` nei discendenti evitano dieci props; il contesto è tipizzato e va fornito prima del primo render dei figli.

## Stato derivato, non stato scritto

L'antipattern più frequente è aggiornare uno state leggendone un altro durante il render. Il 0.7 aggiunge `Store`, un wrapper reattivo per stato annidato che segnala solo le parti modificate.

```rust
#[derive(Store, Clone, PartialEq)]
struct Archivio { righe: Vec<Riga> }

#[component]
fn Pannello() -> Element {
    let mut archivio = use_context::<Signal<Archivio>>();
    rsx! {
        button {
            onclick: move |_| archivio.write().righe.push(Riga::new(9, "Bal", 1)),
            "Aggiungi"
        }
    }
}
```

La regola è che il render è una funzione pura dello stato: se qualcosa dipende da un signal, si esprime con `use_memo`, e le scritture avvengono in handler, effect o future.

## Integrazione nativa nel renderer WebView

Il renderer desktop gira nel WebView ma il codice Rust è nativo: `use_window()` espone l'handle della finestra per titolo, dimensione e chiusura programmata, `asset!()` risolve percorsi di file inclusi nel bundle e `document::eval` permette di eseguire JavaScript quando serve una API browser che Dioxus non incapsula.

```rust
#[component]
fn Finestra() -> Element {
    let finestra = use_window();
    rsx! {
        img { src: asset!("/assets/logo.png") }
        button {
            onclick: move |_| {
                let mut w = finestra;
                w.set_title("Deposito — modificato");
            },
            "Rinomina finestra"
        }
    }
}
```

Le API native (dialoghi file, tray icon) vivono nel progetto Dioxus SDK come dipendenze separate; per il filesystem basta `std::fs` o `tokio::fs`, perché non esiste un sandbox browser da attraversare.

## Errori comuni

- **Indici come `key`**: con liste filtrate o ordinate lo stato si sposta; usa l'id del dato.
- **Uso di `use_effect` come memo**: l'effetto scrive state che il render legge, con rischio di loop; se vuoi solo un valore derivato usa `use_memo`.
- **Leggere un `Signal` e tenerlo in mano durante una scrittura**: `let r = s.read(); s.set(...)` va in panic per borrow non rientrante; copia il valore o chiudi il guard.
- **`use_resource` su un valore sincrono**: aggiunge stati di loading fittizi e complessità; per calcoli puri usa `use_memo`.
- **Dimenticare il prelude**: `rsx!` e `use_signal` vivono in `dioxus::prelude::*`.
- **Bloccare il runtime con `std::thread::sleep`**: congela il render; usa future e `spawn`.

## In sintesi

La composizione di un'app Dioxus ruota intorno all'identità: `key` stabile per le liste, contesto tipizzato per lo stato condiviso e `Store` per gli alberi mutabili. Il render resta puro, i derivati vanno in `use_memo`, gli effetti sono per il mondo esterno e `use_resource` per i dati asincroni. Sul desktop il codice Rust è nativo, quindi il filesystem è disponibile e il WebView serve solo a disegnare.

## Fonti

- [Dioxus — Component Lifecycle](https://dioxuslabs.com/learn/0.7/essentials/advanced/lifecycle)
- [Dioxus — Anti-patterns](https://dioxuslabs.com/learn/0.7/guides/tips/antipatterns)
- [Dioxus — RSX](https://dioxuslabs.com/learn/0.7/essentials/ui/rsx)
- [Dioxus — Desktop platform guide](https://dioxuslabs.com/learn/0.7/guides/platforms/desktop)
