# Livello 2: UI reale

Una schermata vera ha una barra superiore, contenuti scorrevoli, card, immagini da rete e qualche finestra di conferma. In questo livello monti questi pezzi insieme con Material 3.

### Material 3 e tema

Material 3 definisce colori, tipografia e forme in un unico oggetto: `MaterialTheme`. Non scegli colori a caso nei composable: leggi i ruoli del tema.

```kotlin
private val LightColors = lightColorScheme(
    primary = Color(0xFF00695C),
    onPrimary = Color.White,
    secondary = Color(0xFF4DB6AC),
    surface = Color(0xFFFAFAFA)
)

@Composable
fun ComposeCorsoTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) {
        darkColorScheme(
            primary = Color(0xFF80CBC4),
            onPrimary = Color(0xFF00332E),
            surface = Color(0xFF121212)
        )
    } else {
        LightColors
    }

    MaterialTheme(
        colorScheme = colors,
        typography = Typography(),
        content = content
    )
}
```

Ruoli di colore più usati:

| Ruolo | Uso tipico |
| --- | --- |
| `primary` | azione principale, FAB, pulsanti pieni |
| `onPrimary` | testo e icone sopra `primary` |
| `primaryContainer` | superfici evidenziate (card, top bar) |
| `surface` | sfondo delle card e delle schermate |
| `surfaceVariant` | campi, sfondi secondari |
| `error` | errori e azioni distruttive |
| `outline` | bordi e divisori |

La tipografia ha stili con nomi semantici: `displayLarge`, `headlineMedium`, `titleLarge`, `bodyMedium`, `labelSmall`. Usa questi invece di `fontSize` sparsi.

Su Android 12+ puoi abilitare i colori dinamici dell'utente:

```kotlin
val colors = when {
    dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
    darkTheme -> darkColorScheme()
    else -> LightColors
}
```

### Scaffold

`Scaffold` è lo scheletro della schermata: riserva gli spazi per barra superiore, barra inferiore, FAB e snackbar.

```kotlin
Scaffold(
    topBar = { TopAppBar(title = { Text("I miei film") }) },
    floatingActionButton = {
        FloatingActionButton(onClick = { /* azione */ }) {
            Icon(Icons.Default.Add, contentDescription = "Aggiungi")
        }
    },
    snackbarHost = { SnackbarHost(snackbarHostState) }
) { innerPadding ->
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = innerPadding,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // contenuto
    }
}
```

Il parametro `innerPadding` **non è opzionale**: se lo ignori, il contenuto finisce sotto la top bar. Passalo come `contentPadding` su una lista oppure come `Modifier.padding(innerPadding)` su una `Column`.

| Slot | Contenuto |
| --- | --- |
| `topBar` | `TopAppBar`, `CenterAlignedTopAppBar` |
| `bottomBar` | `NavigationBar`, barra con azioni |
| `floatingActionButton` | FAB |
| `snackbarHost` | messaggi temporanei |
| `content` | il corpo, con `innerPadding` |

