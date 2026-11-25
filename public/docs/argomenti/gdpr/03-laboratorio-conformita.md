In questo laboratorio aggiungi un livello minimo di conformità GDPR a un servizio già esistente: `gdpr-lab`, un'API in Python con database SQLite (per semplicità) e log su file. Non riscrivi il prodotto: costruisci le quattro capacità che un'ispezione chiede di vedere, cioè un report di accesso per un interessato, una cancellazione con traccia, un job di retention e un test che verifica che un nuovo campo personale non sbarchi in produzione senza essere censito.

## Obiettivi

- Censire i trattamenti con un indice leggibile da macchina e generare da lì il report di accesso.
- Implementare la cancellazione con anonimizzazione al posto del `DELETE` dove serve la storia.
- Applicare la retention su log e tabelle con una verifica automatica.
- Rilevare campi personali non censiti con una query sul catalogo e un test in CI.

## Il servizio di partenza

`gdpr-lab` espone due tabelle (`utenti`, `eventi_audit`) e scrive un log JSON per richiesta. Il difetto di partenza è quello comune: nessuno ha dichiarato quali campi sono personali, quindi non esiste un modo per esportarli o cancellarli in modo completo.

```sql
CREATE TABLE utenti (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  nome text NOT NULL,
  citta text,
  creato_il timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE eventi_audit (
  id bigserial PRIMARY KEY,
  utente_id uuid REFERENCES utenti(id) ON DELETE SET NULL,
  azione text NOT NULL,
  ip inet NOT NULL,
  avvenuto_il timestamptz NOT NULL DEFAULT now()
);
```

Nota subito il problema dell'esempio: `ON DELETE SET NULL` conserva la riga di audit dopo la cancellazione dell'utente, con l'IP in chiaro. È il classico residuo che fa fallire una verifica.

## Passo 1: l'indice degli interessati

L'indice è un file versionato nel repository che dichiara, per ogni tabella e colonna con dati personali, il tipo, la finalità, la base giuridica e la scadenza. Da questo file si generano sia l'export sia la verifica dei campi non censiti.

```yaml
# privacy/indice.yaml
tabelle:
  utenti:
    finalita: "erogazione del servizio"
    base_giuridica: "art. 6.1.b - contratto"
    conservazione: "fino a richiesta di cancellazione"
    colonne: { email: identificativo, nome: anagrafica, citta: anagrafica }
  eventi_audit:
    finalita: "sicurezza e tracciamento operazioni"
    base_giuridica: "art. 6.1.c - obbligo legale"
    conservazione: "90 giorni"
    colonne: { utente_id: identificativo_riferimento, ip: tecnico }
```

## Passo 2: report di accesso

Il report di accesso non è un dump: è la raccolta delle righe che riguardano una sola persona, da tutte le fonti dell'indice, in un formato strutturato. Si genera dalla mappa, quindi una nuova tabella censita entra automaticamente.

```python
import json, sqlite3, yaml
from datetime import datetime, timezone
from pathlib import Path

def report_accesso(db: sqlite3.Connection, interessato: str) -> dict:
    indice = yaml.safe_load(Path("privacy/indice.yaml").read_text())
    out = {"interessato": interessato, "fonti": {}}
    for tabella in indice["tabelle"]:
        if tabella == "eventi_audit":
            q = "SELECT * FROM eventi_audit WHERE utente_id = ?"
        else:
            q = f"SELECT * FROM {tabella} WHERE id = ?"
        out["fonti"][tabella] = [dict(r) for r in db.execute(q, (interessato,))]
    return out

# il log applicativo è una fonte: si filtrano le righe per pseudonimo dell'utente
def report_log(percorso: str, pseudonimo_utente: str) -> list[dict]:
    righe = []
    for linea in Path(percorso).read_text(encoding="utf-8").splitlines():
        r = json.loads(linea)
        if r.get("utente_pseudonimo") == pseudonimo_utente:
            righe.append(r)
    return righe
```

Il punto da non sbagliare: i log devono identificare l'utente con un pseudonimo (HMAC dell'id), non con email o nome, altrimenti il filtro diventa una ricerca in testo libero e il test non passa.

## Passo 3: cancellazione con traccia

Due strade accettate: eliminare la riga personale e conservare solo i dati non identificativi, oppure anonimizzare in modo irreversibile. Per `eventi_audit` si anonimizza: l'IP diventa una rete `0.0.0.0/0` e `utente_id` viene sostituito dallo pseudonimo; per `utenti` si elimina la riga. Il registro delle cancellazioni serve al "replay" dopo un restore.

