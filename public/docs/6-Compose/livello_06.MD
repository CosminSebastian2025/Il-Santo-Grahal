# Livello 6: oltre i limiti

Qui guardi dentro Compose: come funziona il runtime, cosa fa il compilatore, perché una schermata ricompone, come si misurano le prestazioni con dati veri e come si organizza un'app grande.

### Le tre fasi

Ogni frame di Compose attraversa tre fasi:

| Fase | Domanda | Cosa produce |
| --- | --- | --- |
| Composizione | quali composable esistono e con quali valori? | albero degli slot |
| Layout | quanto è grande ogni elemento e dove va? | `Placeable` misurati e posizionati |
| Disegno | come si dipinge ogni pixel? | comandi di disegno |

Un cambio di stato che riguarda solo il disegno può fermarsi alla fase 3. Un cambio di dimensione arriva alla fase 2. Solo un cambio di struttura o di valori letti in composizione torna alla fase 1.

Questa distinzione spiega le ottimizzazioni: animare dentro `Canvas` o `graphicsLayer` evita la composizione; animare `Modifier.size` la richiede.

### Lo stato è uno snapshot

`mutableStateOf` non è una variabile: è uno stato dentro un sistema di snapshot. Le scritture avvengono in una transazione e diventano visibili insieme.

```kotlin
val stato = mutableStateOf(0)

stato.value = 1            // scrittura nel global snapshot
stato.value = 2            // il frame vede 2, non un valore intermedio
```

La lettura durante la composizione registra una dipendenza: quando il valore cambia, il composer invalida lo scope che lo ha letto.

Per raggruppare più scritture in modo atomico:

```kotlin
Snapshot.withMutableSnapshot {
    contatore.value++
    ultimoAggiornamento.value = System.currentTimeMillis()
}
```

Dallo stato si può ricavare un flusso con `snapshotFlow`. È il ponte tra Compose e le coroutine:

```kotlin
LaunchedEffect(Unit) {
    snapshotFlow { query }
        .debounce(300)
        .distinctUntilChanged()
        .collect { testo -> viewModel.cerca(testo) }
}
```

Serve `androidx.compose.runtime.snapshotFlow` e `kotlinx.coroutines.flow.debounce`.

### Composition e Composer

La **composition** è l'albero delle chiamate ai composable. Il **Composer** è l'oggetto che la gestisce: sa dove siamo nell'albero, quali slot esistono, cosa ricordare.

- La prima esecuzione è la **composizione iniziale**: crea tutti i gruppi.
- Le successive sono **ricomposizioni**: solo gli scope invalidati vengono rieseguiti.
- Ogni `@Composable` genera un gruppo con una chiave basata sulla posizione nel codice.
- I loop e i rami condizionali cambiano la struttura: per questo le liste hanno `key`.

La **memoizzazione posizionale** è il motivo per cui `remember` funziona: il valore è legato a una posizione nell'albero. Due `remember` identici in punti diversi sono due slot diversi.

### La slot table

Il runtime conserva i dati in una **slot table**, una struttura compatta di gruppi e slot:

| Elemento | Contenuto |
| --- | --- |
| Gruppo | un composable o un blocco |
| Slot | un valore ricordato, un nodo, una lambda |
| Chiave | identifica il gruppo riavviabile |

Quando un elemento esce dall'albero, il suo gruppo viene rimosso e `onDispose`/`DisposableEffect` vengono eseguiti. Quando un elemento si sposta, Compose può ricrearlo, a meno che non si usi `movableContentOf`:

```kotlin
val contenutoMobile = remember {
    movableContentOf { ColonnaDettagli(dettaglio) }
}

if (inColonna) {
    Column { contenutoMobile() }
} else {
    Row { contenutoMobile() }
}
```

`movableContentOf` sposta lo stato del contenuto senza ricomporlo: utile per editor, player e viste che cambiano contenitore.

La slot table spiega anche i problemi di memoria: se un effetto non viene rimosso o un oggetto resta referenziato da uno slot, resta in vita finché il gruppo esiste.

### Perché avviene una ricomposizione

Una ricomposizione parte quando uno stato letto in uno **scope riavviabile** cambia.

```kotlin
@Composable
fun Schermata(lista: List<String>) {
    var testo by remember { mutableStateOf("") }

    Column {
        CampoTesto(testo) { testo = it }   // legge testo: si ricompone a ogni carattere
        ListaLunga(lista)                   // non legge testo: può essere saltata
    }
}
```

