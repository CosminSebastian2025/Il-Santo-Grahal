In questo laboratorio costruisci `haskell-conta`, una CLI che legge un file o stdin e stampa righe, parole e byte, con una libreria testabile e un eseguibile sottile. Eserciti `IO`, errori con `Either`, CLI con `optparse-applicative` e test, e ottieni un binario nativo con una suite `cabal test`.

## Obiettivi

- Disegnare un contratto CLI con opzioni e codici di uscita coerenti.
- Leggere file o stdin con `IO` senza confondere logica pura ed effetti.
- Contare righe, parole e frequenze con funzioni pure, non con cicli.
- Gestire argomenti invalidi e file mancanti restituendo `Either`.
- Scrivere test tasty che girano anche in CI.

## Il contratto di `haskell-conta`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `haskell-conta [OPZIONI] [FILE]` | senza file legge stdin |
| `-w, --words` | attiva le frequenze | modalità aggiuntiva |
| `-n, --top N` | intero >= 1, default 5 | limite di stampa |
| `-j, --json` | output su una riga | consumo da script |
| exit 0 | successo | anche con conteggi a zero |
| exit 1 | file illeggibile o uso errato | errore operativo |

Il programma ha due strati: le funzioni pure in `Conteggi.hs` calcolano i risultati, `Main.hs` gestisce argomenti, lettura e stampa, così i test restano indipendenti dal filesystem.

```bash
cabal build
echo "ciao haskell ciao" | cabal run haskell-conta -- -w -n 2
cabal run haskell-conta -- README.md; printf 'exit: %s\n' "$?"
```

## Core: funzioni pure sui conteggi

`conta` riceve un `Text` e restituisce un record: nessun effetto, quindi nessuna infrastruttura di test. Il conteggio segue `wc` e l'ultima riga senza a capo vale una riga.

```haskell
-- src/Conteggi.hs
module Conteggi (Conteggi(..), conta, frequenze) where

import qualified Data.Text as T

data Conteggi = Conteggi
  { righe  :: !Int
  , parole :: !Int
  , byte   :: !Int
  } deriving (Eq, Show)

conta :: T.Text -> Conteggi
conta testo = Conteggi righeN paroleN byteN
  where
    righeN   = length (T.lines testo)            -- lines tratta l'ultima riga senza a capo
    paroleN  = length (T.words testo)            -- words separa su ogni spazio bianco
    byteN    = T.length (T.encodeUtf8 testo)     -- byte UTF-8, non caratteri
```

`length` di una lista non si ferma sul testo vuoto: `T.lines ""` dà `[]` e il caso vuoto restituisce zeri senza ramo speciale.

```haskell
import Data.List (sortOn)
import qualified Data.Map.Strict as M           -- mappa pura, non un dizionario mutabile
import Data.Ord (Down(..))

frequenze :: Int -> T.Text -> [(T.Text, Int)]
frequenze top testo =
  take top . sortOn (\(p, n) -> (Down n, p)) $ M.toList (foldr aggiungi M.empty (T.words testo))
  where
    aggiungi p = M.insertWith (+) p 1            -- puro: restituisce una mappa nuova
```

L'ordinamento usa `Down n` per le frequenze decrescenti e `p` come spareggio, così l'output è stabile.

```haskell
import Control.Exception (IOException, try)
import qualified Data.Text.IO as TIO

leggi :: Maybe FilePath -> IO (Either String T.Text)
leggi Nothing  = Right <$> TIO.getContents       -- stdin
leggi (Just p) = either (Left . show) Right <$> try (TIO.readFile p)
```

## CLI, errori ed exit code

`optparse-applicative` costruisce il parser dagli operatori: `strArgument` per il file, `switch` per `-w`, `option` per `-n`. Il file mancante resta un errore del programma.

```haskell
import Options.Applicative

data Opzioni = Opzioni
  { file   :: Maybe FilePath
  , parola :: Bool
  , top    :: Int
  , json   :: Bool
  }

parser :: Parser Opzioni
parser = Opzioni
  <$> optional (strArgument (metavar "FILE" <> help "senza file legge stdin"))
  <*> switch (short 'w' <> long "words" <> help "mostra le frequenze")
  <*> option auto (short 'n' <> long "top" <> value 5 <> showDefault
                   <> metavar "N" <> help "limite di stampa")
  <*> switch (short 'j' <> long "json" <> help "output su una riga")
```