### TopAppBar

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BarraTitolo() {
    TopAppBar(
        title = { Text("Rubrica") },
        navigationIcon = {
            IconButton(onClick = { }) {
                Icon(Icons.Default.Menu, contentDescription = "Menu")
            }
        },
        actions = {
            IconButton(onClick = { }) {
                Icon(Icons.Default.Search, contentDescription = "Cerca")
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
            titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
        )
    )
}
```

`TopAppBar` e `ModalBottomSheet` sono ancora API sperimentali: serve `@OptIn(ExperimentalMaterial3Api::class)`. Se dimentichi l'annotazione, la compilazione fallisce.

### FloatingActionButton e Snackbar

Lo snackbar è un messaggio temporaneo in fondo allo schermo. Si mostra da una coroutine, non da una lambda normale:

```kotlin
val snackbarHostState = remember { SnackbarHostState() }
val scope = rememberCoroutineScope()

Button(onClick = {
    scope.launch {
        snackbarHostState.showSnackbar("Elemento salvato")
    }
}) {
    Text("Salva")
}
```

Con un'azione l'utente può rispondere:

```kotlin
val esito = snackbarHostState.showSnackbar(
    message = "Elemento eliminato",
    actionLabel = "Annulla",
    withDismissAction = true
)

if (esito == SnackbarResult.ActionPerformed) {
    ripristinaElemento()
}
```

Servono gli import `androidx.compose.material3.SnackbarResult`, `rememberCoroutineScope` e `kotlinx.coroutines.launch`.

### LazyColumn

`Column` compone **tutti** i figli, anche quelli fuori schermo. `LazyColumn` compone solo gli elementi visibili: è la scelta giusta per le liste.

```kotlin
LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = PaddingValues(16.dp),
    verticalArrangement = Arrangement.spacedBy(8.dp)
) {
    items(
        items = film,
        key = { it.id },
        contentType = { "film" }
    ) { f ->
        CardFilm(f)
    }
}
```

- `key`: identifica univocamente l'elemento e conserva lo stato al riordino;
- `contentType`: aiuta il riuso dei nodi quando la lista mescola tipi diversi;
- `contentPadding`: padding esterno che scorre con la lista;
- `verticalArrangement`: spazio tra gli elementi.

Per una lista orizzontale si usa `LazyRow`, con le stesse regole.

```kotlin
LazyRow(
    horizontalArrangement = Arrangement.spacedBy(12.dp),
    contentPadding = PaddingValues(horizontal = 16.dp)
) {
    items(categorie, key = { it.id }) { categoria ->
        AssistChip(
            onClick = { },
            label = { Text(categoria.nome) }
        )
    }
}
```

Regola pratica: **mai** una `LazyColumn` dentro una `Column` con `verticalScroll`, né con `fillMaxSize` dentro un genitore scorrevole. I vincoli diventano infiniti e l'app va in crash.

### Card

```kotlin
Card(
    modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 16.dp)
        .clickable { apriDettaglio(film.id) }
) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(film.titolo, style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(4.dp))
        Text("${film.anno}", style = MaterialTheme.typography.bodyMedium)
    }
}
```

| Variante | Uso |
| --- | --- |
| `Card` | contenitore standard con elevazione |
| `ElevatedCard` | più stacco dal fondo |
| `OutlinedCard` | bordo invece di ombra |
| `CardDefaults.cardColors(...)` | colori personalizzati |

Per i contenitori usa `Card`; per le etichette compatte `AssistChip` o `SuggestionChip`.

### Icone

Le icone di base arrivano con Material 3. Per quelle estese aggiungi:

```kotlin
implementation("androidx.compose.material:material-icons-extended")
```

La versione la gestisce il BOM. Esempi:

| Icona | Import |
| --- | --- |
| `Icons.Default.Add` | `androidx.compose.material.icons.filled.Add` |
| `Icons.Default.Delete` | `androidx.compose.material.icons.filled.Delete` |
| `Icons.Default.Favorite` | `androidx.compose.material.icons.filled.Favorite` |
| `Icons.Default.Check` | `androidx.compose.material.icons.filled.Check` |
| `Icons.Default.Search` | `androidx.compose.material.icons.filled.Search` |
| `Icons.Default.Menu` | `androidx.compose.material.icons.filled.Menu` |

```kotlin
Icon(
    imageVector = Icons.Default.Favorite,
    contentDescription = "Preferito",
    tint = MaterialTheme.colorScheme.primary
)
```

`contentDescription` è obbligatorio per l'accessibilità: se l'icona è decorativa accanto a un testo, usa `null`.

### Immagini con Coil

Coil carica immagini da URL, file e risorse, in modo asincrono con cache. Dipendenze:

```kotlin
implementation("io.coil-kt.coil3:coil-compose:3.0.4")
implementation("io.coil-kt.coil3:coil-network-okhttp:3.0.4")
```

Nel manifest serve il permesso di rete:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

```kotlin
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(film.poster)
        .crossfade(true)
        .build(),
    contentDescription = "Locandina di ${film.titolo}",
    contentScale = ContentScale.Crop,
    modifier = Modifier
        .width(96.dp)
        .aspectRatio(2f / 3f)
        .clip(RoundedCornerShape(8.dp))
)
```

Import: `coil3.compose.AsyncImage`, `coil3.request.ImageRequest`, `coil3.request.crossfade`.

Per un'immagine locale usa `painterResource(R.drawable.nome)`, che è sincrono. Con Coil puoi aggiungere un segnaposto mentre carica:

```kotlin
AsyncImage(
    model = url,
    contentDescription = null,
    placeholder = ColorPainter(MaterialTheme.colorScheme.surfaceVariant)
)
```

Senza permesso `INTERNET` l'immagine non carica e nel log compare una `SecurityException`.

### Dialog

```kotlin
var mostraDialog by remember { mutableStateOf(false) }

