In questo laboratorio costruisci **Blocco**, un editor di note in Qt 6 con lista delle note, campo di testo, salvataggio su file e ricerca. Il punto non è l'editor: è mettere in fila gli strumenti che ogni applicazione Qt usa davvero, cioè finestra principale e `QSettings`, menu e scorciatoie con `QAction`, un modello personalizzato per la lista, un thread per la ricerca su disco e un pacchetto installabile con `windeployqt` o `linuxdeploy`. Ogni passo ha un criterio di verifica, così sai quando puoi andare avanti.

## Obiettivi

- Creare un progetto Qt 6 CMake con `QMainWindow`, menu e barra di stato.
- Separare i dati delle note dal widget con un modello e salvarli con `QSettings` e file.
- Eseguire la ricerca su disco in un thread worker senza bloccare la GUI.
- Impostare `QAction` con icone dalle risorse `.qrc` e scorciatoie standard.
- Produrre un pacchetto eseguibile su una macchina senza Qt installato.

## Passo 1: progetto CMake e finestra principale

Il progetto parte da tre file: `CMakeLists.txt`, `main.cpp` e `finestramain.h/.cpp`. Usa Qt 6.8 o superiore: le API sono quelle di Qt 6 e non richiedono `QT_DEPRECATED_WARNINGS` speciali.

```cmake
cmake_minimum_required(VERSION 3.22)
project(blocco LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
qt_standard_project_setup()

find_package(Qt6 REQUIRED COMPONENTS Widgets Concurrent)
qt_add_executable(blocco main.cpp finestramain.cpp finestramain.h)
target_link_libraries(blocco PRIVATE Qt6::Widgets Qt6::Concurrent)
qt_add_resources(blocco risorse PREFIX "/" FILES icons/nuova.svg icons/cerca.svg)
```

```bash
cmake -S . -B build -G Ninja -DCMAKE_PREFIX_PATH=C:/Qt/6.8.3/mingw_64
cmake --build build
./build/blocco
```

`CMAKE_PREFIX_PATH` deve puntare alla cartella del kit Qt, non all'installer: è l'errore di configurazione più comune su Windows con più versioni installate.

## Passo 2: stato, persistenza e azioni

Le note sono coppie chiave-valore dove la chiave è il titolo. `QSettings` conserva l'ultima nota aperta e la geometria della finestra; il testo va in file separati, perché `QSettings` non è pensato per blob grandi. Le azioni sono `QAction` condivise tra menu, toolbar e scorciatoie, con `QKeySequence::standardKey` per le combinazioni native.

```cpp
// finestramain.h (estratto)
class FinestraMain : public QMainWindow {
    Q_OBJECT
public:
    FinestraMain();
private:
    void nuovaNota();
    void salvaNota();
    void ripristina();
    void cerca(const QString &testo);

    QTextEdit *m_editor = nullptr;
    QListWidget *m_lista = nullptr;
    QAction *m_salva = nullptr;
    QSettings m_impostazioni{QStringLiteral("Scuola"), QStringLiteral("Blocco")};
    QString m_corrente;
};
```

```cpp
FinestraMain::FinestraMain() {
    auto *centrale = new QWidget;
    auto *layout = new QHBoxLayout(centrale);
    m_lista = new QListWidget(centrale);
    m_editor = new QTextEdit(centrale);
    layout->addWidget(m_lista, 1);
    layout->addWidget(m_editor, 3);
    setCentralWidget(centrale);

    auto *nuova = new QAction(tr("&Nuova"), this);
    nuova->setShortcut(QKeySequence::New);
    m_salva = new QAction(tr("&Salva"), this);
    m_salva->setShortcut(QKeySequence::Save);
    m_salva->setEnabled(false);
    connect(m_salva, &QAction::triggered, this, &FinestraMain::salvaNota);
    connect(m_editor, &QTextEdit::textChanged, this, [this] {
        m_salva->setEnabled(m_editor->document()->isModified());
    });

    auto *file = menuBar()->addMenu(tr("&File"));
    file->addAction(nuova);
    file->addAction(m_salva);
    file->addSeparator();
    file->addAction(tr("&Esci"), QKeySequence::Quit, this, &QWidget::close);

    ripristina(); // geometria + ultima nota
}

void FinestraMain::ripristina() {
    restoreGeometry(m_impostazioni.value("finestra/geometria").toByteArray());
    const QString ultima = m_impostazioni.value("nota/ultima").toString();
    if (!ultima.isEmpty()) apriNota(ultima);
}
```

`QSettings` scrive nel registro su Windows (`HKCU\Software\Scuola\Blocco`) e in `~/.config/Scuola/Blocco.conf` su Linux. Una nota non salvata va chiusa in `closeEvent` con un `QMessageBox` a tre pulsanti: salva, scarta, annulla.

## Passo 3: modello custom per la lista

`QListWidget` va bene per prototipi, ma con la ricerca filtro e conteggi il modello è più pulito. `QStringListModel` oppure un `QAbstractListModel` con un ruolo `TitoloRole`; la vista resta `QListView` collegata con `setModel`.

