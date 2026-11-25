Un progetto Fennel cresce come un progetto Lua: moduli, un `main`, eventuali dipendenze da Luarocks e un interprete che carica i file. La differenza è che la sintassi passa prima da un compilatore, quindi servono convenzioni per i sorgenti `.fnl`, per la fase di build e per i test. In questa lezione vedi come strutturare un progetto, come testarlo con `fennel.testing` e come distribuire il Lua generato.

La regola che tiene insieme tutto è semplice: il codice distribuito è Lua, il codice manutenuto è Fennel. Chi adotta Fennel in un progetto esistente parte quasi sempre da un modulo o due, li compila e verifica che il Lua prodotto sia leggibile e compatibile con il resto della base di codice; solo dopo converte altro. Una migrazione completa, invece, è raramente un buon primo passo.

## Obiettivi

- Organizzare sorgenti `.fnl`, output `.lua` e un entry point coerente.
- Integrare Fennel con Lua e con il gestore di pacchetti Luarocks.
- Scrivere test con `fennel.testing` ed eseguirli senza framework esterni.
- Compilare per LuaJIT e per ambienti con una sola versione di Lua.
- Pesare i limiti del tooling e i casi in cui conviene restare in Lua.

## Struttura di un progetto

La convenzione più leggibile separa sorgenti e artefatti: `src/` contiene i `.fnl`, `dist/` o un'altra cartella contiene i `.lua` compilati, `init.fnl` è l'entry point. Il modulo `main` importa moduli con `require` e nomi allineati ai file, così il caricatore di Lua trova il percorso giusto senza configurazioni speciali.

```bash
my-app/
  src/
    init.fnl          # entry point leggibile
    conti.fnl         # modulo con la logica pura
  test/
    conti_test.fnl    # test isolati sul modulo
  dist/               # output .lua, generato da fennel -c src
```

Il comando `fennel -c src --output dist` traduce l'albero mantenendo la gerarchia, e il programma si avvia con `lua dist/init.lua` oppure con `fennel src/init.fnl` durante lo sviluppo. Nel codice, i moduli restituiscono una tabella di funzioni pubbliche: è lo stesso contratto dei moduli Lua, e rende il confine testabile. Un entry point che contiene solo il parse degli argomenti e le chiamate al modulo principale resta breve e leggibile, e lo stesso vale per la logica: senza accesso al filesystem, i test non hanno bisogno di fixture.

```fennel
;; src/conti.fnl: logica pura, nessun I/O
(fn somma [lista]
  (var totale 0)
  (each [_ n (ipairs lista)]
    (set totale (+ totale n)))
  totale)

{: somma}  ; l'ultima espressione e il modulo esportato
```

## Dipendenze e interoperabilità con Lua

Fennel non ha un registro di pacchetti proprio: le dipendenze sono moduli Lua installati con `luarocks`, oppure codice Fennel incluso nel progetto. Un file Fennel può `require` una libreria Lua e viceversa, purché il compilatore abbia prodotto `.lua` validi. Le librerie con API basate su tabelle e funzioni si usano senza adattatori.

```fennel
;; dipendenza installata con: luarocks install inspect
(local inspect (require :inspect)) ; modulo Lua caricato da LuaRocks

(fn debug-tabella [t] (print (inspect t)))

;; la tabella locale si serializza per leggere lo stato
(debug-tabella {:a 1 :b [2 3]})
```

Il wrapping di una libreria Lua segue lo stesso schema: `require` restituisce una tabella e le chiamate si fanno con `(: libreria :funzione arg)` oppure `(libreria.funzione arg)`.

| Fase | Strumento | Cosa produce |
| --- | --- | --- |
| dipendenze | `luarocks install nome` | moduli Lua su `package.path` |
| build | `fennel -c src --output dist` | file `.lua` per modulo |
| esecuzione in sviluppo | `fennel src/init.fnl` | compila al volo |
| esecuzione in produzione | `lua dist/init.lua` | solo Lua, nessun `.fnl` |
| target alternativo | `luajit dist/init.lua` | codice compatibile con LuaJIT |

Il target conta: Fennel compila per la versione di Lua che scegli, e funzionalità come gli interi a 64 bit di Lua 5.3 esistono solo su quel target. Se distribuiscisci su LuaJIT conviene verificare l'output e fissare la versione, perché le differenze emergono in fase di esecuzione e non in fase di compilazione.

## Testing e debug

`fennel.testing` è il modulo di test integrato: `assert-*` confronta valori e `assert-equal` messaggi di errore. I test sono file normali eseguiti con l'interprete `fennel`, e un errore produce un messaggio con file e riga del sorgente `.fnl`, non del Lua compilato. Il ciclo tipico è un comando in watch, che ricompila e rilancia i test a ogni modifica.

```fennel
;; test/conti_test.fnl
(local t (require :fennel.testing))
(local conti (require :conti))

(t.test "somma lista vuota"
  (t.assert-equal 0 (conti.somma [])))

(t.test "somma con numeri"
  (t.assert-equal 6 (conti.somma [1 2 3])))

(t.test "la somma di una lista vuota e zero"
  (t.assert-equal 0 (conti.somma []))) ; ridondante: il primo test basta
```

Per il debug, `fennel --compile` è lo strumento più importante, perché mostra cosa esegue davvero l'interprete Lua; la REPL con `--repl` permette di valutare forme una alla volta. Le tracce di errore in produzione puntano ai file Lua, quindi conviene aggiungere commenti `;; linea` oppure conservare i sorgenti accanto agli artefatti. In CI un job minimo compila in `dist/` ed esegue i test con `fennel`, mentre il pacchetto pubblicato contiene solo il Lua: la verifica dei tipi non esiste, perché Lua non ha tipizzazione statica, e i test coprono ciò che il compilatore non può garantire.

## Errori comuni

- **Compilare in una cartella mista ai sorgenti**: i `.lua` in `src/` vengono scritti sopra i `.fnl` da altri comandi, e la build diventa ambigua.
- **Dipendenze senza Luarocks**: `require` fallisce in produzione se il modulo non è su `package.path` della macchina di esecuzione.
- **Testare solo il caso felice**: i moduli di conto falliscono prima sui tipi sbagliati che sui valori normali.
- **Ignorare la versione di Lua**: funzioni come `string.pack` esistono da Lua 5.3 e rompono l'esecuzione su LuaJIT.
- **Distribuire `.fnl` senza interprete**: sulla macchina di destinazione serve `fennel` installato, oppure i `.lua` compilati.

## In sintesi

Un progetto Fennel si organizza come un progetto Lua, con la separazione aggiuntiva tra sorgenti e artefatti compilati. Luarocks fornisce le dipendenze, `fennel -c` produce i `.lua` e `fennel.testing` copre i test senza framework esterni. Il risultato in produzione è Lua puro: la scelta di Fennel resta nella fase di sviluppo e nella manutenzione, non nel runtime.

## Fonti

- [Fennel - Setup](https://fennel-lang.org/setup)
- [Fennel Reference](https://fennel-lang.org/reference)
- [Fennel - Sito ufficiale](https://fennel-lang.org/)
- [Luarocks - Luarocks.org](https://luarocks.org/)
- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
