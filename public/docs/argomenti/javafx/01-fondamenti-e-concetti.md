JavaFX è il toolkit UI ufficiale della piattaforma Java per applicazioni desktop con controlli ricchi, grafica vettoriale e CSS. Dal rilascio 11 non fa più parte del JDK: si distribuisce come moduli Maven/Gradle separati, con una release ogni sei mesi allineata al JDK. In questa lezione impari il grafo della scena, il ciclo di vita dell'applicazione e il modello di threading, cioè le tre cose che spiegano quasi tutti i bug tipici di un'app JavaFX.

## Obiettivi

- Descrivere la gerarchia `Stage` → `Scene` → nodi e i moduli che compongono la piattaforma.
- Collegare `Application.start` al JavaFX Application Thread e usare `Platform.runLater` correttamente.
- Comporre una finestra con `BorderPane`, `FXML` e proprietà osservabili.
- Scegliere la versione JavaFX giusta e configurarla su un classpath moderno.

## Il grafo della scena

Una finestra JavaFX è uno `Stage` (la finestra del sistema operativo) che mostra una `Scene` (l'albero di nodi da disegnare). Ogni nodo ha parent, stile CSS, trasformazioni e bounding box; i layout come `BorderPane`, `HBox` e `VBox` non disegnano nulla, ma calcolano posizioni e dimensioni dei figli.

| Concetto | Classe | Dipende da |
| --- | --- | --- |
| finestra | `javafx.stage.Stage` | `javafx.graphics` |
| contenitore radice | `javafx.scene.Scene` | `javafx.graphics` |
| nodo | `javafx.scene.Node` | `javafx.graphics` |
| controlli (Button, TableView) | `javafx.scene.control.*` | `javafx.controls` |
| layout | `javafx.scene.layout.*` | `javafx.graphics` |
| animazioni e timeline | `javafx.animation.*` | `javafx.graphics` |
| proprietà osservabili | `javafx.beans.property.*` | `javafx.base` |
| supporto FXML | `javafx.fxml.FXMLLoader` | `javafx.fxml` |

I moduli sono indipendenti: una applicazione console che usa solo binding non trascina il motore grafico, mentre `javafx.web` pesa decine di megabyte perché include WebKit. Da JavaFX 26 la versione minima di JDK richiesta è la 24, quindi il runtime della macchina di sviluppo deve essere almeno così recente.

```java
public class PrimaFinestra extends Application {
    @Override
    public void start(Stage stage) {
        Label titolo = new Label("Inventario");
        ListView<String> lista = new ListView<>();
        BorderPane radice = new BorderPane(lista);
        radice.setTop(new ToolBar(titolo));

        stage.setScene(new Scene(radice, 640, 400));
        stage.setTitle("Deposito");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args); // avvia il toolkit e poi chiama start
    }
}
```

`launch` crea il JavaFX Application Thread, inizializza il toolkit grafico e chiama `start`; `stop` viene invocato alla chiusura e `init` prima di `start` per caricare dati senza toccare la UI.

## Thread UI, proprietà e binding

Tutti i nodi vanno creati e modificati sul JavaFX Application Thread. Un `Thread` di lavoro o un task asincrono che tocca un `Label` lancia `IllegalStateException: Not on FX application thread` oppure corrompe lo stato grafico in modo silenzioso. Il ponte corretto è `Platform.runLater`.

```java
Task<List<Articolo>> carica = new Task<>() {
    @Override
    protected List<Articolo> call() throws Exception {
        return repo.findAll(); // gira fuori dal thread UI
    }
};

carica.setOnSucceeded(e -> lista.getItems().setAll(carica.getValue()));
carica.setOnFailed(e -> errore.setText(carica.getException().getMessage()));
new Thread(carica, "loader").start();
```

Gli handle `setOnSucceeded` e `setOnFailed` girano già sul thread UI, quindi non serve altro marshalling. Le proprietà osservabili sono il secondo pilastro: `StringProperty`, `IntegerProperty` e `ObjectProperty<T>` notificano i listener quando cambiano, e il binding collega due valori in una direzione.

```java
StringProperty filtro = new SimpleStringProperty("");
FilteredList<Articolo> visibili = new FilteredList<>(ObservableCollections.articoli(), a -> true);
filtro.addListener((obs, vecchio, nuovo) ->
    visibili.setPredicate(a -> a.nome().toLowerCase().contains(nuovo.toLowerCase())));
```

Un binding come `label.textProperty().bind(filtro)` mantiene il valore sincronizzato senza listener manuali, ma va sciolto con `unbind` prima di riscrivere la proprietà direttamente, altrimenti JavaFX lancia un errore di "bound value".

## FXML e setup del progetto

`FXMLLoader` costruisce il grafo da un file XML e lo lega a un controller tramite `@FXML` e iniezione dei campi. È il modo più comune per separare layout e logica nei progetti grandi, con Scene Builder come editor visuale.

```java
URL fxml = getClass().getResource("/viste/inventario.fxml");
FXMLLoader loader = new FXMLLoader(fxml);
Parent radice = loader.load();
InventarioController ctrl = loader.getController();
stage.setScene(new Scene(radice));
```

| Setup | Come | Quando |
| --- | --- | --- |
| Maven + JavaFX plugin | `org.openjfx:javafx-maven-plugin`, `javafx:run` | progetti Maven con moduli |
| Gradle | plugin `org.openjfx.javafxplugin`, `javafx { modules = [...] }` | build Gradle |
| Classpath con classifier | `javafx-controls:26.0.2:win` | esecuzione senza moduli |
| CLI modulare | `java --module-path $JFX/lib --add-modules javafx.controls app.Main` | test rapidi e distribuzione jlink |

Le dipendenze Maven esistono anche con classifier di piattaforma (`win`, `linux`, `mac`, `mac-aarch64`): il plugin JavaFX li aggiunge in automatico, mentre senza plugin bisogna dichiararli. Con JDK 26 la classe `jdk.jsobject` non esiste più, quindi `javafx.web` va usato solo in un progetto modulare o con le dipendenze corrette.

## Errori comuni

- **Usare JavaFX del JDK**: dal JDK 11 `javafx.*` non esiste nel runtime; senza dipendenze il compile fallisce con "package javafx.application does not exist".
- **Toccare la UI da un thread di lavoro**: aggiorna sempre con `Platform.runLater`, `Task` o `Service`, mai direttamente.
- **Chiamare `Platform.exit()` dentro `stop`**: chiude il toolkit in modo non deterministico; `stop` serve a rilasciare risorse.
- **Lasciare `Thread` non daemon**: la JVM non termina anche dopo la chiusura della finestra; usa `Platform.setImplicitExit(true)` e thread daemon.
- **Mescolare CSS inline e classi**: uno stile inline ha priorità superiore e rende irraggiungibile il foglio di stile; preferisci `getStyleClass().add(...)`.
- **Creating `Scene` prima di `Application.start`**: la `Scene` richiede il toolkit inizializzato, altrimenti c'è un `Toolkit not initialized`.

## In sintesi

JavaFX è un grafo di nodi scritto in Java, disegnato da un motore CSS e animazioni, distribuito come moduli separati dal JDK. La regola mentale è semplice: un solo thread tocca l'albero, tutto il resto comunica con proprietà osservabili e `Platform.runLater`. Stage, Scene e FXML separano finestra, contenuto e layout; i moduli JavaFX decidono quanta parte della piattaforma finisce nel tuo pacchetto.

## Fonti

- [OpenJFX Documentation](https://openjfx.io/openjfx-docs/)
- [JavaFX 26 API — javafx.graphics](https://openjfx.io/javadoc/26/javafx.graphics/javafx/application/Application.html)
- [Gluon — JavaFX 26 Release Notes](https://gluonhq.com/products/javafx/openjfx-26-release-notes/)
- [JavaFX Migration Guide (OpenJDK Wiki)](https://wiki.openjdk.org/spaces/OpenJFX/pages/162889752/JavaFX+Migration+Guide)
