Go è nato nel 2009 dentro Google per costruire servizi di rete compilati, veloci e facili da leggere da grandi team. Il design è volutamente minimalista: 25 parole chiave, un solo modo idiomatico per fare le cose e un garbage collector che toglie di mezzo la gestione manuale della memoria. In questa lezione vedi la sintassi di base, il sistema di tipi e il modello di compilazione ed esecuzione che rendono i binari Go portabili e rapidi da avviare.

## Obiettivi

- Scrivere un programma con variabili, funzioni con più valori di ritorno e `error`.
- Distinguere `var`, `:=`, tipi zero e conversioni esplicite.
- Usare `slice`, `map` e `struct`, sapendo quando passare per valore o per puntatore.
- Riconoscere il garbage collector e il suo impatto sui servizi.
- Descrivere il binario statico prodotto da `go build` e la cross-compilazione.

## Sintassi di base

Ogni file appartiene a un package; un programma eseguibile usa `package main` e una funzione `main`. Il blocco `import` raggruppa le dipendenze e `gofmt` normalizza indentazione e ordine degli import.

```go
package main

import (
	"fmt"
	"strings"
)

func main() { // parentesi graffa obbligatoria sulla stessa riga
	nome := "Ada" // := dichiara e assegna solo dentro una funzione
	var livello int // tipo zero: 0
	livello++
	fmt.Println(strings.ToUpper(nome), livello) // ADA 1
}
```

| Forma | Uso | Nota |
| --- | --- | --- |
| `var x int` | a livello di package o dentro funzioni | valore zero `0` |
| `x := 1` | solo dentro funzioni | tipo dedotto dal valore |
| `var a, b = 1, 2` | tuple di valori | tipi dedotti separatamente |
| `x = 3` | riassegnazione | richiede `x` già dichiarato |
| `const Max = 10` | costante non tipizzata | il tipo si decide all'uso |

Go non ha conversioni implicite tra tipi numerici: `int` e `int64` sono tipi diversi, quindi serve `int64(n)`. Variabili e import inutilizzati sono errori di compilazione, e questo costringe a mantenere il codice pulito.

## Funzioni, errori e defer

Le funzioni possono restituire più valori; il pattern idiomatico mette il risultato per ultimo e `error` come ultimo valore.

```go
func dividi(a, b float64) (float64, error) {
	if b == 0 {
		return 0, fmt.Errorf("divisione per zero")
	}
	return a / b, nil
}

func main() {
	q, err := dividi(10, 4)
	if err != nil {
		fmt.Println("errore:", err)
		return
	}
	fmt.Printf("%.2f\n", q) // 2.50
}
```

Gli errori si gestiscono esplicitamente: non esistono eccezioni e `errors.Is`/`errors.As` servono a confrontare errori incartati con `%w`. `defer` registra un'azione da eseguire all'uscita dalla funzione, nell'ordine inverso: è il modo idiomatico per chiudere file o rilasciare lock dopo `os.Open`.

## Struct, slice, map e puntatori

`struct` è il tipo composito usato per i dati; `slice` è una vista su un array con lunghezza e capacità; `map` è una tabella hash con chiavi di tipo confrontabile.

```go
type Utente struct {
	Nome  string
	Email string
	Admin bool
}

func main() {
	u := Utente{Nome: "Lea"}          // Email vuota, Admin false
	u.Admin = true                    // modifiche su una variabile
	utenti := map[string]*Utente{"lea": &u}
	utenti["lea"].Email = "lea@example.com"

	numeri := []int{1, 2, 3}
	numeri = append(numeri, 4)        // append può riallocare

	fmt.Println(u.Nome, len(numeri))
```

Passare una struct a una funzione copia il valore; per modificarla usa un puntatore (`*Utente`). Le slice condividono il backing array, quindi cambiare `s[0]` dentro una funzione si vede fuori, ma un `append` oltre la capacità può non esserlo.

## Modello di esecuzione

```bash
go env GOMODCACHE                 # dove finiscono i moduli scaricati
go run main.go                    # compila in una cartella temporanea ed esegue
go build -o app ./cmd/app         # produce un binario statico per la piattaforma
GOOS=linux GOARCH=arm64 go build  # cross-compilazione da qualsiasi host
go vet ./...                      # controlli statici suggeriti dalla toolchain
```

Il compilatore produce un binario nativo con runtime, scheduler e garbage collector: niente JVM né interprete, avvio in pochi millisecondi. Il GC è concorrente e non compatta la memoria, quindi può usare più RAM di un GC compattante; per questo esiste `GOGC`. L'escape analysis decide stack o heap, e per questo passare puntatori a piccole struct è spesso più costoso che copiarle.

## Errori comuni

- **Dimenticare il controllo di `err`**: il compilatore lo permette, il programma no; l'errore va sempre esaminato.
- **Usare `:=` al posto di `=` dentro un blocco**: dichiari una nuova variabile ombreggiando quella esterna.
- **Trattare gli errori come eccezioni**: `panic` serve per stati impossibili, non per input invalido.
- **Ignorare il costo della copia**: per struct grandi valuta un puntatore; misura prima.

## In sintesi

Go è un linguaggio compilato con sintassi piccola, tipi espliciti e zero-implicit-conversion. Le funzioni restituiscono `error` come ultimo valore e `defer` gestisce la pulizia. Struct, slice e map coprono i dati, con semantica di copia da tenere a mente. Il binario statico contiene runtime e GC, quindi l'avvio è immediato e il deploy è un solo file.

## Fonti

- [The Go Tour](https://go.dev/tour/)
- [Effective Go](https://go.dev/doc/effective_go)
- [The Go Programming Language Specification](https://go.dev/ref/spec)
