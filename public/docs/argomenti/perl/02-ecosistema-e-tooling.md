Perl non ha un unico framework "ufficiale", ma un insieme di strumenti tra loro compatibili che risolvono quasi tutto: il repository CPAN con centomila moduli, `cpanm` per installarli in modo pulito, `Getopt::Long` per le opzioni e `Test::More` per i test. Sapere quale modulo del core è già disponibile e quale conviene scaricare è metà del lavoro di manutenzione. Qui vedi come si porta uno script isolato a programma manutenibile, con test e rilascio.

## Obiettivi

- Distinguere moduli core e moduli CPAN e installarli in modo riproducibile.
- Scrivere un'opzione da riga di comando con `Getopt::Long` senza passare `@ARGV` a mano.
- Scrivere test con `Test::More` ed eseguirli con `prove`.
- Trasformare uno script in modulo con `use strict` e `Exporter`.
- Valutare casi d'uso reali: log, ETL, migrazioni legacy, amministrazione di sistema.

## CPAN, core e installazione

Un modulo è un file `Nome/Percorso.pm` con un package e deve restituire un valore vero alla fine del caricamento. I moduli **core** arrivano con l'interprete: `File::Find`, `Getopt::Long`, `JSON::PP`, `Test::More`, `Data::Dumper`, `File::Temp` sono quasi sempre presenti, mentre altri distribuiti con Perl possono mancare in build minime: `Pod::Usage` è nella libreria standard ma alcune installazioni lo separano in pacchetti. Verifica sempre con `perl -M` prima di dichiararlo come disponibile. Il resto si installa da CPAN con `cpanm` (`App::cpanminus`), che non richiede configurazione e funziona anche con `--local-lib` per non toccare il Perl di sistema.

```bash
perl -MModule::CoreList -e 'print Module::CoreList->is_core("JSON::PP") ? "core\n" : "cpan\n"'
cpanm --info JSON::PP           # dettagli dal repository
cpanm --local-lib=~/perl5 DBI   # installazione locale, senza sudo
perl -V                         # come è compilato l'interprete corrente
```

Per la riproducibilità conviene un `cpanfile` con le versioni minime: `cpanm --installdeps .` installa in CI esattamente quello che serve, invece di un elenco di comandi sparso nella documentazione.

| Strumento | Ruolo | Comando |
| --- | --- | --- |
| CPAN | repository dei moduli Perl | `cpan -D Test::More` (dettagli di un modulo) |
| cpanm | installer senza configurazione | `cpanm --installdeps .` |
| `Getopt::Long` | opzioni brevi e lunghe | `GetOptions("v|verbose" => \$v)` |
| `Test::More` | asserzioni TAP | `ok`, `is`, `like`, `is_deeply` |
| `prove` | runner dei test | `prove -lv t/` |
| `Pod::Usage` | help generato da POD | `pod2usage(-exitval => 2)` |

## Un programma con opzioni vere

`Getopt::Long` legge `@ARGV`, normalizza le forme (`-v`, `--verbose`, `--nome=valore`) e lascia in `@ARGV` gli argomenti posizionali. Gli errori di opzione si intercettano con `GetOptions(...) or pod2usage(2)`. Le opzioni sconosciute non vengono consumate, quindi il parse segnala il problema senza perdere il resto della riga.

```perl
#!/usr/bin/env perl
use strict;
use warnings;
use Getopt::Long qw(GetOptions);
use Pod::Usage;

my ($verbose, $pattern, @file);
GetOptions(
    'v|verbose'   => \$verbose,
    'p|pattern=s' => \$pattern,          # =s: il valore è una stringa
    'file=s'      => \@file,             # con la freccia le occorrenze si accumulano
    'help'        => sub { pod2usage(-exitval => 0, -verbose => 1) },
) or pod2usage(-exitval => 2, -message => "opzioni non valide\n");

print STDERR "pattern: $pattern\n" if $verbose and defined $pattern;
print "$_\n" for @ARGV, @file;           # argomenti posizionali e valori di --file
```

