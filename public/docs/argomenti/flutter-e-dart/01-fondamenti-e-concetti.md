Flutter è un toolkit UI di Google che compila applicazioni per Android, iOS, web, Windows, macOS e Linux da una sola base di codice Dart, disegnando ogni pixel con il motore di rendering Skia o Impeller invece di delegare i controlli alle API native. Dart è il linguaggio che sta sotto: compilato, con null safety statica e garbage collector generazionale. Questa lezione mette in fila i concetti che spiegano perché un'app Flutter si scrive così: isolate, widget immutabili, Element e RenderObject, e lo stato di un `StatefulWidget`.

## Obiettivi

- Distinguere linguaggio (Dart), framework (Flutter) e motore di rendering, e sapere quale versione stai usando.
- Leggere un albero di widget sapendo quali nodi sono immutabili, quali ricostruiti e quali tengono stato.
- Applicare il null safety e i tipi di Dart senza ricorrere a `!` come scorciatoia.
- Gestire il ciclo di vita di `State` con `setState` e riconoscere quando serve un `InheritedWidget` o un notifier esterno.

## Tre livelli che non vanno confusi

| Livello | Cos'è | Artefatto | Comando per verificarlo |
| --- | --- | --- | --- |
| Linguaggio | Dart, con VM, compilatore AOT e tool `dart` | `pubspec.yaml`, file `.dart` | `dart --version` |
| Framework | `package:flutter`, i widget, Material e Cupertino | dipendenza in `pubspec.yaml` | `flutter --version` |
| Motore | Impeller su iOS e Android, Skia sul desktop, compilazione Wasm sul web | incluso nell'SDK | nessuno diretto |

`flutter --version` stampa la release dell'SDK e la versione Dart accoppiata: la documentazione ufficiale oggi parla di Flutter 3.50 con Dart 3.14, e la corrispondenza tra le due è fissa per ogni release. Le dipendenze si dichiarano nel `pubspec.yaml` e si risolvono su pub.dev con un lockfile (`pubspec.lock`) che va versionato in git.

```yaml
name: agenda
environment:
  sdk: ^3.14.0
dependencies:
  flutter:
    sdk: flutter
  intl: ^0.20.0
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^6.0.0
```

```bash
flutter --version
flutter create --org it.esempio --platforms=android,ios agenda
flutter pub get
flutter run
```

`flutter create` genera una cartella per ogni piattaforma (`android/`, `ios/`, `web/`) con i file host nativi, più `lib/main.dart`. Non serve aprire Xcode o Android Studio per iniziare, ma i due SDK devono essere installati e visibili: `flutter doctor` elenca cosa manca, comprese le licenze Android che si accettano con `flutter doctor --android-licenses`.

## Dart: il sottoinsieme che conta davvero

A un primo progetto Flutter servono quattro cose di Dart: variabili con inferenza e `final`, classi con costruttori nominati, null safety e asincronia con `Future`.

```dart
class Voce {
  Voce({required this.titolo, this.completata = false});
  final String titolo;
  final bool completata;

  Voce copiaCon({bool? completata}) =>
      Voce(titolo: titolo, completata: completata ?? this.completata);
}

String riassumi(List<Voce> voci) {
  final aperte = voci.where((v) => !v.completata).length;
  return '$aperte aperte su ${voci.length}';
}
```

In Dart 3 `String?` è diverso da `String`: il compilatore impedisce di chiamare metodi su un valore nullable senza prima averlo ridotto con `if (x != null)`, `?.` o un pattern. L'operatore `!` lo declassa a "non nullo" senza controllo: se usato su un valore davvero nullo il programma lancia un'eccezione a runtime. Le collezioni letterali con `final` restano mutabili, la vera immutabilità si ottiene con `const` su valori letterali.

| Costrutto | Esempio | Nota |
| --- | --- | --- |
| inferenza | `final orario = DateTime.now();` | tipo dedotto, binding immutabile |
| costante | `const gap = SizedBox(height: 8);` | valutata in compilazione, istanza condivisa |
| parametro nominato | `Voce(titolo: 'Pane')` | leggibilità agli argomenti |
| asincrono | `Future<List<Voce>> carica() async {}` | `await` solo dentro `async` |
| pattern | `switch (stato) { Stato.fatto(:final data) => ... }` | switch esaustivo sui tipi |

## Widget, Element e RenderObject

