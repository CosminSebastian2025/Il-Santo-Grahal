# Livello 4: animazioni, navigazione e componenti avanzati

Le app reali hanno più schermate, transizioni e liste che si aggiornano. In questo livello impari a spostarti tra schermate, a conservare lo stato dopo la rotazione, ad animare i cambiamenti e a caricare dati in modo paginato.

### Navigation Compose

Dipendenza:

```kotlin
implementation("androidx.navigation:navigation-compose:2.8.5")
```

Il controller si crea una volta, fuori dal `NavHost`:

```kotlin
@Composable
fun App() {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = "lista") {
        composable("lista") {
            SchermataLista(
                onApri = { id -> nav.navigate("dettaglio/$id") }
            )
        }

        composable(
            route = "dettaglio/{filmId}",
            arguments = listOf(navArgument("filmId") { type = NavType.IntType })
        ) { entry ->
            val id = entry.arguments?.getInt("filmId") ?: 0
            SchermataDettaglio(
                filmId = id,
                onIndietro = { nav.popBackStack() }
            )
        }
    }
}
```

- `startDestination` è la prima schermata;
- ogni `composable` è una destinazione con una route;
- gli argomenti si dichiarano in `arguments` e si leggono da `entry.arguments`;
- `popBackStack()` torna indietro;
- la schermata riceve lambda, non il `NavController`: resta riusabile e testabile.

Per evitare duplicati nella pila:

```kotlin
nav.navigate("lista") {
    popUpTo("lista") { inclusive = true }
    launchSingleTop = true
}
```

### Route tipizzate

Le stringhe con `"/"` sono fragili. Con kotlinx.serialization puoi usare oggetti e data class come route:

```kotlin
@Serializable
data object Lista

@Serializable
data class Dettaglio(val filmId: Int)
```

```kotlin
NavHost(navController = nav, startDestination = Lista) {
    composable<Lista> {
        SchermataLista(onApri = { id -> nav.navigate(Dettaglio(id)) })
    }

    composable<Dettaglio> { entry ->
        val dati = entry.toRoute<Dettaglio>()
        SchermataDettaglio(filmId = dati.filmId)
    }
}
```

Servono il plugin `org.jetbrains.kotlin.plugin.serialization` e la dipendenza `kotlinx-serialization-json`. I vantaggi: il compilatore controlla i tipi degli argomenti e il refactoring rinomina le route.

### Tab e barra di navigazione

```kotlin
val voceSelezionata = nav.currentBackStackEntryAsState().value?.destination?.route

NavigationBar {
    NavigationBarItem(
        selected = voceSelezionata == "home",
        onClick = { nav.navigate("home") { launchSingleTop = true } },
        icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
        label = { Text("Home") }
    )
    NavigationBarItem(
        selected = voceSelezionata == "profilo",
        onClick = { nav.navigate("profilo") { launchSingleTop = true } },
        icon = { Icon(Icons.Default.Settings, contentDescription = "Profilo") },
        label = { Text("Profilo") }
    )
}
```

`launchSingleTop = true` evita di impilare la stessa destinazione più volte.

### rememberSaveable e rotazione

`remember` sopravvive alla ricomposizione ma **non** alla rotazione. `rememberSaveable` salva il valore in un `Bundle` e lo ripristina:

```kotlin
var testo by rememberSaveable { mutableStateOf("") }
var selezione by rememberSaveable { mutableIntStateOf(0) }
var espanso by rememberSaveable { mutableStateOf(false) }
```

Funziona con tipi primitivi, `String`, `Parcelable` e `Serializable`. Per oggetti tuoi serve un `Saver`:

```kotlin
data class Filtro(val testo: String, val soloPreferiti: Boolean)

val FiltroSaver = Saver<Filtro, String>(
    save = { "${it.testo}|${it.soloPreferiti}" },
    restore = { salvato ->
        val (testo, preferiti) = salvato.split("|", limit = 2)
        Filtro(testo, preferiti.toBoolean())
    }
)

var filtro by rememberSaveable(stateSaver = FiltroSaver) {
    mutableStateOf(Filtro("", false))
}
```