Le specifiche (`=s`, `=i`, `=f`) dichiarano il tipo del valore e fanno fallire il parse su input non conforme: è il parser a convertire, non il tuo codice. Un `--` chiude le opzioni, come in ogni buona CLI.

## Test e struttura

`Test::More` produce output TAP: ogni asserzione è un test, e un piano dichiarato in partenza (oppure `done_testing`) dice quanti attendersene. `prove` raccoglie i file in `t/` e riassume i risultati, `-v` mostra ogni asserzione.

```perl
# t/split_riga.t
use strict;
use warnings;
use Test::More tests => 3;

is(scalar(split(';', 'a;b')), 2, "due campi");
is_deeply([split(';', 'a;b')], ['a', 'b'], "valori attesi");
like("errore 503", qr/\d{3}/, "cattura codice");
```

Quando lo script diventa utile, si sposta la logica in un modulo sotto `lib/`, lo script si riduce a un wrapper e i test importano il modulo. La convenzione di `perlnewmod` è `lib/Nome/Percorso.pm` più `t/` per i test, con un `Exporter` che espone solo i simboli dichiarati in `@EXPORT_OK`.

```bash
perl -Ilib -MMia::Modulo -e 'print Mia::Modulo::saluta("Ada")'
prove -lv t/                  # esegue ogni file .t con output dettagliato
perl -c bin/mio-script        # controllo sintattico prima del rilascio
```

## Casi d'uso reali

Perl resta forte dove i dati sono testo: **parsing di log** e report periodici, **ETL** su file CSV e flat file, **migrazioni** di sistemi legacy, **glue** tra comandi Unix. L'efficienza di regex e hash rende banale un filtro che altrove richiede parser e strutture dati. DBI resta lo standard per parlare con i database relazionali e sostiene gran parte del software aziendale scritto prima degli anni duemila, ancora oggi in produzione.

I limiti sono noti: la mancanza di tipi statici rende i refactoring costosi in codebase grandi, e la sintassi "un linguaggio per ogni problema" premia chi conosce le convenzioni e punisce chi le improvvisa. La risposta pratica è la stessa di ogni ecosistema: moduli piccoli, `use strict` ovunque, test TAP eseguiti in CI e una sola responsabilità per script.

```bash
perl -ne 'print if /\bERROR\b/' /var/log/app.log | head
perl -MJSON::PP -e 'print "JSON in core\n"'
cpanm Text::CSV               # modulo non core, preso da CPAN
```

## Errori comuni

- **Installare in `/usr` con `sudo cpanm`**: si rompe la distro e non si sa quale versione gira; usare `--local-lib` o ambienti dedicati.
- **Assumere che un modulo non core sia già installato**: il CI parte pulito e fallisce prima del test.
- **Leggere `@ARGV` manualmente dopo `GetOptions`**: gli argomenti rimasti vanno consumati come posizionali, non ripassati al parser.
- **Moduli con `@EXPORT` universale**: l'import per default inquina il namespace; meglio `@EXPORT_OK` con import espliciti.
- **Test senza `done_testing` o senza piano**: `prove` non sa quanto attendersi e un abort può sembrare successo.

## In sintesi

L'ecosistema Perl ruota attorno a CPAN, dove i moduli core sono la base e `cpanm` installa il resto in modo riproducibile. `Getopt::Long` e `Pod::Usage` danno una CLI coerente senza parsing scritto a mano. `Test::More` e `prove` rendono i test TAP un formato comune, eseguibile in qualsiasi CI. Le applicazioni migliori restano elaborazione di testo, automazione e integrazione con sistemi esistenti.

## Fonti

- [cpan](https://perldoc.perl.org/cpan): il client della distribuzione, con ricerca e installazione dei moduli.
- [Getopt::Long](https://perldoc.perl.org/Getopt::Long): specifiche `=s`, `=i`, `=f` e gestione degli argomenti residui.
- [Test::More](https://perldoc.perl.org/Test::More): asserzioni TAP, piano dei test e `done_testing`.
- [perlnewmod](https://perldoc.perl.org/perlnewmod): layout consigliato di un modulo pubblicabile, con `lib/`, `t/` e manifest.
