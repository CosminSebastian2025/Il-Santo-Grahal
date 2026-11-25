Un progetto Zig maturo è un `build.zig`, dipendenze dichiarate, test nel codice e un binario per piattaforma. L'ecosistema è più giovane di Rust o Go, ma ha una regola forte: tutto passa dal toolchain `zig` e da `build.zig`, senza sistemi di build paralleli. In questa lezione vedi come strutturare un progetto, testarlo e integrarlo con software esistente.

## Obiettivi

- Organizzare un progetto con `build.zig` e `build.zig.zon`.
- Aggiungere dipendenze e librerie C tramite `build.zig`.
- Scrivere test con `@import("std").testing` e gestire la memoria nei test.
- Usare `zig cc` come compilatore C incrociato.
- Distinguere i casi d'uso reali di Zig e i suoi limiti attuali.

## Struttura del progetto e build system

Un progetto tipico ha `src/main.zig`, `build.zig` e `build.zig.zon`. Il file `.zon` descrive il nome del pacchetto, la versione e le dipendenze con i loro hash; `build.zig` dichiara i target del progetto, cioè eseguibili, librerie e test.

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    const mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    const exe = b.addExecutable(.{ .name = "contaparole", .root_module = mod });
    b.installArtifact(exe);

    const run_tests = b.addRunArtifact(b.addTest(.{ .root_module = mod }));
    b.step("test", "Esegue i test").dependOn(&run_tests.step);
}
```

`standardTargetOptions` e `standardOptimizeOption` espongono i flag `-Dtarget` e `-Doptimize`. Il comando unico è `zig build`; aggiungere un eseguibile o un test significa aggiungere un artefatto che riusa lo stesso modulo, senza Makefile esterni.

```bash
zig init            # crea build.zig, build.zig.zon e src/main.zig
zig build           # compila e installa in zig-out/bin
zig build test      # esegue lo step test dichiarato
zig build -Doptimize=ReleaseSafe -Dtarget=x86_64-linux-gnu
```

## Dipendenze, librerie C e integrazione

Le dipendenze Zig si aggiungono a `build.zig.zon` con URL e hash tramite `zig fetch --save`, e nel `build.zig` si collegano con `addImport`, che espone il pacchetto come `@import("nome")`. Il codice C si integra senza binding generati: `@cInclude` importa un'intestazione e `addCSourceFile` compila i sorgenti C nello stesso artefatto. Lo stesso compilatore fa da toolchain C incrociata per altre architetture.

```bash
zig cc -target aarch64-macos -O2 -c mio.c -o mio.o
zig build-lib -target x86_64-windows-gnu main.zig
```

| Composizione | Comando | Nota |
| --- | --- | --- |
| eseguibile | `zig build` | usa `build.zig` quando presente |
| build con `module` | `zig build-exe main.zig` | percorso diretto |
| libreria statica | `zig build-lib main.zig -femit-bin=libx.a` | output per target |
| C incrociato | `zig cc -target <triple>` | glibc e musl inclusi |
| dipendenza | `zig fetch --save <url>` | registra hash in `.zon` |

## Testing integrato

I test stanno nello stesso file del codice, dentro `test "descrizione" { ... }`, e si eseguono con `zig test` o `zig build test`. `std.testing.allocator` rileva le perdite di memoria al termine di ogni test, cosa preziosa in un linguaggio senza garbage collector.

```zig
const std = @import("std");
const testing = std.testing;

fn inverso(alloc: std.mem.Allocator, testo: []const u8) ![]u8 {
    const out = try alloc.alloc(u8, testo.len);
    for (testo, 0..) |c, i| out[testo.len - 1 - i] = c;
    return out;
}

test "inverso" {
    const out = try inverso(testing.allocator, "zig");
    defer testing.allocator.free(out);
    try testing.expectEqualStrings("giz", out);
}
```

Un test che passa verifica anche l'assenza di leak. Per i rami di errore si usa `std.testing.checkAllAllocationFailures`, che ripete la funzione facendo fallire un'allocazione alla volta.

## Casi d'uso reali

Zig è usato dove il controllo della memoria conta: il runtime di Bun contiene componenti Zig, TigerBeetle lo usa per il database, Ghostty per il terminale, e il compilatore stesso è scritto in Zig. Il toolchain `zig cc` è diffuso anche come compilatore C incrociato in pipeline CI.

Per le applicazioni web l'ecosistema pacchetti è più piccolo e l'API di `std` evolve, quindi conviene fissare la versione del compilatore. Il rilascio è un binario statico per target.

| Contesto | Buona scelta | Attenzione |
| --- | --- | --- |
| CLI e strumenti di sistema | binario singolo, avvio immediato | API `std` che cambia tra release |
| librerie chiamate da C | ABI C semplice, no runtime | documentare la versione minima |
| team numerosi | tooling unico, test integrati | ecosistema pacchetti ridotto |

## Errori comuni

- **Scrivere build script a mano**: `build.zig` è l'unico punto di ingresso, e un Makefile in parallelo crea divergenze.
- **Non fissare la versione del compilatore**: le API di `std` cambiano tra release, e `build.zig` con esse.
- **Testare ignorando l'allocator**: senza `std.testing.allocator` i leak passano inosservati.
- **Assumere che `zig cc` sia GCC integrale**: alcune estensioni e flag GNU non sono supportati allo stesso modo.
- **Dimenticare l'hash in `build.zig.zon`**: una dipendenza senza hash non si risolve e la build si ferma.

## In sintesi

Zig ha un unico sistema di build dichiarativo in `build.zig`, con target e dipendenze espliciti. Il compilatore stesso è il toolchain: compila Zig, C e librerie incrociate, mentre i test nel codice ne sfruttano l'allocator per scoprire i leak. L'ecosistema è giovane: fissa la versione del compilatore e valuta i limiti dell'API prima di un'adozione larga.

## Fonti

- [Zig - Build System](https://ziglang.org/learn/build-system/)
- [Zig - Getting Started](https://ziglang.org/learn/getting-started/)
- [Zig Language Reference](https://ziglang.org/documentation/master/)
- [Zig Standard Library Reference](https://ziglang.org/documentation/master/std/)
