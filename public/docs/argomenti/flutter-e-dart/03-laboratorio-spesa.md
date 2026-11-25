In questo laboratorio costruisci `spesa`, un'app Flutter che gestisce una lista della spesa con stato condiviso, salvataggio locale, codice testato e una build di release. Il percorso segue quello di un'app reale: crei il progetto, separi il modello dai widget, scrivi i test del modello e del widget, gestisci l'asincronia del caricamento e verifichi l'app in modalità profile. Alla fine hai un'app con una schermata lista, una schermata dettaglio e test che girano in CI.

## Obiettivi

- Creare il progetto con `flutter create` e aggiungere solo le dipendenze necessarie.
- Scrivere un modello con `ChangeNotifier` e testarlo senza rendering.
- Collegare il modello all'albero con `ListenableBuilder` e aprire una schermata di dettaglio con `Navigator`.
- Persistere la lista su disco e gestire gli errori del caricamento asincrono.
- Eseguire widget test, verificare la performance del primo avvio e generare un bundle di release.

## Passo 1: progetto e contratto dell'app

| Elemento | Scelta | Motivo |
| --- | --- | --- |
| nome e org | `spesa`, `it.esempio` | bundle ID stabile su Android e iOS |
| piattaforme | `android,ios` | meno rumore di cartelle da versionare |
| stato | `ChangeNotifier` esposto da un `InheritedNotifier` | nessuna dipendenza esterna |
| persistenza | file JSON in `getApplicationDocumentsDirectory` | leggibile e ispezionabile nei test |
| test | unit test del modello, widget test della lista | copre logica e interazione |
| release | `flutter build appbundle` e `flutter build ipa` | formati di pubblicazione standard |

```bash
flutter create --org it.esempio --platforms=android,ios spesa
cd spesa
flutter pub add path_provider
flutter pub get
flutter run
```

`path_provider` è un plugin nativo: dopo l'aggiunta serve un rebuild completo, non un hot reload. Controlla `flutter doctor -v` prima di compilare iOS, perché CocoaPods incompleto è la causa più frequente di `pod install` fallito.

## Passo 2: il modello, senza widget

Il modello tiene le voci, sa aggiungerne e rimuoverne, espone una vista immutabile e salva su disco con debounce, così dieci tap in un secondo producono un solo write.

```dart
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';

class Articolo {
  const Articolo({required this.nome, this.quantita = 1});
  final String nome;
  final int quantita;

  Map<String, Object> toJson() => {'nome': nome, 'quantita': quantita};
  factory Articolo.fromJson(Map<String, dynamic> j) =>
      Articolo(nome: j['nome'] as String, quantita: j['quantita'] as int);
}

class Spesa extends ChangeNotifier {
  Spesa(this._file);
  final File _file;
  final List<Articolo> _voci = [];
  Timer? _salvataggio;

  List<Articolo> get voci => List.unmodifiable(_voci);

  Future<void> carica() async {
    if (!await _file.exists()) return;
    final dati = jsonDecode(await _file.readAsString()) as List<dynamic>;
    _voci
      ..clear()
      ..addAll(dati.map((e) => Articolo.fromJson(e as Map<String, dynamic>)));
    notifyListeners();
  }

  void aggiungi(Articolo a) {
    _voci.add(a);
    _pianificaSalvataggio();
    notifyListeners();
  }

  void _pianificaSalvataggio() {
    _salvataggio?.cancel();
    _salvataggio = Timer(const Duration(milliseconds: 400), _scrivi);
  }

  Future<void> _scrivi() =>
      _file.writeAsString(jsonEncode(_voci.map((v) => v.toJson()).toList()));

  Future<void> salvaOra() async {
    _salvataggio?.cancel();
    await _scrivi();
  }

  @override
  void dispose() {
    _salvataggio?.cancel();
    super.dispose();
  }
}
```

