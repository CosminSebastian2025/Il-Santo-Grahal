Nelle app JavaFX reali la difficoltà non è piazzare bottoni, ma far convivere centomila righe di dati, filtri, ordinamenti e aggiornamenti dallo sfondo senza congelare l'interfaccia. Questa lezione copre i tre strumenti che risolvono il problema: layout e CSS per la struttura, `TableView` con `FilteredList`/`SortedList` per le collezioni reattive, `Task` e binding per tenere la UI reattiva.

## Obiettivi

- Costruire un layout ridimensionabile con `BorderPane`, `SplitPane` e vincoli di crescita.
- Usare `ObservableList` con `FilteredList`, `SortedList` e `TableColumn` con `ReadOnlyObjectWrapper`.
- Rendere gli stili con fogli CSS dedicati e pseudo-classi di stato.
- Eseguire lavoro lungo con `Task` e `Service` senza bloccare il thread UI.
- Evitare i collo di bottiglia di prestazioni tipici di `TableView`.

## Layout e stile

`Region` ha tre serie di dimensioni: min, pref e max. Un layout padre interroga i figli e decide come distribuire lo spazio; quando inserisci un nodo in un `BorderPane`, `center` prende tutto lo spazio avanzato mentre `top`, `bottom`, `left` e `right` si dimensionano al contenuto. Il trucco è usare `HBox.setHgrow(child, Priority.ALWAYS)` o `VBox.setVgrow(child, Priority.ALWAYS)` per indicare chi deve assorbire lo spazio extra.

| Contenitore | Uso tipico | Errore frequente |
| --- | --- | --- |
| `BorderPane` | finestra principale (toolbar, centro, status bar) | dimenticare `setCenter` e vedere il vuoto |
| `HBox`/`VBox` | file di controlli | niente `HGrow`, quindi tutto a sinistra |
| `GridPane` | form con etichette allineate | righe aggiunte senza `RowConstraints` |
| `SplitPane` | pannello albero + dettaglio | divider fissato con larghezze fisse |
| `StackPane` | overlay e loading spinner | due figli visibili sovrapposti per errore |

Lo stile vive in un file `app.css` caricato con `scene.getStylesheets().add(...)`. Le forme usano selettori CSS standard (`.titolo`, `#status`), gli stati invece sono pseudo-classi: `:hover`, `:focused`, `:selected`, `:disabled` e `:empty`. JavaFX supporta un sottoinsieme di CSS, senza variabili in `var()` e senza grid layout complesso, ma con `-fx-` davanti alle proprietà.

```css
/* inventario.css */
.toolbar { -fx-background-color: #1f2937; -fx-padding: 8 12 8 12; }
.toolbar .label { -fx-text-fill: #f9fafb; -fx-font-size: 13px; }
#ricerca:empty { -fx-text-fill: #9ca3af; }
.badge:selected { -fx-background-color: #2563eb; -fx-text-fill: white; }
```

Aggiungere una classe con `getStyleClass().add("badge")` è idempotente e gestibile, mentre `setStyle()` scrive uno stile inline che vince su tutto il foglio e diventa difficile da rimuovere.

## Dati reattivi con TableView

Una `ObservableList` notifica le modifiche a chi la osserva; `FilteredList` applica un predicato e `SortedList` ordina il risultato, e ciascuno ricorda il proprio predicato e comparatore quando la lista sottostante cambia. È il meccanismo che rende possibile filtrare senza ricostruire la tabella.

```java
record Articolo(String sku, String nome, int quantita) {}

ObservableList<Articolo> archivio = FXCollections.observableArrayList();
FilteredList<Articolo> filtrati = new FilteredList<>(archivio, a -> true);
SortedList<Articolo> ordinati = new SortedList<>(filtrati);

TableColumn<Articolo, String> colSku = new TableColumn<>("SKU");
colSku.setCellValueFactory(c -> new ReadOnlyObjectWrapper<>(c.getValue().sku()));

TableColumn<Articolo, Number> colQty = new TableColumn<>("Qtà");
colQty.setCellValueFactory(c -> new ReadOnlyObjectWrapper<>(c.getValue().quantita()));

table.getColumns().addAll(colSku, colQty);
table.setItems(ordinati);
ordinati.comparatorProperty().bind(table.comparatorProperty()); // sort nativo
```

