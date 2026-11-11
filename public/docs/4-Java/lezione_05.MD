# Lezione 5: Array e metodi

Un array contiene molti valori dello stesso tipo. Un metodo racchiude un blocco di codice con un nome. Insieme permettono di trattare dati e di non ripetere la stessa logica.

### Creare e usare un array

```java
int[] voti = new int[5];

voti[0] = 7;
voti[1] = 8;
voti[2] = 6;
voti[3] = 9;
voti[4] = 10;

System.out.println(voti[0]);      // 7
System.out.println(voti.length);  // 5
```

Un array ha dimensione **fissa** decisa alla creazione. Gli indici vanno da `0` a `length - 1`: l'ultimo elemento è `voti[voti.length - 1]`.

Inizializzazione con valori:

```java
int[] numeri = {3, 8, 1, 10, 5};
String[] nomi = {"Anna", "Luca", "Sara"};
```

Scorrere un array:

```java
for (int i = 0; i < numeri.length; i++) {
    System.out.println(numeri[i]);
}

for (int n : numeri) {
    System.out.println(n);
}
```

Il `for` classico serve quando ti interessa l'indice; il `for-each` (`for (int n : numeri)`) è più leggibile quando ti serve solo il valore. Il `for-each` non permette di modificare gli elementi.

Esempio con somma e massimo:

```java
int somma = 0;
int massimo = numeri[0];

for (int n : numeri) {
    somma += n;
    if (n > massimo) {
        massimo = n;
    }
}

double media = (double) somma / numeri.length;
System.out.println("Somma: " + somma);
System.out.println("Media: " + media);
System.out.println("Massimo: " + massimo);
```

Un indice fuori intervallo produce `ArrayIndexOutOfBoundsException`. Un array non inizializzato contiene `0`, `false` oppure `null`.

### Metodi

```java
tipoRestituito nome(parametri) {
    // istruzioni
    return valore;
}
```

```java
public class Calcoli {

    static int somma(int a, int b) {
        return a + b;
    }

    static void saluta(String nome) {
        System.out.println("Ciao " + nome);
    }

    public static void main(String[] args) {
        int risultato = somma(3, 4);
        System.out.println(risultato);   // 7
        saluta("Anna");                  // Ciao Anna
    }
}
```

- `int` è il tipo restituito; `void` significa nessun valore.
- `a` e `b` sono i **parametri**; `3` e `4` sono gli **argomenti**.
- I parametri sono copie: modificare `a` dentro il metodo non cambia la variabile del chiamante.
- Un metodo `void` può usare `return;` per uscire prima.
- Il metodo deve essere dichiarato prima dell'uso oppure nella stessa classe: qui è `static` perché lo chiamiamo da un `main` statico.

Un metodo che restituisce un `boolean`:

```java
static boolean pari(int n) {
    return n % 2 == 0;
}
```

```java
if (pari(10)) {
    System.out.println("Pari");
}
```

### Overload

Due metodi possono avere lo stesso nome se cambiano i parametri:

```java
static int somma(int a, int b) {
    return a + b;
}

static double somma(double a, double b) {
    return a + b;
}

static int somma(int a, int b, int c) {
    return a + b + c;
}
```

Il compilatore sceglie la versione in base al numero e al tipo degli argomenti.

### Metodi e array

Passare un array a un metodo significa passare il **riferimento**: le modifiche agli elementi sono visibili anche fuori.

```java
static void raddoppia(int[] valori) {
    for (int i = 0; i < valori.length; i++) {
        valori[i] *= 2;
    }
}
```

```java
int[] numeri = {1, 2, 3};
raddoppia(numeri);
System.out.println(numeri[0]);   // 2
```

### Esempio completo

```java
public class Pagelle {

    static double media(int[] voti) {
        int somma = 0;
        for (int voto : voti) {
            somma += voto;
        }
        return (double) somma / voti.length;
    }

    static int massimo(int[] voti) {
        int massimo = voti[0];
        for (int voto : voti) {
            if (voto > massimo) {
                massimo = voto;
            }
        }
        return massimo;
    }

    static int contaInsufficienze(int[] voti) {
        int conteggio = 0;
        for (int voto : voti) {
            if (voto < 6) {
                conteggio++;
            }
        }
        return conteggio;
    }

    public static void main(String[] args) {
        int[] voti = {7, 5, 9, 4, 8};

        System.out.printf("Media: %.2f%n", media(voti));
        System.out.println("Massimo: " + massimo(voti));
        System.out.println("Insufficienze: " + contaInsufficienze(voti));
    }
}
```

Output:

```text
Media: 6.60
Massimo: 9
Insufficienze: 2
```

### Errori comuni

