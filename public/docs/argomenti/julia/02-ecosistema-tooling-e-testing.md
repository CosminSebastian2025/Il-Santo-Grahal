Julia separa drasticamente il mondo dello sviluppo da quello della distribuzione: durante lo sviluppo di un pacchetto conviene un ambiente dedicato, in produzione si parte spesso da un progetto con `Project.toml` e `Manifest.toml` bloccati. Intorno al linguaggio c'è un ecosistema coerente — `Pkg` per le dipendenze, `Test` nel core, `BenchmarkTools` per le misure e `Profile` e `InteractiveUtils` per capire dove va il tempo — che rende il ciclo «scrivi, verifica, misura» ripetibile. In questa lezione impari come è organizzato e come usarlo su un pacchetto reale.

## Obiettivi

- Creare un ambiente di progetto con `Pkg` e fissare le dipendenze in `Project.toml`.
- Scrivere test con `Test` e `@testset` eseguibili da riga di comando.
- Strutturare un pacchetto con `src/` e `test/` e il `Project.toml` giusto.
- Ispezionare tipi e metodi con le funzioni di `InteractiveUtils`.
- Misurare prestazioni e allocazioni con macro e profiling di base.

## Pkg: ambienti, progetti e dipendenze

`Project.toml` descrive un progetto: nome, UUID, versione e dipendenze dirette con i relativi compatibili. `Manifest.toml` fissa invece l'intera risoluzione, incluse le dipendenze transitive, e va committato per rendere gli ambienti riproducibili. `Pkg.activate`, `Pkg.add` e `Pkg.instantiate` sono i tre verbi che coprono quasi tutto il lavoro quotidiano.

| Comando | Effetto | File toccati |
| --- | --- | --- |
| `Pkg.activate(".")` | usa il progetto della cartella corrente | nessuno |
| `Pkg.generate("MioPkg")` | crea la struttura di un pacchetto | `Project.toml`, `src/` |
| `Pkg.add("DataFrames")` | aggiunge una dipendenza | `Project.toml`, `Manifest.toml` |
| `Pkg.instantiate()` | installa esattamente il manifest | usa `Manifest.toml` |
| `Pkg.status()` | mostra dipendenze e versioni | nessuno |

```julia
# Sessione di sviluppo: ambiente dedicato al progetto
using Pkg
Pkg.activate(".")            # usa il Project.toml della cartella come ambiente
Pkg.add("Statistics")        # statlib: entra nelle dipendenze del progetto
Pkg.instantiate()            # scarica le versioni fissate dal Manifest
Pkg.status()                 # riepilogo di ciò che è attivo

# La REPL ha un modo comodo: il tasto ] entra nella modalità pkg
# pkg> status
```

La modalità `pkg` della REPL è un prompt speciale: si esce con backspace e si possono eseguire gli stessi comandi di `Pkg`. In CI conviene `Pkg.instantiate()` seguito da `Pkg.test()` perché il manifest è l'unica fonte di verità sulle versioni.

## Struttura di un pacchetto e test

Un pacchetto Julia è una cartella con `Project.toml` all'inizio, `src/NomePacchetto.jl` come entry point e una sottocartella `test/` con `runtests.jl`, che è lo script eseguito da `Pkg.test`. Il UUID nel `Project.toml` identifica il pacchetto e non va inventato a mano: `Pkg.generate` lo assegna.

```julia
# src/Statistica.jl: entry point del pacchetto
module Statistica

export media, mediana

# media aritmetica su una collezione non vuota
function media(v)
    isempty(v) && throw(ArgumentError("collezione vuota"))
    return sum(v) / length(v)
end

# mediana: ordina una copia per non mutare l'input
function mediana(v)
    s = sort(v)
    n = length(s)
    isodd(n) ? s[(n + 1) ÷ 2] : (s[n ÷ 2] + s[n ÷ 2 + 1]) / 2
end

end # module
```

Il test si scrive con `@testset`: ogni gruppo è una sezione con riepilogo, `@test` confronta un valore o un'eccezione, e `@test_throws` verifica il contratto di errore. Il codice di uscita è diverso da zero se qualcosa fallisce, quindi `Pkg.test()` si incastra in una pipeline.

