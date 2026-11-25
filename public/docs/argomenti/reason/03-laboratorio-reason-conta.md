In questo laboratorio costruisci `reason-conta`, una CLI in Reason che legge un testo, conta righe, parole e frequenze e le stampa in ordine. Il progetto separa un nucleo puro nel modulo `Istogramma` da un eseguibile che fa I/O.

## Obiettivi

- Impostare un progetto Reason con `dune-project`, `dune`, `.opam` minimi.
- Mantenere il nucleo puro con firme esplicite in un `.rei`.
- Contare righe e parole gestendo l'ultima riga senza a capo.
- Ordinare le frequenze con un comparatore totale.
- Scrivere test con `dune test` e gestire gli errori di lettura del file.

## La struttura di `reason-conta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `reason-conta [--top N] [FILE]` | senza file legge stdin |
| `--top N` | intero >= 1, default 5 | limita la stampa |
| separatori | spazi, tabulazioni, a capo | stesso insieme di `wc` |
| exit 0 | successo, anche con input vuoto | il vuoto è un risultato |
| exit 1 | file illeggibile o argomento invalido | errore operativo |

Il layout è quello di ogni progetto dune: libreria in `lib/`, eseguibile in `bin/`, test in `test/`. Il file `.opam` vuoto dice a dune che il progetto è un pacchetto.

```bash
dune build                     # compila libreria, eseguibile e test
dune exec reason_conta -- --top 3 note.txt
printf '' | dune exec reason_conta --   # 0 0 0 con exit 0
dune runtest --force           # riesegue anche i test gia verdi
```

## Il nucleo puro nel modulo `Istogramma`

Il modulo espone due funzioni e un tipo. `conta` riceve la lista delle parole già estratte, quindi non sa nulla di dove vengono; `ordina` applica un comparatore che privilegia la frequenza e usa l'ordine alfabetico come spareggio: un comparatore senza spareggio rende l'output non deterministico.

```reasonml
/* lib/istogramma.re */
type voce = {parola: string, n: int};

let conta = (parole: list(string)) =>
  List.fold_left(
    (acc, p) =>
      switch (List.assoc_opt(p, acc)) {
      | Some(v) => [(p, v + 1), ...List.remove_assoc(p, acc)]
      | None => [(p, 1), ...acc]
      },
    [],
    parole,
  );

/* Frequenza decrescente, poi ordine alfabetico: comparatore totale */
let ordina = voci =>
  List.sort(
    (a, b) => {
      let c = compare(b.n, a.n);
      if (c != 0) {c} else {compare(a.parola, b.parola)};
    },
    voci,
  );

/* List.filteri e' disponibile in OCaml recente; altrimenti si usa List.take */
let top = n => List.filteri((i, _) => i < n);```

Il tipo `voce` costringe a nominare i campi: senza di esso ogni funzione deve ricordare quale posizione della coppia è la parola e quale il numero, e la prima inversione accidentale diventa un bug silenzioso.

```reasonml
/* lib/istogramma.rei : la firma pubblica del modulo */
type voce = {parola: string, n: int};

let conta: list(string) => list((string, int));
let ordina: list((string, int)) => list((string, int));
let top: int => list('a) => list('a);
```

Se l'interfaccia non compila perché `top` riceve tipi diversi da quelli prodotti da `ordina`, hai trovato il disallineamento di contratto prima che diventasse un bug di runtime.

## I/O, argomenti e righe

L'eseguibile non contiene logica di conteggio: legge gli argomenti, apre file o stdin, divide il testo in parole e chiama il modulo. Un testo che non finisce con un a capo ha comunque un'ultima riga, ed è il caso limite che quasi tutte le implementazioni sbagliano.

```reasonml
/* bin/reason_conta.re */
let separa = testo =>
  testo
  |> String.split_on_char('\n') /* righe */
  |> List.concat_map(r => String.split_on_char(' ', r))
  |> List.concat_map(r => String.split_on_char('\t', r))
  |> List.filter(p => p != "" && p != "\r");

let conta_righe = testo =>
  switch (String.length(testo)) {
  | 0 => 0
  | len =>
    let base = ref(1); /* 1 nuova riga per ogni '\n' interno */
    String.iter(c => if (c == '\n') {base := base^ + 1}, testo);
    if (testo.[len - 1] == '\n') {base^ - 1} else {base^};
  };
```

