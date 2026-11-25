Fortran è il più antico linguaggio di programmazione ancora in uso diffuso: nacque negli anni Cinquanta per il calcolo numerico e da allora si è evoluto più di quanto la sua fama suggerisca. Le versioni moderne (Fortran 2003, 2008, 2018 e la revisione 2023) offrono moduli, tipi derivati e array con operazioni vettoriali. In questa lezione impari la sintassi di base e il modello di esecuzione pensato per il calcolo scientifico.

## Obiettivi

- Riconoscere la struttura di un programma Fortran moderno e il ruolo di `implicit none`.
- Dichiarare variabili con kind espliciti e lavorare con gli array come operatori.
- Controllare il flusso con `if`, `select case` e costrutti `do` etichettati.
- Scrivere funzioni pure e subroutine, separando gli argomenti con `intent`.
- Compilare con `gfortran` e usare le opzioni di controllo durante lo sviluppo.

## Struttura di un programma

In free form (dal Fortran 90) ogni istruzione termina a fine riga e le colonne non contano più, a differenza del formato fisso.

```fortran
program saluto
  implicit none            ! nessuna variabile implicita: obbligatorio nei progetti seri
  integer :: i
  real, parameter :: pi = 3.141592653589793   ! costante, non modificabile
  character(len=*), parameter :: nome = "Grahal"

  do i = 1, 3
     print '(a,i0,a,f0.4)', trim(nome), " #", i, " pi=", pi
  end do
end program saluto
```

`implicit none` disattiva la regola storica per cui ogni nome che inizia per `I`–`N` era un intero: senza questa riga un refuso come `contat = 1` crea silenziosamente una variabile nuova.

## Tipi, kind e precisione

Fortran distingue tipi e **kind**: per i reali il kind indica la precisione, non una lunghezza in byte garantita. Il modo portabile per sceglierla è la costante di `iso_fortran_env`.

```fortran
program precisione
  use, intrinsic :: iso_fortran_env, only: real64, int64
  implicit none
  real(real64) :: massa
  integer(int64) :: conteggio
  complex(real64) :: z

  massa = 0.1_real64     ! il suffisso forza il kind corretto nel letterale
  z = (1.0_real64, -2.0_real64)
  print *, "massa=", massa, " z=", z
end program precisione
```

| Kind | Uso tipico | Attenzione |
| --- | --- | --- |
| `real32`, `real64` | calcolo numerico portabile | mai scrivere `real*8` |
| `int32`, `int64` | indici e contatori grandi | l'overflow non genera errori |
| `complex(real64)` | segnali, elettronica | dichiaralo con il kind |
| `logical` | flag `.true.` / `.false.` | non è un intero |

Gli operatori logici si scrivono con i punti (`.and.`, `.or.`, `.not.`) e il confronto sugli interi usa `==`; sui reali il confronto esatto è quasi sempre un errore.

## Array e do impliciti

L'array è un valore di prima classe: somme e funzioni elementari agiscono su tutti gli elementi. Gli indici partono da 1 per default, ma puoi cambiarli nella dichiarazione.

```fortran
program vettori
  implicit none
  integer, parameter :: n = 5
  real :: v(n), m(n, n)
  integer :: i

  v = [(real(i), i = 1, n)]          ! costruttore con do implicito
  m = reshape([(real(i), i = 1, n*n)], [n, n])
  print *, "somma", sum(v), "max", maxval(v)
  write (*, '(5f6.1)') (m(i, :), i = 1, 3)   ! tre righe intere
  where (v > 3.0) v = 0.0            ! assegnazione mascherata
end program vettori
```

`matmul` fa i prodotti matriciali, `dot_product` il prodotto scalare, `pack` e `merge` filtrano valori. Il ciclo esplicito serve solo quando la dipendenza tra iterazioni è reale.

## Flusso di controllo e procedure

Fortran permette di nominare i cicli, il che li rende leggibili dentro procedure lunghe.

```fortran
module geometria
  implicit none
  private                       ! tutto privato salvo ciò che si esporta
  public :: area_cerchio
contains
  pure real function area_cerchio(r) result(a)
    real, intent(in) :: r
    real :: a
    a = 3.141592653589793 * r * r
  end function area_cerchio
end module geometria

program usa_geometria
  use geometria, only: area_cerchio
  implicit none
  integer :: i
  outer: do i = 1, 10
     if (i == 6) exit outer     ! exita il ciclo nominato, non il più interno
  end do outer
  print *, area_cerchio(2.0)
end program usa_geometria
```

`exit nome` e `cycle nome` sostituiscono le etichette `goto` del Fortran 77. `intent(in)` promette che l'argomento non cambia, `pure` promette assenza di effetti collaterali e permette al compilatore di riordinare o parallelizzare le chiamate.

```bash
gfortran -Wall -Wextra -fcheck=all -O2 geometria.f90 usa_geometria.f90 -o usa_geometria
./usa_geometria
```

`-fcheck=all` intercetta accessi fuori range e argomenti non inizializzati: usalo sempre durante lo sviluppo.

## Errori comuni

- **Dimenticare `implicit none`**: un refuso diventa una variabile nuova e il calcolo restituisce valori sbagliati senza errori.
- **Usare `real*8` al posto di `real64`**: è un'estensione del compilatore, non portabile e non standard.
- **Confrontare reali con `==`**: l'aritmetica binaria rende quasi sempre falso il confronto; usa una tolleranza.
- **Omettere `intent`**: l'argomento può essere sovrascritto per caso e il compilatore non lo segnala.
- **Scrivere cicli espliciti su array**: perdi le forme vettoriali e il compilatore non può ottimizzare.

## In sintesi

Fortran moderno è un linguaggio forte e conciso: `implicit none`, kind espliciti e moduli separano il codice affidabile da quello fragile. Gli array sono valori con operatori propri, e `where`, `pack` e `matmul` coprono la maggior parte dei cicli numerici. Le procedure dichiarano `intent` e `pure`, così il compilatore conosce i contratti rigorosi.

## Fonti

- [Fortran-lang, Learn: introduzione al linguaggio moderno](https://fortran-lang.org/learn/)
- [Fortran-lang, Quickstart: programma principale e sintassi](https://fortran-lang.org/learn/quickstart/hello_world/)
- [Fortran-lang, Quickstart: variabili, kind e precisione](https://fortran-lang.org/learn/quickstart/variables/)
- [GNU Fortran, manuale di riferimento di gfortran](https://gcc.gnu.org/onlinedocs/gfortran/)
