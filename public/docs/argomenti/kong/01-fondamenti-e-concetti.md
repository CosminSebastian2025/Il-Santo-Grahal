Kong è un API gateway costruito sopra NGINX e OpenResty che sposta fuori dalle applicazioni tutto ciò che non riguarda la logica di business: autenticazione, rate limiting, trasformazione di header, instradamento per host o path, osservabilità. In questa lezione impari il modello a entità di Kong — service, route, upstream, consumer e plugin — e il percorso che una richiesta compie prima di raggiungere il backend.

## Obiettivi

- Distinguere il ruolo di un API gateway da quello di un reverse proxy classico.
- Descrivere il modello dati di Kong: service, route, upstream, target, consumer e plugin.
- Leggere un file declarativo `kong.yaml` e applicarlo con `deck gateway sync`.
- Scegliere la modalità di deployment (DB-less o con PostgreSQL) in base ai vincoli di esercizio.

## Dal reverse proxy all'API gateway

Un reverse proxy inoltra traffico HTTP; un gateway aggiunge un livello di policy per singola rotta. La differenza pratica è che in Kong la configurazione non descrive solo "dove mandare i byte", ma anche "chi può passare e a che condizioni".

| Funzione | Reverse proxy generico | Kong Gateway |
| --- | --- | --- |
| Instradamento | `server_name` e `location` | route con `paths`, `hosts`, `methods` |
| Autenticazione | delegata al backend | plugin per rotta (key-auth, JWT, OIDC) |
| Rate limiting | limite per IP a livello di server | limite per consumer, servizio o rotta |
| Cambio configurazione | ricarica del processo | Admin API che applica la modifica a runtime |
| Stato | file di configurazione | database o config memory con `/config` |

Kong è distribuito come gateway open source (Kong Gateway) e come piattaforma commerciale con funzionalità aggiuntive; dal punto di vista didattico la struttura delle entità è la stessa. Le versioni recenti della linea 3.x hanno aggiunto un plugin Datakit per comporre workflow e, dalla 3.14, modalità `strict` e `lax` per l'esecuzione di codice Lua non fidato: dettagli che contano in produzione ma non cambiano il modello mentale.

## Il modello delle entità

Kong legge la configurazione come un grafo. Una richiesta entra da una route, la route punta a un service, il service punta a un upstream che elenca i target, e i plugin si agganciano a uno o più di questi oggetti.

```text
Client → Route (host + path) → Service → Upstream → Target A / Target B
                    ↑              ↑
                 plugin         plugin
```

| Entità | A cosa serve | Chiave tipica |
| --- | --- | --- |
| Service | rappresenta il backend | `url` o `host` + `port` |
| Route | regola di matching che espone un service | `paths`, `hosts`, `methods` |
| Upstream | bilanciamento tra più target con health check | `algorithm`, `slots` |
| Target | istanza concreta di backend | `host:port` con `weight` |
| Consumer | soggetto autenticato (utente, applicazione) | `username` o `custom_id` |
| Plugin | policy applicata a globale, service, route o consumer | nome + `config` |

Una route senza service è possibile solo per plugin che rispondono direttamente (per esempio `request-termination`), mentre un consumer non serve a nulla senza un plugin di autenticazione che lo riconosca. Queste due relazioni sono la fonte più comune di errori in configurazioni scritte a mano.

## Configurazione dichiarativa con decK

Per disciplina infrastrutturale conviene tenere la configurazione in Git e applicarla in modo atomico. `deck` confronta lo stato del file con quello del gateway, mostra il piano e applica solo il delta.

```yaml
_format_version: "3.0"
services:
  - name: catalogo
    url: http://catalogo.internal:8080
    connect_timeout: 3000
    routes:
      - name: catalogo-v1
        paths:
          - /catalogo
        strip_path: true
        methods: [GET, HEAD]
    plugins:
      - name: rate-limiting
        config:
          minute: 120
          policy: local
```

```bash
deck gateway diff kong.yaml        # mostra cosa cambierebbe
deck gateway sync kong.yaml        # applica in modo dichiarativo
deck gateway dump -o kong.yaml     # esporta lo stato corrente
```

`strip_path: true` è il default ed elimina il prefisso del percorso prima di inoltrare: con path `/catalogo`, una richiesta a `/catalogo/item/7` arriva al backend come `/item/7`. Se il backend si aspetta il prefisso originale, va impostato `strip_path: false`. Il `_format_version: "3.0"` è obbligatorio nei file esportati da decK dalla serie 3.x e versiona il formato del file, non il gateway.

## DB-less e database: come arriva la configurazione

Kong può funzionare senza database leggendo un file dichiarativo all'avvio e ricaricabile via `POST /config` sull'Admin API, oppure con PostgreSQL come fonte di verità per cluster con più istanze e Admin API in scrittura.

| Modalità | `database` in `kong.conf` | Vantaggi | Limiti |
| --- | --- | --- | --- |
| DB-less | `off` | avvio rapido, un solo artefatto da distribuire, adatta a GitOps | niente scritture runtime via Admin API persistenti |
| PostgreSQL | `postgres` | più nodi, modifiche a caldo, migration gestite da `kong migrations` | richiede migrazioni e backup del DB |

```bash
docker run -d --name kong-dbless \
  -e KONG_DATABASE=off \
  -e KONG_DECLARATIVE_CONFIG=/kong/declarative/kong.yaml \
  -e KONG_PROXY_LISTEN=0.0.0.0:8000 \
  -e KONG_ADMIN_LISTEN=127.0.0.1:8001 \
  -v "$PWD/kong.yaml:/kong/declarative/kong.yaml:ro" \
  -p 8000:8000 kong:3.9
```

La porta 8000 è il traffico dei client, 8001 è l'Admin API e va esposta solo su loopback o su una rete di amministrazione: chi raggiunge l'Admin API può riscrivere le route e leggere i secret dei plugin.

## Errori comuni

- **Confondere route e service**: la route fa solo matching; timeout, upstream e TLS verso il backend appartengono al service.
- **Esporre l'Admin API su Internet**: è il default di molti tutorial Docker e trasforma il gateway in una superficie di scrittura anonima.
- **Usare `strip_path` senza sapere cosa riceve il backend**: il backend perde il prefisso e risponde 404 solo sulle richieste proxate.
- **Mettere un plugin globale che dovrebbe essere per consumatore**: un `rate-limiting` globale conta il mondo intero su un unico contatore se la chiave default non viene cambiata.
- **Dimenticare i timeout di connessione**: i default sono pensati per backend sani; un backend che accetta la connessione e non risponde consuma slot del worker.

## In sintesi

Kong è un reverse proxy con un modello dati esplicito: route per il matching, service per il backend, upstream per il bilanciamento, consumer per i soggetti e plugin per le policy. La configurazione vive in un file `kong.yaml` versionato e viene applicata con `deck gateway sync`, mentre la scelta tra DB-less e PostgreSQL dipende da quanti nodi e quanta scrittura runtime servono. Le prossime lezioni scendono nei plugin di autenticazione e nel laboratorio end-to-end.

## Fonti

- [Kong Gateway - Panoramica](https://developer.konghq.com/gateway/)
- [Kong Gateway - Entità Service](https://developer.konghq.com/gateway/entities/service/)
- [Kong Gateway - Entità Route](https://developer.konghq.com/gateway/entities/route/)
- [decK - gestione dichiarativa](https://developer.konghq.com/deck/)
