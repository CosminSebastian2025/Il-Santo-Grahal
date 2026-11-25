In questo laboratorio costruisci `tcl-logspy`, uno strumento che legge un log una riga alla volta e riassume gli errori per livello senza caricarlo in memoria. È lo script tipico che in Tcl si scrive davvero: un pacchetto con namespace, un parser testabile e un codice di uscita affidabile. Avrai anche test che girano con `tclsh`.

## Obiettivi

- Leggere un log a righe con `open`, `gets` e `close`, gestendo le righe malformate.
- Estrarre livello e messaggio con `regexp` senza un formato troppo rigido.
- Accumulare i conteggi in un dizionario e stamparli in un formato stabile.
- Tradurre il contratto CLI in opzioni, messaggi e codici di uscita.
- Testare il parser su casi normali, righe vuote e input non conforme.

## Il contratto di `tcl-logspy`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `tcl-logspy [-l LIVELLO] FILE` | un solo file, obbligatorio |
| `-l, --level L` | filtra per livello | restringere la vista senza `grep` |
| `--strict` | riga malformata = errore | controllo nelle pipeline di build |
| exit 0 | lettura completata | anche con file vuoto |
| exit 1 | file mancante o opzione invalida | errore operativo |
| exit 2 | riga malformata con `--strict` | input non conforme |

Una riga è valida se contiene un livello noto tra quadre, per esempio `2026-11-07 10:12:01 [ERR] database non raggiungibile`; il resto è conteggiato come ignorato, o interrompe con `--strict`.

```bash
tclsh tcl-logspy.tcl -l ERR app.log   # solo errori
tclsh tcl-logspy.tcl /non/esiste.log; echo "exit: $?"
: > vuoto.log && tclsh tcl-logspy.tcl vuoto.log; echo "exit: $?"
```

## Core: parser e conteggi

Il cuore è una funzione pura: da una riga ricava `{livello messaggio}` o una lista vuota, così parser e I/O si testano separatamente.

```tcl
package provide logspy 1.0

namespace eval ::logspy {
    namespace export parse stat riassunto

    # Estrae livello e messaggio: lista vuota se la riga non è conforme
    proc parse {riga} {
        set pattern {^\S+ \S+ \[(DEBUG|INFO|WARN|ERR)\] (.*)$}
        if {![regexp $pattern $riga -> livello messaggio]} { return {} }
        return [list $livello [string trim $messaggio]]
    }

    # Aggiorna i contatori in un dizionario chiave -> numero
    proc stat {dizionario_var livello} {
        upvar 1 $dizionario_var acc
        dict incr acc $livello
    }

    # Riassunto con i livelli noti sempre presenti, anche a zero
    proc riassunto {acc} {
        set righe {}
        foreach l {DEBUG INFO WARN ERR} {
            dict incr acc $l 0     ;# crea la chiave solo se manca
            lappend righe "$l\t[dict get $acc $l]"
        }
        return [join $righe "\n"]
    }
}
```

`upvar 1` collega il dizionario esterno senza copiarlo: per questo `stat` riceve il nome della variabile. La lettura usa `gets`, con memoria costante:

```tcl
proc leggi {file filtro} {
    set fh [open $file r]
    try {
        set acc [dict create] ; set ignorate 0
        while {[gets $fh riga] >= 0} {
            set coppia [::logspy::parse $riga]
            if {[llength $coppia] == 0} { incr ignorate; continue }
            lassign $coppia livello messaggio
            if {$filtro ne "" && $livello ne $filtro} continue
            ::logspy::stat acc $livello
        }
        return [dict create acc $acc ignorate $ignorate]
    } finally {
        close $fh      ;# sempre, anche se una riga solleva un errore
    }
}
```

`try`/`finally` chiude il canale anche in caso di errore, altrimenti i descrittori aperti si accumulano.

## CLI e codice di uscita

`main` interpreta le opzioni a mano, perché Tcl non ha un parser integrato, e traduce gli errori in codici distinti; i messaggi vanno su stderr.

