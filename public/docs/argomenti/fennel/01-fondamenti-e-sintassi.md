Fennel è un dialetto di Lisp che compila in Lua 5.1 o successivo: scrivi S-espressioni, ottieni bytecode o codice sorgente Lua eseguibile da qualsiasi interprete Lua, compreso LuaJIT. Non c'è una macchina virtuale propria né un runtime da distribuire, quindi un modulo Fennel è, a tutti gli effetti, un modulo Lua con una sintassi diversa. In questa lezione impari la sintassi di base e il modello di traduzione che rende Fennel prevedibile per chi già conosce Lua.

## Obiettivi

- Riconoscere letterali, simboli e le forme speciali principali di Fennel.
- Distinguere valori a cui un simbolo punta da simboli che restano riassegnabili.
- Usare funzioni anonime, `let`, pattern di destrutturazione e iteratori.
- Compilare ed eseguire file Fennel sapendo quale Lua viene prodotto.
- Capire la differenza tra macro, tabelle e metodi nell'idioma Fennel.

## Sintassi di base e tipo di traduzione

Tutto in Fennel è una forma tra parentesi: il primo elemento è la funzione o la forma speciale, gli altri sono argomenti. Ogni forma restituisce un valore e il corpo di una funzione è un'espressione, non una sequenza di istruzioni: Fennel non ha un `return` esplicito da scrivere obbligatoriamente, perché l'ultima espressione è il risultato.

```fennel
;; ogni forma restituisce un valore; l'ultima è il risultato
(local nome "Ada") ; immutabile, come local in Lua
(var contatore 0) ; variabile riassegnabile

(fn saluta [chi] (.. "ciao " chi))

(print (saluta nome)) ; stampa ciao Ada
(set contatore (+ contatore 1)) ; set riassegna un var
(print contatore)
```

`local` e `var` sono la sostituzione di `local` in Lua: il primo dichiara un valore che non cambierà, il secondo permette `set`. Fennel segnala con un errore di compilazione il tentativo di riassegnare un `local`, un aiuto concreto contro un bug comune nei file Lua lunghi. Le variabili globali si dichiarano in modo esplicito con `(global nome valore)`, così le scritture non dichiarate non creano stato nascosto.

| Forma Fennel | Codice Lua prodotto (indicativo) | Nota |
| --- | --- | --- |
| `(local x 1)` | `local x = 1` | immutabile |
| `(var n 0)` + `(set n 2)` | `local n = 0` / `n = 2` | mutabile |
| `(fn f [a] ...)` | `local function f(a) ... end` | funzione con nome |
| `(if c a b)` | `if c then return a else return b end` | è un'espressione |
| `(.. a b)` | `a .. b` | concatenazione |
| `(. t :campo)` | `t["campo"]` | accesso per chiave |

La compilazione è quasi uno a uno, ma i dettagli contano: `if` è un'espressione e quindi vale ovunque serva un valore, mentre in Lua avresti bisogno di una variabile ausiliaria o di un `and/or` fragile con valori falsi.

## Funzioni, destrutturazione e iteratori

Fennel favorisce funzioni brevi e dati immutabili. `let` crea binding locali visibili solo nel proprio corpo, `->` e `->>` compongono chiamate in pipeline, e la destrutturazione associa nomi a parti di una tabella. Il pattern di parametri è dichiarativo: puoi nominare solo i campi che servono.

```fennel
;; destrutturazione di una tabella con nomi per chiave
(fn riepilogo [{: nome : eta}]
  (string.format "%s ha %d anni" nome eta))

;; let limita i binding al corpo e destruttura una lista
(let [[primo secondo] [1 2 3]
      {: x : y} {:x 4 :y 5}]
  (print (riepilogo {:nome "Rex" :eta 3}))
  (print primo secondo x y))

;; iteratori: valori, ipairs-like e coppie chiave/valore
(each [i v (ipairs [10 20 30])]
  (print i v))
(each [k v (pairs {:a 1 :b 2})]
  (print k v))
```

`(fn [x] ...)` senza nome è una lambda, e dato che ogni forma è un'espressione puoi scrivere la funzione direttamente nella chiamata. I metodi usano la sintassi `(: obj :metodo arg)`, che in Lua diventa `obj:metodo(arg)`, mentre `(. obj :metodo)` legge il campo senza invocarlo. Questa distinzione esplicita evita la confusione tra punto e due punti che affligge chi impara Lua.

## Compilare ed eseguire

Il compilatore `fennel` scrive Lua: `fennel main.fnl` esegue il file, `fennel --compile main.fnl` stampa il Lua generato, `fennel -c src` compila una cartella in `.lua`. I moduli si caricano con `(require :modulo)` e il percorso deve essere raggiungibile da Lua: quando distribuisci il programma, spesso includi i `.lua` compilati e non l'interprete Fennel.

```bash
fennel --version                       # versione corrente
fennel --compile src/main.fnl           # stampa il Lua prodotto
fennel -c src --output out              # compila la cartella in piu file .lua
fennel src/main.fnl arg1 arg2           # esegue passando gli argomenti
```

| Comando | Effetto | Uso tipico |
| --- | --- | --- |
| `fennel file.fnl` | compila in memoria ed esegue | sviluppo |
| `fennel --compile file.fnl` | Lua su stdout | ispezione e debug |
| `fennel -c dir` | file `.lua` nella cartella di output | distribuzione |
| `fennel -e "(+ 1 2)"` | valuta un'espressione | prova rapida |
| `fennel --repl` | REPL interattivo | esplorazione |

Poiché l'output è Lua normale, le librerie dell'ecosistema Lua restano disponibili senza binding: `luarocks` installa moduli che Fennel importa direttamente. Il limite è noto: Fennel non può accedere a nulla che Lua non esponga, e alcune ottimizzazioni di LuaJIT richiedono codice compilato con attenzione.

## Errori comuni

- **Confondere `local` e `var`**: un `set` su un `local` è un errore di compilazione, non un nuovo binding.
- **Scrivere `return` come in Lua**: la forma `return` esiste per uscite anticipate, ma l'ultima espressione basta nella maggior parte dei casi.
- **Usare `(obj:metodo ...)`**: l'invocazione metodo in Fennel è `(: obj :metodo ...)`, e la sintassi Lua non è valida.
- **Aspettarsi che il `.fnl` parta da solo**: serve l'interprete o i `.lua` compilati; senza essi il modulo non si carica.
- **Dimenticare la funzione anonima nelle tabelle di callback**: `fn` con nome dichiara un binding locale, mentre come valore serve la lambda `(fn [x] ...)`.

## In sintesi

Fennel è una sintassi Lisp sopra Lua: niente runtime proprio, compilazione quasi uno a uno e interoperabilità totale con i moduli Lua. `local` e `var` rendono esplicito lo stato mutabile, `if` e `let` sono espressioni, e la compilazione produce codice leggibile. Gli iteratori, la destrutturazione e i metodi con `:` sono gli idiomi da imparare prima di leggere codice di altri.

## Fonti

- [Fennel - Sito ufficiale](https://fennel-lang.org/)
- [Fennel Reference](https://fennel-lang.org/reference)
- [Fennel Tutorial](https://fennel-lang.org/tutorial)
- [Fennel - Lua Primer](https://fennel-lang.org/lua-primer)
- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
