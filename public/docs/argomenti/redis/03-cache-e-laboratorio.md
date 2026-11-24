Questo laboratorio costruisce una cache-aside corretta, misura hit e miss con `INFO`, protegge il database dai picchi alla scadenza delle chiavi popolari e osserva la memoria piena. Servono `redis-cli` e un'istanza locale, preferibilmente in un container. Alla fine saprai dire, con numeri e non a impressione, se la tua cache sta lavorando.

## Obiettivi

- Implementare una cache-aside con TTL sensato e invalidazione esplicita.
- Misurare hit rate e occupazione con `INFO` prima e dopo un carico.
- Prevenire il *cache stampede* con lock e giitter sulle scadenze.
- Verificare il comportamento in memoria piena con una politica di espulsione.
- Mettere in sicurezza l'istanza e saper leggere un errore tipico di OOM.

## Preparazione

Un'istanza usa e getta evita di toccare l'ambiente reale:

```bash
docker run --rm -d --name cache -p 6379:6379 redis:7-alpine
docker exec -it cache redis-cli ping
```

Risposta attesa: `PONG`. Se non hai Docker, installa Redis localmente oppure usa WSL. Per isolare il laboratorio usa un database logico (`SELECT 1`) o un prefisso `lab:`.

```bash
redis-cli -n 1 FLUSHDB
redis-cli -n 1 CONFIG SET maxmemory 64mb
redis-cli -n 1 CONFIG SET maxmemory-policy allkeys-lru
```

`FLUSHDB` cancella il solo database selezionato: in un laboratorio è accettabile, su un'istanza condivisa non lo è mai.

## Cache-aside: il pattern corretto

Nel pattern cache-aside l'applicazione consulta prima Redis, e in caso di miss legge dal database e scrive il risultato in cache. Il TTL è la protezione contro i dati vecchi; l'invalidazione esplicita è la protezione contro i dati che il TTL non ha ancora coperto.

```javascript
// Schema del flusso, da adattare al tuo client Redis.
async function getProduct(id) {
  const key = `product:${id}`;
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached);
  }
  const product = await db.findProduct(id);
  if (product) {
    const ttl = 300 + Math.floor(Math.random() * 60); // 300-360 s, jitter
    await redis.set(key, JSON.stringify(product), { EX: ttl });
  }
  return product;
}

async function updateProduct(id, patch) {
  await db.updateProduct(id, patch);
  await redis.del(`product:${id}`);
}
```

Tre dettagli che fanno la differenza:

- il **jitter** sul TTL evita che migliaia di chiavi scritte insieme scadano nello stesso secondo;
- la **cancellazione dopo la scrittura** sul database, non prima, riduce la finestra in cui la cache contiene un valore vecchio;
- i valori **`null` per un ID inesistente** si mettono in cache solo con un TTL breve, altrimenti un errore temporaneo del database blocca per minuti un elemento che esiste già.

Le chiavi con valori molto grandi superano il limite pratico di dimensione consigliato: meglio spezzare l'oggetto in un hash o in più chiavi.

```bash
SET product:7 '{"name":"Graal","price":1299}' EX 300
GET product:7
DEL product:7
```

## Misurare il comportamento

Prima di ottimizzare, si misura. `INFO stats` fornisce `keyspace_hits` e `keyspace_misses`; `keyspace_hit_ratio` si calcola a mano; `INFO memory` mostra l'occupazione.

```bash
redis-cli INFO stats | grep keyspace_
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"
redis-cli INFO keyspace
```

```bash
for i in $(seq 1 200); do redis-cli GET product:7 > /dev/null; done
redis-cli INFO stats | grep keyspace_
```

Dopo la prima lettura le successive sono hit: il rapporto sale a circa 199/200. Poi invalida e rileggi: il primo accesso è miss, il secondo hit.

Per il *cache stampede* (decine di richieste simultanee sulla stessa chiave alla scadenza) si usa un lock breve:

```javascript
async function getWithLock(id) {
  const key = `product:${id}`;
  const lock = `lock:${key}`;
  const cached = await redis.get(key);
  if (cached !== null) return JSON.parse(cached);

  const acquired = await redis.set(lock, "1", { NX: true, EX: 5 });
  if (!acquired) {
    await new Promise((r) => setTimeout(r, 50));
    return getWithLock(id);
  }
  try {
    const product = await db.findProduct(id);
    if (product) await redis.set(key, JSON.stringify(product), { EX: 305 });
    return product;
  } finally {
    await redis.del(lock);
  }
}
```

Il lock con `NX EX` ha una scadenza: se il processo muore durante il caricamento, il lock non resta per sempre. Un caricamento più lento di 5 secondi rischia però di essere duplicato: dimensiona il valore sulla latenza reale del database.

## Memoria piena e sicurezza minima

Con `maxmemory 64mb` e la politica `allkeys-lru`, superata la soglia Redis elimina le chiavi meno recenti invece di rifiutare le scritture. Con `noeviction` vedresti invece:

```text
(error) OOM command not allowed when used memory > 'maxmemory'.
```

Questo errore è un segnale di configurazione: su una cache pura `noeviction` è quasi sempre sbagliata. Osserva `evicted_keys` in `INFO stats` e cerca le chiavi più pesanti con `redis-cli --bigkeys`.

Proteggi l'istanza: Redis è raggiungibile da rete e, senza password, chiunque può leggere o scrivere. Imposta una password e lega l'istanza all'interfaccia locale, a meno che tu non usi una rete isolata.

```bash
redis-cli CONFIG SET requirepass "una-password-lunga-e-casuale"
redis-cli -a "una-password-lunga-e-casuale" PING
```

`CONFIG SET` vale fino al riavvio: rendilo persistente con `CONFIG REWRITE` solo dopo aver verificato il file versionato. Non committare mai la password.

## Errori comuni

- **Scrivere in cache prima del database**: un'eventuale scrittura fallita lascia in cache un valore che il database non ha.
- **Usare TTL lunghi "per efficienza"**: il dato vecchio costa più della query risparmiata.
- **Misurare solo con `DBSIZE`**: dice quante chiavi ci sono, non se la cache sta funzionando.
- **Condividere un'istanza tra cache e dati persistenti con `allkeys-lru`**: la politica può eliminare anche le chiavi che credevi intoccabili.

## Esercizi

### 1. Osservare il TTL dopo una scrittura

Imposta una chiave con scadenza, aggiornala con `SET` semplice e con `KEEPTTL`. Cosa cambia?

<details><summary>Soluzione</summary>

```bash
redis-cli SET lab:k "a" EX 60
redis-cli TTL lab:k          # ~60
redis-cli SET lab:k "b"      # la scadenza viene rimossa
redis-cli TTL lab:k          # -1
redis-cli SET lab:k "c" KEEPTTL
redis-cli TTL lab:k          # > 0, la scadenza è conservata
```

Senza `KEEPTTL` la chiave diventa permanente: è il bug che trasforma una sessione con TTL in una chiave che resta per sempre.

</details>

### 2. Calcolare un hit ratio

Esegui 10 `GET` su una chiave esistente con TTL, 10 su una inesistente e calcola il rapporto prima e dopo.

<details><summary>Soluzione</summary>

```bash
redis-cli SET lab:hit 1 EX 600 > /dev/null
for i in $(seq 1 10); do redis-cli GET lab:hit > /dev/null; done
for i in $(seq 1 10); do redis-cli GET lab:miss > /dev/null; done
redis-cli INFO stats | grep keyspace_
```

I delta saranno 10 hit e 10 miss: rapporto 0,5. Lo stesso calcolo fatto sui contatori di un'istanza in produzione richiede snapshot periodici: `keyspace_hits / (keyspace_hits + keyspace_misses)`.

