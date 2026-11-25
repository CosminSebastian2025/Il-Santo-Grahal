Il linguaggio da solo non basta: la forza di OCaml sta nell'ecosistema costruito intorno a opam e dune, che gestiscono compilatori, librerie, build e test con pochi comandi. In questa lezione impari come si organizza un progetto reale, come si dichiarano le dipendenze e come si scrivono test automatici oltre ai casi d'uso in cui OCaml conviene ancora oggi.

## Obiettivi

- Installare una toolchain con opam e gestire switch e pacchetti.
- Creare un progetto con dune, con libreria, eseguibile e file `.mli` separati.
- Scrivere test con `dune test`, da usare anche in CI.
- Conoscere le librerie di riferimento per parsing, JSON e networking.
- Riconoscere i domini in cui OCaml è scelta vincente.

## Opam e switch

`opam` è il package manager che installa compilatori OCaml e librerie. Ogni **switch** è un ambiente isolato con la propria versione del compilatore: cambiare progetto significa cambiare switch, come per un virtualenv di Python ma per l'intera toolchain.

```bash
opam init --bare -y               # inizializza lo stato di opam
opam switch create 5.2.1          # crea un ambiente con OCaml 5.2.1
eval $(opam env)                  # attiva lo switch nella shell corrente
opam install dune utop alcotest   # strumenti e librerie comuni
```

Le dipendenze esplicite di un progetto si dichiarano nelle stanze `dune` con `(libraries ...)`, mentre `opam install . --deps-only` installa i pacchetti che il progetto richiede, senza installare il progetto stesso in sviluppo.

| Comando | Funzione |
| --- | --- |
| `opam switch` | elenca e cambia ambienti |
| `opam install` | aggiunge un pacchetto allo switch attivo |
| `opam list` | mostra i pacchetti installati |
| `dune build` | compila tutto il progetto |
| `dune exec ./bin/main.exe` | compila ed esegue un eseguibile |
| `dune test` | esegue i test dichiarati |

## Un progetto dune minimo

La struttura tipica separa `lib/` e `bin/`: la libreria contiene la logica e l'eseguibile solo il punto d'ingresso. I nomi nei file `dune` sono dichiarativi, non comandi personalizzati, e questa rigidità paga quando il progetto cresce.

```text
notarium/
|-- dune-project
|-- lib/
|   |-- dune
|   |-- testo.ml
|   `-- testo.mli
`-- bin/
    |-- dune
    `-- main.ml
```

```text
(lang dune 3.0)
(name notarium)
```

```text
; lib/dune
(library
 (name notarium))
```

```ocaml
(* lib/testo.mli: l'interfaccia è il contratto pubblico *)
val conta_parole : string -> int

(* lib/testo.ml *)
let conta_parole testo =
  testo |> String.split_on_char ' '
        |> List.filter (fun parola -> parola <> "")
        |> List.length
```

```ocaml
(* bin/main.ml *)
let () =
  let testo = String.concat " " (List.tl (Array.to_list Sys.argv)) in
  Printf.printf "%d parole\n" (Notarium.Testo.conta_parole testo)
```

L'eseguibile accede alla libreria con lo spazio dei nomi dichiarato in `lib/dune`: `Notarium.Testo` è il modulo `testo.ml` dentro la libreria `notarium`. Il pattern `let () = ...` esegue il `main` all'avvio.

## Test, tooling e casi d'uso

Dune supporta due stili di test: eseguibili di test con `(test (name ...))` e test inline sui documenti `.t` gestiti da cram. Il secondo è comodo per verificare l'output di comandi e di funzioni su valori stampati.

```ocaml
(* test/test_testo.ml: assert nello stile più semplice *)
let () =
  assert (Notarium.Testo.conta_parole "a b c" = 3);
  assert (Notarium.Testo.conta_parole "" = 0);
  print_endline "ok"
```

```text
; test/dune
(test (name test_testo) (libraries notarium))
```

Per test con messaggi di errore leggibili si usa `alcotest`, mentre l'intero ciclo di build e test gira in CI con le stesse istruzioni. `utop` è un toplevel avanzato che stampa il tipo inferito a ogni valutazione, utile per verificare un'ipotesi prima di scrivere un file.

I casi d'uso reali sono netti: compilatori e interpreti (la sintassi con varianti e pattern matching è quasi un DSL), sistemi finanziari dove gli errori di tipo costano, infrastruttura di rete con `Eio` per la concorrenza ed effetti, e programmi ad alte prestazioni dove `ocamlopt` produce codice vicino a C. Per il parsing si usano `menhir` e `sedlex`, per il JSON `yojson`, per i test `alcotest` e `qcheck`.

## Errori comuni

- **Installare pacchetti fuori dallo switch giusto**: `opam env` va rieseguito a ogni cambio di shell.
- **Mettere logica in `main.ml` senza interfaccia**: la libreria diventa impossibile da testare in isolamento.
- **Salvare codice solo dentro `utop`**: il REPL non è un progetto e non entra in git.
- **Confondere i test inline con i test unitari**: i cram verificano output, non proprietà semantiche.
- **Ignorare il file `.mli` aggiornato**: se l'interfaccia non corrisponde all'implementazione, `dune build` fallisce con un errore poco intuitivo.

## In sintesi

L'ecosistema OCaml ruota intorno a opam per ambienti e pacchetti e a dune per build e test. Un progetto separa libreria ed eseguibile, e i file `.mli` fissano il contratto pubblico. I test si eseguono con un comando e si integrano in CI senza configurazione esotica. Le librerie di riferimento coprono parsing, JSON e networking.

## Fonti

- [Opam usage](https://opam.ocaml.org/doc/Usage.html), versione online del manuale di opam.
- [Dune documentation](https://dune.readthedocs.io/en/stable/), riferimento di build e stanze `dune`.
- [Dune: Tests](https://dune.readthedocs.io/en/stable/tests.html), eseguibili di test e test inline.
- [OCaml: Managing dependencies](https://ocaml.org/docs/managing-dependencies), flusso consigliato per le dipendenze.