Nel `ViewModel` lo stato non ha bisogno di `rememberSaveable`: sopravvive già alla rotazione. Per sopravvivere anche alla morte del processo serve `SavedStateHandle`.

### AnimatedVisibility

```kotlin
var espanso by rememberSaveable { mutableStateOf(false) }

Card(
    modifier = Modifier
        .fillMaxWidth()
        .clickable { espanso = !espanso }
        .animateContentSize()
) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(film.titolo, style = MaterialTheme.typography.titleMedium)

        AnimatedVisibility(visible = espanso) {
            Text(
                text = film.trama,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}
```

`animateContentSize()` fa crescere la card in modo fluido quando il contenuto appare. Le transizioni predefinite:

```kotlin
AnimatedVisibility(
    visible = visibile,
    enter = slideInVertically() + fadeIn(),
    exit = shrinkVertically() + fadeOut()
) {
    Text("Contenuto")
}
```

### animateColorAsState e animateFloatAsState

```kotlin
val colore by animateColorAsState(
    targetValue = if (preferito) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
    animationSpec = tween(durationMillis = 300),
    label = "colorePreferito"
)

IconButton(onClick = { preferito = !preferito }) {
    Icon(
        imageVector = Icons.Default.Favorite,
        contentDescription = if (preferito) "Rimuovi dai preferiti" else "Aggiungi ai preferiti",
        tint = colore
    )
}
```

Con `animateFloatAsState` puoi animare scala, alpha o rotazione. Il parametro `label` è facoltativo ma utile negli strumenti di debug.

| API | Uso |
| --- | --- |
| `animateColorAsState` | colore |
| `animateFloatAsState` | scala, alpha, rotazione |
| `animateDpAsState` | dimensioni e spaziature |
| `animateContentSize` | altezza automatica del contenitore |
| `AnimatedVisibility` | comparsa e scomparsa |
| `AnimatedContent` | cambio di contenuto |
| `Crossfade` | dissolvenza tra due contenuti |
| `updateTransition` | più proprietà animate insieme |

### updateTransition

```kotlin
var attivo by remember { mutableStateOf(false) }
val transizione = updateTransition(targetState = attivo, label = "card")

val scala by transizione.animateFloat(
    transitionSpec = { spring(dampingRatio = Spring.DampingRatioMediumBouncy) },
    label = "scala"
) { stato -> if (stato) 1.1f else 1f }

Card(
    modifier = Modifier
        .graphicsLayer { scaleX = scala; scaleY = scala }
        .clickable { attivo = !attivo }
) {
    Text("Tocca per ingrandire", modifier = Modifier.padding(16.dp))
}
```

`updateTransition` anima più proprietà con la stessa timeline, così restano sincronizzate.

### AnimatedContent

```kotlin
AnimatedContent(
    targetState = stato,
    transitionSpec = {
        (fadeIn() + slideInVertically { it / 4 }) togetherWith fadeOut()
    },
    label = "statoSchermata"
) { s ->
    when (s) {
        FilmUiState.Caricamento -> CircularProgressIndicator()
        is FilmUiState.Errore -> Text(s.messaggio)
        is FilmUiState.Successo -> ListaFilm(s.film)
    }
}
```

`togetherWith` combina entrata e uscita. `AnimatedContent` è la scelta giusta per passare tra caricamento, errore e successo senza scatti.

### Pull to refresh

Material 3 offre `PullToRefreshBox`:

```kotlin
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ListaConRefresh(
    isRefreshing: Boolean,
    onRefresh: () -> Unit,
    contenuto: @Composable () -> Unit
) {
    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize()
    ) {
        contenuto()
    }
}
```

Nel ViewModel:

```kotlin
private val _aggiornamento = MutableStateFlow(false)
val aggiornamento: StateFlow<Boolean> = _aggiornamento.asStateFlow()

fun aggiorna() {
    viewModelScope.launch {
        _aggiornamento.value = true
        try {
            ricarica()
        } finally {
            _aggiornamento.value = false
        }
    }
}
```