```cpp
class ModelloNote : public QAbstractListModel {
    Q_OBJECT
public:
    enum { TitoloRole = Qt::UserRole + 1 };
    explicit ModelloNote(QObject *p = nullptr) : QAbstractListModel(p) {}

    int rowCount(const QModelIndex &p = {}) const override { return p.isValid() ? 0 : m_titoli.size(); }
    QVariant data(const QModelIndex &i, int ruolo) const override {
        if (!i.isValid()) return {};
        if (ruolo == Qt::DisplayRole || ruolo == TitoloRole) return m_titoli.at(i.row());
        return {};
    }

    void sostituisci(const QStringList &titoli) {
        beginResetModel();
        m_titoli = titoli;
        endResetModel();
    }

private:
    QStringList m_titoli;
};
```

`beginResetModel` è accettabile perché la ricerca sostituisce l'intera lista; per aggiungere una singola nota la coppia corretta è `beginInsertRows`/`endInsertRows`. Il filtro deve agire sul modello, non nascondere righe con `setRowHidden`, che non funziona sulle viste basate su modello.

## Passo 4: ricerca su disco senza bloccare la GUI

Ogni nota vive in `<cartella note>/<titolo>.txt`. La ricerca apre tutti i file e cerca la stringa: su 5000 note è lavoro da thread. `QtConcurrent::run` più `QFutureWatcher` sono la soluzione più corta per una funzione pura che ritorna `QStringList`.

```cpp
QStringList cercaNelleNote(const QString &cartella, const QString &testo) {
    QStringList esiti;
    const QDir dir(cartella);
    for (const QFileInfo &fi : dir.entryInfoList({QStringLiteral("*.txt")}, QDir::Files)) {
        QFile f(fi.absoluteFilePath());
        if (!f.open(QIODevice::ReadOnly | QIODevice::Text)) continue;
        const QString contenuto = QTextStream(&f).readAll();
        if (contenuto.contains(testo, Qt::CaseInsensitive)) esiti << fi.completeBaseName();
    }
    return esiti;
}

void FinestraMain::cerca(const QString &testo) {
    m_watcher.setFuture(QtConcurrent::run(cercaNelleNote, m_cartellaNote, testo));
}

// nel costruttore
connect(&m_watcher, &QFutureWatcher<QStringList>::finished, this, [this] {
    m_modello->sostituisci(m_watcher.result());
    statusBar()->showMessage(tr("%1 risultati").arg(m_watcher.result().size()), 3000);
});
```

`QFileInfo`, `QString` e le collezioni Qt sono thread-safe in lettura e copy-on-write: passare copie alla lambda evita condivisioni nascoste. Il `QFutureWatcher` deve essere membro della finestra, non una variabile locale: se lo stack lo distrugge la connessione smette di arrivare.

## Passo 5: pacchetto e test di accettazione

Su Windows `windeployqt` copia DLL, plugin delle piattaforme e traduzioni accanto all'eseguibile; su Linux `linuxdeploy` con plugin Qt genera un AppImage. Il test di accettazione va fatto su una macchina pulita, senza Qt nel `PATH`.

```bash
cmake --build build --config Release
mkdir dist && cp build/Release/blocco.exe dist/
windeployqt --release --no-translations dist/blocco.exe
```

Su macOS serve `macdeployqt` e la firma; su Linux il `RUNPATH` deve puntare a `lib/` del pacchetto. Il criterio di uscita della sessione è: doccia di 10 note con ricerca sotto 200 ms, chiusura con nota modificata che mostra il dialogo, apertura su macchina pulita senza errori di DLL mancanti.

## Errori comuni

- **Nessun `windeployqt`**: l'app parte sul tuo PC e sul PC del docente appare "impossibile avviare il programma, manca Qt6Core.dll".
- **Aggiornare la GUI dalla ricerca**: senza `QFutureWatcher` e connessioni accodate si ottengono crash intermittenti.
- **Usare `QSettings` per il testo delle note**: su Windows il registro ha limiti di dimensione e le note diventano lentissime da leggere.
- **Widget di ricerca che filtra la vista**: il filtro deve produrre un nuovo modello, non nascondere righe.
- **`QFutureWatcher` come variabile locale**: distrutto all'uscita del metodo, la connessione non arriva mai.
- **Percorsi relativi per le note**: con l'avvio da menu il working directory è la home; usare `QStandardPaths::writableLocation(QStandardPaths::AppDataLocation)`.

## In sintesi

Hai messo insieme i pezzi di un'app desktop reale: `QMainWindow` e `QAction` per la struttura, `QSettings` per le preferenze, un modello per la lista, `QtConcurrent` e `QFutureWatcher` per la ricerca, e una procedura di deploy che produce un pacchetto avviabile altrove. La disciplina che resta da mantenere è la stessa: nessuna modifica al modello fuori dalle coppie begin/end, nessun widget toccato fuori dal thread GUI.

## Fonti

- [Qt 6 Documentation](https://doc.qt.io/qt-6/)
- [Getting Started with Qt 6 and CMake](https://doc.qt.io/qt-6/cmake-get-started.html)
- [Model/View Programming](https://doc.qt.io/qt-6/model-view-programming.html)
- [Suite di esempi Qt Widgets](https://doc.qt.io/qt-6/examples-widgets.html)
