In questo laboratorio costruisci `logstat`, uno script Perl che legge un file di log, classifica le righe per livello e stampa una tabella di conteggi. È il tipo di compito per cui Perl è nato: testo in ingresso, regole dichiarative, output compatto e testabile. Parti da uno script di poche righe, lo separi in modulo e script, e lo proteggi con `Test::More` e `prove`.

## Obiettivi

- Scrivere un filtro riga per riga con espressioni regolari e catture.
- Separare la logica in un modulo `lib/Logstat.pm` e l'ingresso da terminale in `bin/logstat`.
- Usare `Getopt::Long` per le opzioni e `Pod::Usage` per l'help.
- Scrivere test TAP con `Test::More` e lanciarli con `prove`.
- Gestire con `warn` ed exit code i file mancanti e le righe non riconosciute.

## Il formato di input e il contratto

Il log di partenza ha righe come `2026-11-07T09:12:33 INFO utente=ada azione=login`. Il contratto dice: righe non conformi vengono ignorate e conteggiate a parte; il comando esce con 0 se il file è leggibile, 1 se non lo è, 2 su opzioni errate.

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| `logstat FILE` | un solo argomento posizionale | niente opzioni implicite |
| `--livello L` | filtro opzionale, ripetibile | `--livello INFO --livello WARN` |
| `--json` | output machine-readable | consumabile da `jq` |
| exit 0 | conteggi completi | anche con zero righe |
| exit 1 | file non leggibile | errore operativo |
| exit 2 | opzioni o argomenti invalidi | uso errato |

```text
2026-11-07T09:12:33 INFO utente=ada azione=login
2026-11-07T09:12:40 WARN utente=bea azione=timeout
una riga senza data, da ignorare
2026-11-07T09:13:01 ERROR utente=ada azione=upload
```

## Il modulo di dominio

La funzione centrale riceve un handle aperto e restituisce una struttura: conteggi per livello e numero di righe scartate. Nessuna stampa dentro il modulo, così i test possono verificare i dati senza catturare stdout.

```perl
package Logstat;
use strict;
use warnings;
use Exporter 'import';
our @EXPORT_OK = qw(analizza riepilogo);

# riga: data ISO, livello in maiuscolo, resto libero
my $RIGA = qr/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\s+([A-Z]+)\s+(.*)$/;

sub analizza {
    my ($fh, %opts) = @_;
    my (%conteggi, $scartate, @selezionate);
    while (my $r = <$fh>) {
        chomp $r;
        # in contesto lista un match fallito non cattura nulla: $data resta undef
        my ($data, $livello, $resto) = $r =~ $RIGA;
        if (!defined $data) { $scartate++; next }
        # con più --livello si tiene solo chi è in elenco
        next if @{ $opts{livelli} || [] } and !grep { $_ eq $livello } @{ $opts{livelli} };
        $conteggi{$livello}++;
        push @selezionate, { data => $data, livello => $livello, resto => $resto };
    }
    return { conteggi => \%conteggi, scartate => $scartate, righe => \@selezionate };
}

sub riepilogo {
    my ($risultato) = @_;
    my @righe = sort { $a->{livello} cmp $b->{livello} }
        map { { livello => $_, n => $risultato->{conteggi}{$_} } } keys %{ $risultato->{conteggi} };
    return \@righe;
}

1;    # un modulo deve restituire un valore vero
```

`qr//` compila il pattern una volta sola, invece di ricompilarlo a ogni riga. Il match in contesto lista restituisce le catture oppure la lista vuota: controllare `defined $data` è più esplicito di un `or` sul risultato, e il conteggio delle righe scartate diventa un dato del risultato. L'`1;` finale è obbligatorio, perché `use` controlla che il modulo restituisca vero.

## Lo script e i test

Lo script resta sottile: parse, apertura, chiamata al modulo, stampa. L'help è una funzione che stampa la stringa d'uso ed esce con 0, mentre gli errori di parse escono con 2 prima di toccare il file.

```perl
#!/usr/bin/env perl
use strict;
use warnings;
use lib 'lib';
use Getopt::Long qw(GetOptions);
use Logstat qw(analizza riepilogo);

my @livelli;
GetOptions(
    'livello=s' => \@livelli,
    'help'      => sub { print "uso: logstat [--livello L] [--json] FILE\n"; exit 0 },
) or exit 2;

my $file = shift @ARGV or exit 2;
open my $fh, '<', $file or do { warn "logstat: $file: $!\n"; exit 1 };

my $ris = analizza($fh, livelli => \@livelli);
for my $r (@{ riepilogo($ris) }) {
    print "$r->{livello}\t$r->{n}\n";
}
warn "logstat: $ris->{scartate} righe scartate\n" if $ris->{scartate};
```

