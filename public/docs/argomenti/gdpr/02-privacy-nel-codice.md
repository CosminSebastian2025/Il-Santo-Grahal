Appena un servizio diventa "privacy by design" la domanda cambia: non più "cosa dice il regolamento" ma "come lo dimostro nel codice". Pseudonimizzare un identificativo, scrivere un endpoint di export, far scadere i log e cancellare davvero un utente sono operazioni tecniche con effetti verificabili. In questa lezione vediamo quattro meccanismi ricorrenti: pseudonimizzazione dei dati, registro delle attività di trattamento e consensi, diritti degli interessati costruiti come processi di dati, e retention applicata da codice invece che dal buon senso.

## Obiettivi

- Scegliere tra mascheramento, hashing e cifratura in base allo scopo e alla reversibilità.
- Progettare tabelle che rendano dimostrabile il consenso e la sua revoca.
- Realizzare accesso, rettifica, cancellazione e portabilità come viste o query dedicate.
- Applicare la limitazione della conservazione con job schedulati e verifiche.

## Pseudonimizzazione: tre livelli, tre usi

L'articolo 4, punto 5 chiarisce che i dati pseudonimizzati restano dati personali: il vincolo è che l'identificativo non sia attribuibile a una persona senza informazioni aggiuntive, conservate separatamente e protette. Tre tecniche coprono quasi tutti i casi.

| Tecnica | Reversibile | Uso ammesso | Rischio |
| --- | --- | --- | --- |
| Mascheramento (`a***@example.com`) | no | display, assistenza limitata | nessun valore analitico |
| Hash con chiave (HMAC-SHA256) | no, ma stabile | correlazione senza identità, IP per rate limit | rainbow table senza chiave segreta |
| Cifratura (AES-256-GCM, deterministica solo se serve) | sì con chiave | conservare il dato per finalità successive | chiave nel codice o nello stesso database |

La pseudonimizzazione non serve solo a "rendere sicuro" un campo: serve a limitare la finalità. Un identificativo stabile come HMAC dell'email permette di contare utenti distinti e bloccare abusi senza conservare l'email in tabelle di analytics. La chiave HMAC è un segreto separato: se sta nello stesso database del dato pseudonimizzato, la protezione è solo apparente.

```python
import hmac, hashlib, os, base64

def pseudonimo(identificativo: str, chiave: bytes) -> str:
    # identificativo normalizzato (email lowercase), chiave rotabile annualmente
    mac = hmac.new(chiave, identificativo.strip().lower().encode(), hashlib.sha256)
    return base64.urlsafe_b64encode(mac.digest()[:16]).decode().rstrip("=")
```

## Consensi e registro: rendere dimostrabile

Un consenso memorizzato come `boolean` non è accountability: non sai quando è stato dato, con quale testo, tramite quale interfaccia, e non puoi distinguere una revoca da un errore di migrazione. Il modello minimo è una tabella append-only dei consensi con la versione dell'informativa e la provenienza, più una tabella di stato derivata che le applicazioni interrogano.

```sql
CREATE TABLE consensi_eventi (
  id            bigserial PRIMARY KEY,
  interessato   uuid    NOT NULL,
  finalita      text    NOT NULL CHECK (finalita IN ('analytics','marketing','profilazione')),
  concesso      boolean NOT NULL,
  versione_doc  text    NOT NULL,
  canale        text    NOT NULL,
  avvenuto_il   timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW consensi_attuali AS
SELECT DISTINCT ON (interessato, finalita)
       interessato, finalita, concesso, versione_doc, avvenuto_il
FROM consensi_eventi
ORDER BY interessato, finalita, avvenuto_il DESC, id DESC;
```

Il view con `DISTINCT ON` dà lo stato corrente per finalità: un nuovo record revoca il precedente senza cancellare la storia. Le tabelle di analytics leggono solo `consensi_attuali WHERE concesso`, e un'interrogazione periodica segnala utenti presenti nelle tabelle analytics senza consenso valido, che è il tipico difetto dei sistemi con consenso sparpagliato.

## Diritti degli interessati come processi

