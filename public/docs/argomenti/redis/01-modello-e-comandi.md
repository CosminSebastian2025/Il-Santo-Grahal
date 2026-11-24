Redis è un server di strutture dati in memoria che si interroga con comandi testuali su una connessione TCP. Non è solo una cache: è un magazzino con tipi di valore specializzati, operazioni atomiche e una sintassi talmente semplice che si può interrogare a mano con `redis-cli`. Capire il modello dati evita due errori opposti: usarlo come se fosse un database relazionale, oppure usarlo come un dizionario senza regole. Questa lezione copre chiavi, i cinque tipi principali e le operazioni che li rendono utili.

## Obiettivi

- Comprendere il modello chiave-valore di Redis e il ruolo delle chiavi come namespace.
- Usare stringhe, hash, liste, set e sorted set per i casi d'uso giusti.
- Scrivere comandi atomici e combinare più operazioni con MULTI/EXEC.
- Scegliere scadenze e nomi delle chiavi che non creino conflitti.
- Riconoscere gli errori di accesso che nascono da una modellazione sbagliata.

## Lo spazio delle chiavi

Tutto in Redis è una chiave binaria che punta a un valore tipizzato. Non esistono tabelle, schemi o colonne: il dominio si rappresenta nella forma della chiave. La convenzione più diffusa è `oggetto:id:attributo`, per esempio `user:42:email` o `session:abc123`. Il separatore `:` non ha un significato tecnico: è una convenzione che rende le chiavi leggibili. Non esiste un namespace: `SCAN MATCH user:*` scorre l'intero database, quindi preferiscilo a `KEYS`, che blocca il server.

I comandi di base si provano direttamente nella shell:

```bash
redis-cli
127.0.0.1:6379> SET user:42:email "mario@example.com"
OK
127.0.0.1:6379> GET user:42:email
"mario@example.com"
127.0.0.1:6379> TYPE user:42:email
string
127.0.0.1:6379> EXISTS user:42:email
(integer) 1
```

```text
127.0.0.1:6379> INCRBY user:42:visits 1
(integer) 1
127.0.0.1:6379> MSET user:42:email "mario@example.com" user:42:name "Mario"
OK
127.0.0.1:6379> MGET user:42:email user:42:name
1) "mario@example.com"
2) "Mario"
```

`INCRBY` è atomico: se dieci client lo chiamano contemporaneamente, il contatore sale di dieci e non si perdono incrementi. Questo è il motivo per cui Redis è usato per contatori, limiti di frequenza e seriali.

Un comando si può inviare anche senza shell interattiva, utile negli script: `redis-cli SET chiave valore`. Raggruppare più comandi dallo stesso client riduce il costo di rete, che su Redis è spesso la voce dominante della latenza.

## I tipi di valore

Ogni tipo risponde a un modello diverso; usare quello sbagliato porta a comandi O(n) su strutture grandi o a chiavi con migliaia di campi.

| Tipo | Struttura | Comandi chiave | Uso tipico |
| --- | --- | --- | --- |
| String | valore unico binario | `SET`, `GET`, `INCR`, `SETEX` | contatori, cache di blob, flag |
| Hash | mappa campo→valore | `HSET`, `HGET`, `HGETALL`, `HINCRBY` | oggetti con campi aggiornabili |
| List | sequenza ordinata di elementi | `LPUSH`, `RPUSH`, `LRANGE`, `LPOP` | code, log recenti, cronologie |
| Set | insieme non ordinato di membri unici | `SADD`, `SMEMBERS`, `SINTER` | appartenenze, deduplicazione, tag |
| Sorted set | insieme con punteggio | `ZADD`, `ZRANGE`, `ZRANGEBYSCORE` | classifiche, code con priorità |

**Hash** è la scelta naturale per gli oggetti: aggiorni un campo senza riscrivere l'intero valore.

```bash
HSET user:42 name "Mario" email "mario@example.com" role "admin"
HGET user:42 role
HGETALL user:42
HINCRBY user:42 logins 1
```

**Liste** sono pile o code: `LPUSH` in testa, `RPUSH` in coda, `LRANGE 0 -1` legge tutto, `LPOP` estrae. Per una coda di lavoro si scrive con `RPUSH` e si legge con `BLPOP`, che attende finché arriva un elemento.

