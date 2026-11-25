Le OWASP ModSecurity Core Rule Set (CRS) sono un insieme di regole generiche che trasformano un motore WAF in una protezione pronta all'uso contro le classi di attacco della OWASP Top 10. Non sono una raccolta casuale di firme: sono regole di rilevamento generiche, con un sistema di punteggi e livelli di paranoia che permette di passare da "registra tutto" a "blocca aggressivamente" con una manopola. Questa lezione spiega la struttura del progetto, la nomenclatura delle regole e come si comporta una transazione che attraversa il set.

## Obiettivi

- Descrivere la struttura del CRS: elenco delle regole, setup e utilizzazione, livelli di paranoia.
- Leggere la numerazione degli id per categoria di attacco e riconoscere le regole di inizializzazione e di valutazione.
- Spiegare il modello a punteggio, le soglie di blocco e l'effetto di `paranoia_level` e `executing_paranoia_level`.
- Sapere quali file si modificano e quali non vanno toccati quando si aggiorna il CRS.

## Che cos'è il CRS e come è organizzato

Il CRS è distribuito come file SecLang compatibili con ModSecurity v2 e v3 e, con lievi adattamenti, con Coraza. Ogni release ha un numero di versione semver — al momento della scrittura la 4.31.0 — e viene aggiornata più volte l'anno. Il repository contiene un `crs-setup.conf.example` che è il modello da copiare, una directory `rules/` con i file numerati `REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf.example`, `REQUEST-930-APPLICATION-ATTACK-LFI.conf`, fino a `RESPONSE-959-BLOCKING-EVALUATION.conf` e `RESPONSE-980-CORRELATION.conf`.

| File | Ruolo | Contenuto |
| --- | --- | --- |
| `crs-setup.conf.example` | configurazione iniziale | punteggi, soglie, paranoia, approcci di blocco |
| `REQUEST-900-EXCLUSION-RULES-BEFORE-CRS.conf.example` | esclusioni globali | regole attive prima del CRS |
| `REQUEST-901-INITIALIZATION.conf` | inizializzazione | verifica versioni, azzeramento variabili |
| `REQUEST-9xx-APPLICATION-ATTACK-*.conf` | rilevamento attacchi | protocollo, injection, XSS, bot |
| `RESPONSE-950-DATA-LEAKAGES.conf` | fuoriuscita dati | errori e dati sensibili in risposta |
| `RESPONSE-959-BLOCKING-EVALUATION.conf` | decisione | soglia di punteggio in ingresso |
| `RESPONSE-980-CORRELATION.conf` | correlazione | registrazione di una transazione anomala |

I file `.example` vanno copiati senza `.example` e caricati nell'ordine numerico dal motore. Modificarli è la tentazione principale, ed è anche la via più rapida per rompere il CRS al primo aggiornamento: il punto di estensione previsto sono le regole 9x0x di esclusione e i file di configurazione che includono il setup tramite `Include` o direttive del proprio proxy.

## Numerazione e categorie

Gli id compresi tra 900.000 e 999.999 sono assegnati al CRS. La cifra delle migliaia (913, 920, 930, 931, …) indica la categoria, e gli id all'interno della categoria sono progressivi a blocchi di mille. La documentazione ufficiale mantiene una mappatura per banda: da 913000 a 913099 protocollo HTTP, da 920100 a 920999 metodo e URI, da 921000 a 921999 content type e body, da 930000 a 930999 local file inclusion, da 931000 a 931999 remote file inclusion, da 932000 a 932999 injection PHP, da 933000 a 933999 injection Java, da 941000 a 941999 cross-site scripting, da 942000 a 942999 SQL injection.

```apacheconf
# Esempio di messaggio prodotto da una regola crs
# 942100: SQL Injection Attack Detected via libinjection
SecRule REQUEST_COOKIES|REQUEST_COOKIES_NAMES|ARGS ... \
    "id:942100,phase:2,block:... ,\
    msg:'SQL Injection Attack Detected via libinjection',\
    tag:'application-multi',tag:'language-multi',\
    tag:'platform-multi',tag:'attack-sqli',\
    tag:'paranoia-level/1',tag:'OWASP_CRS',tag:'capec/1000/152/248/66',\
    setvar:'tx.inbound_anomaly_score_pl1=+%{tx.critical_anomaly_score}'"
```

