Tcl (Tool Command Language) è un linguaggio interpretato in cui tutto è un comando composto da parole, e ogni valore è una stringa finché il contesto non gli chiede di comportarsi come numero o lista. Questa semplicità radicale spiega la sua longevità: il linguaggio vive dentro altri programmi come motore di script, dagli strumenti EDA ai router Cisco, e nelle pipeline di automazione si integra con `expect`, `exec` e i file system. In questa lezione impari le regole che rendono Tcl così compatto e i costrutti con cui si scrive codice leggibile.

## Obiettivi

- Riconoscere la struttura di un comando Tcl: nome, parole, separatori.
- Usare le sostituzioni `$variabile`, `[comando]` e le regole di raggruppamento con `{}` e `""`.
- Creare liste e dizionari e trattarli con `lindex`, `lappend` e `dict get`.
- Eseguire espressioni numeriche e logiche con `expr` invece che con operatori nel codice.
- Gestire procedure, variabili locali e valori di ritorno con `proc` e `return`.

## Tutto è un comando

Un programma Tcl è una sequenza di comandi separati da punto e virgola o da ritorni a capo. Ogni comando è una lista di parole: la prima è il nome del comando, le altre sono argomenti. Non ci sono parole chiave riservate, nemmeno per le strutture di controllo: `if`, `while` e `proc` sono comandi normali che appartengono allo spazio dei nomi globale e possono essere ridefiniti.

```tcl
#!/usr/bin/env tclsh
# Ogni riga è un comando: nome + parole separate da spazi.
puts "Ciao Tcl"
set nome Ada                 ;# set crea o assegna una variabile
puts "Ciao $nome, benvenuta"
puts [string length $nome]   ;# [..] esegue un comando e ne usa il risultato
puts [expr {$nome eq "Ada"}] ;# confronto di stringhe, non di numeri
```

Le parentesi quadre sono la sostituzione di comando ed è la sola forma di espressione complessa: non esistono operatori nel linguaggio base, solo comandi che restituiscono stringhe.

## Sostituzioni e raggruppamento

Prima di eseguire un comando, l'interprete applica le sostituzioni: `$var` per le variabili, `[...]` per il comando annidato e `\` per le sequenze di escape. Le virgolette doppie attivano le sostituzioni e producono una sola parola; le graffe le disattivano del tutto e conservano il testo letterale. È il `{}` che rende possibile passare a `if` o `proc` il corpo come stringa da eseguire in seguito.

| Sintassi | Sostituzioni | Uso tipico |
| --- | --- | --- |
| `"testo $var"` | sì | messaggi, costruzione di stringhe |
| `{testo $var}` | no | corpi di `proc`, `if`, `foreach`, espressioni |
| `[comando]` | risultato sostituito | ogni valore calcolato |
| `{*}$lista` | espansione degli elementi | passare una lista come argomenti |

```tcl
set saluto "Ciao $nome"     ;# sostituita: Ciao Ada
set letterale {Ciao $nome}  ;# conservata: Ciao $nome
set lingua Tcl
set frase "Imparo [string toupper $lingua]"  ;# Imparo TCL
puts [string map {Tcl 0} $lingua]            ;# mappa di caratteri: 0
puts [string match T*l $lingua]              ;# glob: 1 (vero)

# {*}$lista espande gli elementi come parole separate del comando
set mesi {gen feb mar}
set pos 1
puts [lindex $mesi {*}{$pos}]                ;# "feb": indice costruito a runtime
```

La regola pratica è coerente: le graffe non fanno mai sostituzioni, quindi sono il modo corretto per passare codice a un comando invece di valutarlo subito.

## Liste, dizionari ed espressioni

Tcl non ha tipi di dato nel senso comune: una stringa ben formata è una lista, e `list`, `lindex`, `llength` e `lappend` la trattano come tale. I dizionari, in Tcl 8.5 e successivi, associano chiavi e valori con lo stesso approccio. Le operazioni aritmetiche invece passano tutte da `expr`, che riceve le parole e le valuta come espressione.

