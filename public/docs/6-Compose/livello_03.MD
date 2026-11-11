# Livello 3: stato serio e architettura

Nel livello 2 lo stato viveva nei composable. Ora lo sposti fuori: il `ViewModel` conserva lo stato, espone un flusso osservabile e sopravvive alla rotazione. La UI diventa una funzione dello stato.

### State hoisting

Lo stato si solleva verso il chiamante; gli eventi scendono con le lambda.

```kotlin
@Composable
fun CampoNome(valore: String, onValoreChange: (String) -> Unit) {
    OutlinedTextField(
        value = valore,
        onValueChange = onValoreChange,
        label = { Text("Nome") },
        singleLine = true
    )
}

@Composable
fun FormNome() {
    var nome by rememberSaveable { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp)) {
        CampoNome(nome) { nome = it }
        Text("Ciao, $nome")
    }
}
```

`CampoNome` è **stateless**: non ricorda nulla, riceve il valore e notifica il cambiamento. `FormNome` è **stateful**: possiede lo stato. Il vantaggio è che `CampoNome` si riusa, si testa e si visualizza in anteprima con qualsiasi valore.

Regola: quando due composable devono condividere uno stato, sollegalo al primo genitore comune. Quando lo stato diventa logica di business o deve sopravvivere alla rotazione, portalo in un `ViewModel`.

### Perché un ViewModel

Un `ViewModel`:

- sopravvive ai cambi di configurazione (rotazione, tema, lingua);
- conserva lo stato mentre l'Activity viene ricreata;
- tiene la logica fuori dalla UI, quindi è testabile;
- non ha riferimenti all'Activity: se ne ha uno, è un memory leak.

Dipendenze:

```kotlin
implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
```

### ViewModel e StateFlow

```kotlin
class ContatoreViewModel : ViewModel() {
    private val _conteggio = MutableStateFlow(0)
    val conteggio: StateFlow<Int> = _conteggio.asStateFlow()

    fun incrementa() {
        _conteggio.update { valore -> valore + 1 }
    }

    fun azzera() {
        _conteggio.value = 0
    }
}
```

- `_conteggio` è privato: solo il ViewModel scrive.
- `conteggio` è pubblico e in sola lettura: la UI osserva.
- `MutableStateFlow` richiede un valore iniziale, obbligatorio.
- `update` calcola il nuovo valore in modo atomico.

Nella UI:

```kotlin
@Composable
fun SchermataContatore(viewModel: ContatoreViewModel = viewModel()) {
    val conteggio by viewModel.conteggio.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("$conteggio", style = MaterialTheme.typography.displayMedium)
        Button(onClick = viewModel::incrementa) { Text("+") }
        TextButton(onClick = viewModel::azzera) { Text("Azzera") }
    }
}
```

Import essenziali:

```kotlin
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
```

`viewModel()` crea il ViewModel la prima volta e restituisce la stessa istanza dopo la rotazione. `collectAsStateWithLifecycle()` raccoglie il flusso solo quando la UI è visibile: in background smette, risparmiando batteria.

| Metodo | Comportamento |
| --- | --- |
| `collectAsState()` | raccoglie sempre, anche in background |
| `collectAsStateWithLifecycle()` | raccoglie solo tra `STARTED` e `STOPPED` |
| `viewModel()` | scope legato alla schermata, sopravvive alla rotazione |
| `remember { ContatoreViewModel() }` | nuova istanza a ogni rotazione: sbagliato |

### UiState

Una schermata con dati da rete ha almeno tre stati. Un `sealed interface` li rende espliciti e obbliga a gestirli tutti:

```kotlin
sealed interface FilmUiState {
    data object Caricamento : FilmUiState
    data class Successo(val film: List<Film>) : FilmUiState
    data class Errore(val messaggio: String) : FilmUiState
}
```

Con `when` il compilatore segnala se dimentichi un caso. Non usare tre booleani `isLoading`, `isError`, `hasData`: permettono combinazioni impossibili.

### Repository e coroutine

Il ViewModel non parla direttamente con la rete: delega a un repository. Per ora simuliamo la rete con `delay`.

