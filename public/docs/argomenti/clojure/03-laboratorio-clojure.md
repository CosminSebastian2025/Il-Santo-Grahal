In questo laboratorio costruisci `clj-conta`, una CLI in Clojure che legge un file o stdin e stampa righe, parole e byte, con le parole più frequenti in opzione. Mette in pratica i pezzi di un programma reale: funzioni pure, sequenze pigre, gestione degli errori ai bordi e test con `clojure.test`.

## Obiettivi

- Distinguere il core puro dai bordi impuri, cioè I/O, argomenti e codice di uscita.
- Leggere l'input con `slurp` o un reader e gestire i file mancanti.
- Contare e ordinare con `frequencies`, `sort-by` e `take` in modo deterministico.
- Mappare gli errori su messaggi e codici di uscita coerenti.
- Scrivere test con `deftest`, `are` e un runner eseguibile da CI.

## Il contratto di `clj-conta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `clj-conta [OPZIONI] [FILE]` | senza file legge stdin |
| `-w, --words` | aggiunge le frequenze | modalità aggiuntiva |
| `-n, --top N` | intero >= 1, default 5 | limite di stampa |
| exit 0 | successo | anche con conteggi a zero |
| exit 1 | opzione invalida o file illeggibile | errore operativo |

Senza argomenti e con stdin vuoto lo strumento stampa zeri ed esce con 0: il vuoto è un risultato. Un file che non si apre è un errore operativo, riportato su stderr.

```bash
clojure -T:build uber                    # produce target/clj-conta.jar
echo "ciao clojure ciao" | java -jar target/clj-conta.jar -n 2
java -jar target/clj-conta.jar note.txt; printf 'exit: %s\n' "$?"
```

## Core: conteggi e frequenze

Il calcolo è una sequenza di trasformazioni pure su stringhe. `split-lines` e il regex `\s+` dividono il testo, `frequencies` costruisce la mappa dei conteggi, e l'ordinamento spezza i pari sul nome per rendere l'output ripetibile nei test.

```clojure
(ns contatore.core
  (:require [clojure.string :as str]))

(defn conta
  "Restituisce {:righe n :parole n :byte n} per il testo dato."
  [testo]
  {:righe (if (str/blank? testo) 0 (count (str/split-lines testo)))
   :parole (count (remove str/blank? (str/split testo #"\s+")))
   :byte (count (.getBytes ^String testo "UTF-8"))})

(defn frequenze
  "Mappa parola -> conteggio, ignorando maiuscole e spazi ripetuti."
  [testo]
  (->> (str/split (str/lower-case testo) #"\s+")
       (remove str/blank?)          ; tuple vuote dai separatori
       frequencies))                ; funzione standard, nessun loop

(defn top-parole [freq n]
  (->> freq
       (sort-by (fn [[p c]] [(- c) p])) ; conteggio desc, poi nome asc
       (take n)))
```

`conta` è puro: riceve una stringa e restituisce dati. `top-parole` mostra perché il threading `->>` rende leggibili pipeline che altrove diventano cicli annidati, e restituire dati invece di stampare permette ai test di confrontare valori, non testo.

```clojure
(defn formatta [c freq n]
  (let [[righe parole byte] (vals (select-keys c [:righe :parole :byte]))]
    (str righe " " parole " " byte "\n"
         (str/join "\n" (for [[p v] (top-parole freq n)] (str v " " p))))))
```

Il bordo impuro è piccolo: leggi il testo, chiama il core, stampa. Gli errori di I/O vengono catturati e trasformati in un messaggio su stderr e in un codice di uscita, senza lasciar uscire uno stack trace.

```clojure
(defn leggi-input [percorso]
  (if percorso
    (slurp percorso)                       ; impuro: disco
    (slurp *in*)))                         ; impuro: stdin

(defn -main [& args]
  (try
    (let [percorso (first args)
          top (parse-top args)
          testo (leggi-input percorso)]
      (print (formatta (conta testo) (frequenze testo) top))
      (flush)
      (System/exit 0))
    (catch Exception e
      (binding [*out* *err*]
        (println "clj-conta:" (.getMessage e))) ; messaggio, non stack trace
      (System/exit 1))))
```

## Test e criterio di uscita

I test del core confrontano valori: mappe e sequenze si paragonano direttamente, e `are` copre tabelle di casi senza ripetizioni. Il contratto della CLI si verifica con `clojure.java.shell/sh`, che restituisce uscita ed errore separati.

