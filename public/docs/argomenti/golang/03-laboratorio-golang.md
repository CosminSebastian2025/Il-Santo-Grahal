In questo laboratorio costruisci `parole`, un binario Go che stampa le parole più frequenti di un file di testo. È il pretesto per mettere in fila moduli, pacchetti, `flag`, `bufio.Scanner`, table-driven test e cross-compilazione. Il risultato è un eseguibile senza dipendenze da copiare su qualsiasi macchina.

## Obiettivi

- Creare un modulo con `go mod init` e separare pacchetto di dominio e `cmd/`.
- Leggere argomenti e flag con il pacchetto `flag` e fissare le exit code.
- Scorrere un file con `bufio.Scanner` e normalizzare le parole.
- Scrivere table-driven test e verificare il conteggio su input noto.
- Produrre un binario statico con `go build` e controllarlo con `go vet`.

## Il contratto e la struttura

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `parole [OPZIONI] FILE` | un solo argomento posizionale |
| `-n N` | intero > 0, default 10 | limite delle righe stampate |
| `-min N` | lunghezza minima, default 3 | scarta parole come "il", "a" |
| normalizzazione | minuscole, solo lettere | conteggio stabile |
| exit 0 | successo, anche con zero parole | come `grep` |
| exit 1 | file o flag errore | errore operativo |
| exit 2 | uso errato | `flag.ExitOnError` lo fa da solo |

Installa i file con `go mod init example.com/parole` nella radice: il percorso del modulo deve corrispondere al prefisso degli import, altrimenti il compilatore non trova `internal/conta`.

## Il conteggio

```go
package conta

import (
	"bufio"
	"io"
	"strings"
	"unicode"
)

// Parola associa un termine normalizzato al numero di occorrenze.
type Parola struct {
	Termine string
	Volte   int
}

// Normalizza riduce a minuscole e conserva solo lettere e cifre.
func Normalizza(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Conta legge r riga per riga fino a EOF e restituisce le parole con
// lunghezza almeno minima, senza ordinarle.
func Conta(r io.Reader, minima int) (map[string]int, error) {
	scanner := bufio.NewScanner(r)
	scanner.Split(bufio.ScanWords)
	frequenze := make(map[string]int)
	for scanner.Scan() {
		p := Normalizza(scanner.Text())
		if len([]rune(p)) >= minima {
			frequenze[p]++
		}
	}
	return frequenze, scanner.Err()
}
```

`io.Reader` come parametro rende la funzione testabile con `strings.NewReader` e riusabile con un file, una rete o `os.Stdin`. Il `scanner.Err()` va restituito: un file con righe troppo lunghe produce `bufio.ErrTooLong` e ignorarlo troncherebbe l'input in silenzio.

## La CLI

```go
package main

import (
	"flag"
	"fmt"
	"os"
	"sort"

	"example.com/parole/internal/conta"
)

func main() {
	n := flag.Int("n", 10, "numero di parole da mostrare")
	minima := flag.Int("min", 3, "lunghezza minima di una parola")
	flag.Parse() // usa os.Args di default

	if flag.NArg() != 1 || *n <= 0 || *minima < 0 {
		fmt.Fprintln(flag.CommandLine.Output(), "uso: parole [-n N] [-min N] FILE")
		flag.PrintDefaults()
		os.Exit(1)
	}

	f, err := os.Open(flag.Arg(0))
	if err != nil {
		fmt.Fprintf(os.Stderr, "parole: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	frequenze, err := conta.Conta(f, *minima)
	if err != nil {
		fmt.Fprintf(os.Stderr, "parole: %v\n", err)
		os.Exit(1)
	}

	parole := make([]conta.Parola, 0, len(frequenze))
	for t, v := range frequenze {
		parole = append(parole, conta.Parola{Termine: t, Volte: v})
	}
	sort.Slice(parole, func(i, j int) bool {
		if parole[i].Volte != parole[j].Volte {
			return parole[i].Volte > parole[j].Volte
		}
		return parole[i].Termine < parole[j].Termine // ordine stabile per parità
	})
	if len(parole) > *n {
		parole = parole[:*n]
	}
	fmt.Printf("%d parole distinte\n", len(frequenze))
	for _, p := range parole {
		fmt.Printf("%6d  %s\n", p.Volte, p.Termine)
	}
}
```

Nota il dettaglio: `sort.Slice` non è stabile, quindi a parità di frequenza l'ordine alfabetico rende l'output ripetibile. Se vuoi separare uso errato e file mancante usa `flag.ContinueOnError` e rispondi 2 anche a `flag.ErrHelp`.