Un widget in Flutter non è un controllo vivo: è una descrizione immutabile, economica da creare. A ogni `build` la funzione restituisce un nuovo albero di widget; il framework lo confronta con l'albero di `Element` esistente e riusa i nodi quando tipo e chiave coincidono. Gli `Element` sono i nodi persistenti che legano widget e posizione nell'albero, i `RenderObject` fanno layout e disegno.

```dart
class CardVoce extends StatelessWidget {
  const CardVoce({super.key, required this.voce});
  final Voce voce;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(voce.titolo),
      subtitle: Text(voce.completata ? 'fatto' : 'da fare'),
    );
  }
}
```

Da qui tre regole pratiche. Primo: `build` deve essere pura, senza effetti collaterali e senza allocazioni costose, perché può essere chiamata molte volte al secondo. Secondo: `const` sui widget foglia riduce il lavoro di ricostruzione, perché il framework confronta l'istanza e salta il sottoalbero identico. Terzo: `key` non è decorazione, dice all'algoritmo di riconciliazione quale `Element` corrisponde a quale voce di una lista, e senza `ValueKey(id)` un riordino o una cancellazione riusano lo stato nel posto sbagliato.

Disposizione dei vincoli: ogni widget riceve dai genitori dei vincoli (`BoxConstraints`) e restituisce una dimensione; un widget non può chiedere più spazio di quanto gli è consentito. `Row`, `Column`, `Expanded` e `Flexible` sono la risposta tipica richiesta da un `RenderFlex overflowed`, l'errore più frequente nei primi schermi.

## Lo stato vive in State, non nel widget

Il widget resta immutabile, il mutabile sta in `State`. Un `StatefulWidget` è una coppia di classi: la configurazione (widget) e l'oggetto `State` che sopravvive alle ricostruzioni finché l'`Element` resta nella stessa posizione.

```dart
class Contatore extends StatefulWidget {
  const Contatore({super.key, this.iniziale = 0});
  final int iniziale;

  @override
  State<Contatore> createState() => _ContatoreState();
}

class _ContatoreState extends State<Contatore> {
  late int valore = widget.iniziale;

  @override
  void dispose() {
    super.dispose(); // qui si chiudono controller, stream e timer
  }

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: () => setState(() => valore++),
      child: Text('$valore'),
    );
  }
}
```

`setState` marca l'`Element` come sporco e pianifica un nuovo frame; tutto ciò che cambia la UI deve stare dentro la sua callback. `initState` va usato per preparare dati sincroni, `didChangeDependencies` per leggere `InheritedWidget`, `dispose` per rilasciare risorse. Quando lo stato deve essere letto da rami lontani, le opzioni sono un `InheritedWidget` personalizzato, un `ValueNotifier` con `ListenableBuilder`, oppure un package di gestione dello stato: la scelta dipende da quanti widget condividono i dati, non da una moda.

## Errori comuni

- **Aggiornare un campo di `State` senza `setState`**: la variabile cambia ma il frame non viene richiesto e la UI resta indietro.
- **Chiamare `setState` dopo `dispose`**: succede con i `Future` non attesi; controlla `if (!mounted) return;` dopo ogni `await`.
- **Riutilizzare un `State` in una lista senza `key`**: il contatore mostra i valori di un'altra riga dopo un riordino.
- **Eseguire lavoro pesante in `build`**: parsing JSON, ordinamenti o richieste di rete in `build` causano frame persi e jank.
- **Abusare di `!`**: trasforma un errore di progettazione in un crash; meglio rendere il tipo non nullo o gestire l'assenza con `if` o pattern.
- **Aggiungere pacchetti dalla documentazione invece di `flutter pub add`**: la versione scritta a mano viene risolta diversamente e il lockfile diverge.

## In sintesi

Flutter è un framework Dart che disegna la UI con un motore proprio: il linguaggio, l'SDK e il motore sono tre livelli distinti con versioni accoppiate. I widget sono descrizioni immutabili, gli `Element` conservano la posizione nell'albero e i `RenderObject` fanno layout e disegno; `const` e `key` influenzano direttamente questa riconciliazione. Lo stato mutabile vive negli oggetti `State`, `setState` pianifica il ridisegno e `dispose` chiude le risorse. Con questi quattro concetti si legge quasi ogni errore di Flutter alle prime settimane.

## Fonti

- [Flutter documentation](https://docs.flutter.dev/)
- [Dart language tour](https://dart.dev/guides/language/language-tour)
- [Flutter Widget catalog](https://docs.flutter.dev/ui/widgets)
- [Layouts in Flutter](https://docs.flutter.dev/ui/layout)
