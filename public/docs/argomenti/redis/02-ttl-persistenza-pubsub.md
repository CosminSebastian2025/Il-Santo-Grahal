Redis vive in memoria, quindi ogni dato è "volatile" per definizione finché qualcuno non decide cosa deve succedere quando il processo termina. Le scadenze permettono di far sparire i dati da soli, la persistenza permette di ritrovarli dopo un riavvio, il pub/sub permette di notificarne i cambiamenti senza polling. Questi tre meccanismi si distinguono per la domanda che risolvono: *quanto deve vivere un dato*, *cosa deve sopravvivere a un crash*, *chi deve sapere che è successo qualcosa*.

## Obiettivi

- Impostare e osservare scadenze per chiave e capire come vengono applicate.
- Distinguere RDB e AOF, i loro compromessi e la configurazione di base.
- Usare il pub/sub per notifiche in tempo reale e conoscerne i limiti.
- Valutare politiche di espulsione quando la memoria è piena.
- Evitare i pattern che trasformano una cache in una fonte di dati incoerente.

## TTL: la vita di una chiave

Il TTL si imposta con `EXPIRE` (in secondi) o `PEXPIRE` (in millisecondi), oppure direttamente alla scrittura con `SET ... EX` e `SETEX`. Si legge con `TTL` che restituisce i secondi residui, `-1` se la chiave non ha scadenza e `-2` se la chiave non esiste.

```bash
SET session:abc "user:42" EX 1800
TTL session:abc
PERSIST session:abc      # rimuove la scadenza
TTL session:abc          # -1
```

La scadenza è una proprietà della chiave, non del valore: `HSET` su un hash non rinnova il TTL, mentre `SET` su una stringa lo azzera, a meno che tu non ripeta `EX`. Questa asimmetria è la fonte di molti bug: aggiorni lo stato di una sessione e la scadenza sparisce. Per rinnovare senza rischi si usa `EXPIRE` dopo la modifica, o `KEEPTTL`:

```bash
SET user:42:profile '{"name":"Mario"}' KEEPTTL
```

Redis non controlla ogni chiave allo scadere del tempo: ne campiona un sottoinsieme a intervalli regolari e, nel frattempo, tratta come scaduta una chiave che viene letta. Per il client è trasparente, ma `TTL` e `DBSIZE` possono non riflettere immediatamente milioni di scadenze simultanee.

`EXPIRE` con `NX`/`XX`/`GT`/`LT` modifica la scadenza solo se la condizione è soddisfatta: utile per lock distribuiti e rate limit.

## Persistenza: RDB e AOF

| Aspetto | RDB (snapshot) | AOF (append-only file) |
| --- | --- | --- |
| Cosa salva | immagine periodica dello stato | sequenza dei comandi di scrittura |
| Costo durante il salvataggio | fork del processo, memoria copy-on-write | scrittura incrementale |
| Perdita massima al crash | dall'ultimo snapshot | da uno scarto breve (`appendfsync everysec`) |
| File | compatto | più grande, riscrivibile con `BGREWRITEAOF` |
| Ideale per | backup, ripristini veloci, cache ricostruibili | dati che non si possono perdere |

Le due modalità si possono usare insieme, come nella configurazione predefinita di Redis recente. RDB produce un file compatto, ottimo da copiare su uno storage remoto; AOF riduce la finestra di perdita a circa un secondo con `appendfsync everysec`, a costo di un file più grande e di un riavvio più lento.

La persistenza non è gratuita: `BGSAVE` duplica la memoria per il copy-on-write del fork, quindi con dataset grandi lo snapshot può portare al kill del processo da parte dell'OOM killer. Monitora `INFO persistence` e lascia margine di RAM.

Va detto con chiarezza: Redis non offre le garanzie di durabilità di un database transazionale. Se il dato è la fonte di verità, va replicato in un database adatto; se Redis è una cache, la persistenza serve a evitare la ricostruzione totale al riavvio, non a garantire il dato.

## Pub/sub: notifiche senza stato

Il pub/sub di Redis è fire-and-forget: chi pubblica non sa chi ascolta e i messaggi non vengono conservati. Chi si iscrive riceve solo gli eventi successivi al proprio `SUBSCRIBE`. Non c'è acknowledgement, riproduzione né coda.

```bash
redis-cli SUBSCRIBE orders.created
```

```bash
redis-cli PUBLISH orders.created '{"id":"ord_01J8ZK3Q2M","status":"paid"}'
```

`PUBLISH` restituisce quanti client hanno ricevuto il messaggio: zero significa che nessuno era in ascolto. Se un consumatore deve recuperare ciò che ha perso, servono le Stream (`XADD`, `XREADGROUP`), che hanno una coda durevole, oppure un'infrastruttura di messaggistica.

Una combinazione frequente con le scadenze è `SET key value NX EX 30` per un lock con timeout: se il processo muore, il lock scade da solo. Un lock scaduto durante un'operazione lunga può però essere rubato, quindi si usa una libreria che verifica una nonce al rilascio.

## Memoria e politiche di espulsione

Quando la memoria raggiunge `maxmemory`, Redis applica `maxmemory-policy`. Le politiche si scelgono in base a quale errore si può accettare.

```text
maxmemory 2gb
maxmemory-policy allkeys-lru
```

| Politica | Comportamento | Quando usarla |
| --- | --- | --- |
| `noeviction` (default) | rifiuta le scritture con errore | dati critici, Redis come store |
| `allkeys-lru` | elimina le chiavi usate meno di recente | cache pura, senza chiavi persistenti |
| `volatile-lru` | elimina solo chiavi con TTL impostato | dati misti, parti permanenti |
| `allkeys-lfu` | elimina le chiavi meno frequentemente usate | carichi con accessi popolari stabili |
| `volatile-ttl` | elimina per TTL più vicino alla scadenza | scadenze già significative per il dominio |

Nota pratica: se scegli `volatile-*` e nessuna chiave ha un TTL, la politica non può espellere nulla e Redis si comporta come `noeviction`. Su un database misto conviene un'istanza dedicata alla cache.

Per capire dove va la memoria: `INFO memory` mostra `used_memory` e `mem_fragmentation_ratio`, `MEMORY USAGE <key>` stima il peso di una chiave, `redis-cli --bigkeys` trova le strutture più grandi.

## Errori comuni

- **Aggiornare una chiave con `SET` e perdere il TTL**: usa `KEEPTTL`, `SET ... EX` o `EXPIRE` esplicito.
- **Affidarsi al pub/sub per eventi che non si possono perdere**: chi era disconnesso non riceverà mai il messaggio; usa le Stream o una coda durevole.
- **Usare `volatile-lru` senza TTL**: la politica non ha nulla da espellere e Redis smette di accettare scritture.
- **Disabilitare del tutto la persistenza su dati che non si possono ricostruire**: dopo un riavvio il database è vuoto, indipendentemente dalla replicazione.

## In sintesi

- Il TTL è una proprietà della chiave: attenzione a non perderlo o azzerarlo con le scritture.
- RDB è compatto e veloce da ripristinare, AOF riduce la perdita al crash; si possono combinare.
- Il pub/sub è senza stato e senza recapito: per la consegna garantita servono Stream o code esterne.
- La politica di espulsione dipende dal ruolo: cache pura, dati misti o store senza perdita.

## Fonti

- Redis — EXPIRE e gestione delle scadenze: https://redis.io/docs/latest/commands/expire/
- Redis — Persistence (RDB e AOF): https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis — Pub/Sub: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis — Eviction policies: https://redis.io/docs/latest/develop/reference/eviction/
