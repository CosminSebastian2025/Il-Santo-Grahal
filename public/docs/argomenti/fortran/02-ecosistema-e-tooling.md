Scrivere Fortran oggi significa lavorare con un ecosistema piccolo ma solido: un compilatore di riferimento (`gfortran`), un package manager ufficiale (`fpm`) e una libreria standard ricca di algoritmi. Il panorama è meno affollato di quello di Rust o JavaScript, ma è ben documentato e stabile. In questa lezione vedi come si struttura un progetto, come si testa e in quali domini il linguaggio resta la scelta migliore.

## Obiettivi

- Installare la toolchain e organizzare un progetto con `fpm`.
- Capire quali moduli offre la libreria standard `stdlib` e quando usarli.
- Scrivere test automatici con il test driver di `fpm` e con script shell.
- Integrare Fortran in un flusso Python o C tramite interfacce.
- Riconoscere i casi d'uso reali in cui Fortran è ancora imbattibile.

## Toolchain: compilatori, build e package manager

| Strumento | Ruolo | Comando |
| --- | --- | --- |
| `gfortran` | compilatore di riferimento GNU | `gfortran -O2 -Wall main.f90` |
| `fpm` | build e gestione dipendenze | `fpm run`, `fpm test`, `fpm build` |
| `lfortran` | compilatore moderno, REPL interattivo | `lfortran` in modalità interattiva |
| `flang-new` | frontend LLVM | `flang-new -O2 main.f90` |
| `fprettify` | formattazione del codice | `fprettify -i 3 src/` |

`ifx`, il compilatore Intel, resta diffuso in ambito HPC. Per un progetto nuovo `fpm` è la scelta standard: crea la struttura, compila nell'ordine delle dipendenze e gestisce i test.

```bash
fpm new calcolo --lib --test
fpm build && fpm test && fpm run
```

La struttura generata separa `src/` (codice di produzione), `app/` (eseguibili), `test/` (test driver) e `fpm.toml` (manifesto). Ogni modulo in `src/` si importa dai test con `use calcolo, only: ...`.

## Libreria standard e dipendenze

`stdlib` è la libreria standard della community, da aggiungere come dipendenza `fpm`, mentre `iso_fortran_env` e `iso_c_binding` sono moduli intrinseci del linguaggio.

```fortran
program usa_stdlib
  use stdlib_kinds, only: dp            ! alias portabile per real64
  use stdlib_sorting, only: sort
  use stdlib_strings, only: to_string
  implicit none
  real(dp) :: v(4) = [3.0_dp, 1.0_dp, 4.0_dp, 1.5_dp]
  call sort(v)
  print *, to_string(v)
end program usa_stdlib
```

Nel `fpm.toml` la dipendenza si dichiara con URL e revisione, quindi le build restano riproducibili. Per il codice C interfacciato da Fortran, `iso_c_binding` definisce tipi interoperabili (`c_double`, `c_int`), e `bind(C, name="...")` permette di chiamare funzioni C come se fossero Fortran.

```fortran
use, intrinsic :: iso_c_binding, only: c_int
interface
   function strlen_c(s) bind(C, name="strlen") result(n)
     import :: c_int
     character(kind=c_char) :: s(*)
     integer(c_int) :: n
   end function strlen_c
end interface
```

## Testing e qualità

Il framework di test più semplice è il test driver di `fpm`: un eseguibile in `test/` che chiama procedure con controlli espliciti e termina con codice diverso da zero in caso di fallimento.

```fortran
program test_geometria
  use geometria, only: area_cerchio
  implicit none
  call check(area_cerchio(1.0), 3.14159, "cerchio unitario")
contains
  subroutine check(ottenuto, atteso, nome)
    real, intent(in) :: ottenuto, atteso
    character(len=*), intent(in) :: nome
    if (abs(ottenuto - atteso) > 1.0e-4) then
       print *, "FALLITO: ", name
       error stop 1                        ! ferma il processo con exit code 1
    end if
  end subroutine check
end program test_geometria
```

Il pattern si estende con script shell per confrontare output golden-file con diff. Il compilatore offre controlli runtime: `-fcheck=all`, `-ffpe-trap=invalid,zero,overflow` per intercettare anomalie in virgola mobile e `-finit-real=snan` per riempire di NaN le variabili non inizializzate.

## Casi d'uso e integrazione

Fortran domina la meteorologia, la climatologia, la meccanica dei fluidi e la fisica delle particelle: codici come WRF e CESM e molti kernel BLAS/LAPACK hanno nucleo Fortran. Il vantaggio non è solo la velocità, ma l'aritmetica vettoriale leggibile e l'enorme patrimonio di codice verificato.

L'integrazione più comune è Python verso Fortran: `f2py` genera wrapper C dalla firma del codice Fortran, che poi chiami come una funzione NumPy.

```bash
python -m numpy.f2py -c -m geometria geometria.f90
python -c "import geometria; print(geometria.area_cerchio(2.0))"
```

Per progetti nuovi la regola è semplice: Fortran per il kernel numerico, Python o Julia per orchestrazione e visualizzazione. Evita di riscrivere in Fortran tool HTTP o gestione di rete: l'ecosistema non copre questi domini.

## Errori comuni

- **Gestire la build a mano con `gfortran` per decine di file**: gli ordini di compilazione dei moduli diventano fragili; usa `fpm`.
- **Importare routine C senza controllare i kind**: `double` C e `real` Fortran non hanno necessariamente la stessa precisione; usa `iso_c_binding`.
- **Test che confrontano reali con `==`**: gli errori di arrotondamento fanno fallire test corretti; usa tolleranze.
- **Ignorare la dipendenza dai file `.mod`**: un modulo cambiato invalida i dipendenti e compilazioni incrementali sbagliate restituiscono errori di link.
- **Trattare `lfortran` come compilatore di produzione**: è un progetto in sviluppo attivo e non copre ancora tutti i casi di Fortran 2018.

## In sintesi

L'ecosistema Fortran è composto da un compilatore maturo, un package manager ufficiale e una libreria standard in crescita. `fpm` più `stdlib` coprono struttura, dipendenze e algoritmi comuni, mentre i test driver con `error stop` e le opzioni di runtime del compilatore danno un controllo severo. La strada vincente è ibrida: Fortran per i kernel numerici, Python come livello di orchestrazione.

## Fonti

- [Fortran Package Manager, documentazione ufficiale](https://fpm.fortran-lang.org/)
- [Fortran-lang, pacchetti ufficiali e libreria standard](https://fortran-lang.org/packages/fpm/)
- [stdlib, documentazione della libreria standard Fortran](https://stdlib.fortran-lang.org/)
- [GNU Fortran, compilazione di più file e opzioni di debug](https://gcc.gnu.org/onlinedocs/gfortran/)
