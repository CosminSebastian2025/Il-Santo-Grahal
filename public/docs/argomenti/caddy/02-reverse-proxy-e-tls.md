Il punto di forza di Caddy non è il Caddyfile elegante ma il fatto che l'operazione quotidiana — pubblicare un backend dietro HTTPS, con sicurezza e con osservabilità — non richiede pezzi esterni. Questa lezione copre `reverse_proxy` e i suoi modi di bilanciamento, i pattern per autenticazione e protezione delle richieste, e la gestione dei certificati quando l'automatismo non basta.

## Obiettivi

- Configurare `reverse_proxy` con più upstream, health check passivi e header corretti.
- Usare `handle` e `handle_path` per comporre più backend sullo stesso hostname.
- Aggiungere `basic_auth` e `request_body` limit senza rompere gli upload legittimi.
- Gestire wildcard, staging ACME e TLS on-demand sapendo cosa implicano.

## Reverse proxy e bilanciamento

`reverse_proxy` accetta un indirizzo singolo o un gruppo. Il bilanciamento predefinito è `random` con selezione a due scelte (power of two choices), che distribuisce bene senza contatori globali; `round_robin` è possibile ma su carichi irregolari concentra meno uniformemente del default.

| Configurazione | Uso |
| --- | --- |
| `reverse_proxy api:8080` | un solo upstream |
| `reverse_proxy api1:8080 api2:8080` | bilanciamento tra due nodi |
| `reverse_proxy /api/* api:8080` | proxy per un sottoalbero di path |
| `lb_policy round_robin` | distribuzione sequenziale |
| `lb_try_duration 5s` | ritenta su un altro upstream entro la finestra |
| `health_uri /healthz` | health check passivo sull'endpoint |

```caddyfile
app.example.com {
    reverse_proxy api1:8080 api2:8080 {
        lb_try_duration 5s
        lb_try_interval 250ms
        health_uri /healthz
        health_interval 10s
        health_timeout 2s
        header_up X-Real-IP {remote_host}
        flush_interval -1
    }
}
```

`header_up X-Real-IP {remote_host}` sovrascrive un header che il client potrebbe inviare falsificandolo, mentre `X-Forwarded-For` viene gestito da Caddy aggiungendo l'indirizzo reale. `flush_interval -1` disabilita il buffering e serve per streaming e Server-Sent Events: senza, le risposte arrivano a blocchi e il client sembra bloccato.

Caddy non esegue un health check attivo periodico verso tutti gli upstream come farebbe un load balancer dedicato: gli upstream vengono messi da parte quando falliscono (health check passivo sui codici di risposta e sugli errori di connessione), e `health_uri` con `health_interval` serve a interrogare gli upstream passivi per riammetterli quando tornano sani. Per pool grandi o ambienti con failover stretto serve un bilanciatore dedicato davanti o un modulo esterno.

## Più backend su un host, e sicurezza di base

`handle` sceglie il ramo in base a un matcher e `handle_path` fa anche lo strip del prefisso. Entrambi creano un ramo esclusivo: sono il modo corretto per mettere un'applicazione statica, un'API e un servizio di autenticazione sullo stesso hostname.

```caddyfile
app.example.com {
    encode zstd gzip

    handle /api/* {
        reverse_proxy api:8080
    }

    @admin path /admin/*
    handle @admin {
        basic_auth {
            ops $2a$14$Q9yqf8gH8gZ1yQ2v7o3T5uJm0dM8y2u1yJx6aV0mS9o5Kp0bN0F5a
        }
        reverse_proxy admin:9000
    }

    handle {
        root * /srv/app
        file_server
    }
}
```

Le password di `basic_auth` sono hash bcrypt generati con `caddy hash-password`; scrivere la password in chiaro produce un errore di validazione, non un'autenticazione silenziosamente aperta. Per limitare la dimensione del corpo si usa `request_body { max_size 10MB }` sul ramo interessato: un limite globale troppo basso rompe gli upload legittimi, uno assente lascia il backend esposto a richieste enormi.

Per le applicazioni che delegano l'autenticazione a un servizio esterno, `forward_auth` invia una sottorichiesta al servizio di verifica e, se ottiene 2xx, copia gli header nella richiesta reale. È il pattern tipico per proteggere un'applicazione che non sa fare login, senza mettere in Caddy la logica di autorizzazione: il servizio esterno conosce gli utenti, Caddy si limita a fidarsi della sua risposta e a propagare l'identità all'applicazione tramite header come `Remote-User`. Se il servizio di verifica non risponde, la sottorichiesta fallisce e l'accesso viene negato: la policy di sicurezza resta chiusa per default anche quando la dipendenza è giù.

## Certificati quando l'automatismo non basta

Tre situazioni rompono il flusso automatico: wildcard, ambienti di test e domini creati a runtime. Ognuna ha una risposta diversa.

| Situazione | Soluzione | Costo |
| --- | --- | --- |
| `*.example.com` con diversi backend | wildcard ACME con challenge DNS | fornitore DNS con plugin |
| Prove senza consumare rate limit | `acme_ca` verso staging Let's Encrypt | certificato non fidato |
| Migliaia di domini utente | `on_demand` TLS con `ask` | rischio di abuso se `ask` è aperto |
| Certificati aziendali già emessi | `tls /etc/certs/site.pem /etc/certs/site.key` | rinnovo fuori da Caddy |

Il TLS on-demand è potente e pericoloso: Caddy emette un certificato al primo handshake per un hostname richiesto, quindi senza un endpoint `ask` che approvi il dominio chiunque può indirizzare traffico verso il server e far emettere certificati. Il sistema `ask` va sempre abbinato a una verifica dell'hostname in un elenco controllato.

## Errori comuni

- **`handle` e direttive nello stesso blocco**: la direttiva di primo livello crea un ramo su tutto e l'`handle` specifico non viene raggiunto.
- **Nessun ramo di chiusura**: una richiesta a un percorso non gestito riceve 200 con corpo vuoto invece di 404.
- **`flush_interval` lasciato al default su SSE**: gli eventi arrivano raggruppati e i client bufferizzano.
- **`on_demand` senza `ask`**: il server diventa un emettitore di certificati per qualsiasi nome.
- **Password basic auth in chiaro**: `caddy validate` fallisce; usare `caddy hash-password --plaintext`.

## In sintesi

`reverse_proxy`, `handle` e `handle_path` bastano per comporre una piattaforma di frontiera: più backend sullo stesso host, per-sito HTTPS e policy per ramo. Il bilanciamento predefinito è `random` a due scelte, il buffering si controlla con `flush_interval` e gli header di provenienza vanno sovrascritti. Certificati wildcard, staging e on-demand richiedono configurazione esplicita e, nel caso on-demand, una allowlist. Il laboratorio finale mette tutto insieme in un percorso verificabile.

## Fonti

- [Caddy - Direttiva reverse_proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy - Direttiva handle_path](https://caddyserver.com/docs/caddyfile/directives/handle_path)
- [Caddy - Direttiva basic_auth](https://caddyserver.com/docs/caddyfile/directives/basic_auth)
- [Caddy - Pattern comuni del Caddyfile](https://caddyserver.com/docs/caddyfile/patterns)
