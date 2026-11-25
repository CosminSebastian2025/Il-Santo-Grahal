Zig è un linguaggio compilato e fortemente tipizzato che punta a sostituire il C nella costruzione di software di sistema, senza garbage collector e senza costrutti nascosti. Ogni allocazione è esplicita, ogni errore è un valore e il codice che scrivi è quasi tutto il codice che il compilatore produce. In questa lezione impari la sintassi di base e il modello di esecuzione che rende Zig prevedibile.

## Obiettivi

- Riconoscere i tipi primitivi e le regole di coercizione implicita.
- Usare `const` e `var`, le funzioni e il flusso di controllo con `defer` e `errdefer`.
- Gestire gli errori come valori con `try`, `catch` e i set di errore.
- Capire come il toolchain `zig` compila, esegue e linka senza dipendenze esterne.
- Usare puntatori e slice sapendo chi possiede la memoria.

## Tipi, funzioni e controllo di flusso

Zig non ha classi né eccezioni: ci sono struct, enum, union e funzioni. I tipi interi sono espliciti nella larghezza (`u8`, `i32`, `usize`) e non c'è conversione silenziosa tra dimensioni diverse.

```zig
const std = @import("std");

pub fn main() !void {
    const nome: []const u8 = "Ada"; // slice immutabile di byte
    var contatore: u32 = 0; // var solo se il valore cambia

    while (contatore < 3) : (contatore += 1) {
        std.debug.print("{s} {d}\n", .{ nome, contatore });
    }
}
```

`const` è il default e il compilatore lo impone: una variabile non riassegnata con `var` produce un errore. Le funzioni dichiarano il tipo di ritorno, `!void` si legge come "un possibile errore o niente". Le stringhe sono slice di byte, e un array a lunghezza fissa come `[3]u8` è un tipo diverso dalla slice.

| Costrutto | Sintassi | Nota |
| --- | --- | --- |
| dichiarazione | `const x: u8 = 7;` | immutabile |
| variabile mutabile | `var n: usize = 0;` | esplicita |
| `if` espressione | `const m = if (a > b) a else b;` | nessun operatore ternario |
| `switch` | `switch (x) { 1 => ..., else => ... }` | deve essere esaustivo |
| ciclo | `for (slice) |v| { ... }` | iterazione su slice |

La coercizione implicita esiste solo dove non perde informazione: `u8` diventa `u32`, ma il contrario richiede `@intCast`.

## Errori come valori

Una funzione che può fallire ritorna un tipo di errore, e il chiamante deve occuparsene. Non esistono stack trace impliciti: `try` propaga l'errore al chiamante, `catch` lo intercetta.

```zig
const std = @import("std");
const Errore = error{Negativo};

fn raddoppia(n: u32) Errore!u32 {
    if (n > 1_000_000_000) return error.Negativo;
    return n * 2;
}

pub fn main() !void {
    const valore = raddoppia(21) catch |err| {
        std.debug.print("errore: {s}\n", .{@errorName(err)});
        return;
    };
    _ = valore;
}
```

Il set di errori si può dedurre oppure dichiarare. `catch` fornisce anche un valore di fallback, o `unreachable` se si è certi che l'errore non accadrà. `defer` registra un'azione da eseguire all'uscita dello scope, `errdefer` solo se lo scope termina con errore: sono il sostituto deterministico di `finally`.

## Modello di esecuzione: il toolchain

`zig` è un singolo eseguibile che compila, esegue e linka: `zig run main.zig` compila in una cache locale e lancia il programma, `zig build-exe` produce un binario, `zig test` esegue i test del file. Il compilatore contiene anche il linker, quindi il codice puro non richiede toolchain esterni.

```bash
zig version
zig run main.zig          # compila ed esegue
zig build-exe main.zig -O ReleaseSmall
zig test main.zig         # esegue i blocchi test
```

| Modalità | Flag | Uso |
| --- | --- | --- |
| Debug | predefinita | controlli di overflow, indirizzi, `unreachable` |
| ReleaseSafe | `-O ReleaseSafe` | ottimizzato con controlli attivi |
| ReleaseFast | `-O ReleaseFast` | prestazioni senza controlli di sicurezza |
| ReleaseSmall | `-O ReleaseSmall` | dimensioni minime del binario |

La modalità decide quanti controlli restano: in Debug un overflow di intero causa un panic, in ReleaseFast è comportamento non definito. Scegliere la modalità è parte del contratto del programma, non un dettaglio di build.

## Puntatori, slice e proprietà della memoria

Zig non alloca implicitamente su heap. Una slice (`[]u8`) è una coppia puntatore-lunghezza e non possiede il buffer; chi vuole memoria dinamica riceve un `std.mem.Allocator` e decide dove allocare.

```zig
fn conta_vocali(testo: []const u8) usize {
    var n: usize = 0;
    for (testo) |c| {
        switch (c) {
            'a', 'e', 'i', 'o', 'u' => n += 1, // nessun fallthrough
            else => {},
        }
    }
    return n;
}
```

Il tipo del puntatore dice quanto dura l'area: `*T` punta a un singolo valore, `[]T` è una slice mutabile con lunghezza nota, `[*]T` punta a molti elementi senza lunghezza. Mancando costruttori impliciti e carico degli operatori, il compilatore ottimizza senza ipotesi nascoste sull'aliasing.

## Errori comuni

- **Usare `var` per tutto**: `const` è il default e rende il codice leggibile; il compilatore segnala le variabili mai riassegnate.
- **Ignorare un valore con `_ =` senza motivo**: nasconde che una funzione può fallire, e `try` sarebbe più corretto.
- **Dimenticare `defer` dopo un'allocazione**: ogni `alloc` va accoppiata a `defer allocator.free(memoria)`.
- **Contare su overflow silenzioso**: in Debug va in panic, in ReleaseFast è comportamento indefinito; usa `+%` solo consapevolmente.
- **Assumere `usize` come `u32`**: le conversioni tra larghezze richiedono `@intCast`, che in Debug verifica il range.

## In sintesi

Zig scambia la comodità con la prevedibilità: tipi espliciti, mutabilità dichiarata, nessun errore nascosto. Gli errori sono valori e il compilatore impone di gestirli, `defer` rende deterministiche le pulizie. La memoria è di chi la alloca, indicata tramite `Allocator`. Il toolchain unico compila, testa ed esegue, e la modalità di build decide quanti controlli restano attivi.

## Fonti

- [Zig Language Reference](https://ziglang.org/documentation/master/)
- [Zig - Overview](https://ziglang.org/learn/overview/)
- [Zig - Getting Started](https://ziglang.org/learn/getting-started/)
- [Zig Standard Library Reference](https://ziglang.org/documentation/master/std/)
