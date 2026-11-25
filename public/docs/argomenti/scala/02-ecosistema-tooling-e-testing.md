Scala compila sulla JVM e produce bytecode che interagisce con Java senza adattatori; per questo il suo ecosistema include sia librerie Scala pure (collezioni, Akka, ZIO, Cats) sia milioni di artefatti Java pubblicati su Maven Central. In questa lezione vedi come nasce un progetto Scala 3, quali strumenti lo gestiscono, come si scrivono i test e dove il linguaggio viene usato in produzione.

## Obiettivi

- Organizzare un progetto Scala 3 con sbt e comprendere il ruolo di `build.sbt`.
- Alternare sbt e Scala CLI secondo lo scenario: progetto strutturato o script singolo.
- Riconoscere gli artefatti Scala su Maven Central e le convenzioni `_3` dei suffissi.
- Scrivere test con MUnit e JUnit sfruttando l'interop con Java.
- Valutare casi d'uso reali di Scala: dati, backend distribuito e servizi su JVM.

## Struttura del progetto e sbt

Un progetto Scala standard segue la disposizione di Maven: sorgenti in `src/main/scala`, test in `src/test/scala`. sbt è lo strumento storico dell'ecosistema e resta il più diffuso: legge `build.sbt`, risolve dipendenze da Maven Central, gestisce task incrementali e la console interattiva.

```scala
// build.sbt: progetto minimale Scala 3
val scala3Version = "3.3.4" // LTS: fixa la serie nel progetto

lazy val root = project
  .in(file("."))
  .settings(
    name := "contaparole",
    version := "0.1.0",
    scalaVersion := scala3Version,
    libraryDependencies ++= Seq(
      "org.scalameta" %% "munit" % "1.0.0" % Test, // suffisso automatico _3
      "com.github.plokhotnyuk.jsoniter-scala" %% "jsoniter-scala-core" % "2.28.0",
    ),
  )
```

Il simbolo `%%` appende il suffisso della versione Scala al nome dell'artefatto: la stessa libreria esiste come `foo_3` per Scala 3 e `foo_2.13` per Scala 2.13, e questo permette a entrambe le serie di convivere sullo stesso classpath grazie alla binarietà incompatibile tra le major.

```bash
sbt compile              # compila sorgenti in src/main/scala
sbt test                 # compila ed esegue i test
sbt console              # REPL con il classpath del progetto
sbt "runMain contaparole.Main note.txt"
```

La prima build scarica il compilatore e le dipendenze, quindi è lenta; le successive sono incrementali. Il file `project/build.properties` fissa la versione di sbt, mentre `project/plugins.sbt` aggiunge plugin come scalafmt o sbt-native-packager. I comandi si compongono: `sbt ~test` riesegue i test a ogni file salvato, un ciclo che somiglia molto a quello degli strumenti frontend.

## Scala CLI per script e prototipi

Scala CLI è l'altra via, pensata per file singoli, script e prototipi. In un progetto sbt non serve, ma è comoda per un esperimento: direttive `//> using` dichiarano dipendenze e versione del compilatore direttamente nel sorgente, senza build file.

```scala
//> using scala 3.3.4
//> using dep com.lihaoyi::os-lib:0.10.7
//> using test.dep org.scalameta::munit:1.0.0

import os._

@main def elenca(cartella: String): Unit =
  val file = os.list(os.Path(cartella)).filter(os.isFile)
  file.foreach(p => println(p.last)) // ordine: usa os.list in modo deterministico
```

```bash
scala-cli run elenca.scala -- /tmp
scala-cli test .                 # esegue i test del progetto
scala-cli compile --watch .      # ricompila a ogni salvataggio
```

| Scenario | Strumento | Motivo |
| --- | --- | --- |
| servizio con molti moduli | sbt o Mill | gestione multi-progetto, plugin, release |
| script o notebook | Scala CLI | un file, zero configurazione |
| test di una funzione | `sbt test` | integrazione con la CI del progetto |
| esperimento con una libreria | `scala-cli run file.scala` | dipendenza dichiarata inline |