```tcl
proc main {args} {
    set file "" ; set filtro "" ; set strict 0
    for {set i 0} {$i < [llength $args]} {incr i} {
        set a [lindex $args $i]
        switch -- $a {
            -l - --level {
                incr i
                if {$i >= [llength $args]} { return -code error "manca il livello" }
                set filtro [lindex $args $i]
            }
            --strict { set strict 1 }
            default {
                if {[string index $a 0] eq "-"} { return -code error "opzione $a" }
                set file $a
            }
        }
    }
    if {$file eq ""} { return -code error "serve un file" }
    # Le opzioni -n, --top e i file multipli restano come esercizio
    set esito [leggi $file $filtro]
    if {$strict && [dict get $esito ignorate] > 0} { exit 2 }
    puts [::logspy::riassunto [dict get $esito acc]]
}

# Avvio: un solo catch traduce ogni errore in exit 1
if {$::argv0 eq [info script]} {
    if {[catch {main {*}$argv} errore]} {
        puts stderr "tcl-logspy: $errore"
        exit 1
    }
}
```

`$::argv0 eq [info script]` distingue esecuzione diretta e importazione: con `source`, `main` non parte.

## Test e criterio di uscita

I test verificano parser e riassunto senza aprire file: i fallimenti diventano il codice di uscita.

```tcl
source tcl-logspy.tcl
set falliti 0

proc check {nome atteso ottenuto} {
    global falliti
    if {$atteso ne $ottenuto} {
        incr falliti
        puts "FAIL $nome: atteso {$atteso}, ottenuto {$ottenuto}"
    }
}

check "riga ERR" {ERR disco pieno} \
    [::logspy::parse "2026-11-07 10:12:01 [ERR] disco pieno"]
check "riga vuota" {} [::logspy::parse ""]
check "livello ignoto" {} [::logspy::parse "x y [TRA] ciao"]

if {$falliti > 0} { exit 1 }
puts "tutti i test passano"
```

Criterio manuale: file assente → exit 1 su stderr, riga malformata → exit 2 solo con `--strict`, file vuoto → livelli a zero ed exit 0.

## Esercizi

1. Aggiungi `-n, --top N` per i messaggi più frequenti, con default 3.
2. Accetta più file e somma i conteggi, indicando per ciascuno le righe ignorate.
3. Supporta `-` come nome file per leggere da stdin.
4. Misura con `time` la differenza tra `gets` e `read` più `split` su un log da 50 MiB.
5. Verifica `riassunto` su un dizionario parziale, senza `WARN` e `ERR`.

<details>
<summary>Soluzione</summary>

1. I messaggi vanno in un dizionario `msg`, `lsort -integer -decreasing -index 1` ordina le coppie e `lrange` tronca a `$top`.

2. `main` raccoglie i file e somma i dizionari con `dict incr`; un file mancante interrompe con exit 1 e il suo nome nell'errore.

3. Con `-` si legge da `stdin` nello stesso ciclo `gets`, saltando la `close`.

4. `gets` usa memoria costante, un ciclo per riga; `read` più `split` è più veloce ma alloca quanto il file.

5. `riassunto` con `[dict create DEBUG 2]` deve dare WARN e ERR a zero.

</details>

## Errori comuni

- **Lasciare un canale aperto dopo un errore**: senza `try`/`finally` il `close` salta e i descrittori si accumulano.
- **Usare `regexp` senza gruppi di cattura**: senza parentesi, `lassign` riceve solo l'intera riga.
- **Stampare errori su stdout**: rompe chi legge stdout come dato; lo stato di errore appartiene a stderr.
- **Leggere `argv` in una procedura senza `::`**: la copia locale è vuota e gli argomenti sembrano ignorati.
- **Fidarsi del codice di uscita senza `catch`**: senza intercettazione il codice dipende dal contesto.

## In sintesi

Un logspy in Tcl è un pacchetto con namespace, un parser da riga a lista e un reporter su dizionario: memoria costante, canali sempre chiusi e codici 0, 1 e 2 lo rendono componibile con la shell.

## Fonti

- [Tcl man page: Tcl, separatori e sostituzioni — https://www.tcl-lang.org/man/tcl8.6/TclCmd/Tcl.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/Tcl.htm)
- [Tcl man page: upvar, modifica di variabili per nome — https://www.tcl-lang.org/man/tcl8.6/TclCmd/upvar.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/upvar.htm)
- [Tcl man page: subst, sostituzioni su una stringa — https://www.tcl-lang.org/man/tcl8.6/TclCmd/subst.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/subst.htm)
- [Guida Tcl: howto e pattern di programmazione — https://www.tcl-lang.org/doc/howto/](https://www.tcl-lang.org/doc/howto/)
- [Tcl site: download e installazione dell'interprete tclsh — https://www.tcl-lang.org/software/tcltk/](https://www.tcl-lang.org/software/tcltk/)