Due dettagli di Dart che qui contano: `jsonDecode` restituisce `dynamic`, e ogni cast `as` deve corrispondere al tipo reale del JSON, altrimenti l'eccezione arriva in `carica` e va gestita. Il salvataggio immediato è `salvaOra()`, un metodo dell'app e non un override di `ChangeNotifier`: nei test si usa per non attendere il debounce, e va chiamato anche quando l'app passa in background, per esempio con un `WidgetsBindingObserver` sulla lista.

## Passo 3: schermate, navigazione e stato condiviso

```dart
import 'package:flutter/material.dart';

class SpesaScope extends InheritedNotifier<Spesa> {
  const SpesaScope({super.key, required Spesa spesa, required super.child})
      : super(notifier: spesa);

  static Spesa of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<SpesaScope>()!.notifier!;
}

class ListaScreen extends StatelessWidget {
  const ListaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final spesa = SpesaScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text('${spesa.voci.length} articoli')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => spesa.aggiungi(const Articolo(nome: 'Pane')),
        child: const Icon(Icons.add),
      ),
      body: ListView.builder(
        itemCount: spesa.voci.length,
        itemBuilder: (context, i) {
          final voce = spesa.voci[i];
          return ListTile(
            key: ValueKey('${voce.nome}-$i'),
            title: Text(voce.nome),
            subtitle: Text('x${voce.quantita}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => DettaglioScreen(articolo: voce)),
            ),
          );
        },
      ),
    );
  }
}
```

`dependOnInheritedWidgetOfExactType` iscrive il widget interessato alle notifiche dell'`InheritedNotifier`: quando `notifyListeners` scatta, solo i widget che hanno chiamato `of` vengono ricostruiti. Il `ValueKey` è obbligatorio quando le voci possono cambiare ordine, altrimenti lo stato di una schermata figlia finisce attaccato a un'altra voce.

## Passo 4: test del modello e del widget

Il modello si testa con `flutter_test` e un file temporaneo, senza emulatore. Il widget test verifica il flusso tap → contatore.

```dart
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:spesa/spesa.dart';

void main() {
  test('aggiunge e salva su file', () async {
    final dir = await Directory.systemTemp.createTemp('spesa');
    final spesa = Spesa(File('${dir.path}/spesa.json'));
    spesa.aggiungi(const Articolo(nome: 'Latte'));
    await spesa.salvaOra();
    final ricaricata = Spesa(File('${dir.path}/spesa.json'));
    await ricaricata.carica();
    expect(ricaricata.voci.single.nome, 'Latte');
  });

  testWidgets('il FAB aggiunge un articolo', (tester) async {
    final spesa = Spesa(File('unused.json'));
    await tester.pumpWidget(
      SpesaScope(spesa: spesa, child: const MaterialApp(home: ListaScreen())),
    );
    expect(find.text('0 articoli'), findsOneWidget);
    await tester.tap(find.byType(FloatingActionButton));
    await tester.pump();
    expect(find.text('1 articoli'), findsOneWidget);
  });
}
```

Nell'ambiente di test `path_provider` non è disponibile: proprio per questo il modello riceve un `File` già pronto e non chiama il plugin al suo interno. Questa è la regola generale che rende testabile un'app Flutter: le dipendenze di piattaforma si iniettano dal `main`, non si cercano dentro il modello.

## Passo 5: verifica e release

```bash
flutter analyze
dart format --output=none --set-exit-if-changed lib test
flutter test
flutter run --profile      # misura sul dispositivo reale
flutter build appbundle --release
flutter build ipa --release
```

In profile apri DevTools (tasto "d" in console) e controlla due numeri: tempo del primo frame utile dopo `runApp` e presenza di frame oltre i 16 ms durante lo scroll della lista. Se la lista scatta con qualche centinaio di voci, controlla prima che `itemBuilder` non faccia parsing o ordinamenti, poi se il `build` ricostruisce widget foglia senza `const`. Il criterio di uscita del laboratorio è: `flutter analyze` pulito, test verdi, app che conserva le voci dopo il kill e il riavvio, e un bundle `appbundle` generato senza warning di firma (per la firma serve un keystore in `android/key.properties`, che non va versionato).