Se `testo` fosse letto nel genitore, ogni carattere ricomporrebbe anche `ListaLunga`. Il principio è: **leggi lo stato il più vicino possibile a chi lo usa**.

Altri casi che provocano ricomposizioni:

- un parametro cambia e il composable non è skippable;
- una lambda cattura uno stato instabile;
- si scrive stato durante la composizione (errore: può creare un ciclo);
- un oggetto nuovo viene creato a ogni ricomposizione e passato come parametro.

Le scritture fatte in composizione vengono rilevate dal runtime e possono causare un loop infinito. Le scritture vanno fatte in eventi, `LaunchedEffect` o `SideEffect`.

### Skippability e strong skipping

Un composable è **skippable** se il compilatore può saltarlo quando tutti i parametri sono uguali e stabili.

```kotlin
@Immutable
data class Film(val id: Int, val titolo: String, val anno: Int)

@Composable
fun CardFilm(film: Film) {   // skippable: Film è stabile
    Text(film.titolo)
}
```

Con le versioni moderne del compilatore lo **strong skipping** è attivo per impostazione predefinita: anche i parametri instabili vengono confrontati per identità, e le lambda vengono memorizzate. Non è una scusa per ignorare la stabilità: un oggetto ricreato a ogni ricomposizione è comunque un nuovo riferimento.

Regole pratiche:

- usa `@Immutable` solo su tipi davvero immutabili;
- preferisci `ImmutableList`/`PersistentList` per le collezioni esposte alla UI;
- evita di passare `List` mutabili condivise;
- non creare data class o lambda dentro la composizione senza `remember`;
- verifica con i report del compilatore, non a naso.

### Cosa fa il plugin del compilatore

Il plugin `org.jetbrains.kotlin.plugin.compose` trasforma ogni funzione `@Composable`. Concettualmente:

```kotlin
@Composable
fun Saluto(nome: String) {
    Text("Ciao, $nome")
}
```

diventa qualcosa come:

```kotlin
fun Saluto(nome: String, $composer: Composer?, $changed: Int) {
    if ($composer.shouldExecute($changed, nome)) {
        Text("Ciao, $nome", $composer, 0)
    } else {
        $composer.skipToGroupEnd()
    }

    $composer.endRestartGroup()?.updateScope { prossimo ->
        Saluto(nome, prossimo, $changed or 1)
    }
}
```

Le trasformazioni principali:

- aggiunge i parametri `$composer` e `$changed`;
- avvolge il corpo in un gruppo riavviabile con una chiave;
- sostituisce `remember` con accesso agli slot del composer;
- confronta i parametri tramite maschere di bit;
- genera una lambda di riavvio che sa quali parametri sono cambiati;
- gestisce i valori di default con un percorso separato.

Per questo il plugin è obbligatorio: senza, le chiamate non hanno i parametri che il runtime si aspetta. Con Kotlin 2.x il plugin è versionato insieme al compilatore e si applica con `org.jetbrains.kotlin.plugin.compose`.

### Misurazione e posizionamento

Il layout di Compose è a passaggio singolo: ogni figlio viene misurato una volta con i vincoli del genitore.

```text
genitore -> constraints (min/max larghezza e altezza) -> figlio
figlio   -> Placeable (larghezza, altezza, linee di allineamento) -> genitore
genitore -> layout(larghezza, altezza) { placeRelative(x, y) }
```

Le **misurazioni intrinseche** servono quando un genitore ha bisogno della dimensione "naturale" del figlio prima di misurarlo:

```kotlin
Row(modifier = Modifier.height(IntrinsicSize.Min)) {
    Text(
        text = "Testo lungo",
        modifier = Modifier.weight(1f)
    )
    VerticalDivider(modifier = Modifier.fillMaxHeight())
    Text("Azione")
}
```

Senza `IntrinsicSize.Min` il divisore non saprebbe quanto essere alto.

Un layout personalizzato leggero si può ottenere anche senza creare un nuovo composable:

```kotlin
fun Modifier.spazioSopra(dp: Dp) = this.layout { misurabile, vincoli ->
    val posto = misurabile.measure(vincoli)
    val spazio = dp.roundToPx()

    layout(posto.width, posto.height + spazio) {
        posto.placeRelative(0, spazio)
    }
}
```