```tcl
set taglia [list h1 2.2 h2 1.9 h3 1.4]
puts [lindex $taglia 0]          ;# h1
lappend taglia h4 1.2            ;# append in place
puts [llength $taglia]           ;# 7 elementi

set conf [dict create porta 8080 debug false]
dict set conf host 127.0.0.1     ;# aggiunge o aggiorna una chiave
puts [dict get $conf porta]      ;# 8080

set totale [expr {[dict get $conf porta] + 1}]
if {[expr {$totale > 8000}]} {
    puts "porta alta: $totale"
}
```

`expr` accetta graffe per non dover proteggere operatori e parentesi, ed è qui che avviene la conversione da stringa a numero: `"42"` diventa l'intero 42 solo quando serve.

## Procedure, scope e ritorno

`proc` definisce un nuovo comando con parametri, corpo e un eventuale valore di ritorno. Le variabili dichiarate all'interno sono locali: per modificare una variabile del chiamante si usa `upvar`, mentre `global` rende visibile quella globale.

```tcl
proc media {valori} {
    set somma 0.0
    foreach v $valori {
        set somma [expr {$somma + $v}]
    }
    if {[llength $valori] == 0} {
        return -code error "lista vuota"   ;# errore con opzioni
    }
    return [expr {$somma / [llength $valori]}]
}

puts [media {10 20 30}]   ;# 20.0
```

Il parametro speciale `args` raccoglie gli argomenti residui in una lista, e `return` può impostare il codice di errore o completamento con `-code`, caratteristica utile quando si scrive un ciclo personalizzato o un comando che deve propagare un'eccezione. Un proc senza `return` esplicito restituisce la stringa vuota, perché in Tcl ogni comando ha comunque un valore.

## Errori comuni

- **Scrivere espressioni fuori da `expr`**: `set x 1 + 2` produce la stringa `"1 + 2"`, non 3; la valutazione avviene solo dentro `expr`.
- **Usare le virgolette per un corpo da eseguire dopo**: `if "$x > 0" {...}` sostituisce subito anche `$y` non ancora definita; servono sempre le graffe.
- **Dimenticare il `$` prima della variabile in un comando**: `lindex lista 0` cerca una lista literalmente chiamata `lista`.
- **Modificare il contatore di `foreach` per cambiare l'iterazione**: l'iteratore ignora le assegnazioni e scorre sempre la stessa sequenza fissata all'inizio.
- **Confondere stringa e lista senza controllo**: una stringa con graffe sbilanciate fa fallire `llength` con un errore di lista malformata.

## In sintesi

Tcl riduce la sintassi a una sola regola: tutto è un comando fatto di parole. Le graffe bloccano la sostituzione e servono per passare codice, le quadre valutano un comando e ne prendono il risultato. Liste e dizionari sono stringhe strutturate, l'aritmetica passa da `expr`. `proc` crea comandi con variabili locali e `upvar` o `global` per accedere allo scope superiore. Capire queste poche regole basta per leggere la maggior parte degli script Tcl esistenti.

## Fonti

- [Tcl man page: Tcl, sintassi e regole di sostituzione — https://www.tcl-lang.org/man/tcl8.6/TclCmd/Tcl.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/Tcl.htm)
- [Tcl man page: expr, espressioni e conversioni — https://www.tcl-lang.org/man/tcl8.6/TclCmd/expr.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/expr.htm)
- [Tcl man page: upvar, riferimento a variabili dello scope chiamante — https://www.tcl-lang.org/man/tcl8.6/TclCmd/upvar.htm](https://www.tcl-lang.org/man/tcl8.6/TclCmd/upvar.htm)
- [Tcl site: download di Tcl/Tk — https://www.tcl-lang.org/software/tcltk/](https://www.tcl-lang.org/software/tcltk/)
- [Wiki Tcl: What is Tcl — https://wiki.tcl-lang.org/page/What+is+Tcl](https://wiki.tcl-lang.org/page/What+is+Tcl)
