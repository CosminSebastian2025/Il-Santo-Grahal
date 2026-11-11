# Livello 5: livello avanzato vero

Qui costruisci componenti tuoi, disegni a mano, leggi i gesti e impari perché alcune schermate ricompongono troppo. Alla fine sai anche testare e rendere accessibile ciò che scrivi.

### Composable personalizzati con slot

Un buon composable non ha dieci parametri booleani: espone slot.

```kotlin
@Composable
fun SchedaConBordo(
    titolo: String,
    modifier: Modifier = Modifier,
    azione: @Composable (() -> Unit)? = null,
    contenuto: @Composable () -> Unit
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = titolo,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f)
                )
                if (azione != null) azione()
            }

            Spacer(modifier = Modifier.height(8.dp))
            contenuto()
        }
    }
}
```

Uso:

```kotlin
SchedaConBordo(
    titolo = "Promemoria",
    azione = {
        IconButton(onClick = { }) {
            Icon(Icons.Default.Delete, contentDescription = "Elimina")
        }
    }
) {
    Text("Chiamare l'idraulico entro venerdì")
}
```

Regole per i componenti riusabili:

- accetta un `modifier: Modifier = Modifier` come primo parametro opzionale;
- espone slot invece di flag (`header`, `footer`, `leading`);
- non legge stato globale: riceve valori e callback;
- ha un nome che descrive il contenuto, non l'implementazione.

### Layout personalizzato

Quando `Row`, `Column` e `Box` non bastano, si misura e posiziona a mano con `Layout`:

```kotlin
@Composable
fun GrigliaDueColonne(
    modifier: Modifier = Modifier,
    spaziatura: Dp = 8.dp,
    contenuto: @Composable () -> Unit
) {
    Layout(content = contenuto, modifier = modifier) { misurabili, vincoli ->
        val spazio = spaziatura.roundToPx()
        val larghezza = (vincoli.maxWidth - spazio) / 2
        val posti = misurabili.map {
            it.measure(Constraints.fixed(larghezza, larghezza))
        }

        val righe = posti.chunked(2)
        val altezzaTotale = righe.sumOf { riga -> riga.maxOf { it.height } }

        layout(vincoli.maxWidth, altezzaTotale) {
            var y = 0
            righe.forEach { riga ->
                var x = 0
                riga.forEach { posto ->
                    posto.placeRelative(x, y)
                    x += larghezza + spazio
                }
                y += riga.maxOf { it.height }
            }
        }
    }
}
```

Il contratto è sempre lo stesso:

1. ricevi i `measurables` e i `constraints`;
2. chiami `measure` su ogni figlio;
3. restituisci `layout(larghezza, altezza)` con dentro un blocco che posiziona i figli.

Nel blocco `layout` non puoi chiamare composable: si misurano e posizionano solo `Placeable` già misurati.

`Constraints.fixed` impone una dimensione esatta. Se usi `constraints.maxWidth` senza limiti, il figlio può ricevere vincoli infiniti e l'app va in crash.

### SubcomposeLayout

`SubcomposeLayout` compone i figli **durante la misura**, quando conosci già le dimensioni. Serve quando il contenuto dipende dallo spazio disponibile.

```kotlin
@Composable
fun ConIntestazioneFissa(
    intestazione: @Composable () -> Unit,
    corpo: @Composable () -> Unit,
    modifier: Modifier = Modifier
) {
    SubcomposeLayout(modifier) { vincoli ->
        val testata = subcompose("testata", intestazione)
            .map { it.measure(vincoli.copy(minHeight = 0)) }

        val altezzaTestata = testata.maxOfOrNull { it.height } ?: 0
        val resto = vincoli.copy(
            minHeight = 0,
            maxHeight = (vincoli.maxHeight - altezzaTestata).coerceAtLeast(0)
        )

        val contenuto = subcompose("corpo", corpo)
            .map { it.measure(resto) }

        layout(vincoli.maxWidth, altezzaTestata + (contenuto.maxOfOrNull { it.height } ?: 0)) {
            testata.forEach { it.placeRelative(0, 0) }
            contenuto.forEach { it.placeRelative(0, altezzaTestata) }
        }
    }
}
```

`SubcomposeLayout` è potente ma costoso: comporre durante la misura rompe il normale flusso di misurazione. Usalo solo quando serve davvero. `LazyColumn`, `LazyRow` e `BoxWithConstraints` lo usano internamente.

### Canvas e disegno

`Canvas` permette di disegnare forme, linee e percorsi. Le coordinate sono in pixel; `size` è la dimensione dell'area di disegno.

