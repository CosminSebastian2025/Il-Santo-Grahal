In questo laboratorio costruisci `swift-conta`, una CLI che legge un file o stdin e stampa righe, parole e byte, scritta come pacchetto SwiftPM con una libreria testabile e un eseguibile sottile. Serve a esercitare i pezzi di un programma Swift reale: argomenti, I/O, optional, errori tipizzati e test. Alla fine avrai un binario nativo e una suite che gira con `swift test` anche su Linux.

## Obiettivi

- Disegnare un contratto CLI con opzioni e codici di uscita coerenti.
- Leggere file o stdin con `Foundation` e trattare l'assenza come valore.
- Contare righe, parole e frequenze con `Dictionary` e funzioni pure.
- Gestire errori operativi con `throw` e mapparli sul codice di uscita.
- Scrivere test XCTest sul nucleo della libreria, senza avviare processi.

## Il contratto di `swift-conta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `swift-conta [OPZIONI] [FILE]` | senza file legge stdin |
| `-w, --words` | attiva le frequenze | modalità aggiuntiva |
| `-n, --top N` | intero >= 1, default 5 | limite di stampa |
| `-j, --json` | output su una riga | consumo da script |
| exit 0 | successo | anche con conteggi a zero |
| exit 1 | file illeggibile o uso errato | errore operativo |

Senza argomenti e con stdin vuoto il programma stampa zeri ed esce con 0: il vuoto è un risultato. Un file che non si apre è invece un errore operativo, scritto su stderr.

```bash
swift build
echo "ciao swift ciao" | .build/debug/swift-conta -w -n 2
swift run swift-conta README.md
printf 'exit: %s\n' "$?"
```

## Core: funzioni pure sui conteggi

Il nucleo è una funzione pura su `String`, senza I/O: riceve il testo, restituisce una struct. Così è banale da testare e il codice di lettura resta separato dal formato di output.

```swift
import Foundation

public struct Conteggi: Equatable {
    public let righe: Int
    public let parole: Int
    public let byte: Int
}

public func conta(_ testo: String) -> Conteggi {
    // split conserva le righe vuote: il testo vuoto vale zero righe
    let righe = testo.isEmpty ? 0 : testo.split(separator: "\n", omittingEmptySubsequences: false).count
    let parole = testo.split(whereSeparator: \.isWhitespace).count
    let byte = testo.utf8.count                       // byte UTF-8, non caratteri
    return Conteggi(righe: righe, parole: parole, byte: byte)
}
```

`split` distingue le righe anche con gli a capo finali, e i byte si contano con `utf8` perché `count` conta i caratteri percepiti da Unicode. Le frequenze usano un `Dictionary` con valore predefinito.

```swift
public func frequenze(_ testo: String, top: Int) -> [(String, Int)] {
    var freq: [String: Int] = [:]
    for parola in testo.split(whereSeparator: \.isWhitespace) {
        freq[String(parola), default: 0] += 1         // default: niente unwrap
    }
    return freq.sorted { $0.value > $1.value || ($0.value == $1.value && $0.key < $1.key) }
               .prefix(top)                           // ordine stabile come criterio
               .map { ($0.key, $0.value) }
}

public func leggi(da percorso: String?) throws -> String {
    guard let percorso else {                              // stdin
        let dati = FileHandle.standardInput.readDataToEndOfFile()
        return String(decoding: dati, as: UTF8.self)
    }
    return try String(contentsOfFile: percorso, encoding: .utf8)
}
```

`default:` elimina l'unwrap nella mappa, e la chiave fa da spareggio per un ordine stabile. `run` implementa il contratto, `main` contiene solo argomenti ed exit code.

```swift
public enum Uso: Error { case opzioneSconosciuta(String), troppiFile }

public func run(_ argomenti: [String]) throws -> String {
    var file: String?
    for argomento in argomenti {
        if argomento.hasPrefix("-") { throw Uso.opzioneSconosciuta(argomento) }
        guard file == nil else { throw Uso.troppiFile }
        file = argomento
    }
    let testo = try leggi(da: file)
    let c = conta(testo)
    return "\(c.righe) \(c.parole) \(c.byte)\n"
}
```

## Errori, exit code e test

