Objective-C++ entra nei progetti quando c'è una libreria C++ da usare da un'app Apple, e lì contano build, test e confini più della grammatica. Le decisioni sono tre: lo standard di `.mm`, l'isolamento del C++ dietro un'API Objective-C testabile e la verifica dei confini di memoria ed errori.

## Obiettivi

- Configurare Xcode e Clang per un modulo Objective-C++ con uno standard C++ esplicito.
- Esportare C++ verso Objective-C e verso Swift tramite un'interfaccia ponte stabile.
- Diagnosticare crash e perdite con Instruments e Address Sanitizer.
- Scrivere test del ponte con XCTest e un modulo C++ indipendente dal framework.
- Riconoscere i casi d'uso in cui il ponte è la soluzione giusta.

## Strumenti e configurazione

Xcode compila i `.mm` con Clang, ma standard C++ e librerie di sistema non sono neutri. `CLANG_CXX_LANGUAGE_STANDARD` fissa lo standard, `HEADER_SEARCH_PATHS` e `OTHER_LDFLAGS` coprono include e librerie. Per il C++ puro conviene SwiftPM con un pacchetto precompilato.

```bash
xcodebuild -scheme Motore -destination 'platform=iOS Simulator,name=iPhone 16' \
  CLANG_CXX_LANGUAGE_STANDARD=c++17 build
```

| Strumento | Ruolo nell'Objective-C++ | Quando usarlo |
| --- | --- | --- |
| Clang | compilazione `.mm`, warning sui tipi misti | sempre |
| Xcode build settings | standard C++, header e linker | setup del target |
| lldb | breakpoint su frame C++ e ObjC insieme | crash nel ponte |
| AddressSanitizer | buffer overflow, use-after-free C++ | test e CI |
| Instruments | allocazioni, leak, CPU | prima di ottimizzare |
| XCTest | test dell'API Objective-C esposta | ogni classe ponte |
| CMake | build del solo C++ multipiattaforma | libreria condivisa |

La combinazione più robusta è un modulo C++ compilato da CMake e incluso come pacchetto, più un ponte `.mm` minimo: il primo si testa su CI, il secondo con XCTest.

## Progettare il ponte

Un ponte sano espone pochi metodi Objective-C e nasconde `std::string`, `std::vector` e i template: chi usa l'API in Swift non vede C++, e cambiare un tipo C++ non rompe dieci file ObjC.

```objectivec
// MotoreAPI.h — superficie pubblica, nessun tipo C++
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface Motore : NSObject
- (instancetype)init;
- (BOOL)importaTesto:(NSString *)testo errore:(NSError **)errore;
- (NSArray<NSString *> *)suggerimentiPer:(NSString *)prefisso limite:(NSUInteger)limite;
@end

NS_ASSUME_NONNULL_END
```

L'header pubblico non importa header C++. Le conversioni avvengono nel `.mm` (`std::string` da `UTF8String`) e un `catch (...)` che converte in `NSError` impedisce a un errore C++ di attraversare il runtime ObjC.

Una classe C++ non ha equivalente Swift: ereditarietà, costruttori e distruttore non si mappano. La classe Objective-C intermedia fa sì che Swift veda API stabili e che ARC gestisca la vita dell'oggetto.

## Diagnosi e test

I crash nel ponte sono di due tipi: memoria C++ mal gestita o un oggetto ObjC rilasciato troppo presto. lldb mostra frame C++ e ObjC insieme, quindi `bt` e `po` funzionano nella stessa sessione; AddressSanitizer si attiva come schema di diagnostica.

```bash
xcodebuild test -scheme Motore -destination 'platform=iOS Simulator,name=iPhone 16' \
  ENABLE_ADDRESS_SANITIZER=YES
```

| Sintomo | Causa probabile | Strumento |
| --- | --- | --- |
| `EXC_BAD_ACCESS` su un frame C++ | iteratore o puntatore uscito dallo scope | lldb, ASan |
| memoria crescente con l'uso | `@autoreleasepool` mancante in un loop | Instruments |
| crash `unrecognized selector` | oggetto ObjC liberato prima del messaggio | Zombies |
| risultati incoerenti dal C++ | eccezione bloccata in silenzio dal `catch` | log con dominio d'errore |

Ogni metodo del ponte va testato su input validi, su `nil` e su un errore C++. Il modulo C++ si testa con GoogleTest o Catch2 senza simulatori, e questo riduce il tempo di CI.

## Casi d'uso reali

I contesti corretti sono riconoscibili: motori di gioco e grafica in C++ da mostrare in un'app iOS, pipeline audio e video con codec che non esistono in Objective-C, librerie di visione o di parsing che arrivano dal desktop. Dietro l'API `NSObject` resta una logica C++ testata altrove.

Il contesto sbagliato è altrettanto chiaro: se la logica è pura Objective-C non serve C++, e viceversa. Usare `.mm` come "modalità libera" mescola due modelli di memoria e raddoppia le competenze richieste. La domanda da fare prima di aprire un `.mm` è una: quanto piccolo e stabile può essere il ponte.

## Errori comuni

- **Cambiare standard C++ senza ricompilare le dipendenze**: ABI diverse danno errori di link inattesi.
- **Esporre tipi C++ nell'header Objective-C**: ogni cambio rompe chi lo importa, e Swift non li capisce.
- **Testare solo il modulo C++ senza il ponte**: le conversioni sono la parte che fallisce di più.
- **Dimenticare `@autoreleasepool` nei loop che creano oggetti Foundation**: la memoria cresce in modo lineare.
- **Ignorare l'errore in `catch (...)`**: il dominio `NSError` deve riportare la causa, altrimenti il bug ricompare come crash lontano.

## In sintesi

Un modulo ben fatto ha un C++ testato a parte e un ponte con superficie minima, senza tipi C++ negli header. Standard, include e linker vanno espliciti, e lldb, Instruments e ASan coprono i confini. I test si dividono tra XCTest e un framework C++, e il `.mm` si giustifica solo se la libreria esiste già.

## Fonti

- [Clang - Objective-C support](https://clang.llvm.org/docs/UsersManual.html#objective-c), opzioni e standard supportati per `.m` e `.mm`.
- [Apple - Xcode Testing](https://developer.apple.com/documentation/xcode/testing), test unitari e di integrazione con XCTest.
- [CMake - Compile Features](https://cmake.org/cmake/help/latest/manual/cmake-compile-features.7.html), selezione dello standard C++ a livello di progetto.
- [cppreference - C++ compiler support](https://en.cppreference.com/w/cpp/compiler_support), quali funzionalità sono disponibili in ogni standard.
