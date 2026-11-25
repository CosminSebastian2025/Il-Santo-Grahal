Tcl è nato alla fine degli anni Ottanta per essere incorporato in un'applicazione, e ancora oggi vive soprattutto dentro altri programmi: il sito ufficiale distribuisce l'interprete e la libreria Tk come «toolkit di sviluppo di applicazioni», Tcllib raccoglie i moduli in puro Tcl e TclOO aggiunge gli oggetti al core. Per lavorare in modo produttivo servono tre cose: sapere come si distribuisce uno script, conoscere gli strumenti di ecosistema e avere una strategia di test ripetibile, perché Tcl non impone un framework ma consente di verificarne uno.

## Obiettivi

- Usare le variabili speciali `argv0`, `argv` ed `env` come punto di ingresso di uno script.
- Organizzare il codice con `package provide` e `namespace eval` e distribuire un pacchetto locale.
- Avviare processi esterni con `exec` sapendo gestire stdout, stderr e codici di uscita.
- Pianificare lavoro differito con `after` e capire quando serve un event loop.
- Verificare un pacchetto con test eseguibili da `tclsh` e restituire un codice di uscita coerente.

## L'interprete e lo script standalone

`tclsh` esegue un file e termina: non esiste un compilatore e la distribuzione consiste nel consegnare lo script insieme all'installazione di Tcl. Gli argomenti finiscono in `argv`, `argv0` contiene il nome di invocazione e la variabile globale `env` espone le variabili d'ambiente come dizionario.

```tcl
#!/usr/bin/env tclsh
# Legge un file di testo e ne restituisce il contenuto senza spazi finali
proc legge_release {file} {
    if {![file readable $file]} { return "sconosciuta" }
    set fh [open $file r]
    set contenuto [string trim [read $fh]]
    close $fh
    return $contenuto
}

# argv è la lista degli argomenti: conta e prende il primo
if {[llength $argv] > 0} {
    puts "primo argomento: [lindex $argv 0]"
}
# env è un dizionario: dict exists evita l'errore di chiave mancante
if {[dict exists $env HOME]} {
    puts "home: [dict get $env HOME]"
}
```

Sotto Windows uno script `.tcl` si avvia con `tclsh script.tcl`, mentre per le applicazioni grafiche si usa `wish`. Il codice di uscita si imposta con `exit N`, e un `exit 0` implicito dà successo.

## Organizzare il codice: namespace e package

Un file riutilizzabile dichiara ciò che fornisce con `package provide nome versione`, e chi lo usa lo richiede con `package require`; l'interprete lo cerca nelle directory elencate in `auto_path` e lo esegue una sola volta. I comandi correlati si racchiudono in `namespace eval`, che offre un contenitore senza keyword dedicate.

| Meccanismo | Scopo | Comando chiave |
| --- | --- | --- |
| `package provide/require` | dichiarare e richiedere un pacchetto | `package require json` |
| `namespace eval` | raggruppare comandi per dominio | `namespace eval conti { ... }` |
| `namespace export/import` | esporre parte dei comandi | `namespace import conti::*` |
| Tcllib | libreria di moduli puri Tcl | `json::json2dict` |
| TclOO | programmazione a oggetti nel core 8.6 | `oo::class create` |

```tcl
# File lib/conti.tcl: un pacchetto minimo con namespace proprio
package provide conti 1.0

namespace eval ::conti {
    namespace export totale tolleranza

    # Somma una lista di importi decimali
    proc totale {importi} {
        set s 0.0
        foreach i $importi { set s [expr {$s + $i}] }
        return $s
    }

    # Verifica che uno scarto resti entro la tolleranza
    proc tolleranza {scarto limite} {
        return [expr {abs($scarto) <= $limite}]
    }
}
```

Dal file chiamante si scrive `lappend auto_path ./lib` e poi `package require conti 1.0`; il secondo `package require` restituisce la versione già caricata senza rieseguire il file.

## Eseguire processi e differire lavoro

`exec` avvia un processo esterno, ne cattura stdout e fallisce se il comando scrive su stderr o esce con codice diverso da zero: è lo strumento principe delle pipeline di automazione, e l'errore si governa con `catch`. `after` schedula invece un comando nel futuro e restituisce un identificativo annullabile.

