# Lezione 29: Design pattern, Clean Code e SOLID

Un programma che funziona oggi deve restare comprensibile tra sei mesi. I **design pattern** sono soluzioni note a problemi noti; **Clean Code** e **SOLID** sono criteri per decidere quando una soluzione è abbastanza buona.

### A cosa servono i pattern

Un pattern non è codice da copiare: è un **vocabolario**. Dire "qui serve una Strategy" comunica in tre parole una struttura che altrimenti richiederebbe un paragrafo.

Usa un pattern quando il problema che risolve è già presente. Applicarlo "per sicurezza" produce più classi e nessun vantaggio.

| Pattern | Problema che risolve |
| --- | --- |
| **Singleton** | una sola istanza condivisa di una configurazione |
| **Factory** | creare oggetti senza esporre il costruttore concreto |
| **Builder** | costruire oggetti con molti parametri opzionali |
| **Strategy** | cambiare algoritmo a runtime |
| **Observer** | notificare più componenti quando accade un evento |
| **Repository** | isolare la persistenza dal resto dell'applicazione |
| **Adapter** | usare una classe con un'interfaccia diversa |
| **Decorator** | aggiungere comportamenti senza modificare la classe |

### Singleton

Serve una sola istanza, con accesso globale controllato. In Java il modo più robusto è un `enum` con una sola costante: la JVM garantisce l'unicità anche con la serializzazione e i thread.

```java
public enum Configurazione {
    ISTANZA;

    private final String ambiente = "dev";
    private final int porta = 8080;

    public String getAmbiente() {
        return ambiente;
    }

    public int getPorta() {
        return porta;
    }
}
```

```java
System.out.println(Configurazione.ISTANZA.getPorta()); // 8080
```

Attenzione: il Singleton è comodo ma crea **stato globale**. Rende i test difficili e nasconde dipendenze. Nei progetti Spring non serve: i bean sono già singoli per impostazione predefinita e si iniettano.

### Factory

La factory centralizza la creazione, così il resto del codice non conosce le classi concrete.

```java
public interface Veicolo {
    void muovi();
}

public class Auto implements Veicolo {
    @Override
    public void muovi() {
        System.out.println("L'auto si muove su strada.");
    }
}

public class Bici implements Veicolo {
    @Override
    public void muovi() {
        System.out.println("La bici pedala.");
    }
}

public class VeicoloFactory {

    public static Veicolo crea(String tipo) {
        return switch (tipo.toLowerCase()) {
            case "auto" -> new Auto();
            case "bici" -> new Bici();
            default -> throw new IllegalArgumentException("Tipo sconosciuto: " + tipo);
        };
    }
}
```

Se domani arriva `Camion`, si modifica solo la factory. Chi chiama `VeicoloFactory.crea("auto")` non cambia.

### Builder

Con più di tre o quattro parametri, i costruttori diventano illeggibili e facili da sbagliare: due `String` di fila si possono invertire senza che il compilatore se ne accorga. Il Builder rende esplicito ogni valore.

```java
import java.util.ArrayList;
import java.util.List;

public class Pizza {

    private final String impasto;
    private final String salsa;
    private final boolean mozzarella;
    private final List<String> ingredienti;

    private Pizza(Builder b) {
        this.impasto = b.impasto;
        this.salsa = b.salsa;
        this.mozzarella = b.mozzarella;
        this.ingredienti = List.copyOf(b.ingredienti);
    }

    public static class Builder {

        private final String impasto;
        private String salsa = "pomodoro";
        private boolean mozzarella = true;
        private final List<String> ingredienti = new ArrayList<>();

        public Builder(String impasto) {
            this.impasto = impasto;
        }

        public Builder salsa(String salsa) {
            this.salsa = salsa;
            return this;
        }

        public Builder senzaMozzarella() {
            this.mozzarella = false;
            return this;
        }

        public Builder aggiungi(String ingrediente) {
            ingredienti.add(ingrediente);
            return this;
        }

        public Pizza build() {
            return new Pizza(this);
        }
    }

    @Override
    public String toString() {
        return "Pizza{" + impasto + ", " + salsa
                + ", mozzarella=" + mozzarella + ", " + ingredienti + "}";
    }
}
```

