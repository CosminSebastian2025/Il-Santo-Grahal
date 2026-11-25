Qt è un framework C++ multipiattaforma per applicazioni desktop, embedded e mobile, con una propria gerarchia di oggetti, un sistema di comunicazione tra oggetti e un modo molto specifico di intendere il ciclo di vita degli oggetti GUI. Non è solo una libreria di widget: Qt fornisce anche QML, un linguaggio dichiarativo per interfacce animate, e strumenti come `moc`, `qmake` e Qt Design Studio che generano codice e metadati. In questa lezione impari le basi su cui si regge tutto il resto: oggetti, segnali e slot, gerarchia di parentela e build con CMake.

## Obiettivi

- Riconoscere la struttura di un progetto Qt 6 con CMake e i target delle librerie (`Qt6::Widgets`, `Qt6::Qml`).
- Capire `QObject`, il pattern parent-child e perché il parent libera la memoria dei figli.
- Usare segnali e slot con la sintassi a puntatori a membro, comprendendo quando serve la connection asincrona.
- Distinguere QtWidgets da Qt Quick/QML e scegliere in base ai requisiti di interfaccia.
- Leggere l'output di `moc` e sapere perché alcune classi richiedono `Q_OBJECT`.

## Cos'è Qt e come è organizzato

Qt 6 (serie corrente 6.12, LTS sulla 6.8) è suddiviso in moduli: `QtCore` per contenitori, stringhe, I/O e threading; `QtGui` per finestre, eventi e rendering; `QtWidgets` per i controlli classici; `QtQuick` e `QtQml` per le interfacce dichiarative; `QtNetwork`, `QtSql`, `QtMultimedia` per i servizi. Ogni modulo è un target CMake separato, quindi il `CMakeLists.txt` dichiara solo ciò che serve.

```cmake
cmake_minimum_required(VERSION 3.22)
project(contatore LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)          # esegue moc sui file con Q_OBJECT
set(CMAKE_AUTORCC ON)          # compila i file .qrc

find_package(Qt6 REQUIRED COMPONENTS Widgets)
qt_standard_project_setup()

qt_add_executable(contatore main.cpp contatore.cpp contatore.h)
target_link_libraries(contatore PRIVATE Qt6::Widgets)
```

`qt_standard_project_setup()` imposta `AUTOMOC`, `AUTOUIC` e `AUTORCC`; `qt_add_executable` aggiunge i flag per `WIN32` e `MACOSX_BUNDLE`. Senza `find_package` il link fallisce con simboli di `QWidget` non risolti; è l'errore di configurazione più comune nei progetti copiati da tutorial Qt 5, dove esistevano `Qt5Widgets` e `qmake`.

## QObject, parent e distruzione

Quasi tutto in Qt deriva da `QObject`. Il costruttore accetta un puntatore al parent, e quando un `QObject` viene distrutto distrugge i propri figli: è una gerarchia di proprietà implicita che sostituisce gran parte della gestione manuale della memoria nelle GUI. Un widget senza parent è una finestra di primo livello; un widget creato dentro un layout ha il contenitore come parent.

```cpp
#include <QApplication>
#include <QLabel>
#include <QVBoxLayout>
#include <QWidget>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    auto *finestra = new QWidget;               // top-level, nessun parent
    auto *layout = new QVBoxLayout(finestra);   // layout posseduto da finestra
    auto *etichetta = new QLabel(QStringLiteral("Pronto"), finestra); // parent: finestra

    layout->addWidget(etichetta);
    finestra->setWindowTitle(QStringLiteral("Contatore"));
    finestra->resize(320, 120);
    finestra->show();

    return app.exec();
}
```

`etichetta` ha due proprietari potenziali: il layout per la disposizione e la finestra per la distruzione; il layout non distrugge i widget, li riparenta. Per questo `delete etichetta` a mano produce un doppio `delete` quando la finestra chiude.

| Classe | Ruolo | Parent tipico |
| --- | --- | --- |
| `QApplication` | ciclo degli eventi globale | nessuno, uno solo per processo |
| `QWidget` | controllo o finestra | widget contenitore o `nullptr` |
| `QLayout` | disposizione dei figli | il widget che lo installa |
| `QTimer` | timer basato su eventi | l'oggetto che lo usa |
| `QObject` generico | logica e segnali | il servizio che lo possiede |

