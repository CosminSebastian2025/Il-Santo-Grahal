In questo laboratorio costruisci `zig-conta`, una CLI che legge un file o stdin e stampa righe, parole e byte, scritta interamente in Zig con `std`. Non è una copia di `wc`: serve a esercitare i pezzi di un programma Zig reale, cioè allocator, errori tipizzati, argomenti, I/O e test. Alla fine avrai un binario singolo e test che verificano anche i leak.

## Obiettivi

- Ridisegnare un contratto CLI minimo con opzioni e codice di uscita coerenti.
- Leggere un file o stdin con `std.fs` e un `std.mem.Allocator` esplicito.
- Contare righe, parole e frequenze usando `std.StringHashMap`.
- Gestire opzioni invalide e file mancanti con errori tipizzati.
- Scrivere test con `std.testing.allocator` che rilevano le perdite di memoria.

## Il contratto di `zig-conta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `zig-conta [OPZIONI] [FILE]` | senza file legge stdin |
| `-w, --words` | con la top, attiva le frequenze | modalità aggiuntiva |
| `-n, --top N` | intero >= 1, default 5 | limite di stampa |
| `-j, --json` | output su una riga | consumo da script |
| exit 0 | successo | anche con conteggi a zero |
| exit 1 | file illeggibile o overflow | errore operativo |

`zig-conta` senza argomenti e con stdin vuoto stampa zeri ed esce con 0: il vuoto è un risultato. Il file che non si apre è invece un errore operativo.

```bash
zig build
zig build-exe src/main.zig -O ReleaseSafe
echo "ciao zig ciao" | ./zig-conta -n 2
./zig-conta note.txt; printf 'exit: %s\n' "$?"
```

## Core: conteggi e allocator

Il programma riceve uno `std.mem.Allocator` e libera tutto ciò che alloca. Leggere l'intero input semplifica il conteggio e isola il punto da sostituire con uno streaming in un secondo tempo.

```zig
const std = @import("std");

pub const Conteggi = struct { righe: usize, parole: usize, byte: usize };

pub fn conta(testo: []const u8) Conteggi {
    var it = std.mem.tokenizeAny(u8, testo, " \t\r\n");
    var parole: usize = 0;
    while (it.next()) |_| parole += 1; // token separati da spazi bianchi
    var righe: usize = 0;
    for (testo) |c| {
        if (c == '\n') righe += 1;
    }
    if (testo.len > 0 and testo[testo.len - 1] != '\n') righe += 1; // ultima riga senza a capo
    return .{ .righe = righe, .parole = parole, .byte = testo.len };
}
```

`conta` non alloca: lavora su una slice e restituisce una struct per valore. `frequenze` dimostra il caso opposto, perché la mappa deve essere liberata da chi chiama con `deinit`.

```zig
fn frequenze(alloc: std.mem.Allocator, testo: []const u8) !std.StringHashMap(usize) {
    var freq = std.StringHashMap(usize).init(alloc);
    var it = std.mem.tokenizeAny(u8, testo, " \t\r\n");
    while (it.next()) |p| {
        const gop = try freq.getOrPut(p);
        if (!gop.found_existing) gop.value_ptr.* = 0;
        gop.value_ptr.* += 1;
    }
    return freq; // chiavi che puntano a testo: liberalo dopo
}

fn leggi(alloc: std.mem.Allocator, percorso: ?[]const u8) ![]u8 {
    const limite = 64 * 1024 * 1024;
    if (percorso) |p| return std.fs.cwd().readFileAlloc(alloc, p, limite);
    return std.fs.File.stdin().readToEndAlloc(alloc, limite);
}
```

La funzione `run` implementa il contratto, mentre il `main` contiene solo allocator, argomenti e mappatura degli errori in uscita 1. Le opzioni `-w`, `-n` e `-j` sono la parte di parser che resta da completare negli esercizi.

```zig
pub fn run(alloc: std.mem.Allocator, argv: []const []const u8, out: anytype) !void {
    var percorso: ?[]const u8 = null;
    for (argv[1..]) |a| {
        if (a.len == 0 or a[0] == '-') return error.OpzioneSconosciuta;
        if (percorso == null) percorso = a else return error.UsoErrato;
    }
    const testo = try leggi(alloc, percorso);
    defer alloc.free(testo); // anche in caso di errore
    const c = conta(testo);
    try std.fmt.format(out, "{d} {d} {d}\n", .{ c.righe, c.parole, c.byte });
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();
    const alloc = gpa.allocator();
    const argv = try std.process.argsAlloc(alloc);
    defer std.process.argsFree(alloc, argv);
    run(alloc, argv, std.io.getStdOut().writer()) catch |err| {
        std.debug.print("zig-conta: {s}\n", .{@errorName(err)});
        std.process.exit(1);
    };
}
```

