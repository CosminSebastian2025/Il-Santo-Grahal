In questo laboratorio costruisci `LibTrack`, un gestore di prestiti librari in Objective-C puro, compilabile da terminale con Clang e Foundation, senza Xcode. Il progetto sta in tre file ma tocca proprietà, errori, categorie, blocchi e memoria. Alla fine avrai un binario e una suite di test minima.

## Obiettivi

- Creare un progetto compilabile con `clang` e la sola `Foundation`.
- Progettare una classe con proprietà `copy`, `strong` e `readonly` coerenti.
- Gestire gli errori con `NSError **` invece delle eccezioni.
- Testare il comportamento con asserzioni ripetibili da riga di comando.
- Individuare un ciclo di retain e risolverlo con `weak`.

## Setup e modello dei dati

Servono macOS e Xcode Command Line Tools (`xcode-select --install`). Niente progetto Xcode: tre file (`LibTrack.h`, `LibTrack.m`, `test.m`) e un comando compilano tutto.

```bash
clang -fobjc-arc -fblocks -framework Foundation LibTrack.m test.m -o libtrack-test && ./libtrack-test
```

| Entità | Ruolo | Proprietà chiave |
| --- | --- | --- |
| `Libro` | dati immutabili | `titolo`, `autore`, `isbn`, tutti `copy` |
| `Prestito` | relazione tra libro e lettore | `libro` `strong`, `lettore` `copy` |
| `Archivio` | collezione mutabile | `mutableArray` privato, `prestiti` readonly |
| `Errore` | dominio degli errori | codice e descrizione `localizedDescription` |

L'intestazione espone solo ciò che serve, e le variabili d'istanza vivono nell'implementazione:

```objectivec
// LibTrack.h
#import <Foundation/Foundation.h>

extern NSString * const LibTrackErrorDomain;

typedef NS_ENUM(NSInteger, LibTrackErrore) {
    LibTrackErroreLibroMancante = 1,
};

@interface Libro : NSObject
@property (nonatomic, copy, readonly) NSString *titolo;
- (instancetype)initWithTitolo:(NSString *)titolo autore:(NSString *)autore;
@end

@interface Archivio : NSObject
- (BOOL)aggiungiLibro:(Libro *)libro errore:(NSError **)errore;
- (NSArray<Libro *> *)libri;
@end
```

## Implementazione dell'archivio

L'archivio rifiuta libri nulli e duplicati restituendo un `NSError` con codice dedicato. Il metodo restituisce `BOOL`, chi chiama controlla il puntatore di errore, e le eccezioni restano riservate ai bug.

```objectivec
// LibTrack.m
#import "LibTrack.h"

NSString * const LibTrackErrorDomain = @"it.grahal.libtrack";

@implementation Libro
- (instancetype)initWithTitolo:(NSString *)titolo autore:(NSString *)autore {
    if ((self = [super init])) {
        _titolo = [titolo copy];
    }
    return self;
}
@end

@implementation Archivio {
    NSMutableArray<Libro *> *_libri;
}

- (instancetype)init {
    if ((self = [super init])) {
        _libri = [NSMutableArray array];
    }
    return self;
}

- (BOOL)aggiungiLibro:(Libro *)libro errore:(NSError **)errore {
    if (libro == nil) {
        if (errore) {
            *errore = [NSError errorWithDomain:LibTrackErrorDomain
                                          code:LibTrackErroreLibroMancante
                                      userInfo:@{NSLocalizedDescriptionKey: @"libro nullo"}];
        }
        return NO;
    }
    for (Libro *esistente in _libri) {
        if ([esistente.titolo isEqualToString:libro.titolo]) {
            if (errore) {
                *errore = [NSError errorWithDomain:LibTrackErrorDomain
                                              code:LibTrackErroreLibroMancante
                                          userInfo:@{NSLocalizedDescriptionKey: @"titolo duplicato"}];
            }
            return NO;
        }
    }
    [_libri addObject:libro];
    return YES;
}

- (NSArray<Libro *> *)libri {
    return [_libri copy];    // readonly verso l'esterno, mutabile dentro
}
@end
```

`libri` restituisce una copia immutabile: `copy` su `NSMutableArray` produce un `NSArray`, quindi l'esterno non può mutare la collezione né bypassare la validazione.

## Categorie, blocchi e il ciclo di retain

Aggiungi una categoria di utilità sull'archivio e osserva un errore classico di ownership.

```objectivec
// categoria usata in tutto il processo: il nome deve essere univoco
@interface Archivio (Ricerca)
- (NSArray<Libro *> *)libriTrovati:(BOOL (^)(Libro *libro))filtro;
@end

@implementation Archivio (Ricerca)
- (NSArray<Libro *> *)libriTrovati:(BOOL (^)(Libro *))filtro {
    return [self.libri filteredArrayUsingPredicate:[NSPredicate predicateWithBlock:
        ^BOOL(Libro *libro, NSDictionary<NSString *, id> *bindings) {
            return filtro(libro);
        }]];
}
@end
```

Il blocco cattura `filtro` in modo implicito; il rischio è altrove. Una classe che tiene un riferimento `strong` a chi la possiede crea un ciclo e non viene mai deallocata: la cura è `weak`, che `NSObject` azzera quando l'oggetto muore.

