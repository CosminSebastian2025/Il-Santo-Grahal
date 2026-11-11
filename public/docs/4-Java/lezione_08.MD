# Lezione 8: Ereditarietà e polimorfismo

L'ereditarietà permette di riusare una classe esistente e specializzarla. Il polimorfismo permette di trattare oggetti diversi con lo stesso codice.

### Estendere una classe

```java
public class Animale {

    protected String nome;

    public Animale(String nome) {
        this.nome = nome;
    }

    public void verso() {
        System.out.println(nome + " fa un verso");
    }

    @Override
    public String toString() {
        return "Animale: " + nome;
    }
}

public class Cane extends Animale {

    public Cane(String nome) {
        super(nome);
    }

    @Override
    public void verso() {
        System.out.println(nome + " abbaia");
    }
}
```

```java
Animale a = new Animale("Bestia");
Cane c = new Cane("Rex");

a.verso();   // Bestia fa un verso
c.verso();   // Rex abbaia
```

- `extends` dichiara che `Cane` è un `Animale`.
- `super(nome)` chiama il costruttore della superclasse ed è obbligatorio se la superclasse non ha un costruttore senza parametri.
- `@Override` verifica che il metodo esista davvero nella superclasse.
- I membri `protected` sono visibili nella sottoclasse; `private` no.

`Cane` eredita tutti i metodi pubblici e protetti di `Animale`: `toString()` incluso.

### Polimorfismo

Una variabile del tipo della superclasse può contenere un oggetto di una sottoclasse. Il metodo eseguito è quello dell'oggetto reale.

```java
Animale[] animali = {
    new Cane("Rex"),
    new Gatto("Miao"),
    new Cane("Luna")
};

for (Animale animale : animali) {
    animale.verso();   // ognuno usa il proprio verso
}
```

Output:

```text
Rex abbaia
Miao miagola
Luna abbaia
```

Questo è il polimorfismo: lo stesso codice (`animale.verso()`) produce comportamenti diversi. Il tipo dichiarato decide cosa puoi chiamare; il tipo reale decide quale implementazione viene eseguita.

```java
Animale a = new Cane("Rex");

System.out.println(a instanceof Cane);   // true
System.out.println(a instanceof Gatto);  // false

if (a instanceof Cane cane) {            // pattern matching (Java 16+)
    System.out.println(cane.getClass().getSimpleName());
}
```

### Chiamare la superclasse

```java
public class Gatto extends Animale {

    public Gatto(String nome) {
        super(nome);
    }

    @Override
    public void verso() {
        super.verso();          // esegue la versione della superclasse
        System.out.println(nome + " miagola");
    }
}
```

`super.verso()` serve quando vuoi aggiungere comportamento senza perdere quello esistente.

### Non tutto si può sovrascrivere

- Un metodo `final` non si può sovrascrivere.
- Un metodo `private` non è visibile nelle sottoclassi.
- Un metodo `static` viene nascosto, non sovrascritto: evitare di "sovrascrivere" metodi statici.
- Il costruttore non viene ereditato: va richiamato con `super(...)`.
- Il tipo di ritorno può restringersi (covarianza), i parametri no.

### Ereditarietà o composizione

L'ereditarietà ha senso solo con una relazione "è un": `Cane` è un `Animale`, `Fattura` non è un `Cliente`.

Se la relazione è "ha un", serve la **composizione**:

```java
public class Cliente {

    private final Indirizzo indirizzo;   // ha un indirizzo

    public Cliente(Indirizzo indirizzo) {
        this.indirizzo = indirizzo;
    }
}
```

Preferisci la composizione quando non c'è una vera gerarchia: evita classi figlie che ignorano metodi del padre.

### Esempio completo

```java
public abstract class Veicolo {

    protected final String targa;
    protected double velocita;

    public Veicolo(String targa) {
        this.targa = targa;
        this.velocita = 0;
    }

    public void accelera(double delta) {
        if (delta > 0) {
            velocita += delta;
        }
    }

    public abstract String tipo();

    @Override
    public String toString() {
        return tipo() + " " + targa + " a " + velocita + " km/h";
    }
}

public class Auto extends Veicolo {

    public Auto(String targa) {
        super(targa);
    }

    @Override
    public String tipo() {
        return "Auto";
    }
}

public class Moto extends Veicolo {

    public Moto(String targa) {
        super(targa);
    }

    @Override
    public String tipo() {
        return "Moto";
    }
}
```

```java
Veicolo[] parco = {new Auto("AB123CD"), new Moto("EF456GH")};

for (Veicolo v : parco) {
    v.accelera(50);
    System.out.println(v);
}
```

Output:

```text
Auto AB123CD a 50.0 km/h
Moto EF456GH a 50.0 km/h
```

`abstract` e i metodi astratti li vediamo in dettaglio nella lezione 9.

### Errori comuni

- Dimenticare `super(...)` quando la superclasse non ha un costruttore vuoto.
- Scrivere `@Override` su un metodo con nome o parametri sbagliati: il compilatore segnala l'errore, ed è un bene.
- Accedere a un campo `private` della superclasse dalla sottoclasse.
- Usare l'ereditarietà solo per riusare due righe di codice.
- Fare il cast senza verificare `instanceof`: `ClassCastException`.
- Credere che il tipo dichiarato decida il metodo eseguito: lo decide il tipo reale.

## Esercizi progressivi

**Esercizio 1.** Crea `Animale` con `nome` e `verso()`, poi `Cane` e `Gatto` che la estendono e sovrascrivono `verso()`.

**Esercizio 2.** Crea `Forma` con `area()` e `perimetro()` e le sottoclassi `Rettangolo` e `Cerchio`. Stampa i valori di entrambe.

**Esercizio 3.** Crea un array di `Forma` con tre forme diverse e stampa area e perimetro di ognuna.

**Esercizio 4.** Aggiungi a `Forma` il metodo `descrizione()` che restituisce il nome della forma e fai in modo che ogni sottoclasse lo sovrascriva.

**Esercizio 5.** Crea `Dipendente` con `nome` e `stipendio`, e `Manager` che aggiunge un bonus. Il metodo `stipendioTotale()` va sovrascritto usando `super`.

**Esercizio 6.** Crea `Veicolo` con `targa` e `velocita`, `Auto` e `Moto` come nell'esempio, e un metodo `confrontaVelocita(Veicolo altro)` che restituisce `1`, `0` o `-1`.

**Esercizio 7.** Scrivi un metodo `static void stampaTutti(Animale[] animali)` che chiama `verso()` su ognuno: verifica che funzioni con un array che contiene tipi diversi.

**Esercizio 8.** Usa `instanceof` e il pattern matching per contare quanti `Cane` e quanti `Gatto` ci sono in un array di `Animale`.

**Esercizio 9.** Crea `Persona`, `Studente extends Persona` e `Professore extends Persona`. Aggiungi `ruolo()` sovrascritto e stampa un elenco misto.

### Varianti

- Rendi `final` il metodo `tipo()` in una sottoclasse e verifica l'errore di compilazione in una sottoclasse successiva.
- Sostituisci un'ereditarietà con la composizione: `Manager` che contiene un `Dipendente` invece di estenderlo. Confronta i due codici.
- Aggiungi a `Veicolo` un metodo `frena(double)` e verifica che non scenda sotto zero.