```python
def cancella(db, interessato: str, chiave_hmac: bytes) -> None:
    ps = pseudonimo(db, interessato, chiave_hmac)   # dalla lezione precedente
    db.execute("INSERT INTO cancellazioni(interessato, pseudonimo, quando) VALUES (?,?,?)",
               (interessato, ps, datetime.now(timezone.utc).isoformat()))
    db.execute("UPDATE eventi_audit SET ip = '0.0.0.0', utente_id = NULL WHERE utente_id = ?", (interessato,))
    db.execute("DELETE FROM utenti WHERE id = ?", (interessato,))
    db.commit()

# dopo un restore da backup: riapplica tutte le cancellazioni registrate
def replay_cancellazioni(db) -> int:
    righe = db.execute("SELECT interessato FROM cancellazioni").fetchall()
    for (iid,) in righe:
        db.execute("UPDATE eventi_audit SET ip = '0.0.0.0', utente_id = NULL WHERE utente_id = ?", (iid,))
        db.execute("DELETE FROM utenti WHERE id = ?", (iid,))
    db.commit()
    return len(righe)
```

Il registro va scritto **prima** delle cancellazioni: se il processo cade a metà, il replay sa cosa riapplicare. La chiave HMAC usata da `pseudonimo` arriva dal gestore dei segreti, non dal database del servizio.

## Passo 4: retention e campi non censiti

Il job di retention applica le scadenze dichiarate nell'indice e scrive nel log solo il numero di righe eliminate. La verifica dei campi è una query su `information_schema` (o `pragma table_info` su SQLite) confrontata con l'indice: se compare una colonna con nomi tipici come `email`, `telefono`, `ip`, `cf`, e non è nell'indice, il test fallisce.

```python
def campi_non_censiti(db, indice) -> list[str]:
    sospetti = ("email", "nome", "cognome", "telefono", "ip", "indirizzo", "cf", "codice_fiscale")
    mancanti = []
    for (tab,) in db.execute("SELECT name FROM sqlite_master WHERE type='table'"):
        censite = indice["tabelle"].get(tab, {}).get("colonne", {})
        for (col,) in db.execute(f"PRAGMA table_info({tab})"):
            if any(s in col.lower() for s in sospetti) and col not in censite:
                mancanti.append(f"{tab}.{col}")
    return mancanti

def test_indice_completo():
    assert campi_non_censiti(db, yaml.safe_load(Path("privacy/indice.yaml").read_text())) == []
```

## Criterio di verifica

Il laboratorio è concluso se, in sequenza: `report_accesso` restituisce tutti i dati della persona e nessuna riga di altri; dopo `cancella` la ricerca per email non trova più nulla, `eventi_audit` conserva il conteggio delle righe ma senza IP reale né riferimento all'utente; `replay_cancellazioni` su un database ripristinato riporta gli utenti cancellati a zero tracce; il job di retention elimina solo le righe oltre la finestra dichiarata; il test dei campi fallisce quando aggiungi una colonna `telefono` alla tabella `utenti` senza censirla.

## Errori comuni

- **Generare l'export con una lista di tabelle scritta a mano**: alla creazione della prossima tabella il report diventa incompleto senza nessun errore.
- **Usare `ON DELETE SET NULL` senza anonimizzare l'IP**: la cancellazione dell'utente non rimuove i dati personali collegati.
- **Legare il replay delle cancellazioni a un'email**: dopo la cancellazione l'email non esiste più, e con il pseudonimo si perde la corrispondenza.
- **Eseguire il job di retention in modo silenzioso**: senza conteggi nei log non hai evidenza che la politica sia rispettata.
- **Confondere anonimizzazione e pseudonimizzazione**: un identificativo hash stabile resta un dato personale e non chiude la richiesta di cancellazione.

## In sintesi

La conformità verificabile nasce da un indice delle fonti versionato, non da procedure scritte in un documento separato. Export, cancellazione, retention e test dei campi si generano tutti dalla stessa mappa, e il replay delle cancellazioni è il pezzo che tiene insieme backup e diritti degli interessati.

## Fonti

- [GDPR - Regolamento UE 2016/679 (testo completo, EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Garante Privacy - I diritti degli interessati](https://www.garanteprivacy.it/regolamentoue/i-diritti)
- [Garante Privacy - Data protection by design e by default](https://www.garanteprivacy.it/regolamentoue/data-protection-by-design-e-data-protection-by-default)
- [Art. 17 GDPR - Diritto alla cancellazione (gdpr-info.eu)](https://gdpr-info.eu/art-17-gdpr/)
