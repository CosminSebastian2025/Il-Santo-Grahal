In questo laboratorio monti ModSecurity v3 con il connector Nginx davanti a una piccola API, la attacchi con payload codificati e misuri l'effetto di ogni direttiva. Il risultato non è un WAF da copiare in produzione, ma un ambiente riproducibile in cui capisci perché una richiesta viene bloccata, perché una passa e quanto costa ogni controllo attivato.

## Obiettivi

- Compilare e caricare `ngx_http_modsecurity_module` in un Nginx in container.
- Scrivere un file di configurazione minimo e una regola locale con id nella fascia 1.000.000.
- Distinguere `DetectionOnly` da `On` usando l'audit log come prova.
- Riprodurre SQL injection, XSS e path traversal con `curl` e leggere il codice di risposta.
- Misurare il costo del parsing del corpo su richieste grandi.

## Prerequisiti e struttura

Servono Docker con l'immagine ufficiale `owasp/modsecurity-crs` (che combina Nginx, ModSecurity v3 e le regole CRS) oppure un Nginx compilato da sorgenti con il modulo. Per questo laboratorio usiamo l'immagine pronta, così la compilazione non diventa il tema. La versione del motore al momento della scrittura è la 3.0.17, quella delle regole CRS la 4.31.0.

```bash
mkdir -p lab-modsec/conf lab-modsec/logs && cd lab-modsec
cat > docker-compose.yml <<'YAML'
services:
  waf:
    image: owasp/modsecurity-crs:4.30-nginx
    environment:
      BACKEND: http://app:8080/
      MODSEC_RULE_ENGINE: DetectionOnly
      PARANOIA: "1"
      BLOCKING_PARANOIA: "1"
      MODSEC_AUDIT_ENGINE: RelevantOnly
      MODSEC_AUDIT_LOG_FORMAT: json
    volumes:
      - ./conf/local.conf:/etc/modsecurity.d/local.conf:ro
      - ./logs:/var/log/modsec
    ports: ["8080:8080"]
  app:
    image: kennethreitz/httpbin
    expose: ["8080"]
YAML
```

I nomi esatti delle variabili e il percorso in cui vengono caricati i file `.conf` dipendono dal tag dell'immagine: prima di continuare controlla il `README` della release scelta e adatta i nomi. La cosa che conta è la sequenza: `BACKEND` punta al server interno, `MODSEC_RULE_ENGINE` decide il comportamento e l'audit log finisce nello stesso volume `/var/log/modsec` che leggiamo dal host.

## Regola locale e fase di test

Una regola globale su tutti gli endpoint serve a verificare che il file sia caricato, senza dipendere dalle euristiche CRS.

```apacheconf
# conf/local.conf — id 1.000.000+ riservati all'utente
SecRuleEngine DetectionOnly
SecRequestBodyAccess On
SecRequestBodyLimit 1048576
SecResponseBodyAccess Off

SecDefaultAction "phase:1,log,auditlog,pass"
SecDefaultAction "phase:2,log,auditlog,pass"

# Blocco esplicito per lo user-agent "lab-bot"
SecMarker BEGIN-LAB
SecRule REQUEST_HEADERS:User-Agent "@contains lab-bot" \
    "id:1000001,phase:1,deny,status:403,log,\
    msg:'lab-bot bloccato',tag:'lab',severity:'CRITICAL'"

# Corpo JSON: contiene "drop table" in qualunque posizione
SecRule REQUEST_BODY "@rx (?i)drop\s+table" \
    "id:1000002,phase:2,deny,status:403,log,\
    msg:'drop table nel corpo'"

# Fuori dalla fase contestata, la richiesta deve proseguire
SecMarker END-LAB
```

Avvia lo stack e verifica che il motore esponga il modulo e le regole attive:

```bash
docker compose up -d
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/get
curl -s -H 'User-Agent: lab-bot' -o /dev/null -w '%{http_code}\n' http://localhost:8080/get
tail -n 1 logs/audit.json | head -c 600
```

Con `DetectionOnly` la seconda richiesta restituisce 200 anche se la regola `1000001` scatta: l'audit log riporta `"ruleId":"1000001"` e `"interrupted":false`. Questa è la prova che il motore capisce la regola. Il blocco arriva solo quando sostituisci `DetectionOnly` con `On` e ricarichi il container.

```bash
sed -i 's/SecRuleEngine DetectionOnly/SecRuleEngine On/' conf/local.conf
docker compose restart waf
curl -s -H 'User-Agent: lab-bot' -o /dev/null -w '%{http_code}\n' http://localhost:8080/get   # 403
```

## Attacchi codificati e lettura del risultato