## Testing ed ecosistema

La JVM permette di scegliere: MUnit è la libreria nativa Scala 3 con sintassi concisa, scalatest è la più diffusa, JUnit è la scelta quando il team arriva da Java. Tutte girano con `sbt test`, e la CI può eseguirle con qualsiasi runner che supporti la JVM.

```scala
import munit.FunSuite

class ParserSuite extends FunSuite:
  val parse = (s: String) =>
    s.toIntOption.map(_ * 2) // funzione pura: nessuno stato

  test("raddoppia un intero"):
    assertEquals(parse("21"), Some(42))

  test("fallisce su testo"):
    assertEquals(parse("ciao"), None) // Option invece di eccezione

  test("catena di valori"):
    assertEquals(List("1", "x", "3").flatMap(parse), List(2, 6))
```

Il formatter di riferimento è scalafmt, integrato in sbt con `sbt scalafmtAll`; per il linting si usa scalafix. La libreria Cats e il suo wrapper Cats Effect forniscono astrazioni funzionali molto usate nei servizi, mentre il toolkit Scala raccoglie un insieme curato di librerie per uso quotidiano.

## Casi d'uso reali

Scala si usa dove la JVM è già uno standard e servono concorrenza robusta o elaborazione dati. Le piattaforme di streaming si basano su Scala, e i framework come Akka e ZIO coprono attori e programmazione asincrona su larga scala. L'interop con Java consente di riutilizzare gli artefatti esistenti con un `import`.

| Contesto | Che ruolo ha Scala | Note |
| --- | --- | --- |
| elaborazione dati distribuita | DSL e librerie native Scala | forte uso di case class e pattern matching |
| backend ad attori | servizi concorrenti su JVM | team che conosce già Java |
| elaborazione di flussi | librerie di stream processing | correlazione con Kafka |
| applicazioni Android | supporto JVM compatibile | verificare versione di Scala e toolchain |

Chi arriva da Java trova molte cose note e poche sorprese: i thread, la garbage collection e il classpath sono gli stessi. Il costo principale è il tempo di compilazione, più alto rispetto a Java, e la curva iniziale dei sistemi di tipi molto espressivi. In un team misto conviene concentrare la complessità di tipi nelle librerie di dominio e lasciare i servizi applicativi semplici, così il codice resta accessibile a chi arriva da Java.

## Errori comuni

- **Miscelare versioni Scala incompatibili**: `_2.13` e `_3` non condividono la binarietà completa e la build fallisce con errori di link.
- **Scrivere un `build.sbt` con la versione "latest"**: senza una versione fissa le build non sono riproducibili e il compilatore cambia tra macchine.
- **Usare sbt per uno script di tre righe**: Scala CLI è più veloce da avviare e le direttive stanno nel sorgente.
- **Ignorare il tempo di compilazione in CI**: la prima build scarica tutto; conviene una cache del repository ivy e delle cache di compilazione.
- **Testare solo JVM ma mai i rami d'errore**: i test sono utili quanto coprono i fallimenti; `Either` e `Option` vanno testati su `None` e `Left`.

## In sintesi

sbt resta il riferimento per progetti Scala multipli con dipendenze Maven e plugin, mentre Scala CLI semplifica script e prototipi con direttive inline. Le librerie Scala sono pubblicate con suffisso di versione e possono essere testate con MUnit, scalatest o JUnit. L'ecosistema eredita tutto Java, e Scala si usa nei servizi distribuiti e nell'elaborazione dei dati. Fissa la versione del compilatore e investi nella cache di build.

## Fonti

- [Scala 3 Book - Scala Tools](https://docs.scala-lang.org/scala3/book/scala-tools.html)
- [Scala 3 Book - Building and Testing Projects with sbt](https://docs.scala-lang.org/scala3/book/tools-sbt.html)
- [Scala CLI - Overview](https://scala-cli.virtuslab.org/docs/overview)
- [The Scala Toolkit](https://docs.scala-lang.org/toolkit/introduction.html)
- [Getting Started with Scala 3](https://docs.scala-lang.org/scala3/getting-started.html)