```tcl
set risultato [catch {exec git rev-parse --abbrev-ref HEAD} ref output]
if {$risultato != 0} {
    puts stderr "git ha risposto: $output"   ;# nessun comando deve rompere lo script
    exit 1
}
puts "branch corrente: [string trim $ref]"

# Pipeline delegata a sh: glob e pipe sono compiti della shell, non di exec
puts [exec sh -c {printf 'a\nb\na\n' | sort | uniq -c}]
```

`-ignorestderr` impedisce che un avviso diventi errore, utile con tool che scrivono rumore diagnostico pur funzionando. Al contrario `--` protegge gli argomenti che iniziano con un trattino.

| Comando | Comportamento | Uso |
| --- | --- | --- |
| `after ms` | sospende il processo | attesa sincrona |
| `after ms script` | pianifica un comando | timer |
| `after cancel id` | annulla un comando pianificato | timeout annullato |
| `vwait var` | attende un evento | script headless con event loop |

Senza event loop attivo `after 100` dorme, mentre in Tk o dopo `vwait` il comando viene eseguito dalla coda eventi: questa distinzione spiega la maggior parte dei «timer che non partono».

## Test con tcltest

La Tcllib fornisce `tcltest` per dichiarare casi con `test`; `cleanupTests` stampa il riepilogo e trasforma il numero di fallimenti nel codice di uscita, ideale per la shell.

```tcl
package require tcltest 2.5
namespace import tcltest::test tcltest::cleanupTests
lappend auto_path ./lib ;# conti.tcl vive nella cartella lib/
package require conti 1.0

test totale-due-importi "somma base" -body {
    conti::totale {10.0 2.5}
} -result 12.5

test tolleranza-scarto "scarto fuori limiti" -body {
    conti::tolleranza 3 1
} -result 0

cleanupTests   ;# riepilogo e codice di uscita pari ai fallimenti
```

Un file in stile `assert` con `if` e `error` funziona su qualsiasi installazione senza dipendenze, ed è spesso la scelta migliore per script distribuiti su macchine eterogenee.

## Errori comuni

- **Dimenticare `package require` dopo aver corretto il pacchetto**: la versione caricata resta in memoria e le modifiche non si vedono finché non si riapre l'interprete.
- **Trattare `exec` come una shell**: `exec ls *.txt` non espande il glob, che arriva letteralmente al comando; l'espansione richiede `sh -c`.
- **Ignorare il codice di uscita di `exec`**: un processo che fallisce fa sollevare un errore Tcl che, senza `catch`, chiude lo script con un messaggio poco utile.
- **Aspettarsi che `after` esegua senza event loop**: in uno script non interattivo il comando non parte mai, oppure l'interprete attende in modo sincrono.
- **Mettere codice e test nello stesso file senza `package require`**: lo script può passare importando accidentalmente un'installazione diversa da quella in sviluppo.

## In sintesi

Tcl è distribuito come interprete più libreria, e uno script è un file testuale con `argv` ed `env` come interfaccia verso l'esterno. `package provide` e `namespace eval` danno modularità senza keyword dedicate, `exec` collega il linguaggio ai processi di sistema, `after` introduce l'asincronia ma richiede un event loop. Il testing si costruisce con `tcltest` o con un runner minimale, purché il codice di uscita rifletta i fallimenti.

## Fonti

- [Tcl site: distribuzione di Tcl/Tk e toolkit di sviluppo applicazioni — https://www.tcl-lang.org/software/tcltk/](https://www.tcl-lang.org/software/tcltk/)
- [Tcl man page: after, comandi differiti e event loop — https://www.tcl-lang.org/man/tcl8.6/TclCmd/after.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/after.htm)
- [Tcl man page: namespace, contenitori di comandi e variabili — https://www.tcl-lang.org/man/tcl8.6/TclCmd/namespace.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/namespace.htm)
- [Tcl man page: tclvars, variabili globali come env, argv e auto_path — https://www.tcl-lang.org/man/tcl8.6/TclCmd/tclvars.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/tclvars.htm)
- [Tcllib: moduli Tcl e indice dei pacchetti — https://www.tcl-lang.org/doc/tcllib/index.html](https://www.tcl-lang.org/doc/tcllib/index.html)