## Test e build

```go
package conta

import (
	"strings"
	"testing"
)

func TestConta(t *testing.T) {
	casi := []struct {
		nome   string
		input  string
		minima int
		want   map[string]int
	}{
		{"semplice", "Go go GO gopher", 3, map[string]int{"go": 3, "gopher": 1}},
		{"punteggiatura", "ciao, ciao!", 3, map[string]int{"ciao": 2}},
		{"minima alta", "ab abc abcd", 3, map[string]int{"abc": 1, "abcd": 1}},
	}
	for _, c := range casi {
		t.Run(c.nome, func(t *testing.T) {
			got, err := Conta(strings.NewReader(c.input), c.minima)
			if err != nil {
				t.Fatalf("errore inatteso: %v", err)
			}
			if len(got) != len(c.want) {
				t.Fatalf("parole distinte = %d, attese %d", len(got), len(c.want))
			}
			for k, v := range c.want {
				if got[k] != v {
					t.Errorf("%q = %d, atteso %d", k, got[k], v)
				}
			}
		})
	}
}
```

```bash
go test ./... -race -cover
go vet ./...
go build -o bin/parole ./cmd/parole
GOOS=windows GOARCH=amd64 go build -o bin/parole.exe ./cmd/parole
./bin/parole -n 3 README.md
```

Nella CI usa `go test ./...` e `go vet ./...`: se aggiungi `golangci-lint run`, la copertura dei sottopacchetti compare senza configurazione extra.

## Esercizi

1. Aggiungi un benchmark `BenchmarkConta` con un testo generato di 10000 parole e misura KiB allocati per operazione.
2. Aggiungi l'opzione `-json` che stampa `{"distinte":N,"parole":[...]}` con `encoding/json`, senza cambiare il comportamento default.
3. Supporta `-` come nome file per leggere da stdin, riusando `os.Stdin` come `io.Reader`.
4. Aggiungi una funzione `ContaRighe` che ignora le righe che iniziano con `#`, con un test dedicato.
5. Rendi `Conta` robusta ai file più grandi di 64 KiB senza aumentare il buffer: quali alternative a `bufio.ScanWords` usano meno memoria?
6. Collega `parole` a un `context.Context` che interrompe il conteggio dopo un timeout e restituisci `context.DeadlineExceeded`.

<details>
<summary>Soluzione</summary>

1. `func BenchmarkConta(b *testing.B)` con `b.ReportAllocs()` e un testo costruito fuori dal ciclo; dentro, `Conta` con `b.N` iterazioni.

2. Aggiungi `jsonOut := flag.Bool("json", false, "...")`; a fine main serializza una struct con `json.Marshal` su stdout, così le pipeline restano compatibili.

3. Se `flag.Arg(0) == "-"`, usa `var r io.Reader = os.Stdin`; il resto non cambia.

4. `ContaRighe` usa `ScanLines` e chiama `Conta` solo sulle righe che non iniziano col prefisso; il test verifica che le righe `# nota` non compaiano.

5. `bufio.Reader.ReadString('\n')` consuma memoria proporzionale alla riga più lunga; in alternativa allarga `scanner.Buffer`.

6. Passa `ctx` a `ContaCtx` che controlla `ctx.Err()` ogni 1000 parole; la CLI crea `context.WithTimeout` e restituisce exit 1.

</details>

## Errori comuni

- **Ignorare `scanner.Err()`**: i file con righe lunghissime vengono letti a metà senza avvisi.
- **Aprire con `os.Open` senza `defer f.Close()`**: su molti file o processi lunghi finiscono i descrittori.
- **Ordinare una `map` direttamente**: le `map` non sono ordinate; copia in slice e ordina.
- **Usare `len()` su stringhe Unicode per la lunghezza minima**: `len` conta byte; usa `utf8.RuneCountInString`.
- **Test che leggono file reali**: usa `strings.NewReader` e tieni l'integrazione separata.

## In sintesi

- `io.Reader` e `bufio.Scanner` separano l'input dalla logica e rendono i test indipendenti dal filesystem.
- Le exit code distinguono uso errato, errore operativo e successo anche senza risultati.
- I table-driven test con `t.Run` danno diagnosi immediate.
- `GOOS`/`GOARCH` producono binari per altre piattaforme senza toolchain dedicate.

## Fonti

- [Go: Getting started](https://go.dev/doc/tutorial/getting-started)
- [Package testing](https://pkg.go.dev/testing)
- [Go: Managing dependencies](https://go.dev/doc/modules/managing-dependencies)
- [Go: Organizing a Go module](https://go.dev/doc/modules/layout)
