In questo laboratorio costruisci `lua-todo`, un gestore di attività da riga di comando che salva i dati in un file di testo. Il progetto serve a mettere insieme i pezzi di un programma Lua manutenibile: moduli con `require`, errori con `pcall`, I/O su file e test eseguibili senza framework. Alla fine avrai una base funzionante e testata, pronta da estendere.

## Obiettivi

- Strutturare un progetto Lua in moduli separati e caricarli con `require`.
- Rappresentare l'elenco di attività con tabelle e funzioni del modulo.
- Persistere i dati su file in un formato lineare semplice e leggibile.
- Gestire errori di I/O e input non valido senza crash.
- Scrivere test con `assert` ed eseguirli con l'interprete `lua`.

## Il contratto di `lua-todo`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `lua todo.lua [--file F] COMANDO [ARGS]` | un comando per invocazione |
| `list` | elenca le attività con l'id | lettura |
| `add TESTO` | aggiunge e stampa l'id | scrittura |
| `done ID` | segna come completata | scrittura |
| `--file F` | file di stato, default `todo.db` | isolamento nei test |
| exit 1 | file illeggibile o id inesistente | errore operativo |

I comandi restituiscono codici di uscita stabili: 0 per successo, 1 per un errore confermato. Gli argomenti sono nella tabella globale `arg`, con lo script a partire da `arg[1]`.

```bash
lua todo.lua --file /tmp/piano.db add "scrivere la lezione"
lua todo.lua --file /tmp/piano.db list
lua todo.lua --file /tmp/piano.db done 1; printf 'exit: %s\n' "$?"
```

## Il modulo dell'elenco

Il file `elenco.lua` gestisce struttura e persistenza. La lettura usa `f:lines()` e la scrittura `io.open(path, "w")`; il modulo restituisce una tabella di funzioni e nasconde lo stato.

```lua
-- elenco.lua
local M = {}

local function escape(testo)          -- le barre nel testo diventano spazi
    return (testo:gsub("[|]", " "))
end

function M.carica(percorso)
    local righe = {}
    local f = io.open(percorso, "r")
    if not f then return righe end   -- file assente: elenco vuoto
    for riga in f:lines() do
        local id, stato, testo = riga:match("^(%d+)|(%a+)|(.*)$")
        if id then
            righe[#righe + 1] = { id = tonumber(id), fatto = stato == "done", testo = testo }
        end
    end
    f:close()
    return righe
end

function M.salva(percorso, righe)
    local f, err = io.open(percorso, "w")
    if not f then error(err) end     -- l'errore arriva al pcall del chiamante
    for _, r in ipairs(righe) do
        f:write(string.format("%d|%s|%s\n", r.id, r.fatto and "done" or "open", r.testo))
    end
    f:close()                        -- sempre, o il buffer resta in memoria
end

return M
```

`M.carica` restituisce sempre una tabella: le righe malformate vengono scartate perché il pattern non combacia, e un file assente non è un errore. `M.salva` invece chiama `error` quando la scrittura fallisce, e chi chiama la protegge con `pcall`.

Il modulo `comandi.lua` implementa le tre azioni. L'id è il massimo esistente più uno, quindi non viene riutilizzato dopo una cancellazione.

```lua
-- comandi.lua
local elenco = require("elenco")
local M = {}

function M.list(righe)
    for _, r in ipairs(righe) do
        print(string.format("%d [%s] %s", r.id, r.fatto and "x" or " ", r.testo))
    end
end

function M.add(righe, testo)
    local max = 0
    for _, r in ipairs(righe) do if r.id > max then max = r.id end end
    righe[#righe + 1] = { id = max + 1, fatto = false, testo = testo }
    print(max + 1)                   -- id assegnato, utile agli script
end

function M.done(righe, id)
    for _, r in ipairs(righe) do
        if r.id == id then
            r.fatto = true
            return true
        end
    end
    return false                     -- id inesistente: decide il chiamante
end

M.elenco = elenco
return M
```

Il `todo.lua` principale si occupa solo di argomenti, comandi e codice di uscita. Per le scritture protegge `salva` con `pcall`, così un errore di filesystem viene riportato su stderr invece di produrre un traceback.

