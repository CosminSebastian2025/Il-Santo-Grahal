# Lezione 22: JOIN, aggregazioni e transazioni

I dati sono distribuiti su più tabelle. `JOIN` le combina, le aggregazioni producono numeri riassuntivi e le transazioni garantiscono che più operazioni abbiano successo o falliscano insieme.

### JOIN: combinare tabelle

```sql
SELECT l.titolo, l.anno, a.nome AS autore
FROM libri l
JOIN autori a ON a.id = l.autore_id;
```

- `libri l` e `autori a` sono alias: abbreviano i nomi nelle colonne;
- `ON` specifica la condizione di collegamento;
- `JOIN` restituisce solo le righe con corrispondenza in entrambe le tabelle.

### LEFT JOIN

Mantiene anche le righe senza corrispondenza, con `NULL` al posto dei dati mancanti.

```sql
SELECT a.nome, COUNT(l.id) AS numero_libri
FROM autori a
LEFT JOIN libri l ON l.autore_id = a.id
GROUP BY a.nome
ORDER BY numero_libri DESC;
```

Un autore senza libri compare con `0`. Con `JOIN` sparirebbe. Questa è la differenza da ricordare.

| Tipo | Restituisce |
| --- | --- |
| `JOIN` / `INNER JOIN` | righe presenti in entrambe |
| `LEFT JOIN` | tutte le righe di sinistra, anche senza corrispondenza |
| `RIGHT JOIN` | tutte le righe di destra |
| `FULL JOIN` | tutte le righe di entrambe |

### Aggregazioni

```sql
SELECT COUNT(*) AS totale,
       AVG(totale) AS media,
       SUM(totale) AS somma,
       MIN(totale) AS minimo,
       MAX(totale) AS massimo
FROM ordini;
```

| Funzione | Significato |
| --- | --- |
| `COUNT(*)` | numero di righe |
| `COUNT(colonna)` | righe con valore non nullo |
| `SUM(x)` | somma |
| `AVG(x)` | media |
| `MIN(x)` / `MAX(x)` | minimo e massimo |

### GROUP BY e HAVING

```sql
SELECT cliente, COUNT(*) AS ordini, SUM(totale) AS spesa
FROM ordini
GROUP BY cliente
HAVING SUM(totale) > 100
ORDER BY spesa DESC;
```

- `GROUP BY` crea un gruppo per ogni valore distinto;
- le colonne nel `SELECT` devono essere aggregate o presenti nel `GROUP BY`;
- `HAVING` filtra i gruppi dopo l'aggregazione, `WHERE` filtra le righe prima.

```sql
SELECT EXTRACT(YEAR FROM creato_il) AS anno, COUNT(*) AS ordini
FROM ordini
WHERE totale > 0            -- righe
GROUP BY anno
HAVING COUNT(*) >= 2        -- gruppi
ORDER BY anno;
```

### Sottoselect

```sql
SELECT nome
FROM utenti
WHERE id IN (
    SELECT utente_id FROM libri WHERE anno > 2000
);
```

```sql
SELECT titolo, anno
FROM libri
WHERE anno > (SELECT AVG(anno) FROM libri);
```

Le sottoselect sono comode; per query complesse a volte conviene una `JOIN` o una vista.

### Modificare dati con JOIN

```sql
UPDATE libri l
SET autore = 'Umberto Eco'
FROM autori a
WHERE a.id = l.autore_id AND a.nome = 'Eco';
```

La sintassi varia tra database: in MySQL si usa `JOIN` dentro `UPDATE`, in PostgreSQL il `FROM`. Controlla sempre la documentazione del tuo database.

### Transazioni

Una transazione raggruppa più operazioni: o tutte riescono, o nessuna.

```sql
BEGIN;

UPDATE conti SET saldo = saldo - 100 WHERE id = 1;
UPDATE conti SET saldo = saldo + 100 WHERE id = 2;

COMMIT;
```

Se qualcosa fallisce:

```sql
ROLLBACK;
```

Il caso classico è il bonifico: se il secondo aggiornamento fallisce, il primo non deve restare applicato.

Proprietà **ACID**:

| Proprietà | Significato |
| --- | --- |
| Atomicità | tutto o niente |
| Coerenza | i vincoli restano validi |
| Isolamento | le transazioni non si vedono a metà |
| Durabilità | dopo il commit i dati restano |

### Livelli di isolamento

| Livello | Problema evitato |
| --- | --- |
| `READ UNCOMMITTED` | niente: legge anche dati non confermati |
| `READ COMMITTED` | dirty read |
| `REPEATABLE READ` | non-repeatable read |
| `SERIALIZABLE` | phantom read, al costo di più attese |

Il default di PostgreSQL è `READ COMMITTED`, quello di MySQL (InnoDB) è `REPEATABLE READ`. Livelli più alti riducono le anomalie ma aumentano i conflitti.

```sql
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- operazioni
COMMIT;
```

### Esempio completo

```sql
CREATE TABLE clienti (
    id     BIGSERIAL PRIMARY KEY,
    nome   VARCHAR(150) NOT NULL
);

CREATE TABLE ordini (
    id         BIGSERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clienti(id),
    totale     DECIMAL(10,2) NOT NULL,
    stato      VARCHAR(20) NOT NULL
);

INSERT INTO clienti (nome) VALUES ('Anna'), ('Luca'), ('Sara');

INSERT INTO ordini (cliente_id, totale, stato) VALUES
    (1, 120.00, 'PAGATO'),
    (1, 30.00, 'PAGATO'),
    (2, 80.00, 'ANNULLATO'),
    (2, 50.00, 'PAGATO'),
    (3, 200.00, 'PAGATO');

SELECT c.nome,
       COUNT(o.id) AS ordini_validi,
       COALESCE(SUM(o.totale), 0) AS speso
FROM clienti c
LEFT JOIN ordini o
       ON o.cliente_id = c.id AND o.stato = 'PAGATO'
GROUP BY c.nome
ORDER BY speso DESC;
```

Output:

```text
nome | ordini_validi | speso
Sara | 1             | 200.00
Anna | 2             | 150.00
Luca | 1             | 50.00
```

La condizione `o.stato = 'PAGATO'` sta nell'`ON` e non nel `WHERE`: così anche chi non ha ordini validi resta nell'elenco con `0`.

### Errori comuni

- Mettere nel `WHERE` la condizione del `LEFT JOIN`: lo trasforma in `JOIN`.
- Dimenticare `GROUP BY` per una colonna non aggregata.
- Usare `HAVING` per filtrare righe: serve `WHERE`.
- Sommare `NULL`: il risultato è `NULL`, usa `COALESCE`.
- Lasciare una transazione aperta: blocca le righe per gli altri.
- Confondere `COUNT(*)` (tutte le righe) con `COUNT(colonna)` (solo valori non nulli).

## Esercizi progressivi

**Esercizio 1.** Con le tabelle `autori` e `libri` della lezione 21, elenca titolo e nome dell'autore con una `JOIN`.

**Esercizio 2.** Elenca tutti gli autori, anche quelli senza libri, con `LEFT JOIN`.

**Esercizio 3.** Conta quanti libri ha ogni autore e ordina dal più prolifico.

**Esercizio 4.** Mostra solo gli autori con almeno due libri usando `HAVING`.

**Esercizio 5.** Calcola anno medio, minimo e massimo dei libri.

**Esercizio 6.** Conta quanti libri sono stati pubblicati per decennio.

**Esercizio 7.** Trova i libri pubblicati dopo la media degli anni.

**Esercizio 8.** Trova gli utenti che hanno almeno un libro con una sottoselect.

**Esercizio 9.** Crea `conti` con tre righe e scrivi una transazione che sposta 50 euro dal conto 1 al conto 2.

**Esercizio 10.** Nella stessa transazione prova a prelevare più del saldo disponibile e verifica il `ROLLBACK`.

**Esercizio 11.** Calcola per ogni cliente il totale speso solo sugli ordini pagati, mantenendo anche i clienti senza ordini.

### Varianti

- Aggiungi `ORDER BY` su due colonne con direzioni diverse.
- Usa `COALESCE` per mostrare `0` al posto di `NULL`.
- Esegui la query dell'esercizio 11 con e senza la condizione nell'`ON` e confronta i risultati.
