Un motore Velocity in produzione vive di tre decisioni: come legge i template, dove finiscono i log e quanto il motore è disposto a fidarsi di ciò che il template chiede di eseguire. Questa lezione mette insieme le parti che nella documentazione sono sparse tra developer guide, configuration reference e javadoc: il ciclo di vita di `VelocityEngine`, i resource loader, la cache, l'introspection e il sandboxing quando il template non è scritto da te. Il risultato è una configurazione che si può versionare, testare e revisionare.

## Obiettivi

- Separare configurazione per ambiente e per istanza del motore.
- Scegliere e limitare il resource loader giusto (file, classpath, string).
- Impostare cache, log e strict mode in modo coerente tra test e produzione.
- Racchiudere l'introspection con un `Uberspector` per limitare ciò che il template può invocare.
- Rendere le Velocimacro una libreria versionata e ricaricabile solo in sviluppo.

## Ciclo di vita e configurazione per istanza

`VelocityEngine` legge le proprietà al momento di `init()`: una proprietà aggiunta dopo non modifica i componenti già creati. Per questo la configurazione va costruita come oggetto immutabile all'avvio e il motore deve essere un singleton della tua applicazione, tipicamente un `@Bean` in Spring o un campo `static final` inizializzato nel costruttore. I test invece ne vogliono uno nuovo per caso, con una directory di template temporanea.

```java
public final class MotoreTemplates {
    private static final VelocityEngine ENGINE = crea();

    private static VelocityEngine crea() {
        Properties p = new Properties();
        p.setProperty("resource.loaders", "file");
        p.setProperty("resource.loader.file.path", "templates");
        p.setProperty("resource.loader.file.cache", "true");
        p.setProperty("resource.manager.cache.default_size", "256");
        p.setProperty("runtime.references.strict", "true");
        p.setProperty("runtime.strict_mode.enable", "true");
        p.setProperty("resource.loader.file.class",
                "org.apache.velocity.runtime.resource.loader.FileResourceLoader");
        p.setProperty("velocimacro.library.path", "macros/standard.vtl");
        p.setProperty("runtime.log.name", "org.apache.velocity");
        p.setProperty("runtime.log.log_invalid_references", "true");

        VelocityEngine e = new VelocityEngine();
        e.init(p);
        return e;
    }

    public static String rendi(String nome, VelocityContext ctx) {
        StringWriter w = new StringWriter();
        ENGINE.mergeTemplate(nome, StandardCharsets.UTF_8.name(), ctx, w);
        return w.toString();
    }
}
```

`runtime.references.strict = true` è l'impostazione storica, `runtime.strict_mode.enable = true` è quella del ramo 2.x: dichiararle entrambe rende il comportamento esplicito anche migrando da una versione all'altra. Con lo strict mode un riferimento non definito lancia un'eccezione; il caso `$foo` dentro `#if`, senza operazioni né proprietà, resta consentito proprio per permettere il controllo di esistenza.

| Problema in produzione | Sintomo | Impostazione che lo affronta |
| --- | --- | --- |
| celle vuote nei report | template modificati senza test | `runtime.strict_mode.enable = true` |
| template vecchi dopo un deploy | cache attiva con file montati | invalidare o fissare i template nell'artefatto |
| startup lento su molti template | parsing alla prima richiesta | cache attiva e caricamento in avvio |
| file immagine o CSS come template | loader troppo permissivo | percorso base dedicato |

## Loader, cache e risorse annidate

Il loader file accetta anche un attributo `resource.loader.file.class` e `resource.loader.file.path` che può essere una lista separata da virgole: il motore prova i percorsi nell'ordine. In un'applicazione Spring Boot il loader predefinito è quello classpath, che legge i template impacchettati nel jar e li rende immutabili a run time: è la configurazione da preferire per i ticket di deploy, mentre il loader file serve per template che un operatore deve poter modificare senza ricompilare.

La cache è gestita dal `ResourceManager`: di default tiene i template analizzati e il loro stato di modifica, con una dimensione predefinita di 89 elementi e un LRU quando la dimensione è maggiore di zero. Le direttive `#parse` e `#include` passano dallo stesso manager, e la profondità di `#parse` è limitata da `directive.parse.max_depth` con valore predefinito 10: oltre quella soglia la fusione fallisce, anche se i template si richiamano a vicenda per scelta progettuale.

```velocity
## report/base.vm
#macro(tabella righe)
<table class="report">
#foreach($riga in $righe)
  <tr><td>$riga.articolo</td><td>$riga.quantita</td></tr>
#end
</table>
#end

## report/ordine.vm
#parse("report/base.vm")
<h2>Ordine ${ordine}</h2>
#tabella($righe)
```

