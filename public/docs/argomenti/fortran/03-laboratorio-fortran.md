Un laboratorio numerico mette alla prova due cose insieme: la correttezza dell'algoritmo e la disciplina del compilatore. In questo laboratorio costruisci `statistiche`, un programma Fortran che legge una serie di valori da un file, calcola media, deviazione standard e mediana, e verifica i risultati con un test driver di `fpm`. Il codice usa moduli, procedure pure e array dinamici, cioè gli strumenti del Fortran moderno.

## Obiettivi

- Organizzare il progetto con `fpm` e separare libreria, eseguibile e test.
- Leggere un file di dati con gestione esplicita degli errori.
- Calcolare statistiche con array dinamici e procedure pure.
- Scrivere un test driver che verifica valori con tolleranze.
- Compilare in modalità severa e correggere i warning.

## Il contratto del programma

Il programma accetta un solo argomento: il percorso del file di dati, con un valore reale per riga. L'output è leggibile a occhio e prevedibile, così il test può confrontarlo.

| Condizione | Comportamento | Exit code |
| --- | --- | --- |
| file presente e valido | stampa `n`, media, dev. std. e mediana | 0 |
| argomento mancante | messaggio d'uso su stderr | 2 |
| file assente o vuoto | messaggio d'errore su stderr | 1 |
| valore non numerico | errore con numero di riga | 1 |

```fortran
program main
  use statistiche, only: serie, carica, media, deviazione, mediana
  use iso_fortran_env, only: real64, error_unit
  implicit none
  type(serie) :: dati
  character(len=256) :: percorso
  integer :: nargs, ierr

  nargs = command_argument_count()
  if (nargs /= 1) then
     write (error_unit, '(a)') "uso: statistiche FILE"
     error stop 2
  end if
  call get_command_argument(1, percorso)
  call carica(trim(percorso), dati, ierr)
  if (ierr /= 0) then
     write (error_unit, '(a,a)') "statistiche: errore di lettura ", trim(percorso)
     error stop 1
  end if
  print '(a,i0)', "n = ", size(dati%valori)
  print '(a,f10.4)', "media = ", media(dati)
  print '(a,f10.4)', "dev.st = ", deviazione(dati)
  print '(a,f10.4)', "mediana = ", mediana(dati)
end program main
```

`error stop 2` è la scelta giusta per l'uso errato: il programma non conosce i dettagli del calcolo, solo il modulo, e vive in `app/main.f90`.

```fortran
program test_statistiche
  use statistiche, only: serie, media, deviazione
  use iso_fortran_env, only: real64
  implicit none
  type(serie) :: dati
  dati%valori = [1.0_real64, 2.0_real64, 3.0_real64, 4.0_real64]
  call check(media(dati), 2.5_real64, "media")
  call check(deviazione(dati), 1.29099_real64, "deviazione")
contains
  subroutine check(o, a, nome)
    real(real64), intent(in) :: o, a
    character(len=*), intent(in) :: nome
    if (abs(o - a) > 1.0e-4_real64) then
       print *, "FALLITO: ", nome, o, a
       error stop 1
    end if
  end subroutine check
end program test_statistiche
```

## Il modulo con allocazione dinamica

Il tipo derivato `serie` contiene un array allocabile, riempito solo dopo aver contato le righe valide: è il pattern standard per dati di dimensione ignota.

```fortran
module statistiche
  use iso_fortran_env, only: real64
  implicit none
  private
  public :: serie, carica, media, deviazione, mediana
  type :: serie
     real(real64), allocatable :: valori(:)
  end type serie
contains
  subroutine carica(percorso, dati, ierr)
    character(len=*), intent(in) :: percorso
    type(serie), intent(out) :: dati
    integer, intent(out) :: ierr
    real(real64) :: x
    integer :: unita, ios, n

    ierr = 0
    open (newunit=unita, file=percorso, status="old", action="read", iostat=ios)
    if (ios /= 0) then; ierr = 1; return; end if
    rewind (unita)
    n = 0
    do
       read (unita, *, iostat=ios) x
       if (ios /= 0) exit        ! EOF o riga malformata
       n = n + 1
    end do
    allocate (dati%valori(n))
    rewind (unita)
    read (unita, *) dati%valori  ! lettura vettoriale: stream di valori
    close (unita)
  end subroutine carica

  pure real(real64) function media(dati) result(m)
    type(serie), intent(in) :: dati
    m = sum(dati%valori) / real(size(dati%valori), real64)
  end function media

  pure real(real64) function deviazione(dati) result(s)
    type(serie), intent(in) :: dati
    real(real64) :: m
    m = media(dati)
    s = sqrt(sum((dati%valori - m)**2) / real(size(dati%valori) - 1, real64))
  end function deviazione
end module statistiche
```

