In questo laboratorio costruisci `MotoreTestuale`, un motore di autocompletamento in C++ esposto a Objective-C tramite un file `.mm`. La logica resta C++ e si testa senza simulatore, e una classe Objective-C con pochi metodi la rende disponibile al resto dell'app.

## Obiettivi

- Separare un modulo C++ puro da un ponte Objective-C compilato come `.mm`.
- Convertire `NSString` in `std::string` e restituire risultati come oggetti Foundation.
- Trasformare le eccezioni C++ in `NSError` senza perdere la causa.
- Compilare e testare il motore da terminale con Clang, senza progetto Xcode.
- Diagnosticare un uso non valido della memoria con un test mirato.

## Il contratto e la struttura

Il progetto ha `motore.hpp` e `motore.cpp` per la logica C++, `MotoreTestuale.h` e `.mm` per il ponte, `test.mm` per i test. L'header pubblico non contiene C++ e il motore non conosce Foundation.

| Modulo | Linguaggio | Risponde di |
| --- | --- | --- |
| `motore.hpp/.cpp` | C++17 | indicizzazione, ricerca per prefisso |
| `MotoreTestuale.h` | Objective-C | API pubblica, errori |
| `MotoreTestuale.mm` | ObjC++ | conversione, ownership, `catch` |
| `test.mm` | ObjC++ | comportamento del ponte |

Il motore mantiene un `std::vector<std::string>` ordinato e restituisce fino a un limite di suggerimenti; `std::invalid_argument` è l'unico errore che il ponte deve tradurre.

```bash
clang++ -std=c++17 -fobjc-arc -fexceptions -fobjc-exceptions \
  -framework Foundation motore.cpp MotoreTestuale.mm test.mm -o motore-test
./motore-test
```

## Il motore C++ e l'API pubblica

La logica non cita `NSString` né `NSError`, così si testa anche su Linux. Il motore conserva lo stato e cerca per prefisso.

```cpp
// motore.hpp
#pragma once
#include <string>
#include <vector>

class Motore {
public:
    void inserisci(const std::string &voce);
    std::vector<std::string> suggerimenti(const std::string &prefisso, size_t limite) const;
    size_t quantita() const;
private:
    std::vector<std::string> voci_;   // invariante: ordinato
};
```

`inserisci` mantiene l'invariante con `std::lower_bound`, `suggerimenti` lancia `std::invalid_argument` se `limite` è zero: la validazione sta nel C++ e il ponte non la replica.

```objectivec
// MotoreTestuale.h — solo API Objective-C
#import <Foundation/Foundation.h>
NS_ASSUME_NONNULL_BEGIN

extern NSString * const MotoreErroreDomain;

@interface MotoreTestuale : NSObject
- (void)inserisciParola:(NSString *)parola;
- (nullable NSArray<NSString *> *)suggerimentiPer:(NSString *)prefisso
                                             limite:(NSUInteger)limite
                                             errore:(NSError **)errore;
@end

NS_ASSUME_NONNULL_END
```

L'intestazione usa `NS_ASSUME_NONNULL_BEGIN` con una sola nullabilità esplicita: i risultati sono assenti in caso di errore.

## Il ponte `.mm`

Il ponte costruisce il motore nell'`init`, converte le stringhe e traduce le eccezioni: conversione in ingresso, chiamata C++, conversione in uscita.

```objectivec
// MotoreTestuale.mm
#import "MotoreTestuale.h"
#include "motore.hpp"
#include <memory>
#include <stdexcept>

NSString * const MotoreErroreDomain = @"it.grahal.motore";

@implementation MotoreTestuale {
    std::unique_ptr<Motore> _motore;
}

- (instancetype)init {
    if ((self = [super init])) {
        _motore = std::make_unique<Motore>();
    }
    return self;
}

- (void)inserisciParola:(NSString *)parola {
    _motore->inserisci(std::string(parola.UTF8String));
}

- (NSArray<NSString *> *)suggerimentiPer:(NSString *)prefisso
                                   limite:(NSUInteger)limite
                                   errore:(NSError **)errore {
    try {
        auto risultati = _motore->suggerimenti(std::string(prefisso.UTF8String), limite);
        NSMutableArray<NSString *> *uscita = [NSMutableArray array];
        for (const auto &voce : risultati) {
            [uscita addObject:[NSString stringWithUTF8String:voce.c_str()]];
        }
        return uscita;
    } catch (const std::invalid_argument &e) {
        if (errore) {
            *errore = [NSError errorWithDomain:MotoreErroreDomain
                                          code:1
                                      userInfo:@{NSLocalizedDescriptionKey:
                                                 [NSString stringWithUTF8String:e.what()]}];
        }
        return nil;
    }
}
@end
```

Tre dettagli contano. `parola.UTF8String ?: ""` evita il crash su `nil`. Il `catch` limitato a `std::invalid_argument` impedisce che altri bug diventino errori silenziosi. Restituire un `NSMutableArray` come `NSArray` è sicuro perché chi riceve usa l'interfaccia immutabile.