## Test e criterio di uscita

I test coprono input normale, input vuoto e il caso delle frequenze. L'allocator di test trasforma un leak in un fallimento, quindi ogni `alloc` deve avere il suo `free`.

```zig
test "conta righe e parole" {
    const c = conta("ciao zig\nciao lua");
    try std.testing.expectEqual(@as(usize, 2), c.righe);
    try std.testing.expectEqual(@as(usize, 4), c.parole);
    try std.testing.expectEqual(@as(usize, 18), c.byte);
}

test "frequenze e input vuoto" {
    var freq = try frequenze(std.testing.allocator, "ciao zig ciao");
    defer freq.deinit(); // l'allocator di test segnala i leak
    try std.testing.expectEqual(@as(usize, 2), freq.get("ciao").?);
    try std.testing.expectEqual(@as(usize, 0), conta("").righe);
}
```

Il contratto da verificare a mano è breve: `printf '' | ./zig-conta` deve dare `0 0 0` ed exit 0; `./zig-conta /non/esiste` deve uscire con 1 e scrivere su stderr.

## Esercizi

1. Aggiungi `-s, --sort nome|freq` per ordinare le parole, con default `freq`.
2. Rendi `--json` stabile con i campi `righe`, `parole`, `byte` e `top`, e scrivi un test che ne verifichi l'ordine.
3. Leggi a blocchi da 8 KiB invece che con `readFileAlloc`: cosa deve cambiare in `conta`?
4. Gestisci input non UTF-8 senza rompere il conteggio e senza produrre JSON invalido.
5. Aggiungi `--max-bytes N` con errore dedicato e un test di fallimento dell'allocatore.
6. Confronta `-O ReleaseFast` e `-O ReleaseSafe` su un file da 10 MiB: cosa cambia e perché?

<details>
<summary>Soluzione</summary>

1. Una `std.ArrayList` con l'allocator ricevuto raccoglie le voci, `std.mem.sort` ordina con un comparatore su `n` o `std.mem.order`, e la lista va liberata dopo la stampa.

2. `std.json.string` serializza lo struct dei conteggi e l'array `top` verso il writer; il test confronta l'intera riga con `expectEqualStrings`, che blocca l'ordine dei campi.

3. `conta` accumula righe e parole a pezzi; le chiavi si copiano con `alloc` perché i blocchi vengono riutilizzati, e `deinit` deve liberarle iterando sulla mappa.

4. Il conteggio sui byte non fallisce mai; prima di serializzare valida le parole con `std.unicode.utf8ValidateSlice` e scarta le sequenze non valide.

5. `leggi` passa `max_bytes` a `readToEndAlloc`: oltre il limite arriva `error.StreamTooLong`, che `main` stampa ed esce con 1. Il test con `std.testing.FailingAllocator` verifica che non restino allocazioni.

6. `ReleaseFast` elimina i controlli di overflow, `ReleaseSafe` li mantiene: il primo è più veloce, il secondo panica invece di eseguire codice indefinito. Confronta con `time` e `ls -l`.

</details>

## Errori comuni

- **Restituire slice allocate senza documentare chi le libera**: il chiamante non può sapere se il buffer è suo o del callee.
- **Usare chiavi che puntano a un buffer liberato**: la mappa tiene i puntatori, non copia le stringhe, e dopo il `free` i valori diventano invalidi.
- **Leggere stdin due volte**: il secondo `readToEndAlloc` ritorna vuoto e i conteggi risultano a zero senza errore.
- **Stampare su stdout un errore operativo**: rompe le pipe e confonde gli script, che canalizzano stdout.
- **Testare solo l'input felice**: il caso vuoto e il file mancante sono quelli che rompono le pipeline.

## In sintesi

Zig rende espliciti i tre elementi che di solito sfuggono: allocazione, errori e ownership. Qui hai separato il core testabile (`run`) dal `main` e usato una mappa di stringhe che non copia le chiavi. Il passo successivo è la lettura a blocchi, che cambia l'ownership e avvicina lo strumento a un vero `wc`.

## Fonti

- [Zig Language Reference](https://ziglang.org/documentation/master/)
- [Zig Standard Library Reference](https://ziglang.org/documentation/master/std/)
- [Zig - Getting Started](https://ziglang.org/learn/getting-started/)
- [Zig - Build System](https://ziglang.org/learn/build-system/)