```kotlin
Canvas(modifier = Modifier.size(200.dp)) {
    drawCircle(
        color = Color(0xFF00695C),
        radius = size.minDimension / 3f,
        center = center
    )

    drawLine(
        color = Color.DarkGray,
        start = Offset(0f, size.height),
        end = Offset(size.width, 0f),
        strokeWidth = 4f
    )

    drawRoundRect(
        color = Color(0xFFFFB74D),
        topLeft = Offset(16f, 16f),
        size = Size(80f, 48f),
        cornerRadius = CornerRadius(12f, 12f)
    )

    drawArc(
        color = Color(0xFF4DB6AC),
        startAngle = 0f,
        sweepAngle = 180f,
        useCenter = false,
        style = Stroke(width = 8f)
    )
}
```

| Funzione | Disegna |
| --- | --- |
| `drawCircle` | cerchio o ellisse |
| `drawRect` / `drawRoundRect` | rettangolo |
| `drawLine` | linea |
| `drawArc` | arco o spicchio |
| `drawPath` | forma libera con `Path` |
| `drawText` | testo con `TextMeasurer` |
| `drawImage` | bitmap |

Un grafico a barre:

```kotlin
@Composable
fun GraficoBarre(valori: List<Float>, modifier: Modifier = Modifier) {
    val colore = MaterialTheme.colorScheme.primary

    Canvas(modifier = modifier.fillMaxWidth().height(160.dp).padding(16.dp)) {
        val passo = size.width / valori.size
        val larghezza = passo * 0.6f

        valori.forEachIndexed { indice, valore ->
            val altezza = size.height * valore.coerceIn(0f, 1f)
            drawRoundRect(
                color = colore,
                topLeft = Offset(indice * passo + (passo - larghezza) / 2f, size.height - altezza),
                size = Size(larghezza, altezza),
                cornerRadius = CornerRadius(8f, 8f)
            )
        }
    }
}
```

Per un'animazione fluida non leggere lo stato animato nel composable: leggilo dentro il blocco di disegno.

```kotlin
val animato = remember { Animatable(0f) }

LaunchedEffect(Unit) {
    animato.animateTo(1f, animationSpec = tween(800))
}

Canvas(modifier = Modifier.size(200.dp)) {
    drawArc(
        color = Color(0xFF00695C),
        startAngle = -90f,
        sweepAngle = 360f * animato.value,
        useCenter = false,
        style = Stroke(width = 12.dp.toPx(), cap = StrokeCap.Round)
    )
}
```

Qui `animato.value` viene letto solo in fase di disegno: nessuna ricomposizione.

### Gesti con pointerInput

```kotlin
var offset by remember { mutableStateOf(Offset.Zero) }

Box(
    modifier = Modifier
        .size(120.dp)
        .offset { IntOffset(offset.x.roundToInt(), offset.y.roundToInt()) }
        .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
        .pointerInput(Unit) {
            detectDragGestures { change, trascinamento ->
                change.consume()
                offset += trascinamento
            }
        }
)
```

`detectDragGestures`, `detectTapGestures` e `detectTransformGestures` coprono la maggior parte dei casi:

```kotlin
Modifier.pointerInput(Unit) {
    detectTapGestures(
        onTap = { posizione -> println("Tap in $posizione") },
        onDoubleTap = { println("Doppio tap") },
        onLongPress = { println("Pressione lunga") }
    )
}
```

Regole importanti:

- `change.consume()` evita che il gesto arrivi anche al genitore;
- la chiave di `pointerInput` deve cambiare solo quando cambia la configurazione del gesto;
- le coordinate sono locali al componente.

Per un valore che si trascina lungo un asse c'è `draggable`:

```kotlin
val trascinamento = rememberDraggableState { delta ->
    posizione = (posizione + delta).coerceIn(0f, massimo)
}

Box(
    modifier = Modifier
        .fillMaxWidth()
        .draggable(
            state = trascinamento,
            orientation = Orientation.Horizontal
        )
)
```