## Test del ponte con un runner minimo

Il test copre ricerca, limite invalido e caso `nil`, e gira da terminale in secondi.

```objectivec
// test.mm
#import <Foundation/Foundation.h>
#import "MotoreTestuale.h"

int main(void) {
    @autoreleasepool {
        MotoreTestuale *m = [[MotoreTestuale alloc] init];
        [m inserisciParola:@"mela"];
        [m inserisciParola:@"melone"];
        [m inserisciParola:@"pera"];

        NSError *e = nil;
        NSArray *r = [m suggerimentiPer:@"mel" limite:10 errore:&e];
        NSCAssert(r.count == 2, @"due suggerimenti");
        NSCAssert(e == nil, @"nessun errore");

        r = [m suggerimentiPer:@"mel" limite:0 errore:&e];
        NSCAssert(r == nil && e.code == 1, @"limite zero rifiutato");

        r = [m suggerimentiPer:@"x" limite:1 errore:NULL];
        NSCAssert(r.count == 0, @"prefisso assente, nessun errore");

        NSLog(@"test del ponte completati");
    }
    return 0;
}
```

Per diagnosticare un uso dopo il rilascio conserva un riferimento `__weak` a un oggetto dentro un `@autoreleasepool` e usalo dopo: ottieni un crash riproducibile che lldb o AddressSanitizer spiegano in dettaglio.

## Esercizi

1. Aggiungi al motore un metodo `rimuovi` che non rompa l'ordinamento ed esponilo nel ponte.
2. Traduci `std::length_error` in un codice distinto da quello del limite non valido.
3. Restituisci i suggerimenti ordinati per lunghezza crescente invece che alfabeticamente: dove va fatto, nel C++ o nel ponte?
4. Rendi `suggerimenti` capace di ricevere `nil` come prefisso senza crash, e testa il caso.
5. Verifica con `@autoreleasepool` che 100.000 ricerche non facciano crescere la memoria.
6. Spiega, con un test, perché il C++ non possiede gli oggetti ObjC passati al ponte.

<details>
<summary>Soluzione</summary>

1. `bool rimuovi(const std::string &)` con `std::lower_bound` e `erase`. Il ponte espone `- (BOOL)rimuoviParola:` senza errore: l'assenza non è un errore di dominio.

2. Due `catch` separati, `std::length_error` con `code:2` e `std::invalid_argument` con `code:1`, e un `catch (const std::exception &)` finale con `code:3` per non perdere nulla.

3. Nel C++: l'ordine è una regola del motore, testabile senza simulatore; il ponte copia l'ordine ricevuto.

4. Nel `.mm` usa `prefisso.UTF8String ?: ""` oppure `std::string(prefisso ? prefisso.UTF8String : "")`: il prefisso vuoto restituisce le prime voci, comportamento coerente con una ricerca per prefisso.

5. Metti il ciclo in un `@autoreleasepool` e misura con `memory footprint` di Instruments: senza pool la memoria cresce, con pool svuotati a ogni ciclo resta stabile.

6. Il C++ riceve un `NSString *` temporaneo e lo converte in `std::string`, copiando i byte: non lo conserva, quindi non ne ha l'ownership. Per conservarlo servirebbe un membro `__strong`, e ARC gestirebbe la vita.

</details>

## Errori comuni

- **Scrivere `parola.UTF8String` su un parametro `nil`**: la conversione produce un puntatore nullo e `std::string` crasha.
- **Catturare `std::exception` senza dominio**: l'errore arriva senza codice e distinguerlo diventa impossibile.
- **Mettere `#include "motore.hpp"` nell'header pubblico**: ogni file che importa il ponte deve compilare C++.
- **Conservare un `NSArray` in una variabile C++ senza `__strong`**: il riferimento non è tracciato da ARC.
- **Compilare con `-fno-exceptions`**: il `try` del ponte non compila e gli errori del motore diventano `std::terminate`.

## In sintesi

Un motore C++ testabile e un ponte Objective-C minimo bastano a esporre la logica, con conversione esplicita e traduzione delle eccezioni in `NSError`. `unique_ptr` lega la vita del motore all'oggetto Objective-C, mentre gli `NSString` restano di ARC. La build con `clang++` rende il ponte verificabile senza Xcode.

## Fonti

- [Clang - Users Manual, Objective-C](https://clang.llvm.org/docs/UsersManual.html#objective-c), compilazione di file misti e flag del frontend.
- [cppreference - RAII](https://en.cppreference.com/w/cpp/language/raii), durata delle risorse gestite da `unique_ptr`.
- [cppreference - Exceptions](https://en.cppreference.com/w/cpp/language/exceptions), gerarchia delle eccezioni usata nella traduzione degli errori.
- [Apple - Swift, Importing Objective-C](https://developer.apple.com/documentation/swift/importing-objective-c-into-swift), cosa vede Swift di un'API Objective-C come questa.