### Paging 3

Per liste lunghe caricate a blocchi, Paging gestisce pagine, chiavi e stato di caricamento. Dipendenza:

```kotlin
implementation("androidx.paging:paging-compose:3.3.5")
```

Sorgente paginata:

```kotlin
class FilmPagingSource(private val api: FilmApi) : PagingSource<Int, Film>() {

    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, Film> {
        val pagina = params.key ?: 1
        return try {
            val risultati = api.getFilm(pagina, params.loadSize)
            LoadResult.Page(
                data = risultati,
                prevKey = if (pagina == 1) null else pagina - 1,
                nextKey = if (risultati.isEmpty()) null else pagina + 1
            )
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, Film>): Int? =
        state.anchorPosition?.let { posizione ->
            val pagina = state.closestPageToPosition(posizione)
            pagina?.prevKey?.plus(1) ?: pagina?.nextKey?.minus(1)
        }
}
```

ViewModel:

```kotlin
class FilmViewModel(private val api: FilmApi) : ViewModel() {
    val film = Pager(PagingConfig(pageSize = 20)) {
        FilmPagingSource(api)
    }.flow.cachedIn(viewModelScope)
}
```

UI:

```kotlin
@Composable
fun ListaPaginata(viewModel: FilmViewModel = viewModel()) {
    val elementi = viewModel.film.collectAsLazyPagingItems()

    when (elementi.loadState.refresh) {
        is LoadState.Loading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator() }
        }

        is LoadState.Error -> {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("Caricamento non riuscito")
                Button(onClick = { elementi.retry() }) { Text("Riprova") }
            }
        }

        else -> {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(
                    count = elementi.itemCount,
                    key = elementi.itemKey { it.id }
                ) { indice ->
                    val film = elementi[indice]
                    if (film != null) {
                        CardFilm(film)
                    }
                }

                when (elementi.loadState.append) {
                    is LoadState.Loading -> item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) { CircularProgressIndicator() }
                    }

                    is LoadState.Error -> item {
                        TextButton(onClick = { elementi.retry() }) {
                            Text("Riprova a caricare")
                        }
                    }

                    else -> Unit
                }
            }
        }
    }
}
```

`collectAsLazyPagingItems` restituisce un oggetto osservabile: `elementi[indice]` può essere `null` mentre la pagina arriva.

### LazyColumn avanzata

```kotlin
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ListaPerAnno(film: List<Film>) {
    val gruppi = film.groupBy { it.anno }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        gruppi.forEach { (anno, gruppo) ->
            stickyHeader(key = "anno-$anno") {
                Text(
                    text = "$anno",
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(8.dp),
                    style = MaterialTheme.typography.titleSmall
                )
            }

            items(gruppo, key = { it.id }) { f ->
                Card(modifier = Modifier.fillMaxWidth().animateItem()) {
                    Text(f.titolo, modifier = Modifier.padding(16.dp))
                }
            }
        }
    }
}
```

- `stickyHeader` mantiene l'intestazione in cima;
- `animateItem()` anima inserimenti, rimozioni e spostamenti;
- `itemsIndexed` serve quando hai bisogno dell'indice;
- `contentType` aiuta il riuso quando la lista mescola tipi diversi.

Per conservare la posizione di scorrimento usa `rememberLazyListState()`. Se lo stato è nel ViewModel, sopravvive alla navigazione; altrimenti serve `rememberSaveable`.

### Snackbar con undo

```kotlin
val esito = snackbarHostState.showSnackbar(
    message = "Film eliminato",
    actionLabel = "Annulla"
)

if (esito == SnackbarResult.ActionPerformed) {
    viewModel.ripristinaUltimo()
}
```

La combinazione "azione + conferma" è uno standard: elimina subito e offri il ripristino per pochi secondi, invece di chiedere conferma prima.

### Deep link

Un deep link apre una destinazione da fuori l'app, per esempio da un browser o una notifica.

