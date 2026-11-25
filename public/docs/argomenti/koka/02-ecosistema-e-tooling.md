Koka è un linguaggio funzionale compilato con un sistema di effetti, e il suo ecosistema ruota attorno al compilatore `koka`, alla libreria standard e alla documentazione interattiva. Non esiste un gestore di pacchetti esterno: si lavora con file `.kk` compilati dal toolchain e con i moduli inclusi, come `std/core`, `std/os` e `std/async`. Il sito ufficiale dichiara che Koka v3 è un linguaggio di ricerca, stabile ma non pensato per la produzione, e che mancano ancora librerie e package management. In questa lezione vedi come installare ed eseguire il compilatore, come organizzare un progetto, come testare il codice e come usare il backend JavaScript.

## Obiettivi

- Installare Koka con l'estensione di VS Code oppure con lo script ufficiale.
- Compilare ed eseguire un file `.kk` con `koka` e leggere il ciclo di build.
- Conoscere i moduli principali della libreria standard e i loro effetti.
- Scrivere test come funzioni con confronti espliciti e usarli come specifica.
- Sapere quando funziona il backend JavaScript e cosa non trasporta.

## Installazione e ciclo di lavoro

Il modo più semplice è l'estensione ufficiale per VS Code, che propone anche di installare il compilatore per Windows, macOS e Linux; in alternativa lo script ufficiale copre Linux, macOS e Windows x64.

```bash
# macOS / Linux: installa l'ultima release ufficiale
curl -sSL https://github.com/koka-lang/koka/releases/latest/download/install.sh | sh

koka                                   # REPL interattivo
koka samples/basic/caesar.kk           # compila ed esegue main
koka -O2 -o kk-rbtree samples/basic/rbtree.kk   # ottimizza, produce un binario
```

Senza argomenti il compilatore apre il REPL, dove `:l file.kk` carica un file, `:t expr` mostra il tipo e `:q` esce. Con un file compila in C e crea l'eseguibile nella cartella `.koka`, oppure al percorso indicato da `-o`.

```koka
// ciao.kk: il punto di ingresso si chiama main
fun main()
  println("Ciao, Koka")   // effetto console, dedotto dal compilatore
```

| Comando | Effetto | Nota |
| --- | --- | --- |
| `koka file.kk` | compila ed esegue | uso quotidiano |
| `koka -O2 -o out file.kk` | ottimizza e crea l'eseguibile | confronto con C++ nei benchmark |
| `:l file.kk` | carica nel REPL | prova rapida di funzioni |
| `:t expr` | mostra il tipo inferito | incluse le righe di effetto |
| `--kktime` | tempi di compilazione | utile su Windows |

## Libreria standard e struttura del progetto

La libreria `std` è divisa per argomento: `std/core` per tipi e funzioni fondamentali, `std/core/console` per input e output, `std/num/int` per gli interi, `std/os/file` per i file e `std/async` per le task. Si importano con `import` e si invocano con la dot notation, zucchero per una chiamata con il primo argomento a sinistra.

```koka
import std/os/file   // funzioni sui file

// Legge un file e conta le righe non vuote (effetti: filesys + exn)
fun contaRighe(nome : string) : <exn,filesys> int
  val testo = read-text-file(nome)
  testo.lines.filter(fn(l) { l.trim != "" }).length
```

Un progetto piccolo resta un singolo file; uno più grande si divide in moduli `.kk` compilati insieme, con la convenzione di `std/` in cui un modulo corrisponde a un nome file. Non c'è un file di manifesto.

| Modulo | Contenuto | Effetto tipico |
| --- | --- | --- |
| `std/core/console` | `println`, lettura da terminale | `console` |
| `std/core/list` | `map`, `filter` e ricorsione | effetto della funzione passata |
| `std/num/int` | interi, conversioni, `show` | `total` |
| `std/os/file` | lettura e scrittura di file | `filesys`, `exn` |
| `std/text/parse` | parser combinatori | `parse` |
| `std/async` | task e canali | `async` |

## Backend JavaScript e limiti

