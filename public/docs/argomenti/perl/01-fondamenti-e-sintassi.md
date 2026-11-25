Perl è un linguaggio dinamico nato nel 1987 per estrarre dati dai report di sistema, e ha mantenuto quella vocazione: elaborazione di testo, file e processi con una sintassi compatta e un sistema di stringhe e hash molto diretto. È spesso descritto come "la colla di Unix", perché da solo sostituisce catene di `sed`, `awk` e `grep` mantenibili e versionabili. In questa lezione vedi i tipi fondamentali, il contesto in cui si valutano le espressioni, le espressioni regolari e il modello di esecuzione di uno script.

## Obiettivi

- Distinguere scalari, array e hash e sapere cosa contiene `$_`.
- Leggere il contesto (scalare, lista, vuoto) come un effetto del tipo di ritorno.
- Usare `map`, `grep` e dereferenziare strutture con `->`.
- Scrivere ed eseguire pattern con modificatori `m//`, `s///` e `qr//`.
- Attivare `use strict` e `use warnings` per intercettare gli errori prima del runtime.

## Scalari, array e hash

Perl ha tre tipi di contenitore e un sigillo che ne dichiara il tipo: `$` per gli scalari, `@` per gli array, `%` per gli hash. Una variabile è "un nome": il sigillo dice come la vuoi leggere, non cambia il contenitore.

```perl
use strict; use warnings;
use v5.36;              # abilita le feature delle versioni recenti

my $nome   = "Ada";     # scalare: stringa, numero o riferimento
my @mesi   = ("gen", "feb", "mar");     # array indicizzato da 0
my %cap    = (Roma => 1, Milano => 2);  # hash chiave-valore

say scalar @mesi;             # 3: in contesto scalare l'array dà la lunghezza
say $mesi[$#mesi];            # "mar": ultimo elemento
say scalar(keys %cap);        # 2: le chiavi contano due voci
$cap{Torino} = 3;             # inserimento o aggiornamento
delete $cap{Milano};          # rimozione

# riferimento: uno scalare che punta a una struttura
my $r = { nome => "Ada", anni => \@mesi };  # riferimento all'array
say $r->{anni}[1];            # "feb": freccia ad ogni dereference
```

Un array in contesto di lista e in contesto scalare si comporta diversamente: `@mesi` in `say` stampa gli elementi, `scalar @mesi` dà il numero di elementi. Questa è la prima sorgente di bug per chi arriva da altri linguaggi. Il **contesto** è una proprietà del punto di chiamata e lo vedrai di nuovo con i sottoprogrammi e con `wantarray`.

## Sottoprogrammi e contesto

Gli argomenti arrivano nell'array globale `@_`. Da Perl 5.36 le firme fanno parte delle feature stabili, attivate da `use v5.36` o `use feature 'signatures'`: i parametri hanno un nome e il codice diventa leggibile senza `shift @_`.

```perl
sub somma { my @n = @_; my $tot = 0; $tot += $_ for @n; $tot }
sub somma_firma ($a, $b) { $a + $b }   # firma attivata da use v5.36

say somma(1, 2, 3);        # 6
say somma_firma(4, 5);     # 9

sub nomi ($rif) { map { $_->{nome} } @$rif }

my @utenti = ({ nome => "ada" }, { nome => "bea" });
say join(", ", nomi(\@utenti));   # "ada, bea"
```

`$_` è la variabile predefinita: molti operatori come `for`, `map`, `grep` e i pattern la impostano, e questo spiega perché Perl possa risultare poco leggibile se `$_` viene usato senza criterio. `map` e `grep` in lista restituiscono liste, in scalare restituiscono un conteggio o un numero.

| Costrutto | Ritorno in lista | Ritorno in scalare |
| --- | --- | --- |
| `@array` | elementi | numero di elementi |
| `keys %h` | chiavi | numero di chiavi |
| `map { ... } @a` | elementi trasformati | numero di elementi |
| `grep { ... } @a` | elementi filtrati | numero di elementi |
| `wantarray` in un sub | `undef` | valore in base al bisogno |

## Espressioni regolari integrate

