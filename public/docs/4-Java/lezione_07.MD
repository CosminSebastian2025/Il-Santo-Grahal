# Lezione 7: Costruttori e incapsulamento

Nella lezione 6 gli oggetti nascevano vuoti e venivano riempiti dall'esterno. Ora impariamo a costruirli già validi e a proteggere i loro dati.

### Il costruttore

Un costruttore è un metodo speciale che viene eseguito da `new`. Ha lo stesso nome della classe e non ha tipo di ritorno.

```java
public class Contatto {

    String nome;
    String telefono;

    public Contatto(String nome, String telefono) {
        this.nome = nome;
        this.telefono = telefono;
    }
}
```

```java
Contatto c = new Contatto("Anna", "3331112222");
System.out.println(c.nome);   // Anna
```

- `this.nome` è il campo dell'oggetto; `nome` è il parametro.
- Senza `this`, `nome = nome` assegna il parametro a se stesso e il campo resta vuoto.
- Se scrivi un costruttore, Java non crea più quello senza parametri: `new Contatto()` non compila.

Si possono avere più costruttori:

```java
public Contatto(String nome, String telefono) {
    this.nome = nome;
    this.telefono = telefono;
}

public Contatto(String nome) {
    this(nome, "non disponibile");   // richiama l'altro costruttore
}
```

`this(...)` deve essere la prima istruzione del costruttore.

### Incapsulamento

Un campo `private` è visibile solo dentro la classe. Per leggerlo o modificarlo dall'esterno si usano metodi pubblici.

```java
public class Conto {

    private String intestatario;
    private double saldo;

    public Conto(String intestatario, double saldoIniziale) {
        this.intestatario = intestatario;
        this.saldo = Math.max(saldoIniziale, 0);
    }

    public String getIntestatario() {
        return intestatario;
    }

    public double getSaldo() {
        return saldo;
    }

    public void versa(double importo) {
        if (importo > 0) {
            saldo += importo;
        }
    }

    public boolean preleva(double importo) {
        if (importo <= 0 || importo > saldo) {
            return false;
        }
        saldo -= importo;
        return true;
    }
}
```

Convenzioni sui nomi:

- `getSaldo()` legge un valore (`get` + nome);
- `setNome(...)` modifica un valore;
- `isAttivo()` legge un `boolean`.

Un setter che valida:

```java
public void setEta(int eta) {
    if (eta < 0 || eta > 120) {
        throw new IllegalArgumentException("Età non valida");
    }
    this.eta = eta;
}
```

Non tutti i campi hanno bisogno di un setter. Se un valore non deve cambiare, si omette il setter e lo si rende `final`.

### Perché incapsulare

Senza incapsulamento chiunque può scrivere `conto.saldo = -1000`. Con l'incapsulamento il saldo cambia solo attraverso metodi che controllano le regole. Se domani serve un log, una notifica o un vincolo in più, si modifica un punto solo.

Regola pratica:

- campi sempre `private`;
- metodi pubblici solo per ciò che serve davvero;
- validazione dentro i metodi che modificano lo stato, non nel chiamante.

### Oggetti che collaborano

Un oggetto può contenere altri oggetti:

```java
public class Indirizzo {
    private final String via;
    private final String citta;

    public Indirizzo(String via, String citta) {
        this.via = via;
        this.citta = citta;
    }

    @Override
    public String toString() {
        return via + ", " + citta;
    }
}

public class Cliente {

    private final String nome;
    private final Indirizzo indirizzo;

    public Cliente(String nome, Indirizzo indirizzo) {
        this.nome = nome;
        this.indirizzo = indirizzo;
    }

    @Override
    public String toString() {
        return nome + " - " + indirizzo;
    }
}
```

```java
Cliente c = new Cliente("Anna", new Indirizzo("Via Roma 1", "Milano"));
System.out.println(c);   // Anna - Via Roma 1, Milano
```

Un campo `final` deve essere assegnato nel costruttore e poi non cambia più.

### Esempio completo