```kotlin
class FilmRepository {
    suspend fun caricaFilm(): List<Film> {
        delay(1200)
        if (Random.nextInt(10) == 0) {
            throw IllegalStateException("Connessione assente")
        }
        return filmFinti
    }
}
```

Il ViewModel lancia il lavoro in `viewModelScope`, che viene cancellato quando il ViewModel muore:

```kotlin
class FilmViewModel(
    private val repository: FilmRepository = FilmRepository()
) : ViewModel() {

    private val _stato = MutableStateFlow<FilmUiState>(FilmUiState.Caricamento)
    val stato: StateFlow<FilmUiState> = _stato.asStateFlow()

    init {
        carica()
    }

    fun carica() {
        viewModelScope.launch {
            _stato.value = FilmUiState.Caricamento
            _stato.value = try {
                FilmUiState.Successo(repository.caricaFilm())
            } catch (e: Exception) {
                FilmUiState.Errore(e.message ?: "Errore sconosciuto")
            }
        }
    }
}
```

`viewModelScope` usa il dispatcher principale: puoi aggiornare lo stato senza `withContext`; il lavoro bloccante va spostato con `withContext(Dispatchers.IO)` dentro il repository.

### Eventi contro stato

Lo stato descrive **cosa si vede**. Gli eventi sono azioni una tantum: uno snackbar, una navigazione, un ritorno indietro.

| Cosa | Dove vive |
| --- | --- |
| testo del campo | stato nel ViewModel |
| lista caricata | stato nel ViewModel |
| messaggio "Eliminato" | evento una tantum |
| navigazione al dettaglio | evento, oppure callback della UI |

Se metti lo snackbar nello stato, dopo una rotazione ricompare. Per gli eventi una tantum si usa un `Channel`:

```kotlin
private val _eventi = Channel<String>(Channel.BUFFERED)
val eventi = _eventi.receiveAsFlow()

fun elimina(id: Int) {
    _eventi.trySend("Elemento eliminato")
}
```

La UI li raccoglie con `LaunchedEffect`:

```kotlin
LaunchedEffect(Unit) {
    viewModel.eventi.collect { messaggio ->
        snackbarHostState.showSnackbar(messaggio)
    }
}
```

Per le azioni normali preferisci comunque i callback: `onRiprova`, `onElimina`, `onSalva`, che chiamano metodi del ViewModel.

### LaunchedEffect

`LaunchedEffect` esegue una coroutine legata alla composizione. La chiave decide quando ripartire:

```kotlin
LaunchedEffect(Unit) {
    viewModel.carica()
}

LaunchedEffect(citta) {
    viewModel.cambiaCitta(citta)
}
```

- `Unit`: una sola esecuzione all'ingresso nella composizione;
- `citta`: rilancia il blocco quando la città cambia;
- uscire dalla composizione cancella la coroutine.

Non usarlo per copiare stato in altro stato: se un valore si calcola da un altro, usa `derivedStateOf` o calcolalo nel ViewModel.

### DisposableEffect

`DisposableEffect` registra una risorsa e la rilascia in `onDispose`. Serve per listener, observer e callback da rimuovere:

```kotlin
@Composable
fun SalvaBozzaAllUscita(viewModel: FormViewModel) {
    val owner = LocalLifecycleOwner.current

    DisposableEffect(owner) {
        val osservatore = LifecycleEventObserver { _, evento ->
            if (evento == Lifecycle.Event.ON_STOP) {
                viewModel.salvaBozza()
            }
        }

        owner.lifecycle.addObserver(osservatore)

        onDispose {
            owner.lifecycle.removeObserver(osservatore)
        }
    }
}
```

Se dimentichi `removeObserver`, l'osservatore resta attaccato al ciclo di vita e può trattenere oggetti in memoria.

`LaunchedEffect` e `DisposableEffect` non possono essere chiamati dentro un `if` condizionale che cambia tra una ricomposizione e l'altra: i composable con effetti si dichiarano sempre allo stesso punto.

### Rendere i tre stati

