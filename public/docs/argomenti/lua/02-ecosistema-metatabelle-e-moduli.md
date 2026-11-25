Lua non arriva quasi mai da solo: nell'uso reale è il linguaggio di scripting dentro un altro programma, che gli espone API e servizi. L'ecosistema è fatto di metatabelle, una libreria standard compatta, il sistema `require` e il gestore di pacchetti esterno LuaRocks. In questa lezione vedi come si costruisce software in Lua e dove il linguaggio è effettivamente impiegato.

## Obiettivi

- Costruire oggetti con metatabelle e `__index`, con eredità tra classi.
- Organizzare il codice in moduli con `require` e `package.path`.
- Conoscere le librerie standard utili e i loro limiti.
- Usare LuaRocks per dipendenze, rockspec e ambienti isolati.
- Collocare Lua nei contesti reali: giochi, web, IoT e scripting applicativo.

## Metatabelle e orientamento agli oggetti

Lua non ha classi native, ma le metatabelle permettono di definire comportamenti speciali: `__index` per la ricerca di chiavi mancanti, `__newindex` per le assegnazioni, `__add`, `__eq`, `__tostring` per gli operatori. È così che si costruiscono oggetti e classi.

```lua
local Animale = {}
Animale.__index = Animale

function Animale:nuovo(nome)
    return setmetatable({ nome = nome }, self) -- istanza col metatable della classe
end

function Animale:verso() return "..." end

local Cane = setmetatable({}, { __index = Animale }) -- eredità
Cane.__index = Cane

function Cane:verso() return "bau" end

local cane = Cane:nuovo("Rex") -- self è Cane, quindi l'istanza eredita da Cane
print(cane:verso()) -- bau, metodo ridefinito
print(cane.nome)    -- Rex, da __index nella catena di classi
```

Un metodo ereditato si cerca risalendo `__index`; un metodo ridefinito nella sottoclasse vince, come in qualsiasi sistema a prototipi.

| Metametodo | Si attiva con | Uso tipico |
| --- | --- | --- |
| `__index` | lettura di chiave assente | ereditarietà, default |
| `__newindex` | scrittura di chiave assente | validazione, proxy |
| `__tostring` | `tostring(t)` | log leggibili |
| `__eq` | `t1 == t2` | confronto per valore |
| `__call` | `t(...)` | oggetti richiamabili |

I metametodi rendono Lua flessibile, ma vanno documentati: una catena di `__index` lunga rende le prestazioni imprevedibili e il debugging faticoso.

## Moduli, `require` e libreria standard

Un modulo è una tabella restituita da un file, caricata una sola volta da `require` e memorizzata in `package.loaded`. Il percorso di ricerca è `package.path`, dove `?` segna il segnaposto per il nome del modulo.

```lua
-- file geometria.lua
local M = {}

function M.area_rettangolo(l, h)
    return l * h
end

return M
```

```lua
-- file main.lua
local geometria = require("geometria") -- esegue il file una volta
print(geometria.area_rettangolo(3, 4)) -- 12
```

La libreria standard è volutamente piccola: `string` con pattern Lua (diversi dalle regex), `table`, `math`, `os`, `io`, `coroutine`. I pattern coprono la maggior parte dei casi di parsing e si imparano prima di un motore regex, ma non hanno alternanza né classi Unicode.

```lua
local s = "nome=Ada;eta=37"
for chiave, valore in s:gmatch("(%w+)=(%w+)") do
    print(chiave, valore) -- nome e eta con i valori
end
print(("abc"):upper(), table.concat({"a", "b"}, "-")) -- ABC a-b
```

## LuaRocks e test

LuaRocks è il gestore di pacchetti de facto e distribuisce "rocks": librerie con un file `.rockspec` che dichiara versione, sorgenti e dipendenze. Le rock possono includere codice C, quindi serve un compilatore.

```bash
luarocks install luasocket        # modulo di rete
luarocks install --local inspect # solo per l'utente corrente
luarocks make                     # build dal rockspec locale
```

| Comando | Effetto |
| --- | --- |
| `luarocks install <rock>` | installa nel tree globale |
| `luarocks install --local <rock>` | installa in `~/.luarocks` |
| `luarocks make` | costruisce dal rockspec del progetto |
| `luarocks remove <rock>` | disinstalla |

Non esiste un test framework ufficiale: `busted` e `luaunit` sono le scelte comuni, e i test sono file che chiamano asserzioni e un runner.

## Casi d'uso reali

Lua vive soprattutto come linguaggio di configurazione e di estensione: il programma principale resta in C o Rust e Lua ne configura il comportamento.

| Contesto | Ruolo di Lua | Attenzione |
| --- | --- | --- |
| giochi | scripting di livelli, mod e UI | sandbox delle API esposte |
| web e API | logica per richiesta in Nginx/OpenResty | CPU limitata per richiesta |
| dispositivi embedded | automazione di router e apparati | memoria ridotta |
| scripting applicativo | estensione di programmi esistenti | isolamento degli script |

OpenResty esegue Lua nel ciclo di richiesta di Nginx, Neovim e Redis la usano per gli script, e molti motori di gioco la espongono agli utenti. La sicurezza dipende dalle funzioni esposte: uno script non deve poter accedere a `os.execute` o al filesystem se non serve.

## Errori comuni

- **Esporre `_G` e `os` agli script untrusted**: script esterni ottengono accesso a rete e filesystem.
- **Sovrascrivere `__index` di un'istanza**: l'ereditarietà si rompe e le prestazioni peggiorano.
- **Caricare lo stesso modulo con nomi diversi**: `require` riconosce solo il nome esatto, e il modulo viene eseguito due volte.
- **Dimenticare il `return M` nel modulo**: `require` restituisce `true` invece della tabella.
- **Assumere che i pattern Lua siano regex**: non hanno lookahead, backreference né classi POSIX complete.

## In sintesi

Lua diventa potente con le metatabelle, che danno oggetti e proxy senza cambiare il linguaggio. I moduli sono semplici file che restituiscono tabelle, caricate da `require` con `package.path`. LuaRocks copre le dipendenze, mentre test e lint dipendono da librerie esterne. L'uso reale è l'embedding: Lua configura e estende programmi scritti in altri linguaggi, e la sicurezza dipende da cosa gli esponi.

## Fonti

- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
- [Programming in Lua - Metatables](https://www.lua.org/pil/)
- [LuaRocks - package manager](https://luarocks.org/)
- [Lua - Getting Started](https://www.lua.org/start.html)
