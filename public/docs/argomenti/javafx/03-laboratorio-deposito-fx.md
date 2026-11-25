In questo laboratorio costruiamo `DepositoFX`, un'app desktop per gestire l'inventario di un magazzino: tabella filtrabile, form di inserimento e salvataggio su file CSV. Useremo Java 26 e JavaFX 26 (GA del 17 marzo 2026), un solo modulo Maven e nessun database, così il progetto parte in cinque minuti e resta leggibile.

## Obiettivi

- Creare un progetto Maven con JavaFX 26 e avviarlo con `mvn javafx:run`.
- Separare modello, repository CSV e controller, con logica testabile senza toolkit.
- Costruire una `TableView` con filtro e salvataggio automatico throttled.
- Gestire gli errori di I/O con dialoghi JavaFX e non con stack trace in console.
- Preparare un runtime image con `jlink` o un bundle per la distribuzione.

## Passo 1: progetto e plugin

Creiamo un progetto Maven standard con `src/main/java/com/esempio/deposito` e `src/main/resources`. Il plugin JavaFX di Maven riconosce i moduli dichiarati e aggiunge i classifier di piattaforma corretti.

```xml
<properties>
  <maven.compiler.release>24</maven.compiler.release>
  <javafx.version>26.0.2</javafx.version>
</properties>
<dependencies>
  <dependency>
    <groupId>org.openjfx</groupId>
    <artifactId>javafx-controls</artifactId>
    <version>${javafx.version}</version>
  </dependency>
</dependencies>
<build>
  <plugins>
    <plugin>
      <groupId>org.openjfx</groupId>
      <artifactId>javafx-maven-plugin</artifactId>
      <version>0.0.8</version>
      <configuration>
        <mainClass>com.esempio.deposito.DepositoApp</mainClass>
      </configuration>
    </plugin>
  </plugins>
</build>
```

JavaFX 26 richiede JDK 24 come minimo, quindi `maven.compiler.release` a 24 evita sorprese in CI. Verifica con `java -version` che il runtime sia almeno JDK 24, poi esegui `mvn -q javafx:run`.

## Passo 2: modello e repository CSV

Il modello è un `record`, immutabile e con `equals` gratuito, ideale per fidarsi dei test. Il repository legge e scrive un CSV con intestazione e gestisce il caso di file mancante restituendo una lista vuota.

```java
public record Articolo(String sku, String nome, int quantita) {
    public Articolo {
        if (sku == null || sku.isBlank()) throw new IllegalArgumentException("sku vuoto");
        if (quantita < 0) throw new IllegalArgumentException("quantita negativa");
    }
}

public final class ArchivioCsv {
    private final Path file;

    public ArchivioCsv(Path file) { this.file = file; }

    public List<Articolo> carica() throws IOException {
        if (!Files.exists(file)) return List.of();
        return Files.readAllLines(file).stream()
            .skip(1)
            .filter(r -> !r.isBlank())
            .map(r -> r.split(",", 3))
            .map(p -> new Articolo(p[0], p[1], Integer.parseInt(p[2])))
            .toList();
    }

    public void salva(List<Articolo> articoli) throws IOException {
        List<String> righe = new ArrayList<>();
        righe.add("sku,nome,quantita");
        for (Articolo a : articoli) {
            righe.add(a.sku() + "," + a.nome() + "," + a.quantita());
        }
        Files.write(file, righe); // write atomico non garantito
    }
}
```

Prima di usarlo su dati reali, `salva` va reso atomico: scrivi su un file temporaneo e sostituisci con `Files.move`.

## Passo 3: interfaccia con TableView e form

La scena contiene una lista filtrabile, una toolbar con il campo di ricerca e un form con tre campi più un bottone. Il filtro aggiorna il predicato, il form aggiunge articoli, il salvataggio serializza la lista.

```java
public class DepositoApp extends Application {
    private final ObservableList<Articolo> archivio = FXCollections.observableArrayList();
    private final ArchivioCsv repo = new ArchivioCsv(Path.of("deposito.csv"));

    @Override
    public void start(Stage stage) throws IOException {
        archivio.setAll(repo.carica());
        FilteredList<Articolo> visibili = new FilteredList<>(archivio);

        TextField ricerca = new TextField();
        ricerca.setPromptText("Cerca per nome o SKU");
        ricerca.textProperty().addListener((obs, old, q) ->
            visibili.setPredicate(a -> q.isBlank()
                || a.nome().toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT))
                || a.sku().toLowerCase(Locale.ROOT).startsWith(q.toLowerCase(Locale.ROOT))));

        TableView<Articolo> tabella = new TableView<>(visibili);
        tabella.setFixedCellSize(26);
        tabella.getColumns().addAll(
            colonna("SKU", Articolo::sku),
            colonna("Nome", Articolo::nome),
            colonna("Qtà", a -> Integer.toString(a.quantita())));

        stage.setScene(new Scene(new BorderPane(tabella, new ToolBar(ricerca), null, form(), null), 760, 480));
        stage.setTitle("DepositoFX");
        stage.show();
    }

    private static <T> TableColumn<Articolo, T> colonna(String titolo, Function<Articolo, T> f) {
        TableColumn<Articolo, T> c = new TableColumn<>(titolo);
        c.setCellValueFactory(cell -> new ReadOnlyObjectWrapper<>(f.apply(cell.getValue())));
        return c;
    }

    public static void main(String[] args) { launch(args); }
}
```

