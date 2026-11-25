Dart dichiara di essere compilato in due modi: con una VM che esegue bytecode e supporta hot reload in sviluppo, e con un compilatore AOT che produce codice macchina per Android, iOS e desktop. Le stesse API di `package:flutter` girano sopra un motore di rendering, normalmente Impeller su mobile, che disegna con Skia o con un backend grafico proprio; sul desktop e sul web la catena cambia ancora. In questa lezione guardi sotto il cofano: isolate, event loop, differenza tra attesa sincrona e asincrona, Impeller, hot reload e il pacchetto flutter_lints, cioè l'ecosistema che tiene in piedi un progetto.

## Obiettivi

- Spiegare come Flutter disegna un frame e perché il jank dipende dal main isolate.
- Usare `compute` e `Isolate.run` per spostare lavoro costoso fuori dal thread UI.
- Usare `ChangeNotifier` con `ListenableBuilder` come gestione dello stato minima e testabile.
- Distinguere hot reload, hot restart e rebuild completo, e configurare `analysis_options.yaml` con `flutter_lints`.

## Un frame, quattro fasi

Il motore invia un segnale verticale (vsync) al main isolate; la pipeline esegue in ordine build, layout, paint, compositing. Se la somma supera il budget del refresh, il frame viene scartato: a 120 Hz hai 8,3 ms, a 60 Hz 16,6 ms. Impeller è il renderer predefinito su iOS e Android da Flutter 3.10 e oltre, compila gli shader all'avvio invece di generarne di nuovi durante il disegno, e questo elimina la maggior parte delle compilazioni di shader a runtime che un tempo causavano scatti al primo ingresso in una schermata.

| Fase | Cosa succede | Attore | Sintomo se lenta |
| --- | --- | --- | --- |
| build | ricostruzione dei widget sporchi | main isolate | `MaterialApp` ricostruito inutilmente, schermo che "salta" |
| layout | vincoli e dimensioni | RenderObject | `RenderFlex overflowed`, rilayout a catena |
| paint | disegno su layer | RenderObject | scie e frame incompleti |
| compositing | unione dei layer sulla GPU | raster thread | jank con gradienti, ombre, clipping complesso |

Il main isolate gestisce anche l'event loop e tutta la logica applicativa: parsing, ordinamenti, `jsonDecode` su file grandi. Tutto questo compete con il budget dei 16,6 ms, e spostarlo in un altro isolate è la prima ottimizzazione da provare.

## Isolate ed event loop

Dart non ha thread condivisi: ogni isolate ha il proprio heap e comunica per messaggi copiati. La differenza con il classico "main thread bloccato" è che mentre aspetti un `Future` il thread non è bloccato, ma resta occupato finché non finisci il lavoro sincrono.

```dart
import 'dart:async';
import 'dart:convert';
import 'dart:isolate';

Future<void> main() async {
  final testo = await File('voci.json').readAsString(); // I/O: non blocca
  final decode = await Isolate.run(() => jsonDecode(testo)); // CPU: altro isolate
  print((decode as List).length);

  Timer(const Duration(milliseconds: 200), () => print('tick')); // microtask vs timer
  scheduleMicrotask(() => print('microtask prima del timer'));
}
```

| Meccanismo | Chi lo esegue | Quando usarlo |
| --- | --- | --- |
| `await Future` | main isolate, event queue | I/O di rete, file, piattaforma |
| `scheduleMicrotask` | main isolate, prima della prossima iterazione | propagazione di callback interne |
| `Isolate.run(fn)` | isolate nuovo, autodistrutto | elaborazione CPU su dati piccoli o medi |
| `compute(fn, arg)` | isolate di lavoro con più richieste | helper sopra `Isolate.run`, richiede argomento serializzabile |
| `ReceivePort`/`SendPort` | comunicazione esplicita | worker persistenti con stato proprio |

`Isolate.run` accetta una funzione che cattura variabili solo se sono trasferibili: oggetti che non possono essere copiati, come controlli nativi, producono un errore chiaro. Per dati grandi, il costo di copia per messaggi può annullare il guadagno: fai misurare con DevTools prima di moltiplicare gli isolate.

## Dalla logica al widget: ChangeNotifier

La documentazione ufficiale propone per le app piccole un `ChangeNotifier` esposto tramite `AnimationController`-style listener o `ListenableBuilder`. Il punto è separare il modello dal widget, così il modello si testa con `flutter test` senza pompa di rendering.

```dart
import 'package:flutter/material.dart';

class Agenda extends ChangeNotifier {
  Agenda(this._voci);
  final List<String> _voci;
  int _fatte = 0;

  List<String> get voci => List.unmodifiable(_voci);
  int get fatte => _fatte;

  void segna(String voce) {
    if (_voci.remove(voce)) {
      _fatte++;
      notifyListeners();
    }
  }
}

class ElencoAgenda extends StatelessWidget {
  const ElencoAgenda({super.key, required this.agenda});
  final Agenda agenda;

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: agenda,
      builder: (context, _) => Column(
        children: [
          Text('${agenda.fatte} fatte'),
          for (final v in agenda.voci) ListTile(title: Text(v)),
        ],
      ),
    );
  }
}
```

`notifyListeners` deve essere chiamato dopo ogni mutazione osservabile, e `ListenableBuilder` ricostruisce solo il proprio sottoalbero: il resto dello schermo non tocca. Ogni `ChangeNotifier` va liberato con `dispose` per evitare listener che si accumulano tra una schermata e l'altra.

