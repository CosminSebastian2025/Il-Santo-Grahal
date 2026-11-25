BunkerWeb è un web application firewall open source che si presenta come un web server completo — NGINX sotto il cofano — con una promessa diversa dalla maggior parte dei proxy: la configurazione predefinita è già sicura. Invece di montare un WAF davanti a un server web, BunkerWeb diventa il server web di frontiera, applica ModSecurity con il Core Rule Set, limita il traffico e aggiunge header e redirect per ogni sito ospitato. In questa lezione impari i concetti che reggono tutto il resto: servizi, multisite, scheduler e impostazioni con contesto globale o per server.

## Obiettivi

- Capire cosa significa "secure by default" in termini di impostazioni attive dal primo avvio.
- Distinguere le istanze BunkerWeb, lo scheduler, il database e la web UI.
- Leggere le impostazioni `USE_*` e i prefissi per server nel multisite.
- Scegliere tra le integrazioni Linux, Docker, Swarm e Kubernetes.

## L'architettura: istanze, scheduler, UI

La versione 1.6 separa i ruoli. Le istanze BunkerWeb ricevono il traffico e applicano la configurazione che lo scheduler calcola a partire dalle impostazioni salvate in un database (MariaDB nel Compose di riferimento). La web UI scrive le impostazioni nello stesso database, lo scheduler regenera i file di NGINX e li invia alle istanze tramite l'API interna. Le istanze non leggono il database direttamente: così un guasto del database non spegne il traffico.

| Componente | Ruolo | Nota operativa |
| --- | --- | --- |
| `bunkerweb` | data plane: NGINX più plugin | ascolta 8080/8443 nel container |
| `bunkerweb-scheduler` | calcola e distribuisce la configurazione | richiede accesso all'API delle istanze |
| `bunkerweb-ui` | interfaccia web per le impostazioni | porta 7000 nel container |
| database | fonte delle impostazioni | MariaDB nel setup Docker |
| Redis | cache e stato condiviso del cluster | abilitato con `USE_REDIS=yes` |
| CrowdSec (opzionale) | ban comportamentali e intelligence | plugin dedicato |

L'API interna delle istanze va protetta: `API_WHITELIST_IP` deve contenere la rete dello scheduler, altrimenti lo scheduler non riesce a inviare la configurazione e l'istanza si avvia con impostazioni vuote. È il primo errore da controllare quando la UI mostra un servizio ma il sito non risponde come previsto.

## Multisite e contesto delle impostazioni

Con `MULTISITE=no`, che è il default, BunkerWeb serve una sola applicazione e tutte le impostazioni valgono per lei. Con `MULTISITE=yes` ogni nome host diventa un servizio con il proprio set di impostazioni, e le impostazioni globali fanno da default. La sintassi per un override è il prefisso del nome server:

```dotenv
MULTISITE=yes
SERVER_NAME=app.example.com www.example.com
AUTO_LETS_ENCRYPT=yes
USE_MODSECURITY=yes
USE_REVERSE_PROXY=yes
REVERSE_PROXY_URL=/
REVERSE_PROXY_HOST=http://app:8080

# override solo per uno dei servizi
api.example.com_SERVER_NAME=api.example.com
api.example.com_USE_REVERSE_PROXY=yes
api.example.com_REVERSE_PROXY_URL=/
api.example.com_REVERSE_PROXY_HOST=http://api:9000
api.example.com_USE_MODSECURITY=yes
```

| Impostazione | Default | Contesto | Effetto |
| --- | --- | --- | --- |
| `SERVER_NAME` | vuoto | globale | nomi host del servizio |
| `MULTISITE` | `no` | globale | abilita un servizio per host |
| `USE_MODSECURITY` | `yes` | multisite | WAF con Core Rule Set |
| `USE_REVERSE_PROXY` | `no` | multisite | inoltro a `REVERSE_PROXY_HOST` |
| `AUTO_LETS_ENCRYPT` | `no` | multisite | certificato Let's Encrypt |
| `SECURITY_MODE` | `block` | multisite | `detect` logga senza bloccare |
| `USE_ANTIBOT` | `no` | multisite | challenge anti-bot |

Il contesto conta più del nome: un'impostazione `global` non può essere sovrascritta per host, quindi la scelta sbagliata di contesto produce configurazioni che sembrano applicate e non lo sono. `SECURITY_MODE=detect` è la modalità giusta per il primo periodo su un'applicazione esistente: il WAF logga gli interventi senza rispondere 403, e i falsi positivi si leggono nei log prima di attivare `block`.

## Dove gira BunkerWeb

Le integrazioni cambiano il modo di dichiarare i servizi. Con Docker si usano etichette sul container dell'applicazione e la rete condivisa `bw-services`; con Docker Swarm si usano `deploy.labels`; con Kubernetes la risorsa che espone il servizio. Lo schema delle etichette è `bunkerweb.<IMPOSTAZIONE>`.

```yaml
services:
  myapp:
    image: bunkerity/bunkerweb-hello:v1.0
    networks: [bw-services]
    labels:
      - "bunkerweb.SERVER_NAME=www.example.com"
      - "bunkerweb.USE_REVERSE_PROXY=yes"
      - "bunkerweb.REVERSE_PROXY_URL=/"
      - "bunkerweb.REVERSE_PROXY_HOST=http://myapp:8080"
networks:
  bw-services:
    external: true
    name: bw-services
```

La rete `bw-services` è esterna perché deve essere creata dal setup BunkerWeb prima dei servizi: è il contratto che rende l'autoconfigurazione possibile senza toccare i container applicativi. Su Linux l'installer propone profili (Full Stack, Manager, Worker) e accetta flag non interattivi per le pipeline; le installazioni Manager accettano `--manager-ip` per la whitelist dell'API.

## Errori comuni

- **`API_WHITELIST_IP` che non copre lo scheduler**: la configurazione non arriva alle istanze e il sintomo è un sito che risponde con la pagina predefinita.
- **Credenziali del database lasciate a `changeme`**: il Compose di esempio le contiene e vanno cambiate prima del primo avvio, non dopo.
- **Porta 7000 della UI pubblicata**: la UI è un pannello di amministrazione; va raggiunta dietro VPN o su rete interna.
- **`MULTISITE=no` con più host**: il secondo host viene servito dalla configurazione del primo.
- **`AUTO_LETS_ENCRYPT=yes` senza DNS pronto**: il rinnovo fallisce e il sito resta senza certificato valido.

## In sintesi

BunkerWeb è un WAF che è anche il server web: un'istanza NGINX con plugin, uno scheduler che distribuisce le impostazioni, una UI che scrive nel database. Il multisite introduce un servizio per nome host e i prefissi per server permettono override puntuali, mentre il contesto globale o multisite decide cosa è sovrascrivibile. Le integrazioni cambiano solo il modo di dichiarare i servizi. La prossima lezione entra nelle feature di filtraggio e nel laboratorio con una catena completa.

## Fonti

- [BunkerWeb - Documentazione](https://docs.bunkerweb.io/)
- [BunkerWeb - Concetti](https://docs.bunkerweb.io/1.6.18/concepts/)
- [BunkerWeb - Elenco impostazioni](https://docs.bunkerweb.io/1.6.18/settings/)
- [BunkerWeb - Repository GitHub](https://github.com/bunkerity/bunkerweb)
