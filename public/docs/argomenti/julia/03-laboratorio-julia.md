In questo laboratorio costruisci `Misura`, un pacchetto Julia che calcola statistiche robuste su una colonna di misure e gestisce i dati mancanti senza propagare `missing` nella pipeline. È il primo passo tipico di un progetto di analisi dati: struttura semplice, API piccola, test eseguibili e una misura di prestazioni fatta nel modo giusto. Alla fine avrai un pacchetto con `Project.toml`, `src/` e `test/`, verificato da `Pkg.test()`.

## Obiettivi

- Separare il core di calcolo dalla CLI e farlo testare senza I/O.
- Gestire `missing` con `skipmissing` e tipi unione senza propagare valori vuoti.
- Progettare un'API con `struct` parametrica e metodi con dispatch multiplo.
- Leggere un file CSV semplice e produrre un report stabile.
- Misurare allocazioni e tempo con `@time`, `@allocated` e `@benchmark`.

## Il contratto di `Misura`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| input | CSV con una colonna `valore` | formato minimo, leggibile a mano |
| valori mancanti | celle vuote o `missing` | esclude dal calcolo, non blocca |
| statistiche | `n`, minima, mediana, massima | robuste rispetto agli outlier |
| output | righe `chiave\tvalore` | stabile per `awk` e test |
| exit 0 | file letto, anche vuoto | il vuoto è un risultato |
| exit 1 | file mancante o colonna assente | errore operativo |

I valori mancanti sono esclusi dal calcolo ma contati in `esclusi`: senza questa informazione il consumatore non distingue un dato pulito da uno pieno di buchi.

```bash
julia --project=. bin/misura.jl misure.csv
julia --project=. -e 'using Pkg; Pkg.instantiate(); Pkg.test()'
```

## Core: statistiche robuste

`Serie{T}` contiene i valori validi ed `esclusi` conta quelli scartati: ogni tipo concreto di `T` ottiene il proprio codice compilato, senza penalità di runtime.

```julia
# src/Misura.jl
module Misura
export Serie, costruisci, riepilogo

# Solo valori validi: il tipo T rende concreta la specializzazione
struct Serie{T<:Real}
    validi::Vector{T}
    esclusi::Int
end

# Costruisce la serie scartando missing e NaN, contandoli
function costruisci(::Type{T}, valori) where {T<:Real}
    validi = T[]
    esclusi = 0
    for v in valori
        if ismissing(v) || isnan(v)   # missing e NaN fuori dal calcolo
            esclusi += 1
        else
            push!(validi, convert(T, v))
        end
    end
    return Serie(validi, esclusi)     # costruttore parametrico inferito
end

# Statistiche tramite metodi sullo stesso nome
valori(s::Serie) = s.validi
mediana(s::Serie) = isempty(valori(s)) ? missing : Statistics.median(valori(s))
estremi(s::Serie) = isempty(valori(s)) ? (missing, missing) : extrema(valori(s))
end # module
```

`skipmissing` è l'alternativa idiomatica per un vettore `Union{Missing,T}`: `collect(skipmissing(v))` elimina i `missing` senza cicli espliciti, purché il tipo risultante resti concreto.

## Report e CLI

Il report usa `Printf` per colonne allineate e la CLI si limita a leggere il file e delegare al core. Le funzioni che producono testo ricevono un `IO`, così i test scrivono in un buffer invece che su stdout.

```julia
# Scrive il riepilogo su un qualunque IO: testabile con IOBuffer
function riepilogo(io::IO, s::Serie)
    lo, hi = estremi(s)
    @printf(io, "n\t%d\n", length(valori(s)))
    @printf(io, "esclusi\t%d\n", s.esclusi)
    @printf(io, "min\t%.3f\n", lo)
    @printf(io, "mediana\t%.3f\n", mediana(s))
    @printf(io, "max\t%.3f\n", hi)
end

io = IOBuffer()
riepilogo(io, costruisci(Float64, [1.0, missing, 3.0, 5.0]))
print(String(take!(io)))
```

I test confrontano l'output con una stringa attesa e scovano un cambio di formato prima che rompa gli script a valle, e l'uso di `@printf` esplicita il contratto del formato.

## Test, misura e ciclo di lavoro

I test coprono input normale, vuoto e tutto mancante. Le misure si fanno su funzioni già compilate: il primo `@time` include la JIT e non dice nulla sulle prestazioni.

