In questo laboratorio costruisci un piccolo script R per pulire un CSV di ordini, calcolare un report per regione e verificarlo con test, tutto senza IDE. L'obiettivo non è scrivere molto codice, ma impostare un flusso ripetibile: dati grezzi in input, funzioni pure, un risultato su file e un test che lo protegge.

## Obiettivi

- Creare un progetto con dati, funzioni, entry point e test in cartelle separate.
- Leggere un CSV con regole esplicite per valori mancanti e tipi.
- Scrivere funzioni pure che filtrano e aggregano i dati.
- Eseguire lo script in batch con `Rscript` e con gli argomenti da riga di comando.
- Coprire la logica con testthat e riconoscere i casi limite.

## Struttura del progetto

| Percorso | Contenuto | Responsabilità |
| --- | --- | --- |
| `dati/ordini.csv` | input grezzo | non si modifica a mano |
| `R/report.R` | funzioni | logica pura e testabile |
| `esegui.R` | entry point | legge argomenti e scrive l'output |
| `tests/testthat/` | test | verifica delle funzioni |
| `output/report.csv` | risultato | rigenerato a ogni esecuzione |

I dati di partenza hanno una colonna con importi mancanti e un importo negativo da escludere.

```bash
mkdir -p dati R tests/testthat output
printf '%s\n' 'id,regione,importo' '1,Nord,120' '2,Sud,' \
  '3,Nord,80' '4,Est,95' '5,Sud,-10' '6,Sud,140' > dati/ordini.csv
```

## Leggere i dati in modo esplicito

`read.csv` accetta `na.strings` per dichiarare cosa conta come mancante: la stringa vuota non è `NA` per default in tutti i contesti, e un importo vuoto trasformato in testo silenzioso rompe l'aggregazione. Le regioni restano testo, perché si usa un fattore solo quando l'ordine delle categorie conta.

```r
# R/report.R
leggi_ordini <- function(percorso) {
  df <- read.csv(
    percorso,
    stringsAsFactors = FALSE,
    na.strings = c("", "NA")
  )
  required <- c("id", "regione", "importo")
  mancanti <- setdiff(required, names(df))
  if (length(mancanti) > 0) {
    stop("colonne mancanti: ", paste(mancanti, collapse = ", "))
  }
  df
}

pulisci_ordini <- function(df) {
  valido <- !is.na(df$importo) & df$importo >= 0 & nzchar(df$regione)
  df[valido, , drop = FALSE]
}
```

Il filtro è un vettore logico applicato alle righe: non serve alcun ciclo. La regola "importo negativo o mancante escluso" è una decisione di dominio e va scritta in un solo punto, dentro `pulisci_ordini`.

## Aggregare e scrivere l'output

L'aggregazione si fa con `aggregate` della base R, senza pacchetti esterni. Contare le righe oltre ai totali rende il report verificabile a colpo d'occhio.

```r
report_regioni <- function(df) {
  conteggi <- aggregate(importo ~ regione, data = df, FUN = length)
  totali <- aggregate(importo ~ regione, data = df, FUN = sum)
  out <- data.frame(
    regione = totali$regione,
    ordini = conteggi$importo,     # length restituisce il numero di righe
    tot_eur = totali$importo
  )
  out[order(-out$tot_eur), , drop = FALSE]
}

salva_report <- function(df, percorso) {
  write.csv(df, percorso, row.names = FALSE)
  invisible(percorso)
}
```

L'entry point legge la riga di comando: `Rscript esegui.R dati/ordini.csv output/report.csv`. Se un argomento manca, lo script esce con un codice diverso da zero, così una pipeline lo intercetta.

```r
# esegui.R
source("R/report.R")

args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 2) {
  message("uso: Rscript esegui.R INPUT OUTPUT")
  quit(status = 2)
}

ordini <- pulisci_ordini(leggi_ordini(args[1]))
salva_report(report_regioni(ordini), args[2])
cat("report scritto in", args[2], "\n")
```

```bash
Rscript esegui.R dati/ordini.csv output/report.csv
cat output/report.csv
```

Con i dati di esempio il risultato atteso è Nord 200 su 2 ordini, Sud 140 su un ordine, Est 95 su un ordine.

