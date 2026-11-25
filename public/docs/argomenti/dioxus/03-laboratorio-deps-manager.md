In questo laboratorio costruiamo `Deps Manager`, un'app desktop Dioxus 0.7 che ispeziona un file `Cargo.lock`: mostra le dipendenze in tabella, filtra per nome, rileva i duplicati di versione e salva un report JSON. Esercita componenti, signal, `use_resource` con I/O reale e impacchettamento con `dx bundle`.

## Obiettivi

- Creare il progetto con `dx new`, `dx serve --desktop` e struttura a moduli.
- Leggere un file nativo con `use_resource` e gestire gli stati di caricamento ed errore.
- Costruire una tabella filtrabile con `use_memo` e `key` stabili.
- Scrivere un report con `spawn`, senza bloccare il render.
- Impacchettare il binario per la piattaforma host.

## Passo 1: progetto e moduli

```bash
curl -sSL https://dioxus.dev/install.sh | bash
dx self-update
dx new deps-manager
cd deps-manager
dx serve --desktop
```

Il template bare-bones produce `Cargo.toml`, `Dioxus.toml`, `assets/` e `src/main.rs`. `Cargo.lock` è TOML, quindi `toml` e `serde` sono le dipendenze naturali:

```toml
[dependencies]
dioxus = { version = "0.7" }
serde = { version = "1", features = ["derive"] }
toml = "0.8"

[features]
default = ["desktop"]
desktop = ["dioxus/desktop"]
```

Su Windows `dx serve --desktop` richiede WebView2 (presente con Edge aggiornato), su Linux `libwebkit2gtk-4.1-dev` e `libxdo-dev`. `dx doctor` segnala cosa manca prima ancora di compilare.

## Passo 2: leggere il lock file

Il modello legge una `Cargo.lock` e produce un `Vec<Dep>`; il caricamento va in `use_resource`, che permette di mostrare "caricamento", errore e risultato senza incastrare il render.

```rust
#[derive(Clone, PartialEq)]
struct Dep { name: String, version: String }

#[derive(Clone, PartialEq, Default)]
struct Lock { packages: Vec<Dep> }

impl Lock {
    fn parse(testo: &str) -> Lock {
        let doc: toml::Value = testo.parse().unwrap_or_default();
        let packages = doc.get("package").and_then(|p| p.as_array()).cloned().unwrap_or_default();
        Lock {
            packages: packages.iter().filter_map(|p| Some(Dep {
                name: p.get("name")?.as_str()?.to_string(),
                version: p.get("version")?.as_str()?.to_string(),
            })).collect(),
        }
    }
}

fn leggi_lock(percorso: PathBuf) -> Result<Lock, String> {
    std::fs::read_to_string(&percorso)
        .map(|t| Lock::parse(&t))
        .map_err(|e| format!("{}: {e}", percorso.display()))
}
```

`parse` è pura su stringa: si testa con `#[test]` su un frammento TOML, senza aprire finestre, e il 90% della logica resta indipendente da Dioxus.

## Passo 3: stato, filtro e tabella

Il componente radice possiede tre signal: il percorso caricato, il filtro testuale e la tabella derivata. `use_memo` ricalcola l'elenco visibile solo quando cambia il lock o la query.

```rust
#[component]
fn App() -> Element {
    let percorso = use_signal(|| PathBuf::from("Cargo.lock"));
    let mut filtro = use_signal(String::new);

    let lock = use_resource(move || {
        let p = percorso();
        async move { leggi_lock(p) }
    });

    let righe = use_memo(move || {
        let q = filtro().to_lowercase();
        match &*lock.read_unchecked() {
            Some(Ok(l)) => l.packages.iter()
                .filter(|d| d.name.to_lowercase().contains(&q))
                .cloned().collect::<Vec<_>>(),
            _ => Vec::new(),
        }
    });

    rsx! {
        header {
            input { value: "{filtro}", oninput: move |e| filtro.set(e.value()), placeholder: "filtra pacchetti" }
        }
        match &*lock.read_unchecked() {
            None => rsx! { p { "Lettura di Cargo.lock…" } },
            Some(Err(err)) => rsx! { p { class: "errore", "{err}" } },
            Some(Ok(l)) => rsx! {
                p { "{righe.read().len()} pacchetti" }
                table {
                    for d in righe.read().iter() {
                        tr { key: "{d.name}-{d.version}",
                            td { "{d.name}" }
                            td { "{d.version}" }
                        }
                    }
                }
            }
        }
    }
}
```

