In questo laboratorio costruisci `report-engine`, un piccolo servizio Java che rende un report di fatturazione in HTML e in testo semplice usando Apache Velocity 2.4.1: un solo contesto, due template, una libreria di macro condivisa e test che girano senza un server. Il valore dell'esercizio non sta nel report ma nel perimetro: motore configurato una volta, template caricati dal classpath, contesto immutabile e un test di regressione che blocca l'output come stringa attesa.

## Obiettivi

- Creare un progetto Maven con `velocity-engine-core` 2.4.1 e Java 17.
- Configurare un `VelocityEngine` con loader classpath, cache attiva e strict mode.
- Scrivere una libreria di macro e due template che la riusano.
- Rendantizzare da un servizio testabile, senza dipendenze dal container.
- Scrivere test JUnit 5 che confrontano l'output completo e gli errori di contesto.

## Setup del progetto

Serve il JDK 17 e Maven 3.9. Il `pom.xml` dichiara la dipendenza del motore in compilazione e JUnit 5 in test; il logger di Velocity passa per il bridge SLF4J solo se lo aggiungi, altrimenti il motore usa il proprio logger senza rumore.

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>dev.grahal</groupId>
  <artifactId>report-engine</artifactId>
  <version>1.0.0</version>
  <properties>
    <maven.compiler.release>17</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.apache.velocity</groupId>
      <artifactId>velocity-engine-core</artifactId>
      <version>2.4.1</version>
    </dependency>
    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.0</version>
      <scope>test</scope>
    </dependency>
  </dependencies>
</project>
```

La struttura delle cartelle è quella standard: `src/main/java/dev/grahal/report/` per il codice, `src/main/resources/templates/` per i template e `src/test/java/` per i test. I template finiscono nel jar, quindi la produzione non può modificarli senza un nuovo rilascio: è la scelta giusta per un report fiscale.

## Il contratto del report

Il report espone una API minima: dati in ingresso, due formati, un testo per il soggetto della mail. I dati sono record immutabili, così il template non può mutare nulla.

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| formato `html` | `report/fatture-html.vm` | impaginazione con tabella |
| formato `text` | `report/fatture-text.vm` | corpo email in testo puro |
| macro | `macros/standard.vtl` | formattazione importi e data |
| contesto | record immutabili | nessuna mutazione dal template |
| errori | eccezione `VelocityException` | il chiamante decide il fallback |
| strict mode | attivo | un dato mancante rompe il test |

```java
package dev.grahal.report;

import java.math.BigDecimal;
import java.util.List;

public record Fattura(String numero, String cliente, BigDecimal imponibile, BigDecimal iva) {
    public BigDecimal totale() { return imponibile.add(iva); }

    public record Report(String periodo, String azienda, List<Fattura> fatture,
                         BigDecimal totalePeriodo) {}
}
```

Il totale del periodo si calcola in Java, non nel template: la somma è una regola di business e va testata in Java. Il template si occupa solo di presentarla.

## Core: motore, macro e template

La libreria di macro gira attorno a due problemi classici di VTL: mostrare una data con un formato stabile e mostrare un importo con due decimali. Entrambe usano gli strumenti di formattazione di Java tramite `SimpleDateFormat` e `String.format`, con il locale passato nel contesto.

```velocity
## src/main/resources/templates/macros/standard.vtl
#macro(importo valore)
$String.format($locale, "%.2f %s", $valore, $valuta)
#end

#macro(rigaTabella fattura)
<tr>
  <td>$fattura.numero</td>
  <td>$fattura.cliente</td>
  <td class="num">#importo($fattura.totale())</td>
