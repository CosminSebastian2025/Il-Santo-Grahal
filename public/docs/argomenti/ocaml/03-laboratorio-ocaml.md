Questo laboratorio costruisce `contalistino`, una piccola CLI che legge un elenco di nomi, scarta i duplicati mantenendo l'ordine e stampa un report. L'obiettivo non è il programma, ma il percorso completo: progetto dune, interfaccia `.mli`, test, gestione degli errori e uso del REPL come strumento di progetto.

## Obiettivi

- Creare un progetto dune da zero con libreria, eseguibile e test.
- Separare la logica pura di deduplica dai dettagli di input e output.
- Rappresentare gli errori con `result` invece di eccezioni.
- Verificare il comportamento con asserzioni e con l'esecuzione manuale.
- Documentare il comando con argomenti posizionali validati e uso su stderr.

## Il contratto

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `contalistino [OPZIONI] FILE` | un argomento posizionale obbligatorio |
| `-l, --lowercase` | flag | normalizza a minuscolo prima di confrontare |
| nessun argomento | errore con uso su stderr | impedisce letture casuali della directory corrente |
| file inesistente | exit 1 | errore operativo, non d'uso |
| output | una riga di conteggio e i nomi unici | formato stabile e grep-abile |

Il formato dell'output è parte del contratto: `Totale: 6 unici: 4` precede la lista, così uno script legge la prima riga senza parsare tutto.

```bash
dune exec ./bin/main.exe -- nomi.txt
```

## La logica come libreria

La funzione centrale mantiene una lista di nomi già visti e aggiunge un elemento solo se compare per la prima volta. Il risultato esce in ordine di prima occorrenza, quindi l'output è prevedibile.

```ocaml
(* lib/dedup.mli: solo il contratto, nessuna implementazione *)
val unici : ?lowercase:bool -> string list -> string list
```

```ocaml
(* lib/dedup.ml *)
let normalizza ~lowercase nome =
  if lowercase then String.lowercase_ascii nome else nome

let unici ?(lowercase = false) nomi =
  let acc = ref [] in          (* lista degli elementi conservati, in ordine *)
  let visti = Hashtbl.create 32 in
  List.iter
    (fun nome ->
      let chiave = normalizza ~lowercase nome in
      if not (Hashtbl.mem visti chiave) then begin
        Hashtbl.add visti chiave ();
        acc := nome :: !acc
      end)
    nomi;
  List.rev !acc                 (* ricostruisce l'ordine di input *)
```

Il modulo usa `ref` e `Hashtbl` perché qui la performance conta: con `List.mem` il costo sarebbe quadratico. La lista pubblica resta immutabile, e l'effetto è confinato dentro la funzione. Il modulo è il file, lo spazio dei nomi è la libreria: con `(library (name notarium))` il modulo `dedup.ml` si raggiunge come `Notarium.Dedup`.

```ocaml
let righe file =
  try Ok (In_channel.with_open_text file In_channel.input_lines)
  with Sys_error msg -> Error msg      (* error come valore, non eccezione *)
```

`In_channel` chiude il canale anche in caso di eccezione, così non serve ricordarsi il `close`.

## CLI, test e verifica

Il `main` valida gli argomenti prima di leggere il file, ricavandoli da `Sys.argv`.

```ocaml
(* bin/main.ml *)
let () =
  let args = Array.to_list Sys.argv |> List.tl in
  let lowercase = List.mem "--lowercase" args || List.mem "-l" args in
  match List.filter (fun a -> a <> "--lowercase" && a <> "-l") args with
  | [ file ] -> (
      match Notarium.Dedup.righe file with
      | Error msg ->
          Printf.eprintf "contalistino: %s\n" msg;
          exit 1
      | Ok righe ->
          let u = Notarium.Dedup.unici ~lowercase righe in
          Printf.printf "Totale: %d unici: %d\n" (List.length righe) (List.length u);
          List.iter print_endline u)
  | _ ->
      Printf.eprintf "uso: contalistino [-l] FILE\n";
      exit 2
```

I test coprono la logica pura, la parte che si rompe silenziosamente quando qualcuno cambia l'algoritmo.

