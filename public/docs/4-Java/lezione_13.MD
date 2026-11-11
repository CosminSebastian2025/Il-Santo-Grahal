# Lezione 13: Liste e insiemi

Gli array hanno dimensione fissa. Le collezioni si ridimensionano da sole e offrono metodi pronti: aggiungere, cercare, rimuovere, scorrere. In questa lezione usiamo `ArrayList`, `LinkedList` e `HashSet`.

### ArrayList

`ArrayList` è un array ridimensionabile. È la collezione più usata.

```java
import java.util.ArrayList;

ArrayList<String> nomi = new ArrayList<>();

nomi.add("Anna");
nomi.add("Luca");
nomi.add("Sara");

System.out.println(nomi);          // [Anna, Luca, Sara]
System.out.println(nomi.get(0));   // Anna
System.out.println(nomi.size());   // 3
```

| Metodo | Effetto |
| --- | --- |
| `add(x)` | aggiunge in coda |
| `add(i, x)` | inserisce in posizione `i` |
| `get(i)` | legge l'elemento |
| `set(i, x)` | sostituisce l'elemento |
| `remove(i)` | rimuove per posizione |
| `remove(x)` | rimuove la prima occorrenza del valore |
| `size()` | numero di elementi |
| `isEmpty()` | `true` se vuota |
| `contains(x)` | `true` se presente |
| `indexOf(x)` | posizione, `-1` se assente |
| `clear()` | svuota |

Attenzione a `remove` con un `int`: `remove(2)` rimuove l'elemento in posizione 2, mentre `remove(Integer.valueOf(2))` rimuove il valore `2`.

```java
ArrayList<Integer> numeri = new ArrayList<>(List.of(10, 20, 30, 2));

numeri.remove(2);                    // rimuove il 30 (posizione 2)
numeri.remove(Integer.valueOf(2));   // rimuove il valore 2
System.out.println(numeri);          // [10, 20]
```

`List.of(...)` crea una lista immutabile: va copiata in un `ArrayList` se deve cambiare.

```java
ArrayList<String> copia = new ArrayList<>(List.of("a", "b"));
copia.add("c");
```

### Scorrere una lista

```java
for (String nome : nomi) {
    System.out.println(nome);
}

for (int i = 0; i < nomi.size(); i++) {
    System.out.println(i + ": " + nomi.get(i));
}
```

Il `for-each` non permette di rimuovere elementi. Per farlo serve un `Iterator`:

```java
import java.util.Iterator;

ArrayList<Integer> valori = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6));

Iterator<Integer> it = valori.iterator();
while (it.hasNext()) {
    int n = it.next();
    if (n % 2 == 0) {
        it.remove();
    }
}

System.out.println(valori);   // [1, 3, 5]
```

Chiamare `valori.remove(...)` dentro un `for-each` produce `ConcurrentModificationException`.

### LinkedList

`LinkedList` è una lista doppiamente collegata. Inserire e rimuovere agli estremi è veloce, leggere per indice è più lento. Implementa anche `Deque`, quindi funziona da coda.

```java
import java.util.LinkedList;

LinkedList<String> coda = new LinkedList<>();

coda.addLast("primo");
coda.addLast("secondo");
coda.addFirst("urgente");

System.out.println(coda.removeFirst());   // urgente
System.out.println(coda);                 // [primo, secondo]
```

Uso da pila (LIFO):

```java
LinkedList<String> pila = new LinkedList<>();
pila.push("a");
pila.push("b");
System.out.println(pila.pop());   // b
```

Nella pratica si usa quasi sempre `ArrayList`: è più prevedibile e più veloce nella maggior parte dei casi. `LinkedList` conviene quando si aggiunge e rimuove molto all'inizio o si usa come coda.

### HashSet

`HashSet` contiene elementi **unici** e non mantiene l'ordine di inserimento.

```java
import java.util.HashSet;

HashSet<String> lingue = new HashSet<>();

lingue.add("Java");
lingue.add("C#");
lingue.add("Java");    // ignorato: già presente

System.out.println(lingue.size());            // 2
System.out.println(lingue.contains("C#"));    // true
```

Operazioni insiemistiche:

```java
HashSet<String> a = new HashSet<>(List.of("Java", "C#", "Python"));
HashSet<String> b = new HashSet<>(List.of("Python", "Go"));

HashSet<String> intersezione = new HashSet<>(a);
intersezione.retainAll(b);
System.out.println(intersezione);   // [Python]

HashSet<String> unione = new HashSet<>(a);
unione.addAll(b);
System.out.println(unione.size());  // 4

HashSet<String> differenza = new HashSet<>(a);
differenza.removeAll(b);
System.out.println(differenza);     // [Java, C#]
```

`HashSet` è il modo più semplice per contare le parole distinte di un testo. Se serve mantenere l'ordine di inserimento si usa `LinkedHashSet`; se serve l'ordine alfabetico, `TreeSet`.

### List o Set: come scegliere

| Esigenza | Collezione |
| --- | --- |
| Ordine di inserimento e duplicati | `ArrayList` |
| Unicità, nessun ordine | `HashSet` |
| Unicità con ordine di inserimento | `LinkedHashSet` |
| Unicità ordinata | `TreeSet` |
| Coda o pila | `LinkedList` / `ArrayDeque` |

### Esempio completo

```java
import java.util.ArrayList;
import java.util.HashSet;

public class Presenze {

    public static void main(String[] args) {
        ArrayList<String> presenze = new ArrayList<>();

        presenze.add("Anna");
        presenze.add("Luca");
        presenze.add("Anna");
        presenze.add("Sara");
        presenze.add("Luca");

        System.out.println("Registrazioni: " + presenze.size());

        HashSet<String> persone = new HashSet<>(presenze);
        System.out.println("Persone distinte: " + persone.size());

        for (String nome : persone) {
            int volte = 0;
            for (String p : presenze) {
                if (p.equals(nome)) {
                    volte++;
                }
            }
            System.out.println(nome + ": " + volte);
        }
    }
}
```

Output:

```text
Registrazioni: 5
Persone distinte: 3
Anna: 2
Luca: 2
Sara: 1
```

Nella lezione 14 vedremo come contare senza doppio ciclo, usando una `HashMap`.

### Errori comuni

- Confondere indice e valore in `remove`.
- Modificare una lista dentro un `for-each`: `ConcurrentModificationException`.
- Usare `get` con un indice non valido: `IndexOutOfBoundsException`.
- Dimenticare che `List.of` è immutabile.
- Aspettarsi un ordine da `HashSet`.
- Assegnare una lista a un'altra variabile credendo di copiarla: copi il riferimento.

## Esercizi progressivi

**Esercizio 1.** Crea un `ArrayList` di 5 nomi, stampalo, aggiungi un nome in testa e uno in coda, stampa di nuovo.

**Esercizio 2.** Leggi 5 numeri da tastiera in un `ArrayList` e calcola somma e media.

**Esercizio 3.** Crea una lista di numeri e rimuovi tutti quelli negativi con un `Iterator`.

**Esercizio 4.** Crea una lista di città e stampa solo quelle che iniziano per `M`.

**Esercizio 5.** Leggi 10 parole e conta quante sono distinte usando un `HashSet`.

**Esercizio 6.** Confronta due `HashSet` e stampa l'intersezione.

**Esercizio 7.** Usa una `LinkedList` come coda: accoda tre persone e servile una alla volta stampando il nome.

**Esercizio 8.** Crea una lista di nomi con duplicati e produci una nuova lista senza duplicati mantenendo l'ordine di inserimento (`LinkedHashSet`).

**Esercizio 9.** Scrivi `static boolean rimuovi(ArrayList<String> lista, String valore)` che restituisce `false` se il valore non esisteva.

**Esercizio 10.** Scrivi `static int contaOccorrenze(ArrayList<String> lista, String valore)` senza usare `Collections.frequency`.

**Esercizio 11.** Crea una lista di interi e invertila in place scambiando gli elementi con un ciclo.

### Varianti

- Ripeti l'esercizio 5 usando `ArrayList` e `contains` invece di `HashSet`: confronta il codice e spiega quale è più chiaro.
- Aggiungi una seconda lista e produci l'unione senza duplicati.
- Nella lista di città, ordina alfabeticamente con `Collections.sort` e stampa.
