# Lezione 18: Test con JUnit 5

Un test automatico verifica che una parte del codice si comporti come previsto. È l'unico modo pratico per modificare un programma senza rompere ciò che funzionava.

### Primo test

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalcolatriceTest {

    @Test
    void sommaDueNumeriPositivi() {
        Calcolatrice c = new Calcolatrice();
        assertEquals(7, c.somma(3, 4));
    }
}
```

- `@Test` marca il metodo come test.
- `assertEquals(atteso, reale)` confronta i due valori.
- La classe di test sta in `src/test/java` nello stesso package della classe testata.
- Il test non ha `main`: lo esegue Maven con `mvn test`.

### Asserzioni

| Metodo | Verifica |
| --- | --- |
| `assertEquals(a, b)` | uguaglianza |
| `assertNotEquals(a, b)` | diversità |
| `assertTrue(cond)` / `assertFalse(cond)` | booleano |
| `assertNull(x)` / `assertNotNull(x)` | nullo o non nullo |
| `assertThrows(Classe.class, esecuzione)` | eccezione attesa |
| `assertArrayEquals(a, b)` | array uguali |
| `assertAll(...)` | più verifiche insieme |

Messaggio personalizzato (terzo parametro):

```java
assertEquals(7, risultato, "3 + 4 deve fare 7");
```

### Testare le eccezioni

```java
@Test
void dividePerZeroLanciaEccezione() {
    Calcolatrice c = new Calcolatrice();

    ArithmeticException e = assertThrows(
        ArithmeticException.class,
        () -> c.dividi(10, 0)
    );

    assertEquals("Divisione per zero", e.getMessage());
}
```

### Preparare lo stato con @BeforeEach

```java
import org.junit.jupiter.api.BeforeEach;

class RubricaTest {

    private Rubrica rubrica;

    @BeforeEach
    void setUp() {
        rubrica = new Rubrica();
        rubrica.aggiungi(new Contatto("Anna", "3331112222"));
    }

    @Test
    void aggiungeUnContatto() {
        rubrica.aggiungi(new Contatto("Luca", "3339998888"));
        assertEquals(2, rubrica.size());
    }

    @Test
    void trovaPerNome() {
        assertTrue(rubrica.cerca("Anna").isPresent());
    }
}
```

`@BeforeEach` crea uno stato pulito per ogni test: i test non devono dipendere dall'ordine di esecuzione.

Altre annotazioni:

- `@AfterEach` per pulire dopo ogni test;
- `@BeforeAll` / `@AfterAll` per operazioni una sola volta (metodi `static`);
- `@Disabled("motivo")` per disattivare temporaneamente un test;
- `@DisplayName("descrizione")` per un nome leggibile nel report.

### Test parametrizzati

Lo stesso test con più valori:

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@ParameterizedTest
@ValueSource(strings = {"", " ", "   "})
void rifiutaNomiVuoti(String nome) {
    assertThrows(IllegalArgumentException.class,
        () -> new Contatto(nome, "123"));
}
```

```java
import org.junit.jupiter.params.provider.CsvSource;

@ParameterizedTest
@CsvSource({
    "3, 4, 7",
    "0, 0, 0",
    "-2, 5, 3"
})
void sommaCasi(int a, int b, int atteso) {
    assertEquals(atteso, new Calcolatrice().somma(a, b));
}
```

### Cosa testare

Un test vale la pena quando:

- verifica una regola, non una riga di codice;
- ha un nome che descrive il comportamento (`nonAccettaEtaNegativa`);
- copre un caso normale, un caso limite e un caso di errore;
- non dipende da file, rete o ora del sistema se non è necessario.

Esempio di casi per `Conto.preleva`:

| Caso | Input | Atteso |
| --- | --- | --- |
| normale | saldo 100, prelievo 30 | saldo 70, `true` |
| limite | saldo 100, preleva 100 | saldo 0, `true` |
| errore | saldo 100, preleva 101 | saldo 100, `false` |
| errore | saldo 100, preleva -5 | saldo 100, `false` |

### Eseguire i test

```bash
mvn test
```

Output tipico:

```text
[INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

In caso di fallimento Maven indica il test, il valore atteso e quello reale. Leggi quel messaggio prima di toccare il codice.

In IDE i test si eseguono cliccando l'icona verde accanto al metodo: è il ciclo più veloce mentre sviluppi.

### Esempio completo

```java
public class Password {

    public boolean valida(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }
        boolean cifra = false;
        for (char c : password.toCharArray()) {
            if (Character.isDigit(c)) {
                cifra = true;
                break;
            }
        }
        return cifra;
    }
}
```

```java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class PasswordTest {

    private final Password password = new Password();

    @Test
    void accettaPasswordValida() {
        assertTrue(password.valida("segreto1"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"corta1", "senzacifre", ""})
    void rifiutaPasswordNonValide(String valore) {
        assertFalse(password.valida(valore));
    }

    @Test
    void rifiutaNull() {
        assertFalse(password.valida(null));
    }
}
```

### Errori comuni

- Test che dipendono l'uno dall'altro o dall'ordine di esecuzione.
- Un solo test enorme che verifica dieci comportamenti: quando fallisce non sai dove guardare.
- Test che copiano la logica del codice invece di verificare il risultato atteso.
- Test che usano dati reali del database o file dell'utente.
- Modificare il test per farlo passare senza correggere il bug.
- Disattivare i test con `@Disabled` e dimenticarli.

## Esercizi progressivi

**Esercizio 1.** Crea `Calcolatrice` con `somma` e un test con `assertEquals`.

**Esercizio 2.** Aggiungi i test per `sottrai`, `moltiplica` e `dividi`.

**Esercizio 3.** Scrivi un test che verifica `assertThrows` sulla divisione per zero.

**Esercizio 4.** Crea `Rubrica` con `aggiungi` e `size`, prepara lo stato in `@BeforeEach` e scrivi due test.

**Esercizio 5.** Testa `cerca` quando il contatto esiste e quando non esiste.

**Esercizio 6.** Scrivi un test parametrizzato con `@ValueSource` per i nomi vuoti.

**Esercizio 7.** Scrivi un test parametrizzato con `@CsvSource` per tre somme diverse.

**Esercizio 8.** Testa `Conto.preleva` nei quattro casi della tabella (normale, limite, importo eccessivo, importo negativo).

**Esercizio 9.** Testa che `Prodotto` lanci `IllegalArgumentException` con prezzo negativo.

**Esercizio 10.** Rompi di proposito un'asserzione, esegui `mvn test`, leggi il messaggio di errore e correggi.

**Esercizio 11.** Scrivi il test di `Password.valida` come nell'esempio e aggiungi il caso con soli simboli.

### Varianti

- Aggiungi `@DisplayName` in italiano a tre test.
- Aggiungi `assertAll` a un test con più verifiche.
- Misura la copertura con JaCoCo e individua un metodo non testato.
