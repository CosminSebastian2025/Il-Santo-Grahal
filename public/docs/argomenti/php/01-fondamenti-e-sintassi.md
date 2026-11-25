PHP è un linguaggio interpretato pensato per il web: uno script viene eseguito a ogni richiesta e produce tipicamente una pagina HTML. Oggi è anche tipizzato in modo opzionale, con classi e tipi di ritorno verificati dal motore. In questa lezione vedi la sintassi di base, come il motore esegue uno script e perché il modello "un processo per richiesta" spiega quasi tutti i comportamenti di PHP.

## Obiettivi

- Riconoscere le variabili con prefisso `$`, la concatenazione con `.` e i tipi scalari.
- Distinguere array indicizzati e associativi e gestirli con `foreach`.
- Scrivere funzioni con tipi di parametro e di ritorno e capire il type juggling.
- Spiegare il ciclo di esecuzione di uno script PHP e l'uso di `<?php`.
- Eseguire codice da riga di comando senza un server web.

## Sintassi di base

PHP lavora solo dentro i tag `<?php ... ?>`; fuori da essi il testo viene emesso così com'è. Le variabili iniziano con `$` e non richiedono dichiarazione, ma la loro tipologia viene controllata solo quando usi tipi espliciti.

```php
<?php
declare(strict_types=1);

$nome = "Ada";          // stringa
$livello = 3;           // int
$ratio = 0.75;          // float
$attivo = true;         // bool

echo "Ciao " . $nome . "!";   // concatenazione con il punto
echo "\n";
echo "Livello: {$livello}\n";  // interpolazione solo con doppie virgolette
```

L'uso di `declare(strict_types=1)` deve essere la prima istruzione del file, prima di qualsiasi output. Con la modalità strict il motore rifiuta le conversioni implicite tra `int` e `string`, che invece avvengono silenziosamente in modalità debole.

| Scelta | Sintassi | Nota |
| --- | --- | --- |
| Virgolette doppie | `"$x"` | interpola le variabili |
| Virgolette singole | `'$x'` | letterale, nessuna espansione |
| Concatenazione | `$a . $b` | non esiste l'operatore `+` tra stringhe |
| Interpolazione con espressioni | `"{$array['k']}"` | le chiavi complesse richiedono graffe |

## Array, funzioni e strutture di controllo

L'array di PHP è l'unica struttura dati di base: mappa ordinata chiave-valore che si comporta sia da lista sia da dizionario.

```php
<?php
$frutti = ["mela", "pera"];                    // chiavi 0, 1
$config = ["debug" => false, "ttl" => 3600];   // chiavi stringa

foreach ($config as $chiave => $valore) {
    echo "{$chiave}={$valore}\n";
}

$quadrati = array_map(fn(int $n): int => $n * $n, [1, 2, 3]);
$pari = array_filter($quadrati, fn(int $n): bool => $n % 2 === 0);
print_r(array_values($pari)); // Array ( [0] => 4 )
```

```php
<?php
function saluta(string $nome, string $titolo = "Dott."): string
{
    return "Buongiorno {$titolo} {$nome}";
}

echo saluta("Rossi");          // Buongiorno Dott. Rossi
echo saluta(titolo: "Ing.", nome: "Verdi"); // argomenti con nome (PHP 8.0+)
```

Le funzioni sono visibili ovunque nel file perché vengono definite prima dell'esecuzione del corpo. Gli argomenti con nome rendono leggibili le chiamate con molti parametri e sono stabili rispetto all'ordine.

## Cicli, errori e null

I cicli includono `for`, `foreach`, `while` e `do...while`. Due trappole storiche: `foreach` lavora su una copia dell'array e `switch` usa un confronto lasco tra valori.

```php
<?php
for ($i = 0; $i < 3; $i++) {
    echo $i . "\n";
}

$totale = null;
$totale ??= 0;          // assegna solo se null (PHP 7.4+)
$totale += 5;
echo $totale;           // 5
```

`null` è un valore legittimo e indica "assenza": usa `isset()` o l'operatore `?->` (PHP 8.0) per evitare l'errore "Attempt to read property on null". In modalità strict, passare `null` a un parametro `string` genera un `TypeError`.

## Modello di esecuzione

```bash
php -v                        # versione installata
php -r 'echo PHP_INT_SIZE, "\n";'
php -S localhost:8000 -t public   # server di sviluppo integrato
php script.php arg1 arg2      # esecuzione da riga di comando
```

Ogni richiesta web avvia il motore, compila lo script, lo esegue e rilascia la memoria alla fine: non c'è stato condiviso tra due richieste, quindi le variabili non "sopravvivono". Per questo le sessioni usano file o database e in produzione gira un process manager come PHP-FPM. Da riga di comando il ciclo è identico, ma lo script riceve argomenti e flussi standard.

```php
<?php
// argv[0] è il nome dello script
$opzioni = $argv;
array_shift($opzioni);
echo "Ricevuti " . count($opzioni) . " argomenti\n";
```

## Errori comuni

- **Omettere `declare(strict_types=1)`**: le stringhe `"3"` e gli int `3` diventano intercambiabili e gli errori arrivano tardi.
- **Usare `+` per unire stringhe**: in PHP `+` è addizione numerica e la stringa viene convertita; serve il punto.
- **Confondere `==` e `===`**: le conversioni lasche tra stringa e numero cambiano tra PHP 7 e PHP 8.
- **Modificare un array dentro `foreach` senza `&`**: iteri su una copia e non vedi le modifiche.
- **Affidarsi a variabili globali tra richieste**: lo stato non esiste dopo la fine dello script.

## In sintesi

PHP è un linguaggio interpretato, eseguito una volta per richiesta, con sintassi C-like e stringhe interpolate. Gli array sono mappe ordinate che coprono liste e dizionari, e le funzioni supportano tipi, valori di default e argomenti con nome. `strict_types` e `===` sono le due abitudini che evitano la maggior parte dei bug. Il modello di esecuzione a processo per richiesta spiega perché lo stato va salvato fuori dal codice.

## Fonti

- [PHP Manual: Types and type declarations](https://www.php.net/manual/en/language.types.declarations.php)
- [PHP Manual: Function arguments and named parameters](https://www.php.net/manual/en/functions.arguments.php)
- [PHP Manual: Command line usage](https://www.php.net/manual/en/features.commandline.php)
