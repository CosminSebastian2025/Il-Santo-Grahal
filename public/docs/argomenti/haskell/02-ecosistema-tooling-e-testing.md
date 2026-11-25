Il linguaggio da solo non basta: la forza di Haskell sta nell'ecosistema costruito intorno a GHC, GHCup e Cabal, che installano compilatori, librerie e build con pochi comandi. In questa lezione impari come si organizza un progetto reale, come si dichiarano le dipendenze e come si scrivono test automatici oltre ai casi d'uso in cui Haskell conviene ancora oggi.

## Obiettivi

- Installare una toolchain con GHCup e gestire versioni di GHC e Cabal.
- Creare un progetto con `cabal init`, con libreria, eseguibile e file `.cabal`.
- Scrivere test con HUnit o tasty, da eseguire anche in CI.
- Conoscere le librerie di riferimento per testo, JSON e CLI.
- Riconoscere i domini in cui Haskell è la scelta vincente.

## GHCup e la toolchain

GHCup è l'installer ufficiale della community: installa GHC, Cabal e Haskell Language Server in una cartella utente, e permette di tenere più versioni. Ogni versione di GHC è selezionabile per progetto, così un codice scritto per GHC 9.6 non viene rotto da un aggiornamento globale.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh
ghcup install ghc recommended     # versione GHC consigliata
ghcup install cabal latest        # gestore dei pacchetti
ghcup set ghc 9.6.6               # sceglie la versione attiva
cabal update                      # scarica l'indice dei pacchetti
```

GHC è compilatore e interprete: `runghc` esegue un file senza build, `ghci` è il REPL, `ghc -O2` produce un binario ottimizzato. Il REPL con caricamento di un modulo (`:load`) è lo strumento principale per esplorare tipi e funzioni prima di scrivere un `main`.

| Comando | Scopo | Uso tipico |
| --- | --- | --- |
| `cabal init` | crea progetto e `.cabal` | nuovo pacchetto |
| `cabal build` | compila tutti i componenti | verifica rapida |
| `cabal run eseguibile` | esegue un eseguibile | prove manuali |
| `cabal test` | esegue la suite | locale e CI |
| `cabal repl` | REPL con dipendenze caricate | sviluppo interattivo |

## Il progetto Cabal e le dipendenze

Il file `.cabal` dichiara versione, componente `library`, `executable` e `test-suite`, con le dipendenze e la versione minore di GHC richiesta. `cabal.project` può bloccare le versioni delle dipendenze per un build riproducibile.

```cabal
-- conta.cabal
cabal-version:      2.4
name:               conta
version:            0.1.0.0
build-type:         Simple

library
  exposed-modules:  Conteggi
  hs-source-dirs:   src
  build-depends:    base >=4.14 && <4.20, text
  default-language: Haskell2010

executable conta
  main-is:          Main.hs
  hs-source-dirs:   app
  build-depends:    base, conta, text
  default-language: Haskell2010
```

La struttura consigliata è una libreria con tutta la logica e un eseguibile sottile che la importa: i test dipendono dalla libreria e non hanno bisogno di lanciare un processo. `cabal freeze` scrive `cabal.project.freeze` con le versioni esatte, da committare per il nuovo build identico.

```bash
mkdir conta && cd conta
cabal init --libandexe --simple --non-interactive
cabal build                     # scarica e compila le dipendenze
cabal run conta -- README.md    # gli argomenti dopo -- vanno all'eseguibile
```

## Test con HUnit e tasty

Le suite di test si dichiarano nel `.cabal` come componente `test-suite` con tipo `exitcode-stdio-1.0`: `cabal test` compila e lancia l'eseguibile, che deve uscire con 0 se tutto passa. HUnit è il framework minimo, tasty quello modulare con report leggibili e supporto a QuickCheck.

```haskell
-- test/Spec.hs
import Test.Tasty
import Test.Tasty.HUnit
import Conteggi (conta)

