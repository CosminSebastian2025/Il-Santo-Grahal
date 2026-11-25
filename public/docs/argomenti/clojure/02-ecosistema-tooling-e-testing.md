Un progetto Clojure si costruisce intorno alla CLI `clojure` e al file `deps.edn`: dipendenze, alias, percorsi e task vivono in un solo file di dati. In questa lezione vedi come avviare un progetto con `deps.edn`, lavorare nel REPL, aggiungere test e preparare un binario o un jar distribuibile, usando solo strumenti ufficiali.

## Obiettivi

- Inizializzare un progetto con `deps.edn` e la CLI `clojure`.
- Capire percorsi, dipendenze da Maven e Git e alias di esecuzione.
- Sviluppare in modo incrementale con il REPL e `clojure.repl`.
- Scrivere test con `clojure.test` e integrarli in CI.
- Preparare un uberjar o un'immagine nativa per la distribuzione.

## Struttura del progetto e `deps.edn`

Lo standard è un layout minimo: `src/` per il codice, `test/` per i test e `deps.edn` alla radice. Il namespace segue il percorso del file, quindi `src/app/core.clj` dichiara `(ns app.core)`.

```clojure
;; deps.edn
{:paths ["src"]
 :deps {org.clojure/clojure {:mvn/version "1.12.0"}
        org.clojure/data.json {:mvn/version "2.5.0"}}
 :aliases
 {:dev {:extra-paths ["test"]                     ; test solo in sviluppo
        :extra-deps {org.clojure/test.check {:mvn/version "1.1.1"}}}
  :run {:main-opts ["-m" "app.core"]}}}           ; clojure -X:run non serve qui
```

Gli alias sono insiemi di opzioni attivabili con due punti: `:dev`, `:test` o uno che dipende da una libreria Git. Le dipendenze Git richiedono `:git/url` e `:sha`, così una build è riproducibile.

| Comando | Effetto | Quando |
| --- | --- | --- |
| `clojure -M -m app.core` | avvia la funzione `-main` | esecuzione |
| `clojure -X:dev:test` | esegue la funzione indicata dall'alias | test e task |
| `clojure -Sdeps '{...}'` | aggiunge dipendenze temporanee | prova rapida |
| `clj` | CLI con REPL interattivo | sviluppo |
| `clojure -T:build` | invoca strumenti come `tools.build` | build |

La differenza tra `-M` e `-X` è importante: `-M` invoca una funzione `-main` con argomenti stringa, `-X` invoca una funzione con una mappa di opzioni. Confonderli è la causa più comune di alias che "non funzionano".

## REPL come ambiente principale

Il REPL è il più diffuso strumento di sviluppo: valuti forme nel contesto del progetto, cambi il codice senza riavviare e ispezioni valori reali. `require` con `:reload` ricarica un namespace dopo le modifiche, mentre `doc` e `source` mostrano documentazione e implementazione.

```clojure
(ns app.core)

(defn prezzo-totale [righe]
  (reduce + (map :prezzo righe)))

;; dentro il REPL
;; user=> (clojure.repl/doc prezzo-totale)
;; user=> (prezzo-totale [{:prezzo 3} {:prezzo 4}])   ; 7
;; user=> (require 'app.core :reload)                 ; dopo una modifica
```

Il primo avvio scarica le dipendenze e le mette in cache locale, quindi è più lento dei successivi. Lavorare per valutazioni successive consente di scoprire la forma dei dati prima di scrivere il codice definitivo.

```bash
clj
# user=> (require '[app.core :as core])
# user=> (core/prezzo-totale [{:prezzo 3} {:prezzo 4}])
# 7
# user=> (clojure.repl/doc map)
```

## Test con `clojure.test`

`clojure.test` è nella libreria standard: i test vivono in namespace paralleli al codice e si dichiarano con `deftest` e `is`. `are` riduce la ripetizione, `testing` raggruppa i casi con un messaggio descrittivo.