```java
Pizza p = new Pizza.Builder("integrale")
        .salsa("pesto")
        .senzaMozzarella()
        .aggiungi("funghi")
        .aggiungi("rucola")
        .build();
```

Il Builder restituisce `this` da ogni metodo, così le chiamate si concatenano. `build()` crea l'oggetto e lo rende immutabile.

### Strategy

Quando un algoritmo ha più varianti e la scelta avviene a runtime, non si riempie una classe di `if`. Si estrae l'algoritmo dietro un'interfaccia.

```java
public interface Sconto {
    double applica(double totale);
}

public class NessunoSconto implements Sconto {
    @Override
    public double applica(double totale) {
        return totale;
    }
}

public class ScontoPercentuale implements Sconto {

    private final double percentuale;

    public ScontoPercentuale(double percentuale) {
        if (percentuale < 0 || percentuale > 100) {
            throw new IllegalArgumentException("Percentuale non valida");
        }
        this.percentuale = percentuale;
    }

    @Override
    public double applica(double totale) {
        return totale * (1 - percentuale / 100);
    }
}

public class ScontoFisso implements Sconto {

    private final double valore;

    public ScontoFisso(double valore) {
        this.valore = valore;
    }

    @Override
    public double applica(double totale) {
        return Math.max(0, totale - valore);
    }
}

public class Carrello {

    private final List<String> articoli = new ArrayList<>();
    private Sconto sconto = new NessunoSconto();

    public void aggiungi(String articolo) {
        articoli.add(articolo);
    }

    public void setSconto(Sconto sconto) {
        this.sconto = sconto;
    }

    public double totale(double prezzoBase) {
        return sconto.applica(prezzoBase * articoli.size());
    }
}
```

`Carrello` non sa nulla delle formule: usa solo `applica`. Aggiungere uno sconto "2x1" significa scrivere una nuova classe, non modificare `Carrello`.

### Observer

Un oggetto notifica un evento a chi si è registrato, senza conoscerli.

```java
public interface AscoltatoreOrdine {
    void onOrdineCreato(String codice);
}

public class ServizioOrdini {

    private final List<AscoltatoreOrdine> ascoltatori = new ArrayList<>();

    public void registra(AscoltatoreOrdine ascoltatore) {
        ascoltatori.add(ascoltatore);
    }

    public void creaOrdine(String codice) {
        System.out.println("Ordine creato: " + codice);
        for (AscoltatoreOrdine a : ascoltatori) {
            a.onOrdineCreato(codice);
        }
    }
}
```

```java
ServizioOrdini servizio = new ServizioOrdini();
servizio.registra(codice -> System.out.println("Email per " + codice));
servizio.registra(codice -> System.out.println("Magazzino avvisato: " + codice));
servizio.creaOrdine("ORD-42");
```

Lo stesso schema sta alla base dei listener delle interfacce grafiche e degli eventi di Spring.

### Clean Code

Le regole che contano davvero:

- **nomi che spiegano**: `calcolaTotaleOrdine`, non `calc`;
- **metodi corti**, con un solo livello di dettaglio;
- **early return** invece di `if` annidati;
- **niente numeri magici**: `static final double IVA = 0.22;`;
- **commenti solo per il perché**, mai per ripetere cosa fa il codice;
- **nessun parametro booleano** che cambia il comportamento: due metodi con nomi chiari sono meglio di `stampa(true)`.

```java
// prima: annidato e con numeri magici
public double prezzo(double base, boolean socio) {
    if (base > 0) {
        if (socio) {
            return base - base * 0.10;
        } else {
            return base;
        }
    }
    return 0;
}

// dopo: chiaro, con costante e early return
private static final double SCONTO_SOCIO = 0.10;

public double prezzo(double base, boolean socio) {
    if (base <= 0) {
        return 0;
    }
    return socio ? base * (1 - SCONTO_SOCIO) : base;
}
```

### SOLID