main :: IO ()
main = defaultMain $ testGroup "conteggi"
  [ testCase "righe con ultima senza a capo" $ do
      let c = conta "ciao haskell\nciao lua"
      fst c @?= (2 :: Int)                    -- atteso a sinistra
  , testCase "input vuoto" $
      conta "" @?= (0, 0, 0)
  ]
```

`@?=` verifica l'uguaglianza, mentre `assertFailure` chiude i casi espliciti. QuickCheck genera input casuali e le property tipo "il conteggio delle parole non supera quello dei byte" scoprono casi che i test manuali non coprono.

| Strumento | Forma | Quando usarlo |
| --- | --- | --- |
| HUnit | `testCase` con `@?=` | asserzioni puntuali |
| tasty | albero di test con filtro | suite grandi e CLI di report |
| QuickCheck | property con generatori | invarianti e funzioni pure |
| `cabal test --test-show-details=direct` | output durante il run | debug su CI |

## Ecosistema e casi d'uso

L'ecosistema si divide in librerie di base (GHC boot libraries, già installate) e pacchetti di Hackage. Per il testo reale conviene `text` invece di `String`, per JSON `aeson`, per la CLI `optparse-applicative`, per il web Yesod e Servant. Il compilatore è lento in build ma produce eseguibili veloci, e questo sposta il costo sul tempo di sviluppo.

| Bisogno | Pacchetto | Nota |
| --- | --- | --- |
| testo | `text` | UTF-8 compatta, molto più rapida di `String` |
| JSON | `aeson` | `ToJSON`/`FromJSON` derivabili |
| CLI | `optparse-applicative` | help e validazione automatici |
| HTTP | `servant` | API descritte dai tipi |

Haskell viene scelto dove la correttezza è più importante della velocità di scrittura: compilatori, motori di ricerca, sistemi finanziari e strumenti di formal verification. La purezza rende i test deterministici e il refactoring sicuro, e `GHC.Generics` riduce il codice ripetitivo dei serializzatori.

## Errori comuni

- **Mescolare versioni di GHC senza dichiararle**: il `.cabal` va fissato con `base` compatibile, altrimenti `cabal build` fallisce su macchine diverse.
- **Testare solo il caso nominale**: input vuoto, file mancante e caratteri UTF-8 non ASCII sono i casi da coprire.
- **Usare `String` per grandi volumi di testo**: le liste di `Char` costano memoria e CPU; passa a `text`.
- **Ignorare i warning `-Wall`**: nascondono pattern non esaustivi e nomi ombreggiati, che diventano bug in produzione.
- **Lanciare il processo di test direttamente**: `cabal test` gestisce compilazione e dipendenze; un binario compilato a mano può restare disallineato.

## In sintesi

GHCup installa GHC, Cabal e il language server con versioni componibili. Il file `.cabal` dichiara libreria, eseguibile e test-suite, e la separazione tra libreria ed eseguibile rende il progetto testabile. tasty e QuickCheck coprono asserzioni e invarianti, mentre `text` e `aeson` sono le librerie di base per i dati reali. Il laboratorio successivo mette insieme tutto questo in una CLI.

## Fonti

- [GHCup](https://www.haskell.org/ghcup/), installer ufficiale di GHC, Cabal e Haskell Language Server con la gestione delle versioni.
- [Cabal User's Guide](https://cabal.readthedocs.io/en/stable/), guida completa di `cabal` e dei comandi di build e test.
- [Cabal - Package description](https://cabal.readthedocs.io/en/stable/cabal-package-description-file.html), sintassi del file `.cabal` per librerie, eseguibili e test-suite.
- [Hackage - aeson](https://hackage.haskell.org/package/aeson), documentazione della libreria JSON usata per l'output strutturato.
- [Haskell Language Server](https://haskell-language-server.readthedocs.io/en/latest/), server per completamento, diagnostica e refactoring nell'editor.