```clojure
(ns app.core-test
  (:require [clojure.test :refer [deftest is are testing]]
            [app.core :as core]))

(deftest prezzo-totale-test
  (testing "lista vuota"
    (is (zero? (core/prezzo-totale []))))
  (testing "somma dei prezzi"
    (is (= 7 (core/prezzo-totale [{:prezzo 3} {:prezzo 4}])))))

(deftest categorie-test
  (are [eta atteso] (= atteso (core/categoria eta))
    5  :bambino
    17 :ragazzo
    30 :adulto))
```

Per eseguire i test da riga di comando serve un alias con `test-runner`, libreria ufficiale del progetto Clojure, che dichiara namespace di test, runner e percorsi in una sola mappa. Un runner conta i risultati e restituisce un codice di uscita, prerequisito per la CI.

```clojure
;; in deps.edn
;; :test {:extra-paths ["test"]
;;        :extra-deps {io.github.cognitect-labs/test-runner {:git/tag "v0.5.1" :git/sha "<sha>"}}
;;        :main-opts ["-m" "cognitect.test-runner"]}
;; esecuzione: clojure -M:test
```

| Livello | Strumento | Verifica |
| --- | --- | --- |
| unità | `deftest` + `is` | una funzione alla volta |
| proprietà | `test.check` | molte generazioni di input |
| integrazione | `test-runner` | namespace completi in CI |
| performance | criterium | tempi e allocazioni |

## Distribuzione e integrazione

Per distribuire si usa `tools.build`, che produce un jar con dipendenze incluse partendo da un alias `:build`. In alternativa `clojure -M -m` con un classpath preparato basta per uno script; le immagini native di GraalVM riducono il tempo di avvio ma richiedono configurazione.

```clojure
;; build.clj
(ns build
  (:require [clojure.tools.build.api :as b]))

(def class-dir "target/classes")
(def basis (b/create-basis {:project "deps.edn"}))

(defn uber [_]
  (b/copy-dir {:src-dirs ["src"] :target-dir class-dir})
  (b/uber {:class-dir class-dir
           :uber-file "target/app.jar"
           :basis basis
           :main 'app.core}))
```

## Errori comuni

- **Confondere `-M` e `-X`**: il primo passa argomenti stringa a `-main`, il secondo una mappa di opzioni; un alias sbagliato fallisce senza spiegare perché.
- **Aggiungere dipendenze senza SHA**: un riferimento Git senza `:sha` non è riproducibile e la build può cambiare da sola.
- **Testare solo nel REPL**: i test scritti a mano non tornano in CI; servono `deftest` e un runner.
- **Mettere test in `src`**: `src` finisce in produzione, e i test pesano; tieni `test/` in un alias `:dev`.
- **Ignorare il classpath**: caricare un namespace che non è nei percorsi produce `FileNotFoundException` anche se il file esiste nel repository.

## In sintesi

La CLI `clojure` e `deps.edn` sostituiscono il build system con un file di dati: percorsi, dipendenze e alias sono leggibili e verificabili. Il REPL resta lo strumento principale per esplorare e correggere, i test vivono in namespace dedicati ed entrano in CI con un runner. La distribuzione passa da `tools.build` o da jar eseguibili, e ogni dipendenza rimane riproducibile grazie a versione o SHA.

## Fonti

- [Clojure - Deps and CLI](https://clojure.org/guides/deps_and_cli) — guida ufficiale a `deps.edn`, percorsi e alias.
- [Clojure - Install Clojure](https://clojure.org/guides/install_clojure) — installazione della CLI su sistemi diversi.
- [Clojure - REPL Introduction](https://clojure.org/guides/repl/introduction) — perché usare il REPL e come organizzare la sessione.
- [Clojure - Libraries and the REPL](https://clojure.org/reference/libs) — reference sulle dipendenze e sul classpath.
- [Clojure - Getting Started](https://clojure.org/guides/getting_started) — primo progetto e primo programma eseguibile.
