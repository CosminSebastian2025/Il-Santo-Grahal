Il modo più rapido per mettere Coraza davanti a un servizio reale è Caddy 2 con il modulo `coraza-caddy`, che carica il CRS senza compilare Go a mano. Il modo più preciso è importare il motore nel proprio servizio, dove si controllano fasi, corpo e audit. Questa lezione copre entrambi: configurazione Caddy con CRS, poi integrazione di alto livello con `coraza` come handler e con il CRS tramite `coraza-coreruleset`, chiudendo con le divergenze di compatibilità che contano in produzione.

## Obiettivi

- Configurare Caddy con il middleware Coraza e il CRS, con esclusione mirata per una rotta.
- Eseguire la suite go-ftw del progetto per leggere le divergenze di compatibilità CRS.
- Integrare il CRS in un servizio Go con loading della directory di regole e limiti di corpo.
- Riconoscere le direttive che in Coraza si comportano diversamente da ModSecurity e adattare la configurazione.

## Dove si integra Coraza

Coraza è una libreria: il punto di integrazione decide cosa si ispeziona. Diversamente da un WAF in linea, che separa applicazione e filtro, qui il filtro vive nel processo che serve il traffico.

## Caddy come reverse proxy con WAF

Caddy 2 supporta moduli esterni compilati dentro il binario con `xcaddy`, con la versione del modulo pinnata nel comando di build.

```bash
# Build di un binario Caddy con il modulo Coraza e il connettore CRS
xcaddy build v2.10.0 \
  --with github.com/corazawaf/coraza-caddy/v2 \
  --with github.com/corazawaf/coraza-coreruleset/v4 \
  --output caddy-waf

./caddy-waf list-modules | grep -E 'coraza|http.handlers.waf'
```

Nel `Caddyfile` il WAF è un handler che avvolge il `reverse_proxy`. Le direttive SecLang si caricano con l'opzione `directives` o con `include` di file, e l'ordine conta: se il WAF è dopo il proxy nella catena degli handler, il body è già stato inoltrato e non è più ispezionabile.

```caddyfile
{
	admin off
}

waf.example.test:8443 {
	handle /api/* {
		waf {
			include /etc/coraza/crs-setup.conf
			include /etc/coraza/rules/*.conf
			include /etc/coraza/exclusions.conf
		}
		reverse_proxy app:8080
	}

	handle {
		reverse_proxy app:8080
	}

	log {
		output stdout
		format json
	}
}
```

Con il CRS in `/etc/coraza` i file sono più di quaranta: un glob evita di dimenticarne uno dopo l'aggiornamento. `exclusions.conf` va incluso dopo le regole, non prima.

Le esclusioni seguono la stessa logica vista per ModSecurity, con id nella fascia 1.000.000:

```apacheconf
# Solo per l'endpoint che accetta markdown
SecRule REQUEST_URI "@beginsWith /api/posts" \
    "id:1000401,phase:1,pass,nolog,chain"
SecRule REQUEST_METHOD "@streq PUT" "t:none,\
    ctl:ruleRemoveTargetById=941160;ARGS:body,\
    ctl:ruleRemoveTargetById=941100;ARGS:body"

# Su Caddy i WebSocket non devono passare l'ispezione del corpo
SecRule REQUEST_HEADERS:Upgrade "@streq websocket" \
    "id:1000402,phase:1,pass,nolog,\
    ctl:requestBodyAccess=Off"
```

`ctl:requestBodyAccess=Off` impedisce di bufferizzare un corpo che non arriverà mai: senza, Caddy trattiene la connessione WebSocket in attesa.

## Verificare la compatibilità con go-ftw

Coraza mantiene un harness in `testing/coreruleset` che adatta il framework `go-ftw` del progetto CRS: le stesse transazioni del test set ufficiale girano contro il motore Go, con file di override (`.ftw-overrides.yml`) per i casi attesi diversi. Eseguirlo prima di alzare il paranoia level è l'unico modo per sapere quali regole divergono davvero.

```bash
git clone https://github.com/corazawaf/coraza && cd coraza/testing/coreruleset
go test -tags coreruleset -v .
```