```perl
# t/logstat.t
use strict;
use warnings;
use Test::More tests => 3;
use lib 'lib';
use Logstat qw(analizza);

my $fh = do { my $s = "2026-11-07T09:12:33 INFO a\n2026-11-07T09:12:40 WARN b\nriga rotta\n"; open my $h, '<', \$s or die; $h };
my $r = analizza($fh);
is($r->{conteggi}{INFO}, 1, "una riga INFO");
is($r->{conteggi}{WARN}, 1, "una riga WARN");
is($r->{scartate}, 1, "riga malformata contata");
```

Lo handle su stringa (`open my $h, '<', \$s`) evita file temporanei e rende il test ereditabile e ripetibile. Esegui con `prove -lv t/` e verifica che il piano (`tests => 3`) corrisponda alle asserzioni, altrimenti il test fallisce per un motivo diverso dal comportamento reale.

## Esercizi

1. Aggiungi `--minimo N`: stampa i livelli con conteggio almeno pari a `N`.
2. Implementa `--json` usando `JSON::PP` e un encoder, non concatenando stringhe.
3. Gestisci il `-` come stdin, oltre al percorso di un file.
4. Rendi riconosciuti anche livelli in minuscolo come `info`, normalizzandoli.
5. Aggiungi `--conteggio-solo` che stampa il totale delle righe analizzate.
6. Scrivi un test che verifichi l'exit code 1 su un file inesistente, eseguendo lo script da `Test::More`.

<details>
<summary>Soluzione</summary>

1. Con `'minimo=i' => \$minimo` e `grep { $_->{n} >= ($minimo // 0) } @{ riepilogo($ris) }` nel ciclo di stampa, il filtro resta nello script e il modulo non cambia.

2. `use JSON::PP; my $enc = JSON::PP->new->canonical; print $enc->encode($ris);`: l'encoder gestisce escape, numeri e undefined, che una concatenazione romperebbe.

3. Se `$file eq '-'` non apri nulla e usi `*STDIN` come handle: `analizza(\*STDIN, ...)` legge dal flusso e il resto del codice non cambia.

4. Nel pattern usa `([A-Za-z]+)` e poi `uc $livello` prima di contare: la normalizzazione avviene nel modulo, quindi è testabile senza lo script.

5. Somma i valori della mappa: `my $totale = 0; $totale += $_ for values %{ $ris->{conteggi} };` e stampalo su una riga dedicata, distinguendo il totale dalle righe scartate.

6. Nel test salva l'exit con `my $esito = system($^X, 'bin/logstat', 'non_esiste.log') >> 8;` e verifica `is($esito, 1, ...)`, controllando che l'errore sia apparso su stderr e non su stdout.

</details>

## Errori comuni

- **Stampare dentro `analizza`**: il modulo diventa non testabile e il formato dell'output è cablato nei dati.
- **Pattern che accetta tutto**: con un `\S+` per il livello, righe sporche entrano nei conteggi e lo scarto non è misurabile.
- **Leggere in contesto scalare un file**: `my @righe = <$fh>` carica tutto in memoria e per un log grande finisce in swap.
- **Test con file temporanei senza cleanup**: lasciano residui e falliscono se eseguiti due volte in parallelo; usa handle su stringa.
- **Dimenticare `$!` nei messaggi di errore**: senza la causa dell'errore, un `exit 1` non aiuta chi lo riceve.

## In sintesi

Un filtro Perl manutenibile separa il modulo di dominio dallo script che parla col terminale. `qr//` e le catture esprimono il formato in una riga, mentre il controllo su `defined` gestisce le righe non conformi senza interrompere il flusso. `prove` con handle su stringa rende i test veloci e ripetibili, e il contratto di exit code resta verificato. Il formato TAP di `Test::More` permette infine di integrare il progetto in qualsiasi pipeline di CI.

## Fonti

- [Test::More](https://perldoc.perl.org/Test::More): asserzioni, piano e gestione dei fallimenti.
- [perlre](https://perldoc.perl.org/perlre): catture, quantificatori e operatori `s///` e `qr//`.
- [Getopt::Long](https://perldoc.perl.org/Getopt::Long): parse delle opzioni e gestione di `@ARGV`.
- [JSON::PP](https://perldoc.perl.org/JSON::PP): encoder JSON puro Perl, incluso nella libreria standard.
