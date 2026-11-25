Rust è un linguaggio compilato che unisce le prestazioni del C con garanzie di memoria verificate a tempo di compilazione. Non c'è garbage collector: il compilatore segue chi possiede ogni valore e rifiuta il codice che potrebbe usare memoria già liberata o condividere dati in modo insicuro. In questa lezione impari la sintassi di base, il modello di proprietà e gli strumenti che usi ogni giorno.

## Obiettivi

- Riconoscere binding, mutabilità e tipi primitivi, comprese le stringhe `String` e `&str`.
- Applicare le regole di ownership, prestito e durata delle referenze.
- Usare struct, enum con dati e `match` per modellare stati.
- Gestire errori con `Result`, l'operatore `?` e `panic!`.
- Scrivere funzioni generiche con trait e chiusure quando serve astrazione.

## Binding, tipi e controllo di flusso

Un binding si dichiara con `let` ed è immutabile salvo `mut`. Il tipo si deduce, ma si può annotare; i tipi interi dichiarano la larghezza (`u8`, `i32`, `usize`) e le conversioni implicite tra tipi numerici non esistono.

```rust
fn main() {
    let nome = "Ada";                 // &str: stringa statica, immutabile
    let mut contatore: u32 = 0;       // mut: il valore può cambiare
    let numeri = vec![3, 1, 2];

    while contatore < 3 {
        println!("{nome} {contatore}"); // interpolazione inline
        contatore += 1;
    }
    for n in &numeri {
        println!("{n}");              // prestito: numeri resta usabile
    }
}
```

Il flusso di controllo è un'espressione: `if`, `match` e i blocchi restituiscono un valore. `match` deve coprire tutti i casi, e il compilatore segnala i rami mancanti. Ne segue che l'aggiunta di un caso a un enum rompe ogni `match` incompleta: è un errore, non un avviso, e garantisce che i nuovi stati siano gestiti ovunque rischiano di essere dimenticati, come accade in linguaggi dove `switch` accetta il ramo di default.

| Costrutto | Sintassi | Nota |
| --- | --- | --- |
| binding immutabile | `let x = 7;` | default della lingua |
| binding mutabile | `let mut n = 0;` | mutabilità dichiarata |
| `if` espressione | `let m = if a > b { a } else { b };` | nessun ternario |
| `match` | `match x { 1 => "uno", _ => "altro" }` | deve essere esaustivo |
| ciclo | `for v in &lista { ... }` | iteratori al posto di indici |

Una `String` è un buffer sullo heap che possiede il testo, mentre `&str` è una vista su byte UTF-8 posseduti da qualcun altro. Passare una `String` a una funzione che vuole solo leggere richiede `&`, non una copia.

## Ownership, prestito e durate

Ogni valore ha un solo proprietario. Quando lo si assegna o lo si passa a una funzione, la proprietà si sposta e l'originale non è più usabile. Al posto di copiare, si presta con una referenza `&T` o `&mut T`, e il compilatore impedisce di avere contemporaneamente un prestito mutabile e altri prestiti.

```rust
fn lunghezza(s: &str) -> usize {
    s.len() // prestito immutabile: non consuma la stringa
}

fn aggiungi_bang(s: &mut String) {
    s.push('!'); // prestito mutabile, uno solo alla volta
}

fn main() {
    let mut frase = String::from("ciao");
    println!("{}", lunghezza(&frase)); // frase resta di chi l'ha creata
    aggiungi_bang(&mut frase);
    println!("{frase}");              // "ciao!"
    let consumata = frase;           // move: frase non è più utilizzabile
    println!("{consumata}");
}
```

Il prestito termina con l'ultimo uso, secondo le regole di lifetime inference, quindi in genere non devi scrivere i parametri di vita esplicitamente. Il compilatore accetta due pattern tipici: molti lettori oppure un solo scrittore, mai entrambi. Aggiungere una `push` mentre `a` è ancora in vita farebbe fallire la compilazione.

## Tipi di dominio ed errori