```java
public class Prodotto {

    private final String nome;
    private double prezzo;
    private int quantita;

    public Prodotto(String nome, double prezzo, int quantita) {
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("Nome obbligatorio");
        }
        if (prezzo < 0 || quantita < 0) {
            throw new IllegalArgumentException("Valori negativi non ammessi");
        }
        this.nome = nome;
        this.prezzo = prezzo;
        this.quantita = quantita;
    }

    public String getNome() { return nome; }
    public double getPrezzo() { return prezzo; }
    public int getQuantita() { return quantita; }

    public void setPrezzo(double prezzo) {
        if (prezzo < 0) {
            throw new IllegalArgumentException("Prezzo negativo");
        }
        this.prezzo = prezzo;
    }

    public void vendi(int pezzi) {
        if (pezzi <= 0 || pezzi > quantita) {
            throw new IllegalArgumentException("Quantità non disponibile");
        }
        quantita -= pezzi;
    }

    public double valoreMagazzino() {
        return prezzo * quantita;
    }

    @Override
    public String toString() {
        return String.format("%s: %.2f euro, %d pezzi", nome, prezzo, quantita);
    }
}
```

```java
public class Main {
    public static void main(String[] args) {
        Prodotto p = new Prodotto("Tastiera", 39.90, 10);
        p.vendi(3);
        System.out.println(p);                     // Tastiera: 39.90 euro, 7 pezzi
        System.out.println(p.valoreMagazzino());   // 279.3
    }
}
```

### Errori comuni

- Scrivere `void` davanti a un costruttore: diventa un metodo normale e `new` non lo usa.
- Dimenticare `this.` e assegnare il parametro a se stesso.
- Dichiarare `public` i campi e poi aggiungere getter e setter: l'incapsulamento non c'è.
- Scrivere un getter che restituisce una copia modificabile di una lista interna (lo vedremo con le collezioni).
- Validare i dati nel `main` invece che nella classe: la regola deve stare nella classe.
- Usare `Math.max` per validare un saldo senza dire all'utente che il valore è stato corretto.

## Esercizi progressivi

**Esercizio 1.** Aggiungi a `Persona` un costruttore con nome ed età e crea l'oggetto in una riga.

**Esercizio 2.** Crea `Rettangolo` con costruttore che rifiuta base o altezza negative e metodi `area()` e `perimetro()`.

**Esercizio 3.** Crea `Conto` con campi `private`, costruttore con saldo iniziale, `getSaldo()`, `versa` e `preleva` che restituisce `false` se non c'è saldo sufficiente.

**Esercizio 4.** Aggiungi a `Conto` un secondo costruttore che accetta solo l'intestatario e parte da saldo `0`, usando `this(...)`.

**Esercizio 5.** Crea `Studente` con nome, cognome e voti privati; impedisci voti fuori da 0 a 10 nel metodo `aggiungiVoto(int)`.

**Esercizio 6.** Crea `Indirizzo` e `Cliente` come nell'esempio e stampa un cliente con `toString()`.

**Esercizio 7.** Crea `Prodotto` con prezzo e quantità privati e il metodo `applicaSconto(double percentuale)` che rifiuta valori fuori da 0 a 100.

**Esercizio 8.** Crea `Biblioteca` con un array di `Libro`, un costruttore con la capienza e `aggiungi(Libro)` che restituisce `false` quando è piena.

**Esercizio 9.** Crea `Password` con un campo privato e il metodo `valida()` che richiede almeno 8 caratteri e una cifra. Non esporre mai la password con un getter.

**Esercizio 10.** Crea `Termometro` con temperatura privata, `setCelsius(double)` che rifiuta valori sotto `-273.15` e `getFahrenheit()`.

### Varianti

- Aggiungi a `Conto` un metodo `trasferisciA(Conto destinazione, double importo)` che restituisce `true` solo se entrambe le operazioni riescono.
- Rendi `final` il nome in `Prodotto` e verifica che il compilatore impedisca di modificarlo.
- Aggiungi a `Biblioteca` il metodo `presta(String titolo)` che restituisce `false` se il libro non esiste.
