Il successo di Go dipende tanto dal linguaggio quanto dagli strumenti che fa parte del pacchetto: `go` gestisce dipendenze, formattazione, test, build e cross-compilazione senza plugin obbligatori. Intorno a questa base è cresciuto un ecosistema di server HTTP, client di database, CLI e strumenti di linting che condividono le stesse convenzioni. In questa lezione vedi come un progetto Go moderno si organizza, come si testa e dove viene usato in produzione.

## Obiettivi

- Inizializzare un modulo con `go mod init` e leggere `go.mod` e `go.sum`.
- Organizzare pacchetti radice, `cmd/` e `internal/` secondo la convenzione `<module>/<package>`.
- Scrivere test, benchmark e table-driven test con il pacchetto `testing`.
- Usare `go vet`, `gofmt` e `golangci-lint` in un flusso ripetibile anche in CI.
- Riconoscere casi d'uso reali: API HTTP, servizi CLI, strumenti di infrastruttura.

## Moduli e dipendenze

Un modulo è la radice di un albero di pacchetti identificata da un percorso, di solito un dominio o un repository. `go.mod` dichiara il percorso, la versione del linguaggio e le dipendenze dirette.

```bash
go mod init example.com/blog
go get github.com/go-chi/chi/v5@latest
go mod tidy            # aggiunge le dipendenze usate e rimuove le inutilizzate
go list -m all         # elenco delle versioni effettive
go mod verify          # controlla gli hash del cache dei moduli
```

`go.sum` contiene gli hash crittografici dei moduli scaricati e va committato. La selezione delle versioni usa il *minimal version selection*: vince la versione più bassa tra quelle richieste.

| Comando | Cosa fa | Quando |
| --- | --- | --- |
| `go build ./...` | compila tutti i pacchetti | prima di ogni commit |
| `go test ./...` | esegue i test di tutti i pacchetti | locale e CI |
| `go test -race ./...` | rileva data race | servizi con goroutine |
| `go vet ./...` | analisi statica della toolchain | sempre, è veloce |
| `go test -bench=. -benchmem` | benchmark e allocazioni | ottimizzazione |

## Struttura di un progetto

La convenzione ufficiale distingue eseguibili e librerie: `cmd/<nome>/main.go` per i binari, `internal/` per i pacchetti non importabili dall'esterno, e un package radice con il nome del modulo.

```text
blog/
├── go.mod
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── storage/
│   └── handler/
└── post/
    └── post.go
```

Il compilatore blocca gli import di `internal` provenienti da moduli esterni. Il nome del package è corto e minuscolo (`storage`), mentre il percorso su disco coincide con il suffisso degli import.

## Testing idiomatico

I test stanno nello stesso pacchetto del codice sotto test, in file `*_test.go`, e usano solo la standard library.

```go
package post

import "testing"

func TestSlug(t *testing.T) {
	casi := []struct {
		nome  string
		input string
		want  string
	}{
		{"minuscole", "Ciao Mondo", "ciao-mondo"},
		{"spazi multipli", "a  b", "a-b"},
		{"già valido", "ok-test", "ok-test"},
	}
	for _, c := range casi {
		t.Run(c.nome, func(t *testing.T) {
			if got := Slug(c.input); got != c.want {
				t.Errorf("Slug(%q) = %q, atteso %q", c.input, got, c.want)
			}
		})
	}
}

func BenchmarkSlug(b *testing.B) {
	for i := 0; i < b.N; i++ {
		Slug("Ciao Mondo")
	}
}
```

Il table-driven test con `t.Run` mostra subito il caso fallito. I benchmark misurano con `b.N` perché il framework aumenta le iterazioni finché il tempo è significativo; `-cover` dà la copertura di statement, un segnale e non un obiettivo.

## Tooling, linting e casi d'uso

`gofmt` è l'unica formattazione accettata e rende diff e review leggibili. `go vet` intercetta bug tipici come `Printf` con verbi sbagliati e copie di lock; `golangci-lint` aggrega molti linter, tra cui Staticcheck. Una pipeline minima esegue `go fmt`, `go vet` e `go test` su ogni pull request. I casi d'uso tipici sono server HTTP (libreria standard o framework come chi, Gin, Echo), agenti di infrastruttura (Docker, Kubernetes, Terraform), CLI distribuite come singolo binario e servizi che richiedono avvio rapido.

```bash
go fmt ./... && go vet ./...
go test -race -cover ./...
golangci-lint run ./...
```

Una pipeline minima esegue questi tre passi su ogni pull request e un `go build` per le piattaforme target. `net/http` da solo copre routing semplice, middleware e HTTP/2.

## Errori comuni

- **Non committare `go.sum`**: le build su CI possono risolvere dipendenze in modo diverso.
- **Mettere tutto in `main`**: senza pacchetti separati i test diventano lenti e il codice non riusabile.
- **Usare `latest` nei `go get` senza fissare**: gli aggiornamenti entrano senza revisione.
- **Scrivere test solo felici**: senza casi limite la copertura è illusoria.
- **Formattare a mano**: un file non `gofmt` sporca ogni diff successivo.

## In sintesi

Un modulo Go è definito da `go.mod` e protetto da `go.sum`. I comandi della toolchain coprono dipendenze, build, test e analisi statica in modo uniforme. La struttura `cmd/`, `internal/` e package radice rispecchia i confini di visibilità. Il testing con table-driven test è parte del linguaggio, non un framework esterno.

## Fonti

- [Go: Managing dependencies](https://go.dev/doc/modules/managing-dependencies)
- [Go: Organizing a Go module](https://go.dev/doc/modules/layout)
- [Package testing](https://pkg.go.dev/testing)
- [golangci-lint](https://golangci-lint.run/)
