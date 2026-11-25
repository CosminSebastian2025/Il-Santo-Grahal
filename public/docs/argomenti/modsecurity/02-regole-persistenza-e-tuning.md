Una regola che scatta non è ancora un WAF utile: lo diventa quando l'id è stabile, lo stato è condiviso tra più istanze e i falsi positivi sono misurati invece che scoperti dall'assistenza clienti. In questa lezione scrivi regole locali con contatori e correlazioni, usi la persistenza per sopravvivere al riavvio, gestisci le esclusioni con `SecRuleUpdateTargetById` e controlli il tuning con `SecMarker` e audit log.

## Obiettivi

- Scrivere regole con `TX`, `capture`, `setvar` e contatori `ip.` per stimare il traffico abusivo.
- Usare la persistenza (`SecCollectionTimeout`, `SecCollectionPersistence`) e conoscere i backend disponibili.
- Applicare esclusioni chirurgiche con `SecRuleUpdateTargetById` e `SecRuleUpdateActionById`.
- Interpretare l'audit log con i modelli `RelevantOnly` e `Full`.
- Strutturare un percorso di tuning da `DetectionOnly` con soglie misurabili.

## Stato condiviso e correlazione

| Variabile | Ambito | Durata | Uso tipico |
| --- | --- | --- | --- |
| `TX` | transazione | una richiesta | accumulare punteggio, memorizzare un flag |
| `ip.<nome>` | client IP | timeout collezione | contare violazioni per IP |
| `global` | istanza | timeout collezione | contatori globali |
| `user.<nome>` | identità autenticata | timeout collezione | quote per utente |
| `session.<nome>` | cookie di sessione | timeout collezione | comportamento per sessione |

Testare il punteggio nella fase 5 e non nella 2 è una tecnica classica: tutte le regole precedenti hanno già incrementato `tx.anomaly_score`, quindi un'unica regola decide il blocco. Nella configurazione standard di ModSecurity CRS questo è il compito della regola `949110` con soglia 5 di richiesta in ingresso e di richiesta in uscita, ma la stessa struttura si scrive a mano in cinque righe.

```apacheconf
SecAction "id:900100,phase:1,nolog,pass,\
    setvar:tx.score=0"

# Regola locale: tentativo di path traversal incrementa il punteggio
SecRule REQUEST_URI "@rx \.(\.%2[fF]|/){1,}" \
    "id:900110,phase:2,pass,log,tag:'local',\
    setvar:'tx.score=+5',\
    setvar:'ip.violazioni=+1',\
    expirevar:'ip.violazioni=3600'"

# Pagina di errore personalizzata invece del 403 nudo
SecRule TX:SCORE "@ge 10" \
    "id:900190,phase:5,deny,status:403,log,\
    msg:'Punteggio anomalia %{TX.SCORE}',\
    redirect:https://example.com/bloccato.html"

# Blocco preventivo per chi supera 100 violazioni in un'ora
SecRule IP:VIOLAZIONI "@gt 100" \
    "id:900191,phase:1,deny,status:429,log,msg:'Rate limit WAF'"
```

`expirevar` imposta il TTL della variabile: senza di esso il contatore cresce all'infinito e, con la persistenza su disco, resta alto anche dopo un deploy. Il nome dopo `ip.` diventa maiuscolo (`IP:VIOLAZIONI`) perché ModSecurity risolve le collezioni case-insensitive.

## Persistenza tra processi e riavvii

Le collezioni vivono in memoria nel worker che le crea. Con Nginx a più worker, `ip.` non è un contatore unico ma N contatori indipendenti: un client può restare sotto soglia se le richieste si distribuiscono su worker diversi. La soluzione è spostare le collezioni in un backend condiviso.

| Direttiva | Effetto | Valore tipico |
| --- | --- | --- |
| `SecCollectionTimeout` | TTL predefinito delle collezioni | `600` |
| `SecCollectionPersistence` | tipo di storage | `disk`, `memory`, `redis`, `ldap` |
| `SecCollectionPersistenceLocal` | aggiornamento periodico | `On` |

Con `SecCollectionPersistence disk` le collezioni sopravvivono al riavvio di Nginx ma restano locali alla macchina: due istanze dietro un bilanciatore non si parlano. Per un contatore globale serve un backend esterno o, più spesso in produzione, un WAF tier davanti al bilanciatore che centralizza il traffico prima di distribuirlo.