```kotlin
@Composable
fun SchermataFilm(viewModel: FilmViewModel = viewModel()) {
    val stato by viewModel.stato.collectAsStateWithLifecycle()

    when (val s = stato) {
        FilmUiState.Caricamento -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }

        is FilmUiState.Errore -> {
            Column(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(s.messaggio, style = MaterialTheme.typography.bodyLarge)
                Spacer(modifier = Modifier.height(12.dp))
                Button(onClick = viewModel::carica) { Text("Riprova") }
            }
        }

        is FilmUiState.Successo -> {
            if (s.film.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text("Nessun film")
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(s.film, key = { it.id }) { film ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = film.titolo,
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
```

Ogni stato ha una UI dedicata: l'utente non vede mai una schermata vuota senza spiegazione.

### Esempio completo: lista con ViewModel

```kotlin
data class Attivita(
    val id: Int,
    val titolo: String,
    val completata: Boolean = false
)

sealed interface AttivitaUiState {
    data object Caricamento : AttivitaUiState
    data class Successo(val attivita: List<Attivita>) : AttivitaUiState
    data class Errore(val messaggio: String) : AttivitaUiState
}

class AttivitaViewModel : ViewModel() {
    private val _stato = MutableStateFlow<AttivitaUiState>(AttivitaUiState.Caricamento)
    val stato: StateFlow<AttivitaUiState> = _stato.asStateFlow()

    private val _eventi = Channel<String>(Channel.BUFFERED)
    val eventi = _eventi.receiveAsFlow()

    init {
        carica()
    }

    fun carica() {
        viewModelScope.launch {
            _stato.value = AttivitaUiState.Caricamento
            _stato.value = try {
                delay(800)
                AttivitaUiState.Successo(
                    listOf(
                        Attivita(1, "Comprare il pane"),
                        Attivita(2, "Scrivere la relazione"),
                        Attivita(3, "Chiamare il dentista")
                    )
                )
            } catch (e: Exception) {
                AttivitaUiState.Errore(e.message ?: "Errore")
            }
        }
    }

    fun alterna(id: Int) {
        val corrente = _stato.value
        if (corrente !is AttivitaUiState.Successo) return

        val aggiornata = corrente.attivita.map { a ->
            if (a.id == id) a.copy(completata = !a.completata) else a
        }

        _stato.value = corrente.copy(attivita = aggiornata)
        _eventi.trySend("Attività aggiornata")
    }
}
```

La lista non viene modificata in place: `map` crea una nuova lista con `copy`. Compose confronta i riferimenti e sa cosa è cambiato.

### Errori comuni

- **Logica nel composable.** Regole di business, filtri e chiamate di rete vanno nel ViewModel.
- **Esporre `MutableStateFlow`.** La UI può scrivere: esponi solo `StateFlow`.
- **Creare il ViewModel con `remember`.** Perdi lo stato a ogni rotazione; usa `viewModel()`.
- **Usare `collectAsState` ovunque.** In background raccoglie senza motivo; preferisci `collectAsStateWithLifecycle`.
- **Mettersi lo snackbar nello stato.** Ricompare dopo una rotazione; usa un evento.
- **Lanciare coroutine da `onClick` senza scope.** Oppure chiamare una funzione `suspend` da una lambda non sospesa.
- **Catturare `Throwable` e ignorare la cancellazione.** `CancellationException` deve propagare, altrimenti il lavoro non si ferma.
- **Aggiornare lo stato da un thread di background senza flusso.** Puoi farlo con `MutableStateFlow`, ma non con `mutableStateOf`.
- **Tenere un `Context` nel ViewModel.** Va in leak; se serve, passa il dato già pronto.
- **`LaunchedEffect` con la chiave sbagliata.** Con `Unit` non ricarica quando cambia il parametro; con una chiave instabile rilancia a ogni ricomposizione.

## Esercizi progressivi

**Esercizio 1.** Trasforma un `OutlinedTextField` in un composable stateless con `valore` e `onValoreChange`; usalo da un genitore stateful.

**Esercizio 2.** Crea `ContatoreViewModel` con `StateFlow<Int>` e i metodi `incrementa`, `decrementa`, `azzera`; collega tre pulsanti.

**Esercizio 3.** Aggiungi `Log.d` in un `DisposableEffect` per verificare le transizioni di lifecycle durante la rotazione.

**Esercizio 4.** Definisci un `sealed interface` per lo stato di un form: `Vuoto`, `Valido(dati)`, `NonValido(errore)`.