```clojure
(ns contatore.core-test
  (:require [clojure.test :refer [deftest is are testing]]
            [clojure.java.shell :as shell]
            [contatore.core :as c]))

(deftest conta-test
  (is (= {:righe 0 :parole 0 :byte 0} (c/conta "")))
  (is (= 4 (:parole (c/conta "ciao clojure\nciao lua"))))
  (is (= 2 (:righe (c/conta "a\nb")))))

(deftest frequenze-test
  (are [testo atteso] (= atteso (c/frequenze testo))
    "a b a"      {"a" 2 "b" 1}
    "A a"        {"a" 2}
    ""           {}))

(deftest esce-con-codice-1-senza-file
  (let [{:keys [exit]} (shell/sh "java" "-jar" "target/clj-conta.jar" "/non/esiste")]
    (is (= 1 exit))))
```

| Caso | Input | Uscita attesa |
| --- | --- | --- |
| vuoto | stdin `""` | `0 0 0`, exit 0 |
| una riga | `"ciao"` | `1 1 4`, exit 0 |
| file assente | percorso inesistente | errore su stderr, exit 1 |
| `-n 0` | opzione invalida | errore su stderr, exit 1 |

## Esercizi

1. Aggiungi `-s, --sort nome|freq` per ordinare le parole, con default `freq`.
2. Rendi `--json` stabile con i campi `righe`, `parole`, `byte` e `top`, e scrivi un test che ne verifichi l'ordine.
3. Leggi a blocchi con un `BufferedReader` invece di `slurp`: cosa deve cambiare in `conta`?
4. Gestisci input non UTF-8 senza rompere il conteggio e senza produrre JSON invalido.
5. Aggiungi `--max-bytes N` con errore dedicato e un test che verifichi il superamento.
6. Confronta `clojure -M -m` e l'uberjar su un file da 10 MiB: cosa cambia e perché?

<details>
<summary>Soluzione</summary>

1. `sort-by` accetta una chiave: per `nome` usa `first`, per `freq` usa `[(- c) p]` come qui, così i pari restano ordinati per nome.

2. `clojure.data.json/write-str` serializza le mappe senza garantire l'ordine; costruisci una lista di coppie e confronta la stringa completa.

3. `conta` accetta un reader e accumula righe e parole a pezzi con `transduce` e `conj!`; le chiavi delle frequenze restano stringhe.

4. `slurp` con `:encoding "UTF-8"` decodifica e sostituisce i byte invalidi; per il JSON filtra i caratteri non validi prima di serializzare.

5. Leggi con `(take max-bytes ...)` su un `BufferedInputStream` e controlla che non resti altro; oltre il limite lancia un `ex-info` che `-main` trasforma in un messaggio e exit 1.

6. L'uberjar avvia una JVM con il jar già pronto, `clojure -M -m` ricostruisce il classpath: il primo è più veloce a caldo, il secondo più comodo in sviluppo.

</details>

## Errori comuni

- **Stampare dentro le funzioni pure**: `print` nel core rende i test dipendenti da stdout; restituisci dati e stampa solo in `-main`.
- **Usare `(first args)` senza controlli**: con opzioni il percorso va distinto in modo esplicito.
- **Ordinare `frequencies` senza pareggio**: i pareggi cambiano ordine tra esecuzioni e i test diventano intermittenti.
- **Dimenticare `(flush)` dopo l'output**: il testo può restare nel buffer e gli script leggono meno.
- **Gestire l'errore con `println` su stdout**: l'errore operativo va su stderr, altrimenti finisce nella pipe dello script.

## In sintesi

Clojure premia la separazione tra dati e bordi: il core è fatto di funzioni pure facili da testare, il `main` gestisce I/O, opzioni ed errori. `frequencies` e il threading sostituiscono i cicli, e l'ordine deterministico rende affidabili sia l'output sia i test. Il passo successivo è la lettura a blocchi, che avvicina lo strumento a un vero `wc`.

## Fonti

- [Clojure - Learn Sequential Collections](https://clojure.org/guides/learn/sequential_colls) — sequenze, pigrizia e trasformazioni.
- [Clojure - deps and CLI](https://clojure.org/guides/deps_and_cli) — alias e comandi per eseguire il progetto.
- [Clojure - Reference: REPL and Main](https://clojure.org/reference/repl_and_main) — come `-main` e la CLI `clojure` si collegano.
- [Clojure - Learn Functions](https://clojure.org/guides/learn/functions) — `defn`, destrutturazione e funzioni come valori.
- [Clojure - Getting Started](https://clojure.org/guides/getting_started) — primo progetto e primo programma eseguibile.