```lua
-- todo.lua
local comandi = require("comandi")
local elenco = comandi.elenco

local percorso, args = "todo.db", {}
local i = 1
while i <= #arg do
    if arg[i] == "--file" and arg[i + 1] then
        percorso = arg[i + 1]
        i = i + 2
    else
        args[#args + 1] = arg[i]
        i = i + 1
    end
end

local righe = elenco.carica(percorso)
local cmd = args[1]
local ok, err = pcall(function()         -- protegge anche salva
    if cmd == "list" then
        comandi.list(righe)
    elseif cmd == "add" and args[2] then
        comandi.add(righe, args[2])
        elenco.salva(percorso, righe)
    elseif cmd == "done" and tonumber(args[2]) then
        if not comandi.done(righe, tonumber(args[2])) then
            error("id inesistente: " .. args[2])
        end
        elenco.salva(percorso, righe)
    else
        error("uso: list | add TESTO | done ID")
    end
end)
if not ok then
    io.stderr:write(tostring(err) .. "\n")
    os.exit(1)
end
```

## Test e verifica manuale

I test non richiedono framework: un file `test.lua` con `assert` che stampa un messaggio se tutto passa. Per isolare il filesystem si usa `os.tmpname()` e si rimuove il file alla fine.

```lua
-- test.lua
local elenco = require("elenco")
local comandi = require("comandi")

local righe = {}
comandi.add(righe, "primo")
comandi.add(righe, "secondo")
assert(#righe == 2, "due attività attese")
assert(righe[2].id == 2, "id progressivi")
assert(comandi.done(righe, 1) == true, "done su id esistente")
assert(righe[1].fatto == true, "lo stato è cambiato")
assert(comandi.done(righe, 99) == false, "done su id inesistente")

local tmp = os.tmpname()
elenco.salva(tmp, righe)
local ricaricate = elenco.carica(tmp)
os.remove(tmp)
assert(#ricaricate == 2 and ricaricate[1].fatto, "roundtrip della persistenza")

print("tutti i test passano")
```

```bash
lua test.lua
```

## Esercizi

1. Aggiungi il comando `rm ID` che elimina un'attività e salva l'elenco, con exit 1 se l'id non esiste.
2. Gestisci testi con `|` senza perdere caratteri, scegliendo un formato che li supporti.
3. Aggiungi `list --fatto` per filtrare solo le attività completate, senza cambiare il default.
4. Rendi `lua-todo` utilizzabile come modulo: una funzione `nuovo(percorso)` che restituisce un oggetto con metodi.
5. Aggiungi un test che verifichi il comportamento con un file di stato assente.
6. Sostituisci `print` con un writer iniettabile, così un test possa catturare l'output.

<details>
<summary>Soluzione</summary>

1. In `comandi.lua` una funzione `rm(righe, id)` scorre con `ipairs` e chiama `table.remove(righe, i)` all'indice trovato; nel `todo.lua` si aggiunge il ramo `cmd == "rm"` con l'errore per id assente.

2. Con `|` nel testo il formato si rompe: si può serializzare ogni campo con `%q` di `string.format`, oppure documentare la sostituzione con uno spazio come limite accettato. Entrambe le scelte richiedono un test dedicato.

3. `list` riceve un secondo parametro `filtro`: quando vale `"fatto"` salta le righe con `not r.fatto`. Il default resta `nil`, quindi il contratto per gli script non cambia.

4. `nuovo(percorso)` carica le righe e restituisce `setmetatable({ righe = righe, percorso = percorso }, Oggetto)`, con `Oggetto.__index = Oggetto` e metodi `add`, `done`, `salva`.

5. Il test chiama `elenco.carica(os.tmpname())` su un nome generato e non creato: deve dare `#righe == 0` senza errore, perché l'assenza del file è un caso legittimo.

6. I metodi di `comandi` accettano un writer e usano `writer:write(...)` al posto di `print`; nel test si passa una tabella con il campo `write` e si verifica ciò che ha accumulato.

</details>

## Errori comuni

- **Usare `print` dentro i moduli**: l'output non è sostituibile e i test non possono catturarlo.
- **Dimenticare `f:close()`**: il buffer non arriva su disco e il file resta vuoto.
- **Trattare il file assente come errore**: il primo avvio di un programma è sempre "vuoto".
- **Riutilizzare gli id cancellati**: gli script che memorizzano id poi colpiscono l'attività sbagliata.
- **Nomi di modulo non allineati ai file**: `require("comandi")` cerca `comandi.lua` nel percorso di `package.path`.

## In sintesi

Un programma Lua utile è fatto di moduli che restituiscono tabelle, con un file principale sottile e responsabilità separate. Gli errori si propagano con `error` e si catturano con `pcall`, mentre I/O e persistenza restano nel modulo che li possiede. I test con `assert` bastano finché la logica è piccola, e i file temporanei di `os.tmpname()` rendono riproducibili quelli che toccano il filesystem.

## Fonti

- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
- [Programming in Lua](https://www.lua.org/pil/)
- [Lua - Getting Started](https://www.lua.org/start.html)
- [LuaRocks - package manager](https://luarocks.org/)
