R è un linguaggio creato per l'analisi statistica e il calcolo su dati, con una REPL interattiva e un ricco insieme di funzioni per lavorare su vettori. Non è un linguaggio di scripting generalista: il suo centro di gravità sono i dati tabellari, le operazioni vettoriali e la riproducibilità dell'analisi. In questa lezione impari la sintassi di base, il sistema dei tipi e come il codice R viene eseguito.

## Obiettivi

- Distinguere i tipi atomici di R e riconoscere le conversioni implicite.
- Lavorare con vettori, fattori e liste, capendo quando R ricicla i valori.
- Scrivere funzioni con argomenti con nome e valore di default.
- Leggere il modello di esecuzione: REPL, sorgenti, `Rscript` e ambiente globale.
- Capire perché `NA`, `NULL` e i valori logici hanno regole proprie.

## Tipi atomici e vettori

R ha sei tipi atomici principali: `logical`, `integer`, `double`, `character`, `complex` e `raw`. Il punto controintuitivo è che non esistono scalari: `5` è un vettore di lunghezza uno. `class()` restituisce la classe dell'oggetto, `typeof()` il tipo interno.

```r
x <- 5            # vettore numerico di lunghezza 1
y <- 5L           # intero esplicito (suffisso L)
nomi <- c("Ada", "Bruno", "Carla")
logici <- c(TRUE, FALSE, NA)
class(nomi)       # "character"
length(x)         # 1
```

Gli operatori sono vettorializzati: `c(1, 2, 3) * 2` restituisce `c(2, 4, 6)` senza cicli. Questa è la differenza più importante rispetto a un linguaggio imperativo, ed è il motivo per cui scrivere cicli `for` in R su vettori è quasi sempre un errore di stile. Il beneficio non è solo velocità: un'operazione su un intero vettore descrive l'intenzione in una riga.

| Operazione | Funzione | Note |
| --- | --- | --- |
| creare un vettore | `c(...)` | converte al tipo più generale |
| sequenze | `1:10`, `seq(0, 1, by = 0.2)` | `:` ha precedenza alta |
| ripetere | `rep(x, times = 3)` | anche `each` |
| selezione | `x[c(1, 3)]`, `x[-2]` | l'indice negativo esclude |
| filtrare | `x[x > 2]` | maschera logica di pari lunghezza |

La conversione implicita è silenziosa: `c(1, "a")` diventa `c("1", "a")` di tipo `character`. Quando un risultato ha il tipo sbagliato, la causa è quasi sempre un `c()` che ha mescolato tipi diversi.

## Liste, fattori e attributi

Oltre ai vettori atomici esistono le strutture con attributi. Una `list` può contenere qualsiasi oggetto, anche di tipo diverso, e si accede agli elementi con `[[ ]]` o `$`. Un `data.frame` è una lista di vettori della stessa lunghezza: colonne come vettori, righe come record.

```r
persona <- list(nome = "Ada", eta = 36, lingue = c("R", "Python"))
persona$eta          # 36
persona[["nome"]]    # "Ada"

df <- data.frame(
  nome = c("Ada", "Bruno"),
  voto = c(28, 30)
)
df$voto              # vettore delle votazioni
str(df)              # riassunto della struttura
```

Un **fattore** (`factor`) è un vettore di categorie con un insieme fisso di livelli, utilissimo per i modelli statistici e per ordinare le categorie nei grafici.

```r
taglia <- factor(c("S", "M", "M", "L"), levels = c("S", "M", "L"))
levels(taglia)   # "S" "M" "L"
as.integer(taglia)  # 1 2 2 3
```

## Funzioni e argomenti

Le funzioni si dichiarano con `function`, restituiscono l'ultima espressione valutata e possono avere valori di default. Gli argomenti si possono passare per posizione o per nome; il nome è preferibile quando i parametri sono più di due.

```r
media_robusta <- function(x, trim = 0, na.rm = FALSE) {
  mean(x, trim = trim, na.rm = na.rm)
}

media_robusta(c(1, 2, 3, 1000), trim = 0.25)   # ignora gli estremi
media_robusta(c(1, NA, 3), na.rm = TRUE)       # 2
```

I valori mancanti propagano: `mean(c(1, NA, 3))` restituisce `NA`, non un errore. Bisogna decidere esplicitamente se rimuoverli o gestirli, ed è una delle domande più frequenti nell'analisi dei dati reali. Attenzione anche a `TRUE | NA`, che vale `TRUE`, mentre `TRUE & NA` vale `NA`: la logica a tre valori non è commutativa nei risultati.

## Modello di esecuzione

R valuta il codice in un **ambiente globale** che resta vivo durante la sessione. La REPL legge un'espressione, la valuta e stampa il risultato; `source("file.R")` esegue un file nello stesso ambiente, mentre `Rscript file.R` esegue uno script in modo non interattivo, adatto a cron o CI.

```r
# apro una sessione: R
# > 1 + 1
# [1] 2
# > v <- 2:4; v
# [1] 2 3 4

# esecuzione batch da shell
# $ Rscript analisi.R dati.csv
```

La memoria è gestita da un garbage collector, ma ogni copia di un oggetto occupa spazio: R usa la copy-on-modify, quindi `b <- a` non duplica subito, mentre modificare `b` può duplicare. In uno script lungo questo spiega picchi di memoria non prevedibili guardando solo il codice. Gli script producono file `.R`; in modalità interattiva il contesto delle variabili è visibile con `ls()` e si ispeziona con `str()`.

## Errori comuni

- **Confondere `[ ]` e `[[ ]]` sulle liste**: `persona["eta"]` restituisce una lista, `persona[["eta"]]` il vettore interno.
- **Scrivere `for` su vettori**: quasi tutte le operazioni sono vettorializzate, i cicli sono più lenti e meno chiari.
- **Ignorare `NA`**: senza `na.rm = TRUE` o un filtro, un solo valore mancante rende `NA` qualunque aggregato.
- **Usare `=` per assegnare al livello globale**: `<-` è l'assegnazione idiomatica, `=` serve per gli argomenti e gli attributi.
- **Dimenticare che `1:length(x)` fallisce con vettori vuoti**: `length(x)` vale 0 e la sequenza diventa `c(1, 0)`.

## In sintesi

R è un linguaggio vettoriale dove gli scalari sono vettori di lunghezza uno, perciò conviene ragionare per operazioni su interi vettori. Liste, data frame e fattori coprono dati eterogenei e variabili categoriche. Le funzioni restituiscono l'ultima espressione e gestiscono i mancanti in modo esplicito. La sessione interattiva e `Rscript` sono due modi di usare lo stesso interprete, con lo stesso ambiente di valutazione.

## Fonti

- [An Introduction to R](https://cran.r-project.org/doc/manuals/r-release/R-intro.html), il manuale introduttivo ufficiale su sintassi, vettori e data frame.
- [The R Language Definition](https://cran.r-project.org/doc/manuals/r-release/R-lang.html), specifica dei tipi, della valutazione e degli attributi.
- [R Project for Statistical Computing](https://cran.r-project.org/), download, pacchetti e documentazione di riferimento.
- [R for Data Science](https://r4ds.hadley.nz/), testo libero con esercizi su manipolazione dei dati in R.
