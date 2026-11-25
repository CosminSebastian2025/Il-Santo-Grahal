In questo laboratorio monti un Kong Gateway 3.9.5 in modalità DB-less con Docker Compose, esponi due backend finti, e costruisci una configurazione dichiarativa completa: route con prefisso, bilanciamento su due target, autenticazione con API key, rate limiting con Redis condiviso e verifiche con curl che devono fallire nei modi previsti. Il criterio di accettazione non è "funziona", ma "funziona e si comporta male come previsto" quando la policy scatta.

## Obiettivi

- Avviare Kong DB-less con `kong.yaml` montato in sola lettura e Admin API su loopback.
- Provisionare backend, consumer, upstream con health check e plugin via `deck gateway sync`.
- Verificare 401, 429, `strip_path` e bilanciamento con comandi ripetibili.
- Esercitare il reload dichiarativo con `POST /config` e confrontare il piano con `deck gateway diff`.

## Prerequisiti e avvio

Serve Docker Engine con Compose v2, `deck` in una versione compatibile con Kong 3.9 e `curl`. L'obiettivo minimo è una macchina con 1 GB di RAM libera: Kong in DB-less con Redis occupa circa 300 MB.

```yaml
# compose.yaml
services:
  redis:
    image: redis:7.4-alpine
    command: ["redis-server", "--requirepass", "lab-pass"]
    networks: [gw]
  echo-a:
    image: hashicorp/http-echo:1.0
    command: ["-listen=:9000", "-text=backend-a"]
    networks: [gw]
  echo-b:
    image: hashicorp/http-echo:1.0
    command: ["-listen=:9000", "-text=backend-b"]
    networks: [gw]
  kong:
    image: kong:3.9.5
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /kong/kong.yaml
      KONG_PROXY_LISTEN: 0.0.0.0:8000
      KONG_ADMIN_LISTEN: 127.0.0.1:8001
      KONG_PROXY_ACCESS_LOG: /dev/stdout
    volumes:
      - ./kong.yaml:/kong/kong.yaml:ro
    ports: ["8000:8000", "127.0.0.1:8001:8001"]
    depends_on: [redis, echo-a, echo-b]
    networks: [gw]
networks:
  gw: {}
```

La directory di lavoro è `~/lab-kong`, i container risolvono i nomi `echo-a`, `echo-b` e `redis` sulla rete `gw`. Kong in DB-less non applica lo stato iniziale finché il file non esiste: crealo prima di `docker compose up -d kong`.

## Configurazione dichiarativa

```yaml
# kong.yaml
_format_version: "3.0"
upstreams:
  - name: demo-upstream
    algorithm: round-robin
    healthchecks:
      active:
        healthy:
          interval: 10
          successes: 2
        unhealthy:
          interval: 5
          http_failures: 3
    targets:
      - target: echo-a:9000
        weight: 100
      - target: echo-b:9000
        weight: 100
consumers:
  - username: partner-demo
    keyauth_credentials:
      - key: 3f9c0a7e-2b5c-4f0d-9a6f-77c1e2d4b1aa
services:
  - name: demo
    host: demo-upstream
    protocol: http
    connect_timeout: 2000
    read_timeout: 5000
    routes:
      - name: demo-root
        paths: [/demo]
        strip_path: true
        plugins:
          - name: key-auth
            config:
              key_names: [X-Api-Key]
              hide_credentials: true
          - name: rate-limiting
            config:
              minute: 30
              policy: redis
              limit_by: consumer
              redis:
                host: redis
                port: 6379
                password: lab-pass
```

`deck gateway diff kong.yaml` deve elencare una creazione per ogni oggetto; `deck gateway sync kong.yaml` li crea. Il file si versiona in Git, la password Redis invece arriva da un `.env` o da un secret manager e non va committata.

## Verifiche del contratto

| Caso | Comando | Risultato atteso |
| --- | --- | --- |
| senza chiave | `curl -s -o /dev/null -w '%{http_code}' localhost:8000/demo` | `401` |
| con chiave | `curl -s -H 'X-Api-Key: 3f9c0a7e-2b5c-4f0d-9a6f-77c1e2d4b1aa' localhost:8000/demo` | `backend-a` o `backend-b` |
| bilanciamento | ripetere 10 volte il comando sopra | alternanza dei due testi |
| prefisso rimosso | `curl -s -H 'X-Api-Key: ...' localhost:8000/demo/x` | corpo del backend, path `/x` |
| quota | ciclo di 40 richieste | le ultime rispondono `429` |
| reload | `curl -X POST -F config=@kong.yaml localhost:8001/config` | `{}` e nessun riavvio |