</details>

### 3. Innescare l'espulsione

Con `maxmemory 1mb` e `allkeys-lru`, riempi la cache con chiavi piccole fino a vedere `evicted_keys` alzarsi.

<details><summary>Soluzione</summary>

```bash
redis-cli CONFIG SET maxmemory 1mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
for i in $(seq 1 5000); do redis-cli SET lab:key:$i "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" > /dev/null; done
redis-cli INFO stats | grep evicted_keys
redis-cli INFO memory | grep used_memory_human
```

`evicted_keys` cresce e `used_memory` resta sotto 1 MB. Ripeti con `maxmemory-policy noeviction` e osserverai l'errore `OOM command not allowed` invece delle espulsioni.

</details>

### 4. Invalidare senza perdere hit

Dopo un aggiornamento del database, verifica che la chiave venga ricreata con il valore nuovo e che la scadenza riparta.

<details><summary>Soluzione</summary>

```bash
redis-cli SET product:7 '{"name":"vecchio"}' EX 300
redis-cli DEL product:7
redis-cli GET product:7        # nil: miss, l'app ricarica dal DB
redis-cli SET product:7 '{"name":"nuovo"}' EX 300
redis-cli TTL product:7
```

La cancellazione fornisce il miss, la scrittura successiva dell'applicazione lo riempie con il valore aggiornato. Se invece avessi aggiornato con `SET` senza TTL, la chiave sarebbe sopravvissuta per sempre.

</details>

### 5. Misurare il pub/sub

Due terminali: il primo si iscrive, il secondo pubblica due messaggi, il primo terminale ne pubblica uno prima di iscriversi.

<details><summary>Soluzione</summary>

```bash
# terminale 1
redis-cli SUBSCRIBE lab:orders
# terminale 2
redis-cli PUBLISH lab:orders '{"id":1}'
redis-cli PUBLISH lab:orders '{"id":2}'
redis-cli PUBLISH lab:orders '{"id":3}'
```

Il primo terminale riceve tutti e tre e `PUBLISH` restituisce `1` (un iscritto). Se il pubblica avviene *prima* del `SUBSCRIBE`, il messaggio è perso e `PUBLISH` risponde `0`: il pub/sub non conserva la storia.

</details>

### 6. Ridurre il picco di miss

Una chiave `home` è popolare e ha TTL 60 secondi. Proponi due modifiche che riducono il picco alla scadenza.

<details><summary>Soluzione</summary>

Primo: aggiungere jitter al TTL non serve su una singola chiave popolare, ma un refresh anticipato (a circa l'80% del TTL) fa scaldare la nuova copia prima che la vecchia sparisca. Secondo: un lock `SET lock:home 1 NX EX 5` fa in modo che solo un processo ricarichi dal database, mentre gli altri aspettano o servono il valore precedente se ancora valido. Terzo, opzionale: preriscaldare la chiave con un job periodico. In tutti i casi la metrica da guardare è la latenza del database nei percentili alti, non solo l'hit ratio.

</details>

## In sintesi

- La cache-aside si regge su TTL con jitter, invalidazione dopo la scrittura e resistenza ai miss simultanei.
- `INFO stats` e `INFO memory` misurano hit ratio e occupazione: senza misura, l'ottimizzazione è illusione.
- `noeviction` su una cache pura produce errori OOM; le politiche `allkeys-lru` gestiscono la pressione.
- Il pub/sub notifica solo i presenti; le istanze di cache vanno protette con password e rete ristretta.

## Fonti

- Redis — Eviction policies: https://redis.io/docs/latest/develop/reference/eviction/
- Redis — Pub/Sub: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis — Client-side caching e pattern di cache: https://redis.io/docs/latest/develop/use/client-side-caching/
- Redis — Protocol specification (formato dei comandi e delle risposte): https://redis.io/docs/latest/develop/reference/protocol-spec/
