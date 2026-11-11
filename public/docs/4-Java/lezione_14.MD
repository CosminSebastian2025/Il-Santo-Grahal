# Lezione 14: Mappe, generics e ordinamento

Una mappa associa una chiave a un valore: è la struttura giusta per cercare per nome, contare occorrenze e raggruppare. I generics rendono tutto questo sicuro rispetto ai tipi; `Comparable` e `Comparator` decidono l'ordine.

### HashMap

```java
import java.util.HashMap;

HashMap<String, Integer> eta = new HashMap<>();

eta.put("Anna", 30);
eta.put("Luca", 25);
eta.put("Sara", 28);

System.out.println(eta.get("Anna"));               // 30
System.out.println(eta.getOrDefault("Marco", 0));  // 0
System.out.println(eta.containsKey("Luca"));       // true
System.out.println(eta.size());                    // 3

eta.remove("Luca");
```

| Metodo | Effetto |
| --- | --- |
| `put(k, v)` | inserisce o sostituisce |
| `get(k)` | valore o `null` |
| `getOrDefault(k, d)` | valore o default |
| `containsKey(k)` | `true` se la chiave esiste |
| `remove(k)` | elimina la chiave |
| `size()` | numero di coppie |
| `keySet()` | insieme delle chiavi |
| `values()` | collezione dei valori |
| `entrySet()` | insieme delle coppie |

Scorrere una mappa:

```java
for (String nome : eta.keySet()) {
    System.out.println(nome + " -> " + eta.get(nome));
}

for (HashMap.Entry<String, Integer> voce : eta.entrySet()) {
    System.out.println(voce.getKey() + ": " + voce.getValue());
}
```

La seconda forma è preferibile: una sola ricerca invece di due.

### Conteggi

Il caso d'uso più frequente: contare quante volte compare ogni elemento.

```java
String frase = "ciao mondo ciao java ciao";
HashMap<String, Integer> conteggio = new HashMap<>();

for (String parola : frase.split(" ")) {
    conteggio.put(parola, conteggio.getOrDefault(parola, 0) + 1);
}

System.out.println(conteggio);   // {java=1, ciao=3, mondo=1}
```

`merge` fa la stessa cosa in modo più compatto:

```java
conteggio.merge(parola, 1, Integer::sum);
```

### Chiavi e uguaglianza

Una `HashMap` trova la chiave usando `hashCode` e `equals`. Con `String` e wrapper funziona già. Con una classe tua devi implementarli entrambi, altrimenti la mappa non trova le chiavi.

Con un `record` sono generati automaticamente:

```java
public record Codice(String valore) { }

HashMap<Codice, String> descrizioni = new HashMap<>();
descrizioni.put(new Codice("A1"), "Magazzino");
System.out.println(descrizioni.get(new Codice("A1")));   // Magazzino
```

Le chiavi devono essere immutabili: se cambi un campo usato nel calcolo di `hashCode` dopo aver inserito la voce, la mappa non la trova più.

### Generics

I generics rendono le collezioni sicure rispetto ai tipi: il compilatore impedisce di inserire il tipo sbagliato e non serve il cast.

```java
ArrayList<String> nomi = new ArrayList<>();
nomi.add("Anna");
// nomi.add(42);   // errore di compilazione

String primo = nomi.get(0);   // nessun cast
```

Senza generics (`ArrayList lista = new ArrayList()`) tutto è `Object` e i cast falliscono a runtime.

Una classe generica:

```java
public class Coppia<A, B> {

    private final A primo;
    private final B secondo;

    public Coppia(A primo, B secondo) {
        this.primo = primo;
        this.secondo = secondo;
    }

    public A getPrimo() { return primo; }
    public B getSecondo() { return secondo; }

    @Override
    public String toString() {
        return "(" + primo + ", " + secondo + ")";
    }
}
```

```java
Coppia<String, Integer> voto = new Coppia<>("Anna", 30);
System.out.println(voto);   // (Anna, 30)
```

Metodo generico:

```java
public static <T> void stampaTutti(java.util.List<T> elementi) {
    for (T elemento : elementi) {
        System.out.println(elemento);
    }
}
```

Convenzioni: `T` tipo generico, `K` chiave, `V` valore, `E` elemento.

### Comparable: ordine naturale

```java
public class Prodotto implements Comparable<Prodotto> {

    private final String nome;
    private final double prezzo;

    public Prodotto(String nome, double prezzo) {
        this.nome = nome;
        this.prezzo = prezzo;
    }

    public String getNome() { return nome; }
    public double getPrezzo() { return prezzo; }

    @Override
    public int compareTo(Prodotto altro) {
        return Double.compare(this.prezzo, altro.prezzo);
    }

    @Override
    public String toString() {
        return nome + " " + prezzo + " euro";
    }
}
```