La lettura è dove gli errori diventano visibili: `open_in` solleva `Sys_error` se il file manca, e in Reason si intercetta con `try ... catch` come in OCaml.

```reasonml
let leggi = percorso =>
  switch (percorso) {
  | Some(p) => {
      let ic = open_in(p); /* Sys_error se manca */
      Fun.protect(
        ~finally=() => close_in(ic),
        ~f=() => really_input_string(ic, in_channel_length(ic)), /* testo intero */
      );
    }
  | None => really_input_string(stdin, in_channel_length(stdin))
  };

let () =
  try {
    let argv = Sys.argv;
    let testo = leggi(List.nth_opt(argv, 1)); /* Some file | None stdin */
    Istogramma.conta(separa(testo))
    |> Istogramma.ordina
    |> xs => Istogramma.top(5, xs)
    |> List.iter(v => Printf.printf("%s %d\n", v.parola, v.n));
  } {
  | Sys_error(msg) =>
    Printf.eprintf("reason-conta: %s\n", msg);
    exit(1);
  };
```

## Esercizi

1. Aggiungi `--top N` al parser degli argomenti e un test sul default a 5.
2. Gestisci stdin con percorso `-` e testa un testo senza a capo finale.
3. Rendi `conta` ricorsiva terminale e confrontala su un file da 100 mila parole.
4. Aggiungi `--json` con i campi `righe`, `parole`, `top` e verifica l'ordine con un test.
5. Definisci un tipo `errore` al posto di `Sys_error` e mappa ogni caso su un messaggio e un exit code.
6. Compila con Melange e confronta l'output JavaScript con quello nativo.

<details>
<summary>Soluzione</summary>

1. Si scorre `Sys.argv` con un riferimento `ref(5)` e una funzione che consuma `--top` e il valore. Il test chiama il parser su `[|"reason-conta", "--top", "2"|]` e verifica il risultato senza avviare processi.

2. `leggi(None)` diventa il caso per `-`; il test passa `"ciao mondo"` e verifica che `conta_righe` restituisca 1.

3. `List.fold_left` non alloca stack proporzionale alla lista; la differenza si vede nella memoria, non nel tempo.

4. Il record si serializza con `Printf.sprintf` o una libreria JSON; il test confronta la stringa completa, che blocca l'ordine dei campi.

5. `type errore = | FileNonValido(string) | ArgomentoInvalido(string)` permette a `run` di restituire `result`; i test esercitano ogni caso.

6. L'output Melange finisce sotto `_build/default/app/`; eseguendo `node` gli esiti devono coincidere con la versione nativa, a parte la codifica degli a capo su Windows.

</details>

## Errori comuni

- **Errore**: contare le righe senza il caso di testo vuoto — un input vuoto deve dare zero righe e zero parole, non una riga vuota.
- **Errore**: usare `List.assoc` credendo che non fallisca — con una chiave assente solleva `Not_found` e rompe il conteggio; serve `assoc_opt`.
- **Errore**: ordinare solo per frequenza — senza spareggio alfabetico l'ordine varia tra esecuzioni e i test diventano intermittenti.
- **Errore**: mettere l'I/O nel modulo della libreria — i test diventano lenti e fragili e la funzione non è più riusabile.
- **Errore**: ignorare il parametro `~finally` di `Fun.protect` — un'eccezione nel conto lascia il file aperto e su Windows il successivo `open_in` fallisce.

## In sintesi

Il laboratorio mostra la parte di Reason che conta in pratica: un nucleo puro con firme `.rei`, un eseguibile sottile con `try` e codici di uscita, e test che girano con `dune test`. Il passo successivo è il backend Melange, dove lo stesso modulo deve produrre gli stessi risultati in JavaScript.

## Fonti

- [Reason — Installation](https://reasonml.github.io/docs/en/installation)
- [Reason — Overview](https://reasonml.github.io/docs/en/overview)
- [Reason — Let Bindings](https://reasonml.github.io/docs/en/let-binding)
- [Dune — Build System](https://dune.build/)
- [OCaml — Up and Running (ocaml.org)](https://ocaml.org/docs/up-and-running)