`placeRelative` rispetta la direzione del layout (RTL/LTR); `place` usa coordinate assolute.

Le linee di allineamento permettono di allineare elementi su un punto preciso, per esempio la linea di base del testo:

```kotlin
Modifier.layout { misurabile, vincoli ->
    val posto = misurabile.measure(vincoli)
    layout(posto.width, posto.height) {
        posto.placeRelative(0, 0)
    }
}
```

Per un allineamento personalizzato si definisce una `AlignmentLine` e la si restituisce in `Placeable`.

### Subcomposizione in profondità

`LazyColumn` non compone tutti gli elementi: compone solo quelli visibili **durante la misura**. Per farlo usa la subcomposizione.

Il costo è reale:

- comporre durante la misura significa eseguire codice `@Composable` in una fase insolita;
- ogni elemento deve essere misurato per sapere quanto spazio occupa;
- gli elementi riciclati vanno composti e smontati;
- gli effetti collaterali devono rispettare il ciclo di vita dei gruppi.

```kotlin
SubcomposeLayout { vincoli ->
    val elementi = subcompose("elementi") {
        repeat(100) { i -> Text("Riga $i") }
    }.map { it.measure(vincoli) }

    layout(vincoli.maxWidth, elementi.sumOf { it.height }) {
        var y = 0
        elementi.forEach { posto ->
            posto.placeRelative(0, y)
            y += posto.height
        }
    }
}
```

Questo esempio compone cento testi per misurarli, quindi non risparmia nulla: la subcomposizione serve quando il numero di figli dipende dallo spazio. Per le liste reali Compose usa `LazyLayout`, che gestisce riciclo e prefetch in modo più efficiente. `SubcomposeLayoutState` permette di riusare la subcomposizione tra misure, ma è un'ottimizzazione da usare solo con misurazioni alla mano.

### Disegno efficiente

```kotlin
Modifier.drawWithCache {
    val percorso = Path().apply {
        moveTo(0f, size.height)
        quadraticBezierTo(size.width / 2f, 0f, size.width, size.height)
        close()
    }

    onDrawBehind {
        drawPath(percorso, MaterialTheme.colorScheme.primary)
    }
}
```

`drawWithCache` calcola una volta sola gli oggetti che dipendono solo dalla dimensione. Dentro il blocco di disegno, evita allocazioni: ogni frame le paga.

Per le tracce di sistema:

```kotlin
import androidx.tracing.trace

trace("elaborazioneLista") {
    val ordinata = lista.sortedBy { it.anno }
    // lavoro
}
```

`trace` produce sezioni visibili in Perfetto e nel profiler. Dipendenza: `androidx.tracing:tracing:1.2.0`.

### Macrobenchmark

I benchmark veri girano fuori dal processo dell'app, su build di release, e misurano avvio e fluidità. Serve un modulo separato `:benchmark`:

```kotlin
plugins {
    id("com.android.test")
    kotlin("android")
}

android {
    compileSdk = 35
    defaultConfig { minSdk = 24 }
    targetProjectPath = ":app"
}

dependencies {
    implementation("androidx.benchmark:benchmark-macro-junit4:1.3.3")
    implementation("androidx.test.ext:junit:1.2.1")
    implementation("androidx.test.uiautomator:uiautomator:2.3.0")
}
```

Nel manifest dell'app serve il profilo:

```xml
<application>
    <profileable android:shell="true" />
</application>
```

Benchmark di avvio a freddo:

```kotlin
@RunWith(AndroidJUnit4::class)
class AvvioBenchmark {

    @get:Rule
    val regola = MacrobenchmarkRule()

    @Test
    fun avvioFreddo() = regola.measureRepeated(
        packageName = "com.example.composecorso",
        metrics = listOf(StartupTimingMetric()),
        iterations = 5,
        startupMode = StartupMode.COLD,
        compilationMode = CompilationMode.Partial()
    ) {
        pressHome()
        startActivityAndWait()
    }
}
```

Benchmark di scorrimento:

```kotlin
@Test
fun scorrimentoLista() = regola.measureRepeated(
    packageName = "com.example.composecorso",
    metrics = listOf(FrameTimingMetric()),
    iterations = 5,
    compilationMode = CompilationMode.Partial(),
    startupMode = StartupMode.WARM
) {
    pressHome()
    startActivityAndWait()

    val lista = device.findObject(By.res("lista"))
    lista.setGestureMargin(device.displayWidth / 5)

    repeat(3) {
        lista.fling(Direction.DOWN)
        device.waitForIdle()
    }
}
```