Il backend JavaScript usa moduli ES6 e BigInt e permette di eseguire lo stesso codice nel browser. Il trasporto però non è automatico: una funzione con effetto `filesys` non ha equivalente in un browser. Il frammento mostra la parte trasportabile, un effetto definito dall'utente con il suo handler.

```koka
// Effetto generatore: una operazione, senza valore di ritorno utile
effect emit
  fun emit(riga : string) : ()

// Handler che registra le righe emesse
fun stampaRighe() : console ()
  with ctl emit(riga)
    println("riga: " ++ riga)
    resume(())
  emit("prima")
  emit("seconda")
```

`ctl emit(riga)` intercetta l'operazione, stampa e prosegue con `resume(())`: è lo stesso schema che il libro usa per `yield`, e funziona identico nei due backend perché non tocca il sistema.

## Testing e verifica degli effetti

Koka non impone un framework di test: le funzioni si eseguono dal REPL o da VS Code, che lancia direttamente `main`, `example...` e `test...`. Per una suite minima si confrontano risultato atteso e prodotto.

```koka
import std/core/console

fun assertEq(nome : string, atteso : a, ottenuto : a) : console ()
  if atteso == ottenuto then
    println("ok   " ++ nome)
  else
    println("FAIL " ++ nome ++ ": " ++ atteso.show ++ " != " ++ ottenuto.show)

fun exampleTest()
  assertEq("somma", 5, 2 + 3)
  assertEq("lunghezza", 3, ["a", "b", "c"].length)
```

Il valore aggiunto è doppio: i test verificano il risultato e, grazie alla riga di effetto, documentano le capacità di una funzione. Una funzione dichiarata `total` che chiama `println` non compila: la firma è già un test di purezza.

## Casi d'uso e limiti

I casi d'uso realistici restano didattica, ricerca e prototipi: `std/async` è iniziale e manca un sistema di pacchetti, quindi un progetto con molte dipendenze non è il terreno naturale di Koka.

| Contesto | Buona scelta | Attenzione |
| --- | --- | --- |
| didattica di tipi ed effetti | REPL e integrazione VS Code | meno esempi online dei linguaggi mainstream |
| prototipi web | backend JavaScript | effetto `filesys` non disponibile |
| script di calcolo | `std/num` e `total` | niente package manager |
| ricerca su handlers | sintassi di prima classe | versione v3 in sviluppo |

## Errori comuni

- **Scrivere a mano un tipo di effetto senza controllarlo**: la firma è rifiutata se l'effetto inferito non è incluso; durante lo sviluppo conviene lasciarlo dedurre.
- **Aspettarsi il filesystem nel backend JavaScript**: il browser non ha `filesys`, e il tipo lo mostra solo se è scritto correttamente.
- **Confondere REPL e build**: `:l` carica un file ma non produce un eseguibile, mentre `koka file.kk` compila e linka.
- **Dimenticare i moduli importati**: `read-text-file` vive in `std/os/file`, e senza `import` l'errore è di nome non risolto.
- **Testare con sole stampe**: un test che stampa senza confronti automatici non blocca una regressione.

## In sintesi

Il toolchain si installa con l'estensione di VS Code o con lo script ufficiale e compila in C con un comando unico, più un REPL per esperimenti rapidi. La libreria `std` copre console, numeri, liste, file e concorrenza, e un progetto è l'insieme dei file `.kk` compilati insieme. I test si scrivono come funzioni con confronti espliciti e diventano specifiche degli effetti. Koka v3 è un linguaggio di ricerca: stabile, ma senza package management.

## Fonti

- [Koka - Documentation and Install](https://koka-lang.github.io/koka/doc/index.html)
- [The Koka Programming Language Book](https://koka-lang.github.io/koka/doc/book.html)
- [Koka Standard Library - Core](https://koka-lang.github.io/koka/doc/std_core.html)
- [Koka Standard Library - Console](https://koka-lang.github.io/koka/doc/std_core_console.html)
- [Koka Standard Library - Files](https://koka-lang.github.io/koka/doc/std_os_file.html)