| Principio | Significato | Violazione tipica |
| --- | --- | --- |
| **S** — Single Responsibility | una classe, una ragione per cambiare | una classe che legge file, calcola e stampa |
| **O** — Open/Closed | aperta all'estensione, chiusa alla modifica | catena di `if` per ogni nuovo tipo |
| **L** — Liskov | un sottotipo deve poter sostituire il tipo base | `Quadrato extends Rettangolo` che rompe `setLato` |
| **I** — Interface Segregation | interfacce piccole e mirate | un'interfaccia con dieci metodi di cui ne servono due |
| **D** — Dependency Inversion | dipendere da astrazioni, non da classi concrete | il service che crea `new ArchivioFile()` |

Esempio di inversione delle dipendenze:

```java
public interface Archivio {
    List<String> leggi();
    void scrivi(String riga);
}

public class ReportService {

    private final Archivio archivio;

    public ReportService(Archivio archivio) {
        this.archivio = archivio;
    }

    public int contaRighe() {
        return archivio.leggi().size();
    }
}
```

`ReportService` non sa se i dati arrivano da un file, da un database o da un test. Nei test si passa un archivio finto; in produzione quello vero.

### Errori comuni

- **Pattern ovunque.** Se non c'è il problema, non serve la soluzione.
- **Singleton per tutto.** Diventa uno stato globale difficile da testare.
- **Ereditarietà per riusare codice.** Preferisci la composizione, salvo una vera relazione "è un".
- **Interfacce giganti** implementate con metodi vuoti.
- **Builder che permette oggetti invalidi**: la validazione va in `build()` o nel costruttore.
- **Commenti che traducono il codice.** Aggiungono rumore e invecchiano male.
- **Classi anemiche e logica sparsa nei controller.** Decidi dove vive ogni responsabilità.

### Esempio completo

```java
public class Negozio {

    public static void main(String[] args) {
        Carrello carrello = new Carrello();
        carrello.aggiungi("penna");
        carrello.aggiungi("quaderno");

        System.out.printf("Totale: %.2f euro%n", carrello.totale(2.50));

        carrello.setSconto(new ScontoPercentuale(20));
        System.out.printf("Socio:  %.2f euro%n", carrello.totale(2.50));

        carrello.setSconto(new ScontoFisso(1.00));
        System.out.printf("Buono:  %.2f euro%n", carrello.totale(2.50));
    }
}
```

Output atteso:

```text
Totale: 5.00 euro
Socio:  4.00 euro
Buono:  4.00 euro
```

## Esercizi progressivi

**Esercizio 1.** Trova in un tuo progetto precedente una classe con più responsabilità, elencale e dividila in classi separate.

**Esercizio 2.** Implementa `Configurazione` come `enum` singleton con ambiente, porta e un metodo `descrizione()`.

**Esercizio 3.** Aggiungi `Camion` alla `VeicoloFactory` dell'esempio senza modificare `Auto` e `Bici`.

**Esercizio 4.** Crea un `Builder` per una classe `Computer` con CPU, RAM, disco e scheda video opzionale.

**Esercizio 5.** Aggiungi al Builder di `Computer` una validazione in `build()` che rifiuta RAM inferiore a 4 GB.

**Esercizio 6.** Implementa tre strategie di ordinamento (`natural`, `inverso`, `per lunghezza`) e usale su una lista di stringhe.

**Esercizio 7.** Crea una `Strategy` per il calcolo dell'IVA (22%, 10%, 4%) e applicala a un carrello.

**Esercizio 8.** Aggiungi al `ServizioOrdini` due ascoltatori concreti, uno che scrive su file e uno che stampa, e verifica che entrambi ricevano l'evento.

**Esercizio 9.** Riscrivi un metodo lungo con `if` annidati usando early return e metodi estratti.

**Esercizio 10.** Applica la Dependency Inversion a un service che oggi crea direttamente un `FileWriter`; introduci un'interfaccia e due implementazioni (file, memoria).

**Esercizio 11.** Dividi un'interfaccia con sei metodi in tre interfacce piccole e aggiorna le classi che la implementano.

**Esercizio 12.** Aggiungi un nuovo tipo di sconto al `Carrello` senza toccare `Carrello`: dimostra che il codice è aperto all'estensione.

### Varianti

- Rifattorizza la Rubrica contatti della fase 2 introducendo un `RubricaRepository`.
- Aggiungi un `Decorator` che registra su log ogni chiamata a `ReportService`.
- Scrivi una checklist di cinque regole Clean Code e applicala a una classe del tuo progetto.
