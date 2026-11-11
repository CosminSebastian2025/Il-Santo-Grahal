# Lezione 6: Classi e oggetti

Una classe descrive un tipo di dato: quali informazioni contiene e quali operazioni sa fare. Un oggetto è una singola istanza di quella classe. Da qui in poi i programmi non sono più elenchi di istruzioni, ma oggetti che collaborano.

### La prima classe

```java
public class Contatto {

    String nome;
    String telefono;

    void stampa() {
        System.out.println(nome + " - " + telefono);
    }
}
```

- `nome` e `telefono` sono **campi** (o attributi): dati che ogni oggetto possiede.
- `stampa()` è un **metodo** dell'oggetto.
- La classe è solo lo stampo: non contiene ancora dati.

### Creare oggetti

```java
public class Main {
    public static void main(String[] args) {
        Contatto primo = new Contatto();
        primo.nome = "Anna";
        primo.telefono = "3331112222";

        Contatto secondo = new Contatto();
        secondo.nome = "Luca";
        secondo.telefono = "3339998888";

        primo.stampa();     // Anna - 3331112222
        secondo.stampa();   // Luca - 3339998888
    }
}
```

- `new Contatto()` crea un oggetto in memoria e restituisce il suo riferimento.
- `primo` non contiene l'oggetto: contiene il **riferimento** all'oggetto.
- Ogni oggetto ha i propri valori: modificare `primo.nome` non tocca `secondo`.
- L'operatore `.` accede ai campi e ai metodi.

```java
Contatto terzo = primo;
terzo.nome = "Sara";

System.out.println(primo.nome);   // Sara
```

`primo` e `terzo` puntano allo stesso oggetto: non è una copia.

### Metodi che usano i campi

```java
public class Rettangolo {

    double base;
    double altezza;

    double area() {
        return base * altezza;
    }

    double perimetro() {
        return 2 * (base + altezza);
    }

    boolean quadrato() {
        return base == altezza;
    }
}
```

```java
Rettangolo r = new Rettangolo();
r.base = 4;
r.altezza = 3;

System.out.println(r.area());        // 12.0
System.out.println(r.perimetro());   // 14.0
System.out.println(r.quadrato());    // false
```

Dentro i metodi si usano i campi direttamente, senza `.` e senza parametri.

### toString

`System.out.println(oggetto)` chiama automaticamente `toString()`. Se non lo scrivi, ottieni qualcosa come `Contatto@1b6d3586`.

```java
public class Contatto {

    String nome;
    String telefono;

    @Override
    public String toString() {
        return nome + " (" + telefono + ")";
    }
}
```

```java
System.out.println(primo);   // Anna (3331112222)
```

`@Override` segnala al compilatore che stai sovrascrivendo un metodo esistente: se sbagli il nome, il compilatore te lo dice.

### Array e liste di oggetti

```java
Contatto[] rubrica = new Contatto[2];
rubrica[0] = primo;
rubrica[1] = secondo;

for (Contatto c : rubrica) {
    System.out.println(c);
}
```

Un array di oggetti appena creato contiene `null` in ogni posizione: va riempito prima di usarlo.

### Oggetti e metodi statici

Un metodo statico appartiene alla classe e non a un oggetto; un metodo normale appartiene all'oggetto e può leggere i suoi campi.

```java
public class Contatore {

    int valore = 0;              // un valore per ogni oggetto

    void incrementa() {          // metodo dell'oggetto
        valore++;
    }

    static int doppio(int n) {   // non usa i campi: può essere statico
        return n * 2;
    }
}
```

`main` è sempre `static`, quindi non può usare direttamente i campi non statici: deve prima creare un oggetto.

### Esempio completo

```java
public class Studente {

    String nome;
    int[] voti;

    double media() {
        if (voti == null || voti.length == 0) {
            return 0;
        }
        int somma = 0;
        for (int voto : voti) {
            somma += voto;
        }
        return (double) somma / voti.length;
    }

    boolean promosso() {
        return media() >= 6;
    }

    @Override
    public String toString() {
        return nome + " media " + String.format("%.2f", media());
    }
}
```

```java
public class Main {
    public static void main(String[] args) {
        Studente s = new Studente();
        s.nome = "Giulia";
        s.voti = new int[]{7, 6, 8};

        System.out.println(s);              // Giulia media 7.00
        System.out.println(s.promosso());   // true
    }
}
```

### Errori comuni

- Usare un oggetto senza `new`: `Contatto c; c.nome = "Anna";` causa `NullPointerException`.
- Chiamare un campo o un metodo non statico da un metodo statico senza oggetto.
- Dimenticare che l'assegnazione tra oggetti copia il riferimento, non l'oggetto.
- Lasciare i campi `public` e modificarli da fuori: dalla lezione 7 diventano `private`.
- Scrivere `toString()` con un tipo di ritorno diverso da `String`.
- Dichiarare una classe dentro `main` e poi non riuscire a usarla: le classi stanno a livello di file.

## Esercizi progressivi

**Esercizio 1.** Crea una classe `Persona` con `nome` e `eta`, un oggetto con i tuoi dati e stampa i campi.

**Esercizio 2.** Aggiungi a `Persona` il metodo `auguri()` che stampa `Buon compleanno, <nome>!` e chiamalo.

**Esercizio 3.** Crea `Rettangolo` con `base` e `altezza` e i metodi `area()` e `perimetro()`. Verifica con due oggetti diversi.

**Esercizio 4.** Crea `Cerchio` con `raggio` e i metodi `area()` e `circonferenza()`. Usa `Math.PI`.

**Esercizio 5.** Crea `Conto` con `intestatario` e `saldo`, e i metodi `versa(double)` e `preleva(double)`. Il prelievo non deve mai portare il saldo sotto zero.

**Esercizio 6.** Crea `Libro` con `titolo`, `autore` e `pagine`, e `toString()` che restituisce `"Titolo" di Autore (N pagine)`.

**Esercizio 7.** Crea un array di tre `Libro` e stampa quello con più pagine.

**Esercizio 8.** Crea `Giocatore` con `nome` e `punti`, e un metodo `segna(int)` che aggiunge punti solo se il valore è positivo.

**Esercizio 9.** Crea `Banca` con un array di `Conto` e un metodo `totaleSaldo()` che somma tutti i saldi.

**Esercizio 10.** Crea `Rubrica` con un array di `Contatto` (dimensione fissa) e i metodi `aggiungi(Contatto)` e `stampaTutti()`, con un contatore interno per sapere quanti posti sono occupati.

### Varianti

- Aggiungi a `Rettangolo` il metodo `boolean quadrato()` e verificalo.
- Aggiungi a `Studente` il metodo `votoMassimo()`.
- Prova a stampare un oggetto senza `toString()`: osserva l'output e poi aggiungi il metodo.
