# Lezione 9: Interfacce e classi astratte

Una classe astratta è una classe che non si può istanziare e che può lasciare metodi da completare. Un'interfaccia è un contratto: elenca i metodi che una classe deve fornire, senza dire come.

### Classe astratta

```java
public abstract class Forma {

    protected final String nome;

    protected Forma(String nome) {
        this.nome = nome;
    }

    public abstract double area();

    public abstract double perimetro();

    public void descrivi() {
        System.out.printf("%s: area %.2f, perimetro %.2f%n", nome, area(), perimetro());
    }
}
```

- `abstract` sulla classe impedisce `new Forma(...)`.
- `abstract` sul metodo obbliga le sottoclassi a implementarlo.
- Una classe astratta può avere metodi concreti (`descrivi`) che usano quelli astratti.

```java
public class Cerchio extends Forma {

    private final double raggio;

    public Cerchio(double raggio) {
        super("Cerchio");
        this.raggio = raggio;
    }

    @Override
    public double area() {
        return Math.PI * raggio * raggio;
    }

    @Override
    public double perimetro() {
        return 2 * Math.PI * raggio;
    }
}
```

```java
Forma f = new Cerchio(2);
f.descrivi();   // Cerchio: area 12.57, perimetro 12.57
```

### Interfacce

Un'interfaccia contiene solo la firma dei metodi: chi la implementa deve scrivere il corpo.

```java
public interface Stampabile {
    void stampa();
}

public interface Esportabile {
    String esporta();
}
```

```java
public class Fattura implements Stampabile, Esportabile {

    private final int numero;
    private final double importo;

    public Fattura(int numero, double importo) {
        this.numero = numero;
        this.importo = importo;
    }

    @Override
    public void stampa() {
        System.out.println("Fattura " + numero + ": " + importo);
    }

    @Override
    public String esporta() {
        return numero + ";" + importo;
    }
}
```

Una classe può implementare **più interfacce**, ma estendere una sola classe. Questa è la differenza principale rispetto alle classi astratte.

Convenzione di nome:

- interfaccia = capacità o ruolo: `Stampabile`, `Comparable`, `Runnable`;
- classe astratta = concetto di base: `Forma`, `Veicolo`, `Dipendente`.

### Interfacce e polimorfismo

```java
Stampabile[] documenti = {
    new Fattura(1, 100),
    new Ricevuta("Anna", 20)
};

for (Stampabile documento : documenti) {
    documento.stampa();
}
```

Il codice non sa cosa sia una `Fattura`: sa solo che l'oggetto sa `stampa()`. Questo disaccoppia il chiamante dall'implementazione.

### Metodi default

Un'interfaccia può fornire un'implementazione predefinita:

```java
public interface Stampabile {

    void stampa();

    default void stampaDueVolte() {
        stampa();
        stampa();
    }
}
```

La classe può usare `stampaDueVolte()` senza implementarlo, oppure sovrascriverlo. I metodi `default` servono per aggiungere comportamento senza rompere le classi esistenti; non vanno usati per mettere logica di business nelle interfacce.

Altri membri ammessi: costanti (`implicitamente public static final`) e metodi `static`.

### Quando usare l'una o l'altra

| Situazione | Scelta |
| --- | --- |
| Più classi condividono stato e codice | classe astratta |
| Serve definire un contratto per classi non imparentate | interfaccia |
| Una classe deve avere più "ruoli" | interfacce multiple |
| Evoluzione futura con metodi opzionali | classe astratta o metodo `default` |

Regola pratica: parti dall'interfaccia; passa alla classe astratta solo quando c'è codice e stato da condividere.

### Esempio completo

```java
public interface Pagabile {
    double totale();
}

public abstract class Documento implements Pagabile {

    protected final String cliente;

    protected Documento(String cliente) {
        this.cliente = cliente;
    }

    public abstract String riepilogo();
}

public class Fattura extends Documento {

    private final double imponibile;

    public Fattura(String cliente, double imponibile) {
        super(cliente);
        this.imponibile = imponibile;
    }

    @Override
    public double totale() {
        return imponibile * 1.22;
    }

    @Override
    public String riepilogo() {
        return String.format("Fattura per %s: %.2f euro", cliente, totale());
    }
}

public class NotaCredito extends Documento {

    private final double importo;

    public NotaCredito(String cliente, double importo) {
        super(cliente);
        this.importo = importo;
    }

    @Override
    public double totale() {
        return -importo;
    }

    @Override
    public String riepilogo() {
        return String.format("Nota di credito per %s: %.2f euro", cliente, totale());
    }
}
```

```java
Documento[] documenti = {
    new Fattura("Anna", 100),
    new NotaCredito("Luca", 30)
};

double saldo = 0;
for (Documento d : documenti) {
    System.out.println(d.riepilogo());
    saldo += d.totale();
}
System.out.printf("Saldo: %.2f euro%n", saldo);
```

Output:

```text
Fattura per Anna: 122.00 euro
Nota di credito per Luca: -30.00 euro
Saldo: 92.00 euro
```

### Errori comuni

- Provare a istanziare una classe astratta: `new Forma()` non compila.
- Dimenticare di implementare un metodo dell'interfaccia: errore di compilazione "is not abstract and does not override".
- Dichiarare campi di istanza in un'interfaccia: sono implicitamente costanti e vanno inizializzati.
- Usare `implements` per una classe e `extends` per un'interfaccia: è il contrario.
- Mettere logica complicata nei metodi `default`.
- Creare una gerarchia profonda quando bastava un'interfaccia.

## Esercizi progressivi

**Esercizio 1.** Crea l'interfaccia `Stampabile` con `void stampa()` e implementala in `Contatto`.

**Esercizio 2.** Crea la classe astratta `Forma` con `area()` e `perimetro()` astratti e le sottoclassi `Rettangolo` e `Cerchio`.

**Esercizio 3.** Aggiungi a `Forma` un metodo concreto `descrivi()` che stampa nome, area e perimetro.

**Esercizio 4.** Crea le interfacce `Pagabile` con `double totale()` e `Esportabile` con `String esporta()`; implementale entrambe in `Fattura`.

**Esercizio 5.** Crea `NotaCredito` come nell'esempio e calcola il saldo totale di un array misto.

**Esercizio 6.** Crea l'interfaccia `Animale` con `verso()` e `nome()`, e due classi che la implementano senza ereditare da nulla.

**Esercizio 7.** Aggiungi a `Stampabile` un metodo `default void stampaDueVolte()` e usalo su una classe che non lo implementa.

**Esercizio 8.** Crea un'interfaccia `Sconto` con `double applica(double totale)` e tre implementazioni: nessuno sconto, 10%, 20%. Applica lo sconto a un carrello.

**Esercizio 9.** Crea la classe astratta `Dipendente` con `stipendioBase()` astratto e `bonus()` concreto che restituisce `stipendioBase() * 0.1`. Crea `Impiegato` e `Manager`.

**Esercizio 10.** Crea un'interfaccia `Veicolo` con `velocitaMassima()` e un `default boolean veloce()` che restituisce `true` sopra 150 km/h. Verifica su due veicoli.

### Varianti

- Aggiungi a `Pagabile` il metodo `default boolean positivo()` che restituisce `totale() > 0`.
- Crea una classe che implementa `Runnable` con un messaggio stampato nel metodo `run()` e avviala con `new Thread(oggetto).start()`.
- Trasforma `Forma` da classe astratta a interfaccia con metodi `default` per `descrivi()`: cosa cambia?
