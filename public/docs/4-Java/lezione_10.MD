# Lezione 10: static, final, enum e record

Quattro strumenti che rendono il codice più chiaro: valori condivisi, costanti, insiemi chiusi di valori e classi dati compatte.

### Campi e metodi static

Un membro `static` appartiene alla classe, non agli oggetti: esiste una sola copia.

```java
public class Contatore {

    private static int istanze = 0;   // una sola per tutta la classe
    private final int id;

    public Contatore() {
        istanze++;
        id = istanze;
    }

    public int getId() {
        return id;
    }

    public static int getIstanze() {
        return istanze;
    }
}
```

```java
new Contatore();
new Contatore();
System.out.println(Contatore.getIstanze());   // 2
```

Un metodo statico non può usare `this` né i campi di istanza: non sa a quale oggetto riferirsi. Al contrario, un metodo di istanza può usare membri statici.

Usi tipici:

- contatori globali;
- metodi di utilità (`Integer.parseInt`, `Math.max`);
- costanti condivise;
- factory: `static Prodotto crea(...)`.

Da evitare: stato statico modificabile in applicazioni con più thread (lo vedremo nella fase 6). Le costanti statiche vanno bene perché sono immutabili.

### final

`final` significa "assegnato una volta sola".

```java
final int MAX = 10;                  // variabile locale
private final String codice;         // campo: assegnato nel costruttore
public final void stampa() { }       // metodo: non sovrascrivibile
public final class Chiusa { }        // classe: non estendibile
```

Un campo `final` di tipo primitivo non cambia valore. Un campo `final` di tipo oggetto non cambia riferimento, ma l'oggetto può cambiare internamente:

```java
private final int[] voti = new int[3];

voti[0] = 8;        // consentito: cambia il contenuto
// voti = new int[5];  errore: cambia il riferimento
```

Convenzione: le costanti sono `static final` e in maiuscolo.

```java
public static final double IVA = 0.22;
public static final int MAX_TENTATIVI = 3;
```

### enum

Un `enum` definisce un insieme chiuso di valori.

```java
public enum StatoOrdine {
    NUOVO,
    SPEDITO,
    CONSEGNATO,
    ANNULLATO
}
```

```java
StatoOrdine stato = StatoOrdine.NUOVO;

if (stato == StatoOrdine.NUOVO) {
    System.out.println("Da preparare");
}

switch (stato) {
    case NUOVO -> System.out.println("Da preparare");
    case SPEDITO -> System.out.println("In transito");
    case CONSEGNATO -> System.out.println("Consegnato");
    case ANNULLATO -> System.out.println("Annullato");
}
```

Un `enum` può avere campi, costruttore e metodi:

```java
public enum Priorita {

    BASSA(1),
    MEDIA(2),
    ALTA(3);

    private final int livello;

    Priorita(int livello) {
        this.livello = livello;
    }

    public int getLivello() {
        return livello;
    }

    public boolean urgente() {
        return livello >= 3;
    }
}
```

```java
System.out.println(Priorita.ALTA.getLivello());   // 3
System.out.println(Priorita.MEDIA.urgente());     // false
System.out.println(Priorita.values().length);     // 3
```

Con un `enum` il compilatore impedisce valori fuori elenco: è più sicuro di una `String` o di un `int`.

### record

Un `record` (Java 16+) è una classe immutabile per trasportare dati. Il compilatore genera costruttore, getter, `equals`, `hashCode` e `toString`.

```java
public record Punto(int x, int y) { }
```

```java
Punto p = new Punto(3, 5);

System.out.println(p.x());       // 3
System.out.println(p);           // Punto[x=3, y=5]
System.out.println(p.equals(new Punto(3, 5)));   // true
```

Si possono aggiungere metodi e una validazione nel costruttore compatto:

```java
public record Prodotto(String nome, double prezzo) {

    public Prodotto {
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("Nome obbligatorio");
        }
        if (prezzo < 0) {
            throw new IllegalArgumentException("Prezzo negativo");
        }
    }

    public double prezzoConIva() {
        return prezzo * 1.22;
    }
}
```

I record sono ideali per DTO, risultati di calcolo, coordinate, coppie chiave-valore. Non sono adatti quando l'oggetto deve cambiare nel tempo: per quello serve una classe normale.

### Esempio completo

```java
public enum Ruolo {
    STUDENTE(0),
    DOCENTE(1),
    SEGRETERIA(2);

    private final int codice;

    Ruolo(int codice) {
        this.codice = codice;
    }

    public int getCodice() {
        return codice;
    }
}

public record Utente(String username, Ruolo ruolo) {

    public Utente {
        if (username == null || username.length() < 3) {
            throw new IllegalArgumentException("Username troppo corto");
        }
    }

    public boolean puoModificareVoti() {
        return ruolo == Ruolo.DOCENTE;
    }
}
```

```java
Utente u = new Utente("mrossi", Ruolo.DOCENTE);

System.out.println(u);                       // Utente[username=mrossi, ruolo=DOCENTE]
System.out.println(u.puoModificareVoti());   // true
System.out.println(u.ruolo().getCodice());   // 1
```