`newunit=` restituisce un'unità I/O libera, quindi non ci sono collisioni con i numeri 5 e 6. `iostat=` cattura l'errore senza far terminare il processo, e `intent(out)` svuota `dati%valori` all'ingresso. La funzione `mediana`, da completare, deve copiare i valori, ordinarli e prendere l'elemento centrale, o la media dei due centrali con `n` pari.

Con `fpm test` il driver verifica i valori con una tolleranza: copri sia un caso dispari sia uno pari, perché la mediana ha due formule. `-ffpe-trap=invalid` trasforma un NaN silenzioso in un errore immediato, decisivo quando una radice quadrata riceve un numero negativo.

```bash
fpm new statistiche --lib --test
printf '1.0\n2.0\n3.0\n4.0\n10.0\n' > dati.txt
fpm build --flag "-Wall -Wextra -fcheck=all -ffpe-trap=invalid"
fpm run -- dati.txt
fpm test
```

## Esercizi

1. Completa la funzione `mediana` per `n` dispari e pari, usando una copia ordinata dell'array.
2. Distingui "fine file" da "riga malformata" in `carica` e restituisci `ierr=2` per un valore non numerico.
3. Gestisci il file vuoto: stampa un errore su stderr ed esci con 1.
4. Calcola anche la varianza popolazione e campionaria in un'unica funzione con un argomento `logical`.
5. Aggiungi un'opzione `--csv` che stampi una riga `n,media,dev,mediana` senza spazi.
6. Verifica che `media` e `deviazione` siano accettate come argomento di `pure` e spiega perché la lettura include I/O e quindi non può essere `pure`.

<details>
<summary>Soluzione</summary>

1. Copia con `copia = dati%valori`, ordina con `call sort(copia)` da `stdlib_sorting`, poi `if (mod(n,2) == 1) then; m = copia(n/2+1); else; m = 0.5*(copia(n/2)+copia(n/2+1)); end if`.

2. Con `iostat=ios` e `iomsg=msg`: se `is_iostat_end(ios)` è vero si esce dal ciclo, altrimenti si segna `ierr=2` e si continua a leggere. Serve `use iso_fortran_env, only: iostat_end` oppure l'intrinseca `is_iostat_end`.

3. Al termine della prima scansione, se `n == 0` allora `deallocate` non serve, si restituisce `ierr=3` e il programma principale stampa l'errore e chiama `error stop 1`.

4. `pure function varianza(dati, campionaria) result(v)` divide per `n` o per `n-1`; `deviazione` diventa `sqrt(varianza(dati, .true.))`.

5. Con `get_command_argument` si esamina ogni argomento; con `print '(i0,a,f0.4,a,f0.4,a,f0.4)', n, ",", ...` si ottiene la riga CSV.

6. Fortran 2008 permette funzioni `pure` con argomenti di tipo derivato allocabile in ingresso; le istruzioni di I/O come `read` e `open` non sono ammesse in una procedura `pure`, quindi `carica` resta `subroutine` non `pure`.

</details>

## Errori comuni

- **Usare `unit=6` o `unit=5` invece di `newunit=`**: i numeri fissi collidono con aperture annidate e producono errori I/O confusi.
- **Non riavvolgere il file con `rewind`**: la seconda `read` parte dopo la fine e l'array resta pieno di valori non inizializzati.
- **Leggere in un array non allocato**: la `read` vettoriale su allocabile vuoto non assegna nulla; alloca sempre prima dell'operazione.
- **Dividere per `n` invece di `n-1` senza dirlo**: la deviazione campionaria su una sola osservazione divide per zero e genera `Infinity` o NaN.
- **Testare con `==` sui reali**: usa tolleranze, altrimenti il test fallisce anche con simboli matematicamente corretti.

## In sintesi

Il laboratorio mostra il ciclo completo: contratto, lettura con errori espliciti, calcolo con procedure pure e verifica con test a tolleranza. L'allocazione dinamica e `newunit` eliminano due fonti classiche di bug I/O. Il compilatore con `-fcheck=all` e `-ffpe-trap` diventa un collaboratore, non solo un traduttore.

## Fonti

- [Fortran-lang, Quickstart: organizzare il codice in moduli](https://fortran-lang.org/learn/quickstart/organising_code/)
- [Fortran-lang, Quickstart: array e stringhe](https://fortran-lang.org/learn/quickstart/arrays_strings/)
- [Fortran Package Manager, comandi di build e test](https://fpm.fortran-lang.org/)
- [GNU Fortran, opzioni di controllo degli errori a runtime](https://gcc.gnu.org/onlinedocs/gfortran/)