**Esercizio 5.** Crea un repository con `delay` e un errore simulato; mostra il pulsante `Riprova` in caso di errore.

**Esercizio 6.** Mostra `CircularProgressIndicator` durante il caricamento di una lista.

**Esercizio 7.** Mostra la lista in caso di successo, con card e `key`.

**Esercizio 8.** Aggiungi una schermata di errore con messaggio leggibile e pulsante di retry.

**Esercizio 9.** Porta un campo di ricerca nel ViewModel e filtra la lista mantenendo lo stato `Successo`.

**Esercizio 10.** Crea un to-do nel ViewModel con aggiunta, completamento ed eliminazione, sempre con liste immutabili.

**Esercizio 11.** Emetti un evento con `Channel` per uno snackbar "Annulla" dopo l'eliminazione.

**Esercizio 12.** Usa `LaunchedEffect(citta)` per ricaricare i dati ogni volta che la città cambia.

**Esercizio 13.** Salva una bozza in `ON_STOP` con `DisposableEffect` e rimuovi l'osservatore in `onDispose`.

**Esercizio 14.** Combina tutto: ViewModel, `UiState`, lista, ricerca, evento di eliminazione e snackbar.

### Varianti

- Nel repository, ritarda la risposta in modo casuale tra 500 e 1500 ms e mostra il caricamento.
- Nel ViewModel, unisci gli errori in un messaggio unico per l'utente.
- Aggiungi un secondo pulsante di retry che ricarica mantenendo la lista precedente visibile.
- Trasforma `ContatoreViewModel` in una classe testabile e scrivi un test con `runTest`.
- Prova `collectAsState` al posto di `collectAsStateWithLifecycle` e osserva i log di lifecycle.

## Progetti del livello 3

### Progetto 1: To-do con ViewModel

Requisiti:

- `AttivitaViewModel` con `StateFlow<UiState>` e lista immutabile;
- aggiunta con dialog, completamento, eliminazione;
- eventi una tantum per snackbar di conferma;
- contatore delle attività completate calcolato nello stato o derivato;
- nessuno stato nei composable, salvo quello dei dialog;
- ricarica dopo la rotazione senza perdere i dati;
- gestione di lista vuota.

### Progetto 2: Catalogo con caricamento, errore e successo

Requisiti:

- repository bugiardo con `delay` e errore casuale;
- `UiState` con `Caricamento`, `Successo`, `Errore`;
- retry che riparte dallo stato di caricamento;
- ricerca nel ViewModel;
- lista con card e immagini;
- snackbar per gli errori di caricamento;
- nessuna chiamata di rete dentro un composable.

### Progetto 3: Form di iscrizione validato

Requisiti:

- campi nome, email ed età, con stato nel ViewModel;
- validazione in tempo reale con messaggi sotto i campi;
- pulsante `Invia` disabilitato finché il form non è valido;
- stato `Idle`, `Invio`, `Successo`, `Errore` per l'invio;
- errore di invio simulato e possibilità di riprovare;
- nessuna perdita di dati durante la rotazione.

### Progetto 4: Meteo con ricerca città

Requisiti:

- campo di ricerca con città nel ViewModel;
- `LaunchedEffect(citta)` che ricarica i dati quando la città cambia;
- stati di caricamento, errore e successo;
- card principale e lista previsioni;
- messaggio per città non trovata;
- eventi per snackbar "Città aggiornata";
- retry che mantiene la città corrente.

### Criteri di verifica

- [ ] Nessun composable contiene logica di business.
- [ ] Il `ViewModel` espone solo `StateFlow`, mai `MutableStateFlow`.
- [ ] Tutti gli stati della schermata sono coperti da `UiState`.
- [ ] `viewModelScope` è usato per ogni operazione asincrona.
- [ ] Gli eventi una tantum non sono modellati come stato.
- [ ] `LaunchedEffect` ha chiavi corrette e `DisposableEffect` pulisce in `onDispose`.
- [ ] La rotazione non perde dati né duplica il caricamento.
- [ ] Il retry funziona e l'errore è comprensibile per l'utente.

Nel livello 4 la UI diventa navigabile e animata: più schermate, transizioni, stato che sopravvive alla rotazione e dati paginati.
