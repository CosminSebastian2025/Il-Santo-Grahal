Il CRS si usa male in due modi opposti: chi lo attiva al livello 4 e lo spegne dopo un'ora, e chi esclude regole finché il WAF non è più in grado di dire cosa protegge. In mezzo c'è un metodo: leggere il punteggio di anomalia come un debito da saldare, scrivere esclusioni con lo scope minimo e tracciare ogni eccezione con un test di regressione. Questa lezione costruisce quel metodo con le direttive del CRS 4.x.

## Obiettivi

- Calcolare a mano il punteggio di una transazione e spiegare perché con soglia 5 due anomalie di `notice` non bloccano.
- Scrivere esclusioni con `ctl:ruleRemoveTargetById`, `ctl:ruleRemoveById` e scope su URI, utente e IP.
- Usare i plugin e le regole di correlazione 980 per distinguere un attacco da un utente curioso.
- Verificare un'esclusione con `CRS` in modalità di test senza toccare gli altri endpoint.

## Il punteggio, passo per passo

Il setup assegna i punteggi delle severità:

| Classe punteggio | Valore default | Introdotta da |
| --- | --- | --- |
| `tx.critical_anomaly_score` | 5 | payload certo, es. libinjection su SQL |
| `tx.error_anomaly_score` | 4 | anomalia forte ma non conclusiva |
| `tx.warning_anomaly_score` | 3 | sospetto su protocollo o encoding |
| `tx.notice_anomaly_score` | 2 | segnale debole, utile in aggregato |

Con soglia 5, una regola `critical` da sola blocca; due `notice` no; un `warning` più un `notice` sì. Questo perché il modello non è "una regola, un blocco": è un punteggio che deve superare la soglia. Il log di ogni transazione riporta `inbound_anomaly_score_pl1` (e pl2, pl3, pl4 quando il livello eseguito è più alto) e la lista dei messaggi con `ruleId` e severità.

Leggere quella riga è il primo lavoro di tuning: se un falso positivo arriva da una regola `notice` su un campo che in quel contesto è innocuo, la soluzione non è alzare la soglia ma escludere il campo da quella regola.

## Esclusioni con lo scope minimo

Le direttive `ctl` inserite in regole proprie in fase 1 agiscono sulla transazione corrente, su tre livelli di precisione:

| Direttiva | Effetto | Rischio se usata male |
| --- | --- | --- |
| `ctl:ruleRemoveById=942100` | disattiva la regola per la transazione | copertura persa ovunque nel contesto |
| `ctl:ruleRemoveTargetById=942100;ARGS:notes` | esclude solo la variabile | residuo: la regola resta su altri campi |
| `ctl:ruleRemoveTargetByTag=attack-sqli;ARGS:notes` | esclude una famiglia | adatto a campi nota come "comment" |
| `ctl:requestBodyProcessor=JSON` | cambia il parser del corpo | body interpretato male e regole cieche |

```apacheconf
# Esclusione per una rotta di amministrazione in cui il markdown è atteso
SecRule REQUEST_URI "@beginsWith /admin/post/edit" \
    "id:1000101,phase:1,pass,nolog,\
    chain"
SecRule REQUEST_METHOD "@streq POST" "t:none,\
    ctl:ruleRemoveTargetById=941100;ARGS:contenuto_md,\
    ctl:ruleRemoveTargetById=941110;ARGS:contenuto_md,\
    ctl:ruleRemoveTargetById=942100;ARGS:contenuto_md"

# Esclusione temporanea per un IP, con data di revisione nel messaggio
SecRule REMOTE_ADDR "@ipMatch 203.0.113.10" \
    "id:1000102,phase:1,pass,\
    msg:'TEMP fino 2027-03-01: partner che invia XML non conforme',\
    ctl:ruleRemoveById=920320"
```

La differenza tra `ruleRemoveTargetById` e `ruleRemoveById` è tutta nella copertura che sopravvive: la prima lascia attive le altre variabili della stessa regola, la seconda elimina il rilevamento. In una revisione di sicurezza la seconda deve comparire poche volte e sempre con un id di regola locale e un commento con la scadenza.

## Approcci di blocco e correlazione