```apacheconf
SecCollectionTimeout 600
SecCollectionPersistence disk
SecCollectionPersistenceLocal On
```

La scelta si misura con un test semplice: mandare 60 richieste ostili in parallelo da un solo IP e contare quante arrivano al backend.

## Esclusioni senza indebolire il resto

Disattivare una regola con `SecRuleRemoveById` è la soluzione più visibile e la più rischiosa: toglie la protezione per tutti, su tutte le rotte. È preferibile limitare la variabile che la regola guarda, solo su una rotta specifica e solo per una regola.

```apacheconf
# Il campo "descrizione" contiene markdown e HTML: escluso solo per questa regola
SecRuleUpdateTargetById 942100 "!ARGS:descrizione"

# Un'applicazione legacy rifiuta certi caratteri in un header: si esenta quella sola variabile
SecRuleUpdateTargetById 921180 "!REQUEST_HEADERS:cookie"

# Modifica un'azione senza riscrivere la regola
SecRuleUpdateActionById 920350 "block"
```

`SecMarker` e `SecDefaultAction` strutturano la configurazione: con un marchio `BEGIN-ESCLUSIONI-ADMIN` e uno `END` lo strumento di tuning può riconoscere il blocco che sta modificando e non perdere le esclusioni al prossimo aggiornamento delle regole. Il messaggio di commit deve citare id, rotta, richiesta di esempio e data di revisione: senza queste informazioni un'esclusione diventa permanente e invisibile.

## Audit log e tuning misurabile

| Direttiva | Valori | Uso |
| --- | --- | --- |
| `SecAuditEngine` | `On`, `Off`, `RelevantOnly` | `RelevantOnly` registra solo gli eventi con azione |
| `SecAuditLogParts` | lettere A–Z | `ABIJDZ` per audit completo, `AHZ` per tracciare |
| `SecAuditLogFormat` | `native`, `json` | `json` per ingestione nei sistemi di log |
| `SecAuditLogType` | `Serial`, `Concurrent` | `Concurrent` con molti worker |

Il percorso di tuning in quattro tappe evita il salto nel vuoto:

1. `DetectionOnly` per almeno una settimana, con `SecAuditLogFormat json` raccolto in un indice consultabile.
2. Misurare per regola il numero di match su traffico legittimo, ordinando per rotta: le prime tre regole coprono quasi sempre il 90% dei falsi positivi.
3. Escludere con `SecRuleUpdateTargetById` sulle sole rotte coinvolte e ripetere la misura per tre giorni.
4. Attivare `SecRuleEngine On` con un piano di rollback: un file di esclusione singolo che si può rimuovere senza riavviare l'applicazione.

Una test suite di regressione chiude il ciclo: un elenco di coppie richiesta-attesa (200 o 403) eseguite in pipeline con `curl` contro un'istanza di staging. Aggiungi un caso per ogni falso positivo corretto, così il prossimo aggiornamento delle regole non lo reintroduce.

## Errori comuni

- **Contare con `ip.` in ambienti multi-worker o multi-replica** senza persistenza condivisa: il rate limiting è inefficace proprio sugli attacchi distribuiti nel tempo.
- **Dimenticare `expirevar`** su un contatore: la variabile non scade e il primo picco di traffico genera blocchi a distanza di giorni.
- **Usare `SecRuleRemoveById` globale** per risolvere un falso positivo su una sola rotta: si perde copertura ovunque.
- **Attivare `SecRuleEngine On` senza audit log in JSON**: senza dati per regola non si può ridurre la soglia senza bruciare il traffico legittimo.
- **Bloccare in fase 2 con `deny`** quando serve un punteggio: il blocco immediato preempta le regole successive e rende impossibile distinguere un singolo match da un attacco composto.

## In sintesi

Le regole diventano un sistema quando lo stato è esplicito: `TX` per la transazione, collezioni con TTL per il comportamento nel tempo, persistenza condivisa quando ci sono più istanze. Le esclusioni si fanno sulla variabile e sulla regola, non sul WAF. L'audit log in JSON e una suite di regressione rendono il passaggio a `On` una decisione basata su dati.

## Fonti

- [ModSecurity v3 Wiki](https://github.com/owasp-modsecurity/ModSecurity/wiki)
- [ModSecurity - GitHub](https://github.com/owasp-modsecurity/ModSecurity)
- [OWASP ModSecurity Core Rule Set](https://owasp.org/www-project-modsecurity-core-rule-set/)
- [ModSecurity project site](https://www.modsecurity.org/)