Il risultato è una lista per id di regola con esito atteso e ottenuto.

| Divergenza frequente | Sintomo | Rimedio |
| --- | --- | --- |
| collezioni persistenti | contatori per IP non persistono | gestione nel codice o Redis esterno |
| parser JSON e variabili | esclusioni `ARGS:x` inefficaci | esclusione su `ARGS` o sul nome JSON |
| body multipart grandi | memoria in crescita | `SecRequestBodyLimit` e upload diretto |
| audit log per parti | parti mancanti | `tx.AuditLog()` e writer proprio |
| risposta compressa | contenuto non ispezionabile | ispezione prima della compressione |

## Coraza dentro un servizio Go con il CRS

Per il servizio dell'applicazione il CRS si carica come directory di file, dopo averli copiati dall'immagine o dal repository. Due accorgimenti evitano la maggior parte dei problemi: leggere i file una volta all'avvio e fallire dichiaratamente se una direttiva non è supportata, invece di degradare in silenzio.

```go
func buildWAF(dir string) (coraza.WAF, error) {
	var b strings.Builder
	b.WriteString("SecRuleEngine On\n")
	b.WriteString("SecRequestBodyAccess On\n")
	b.WriteString("SecRequestBodyLimit 10485760\n")
	b.WriteString("SecRequestBodyInMemoryLimit 1048576\n")
	b.WriteString("Include " + dir + "/crs-setup.conf\n")

	files, err := filepath.Glob(dir + "/rules/*.conf")
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	for _, f := range files {
		b.WriteString("Include " + f + "\n")
	}

	waf, err := coraza.NewWAF(coraza.NewWAFConfig().WithDirectives(b.String()))
	if err != nil {
		return nil, fmt.Errorf("regole WAF non valide: %w", err)
	}
	return waf, nil
}
```

`SecRequestBodyInMemoryLimit` è la manopola che protegge il processo: oltre la soglia Coraza passa a un file temporaneo invece di tenere tutto in RAM. `sort.Strings` non è cosmetico, perché l'ordine numerico dei file del CRS è significativo: `REQUEST-901-INITIALIZATION` deve venire prima delle regole `9xx`, e un glob non ordinato su alcuni filesystem rompe l'inizializzazione.

Il percorso di risposta va aggiunto solo per le pagine HTML dove contano stack trace e dati sensibili, avvolgendo il `ResponseWriter` in un recorder limitato; per le API JSON il costo supera il beneficio.

## Errori comuni

- **Mettere il WAF dopo `reverse_proxy` nel Caddyfile**: la richiesta è già stata inoltrata e l'handler non vede nulla da ispezionare.
- **Caricare le regole CRS senza ordinamento**: l'inizializzazione avviene dopo regole che la usano, e le variabili di punteggio restano vuote.
- **Ispezionare WebSocket**: il middleware aspetta un body infinito e la connessione si blocca; `ctl:requestBodyAccess=Off` sugli upgrade è obbligatorio.
- **Escludere `ARGS:body` su JSON**: il nome della variabile è diverso e l'esclusione non ha effetto; il test di regressione lo scopre subito se esiste.
- **Degradare in silenzio su una direttiva non supportata**: il caricamento del WAF deve fallire, altrimenti si crede di avere protezione che non c'è.

## In sintesi

Coraza con Caddy richiede un binario costruito con `xcaddy`, un `Caddyfile` in cui il WAF avvolge il proxy e un insieme di file CRS caricati nell'ordine corretto. Per i servizi Go il CRS si integra come direttive, con limiti di corpo espliciti e gestione dello stream di risposta. Le divergenze rispetto a ModSecurity si gestiscono sapendole prima: collezioni persistenti, variabili JSON, multipart e audit log sono i punti da testare.

## Fonti

- [Coraza Caddy connector](https://github.com/corazawaf/coraza-caddy)
- [Coraza WAF - GitHub](https://github.com/corazawaf/coraza)
- [Coraza CRS package](https://pkg.go.dev/github.com/corazawaf/coraza-coreruleset/v4)
- [Coraza website](https://www.coraza.io/)
