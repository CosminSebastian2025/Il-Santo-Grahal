BunkerWeb espone decine di feature come impostazioni booleane con parametri di dettaglio, il che rende facile attivare molto e capire poco. Questa lezione mette ordine tra le famiglie che contano davvero: ModSecurity e Core Rule Set, limitazione e ban, challenge anti-bot, header e redirect, TLS e certificati; poi spiega come si esce dai falsi positivi senza spegnere il WAF e come si osserva quello che il WAF decide.

## Obiettivi

- Configurare ModSecurity con il Core Rule Set e la modalità `detect` o `block`.
- Distinguere rate limiting, bad behavior e ban manuali, sapendo dove finisce ogni decisione.
- Usare antibot e blacklist senza chiudere fuori utenti legittimi.
- Leggere i log e raccogliere evidenze prima di aggiungere un'eccezione a una regola.

## ModSecurity e Core Rule Set

Il WAF è ModSecurity con l'OWASP Core Rule Set versione 4. BunkerWeb lo abilita per default: `USE_MODSECURITY=yes` e `USE_MODSECURITY_CRS=yes` compongono la catena che ispeziona URI, header, corpo e risposta. `MODSECURITY_CRS_VERSION` è deprecato perché il progetto CRS ha smesso le release nightly; la versione 4 è il riferimento. `SECURITY_MODE` decide cosa succede quando una regola fa scattare un'interruzione.

```dotenv
USE_MODSECURITY=yes
USE_MODSECURITY_CRS=yes
SECURITY_MODE=detect
```

In `detect` la richiesta passa e il log contiene l'evento con l'id della regola; in `block` la richiesta ottiene la pagina di blocco. La sequenza corretta su un'applicazione esistente è: qualche giorno in `detect`, analisi degli id più frequenti, esclusione mirata, passaggio a `block`. Il passaggio diretto a `block` produce blocchi su form legittimi e su endpoint che inviano JSON con caratteri percepiti come malevoli.

Le eccezioni vanno scritte come regole ModSecurity personalizzate e non tagliando intere categorie: spegnere `942100` su un path specifico è accettabile, disattivare tutta la famiglia di injection SQL no. Il criterio è la coppia regola più percorso o parametro, con la ragione annotata accanto.

| Feature | Impostazione | Rischio se attivata troppo presto |
| --- | --- | --- |
| WAF CRS | `USE_MODSECURITY_CRS` | blocchi su payload legittimi |
| Bad behavior | `USE_BAD_BEHAVIOR` | ban su client che generano 4xx per errori propri |
| Rate limiting | `USE_LIMIT_REQ` | 429 su utenti dietro NAT condiviso |
| Antibot | `USE_ANTIBOT` | challenge su API senza cookie |
| Blacklist | `USE_BLACKLIST` | blocco di IP condivisi (cloud, proxy, mobile) |
| DNSBL | `USE_DNSBL` | latenza di risoluzione e falsi positivi |

## Ban, challenge e limiti

`USE_BAD_BEHAVIOR` trasforma una serie di risposte con codice problematico (`BAD_BEHAVIOR_STATUS_CODES`, per esempio 400 e 404) in un ban temporaneo dell'IP. `USE_LIMIT_REQ` applica limiti per URL: `LIMIT_REQ_URL` seleziona il path e `LIMIT_REQ_RATE` la velocità consentita. `USE_ANTIBOT` con valore `cookie` impone una challenge basata su cookie, con `ANTIBOT_URI` come pagina di sfida che deve essere un URI libero sul sito.

Queste tre feature cooperano: un client che supera i limiti riceve 429, quei 429 contribuiscono al bad behavior e, dopo la soglia, l'IP finisce in ban e riceve 403 su tutto il sito. Se il ban arriva al primo POST di un browser, il colpevole è quasi sempre il rate limit troppo stretto, non l'attaccante.

```dotenv
USE_LIMIT_REQ=yes
LIMIT_REQ_URL=/login
LIMIT_REQ_RATE=3r/s
USE_BAD_BEHAVIOR=yes
BAD_BEHAVIOR_STATUS_CODES=400 401 403 404 405 429
USE_ANTIBOT=cookie
ANTIBOT_URI=/challenge
```