```java
ArrayList<Prodotto> prodotti = new ArrayList<>();
prodotti.add(new Prodotto("Penna", 1.20));
prodotti.add(new Prodotto("Zaino", 39.90));
prodotti.add(new Prodotto("Quaderno", 3.50));

Collections.sort(prodotti);
System.out.println(prodotti);   // [Penna 1.2 euro, Quaderno 3.5 euro, Zaino 39.9 euro]
```

`compareTo` restituisce:

- numero negativo se `this` viene prima;
- zero se sono equivalenti per l'ordinamento;
- numero positivo se `this` viene dopo.

Per gli interi si usa `Integer.compare`, per i decimali `Double.compare`: sottrarre direttamente può andare in overflow.

### Comparator: ordini alternativi

```java
prodotti.sort(Comparator.comparing(Prodotto::getNome));
prodotti.sort(Comparator.comparingDouble(Prodotto::getPrezzo).reversed());
prodotti.sort(
    Comparator.comparingDouble(Prodotto::getPrezzo)
              .thenComparing(Prodotto::getNome)
);
```

Con una lambda:

```java
prodotti.sort((a, b) -> a.getNome().compareToIgnoreCase(b.getNome()));
```

`Comparator` non richiede di modificare la classe e permette ordinamenti diversi sullo stesso tipo.

### Esempio completo

```java
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;

public class Vendite {

    record Vendita(String prodotto, int quantita, double prezzo) { }

    public static void main(String[] args) {
        ArrayList<Vendita> vendite = new ArrayList<>();
        vendite.add(new Vendita("Penna", 10, 1.20));
        vendite.add(new Vendita("Zaino", 2, 39.90));
        vendite.add(new Vendita("Penna", 5, 1.20));
        vendite.add(new Vendita("Quaderno", 8, 3.50));

        HashMap<String, Double> incasso = new HashMap<>();

        for (Vendita v : vendite) {
            double totale = v.quantita() * v.prezzo();
            incasso.merge(v.prodotto(), totale, Double::sum);
        }

        incasso.entrySet().stream()
            .sorted(Comparator.comparingDouble(
                (HashMap.Entry<String, Double> e) -> e.getValue()).reversed())
            .forEach(e -> System.out.printf("%s: %.2f euro%n", e.getKey(), e.getValue()));
    }
}
```

Output:

```text
Zaino: 79.80 euro
Quaderno: 28.00 euro
Penna: 18.00 euro
```

### Errori comuni

- Usare una classe mutabile come chiave di `HashMap` e modificarla dopo l'inserimento.
- Dimenticare `equals` e `hashCode` in una classe usata come chiave.
- Scorrere `keySet()` e chiamare `get` per ogni chiave invece di usare `entrySet()`.
- Implementare `compareTo` sottraendo direttamente due numeri.
- Ordinare una lista `List.of(...)`: è immutabile, lancia `UnsupportedOperationException`.
- Confondere `Comparator.comparing` con `thenComparing` e perdere l'ordinamento secondario.

## Esercizi progressivi

**Esercizio 1.** Crea una `HashMap<String, Integer>` con tre città e i loro abitanti; stampa tutti i valori.

**Esercizio 2.** Leggi una frase e conta le occorrenze di ogni parola con `getOrDefault`.

**Esercizio 3.** Leggi 10 numeri e conta quante volte compare ciascun valore.

**Esercizio 4.** Crea una mappa di prodotti e prezzi, poi stampa solo i prodotti sopra 20 euro.

**Esercizio 5.** Trova il valore massimo di una `HashMap` e stampa la chiave corrispondente.

**Esercizio 6.** Crea `record Studente(String nome, int voto)` e ordina una lista per voto decrescente.

**Esercizio 7.** Ordina la stessa lista prima per nome e poi per voto, usando `Comparator`.

**Esercizio 8.** Crea una classe `Prodotto` con `Comparable` sul prezzo e verifica `Collections.sort`.

**Esercizio 9.** Crea `Coppia<A, B>` come nell'esempio e usala con `Coppia<String, Double>` e `Coppia<Integer, Boolean>`.

**Esercizio 10.** Scrivi un metodo generico `static <T> T ultimo(List<T> lista)` che restituisce l'ultimo elemento, `null` se la lista è vuota.

**Esercizio 11.** Raggruppa una lista di nomi per iniziale usando una `HashMap<Character, ArrayList<String>>`.

**Esercizio 12.** Data una mappa di voti per studente, stampa gli studenti in ordine alfabetico usando `TreeMap` o un `Comparator`.

### Varianti

- Usa `merge` per rifare l'esercizio 2.
- Aggiungi un secondo criterio di ordinamento con `thenComparing` all'esercizio 6.
- Confronta `HashMap` e `TreeMap` sullo stesso insieme di dati.