```julia
# test/runtests.jl
using Test, Misura

@testset "costruzione" begin
    s = costruisci(Float64, [1.0, missing, 3.0])
    @test length(s.validi) == 2
    @test s.esclusi == 1
end

@testset "casi limite" begin
    @test mediana(costruisci(Float64, Float64[])) === missing
    @test isempty(costruisci(Int, [missing, missing]).validi)
end

@testset "report" begin
    io = IOBuffer()
    riepilogo(io, costruisci(Int, [4, 2, 6]))
    @test occursin("mediana\t4.000", String(take!(io)))
end
```

```julia
# misura fuori dai test: prima compilazione, poi benchmark ripetuto
dati = rand(100_000)
costruisci(Float64, dati)                 # riscaldamento della JIT
@allocated costruisci(Float64, dati)      # byte allocati per una singola call
```

Criterio di uscita: `julia --project=. bin/misura.jl file_inesistente.csv` esce con 1 e scrive su stderr, mentre un CSV vuoto stampa `n 0` ed esce con 0.

## Esercizi

1. Aggiungi un campo `totale` a `Serie` e la percentuale di esclusi nel report.
2. Gestisci `-` come nome file per leggere il CSV da stdin.
3. Aggiungi lo scarto interquartile con `Statistics.quantile` e un test.
4. Solleva `ArgumentError` se manca la colonna `valore` e trasformalo in exit 1.
5. Confronta `collect(skipmissing(v))` e un ciclo manuale con `sizehint!` sulle allocazioni.
6. Aggiungi `per_valore`, che stampa il valore più frequente.

<details>
<summary>Soluzione</summary>

1. `Serie{T}` diventa `struct Serie{T} validi::Vector{T}; esclusi::Int; totale::Int; end` e la percentuale è `100 * s.esclusi / s.totale`, stampata con `@printf` per un formato esplicito.

2. Se il nome è `-` si legge `read(stdin, String)` e si passa il testo al parser CSV, così il file assente resta un errore distinto con exit 1.

3. `Statistics.quantile(s.validi, [0.25, 0.75])` dà i due quartili: il test usa `≈` con `atol`, perché i valori sono floating point.

4. Se `"valore" ∉ header` si solleva `ArgumentError("colonna valore assente")`, e il punto di ingresso intercetta `ArgumentError` per uscire con 1.

5. Il ciclo manuale prealloca con `sizehint!` ed evita il vettore intermedio che `filter` crea; `collect(skipmissing)` fa due passaggi ma alloca una volta sola. Misura con `@allocated`.

6. Un `Dict{T,Int}` raccoglie le frequenze mentre si riempie `validi`; per l'output serve un ordinamento esplicito, perché le chiavi di un `Dict` non hanno ordine stabile.

</details>

## Errori comuni

- **Convertire `missing` in `Float64` senza filtro**: `convert(Float64, missing)` fallisce alla prima cella vuota.
- **Usare `@time` come benchmark**: la prima esecuzione include la JIT e il risultato non misura l'algoritmo.
- **Restituire `Any` da una statistica**: un ramo restituisce `missing`, l'altro un `Float64`, e il tipo instabile rallenta ogni uso.
- **Scrivere su `stdout` nel core**: l'output diventa non testabile e mescola dati e diagnostica nella stessa pipeline.
- **Assumere l'ordine di un `Dict`**: le chiavi non sono ordinate e report non deterministici rompono i test di formato.

## In sintesi

`Misura` applica il ciclo Julia a un problema reale: tipo parametrico concreto, funzioni pure che prendono `IO`, gestione esplicita di `missing` e test che fissano il formato. La CLI resta sottile e l'errore operativo diventa un codice documentato; la misura arriva per ultima, dopo il riscaldamento della JIT.

## Fonti

- [Pkg documentation: creare un pacchetto — https://pkgdocs.julialang.org/v1/creating-packages/](https://pkgdocs.julialang.org/v1/creating-packages/)
- [Julia stdlib: Test, @testset e @test_throws — https://docs.julialang.org/en/v1/stdlib/Test/](https://docs.julialang.org/en/v1/stdlib/Test/)
- [Julia Manual: code loading e struttura dei pacchetti — https://docs.julialang.org/en/v1/manual/code-loading/](https://docs.julialang.org/en/v1/manual/code-loading/)
- [Julia Manual: command-line interface — https://docs.julialang.org/en/v1/manual/command-line-interface/](https://docs.julialang.org/en/v1/manual/command-line-interface/)
- [Julia Manual: Performance Tips — https://docs.julialang.org/en/v1/manual/performance-tips/](https://docs.julialang.org/en/v1/manual/performance-tips/)