I diritti degli articoli 15–20 non sono pagine di un sito: sono query che devono attraversare tutti i sistemi in cui vive la persona. Un approccio praticabile è un **indice degli interessati**: una mappa che per ogni identificativo elenca tabella, colonna e tipo di trattamento; le procedure di export e cancellazione si generano da quella mappa, e il test di integrazione fallisce se una nuova tabella con dati personali non la aggiorna.

| Diritto | Meccanismo tecnico | Rischio tipico |
| --- | --- | --- |
| Accesso (art. 15) | export JSON/CSV di tutte le tabelle dell'indice | dimenticare log e box di supporto |
| Rettifica (art. 16) | endpoint che aggiorna la fonte e propaga | copie denormalizzate non aggiornate |
| Cancellazione (art. 17) | job che elimina o anonimizza, con traccia | backup che reintroducono i dati |
| Portabilità (art. 20) | formato strutturato e leggibile da macchina | PDF non importabile |
| Opposizione (art. 21) | flag che spegne profilazione e marketing | effetti solo lato frontend |

La cancellazione merita una nota: i backup non si riscrivono. La pratica accettata è documentare la finestra di conservazione dei backup e un'operazione di "replay della cancellazione" dopo ogni restore: l'elenco degli identificativi cancellati si conserva pseudonimizzato proprio per questo.

## Retention: scadenze eseguite, non dichiarate

Ogni dato personale deve avere una scadenza motivata: log applicativi 30–90 giorni, metriche aggregate, sessioni scadute, metriche di marketing legate al consenso. Se la scadenza esiste solo nell'informativa, il sistema la viola ogni giorno. La forma più affidabile è una vista materializzata o un job che elimina per finestra, con dipendenza dichiarativa e un test che verifica che il conteggio scenda.

```sql
-- policy: eventi di audit conservati 90 giorni, log applicativi 30
SELECT cron.schedule('pulizia_audit', '15 3 * * *', $$
  DELETE FROM eventi_audit WHERE avvenuto_il < now() - interval '90 days';
$$);

-- verifica: nessuna riga oltre la finestra dichiarata
SELECT count(*) AS fuori_policy
FROM eventi_audit
WHERE avvenuto_il < now() - interval '90 days';
```

La stessa logica vale per i servizi di terze parti: pipeline di analytics, error tracking, supporto, CDN. Ognuno è un responsabile e va inserito nell'indice con la propria scadenza, altrimenti la retention è rispettata sul database principale e violata su tre sistemi esterni.

## Errori comuni

- **Hash senza chiave su identificativi a bassa entropia**: l'email è indovinabile, quindi SHA-256 senza segreto è reversibile per dizionario.
- **Salvare la cronologia dei consensi senza versione dell'informativa**: non puoi dimostrare quale testo l'utente ha accettato.
- **Cancellare dalla tabella utenti e lasciare gli eventi**: le chiavi esterne `ON DELETE SET NULL` non cancellano nulla e il dato resta.
- **Affidare la retention al gestore dei log**: le scadenze predefinite dei provider sono spesso di un anno o più.
- **Trattare l'export come un dump del database**: contiene dati di altre persone e va limitato alle righe dell'interessato.

## In sintesi

La pseudonimizzazione è una scelta di finalità, non un travestimento: HMAC con chiave segreta separata separa correlazione e identità. Consensi append-only con versione del documento rendono dimostrabile il trattamento. I diritti diventano query eseguite su un indice delle fonti, e la retention diventa un job verificato da un conteggio. Ogni tabella, log e servizio esterno va inserito nello stesso modello.

## Fonti

- [GDPR - Regolamento UE 2016/679 (testo completo, EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Garante Privacy - Data protection by design e by default](https://www.garanteprivacy.it/regolamentoue/data-protection-by-design-e-data-protection-by-default)
- [Garante Privacy - Approccio basato sul rischio e accountability](https://www.garanteprivacy.it/regolamentoue/approccio-basato-sul-rischio-e-misure-di-accountability-responsabilizzazione-di-titolari-e-responsabili)
- [EDPB - Guidelines, recommendations and best practices](https://edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en)