Regole:

- il modulo benchmark non può essere l'app stessa;
- l'app deve essere non debuggable e in release;
- i benchmark girano su dispositivo fisico o emulatore API 29+;
- i risultati vanno confrontati sullo stesso dispositivo, non tra dispositivi diversi;
- `CompilationMode.Partial()` è il caso realistico con profilo di baseline; `CompilationMode.Full()` misura il massimo teorico.

### Baseline profile

Un **baseline profile** è un elenco di classi e metodi usati all'avvio che la piattaforma compila in anticipo. Riduce jank e tempo di avvio.

Dipendenze runtime:

```kotlin
implementation("androidx.profileinstaller:profileinstaller:1.4.1")
```

Plugin per generarlo:

```kotlin
plugins {
    id("androidx.baselineprofile")
}
```

Regola con Macrobenchmark:

```kotlin
@get:Rule
val regola = BaselineProfileRule()

@Test
fun generaProfilo() = regola.collect(
    packageName = "com.example.composecorso"
) {
    pressHome()
    startActivityAndWait()

    // percorri le schermate principali della tua app
}
```

Il profilo generato finisce nella cartella di build del modulo e viene incluso nell'APK/AAB di release. Per verificarlo:

```kotlin
compilationMode = CompilationMode.Partial(
    baselineProfileMode = BaselineProfileMode.Require
)
```

Con `Require` il benchmark fallisce se il profilo non viene usato, quindi non puoi dichiarare un miglioramento inesistente.

### Modularizzazione

Un'app grande si divide in moduli:

```text
:app                  punto di ingresso e navigazione
:core:model           data class condivise
:core:data            repository e sorgenti dati
:core:designsystem    tema, token, componenti
:feature:lista        schermata lista
:feature:dettaglio    schermata dettaglio
```

Vantaggi: compilazione incrementale più veloce, confini chiari, test isolati, possibilità di feature dinamiche. Costo: più configurazione Gradle e dipendenze da gestire.

Regole per Compose nei moduli:

- ogni modulo con UI applica il plugin Compose e `buildFeatures.compose = true`;
- i tipi Compose esposti all'esterno vanno in `api`, il resto in `implementation`;
- il tema e i componenti condivisi stanno in `:core:designsystem`;
- nessun modulo feature dipende da un'altra feature: comunicano tramite l'app o un contratto.

Per i tipi di terze parti che sai stabili ma che il compilatore non riconosce, esiste il file di configurazione della stabilità:

```kotlin
composeCompiler {
    stabilityConfigurationFile = rootProject.layout.projectDirectory.file("compose_stability.conf")
}
```

```text
com.example.composecorso.model.*
java.time.LocalDate
```

Attenzione: dichiarare stabile un tipo che può cambiare senza notifica rompe la UI. Non inserire `kotlin.collections.List` se qualche chiamante può mutarla.

### Design system

Un design system non è solo un tema: è un contratto tra design e codice.

```kotlin
@Immutable
data class Spazi(val piccolo: Dp = 4.dp, val medio: Dp = 8.dp, val grande: Dp = 16.dp)

val LocalSpazi = staticCompositionLocalOf { Spazi() }

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalSpazi provides Spazi()) {
        MaterialTheme(content = content)
    }
}

object Tema {
    val spazi: Spazi
        @Composable
        @ReadOnlyComposable
        get() = LocalSpazi.current
}
```

- i token hanno nomi semantici (`spazi.grande`), non valori (`16.dp`);
- i componenti del design system non conoscono il dominio dell'app;
- ogni componente ha anteprime per tema chiaro, scuro e font grande;
- `@ReadOnlyComposable` evita ricomposizioni quando si leggono solo valori del tema.

`CompositionLocalProvider` è utile per temi e configurazioni trasversali; non usarlo per passare dati di business, che devono viaggiare esplicitamente.

### Compose Multiplatform

Compose Multiplatform porta la stessa UI su Android, iOS, desktop e web. Il modulo condiviso contiene i composable; le piattaforme hanno solo punti di ingresso e codice specifico.

```kotlin
plugins {
    kotlin("multiplatform")
    id("com.android.application")
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}
```

Dipendenze comuni:

```kotlin
commonMain.dependencies {
    implementation(compose.runtime)
    implementation(compose.foundation)
    implementation(compose.material3)
    implementation(compose.ui)
    implementation(compose.components.resources)
}
```

Ingresso desktop:

```kotlin
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application

fun main() = application {
    Window(onCloseRequest = ::exitApplication, title = "ComposeCorso") {
        App()
    }
}
```

Differenze da tenere presenti:

- in `commonMain` niente API Android: usa `expect`/`actual` per ciò che cambia;
- risorse condivise con `compose.components.resources` e `Res`;
- navigazione e lifecycle hanno librerie dedicate (Navigation Compose multiplatform, Decompose, Voyager);
- alcuni componenti Material 3 arrivano con versioni diverse: controlla la documentazione della versione di Compose Multiplatform;
- i test UI cambiano per piattaforma.

Questa parte del percorso resta su Android: Compose Multiplatform è il passo successivo naturale, e i concetti di runtime, stato, misurazione e performance valgono identici.

### Esempio completo: contatore di ricomposizioni

```kotlin
@Composable
fun SchermataContatore() {
    var valore by remember { mutableIntStateOf(0) }
    val ricomposizioni = remember { AtomicInteger(0) }

    SideEffect {
        Log.d("Compose", "SchermataContatore: ${ricomposizioni.incrementAndGet()}")
    }

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        TestoValore(valore)

        Button(onClick = { valore++ }) {
            Text("+")
        }
    }
}

@Composable
private fun TestoValore(valore: Int) {
    val ricomposizioni = remember { AtomicInteger(0) }

    SideEffect {
        Log.d("Compose", "TestoValore: ${ricomposizioni.incrementAndGet()}")
    }

    Text(
        text = "$valore",
        style = MaterialTheme.typography.displayLarge
    )
}
```

`SideEffect` viene eseguito dopo ogni composizione riuscita dello scope che lo contiene: serve per notificare il mondo esterno senza scrivere stato del frame. Con `adb logcat -s Compose` vedi il conteggio salire quando premi `+`, e noti che `TestoValore` ricompone solo perché riceve un valore diverso. Se il pulsante non toccasse lo stato letto da `TestoValore`, il figlio verrebbe saltato.

### Errori comuni

- **Scrivere stato durante la composizione.** Crea ricomposizioni a catena o un loop infinito.
- **Leggere lo stato nel genitore.** Tutto il sottoalbero ricompone; sposta la lettura vicino all'uso.
- **Passare `List` mutabili alla UI.** Il compilatore le considera instabili e i cambiamenti sfuggono.
- **Creare oggetti a ogni ricomposizione.** Le data class e le lambda nuove annullano la memoizzazione.
- **Abusare di `SubcomposeLayout`.** Comporre durante la misura è costoso.
- **Usare `CompilationMode.None()` nei benchmark.** Misura il caso peggiore, non l'esperienza reale.
- **Misurare build di debug.** I risultati non valgono nulla.
- **Baseline profile senza `Require`.** Il benchmark può passare anche senza usare il profilo.
- **Dichiarare stabile un tipo mutabile.** Il compilatore salta la ricomposizione e la UI resta vecchia.
- **Usare `CompositionLocal` per i dati di business.** Rende implicite le dipendenze e difficile il testing.

## Esercizi progressivi

**Esercizio 1.** Aggiungi `LogRicomposizioni` a una schermata con un campo di testo e osserva quali composable ricompongono a ogni carattere.

**Esercizio 2.** Sposta la lettura dello stato del testo dentro un composable figlio e verifica la riduzione dei log.

**Esercizio 3.** Annota un modello con `@Immutable` e confronta i report del compilatore prima e dopo.

**Esercizio 4.** Usa `derivedStateOf` per la visibilità di un pulsante e misura le ricomposizioni con e senza.

**Esercizio 5.** Crea una ricerca con `snapshotFlow` e `debounce(300)`.

**Esercizio 6.** Scrivi un `Modifier.layout` che aggiunge spazio sopra, senza creare un nuovo composable.

**Esercizio 7.** Usa `IntrinsicSize.Min` per far combaciare un divisore con la riga più alta.

**Esercizio 8.** Sposta del contenuto con stato tra due contenitori usando `movableContentOf`.

**Esercizio 9.** Disegna una forma con `drawWithCache` e verifica che il `Path` non venga ricreato a ogni frame.

