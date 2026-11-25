Caddy è un web server e reverse proxy scritto in Go che nasce attorno a una promessa precisa: HTTPS automatico e predefinito, senza toolchain esterna. In questa lezione vedi come Caddy decide se un sito usa un certificato pubblico ACME o uno autofirmato locale, come si legge il formato Caddyfile, e perché la configurazione nativa è JSON mentre il Caddyfile è un adattatore che la genera.

## Obiettivi

- Riconoscere quando Caddy attiva automaticamente HTTPS e con quale autorità di certificazione.
- Leggere e scrivere un Caddyfile con blocchi di sito, siti e direttive.
- Distinguere i file di configurazione da quelli di stato: `--config`, `--resume`, data directory.
- Riconoscere i casi in cui l'automatismo si spegne e va gestito a mano.

## Automatic HTTPS: quando si attiva

Caddy serve HTTPS per default. Quando conosce un hostname o un indirizzo IP, apre le operazioni di provisioning: per un nome pubblico come `app.example.com` ottiene il certificato da un'autorità ACME pubblica (Let's Encrypt o ZeroSSL), per `localhost`, `127.0.0.1` o nomi interni genera un certificato autofirmato e tenta di installare la radice nel trust store del sistema.

| Condizione | Effetto |
| --- | --- |
| nome DNS pubblico, porte 80 e 443 raggiungibili | certificato ACME e redirect da HTTP a HTTPS |
| `localhost`, indirizzo IP, nome interno | certificato autofirmato, fidato solo se la radice è installata |
| sito dichiarato con `http://` | nessun TLS, solo HTTP |
| nessun hostname nella configurazione | nessun provisioning |
| `auto_https off` nelle opzioni globali | automatismo spento a livello globale |

Le priorità in pratica: DNS puntato prima di avviare Caddy, data directory scrivibile e persistente, perché certificati e chiavi vanno salvati oltre il riavvio. Su un hostname che termina in `.ts.net` Caddy non gestisce i certificati ma li chiede all'istanza Tailscale locale.

Il certificato locale non è un ripiego: Caddy usa una propria autorità di certificazione, la installa nel trust store quando ha i permessi e firma con quella tutti i nomi interni. Il risultato è che `https://localhost` funziona nei browser e nei client HTTP come un sito pubblico, con la differenza che la fiducia è locale alla macchina che ha eseguito Caddy. Su una macchina diversa, come un container di test o un portatile del collega, la radice manca e la connessione viene rifiutata finché non la si importa.

## Il Caddyfile

Il Caddyfile è un formato leggibile in cui il primo token di un blocco è l'indirizzo del sito. Le direttive dentro il blocco si applicano in un ordine fisso stabilito da Caddy, non nell'ordine in cui le scrivi: è un dettaglio che spiega comportamenti inattesi quando si mescolano `handle` e direttive semplici.

```caddyfile
{
    email ops@example.com
    admin localhost:2019
}

app.example.com {
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        -Server
    }
    root * /srv/app
    file_server

    handle /api/* {
        reverse_proxy api:8080
    }
    handle_errors {
        respond "{err.status_code} {err.status_text}" {err.status_code}
    }
}

localhost:8080 {
    respond "ambiente locale"
}
```

```bash
caddy adapt --config Caddyfile --pretty      # mostra il JSON generato
caddy validate --config Caddyfile            # valida senza applicare
caddy run --config Caddyfile                 # esegue in primo piano
caddy reload --config Caddyfile              # applica senza downtime
```

`caddy adapt` è lo strumento didattico più utile: mostra che il Caddyfile è zucchero sintattico e che il vero contratto dell'API è JSON. `caddy reload` usa l'Admin API sul socket o sull'endpoint `admin` per caricare una nuova configurazione in modo atomico: se il file è invalido, la configurazione attiva resta quella precedente.

| Comando | Cosa fa | Quando usarlo |
| --- | --- | --- |
| `caddy adapt` | converte Caddyfile in JSON | debugging e revisione |
| `caddy validate` | controlla sintassi e semantica | prima di ogni reload |
| `caddy reload` | applica senza riavvio | deploy di configurazione |
| `caddy stop` | arresta il processo che ascolta sull'Admin API | ciclo di sviluppo |
| `caddy fmt --overwrite` | normalizza il Caddyfile | pre-commit |

## Siti, matcher ed errori

Un indirizzo di sito può contenere più host (`a.example.com, b.example.com`) e un blocco `handle` sceglie un ramo in base a un matcher; `handle_path` fa anche strip del prefisso. Una richiesta che non entra in nessun ramo di un blocco di sito riceve il gestore `respond` vuoto, quindi 200 con corpo vuoto: per un percorso non previsto conviene definire un ramo esplicito o usare `abort` per chiudere la connessione.

```caddyfile
status.example.com {
    handle_path /old/* {
        redir https://app.example.com/new{uri} permanent
    }
    handle {
        abort
    }
}
```

`redir` con `{uri}` preserva path e query string, mentre `handle { abort }` evita di rispondere 200 a un percorso che l'applicazione non serve. Queste due righe eliminano la maggior parte dei "siti Caddy che rispondono vuoto" che si vedono nelle configurazioni copiate.

## Errori comuni

- **Avviare Caddy prima che il DNS punti al server**: il tentativo ACME fallisce, Caddy ritenta con backoff e il sito resta senza certificato per minuti.
- **Usare una data directory temporanea in container**: a ogni riavvio Caddy richiede i certificati e rischia limiti di rate dell'autorità ACME.
- **Mescolare `handle` e direttive di primo livello**: l'ordine è imposto da Caddy e il ramo più specifico può risultare irraggiungibile.
- **Fidarsi del certificato autofirmato in CI**: i client senza la radice di Caddy rifiutano la connessione; serve `caddy trust` o un certificato proprio.
- **Servire il traffico e modificare il file a mano senza `validate`**: un reload fallito è silenzioso se il log non è letto.

## In sintesi

Caddy trasforma la configurazione in un piano per TLS: nome pubblico uguale certificato ACME, nome locale uguale certificato autofirmato e fidato, `http://` uguale niente automatismo. Il Caddyfile è un formato leggibile che si adatta a JSON, e `adapt`, `validate` e `reload` coprono il ciclo di lavoro sicuro. Matcher e `handle` decidono il ramo, e un ramo di chiusura esplicito evita risposte vuote. La lezione successiva scende nel reverse proxy, nel bilanciamento e nella gestione avanzata dei certificati.

## Fonti

- [Caddy - Documentazione](https://caddyserver.com/docs/)
- [Caddy - Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Caddy - File Caddyfile](https://caddyserver.com/docs/caddyfile)
- [Caddy - Command line](https://caddyserver.com/docs/command-line)
