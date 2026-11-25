Clojure è un dialetto di Lisp sulla JVM che tratta la programmazione funzionale come impostazione predefinita: dati immutabili, funzioni come valori e codice che è a sua volta una struttura dati. Non ha classi né stato mutabile sparso, e ciò rende i programmi Clojure più facili da comporre, testare e parallelizzare. In questa lezione impari la sintassi, le strutture persistenti e la programmazione per trasformazioni di sequenze.

## Obiettivi

- Leggere la sintassi a parentesi e capire perché prima la forma, poi i valori.
- Riconoscere liste, vettori, mappe e set, e la loro immutabilità.
- Scrivere funzioni con `defn`, arità multiple e `let` per i binding locali.
- Trasformare dati con `map`, `filter`, `reduce` e `->`.
- Usare `if`, `cond`, `case` e `recur` senza assegnamenti.

## Sintassi e valori

Il codice Clojure è composto da forme: una lista con un simbolo in testa è una chiamata, tutto il resto sono valori. Il primo elemento decide il significato, quindi `(+ 1 2)` è una somma, mentre `(1 2 3)` è un errore perché una costante non è invocabile.

```clojure
;; i letterali hanno tipi distinti
(def nome "Ada")          ; stringa
(def punteggio 42)        ; numero (Long)
(def attivi? true)        ; simbolo che termina con ?
(def vettore [1 2 3])     ; vettore, accesso per indice
(def mappa {:a 1 :b 2})   ; mappa chiave-valore
(def insieme #{1 2 3})    ; set, elementi unici

(println (map inc vettore))   ; (2 3 4): inc è una funzione pura
(println (get mappa :b))      ; 2: get non fallisce se la chiave manca
(println (count insieme))     ; 3
```

Nessuna delle strutture qui sopra cambia: aggiungere un elemento a `vettore` produce un nuovo vettore, e quello originale resta intatto. I nomi possono contenere `?` e `!`, una convenzione per indicare predicati e funzioni con effetti collaterali.

| Forma | Esempio | Nome |
| --- | --- | --- |
| lista | `(f a b)` | chiamata o `quote` |
| vettore | `[1 2 3]` | indicizzato, aggiunta in coda |
| mappa | `{:k "v"}` | lookup destrutturato |
| set | `#{:a :b}` | appartenenza in O(1) |
| simbolo | `nome` | riferimento a un valore |

## Funzioni e controllo di flusso

`defn` dichiara una funzione; le arità multiple si esprimono con più body, e `let` crea binding locali immutabili. Il controllo di flusso è espressioni: `if`, `cond`, `case` e `when` restituiscono valori.

```clojure
(defn saluta
  "Saluta una persona, con titolo opzionale."
  ([nome] (saluta nome "ciao"))
  ([nome saluto] (str saluto ", " nome "!")))

(defn categoria [eta]
  (cond
    (< eta 13) :bambino     ; prima condizione vero
    (< eta 20) :ragazzo     ; nessun break necessario
    :else :adulto))         ; ramo di default

(defn somma-senza-ricorsione [n]
  (loop [i 1 acc 0]         ; recursione in coda, senza stack
    (if (> i n) acc (recur (inc i) (+ acc i)))))
```

Gli argomenti si destrutturano: `{:keys [nome eta]}` estrae chiavi da una mappa, `[testa & coda]` separa il primo elemento dal resto. Le funzioni sono valori, quindi si passano come argomenti e si compongono con `comp` e `partial`.

```clojure
(defn normalizza [{:keys [nome eta]}]
  {:nome (clojure.string/lower-case nome)
   :maggiorenne (>= eta 18)})

(def pulisci (comp clojure.string/trim clojure.string/lower-case))

(println (normalizza {:nome "Ada" :eta 30}))
(println (pulisci "  Ada  ")) ; "ada"
```

## Strutture persistenti e sequenze

Le collezioni sono persistenti: le operazioni restituiscono nuove versioni condivise in memoria, quindi copiare costa poco. `assoc`, `update` e `dissoc` creano nuove mappe senza mutare quella di partenza, e questo è alla base della programmazione concorrente senza lock.