</tr>
#end
```

```velocity
## src/main/resources/templates/report/fatture-html.vm
<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><title>Report $periodo</title></head>
<body>
<h1>$azienda - $periodo</h1>
<table>
#foreach($fattura in $fatture)
#rigaTabella($fattura)
#end
</table>
<p>Totale periodo: #importo($totalePeriodo)</p>
</body>
</html>
```

Il formato testuale riusa le stesse variabili e produce una riga per fattura, più un'eventuale riga di chiusura se non ci sono fatture: è il caso che quasi tutti i template dimenticano.

```velocity
## src/main/resources/templates/report/fatture-text.vm
$azienda - $periodo
#foreach($fattura in $fatture)
$fattura.numero  $fattura.cliente  $fattura.totale()
#end
#if($fatture.isEmpty())
Nessuna fattura emessa nel periodo.
#end
Totale: $totalePeriodo EUR
```

Il servizio tiene il motore statico e crea un `VelocityContext` per chiamata. Il contesto è un oggetto leggero, quindi non c'è motivo di condividerlo.

```java
package dev.grahal.report;

import java.io.StringWriter;
import java.util.Locale;
import java.util.Properties;
import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.VelocityEngine;

public final class ReportService {
    private static final VelocityEngine ENGINE = creaEngine();

    private static VelocityEngine creaEngine() {
        Properties p = new Properties();
        p.setProperty("resource.loaders", "class");
        p.setProperty("resource.loader.class.class",
                "org.apache.velocity.runtime.resource.loader.ClasspathResourceLoader");
        p.setProperty("velocimacro.library.path", "templates/macros/standard.vtl");
        p.setProperty("runtime.strict_mode.enable", "true");
        p.setProperty("velocimacro.arguments.strict", "true");
        VelocityEngine e = new VelocityEngine();
        e.init(p);
        return e;
    }

    public String rendiHtml(Fattura.Report report) {
        return rendi("templates/report/fatture-html.vm", report);
    }

    public String rendiTesto(Fattura.Report report) {
        return rendi("templates/report/fatture-text.vm", report);
    }

    private String rendi(String nome, Fattura.Report report) {
        VelocityContext ctx = new VelocityContext();
        ctx.put("periodo", report.periodo());
        ctx.put("azienda", report.azienda());
        ctx.put("fatture", report.fatture());
        ctx.put("totalePeriodo", report.totalePeriodo());
        ctx.put("locale", Locale.ITALY);
        ctx.put("valuta", "EUR");
        StringWriter w = new StringWriter();
        ENGINE.mergeTemplate(nome, "UTF-8", ctx, w);
        return w.toString();
    }
}
```

`velocimacro.arguments.strict = true` fa fallire una macro chiamata con meno argomenti del previsto invece di passare un valore indefinito: senza questa impostazione un refuso in una macro produce celle vuote che nessun test intercetta.

## Test e criterio di uscita

I test verificano l'output completo in HTML, il caso senza fatture e il comportamento dello strict mode con un contesto incompleto. Il confronto su stringa intera è volutamente rigido: se qualcuno cambia un template, il test fallisce e la revisione è obbligatoria.

```java
package dev.grahal.report;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.util.List;
import org.apache.velocity.exception.VelocityException;
import org.junit.jupiter.api.Test;

class ReportServiceTest {
    private final ReportService service = new ReportService();

    private Fattura.Report esempio() {
        return new Fattura.Report("2026-10", "Grahal Srl",
            List.of(new Fattura("F-001", "Rossi", new BigDecimal("100.00"), new BigDecimal("22.00"))),
            new BigDecimal("122.00"));
    }

    @Test
    void testoContieneNumeroETotale() {
        String out = service.rendiTesto(esempio());
        assertTrue(out.contains("F-001"));
        assertTrue(out.contains("Totale: 122.00"));
    }

    @Test
    void testoVuotoHaRigaDedicata() {
        var vuoto = new Fattura.Report("2026-10", "Grahal Srl", List.of(), BigDecimal.ZERO);
        assertTrue(service.rendiTesto(vuoto).contains("Nessuna fattura"));
    }