### Errori comuni

- Usare un campo statico per dati che appartengono al singolo oggetto.
- Modificare una costante `static final`.
- Chiamare un metodo statico tramite un oggetto (`oggetto.metodoStatico()`): compila ma confonde, usa `Classe.metodo()`.
- Confondere `final` (riferimento) con "oggetto immutabile".
- Usare `String` al posto di `enum` per stati: nessun controllo sui valori.
- Aggiungere setter a un `record`: non esistono, i record sono immutabili.

## Esercizi progressivi

**Esercizio 1.** Crea `Contatore` con campo statico e verifica che due oggetti incrementino lo stesso valore.

**Esercizio 2.** Crea una classe `Matematica` con soli metodi statici `somma`, `massimo` e `pari`, e usali senza creare oggetti.

**Esercizio 3.** Definisci `static final double IVA = 0.22` in una classe `Config` e usala per calcolare un prezzo scontato.

**Esercizio 4.** Crea `enum Giorno` con i sette giorni e un metodo `boolean festivo()` che restituisce `true` per sabato e domenica.

**Esercizio 5.** Crea `enum Priorita` con livelli 1-3, come nell'esempio, e stampa la priorità di tre attività.

**Esercizio 6.** Crea `record Punto(int x, int y)` con il metodo `double distanzaDa(Punto altro)`.

**Esercizio 7.** Crea `record Prodotto(String nome, double prezzo, int quantita)` con `valoreTotale()` e validazione nel costruttore compatto.

**Esercizio 8.** Crea `enum Ruolo` con codice numerico e un `record Utente(String username, Ruolo ruolo)` che valida lo username.

**Esercizio 9.** Crea una classe `Configurazione` con un singleton semplice: costruttore privato, campo statico `istanza` e metodo `getInstance()`.

**Esercizio 10.** Crea `enum TipoVeicolo` con un campo `ruote` e stampa `ruote` per auto, moto e camion.

### Varianti

- Aggiungi a `Contatore` un metodo statico `reset()` e verifica che il conteggio riparta.
- Aggiungi a `record Punto` il metodo `Punto trasla(int dx, int dy)`.
- Sostituisci una `String` di stato con un `enum` in un progetto delle lezioni precedenti.

## Progetti della fase 2

Questi progetti usano classi, incapsulamento, ereditarietà, interfacce ed enum. Scegline uno, portalo a termine, poi passa al successivo.

### Progetto 1: Conto bancario

Classi `Conto` e `Movimento`. Il conto ha saldo privato, elenco dei movimenti (array con contatore), metodi `versa`, `preleva` e `stampaEstratto`.

Requisiti: saldo mai negativo, prelievo che restituisce `false` se non possibile, `Movimento` con `record` o classe immutabile, `toString()` leggibile, validazione degli importi.

### Progetto 2: Biblioteca

Classi `Libro`, `Utente` e `Prestito`. Un libro ha titolo, autore e disponibilità; un utente prende in prestito un libro disponibile e lo restituisce.

Requisiti: ereditarietà o interfaccia per i tipi di utente (studente, docente), errore chiaro se il libro è già prestato, conteggio dei prestiti attivi, nessun campo pubblico.

### Progetto 3: Gestione studenti

Classe `Studente` con nome, cognome, voti e media, più un programma con un array di studenti.

Requisiti: `aggiungiVoto` con validazione, media calcolata dalla classe, ricerca per cognome, studente migliore, `toString()` usato nelle stampe.

### Progetto 4: Negozio

Classi `Prodotto` e `Negozio`. Il negozio ha un array di prodotti, vende solo se la quantità è sufficiente e calcola il valore totale dell'inventario.

Requisiti: incapsulamento completo, metodo `vendita(int indice, int pezzi)`, totale per categoria con `enum`, controllo della capienza dell'array.

### Progetto 5: Gioco con personaggi

Classe astratta `Personaggio` con nome, punti vita e `attacca()` astratto; sottoclassi `Guerriero`, `Mago` e `Arciere`.

Requisiti: calcolo del danno diverso per tipo, turni alternati, controllo dei punti vita, messaggio di vittoria, array polimorfico dei personaggi.

### Progetto 6: Rubrica contatti

Classe `Contatto` con nome, telefono ed email, più un menu per aggiungere, cercare, modificare ed eliminare contatti.

Requisiti: array con contatore, `equals` per confrontare i contatti, ricerca parziale case-insensitive, nessun campo pubblico, gestione input non valido.

### Criteri di verifica

- [ ] Tutti i campi sono `private` o `protected`, mai `public`.
- [ ] Ogni classe ha una responsabilità chiara.
- [ ] I costruttori impediscono la creazione di oggetti non validi.
- [ ] Il polimorfismo è usato davvero, non solo dichiarato.
- [ ] I metodi sovrascritti hanno `@Override`.
- [ ] `toString()` è leggibile e usato nelle stampe.
- [ ] Gli enum sostituiscono le stringhe per gli stati.

Nella fase 3 arrivano le classi della libreria standard: collezioni, stringhe, file e stream.