```bash
RPUSH jobs:emails '{"id":1,"to":"a@example.com"}'
BLPOP jobs:emails 5
LTRIM logs:recent 0 999
```

`LTRIM` taglia la lista a mille elementi mantenendo i più recenti: un pattern semplice per una cronologia limitata senza scadenze.

**Set** elimina i duplicati e supporta le operazioni insiemistiche, utili per calcolare l'intersezione tra utenti che hanno fatto due azioni diverse.

```bash
SADD user:42:tags "beta" "newsletter"
SADD user:43:tags "beta"
SINTER user:42:tags user:43:tags
```

**Sorted set** aggiunge un punteggio: l'ordinamento è per score, e a parità di score per ordine lessicografico del membro. È la struttura della classifica.

```bash
ZADD leaderboard 120 "mario" 95 "lucia"
ZINCRBY leaderboard 10 "lucia"
ZRANGE leaderboard 0 2 WITHSCORES
ZRANGEBYSCORE leaderboard 100 +inf
```

La combinazione di set e sorted set copre molti casi di analisi leggera: un set `seen:<giorno>` conta i visitatori unici, un sorted set `rank:<giorno>` ordina le pagine più viste, e l'unione di più giorni produce aggregati senza un database relazionale. Dimensiona però i membri: `SMEMBERS` su milioni di elementi è costoso, mentre `SCARD` e `SISMEMBER` restano economici.

## Atomicità e transazioni

Redis esegue un comando alla volta, in un singolo thread per i comandi di dati: è per questo che ogni singolo comando è atomico. Questo non implica che una *sequenza* di comandi lo sia. Con `MULTI` e `EXEC` si accodano comandi che vengono eseguiti consecutivamente senza interruzioni di altri client.

```text
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> INCR orders:total
QUEUED
127.0.0.1:6379> HSET order:7 status "confirmed"
QUEUED
127.0.0.1:6379> EXEC
1) (integer) 1
2) (integer) 1
```

`MULTI/EXEC` non è una transazione relazionale: non c'è rollback se un comando fallisce per un errore di tipo, e le condizioni si esprimono con `WATCH` (controllo ottimistico su una chiave). Per logiche condizionali complesse esistono gli script Lua, che garantiscono l'atomicità dell'intero script; per gli scenari multi-nodo si usano le funzioni e il modello di chiavi del cluster.

Un esempio di uso corretto di `WATCH`: leggi un contatore, calcola il nuovo valore e scrivi solo se nessuno l'ha modificato nel frattempo; se la scrittura restituisce `nil`, ripeti. Il modello è un confronto e scambio ottimistico e conviene quando i conflitti sono rari; con molta concorrenza un comando atomico come `INCRBY` è la risposta giusta.

## Errori comuni

- **Usare `KEYS *` in produzione**: blocca il server. Usa `SCAN` con `MATCH` e `COUNT`.
- **Modellare una riga di tabella come una chiave per campo senza motivo**: per un oggetto con più attributi l'hash è più efficiente e trasferisce meno.
- **Aspettarsi che `MULTI` faccia rollback**: gli errori runtime non annullano i comandi già eseguiti; serve `WATCH` o uno script.
- **Nomi delle chiavi senza separatore o troppo generici** (`data`, `1`): collisioni silenziose e difficoltà nel tracciare l'uso.

## In sintesi

- Redis è un insieme di chiavi binarie tipizzate; il nome segue la convenzione `oggetto:id` con separatore `:`.
- Stringa per contatori e blob, hash per oggetti, lista per code, set per insiemi, sorted set per classifiche.
- Ogni comando è atomico, la sequenza no: `MULTI/EXEC`, `WATCH` o Lua per la coerenza.
- `SCAN` al posto di `KEYS` è una regola non negoziabile in produzione.

## Fonti

- Redis — Comandi (riferimento ufficiale): https://redis.io/docs/latest/commands/
- Redis — Tipi di dati: https://redis.io/docs/latest/develop/data-types/
- Redis — Gestione delle chiavi e dello spazio chiavi: https://redis.io/docs/latest/develop/use/keyspace/
- Redis — Transazioni: https://redis.io/docs/latest/develop/interact/transactions/