`LIMIT_REQ_URL` va scritto nel formato del modulo di limitazione richieste di NGINX e le regole sono valutate in ordine: le regole più specifiche devono precedere quelle generiche, altrimenti il primo match chiude la partita. Con `USE_ANTIBOT` le API che non gestiscono cookie vanno escluse per server, altrimenti ogni chiamata da client HTTP senza cookie finisce sulla pagina di sfida.

## Header, redirect, TLS e osservabilità

Le impostazioni di superficie sono le meno discusse e le più utili: `USE_HEADERS` aggiunge gli header di sicurezza, `USE_REDIRECT` ha `REDIRECT_TO` per indirizzare su HTTPS o su un nuovo dominio, `USE_CLIENT_CACHE` gestisce il `Cache-Control` e `SERVE_FILES` decide se BunkerWeb serve direttamente i file statici. `SERVE_FILES=no` è la scelta giusta in proxy: meno superficie, meno directory esposte.

Per il TLS, `AUTO_LETS_ENCRYPT=yes` delega l'emissione, `USE_SELF_SIGNED_CERT=yes` genera un certificato locale per i test, `SSL_PROTOCOLS` restringe le versioni e `USE_CUSTOM_SSL=yes` permette di caricare una coppia propria. `BANS_TLS_DROP_REASONS` è una delle impostazioni più recenti e più utili: con un elenco di motivi (`crowdsec`, `bad_behavior`, `manual`, `ui`, `api`) BunkerWeb chiude l'handshake TLS per gli IP bannati per quei motivi, risparmiando CPU rispetto a servire la pagina 403 a client che continuano a riconnettersi. Conta il motivo del ban che si applica: un IP bannato sia manualmente sia da CrowdSec riceve la pagina 403 se solo `crowdsec` è nell'elenco.

I log sono la sorgente delle decisioni: ogni blocco porta l'id della regola, ogni ban porta il motivo e ogni challenge lascia traccia del passaggio. `USE_CROWDSEC` aggiunge ban comportamentali tramite il plugin dedicato, che raccoglie gli eventi di NGINX e li invia a un motore locale o remoto; il motore decide il ban e il plugin blocca le richieste successive dell'IP. In un cluster le sessioni antibot e i contatori vanno condivisi, per esempio via Redis, altrimenti la challenge fallisce a ogni cambio di istanza.

## Errori comuni

- **Partire in `block` su un'applicazione esistente**: si scoprono i falsi positivi dagli utenti arrabbiati anziché dai log.
- **Disattivare intere famiglie di regole**: si crea un WAF che non protegge più e una documentazione che dice il contrario.
- **Rate limit largo e bad behavior attivo**: il secondo punisce il client che il primo non ha fermato abbastanza.
- **Antibot globale su API**: ogni chiamata senza cookie viene deviata sulla pagina di sfida.
- **Cluster senza Redis**: challenge e contatori non sono condivisi e il comportamento cambia da richiesta a richiesta.

## In sintesi

BunkerWeb combina un WAF ModSecurity con CRS, un sistema di ban e challenge e un insieme di impostazioni di superficie. La modalità `SECURITY_MODE` è la leva principale per introdurre il filtro senza interrompere il servizio, e le eccezioni vanno limitate alla regola più al percorso. Limiti, bad behavior e antibot formano una catena in cui un parametro troppo stretto produce blocchi a cascata. I log sono la base per ogni decisione successiva.

## Fonti

- [BunkerWeb - Elenco impostazioni](https://docs.bunkerweb.io/1.6.18/settings/)
- [BunkerWeb - Feature e sicurezza](https://docs.bunkerweb.io/1.6.18/features/)
- [BunkerWeb - Uso avanzato](https://docs.bunkerweb.io/1.6.18/advanced/)
- [BunkerWeb - Integrazione Docker](https://docs.bunkerweb.io/1.6.18/integrations/)