## Hot reload, hot restart, rebuild

`flutter run` in modalità debug tiene la VM collegata all'app. "r" esegue hot reload (ricompila le modifiche, riapplica il codice e richiama `build` mantenendo lo stato di `State`), "R" esegue hot restart (riavvia l'isolate, azzera lo stato), "q" chiude. In VS Code le stesse azioni sono in "Flutter Hot Reload / Hot Restart".

| Modifica | Hot reload basta? |
| --- | --- |
| testo, colori, widget | sì |
| campi in `State` aggiunti o cambiati tipo | no: serve hot restart |
| `main()` o `initState` | no: il codice è già passato |
| pubspec con nuovi asset o plugin | no: `flutter pub get` e rebuild |
| codice nativo, `AndroidManifest.xml`, `Info.plist` | no: full rebuild |

Il debug usa la VM JIT, la release compila AOT: tempi di avvio e statistiche di performance vanno misurati in `--profile` o `--release`, mai in debug, dove gli assert e la JIT falsano profilo della CPU e memoria.

## Igiene con flutter_lints

`flutter create` aggiunge `flutter_lints` e un `analysis_options.yaml`. I lint sono parte del contratto del progetto: `use_super_parameters`, `prefer_const_constructors`, `avoid_print` intercettano gli errori tipici prima della review.

```yaml
# analysis_options.yaml
include: package:flutter_lints/flutter.yaml
analyzer:
  errors:
    invalid_annotation_target: ignore
  exclude:
    - "**/*.g.dart"
linter:
  rules:
    prefer_single_quotes: true
    require_trailing_commas: true
```

```bash
flutter analyze
dart format --output=none --set-exit-if-changed lib test
flutter test
```

Nelle pipeline CI questi tre comandi, nell'ordine, bloccano il merge su errore di analisi, formato o test. `dart fix --apply` applica correzioni automatiche per buona parte dei lint meccanici, evitando riscritture manuali.

## Debugging e test in pratica

DevTools si avvia con `flutter run` e "d" in console oppure dal pannello dell'IDE, e serve tre viste: Performance (timeline dei frame, con la suddivisione UI thread e raster thread), Memory (crescita dell'heap e oggetti trattenuti), Widget Inspector (albero di widget con dimensione e vincoli per nodo). Il pattern che risolve più casi è "cherry pick" di una build lenta: cerchi il frame oltre i 16 ms, guardi quale fase pesa e risali al widget colpito dal `RepaintBoundary` mancante o dal `build` troppo carico.

Sul fronte test, Flutter distingue unit test, widget test e integration test. I widget test girano con `testWidgets` su un ambiente simulato senza emulatore e sono il costo/beneficio migliore per schermate e form.

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('il pulsante incrementa il contatore', (tester) async {
    var valore = 0;
    await tester.pumpWidget(MaterialApp(
      home: StatefulBuilder(
        builder: (context, setState) => TextButton(
          onPressed: () => setState(() => valore++),
          child: Text('$valore'),
        ),
      ),
    ));
    expect(find.text('0'), findsOneWidget);
    await tester.tap(find.byType(TextButton));
    await tester.pump(); // un frame: elabora il setState
    expect(find.text('1'), findsOneWidget);
  });
}
```

`pump` avanza di un frame, `pumpAndSettle` ripete finché ci sono animazioni in corso: usare `pumpAndSettle` su un'animazione infinita, come un `CircularProgressIndicator`, porta il test a timeout. Per una schermata completa `WidgetTester` fornisce `tester.enterText` e `tester.drag`; per verificare le richieste HTTP si usano client falsi iniettati nel modello, non mock a livello di socket.

## Errori comuni

- **Misurare le prestazioni in debug**: la JIT e gli assert aggiungono lavoro; il profilo va fatto con `flutter run --profile` o `flutter drive --profile`.
- **`await` in un `Future.microtask` dentro `build`**: produce ricostruzioni a cascata; gli effetti collaterali vanno in `initState` o in un listener esplicito.
- **Condividere un `ChangeNotifier` senza `dispose`**: i listener restano agganciati e il test riporta leak.
- **Aspettarsi che hot reload resetti i campi nuovi**: dopo aver aggiunto un campo in `State`, il valore è nullo finché non fai hot restart.
- **Caricare JSON pesante in `initState` direttamente**: il primo frame arriva in ritardo; sposta la lettura in un isolate quando supera poche centinaia di kilobyte.
- **Ignorare `flutter analyze` in CI**: i lint diventano rumore e le vere regressioni di API passano inosservate.

## In sintesi

Il rendering di Flutter è un ciclo di build, layout, paint e compositing che deve stare dentro il budget del refresh; il main isolate è l'unico che gestisce la logica, quindi il lavoro CPU va in un isolate e l'I/O resta asincrono. `ChangeNotifier` e `ListenableBuilder` bastano come gestione dello stato quando widget e modelli sono piccoli. Hot reload accelera il ciclo di sviluppo ma non sostituisce un rebuild quando cambiano pubspec, `main` o codice nativo. I lint di `flutter_lints`, con `flutter analyze` e `dart format` in CI, trasformano le convenzioni in controlli automatici.

## Fonti

- [Flutter performance best practices](https://docs.flutter.dev/perf/best-practices)
- [DevTools - Performance view](https://docs.flutter.dev/tools/devtools/overview)
- [Flutter Testing documentation](https://docs.flutter.dev/testing/overview)
- [Dart - Concurrency and isolates](https://dart.dev/language/isolates)