`setCellValueFactory` viene chiamato una volta per colonna e cella: restituire un wrapper nuovo a ogni accesso va bene, ma calcolare lì valori costosi è un errore. Il `comparatorProperty` della tabella va collegato alla `SortedList`, altrimenti click sulle intestazioni non ordina nulla.

```java
FilteredList<Articolo> filtrati = new FilteredList<>(archivio);
ricerca.textProperty().addListener((obs, old, q) ->
    filtrati.setPredicate(a -> a.nome().toLowerCase().contains(q.toLowerCase())));
```

Il listener separato mantiene la logica di filtro fuori dal binding, quindi è testabile senza avviare il toolkit.

## Lavoro in background e aggiornamenti incrementali

`Task<T>` gira su un `Thread` e pubblica risultati intermedi con `updateValue` oppure via `Platform.runLater`; gli handle `setOnSucceeded`, `setOnFailed` e `setOnRunning` girano sul thread UI. `Service<T>` incapsula un `Task` riusabile con `restart()`.

```java
Task<Void> importa = new Task<>() {
    @Override
    protected Void call() {
        List<Articolo> letti = leggiCsv(); // lavoro pesante fuori dal thread UI
        Platform.runLater(() -> archivio.addAll(letti)); // unica scrittura sull'ObservableList
        updateProgress(letti.size(), letti.size());
        return null;
    }
};
barra.progressProperty().bind(importa.progressProperty());
```

La modifica della `ObservableList` va sempre fatta sul thread UI: o con `Platform.runLater` come sopra, o preparando i dati nel task e aggiungendoli in blocco nel `setOnSucceeded`. La lista notifica direttamente la tabella e i listener girano fuori dal thread UI, che non è sincronizzato.

| Metrica | Caso tipico | Cosa la muove |
| --- | --- | --- |
| righe visibili | 20 su 250.000 | `setFixedCellSize(24)` evita misure per riga |
| celle per ridisegno | 5 colonne per riga | `cellValueFactory` che alloca poco |
| notifiche per import | 1 per `addAll` | una sola scrittura in blocco |

Le prestazioni dipendono principalmente da: lista impostata con `setItems` una sola volta, `setFixedCellSize` coerente con l'altezza delle celle, `cellValueFactory` economico e nessuna `CellFactory` che alloca oggetti pesanti. Oltre i 100.000 elementi conviene paginare i dati lato server o passare a un modello virtualizzato su `ListView` con celle composte.

## Errori comuni

- **Ricreare `FilteredList` a ogni battitura**: perdi l'ordinamento e generi echi di listener; crea la catena una volta e cambia solo il predicato.
- **Non sciogliere il comparator**: se la tabella non è collegata a `SortedList`, l'ordinamento non funziona e l'utente lo segnala come bug.
- **Aggiornare items da thread di lavoro**: `ObservableList` non è sincronizzata; notifiche fuori thread producono `IllegalStateException` o disegno incoerente.
- **Usare `setStyle` per tutto**: rende impossibile sovrascrivere gli stili da tema e mescola contenuto e presentazione.
- **`Task` riusato dopo un fallimento**: un `Task` non riparte; usa `Service` o crea un nuovo `Task`.
- **Set `PrefWidth` fissi**: la finestra non scala su display HiDPI; usa `Region` con `grow` e vincoli.

## In sintesi

Layout e CSS decidono la forma, non il contenuto. `FilteredList` e `SortedList` sono la catena reattiva della tabella e vanno create una sola volta, con il comparatore collegato alla tabella. Il lavoro lungo va in `Task`, e il risultato torna sul thread UI in un punto solo, preferibilmente in blocco. Se la tabella scatta, le cause sono quasi sempre nella lista o nel `cellValueFactory`, non nel renderer.

## Fonti

- [JavaFX 26 API — TableView](https://openjfx.io/javadoc/26/javafx.controls/javafx/scene/control/TableView.html)
- [JavaFX 26 API — FilteredList](https://openjfx.io/javadoc/26/javafx.base/javafx/collections/transformation/FilteredList.html)
- [JavaFX 26 API — ReadOnlyObjectWrapper](https://openjfx.io/javadoc/26/javafx.base/javafx/beans/property/ReadOnlyObjectWrapper.html)
- [OpenJFX Documentation — CSS e FXML](https://openjfx.io/openjfx-docs/)
