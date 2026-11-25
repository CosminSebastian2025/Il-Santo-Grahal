In questo laboratorio costruisci `rust-conta`, una CLI che legge un file o stdin e stampa righe, parole e byte. Mette in fila i pezzi di un programma Rust reale, cioè `Result`, `?`, prestiti, iteratori e test, e produce un binario in release con test sia sul calcolo sia sul contratto.

## Obiettivi

- Definire un contratto CLI minimo con opzioni, output e codice di uscita coerenti.
- Leggere da file o stdin con `std::io` mantenendo i prestiti sotto controllo.
- Contare righe, parole, byte e frequenze usando gli iteratori.
- Gestire errori con `Result` invece di lasciar uscire `panic!`.
- Scrivere test unitari e di integrazione per calcoli e comportamento.

## Il contratto di `rust-conta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `rust-conta [OPZIONI] [FILE]` | senza file legge stdin |
| `-w, --words` | aggiunge le frequenze | modalità aggiuntiva |
| `-n, --top N` | intero >= 1, default 5 | limite di stampa |
| `--json` | output su una riga | consumo da script |
| exit 0 | successo | anche con conteggi a zero |
| exit 2 | opzione invalida o file illeggibile | errore operativo |

Senza argomenti e con stdin vuoto lo strumento stampa zeri ed esce con 0: il vuoto è un risultato. Un file che non si apre è invece un errore operativo, distinto dall'uso errato della riga di comando.

```bash
cargo new rust-conta --bin
cd rust-conta && cargo add clap --features derive
cargo build --release
echo "ciao rust ciao" | ./target/release/rust-conta -n 2
./target/release/rust-conta note.txt; printf 'exit: %s\n' "$?"
```

## Core: conteggi e prestiti

Il conteggio puro lavora su una slice e non alloca. Le frequenze allocano la mappa, che chi chiama libera.

```rust
use std::collections::HashMap;

#[derive(Debug, PartialEq)]
pub struct Conteggi { pub righe: usize, pub parole: usize, pub byte: usize }

pub fn conta(testo: &str) -> Conteggi {
    let parole = testo.split_whitespace().count(); // iteratore, nessuna copia
    let righe = if testo.is_empty() { 0 } else { testo.lines().count() };
    Conteggi { righe, parole, byte: testo.len() }
}

pub fn frequenze(testo: &str) -> HashMap<&str, usize> {
    let mut freq: HashMap<&str, usize> = HashMap::new();
    for p in testo.split_whitespace() {
        *freq.entry(p).or_insert(0) += 1; // chiavi in prestito da testo
    }
    freq // chi chiama decide quando tutto questo muore
}
```

Le chiavi sono prestiti su `testo`: finché la mappa vive, la stringa non può essere liberata né modificata. È il caso in cui Rust elimina una classe di bug senza runtime.

`run` implementa il contratto e riceve un writer generico, così il test scrive in un buffer invece che sul terminale. `leggi` propaga con `?` l'errore di I/O senza fare panic, e il `main` si limita a mappare il risultato su un codice di uscita.

```rust
use std::io::Write as _;

pub fn run(testo: &str, ordina: bool, top: usize, out: &mut impl Write) -> std::io::Result<()> {
    let c = conta(testo);
    writeln!(out, "{} {} {}", c.righe, c.parole, c.byte)?;
    if ordina {
        let mut v: Vec<(&str, usize)> = frequenze(testo).into_iter().collect();
        v.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0))); // ordine stabile
        for (parola, n) in v.into_iter().take(top) {
            writeln!(out, "{n} {parola}")?;
        }
    }
    Ok(())
}
```

## Test e criterio di uscita

I test unitari coprono il calcolo, quelli di integrazione il contratto reale: in un CLI il calcolo può essere giusto e la CLI sbagliata sulla gestione dell'errore. Da verificare a mano: `printf '' | ./rust-conta` deve dare `0 0 0` ed exit 0, mentre `./rust-conta /non/esiste` deve uscire con 2 e scrivere su stderr.

| Caso | Input | Uscita attesa |
| --- | --- | --- |
| vuoto | `printf ''` | `0 0 0`, exit 0 |
| una riga | `"ciao"` senza a capo | `1 1 4`, exit 0 |
| file assente | percorso inesistente | errore su stderr, exit 2 |
| `-n 0` | opzione invalida | errore su stderr, exit 2 |

