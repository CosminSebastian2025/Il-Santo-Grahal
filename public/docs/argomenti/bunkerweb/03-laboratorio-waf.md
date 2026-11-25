Questo laboratorio monta uno stack BunkerWeb completo con Docker Compose — istanza, scheduler, UI e database — e un'applicazione dietro proxy, poi verifica che il WAF sia effettivamente in funzione: prima in modalità `detect` per raccogliere gli eventi, poi in `block` per vedere le richieste fermarsi. L'obiettivo non è "il sito risponde" ma "il sito risponde e una richiesta malevola viene fermata con un codice osservabile".

## Obiettivi

- Avviare lo stack BunkerWeb 1.6.18 con scheduler collegato e credenziali non predefinite.
- Collegare un'applicazione con etichette Docker sulla rete `bw-services` e verificare il proxy.
- Eseguire un attacco di prova, leggere l'evento nei log, passare da `detect` a `block`.
- Aggiungere un'eccezione mirata e un limite di richieste senza chiudere il browser legittimo.

## Avvio dello stack

Il laboratorio gira in `~/lab-bunkerweb` su una macchina con Docker Engine e almeno 2 GB di RAM libera; MariaDB e ModSecurity occupano più spazio. La password del database va cambiata prima del primo avvio, e `API_WHITELIST_IP` deve contenere la rete Docker in cui vivono scheduler e istanze.

```yaml
# compose.yaml
x-bw-env: &bw-env
  API_WHITELIST_IP: "127.0.0.0/8 172.16.0.0/12"
  DATABASE_URI: "mariadb+pymysql://bunkerweb:lab-db-pass-2026@bw-db:3306/db"

services:
  bunkerweb:
    image: bunkerity/bunkerweb:1.6.18
    ports: ["80:8080", "443:8443", "443:8443/udp"]
    environment: *bw-env
    restart: unless-stopped
    networks: [bw-universe, bw-services]
  bw-scheduler:
    image: bunkerity/bunkerweb-scheduler:1.6.18
    environment:
      <<: *bw-env
      BUNKERWEB_INSTANCES: "bunkerweb"
      SERVER_NAME: ""
      MULTISITE: "yes"
      UI_HOST: "http://bw-ui:7000"
      USE_REDIS: "yes"
      REDIS_HOST: "bw-redis"
    volumes: [bw-storage:/data]
    restart: unless-stopped
    networks: [bw-universe, bw-db]
  bw-ui:
    image: bunkerity/bunkerweb-ui:1.6.18
    environment: *bw-env
    volumes: [bw-ui-data:/data]
    restart: unless-stopped
    networks: [bw-universe, bw-db]
  bw-db:
    image: mariadb:11
    environment:
      MARIADB_RANDOM_ROOT_PASSWORD: "yes"
      MARIADB_DATABASE: "db"
      MARIADB_USER: "bunkerweb"
      MARIADB_PASSWORD: "lab-db-pass-2026"
    volumes: [bw-db:/var/lib/mysql]
    networks: [bw-db]
  bw-redis:
    image: redis:7.4-alpine
    networks: [bw-universe]

volumes:
  bw-storage: {}
  bw-ui-data: {}
  bw-db: {}
networks:
  bw-universe: {}
  bw-db: {}
  bw-services:
    name: bw-services
```

Le porte dell'istanza sono 8080 e 8443 dentro il container, come nella documentazione ufficiale; la 443 su UDP serve se si abilita HTTP/3. La UI non pubblica porte sull'host: la si raggiunge da un container della stessa rete o con un port-forward esplicito quando serve.

```bash
docker compose up -d
docker compose ps
docker compose logs -f bw-scheduler | grep -iE "config|error" | head -20
```

Nei log dello scheduler deve comparire l'invio della configurazione all'istanza `bunkerweb`. Se lo scheduler ripete "instance unreachable", `API_WHITELIST_IP` non copre la rete dello scheduler o il nome dell'istanza non corrisponde.

## Configurazione del servizio

```yaml
  myapp:
    image: bunkerity/bunkerweb-hello:v1.0
    networks: [bw-services]
    labels:
      - "bunkerweb.SERVER_NAME=www.lab.test"
      - "bunkerweb.USE_REVERSE_PROXY=yes"
      - "bunkerweb.REVERSE_PROXY_URL=/"
      - "bunkerweb.REVERSE_PROXY_HOST=http://myapp:8080"
      - "bunkerweb.SERVE_FILES=no"
      - "bunkerweb.SECURITY_MODE=detect"
      - "bunkerweb.USE_MODSECURITY=yes"
      - "bunkerweb.USE_MODSECURITY_CRS=yes"
      - "bunkerweb.USE_LIMIT_REQ=yes"
      - "bunkerweb.LIMIT_REQ_URL=/"
      - "bunkerweb.LIMIT_REQ_RATE=30r/s"
```

`SERVE_FILES=no` è obbligatorio in configurazione di proxy: senza, BunkerWeb prova a servire i file statici dalla propria directory e il backend non riceve alcune richieste. Con `SECURITY_MODE=detect` il WAF analizza e logga senza bloccare, e questo è il primo passo.

## Verifica in detect, poi in block