Rust non ha `null` né eccezioni. L'assenza di un valore si modella con `Option<T>`, il fallimento con `Result<T, E>`. Gli enum possono portare dati diversi per variante e `match` li scompone in modo esaustivo.

```rust
use std::fs;
use std::num::ParseIntError;

#[derive(Debug)]
enum Config {
    Vuota,
    Valore(i64),
}

fn leggi_numero(testo: &str) -> Result<i64, ParseIntError> {
    testo.trim().parse::<i64>() // il tipo di errore dice cosa può andare storto
}

fn carica(percorso: &str) -> Result<Config, std::io::Error> {
    let contenuto = fs::read_to_string(percorso)?; // ? propaga l'errore
    let n = leggi_numero(&contenuto).unwrap_or(0);
    Ok(if contenuto.trim().is_empty() { Config::Vuota } else { Config::Valore(n) })
}
```

L'operatore `?` converte l'errore con `From` e ritorna subito dal chiamante, senza stack trace impliciti; il messaggio arriva dal valore di errore. `panic!` è riservato ai bug, cioè alle condizioni che non dovrebbero mai verificarsi, non agli input errati.

| Espressione | Tipo | Uso |
| --- | --- | --- |
| `Option::Some(v)` | `Option<T>` | valore presente |
| `Option::None` | `Option<T>` | valore assente |
| `Ok(v)` | `Result<T, E>` | successo |
| `Err(e)` | `Result<T, E>` | errore recuperabile |
| `?` | — | propaga con conversione `From` |

## Struct, trait e generics

Le struct raggruppano dati, i trait dichiarano capacità e i generics rendono il codice riutilizzabile senza rinunciare ai controlli statici. Un trait bound come `T: Display` obbliga il chiamante a passare tipi che sanno formattarsi.

```rust
trait Riepilogo {
    fn riassunto(&self) -> String; // metodo obbligatorio
}

struct Articolo { titolo: String, autore: String }

impl Riepilogo for Articolo {
    fn riassunto(&self) -> String {
        format!("{}, di {}", self.titolo, self.autore)
    }
}

fn mostra<T: Riepilogo>(item: &T) {
    println!("{}", item.riassunto()); // generico con bound, zero costo a runtime
}
```

Il compilatore genera una versione specializzata per ogni tipo concreto usato, quindi i generics non hanno overhead. `#[derive(Debug, Clone, PartialEq)]` genera le implementazioni comuni, e `impl Trait` in posizione di argomento è zucchero per un parametro generico.

## Errori comuni

- **Clonare per far contento il borrow checker**: `clone()` nasconde un problema di proprietà e danneggia le prestazioni; spesso basta un prestito.
- **Dichiarare `mut` ovunque**: la mutabilità è informazione per il lettore e il compilatore; usa `mut` solo dove serve.
- **Usare `unwrap()` su input esterno**: un file mancante o riga invalida fa panic; negli strumenti CLI lascia risalire `Result`.
- **Confondere `String` e `&str`**: una funzione che non alloca deve accettare `&str`, così accetta anche `String` tramite deref coercion.
- **Ignorare i rami di `match`**: aggiungere una variante a un enum rompe tutte le `match` non esaustive, ed è il comportamento voluto.

## In sintesi

Rust sposta a tempo di compilazione il controllo di ciò che in C++ è responsabilità umana: proprietà unica, prestiti esclusivi, durate verificate. `Option` e `Result` rendono espliciti assenza ed errore, `match` obbliga a coprire i casi. Struct, trait e generics costruiscono astrazioni senza costo a runtime. Le regole sembrano rigide all'inizio, ma sostituiscono intere categorie di bug.

## Fonti

- [The Rust Programming Language - Understanding Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) — capitolo su proprietà, prestito e slice.
- [The Rust Programming Language - Enums and Pattern Matching](https://doc.rust-lang.org/book/ch06-00-enums.html) — `Option`, enum con dati e `match`.
- [The Rust Programming Language - Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html) — `Result`, `?` e quando usare `panic!`.
- [The Rust Language Reference](https://doc.rust-lang.org/reference/) — sintassi e semantica formale della lingua.
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) — esempi eseguibili su ogni costrutto.
