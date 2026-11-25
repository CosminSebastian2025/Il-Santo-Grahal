In questo laboratorio costruisci `fennel-todo`, una CLI minimale per una lista di attività salvata in JSON, scritta in Fennel e distribuita come Lua compilato. Il progetto esercita moduli separati, I/O con la libreria Lua standard e test con `fennel.testing`. Alla fine avrai un comando con sottocomandi, un file di stato e una suite di test senza dipendenze esterne.

## Obiettivi

- Progettare un contratto CLI con sottocomandi, file di stato e codici di uscita.
- Separare il core puro (parse e serializzazione) dai moduli che fanno I/O.
- Persistere lo stato in un file JSON con errori gestiti in modo esplicito.
- Scrivere test con `fennel.testing` sul core, senza toccare il disco.
- Distribuire il progetto come `.lua` compilato interrogando l'interprete.

## Il contratto di `fennel-todo`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `fennel-todo [--db FILE] SOTTOCOMANDO` | un solo punto di ingresso |
| `add TESTO` | aggiunge un'attività aperta | id incrementale |
| `list` | stampa `id  stato  testo` | output stabile, senza colore |
| `done ID` | marca completata un'attività | errore se l'id non esiste |
| exit 0 | successo | anche su lista vuota |
| exit 1 | file illeggibile o id sconosciuto | errore operativo su stderr |

Il file di stato è JSON perché così `fennel-todo` può essere letto da altri strumenti; la scelta impone però un formato minimo, con id numerico e booleano per lo stato. Un id inesistente è un errore, non un caso silenzioso.

```bash
fennel-todo add "scrivere i test"      # stampa l'id assegnato: 1
fennel-todo add "documentare il formato"
fennel-todo list                        # 1  aperta  scrivere i test
fennel-todo done 1; printf 'exit: %s\n' "$?"
fennel-todo done 99; printf 'exit: %s\n' "$?"
```

## Core: parse e serializzazione

Il core non fa I/O: riceve tabelle, restituisce tabelle e non conosce il percorso del file. Il primo modulo costruisce e modifica la lista, il secondo la traduce in JSON, e i test verificano stringhe e strutture, non schermate.

```fennel
;; src/core.fnl: funzioni pure, nessuna chiamata al filesystem
(fn prossimo-id [voci]
  (var massimo 0)
  (each [_ v (ipairs voci)]
    (when (> v.id massimo) (set massimo v.id)))
  (+ massimo 1))

(fn aggiungi [voci testo]
  ;; restituisce la lista nuova con l'elemento in coda
  (local id (prossimo-id voci))
  (tset voci (+ (length voci) 1) {:id id :testo testo :fatto false})
  [id voci])

(fn completa [voci id]
  ;; cambia lo stato solo se l'id esiste, altrimenti restituisce nil
  (var trovato nil)
  (each [_ v (ipairs voci)]
    (when (= v.id id)
      (set trovato v)
      (set v.fatto true)))
  trovato)

{: aggiungi : prossimo-id : completa}
```

`aggiungi` restituisce l'id per stampare un messaggio utile dal modulo CLI, e `completa` restituisce `nil` quando l'id manca: il chiamante decide se è un errore. La serializzazione è scritta a mano perché la libreria standard di Lua non include JSON.

```fennel
;; src/json.fnl: serializzazione minimale e deterministica
(fn escape [s]
  ;; gestisce solo backslash e virgolette, i soli caratteri che rompono il formato
  (let [x (s:gsub "\\\\" "\\\\\\\\")]
    (x:gsub "\"" "\\\\\"")))

(fn voce-json [v]
  (string.format "{\"id\":%d,\"fatto\":%s,\"testo\":\"%s\"}"
                 v.id (tostring v.fatto) (escape v.testo)))

(fn serializza [voci]
  (local pezzi (icollect [_ v (ipairs voci)] (voce-json v)))
  (.. "[" (table.concat pezzi ",") "]"))
```

## I/O, CLI e distribuzione

Il modulo CLI legge gli argomenti, apre il file con `io.open` e traduce gli errori in codici di uscita. Ogni fallimento — file assente, JSON malformato, id sconosciuto — produce un messaggio su stderr e exit 1.