Il test di integrazione lancia il binario e confronta gli esiti, codice compreso.

```rust
use std::process::Command;

#[test]
fn file_mancante_esce_con_2() {
    let out = Command::new(env!("CARGO_BIN_EXE_rust_conta"))
        .arg("/non/esiste")
        .output()
        .unwrap();
    assert_eq!(out.status.code(), Some(2)); // codice di uscita, non panic
    assert!(!out.stderr.is_empty());        // messaggio su stderr
}
```

## Esercizi

1. Aggiungi `-s, --sort nome|freq` per ordinare le parole, con default `freq`.
2. Rendi `--json` stabile con i campi `righe`, `parole`, `byte` e `top`, e scrivi un test che ne verifichi l'ordine.
3. Leggi a blocchi da 8 KiB invece che con `read_to_string`: cosa deve cambiare in `conta`?
4. Gestisci input non UTF-8 senza rompere il conteggio e senza produrre JSON invalido.
5. Aggiungi `--max-bytes N` con errore dedicato e un test che verifichi il fallimento al superamento.
6. Confronta `cargo build` e `cargo build --release` su un file da 10 MiB: cosa cambia e perché?

<details>
<summary>Soluzione</summary>

1. La lista `Vec<(&str, usize)>` si ordina con `sort_by`: su `nome` confronta le stringhe, su `freq` confronta i conteggi e spezza i pari con il nome, così l'ordine è deterministico nei test.

2. Definisci una struct `RigaJson` con `#[derive(Serialize)]`, serializza con `serde_json::to_string` e confronta l'intera riga con `assert_eq!`, che blocca ordine e nome dei campi.

3. `conta` deve accettare un lettore e accumulare righe e parole a pezzi; le chiavi delle frequenze vanno copiate in `String`, con una mappa di tipo diverso.

4. Il conteggio con `read_to_end` non fallisce mai; prima di serializzare valida il testo con `String::from_utf8` e scegli se perdere i byte invalidi o rifiutare l'input.

5. Usa `reader.take(max_bytes).read_to_string` e controlla che non resti altro testo: oltre il limite restituisci un errore dedicato che `main` stampa ed esce con 2.

6. In release il compilatore attiva le ottimizzazioni e disattiva i controlli di overflow: il tempo di esecuzione scende molto, quello di compilazione sale. Confronta con `time` e con `ls -l`.

</details>

## Errori comuni

- **Usare `unwrap()` su `read_to_string`**: un file mancante fa panic e confonde l'utente con uno stack trace.
- **Clonare il testo per ogni parola**: passare `&str` ed evitare `to_string()` in loop mantiene il costo basso.
- **Costruire stringhe con `format!` in loop**: accumula allocazioni; usa `writeln!` su un writer esistente.
- **Stampare errori su stdout**: rompe le pipe e confonde gli script, che controllano il codice di uscita.
- **Testare solo l'input felice**: il caso vuoto e il file mancante rompono le pipeline reali.

## In sintesi

Rust rende espliciti proprietà, errori e confini di responsabilità. Qui hai separato il core testabile (`run` e `conta`) dal `main`, usato prestiti come chiavi delle frequenze e trasformato gli errori in un tipo che produce il codice di uscita corretto. Il passo successivo è la lettura a blocchi, che cambia la proprietà dei buffer e avvicina lo strumento a un vero `wc`.

## Fonti

- [The Rust Programming Language - An I/O Project](https://doc.rust-lang.org/book/ch12-00-an-io-project.html) — costruzione guidata di una CLI con test e gestione errori.
- [The Rust Standard Library](https://doc.rust-lang.org/std/) — documentazione delle API di input e output usate qui.
- [The Rust Programming Language - Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html) — `Result`, `?` e conversione degli errori.
- [The Rust Programming Language - Writing Automated Tests](https://doc.rust-lang.org/book/ch11-00-testing.html) — test unitari e di integrazione.
- [The Cargo Book - Tests](https://doc.rust-lang.org/cargo/guide/tests.html) — layout dei test di integrazione di un crate.