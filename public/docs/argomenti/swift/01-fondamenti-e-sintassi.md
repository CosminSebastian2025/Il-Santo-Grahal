Swift è il linguaggio creato da Apple per iOS, macOS, watchOS e tvOS, open source dal 2015 e disponibile anche su Linux e Windows. Combina sicurezza del tipo, value type e gestione della memoria senza garbage collector: il compilatore inserisce retain e release nel conteggio dei riferimenti. Qui impari la sintassi di base, il sistema dei tipi e i meccanismi che rendono Swift leggibile senza rinunciare al controllo.

## Obiettivi

- Dichiarare costanti e variabili con `let` e `var`, usando il tipo corretto.
- Distinguere `struct`, `enum` e `class` e sapere quando ognuna è la scelta giusta.
- Scrivere funzioni con etichette di argomento, closure ed errori con `throw`.
- Gestire l'assenza di valore con `Optional`, `if let`, `guard` e `??`.
- Compilare ed eseguire il primo programma con il toolchain `swift`.

## Costanti, variabili e tipi

Swift è fortemente tipizzato ma inferisce i tipi dal valore. `let` dichiara una costante, `var` una variabile: il compilatore rifiuta l'assegnazione a una costante, e il lettore sa subito cosa può cambiare.

```swift
let nome = "Ada"                 // String, immutabile
var contatore = 0                // Int, inferito
contatore += 1                   // consentito perché var

let media: Double = 7.5          // annotazione esplicita del tipo
print("\(nome) ha contato \(contatore) volta, media \(media)")
```

Non esiste conversione implicita tra tipi numerici: `Int` e `Double` non si sommano e serve `Double(contatore)`. Le tuple raggruppano valori di tipi diversi senza dichiarare una struct.

| Forma | Parola chiave | Copia o riferimento | Uso tipico |
| --- | --- | --- | --- |
| struct | `struct` | valore (copia) | modelli, punti, configurazioni |
| enum | `enum` | valore | stati, risultati, casi esaustivi |
| class | `class` | riferimento | identità condivisa, ereditarietà |
| protocol | `protocol` | contratto | astrazione e polimorfismo |
| closure | `{ ... }` | riferimento catturato | callback, trasformazioni |

La regola pratica è preferire `struct` ed `enum`, che sono value type e non subiscono modifiche inattese altrove. Le `class` servono quando più parti devono condividere la stessa istanza.

## Funzioni, closure e controllo di flusso

Le funzioni hanno etichette di argomento: il nome usato da chi chiama può differire da quello interno. Si scrivono quindi firme come `aggiungi(elemento, a: lista)`, dove `_` sopprime l'etichetta esterna.

```swift
func somma(_ valori: Int...) -> Int {   // variadic, etichetta esterna soppressa
    valori.reduce(0, +)
}

func saluta(_ nome: String, con saluto: String = "Ciao") -> String {
    "\(saluto), \(nome)!"
}

let quadrati = (1...5).map { $0 * $0 }    // closure abbreviate: $0 è l'argomento
let pari = quadrati.filter { $0 % 2 == 0 }
print(saluta("Ada"), somma(1, 2, 3), pari)
```

`if` e `switch` non richiedono parentesi; nel `switch` ogni caso non ha fallthrough e il compilatore pretende casi esaustivi. Le range expression (`1...5`, `0..<n`) sono tipi di prima classe e si usano anche per accedere a porzioni di array.

| Costrutto | Esempio | Nota |
| --- | --- | --- |
| `switch` | `case .success(let v):` | nessun fallthrough, esaustivo |
| label di ciclo | `outer: for ... { break outer }` | uscite esplicite |
| array e dizionari | `[Int]`, `[String: Double]` | `var` per mutare |
| funzione valore | `func f() -> Int { 1 }` | corpo di una sola riga |

## Optional e gestione degli errori

Un `Optional` contiene un valore oppure `nil`. Il compilatore non permette di usarlo come se fosse sempre presente: bisogna estrarlo, e in questo Swift è più severo di Java o C# sulle reference null.

```swift
let forseNumero: Int? = Int("42")   // nil se la stringa non è un numero

if let numero = forseNumero {
    print("numero valido: \(numero)")
} else {
    print("input non numerico")
}

func valida(_ testo: String) -> String {
    guard let n = Int(testo), n > 0 else { return "valore non valido" }
    return "ok: \(n)"                // n disponibile dopo il guard
}
```

`if let` introduce il valore solo nel proprio blocco, `guard let` lo rende disponibile per il resto della funzione e obbliga a uscire nel ramo `else`. `??` fornisce un valore predefinito. Gli errori veri e propri sono valori conformi a `Error`, lanciati con `throw` e gestiti con `do`/`catch`.

```swift
enum ErroreMagazzino: Error { case giacenzaInsufficiente(Int) }

func preleva(_ pezzi: Int, disponibili: Int) throws -> Int {
    guard pezzi <= disponibili else {
        throw ErroreMagazzino.giacenzaInsufficiente(disponibili)
    }
    return disponibili - pezzi
}

do {
    print("restano \(try preleva(5, disponibili: 3))")
} catch ErroreMagazzino.giacenzaInsufficiente(let n) {
    print("solo \(n) pezzi disponibili")
}
```

## Protocol e value semantics

I protocolli definiscono capacità senza implementazione e una struct può conformarsi a più protocolli: è il polimorfismo che sostituisce gran parte dell'ereditarietà multipla. Le extension aggiungono metodi a tipi esistenti senza toccarne il sorgente.

```swift
protocol Forma {
    var area: Double { get }
}

extension Forma {
    func descrizione() -> String { "area \(area)" }   // implementazione predefinita
}

struct Cerchio: Forma {
    let raggio: Double
    var area: Double { .pi * raggio * raggio }        // proprietà calcolata
}

let forme: [any Forma] = [Cerchio(raggio: 1)]
for f in forme { print(f.descrizione()) }
```

Il tipo `any Forma` è una **existential**: contiene qualsiasi implementazione, ma usa dispatch dinamico. Dove il tipo concreto è noto, il compilatore risolve le chiamate a compile time e il costo sparisce.

## Errori comuni

- **Trattare `let` come decorazione**: usare `var` per abitudine perde l'invariante garantita dal compilatore.
- **Forzare l'optional con `!`**: `Int("ciao")!` va in crash a runtime; usa `guard let` o `??` per gestire l'assenza.
- **Aspettarsi conversione implicita tra numeri**: `Int` e `Double` non si mescolano, serve `Double(x)` con controllo del range.
- **Usare `class` dove basta una `struct`**: l'aliasing porta a modifiche non previste; la copia per valore elimina questa classe di bug.
- **Contare i byte di una stringa**: `count` conta i caratteri Unicode percepiti, non i byte; per i byte serve `utf8`.

## In sintesi

Swift rende espliciti mutabilità, assenza di valore e capacità tramite `let`/`var`, `Optional` e `protocol`. I value type evitano l'aliasing, mentre le classi restano per l'identità condivisa. Gli errori sono tipizzati con `throw`/`catch`, e `map` e `filter` rendono il codice dati-centric. Il prossimo passo è il toolchain: Package Manager, test e dipendenze.

## Fonti

- [The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/), manuale ufficiale del linguaggio, aggiornato a ogni release.
- [The Basics](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/), costanti, variabili, optional e collezioni.
- [Error Handling](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/), `throw`, `do`/`catch`, `try` e `defer`.
- [Protocols](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/), contratti, extension e composizione.
- [Swift.org - Documentation](https://www.swift.org/documentation/), punto d'ingresso a guide, articoli e riferimento del toolchain.
