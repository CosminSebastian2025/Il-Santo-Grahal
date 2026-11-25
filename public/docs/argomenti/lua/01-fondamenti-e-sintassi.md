Lua è un linguaggio di scripting leggero e interpretato, progettato per essere incorporato dentro altri programmi: dal 1993 vive in motori di gioco, web server, plugin e applicazioni embedded. Ha poche regole, una sintassi compatta e un modello di dati basato quasi solo sulle tabelle. In questa lezione impari la sintassi di base, la semantica degli ambiti e come la VM esegue un file.

## Obiettivi

- Distinguere i tipi del linguaggio e la verità booleana di Lua.
- Usare tabelle come array, dizionari e oggetti, con lunghezza e metatabelle.
- Scrivere funzioni, funzioni variadiche e chiusure con ambiti corretti.
- Gestire gli errori con `pcall` ed `error`, senza eccezioni tradizionali.
- Eseguire script con l'interprete `lua` e capire il ruolo della VM.

## Tipi, valori e tabelle

Lua ha otto tipi: `nil`, `boolean`, `number`, `string`, `function`, `userdata`, `thread` e `table`. In Lua 5.4 i numeri sono interi a 64 bit o float a doppia precisione, e le stringhe sono immutabili.

```lua
local nome = "Ada"          -- stringa immutabile
local intero, reale = 42, 3.5 -- integer e float distinti in 5.4
local attivo = true
local niente                  -- nil: assenza di valore

print(1 + 1.5)            -- 2.5
print(7 // 2, 7 % 2)      -- 3 e 1: divisione intera e modulo
print(#"ciao")            -- 4: lunghezza di una stringa
```

La **tabella** è l'unica struttura composta e serve per tutto: array, record, namespace, code e moduli. Associa chiavi a valori, e gli indici numerici consecutivi da 1 formano la parte "sequenza".

```lua
local lista = { "a", "b", "c" }   -- indici 1, 2, 3
local punto = { x = 10, y = 20 } -- chiavi stringa
local misto = {}                 -- tabella vuota
misto[1] = "primo"
misto["nome"] = "zona"
print(lista[1], punto.x, misto.nome)
```

| Espressione | Verità |
| --- | --- |
| `nil` | falso |
| `false` | falso |
| `0` | vero |
| `""` | vero |
| `{}` | vero |

La lunghezza `#t` è definita per le sequenze, non per le tabelle con buchi: un `nil` in mezzo rende `#` imprevedibile, quindi si usano `table.insert` e `table.remove`.

## Ambiti, funzioni e chiusure

Le variabili si dichiarano con `local`; senza `local` finiscono nella tabella globale `_G`, cosa da evitare fuori dall'esperimento. Un blocco (`do ... end`, corpo di un ciclo o di una funzione) crea un nuovo ambito.

```lua
local contatore = 0
local function incrementa()   -- chiusura sull'upvalue contatore
    contatore = contatore + 1 -- modifica la variabile esterna
    return contatore
end

incrementa(); incrementa()
print(contatore) -- 2

local function somma(...)      -- variadica: tre punti
    local totale = 0
    for i = 1, select("#", ...) do
        totale = totale + select(i, ...)
    end
    return totale
end
print(somma(1, 2, 3)) -- 6
```

Le funzioni sono valori di prima classe: si passano, si restituiscono e si memorizzano in tabelle. Il **method call** con i due punti (`oggetto:metodo()`) è zucchero per `oggetto.metodo(oggetto)` ed è il fondamento dell'orientamento agli oggetti in Lua.

```lua
local M = {}
function M.saluta(self) return "ciao " .. self.nome end
print(M:saluta({ nome = "Lea" })) -- ciao Lea
```

Una funzione dichiarata come `function f()` senza `local` crea una globale: è la fonte di bug più comune nelle prime settimane.

## Errori, esecuzione e VM

Lua non ha `try/catch`: gli errori sono valori e la funzione protetta è `pcall`. `pcall(f, ...)` chiama `f` e restituisce `true` più i risultati oppure `false` più il messaggio d'errore. `error` interrompe l'esecuzione corrente.

```lua
local function dividi(a, b)
    if b == 0 then error("divisione per zero", 2) end
    return a / b
end

local ok, risultato = pcall(dividi, 10, 0)
if ok then print(risultato) else print("errore: " .. risultato) end
```

Lo script è compilato in bytecode ed eseguito dalla macchina virtuale di Lua. `lua file.lua` avvia la VM, crea la funzione principale e la chiama; `lua -i` apre una REPL. Il garbage collector è incrementale, con allocazione contigua di step regolabile tramite `collectgarbage`.

```bash
lua -v                       # versione dell'interprete
lua script.lua arg1 arg2     # arg è una tabella con gli argomenti
lua -e 'print(_VERSION)'     # esegue una stringa
luac -l script.lua           # elenca il bytecode generato
```

## Errori comuni

- **Dimenticare `local`**: la variabile diventa globale e il bug compare lontano dalla dichiarazione.
- **Usare `#` su tabelle con `nil`**: la lunghezza diventa ambigua; usa `table.insert` e `table.remove` per mantenere la sequenza.
- **Assumere che `0` e `""` siano falsi**: solo `nil` e `false` lo sono.
- **Confondere `==` e `~=`**: `~=` è la disuguaglianza, e `==` confronta il valore, non credere che le tabelle siano uguali per contenuto.
- **Leggere `pcall` al contrario**: il primo risultato è lo stato booleano, non il valore.

## In sintesi

Lua è piccolo per costruzione: pochi tipi, una tabella onnipotente e regole di verità semplici. Le chiusure e le funzioni di prima classe danno flessibilità, mentre `pcall` rende espliciti gli errori. Lo script gira nella VM di Lua, che l'interprete avvia in un attimo e che può essere incorporata in C. Il codice di qualità in Lua è riconoscibile da una cosa: quasi tutte le variabili sono `local`.

## Fonti

- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
- [Programming in Lua](https://www.lua.org/pil/)
- [Lua - Getting Started](https://www.lua.org/start.html)
- [Lua - About the language](https://www.lua.org/about.html)
