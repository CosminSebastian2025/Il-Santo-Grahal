Coraza è un firewall applicativo web scritto in Go che implementa il linguaggio delle regole di ModSecurity — SecRule, fasi, variabili, `ctl` — con lo stesso set di regole OWASP CRS come obiettivo di compatibilità. Nasce per chi sviluppa in Go e non vuole introdurre un proxy esterno: il motore è una libreria importabile, e la stessa base di codice gira dentro Caddy, nell'Ingress Controller di Kubernetes o in un `net/http.Handler` di poche righe.

## Obiettivi

- Descrivere il disegno di Coraza: motore Go puro, connettori, compatibilità SecLang.
- Individuare gli oggetti dell'API v3: `WAF`, `Transaction`, `ProcessURI`, `ProcessRequestBody`, `ProcessResponseBody`.
- Capire il ciclo di richiesta e risposta in un handler HTTP e dove si inseriscono gli errori.
- Confrontare Coraza con ModSecurity per decidere quando usarlo.

## Un motore, molti connettori

Coraza separa il motore dal server come fa ModSecurity v3, ma la differenza sta nel linguaggio: il motore è Go puro, senza cgo o binding C. Questo cambia tre cose concrete. Il deploy è un binario singolo o un'immagine distroless senza librerie condivise, e l'aggiornamento delle regole è lettura di file a runtime. Il costo per richiesta entra nel garbage collector e si misura con `pprof`.

| Componente | Pacchetto | Ruolo |
| --- | --- | --- |
| motore | `github.com/corazawaf/coraza/v3` | parsing regole, valutazione, audit |
| oggetti HTTP | `coraza/v3/types` | `Transaction`, `Interruption`, `AuditLog` |
| connettore Caddy | `coraza-caddy` | middleware ufficiale per Caddy 2 |
| regole CRS | `coraza-coreruleset/v4` | file CRS convertiti e testati per Coraza |
| libreria HTTP | `http` | adattamento a `net/http` |

Il dettaglio che sorprende chi arriva da Nginx è che Coraza non è trasparente: il middleware legge il corpo della richiesta, lo bufferizza e lo ripropaga all'applicazione. Sugli upload grandi serve un limite esplicito: il WAF diventa il più grosso consumatore di memoria del servizio.

## Il ciclo di una transazione

Una transazione Coraza è monouso: si crea da `waf.NewTransaction()`, si passano URI, metodo e intestazioni, poi il corpo in ingresso, poi si interroga lo stato prima di proseguire. Gli errori non sono eccezioni: `ProcessRequestBody` restituisce `error` e un `types.Interruption` quando una regola decide di interrompere. La distinzione tra i due è importante, perché un errore di parsing non deve diventare un 500, mentre un'interruzione è una decisione di sicurezza.

```go
package main

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/corazawaf/coraza/v3"
	"github.com/corazawaf/coraza/v3/types"
)

func newWAF() coraza.WAF {
	cfg := coraza.NewWAFConfig().
		WithDirectives(`
			SecRuleEngine On
			SecRequestBodyAccess On
			SecRule ARGS "@rx (?i)union\s+select" \
			    "id:1000001,phase:2,deny,status:403,msg:'SQLi'"
		`)
	waf, err := coraza.NewWAF(cfg)
	if err != nil {
		panic(err)
	}
	return waf
}

func middleware(waf coraza.WAF, next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		tx := waf.NewTransaction()
		defer tx.Close()
		tx.ProcessConnection(r.RemoteAddr, 0, r.Host, 0)
		tx.ProcessURI(r.URL.RequestURI(), r.Method, r.Proto)
		for k, vs := range r.Header {
			for _, v := range vs {
				tx.AddRequestHeader(k, v)
			}
		}

		if it := tx.ProcessRequestHeaders(); it != nil {
			interrupt(rw, it)
			return
		}
		if _, err := tx.ProcessRequestBody(); err != nil {
			tx.ProcessLogging()
			http.Error(rw, "errore interno", http.StatusInternalServerError)
			return
		}
		if it := tx.Interruption(); it != nil {
			interrupt(rw, it)
			return
		}
		next.ServeHTTP(rw, r)
	})
}

func interrupt(rw http.ResponseWriter, it *types.Interruption) {
	code := it.Status
	if code == 0 {
		code = 403
	}
	rw.Header().Set("X-WAF-Rule", strconv.Itoa(it.RuleID))
	rw.WriteHeader(code)
	fmt.Fprintf(rw, "bloccato da regola %d (%s)\n", it.RuleID, it.Action)
}
```

 `ProcessConnection` va invocato prima di `ProcessURI`, perché le regole di fase 1 possono usare `REMOTE_ADDR`.