Le macro definite con `#macro` nei template normali sono locali al template e vengono caricate alla prima fusione; quelle in `velocimacro.library.path` sono globali e caricate dal motore. `velocimacro.library.autoreload = true` è comodo in sviluppo solo se `resource.loader.file.cache = false`: le due impostazioni dipendono l'una dall'altra e vanno cambiate insieme.

## Sandboxing: fidarsi del template quanto si fida di una query

Un template VTL che accede a oggetti Java può chiamare qualsiasi metodo visibile tramite reflection, compresi `getClass()`, `forName` e i metodi di `Runtime`. Se il template arriva da un utente, da un plugin di terze parti o da un CMS, il motore è di fatto un interprete remoto: il rischio non è il motore in sé ma l'oggetto iniettato nel `VelocityContext`.

La contromisura principale è `introspector.uberspect.class = org.apache.velocity.util.introspection.SecureUberspector`, che blocca la creazione di classi arbitrariamente e limita l'accesso alla reflection. In aggiunta, il contesto va popolato con oggetti di sola lettura: liste non modificabili (`List.copyOf`), record senza riferimenti a servizi e DTO invece di entità JPA, perché una chiamata `$entita.relatedItems` su un contesto aperto carica lazy loading e produce query a catena dal template.

```java
public record RigaFattura(String articolo, int quantita, BigDecimal prezzo) {
    public BigDecimal importo() { return prezzo.multiply(BigDecimal.valueOf(quantita)); }
}

VelocityContext ctx = new VelocityContext();
ctx.put("righe", List.copyOf(righe));   // immutabile: nessun add/clear dal template
ctx.put("cliente", clienteView);         // DTO, non l'entità
```

Con il `SecureUberspector` l'accesso a campi pubblici e la costruzione di nuove istanze falliscono: i template devono passare solo per getter e metodi dichiarati nelle API dei DTO. È una disciplina vincolante, ma è quella che porta alla regola generale: nel `VelocityContext` espone ciò che un template è legittimato a leggere, non l'oggetto che hai per le mani.

## Osservabilità

Velocity scrive nel proprio log runtime, configurabile con `runtime.log.name` e - che tu scelga un logger esterno o quello predefinito - è la prima fonte per capire perché un template non si rende. Le invalid reference, le chiamate perse e le macro non definite lasciano traccia solo se `runtime.log.log_invalid_references` e `runtime.log.log_invalid_method_calls` sono attivi, che è il default. In aggiunta, il motore registra il path spaziale `org.apache.velocity` con le categorie `directive`, `parser`, `resource` e `macro`: individuare la categoria giusta riduce di molto la latenza di diagnosi.

| Livello | Cosa guardi | Quando serve |
| --- | --- | --- |
| `org.apache.velocity.runtime` | lookup falliti, strict mode | errori di contesto |
| `org.apache.velocity.resource` | template trovati e cache hit | template mancanti |
| `org.apache.velocity.macro` | caricamento libreria macro | macro non definite |
| `org.apache.velocity.parser` | sintassi del template | errori di parse dopo un deploy |

## Errori comuni

- **Configurare il motore con la classe singleton `Velocity`**: due contesti applicativi nella stessa JVM si sovrascrivono le proprietà, e i test diventano dipendenti dall'ordine.
- **Cambiare proprietà dopo `init()`**: i componenti sono già creati e la modifica viene ignorata senza errore.
- **Attivare `velocimacro.library.autoreload` con la cache attiva**: l'autoreload non scatta e in produzione si scoprono modifiche solo al riavvio.
- **Esporre entità JPA o `Map` modificabili nel contesto**: il template può mutare lo stato o innescare lazy loading.
- **Lasciare il loader file con percorsi derivati dall'input**: un `#parse` costruito da parametri utente legge file arbitrari.
- **Testare con lo strict mode spento**: i riferimenti mancanti passano inosservati e il primo report reale esce con colonne vuote.

## In sintesi

La configurazione di Velocity è una questione di confini: un motore per applicazione, un loader per tipo di template, una cache esplicitata e uno strict mode acceso. Quando il template non è tuo, serve il `SecureUberspector` e un contesto fatto di dati immutabili, altrimenti il motore diventa un ponte verso il filesystem e verso il framework ORM. Log e categorie rendono la diagnosi tracciabile, e la libreria di macro va versionata come il codice.

## Fonti

- [Apache Velocity - User Guide](https://velocity.apache.org/engine/2.3/user-guide.html)
- [Apache Velocity - Configuration Reference](https://velocity.apache.org/engine/devel/configuration.html)
- [Apache Velocity - Developer Guide](https://velocity.apache.org/engine/2.3/developer-guide.html)
- [Apache Velocity - Engine](https://velocity.apache.org/engine/2.3/)