Ogni regola porta un tag `attack-*` e un tag `paranoia-level/N`. I tag sono il filtro più utile nei log: contare per `attack-sqli` o per `paranoia-level/2` dice immediatamente quale famiglia di attacchi o quale livello ha generato il rumore.

## Il modello a punteggio

Il CRS non blocca alla prima corrispondenza di ogni regola, tranne dove una singola violazione è già grave. Il comportamento predefinito è accumulare un punteggio di anomalia: `critical` vale 5, `error` 4, `warning` 3, `notice` 2, con punteggi configurabili in `crs-setup.conf`. Quando la valutazione finale trova `tx.inbound_anomaly_score_pl1` oltre la soglia `tx.inbound_anomaly_score_threshold` (5 di default) e l'approccio di blocco è `Anomaly Scoring`, la richiesta viene fermata con 403.

| Livello di paranoia | Significato | Effetto | Rischio |
| --- | --- | --- | --- |
| 1 | regole generiche | copre attacchi comuni | falsi positivi bassi |
| 2 | regole più specifiche | copre più varianti | serve tuning |
| 3 | regole per applicazioni note | copre payload avanzati | falsi positivi frequenti |
| 4 | regole più aggressive | copre anche casi limite | richiede esclusioni |

Dal CRS 3.3 esiste `executing_paranoia_level`, separato da `paranoia_level`: il primo decide quali regole vengono valutate, il secondo resta il livello dichiarato nel file di setup. Questa separazione permette di conservare il progetto a livello 2 e di eseguire solo il livello 1 in una prova. `tx.blocking_paranoia_level`, se impostato, limita il blocco ai livelli fino a quello indicato, lasciando loggati i livelli superiori.

```apacheconf
# crs-setup.conf: soglie e approccio di blocco
SecAction "id:900110,phase:1,nolog,pass,t:none,\
    setvar:tx.inbound_anomaly_score_threshold=5,\
    setvar:tx.outbound_anomaly_score_threshold=4"
SecAction "id:900000,phase:1,nolog,pass,t:none,\
    setvar:tx.blocking_paranoia_level=1,\
    setvar:tx.detection_paranoia_level=1"
SecAction "id:900990,phase:1,nolog,pass,t:none,\
    setvar:tx.crs_setup_version=4310"
```

## Perché conviene usarlo, e con quali aspettative

Il CRS è nato nel 2005 ed è mantenuto da volontari sotto l'OWASP; la sua promessa è volutamente limitata: rilevamento generico di categorie di attacco note, con reportistica su regola e livello. Al livello 1 su una API JSON con testi liberi compaiono falsi positivi su codici markdown e WYSIWYG, quindi il valore non sta nell'attivarlo e dimenticarlo, ma nell'avere una base comune su cui costruire esclusioni piccole e documentate.

## Errori comuni

- **Modificare `rules/*.conf` direttamente**: al primo aggiornamento le modifiche spariscono o confliggono con la nuova release; le esclusioni vanno nei file 9x0x previsti.
- **Copiare `crs-setup.conf.example` senza coprirlo**: dopo un aggiornamento del pacchetto, il file `.example` cambia e il setup rimane vecchio senza avvisi.
- **Mettere `paranoia_level=4` alla prima configurazione**: il WAF sembra non funzionare per impostazione predefinita quando in realtà sta bloccando traffico legittimo; si parte da 1 o 2.
- **Disattivare la protezione CRS per un singolo endpoint usando `SecRuleRemoveById` globale**: si deve usare la regola di esclusione con lo scope sull'URI.
- **Ignorare i tag di paranoia**: senza `paranoia-level/N` nei tag di log, la decisione di quali regole uccidere si prende a intuito.

## In sintesi

Il CRS è un progetto a release numerate con file di setup, inizializzazione, rilevamento per categoria, valutazione e correlazione. Gli id indicano la categoria di attacco, i tag indicano famiglia e livello, il punteggio di anomalia con soglia dichiarata trasforma molte regole piccole in una decisione. Il punto di estensione corretto sono i file di esclusione 9x0x, e i livelli di paranoia si alzano solo con dati alla mano.

## Fonti

- [OWASP ModSecurity Core Rule Set](https://owasp.org/www-project-modsecurity-core-rule-set/)
- [CRS Documentation](https://coreruleset.org/docs/)
- [Coreruleset - GitHub](https://github.com/coreruleset/coreruleset)
- [Coreruleset releases](https://github.com/coreruleset/coreruleset/releases)