## Verificare con testthat

I test costruiscono piccoli data frame in memoria, senza dipendere dai file: girano ovunque e in millisecondi.

```r
# tests/testthat/test-report.R
source("R/report.R", chdir = TRUE)

test_that("gli importi mancanti e negativi sono esclusi", {
  df <- data.frame(id = 1:4, regione = c("N", "N", "S", "S"),
                   importo = c(10, NA, -5, 20))
  atteso <- data.frame(id = c(1L, 4L), regione = c("N", "S"),
                       importo = c(10, 20))
  expect_equal(pulisci_ordini(df), atteso, ignore_attr = "row.names")
})

test_that("il report è ordinato per totale decrescente", {
  df <- data.frame(regione = c("N", "S", "S"), importo = c(10, 30, 20))
  r <- report_regioni(df)
  expect_equal(r$regione, c("S", "N"))
  expect_equal(r$ordini, c(2, 1))
})
```

```bash
R -q -e 'testthat::test_dir("tests/testthat")'
```

## Esercizi

1. Scarta gli ordini duplicati sull'`id` mantenendo il primo: quali colonne del report cambiano?
2. Gestisci un CSV con importi in formato italiano (`"1.234,50"`).
3. Arrotonda `tot_eur` a due decimali e scrivi un test che lo verifichi.
4. Aggiungi a `esegui.R` l'argomento opzionale `--min` che esclude importi sotto soglia.
5. Scrivi un test per un data frame senza righe valide.
6. Rendi `leggi_ordini` tollerante all'assenza di `id`, con un avviso.

<details>
<summary>Soluzione</summary>

1. `df[!duplicated(df$id), , drop = FALSE]` subito dopo `pulisci_ordini`: `ordini` scende, mentre il totale di un duplicato conta una volta sola.
2. Converti il testo con `gsub("\\.", "", x)` e poi `gsub(",", ".", x)` prima di `as.numeric`; in alternativa `read.csv(file, dec = ",")` se mancano separatori di migliaia.
3. `out$tot_eur <- round(out$tot_eur, 2)` e test con `expect_equal(r$tot_eur, c(60, 10))`; per valori periodici conviene la `tolerance`.
4. `min <- 0`, poi leggi `args[4]` con `as.numeric` e validalo; filtra con `ordini$importo >= min` prima dell'aggregazione.
5. Con `importo = c(NA, -1)` verifica `expect_equal(nrow(report_regioni(pulisci_ordini(df))), 0)`: `aggregate` su zero righe restituisce un data frame vuoto.
6. `stop` sulle colonne indispensabili, `warning("colonna id assente")` per `id`: la logica di aggregazione non lo usa.

</details>

## Errori comuni

- **Costruire i dati leggendo il CSV reale dentro i test**: il test diventa fragile al primo cambio di dati.
- **Scrivere `df[valido]`**: su un data frame l'indice a una dimensione seleziona colonne, non righe.
- **Lasciare `na.strings` al default**: le stringhe vuote restano testo e sommarle fallisce in modo opaco.
- **Fare `print` dei risultati intermedi**: l'entry point deve scrivere solo l'output richiesto, il resto va in `message`.
- **Dimenticare `row.names = FALSE`**: la colonna degli indici finisce nel report e rompe chi lo rilegge.

## In sintesi

Un laboratorio R si organizza separando dati, funzioni, entry point e test. Le funzioni pure su data frame si verificano con dati costruiti in memoria, mentre `Rscript` e i codici di uscita gestiscono l'esecuzione in batch. Le decisioni su valori mancanti vanno scritte in un solo punto e protette da test. Il report finale è un file rigenerabile, non il frutto di comandi digitati a mano.

## Fonti

- [R Language Definition](https://cran.r-project.org/doc/manuals/r-release/R-lang.html), semantica di data frame, indicizzazione e ambienti.
- [R for Data Science](https://r4ds.hadley.nz/), flusso di lavoro con dati tabellari ed esempi di pulizia.
- [testthat](https://testthat.r-lib.org/), struttura dei test e directory convenzionali.
- [An Introduction to R](https://cran.r-project.org/doc/manuals/r-release/R-intro.html), funzioni di base per lettura, aggregazione e scrittura di file.
