Reason, spesso chiamato ReasonML, è una sintassi alternativa per OCaml: una macchina tipologica già matura con parentesi graffe, punto e virgola e virgole che ricordano JavaScript. Non è un linguaggio nuovo con un runtime proprio, ma un modo diverso di scrivere moduli `.re` che il compilatore OCaml legge dopo una normalizzazione tramite `refmt`. Capire questa distinzione è la chiave per leggere la sintassi senza confondere ciò che è di Reason con ciò che è di OCaml.

## Obiettivi

- Distinguere cosa appartiene alla sintassi Reason e cosa alla semantica OCaml.
- Dichiarare variabili con `let`, scrivere funzioni e usare l'applicazione con virgole.
- Definire record e varianti e leggere i valori con pattern matching esaustivo.
- Gestire l'assenza di valore con `option` invece di `null` e `undefined`.
- Riconoscere i limiti attuali del progetto e scegliere tra Reason, OCaml e ReScript.

## Il rapporto con OCaml

Reason è nato nel 2016 come strato sintattico: `refmt` converte `file.re` in un AST OCaml compatibile, quindi il codice finale è identico a quello che scriveresti in `.ml`. Non esistono librerie standard separate e non esiste un gestore di pacchetti dedicato: si usa `opam` e i pacchetti OCaml. La documentazione ufficiale lo dice esplicitamente: Reason «leverages the OCaml type system» e dà accesso a tutti gli strumenti di OCaml, compresi il Language Server, `dune` e `opam`.

Tutto ciò che sai di OCaml vale in Reason, e ogni errore del compilatore va letto nel lessico di OCaml: tipi aggiunti automaticamente, `Some` e `None`, moduli aperti di default. Reason cambia la superficie, non la semantica.

| Concetto | Sintassi OCaml | Sintassi Reason |
| --- | --- | --- |
| applicazione | `f a b` | `f(a, b)` |
| record | `{ x = 1; y = 2 }` | `{x: 1, y: 2}` |
| variante | `type t = A \| B of int` | `type t = A \| B(int);` |
| match | `match x with \| ...` | `switch (x) { \| ... }` |
| sequenza | `a; b` | `a; b;` |
| costruttore | `A 3` | `A(3)` |

## Valori, funzioni e tipi

`let` lega un valore e, per default, il binding è immutabile. La mutabilità esiste (`let mut`), ma è opt-in: la documentazione definisce Reason «pure, immutable and functional» fuori da ciò che dichiari esplicitamente. Le funzioni sono valori, si scrivono con `=>` e l'applicazione usa la virgola, quindi non c'è più il problema dell'applicazione parziale accidentale tipico di OCaml.

```reasonml
/* L'inferenza dei tipi evita annotazioni superflue */
let doppio = n => n * 2; /* int -> int dedotto dal compilatore */
let somma = (a, b) => a + b; /* float usa +. e non + */

let nome = "Reason";
let saluto = "Ciao " ++ nome; /* ++ concatena stringhe */

/* I record sono immutabili: aggiornare crea un nuovo valore */
type punto = {x: float, y: float};
let origine = {x: 0.0, y: 0.0};
let trasla = (p, dx) => {...p, x: p.x +. dx};
```

I tipi si dichiarano solo quando servono: `type punto = {x: float, y: float}` è utile perché documenta il contratto, ma il compilatore non richiede annotazioni per le funzioni locali. Le stringhe sono vere stringhe UTF-8 e non array di caratteri; i caratteri singoli si scrivono con apici (`'r'`).

## Varianti, record e pattern matching

Le varianti sono il cuore del linguaggio: un tipo è l'elenco chiuso dei suoi casi, e il compilatore conosce l'insieme completo. Il pattern matching con `switch` è un'espressione, non un'istruzione, e deve coprire tutti i casi oppure generare un warning esplicito.

