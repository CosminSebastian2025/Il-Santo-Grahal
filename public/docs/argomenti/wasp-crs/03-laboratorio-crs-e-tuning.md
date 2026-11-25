In questo laboratorio installi il CRS 4.x su Nginx con ModSecurity, misuri il punteggio di anomalia di tre richieste reali, correggi due falsi positivi con esclusioni mirate e porti il livello di paranoia da 1 a 2 verificando quanto traffico legittimo cambia esito. 

## Obiettivi

- Preparare un setup CRS riproducibile con setup separato dalle regole.
- Misurare `inbound_anomaly_score_pl1` per tre payload e spiegare quali regole contribuiscono.
- Correggere due falsi positivi con `ctl:ruleRemoveTargetById` in un file di esclusione dedicato.
- Confrontare l'esito con paranoia level 1 e 2 su una lista di richieste legittime.
- Chiudere con test di accettazione che girano nella pipeline.

## Setup riproducibile

Usiamo l'immagine `owasp/modsecurity-crs` con entrypoint Nginx e una configurazione montata in sola lettura. Il file di setup contiene le soglie e il paranoia level; il file di esclusione contiene solo le eccezioni che noi scriviamo. Nessun altro file viene toccato.

```bash
mkdir -p crs-lab/conf crs-lab/logs crs-lab/tests && cd crs-lab

cat > conf/zz-CUSTOM-setup.conf <<'CONF'
# Impostazioni nostre, caricate dopo crs-setup.conf
SecAction "id:1000200,phase:1,nolog,pass,t:none,\
    setvar:tx.inbound_anomaly_score_threshold=5,\
    setvar:tx.outbound_anomaly_score_threshold=4"

SecAction "id:1000201,phase:1,nolog,pass,t:none,\
    setvar:tx.paranoia_level=1,\
    setvar:tx.executing_paranoia_level=1"

SecRuleEngine On
SecRequestBodyAccess On
SecAuditEngine RelevantOnly
SecAuditLogParts ABIJDZ
SecAuditLogFormat json
CONF

cat > conf/zz-CUSTOM-exclusions.conf <<'CONF'
# Eccezioni locali: id nella fascia 1.000.000
# Le regole qui sotto non escludono ancora nulla: servono al punto 3
SecMarker BEGIN-CUSTOM-EXCLUSIONS
SecMarker END-CUSTOM-EXCLUSIONS
CONF
```

Il montaggio dentro il container dipende dal tag scelto: nell'immagine `owasp/modsecurity-crs` i file `.conf` in `/etc/modsecurity.d` vengono inclusi in ordine alfabetico, per questo i nomi iniziano con `zz-` dopo i file del pacchetto. 

## Misurare il punteggio

Tre richieste servono come misura di riferimento: SQL injection nell'URI, XSS riflesso, e un falso positivo noto su un campo di testo che contiene markup HTML legittimo.

```bash
# 1) SQL injection: deve superare la soglia da sola
curl -s "http://localhost:8080/get?id=1%27%20UNION%20SELECT%20password%20FROM%20utenti" \
     -o /dev/null -w 'sqli %{http_code}\n'

# 2) XSS riflesso con tag img
curl -s --get --data-urlencode 'q=<img src=x onerror=alert(1)>' \
     -o /dev/null -w 'xss %{http_code}\n' http://localhost:8080/get

# 3) falso positivo: editor markdown che salva un post con tag nel contenuto
curl -s -H 'Content-Type: application/x-www-form-urlencoded' \
     --data-urlencode 'contenuto=<p>Testo con <b>grassetto</b> e <code>codice</code></p>' \
     -o /dev/null -w 'markdown %{http_code}\n' http://localhost:8080/post
```

Con `SecRuleEngine DetectionOnly` (per la prima passata) le tre richieste rispondono 200 e l'audit log contiene i punteggi. Estrai la riga utile con `jq`: `inbound_anomaly_score_pl1` dice quanto, `messages` dice perché.

```bash
jq -r '.transaction | [.request.uri,
       .inbound_anomaly_score_pl1,
       ([.messages[]? | select(.details.score > 0) |
         "\(.details.ruleId)(\(.details.severity))"] | join(","))] | @tsv' \
   logs/audit.json
```

Un risultato tipico: la SQL injection arriva a 10 o più con una regola `critical` da 942xxx; l'XSS arriva a 5 con una regola 941xxx `critical`; il markdown legittimo somma 8-10 da regole XSS con severità `warning` e `critical` su `contenuto`. Il terzo caso è il falso positivo da correggere: il traffico reale salva HTML e il campo è sanitizzato a valle.

## Correggere il falso positivo