`ObservableList` di filtro accetta qualunque fonte osservabile, quindi la tabella mostra solo i filtrati; l'`archivio` originale resta la verità da salvare.

## Passo 4: salvataggio throttled ed errori di I/O

Scrivere il CSV a ogni tasto è inutile: raggruppa le richieste con una `PauseTransition` di 400 ms, che riparte a ogni modifica e scatta una sola volta. La scrittura vera va su un executor, perché il disco non deve mai girare sul thread UI.

```java
private final PauseTransition debounce = new PauseTransition(Duration.millis(400));

private void pianificaSalvataggio(FilteredList<Articolo> visibili) {
    debounce.setOnFinished(e -> scrivi());
    debounce.playFromStart();
}

private void scrivi() {
    List<Articolo> snapshot = List.copyOf(archivio);
    CompletableFuture.runAsync(() -> {
        try {
            repo.salva(snapshot);
        } catch (IOException ex) {
            Platform.runLater(() -> avviso("Salvataggio fallito", ex.getMessage()));
        }
    });
}

private void avviso(String titolo, String messaggio) {
    new Alert(Alert.AlertType.WARNING, messaggio, ButtonType.OK).showAndWait();
}
```

Il `List.copyOf` crea uno snapshot immutabile: l'executor legge una lista che nessuno modifica più, quindi niente `ConcurrentModificationException`. Il `Platform.runLater` riporta l'errore sul thread UI per il dialogo.

## Passo 5: verifica e distribuzione

| Verifica | Comando o azione | Esito atteso |
| --- | --- | --- |
| avvio | `mvn javafx:run` | finestra 760x480, tabella vuota |
| inserimento | sku `A-1`, nome `Vite`, qtà `40` | riga visibile |
| filtro | ricerca `vite` | resta una riga |
| persistenza | chiudi e riapri | l'articolo è ancora lì |
| file corrotto | scrivi riga senza virgole nel CSV | dialogo di errore, non crash |
| test | `mvn test` su `ArchivioCsv` con `@TempDir` | verde senza toolkit |

Per distribuire, `jlink` parte dai moduli dell'app:

```bash
jlink --module-path "$JAVA_HOME/jmods:target/jfx" \
      --add-modules com.esempio.deposito,javafx.controls \
      --output target/deposito-runtime --strip-debug
```

Il modulo dell'app deve dichiarare `requires javafx.controls;` in `module-info.java` e, se usi FXML, `opens com.esempio.deposito to javafx.fxml;`. In alternativa jpackage produce un installer `.msi`/`.exe` usando lo stesso runtime image.

## Esercizi

1. Aggiungi eliminazione multipla con `SelectionMode.MULTIPLE` e un bottone che rimuove le righe selezionate.
2. Sostituisci il `PauseTransition` con un `ScheduledExecutorService` con debounce a 1 secondo.
3. Aggiungi una colonna `Totale` che combina quantità e prezzo unitario.

<details>
<summary>Soluzione</summary>

1. La selezione restituisce `List<Articolo>`; rimuovi con `archivio.removeAll(selezione)` una sola volta e lascia che il listener pianifichi un unico salvataggio.

2. L'executor riceve la richiesta, cancella il `ScheduledFuture` precedente e riprogramma: la chiusura del service va in `stop()` della `Application` per non lasciare thread vivi.

3. Il prezzo manca nel record: aggiungi il campo e calcola il totale dentro `cellValueFactory`.

</details>

## Errori comuni

- **Dimenticare `requires javafx.controls`**: con Maven il plugin passa i moduli, ma un `module-info.java` incompleto fallisce in `jlink`.
- **Salvare dentro il listener senza debounce**: un import di 500 righe scrive 500 volte il file.
- **Leggere l'`archivio` da un thread di lavoro mentre l'utente modifica**: serve uno snapshot immutabile.

## In sintesi

Il laboratorio mostra il flusso di un'app JavaFX piccola ma realistica: repository puro testabile, lista observabile come stato unico, filtro con predicato, salvataggio asincrono debounced e runtime image distribuibile. La struttura è la parte da copiare: il toolkit resta ai bordi, il modello non sa che esiste una `TableView`.

## Fonti

- [OpenJFX Documentation](https://openjfx.io/openjfx-docs/)
- [JavaFX 26 API — BorderPane](https://openjfx.io/javadoc/26/javafx.graphics/javafx/scene/layout/BorderPane.html)
- [JavaFX 26 API — FXML](https://openjfx.io/javadoc/26/javafx.fxml/javafx/fxml/FXML.html)
- [JetBrains — JavaFX in IntelliJ IDEA](https://www.jetbrains.com/help/idea/javafx.html)