`option auto` accetta solo numeri ma non controlla `N >= 1`: la validazione resta nel programma. Il `main` mappa ogni esito su un exit code, con gli errori su stderr.

```haskell
main :: IO ()
main = do
  o <- execParser (info (parser <**> helper) (fullDesc <> progDesc "conta righe, parole e byte"))
  esito <- leggi (file o)
  case esito of
    Left err -> do
      hPutStrLn stderr ("haskell-conta: " ++ err)
      exitWith (ExitFailure 1)
    Right testo -> putStr caso (conta testo)
  where
    caso c = case (json o, parola o) of
      (False, False) -> unwords (map show [righe c, parole c, byte c]) ++ "\n"
      _              -> "modalita non ancora implementata\n"
```

## Test e criterio di uscita

I test importano `Conteggi` e verificano valori puri; `withSystemTempFile` rimuove il file anche dopo un'eccezione.

```haskell
-- test/Spec.hs
import Test.Tasty
import Test.Tasty.HUnit
import Conteggi
import qualified Data.Text as T

main :: IO ()
main = defaultMain $ testGroup "conteggi"
  [ testCase "ultima riga senza a capo" $
      conta (T.pack "ciao haskell\nciao lua") @?= Conteggi 2 4 18
  , testCase "input vuoto" $
      conta T.empty @?= Conteggi 0 0 0
  , testCase "frequenze decrescenti" $
      frequenze 2 (T.pack "ciao haskell ciao") @?= [("ciao", 2), ("haskell", 1)]
  ]
```

Il criterio da verificare a mano è breve: `printf '' | cabal run haskell-conta` deve dare `0 0 0` ed exit 0, mentre `cabal run haskell-conta -- /non/esiste` deve uscire con 1 e scrivere su stderr.

## Esercizi

1. Implementa `--json` con un serializzatore a mano (`Show` non basta).
2. Aggiungi `-s, --sort nome|freq` con ordinamento stabile.
3. Valida `--top` con `N >= 1`.
4. Leggi stdin in streaming.
5. Distingui "file inesistente" da "permesso negato".
6. Prova una property con QuickCheck.

<details>
<summary>Soluzione</summary>

1. `--json` si costruisce con `T.pack` e `show`, oppure con `aeson`; il test confronta la stringa e blocca l'ordine dei campi.

2. `frequenze` riceve il criterio e applica `sortOn` sul campo scelto.

3. Il programma verifica `top o < 1` e restituisce `Left "--top richiede un intero >= 1"`.

4. `lines` diventa un `foldl'` su blocchi con un contatore, e `words` gestisce le parole spezzate.

5. `try` cattura `IOException` e `isDoesNotExistError` distingue il caso.

6. QuickCheck verifica l'idempotenza di `conta`, ma non testa la CLI.

</details>

## Errori comuni

- **Aprire il file due volte**: la seconda lettura riparte da stdin esaurito e il risultato è vuoto.
- **Contare i caratteri invece dei byte**: `T.length` conta i code point, `T.length (T.encodeUtf8 t)` conta i byte.
- **Scrivere errori su stdout**: rompe le pipe; gli errori vanno su stderr.
- **Lasciare la logica dentro `main`**: il codice diventa `IO` ovunque e i test devono lanciare processi.
- **Testare solo il caso nominale**: input vuoto e file mancante rompono le pipeline.

## In sintesi

Haskell separa nettamente funzioni pure ed effetti, e il laboratorio la sfrutta: `conta` e `frequenze` si testano senza `IO`. `Either` porta gli errori nel tipo e `Main.hs` li traduce in exit code. Il passo successivo è l'ordinamento configurabile, che tocca solo l'output.

## Fonti

- [Cabal - Package description](https://cabal.readthedocs.io/en/stable/cabal-package-description-file.html), componenti `library`, `executable` e `test-suite` usati nel progetto.
- [Hackage - optparse-applicative](https://hackage.haskell.org/package/optparse-applicative), combinatore dei parser CLI con help ed errori.
- [Hackage - tasty](https://hackage.haskell.org/package/tasty), framework modulare per le suite di test.
- [Hackage - text](https://hackage.haskell.org/package/text), `lines`, `words` e codifica UTF-8 usati nel conteggio.
- [Hackage - base](https://hackage.haskell.org/package/base), `Either`, `Map` e funzioni della Prelude usate nel core.
