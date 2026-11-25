Un progetto Rust vive dentro Cargo: manifest, workspace, dipendenze, formattazione, analisi statica e test sono comandi del toolchain, non strumenti separati. Questa coerenza è uno dei motivi per cui i team adottano Rust, e questa lezione mostra come impostare un repository, scrivere test utili e pubblicare una libreria senza sorprese.

## Obiettivi

- Inizializzare un progetto con `cargo new` e leggere i file generati.
- Capire `Cargo.toml`, le dipendenze e il file di lock in un'applicazione.
- Scrivere test unitari, di integrazione e doctest.
- Usare `cargo fmt`, `cargo clippy` e la documentazione generata da `cargo doc`.
- Pubblicare crate, fissare le feature e gestire il toolchain con rustup.

## Struttura del progetto e Cargo

`cargo new contaparole` crea un crate binario con `src/main.rs`; `cargo new libreria --lib` crea un crate di libreria con `src/lib.rs`. Il manifest `Cargo.toml` dichiara nome, edizione, dipendenze e feature, mentre `Cargo.lock` registra le versioni esatte risolte: va versionato per i binari e non per le librerie.

```toml
[package]
name = "contaparole"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1", features = ["derive"] }
anyhow = "1"

[dev-dependencies]
tempfile = "3"
```

| Comando | Effetto | Quando |
| --- | --- | --- |
| `cargo new --bin nome` | crea un binario con `Cargo.toml` | progetto nuovo |
| `cargo build --release` | compila ottimizzato in `target/release` | preparazione al rilascio |
| `cargo run -- argomenti` | compila ed esegue | sviluppo |
| `cargo add serde` | aggiunge e aggiorna il manifest | nuova dipendenza |
| `cargo tree` | mostra il grafo delle dipendenze | audit e conflitti di versione |

Le dipendenze di test o di esempio si mettono in `[dev-dependencies]`, così non finiscono nella build di produzione. Gli spazi del workspace raccolgono più crate con una sola `Cargo.lock` e target condiviso.

## Test, formattazione e analisi statica

I test unitari stanno nello stesso file del codice nel modulo `tests`, quelli di integrazione in `tests/` e usano solo l'API pubblica; gli esempi nella documentazione diventano doctest eseguiti da `cargo test`.

```rust
use std::collections::HashMap;

/// Conta le parole separate da spazi bianchi.
/// ```rust
/// assert_eq!(conta("a b a"), 2);
/// ```
pub fn conta(testo: &str) -> usize {
    let mut freq: HashMap<&str, usize> = HashMap::new();
    for p in testo.split_whitespace() {
        *freq.entry(p).or_insert(0) += 1;
    }
    freq.len()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn testo_vuoto_non_ha_parole() {
        assert_eq!(conta(""), 0);
    }

    #[test]
    #[should_panic(expected = "divide")]
    fn divisione_per_zero() {
        let d = 0;
        if d == 0 { panic!("divide"); } // documenta il panic atteso
    }
}
```

Il doctest si esegue solo dentro un crate di libreria, quindi per un binario va spostata la logica in `src/lib.rs`. `cargo test` compila in parallelo, isola ogni test in un thread e riporta i fallimenti con il messaggio dell'asserzione.

```bash
cargo fmt --check                 # blocca la CI se la formattazione diverge
cargo clippy -- -D warnings       # tratta ogni lint come errore
cargo test --all-features         # include il codice dietro le feature
cargo test nome_del_test -- --nocapture   # singolo test, con l'output
```

## Libreria, feature e pubblicazione

Un crate ben progettato espone l'API minima, documenta gli esempi e lascia le funzionalità opzionali dietro feature. Il modulo `prelude` o i re-export in `lib.rs` riducono i percorsi lunghi per chi consuma il crate.

```rust
// src/lib.rs
pub mod analisi;

pub use analisi::conta; // re-export: chi consuma usa il percorso corto

/// Registra la feature che abilita l'inizializzazione dei log.
#[cfg(feature = "log")]
pub const LOG_ABILITATO: bool = true; // codice compilato solo con la feature
```

Prima di `cargo publish` servono descrizione, licenza e README con l'esempio d'uso; `cargo package` verifica localmente cosa finirebbe nell'archivio. Con rustup si gestiscono release stabili, beta e nightly per cartella tramite `rust-toolchain.toml`, così il repository non dipende dalla macchina. Nel web Rust convive con servizi esistenti, spesso come CLI o modulo compilato, e conviene misurarne i costi di compilazione prima di una riscrittura larga: binari piccoli, startup immediato e prevedibilità rendono la scelta evidente soprattutto in strumenti distribuiti.

## Casi d'uso reali

Rust è usato in luoghi dove affidabilità e prestazioni contano contemporaneamente: server web ad alto throughput, motori di database, strumenti CLI distribuiti come binari statici, componenti di browser e sistemi operativi. Nel web è frequente integrarlo con servizi esistenti tramite CLI o moduli compilati, anziché riscrivere tutto.

| Contesto | Buona scelta | Attenzione |
| --- | --- | --- |
| CLI distribuite | binario unico, `clap`, test di integrazione | tempi di compilazione lunghi in CI |
| librerie per altri linguaggi | crate `cdylib`, API C stabile | gestione errori ai confini |
| servizi web | async con tokio, serde | costi di apprendimento per il team |
| migrazioni graduali | riscrittura a moduli | non mescolare GC e ownership a caso |

## Errori comuni

- **Versionare `Cargo.lock` in una libreria**: blocca i consumatori su versioni vecchie; nei binari invece è necessario.
- **Dipendere da crate senza audit**: `cargo tree` e `cargo audit` mostrano quante dipendenze transitive entrano nel binario.
- **Skippare clippy**: i lint colgono idiomi subottimali e bug che il compilatore accetta, e in un solo comando evitano discussioni in review.
- **Scrivere solo test unitari**: senza test di integrazione l'API pubblica può rompersi senza che nessuno lo noti.
- **Abilitare tutte le feature contemporaneamente in produzione**: feature additive e ben documentate evitano combinazioni non testate.

## In sintesi

Cargo dà a un progetto Rust un unico punto di ingresso per build, dipendenze, test, formattazione e documentazione. Il manifest dichiara intenzioni, il lock fissa le versioni, le feature rendono opzionale ciò che non tutti usano. `fmt` e `clippy` riducono il rumore in review, e doctest e test di integrazione proteggono l'API pubblica. Fissare il toolchain con rustup rende il repository riproducibile.

## Fonti

- [The Cargo Book](https://doc.rust-lang.org/cargo/) — guida ufficiale di Cargo, manifest e gestione dei pacchetti.
- [Cargo Book - Project Layout](https://doc.rust-lang.org/cargo/guide/project-layout.html) — organizzazione di sorgenti, test e esempi.
- [The Rust Programming Language - Writing Automated Tests](https://doc.rust-lang.org/book/ch11-00-testing.html) — test unitari, integrazione e doctest.
- [Clippy Documentation](https://doc.rust-lang.org/clippy/) — lint ufficiali e come configurarli nel progetto.
- [rustup - The Rust toolchain installer](https://rust-lang.github.io/rustup/) — installazione e selezione delle toolchain.