**Esercizio 10.** Aggiungi una sezione `trace("...")` a un caricamento e trovala nel profiler.

**Esercizio 11.** Configura il modulo `:benchmark` e misura l'avvio a freddo con 5 iterazioni.

**Esercizio 12.** Aggiungi un benchmark di scorrimento con `FrameTimingMetric`.

**Esercizio 13.** Genera un baseline profile e ripeti il benchmark con `BaselineProfileMode.Require`.

**Esercizio 14.** Crea un modulo `:core:designsystem` con tema, spazi e due componenti, poi usalo da `:app`.

**Esercizio 15.** Crea un progetto Compose Multiplatform minimo che mostra lo stesso `App()` su desktop e Android.

### Varianti

- Confronta `CompilationMode.Full()` e `CompilationMode.Partial()` nello stesso benchmark.
- Disabilita temporaneamente lo strong skipping in un branch e confronta i conteggi di ricomposizione.
- Nel design system, aggiungi un secondo set di spazi scelto da un `CompositionLocalProvider` di test.
- In Compose Multiplatform, aggiungi un saluto specifico per piattaforma con `expect`/`actual`.
- Nel benchmark di scorrimento, confronta una `LazyColumn` con e senza `contentType`.

## Progetti del livello 6

### Progetto 1: Audit e ottimizzazione

Requisiti:

- scegli una schermata dei livelli precedenti e registra il numero di ricomposizioni con Layout Inspector;
- elimina almeno due ricomposizioni inutili con letture differite o stato spostato;
- abilita i report del compilatore e annota i composable non skippable;
- correggi la stabilità di almeno un modello o di una collezione;
- disegna un grafico o un'animazione con letture in fase di disegno;
- scrivi un riepilogo con numeri prima e dopo.

### Progetto 2: Suite di benchmark

Requisiti:

- modulo `:benchmark` separato con `com.android.test`;
- benchmark di avvio a freddo e a caldo con `StartupTimingMetric`;
- benchmark di scorrimento con `FrameTimingMetric`;
- almeno 5 iterazioni per test e risultati su dispositivo fisico o emulatore API 29+;
- baseline profile generato e verificato con `BaselineProfileMode.Require`;
- tabella finale con media e deviazione dei tempi.

### Progetto 3: Modularizzazione dell'app

Requisiti:

- moduli `:core:model`, `:core:data`, `:core:designsystem`, `:feature:lista`, `:feature:dettaglio`, `:app`;
- nessuna dipendenza tra feature;
- tema, spazi e componenti condivisi nel design system;
- navigazione solo in `:app`;
- plugin Compose applicato a ogni modulo con UI;
- build completa funzionante e test dei moduli core.

### Progetto 4: Esperimento Compose Multiplatform

Requisiti:

- progetto Kotlin Multiplatform con `commonMain` condiviso;
- stessa schermata su Android e desktop;
- risorsa condivisa (immagine o stringa) tramite `compose.components.resources`;
- codice specifico di piattaforma con `expect`/`actual`;
- README con comandi per eseguire entrambe le piattaforme;
- nota sulle differenze trovate rispetto ad Android.

### Criteri di verifica

- [ ] Le tre fasi sono riconoscibili nel codice e nelle ottimizzazioni.
- [ ] Le ricomposizioni eliminate sono documentate con misure prima e dopo.
- [ ] I modelli esposti alla UI sono stabili o immutabili.
- [ ] I benchmark girano su release, fuori dal processo dell'app.
- [ ] Il baseline profile è usato e verificato, non solo generato.
- [ ] I moduli hanno confini chiari e nessuna dipendenza circolare.
- [ ] Il design system è indipendente dal dominio.
- [ ] L'esperimento Multiplatform condivide davvero la UI.

## Dopo questo percorso

Hai attraversato l'intero stack: dai primi `Text` al runtime, al compilatore, alle misure e alla distribuzione modulare. I passi successivi naturali sono:

- **Kotlin Multiplatform** per condividere logica e UI tra Android, iOS e desktop;
- **Compose per Wear OS, TV e desktop** con componenti dedicati;
- **test end-to-end** con Macrobenchmark, screenshot test e test di accessibilità automatici;
- **CI/CD** con build di release, benchmark e baseline profile generati a ogni modifica;
- **design system** versionato e pubblicato come libreria interna.

La regola che vale sempre: misura prima di ottimizzare, e mantieni la UI una funzione dello stato.
