Apache Velocity è un motore di template Java che trasforma testo con segnaposto in output: legge un file `.vm`, lo interpreta e lo fonde con un `Context`, una mappa di oggetti Java a cui il template accede per nome. Nato nel 2001 dentro il progetto Jakarta e giunto alla famiglia 2.x (l'ultima release pubblicata è la 2.4.1 su Maven Central), resta in produzione dove servono email, report e configurazioni generate da dati. In questa lezione vedi come è fatto il motore, come si integra da codice Java e quali confini di sicurezza e configurazione impone; la sintassi di VTL è nella scheda dedicata.

## Obiettivi

- Distinguere il ruolo di engine, `Context`, risorse e script di servizio.
- Integrare Velocity in un'applicazione Java 17 con `velocity-engine-core` 2.4.1.
- Configurare `FileResourceLoader`, cache delle risorse e percorsi di sicurezza.
- Conoscere l'eredità servlet e il rapporto con Apache Velocity Tools e Anakia.
- Valutare quando Velocity è la scelta giusta e quando non lo è.

## Anatomia del motore

Il motore ha quattro parti che comunicano per interfacce: il **parser**, che legge il template e produce un albero; il **runtime**, che percorre l'albero e valuta i riferimenti; il **resource loader**, che decide come trovare e leggere un template dato un nome; il **context**, la mappa di dati esposta al template. A queste si aggiungono il caching delle risorse, la gestione delle Velocimacro (le macro riusabili) e la personalizzazione dell'introspection, cioè il meccanismo con cui un riferimento come `$utente.nome` diventa una chiamata a `getNome()`.

| Componente | Classe o proprietà predefinita | Ruolo |
| --- | --- | --- |
| Engine | `VelocityEngine` | istanza configurata e thread-safe |
| Context | `org.apache.velocity.VelocityContext` | dati con visibilità per thread |
| Loader | `resource.loaders = file` | risoluzione dei nomi di template |
| Cache | `resource.manager.cache.default_size = 89` | riuso dei template analizzati |
| Macro | `velocimacro.library.path = velocimacros.vtl` | libreria di macro globale |
| Introspection | `introspector.uberspect.class` | accesso a proprietà e metodi Java |

Ogni `VelocityEngine` creato con `new VelocityEngine()` è indipendente: la configurazione passata a `init()` vale solo per quell'istanza, mentre la classe singleton `Velocity` usa una configurazione globale leggibile da `velocity.properties`. Per questo nelle applicazioni moderne si preferisce sempre l'istanza esplicita.

## Integrazione in un'applicazione Java

L'integrazione minima si regge su tre righe: si dichiara la dipendenza, si inizializza un motore con le sue proprietà e si fonde il template con il contesto. Il codice seguente genera un riepilogo ordine usando Java 17 e la libreria `velocity-engine-core`.

```xml
<dependency>
  <groupId>org.apache.velocity</groupId>
  <artifactId>velocity-engine-core</artifactId>
  <version>2.4.1</version>
</dependency>
```

```java
import java.io.StringWriter;
import java.util.List;
import java.util.Properties;
import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.VelocityEngine;
import org.apache.velocity.exception.VelocityException;

public final class RiepilogoOrdine {
    private final VelocityEngine engine = creaMotore();

    private static VelocityEngine creaMotore() {
        Properties p = new Properties();
        p.setProperty("resource.loaders", "file");
        p.setProperty("resource.loader.file.path", "src/main/resources/templates");
        p.setProperty("resource.loader.file.cache", "true");
        p.setProperty("runtime.strict_mode.enable", "true");

        VelocityEngine engine = new VelocityEngine();
        engine.init(p);
        return engine;
    }

    public String rendi(int ordine, String cliente, List<String> righe) throws VelocityException {
        VelocityContext ctx = new VelocityContext();
        ctx.put("ordine", ordine);
        ctx.put("cliente", cliente);
        ctx.put("righe", righe);

        StringWriter out = new StringWriter();
        engine.mergeTemplate("riepilogo.vm", "UTF-8", ctx, out);
        return out.toString();
    }
}
```

Tre dettagli cambiano il comportamento rispetto ai tutorial più vecchi. Il primo: `mergeTemplate` vuole la codifica esplicita, altrimenti i caratteri accentati del template vengono letti con il default di piattaforma. Il secondo: `runtime.strict_mode.enable = true` trasforma i riferimenti indefiniti in eccezioni, utile per un report che non deve produrre celle vuote silenziose. Il terzo: le eccezioni del motore derivano da `VelocityException` e conviene lasciarle uscire come errori applicativi, non intercettarle a metà.

Il `Context` ha una semantica di visibilità per thread: `put` sovrascrive, `internalPut` scrive senza controllare se la chiave esiste già e `VelocityContext` è progettato per essere clonato o esteso con un contesto padre, utile per condividere un dizionario comune tra più template.

## Risorse, cache e confini di sicurezza

Il resource loader `file` risolve i nomi relativi alla cartella configurata, ma la risoluzione stessa va guardata caso per caso: un template che chiama `#parse($path)` con `$path` proveniente dall'utente è un punto di accesso al filesystem. La difesa non sta nel motore ma nel confine applicativo: si passa al loader solo un nome normale controllato con un'espressione regolare (`[a-z0-9_-]+`), si tengono i template in una directory dedicata e, se la versione in uso espone `resource.loader.file.allow_inline`, lo si disattiva in produzione. Il motore predefinito registra un loader file con cache attiva: entrambe le scelte vanno esplicitate nei properties, non lasciate ai default.

| Impostazione | Predefinito | Effetto pratico |
| --- | --- | --- |
| `resource.loader.file.path` | `.` | directory base dei template |
| `resource.loader.file.cache` | `true` | i template analizzati restano in memoria |
| `resource.loader.file.allow_inline` | dipende dalla versione | se vero, un nome può essere un percorso |
| `resource.manager.cache.default_size` | `89` | dimensione della cache predefinita |
| `velocimacro.library.autoreload` | `false` | ricarica della libreria di macro solo in sviluppo |
| `runtime.log.log_invalid_references` | `true` | registra i riferimenti che non si risolvono |

Con la cache attiva ogni modifica a un template richiede un `engine.clearProperty` o il riavvio del processo: nei test conviene un motore per caso, in produzione la cache è ciò che rende Velocity economico. Il motore usa un pool di template e il parsing avviene una sola volta per nome.

## Eredità servlet e famiglie di prodotti

Velocity è nato con le servlet: `VelocityViewServlet` di **Velocity Tools** rendeva i template `.vm` come pagine, con toolbox XML per esporre oggetti e strumenti di formattazione. Apache **Anakia** invece usa Velocity per generare documentazione a partire da XML con un file di trasformazione. Entrambi esistono ancora ma l'uso prevalente nel 2026 è *headless*: il motore rende stringhe dentro servizi, job di reportistica, generatori di codice e pipeline di configurazione, mentre l'HTML lato web è passato a Thymeleaf, Freemarker o framework di componenti. Una nicchia importante è **Atlassian**: Jira Data Center e Confluence usano Velocity per macrotemi personalizzati, template email e i servizi di rendering esposti ai plugin, quindi chi integra quelle piattaforme incontra VTL anche senza scrivere codice Java.

| Scenario | Scelta sensata | Perché |
| --- | --- | --- |
| email e notifiche transazionali | Velocity 2.x headless | template modificabili senza deploy |
| pagine web nuove | Thymeleaf o Freemarker | integrazione moderna con Spring Boot |
| documentazione da XML | Anakia o generatore custom | trasformazione dichiarativa |

## Errori comuni

- **Usare la classe singleton `Velocity`**: la configurazione globale impedisce di avere due motori con impostazioni diverse nella stessa JVM, frequente nei test.
- **Dimenticare la codifica in `mergeTemplate`**: sui sistemi con default `Cp1252` o `UTF-8` diversi si ottengono mojibake solo in produzione.
- **Lasciare `allow_inline` attivo con percorsi dinamici**: è la via più semplice per leggere file di sistema tramite `#parse`.
- **Trattare il motore come thread-unsafe**: `VelocityEngine` lo è, ma il `Context` condiviso tra thread no; va creato o clonato per richiesta.
- **Mettere logica di business nelle macro**: il template non ha test né debugger, e l'alternativa è duplicare regole in Java e in VTL.

## In sintesi

Velocity è un motore di rendering sincrono con quattro componenti: parser, runtime, resource loader e context. L'integrazione moderna si fa con un'istanza `VelocityEngine` configurata per applicazione, `mergeTemplate` con codifica esplicita e strict mode attivo. La sicurezza dipende dalle proprietà del loader, non dal template, e la cache rende il motore economico al prezzo di espliciti invalidamenti. L'uso è ormai headless, con una nicchia forte negli ecosistemi enterprise che continuano a usare VTL.

## Fonti

- [Apache Velocity - Engine](https://velocity.apache.org/engine/2.3/)
- [Apache Velocity - Developer Guide](https://velocity.apache.org/engine/2.3/developer-guide.html)
- [Apache Velocity - Configuration Reference](https://velocity.apache.org/engine/devel/configuration.html)
- [Maven Central - velocity-engine-core](https://repo1.maven.org/maven2/org/apache/velocity/velocity-engine-core/)
