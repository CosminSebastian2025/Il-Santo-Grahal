Pascal non è solo un linguaggio storico: Free Pascal e Delphi sono ancora usati per applicazioni desktop native, strumenti a riga di comando e sistemi legacy in produzione. L'ecosistema è più piccolo di quelli mainstream ma è coerente, con compilazione veloce e un binario autonomo per ogni piattaforma. In questa lezione vedi gli strumenti, i test e i casi d'uso reali in cui Pascal conviene ancora.

## Obiettivi

- Installare Free Pascal e organizzare un progetto con unità e programmi.
- Distinguere i dialetti `fpc` e `objfpc` e capire quando usarli.
- Scrivere test automatici con FPCUnit e integrarli in un comando unico.
- Riconoscere i casi d'uso reali: desktop, CLI, sistemi legacy.
- Valutare costi e benefici rispetto a linguaggi più diffusi.

## Toolchain: compilatore, IDE e librerie

| Strumento | Ruolo | Comando |
| --- | --- | --- |
| `fpc` | compilatore Free Pascal | `fpc -O2 main.pas` |
| `lazbuild` | build dei progetti Lazarus | `lazbuild progetto.lpi` |
| Lazarus | IDE con designer visuale | avvio grafico |
| `fpcres` | compilatore di risorse | integrato in Lazarus |
| FPCUnit | framework di test unitari | regole `testcase` |
| Delphi | compilatore commerciale Object Pascal | compilatore in IDE |

Free Pascal è multipiattaforma (Windows, Linux, macOS, BSD) e compila sia programmi sia unità. La sintassi dipende dal dialetto scelto con `-M`: `fpc` per compatibilità con Turbo Pascal, `objfpc` per il dialetto moderno con classi e overloading. Per codice nuovo usa `-Mobjfpc`, `-Sh` per le funzionalità estese e `-Cr` per i controlli di range.

```bash
fpc -Mobjfpc -Sh -Cr -O2 main.pas
fpc -iV          # versione del compilatore
```

Il modello di build è diretto: senza registry e gestori di pacchetti, le dipendenze vivono in unità locali, `fpc.cfg` e librerie installate con FPC. Il risultato è un eseguibile autonomo, comodo per distribuire uno strumento su macchine senza installazioni.

## Unità e struttura del progetto

Un'unità incapsula codice riusabile: dichiarazione `interface` visibile all'esterno e `implementation` privata. Il programma usa le unità con `uses` e non c'è un ordine di compilazione da gestire a mano.

```pascal
unit geometria;

{$mode objfpc}{$H+}

interface

function AreaCerchio(r: Double): Double;
procedure Incrementa(var n: Integer; passo: Integer);

implementation

function AreaCerchio(r: Double): Double;
begin
  AreaCerchio := Pi * r * r;
end;

procedure Incrementa(var n: Integer; passo: Integer);
begin
  n := n + passo;
end;

end.
```

`{$H+}` rende `String` una `AnsiString` gestita, `{$mode objfpc}` abilita il dialetto moderno. Per i progetti piccoli conviene un'unità per dominio più un programma sottile; per quelli grandi un `.lpi` affida a Lazarus la gestione di pacchetti e dipendenze grafiche.

## Testing e qualità

FPCUnit è il framework di test incluso nella distribuzione: si dichiarano `TTestCase` con metodi `procedure Test...;` e si eseguono con un runner console o grafico.

```pascal
unit TestGeometria;

{$mode objfpc}{$H+}

interface

uses
  fpcunit, testregistry;

type
  TTestGeometria = class(TTestCase)
  published
    procedure TestAreaUnitario;
    procedure TestIncremento;
  end;

implementation

uses geometria;

procedure TTestGeometria.TestAreaUnitario;
begin
  AssertEquals('area cerchio unitario', 3.14159265358979, AreaCerchio(1.0), 1e-6);
end;

procedure TTestGeometria.TestIncremento;
var
  n: Integer;
begin
  n := 1;
  Incrementa(n, 4);
  AssertEquals(5, n);
end;

initialization
  RegisterTest(TTestGeometria);

end.
```

`AssertEquals` con tolleranza per i reali evita i fallimenti da arrotondamento. Il runner console si ottiene con il programma `console/testrunner` distribuito con FPCUnit, che esce con codice diverso da zero se un test fallisce: perfetto per uno script di CI.

```bash
fpc -Mobjfpc TestGeometria.pas
./TestGeometria --format=plain
```

Sul versante qualità, il compilatore dispone di controlli runtime: `-Cr` (range), `-Co` (overflow), `-Ct` (uso di variabili non inizializzate) e `-gl -gh` (linee e heap). Abilitali nei test, disattivali solo nella build di rilascio.

## Casi d'uso e integrazione

| Ambito | Esempio | Perché Pascal |
| --- | --- | --- |
| Desktop nativo | Lazarus con LCL | un binario per Windows o Linux senza VM |
| CLI di servizio | tool di migrazione dati | avvio rapido e nessuna dipendenza |
| Sistemi legacy | programmi didattici e industriali | manutenzione di codice esistente |
| Insegnamento | algoritmi e strutture dati | sintassi esplicita e compilatore severo |

L'integrazione con altri linguaggi richiede più lavoro che in JavaScript o Python: FPC dichiara librerie C con `external`, e una libreria compilata con `-fPIC` si carica da Python con `ctypes`. Mancando binding ufficiali per la maggior parte dei servizi cloud, per un'API HTTP conviene un wrapper in un linguaggio con ecosistema web, salvo chiamate semplici con `fphttpclient`.

Il dialetto Delphi conta per la manutenzione delle applicazioni esistenti: molta sintassi è compatibile con `-Mdelphi`, ma le librerie commerciali non hanno equivalenti completi in Free Pascal.

## Errori comuni

- **Iniziare un progetto senza `-Mobjfpc`**: il compilatore usa il dialetto classico e rifiuta classi o overload moderni.
- **Aggiungere dipendenze copiando file ovunque**: senza una struttura di unità e pacchetti, la build diventa non riproducibile.
- **Testare reali con `AssertEquals` senza tolleranza**: la firma a tre argomenti confronta esattamente e fallisce per arrotondamento.
- **Compilare con i controlli disattivati in sviluppo**: errori di range diventano bug silenziosi e non riproducibili.
- **Pensare a Pascal solo come didattico**: si perde l'uso in produzione di strumenti CLI e applicazioni desktop ancora in esercizio.

## In sintesi

L'ecosistema Pascal è compatto: Free Pascal, Lazarus per le GUI e FPCUnit per i test. Senza registry o gestori di pacchetti sofisticati il binario prodotto resta autonomo e semplice da distribuire. I casi d'uso realistici sono desktop nativo, strumenti CLI e manutenzione di sistemi legacy, dove leggibilità e compilazione rapida contano più dell'ampiezza dell'ecosistema.

## Fonti

- [Free Pascal, sito ufficiale](https://www.freepascal.org/)
- [Free Pascal, vantaggi e caratteristiche del compilatore](https://www.freepascal.org/advantage.var)
- [Free Pascal, documentazione della libreria di runtime](https://www.freepascal.org/docs-html/current/rtl/index.html)
- [Lazarus, FAQ ufficiale del progetto](https://wiki.freepascal.org/Lazarus_Faq)
