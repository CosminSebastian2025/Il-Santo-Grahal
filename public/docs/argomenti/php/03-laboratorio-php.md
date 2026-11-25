In questo laboratorio costruisci `spese.php`, una CLI che legge un CSV di spese e stampa i totali per categoria. Parsing rigoroso, tipi dichiarati, errori con eccezioni, exit code coerenti e test con PHPUnit: un programma da copiare in qualsiasi progetto PHP 8.1 o superiore.

## Obiettivi

- Separare parsing, aggregazione e presentazione in classi con tipi espliciti.
- Usare `fgetcsv`, `array_reduce` e `NumberFormatter` per un riepilogo affidabile.
- Gestire input invalido con eccezioni tipizzate e exit code distinti.
- Scrivere test PHPUnit senza toccare file temporanei condivisi.
- Rendere la CLI leggibile con un formato testuale e un'opzione `--json`.

## Il contratto e la struttura

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `spese.php FILE [--json]` | un solo argomento obbligatorio |
| righe valide | `data,descrizione,categoria,importo` | intestazione obbligatoria |
| separatore | virgola | `fgetcsv` gestisce le virgolette |
| errore file | exit 1 su stderr | errore operativo |
| errore formato | exit 2 con riga incriminata | uso errato del dato |
| `--json` | totale e righe per categoria | output stabile per script |

```bash
php spese.php dati/2026.csv
php spese.php dati/2026.csv --json | jq '.categorie[0]'
php spese.php manca.csv; echo "exit: $?"
```

Il file di input contiene una riga di intestazione e importi con punto decimale. Una riga con colonne in meno è un errore da segnalare, non da saltare in silenzio.

## Il dominio e il parsing

```php
<?php
declare(strict_types=1);

namespace Spese;

final class RigaInvalida extends \RuntimeException
{
    public function __construct(public readonly int $riga, string $motivo)
    {
        parent::__construct("riga {$riga}: {$motivo}");
    }
}

final class Riepilogo
{
    /** @param list<array{descrizione:string,importo:float}> $voci */
    public function __construct(
        public readonly float $totale,
        public readonly array $voci,
    ) {}
}
```

```php
<?php
declare(strict_types=1);

namespace Spese;

final class Aggregatore
{
    /** @param iterable<array{0:string,1:string,2:string,3:string}> $righe */
    public function aggrega(iterable $righe): array
    {
        $categorie = [];
        $numero = 1; // la riga 1 è l'intestazione

        foreach ($righe as $campi) {
            $numero++;
            if (count($campi) !== 4) {
                throw new RigaInvalida($numero, "attese 4 colonne, trovate " . count($campi));
            }
            [, $descrizione, $categoria, $importo] = $campi;
            if (!is_numeric($importo)) {
                throw new RigaInvalida($numero, "importo non numerico: {$importo}");
            }
            $categorie[$categoria][] = [
                "descrizione" => trim($descrizione),
                "importo" => (float) $importo,
            ];
        }

        foreach ($categorie as $categoria => $voci) {
            $totale = array_sum(array_column($voci, "importo"));
            $categorie[$categoria] = ["totale" => round($totale, 2), "voci" => $voci];
        }

        return $categorie;
    }
}
```

La destrutturazione `[, $descrizione, $categoria, $importo]` salta la data con una virgola vuota. Gli importi restano `float` perché qui non c'è contabilità fiscale; in un caso reale usa centesimi interi o una libreria decimale.

## La CLI e gli exit code

```php
<?php
declare(strict_types=1);

namespace Spese;

require __DIR__ . "/vendor/autoload.php";

$argomenti = array_slice($argv, 1);
$json = in_array("--json", $argomenti, true);
$posizionali = array_values(array_filter($argomenti, fn($a) => !str_starts_with($a, "--")));

if (count($posizionali) !== 1) {
    fwrite(STDERR, "uso: spese.php FILE [--json]\n");
    exit(2);
}

$file = $posizionali[0];
if (!is_readable($file)) {
    fwrite(STDERR, "spese: file non leggibile: {$file}\n");
    exit(1);
}

$handle = fopen($file, "r");
fgetcsv($handle); // scarta l'intestazione

try {
    $categorie = (new Aggregatore())->aggrega(
        (function () use ($handle) {
            while (($riga = fgetcsv($handle)) !== false) {
                yield $riga;
            }
        })()
    );
} catch (RigaInvalida $e) {
    fwrite(STDERR, "spese: " . $e->getMessage() . "\n");
    exit(2);
}

$totale = round(array_sum(array_column($categorie, "totale")), 2);

if ($json) {
    echo json_encode(compact("totale", "categorie"), JSON_UNESCAPED_UNICODE), "\n";
    exit(0);
}

ksort($categorie);
foreach ($categorie as $nome => $dati) {
    printf("%-14s %8.2f (%d voci)\n", $nome, $dati["totale"], count($dati["voci"]));
}
printf("%-14s %8.2f\n", "TOTALE", $totale);
exit(0);
```

