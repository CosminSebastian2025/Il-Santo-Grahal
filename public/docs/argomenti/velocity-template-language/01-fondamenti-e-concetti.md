Il Velocity Template Language (VTL) è il linguaggio che Apache Velocity legge dentro i file `.vm`: testo statico più riferimenti `$variabile`, direttive `#if`/`#foreach`/`#set`, macro e commenti. Non è un linguaggio di programmazione generalista e non viene compilato: il motore lo interpreta e lo fonde con un contesto di dati. Questa lezione copre il nucleo del linguaggio, cioè riferimenti, direttive e regole di valutazione, con i casi in cui VTL sorprende chi arriva da Java o da JavaScript; l'integrazione del motore è nella scheda dedicata a Velocity.

## Obiettivi

- Scrivere riferimenti formali e silenziosi e sapere cosa succede quando il valore manca.
- Usare le direttive `#set`, `#if`, `#foreach` e gestire il contesto degli oggetti di iterazione.
- Definire e chiamare macro con `#macro`, `#parse` e `#include`.
- Riconoscere i commenti, l'escaping di `$` e `#` e la notazione `#[[...]]#`.
- Conoscere i controlli di configurazione che cambiano la semantica del linguaggio.

## Riferimenti: come si nomina un dato

Un riferimento inizia con `$` seguito da un identificatore che comincia con una lettera; `${}` delimita il nome quando serve chiarezza, per esempio `${ordine}2026` per non confondere il nome con il testo che segue. La notazione formale `${...}` è quella raccomandata nell'evoluzione 2.x. Dopo il nome si concatenano proprietà e metodi: `$cliente.indirizzo.citta` chiama `getIndirizzo().getCitta()`, `$fattura.totale()` chiama il metodo esplicito.

| Forma | Sintassi | Comportamento se il valore manca |
| --- | --- | --- |
| riferimento classico | `$utente` | stampa il testo `$utente` |
| riferimento silenzioso | `$!utente` | stampa stringa vuota |
| notazione formale | `${utente}` | come `$utente`, nome delimitato |
| proprietà | `$fattura.cliente` | invoca il getter `getCliente()` |
| metodo | `$fattura.totale()` | invoca il metodo, argomenti tra parentesi |
| indice | `$righe.get(0)` | accesso esplicito tramite metodo |

Il VTL è tipizzato in modo dinamico ma stretto: tutta la valutazione avviene su oggetti Java, quindi `$quantita` è un `Integer`, `$prezzo` un `BigDecimal` e la somma va fatta con metodi dell'oggetto o in Java. `#set` accetta un'espressione e restituisce il valore assegnato; se l'espressione è `null` la variabile non viene creata, e in strict mode i riferimenti indefiniti diventano errori.

## Direttive e controllo di flusso

Le direttive sono istruzioni che iniziano con `#`. Le quattro che coprono quasi tutti i template reali sono `#set`, `#if`, `#foreach` e `#macro`.

```velocity
#set($iva = 0.22)
#set($totale = $imponibile * (1 + $iva))
#if($totale > 1000)
Cliente con fatturato alto: $totale
#elseif($totale > 0)
Totale: $totale
#else
Nessun importo dovuto.
#end

#foreach($riga in $righe)
  $foreach.count. $riga.articolo - $riga.quantita
#end
```

`#foreach` espone l'oggetto `$foreach` con `index` (da 0), `count` (da 1), `first`, `last`, `hasNext` e `parent` per i cicli annidati: sono gli strumenti per gestire separatori senza scrivere contatori a mano. Il tipo dell'elemento non è dichiarato, quindi `$riga.articolo` funziona solo se l'oggetto ha un getter omonimo.

| Direttiva | Uso | Nota |
| --- | --- | --- |
| `#set` | assegna una variabile al contesto del template | nessuna dichiarazione di tipo |
| `#if`/`#elseif`/`#else`/`#end` | condizioni | operatori anche in forma testuale: `eq`, `ne`, `and`, `or`, `not` |
| `#foreach`/`#end` | iterazione | `$foreach.index`, `count`, `first`, `last` |
| `#macro`/`#end` | definisce una macro | argomenti passati per valore |
| `#parse` | include e valuta un altro template | profondità predefinita 10 |
| `#include` | inserisce il testo senza valutarlo | nessuna valutazione dei `$` |
| `#stop` | interrompe il rendering | utile per uscire in anticipo |

Gli operatori relazionali e logici hanno due dizionari: `$a > $b` oppure `$a gt $b`, `$a && $b` oppure `$a and $b`. La forma testuale è utile quando il simbolo è ambiguo dentro un attributo HTML; la forma simbolica è più compatta.

## Macro, parsing e testo letterale

