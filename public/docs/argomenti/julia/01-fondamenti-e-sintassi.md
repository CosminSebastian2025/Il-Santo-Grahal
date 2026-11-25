Julia è un linguaggio dinamico pensato per il calcolo numerico e scientifico, nato nel 2012 per risolvere il dilemma tra linguaggi veloci ma scomodi (C, Fortran) e linguaggi comodi ma lenti (Python, R). Il trucco è il tipo di dispatch multiplo combinato con la compilazione just-in-time: il codice genericamente scritto viene specializzato per i tipi concreti al primo uso e gira con prestazioni vicine a quelle del C. In questa lezione impari la sintassi, il sistema dei tipi e i meccanismi che rendono il linguaggio espressivo e performante.

## Obiettivi

- Scrivere funzioni con assegnazione multipla e argomenti posizionali o con nome.
- Padroneggiare vettori, matrici e `broadcast` con il punto davanti agli operatori.
- Usare le strutture composite con `struct` e i metodi con dispatch multiplo.
- Gestire i tipi unione e il caso `missing` con `Union`, `ismissing` e `missing`.
- Usare macro come `@time` e `@show` per ispezionare il codice.

## Funzioni e sintassi essenziale

Una funzione si dichiara con `function`, si chiude con `end` e restituisce l'ultima espressione valutata. L'assegnazione multipla `a, b = b, a` è idiomatica, e i nomi che finiscono con `!` indicano funzioni che modificano i loro argomenti: è una convenzione rispettata dalla libreria standard.

```julia
# Ritorna una tupla: due valori in uscita, ordine fissato
function minmax_vettore(v)
    minimo, massimo = extrema(v)
    return (minimo, massimo)
end

# Il punto esclamativo segnala una mutazione in place
function normalizza!(v)
    s = maximum(abs, v)          # massimo del valore assoluto
    s == 0 && return v           # short-circuit: seconda espressione è il return
    v ./= s                      # divisione elementwise, modifica v
    return v
end

dati = [3.0, -1.0, 4.0]
lo, hi = minmax_vettore(dati)
println((lo, hi))
normalizza!(dati)
println(dati)                    # [0.75, -0.25, 1.0]
```

Non ci sono classi e non ci sono metodi legati ai tipi: le funzioni sono generiche e il tipo degli argomenti decide quale implementazione viene scelta.

| Concetto | Julia | Nota |
| --- | --- | --- |
| funzione anonima | `x -> x^2` | usata in `map`, `filter` |
| espressione condizionale | `x > 0 ? a : b` | nessun `if` come valore |
| assegnazione multipla | `a, b = f()` | destructuring di tuple |
| intervallo | `1:10`, `1:2:9` | tipo `UnitRange`, non un vettore |
| mutazione | `push!(v, x)` | `!` per convenzione |
| concatenazione | `[v; w]` | verticale, come matrice |

## Vettori, matrici e broadcast

Un vettore è una `Vector{T}`, la sua dimensione non fa parte del tipo, e si indicizza da 1. Le operazioni elemento per elemento si ottengono con la già citata sintassi `broadcast`, cioè applicando un punto all'operatore o alla funzione: `x .^ 2`, `sin.(v)`, `a .+ b`.

```julia
misure = [1.0 2.0; 3.0 4.0]      # matrice 2x2, spazio separa le colonne
v = [10, 20]

# broadcast: il vettore colonna si estende sulle righe della matrice
scalata = misure .+ v            # ogni riga sommata dell'elemento corrispondente
println(size(scalata))           # (2, 2)
println(misure[2, 1])            # indici riga, colonna

# slice e viste: @view evita la copia
colonna = @view misure[:, 2]
println(colonna[1])
misure[2, 2] = 0.0               # modifica la matrice originale
```

L'indicizzazione `misure[:, 2]` copia, mentre `@view misure[:, 2]` crea una vista senza allocare: in cicli caldi la differenza è sensibile, e `@allocated` o `@time` lo mostrano.

## Struct e dispatch multiplo

