In questo laboratorio costruisci un servizio Go minimo con Coraza come middleware, lo riempi di regole SecLang locali e di una configurazione CRS ridotta, poi lo attacchi con una suite di richieste che verifica blocco, passaggio e assenza di regressioni. L'obiettivo è avere un test eseguibile in CI, perché un WAF senza test cambia comportamento al primo aggiornamento senza che nessuno se ne accorga.

## Obiettivi

- Scrivere un middleware Coraza completo che gestisca corpo, risposta e interruption.
- Scrivere test in Go con `httptest` che verificano 200, 403 e 429 su payload diversi.
- Misurare il costo per richiesta con `go test -bench` e `pprof`.
- Tradurre un falso positivo in un'esclusione locale con un test che lo vincola.

## Struttura del progetto

```bash
mkdir coraza-lab && cd coraza-lab && go mod init esempio/coraza-lab
go get github.com/corazawaf/coraza/v3@latest
go list -m github.com/corazawaf/coraza/v3
```

La seconda riga pinna la versione nel `go.sum`: annotala, perché un cambio di minor può cambiare il parser del corpo.

## Il motore e il middleware

Il motore si costruisce una volta all'avvio con le direttive lette da file, e il middleware crea una transazione per richiesta. Quando un'interruzione è presente, la risposta riporta l'id della regola: utile in staging, da non esporre in produzione.

```go
package main

import (
	"os"

	"github.com/corazawaf/coraza/v3"
)

func loadWAF(path string) (coraza.WAF, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	cfg := coraza.NewWAFConfig().
		WithDirectives("SecRuleEngine On\nSecRequestBodyAccess On\n" + string(raw))
	return coraza.NewWAF(cfg)
}
```

```go
func wafHandler(waf coraza.WAF, next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		tx := waf.NewTransaction()
		defer tx.Close()

		ip, portStr, _ := net.SplitHostPort(r.RemoteAddr)
		port, _ := strconv.Atoi(portStr)
		tx.ProcessConnection(ip, port, "", 0)
		tx.ProcessURI(r.URL.RequestURI(), r.Method, r.Proto)
		for k, vs := range r.Header {
			for _, v := range vs {
				tx.AddRequestHeader(k, v)
			}
		}
		tx.ProcessRequestHeaders()

		if it := tx.Interruption(); it != nil {
			reject(rw, it)
			return
		}
		if _, err := tx.ProcessRequestBody(); err != nil {
			tx.ProcessLogging()
			http.Error(rw, "richiesta non valida", http.StatusBadRequest)
			return
		}
		if it := tx.Interruption(); it != nil {
			reject(rw, it)
			return
		}
		next.ServeHTTP(rw, r)
	})
}

func reject(rw http.ResponseWriter, it *types.Interruption) {
	status := it.Status
	if status == 0 {
		status = http.StatusForbidden
	}
	rw.Header().Set("X-Mod-Security-Rule", fmt.Sprint(it.RuleID))
	rw.WriteHeader(status)
	_, _ = rw.Write([]byte("richiesta respinta\n"))
}
```

`ProcessRequestBody` va chiamato anche senza regole sul corpo: inizializza le variabili `ARGS_POST` che le regole su `ARGS` devono vedere. `reject` usa `it.Status`, così una regola con `status:429` restituisce il codice corretto.

## Regole locali e test di accettazione

Le regole del laboratorio coprono tre casi: injection SQL nel parametro, rate limit sull'header `X-Api-Key` assente su una rotta, e un falso positivo legittimo su un campo di ricerca che contiene un `<`.

```apacheconf
# regole/locale.conf
SecRule ARGS "@rx (?i)(\borg\b|\bunion\b)\s+(\bselect\b|\b1\b)" \
    "id:1001001,phase:2,deny,status:403,log,msg:'SQLi sospetta'"

SecRule REQUEST_URI "@beginsWith /api/private" \
    "id:1001002,phase:1,deny,status:429,log,msg:'API key mancante',chain"
SecRule &REQUEST_HEADERS:X-Api-Key "@eq 0" "t:none"

# Falso positivo: la ricerca accetta "<" come testo
SecRule REQUEST_URI "@beginsWith /api/search" \
    "id:1001003,phase:1,pass,nolog,chain"
SecRule ARGS:q "@contains <" "t:none,\
    ctl:ruleRemoveTargetById=1001001;ARGS:q"
SecRule ARGS:q "@rx (?i)\bunion\b.*\bselect\b" \
    "id:1001004,phase:2,deny,status:403,log,msg:'SQLi su ricerca'"
```