Il blocco dipende da come si combinano soglia, paranoia e livelli eseguiti. In pratica un payload che somma anomalie in fasi diverse viene fermato solo quando la valutazione finale legge `tx.inbound_anomaly_score_pl1` (più eventuali livelli superiori): una richiesta può quindi essere letta per intero prima di essere respinta.

| Configurazione | Direttiva | Quando usarla |
| --- | --- | --- |
| Anomaly scoring | `tx.inbound_anomaly_score_threshold` | default, tuning per regola |
| Blocking level | `tx.blocking_paranoia_level` | si vuole bloccare solo fino a un livello |
| Detection level | `tx.detection_paranoia_level` | si vogliono vedere anche i livelli superiori |
| Correlazione | regola 980100 | registra una transazione anomala |

Le regole `RESPONSE-980-CORRELATION.conf` scattano a fine transazione quando il punteggio supera la soglia e generano un evento con il punteggio, il dominio e l'URL. Sono il punto di aggancio per alert che non siano spam. Ogni release cambia nomi di variabili e azioni in questi file: leggi la versione installata, non il manuale di due major release prima.

## Verifica con test di regressione

Le esclusioni sono codice, e come il codice vanno testate. Un test minimo registra per ogni falso positivo corretto una coppia di richieste: la variante legittima che deve passare con 200 e la variante malevola che deve essere bloccata con 403. Il CRS mantiene una suite di regressione nel repository con richiesta e stato atteso: quel formato è un buon modello anche per i test locali.

```bash
# Caso di accettazione espresso come due curl e un esito atteso
assert_status() { test "$1" = "$2" && echo "ok $3" || echo "FAIL $3 ($1)"; }
assert_status "$(curl -s -o /dev/null -w '%{http_code}' \
  --data-urlencode 'contenuto_md=# titolo <b>grassetto</b>' \
  -X POST http://localhost:8080/admin/post/edit)" 200 "markdown legittimo"
assert_status "$(curl -s -o /dev/null -w '%{http_code}' \
  --data-urlencode 'notes=<iframe src=javascript:alert(1)>' \
  -X POST http://localhost:8080/commenti)" 403 "iframe in campo semplice"
```

Quando un aggiornamento del CRS cambia gli id o aggiunge regole, la suite si allarga e mostra subito se un'eccezione ha smesso di servire. Se un test legittimo fallisce dopo l'update, il primo sospetto è un nuovo id che va aggiunto all'esclusione; se fallisce un test malevolo, l'esclusione era troppo larga. In entrambi i casi il test ha fatto il suo lavoro prima dell'utente.

## Errori comuni

- **Alzare `inbound_anomaly_score_threshold` da 5 a 20 per ridurre i falsi positivi**: si perde la capacità di rilevare attacchi composti che restano sotto, ed è un tiro al buio rispetto all'esclusione mirata.
- **Escludere per tag su un URI intero: `ctl:ruleRemoveTargetByTag` è potente, ma su una rotta di upload esclude anche i payload che lì contano.
- **Tuning fatto a mano senza registrare l'esclusione**: la prossima persona che arriva non sa perché un campo è escluso né se è ancora necessario.
- **Dimenticare la scadenza**: le esclusioni temporanee diventano permanenti; aggiungi la data nel `msg` e cerca mensilmente i `TEMP`.
- **Provare in produzione con `paranoia_level=4`**: il rumore sui log cresce di un ordine di grandezza e la perdita di segnale è irreversibile senza un audit separato.

## In sintesi

Il punteggio di anomalia rende il CRS una decisione aggregata, non una somma di blocchi individuali. Le esclusioni si scrivono con `ctl` sulla variabile (o sul tag), non sulla regola globale, e ogni eccezione ha un id, una motivazione e una scadenza. La correlazione 980 trasforma il rumore in eventi e i test di regressione chiudono il ciclo tra update del CRS e comportamento atteso.

## Fonti

- [CRS - How CRS works](https://coreruleset.org/docs/2-how-crs-works/)
- [CRS - Paranoia levels](https://coreruleset.org/docs/concepts/paranoia_levels/)
- [CRS - Anomaly scoring](https://coreruleset.org/docs/concepts/anomaly_scoring/)
- [Coreruleset - GitHub](https://github.com/coreruleset/coreruleset)
