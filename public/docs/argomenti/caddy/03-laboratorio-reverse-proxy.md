In questo laboratorio costruisci una frontiera Caddy completa su Docker Compose: un sito statico, un'API proxata su due backend con failover, un'area amministrativa protetta da basic auth, un limite di dimensione sul corpo e certificati gestiti localmente. Il criterio di riuscita è che ogni comportamento sia verificabile con un comando, compresi quelli negativi, come il 401 sull'area admin e il 413 su un upload troppo grande.

## Obiettivi

- Avviare Caddy con data directory persistente e Caddyfile validato prima del reload.
- Comporre tre percorsi diversi sullo stesso hostname con `handle` e rami di chiusura.
- Verificare HTTPS locale, basic auth, limite del corpo e failover dell'upstream.
- Ispezionare la configurazione attiva via Admin API e ripristinarla dopo un errore.

## Struttura e Compose

Il laboratorio vive in `~/lab-caddy` con questa struttura: `Caddyfile`, `compose.yaml`, `site/index.html`, `certs/` (vuota all'inizio). La data directory su volume nominato è obbligatoria: contiene le radici e i certificati di Caddy.

```yaml
# compose.yaml
services:
  caddy:
    image: caddy:2.11
    ports: ["80:80", "443:443", "443:443/udp", "2019:2019"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./site:/srv/site:ro
      - caddy-data:/data
      - caddy-config:/config
    environment:
      ADMIN_PASS_HASH: "${ADMIN_PASS_HASH:?genera con caddy hash-password}"
    networks: [front]
  api-a:
    image: traefik/whoami:latest
    networks: [front]
  api-b:
    image: traefik/whoami:latest
    environment: {WHOAMI_NAME: "api-b"}
    networks: [front]
  admin:
    image: traefik/whoami:latest
    environment: {WHOAMI_NAME: "admin"}
    networks: [front]
volumes:
  caddy-data: {}
  caddy-config: {}
networks:
  front: {}
```

La porta 2019 è l'Admin API: in locale è comoda per ispezionare lo stato, in produzione va rimossa dai `ports` così resta raggiungibile solo dal socket Unix interno.

## Caddyfile e hash della password

```caddyfile
{
    email ops@example.com
    local_certs
}

lab.localhost, localhost {
    encode zstd gzip

    handle /api/* {
        reverse_proxy api-a:80 api-b:80 {
            lb_try_duration 3s
            health_uri /health
            health_interval 5s
            header_up X-Real-IP {remote_host}
        }
    }

    handle /admin/* {
        basic_auth {
            ops {$ADMIN_PASS_HASH}
        }
        request_body {
            max_size 1MB
        }
        reverse_proxy admin:80
    }

    handle {
        root * /srv/site
        file_server
    }
}
```

Genera l'hash sul tuo host, non nel container, e passa il valore come variabile d'ambiente:

```bash
export ADMIN_PASS_HASH="$(caddy hash-password --plaintext 'lab-admin-2026')"
echo "$ADMIN_PASS_HASH" | head -c 20    # deve iniziare con \$2a\$
docker compose up -d
docker compose exec caddy caddy validate --config /etc/caddy/Caddyfile
docker compose exec caddy caddy list-modules | head -5
```

`local_certs` nelle opzioni globali dice a Caddy di emettere certificati da una CA locale per tutti i siti, senza contattare autorità pubbliche: è la scelta corretta per un laboratorio e per `lab.localhost`. Il nome `lab.localhost` è risolto dai browser moderni come loopback.

## Verifiche

| Caso | Comando | Atteso |
| --- | --- | --- |
| HTTP verso HTTPS | `curl -sI http://localhost/` | `308` verso `https://localhost/` |
| TLS locale | `curl -skv https://localhost/ 2>&1 \| grep -i "issuer"` | issuer della CA locale di Caddy |
| sito statico | `curl -sk https://localhost/` | contenuto di `site/index.html` |
| API | `curl -sk https://localhost/api/` | risposta di `whoami` |
| admin senza credenziali | `curl -sk -o /dev/null -w '%{http_code}' https://localhost/admin/` | `401` |
| admin con credenziali | `curl -sk -u ops:lab-admin-2026 -o /dev/null -w '%{http_code}' https://localhost/admin/` | `200` |
| corpo troppo grande | `curl -sk -u ops:lab-admin-2026 -X POST --data-binary @/tmp/2mb.bin https://localhost/admin/ -o /dev/null -w '%{http_code}'` | `413` |
| percorso inesistente | `curl -sk https://localhost/nulla -o /dev/null -w '%{http_code}'` | `404` dal file server |

Il failover si verifica fermando un backend e contando le risposte: con `lb_try_duration` attivo, le richieste che cadono sul nodo fermo vengono ritentate su quello sano entro la finestra.

```bash
docker compose stop api-b
for i in $(seq 1 20); do curl -sk https://localhost/api/ -o /dev/null -w '%{http_code} '; done; echo
docker compose start api-b
```

Se vedi una sequenza di `502` la finestra di retry è troppo corta rispetto al timeout di connessione, oppure il backend usa un nome che Caddy non risolve sulla rete `front`. L'Admin API permette di leggere la configurazione normalizzata quando un comportamento non torna:

```bash
curl -s localhost:2019/config/ | python3 -m json.tool | head -40
```

## Esercizi

1. Rompi volutamente il Caddyfile (per esempio togli una graffa) e lancia `caddy reload`: verifica che il sito continui a funzionare con la configurazione precedente.
2. Aggiungi `flush_interval -1` all'API, poi confronta la latenza del primo byte su un endpoint che risponde a pezzi.
3. Sostituisci `local_certs` con un certificato esplicito `tls /etc/caddy/site.pem /etc/caddy/site.key` generato con `openssl` e verifica che Caddy non tenti più l'emissione.
4. Proteggi `/api/*` con `forward_auth` verso un servizio che restituisce 200 solo con un header corretto e osserva gli header copiati.
5. Aumenta `max_size` a 20MB e verifica il tempo di trasferimento su un file da 15MB: dove viene applicato il limite rispetto a Caddy senza limite?

<details>
<summary>Soluzione</summary>

1. `caddy reload` valida prima di applicare: su errore stampa il problema e lascia attiva la configurazione in memoria, quindi il servizio non si interrompe.
2. Senza `flush_interval -1` Caddy bufferizza e il primo byte può arrivare con il resto; con il valore a `-1` il flush è immediato e la latenza per evento si riduce.
3. Con `tls` esplicito e la coppia di file, Caddy non gestisce più quel certificato e il rinnovo diventa responsabilità esterna; il sito resta HTTPS ma la CA non compare più nel log di emissione.
4. `forward_auth` costruisce una sottorichiesta verso il servizio, e in caso di 2xx copia gli header indicati con `copy_headers`; 401 dal servizio produce 401 anche per il client.
5. Il limite viene applicato mentre Caddy legge il corpo: con `max_size` la connessione viene interrotta o risponde 413 senza inoltrare tutto il payload al backend, quindi il tempo è inferiore a quello di un upload completo.

</details>

## Errori comuni

- **Data directory non persistente**: a ogni `up` Caddy rigenera la CA e richiede i certificati reali, consumando quota dell'autorità.
- **Variabile `ADMIN_PASS_HASH` assente o con `$` non quotato**: il Compose si ferma grazie al `:?`, ma un `.env` con un hash scritto senza apici viene letto male e `basic_auth` rifiuta la configurazione.
- **Admin API pubblicata**: la porta 2019 consente di sostituire l'intera configurazione; esporla anche solo in staging è un errore.
- **`local_certs` dimenticato prima di andare in produzione**: il certificato locale non è fidato dai client e il deploy sembra rotto senza errore evidente.
- **Verificare solo i casi positivi**: senza 401, 413 e 404 il laboratorio non dimostra che le policy sono attive.

## In sintesi

Caddy ha permesso di costruire in un file una frontiera con tre rami, TLS locale persistente e un limite di corpo per ramo. Il ciclo sicuro è `hash-password` fuori dal container, `validate` prima di `reload`, verifica tramite Admin API. Il failover su due backend richiede una finestra di retry coerente con il timeout, e le policy vanno provate con richieste che devono fallire. In produzione cambiano tre cose: niente porta 2019 esposta, certificati da autorità reale e verifiche automatiche ripetute in pipeline.

## Fonti

- [Caddy - Direttiva reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy - Command line](https://caddyserver.com/docs/command-line)
- [Caddy - API di amministrazione](https://caddyserver.com/docs/api)
- [Caddy - Come eseguire Caddy](https://caddyserver.com/docs/running)