I test usano `httptest` e un handler finale che restituisce 200: il WAF è il solo oggetto sotto test.

```go
func TestCasiDiAccettazione(t *testing.T) {
	waf, err := loadWAF("regole/locale.conf")
	if err != nil {
		t.Fatal(err)
	}
	h := wafHandler(waf, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	casi := []struct{ nome, metodo, url, body string; atteso int }{
		{"request pulita", "GET", "/api/search?q=libri", "", 200},
		{"sql injection", "GET", "/api/search?q=1+union+select+password", "", 403},
		{"ricerca con minore", "GET", "/api/search?q=prezzo+%3C+10", "", 200},
		{"api key assente", "GET", "/api/private/list", "", 429},
		{"body json pulito", "POST", "/api/ordini", `{"q":"magliette"}`, 200},
	}

	for _, c := range casi {
		t.Run(c.nome, func(t *testing.T) {
			req := httptest.NewRequest(c.metodo, c.url, strings.NewReader(c.body))
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != c.atteso {
				t.Fatalf("atteso %d, ottenuto %d (regola %s)",
					c.atteso, rec.Code, rec.Header().Get("X-Mod-Security-Rule"))
			}
		})
	}
}
```

Il caso "ricerca con minore" è quello che protegge l'esclusione: se qualcuno la rimuove, il test fallisce con 403 e la causa è visibile nell'header. Il caso "sql injection" continua a colpire `ARGS:q` perché è coperto dalla regola `1001004`, quindi la copertura non è stata sacrificata.

## Costo e benchmark

Un middleware WAF aggiunge allocazioni per transazione: la transazione, le collezioni e il buffer del corpo. Il benchmark va eseguito con il corpo vuoto e con un corpo da 8 KiB, che sono i due estremi realistici di una API.

```bash
go test -run '^$' -bench BenchmarkWAF -benchmem ./...
go test -run '^$' -bench BenchmarkWAF -cpuprofile cpu.out -memprofile mem.out
go tool pprof -top cpu.out | head -20
go tool pprof -top -alloc_space mem.out | head -20
```

Il criterio di uscita del laboratorio è un numero: p95 delle richieste con WAF non oltre il 15% sopra quello senza WAF sulla macchina di riferimento, e allocazioni per transazione stabili tra due esecuzioni. Se la differenza è oltre, la causa più comune è una regola che decodifica il corpo due volte o un'esclusione che costringe il motore a rivalutare l'intera variabile.

Servono anche tre prove di robustezza: body da 20 MiB respinto per limite senza esaurire la memoria, 500 richieste ostili con 500 log e nessun panic, percent-encoding doppio rilevato grazie a `t:urlDecodeUni`.

## Errori comuni

- **Non chiamare `ProcessRequestBody`**: le regole di fase 2 leggono `ARGS` senza i campi del corpo e la suite passa a metà.
- **Usare `tx.Interruption()` solo a fine handler**: se il blocco arriva prima, l'handler applicativo esegue comunque; l'interruzione va controllata dopo ogni fase.
- **Testare solo i casi bloccati**: senza la richiesta legittima, un'esclusione troppo larga non viene scoperta e il falso positivo torna in produzione.
- **Benchmark con un solo corpo**: i numeri con body vuoto nascondono il costo del parsing multipart e JSON.
- **Restituire sempre 403**: per rate limit e limiti di corpo il codice corretto è diverso, e i client lo distinguono.

## In sintesi

Il laboratorio mette insieme motore, middleware, regole e test in un unico modulo Go. La transazione per richiesta, il controllo dell'interruzione dopo ogni fase e il codice di stato corretto sono i tre punti che distinguono un WAF funzionante da un filtro approssimativo. La suite di accettazione e il benchmark rendono il comportamento verificabile a ogni aggiornamento di Coraza e delle regole.

## Fonti

- [pkg.go.dev coraza/v3](https://pkg.go.dev/github.com/corazawaf/coraza/v3)
- [Coraza WAF - GitHub](https://github.com/corazawaf/coraza)
- [pkg.go.dev coraza/v3/types](https://pkg.go.dev/github.com/corazawaf/coraza/v3/types)
- [Coraza website](https://www.coraza.io/)
