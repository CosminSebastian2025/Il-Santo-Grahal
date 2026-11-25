Haskell è un linguaggio funzionale puro e tipizzato staticamente, nato dalla ricerca e oggi usato in produzione per compilatori, finanza e strumenti di verifica. In Haskell non ci sono variabili mutabili: le funzioni restituiscono nuovi valori, e l'I/O è un valore che descrive azioni. In questa lezione impari le basi della sintassi e il modello mentale che rende il linguaggio diverso da quelli imperativi.

## Obiettivi

- Dichiarare tipi, funzioni e pattern matching senza mutare variabili.
- Usare liste, tuple e `map`, `filter`, `foldr` come strumento di base.
- Distinguere il codice puro da quello con effetti e capire come si usa `IO`.
- Riconoscere le type class fondamentali (`Eq`, `Ord`, `Show`, `Num`).
- Scrivere ed eseguire il primo modulo con GHC.

## Tipi, valori e funzioni pure

Il tipo viene sempre prima del corpo, e inferenza e annotazione convivono nello stesso file. Senza mutabilità non ci sono cicli: si scrivono definizioni che il compilatore valuta per sostituzione.

```haskell
module Basi where

-- una funzione non cambia mai il suo argomento, restituisce un nuovo valore
quadrato :: Int -> Int
quadrato n = n * n

sommaQuadrati :: [Int] -> Int
sommaQuadrati xs = sum (map quadrato xs)   -- map e sum sono nella Prelude

media :: [Double] -> Maybe Double
media [] = Nothing                         -- la lista vuota non ha media
media xs = Just (sum xs / fromIntegral (length xs))
```

`Maybe Double` rende esplicito il caso "nessun valore": al posto di `null` il risultato è `Nothing` o `Just x`, e chi usa la funzione deve gestire entrambi. L'applicazione per giustapposizione ha precedenza massima, quindi `quadrato 3 + 1` vale `(quadrato 3) + 1`.

| Concetto | Esempio | Nota |
| --- | --- | --- |
| tipo di funzione | `f :: a -> b` | `a` e `b` sono variabili di tipo |
| currying | `(+) 1` | ogni funzione ha un solo argomento |
| definizione per casi | `f [] = 0` | vince il primo pattern che combacia |
| let e where | `where y = x + 1` | definizioni locali |
| tipo algebrico | `data Forma = Cerchio Double` | costruttori con pattern |

## Liste, pattern matching e ricorsione

La lista è un elemento concatenato al resto con `:`, terminata da `[]`, quindi ogni funzione sulla lista si scrive per casi: lista vuota ed elemento più resto.

```haskell
-- concatenazione con pattern matching
appendi :: [a] -> [a] -> [a]
appendi []     ys = ys
appendi (x:xs) ys = x : appendi xs ys

-- conteggio delle parole
contaParole :: String -> Int
contaParole testo = length (words testo)   -- words separa sugli spazi

-- firma che accetta qualsiasi tipo con divisione
mediaLista :: (Fractional a) => [a] -> a
mediaLista xs = sum xs / fromIntegral (length xs)
```

`appendi` funziona per qualsiasi tipo `a`: è polimorfismo parametrico, e il compilatore garantisce che il corpo non possa inventare valori di `a`. `mediaLista` invece chiede la capacità `Fractional`, cioè un tipo che sappia dividere.

```haskell
-- foldr sostituisce la ricorsione esplicita
sommaQuadraPari :: [Int] -> Int
sommaQuadraPari = foldr (\x acc -> if even x then x * x + acc else acc) 0

-- zipWith si ferma alla lista piu corta
prodottoScalare :: [Int] -> [Int] -> Int
prodottoScalare xs ys = sum (zipWith (*) xs ys)
```

Riconoscere la ricorsione dentro la funzione standard è il modo più rapido per ridurre il codice. `words`, `lines` e `foldr` coprono la maggior parte delle trasformazioni su testo.

## Type class e tipi algebrici

Una type class dichiara le operazioni che un tipo deve fornire; un'istanza fornisce l'implementazione. `Eq`, `Ord` e `Show` sono quelle che quasi ogni tipo deriva automaticamente.

```haskell
data Forma = Cerchio Double | Rettangolo Double Double
  deriving (Show, Eq)                       -- stampa e uguaglianza gratis

area :: Forma -> Double
area (Cerchio r)      = pi * r * r
area (Rettangolo w h) = w * h

instance Ord Forma where
  compare a b = compare (area a) (area b)   -- ordina per area
```

`data` definisce un tipo con costruttori, e il pattern matching in `area` obbliga il compilatore a segnalare i casi mancanti. Le istanze possono avere vincoli, come `Eq a => Eq [a]` per le liste: è lo stesso meccanismo che permette `sort` su qualsiasi elemento ordinabile.

## Effetti e I/O

Le funzioni pure non possono stampare né leggere: `main :: IO ()` è un valore che descrive un programma, e il runtime lo esegue. Dentro `IO` le azioni si compongono con `do`.

```haskell
module Main where

import System.Environment (getArgs)

leggi :: FilePath -> IO String
leggi percorso = readFile percorso

main :: IO ()
main = do
  argomenti <- getArgs                   -- si entra nel mondo con IO
  case argomenti of
    [percorso] -> do
      testo <- leggi percorso
      putStrLn ("righe: " ++ show (length (lines testo)))   -- lines conta le righe
    _ -> putStrLn "uso: conta FILE"
```

Il punto da ricordare è la separazione: la logica pura resta testabile senza `IO`, e `main` contiene solo la parte effettiva. Le eccezioni di I/O sono valori `IOError`, intercettabili con `catch`; per gli errori previsti si preferisce `Either` o `Maybe`.

## Errori comuni

- **Pensare a `let` come a una mutazione**: in Haskell riassegnare un nome è un errore di compilazione.
- **Ignorare i warning sui pattern non esaustivi**: il caso mancante diventa un crash a runtime.
- **Confondere `String` e `Text`**: `String` è una lista di `Char`, didattica ma lenta; per dati reali serve `Data.Text`.
- **Forzare tutta la logica dentro `main`**: il codice con effetti diventa non testabile e difficile da comporre.
- **Usare `head` senza controllo**: fallisce su lista vuota; meglio pattern matching o `Maybe`.

## In sintesi

Haskell separa valori e calcolo: le funzioni sono pure e il tipo esprime l'assenza con `Maybe`. Liste e ricorsione per casi sostituiscono i cicli, e `foldr`, `map` e `words` coprono quasi tutto. Le type class aggiungono capacità in modo generico e `IO` isola gli effetti. Il prossimo passo è GHCup, Cabal e test.

## Fonti

- [Haskell - The Haskell programming language](https://www.haskell.org/), sito ufficiale con documentazione e link alle guide.
- [Haskell Wiki](https://wiki.haskell.org/Haskell), riferimento comunitario su sintassi, classi e moduli.
- [Haskell - Get started](https://www.haskell.org/get-started/), percorso ufficiale di installazione e primi passi.
- [Hackage - base](https://hackage.haskell.org/package/base), documentazione della libreria standard: Prelude, liste e classi.
- [Haskell Wiki - Type class](https://wiki.haskell.org/Type_class), spiegazione delle type class con esempi.
