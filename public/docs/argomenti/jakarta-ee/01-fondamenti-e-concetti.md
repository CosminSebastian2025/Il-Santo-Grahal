Jakarta EE è l'insieme di specifiche Java per il software enterprise: 44 specifiche su 32 progetti, raccolte in tre profili (Core, Web, Platform) e rilasciate con un test di compatibilità che i server devono superare. Non è un framework da installare, è un contratto: il tuo codice usa le API standard e il runtime è intercambiabile. Questa lezione spiega com'è organizzata la piattaforma e come orientarsi tra le specifiche senza perdersi.

## Obiettivi

- Distinguere piattaforma, profili e specifiche, e sapere quale versione porta cosa.
- Riconoscere i cambi di namespace da `javax.*` a `jakarta.*` e i vincoli di compatibilità.
- Scegliere tra implementazione completa (GlassFish, WildFly, Payara) e runner leggero.
- Collegare ogni esigenza di sviluppo alla specifica corrispondente.

## Che cos'è Jakarta EE: profili e specifiche

La piattaforma è definita per profili cumulativi. Il Core Profile contiene il minimo per un servizio: Jakarta RESTful Web Services 4.0, CDI Lite 4.1, JSON Processing 2.1, JSON Binding 3.0, Annotations 3.0, Interceptors 2.2 e Dependency Injection 2.0. Il Web Profile aggiunge la parte Web: Servlet 6.1, Pages (ex JSP) 4.0, Faces 4.1, Expression Language 6.0, WebSocket 2.2, CDI 4.1, Persistence 3.2, Transactions 2.0, Validation 3.1, Security 4.0, Authentication 3.1, Data 1.0, Concurrency 3.1. Il Platform aggiunge Messaging, Batch, Mail, Connectors, Enterprise Beans 4.0, Authorization 3.0 e altre specifiche per l'integrazione.

Con Jakarta EE 11, approvato con il ballot JESP concluso il 17 giugno 2025, la piattaforma richiede Java SE 17 come minimo e sfrutta Java 21 quando disponibile: la Concurrency 3.1 gestisce thread virtuali nei managed executor, e la Persistence 3.2 mappa i `Record` Java con `@Embeddable` o `@IdClass` e mappa `java.time.Instant` e `java.time.Year` come tipi nativi.

| Profilo | Specifica di riferimento | Cosa abilita | Uso tipico |
| --- | --- | --- | --- |
| Core | Core Profile 11 | REST, CDI Lite, JSON | microservizi, librerie |
| Web | Web Profile 11 | Servlet, Pages, Faces, Persistence | applicazioni web con UI server-side |
| Platform | Platform 11 | tutto + Messaging, Batch, EJB | sistemi aziendali con integrazione |

Il numero di specifiche non è nozionismo: il profilo decide quali classi il runtime garantisce. Scrivere un bean `@Remote` su un server Core Profile non è questione di gusto, è codice che non parte.

## Il cambio di namespace e la catena dei rilasci

Fino a Jakarta EE 8 il pacchetto era `javax.*`. Da Jakarta EE 9 è `jakarta.*`, perché il namespace Java EE appartiene a Oracle e non poteva essere evoluto dalla Eclipse Foundation. La rottura è binaria: una libreria compilata su `javax.servlet` non funziona su Tomcat 10, che fornisce solo `jakarta.servlet`.

Da quella rottura in poi ogni release segue il progetto semver delle specifiche, ma la piattaforma ha una numerazione diversa: Jakarta EE 9 (2020) è su Servlet 4.0, Jakarta EE 10 (settembre 2022) su Servlet 6.0, Jakarta EE 11 su Servlet 6.1. Il numero di Jakarta EE non dice il numero delle specifiche: le mappe stanno nelle release note ufficiali, che valgono più di qualsiasi blog.

```xml
<!-- Java EE 8 / Jakarta EE 8 -->
<dependency>
  <groupId>javax.servlet</groupId>
  <artifactId>javax.servlet-api</artifactId>
  <version>4.0.1</version>
  <scope>provided</scope>
</dependency>
<!-- Jakarta EE 9+ : pacchetto e coordinate cambiano insieme -->
<dependency>
  <groupId>jakarta.servlet</groupId>
  <artifactId>jakarta.servlet-api</artifactId>
  <version>6.1.0</version>
  <scope>provided</scope>
</dependency>
```

