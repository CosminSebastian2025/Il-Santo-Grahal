Il linguaggio da solo non basta: la forza di Swift sta nell'ecosistema che ruota intorno a Swift Package Manager (SwiftPM), al compilatore `swiftc` e a XCTest. Questi strumenti sono installati insieme alla toolchain, quindi un progetto può dichiarare dipendenze, compilare e testare senza plugin di terze parti. In questa lezione vedi come si organizza un pacchetto, come si scrivono i test e in quali domini Swift viene scelto ancora oggi.

## Obiettivi

- Installare una toolchain e riconoscere i comandi di `swift` e `swiftc`.
- Dichiarare target, prodotti e dipendenze nel `Package.swift`.
- Scrivere test con XCTest e lo Swift Testing, integrandoli in CI.
- Conoscere le librerie di riferimento per networking, dati e server.
- Riconoscere i casi d'uso reali di Swift oltre l'app iOS.

## Toolchain e comandi

Una toolchain contiene compiler, SDK, SwiftPM e debugger. Su macOS arriva con Xcode o con i Command Line Tools; su Linux si scarica da swift.org; entrambe le installazioni espongono gli stessi comandi.

```bash
swift --version                  # versione della toolchain
swift repl                       # REPL interattivo
swift run                        # compila ed esegue l'eseguibile del pacchetto
swift test                       # esegue la suite di test
swift package describe           # elenca target, prodotti e dipendenze
```

`swiftc` compila un singolo file o un modulo senza progetto. Su Linux serve anche la libreria runtime, che la toolchain installa nel sistema; non esiste un JVM o un interprete da avviare, il binario è nativo.

| Comando | Scopo | Uso tipico |
| --- | --- | --- |
| `swift package init` | crea lo scheletro | nuovo pacchetto |
| `swift build` | compila tutti i target | verifica rapida |
| `swift test` | esegue i test | locale e CI |
| `swift run <exe>` | esegue un eseguibile | prove manuali |
| `swift package resolve` | risolve le dipendenze | dopo il cambio di `Package.swift` |

## Il pacchetto e le dipendenze

`Package.swift` è codice Swift eseguito da SwiftPM: dichiara la versione, i prodotti e le dipendenze, ciascuna fissata a un intervallo semver. La cartella `Sources/` contiene i target, `Tests/` la suite di test; i file sono moduli, non servono file di intestazione.

```swift
// Package.swift
import PackageDescription

let package = Package(
    name: "conta",
    platforms: [.macOS(.v13)],
    products: [.executable(name: "conta", targets: ["conta"])],
    dependencies: [
        .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.3.0"),
    ],
    targets: [
        .target(name: "Conteggi"),                       // libreria testabile
        .executableTarget(name: "conta", dependencies: ["Conteggi"]),
        .testTarget(name: "ConteggiTests", dependencies: ["Conteggi"]),
    ]
)
```

Separare la logica in una libreria e l'eseguibile in un target sottile è la struttura standard: i test importano la libreria senza avviare un processo. `Package.resolved` blocca le versioni esatte, e va committato insieme al codice. Per i comandi CLI `swift-argument-parser` genera help, validazione e parsing delle opzioni.

```bash
git clone https://github.com/apple/example-package-dealer.git
cd example-package-dealer
swift test                       # clona le dipendenze e compila
swift run Dealer                 # esegue l'esempio
```

## Test con XCTest

XCTest è il framework storico: ogni test è un metodo `test...` in una classe che eredita da `XCTestCase`. Le asserzioni dichiarano l'atteso e il messaggio utile in caso di fallimento.

```swift
import XCTest
@testable import Conteggi

final class ConteggiTests: XCTestCase {
    func testRigheConUltimaSenzaACapo() {
        let c = righeParoleByte("ciao\nmondo")
        XCTAssertEqual(c.righe, 2)          // ultima riga contata
        XCTAssertEqual(c.parole, 2)
    }

    func testInputVuoto() {
        XCTAssertEqual(righeParoleByte("").byte, 0)   // il vuoto è un risultato
    }
}
```

`@testable import` espone le dichiarazioni `internal`, mentre i test black-box usano `import`. Una funzione che lancia viene verificata con `XCTAssertThrowsError`; le finestre asincrone si gestiscono con `async` e `XCTestExpectation`. Dal 2024 lo Swift Testing offre macro come `@Test` e `#expect`, più parallele e leggibili, ma XCTest resta supportato e conveniente per l'interop.

| Strumento | Forma | Quando usarlo |
| --- | --- | --- |
| XCTest | classi `XCTestCase` | misurazioni di performance, UI test |
| Swift Testing | `@Test` e `#expect` | logica pura, test parametrici |
| `swift test --filter` | filtro per nome | esecuzione mirata |
| Test Plan in Xcode | file `.xctestplan` | configurazioni diverse in CI |

## Ecosistema e casi d'uso

Intorno al core si sono consolidati progetti che coprono i bisogni tipici di un'app e non solo. Concurrency con `async`/`await` e `actor` è parte del linguaggio, non una libreria; Foundation fornisce JSON, rete, calendari e file. Sul server il framework Vapor e i driver SwiftNIO di Apple usano la stessa toolchain, e il binario risultante è nativo e leggero.

| Ambito | Progetto | Nota |
| --- | --- | --- |
| SDK Apple | Foundation, SwiftUI, UIKit | app per iOS e macOS |
| server | Vapor, SwiftNIO | HTTP asincrono su Linux |
| Android | Kotlin/Swift interop | condivisione di logica nativa |

Swift sta entrando anche nell'interop con C e C++: il compilatore legge intestazioni C e C++ senza un layer separato, e il ponte con Objective-C resta disponibile per le API più vecchie. Questo lo rende una scelta competitiva dove servono prestazioni e sicurezza del tipo insieme.

## Errori comuni

- **Mettere la logica nell'eseguibile**: i test importano solo target libreria; senza estrazione, la logica resta non testabile.
- **Fissare una dipendenza senza versione**: `from:` o `exact:` sono obbligatori, altrimenti l'aggiornamento rompe la build in modo silenzioso.
- **Ignorare `Package.resolved`**: le versioni risolte cambiano tra macchine e ambienti CI, e il fallimento arriva in produzione.
- **Testare solo con input nominale**: caso vuoto, input con caratteri Unicode e file mancante sono quelli che rompono lo strumento.
- **Scegliere XCTest per ogni cosa**: per la logica pura lo Swift Testing è più veloce e leggibile.

## In sintesi

SwiftPM dichiara prodotti, target e dipendenze in un file Swift, e `swift test` esegue la suite. XCTest resta lo standard per UI e performance, lo Swift Testing è il futuro per la logica. La struttura con libreria più eseguibile sottile rende il progetto testabile e portabile su Linux. Il laboratorio successivo mette insieme tutto questo in una CLI.

## Fonti

- [Swift Packages](https://www.swift.org/packages/), documentazione ufficiale su come creare e pubblicare pacchetti SwiftPM.
- [Swift Package Manager (github)](https://github.com/swiftlang/swift-package-manager), codice sorgente e changelog del gestore di pacchetti.
- [SwiftPM - Documentation](https://www.swift.org/documentation/package-manager/), guida alla struttura di `Package.swift` e alla risoluzione delle dipendenze.
- [Swift.org - Server documentation](https://www.swift.org/documentation/server/), strumenti e librerie per il codice Swift su Linux.
- [Swift Package Index](https://swiftpackageindex.com/), catalogo verificato dei pacchetti e del loro stato di compatibilità.