```reasonml
type forma =
  | Cerchio(float)
  | Rettangolo(float, float);

let area = forma =>
  switch (forma) {
  | Cerchio(r) => 3.14159 *. r *. r
  | Rettangolo(w, h) => w *. h
  };

/* L'assenza di valore è un caso esplicito, non un null */
let trova = (trovati, chiave) =>
  switch (List.assoc_opt(chiave, trovati)) {
  | Some(v) => "trovato: " ++ v
  | None => "assente"
  };
```

L'avviso di esaustività è un vincolo di progetto: aggiungere un caso a `forma` rompe tutte le funzioni che non lo gestiscono, invece di lasciare in giro un valore che nessuno considera. Lo stesso vale per l'avviso di «unused case» quando un ramo non è raggiungibile: la documentazione lo raccomanda proprio per evitare aggiornamenti silenziosi del dominio.

Il vincolo vale anche per i record: se `punto` aggiunge un campo, ogni costruzione `{x: ..., y: ...}` va aggiornata. Il costo è più lavoro immediato e meno lavoro futuro.

## Lo stato attuale del progetto

Reason è oggi un progetto in manutenzione e non la strada principale per nuovi progetti. Lo spiega la stessa FAQ della documentazione: in origine Reason e BuckleScript formavano un'unica toolchain per JavaScript e React, ma nel luglio 2020 BuckleScript ha pubblicato una sintassi propria e si è ribattezzato ReScript come linguaggio autonomo. Il repository `reasonml/reason` non è archiviato e le release continuano, ma la spinta attiva è su ReScript e, per l'ecosistema OCaml, su Melange.

Il percorso consigliato oggi è: Reason con `opam` e `dune` per compilare nativamente o in bytecode, e Melange per emettere JavaScript da codice Reason. BuckleScript non è più il backend predefinito.

```bash
opam switch create . 5.1.0 --deps-only
opam install reason dune
refmt --version      # formattatore e convertitore della sintassi
dune exec hello      # compila ed esegue hello.re
```

Scegliere Reason ha senso se ti interessa l'ecosistema OCaml con una sintassi più familiare; per applicazioni web nuove conviene valutare ReScript, e per codice OCaml puro la sintassi originale resta la più documentata.

## Errori comuni

- **Errore**: considerare Reason un linguaggio con runtime proprio — non esiste: il codice diventa OCaml e usa librerie, compilatore e strumenti di OCaml.
- **Errore**: usare `+` per i float — la somma tra float è `+.`, come in OCaml; `+` è solo per gli interi.
- **Errore**: scrivere `let mut` per abitudine — la mutabilità è da dichiarare solo quando serve, altrimenti si perde la semplicità del modello funzionale.
- **Errore**: gestire `option` con un valore di default silenzioso — `switch` su `Some` e `None` rende esplicito il caso mancante.
- **Errore**: seguire tutorial su BuckleScript/bs-platform — la toolchain attuale è `opam` più `dune` e Melange per il JavaScript.

## In sintesi

Reason è una sintassi per OCaml, non un linguaggio autonomo: `refmt` produce un AST compatibile e il resto dell'ecosistema resta identico. I binding sono immutabili per default, le funzioni usano virgole e `switch` sostituisce `match`. Le varianti chiuse e il pattern matching esaustivo trasformano l'aggiunta di un caso in un errore visibile. Oggi Reason è in manutenzione: ReScript è il successore della linea JSON/BuckleScript e Melange è il backend consigliato per compilare verso JavaScript.

## Fonti

- [Reason — What & Why](https://reasonml.github.io/docs/en/what-and-why)
- [Reason — Pattern Matching](https://reasonml.github.io/docs/en/pattern-matching)
- [Reason — Frequently Asked Questions](https://reasonml.github.io/docs/en/faq)
- [OCaml — Documentation](https://ocaml.org/docs)
- [reasonml/reason su GitHub](https://github.com/reasonml/reason)
