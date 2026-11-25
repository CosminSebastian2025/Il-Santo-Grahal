Reason non introduce strumenti nuovi: si appoggia alla toolchain OCaml, cioè `opam` per i pacchetti, `dune` per la build e Melange per emettere JavaScript. In questa lezione vedi come nasce un progetto Reason `.re`, come si scrivono e si eseguono i test, e quali attrezzi convertono o formattano il codice tra le due sintassi. Il punto non è memorizzare comandi, ma capire dove finisce Reason e dove inizia OCaml.

## Obiettivi

- Installare Reason con `opam` e strutturare un progetto con `dune`.
- Separare un nucleo puro da testabili da I/O e da formattazione.
- Scrivere test usando `dune test` e le asserzioni dell'ecosistema.
- Interagire con JavaScript tramite Melange, dune e moduli esterni.
- Scegliere consapevolmente tra Reason, OCaml e ReScript per un nuovo progetto.

## Un progetto con opam e dune

La documentazione ufficiale consiglia `opam` anche se esistono alternative come `esy`. Il flusso minimo crea uno switch, installa `reason` e `dune` e verifica che `refmt` risponda: se manca `refmt`, dune non riconosce i file `.re`.

```bash
opam init -y
eval $(opam env)
opam switch create . 5.1.0 --deps-only
opam install reason dune
refmt --version
```

Il progetto ha quattro file: `dune-project` con la versione del linguaggio dune, un `.opam` vuoto, un `dune` con la stanza `executable` e un `hello.re`. Non servono import: un modulo `Hello` fa cercare al compilatore `hello.re` e la sua interfaccia `hello.rei`. Questa regola, descritta nella FAQ, spiega perché nei progetti Reason non vedi righe di `import`.

| File | Ruolo | Note |
| --- | --- | --- |
| `dune-project` | versione e lingua del progetto | `(lang dune 3.6)` |
| `dune` | regole di build del modulo | `(executable (name hello))` |
| `hello.re` | sorgente Reason | formattato da `refmt` |
| `hello.rei` | interfaccia opzionale | firma pubblica del modulo |

## Nucleo puro, moduli e test

Il modo più sano di strutturare un progetto Reason è lo stesso di OCaml: funzioni pure nei moduli della libreria, `dune test` per l'esecuzione, e un eseguibile sottile che fa I/O. Il compilatore non ti obbliga a separare, ma i tipi delle firme `.rei` rendono visibile quanto un modulo espone.

```reasonml
/* lib/istogramma.re */
type voce = {parola: string, n: int};

/* Conteggio puro: nessun accesso a file o stdout */
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

let ordina = voci =>
  List.sort((a, b) => compare(b.n, a.n), voci); /* decrescente per frequenza */
```

Le firme `.rei` sono la documentazione compilata: se esporti solo `conta` e `ordina`, chi consuma il modulo non dipende dai dettagli interni. La combinazione con dune è diretta: ogni directory con un file `dune` è una libreria o un eseguibile.

Il test sopra evidenzia un altro punto: i dati si confrontano per struttura, non per identità. `check` riceve un comparatore di tipo generato da `list(pair(string, int))`, quindi un errore di ordine delle voci fallisce il test con un diff leggibile invece di passare per l'uguaglianza di un oggetto JavaScript. È esattamente la proprietà che rende gli esempi in Reason facili da verificare.

```reasonml
/* test/test_istogramma.re */
open Alcotest; /* libreria di test diffusa nell'ecosistema OCaml */

let suite =
  test_case("conta parole", `Quick, () =>
    check(
      (list(pair(string, int))),
      "istogramma atteso",
      [("ciao", 2), ("mondo", 1)],
      Istogramma.conta(["ciao", "mondo", "ciao"]),
    )
  );
```

La stanza `(test (name test_istogramma) (libraries istogramma alcotest))` fa sì che `dune test` compili ed esegua i casi; `dune runtest --force` rieseguirà anche ciò che dune considererebbe già verificato.

## Verso JavaScript con Melange

Per il browser il backend consigliato è Melange, che emette JavaScript leggibile e uno a uno con i moduli OCaml. Si installa con `opam install melange`, si abilita in `dune-project` e si compila con una stanza `melange.emit`. Il risultato finisce sotto `_build/default/app/`.

```bash
opam install melange
dune build @melange   # compila solo le stanze melange.emit
dune build            # compila l'intero progetto
```

Due dettagli contano in produzione. Primo, le librerie destinate al browser devono dichiarare `(modes melange)` oltre ai modi nativi. Secondo, Reason non emette più direttamente codice JS con BuckleScript: la documentazione indica Melange come partner attuale per il JavaScript, mentre ReScript procede per conto suo con una sintassi derivata da Reason ma non identica.

L'interfaccia con il mondo JavaScript si fa con gli `external`, cioè dichiarazioni di tipi per funzioni che esistono già nel runtime ospite. Un `external` non ha corpo: dice al compilatore la firma e lascia al backend il compilato effettivo. Se la firma mente, il compilatore offre una garanzia falsa, quindi conviene tenere questi binding in moduli piccoli con un test che li esercita.

```reasonml
/* Binding a una funzione globale del browser */
[@mel.val] [@mel.scope "Math"] external floor: float => int = "floor";

/* Un tipo di evento tipizzato, invece di any */
type evento = {key: string};

[@mel.val] external addEventListener: (string, evento => unit) => unit =
  "addEventListener";

let registra = cb => addEventListener("keydown", cb);
```

Con Melange gli attributi sono `mel.*` (`@mel.val`, `@mel.scope`, `@mel.module`) e sostituiscono i `bs.*` storici di BuckleScript; la sintassi è simile ma non identica, e per i progetti nuovi la documentazione del backend è la fonte da consultare, non i post del 2019. Il formato del sorgente resta invece stabile: `refmt --in-place src/*.re` riscrive i file secondo lo stile canonico, e `refmt --parse ml` converte in un senso.

## Errori comuni

- **Errore**: eseguire `opam install reason` senza `dune` — senza dune non c'è build, e senza `refmt` dune non legge i file `.re`.
- **Errore**: scrivere `import` a mano — i moduli si trovano dal nome del file; un import non esiste e non compila.
- **Errore**: testare la CLI invece del nucleo — i test su funzioni pure costano millisecondi, quelli su stdin e file costano processi e fixture.
- **Errore**: mescolare Melange e librerie native con `modes` sbagliati — una libreria nativa non è utilizzabile dal codice emesso per il browser.
- **Errore**: copiare esempi di BuckleScript da blog vecchi — `bs-platform`, `bsb` e i `Js.*` storici non sono più la toolchain consigliata.

## In sintesi

Il tooling di Reason è il tooling di OCaml: opam, dune, refmt e l'interfaccia `.rei`. Un progetto sano separa il nucleo puro, testato con dune, dall'eseguibile che fa I/O. Per il web si usa Melange come backend OCaml, non più BuckleScript. Ricordare che Reason è una sintassi in manutenzione evita di rincorrere pacchetti e tutorial sbagliati, e orienta verso Melange o ReScript a seconda che si voglia il JavaScript moderno o la continuità con l'ecosistema OCaml.

## Fonti

- [Reason — Installation](https://reasonml.github.io/docs/en/installation)
- [Reason — Compiling to JavaScript with Melange](https://reasonml.github.io/docs/en/compiling-to-js-with-melange)
- [ocaml/opam — Package Repository](https://opam.ocaml.org/)
- [Dune — Build System](https://dune.build/)
- [Reason — External (binding JavaScript)](https://reasonml.github.io/docs/en/external)
