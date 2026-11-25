ModSecurity è un motore di firewall applicativo web open source che ispeziona traffico HTTP completo — metodo, URL, intestazioni, cookie e corpo — e decide se una richiesta deve continuare o essere fermata. Nato come modulo Apache nel 2002, nella versione 3.x è diventato una libreria C++ indipendente che si aggancia a Nginx, Apache, HAProxy o a un server scritto con le proprie API. Questa lezione spiega il modello di fase, le regole e i punti in cui il motore decide.

## Obiettivi

- Distinguere un WAF di rete da un WAF applicativo e sapere cosa può e non può vedere.
- Descrivere il ciclo di vita di una regola ModSecurity v3: cinque fasi, variabili, operatori, azioni.
- Leggere una regola scritta in SecLang e capire l'effetto sull'utente.
- Collegare il motore al processo che lo ospita tramite il modulo connector (per esempio `ModSecurity-nginx`).
- Scegliere il deployment corretto: in linea, in serie dietro un altro proxy o in modalità rilevamento.

## Che cosa vede un WAF HTTP

Un WAF HTTP lavora sul traffico già decodificato a livello di applicazione. Vede `GET /api/ordini?id=1%20OR%201=1 HTTP/1.1`, non i pacchetti TCP. Questo è il suo privilegio e il suo limite: può riconoscere un payload SQL injection, ma non può ripulire un header TLS malformato né fermare un attacco volumetrico, che resta compito di ACL e rate limiting di rete.

| Livello | Strumento tipico | Cosa blocca |
| --- | --- | --- |
| L3/L4 | ACL, rate limiter, scrubbing | flood, IP malevoli, porta errata |
| L7 protocollo | parser HTTP del reverse proxy | richieste malformate, smuggling base |
| L7 applicazione | ModSecurity + regole | injection, XSS, path traversal, bot noti |
| Applicazione | validazione nel codice | logica di business, autorizzazione |

Il valore di ModSecurity sta nel coprire la terza riga senza toccare il codice applicativo. Una regola può fermare una classe di attacchi per tutte le applicazioni dietro lo stesso proxy, ma non conosce il significato dei dati: non sa che un utente non dovrebbe vedere l'ordine di un altro. WAF e validazione applicativa non sono alternativi.

## Il pipeline a fasi

Il motore v3 organizza l'ispezione in cinque fasi. Ogni richiesta attraversa quelle fasi nell'ordine e in ciascuna le regole attive vengono valutate con le variabili disponibili in quel momento.

| Fase | Momento | Variabili principali |
| --- | --- | --- |
| 1 | intestazioni di richiesta | `REQUEST_HEADERS`, `REQUEST_LINE`, `REMOTE_ADDR` |
| 2 | corpo di richiesta | `ARGS`, `ARGS_POST`, `FILES`, `XML` |
| 3 | intestazioni di risposta | `RESPONSE_HEADERS`, `STATUS` |
| 4 | corpo di risposta | `RESPONSE_BODY` |
| 5 | log finale | `TX`, `INBOUND_DATA_ERROR` |

La fase 2 è quella che costa: per analizzare `ARGS_POST` il motore deve leggere il corpo, quindi le direttive di parsing (`SecRequestBodyAccess On`, limiti di dimensione) decidono se il corpo è visibile. Un errore classico è bloccare l'iniezione nel corpo senza aver abilitato l'accesso al corpo: la regola gira, non trova nulla e nessuno se ne accorge finché il test di penetrazione non lo segnala.

```apacheconf
# Blocco minimo in un server ModSecurity
SecRuleEngine DetectionOnly
SecRequestBodyAccess On
SecRequestBodyLimit 13107200
SecResponseBodyAccess Off

# Una regola: se lo User-Agent contiene "nikto", registra e blocca
SecRule REQUEST_HEADERS:User-Agent "@pm nikto sqlmap" \
    "id:900001,phase:1,deny,status:403,log,msg:'Scanner automatico rilevato'"
```

## Anatomia di una regola SecLang

