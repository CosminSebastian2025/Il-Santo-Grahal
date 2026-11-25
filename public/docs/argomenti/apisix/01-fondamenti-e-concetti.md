Apache APISIX è un API gateway dinamico e ad alte prestazioni costruito su NGINX e OpenResty, con la configurazione centrale conservata in etcd e applicata a runtime senza riavviare il processo. In questa lezione impari come una richiesta diventa una rotta, come sono organizzate route, service, upstream e consumer, e perché il modello a memoria locale con sincronizzazione da etcd cambia il modo di aggiornare la configurazione rispetto a un proxy con file statici.

## Obiettivi

- Descrivere l'architettura APISIX: data plane, etcd come control plane, Admin API.
- Usare il modello Route → Service → Upstream con plugin, consumer e router.
- Scrivere oggetti con l'Admin API e verificare che la modifica sia attiva subito.
- Scegliere la modalità di deployment e capire cosa resta in etcd e cosa si può ricostruire.

## Architettura: control plane e data plane

APISIX separa chi conserva la configurazione da chi la esegue. L'Admin API scrive in etcd, ogni istanza APISIX tiene un watcher su etcd e aggiorna la propria copia in memoria degli oggetti che la riguardano. Una richiesta HTTP viene servita leggendo solo la memoria del worker, senza interrogare etcd: è questa separazione che dà latenza bassa e aggiornamenti immediati.

```text
Admin API / Dashboard / GitOps  →  etcd  →  watcher per istanza
                                         →  memoria del worker  →  plugin  →  upstream
```

| Componente | Ruolo | Porta predefinita |
| --- | --- | --- |
| APISIX (data plane) | riceve il traffico e applica rotte e plugin | 9080 HTTP, 9443 HTTPS |
| Admin API | scrittura e lettura degli oggetti | 9180 |
| etcd v3 | fonte di verità della configurazione | 2379 |
| Dashboard | interfaccia web sull'Admin API | 9000 |
| Control API | stato interno, health, schemi dei plugin | 9090 locale |

Se etcd non è raggiungibile, le istanze continuano a servire il traffico con l'ultima configurazione nota ma non accettano modifiche: è una degradazione controllata, non un'interruzione. Le versioni recenti della linea 3.x seguono un ritmo serrato di release: la 3.19.0 (settembre 2026) ha introdotto WebSocket nativo e TLS passthrough per lo stream, la 3.21.0 (novembre 2026) ha aggiornato il runtime e la gestione delle credenziali in log.

## Il modello degli oggetti

La route è il primo elemento che incontra una richiesta: dichiara entro quale spazio di nomi di dominio, URI, metodo o indirizzo sorgente la richiesta cade. Le sovrapposizioni tra route si risolvono con una priorità esplicita. La route può puntare a un service, che descrive il backend, oppure portare inline l'upstream. I plugin si agganciano a global rule, route, service o consumer.

| Oggetto | Domanda a cui risponde | Esempio di campo |
| --- | --- | --- |
| Route | quale richiesta è mia? | `uri`, `host`, `priority` |
| Service | quale backend devo chiamare? | `upstream_id`, `timeout` |
| Upstream | quali istanze e come bilanciarle? | `nodes`, `type: roundrobin`, `checks` |
| Consumer | chi sta chiamando? | `username`, `plugins` |
| Plugin | quale policy applico? | chiave di configurazione per istanza |
| Global rule | cosa vale per tutto il gateway? | `plugins` applicati globalmente |

```bash
APISIX_HOST=http://127.0.0.1:9180
ADMIN_KEY=$(awk '/^  key:/{print $2; exit}' conf/config.yaml)

curl -s "$APISIX_HOST/apisix/admin/routes/catalogo-v1" \
  -H "X-API-KEY: $ADMIN_KEY" -X PUT \
  -d '{
    "uri": "/catalogo/*",
    "name": "catalogo-v1",
    "methods": ["GET"],
    "plugins": {
      "proxy-rewrite": {"regex_uri": ["^/catalogo/(.*)", "/$1"]}
    },
    "upstream": {
      "type": "roundrobin",
      "nodes": {"catalogo.internal:8080": 1},
      "scheme": "http"
    }
  }'
```

L'`X-API-KEY` è la chiave di amministrazione presente in `config.yaml` e va trattata come credenziale di root. Il `PUT` sull'identificatore `catalogo-v1` è idempotente: lo stesso comando applicato due volte non crea duplicati, proprietà che rende l'Admin API utilizzabile direttamente da uno script di automazione.

## Un primo servizio, e perché le regole si esportano

Con Docker l'avvio minimo prevede etcd su 2379 e APISIX su 9080/9180; la configurazione iniziale dell'Admin API abilita le chiavi e imposta l'endpoint etcd. Dopo il primo giro di `PUT` conviene esportare lo stato e conservarlo in Git, perché il contenuto di etcd non è versionato e un etcd perso significa riconfigurare da zero.

```bash
curl -s "$APISIX_HOST/apisix/admin/routes" -H "X-API-KEY: $ADMIN_KEY" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("\n".join(r["value"]["name"] for r in d["list"]))'
curl -s http://127.0.0.1:9080/catalogo/item/7 -i | head -20
```

La seconda verifica controlla che la richiesta arrivi e che il `proxy-rewrite` abbia riscritto il percorso. `regex_uri` accetta una coppia `[pattern, sostituzione]` e, in presenza di gruppi di cattura, li sostituisce nell'URI inoltrato; con `^/catalogo/(.*)` il backend riceve `/item/7`.

## Errori comuni

- **Basarsi su una sola istanza e dimenticare etcd**: in un cluster l'Admin API si può chiamare su un nodo qualsiasi, ma etcd deve essere replicato e con backup.
- **Esporre l'Admin API su Internet**: la chiave amministrativa consente di creare rotte e plugin arbitrari; l'ascolto va limitato alla rete di amministrazione.
- **Route sovrapposte senza `priority`**: con più route che matchano lo stesso URI vince quella con priorità più alta, e due regole onnicomprensive possono oscurarsi a vicenda.
- **Fissare `nodes` vuoti aspettandosi traffico**: un upstream senza nodi sani risponde 503 senza log applicativi.
- **Modificare la configurazione a mano e chiamarla "as code"**: l'Admin API cambia lo stato reale; se la configurazione non viene esportata, Git mente.

## In sintesi

APISIX separa control plane (etcd più Admin API) e data plane (worker con copia in memoria). Route, service, upstream, consumer e plugin sono oggetti identificati che si scrivono in modo idempotente e diventano attivi senza riavvio. Il traffico viene servito senza letture da etcd, quindi latenza e disponibilità dipendono dal processo APISIX, non dal database di configurazione. Il contenuto di etcd va esportato e versionato, altrimenti la configurazione esiste in un solo posto. La prossima lezione entra nei plugin e nella loro orchestrazione; il laboratorio costruisce un percorso completo su Compose.

## Fonti

- [Apache APISIX - Getting Started](https://apisix.apache.org/docs/apisix/getting-started/)
- [Apache APISIX - Architettura](https://apisix.apache.org/docs/apisix/architecture-design/apisix/)
- [Apache APISIX - Route](https://apisix.apache.org/docs/apisix/terminology/route/)
- [Apache APISIX - Admin API](https://apisix.apache.org/docs/apisix/admin-api/)
