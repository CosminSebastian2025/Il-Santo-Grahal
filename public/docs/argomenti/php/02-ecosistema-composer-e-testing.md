Un progetto PHP moderno non si scrive più con un solo `index.php`: usa Composer per le dipendenze, il caricamento automatico delle classi, standard di stile condivisi e un framework per separare routing, logica e persistenza. Questa lezione mostra gli strumenti che trasformano PHP da linguaggio di script a piattaforma di sviluppo strutturata. L'obiettivo è riconoscere le convenzioni che ogni libreria si aspetta di trovare.

## Obiettivi

- Inizializzare un progetto con Composer e spiegare il ruolo di `composer.json` e `vendor/`.
- Collegare namespace e PSR-4 con il caricamento automatico delle classi.
- Scrivere test con PHPUnit e leggere l'output di un fallimento.
- Riconoscere gli standard PSR più importanti e gli strumenti che li applicano.
- Individuare i casi d'uso reali di PHP: CMS, API, backend di applicazioni web.

## Composer e autoloading

Composer è il gestore di dipendenze di fatto: risolve le versioni, scarica i pacchetti da Packagist e genera il file `vendor/autoload.php` che collega i namespace ai file.

```bash
composer init --name acme/blog --type project
composer require monolog/monolog
composer require --dev phpunit/phpunit
composer dump-autoload -o     # mappa delle classi ottimizzata
composer validate             # controlla composer.json e il lock
```

Le versioni seguono SemVer con vincoli come `^3.5` (compatibile con 3.x) e `1.2.*`. Il file `composer.lock` va committato: fissa le versioni esatte per team e produzione. In deployment usa `composer install --no-dev --optimize-autoloader`, che rispetta il lock e non installa le dipendenze di test.

| Strumento | Ruolo | Comando tipico |
| --- | --- | --- |
| Composer | dipendenze e autoload | `composer install` |
| PHPUnit | test unitari e di integrazione | `vendor/bin/phpunit` |
| PHP CS Fixer | applica PSR-12 e regole di team | `php-cs-fixer fix` |
| PHPStan | analisi statica dei tipi | `phpstan analyse` |
| Xdebug | debugger e coverage | estensione, `xdebug.mode` |

## Namespace, PSR-4 e classi

Il namespace separa il codice in "spazi di nomi" come i package o i moduli. PSR-4 è la convenzione che lega il namespace a un prefisso di cartella: se dichiari `"Acme\\Blog\\": "src/"` nel blocco `autoload`, la classe `Acme\Blog\Post` deve stare in `src/Post.php`.

```php
<?php
declare(strict_types=1);

namespace Acme\Blog;

final class Post
{
    public function __construct(
        private readonly string $titolo,
        public readonly string $slug,
    ) {}
}
```

```json
{
    "autoload": {
        "psr-4": { "Acme\\Blog\\": "src/" }
    },
    "autoload-dev": {
        "psr-4": { "Acme\\Blog\\Tests\\": "tests/" }
    }
}
```

Il namespace di test è separato (`autoload-dev`), così in produzione le classi di test non vengono caricate: scrivi `use Acme\Blog\Post;` e usa `new Post(...)`.

## Testing con PHPUnit

Un test è una classe che estende `TestCase` con metodi `test*` oppure metodi annotati con `#[Test]`. Gli assert esprimono l'attesa e il messaggio di errore mostra valore atteso e ricevuto.

```php
<?php
declare(strict_types=1);

namespace Acme\Blog\Tests;

use Acme\Blog\Post;
use PHPUnit\Framework\TestCase;

final class PostTest extends TestCase
{
    public function testSlugNormalizzato(): void
    {
        $post = new Post("Ciao Mondo", "ciao-mondo");
        $this->assertSame("ciao-mondo", $post->slug);
    }

    public function testTitoloNonVuoto(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new Post("", "vuoto");
    }
}
```

```bash
vendor/bin/phpunit tests --colors=always
vendor/bin/phpunit --filter testSlugNormalizzato
vendor/bin/phpunit --coverage-text   # richiede Xdebug o PCOV
```

Il secondo test fallirebbe con il costruttore di sopra: `expectException` non scatta perché il codice non valida il titolo. Il valore dei test sta nel notarlo. Per l'integrazione con PDO si usa una transazione annullata nel `tearDown()`, così ogni test parte da uno stato pulito.

## Casi d'uso reali e stile

PHP domina nei CMS e nelle applicazioni web con hosting economico, oltre che nelle API e nei backend Laravel. Le convenzioni comuni sono raccolte nelle PSR: PSR-12 per lo stile, PSR-4 per l'autoload, PSR-7 per le richieste HTTP e PSR-3 per il logging. Symfony e Laravel forniscono componenti riutilizzabili anche fuori dal framework; PDO è l'interfaccia standard ai database.

```bash
vendor/bin/php-cs-fixer fix --rules=@PSR12 src tests
docker run --rm -v "$PWD":/app -w /app php:8.3-cli vendor/bin/phpunit
```

Come per ogni linguaggio, l'ecosistema funziona se gli strumenti possono girare nel CI: un workflow che esegue `composer install`, `phpstan analyse`, `php-cs-fixer --dry-run` e `phpunit` è il contratto minimo di un progetto sano.

## Errori comuni

- **Committare `vendor/` e ignorare `composer.lock`**: il primo appesantisce il repository, il secondo rende imprevedibile le versioni.
- **Mappare il namespace su una cartella sbagliata**: la classe esiste ma l'autoloader la cerca in un altro percorso.
- **Scrivere test che non possono fallire**: assert duplicati o senza controllo di valori diversi.
- **Usare `require` manuale accanto all'autoload**: doppie inclusioni e nomi non importati.
- **Installare dipendenze di sviluppo in produzione**: `--no-dev` evita classi e vulnerabilità inutili.

## In sintesi

Composer è il centro dell'ecosistema PHP: dipendenze, lock e autoload PSR-4. Namespace e cartelle devono seguire la stessa mappa, altrimenti le classi non si caricano. PHPUnit, PHPStan e PHP CS Fixer coprono test, tipi e stile e vanno eseguiti nel CI. I framework più diffusi sono fatti di componenti che puoi riusare anche da solo.

## Fonti

- [Composer: basic usage](https://getcomposer.org/doc/01-basic-usage.md)
- [PSR-4: Autoloader specification](https://www.php-fig.org/psr/psr-4/)
- [PHPUnit: getting started](https://phpunit.de/getting-started/phpunit-11.html)