```objectivec
@interface Osservatore : NSObject
@property (nonatomic, weak) Archivio *archivio;   // weak evita il ciclo
@end
```

Prova l'archivio da riga di comando prima di scrivere i test: un `main` provvisorio rivela gli errori di compilazione più in fretta.

## Testing da terminale

`test.m` contiene un `main` con asserzioni esplicite: per questa scala non serve un framework, bastano verifica, messaggio e conteggio dei fallimenti.

```objectivec
// test.m
#import <Foundation/Foundation.h>
#import "LibTrack.h"

static int falliti = 0;
static void verifica(BOOL cond, NSString *nome) {
    if (!cond) { falliti++; NSLog(@"FAIL %@", nome); }
}

int main(void) {
    @autoreleasepool {
        Archivio *a = [[Archivio alloc] init];
        Libro *l = [[Libro alloc] initWithTitolo:@"Dune" autore:@"Herbert"];
        NSError *e = nil;
        verifica([a aggiungiLibro:l errore:&e], @"aggiungi");
        verifica([a aggiungiLibro:l errore:&e] == NO, @"duplicato rifiutato");
        verifica(e.code == LibTrackErroreLibroMancante, @"codice errore");
        verifica(a.libri.count == 1, @"conteggio");
        NSLog(@"falliti: %d", falliti);
    }
    return falliti == 0 ? 0 : 1;
}
```

L'`@autoreleasepool` è obbligatorio in un programma da riga di comando: senza pool gli oggetti autoreleased si accumulano. Uno script che compila e lancia `./libtrack-test` riproduce la verifica con un incolla.

## Esercizi

1. Aggiungi un metodo `- (BOOL)rimuoviLibroConTitolo:errore:` che fallisce con un errore dedicato se il libro non esiste.
2. Fai in modo che `- (NSArray<Libro *> *)libri` restituisca un array ordinato per titolo, senza modificare l'ordine interno.
3. Scrivi una categoria `NSString (Normalizza)` con `- (NSString *)normalizzato`, che toglie spazi e passa a minuscole; perché il nome è specifico?
4. Aggiungi un delegato `ArchivioDelegate` con `- (void)archivio:haAggiuntoLibro:` e verifica con un doppio di test.
5. Fai osservare due archivi a vicenda, mostra il ciclo con `dealloc` e correggilo.
6. Rendi il runner capace di accettare un filtro: `./libtrack-test duplicato`.

<details>
<summary>Soluzione</summary>

1. Al loop serve una variabile indice; se non trova il titolo scrive `errore` con il nuovo codice `LibTrackErroreLibroInesistente = 2` e restituisce `NO`.

2. `NSArray *ordinato = [self.libri sortedArrayUsingComparator:^NSComparisonResult(Libro *a, Libro *b) { return [a.titolo compare:b.titolo]; }];` restituisce sempre un nuovo array, quindi l'ordine interno resta invariato.

3. Usa `stringByTrimmingCharactersInSet:` con `whitespaceAndNewlineCharacterSet` e poi `lowercaseString`. `normalizzato` è improbabile come nome esistente su `NSString`, `trim` o `format` no.

4. `Archivio` ha `@property (nonatomic, weak) id<ArchivioDelegate> delegato;` e chiama `respondsToSelector:` prima dell'invio; il doppio registra le chiamate in un array.

5. Con due riferimenti `strong` incrociati `dealloc` non viene mai chiamato: un contatore nel `main` lo dimostra. Rendendo `weak` uno dei due si torna alla deallocazione.

6. Leggi `argv[1]` e salta i `verifica` il cui nome non contiene la stringa: un filtro testuale sufficiente finché i test sono pochi.

</details>

## Errori comuni

- **Confondere `copy` e `strong` su una collezione**: `strong` espone l'array mutabile all'esterno e rompe il readonly.
- **Dimenticare `if (errore)` prima di scrivere**: chi chiama può passare `NULL` e il crash arriva nel punto sbagliato.
- **Ritornare `_libri` direttamente**: chi riceve può mutarlo e bypassare la validazione.
- **Mettere un `NSLog` nel ciclo di test**: l'output nasconde il risultato e rende difficile contare i fallimenti.
- **Compilare senza `-fobjc-arc` per "risparmiare"**: si torna a gestire la memoria a mano e il codice dell'esempio diventa sbagliato.

## In sintesi

Un archivio completo si verifica con soli `.h`/`.m` e Clang. `copy` e `weak` sono contratti di ownership e `NSError **` è il canale d'errore standard. Categorie e blocchi richiedono nomi specifici e attenzione ai cicli; un runner minimo basta finché i test restano pochi.

## Fonti

- [Apple - Memory Management Rules](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/MemoryMgmt/Articles/mmRules.html), regole di ownership che ARC traduce in automatico.
- [Clang - Automatic Reference Counting](https://clang.llvm.org/docs/AutomaticReferenceCounting.html), specifica dei qualificatori `strong`, `weak`, `copy` e delle regole di inserimento.
- [Apple - Working with Blocks](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/WorkingwithBlocks/WorkingwithBlocks.html), cattura delle variabili e `__block`.
- [Apple - Encapsulating Data](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/EncapsulatingData/EncapsulatingData.html), proprietà, attributi e incapsulamento delle variabili d'istanza.