if (mostraDialog) {
    AlertDialog(
        onDismissRequest = { mostraDialog = false },
        title = { Text("Eliminare l'elemento?") },
        text = { Text("L'operazione non si può annullare.") },
        confirmButton = {
            TextButton(onClick = {
                eliminaElemento()
                mostraDialog = false
            }) { Text("Elimina") }
        },
        dismissButton = {
            TextButton(onClick = { mostraDialog = false }) { Text("Annulla") }
        }
    )
}
```

Il dialog compare solo se lo stato è `true`: è un normale `if`, non un comando imperativo.

### Bottom sheet

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FiltriSheet(chiudi: () -> Unit) {
    ModalBottomSheet(
        onDismissRequest = chiudi,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Filtri", style = MaterialTheme.typography.titleLarge)
            Text("Scegli un ordinamento", style = MaterialTheme.typography.bodyMedium)
            Button(onClick = chiudi, modifier = Modifier.fillMaxWidth()) {
                Text("Applica")
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
```

Il bottom sheet si apre con un booleano come il dialog:

```kotlin
if (mostraFiltri) {
    FiltriSheet(chiudi = { mostraFiltri = false })
}
```

### Esempio completo: lista film

```kotlin
data class Film(
    val id: Int,
    val titolo: String,
    val anno: Int,
    val poster: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SchermataFilm(film: List<Film>) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("I miei film") },
                actions = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.Search, contentDescription = "Cerca")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = {
                scope.launch {
                    snackbarHostState.showSnackbar("Aggiunta non disponibile")
                }
            }) {
                Icon(Icons.Default.Add, contentDescription = "Aggiungi")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { innerPadding ->
        if (film.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Text("Nessun film salvato", style = MaterialTheme.typography.bodyLarge)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = innerPadding,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(film, key = { it.id }) { f ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            AsyncImage(
                                model = f.poster,
                                contentDescription = "Locandina di ${f.titolo}",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .width(72.dp)
                                    .aspectRatio(2f / 3f)
                                    .clip(RoundedCornerShape(6.dp))
                            )

                            Column(modifier = Modifier.weight(1f)) {
                                Text(f.titolo, style = MaterialTheme.typography.titleMedium)
                                Text(
                                    text = "${f.anno}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
```

Nota `Modifier.weight(1f)` sulla `Column`: dentro una `Row` la colonna di testo occupa lo spazio rimasto dopo l'immagine.

### Errori comuni

- **Ignorare `innerPadding`.** Il contenuto finisce sotto la top bar.
- **`LazyColumn` dentro `Column` con `verticalScroll`.** Vincoli infiniti e crash.
- **`items` senza `key`.** Lo stato degli elementi si mescola dopo un riordino.
- **Stato con `mutableListOf` invece di `mutableStateListOf`.** La UI non si aggiorna.
- **Snackbar senza coroutine.** `showSnackbar` è una funzione `suspend`.
- **Dimenticare `@OptIn(ExperimentalMaterial3Api::class)`.** `TopAppBar` e `ModalBottomSheet` non compilano.
- **Immagine senza permesso `INTERNET`.** Resta vuota e nel log appare una `SecurityException`.
- **Icona senza `contentDescription`.** TalkBack non sa cosa annunciare.
- **Dialog che resta aperto.** Non dimenticare di riportare lo stato a `false` in `onDismissRequest` e nei pulsanti.
- **Colori hardcoded nel tema scuro.** Leggi `MaterialTheme.colorScheme` invece di usare `Color.White` o `Color.Black`.

## Esercizi progressivi

**Esercizio 1.** Personalizza il tema con due colori `primary` diversi per tema chiaro e scuro; verifica con due `@Preview` (`uiMode = UI_MODE_NIGHT_YES`).

**Esercizio 2.** Crea una `Scaffold` con `TopAppBar` e un corpo centrato; controlla che il testo non finisca sotto la barra.

**Esercizio 3.** Aggiungi alla schermata precedente un FAB che mostra uno snackbar "Azione eseguita".

**Esercizio 4.** Mostra uno snackbar con azione "Annulla" e stampa nel log quale scelta ha fatto l'utente.

**Esercizio 5.** Crea una `LazyColumn` con 30 righe numerate; aggiungi `key` e `contentPadding`.