Le strutture composite si dichiarano con `struct`, sono immutabili per default e possono essere parametriche con `{T}`. Il dispatch multiplo sceglie il metodo in base al tipo di tutti gli argomenti, non solo del primo come nella programmazione a oggetti classica.

```julia
abstract type Forma end

struct Rettangolo <: Forma
    base::Float64
    altezza::Float64
end

struct Cerchio <: Forma
    raggio::Float64
end

# Stesso nome, metodi distinti per tipo
area(f::Rettangolo) = f.base * f.altezza
area(f::Cerchio) = π * f.raggio^2

# Metodo generico su qualsiasi sottotipo di Forma
perimetro(f::Rettangolo) = 2 * (f.base + f.altezza)

println(area(Cerchio(1.0)))
println(sum(area, [Rettangolo(2, 3), Cerchio(1.0)]))
```

Il parametro di tipo viene inferito alla costruzione, e una `struct` immutabile con campi concreti permette al compilatore di generare codice efficiente quanto quello del C. Per modificare i campi serve `mutable struct`.

## Valori mancanti, unioni e introspezione

Julia distingue l'assenza di valore (`nothing`) dal dato mancante (`missing`). I tipi unione, `Union{Int,Missing}`, permettono di dichiarare che un campo può essere di uno o dell'altro, e `isnothing` o `ismissing` sono i test corretti. Le macro, invocate con `@`, ricevono il codice prima che venga valutato.

```julia
function media(valori)
    if any(ismissing, valori)
        return missing
    end
    return sum(valori) / length(valori)
end

println(media([1.0, 2.0, 3.0]))     # 2.0
println(media([1.0, missing]))      # missing

@time media(rand(10_000_000))       # tempo e allocazioni della call
x = 21
@show x, x * 2                      # stampa codice e valore
```

Tra i tipi più utili c'è `Union`: un'assegnazione con `x::Union{Nothing,Int} = nothing` descrive esattamente il contratto e rende leggibile il codice, senza bisogno di tipi opzionali separati.

## Errori comuni

- **Usare `if` invece del ternario in un'assegnazione**: in Julia `if` è un'istruzione; per un valore si usa `x > 0 ? a : b`.
- **Scrivere `a + b` tra vettori**: senza il punto il tentativo è somma matriciale e produce un errore di dimensioni; l'operazione elementwise è `a .+ b`.
- **Modificare un campo di una `struct` immutabile**: senza `mutable struct` l'assegnazione è un errore; mutabilità e identificazione vanno dichiarate.
- **Usare `==` con `missing`**: il risultato è `missing`, non `false`; per i filtri servono `ismissing` o `coalesce`.
- **Iterare con indici di lunghezza fissa su una collezione mutata**: `eachindex(v)` è più sicuro di `1:length(v)` quando `v` cambia.

## In sintesi

Julia unisce sintassi dinamica, tipi opzionali e compilazione just-in-time per avere velocità e flessibilità. Le funzioni sono generiche, la mutazione si segnala con `!` e il broadcast applica operazioni a ogni elemento. `struct` con parametri e dispatch multiplo sostituiscono la gerarchia di classi, mentre `Union` indica i valori che possono mancare. Con queste basi il resto dell'ecosistema, da `Base` a `LinearAlgebra`, diventa leggibile.

## Fonti

- [Documentazione ufficiale di Julia — https://docs.julialang.org/en/v1/](https://docs.julialang.org/en/v1/)
- [Julia Manual: Functions — https://docs.julialang.org/en/v1/manual/functions/](https://docs.julialang.org/en/v1/manual/functions/)
- [Julia Manual: Types — https://docs.julialang.org/en/v1/manual/types/](https://docs.julialang.org/en/v1/manual/types/)
- [Julia Manual: Methods, dispatch multiplo — https://docs.julialang.org/en/v1/manual/methods/](https://docs.julialang.org/en/v1/manual/methods/)
- [Julia Manual: Mathematical Operations and Elementary Functions — https://docs.julialang.org/en/v1/manual/mathematical-operations/](https://docs.julialang.org/en/v1/manual/mathematical-operations/)