```julia
# test/runtests.jl
using Test, Statistica

@testset "media e mediana" begin
    @test media([1, 2, 3]) == 2.0
    @test mediana([3, 1, 2]) == 2
    @test mediana([4, 1, 3, 2]) == 2.5
end

@testset "errori" begin
    @test_throws ArgumentError media(Int[])
end
```

## Introspezione del codice

`InteractiveUtils` fornisce gli strumenti per capire cosa sta facendo il compilatore: `methods` elenca le implementazioni di una funzione, `@which` dice quale metodo verrebbe chiamato, `@code_warntype` mostra i tipi inferiti e `@code_llvm` il codice generato.

```julia
using InteractiveUtils

f(x::Int) = x + 1
f(x::AbstractString) = length(x)

methods(f)           # elenca i due metodi definiti
@which f(1.0)        # il metodo generico applicato
@code_warntype f(3)  # sottolinea i tipi instabili, in scala di colore
@code_llvm f(3)      # codice LLVM generato per lo specifico tipo
```

Il caso classico da cercare è la «type instability»: se una funzione restituisce `Any` perché il tipo dipende da un ramo, il compilatore perde la specializzazione e le prestazioni crollano.

## Misurare e ottimizzare

`@time` stampa tempo e allocazioni di un'espressione, `@allocated` restituisce solo i byte, e `@benchmark` di BenchmarkTools ripete la misura per ridurre il rumore. Il profiling campiona lo stack e indica le funzioni che occupano il tempo, spesso diverse da quelle che sembrano costose a occhio.

```julia
using BenchmarkTools

vettore = rand(10_000)

@time sum(vettore)
@allocated sum(vettore)

# BenchmarkTools riporta min, mediana e allocazioni per iterazione
bench = @benchmark sum($vettore)  # $vettore non è misurato nell'overhead di setup
@show minimum(bench).time   # tempo minimo in nanosecondi

# Profiling: campiona 1000 volte e indica le funzioni calde
@profile sum(vettore)
```

Una regola pratica: prima di ottimizzare, verificare che il codice sia tipo stabile; dopo, misurare con `@benchmark` e non con un singolo `@time`, che include la compilazione al primo uso.

## Errori comuni

- **Commesso un `Manifest.toml` con percorsi locali**: il manifest è portabile, ma se le versioni di Julia divergono va rigenerato con `Pkg.instantiate()` sull'ambiente di destinazione.
- **`using` dentro una funzione**: le dipendenze si caricano a livello di modulo, altrimenti compilazione e ambiente non sono riproducibili.
- **Trascurare i test di errore**: senza un caso su `media(Int[])` il contratto di eccezione resta implicito e non verificato.
- **Misurare con `@time` la prima call**: il tempo include la compilazione del metodo, quindi la misura è dominata dalla latenza della JIT.
- **Usare `methods(f)` per decidere il dispatch a runtime**: è uno strumento diagnostico, non una sostituzione del dispatch, e influisce negativamente sul codice generato.

## In sintesi

L'ecosistema Julia ruota attorno a `Pkg` e ai tre file che rendono un ambiente riproducibile: `Project.toml`, `Manifest.toml` e il UUID del pacchetto. `Test` e `@testset` danno un contratto eseguibile dal terminale, `InteractiveUtils` permette di ispezionare tipi e metodi, `BenchmarkTools` e `Profile` misurano il comportamento. La sequenza che funziona è sempre la stessa: ambiente attivato, istanza riproducibile, test verdi, misura solo dopo la stabilità dei tipi.

## Fonti

- [Julia Manual: Code Loading, ambienti e pacchetti — https://docs.julialang.org/en/v1/manual/code-loading/](https://docs.julialang.org/en/v1/manual/code-loading/)
- [Pkg documentation: gestione di ambienti — https://pkgdocs.julialang.org/v1/environments/](https://pkgdocs.julialang.org/v1/environments/)
- [Pkg documentation: creare un pacchetto — https://pkgdocs.julialang.org/v1/creating-packages/](https://pkgdocs.julialang.org/v1/creating-packages/)
- [Julia stdlib: InteractiveUtils — https://docs.julialang.org/en/v1/stdlib/InteractiveUtils/](https://docs.julialang.org/en/v1/stdlib/InteractiveUtils/)
- [Julia Manual: Performance Tips — https://docs.julialang.org/en/v1/manual/performance-tips/](https://docs.julialang.org/en/v1/manual/performance-tips/)
