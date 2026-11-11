# Lezione 23: JDBC

JDBC è l'API standard con cui Java parla ai database relazionali. Con una connessione, istruzioni SQL e un `ResultSet` puoi leggere e scrivere dati da qualsiasi database che abbia un driver.

### Il driver

Ogni database richiede il suo driver come dipendenza.

```xml
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <version>42.7.3</version>
</dependency>
```

| Database | Driver Maven | URL JDBC |
| --- | --- | --- |
| PostgreSQL | `org.postgresql:postgresql` | `jdbc:postgresql://host:5432/db` |
| MySQL | `com.mysql:mysql-connector-j` | `jdbc:mysql://host:3306/db` |
| H2 (test) | `com.h2database:h2` | `jdbc:h2:mem:test` |
| SQLite | `org.xerial:sqlite-jdbc` | `jdbc:sqlite:file.db` |

### Connessione e lettura

```java
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class EsempioJdbc {

    private static final String URL = "jdbc:postgresql://localhost:5432/miodb";

    public static void main(String[] args) {
        String sql = "SELECT id, nome, email FROM utenti ORDER BY nome";

        try (Connection conn = DriverManager.getConnection(URL, "postgres", "password");
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            while (rs.next()) {
                long id = rs.getLong("id");
                String nome = rs.getString("nome");
                String email = rs.getString("email");
                System.out.println(id + " | " + nome + " | " + email);
            }

        } catch (SQLException e) {
            System.out.println("Errore database: " + e.getMessage());
        }
    }
}
```

- `DriverManager.getConnection` apre la connessione;
- `Statement` esegue SQL statico;
- `ResultSet` è il cursore sulle righe: `next()` passa alla successiva e restituisce `false` alla fine;
- si leggono le colonne per nome o per indice (`rs.getString(2)`);
- try-with-resources chiude tutto anche in caso di errore.

Una connessione non chiusa resta occupata fino alla chiusura dell'applicazione: con poche richieste il database esaurisce le connessioni disponibili.

### PreparedStatement: obbligatorio

Mai concatenare valori nella query:

```java
// SBAGLIATO: SQL injection
String sql = "SELECT * FROM utenti WHERE email = '" + email + "'";
```

Con `' OR '1'='1` la query restituirebbe tutti gli utenti; con `'; DROP TABLE utenti; --` può cancellare dati.

```java
String sql = "SELECT id, nome FROM utenti WHERE email = ?";

try (Connection conn = Db.connessione();
     PreparedStatement ps = conn.prepareStatement(sql)) {

    ps.setString(1, email);

    try (ResultSet rs = ps.executeQuery()) {
        if (rs.next()) {
            System.out.println("Trovato: " + rs.getString("nome"));
        } else {
            System.out.println("Nessun utente");
        }
    }
}
```

I `?` sono parametri posizionati, contati a partire da 1. I metodi di impostazione seguono il tipo: `setString`, `setInt`, `setLong`, `setDouble`, `setBoolean`, `setDate`, `setBigDecimal`.

### Inserire e ottenere l'id

```java
String sql = "INSERT INTO utenti (nome, email) VALUES (?, ?)";

try (Connection conn = Db.connessione();
     PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {

    ps.setString(1, "Anna Rossi");
    ps.setString(2, "anna@example.com");

    int righe = ps.executeUpdate();
    System.out.println("Righe inserite: " + righe);

    try (ResultSet chiavi = ps.getGeneratedKeys()) {
        if (chiavi.next()) {
            System.out.println("Nuovo id: " + chiavi.getLong(1));
        }
    }
}
```

- `executeQuery` per `SELECT`;
- `executeUpdate` per `INSERT`, `UPDATE`, `DELETE` e restituisce il numero di righe;
- `execute` per SQL generico.

```java
String sql = "UPDATE utenti SET attivo = ? WHERE id = ?";

try (PreparedStatement ps = conn.prepareStatement(sql)) {
    ps.setBoolean(1, false);
    ps.setLong(2, 7);
    int aggiornate = ps.executeUpdate();
    System.out.println("Aggiornate: " + aggiornate);
}
```

### Gestire i NULL

```java
int eta = rs.getInt("eta");
boolean etaNulla = rs.wasNull();
```

`wasNull()` dice se l'ultimo valore letto era `NULL`, perché `getInt` restituisce `0` in quel caso. Per le stringhe `getString` restituisce `null`.

### Transazioni in JDBC

Di default ogni istruzione viene confermata subito (`autocommit`). Per una transazione:

```java
try (Connection conn = Db.connessione()) {
    conn.setAutoCommit(false);

    try {
        try (PreparedStatement prelievo = conn.prepareStatement(
                "UPDATE conti SET saldo = saldo - ? WHERE id = ?")) {
            prelievo.setBigDecimal(1, importo);
            prelievo.setLong(2, origine);
            prelievo.executeUpdate();
        }

        try (PreparedStatement deposito = conn.prepareStatement(
                "UPDATE conti SET saldo = saldo + ? WHERE id = ?")) {
            deposito.setBigDecimal(1, importo);
            deposito.setLong(2, destinazione);
            deposito.executeUpdate();
        }

        conn.commit();
    } catch (SQLException e) {
        conn.rollback();
        throw e;
    }
}
```

Se il secondo aggiornamento fallisce, il `rollback` annulla il primo. Imposta `autoCommit(true)` o chiudi la connessione per evitare transazioni aperte.

### Pool di connessioni

Aprire una connessione per ogni richiesta è lento. Un **pool** riusa un insieme di connessioni già aperte.

```xml
<dependency>
    <groupId>com.zaxxer</groupId>
    <artifactId>HikariCP</artifactId>
    <version>5.1.0</version>
</dependency>
```

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:5432/miodb");
config.setUsername("postgres");
config.setPassword("password");
config.setMaximumPoolSize(10);

HikariDataSource ds = new HikariDataSource(config);
```

```java
try (Connection conn = ds.getConnection()) {
    // usa la connessione
}
```

Spring Boot usa HikariCP di default: non serve configurare nulla se imposti `spring.datasource.*`.

### Una classe di supporto

```java
public class Db {

    private static final HikariDataSource DS = creaPool();

    private Db() { }

    private static HikariDataSource creaPool() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DB_URL"));
        config.setUsername(System.getenv("DB_USER"));
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setMaximumPoolSize(10);
        return new HikariDataSource(config);
    }

    public static Connection connessione() throws SQLException {
        return DS.getConnection();
    }
}
```

Le credenziali arrivano da variabili d'ambiente, non dal codice.

### Esempio completo

```java
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class UtenteDao {

    record Utente(long id, String nome, String email) { }

    public List<Utente> tutti() throws SQLException {
        String sql = "SELECT id, nome, email FROM utenti ORDER BY nome";
        List<Utente> utenti = new ArrayList<>();

        try (Connection conn = Db.connessione();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                utenti.add(new Utente(
                    rs.getLong("id"),
                    rs.getString("nome"),
                    rs.getString("email")));
            }
        }

        return utenti;
    }

    public long crea(String nome, String email) throws SQLException {
        String sql = "INSERT INTO utenti (nome, email) VALUES (?, ?)";

        try (Connection conn = Db.connessione();
             PreparedStatement ps = conn.prepareStatement(sql, PreparedStatement.RETURN_GENERATED_KEYS)) {

            ps.setString(1, nome);
            ps.setString(2, email);
            ps.executeUpdate();

            try (ResultSet chiavi = ps.getGeneratedKeys()) {
                chiavi.next();
                return chiavi.getLong(1);
            }
        }
    }
}
```

### Errori comuni

- Concatenare valori nella query: SQL injection.
- Dimenticare di chiudere `Connection`, `Statement` e `ResultSet`.
- Confondere `executeQuery` (che restituisce righe) con `executeUpdate`.
- Usare il driver sbagliato o un URL con porta errata.
- Lasciare `autocommit` attivo e poi aspettarsi il rollback.
- Scrivere credenziali nel codice o nel repository.

## Esercizi progressivi

**Esercizio 1.** Aggiungi il driver PostgreSQL al `pom.xml` e apri una connessione a un database locale.

**Esercizio 2.** Leggi tutte le righe di una tabella e stampale con `Statement` e `ResultSet`.

**Esercizio 3.** Cerca un utente per email con `PreparedStatement`.

**Esercizio 4.** Inserisci un utente e recupera l'id generato.

**Esercizio 5.** Aggiorna l'email di un utente e stampa il numero di righe modificate.

**Esercizio 6.** Elimina un utente e verifica con una `SELECT` che sia sparito.

**Esercizio 7.** Leggi una colonna che può essere `NULL` usando `wasNull()`.

**Esercizio 8.** Scrivi una transazione che sposta denaro tra due conti, con `commit` e `rollback`.

**Esercizio 9.** Usa HikariCP per creare un pool e leggi la stessa tabella tramite il pool.

**Esercizio 10.** Crea una classe `UtenteDao` con `tutti` e `crea` come nell'esempio.

**Esercizio 11.** Prova una query vulnerabile con concatenazione e poi la versione con `PreparedStatement`: prova l'input `' OR '1'='1`.

### Varianti

- Aggiungi al DAO il metodo `elimina(long id)` e verifica il numero di righe.
- Usa H2 in memoria per un test che non richiede PostgreSQL.
- Aggiungi al DAO un metodo `cerca(String parte)` con `LIKE ?` e `%`.
