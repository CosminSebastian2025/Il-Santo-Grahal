L'ecosistema di R ruota attorno a CRAN, il repository ufficiale da cui si installano i pacchetti, e a pochi strumenti che rendono un progetto riproducibile. R da solo è un interprete; la parte che si usa ogni giorno è un insieme di librerie per la manipolazione dei dati, i grafici, la documentazione e i test. In questa lezione vedi come organizzare un progetto, scegliere gli strumenti e verificarne il codice.

## Obiettivi

- Installare pacchetti da CRAN e capire il ruolo di un repository locale di librerie.
- Manipolare dati con dplyr e disegnare con ggplot2 in modo leggibile.
- Scrivere report in R Markdown che ripetono l'analisi dall'inizio.
- Testare codice con testthat e controllare un pacchetto con `R CMD check`.
- Scegliere tra RStudio e VS Code senza cambiare il flusso di lavoro.

## Installare pacchetti e gestire le dipendenze

`install.packages()` scarica da CRAN, mentre `library()` carica un pacchetto nella sessione. Il pacchetto `renv` registra le versioni esatte in un file `renv.lock`, così il progetto continua a funzionare anche quando gli autori pubblicano nuove versioni.

```r
install.packages(c("dplyr", "ggplot2", "testthat"))
library(dplyr)

# con renv: dipendenze bloccate e ripristinabili
renv::init()
renv::snapshot()   # scrive renv.lock
renv::restore()    # reinstallazione identica su un'altra macchina
```

La regola pratica è una sola: mai usare `install.packages()` dentro lo script. L'installazione è un'attività di setup, l'analisi deve solo caricare librerie già dichiarate. Lo stesso vale per le versioni: un progetto che dipende da `dplyr` "qualsiasi versione" cambia comportamento quando esce una release, e senza lockfile il cambiamento arriva a risultati già pubblicati. I pacchetti da CRAN si controllano con `available.packages()` prima di una migrazione, e gli aggiornamenti si fanno in un branch dedicato, non a metà di un'analisi.

## Manipolare e visualizzare dati

Il pacchetto `dplyr` esprime le operazioni sui data frame come una sequenza di verbi collegati da `|>` (pipe nativo, R 4.1+) o `%>%`. Il codice si legge dall'alto verso il basso, come una ricetta.

```r
library(dplyr)

vendite <- data.frame(
  mese = rep(c("gen", "feb", "mar"), each = 2),
  regione = c("Nord", "Sud", "Nord", "Sud", "Nord", "Sud"),
  totale = c(120, 80, 140, 95, 110, 130)
)

report <- vendite |>
  group_by(regione) |>
  summarise(
    righe = n(),
    media = mean(totale)
  ) |>
  arrange(desc(media))

print(report)
```

`ggplot2` segue una grammatica a livelli: dati, mappatura estetica (`aes`), tipo di geometria (`geom_*`), poi scale e temi. Un grafico è un oggetto che si salva e si modifica.

```r
library(ggplot2)

ggplot(vendite, aes(x = mese, y = totale, fill = regione)) +
  geom_col(position = "dodge") +
  labs(title = "Vendite per regione", y = "Totale") +
  theme_minimal()
```

| Strumento | Ruolo | Nota |
| --- | --- | --- |
| `dplyr` | selezione, filtro, raggruppamento | verbi su data frame |
| `tidyr` | dati larghi e lunghi | `pivot_longer`, `pivot_wider` |
| `readr` / `readxl` | lettura CSV e Excel | import controllato |
| `ggplot2` | grafici | grammatica a livelli |
| `testthat` | test automatici | risultati leggibili in CI |

## Riproducibilità, documentazione e test

Il problema principale delle analisi è la ripetibilità: un risultato deve poter essere rigenerato da chi lo legge. R Markdown (o Quarto) mescola testo e codice in un unico sorgente, e il knit riesegue tutto dall'inizio, così il documento non può discostarsi dai dati che cita. La stessa pagina diventa verbale e calcolo insieme, con numeri che cambiano solo se cambiano i dati.

````markdown
---
title: "Report vendite"
output: html_document
---

```{r}
library(dplyr)
source("analisi.R")   # stesso ambiente, stessi risultati
```
````

Per i test, `testthat` usa una struttura convenzionale: i file stanno in `tests/testthat/` e `test_that()` descrive il comportamento atteso.

```r
# tests/testthat/test-media.R
test_that("media ignora i NA quando richiesto", {
  expect_equal(media_robusta(c(1, NA, 3), na.rm = TRUE), 2)
  expect_true(is.na(mean(c(1, NA, 3))))
})
```

```bash
R -q -e 'testthat::test_dir("tests/testthat")'
```

Il comando che chiude il cerchio è `R CMD check`, che esegue test, esempi e controlli statici su un pacchetto. Lo stesso controllo gira spesso su GitHub Actions, così ogni push verifica l'intero progetto.

## Casi d'uso reali e ambiente di lavoro

R è diffuso in statistica medica, ricerca accademica, data journalism e finanza, dove conta la correttezza statistica più della velocità grezza. Esempi tipici: analisi di studi clinici con dati longitudinali, report mensili di business intelligence, modelli statistici pubblicati insieme agli articoli. In questi contesti chi legge il codice è spesso un ricercatore, non un ingegnere: per questo la chiarezza del passo singolo viene prima delle ottimizzazioni premature.

RStudio (ora Posit) è l'IDE storico, con console, pannello dati e viewer; VS Code funziona bene con l'estensione R e con Jupyter, e si integra con i repository Git esistenti. Entrambi eseguono lo stesso interprete, quindi la scelta è di comodità, non di linguaggio.

```bash
# da shell, senza IDE
Rscript analisi.R dati.csv
```

## Errori comuni

- **Dipendenze non dichiarate**: lo script funziona solo perché il pacchetto era già installato in locale.
- **Analisi a passi manuali nella console**: il risultato non si ricostruisce su un'altra macchina né tra sei mesi.
- **Fattori confrontati come testo**: `filter(df, regione == "nord")` non trova la categoria `Nord`.
- **Fare `install.packages()` dentro il codice**: rallenta ogni esecuzione e fallisce senza rete.
- **Assenza di test sui dati mancanti**: i valori `NA` passano inosservati fino al report finale.

## In sintesi

L'ecosistema di R è fatto di CRAN, dei pacchetti della suite tidyverse e di pochi strumenti per riproducibilità e test. `dplyr` e `ggplot2` coprono la parte più frequente del lavoro; `renv`, R Markdown e `testthat` proteggono la ripetibilità. Il comando `R CMD check` è la verifica finale di un progetto pubblicabile. Un IDE è solo una comodità sopra lo stesso interprete `Rscript`.

## Fonti

- [CRAN](https://cran.r-project.org/), repository ufficiale dei pacchetti e della documentazione R.
- [R for Data Science](https://r4ds.hadley.nz/), guida pratica su dplyr, ggplot2 e flusso di lavoro.
- [R Packages](https://r-pkgs.org/), testo libero su struttura dei pacchetti, test e `R CMD check`.
- [testthat](https://testthat.r-lib.org/), documentazione del framework di test più diffuso in R.