### SwipeToDismissBox

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RigaEliminabile(
    testo: String,
    onElimina: () -> Unit
) {
    val stato = rememberSwipeToDismissBoxState(
        confirmValueChange = { valore ->
            if (valore == SwipeToDismissBoxValue.EndToStart) {
                onElimina()
                true
            } else {
                false
            }
        }
    )

    SwipeToDismissBox(
        state = stato,
        enableDismissFromStartToEnd = false,
        backgroundContent = {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.errorContainer)
                    .padding(horizontal = 24.dp),
                contentAlignment = Alignment.CenterEnd
            ) {
                Icon(
                    imageVector = Icons.Default.Delete,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onErrorContainer
                )
            }
        }
    ) {
        ListItem(
            headlineContent = { Text(testo) },
            modifier = Modifier.fillMaxWidth()
        )
    }
}
```

Lo swipe è solo un gesto: l'eliminazione vera deve modificare lo stato e, se serve, mostrare uno snackbar con "Annulla".

### GraphicsLayer

`graphicsLayer` applica trasformazioni in fase di disegno, senza ricomposizione:

```kotlin
Modifier.graphicsLayer {
    alpha = 0.8f
    scaleX = 1.1f
    scaleY = 1.1f
    rotationZ = 5f
    translationX = 12f
    shadowElevation = 8f
}
```

La variante con lambda è la più importante:

```kotlin
val offset = remember { Animatable(0f) }

Modifier.graphicsLayer {
    translationY = offset.value
}
```

Poiché `offset.value` viene letto solo in `graphicsLayer`, l'animazione non ricompone la gerarchia. È lo stesso principio del disegno su `Canvas`.

### Ricomposizione, stabilità e skippability

Compose ricompone un composable quando uno stato letto al suo interno cambia. Se i parametri di un composable non sono cambiati **e sono stabili**, Compose può saltarlo.

Un tipo è stabile quando Compose può fidarsi che `equals` descriva davvero il contenuto e che le proprietà pubbliche non cambino senza notifica. `String`, `Int`, data class con soli campi stabili sono stabili; `List`, `Set` e `Map` della libreria standard sono **instabili** perché l'interfaccia non garantisce l'immutabilità.

```kotlin
@Immutable
data class Utente(val id: Int, val nome: String)

@Composable
fun RigaUtente(utente: Utente) {
    Text(utente.nome)
}
```

Con `@Immutable` dichiari che un'istanza non cambia mai. Con `@Stable` prometti che le proprietà osservabili notificano i cambiamenti. Non sono decorazioni: se menti, la UI mostra dati vecchi.

Per le collezioni usa `kotlinx.collections.immutable` (`ImmutableList`, `PersistentList`) oppure leggi i dati come stato osservabile dentro il composable.

```kotlin
val visibile by remember {
    derivedStateOf { listState.firstVisibleItemIndex > 3 }
}
```

`derivedStateOf` evita ricomposizioni inutili quando lo stato di partenza cambia spesso ma il risultato cambia raramente. Non usarlo per calcoli banali.

Altre regole pratiche:

- leggi lo stato il più tardi possibile: `Modifier.offset { }` invece di `Modifier.offset(x, y)`;
- passa lambda invece di valori quando puoi;
- non scrivere stato durante la composizione: usa `LaunchedEffect` o un evento;
- non creare oggetti nuovi a ogni ricomposizione se possono essere ricordati.

### Profilare le ricomposizioni

Android Studio mostra i conteggi nel **Layout Inspector**: apri l'ispettore mentre l'app gira, seleziona **Recomposition counts** e interagisci. Se una schermata statica ricompone mentre scrivi in un campo, lo stato è letto troppo in alto.

Per un'analisi a livello di compilatore, abilita i report nel modulo dell'app:

```kotlin
composeCompiler {
    reportsDestination = layout.buildDirectory.dir("compose_reports")
    metricsDestination = layout.buildDirectory.dir("compose_metrics")
}
```

Dopo `./gradlew assembleRelease`, i file in `build/compose_reports/` indicano quali composable sono `skippable` e `restartable`. Un componente con parametri instabili compare come non skippable: è il primo candidato da sistemare.

### Test della UI

```kotlin
androidTestImplementation("androidx.compose.ui:ui-test-junit4")
debugImplementation("androidx.compose.ui:ui-test-manifest")
androidTestImplementation("androidx.test.ext:junit:1.2.1")
```

```kotlin
class ContatoreTest {

    @get:Rule
    val regola = createComposeRule()