Una direttiva `SecRule` ha cinque pezzi: variabile, operatore, azioni obbligatorie (`id`, `phase`) e azioni facoltative (`deny`, `block`, `log`, `tag`, `severity`). L'`id` deve essere univoco e, per le regole di produzione, ricade in intervalli riservati: 1–99.999 per i prodotti commerciali, 1.000.000–1.999.999 per le regole locali. Sovrapporre gli id di due regole rende il log illeggibile e rompe gli strumenti di audit.

Gli operatori più usati sono `@rx` (espressione regolare PCRE2), `@pm` (match di parole, molto più veloce), `@contains`, `@eq` e `@ipMatch`. Le trasformazioni (`t:lowercase`, `t:urlDecodeUni`, `t:htmlEntityDecode`) modificano il valore prima del confronto: sono obbligatorie per rilevare payload codificati e sono anche la principale fonte di falsi positivi quando vengono applicate a variabili che non le richiedono.

```apacheconf
SecRule ARGS_NAMES|ARGS "[\x27\xe2\x80\x98\xe2\x80\x99]" \
    "id:900002,phase:2,capture,block,msg:'Caratteri apice nel parametro'"
```

Le azioni come `setvar:tx.contatore=+1` alimentano lo stato condiviso `TX`, che permette regole di correlazione: contare i 403 per IP, applicare un blocco dopo N violazioni, distinguere la prima anomalia da un attacco ripetuto.

## Dove vive il motore

Nella v3 il motore è la libreria `libmodsecurity`, e il server web comunica con lui tramite un *connector*. Per Nginx esiste `ModSecurity-nginx`, compilato come modulo dinamico; per Apache esiste `mod_security2`; esistono connector anche per HAProxy ed Envoy, e `coraza` (argomento a parte) segue la stessa idea con un motore in Go. Questo disegno consente di aggiornare le regole senza ricompilare l'applicazione, ma rende critici due dettagli: la versione del connector deve supportare la versione delle API del motore, e il reverse proxy deve inoltrare il corpo della richiesta senza compressione anticipata, altrimenti il WAF ispeziona byte gonfiati.

| Deployment | Vantaggio | Costo |
| --- | --- | --- |
| in linea nel reverse proxy | una sola copia delle regole, latenza bassa | il proxy è un punto di failure |
| WAF separato davanti all'origin | si aggiorna senza toccare l'app | un salto di rete in più |
| lato applicazione (embedding) | visibilità sui dati già decisi | regressioni dentro l'app |

## Errori comuni

- **Lasciare `SecRuleEngine DetectionOnly` in produzione per mesi**: il WAF logga ma non protegge. Il passaggio a `On` va pianificato con una soglia di falsi positivi misurata sui log.
- **Dimenticare `SecRequestBodyAccess On`**: la fase 2 non vede i parametri POST e i test di injection sul corpo danno esito falso negativo.
- **Riusare id di regola tra team**: i log non permettono più di sapere quale regola ha scattato, e i tool di tuning diventano inutilizzabili.
- **Aggiungere trasformazioni a caso**: applicare `base64Decode` a ogni input genera rumore e falsi positivi; ogni `t:` deve corrispondere a un formato che l'applicazione accetta davvero.
- **Fidarsi del solo WAF per l'autorizzazione**: il WAF non conosce il proprietario di una risorsa; la mancata verifica di IDOR resta nel codice.

## In sintesi

ModSecurity è un motore di ispezione HTTP a fasi: fase 1 intestazioni, fase 2 corpo, fase 3 e 4 risposta, fase 5 log. Le regole SecLang combinano variabile, operatore e azioni, con id univoci e fasi dichiarate. La v3 separa il motore (libreria C++) dal server tramite connector. Il WAF copre le classi di attacchi note su tutte le applicazioni, ma non sostituisce la validazione e l'autorizzazione nel codice.

## Fonti

- [ModSecurity - GitHub](https://github.com/owasp-modsecurity/ModSecurity)
- [ModSecurity v3 Wiki](https://github.com/owasp-modsecurity/ModSecurity/wiki)
- [ModSecurity-nginx connector](https://github.com/owasp-modsecurity/ModSecurity-nginx)
- [ModSecurity project site](https://www.modsecurity.org/)