Una macro è un frammento nominato di template che si richiama come una direttiva. Le macro sono il modo corretto per dare sintassi riusabile ai template: intestazioni, celle, badge di stato. Da Velocity 2.0 gli argomenti sono valutati una sola volta al momento della chiamata, quindi una macro che stampa `$valore` tre volte non ricalcola il getter.

```velocity
#macro(badge stato)
#if($stato == "attivo")<span class="ok">attivo</span>
#elseif($stato == "sospeso")<span class="warn">sospeso</span>
#else<span class="ko">$!stato</span>
#end
#end

#badge($account.stato)
```

Gli spazi lasciati dalle direttive nel testo di output sono noti come *space gobbling*. VTL rimuove alcuni a capo attorno alle direttive di blocco, ma non tutti: quando il template genera un file dove la spaziatura conta (confronti in test, output in formato personalizzato) la soluzione più solida è racchiudere le parti letterali in `#[[ ... ]]#`, che il motore copia senza interpretare.

| Esigenza | Soluzione VTL |
| --- | --- |
| stampare un simbolo `$` letterale | `\$` oppure `#[[$testo]]#` |
| delimitare un nome | `${nome}` |
| silenziare un valore indefinito | `$!nome` |
| copiare un blocco con `$` e `#` | `#[[ blocco ]]#` |
| commento di una riga | `## a parte` |
| commento di blocco | `#* anche su più righe *#` |

I commenti sono parte della sintassi: un blocco `#* ... *#` può racchiudere direttive incomplete, e serve a documentare il contratto del template senza che il commento arrivi nell'output.

## Controlli che cambiano la semantica

Alcune proprietà non cambiano come si scrive VTL, ma come si comporta. Il *strict mode* (`runtime.strict_mode.enable`) rende errori i riferimenti indefiniti fuori dagli `#if`; `stringliterals.interpolate = false` disattiva l'interpolazione dentro gli apici singoli, quindi `'$testo'` resta letterale; `velocimacro.arguments.strict = true` blocca le chiamate alle macro con argomenti mancanti; `directive.parse.max_depth` limita la ricorsione di `#parse`. Con `runtime.references.strict` (l'impostazione storica) si ottiene un effetto simile ma con più eccezioni sulle operazioni su `null`.

```velocity
#set($sconto = 0)
#if($cliente.attivo)
  #set($sconto = 10)
#end
#if($sconto > 0)
  Sconto fedelta: $sconto%
#end
```

Nello strict mode il `#if($sconto)` su un riferimento mai definito è l'unico caso consentito senza eccezione: serve proprio a distinguere "non c'è" da "è `null`", mentre `$!sconto` evita l'eccezione anche quando il valore esiste ma è `null`. Una variabile creata con `#set` dentro un `#if` o un `#foreach` resta visibile dopo il blocco se è stata valorizzata almeno una volta, ed è una delle differenze meno intuitive per chi arriva da un linguaggio a scoping stretto.

## Errori comuni

- **Scrivere `$cliente.nome` su un `null`**: la catena va spezzata con `$!cliente.nome` oppure protetta con `#if($cliente)`.
- **Confondere `#include` e `#parse`**: `#include` incolla il testo senza valutarlo, quindi i `$` interni restano simboli.
- **Usare l'indicizzazione `$righe[0]`**: VTL non ha la sintassi delle parentesi quadre; su una `List` si usa `$righe.get(0)` e gli array Java si espongono come lista dal contesto.
- **Assumere la presenza delle variabili locali dopo `#foreach`**: la variabile di ciclo vive dentro il blocco.
- **Contare sulla spaziatura dell'output**: `#if` e `#foreach` consumano il proprio a capo solo in alcuni casi; per output sensibili usa `#[[...]]#` o test di output.
- **Dimenticare che `#` può comparire fuori da una direttiva**: `#hash` in un testo è testo, ma `#set` seguito da un a capo su una riga appare come direttiva e va commentato.

## In sintesi

VTL è un linguaggio di template con un nucleo piccolo: riferimenti con `$`, direttive con `#` e testo copiato così com'è. La sua potenza viene dall'oggetto collegato al contesto, non dalla sintassi: `$fattura.totale()` può essere un calcolo complesso oppure un semplice getter, e il template non lo sa. Le differenze tra "silenzioso" e "strict" decidono se un errore è un'eccezione o una cella vuota; le macro evitano la duplicazione; `#[[...]]#` e l'escaping risolvono i casi ambigui.

## Fonti

- [Apache Velocity - VTL Reference](https://velocity.apache.org/engine/2.3/vtl-reference.html)
- [Apache Velocity - User Guide](https://velocity.apache.org/engine/2.3/user-guide.html)
- [Apache Velocity - Configuration Reference](https://velocity.apache.org/engine/devel/configuration.html)
- [Apache Velocity - Engine](https://velocity.apache.org/engine/2.3/)