La regola pratica: namespace del codice, gruppo Maven e versione del server devono appartenere alla stessa generation. Il tool di migrazione di Tomcat riscrive i riferimenti `javax` nei file di configurazione, non nel bytecode delle librerie di terze parti.

## Dove gira il codice: vendor, runner e compatibilità

Un'implementazione certificata per il Platform o il Web Profile espone tutte le specifiche del profilo. GlassFish 7, WildFly, Payara e Open Liberty sono le più diffuse; Tomcat 10.1 e 11 sono implementazioni di Servlet, Pages e WebSocket ma non sono certificati per l'intero profilo Web, quindi su Tomcat il codice resta su servlet e JSP, con REST e Persistence integrate come librerie tramite WAR.

| Prodotto | Profili | Servlet | Nota |
| --- | --- | --- | --- |
| Apache Tomcat 10.1 / 11.0 | specifiche singole | 6.0 / 6.1 | il container di riferimento, non un app server |
| Eclipse GlassFish 7 | Platform 11 | 6.1 | implementazione di riferimento |
| WildFly | Platform / Web | 6.1 nelle versioni recenti | app server JBoss |
| Payara Server | Platform / Web | 6.1 | fork di GlassFish con supporto commerciale |
| Open Liberty | Platform / Web / Core | 6.1 nelle release 25+ | modulare, avvio rapido |

Il codice sorgente delle API non va impacchettato nel deploy: la dipendenza si dichiara `provided`, perché il runtime fornisce le implementazioni. Se includi `jakarta.servlet-api` in `WEB-INF/lib` di un WAR per Tomcat, ottieni due copie della classe e un errore al caricamento.

Un nuovo progetto su Jakarta EE 11 si genera da `start.jakarta.ee`, che produce un progetto Maven o Gradle con il BOM corretto e una classe di esempio già compilabile. È il modo più rapido per non scegliere versioni a mano: il BOM `jakarta.platform:jakarta.jakartaee-bom` allinea tutte le specifiche del profilo.

## Errori comuni

- **Mescolare `javax` e `jakarta`**: il compilatore accetta solo uno dei due; a runtime la diagnosi è `NoClassDefFoundError` o `ClassNotFoundException`.
- **Dichiarare l'API con scope `compile`**: duplici classi nel classpath, con errori di linkage o ClassCastException tra classloader diversi.
- **Assumere che Tomcat sia un server Web Profile**: Tomcat fornisce Servlet e Pages, non CDI né Persistence; il codice che le usa va aggiunto come libreria nel WAR.
- **Aggiornare il server senza allineare le API**: compilare contro Servlet 6.1 e distribuire su un container 6.0 produce `NoSuchMethodError` a runtime, non un errore di build.
- **Scegliere il profilo a caso**: il Core Profile esclude Servlet e Faces; un progetto che li usa non viene certificato su quel profilo. Inoltre le restrizioni sul CDI Lite limitano builder e portable extension rispetto al profilo Web.

## In sintesi

Jakarta EE è un insieme di specifiche con profili cumulativi, un namespace nuovo e un ciclo di rilasci legato al JDK. La scelta del profilo decide quali API sono garantite; la scelta del prodotto decide se stai usando un container o un'app server. Il namespace `jakarta.*` è la linea di demarcazione vera: sotto di essa c'è Java EE, sopra Jakarta EE. Imparare la mappa delle specifiche permette di leggere il codice Jakarta EE senza framework e di scegliere il runtime giusto prima di installarlo.

## Fonti

- [Jakarta EE 11 Release](https://jakarta.ee/release/11/)
- [Jakarta EE Platform 11 Specification](https://jakarta.ee/specifications/platform/11/)
- [Jakarta EE Web Profile 11](https://jakarta.ee/specifications/webprofile/11/)
- [Jakarta EE Compatibility](https://jakarta.ee/compatibility/)