    @Test
    fun ilPulsanteIncrementa() {
        regola.setContent {
            MaterialTheme { Contatore() }
        }

        regola.onNodeWithText("Conteggio: 0").assertIsDisplayed()
        regola.onNodeWithText("+").performClick()
        regola.onNodeWithText("Conteggio: 1").assertIsDisplayed()
    }
}
```

Import principali:

```kotlin
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.assertIsDisplayed
```

| Selettore | Cerca |
| --- | --- |
| `onNodeWithText` | testo visibile |
| `onNodeWithContentDescription` | descrizione accessibile |
| `onNodeWithTag` | `Modifier.testTag("...")` |
| `onAllNodesWithText` | tutti i nodi corrispondenti |

Azioni e verifiche: `performClick`, `performTextInput`, `performScrollTo`, `assertIsDisplayed`, `assertDoesNotExist`, `assertIsEnabled`, `assertTextContains`.

Per il lavoro asincrono usa `regola.waitUntil(timeoutMillis = 3_000) { ... }` oppure `regola.mainClock.advanceTimeBy(1_000)`.

### Accessibilità e semantica

```kotlin
Icon(
    imageVector = Icons.Default.Delete,
    contentDescription = "Elimina attività"
)

Image(
    painter = painterResource(R.drawable.profilo),
    contentDescription = "Foto di Anna",
    modifier = Modifier.size(64.dp).clip(CircleShape)
)

