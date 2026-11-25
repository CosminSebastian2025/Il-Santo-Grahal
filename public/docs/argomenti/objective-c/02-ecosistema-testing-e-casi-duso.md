Objective-C vive in un ecosistema preciso: Xcode e Clang, la libreria Foundation, Swift per il codice nuovo e Swift Package Manager per le dipendenze. Sapere quali strumenti fanno cosa, e come si testa oggi, conta più della sintassi per orientarsi in un progetto. Qui passiamo in rassegna strumenti, test e casi d'uso in cui Objective-C resta la scelta corretta.

## Obiettivi

- Ricostruire la catena di strumenti: sorgente `.m`, Clang, linker, runtime, framework.
- Riconoscere i framework usati di più: Foundation, UIKit, AppKit, Metal.
- Scrivere test con XCTest, compresi i test di oggetti che usano categorie e delegati.
- Distinguere il caso d'uso in cui Objective-C è ancora preferibile.
- Integrare codice Objective-C in un progetto Swift senza far esplodere i nomi.

## La catena di strumenti

Il progetto si apre con Xcode, ma compila Clang, e molti progetti richiedono anche un terminale. Bastano tre comandi: `xcodebuild` compila e lancia i test senza interfaccia, `clang` serve per esperimenti isolati, `xcrun` trova gli strumenti nella toolchain corretta.

```bash
xcodebuild -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 16' test
xcodebuild -list -project App.xcodeproj   # elenca target, scheme e configurazioni
```

| Strumento | Ruolo | Quando intervieni |
| --- | --- | --- |
| Xcode | IDE, build system, debugger | uso quotidiano |
| Clang | compilatore C, Objective-C, C++, Swift (frontend) | flag `-fobjc-arc`, warning |
| lldb | debugger | breakpoint, `po oggetto` |
| Instruments | profiling CPU, memoria, rete | prima di ottimizzare |
| XCTest | test unitari e UI | ogni nuova classe model |
| SwiftPM / CocoaPods | gestione dipendenze | quando aggiungi librerie |

La `@implementation` compila in metadati di classe che il runtime registra all'avvio: è il motivo per cui rimuovere una categoria usata altrove lascia l'app in stato incoerente.

## Framework e librerie di base

`Foundation` fornisce gli oggetti di base (`NSString`, `NSArray`, `NSError`, i delegati), `UIKit` e `AppKit` costruiscono l'interfaccia e `Metal` espone la GPU. Gli errori previsti passano da `NSError **`, non dalle eccezioni:

```objectivec
NSError *errore = nil;
NSData *dati = [NSData dataWithContentsOfURL:url options:0 error:&errore];
if (!dati) {
    NSLog(@"lettura fallita: %@", errore.localizedDescription);
    return;
}
```

Le **categorie** permettono di aggiungere metodi a una classe esistente senza toccarne il sorgente; è un'arma doppia, utilissima per estendere Foundation e pericolosa perché il nome collide silenziosamente su tutto il processo:

```objectivec
@interface NSString (Slug)
- (NSString *)slugify;
@end
```

Le **estensioni di classe** (`@interface Nome ()`) restano nel file `.m` e servono a dare implementazione a proprietà private dichiarate nell'intestazione: è il modo idiomatico per isolare i dettagli invece di esporli a chiunque importi l'header.

## Test con XCTest

XCTest è il framework di test che Xcode include, e funziona sia per Objective-C sia per Swift. Un test è un metodo che inizia con `test`, dentro una sottoclasse di `XCTestCase`. Il ciclo è: crea un oggetto, agisci, verifica con un'asserzione.

```objectivec
#import <XCTest/XCTest.h>
#import "Conto.h"

@interface ContoTest : XCTestCase
@end

@implementation ContoTest

- (void)testDepositoAggiornaSaldo {
    Conto *conto = [[Conto alloc] initWithTitolare:@"Lea"];
    [conto deposita:25.0];
    XCTAssertEqualWithAccuracy(conto.saldo, 25.0, 0.001);
    // senza differenza il saldo è un double: confrontare con == è un classico
}

- (void)testDepositoNegativoSollevaEccezione {
    Conto *conto = [[Conto alloc] initWithTitolare:@"Lea"];
    XCTAssertThrows([conto deposita:-1]);
}
@end
```

I test asincroni devono usare `XCTestExpectation` e `waitForExpectationsWithTimeout:`, altrimenti passano prima del callback. I test di UI (`XCUIApplication`) costano secondi: meglio spostare la logica in modelli testabili. Per i delegati basta un doppio minimo, una classe che registra le chiamate.

## Casi d'uso reali e convivenza con Swift

Objective-C resta sensato in tre contesti. Il **codice legacy**: progetti con migliaia di file non si riscrivono, si estendono. L'**interoperabilità**: esporre C++ o usare API ancora fatte a mano in Objective-C. Il codice **vicino al runtime**, dove `method_exchangeImplementations` e `NSInvocation` non hanno equivalenti in Swift.

La convivenza passa da un bridging header: Swift vede l'Objective-C importato, e l'Objective-C vede Swift tramite il `-Swift.h` generato da Xcode. Le classi Swift esposte devono ereditare da `NSObject` o essere marcate `@objc`. La mappatura dei nomi è la fonte più comune di confusione.

```objectivec
// ObjC chiama Swift generato: import "Modulo-Swift.h"
#import "Modulo-Swift.h"
Rendiconto *r = [[Rendiconto alloc] initWithPeriodo:3];
```

Criterio utile: Swift per le parti nuove e le API pubbliche, Objective-C dove il framework lo richiede, moduli separati e testati.

## Errori comuni

- **Aggiungere categorie con nomi generici**: `-[NSString format]` collide con un'altra libreria e il linker non lo segnala sempre.
- **Usare eccezioni per errori previsti**: in Objective-C si usa `NSError **`, le eccezioni sono per bug.
- **Dimenticare l'header bridging in un target misto**: i simboli ObjC non esistono per Swift e l'errore sembra sbagliato.
- **Testare un blocco asincrono senza expectation**: il test passa prima che il callback parta.
- **Affidarsi a `xcodebuild` senza `-destination`**: la destinazione di default cambia da macchina a macchina.

## In sintesi

Clang compila, il runtime registra, Foundation fornisce gli oggetti e XCTest verifica. Categorie ed estensioni sono il modo idiomatico per estendere classi e isolare dettagli. Il linguaggio resta centrale nel legacy Apple e nell'interoperabilità con C++; con Swift si convive modulo per modulo, con bridging header espliciti.

## Fonti

- [Apple - Testing with Xcode](https://developer.apple.com/documentation/xcode/testing), guida ufficiale su XCTest, test unitari e test di UI.
- [Apple - Foundation](https://developer.apple.com/documentation/foundation), riferimento della libreria di base: `NSString`, `NSArray`, `NSError`.
- [Apple - Defining Classes](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/DefiningClasses/DefiningClasses.html), proprietà, estensioni e categorie spiegate dalla fonte.
- [Apple - Importing Objective-C into Swift](https://developer.apple.com/documentation/swift/importing-objective-c-into-swift), bridging header e mappatura dei nomi.
