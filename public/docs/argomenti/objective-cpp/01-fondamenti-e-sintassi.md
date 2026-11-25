Objective-C++ non ha una specifica autonoma: è un file `.mm` che Clang compila con i frontend C++ e Objective-C attivi insieme. Serve a mettere insieme framework Apple e codice C++ reale (motori grafici, codec, librerie di ricerca) senza riscrivere nulla. Qui impari cosa è legale nella combinazione e perché conviene usarla con regole esplicite.

## Obiettivi

- Compilare un file `.mm` e riconoscere quando Clang sceglie il frontend C++.
- Dichiarare classi C++ dentro una classe Objective-C e ObjC dentro il C++.
- Usare RAII e smart pointer come complemento di ARC, non come alternativa.
- Evitare i costrutti ambigui che le due grammatiche interpretano in modo diverso.
- Capire dove si usa Objective-C++ nei progetti Apple reali.

## Due linguaggi, un file

Un file `.mm` viene compilato con C++ attivo e la sintassi dei messaggi abilitata. L'estensione decide molto: `.m` è solo Objective-C, `.cpp` è solo C++, `.mm` è la combinazione. La compilazione di un modulo misto richiede che il runtime ObjC e la libreria standard vivano nello stesso processo, cosa che accade normalmente su Apple e non è automatica altrove.

```bash
clang++ -std=c++17 -fobjc-arc -framework Foundation motore.mm -o motore
```

Regola mentale: tutto ciò che il C++ non sa interpretare diventa sintassi Objective-C. `[...]` è un messaggio sugli oggetti; `new`, `template`, `namespace` e l'overload sono C++ puro.

| Costrutto | Linguaggio | Nota |
| --- | --- | --- |
| `[obj messaggio:]` | Objective-C | il C++ non ha questa forma |
| `std::vector<int>` | C++ | un errore lo scrivere in un `.m` |
| `NSArray<NSString *>` | ObjC + generics leggeri | i generici ObjC sono solo controlli |
| `NSArray *` in un template | Objective-C | il tipo puntatore è compatibile |
| `@try/@catch` | Objective-C | il `catch` C++ non vede eccezioni ObjC |
| `throw std::runtime_error` | C++ | può attraversare codice ObjC con cautela |

## Oggetti C++ dentro oggetti Objective-C

Il caso più comune è una classe Objective-C che contiene un oggetto C++ come variabile d'istanza. Nelle dichiarazioni di istanza l'oggetto C++ si inizializza con il costruttore di default; per passare argomenti serve altrimenti un `std::unique_ptr` o un inizializzatore esplicito.

```objectivec
// Motore.mm
#import <Foundation/Foundation.h>
#include <vector>
#include <string>

class Indice {
public:
    void aggiungi(const std::string &parola) { parole_.push_back(parola); }
    size_t quantita() const { return parole_.size(); }
private:
    std::vector<std::string> parole_;
};

@interface Motore : NSObject
- (void)aggiungi:(NSString *)parola;
- (NSUInteger)quantita;
@end

@implementation Motore {
    std::unique_ptr<Indice> _indice;   // costruito nell'initWith
}

- (instancetype)init {
    if ((self = [super init])) {
        _indice = std::make_unique<Indice>();
    }
    return self;
}

- (void)aggiungi:(NSString *)parola {
    _indice->aggiungi(std::string(parola.UTF8String));
}

- (NSUInteger)quantita {
    return _indice->quantita();
}
@end
```

Il distruttore di `_indice` viene chiamato quando l'oggetto Objective-C viene deallocato: la vita del C++ segue quella dell'oggetto ObjC. Per questo si usa `unique_ptr`, che si può istanziare nell'`init`.

## Oggetti Objective-C dentro il C++

L'inverso è altrettanto importante: una classe C++ che conserva un riferimento a un oggetto Foundation. Qui ARC non agisce sui membri C++ se il puntatore è memorizzato in un modo che il compilatore non traccia con `__strong`; la scelta sicura è un wrapper che dichiara il membro in un blocco ObjC.

```objectivec
class Percorso {
public:
    explicit Percorso(NSString *testo) : testo_([testo copy]) {}
    std::string utf8() const { return std::string(testo_.UTF8String); }
private:
    __strong NSString *testo_;   // ARC gestisce il riferimento
};
```

Un membro `__strong` con ARC è supportato in C++, ma la leggibilità ne soffre. L'alternativa è passare l'oggetto a ogni chiamata, oppure isolare le costruzioni massicce dentro un `@autoreleasepool`.

## Modello di esecuzione e confini

Il runtime Objective-C funziona come in un `.m`: `objc_msgSend` per i messaggi, `isa` per la classe. Il C++ vive accanto con i suoi oggetti, i suoi distruttori e le sue regole di eccezioni. I confini sono due: la gestione della memoria (ARC per gli Oggetti, RAII per le classi C++) e la gestione delle eccezioni, perché una `NSException` che attraversa un frame C++ non è negoziabile e deve essere fermata nel codice ObjC.

```objectivec
@autoreleasepool {
    std::vector<NSString *> temporanei;
    for (NSUInteger i = 0; i < 100000; i++) {
        temporanei.push_back([NSString stringWithFormat:@"%lu", (unsigned long)i]);
    }
}   // gli autoreleased vengono rilasciati qui
```

Due vincoli pratici: i blocchi conservati dal C++ vanno copiati con `Block_copy`, perché altrimenti vivono nello stack, e i messaggi ObjC non entrano nelle `constexpr`: le due analisi non si parlano.

## Dove si usa davvero

È la lingua franca tra interfacce Apple e librerie C++: motori audio e video, codec, rendering con Metal, motori di gioco multipiattaforma, librerie di visione che arrivano da C++. La forma più comune è il `.mm` come ponte con superficie minima, con tutta la logica C++ dietro.

## Errori comuni

- **Scrivere C++ in un file `.m`**: l'errore è di grammar e spesso il compilatore segnala la riga sbagliata.
- **Mettere una variabile C++ con costruttore obbligatorio in `@implementation { }`**: serve `init` esplicito o un puntatore intelligente.
- **Lasciare che un'`NSException` attraversi un frame C++**: il comportamento non è definito; acquisiscila nel ponte ObjC.
- **Conservare un blocco in C++ senza `Block_copy`**: il blocco vive nello stack e diventa invalido.
- **Mescolare `NSError **` e `std::error_code` nello stesso ponte**: due canali d'errore diventano tre bug.

## In sintesi

Objective-C++ è un `.mm` compilato con C++ e Objective-C attivi: oggetti C++ dentro classi ObjC e oggetti ObjC dentro classi C++, con ARC e RAII che convivono. I confini delicati sono memoria ed eccezioni, da isolare in classi ponte piccole e testate. È il linguaggio di adattamento tra prodotti Apple e librerie C++.

## Fonti

- [Clang - Users Manual, sezione Objective-C](https://clang.llvm.org/docs/UsersManual.html#objective-c), compilazione di `.m` e `.mm` e opzioni del frontend.
- [Clang - Objective-C Literals](https://clang.llvm.org/docs/ObjectiveCLiterals.html), literal che funzionano anche nei file misti.
- [cppreference - RAII](https://en.cppreference.com/w/cpp/language/raii), il modello di durata delle risorse C++ che convive con ARC.
- [cppreference - std::unique_ptr](https://en.cppreference.com/w/cpp/memory/unique_ptr), lo smart pointer con ownership esclusiva usato negli esempi.