```kotlin
composable<Dettaglio>(
    deepLinks = listOf(
        navDeepLink { uriPattern = "app://dettaglio/{filmId}" }
    )
) { entry ->
    val dati = entry.toRoute<Dettaglio>()
    SchermataDettaglio(dati.filmId)
}
```

Nel manifest dell'Activity:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="app" android:host="dettaglio" />
</intent-filter>
```

Prova da terminale:

```bash
adb shell am start -a android.intent.action.VIEW -d "app://dettaglio/7"
```

### Esempio completo: lista e dettaglio

```kotlin
@Serializable
data object Lista

@Serializable
data class Dettaglio(val filmId: Int)

@Composable
fun App(film: List<Film>) {
    val nav = rememberNavController()
    var preferiti by rememberSaveable(
        stateSaver = listSaver<Set<Int>, Int>(
            save = { it.toList() },
            restore = { it.toSet() }
        )
    ) { mutableStateOf(emptySet()) }

    NavHost(navController = nav, startDestination = Lista) {
        composable<Lista> {
            LazyColumn(contentPadding = PaddingValues(16.dp)) {
                items(film, key = { it.id }) { f ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable { nav.navigate(Dettaglio(f.id)) }
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(f.titolo, modifier = Modifier.weight(1f))
                            val colore by animateColorAsState(
                                targetValue = if (f.id in preferiti) {
                                    MaterialTheme.colorScheme.error
                                } else {
                                    MaterialTheme.colorScheme.onSurfaceVariant
                                },
                                label = "preferito"
                            )
                            Icon(
                                imageVector = Icons.Default.Favorite,
                                contentDescription = null,
                                tint = colore
                            )
                        }
                    }
                }
            }
        }

        composable<Dettaglio> { entry ->
            val dati = entry.toRoute<Dettaglio>()
            val f = film.first { it.id == dati.filmId }

            var espanso by rememberSaveable { mutableStateOf(false) }

            Column(modifier = Modifier.padding(24.dp)) {
                Text(f.titolo, style = MaterialTheme.typography.headlineMedium)
                Spacer(modifier = Modifier.height(8.dp))

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { espanso = !espanso }
                        .animateContentSize()
                ) {
                    Text(
                        text = if (espanso) f.trama else "Tocca per leggere la trama",
                        modifier = Modifier.padding(16.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(onClick = { nav.popBackStack() }) {
                    Text("Indietro")
                }
            }
        }
    }
}
```

### Errori comuni

- **`rememberNavController()` dentro il `NavHost`.** Va creato prima e passato.
- **Navigare durante la composizione.** `nav.navigate` va chiamato da un evento, non dal corpo di un composable.
- **Passare il `NavController` alle schermate.** Rende il codice accoppiato: passa lambda come `onApri` e `onIndietro`.
- **Dimenticare gli argomenti nella route.** `entry.arguments` risulta vuoto e l'id è zero.
- **Route tipizzate senza plugin serialization.** La compilazione fallisce.
- **`remember` per i campi del form.** Dopo la rotazione il form si svuota: usa `rememberSaveable`.
- **Saver che perde dati.** Salva tutti i campi dell'oggetto, non solo alcuni.
- **Animare un valore letto direttamente nel composable.** L'animazione riparte a ogni ricomposizione: leggi lo stato animato con `by`.
- **Paging chiamato fuori da un composable.** `collectAsLazyPagingItems` è un composable.
- **Deep link dimenticato nel manifest.** L'URI apre l'app ma non arriva alla destinazione.

## Esercizi progressivi

**Esercizio 1.** Crea due schermate con `NavHost`, un pulsante che naviga alla seconda e un pulsante che torna indietro.

**Esercizio 2.** Passa un id come argomento di route e mostra il valore nella seconda schermata.

**Esercizio 3.** Converti le route in oggetti tipizzati con `@Serializable` e `toRoute`.

**Esercizio 4.** Aggiungi una `NavigationBar` con due tab e mantieni un solo elemento per destinazione con `launchSingleTop`.

**Esercizio 5.** Metti un campo di testo in una schermata e verifica che il valore resti dopo la rotazione con `rememberSaveable`.

**Esercizio 6.** Scrivi un `Saver` per un oggetto `Filtro(testo, soloPreferiti)`.

**Esercizio 7.** Crea una card espandibile con `AnimatedVisibility` e `animateContentSize`.

**Esercizio 8.** Anima il colore di un cuore tra due stati con `animateColorAsState`.

**Esercizio 9.** Anima la scala di una card con `graphicsLayer` e `animateFloatAsState`.

**Esercizio 10.** Usa `AnimatedContent` per passare tra caricamento, errore e successo.

**Esercizio 11.** Sincronizza scala e alpha con `updateTransition`.

**Esercizio 12.** Aggiungi pull-to-refresh a una lista e un ritardo simulato di 1 secondo.

**Esercizio 13.** Implementa una `PagingSource` finta che restituisce 5 pagine da 20 elementi e mostra lo spinner in fondo.

**Esercizio 14.** Raggruppa una lista per anno con `stickyHeader` e anima gli inserimenti con `animateItem`.

**Esercizio 15.** Dopo l'eliminazione mostra uno snackbar con "Annulla"; verifica anche il deep link con `adb shell am start`.

### Varianti

- Sostituisci `AnimatedContent` con `Crossfade` e confronta la sensazione.
- Nel cuore preferiti usa `spring(dampingRatio = Spring.DampingRatioMediumBouncy)`.
- Nel dettaglio, salva la posizione di scorrimento e verifica che torni al punto giusto.
- Apri un deep link verso un film specifico da una notifica.
- Nella lista paginata, mostra un messaggio quando non ci sono risultati.

## Progetti del livello 4

### Progetto 1: App multi-schermata

Requisiti:

- tre destinazioni: home, lista, dettaglio;
- bottom navigation con due tab e stato selezionato visibile;
- route tipizzate con `@Serializable`;
- dettaglio che riceve un id e lo mostra;
- `popBackStack` corretto e nessun duplicato nella pila;
- schermata impostazioni con stato salvato dopo la rotazione;
- nessuna schermata che riceve il `NavController`.

### Progetto 2: Lista e dettaglio con preferiti

Requisiti:

- lista film con card e navigazione al dettaglio;
- cuore preferiti animato con `animateColorAsState`;
- preferiti mantenuti con `rememberSaveable` o nel ViewModel;
- card del dettaglio espandibile con `AnimatedVisibility`;
- snackbar con "Annulla" dopo la rimozione di un preferito;
- ritorno alla lista con la posizione di scorrimento conservata.

### Progetto 3: App animata

Requisiti:

- almeno tre schermate collegate con transizioni;
- `AnimatedContent` tra due modalità (per esempio "cronometro" e "conto alla rovescia");
- animazione di comparsa delle card con ritardo progressivo;
- `updateTransition` per animare colore e scala insieme;
- stato di avanzamento persistente dopo la rotazione;
- nessuna animazione che blocca l'interazione.

### Progetto 4: Dati da internet con stati completi

Requisiti:

- repository con pagine simulate e ritardo;
- `UiState` con caricamento, errore, successo;
- pull-to-refresh con indicatore;
- Paging 3 con spinner a fine lista e retry sull'errore;
- ricerca che resetta la paginazione;
- snackbar per errori e conferme;
- deep link che apre il dettaglio di un elemento.

### Criteri di verifica

- [ ] Il `NavController` è creato una sola volta e non è passato alle schermate.
- [ ] Gli argomenti di navigazione sono tipizzati o validati.
- [ ] Lo stato dei form sopravvive alla rotazione con `rememberSaveable` o `ViewModel`.
- [ ] Le animazioni hanno durata breve e non bloccano i click.
- [ ] Ogni stato di caricamento ha un errore visibile e un retry funzionante.
- [ ] La paginazione gestisce refresh, append e fine lista.
- [ ] Gli snackbar con "Annulla" modificano davvero lo stato.
- [ ] Il deep link apre la destinazione corretta.

Nel livello 5 scendi nel profondo: layout personalizzati, disegno su Canvas, gesti, stabilità e test della UI.