```fennel
;; src/init.fnl: I/O e mappatura degli errori in codici di uscita
(local core (require :core))
(local json (require :json))

(fn leggi [percorso]
  (local f (io.open percorso "r"))
  (when (not f) (error (.. "impossibile leggere " percorso)))
  (let [contenuto (f:read "*a")]
    (f:close)
    contenuto)) ; il JSON si decodifica con una libreria compatibile

(fn main [argv]
  (let [sottocomando (. argv 1)
        parametro (. argv 2)]
    (case sottocomando
      "add" (print ((core.aggiungi (leggi "todo.json") parametro)))
      "list" (print (json.serializza (leggi "todo.json")))
      _ (do (io.stderr:write "uso: fennel-todo add|list|done\n")
            (os.exit 1)))))

(main [(select 2 (table.unpack _G.arg nil 1))])
```

La build fa parte del contratto: `fennel -c src --output dist` compila i moduli e `lua dist/init.lua` li esegue sui soli `.lua`. I test girano sui sorgenti con `fennel test/core_test.fnl`, così gli errori puntano al codice scritto.

```bash
fennel -c src --output dist          # produce dist/*.lua
lua dist/init.lua list               # distribuzione senza interprete Fennel
fennel test/core_test.fnl            # test sul codice sorgente
fennel --compile src/core.fnl        # ispezione del Lua prodotto
```

## Esercizi

1. Aggiungi il sottocomando `remove ID` che elimina un'attività e stampa un errore se l'id non esiste.
2. Rendi `list` stabile nell'ordine degli id crescenti, anche quando il file è stato modificato a mano.
3. Sostituisci la serializzazione a mano con una libreria Luarocks e documenta il comando di installazione.
4. Aggiungi un filtro `--aperte` che mostra solo le attività non completate.
5. Gestisci un file JSON malformato con un messaggio su stderr ed exit 1, senza perdere il file.
6. Confronta `fennel src/init.fnl` e `lua dist/init.lua`: quali differenze di risultato trovi e perché?

<details>
<summary>Soluzione</summary>

1. Nel core, `rimuovi` costruisce una lista nuova saltando l'elemento con l'id richiesto e restituisce il numero di elementi rimossi; se è zero, il modulo CLI scrive `id sconosciuto` su stderr ed esce con 1.

2. `list` copia la lista con una funzione di sorting su `v.id` e stampa le righe dopo l'ordinamento: l'ordine del file non è più un vincolo, ma la copia evita di mutare lo stato letto.

3. `luarocks install dkjson` e `(local json (require :dkjson))`, poi `json.encode` e `json.decode` sostituiscono le due funzioni del modulo; il test confronta i valori decodificati e non le stringhe.

4. Il filtro si applica nel core prima della stampa, così resta puro e testabile: una funzione `aperte` restituisce solo `v.fatto == false`, e l'opzione di CLI la chiama.

5. `leggi` cattura l'errore del parser e lo trasforma in una tabella con `:tipo` e `:messaggio`; `main` fa `catch` e scrive su stderr, così il file originale non viene mai riscritto.

6. `fennel` compila al volo e gli errori citano il `.fnl`, mentre `lua dist/init.lua` esegue codice già compilato e gli errori citano i `.lua`: stesso comportamento, diagnosi più facile con l'interprete.

</details>

## Errori comuni

- **Scrivere un `return` in ogni funzione**: in Fennel l'ultima espressione è il risultato, un `return` serve solo per uscite anticipate.
- **Mutare la lista passata come argomento**: `aggiungi` modifica la tabella in place, e chi chiama si ritrova stato cambiato senza saperlo.
- **Mettere l'I/O nei moduli di logica**: un core che apre file rompe l'isolamento e rende i test fragili.
- **Calcolare il JSON a mano con testo non filtrato**: virgolette e backslash rompono il formato e producono un file illeggibile.
- **Dimenticare `--output` nella build**: `fennel -c src` scrive accanto ai sorgenti e mescola `.fnl` e `.lua`.

## In sintesi

Il laboratorio separa il core puro, il formato JSON e la CLI, come faresti in Lua ma con la sintassi di Fennel. Gli errori sono valori o tabelle sollevate, tradotte in codici di uscita; la distribuzione avviene tramite `.lua` compilati, quindi in produzione non serve l'interprete Fennel.

## Fonti

- [Fennel - Setup](https://fennel-lang.org/setup)
- [Fennel Tutorial](https://fennel-lang.org/tutorial)
- [Fennel Reference](https://fennel-lang.org/reference)
- [Luarocks - Luarocks.org](https://luarocks.org/)