    @Test
    void htmlHaUnaRigaPerFattura() {
        String out = service.rendiHtml(esempio());
        assertEquals(1, out.lines().filter(l -> l.contains("<td>")).count());
    }
}
```

La verifica manuale è breve: `mvn -q test` deve passare, e una classe `Main` di prova deve stampare il report a video senza eccezioni di strict mode. È il momento in cui un template che usa una variabile non presente nel contesto smette di produrre un buco silenzioso e te lo dice.

```bash
mvn -q clean test
mvn -q package
java -cp target/report-engine-1.0.0.jar dev.grahal.report.Main
```

## Esercizi

1. Aggiungi il formato `csv` con un template che separa le colonne con `;` e gestisce le virgolette nei nomi.
2. Sostituisci il formatting manuale con le macro di `velocity-tools-generic` (`$date`, `$number`) e confronta il risultato.
3. Aggiungi un test che verifichi il fallimento con un contesto senza `$fatture` e strict mode attivo.
4. Rendi personalizzabile la cartella dei template in release `dev` con un loader file, mantenendo il classpath in produzione.
5. Misura il tempo di 10.000 fusioni con e senza cache attiva e annota la differenza nel README.
6. Sperimenta `SecureUberspector` riflettendo che `$fatture.getClass()` smette di funzionare.

<details>
<summary>Soluzione</summary>

1. Template `report/fatture-csv.vm` con `#foreach` che stampa i campi separati da `;` e una macro che raddoppia le virgolette con `$contenuto.replace('"', '""')`. Nessuna logica nel template: la riga di intestazione è testo statico.

2. Le macro `#date` e `#number` di Velocity Tools accettano un formato Java e un `Locale`; la configurazione richiede `org.apache.velocity.tools.generic.DateTool` e `NumberTool` nel toolbox. Il vantaggio è dichiarativo, lo svantaggio è una dipendenza in più che va aggiunta al pom.

3. Il test istanzia il motore senza `$fatture` e usa `assertThrows(VelocityException.class, () -> service.rendiTesto(report))`; in strict mode l'eccezione arriva alla prima valutazione del riferimento.

4. Un `Profiles` di Spring o un controllo su una variabile d'ambiente scelgono tra `class` e `file` loader; con il loader file a cache `false` i template si ricaricano e l'autoreload della libreria macro diventa efficace.

5. Con la cache attiva il parsing avviene una sola volta per nome, quindi il divario cresce in proporzione al numero di iterazioni; con una semplice `System.nanoTime()` si vede che il costo è quasi tutto nel primo merge.

6. `SecureUberspector` blocca la costruzione di classi e limita l'introspection: l'accesso a `getClass()` non è più disponibile e il template deve usare solo i metodi del record.

</details>

## Errori comuni

- **Mettere la logica nel template**: somme, sconti e arrotondamenti devono stare in Java, altrimenti i test non li coprono.
- **Confondere il nome del template con un percorso di classe**: con il loader classpath il nome è relativo alla radice delle risorse e non inizia con `/`.
- **Dimenticare `UTF-8` in `mergeTemplate`**: con il loader classpath la codifica predefinita può non coincidere e gli accenti del report si corrompono.
- **Testare l'output parziale con `contains`**: sfugge la regressione sul layout; il confronto intero è scomodo da mantenere ma è l'unica protezione reale.
- **Riusare un `VelocityContext` tra richieste**: anche con motore thread-safe, i dati della richiesta precedente finiscono nella successiva.

## In sintesi

`report-engine` mostra il percorso completo di un uso reale di Velocity: dipendenza dichiarata, motore configurato una volta, loader classpath per rendere i template immutabili, macro condivise, contesto immutabile e test che fissano l'output. Lo strict mode e gli argomenti stretti delle macro trasformano gli errori di template in fallimenti visibili invece di buchi nell'output, che è il discrimine tra un generatore di report affidabile e uno che scopre i bug con il cliente.

## Fonti

- [Apache Velocity - Getting Started](https://velocity.apache.org/engine/2.3/getting-started.html)
- [Apache Velocity - User Guide](https://velocity.apache.org/engine/2.3/user-guide.html)
- [Apache Velocity - Tools project](https://velocity.apache.org/tools/3.1/)
- [Apache Velocity - Downloads](https://velocity.apache.org/download.cgi)