| Caso | Comando | Atteso in `detect` | Atteso in `block` |
| --- | --- | --- | --- |
| richiesta normale | `curl -s -H 'Host: www.lab.test' http://localhost/` | 200 | 200 |
| injection SQL | `curl -s -o /dev/null -w '%{http_code}' -H 'Host: www.lab.test' 'http://localhost/?id=1%27%20OR%20%271%27=%271'` | 200 | 403 |
| path traversal | `curl -s -o /dev/null -w '%{http_code}' -H 'Host: www.lab.test' 'http://localhost/../../etc/passwd'` | 400 o 200 | 403 |
| numero elevato di 404 | ciclo di 30 richieste a path inesistenti | 404 | ban dopo soglia |
| traffico sopra il limite | `seq 1 200 \| xargs -P 20 -I{} curl -s -o /dev/null -H 'Host: www.lab.test' http://localhost/` | 200 | 429 |

```bash
docker compose logs bunkerweb | grep -iE 'modsecurity|deny|rule' | tail -20
docker compose logs bunkerweb | grep -oE 'id "[0-9]+"' | sort | uniq -c | sort -rn | head
```

Il secondo comando è la parte didattica del laboratorio: conta gli id delle regole CRS che scattano di più sui tuoi payload. Da quei numeri nasce l'eventuale eccezione. Quando passi a `block`, il cambio avviene cambiando l'etichetta in `SECURITY_MODE=block` e riavviando il servizio dell'app, oppure dalla web UI: lo scheduler rigenera e distribuisce la configurazione. Per leggere le impostazioni effettive di un servizio puoi anche interrogare la UI, che mostra il valore risolto dopo l'unione di globali e override per host.

## Esercizi

1. Porta la modalità a `block` e verifica che la richiesta con injection SQL restituisca 403 con la pagina di blocco.
2. Aggiungi un'eccezione mirata per una sola regola su un solo path usando una regola ModSecurity personalizzata, poi dimostra che un altro tipo di attacco resta bloccato.
3. Attiva `USE_BAD_BEHAVIOR=yes` con `BAD_BEHAVIOR_STATUS_CODES=404` e trova la soglia che manda in ban il ciclo di richieste.4. Attiva `USE_ANTIBOT=cookie` sul servizio e verifica con `curl` senza gestione dei cookie che cosa succede.
5. Attiva `USE_SELF_SIGNED_CERT=yes` e verifica il TLS su 443 con `openssl s_client -connect localhost:443 -servername www.lab.test`.

<details>
<summary>Soluzione</summary>

1. In `block` la regola CRS interrompe la richiesta in fase di request: il client riceve 403 e il log riporta l'id della regola insieme all'URI.
2. Una regola con `SecRule REQUEST_URI "@beginsWith /form" "id:9001,phase:1,pass,nolog,ctl:ruleRemoveById=942100"` disattiva solo quella regola su quel path; un payload di tipo XSS (`<script>`) continua a essere fermato.
3. La soglia conta le risposte con codici elenchi in una finestra: il ban colpisce l'IP e le richieste successive ricevono 403 anche su path validi, indipendentemente dal contenuto.
4. Senza cookie jar il client finisce sulla pagina `ANTIBOT_URI` (302 verso la challenge) e non accede alla risorsa; con `curl -c jar -b jar` completa la challenge e prosegue.
5. `openssl s_client` mostra il certificato autofirmato generato da BunkerWeb; il client deve aggiungere la CA o disabilitare la verifica, perché il certificato non è emesso da un'autorità pubblica.

</details>

## Errori comuni

- **Password del database uguale per Compose e MariaDB solo da un lato**: lo scheduler non si connette e la UI resta senza impostazioni.
- **`bw-services` non esterna come concordato nei documenti**: l'etichetta punta a un nome che non risolve e ogni richiesta produce 502.
- **Istanza raggiungibile ma UI non accessibile**: la porta 7000 non è pubblicata e non lo deve essere; si usa il port-forward o un proxy dedicato.
- **Ciclo di 404 senza `SECURITY_MODE=detect` nella prima fase**: si banna l'IP del proprio laboratorio e si perde l'accesso alla UI dalla stessa rete.
- **Esclusione della verifica TLS nel browser scambiata per errore di configurazione**: il certificato autofirmato è la scelta attesa in laboratorio, non un difetto.

## In sintesi

Lo stack BunkerWeb è composto da istanze, scheduler, UI e database, e l'etichetta Docker è il contratto che collega un'applicazione alla protezione. La modalità `detect` permette di raccogliere gli eventi e contare gli id delle regole, il passaggio a `block` mostra il WAF in azione con 403 osservabili, e bad behavior e limiti aggiungono ban e 429. Il criterio di accettazione è un comportamento misurato, non una pagina che si apre.

## Fonti

- [BunkerWeb - Quickstart](https://docs.bunkerweb.io/1.6.18/quickstart-guide/)
- [BunkerWeb - Integrazione Docker](https://docs.bunkerweb.io/1.6.18/integrations/)
- [BunkerWeb - Web UI](https://docs.bunkerweb.io/1.6.18/web-ui/)
- [BunkerWeb - Elenco impostazioni](https://docs.bunkerweb.io/1.6.18/settings/)
