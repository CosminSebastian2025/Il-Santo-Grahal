Objective-C è il C con oggetti, messaggi e un runtime dinamico: è il linguaggio che ha sostenuto macOS e iOS per quasi trent'anni e che ancora oggi compare in Foundation e nei framework di sistema. Capire dove finisce il C e dove comincia la parte a oggetti è la chiave per leggerlo. Qui studi sintassi essenziale, messaggi e modello di esecuzione.

## Obiettivi

- Scrivere e compilare un file `.m` con Clang, riconoscendo le estensioni e i flag necessari.
- Leggere e scrivere la sintassi dei messaggi, delle classi e delle proprietà.
- Distinguere i puntatori a oggetti dai valori C e capire quando copiare e quando riferire.
- Capire come il runtime dinamico risolve `objc_msgSend` e perché il binding avviene a esecuzione.
- Usare blocchi e literal moderni al posto dei costrutti legacy.

## Il minimo C che serve

Objective-C è un superset del C: `struct`, `enum`, puntatori e `#import` al posto di `#include`. Le implementazioni sono file `.m`, le intestazioni `.h`, e il compilatore è Clang:

```bash
clang -fobjc-arc -framework Foundation main.m -o saluto
./saluto
```

Gli oggetti vivono nell'heap e si riferiscono con puntatore (`NSString *`), mentre `int` e `BOOL` restano valori. Inviare un messaggio a `nil` restituisce zero o `nil` senza crash: conviene saperlo per non scrivere difese inutili.

```objectivec
#import <Foundation/Foundation.h>

int main(int argc, const char *argv[]) {
    BOOL verbo = YES;            // YES/NO, tipi C
    NSString *nome = @"Ada";     // @"" è un literal, non una stringa C
    NSLog(@"Hello, %@", nome);   // %@ stampa qualsiasi oggetto
    return 0;
}
```

## Messaggi, classi e proprietà

Rispetto al C++ non si chiamano metodi, si inviano **messaggi**: `[oggetto messaggio:argomento]`. La selezione è una stringa che il runtime usa per cercare l'implementazione.

```objectivec
// interfaccia in Conto.h
@interface Conto : NSObject
@property (nonatomic, copy) NSString *titolare;
@property (nonatomic, readonly) double saldo;
- (instancetype)initWithTitolare:(NSString *)titolare;
- (void)deposita:(double)importo;
@end
```

Nell'implementazione i metodi si definiscono con `-` (istanza) o `+` (classe), e ogni costruttore chiama `[super init]` e restituisce `instancetype`:

```objectivec
// Conto.m
@implementation Conto {
    double _saldo;               // variabile d'istanza dichiarata in implementazione
}
- (instancetype)initWithTitolare:(NSString *)titolare {
    if ((self = [super init])) {
        _titolare = [titolare copy];
    }
    return self;
}
- (void)deposita:(double)importo {
    _saldo += importo;
}
@end
```

`[[Conto alloc] initWithTitolare:@"Lea"]` crea l'oggetto, `[conto deposita:10.0]` invia il messaggio e `conto.titolare` è zucchero per `[conto setTitolare:...]`, generato dalla `@property`.

| Concetto | Sintassi | Equivalente C/C++ |
| --- | --- | --- |
| invio messaggio | `[obj metodo:a b:b]` | chiamata di funzione virtuale |
| riferimento a classe | `[Oggetto class]` | `typeid` |
| string literal | `@"testo"` | `const char *` |
| array literal | `@[@1, @2]` | array C |
| blocco | `^int(int x) { return x; }` | lambda |
| nome di selettore | `@selector(metodo:)` | puntatore a funzione |

I **blocchi** sono chiusure: un blocco che legge una variabile locale la copia, a meno che la variabile non sia `__block`. A differenza delle lambda C++ la cattura è implicita.

```objectivec
__block NSInteger contatore = 0;
void (^incrementa)(void) = ^{ contatore++; };  // cattura per riferimento grazie a __block
incrementa();
```

## Modello di esecuzione e runtime dinamico

Una chiamata `[oggetto messaggio]` diventa un `objc_msgSend(oggetto, @selector(messaggio), ...)`. Il runtime guarda l'`isa` dell'oggetto, cerca il selettore nella cache e, se non c'è, nella classe e nelle superclassi. Se nessuno lo implementa, arriva `doesNotRecognizeSelector:` e di solito un crash con `unrecognized selector`.

Tre conseguenze pratiche. Un metodo può essere aggiunto dopo l'avvio con `class_addMethod`, quindi il binding è tardivo. Una classe può rispondere a selettori non dichiarati, e `respondsToSelector:` è una domanda legittima. Il costo di una chiamata è un salto indiretto con cache, da misurare prima di ottimizzare.

`clang -c` produce un object file con metadati di classe e metodi, il linker unisce `Foundation` e all'avvio il runtime registra classi e selettori: l'`@interface` è la fonte della tabella dei metodi.

## Gestione della memoria in breve

Il modello raccomandato è ARC (_Automatic Reference Counting_): il compilatore inserisce `retain` e `release` al posto tuo. `copy`, `strong`, `weak` e `assign` descrivono la ownership e non sono decorazioni: `copy` protegge da un `NSMutableString` esterno, `weak` azzera il puntatore quando l'oggetto muore.

## Errori comuni

- **Inviare messaggi a un oggetto mai inizializzato**: `[Conto alloc]` senza `init` lascia campi a zero e `isa` non valido.
- **Scrivere `@"..."` dentro `printf`**: `%@` funziona solo con `NSLog` e con gli oggetti Foundation.
- **Confondere `-` e `+`**: un metodo di classe che tocca `self` come istanza è un errore che il compilatore non segnala sempre.
- **Usare `retain`/`release` in un file compilato con `-fobjc-arc`**: l'errore è esplicito e serve togliere le chiamate, non il flag.
- **Dichiarare proprietà `assign` per oggetti**: senza ownership l'oggetto può morire e lasciare il puntatore penzolante.

## In sintesi

La sintassi `[oggetto messaggio]` e il runtime dinamico sono centrali in ogni framework Apple. Le classi si dichiarano in `.h` e si implementano in `.m`, e i selettori si risolvono a esecuzione, non al link. Literal `@"..."`, `@[]` e blocchi fanno parte del linguaggio moderno.

## Fonti

- [Apple - Programming with Objective-C](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/Introduction/Introduction.html), la guida storica ma ancora accurata su classi, proprietà, blocchi e memoria.
- [Apple - The Objective-C Programming Language](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ObjectiveC/Introduction/introObjectiveC.html), riferimento completo della sintassi e delle estensioni.
- [Apple - Objective-C Runtime](https://developer.apple.com/documentation/objectivec/objective-c-runtime), documentazione sulle API `objc_*` usate dal runtime.
- [Clang - Objective-C Literals](https://clang.llvm.org/docs/ObjectiveCLiterals.html), specifica dei literal `@""`, `@[]`, `@{}` e `@()`.