```ocaml
(* test/test_dedup.ml *)
open Notarium.Dedup

let () =
  assert (unici [] = []);
  assert (unici [ "a"; "a"; "b" ] = [ "a"; "b" ]);
  assert (unici [ "Ada"; "ada" ] = [ "Ada"; "ada" ]);
  assert (unici ~lowercase:true [ "Ada"; "ada" ] = [ "Ada" ]);
  (match righe "/file/inesistente" with Error _ -> () | Ok _ -> assert false);
  print_endline "test ok"
```

```bash
dune build && dune test
printf 'Ada\nLinus\nAda\nGuido\n' > /tmp/nomi.txt
dune exec ./bin/main.exe -- --lowercase /tmp/nomi.txt
```

Nel REPL (`utop`) prova `unici [ "x"; "y"; "x" ]` e leggi il tipo `string list -> string list` prima di scrivere i test: è un passaggio economico e spesso dimenticato.

## Esercizi

1. Aggiungi l'opzione `-s, --sort` che ordina i nomi prima della deduplica; quale exit code usa se l'opzione è sconosciuta?
2. Modifica `righe` per leggere da stdin quando il file è `-`, come fanno molti comandi Unix.
3. Sostituisci `assert` con `alcotest` e aggiungi un test sul messaggio d'errore per un file inesistente.
4. Rendi `unici` senza `ref`, usando un fold ricorsivo su una tupla `(visti, acc)`.
5. Aggiungi il conteggio delle duplicazioni scartate all'output senza rompere la prima riga.
6. Scrivi un file `.mli` per il modulo `main` e spiega perché in un binario non serve.

<details>
<summary>Soluzione</summary>

1. Il parser controlla `--sort` o `-s` e applica `List.sort String.compare` dopo `unici`. Un'opzione sconosciuta deve uscire con 2, perché è un errore d'uso.

2. In `righe`, se il nome è `"-"` chiama `In_channel.input_lines In_channel.stdin`, altrimenti apre il file: `Ok` e `Error` restano invariati.

3. Con alcotest si dichiara un caso `Alcotest.(check (list string))` e una funzione che chiama `righe` su un percorso assente, verificando `Error msg` con `String.length msg > 0`.

4. La versione senza `ref` è `List.fold_left (fun (visti, acc) n -> if Hashtbl.mem visti n then (visti, acc) else (Hashtbl.add visto n (); (visti, n :: acc)))`, seguita da `List.rev`.

5. Il conteggio è `List.length righe - List.length u`: si aggiunge su una seconda riga, e i test verificano solo la prima, così i consumatori esistenti non si rompono.

6. Non serve: il modulo `main` è caricato una volta e nessuno lo importa, quindi non c'è un contratto da esporre. Un `.mli` compilerebbe, ma documenterebbe un'interfaccia inutile.

</details>

## Errori comuni

- **Mettere la logica dentro `bin/main.ml`**: i test non possono importarla e finiscono per ricopiare il codice.
- **Lasciare che `Sys_error` risalga fino al main**: lo stack trace al posto del messaggio utente peggiora la diagnosi.
- **Scambiare `=` e `==`**: la prima confronta strutturalmente, la seconda l'identità fisica dei valori e va evitata.
- **Dimenticare che l'accumulatore di `unici` è invertito**: senza `List.rev` si perde l'ordine di input.
- **Ignorare il warning dell'interfaccia `.mli` non aggiornata**: `dune build` segnala la discrepanza e il pacchetto non compila.

## In sintesi

Il laboratorio separa un progetto in libreria testabile e binario sottile. La deduplica usa effetto locale (`ref` e `Hashtbl`) dietro un'interfaccia `.mli` immutabile. Gli errori di I/O diventano `result` e il main li traduce in messaggi ed exit code. Test, `dune test` e REPL chiudono il ciclo prima che il programma arrivi a un utente.

## Fonti

- [OCaml: Your First Program](https://ocaml.org/docs/your-first-program), primo progetto e struttura dei file.
- [OCaml: Error Handling](https://ocaml.org/docs/error-handling), `option` e `result` applicati all'I/O.
- [OCaml: Loops and Recursion](https://ocaml.org/docs/loops-recursion), ricorsione e accumulatori.
- [Dune: Tests](https://dune.readthedocs.io/en/stable/tests.html), configurazione dei test nel progetto.