Image(
    painter = painterResource(R.drawable.sfondo),
    contentDescription = null // decorativa
)
```

Per i componenti personalizzati aggiungi semantica esplicita:

```kotlin
Modifier.semantics(mergeDescendants = true) {
    contentDescription = "Preferito attivo"
    stateDescription = if (attivo) "Attivo" else "Disattivo"
    role = Role.Switch
}
```

Per un indicatore di avanzamento:

```kotlin
Modifier.semantics {
    progressBarRangeInfo = ProgressBarRangeInfo(progresso, 0f..1f)
}
```

| Regola | Motivo |
| --- | --- |
| `contentDescription` su icone e immagini informative | TalkBack le annuncia |
| `null` sulle icone decorative | evita duplicati vocali |
| area tocco almeno 48dp | accessibilità motoria |
| contrasto sufficiente | leggibilità |
| non affidare informazioni solo al colore | daltonismo |
| testare con scala caratteri grande | layout robusti |

`Modifier.minimumInteractiveComponentSize()` porta l'area toccabile alla dimensione minima consigliata anche se il disegno è più piccolo.

### Esempio completo: anello di progresso

```kotlin
@Composable
fun AnelloProgresso(
    progresso: Float,
    modifier: Modifier = Modifier
) {
    val limitato = progresso.coerceIn(0f, 1f)
    val animato by animateFloatAsState(limitato, label = "progresso")

    Box(
        modifier = modifier
            .size(140.dp)
            .semantics {
                progressBarRangeInfo = ProgressBarRangeInfo(limitato, 0f..1f)
            },
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val spessore = 12.dp.toPx()

            drawArc(
                color = Color(0xFFE0E0E0),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(width = spessore, cap = StrokeCap.Round)
            )

            drawArc(
                color = Color(0xFF00695C),
                startAngle = -90f,
                sweepAngle = 360f * animato,
                useCenter = false,
                style = Stroke(width = spessore, cap = StrokeCap.Round)
            )
        }

        Text(
            text = "${(limitato * 100).toInt()}%",
            style = MaterialTheme.typography.headlineSmall
        )
    }
}
```

L'anello è disegnato su `Canvas`, il testo è un composable sopra il disegno e la semantica permette a TalkBack di leggere il valore.

### Errori comuni

- **Chiamare composable dentro `layout`.** Nel blocco di posizionamento ci sono solo `Placeable`.
- **Vincoli infiniti in un layout custom.** Un figlio in una direzione scorrevole non può ricevere `maxWidth` infinito.
- **`SubcomposeLayout` usato per tutto.** Costoso: usalo solo quando il contenuto dipende dalle misure.
- **Animare leggendo lo stato nel composable.** Ricompone a ogni frame: leggi dentro `Canvas` o `graphicsLayer`.
- **Non consumare i cambiamenti nei gesti.** Il genitore riceve lo stesso evento e si comporta in modo inatteso.
- **`pointerInput(Unit)` quando il gesto dipende da uno stato.** La lambda resta chiusa sul valore vecchio: usa la chiave corretta o `rememberUpdatedState`.
- **`@Immutable` usato per zittire il compilatore.** Se il dato cambia senza notifica, la UI mostra valori vecchi.
- **`derivedStateOf` per tutto.** Aggiunge complessità senza beneficio quando il calcolo è banale.
- **Test che dipendono dal tempo reale.** Usa `mainClock` o `waitUntil`.
- **`contentDescription` mancante o duplicato.** TalkBack legge cose inutili o salta informazioni.

## Esercizi progressivi

**Esercizio 1.** Crea `SchedaConBordo` con slot per azione e contenuto; usala in una lista.

**Esercizio 2.** Implementa una griglia a due colonne con `Layout` e spaziatura uniforme.

**Esercizio 3.** Nella griglia, gestisci righe con altezze diverse e verifica che l'altezza totale sia corretta.

**Esercizio 4.** Crea un `SubcomposeLayout` con intestazione fissa e corpo che riceve l'altezza rimanente.

**Esercizio 5.** Disegna un semaforo con `Canvas`: tre cerchi e un rettangolo di sfondo.

**Esercizio 6.** Disegna un grafico a barre da una lista di valori normalizzati.

**Esercizio 7.** Disegna un anello di progresso e collegalo a uno slider.

**Esercizio 8.** Crea un'area che conta tap, doppio tap e pressione lunga con `detectTapGestures`.

**Esercizio 9.** Trascina un box con `detectDragGestures` e impedisci che esca dai bordi.

**Esercizio 10.** Crea uno slider personalizzato con `draggable` e un valore mostrato sopra.

**Esercizio 11.** Aggiungi lo swipe per eliminare a una riga, con snackbar e "Annulla".

**Esercizio 12.** Anima la traslazione di una card con `Animatable` e `graphicsLayer`, senza ricomposizioni.

**Esercizio 13.** Mostra un pulsante "Torna su" con `derivedStateOf` legato a `LazyListState`.

**Esercizio 14.** Scrivi un test Compose per il contatore e uno per una lista filtrata.

**Esercizio 15.** Aggiungi semantica a un componente custom e verifica con TalkBack che il valore sia annunciato.

### Varianti

- Nella griglia, aggiungi un bordo attorno a ogni cella con `drawBehind`.
- Nel grafico, usa un `Brush.verticalGradient` invece di un colore pieno.
- Nello slider, aggiungi il rilascio con inerzia usando `Animatable` e `animateDecay`.
- Nel test, cerca il nodo con `onNodeWithContentDescription` invece del testo.
- Annota un data class con `@Immutable` e confronta il report del compilatore prima e dopo.

## Progetti del livello 5

### Progetto 1: Libreria di componenti

Requisiti:

- almeno sei componenti riusabili: pulsante con stato di caricamento, campo con errore, chip selezionabile, card con slot, switch personalizzato, indicatore circolare;
- tutti con `modifier` come parametro e nessuno stato globale;
- switch e indicatore disegnati con `Canvas`;
- semantica corretta su ogni componente;
- una schermata "catalogo" che mostra tutte le varianti;
- test Compose per almeno tre componenti.

### Progetto 2: Dashboard con grafici

Requisiti:

- griglia custom a due colonne per le card;
- almeno due grafici disegnati su `Canvas` (barre e anello di progresso);
- valori animati all'ingresso;
- intestazione fissa con `SubcomposeLayout` o `stickyHeader`;
- dati finti ma con struttura realistica;
- layout leggibile con font grande e schermo stretto;
- semantica dei valori numerici.

### Progetto 3: Gestione attività con swipe

Requisiti:

- lista di attività con `SwipeToDismissBox`;
- eliminazione con snackbar e ripristino;
- riordino tramite trascinamento manuale o animazioni `animateItem`;
- gesto di pressione lunga per mostrare azioni;
- stato nel ViewModel e nessuna perdita dopo la rotazione;
- feedback visivo durante il gesto;
- test UI per lo swipe e per il ripristino.

### Progetto 4: Audit di performance e accessibilità

Requisiti:

- prendi una schermata dei livelli precedenti e misura le ricomposizioni con Layout Inspector;
- elimina almeno due ricomposizioni inutili leggendo lo stato più tardi;
- abilita i report del compilatore e annota i composable non skippable prima e dopo;
- controlla contrasto, aree di tocco e descrizioni;
- testa con scala caratteri al 200%;
- scrivi un breve riepilogo delle modifiche e dei risultati.

### Criteri di verifica

- [ ] I componenti personalizzati accettano `Modifier` e non leggono stato globale.
- [ ] Il layout custom gestisce correttamente vincoli e spaziature.
- [ ] Le animazioni su `Canvas` e `graphicsLayer` non ricompongono a ogni frame.
- [ ] I gesti consumano i cambiamenti quando serve e hanno chiavi corrette.
- [ ] I report del compilatore mostrano un miglioramento misurabile.
- [ ] Almeno tre componenti hanno test Compose.
- [ ] Icone e immagini hanno descrizioni corrette e aree di tocco adeguate.
- [ ] L'app resta usabile con font grande e TalkBack attivo.

Nel livello 6 guardi dentro Compose: runtime, slot table, compilatore, misurazione, profili di avvio e modularizzazione.