## Esercizi

1. Aggiungi la modifica della quantità nella schermata di dettaglio, con ritorno alla lista e notifica del modello aggiornata.
2. Sostituisci il file JSON con `sqflite`: cosa cambia nel costrutto di test, e perché il file temporaneo non basta più?
3. Introduci `provider` o `riverpod` e confronta il numero di righe cambiate rispetto a `InheritedNotifier`.
4. Rendi il caricamento robusto a JSON corrotto: scrivi il test del caso e scegli tra azzerare la lista o conservare un backup `.bak`.
5. Aggiungi un `Semantics` corretto sulle righe e un test che verifichi il label letto dagli screen reader.
6. Fai in modo che la lista conservi scroll e voci dopo il cambio di orientamento del dispositivo.

<details>
<summary>Soluzione</summary>

1. La schermata di dettaglio riceve il modello da `SpesaScope.of` e chiama un metodo `impostaQuantita(nome, q)`, che aggiorna la voce, pianifica il salvataggio e notifica.
2. `sqflite` richiede un percorso dal plugin: nei test si usa `sqflite_common_ffi` con un database in memoria, e la logica di query si isola dietro un'interfaccia per restare testabile.
3. Con `provider` il modello diventa `ChangeNotifierProvider` e la lettura `context.watch<Spesa>()`; le modifiche si concentrano in `main`, ma le righe risparmiate sono poche in un'app di questa dimensione.
4. `carica` cattura `FormatException`, rinomina il file in `.bak` e parte con lista vuota; il test scrive `{` non chiuso e verifica che non venga lanciata un'eccezione.
5. `Semantics(label: 'Pane, quantità 2', button: true)` sulla riga, e `tester.getSemantics(find.byKey(...))` nel test.
6. La lista deve stare in un `Scaffold` con `AutomaticKeepAliveClientMixin` sul body, oppure spostare lo `ScrollController` nello stato sopra il cambio di orientamento: ricostruire l'albero da zero perde la posizione, mentre il modello salvato su file conserva le voci.

</details>

## Errori comuni

- **Chiamare `path_provider` dentro il modello**: il test fallisce per `MissingPluginException`, perché il canale nativo non esiste nell'ambiente dei test.
- **Costruire `Timer` e non annullarli in `dispose`**: dopo la chiusura della schermata il timer scrive su un oggetto smontato e il test segnala `Timer still pending`.
- **Usare `pumpAndSettle` con il debounce a 400 ms**: il test attende fino a timeout se il timer è periodico; preferisci `pump(Duration(...))`.
- **Lasciare un `Future` di `carica` senza `await` nel `main`**: la prima schermata mostra la lista vuota e non si aggiorna, perché la notifica arriva dopo che il widget è già stato costruito una volta sola.
- **Generare il bundle senza controllare la firma**: l'app si installa in sviluppo ma non su Play Store; `flutter build appbundle` senza keystore usa la chiave di debug.

## In sintesi

Un'app Flutter solida separa tre cose: modello puro con dipendenze iniettate, widget che leggono il modello da un `InheritedNotifier`, e test che non toccano la piattaforma. La persistenza con `File` più debounce è sufficiente per centinaia di voci, e il passaggio a SQLite si fa dietro un'interfaccia per non rompere i test. La verifica del laboratorio è tutta ripetibile da terminale: analisi, formato, test, profile sul dispositivo e bundle firmato.

## Fonti

- [Flutter - State management](https://docs.flutter.dev/data-and-backend/state-mgmt/intro)
- [Flutter Testing documentation](https://docs.flutter.dev/testing/overview)
- [Flutter - Build and release an Android app](https://docs.flutter.dev/deployment/android)
- [Flutter - Performance best practices](https://docs.flutter.dev/perf/best-practices)