Per osservare il path che arriva al backend sostituisci gli `http-echo` con `kennethreitz/httpbin`, che espone `/anything` e restituisce la richiesta ricevuta. Ripetere `curl` dieci volte mostra l'alternanza dei due target finché round-robin e health check considerano entrambi sani.

Il comando di verifica della quota è quello che rivela gli errori più comuni:

```bash
key=3f9c0a7e-2b5c-4f0d-9a6f-77c1e2d4b1aa
for i in $(seq 1 40); do
  curl -s -o /dev/null -w '%{http_code}\n' -H "X-Api-Key: $key" localhost:8000/demo
done | sort | uniq -c
```

Con 30 richieste al minuto ti aspetti circa 30 codici 200 e 10 codici 429, con la finestra che può spezzare il conteggio se il ciclo attraversa il cambio di minuto. Se vedi 40 risposte 200, il contatore non sta usando Redis oppure il consumer non è stato riconosciuto e la chiave di conteggio è tornata all'IP.

## Esercizi

1. Aggiungi un secondo consumer con `minute: 5` e verifica che la quota del primo non venga consumata dal secondo.
2. Porta il target `echo-b` fuori servizio con `docker compose stop echo-b` e misura quando il traffico smette di arrivare lì, leggendo `curl -s localhost:8001/upstreams/demo-upstream/health`. Con i valori di health check sopra il rilevamento richiede diversi cicli di 10 secondi.
3. Rimuovi `strip_path` e verifica con il backend di echo che il prefisso arrivi davvero.
4. Sposta `key-auth` a livello globale e rendi pubblico solo il path `/status`: serve una rotta dedicata con un service che non richiede autenticazione, oppure `config.anonymous` nel plugin globale; le altre route devono continuare a rispondere 401.
5. Sostituisci `policy: redis` con `local`, abbassa il limite a 5 e ripeti il ciclo fermando Redis: il traffico deve continuare a passare senza contatore condiviso.

<details>
<summary>Soluzione</summary>

1. Due consumer con credenziali distinte e lo stesso plugin con soglie diverse dimostrano che `limit_by: consumer` separa i contatori nella stessa chiave Redis.
2. Il target passa a `UNHEALTHY` dopo tre errori HTTP consecutivi nel ciclo attivo; finché non lo è, Kong continua a inviare una parte del traffico e il client vede errori di connessione.
3. Con `strip_path: false` il backend riceve `/demo` e risponde con il suo echo del path, che cambia rispetto al caso precedente.
4. Con `config.anonymous` Kong associa le richieste senza credenziale a un consumer dichiarato: è il modo per lasciare una rotta aperta con `key-auth` globale, a patto di attribuire a quel consumer una quota bassa e nessun permesso aggiuntivo. Una rotta separata con un service proprio resta più leggibile, perché isola l'endpoint pubblico anche davanti a futuri plugin globali.
5. Con `local` ogni nodo ha il suo contatore e un Redis spento non blocca nulla; il prezzo è che il limite complessivo dipende dal numero di istanze.

</details>

## Errori comuni

- **Admin API esposta su `0.0.0.0:8001`**: chiunque sulla rete può riscrivere le route; il bind su `127.0.0.1` nel Compose non è un dettaglio.
- **`kong.yaml` montato in scrittura**: il container può modificarlo e la copia in Git non rappresenta più lo stato reale.
- **Target con nome del servizio Compose sbagliato**: `echo-a:9000` funziona solo se il container è sulla stessa rete `gw`; un errore qui produce 502 senza alcun messaggio utile nel client.
- **Verificare il rate limit con un solo curl**: la finestra di un minuto può chiudersi a metà ciclo e il conteggio sembra sbagliato; usa `seq` con timestamp.
- **Dimenticare `deck gateway diff` prima di `sync`**: la sincronizzazione cancella gli oggetti assenti dal file, compresi quelli creati a mano per debug.

## In sintesi

Il laboratorio ha unito le parti lette nelle lezioni precedenti: un file dichiarativo versionato, un upstream con health check, una credenziale per consumer e un contatore su Redis. Il valore didattico è nei casi negativi: 401 senza chiave, 429 esaurita la quota, 502 quando il target non risponde. Portare la stessa configurazione in produzione significa aggiungere TLS sul listener, secret esterni al file e un pipeline che esegua `deck gateway diff` prima di ogni `sync`.

## Fonti

- [Kong Gateway - Entità Upstream](https://developer.konghq.com/gateway/entities/upstream/)
- [Kong Gateway - Configurazione](https://developer.konghq.com/gateway/configuration/)
- [decK - gestione dichiarativa](https://developer.konghq.com/deck/)
- [Kong Gateway - Repository GitHub](https://github.com/Kong/kong)