- Usare `voti.length()` invece di `voti.length`.
- Scorrere fino a `i <= voti.length`: l'ultimo indice valido è `length - 1`.
- Dimenticare il `return` in un metodo che restituisce un valore.
- Restituire un tipo diverso da quello dichiarato.
- Dichiarare il metodo dentro un altro metodo: i metodi stanno nella classe, uno accanto all'altro.
- Chiamare un metodo non statico da `main` senza creare un oggetto: qui tutti i metodi sono `static`; dalla lezione 6 useremo gli oggetti.
- Confondere "modificare il parametro" con "modificare l'array": il primo effetto è locale, il secondo no.

## Esercizi progressivi

**Esercizio 1.** Crea un array con 5 numeri, stampa tutti gli elementi e la loro somma.

**Esercizio 2.** Scrivi `static int massimo(int[] valori)` e usalo su un array di 6 numeri letti da tastiera.

**Esercizio 3.** Scrivi `static double media(int[] valori)` e stampala con due decimali. Se l'array è vuoto, restituisci `0`.

**Esercizio 4.** Scrivi `static int contaPari(int[] valori)` e stampa quanti elementi pari ci sono.

**Esercizio 5.** Scrivi `static boolean contiene(int[] valori, int cercato)` e stampalo per due valori diversi, uno presente e uno assente.

**Esercizio 6.** Scrivi `static int[] invertito(int[] valori)` che restituisce un nuovo array con gli elementi al contrario. Stampa il risultato.

**Esercizio 7.** Scrivi `static int indiceMassimo(int[] valori)` che restituisce la posizione del valore più grande.

**Esercizio 8.** Leggi `N` voti in un array, poi stampa media, massimo, minimo e quanti voti sono sopra la media.

**Esercizio 9.** Scrivi `static boolean ordinato(int[] valori)` che dice se l'array è crescente.

**Esercizio 10.** Scrivi `static String ripeti(String testo, int volte)` che restituisce il testo ripetuto, separato da uno spazio. Con `("java", 3)` restituisce `java java java`.

### Varianti

- Aggiungi `static int minimo(int[] valori)` e usalo nell'esercizio 8.
- Scrivi una seconda versione di `media` che accetta `int[]` e una che accetta `double[]` (overload).
- Scrivi `static void stampaVoti(int[] voti)` che stampa un voto per riga con la dicitura `sufficiente` o `insufficiente`.

## Progetti della fase 1

Con questi cinque progetti metti insieme tutto quello che hai imparato: variabili, input, condizioni, cicli, array e metodi. Scegli un progetto, finiscilo, poi passa al successivo.

### Progetto 1: Indovina il numero

Il computer sceglie un numero tra 1 e 100. L'utente prova a indovinarlo; il programma risponde `troppo alto`, `troppo basso` o `indovinato` e conta i tentativi. A fine partita chiede se giocare ancora.

Requisiti: `Random`, ciclo, contatore dei tentativi, input non numerico gestito, messaggio finale con il numero di tentativi.

### Progetto 2: Convertitore euro/dollari

Menu con tre voci: euro → dollari, dollari → euro, esci.

Requisiti: tasso di cambio in una costante `final`, importi negativi rifiutati, `switch` o `if` per la scelta, menu che si ripete con `do-while`, risultato con due decimali.

### Progetto 3: Calcolatrice con menu

Menu con somma, sottrazione, moltiplicazione, divisione e uscita.

Requisiti: un metodo separato per ogni operazione, `main` che legge i numeri e chiama il metodo, divisione per zero gestita senza far terminare il programma, opzione per continuare.

### Progetto 4: Media di voti

Chiedi quanti voti inserire, leggili in un array e stampa media, voto massimo e voto minimo.

Requisiti: uso di metodi separati, controllo se non ci sono voti (niente divisione per zero), stampa con due decimali, conteggio dei voti sopra la media.

### Progetto 5: Pari o dispari

Chiedi un numero e stampa `Pari` o `Dispari`; poi chiedi se controllarne un altro e continua finché la risposta è `s`.

Requisiti: metodo `static boolean isPari(int n)`, ciclo di ripetizione, input non numerico gestito.

### Criteri di verifica

- [ ] Il programma compila senza errori.
- [ ] Gli input non validi producono un messaggio, non un'eccezione non gestita.
- [ ] I metodi hanno nomi chiari e una sola responsabilità.
- [ ] Il menu si ripete finché l'utente non sceglie di uscire.
- [ ] Non ci sono cicli infiniti nei casi normali.
- [ ] Gli array non vengono mai letti oltre l'ultimo indice.

Nella fase 2 il programma smette di essere un elenco di istruzioni e diventa un insieme di oggetti che collaborano.