La `key` combina nome e versione perché una stessa crate può comparire più volte: è il caso che rompe le liste indicizzate. Il `match` sul `Resource` obbliga a gestire anche l'errore.

## Passo 4: report e duplicati

Il report conteggia le crate con più versioni e scrive un JSON accanto al lock file. La scrittura parte da un handler e non dal render, così il file system non rallenta il disegno.

```rust
fn duplicati(righe: &[Dep]) -> Vec<String> {
    let mut per_nome: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    for d in righe { *per_nome.entry(d.name.as_str()).or_default() += 1; }
    per_nome.into_iter().filter(|(_, n)| *n > 1).map(|(k, _)| k.to_string()).collect()
}

// dentro l'handler del bottone
let dati = lock.read_unchecked().clone();
spawn(async move {
    if let Some(Ok(l)) = dati {
        let report = serde_json::json!({
            "pacchetti": l.packages.len(),
            "duplicati": duplicati(&l.packages),
        });
        let _ = tokio::fs::write("report.json", report.to_string()).await;
    }
});
```

`spawn` esegue il futuro sul runtime nativo di Dioxus, quindi il task non blocca la UI; per file grandi meglio `tokio::fs` che `std::fs` dentro l'executor.

## Passo 5: verifica e bundle

| Verifica | Azione | Esito atteso |
| --- | --- | --- |
| avvio | `dx serve --desktop` | finestra con conteggio pacchetti del progetto |
| filtro | digita `serde` | lista ridotta, focus mantenuto |
| file mancante | avvia in una cartella senza `Cargo.lock` | messaggio d'errore, nessun panic |
| duplicati | usa un lock con due versioni di `syn` | nome in elenco duplicati |
| report | click su "Salva" | `report.json` creato con `pacchetti` |
| test | `cargo test` su `Lock::parse` e `duplicati` | verde senza GUI |

Per distribuire, `dx bundle --desktop --package-types msi` (o `deb`, `appimage`, `app` secondo l'host) produce i pacchetti in `target/dx/deps-manager/bundle/`. Identificativo, publisher e icona vanno in `Dioxus.toml`:

```toml
[bundle]
identifier = "dev.esempio.depsmanager"
publisher = "Esempio"
icon = ["assets/icon.png"]
```

Il bundle si compila solo per l'host: `msi`, `deb` e `app` richiedono tre runner di CI.

## Esercizi

1. Aggiungi una colonna `feature` letta dal campo `dependencies` del lock, con valore vuoto per le dipendenze normali.
2. Ordina la tabella per nome cliccando l'intestazione, usando un `Signal<Option<String>>` e `sort_by` nel `use_memo`.

<details>
<summary>Soluzione</summary>

1. `parse` deve conservare anche i nomi delle dipendenze feature; le estrai con `p.get("dependencies")` e le filtri con `starts_with("feature:")`, poi mostri la stringa in una cella.

2. L'ordinamento entra nella chiusura del memo: `let mut v = ...; if let Some(c) = ordine() { v.sort_by(|a, b| ...) }`. Il click sull'intestazione imposta il signal e il memo si ricalcola una volta sola.

</details>

## Errori comuni

- **Leggere il file durante il render**: `std::fs::read_to_string` nel corpo del componente riesegue a ogni re-render e blocca il thread UI; usa `use_resource`.
- **`key` con l'indice nel ciclo delle dipendenze**: il lock contiene duplicati per nome, quindi l'indice non è un'identità stabile.
- **Usare `unwrap()` su `Cargo.lock` malformato**: il `match` sul `Resource` deve coprire `Err`, altrimenti l'app termina davanti all'utente.
- **Scrivere il report con `PathBuf` relativo**: il working directory di un'app impacchettata non è la cartella di sviluppo; usa la cartella home o una scelta esplicita.
- **Dimenticare la feature `desktop`**: `dx serve` compila la feature `default`, e senza `desktop` non c'è renderer nativo.

## In sintesi

Il laboratorio separa le responsabilità: parsing e calcoli puri testabili, I/O in `use_resource`, filtro in `use_memo`, scrittura in `spawn`. I signal sono due, le `key` combinano nome e versione, e `dx bundle` chiude il ciclo con un installer.

## Fonti

- [Dioxus — Getting Started (0.7)](https://dioxuslabs.com/learn/0.7/getting_started/)
- [Dioxus — Bundling](https://dioxuslabs.com/learn/0.7/tutorial/bundle)
- [Dioxus — Desktop platform guide](https://dioxuslabs.com/learn/0.7/guides/platforms/desktop)
- [Dioxus 0.7 — API su docs.rs](https://docs.rs/dioxus/0.7/dioxus/)
