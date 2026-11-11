# Lezione 21: SQL, tabelle e query

Un database relazionale conserva i dati in tabelle: righe (record) e colonne (campi). SQL è il linguaggio per crearle e interrogarle. Questa lezione copre la parte che serve in ogni applicazione.

### Tabelle e tipi

```sql
CREATE TABLE utenti (
    id        BIGINT PRIMARY KEY,
    nome      VARCHAR(100) NOT NULL,
    email     VARCHAR(150) NOT NULL UNIQUE,
    attivo    BOOLEAN NOT NULL DEFAULT TRUE,
    creato_il TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

| Tipo | Uso |
| --- | --- |
| `INTEGER` / `BIGINT` | numeri interi, identificatori |
| `VARCHAR(n)` | testo fino a `n` caratteri |
| `TEXT` | testo lungo |
| `DECIMAL(10,2)` | prezzi e importi |
| `DATE` / `TIMESTAMP` | data, data e ora |
| `BOOLEAN` | vero/falso |

Vincoli:

- `PRIMARY KEY` identifica la riga, unica e non nulla;
- `NOT NULL` obbliga un valore;
- `UNIQUE` impedisce duplicati;
- `DEFAULT` fornisce un valore se manca;
- `REFERENCES` crea una chiave esterna.

### Relazioni e chiavi esterne

```sql
CREATE TABLE libri (
    id        BIGINT PRIMARY KEY,
    titolo    VARCHAR(200) NOT NULL,
    autore    VARCHAR(150) NOT NULL,
    anno      INTEGER,
    utente_id BIGINT REFERENCES utenti(id)
);
```

`utente_id` collega ogni libro a un utente. Il database impedisce di inserire un libro con un `utente_id` inesistente.

Nomi consigliati: tabella al singolare o al plurale ma sempre coerente (`utente` o `utenti`), colonna `<tabella>_id` per la chiave esterna.

### Inserire dati

```sql
INSERT INTO utenti (id, nome, email)
VALUES (1, 'Anna Rossi', 'anna@example.com');

INSERT INTO libri (id, titolo, autore, anno, utente_id)
VALUES (1, 'Il nome della rosa', 'Umberto Eco', 1980, 1);
```

Senza l'elenco delle colonne bisogna fornire tutti i valori nell'ordine della tabella: è fragile, meglio elencarle.

### Leggere dati

```sql
SELECT id, nome, email
FROM utenti;

SELECT titolo, autore, anno
FROM libri
WHERE anno >= 1990
ORDER BY anno DESC;

SELECT *
FROM libri
LIMIT 5;
```

- `WHERE` filtra le righe;
- `ORDER BY` ordina (`ASC` crescente, `DESC` decrescente);
- `LIMIT` limita il numero di righe (in SQL Server si usa `TOP`).

Operatori utili in `WHERE`:

```sql
SELECT titolo FROM libri WHERE titolo LIKE '%rosa%';
SELECT * FROM libri WHERE anno BETWEEN 1980 AND 1990;
SELECT * FROM utenti WHERE email IS NOT NULL;
SELECT * FROM libri WHERE autore IN ('Umberto Eco', 'Italo Calvino');
```

`LIKE` con `%` cerca una parte di testo; `_` rappresenta un carattere singolo.

### Aggiornare ed eliminare

```sql
UPDATE utenti
SET email = 'anna.rossi@example.com'
WHERE id = 1;

DELETE FROM libri
WHERE id = 1;
```

Senza `WHERE` si modificano o si eliminano **tutte** le righe. Prima di eseguire un `UPDATE` o un `DELETE`, esegui la stessa condizione con `SELECT` per contare le righe coinvolte.

### Chiavi e valori auto-generati

```sql
CREATE TABLE prodotti (
    id    BIGSERIAL PRIMARY KEY,
    nome  VARCHAR(150) NOT NULL,
    prezzo DECIMAL(10,2) NOT NULL
);

INSERT INTO prodotti (nome, prezzo) VALUES ('Tastiera', 39.90);
```

`BIGSERIAL` (PostgreSQL) genera l'id automaticamente. In MySQL si usa `BIGINT AUTO_INCREMENT`; in SQL standard `GENERATED ALWAYS AS IDENTITY`.

### Indici

Un indice accelera le ricerche su una colonna, al costo di spazio e di scritture leggermente più lente.

```sql
CREATE INDEX idx_libri_autore ON libri(autore);
CREATE INDEX idx_libri_anno ON libri(anno);
```

Regole pratiche:

- indicizza le colonne usate in `WHERE`, `JOIN` e `ORDER BY`;
- non indicizzare tutto: ogni indice va mantenuto;
- le chiavi primarie hanno già un indice;
- usa `EXPLAIN` per capire come il database esegue una query.

### Strumenti

Con Docker si avvia PostgreSQL in un comando:

```bash
docker run --name postgres-test -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=miodb -p 5432:5432 -d postgres:16
```

```bash
docker exec -it postgres-test psql -U postgres -d miodb
```

Dentro `psql`:

```text
\d          elenca le tabelle
\d utenti   descrive la tabella
\q          esci
```

In alternativa: DBeaver, pgAdmin o l'integrazione del database nell'IDE.

### Esempio completo

```sql
CREATE TABLE ordini (
    id         BIGSERIAL PRIMARY KEY,
    cliente    VARCHAR(150) NOT NULL,
    totale     DECIMAL(10,2) NOT NULL,
    creato_il  DATE NOT NULL DEFAULT CURRENT_DATE
);

INSERT INTO ordini (cliente, totale) VALUES
    ('Anna', 120.50),
    ('Luca', 45.00),
    ('Anna', 30.00);

SELECT cliente, totale
FROM ordini
WHERE totale > 40
ORDER BY totale DESC;

UPDATE ordini
SET totale = totale * 0.9
WHERE cliente = 'Anna';

DELETE FROM ordini
WHERE totale < 20;
```

### Errori comuni

- Eseguire `DELETE` o `UPDATE` senza `WHERE`.
- Salvare date come testo invece di usare `DATE` o `TIMESTAMP`.
- Usare `FLOAT` per i soldi: serve `DECIMAL`.
- Dimenticare la chiave esterna e lasciare righe orfane.
- Confondere `NULL` con stringa vuota o con zero: `NULL` significa "nessun valore".
- Scrivere query con `SELECT *` in produzione: recuperi colonne che non servono.

## Esercizi progressivi

**Esercizio 1.** Crea la tabella `autori` con id, nome e nazionalità.

**Esercizio 2.** Crea la tabella `libri` con chiave esterna verso `autori`.

**Esercizio 3.** Inserisci tre autori e sei libri.

**Esercizio 4.** Elenca tutti i libri pubblicati dopo il 2000.

**Esercizio 5.** Elenca i libri di un autore specifico, ordinati per anno.

**Esercizio 6.** Aggiorna il titolo di un libro.

**Esercizio 7.** Elimina un libro e verifica con `SELECT` che sia sparito.

**Esercizio 8.** Cerca i libri con `LIKE '%guerra%'`.

**Esercizio 9.** Conta quanti libri ci sono nella tabella con `COUNT(*)`.

**Esercizio 10.** Crea un indice sull'anno e verifica con `EXPLAIN` che venga considerato.

**Esercizio 11.** Crea una tabella `prestiti` con `libro_id`, `utente` e `data_prestito`, e inserisci due prestiti.

### Varianti

- Aggiungi un vincolo `CHECK (anno >= 1500)` alla tabella libri.
- Prova a inserire un libro con un `autore_id` inesistente e leggi l'errore del database.
- Esporta i risultati in CSV con `\copy` di `psql`.