```clojure
(def utenti {:ada {:eta 30} :bob {:eta 17}})

(def aggiornati
  (update-in utenti [:bob :eta] inc)) ; nuova mappa, utenti invariata

(println (:bob utenti))        ; {:eta 17}
(println (:bob aggiornati))    ; {:eta 18}
(println (keys utenti))        ; (:ada :bob)
```

Le sequenze sono viste pigre su collezioni: `map`, `filter` e `take` costruiscono pipeline che calcolano solo ciò che serve. `reduce` consuma la sequenza e produce un valore, mentre `->` e `->>` incanalano il risultato della forma precedente nel primo o nell'ultimo argomento.

```clojure
(def vendite [{:prodotto :a :qta 2} {:prodotto :b :qta 5} {:prodotto :a :qta 1}])

(def totali
  (->> vendite
       (map :qta)              ; (2 5 1)
       (filter #(> % 1))       ; (2 5)
       (reduce +)))            ; 7

(println totali)
(println (take 3 (range)))     ; (0 1 2): sequenza infinita, valutata pigramente
```

## Dati, concurrency e strumenti

Clojure separa gli stati dalle identità: un `atom` è un contenitore mutabile con cambi controllati da `swap!`, e le collezioni dentro restano immutabili. Per l'I/O e le API Java si usa l'interoperabilità: `(.length s)` chiama un metodo Java, e `doto` esegue più chiamate sullo stesso oggetto.

```clojure
(def contatore (atom 0))

(swap! contatore inc)          ; aggiornamento atomico
(swap! contatore + 41)         ; nessun lock esplicito
(println @contatore)           ; 42, dereferenziazione con @

(def sb (doto (StringBuilder.) (.append "a") (.append "b")))
(println (str sb))             ; "ab"
```

| Stato | Costrutto | Uso |
| --- | --- | --- |
| valore immutabile | `def`, `let` | dati e calcoli puri |
| stato condiviso | `atom` + `swap!` | contatori, cache |
| riferimento coordinato | `ref` + `dosync` | transazioni |
| elaborazione asincrona | agent | aggiornamenti serializzati |

## Errori comuni

- **Trattare le parentesi come blocchi di istruzioni**: le parentesi delimitano una forma; ogni forma è un'espressione con un valore.
- **Usare `def` dentro una funzione**: crea una variabile globale e rompe la purezza; per i locali serve `let`.
- **Mutare una mappa con `assoc!` su una collezione persistente**: `assoc!` è per strutture transitorie interne; usa `assoc` e riassegna il risultato.
- **Chiamare `map` solo per effetti collaterali**: le sequenze sono pigre e gli effetti potrebbero non avvenire; usa `doseq` o `run!`.
- **Ignorare la recursione in coda**: una ricorsione profonda senza `recur` consuma stack; opta per `recur` o per `reduce`.

## In sintesi

Clojure fa dell'immutabilità la regola e del codice-dato la sua unità: le forme sono liste, le collezioni sono valori persistenti. Funzioni pure, sequenze pigre e threading con `->` rendono le trasformazioni leggibili. Lo stato esiste, ma è confinato in pochi costrutti come `atom` e sicuro di default. Chi conosce Lisp ritrova la sintassi, chi viene da Java ritrova la JVM e un ecosistema maturo.

## Fonti

- [Clojure - Learn Syntax](https://clojure.org/guides/learn/syntax) — panoramica ufficiale delle forme e dei valori.
- [Clojure - Learn Functions](https://clojure.org/guides/learn/functions) — `defn`, arità multiple e destrutturazione.
- [Clojure - Learn Flow and Threading](https://clojure.org/guides/learn/flow) — `if`, `cond`, `recur` e operatori `->`.
- [Clojure - Reference: Reader](https://clojure.org/reference/reader) — regole complete di lettura della sintassi.
- [Clojure - Rationale](https://clojure.org/about/rationale) — motivazioni di progetto dietro immutabilità e Lisp.
