Una route smista il traffico, ma è nei plugin che Kong diventa un gateway e non un semplice proxy. Questa lezione copre i plugin di autenticazione e le policy per consumatore, il rate limiting con contatori locali o su Redis, la trasformazione di richieste e risposte, l'anonimizzazione e i criteri per estendere il gateway con codice senza introducire rallentamenti o segreti in chiaro.

## Obiettivi

- Applicare plugin a livello globale, service, route e consumer conoscendo l'ordine di risoluzione.
- Configurare `key-auth` e `jwt` distnguendo header, query e cookie.
- Impostare `rate-limiting` con policy `local` o `redis` e capire quando il limite effettivo cambia.
- Usare `request-transformer` e `response-transformer` senza rompere il contratto verso il backend.
- Riconoscere quando serve un plugin custom e quale versione di runtime implica.

## Precedenza e scope dei plugin

Kong esegue i plugin contesto per contesto: prima i globali, poi quelli del service, poi quelli della route e infine quelli del consumer già identificato. Ogni plugin ha una priorità statica che decide l'ordine all'interno della stessa fase (`key-auth` gira prima di `rate-limiting`, che gira prima dei transformer sulla richiesta). Lo stesso plugin configurato su più contesti viene eseguito più volte: se serve una sola esecuzione, va dichiarato su un solo livello o disattivato esplicitamente negli altri con `enabled: false`.

| Contesto | Esempio d'uso | Effetto |
| --- | --- | --- |
| globale | log, correlazione, header di sicurezza | vale per ogni richiesta |
| service | timeout applicativo, TLS verso il backend | vale per tutte le route del service |
| route | autenticazione su un solo endpoint | non tocca le altre route |
| consumer | quota dedicata a un partner | si applica dopo l'identificazione |

La regola operativa: autenticazione sulla route o sul service, quote sul consumer, osservabilità globale. Se l'autenticazione è globale e un endpoint deve restare pubblico, servono `route.protocols` dedicate o un plugin `request-termination` sulla rotta pubblica.

## Autenticazione e identità

`key-auth` è il più semplice: il client invia una chiave in un header (`apikey` per default) o in query, e Kong la associa a un consumer. `jwt` verifica firma, `exp` e `claims_to_verify` e applica le stesse regole a un token portabile.

```yaml
_format_version: "3.0"
consumers:
  - username: partner-logistica
    keyauth_credentials:
      - key: 3f9c0a7e-2b5c-4f0d-9a6f-77c1e2d4b1aa
    plugins:
      - name: rate-limiting
        config:
          minute: 600
          policy: redis
          redis:
            host: redis.internal
            port: 6379
          limit_by: consumer
services:
  - name: ordini
    url: http://ordini.internal:8080
    routes:
      - name: ordini-api
        paths: [/ordini]
        plugins:
          - name: key-auth
            config:
              key_names: [X-Api-Key]
              hide_credentials: true
```

`hide_credentials: true` rimuove la chiave dalla richiesta inoltrata: senza questa opzione la credenziale arriva al backend e finisce nei log applicativi. Con `jwt`, `claims_to_verify: [exp, nbf]` evita token scaduti o usati prima del tempo, e `maximum_expiration` limita la finestra di validità ammessa.

Il rate limiting con `policy: local` mantiene il contatore nella memoria del nodo: con tre istanze dietro un bilanciatore il limite effettivo è circa tre volte quello configurato. `policy: redis` sposta il contatore su un Redis condiviso, introduce una dipendenza di rete e va protetto con `redis.password` e `redis.ssl`.

## Trasformazioni, correlazione e limiti del runtime

`request-transformer` e `response-transformer` copiano, aggiungono o rimuovono header e parametri. Sono utili per inserire un header di correlazione o per rinominare un header legacy, ma eccedono la loro funzione quando iniziano a modellare il payload applicativo.

```yaml
plugins:
  - name: correlation-id
    config:
      header_name: X-Request-Id
      generator: uuid
      echo_downstream: true
  - name: response-transformer
    config:
      remove:
        headers: [X-Powered-By, Server]
  - name: request-transformer
    config:
      add:
        headers: ["X-Forwarded-Proto:https"]
```

Per logica che i plugin di serie non coprono esistono `serverless-functions` (Lua), plugin Go o WASM. Dalla 3.14 l'opzione `untrusted_lua` ammette le modalità `sandbox`, `strict` e `lax`: le prime due limitano le API disponibili al codice dei plugin, la terza va usata solo con codice verificato. Un plugin custom gira nel percorso caldo della richiesta: un ciclo o una chiamata HTTP sincrona dentro il plugin abbassa la latenza per tutti i client.

| Esigenza | Strumento | Costo |
| --- | --- | --- |
| aggiungere header | `request/response-transformer` | trascurabile |
| filtro corpo JSON | `response-transformer-advanced` (commerciale) o plugin custom | parsing del payload |
| logica dinamica | `serverless-functions` in Lua | esecuzione Lua per richiesta |
| integrazione compilata | plugin Go/WASM | build e versionamento a parte |

## Errori comuni

- **Chiave API nei log del backend**: manca `hide_credentials` e il gateway diventa un amplificatore di credenziali in chiaro.
- **Rate limit locale in un cluster**: il limite apparente è la somma dei nodi, e un deploy rolling cambia la quota per qualche minuto.
- **Trasformare il payload con i transformer base**: le liste annidate non vengono toccate come ci si aspetta; serve un plugin che parsi il corpo.
- **Mettere `key-auth` globale e poi aprire `GET /health`**: l'health check resta protetto o si apre un buco; la rotta pubblica va dichiarata e configurata a parte.
- **Segreti scritti nel `kong.yaml` committato**: le chiavi vanno in variabili d'ambiente o in un secret store, con il file versionato che le referenzia.

## In sintesi

I plugin applicano policy a un contesto preciso: route e service per l'autenticazione, consumer per le quote, globale per osservabilità e header di sicurezza. `key-auth` e `jwt` identificano il chiamante e devono rimuovere le credenziali prima dell'inoltro, il rate limiting cambia significato passando da `local` a `redis`, e i transformer bastano finché non serve parsing del corpo. Il codice custom va trattato come codice di produzione nel percorso caldo.

## Fonti

- [Kong Gateway - Entità Plugin](https://developer.konghq.com/gateway/entities/plugin/)
- [Kong Gateway - Entità Consumer](https://developer.konghq.com/gateway/entities/consumer/)
- [Kong Gateway - Breaking changes e deprecazioni](https://developer.konghq.com/gateway/breaking-changes/)
- [Kong Gateway - Configurazione](https://developer.konghq.com/gateway/configuration/)