Leggi prima gli id esatti che hanno contribuito al punteggio sul campo `contenuto` e poi escludi solo quelli, solo su quella variabile, solo sulla rotta del salvataggio articolo.

```apacheconf
# zz-CUSTOM-exclusions.conf
SecMarker BEGIN-CUSTOM-EXCLUSIONS

# 2026-11-20 — editor markdown (sanitizzato con DOMPurify a valle)
# rotta: POST /post quando il form proviene dall'editor
SecRule REQUEST_URI "@streq /post" \
    "id:1000301,phase:1,pass,nolog,\
    chain"
SecRule ARGS:contenuto "@rx <" "t:none,\
    ctl:ruleRemoveTargetById=941100;ARGS:contenuto,\
    ctl:ruleRemoveTargetById=941110;ARGS:contenuto,\
    ctl:ruleRemoveTargetById=941120;ARGS:contenuto,\
    ctl:ruleRemoveTargetById=941160;ARGS:contenuto"

SecMarker END-CUSTOM-EXCLUSIONS
```

Ricarica il WAF e verifica la doppia condizione: il markdown salvato deve rispondere 200 e un XSS vero nello stesso campo con un evento JavaScript deve restare bloccato (403), perché le regole su `onerror` restano attive. Un secondo caso tipico è il campo `descrizione` con URL che contengono `//`, segnalato come RCE remota: lì l'esclusione è su `930120` e `931130`.

| Falso positivo | Regole da escludere | Criterio per accettare l'esclusione |
| --- | --- | --- |
| markdown con tag HTML | 941100, 941110, 941120 | l'HTML è sanitizzato lato server |
| URL nel campo descrizione | 930120, 931130 | il campo non viene usato per include |
| password con caratteri speciali | 942100 su `ARGS:password` | il login ha già rate limiting |

## Alzare il paranoia level con dati

Ora ripeti la batteria con `executing_paranoia_level=2` e una lista di richieste legittime prese dal traffico reale: ricerche, upload, form di contatto.

```bash
# Lista di 50 URL legittimi, una per riga, nel file tests/legittimi.txt
while read -r u; do
  curl -s -o /dev/null -w '%{http_code} %{url_effective}\n' "$u"
done < tests/legittimi.txt | sort | uniq -c | sort -rn | head

# Conteggio dei blocchi per regola, dopo il cambio di livello
jq -r '.transaction.messages[]? | select(.is_blocking == true) | .details.ruleId' \
   logs/audit.json | sort | uniq -c | sort -rn | head
```

Se il livello 2 aggiunge blocchi a rotte legittime, la scelta è tra una nuova esclusione mirata o il ritorno al livello 1 con `executing_paranoia_level`. La regola pratica è semplice: si alza solo se la percentuale di blocchi legittimi resta sotto una soglia concordata, tipicamente sotto lo 0,1% delle richieste, e ogni nuovo blocco ha un'esclusione motivata o un bug da correggere.

Il laboratorio è superato quando hai cinque artefatti: il file `zz-CUSTOM-setup.conf`, il file `zz-CUSTOM-exclusions.conf` con due esclusioni datate, la tabella dei punteggi misurati, il confronto PL1/PL2 sulle richieste legittime e uno script di test che restituisce exit code diverso da zero su una regressione.

## Errori comuni

- **Caricare l'esclusione prima del setup**: le direttive `ctl` funzionano solo in fase 1 e solo se il file viene letto nell'ordine giusto; il prefisso `zz-` serve a questo.
- **Escludere la regola 941100 interamente sull'endpoint**: invece della variabile, si perde la copertura di XSS anche in altri campi del form.
- **Confrontare i paranoia level contando solo i 403**: con punteggi combinati il livello 2 può far scattare blocchi dove prima c'erano warning; servono i punteggi, non i codici.
- **Lasciare il log in formato nativo**: aggregare per regola e per rotta senza JSON richiede strumenti ad hoc.
- **Dimenticare che il CRS non sanifica**: un'esclusione accettata perché "il campo è pulito a valle" richiede una sanitizzazione vera e testata.

## In sintesi

Il laboratorio trasforma il CRS da scatola nera in un sistema misurato: setup separato, esclusioni con id locali e data, punteggi estratti dall'audit log e una prova comparata del paranoia level sulle richieste legittime. Le esclusioni sono artefatti versionati e testati, non modifiche a mano da ricordare.

## Fonti

- [CRS - Getting started](https://coreruleset.org/docs/1-getting-started/)
- [CRS - Advanced topics](https://coreruleset.org/docs/5-advanced-topics/)
- [Coreruleset releases](https://github.com/coreruleset/coreruleset/releases)
- [OWASP ModSecurity Core Rule Set](https://owasp.org/www-project-modsecurity-core-rule-set/)