| Payload | Dove | Codifica | Regola attesa |
| --- | --- | --- | --- |
| `1' OR '1'='1` | query string | nessuna | 942100 o 942xxx |
| `1%27%20OR%20%271%27%3D%271` | query string | percent | stessa regola dopo `t:urlDecodeUni` |
| `<script>alert(1)</script>` | parametro GET | HTML | 941100 |
| `..%2f..%2fetc%2fpasswd` | URI | percent | 930100/930110 |
| `{"q":"DROP TABLE users"}` | corpo POST | JSON | 1000002 e 942170 |

```bash
# SQL injection nel parametro
curl -s "http://localhost:8080/get?id=1%27%20OR%20%271%27%3D%271" -o /dev/null -w '%{http_code}\n'

# XSS riflesso
curl -s --get --data-urlencode 'name=<script>alert(1)</script>' \
    -o /dev/null -w '%{http_code}\n' http://localhost:8080/get

# Path traversal nell'URI
curl -s --path-as-is "http://localhost:8080/get/../../etc/passwd" -w '%{http_code}\n'

# Corpo JSON con payload
curl -s -H 'Content-Type: application/json' -d '{"q":"DROP TABLE users"}' \
    -o /dev/null -w '%{http_code}\n' http://localhost:8080/post
```

Con `DetectionOnly` tutte le richieste arrivano al backend: contare i 200 non dice nulla, bisogna leggere l'audit log. Cerca i blocchi con `jq` e raggruppa per id di regola: la lista ordinata per frequenza è il punto di partenza del tuning, e le regole che scattano su credenziali e descrizioni testuali sono le prime da escludere.

```bash
jq -r '.transaction.messages[]? | [.ruleId, .data] | @tsv' logs/audit.json | sort | uniq -c
# oppure, se l'audit è su una riga sola per transazione
jq -r '[.transaction.request.uri, .transaction.messages[0].ruleId] | @tsv' logs/audit.json
```

La verifica deve essere doppia: una richiesta malevola bloccata con 403 e una richiesta legittima che contiene la parola "select" in un campo di ricerca deve passare. Senza la seconda, il laboratorio non ha provato nulla sul traffico reale.

## Costo dei controlli

Il parsing del corpo pesa. Con `SecRequestBodyAccess On` il WAF bufferizza fino a `SecRequestBodyLimit` byte, quindi un upload da 10 MiB consuma memoria per ogni richiesta concorrente. Un test pragmatico confronta tre configurazioni con `hey` o `wrk` su 500 richieste: senza WAF, con WAF in `DetectionOnly` e con `SecResponseBodyAccess On`. Annota latenza p95 e CPU del container; il corpo di risposta abilitato è di solito il salto più grande.

```bash
hey -n 500 -c 20 "http://localhost:8080/get?id=42"
docker stats --no-stream waf
```

Il laboratorio è superato con quattro dati misurati: richieste bloccate per regola, due falsi positivi corretti con `SecRuleUpdateTargetById`, p95 prima e dopo l'attivazione di `On`, una regola locale vista scattare nell'audit log.

## Errori comuni

- **Fidarsi del codice HTTP in `DetectionOnly`**: il motore logga e lascia passare; la verifica va fatta sull'audit log, non sul 200.
- **Non montare il volume dei log**: l'audit log sparisce con il container e il tuning resta senza dati.
- **Usare payload già `urlencode` due volte**: il doppio encoding cambia il test e può far passare una richiesta che in produzione sarebbe bloccata.
- **Puntare `BACKEND` alla porta interna sbagliata**: il 502 viene attribuito al WAF e fa perdere mezza giornata.
- **Attivare `SecResponseBodyAccess On` su tutto**: il costo su API JSON grandi è reale; limitarlo alle rotte dove serve, come le pagine HTML.
- **Lasciare il paranoia level a 1 e credere di essere coperti**: il livello 1 è progettato per non rompere; l'aumento va fatto con i dati del laboratorio, non a caso.

## In sintesi

Il laboratorio mostra il percorso completo di un WAF: connettorizzazione del motore, regola locale con id riservato, verifica in `DetectionOnly`, attivazione in `On`, attacchi codificati e lettura dell'audit log in JSON. I numeri che porti a casa — regole più attive, falsi positivi corretti, p95 prima e dopo — sono la stessa base di dati che serve in produzione.

## Fonti

- [ModSecurity-nginx connector](https://github.com/owasp-modsecurity/ModSecurity-nginx)
- [ModSecurity v3 Wiki](https://github.com/owasp-modsecurity/ModSecurity/wiki)
- [OWASP ModSecurity Core Rule Set](https://owasp.org/www-project-modsecurity-core-rule-set/)
- [ModSecurity - GitHub](https://github.com/owasp-modsecurity/ModSecurity)