## Compatibilità e differenze rispetto a ModSecurity

Coraza mira a compatibilità SecLang, non a identità binaria. La maggior parte delle direttive funziona, ma alcune sono diverse o assenti, e le regole CRS sono testate nel repository `coraza-coreruleset` con un harness che segnala esattamente quali id passano e quali no. Prima di dichiarare supporto CRS a un livello di paranoia alto, vale la pena eseguire quella suite e leggere il rapporto.

| Aspetto | ModSecurity v3 | Coraza v3 |
| --- | --- | --- |
| linguaggio motore | C++ con libinjection | Go, libinjection portato |
| integrazione | connector per Nginx, Apache, HAProxy | libreria Go, Caddy, Envoy, Ingress |
| memoria | buffer per transazione | garbage collector, attenzione alle allocazioni |
| regole CRS | riferimento ufficiale | port con suite di compatibilità |
| audit log | nativi, molte parti configurabili | `AuditLog` con writer configurabile |

Un esempio pratico: la persistenza delle collezioni con backend disk o redis non ha la stessa semantica del motore C++; in un servizio Go conviene gestire i contatori distribuiti nel proprio codice, per esempio con Redis, lasciando al WAF il solo punteggio per transazione. `SecResponseBodyAccess` richiede lo stesso lavoro: il body di risposta è uno stream e va catturato solo per i content type previsti.

## Quando conviene

Coraza è la scelta naturale quando l'app è già in Go e si vuole lo stesso binario per applicazione e WAF, oppure quando si usa Caddy o Envoy e si vuole evitare mod_security2. Se servono correlazione tra più istanze, persistenza delle collezioni su database e integrazione con sistemi di ticketing, quei pezzi vanno costruiti separatamente o acquistati.

## Errori comuni

- **Dimenticare `ProcessRequestBody`**: le regole di fase 2 non vedono i parametri POST, e un test su JSON injection passa con 200.
- **Trattare `types.Interruption` come un errore Go**: le interruzioni non arrivano da `error`, vanno lette con `tx.Interruption()` o dal valore restituito dalle fasi.
- **Riusare una transazione per più richieste**: lo stato e il punteggio sono per transazione; riusare `tx` mescola anomalie e log.
- **Non limitare la dimensione del corpo**: un upload da centinaia di MiB finisce interamente nella memoria del WAF prima di arrivare all'app.
- **Attivare il CRS a livello 4 senza la suite di compatibilità**: alcune regole non sono implementate allo stesso modo.

## In sintesi

Coraza porta il modello SecLang in Go con un motore importabile e connettori per Caddy, Envoy e `net/http`. L'API v3 ruota intorno a WAF e Transaction, con passaggio esplicito di URI, intestazioni, corpo e risposta; interruption ed errori sono concetti distinti. Rispetto a ModSecurity cambia il linguaggio di implementazione e il modo di gestire lo stato condiviso, non il modello delle regole.

## Fonti

- [Coraza WAF - GitHub](https://github.com/corazawaf/coraza)
- [Coraza website](https://www.coraza.io/)
- [pkg.go.dev coraza/v3](https://pkg.go.dev/github.com/corazawaf/coraza/v3)
- [Coraza Caddy connector](https://github.com/corazawaf/coraza-caddy)