Il generatore evita di caricare tutto il file in memoria. La distinzione tra exit 1 (file) e exit 2 (dato o uso) rende lo script utilizzabile da un altro programma: solo il primo caso è ritentabile.

## Test

```php
<?php
declare(strict_types=1);

namespace Spese\Tests;

use PHPUnit\Framework\TestCase;
use Spese\Aggregatore;
use Spese\RigaInvalida;

final class AggregatoreTest extends TestCase
{
    public function testTotalePerCategoria(): void
    {
        $righe = [
            ["2026-01-02", "Pane", "cibo", "2.50"],
            ["2026-01-03", "Bus", "trasporti", "1.70"],
            ["2026-01-04", "Frutta", "cibo", "3.10"],
        ];
        $out = (new Aggregatore())->aggrega($righe);

        $this->assertSame(5.6, $out["cibo"]["totale"]);
        $this->assertCount(2, $out["cibo"]["voci"]);
    }

    public function testImportoNonValido(): void
    {
        $this->expectException(RigaInvalida::class);
        (new Aggregatore())->aggrega([["2026-01-02", "Pane", "cibo", "due"]]);
    }
}
```

```bash
vendor/bin/phpunit tests/AggregatoreTest.php
php -l spese.php                  # controllo sintassi senza eseguire
```

Il test passa iterable in memoria: niente filesystem, esecuzione in millisecondi. È il modo corretto di testare la logica; il parsing con `fgetcsv` si prova con un test di integrazione separato.

## Esercizi

1. Aggiungi l'opzione `--categoria NOME` che limita il riepilogo a una sola categoria, con exit 0 e output vuoto se non esiste.
2. Fai in modo che una riga con data vuota venga rifiutata come le altre righe invalide, riportando il numero di riga corretto.
3. Aggiungi un test che verifichi il numero di riga riportato da `RigaInvalida` per un errore alla terza riga di dati.
4. Sostituisci `float` con interi di centesimi nel dominio e verifica che i totali non abbiano più errori di arrotondamento.
5. Estrai una classe `Stampa` che riceva le categorie e restituisca una stringa, così la CLI non contiene logica di formato.
6. Documenta nel help (da mostrare con `-h`) il formato CSV accettato e le exit code.

<details>
<summary>Soluzione</summary>

1. Leggi il valore con una funzione `opzione(string $nome, array $argomenti): ?string` e stampa `$categorie[$nome] ?? null`, oppure `{}` con `--json`.

2. Aggiungi in `aggrega()` il controllo `$campi[0] === ""` e lancia `RigaInvalida($numero, "data mancante")`; la prima riga di dati è la 2.

3. Passa due righe valide e una terza rotta, intercetta l'eccezione e verifica `$this->assertSame(4, $e->riga)`.

4. Converte con `(int) round((float) $importo * 100)` e formatta con `number_format($centesimi / 100, 2, ",", ".")`. I test usano 560 invece di 5.6.

5. `Stampa::testo()` e `Stampa::json()` restituiscono stringhe; la CLI fa solo `echo` e `exit`. Aggiungi un test sulla riga "TOTALE".

6. Se `-h` o `--help` sono presenti, stampa formato e exit code su stdout ed esce 0 prima dei controlli sul file.

</details>

## Errori comuni

- **Skippare le righe invalide**: un totale silenzioso è peggio di un errore esplicito.
- **Sommare `float` per denaro**: aggiungi centesimi interi o una libreria decimale.
- **Leggere tutto il file con `file_get_contents` e `explode`**: `fgetcsv` gestisce virgolette e righe su cui `explode` fallisce.
- **Restituire exit 0 su ogni errore**: lo script chiamante non può distinguere successo e fallimento.
- **Testare la CLI eseguendo `php spese.php`**: lento e non isolato; testa l'aggregatore in memoria.

## In sintesi

- Il dominio resta in classi testabili; la CLI legge argomenti, chiama il dominio e decide l'exit code.
- I generatori permettono di processare il file riga per riga senza caricarlo tutto.
- `RigaInvalida` trasporta il numero di riga: l'errore diventa utile.
- I test unitari restano veloci; l'integrazione con il filesystem è un livello separato.

## Fonti

- [PHP Manual: Command line usage](https://www.php.net/manual/en/features.commandline.php)
- [PHP Manual: Enumerations](https://www.php.net/manual/en/language.enumerations.php)
- [PHP Manual: Type system](https://www.php.net/manual/en/language.types.type-system.php)
- [PHPUnit: getting started](https://phpunit.de/getting-started/phpunit-11.html)
