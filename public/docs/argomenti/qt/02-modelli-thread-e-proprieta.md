Qt fornisce diversi strumenti per collegare dati e interfaccia: le model/view classi per QWidget, le proprietà `Q_PROPERTY` per QML, e un sistema di traduzione basato sul contesto. Mettere insieme questi pezzi è il lavoro quotidiano in un'applicazione Qt reale: una tabella che mostra un database, un form che si aggiorna quando cambia un modello, una UI che aspettando un'operazione lunga non si blocca. In questa lezione costruisci il livello di modello e threading che regge un'applicazione desktop seria.

## Obiettivi

- Implementare un `QAbstractTableModel` e collegarlo a `QTableView` senza duplicare i dati.
- Dichiarare proprietà con `Q_PROPERTY` per esporle a QML e a Qt Designer.
- Spostare il lavoro costoso in un worker su `QThread` e comunicare con segnali accodati.
- Preparare le stringhe alla traduzione con `tr()` e `QTranslator`.
- Usare il sistema di risorse `.qrc` per icone e QML dentro eseguibile.

## Modelli, viste e indici

Qt separa i dati (modello) dalla presentazione (vista). `QAbstractTableModel` richiede almeno `rowCount`, `columnCount` e `data`; la vista non copia i dati ma chiama il modello per gli indici visibili. Il ruolo è il tipo di informazione richiesta: `DisplayRole` per il testo, `TextAlignmentRole` per l'allineamento, `ForegroundRole` per il colore.

```cpp
// modellospesa.h
#include <QAbstractTableModel>
#include <QVector>

struct Riga { QString nome; int quantita; bool comprato; };

class ModelloSpesa : public QAbstractTableModel {
    Q_OBJECT
public:
    using QAbstractTableModel::QAbstractTableModel;

    int rowCount(const QModelIndex &parent = {}) const override { return parent.isValid() ? 0 : m_righe.size(); }
    int columnCount(const QModelIndex &parent = {}) const override { return parent.isValid() ? 0 : 3; }

    QVariant data(const QModelIndex &i, int ruolo) const override {
        if (!i.isValid()) return {};
        const Riga &r = m_righe.at(i.row());
        switch (ruolo) {
        case Qt::DisplayRole:
            if (i.column() == 0) return r.nome;
            if (i.column() == 1) return r.quantita;
            return r.comprato ? QStringLiteral("sì") : QStringLiteral("no");
        case Qt::CheckStateRole:
            if (i.column() == 2) return r.comprato ? Qt::Checked : Qt::Unchecked;
            return {};
        default:
            return {};
        }
    }

    bool setData(const QModelIndex &i, const QVariant &v, int ruolo) override {
        if (!i.isValid() || ruolo != Qt::CheckStateRole || i.column() != 2) return false;
        m_righe[i.row()].comprato = v.toInt() == Qt::Checked;
        emit dataChanged(i, i, {Qt::DisplayRole, Qt::CheckStateRole});
        return true;
    }

    void aggiungi(const Riga &r) {
        const int ultima = m_righe.size();
        beginInsertRows({}, ultima, ultima);
        m_righe.append(r);
        endInsertRows();
    }

private:
    QVector<Riga> m_righe;
};
```

`beginInsertRows`/`endInsertRows` non sono formalità: senza, la vista tiene indici persistenti e selezioni riferiti a righe che non esistono più, e il crash arriva quando l'utente seleziona una riga. Lo stesso vale per `beginRemoveRows`, `beginResetModel` e `beginMoveRows`. Ogni modifica fatta fuori da queste coppie è un bug nel contratto del modello.

| Metodo | Scopo | Obbligatorio |
| --- | --- | --- |
| `data` | valore per indice e ruolo | sì |
| `setData` + `flags` | editing | per tabelle modificabili |
| `headerData` | intestazioni di colonna | consigliato |
| `sort` | ordinamento in vista | se la vista è ordinabile |
| `roleNames` | ruoli visibili a QML | per modelli usati in QML |

## Proprietà e QML

Un `Q_PROPERTY` espone una proprietà con getter, setter e notifica. Il `NOTIFY` è obbligatorio per le binding: QML collega l'espressione al segnale e la rivaluta quando è emesso.

```cpp
class Riepilogo : public QObject {
    Q_OBJECT
    Q_PROPERTY(int totale READ totale NOTIFY totaleCambiato)
    Q_PROPERTY(bool caricamento READ caricamento NOTIFY caricamentoCambiato)
public:
    int totale() const { return m_totale; }
    bool caricamento() const { return m_caricamento; }
signals:
    void totaleCambiato();
    void caricamentoCambiato();
private:
    int m_totale = 0;
    bool m_caricamento = false;
};
```