**Esercizio 6.** Sostituisci le righe con card che contengono titolo e sottotitolo.

**Esercizio 7.** Aggiungi sopra la lista una `LazyRow` di categorie con `AssistChip`.

**Esercizio 8.** Crea una card film con poster caricato da URL, titolo e anno; aggiungi il permesso `INTERNET`.

**Esercizio 9.** Metti un pulsante elimina su ogni card che apre un `AlertDialog` di conferma; elimina solo se confermi.

**Esercizio 10.** Aggiungi un bottom sheet con due opzioni di ordinamento (titolo, anno) che aggiornano la lista.

**Esercizio 11.** Aggiungi un `OutlinedTextField` di ricerca nella top bar e filtra la lista in base al testo.

**Esercizio 12.** Gestisci la lista vuota con un messaggio centrato e un'icona.

**Esercizio 13.** Aggiungi alla `TopAppBar` un'icona preferiti che cambia colore quando attiva.

**Esercizio 14.** Combina tutto: lista, ricerca, FAB, dialog di eliminazione, snackbar con "Annulla" che ripristina l'elemento.

### Varianti

- Nella lista film, mostra un segnaposto colorato mentre l'immagine carica.
- Nel bottom sheet, aggiungi uno stato selezionato visibile con un'icona di spunta.
- Nella ricerca, ignora maiuscole e minuscole con `contains(testo, ignoreCase = true)`.
- Nella top bar, passa a `CenterAlignedTopAppBar` e confronta il risultato.
- Aggiungi una `LazyRow` di "visti di recente" sopra la lista principale.

## Progetti del livello 2

### Progetto 1: Lista to-do

Requisiti:

- `Scaffold` con titolo e FAB per aggiungere un'attività;
- dialog con un campo di testo per il titolo della nuova attività;
- `LazyColumn` con card per ogni attività;
- checkbox o icona per segnare come completata, con testo barrato;
- eliminazione con dialog di conferma e snackbar con "Annulla";
- contatore "3 di 8 completate" nella top bar o sotto di essa;
- stato vuoto con messaggio e icona.

### Progetto 2: Lista film finta

Requisiti:

- modello `Film` con id, titolo, anno, voto e URL del poster;
- almeno dieci film hardcoded;
- card con poster rotondo o rettangolare, titolo, anno e voto con icona stella;
- ricerca per titolo con filtro in tempo reale;
- ordinamento per titolo o per anno dal bottom sheet;
- FAB che mostra uno snackbar "Aggiunta non disponibile";
- gestione del caricamento immagini e della lista vuota.

### Progetto 3: App profilo con tab

Requisiti:

- intestazione con avatar, nome e descrizione;
- `TabRow` con tre tab: "Post", "Foto", "Info";
- ogni tab mostra un contenuto diverso: lista post, griglia di immagini, tabella di dettagli;
- il tab selezionato si evidenzia con il colore del tema;
- pulsante `Segui` nel profilo che cambia testo e colore;
- contenuti in `LazyColumn`, con `key` sugli elementi;
- nessun contenuto sotto la top bar.

### Progetto 4: App meteo finta con card

Requisiti:

- `Scaffold` con titolo della città e icona di ricerca;
- card principale con temperatura grande, condizioni e città;
- `LazyRow` con previsioni orarie (ora, icona, temperatura);
- `LazyColumn` con cinque giorni di previsioni in card;
- colori coerenti per pioggia, sole e nuvoloso letti dal tema;
- bottom sheet per cambiare città da un elenco fisso;
- anteprime per tema chiaro e scuro.

### Criteri di verifica

- [ ] Ogni schermata usa `Scaffold` e rispetta `innerPadding`.
- [ ] Le liste usano `LazyColumn` o `LazyRow`, mai `Column` con molti elementi.
- [ ] Gli elementi delle liste hanno una `key` stabile.
- [ ] Dialog e bottom sheet sono controllati da stato con `remember`.
- [ ] Le immagini da rete hanno permesso, `contentDescription` e gestione dell'errore.
- [ ] Colori e tipografia vengono dal tema, non da valori sparsi.
- [ ] Lo snackbar è mostrato da una coroutine con `rememberCoroutineScope`.
- [ ] L'app non va in crash su lista vuota o immagine mancante.

Nel livello 3 lo stato esce dai composable: `ViewModel`, `StateFlow` e stati di caricamento, errore e successo.