## Segnali e slot

Un segnale è un evento dichiarato; chi lo emette non conosce i riceventi. Uno slot è una funzione collegata: un metodo di `QObject`, una lambda con contesto o una funzione libera. La sintassi moderna usa puntatori a membro, quindi un errore di nome diventa un errore di compilazione invece di un messaggio a runtime.

```cpp
// contatore.h
#pragma once
#include <QObject>

class Contatore : public QObject {
    Q_OBJECT
public:
    explicit Contatore(QObject *parent = nullptr) : QObject(parent) {}

public slots:
    void incrementa() {
        if (m_valore < 10) emit valoreCambiato(++m_valore);
    }

signals:
    void valoreCambiato(int valore);

private:
    int m_valore = 0;
};
```

`Q_OBJECT` obbliga la classe a passare da `moc` e abilita `connect`, `tr()` e le proprietà dinamiche. Una classe che eredita `QObject` senza `Q_OBJECT` compila e non funziona: `connect` restituisce `false`.

```cpp
auto *contatore = new Contatore(finestra);
auto *etichetta = new QLabel(finestra);
connect(contatore, &Contatore::valoreCambiato, etichetta, [etichetta](int v) {
    etichetta->setText(QString::number(v));
});
```

La lambda riceve un contesto (`etichetta`): se l'oggetto muore, la connessione viene rimossa. Una lambda senza contesto resta attiva e usa puntatori dangling. Il quinto argomento di `connect` decide il trasporto: `Qt::AutoConnection` (sincrono nello stesso thread, accodato tra thread), `Qt::QueuedConnection` per forzare l'accodamento, `Qt::DirectConnection` per chiamata immediata.

## Widgets o QML

Qt offre due modi per costruire interfacce e la scelta condiziona il progetto.

| Aspetto | QtWidgets | Qt Quick / QML |
| --- | --- | --- |
| linguaggio UI | C++ | QML dichiarativo, tipi da C++ |
| rendering | stile nativo (Win32, Cocoa, GTK) | rasterizzatore Qt Quick, GPU |
| animazioni | limitate | dichiarative, con `Behavior` e `NumberAnimation` |
| target mobile | sconsigliato | pensato per touch |
| accessibilità | matura | buona, richiede `Accessible` in QML |
| tooling di design | Qt Designer (`.ui`) | Qt Design Studio, hot reload |

Form, tabelle e menu usano quasi sempre QtWidgets. Transizioni, animazioni e grafica personalizzata usano QML. Mescolare le due è possibile (`QQuickWidget`), ma raddoppia le competenze e va giustificato.

## Errori comuni

- **Dimenticare `Q_OBJECT`**: la classe compila ma i segnali non funzionano; `moc` non è invocato e `connect` restituisce `false`.
- **Chiamare `delete` su widget con parent**: il parent distruggerà il figlio e si ottiene un doppio rilascio con crash intermittente.
- **Costruire oggetti GUI prima di `QApplication`**: `QWidget` senza istanza dell'applicazione abortisce con "QWidget: Must construct a QApplication before a QWidget".
- **Usare `SIGNAL()`/`SLOT()` nei nuovi progetti**: gli errori emergono a runtime; i puntatori a membro li intercetta il compilatore.
- **Aggiornare la GUI da un thread worker**: senza `Qt::QueuedConnection` o `QMetaObject::invokeMethod` il comportamento è indefinito.
- **Dimenticare `app.exec()`**: senza ciclo degli eventi la finestra non li riceve e non si chiude.

## In sintesi

Qt è un framework basato su `QObject`: la gerarchia parent-child gestisce la vita degli oggetti GUI, i segnali e gli slot gestiscono la comunicazione senza accoppiamento, e `moc` genera il codice necessario tramite `Q_OBJECT`. Il progetto si descrive con CMake e `find_package(Qt6)`. La scelta tra QtWidgets e QML dipende dal tipo di interfaccia, non dal gusto: form e tabelle stanno bene in widget, animazioni e touch in QML.

## Fonti

- [Qt Documentation](https://doc.qt.io/)
- [Qt 6 Documentation](https://doc.qt.io/qt-6/)
- [Signals & Slots](https://doc.qt.io/qt-6/signalsandslots.html)
- [Qt for Beginners - CMake](https://doc.qt.io/qt-6/cmake-get-started.html)