Le opzioni (`-w`, `-n`, `-j`) sono la parte da completare negli esercizi. Il `main` traduce l'errore in stderr ed exit 1, lasciando stdout pulito.

```swift
import Foundation

let codice: Int32 = {
    do {
        print(try run(Array(CommandLine.arguments.dropFirst())), terminator: "")
        return 0
    } catch {
        FileHandle.standardError.write(Data("swift-conta: \(error)\n".utf8))
        return 1
    }
}()
exit(codice)
```

I test importano la libreria e confrontano valori, senza avviare processi. I casi che leggono file usano `FileManager.temporaryDirectory` e puliscono con `defer`.

```swift
final class ConteggiTests: XCTestCase {
    func testContaRigheEParole() {
        let c = conta("ciao swift\nciao lua")     // ultima riga senza a capo
        XCTAssertEqual(c.righe, 2)
        XCTAssertEqual(c.parole, 4)
    }

    func testUsoErrato() {
        XCTAssertThrowsError(try run(["-x"])) { errore in
            guard case Uso.opzioneSconosciuta = errore else {
                return XCTFail("atteso opzione sconosciuta")
            }
        }
        XCTAssertEqual(conta("").byte, 0)          // input vuoto senza crash
    }
}
```

Il criterio da verificare a mano è breve: `printf '' | swift run swift-conta` deve dare `0 0 0` ed exit 0, mentre `swift run swift-conta /non/esiste` deve uscire con 1 scrivendo su stderr.

## Esercizi

1. Aggiungi `-s, --sort nome|freq` per ordinare le parole, con default `freq`.
2. Rendi `--json` stabile con i campi `righe`, `parole`, `byte` e `top`.
3. Leggi input non UTF-8 senza rompere il conteggio.
4. Aggiungi `-n N` con validazione `N >= 1` e test per zero e valore non numerico.
5. Distingui file mancante e permesso negato.
6. Misura `swift build -c release` su un file da 10 MiB e spiega dove si perde tempo.

<details>
<summary>Soluzione</summary>

1. `run` accumula le opzioni in una struct `Opzioni` e chiama `frequenze` con il criterio richiesto.

2. Si serializza con `JSONEncoder` e `Codable`, mappando le tuple in struct con chiavi `parola` e `n`; il test confronta la stringa con `XCTAssertEqual`.

3. `String(decoding:as: UTF8.self)` sostituisce i byte non validi con U+FFFD, e i byte si contano sui `Data` grezzi.

4. Il parser verifica `Int(argomento)` e `>= 1`, lanciando `Uso.valoreNonValido`; i test coprono `0`, `abc` e `5`.

5. `FileManager` verifica l'esistenza prima della lettura; l'errore di sistema si cattura con `as? CocoaError`.

6. Il tempo va quasi tutto nella lettura e nella scansione; un conteggio a blocchi evita di allocare tutto il testo.

</details>

## Errori comuni

- **Aprire lo stesso file due volte**: il flusso di stdin è già consumato e la seconda lettura restituisce testo vuoto senza errore.
- **Contare i caratteri invece dei byte**: `conta.count` non coincide con `conta.utf8.count` su accenti ed emoji.
- **Scrivere errori su stdout**: rompe le pipe degli script, che canalizzano stdout; gli errori vanno su stderr.
- **Crashare con `!` sugli argomenti**: `CommandLine.arguments[1]` va in fatal error senza argomenti; usa `dropFirst()`.
- **Testare solo l'input felice**: il caso vuoto e il file mancante sono quelli che rompono le pipeline.

## In sintesi

Hai separato la libreria testabile (`conta`, `frequenze`, `run`) dal `main`, che gestisce solo processo ed exit code. Le funzioni pure rendono i test istantanei. Il passo successivo è l'ordinamento configurabile, che tocca solo l'output.

## Fonti

- [Swift Package Manager - Documentation](https://www.swift.org/documentation/package-manager/), comandi e configurazione del pacchetto usato nel laboratorio.
- [The Basics](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/), optional e `guard let` per gli argomenti.
- [Error Handling](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/), `throw` e mappatura degli errori sul codice di uscita.
- [Strings and Characters](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/), stringhe e vista UTF-8 per il conteggio dei byte.
- [Swift.org - Installing Swift on Linux](https://www.swift.org/install/linux/), toolchain su Linux per CI e container.