In QML `text: "Totale: " + riepilogo.totale` si aggiorna da sola solo se la proprietà ha `NOTIFY` e il setter emette il segnale. Un `Q_PROPERTY` senza `NOTIFY` compila ma la binding non si ricalcola mai: è l'errore che fa sembrare QML "rotto" quando in realtà manca la notifica.

## Lavoro lungo su un thread separato

Una query o un download sulla GUI freezing l'interfaccia: tutti gli eventi sono in coda sul thread principale. Il pattern canonico è un `QObject` worker spostato su un `QThread` con `moveToThread`, comunicazione solo tramite segnali.

```cpp
class Worker : public QObject {
    Q_OBJECT
public slots:
    void esegui(const QString &dbPath) {
        // lavoro lungo: nessun widget toccato qui
        QThread::sleep(2);
        emit finito(42);
    }
signals:
    void finito(int righe);
    void errore(QString messaggio);
};

// nel codice della finestra
auto *thread = new QThread(this);
auto *worker = new Worker;
worker->moveToThread(thread);
connect(thread, &QThread::finished, worker, &QObject::deleteLater);
connect(worker, &Worker::finito, this, [this](int righe) { etichetta->setText(QString::number(righe)); });
thread->start();
QMetaObject::invokeMethod(worker, "esegui", Qt::QueuedConnection, Q_ARG(QString, path));
```

Quattro regole non negoziabili: il worker non tocca la GUI, l'oggetto vive sul thread dove riceve gli eventi, `deleteLater` chiude il ciclo con `QThread::finished`, e la comunicazione tra thread è sempre accodata. `QtConcurrent::run` è più breve quando il lavoro è una funzione pura:

```cpp
QFuture<int> f = QtConcurrent::run(&calcolaRighe, path);
auto *watcher = new QFutureWatcher<int>(this);
connect(watcher, &QFutureWatcher<int>::finished, this, [this, watcher] {
    etichetta->setText(QString::number(watcher->result()));
    watcher->deleteLater();
});
watcher->setFuture(f);
```

## Traduzioni e risorse

Le stringhe visibili passano da `tr()`, che registra contesto e commento per `lupdate`. Il file `.ts` viene tradotto con Qt Linguist e compilato in `.qm` con `lrelease`; `QTranslator` carica il `.qm` all'avvio.

```cpp
QTranslator traduttore;
if (traduttore.load(QStringLiteral(":/i18n/app_it.qm"))) {
    QApplication::installTranslator(&traduttore);
}
// nel codice:  pulsante->setText(tr("Aggiungi voce"));
```

Icone, QML e traduzioni si includono con un file `.qrc`: `qt_add_resources(app "risorse" PREFIX "/" FILES "...")` in CMake. Il percorso in `load(":/i18n/app_it.qm")` è quello interno alla risorsa, non quello su disco: un errore di prefisso produce `false` e l'app resta in inglese senza messaggi.

## Errori comuni

- **Aggiornare il modello senza begin/end**: selezioni e indici persistenti puntano a righe sbagliate, fino al crash.
- **Toccare widget dal worker**: il comportamento è indefinito, anche se "spesso funziona" su Linux e fallisce su Windows.
- **Dimenticare il `deleteLater` del worker**: il thread termina ma l'oggetto resta vivo sul thread morto.
- **`Q_PROPERTY` senza `NOTIFY`**: le binding QML non si aggiornano mai.
- **Usare `QString` costruite da `char*` in locale**: senza `QStringLiteral` o `u8""` si perde l'UTF-8 dipendendo dalla codifica sorgente.
- **Caricare `.qm` da un percorso assoluto di build**: funziona in sviluppo e salta in release installata; le risorse `.qrc` sono l'unica strada portabile.

## In sintesi

Un'applicazione Qt solida si costruisce su tre separazioni: dati e viste con modelli che rispettano il contratto begin/end, stato e interfaccia con proprietà notificate, lavoro pesante e GUI con thread e segnali accodati. Le traduzioni e le risorse vivono dentro l'eseguibile tramite `.qrc`, che è anche il modo per non avere percorsi relativi rotti dopo il pacchetto.

## Fonti

- [Model/View Programming](https://doc.qt.io/qt-6/model-view-programming.html)
- [QAbstractItemModel Class](https://doc.qt.io/qt-6/qabstractitemmodel.html)
- [The Property System](https://doc.qt.io/qt-6/qproperty.html)
- [Qt Quick](https://doc.qt.io/qt-6/qtquick-index.html)