Le regex sono parte della sintassi: `m//` cerca, `s///` sostituisce, `tr///` trasduce caratteri, `qr//` compila un pattern riutilizzabile. I modificatori più comuni sono `g` (tutte le occorrenze), `i` (case-insensitive), `x` (spazi ignorati nel pattern), `m` (`.^$` per riga) e `s` (`.` comprende il newline).

```perl
my $riga = "INFO 2026-11-07 utente=ada";
if ($riga =~ m/^INFO\s+(\d{4}-\d{2}-\d{2})\s+utente=(\w+)$/) {
    say "data: $1, utente: $2";     # $1 e $2 sono i gruppi catturati
}

my $pattern = qr/error|fatal/i;     # compilato una volta, riusato
say "errore" if $riga =~ $pattern;

$riga =~ s/INFO/LOG/;               # sostituzione della prima occorrenza
(my $copie = $riga) =~ s/=/: /g;    # sostituzione globale su una copia
say $copie;
```

Il match restituisce `true`/`false` in contesto booleano, ma in contesto lista restituisce le catture: `my ($data, $utente) = $riga =~ m/(\d{4}-\d{2}-\d{2}).*utente=(\w+)/;`. Nota la parentesi in `(my $copie = $riga) =~ ...`: su `my $copie = $riga =~ s///` modificheresti `$riga` e assegneresti a `$copie` un conteggio.

## Modello di esecuzione

Il runtime `perl` legge un file, lo compila in un albero di operazioni e lo esegue. Lo scope è lessicale (`my`), le variabili non dichiarate sono globali (`our`) e `use strict` rende obbligatoria la dichiarazione. `use warnings` segnala invece sospetti come variabili mai inizializzate. Le direttive `use` vengono eseguite a tempo di compilazione, quindi importano simboli e attivano feature prima che il codice giri.

```bash
perl -e 'print "ok\n"'           # esegue un'espressione da riga di comando
perl -c script.pl                # controlla la sintassi senza eseguire
perl -Mstrict -Mwarnings script.pl
perl -ne 'print if /error/' log  # filtro riga per riga (implicito while <>)
perl -pi -e 's/vecchio/nuovo/g' *.txt   # modifica in place, crea backup con -i.bak
```

`-n` avvolge il codice in un ciclo di lettura delle righe, `-p` aggiunge la stampa: sono la scorciatoia più usata e anche la più abusata, perché tendono a diventare script veri senza struttura.

## Errori comuni

- **`my $x = @array` senza `scalar`**: funziona, ma quasi sempre si voleva la lista; il contesto cambia il risultato.
- **Confondere `$#a` con `$a[-1]`**: `$#a` è l'indice massimo, non l'ultimo valore.
- **Usare `$_` in funzioni annidate**: il loop interno sovrascrive la variabile predefinita del loop esterno.
- **Dimenticare `use strict` e `use warnings`**: le variabili non dichiarate diventano globali silenziose e la diagnosi arriva tardi.
- **Confondere `eq`/`ne` con `==`/`!=`**: i primi confrontano stringhe, i secondi numeri, con avvisi diversi su input non numerico.

## In sintesi

Perl usa sigilli per distinguere scalari, array e hash, e valuta le espressioni in base al contesto in cui compaiono. I sottoprogrammi ricevono gli argomenti in `@_` e possono usare firme con le feature moderne. Le espressioni regolari sono parte del linguaggio, con catture `$1`, `$2` e modificatori per righe intere o globali. `use strict` e `use warnings` sono lo standard per un codice che deve essere diagnosticabile, non solo funzionante.

## Fonti

- [perlintro](https://perldoc.perl.org/perlintro): introduzione ufficiale a sintassi, strutture dati e regex.
- [perldata](https://perldoc.perl.org/perldata): riferimento a scalari, array, hash e contesto di valutazione.
- [perlre](https://perldoc.perl.org/perlre): sintassi completa delle espressioni regolari e dei modificatori.
- [perlrun](https://perldoc.perl.org/perlrun): opzioni del comando `perl`, incluse `-n`, `-p` e `-i`.
