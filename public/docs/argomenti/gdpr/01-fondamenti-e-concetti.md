Il GDPR (Regolamento UE 2016/679) è la norma che disciplina il trattamento dei dati personali nell'Unione europea e si applica anche a chi sta fuori dall'UE quando offre servizi a persone che si trovano lì. Per chi scrive software non è un documento da dare al legale: è un insieme di requisiti tecnici verificabili su log, backup, database, librerie di terze parti e procedure di incidente. Questa lezione traduce i concetti chiave del regolamento in scelte architetturali concrete.

## Obiettivi

- Distinguere titolare, responsabile, interessato e autorità di controllo, con le rispettive obbligazioni.
- Collegare le basi giuridiche del trattamento alle scelte di prodotto che ne dipendono.
- Tradurre articolo 32 in un elenco di controlli tecnici con evidenze verificabili.
- Sapere quando scatta l'obbligo di notifica di violazione e di nomina di un DPO.

## Chi fa cosa

Il **titolare** decide finalità e mezzi del trattamento: è chi opera la scelta di business. Il **responsabile** tratta i dati per conto del titolare, sulla base di un contratto scritto (articolo 28) che fissa istruzioni, misure di sicurezza, sub-responsabili e assistenza nelle richieste degli interessati: è il ruolo della tua azienda quando il cliente SaaS ti affida i dati dei suoi utenti. L'**interessato** è la persona fisica, titolare di diritti (accesso, rettifica, cancellazione, portabilità, opposizione). Il **DPO** vigila sull'applicazione del regolamento, non è un tecnico che configura i server e non solleva il titolare dalle proprie responsabilità.

| Ruolo | Decide | Risponde di | Riferimento |
| --- | --- | --- | --- |
| Titolare | finalità e basi giuridiche | registro, informativa, violazioni | art. 4, 24 |
| Responsabile | solo esecuzione tecnica | misure concordate, sub-responsabili | art. 28 |
| Interessato | esercita i diritti | — | art. 12–22 |
| DPO | indipendente, senza conflitti | sorveglianza | art. 37–39 |
| Autorità di controllo | poteri ispettivi e sanzionatori | — | art. 51–58 |

Per valutare se un servizio è soggetto al regolamento si usa la regola dell'articolo 3: si applica al titolare stabilito nell'UE, oppure a chi fuori dall'UE **offre beni o servizi** o **monitora il comportamento** di persone nell'UE. Un sito in inglese con prezzi in euro, spedizioni in Italia o cookie di profilazione che seguono utenti italiani è dentro anche con server in Oregon.

## Basi giuridiche e minimizzazione

Ogni trattamento deve poggiare su una base dell'articolo 6: consenso, esecuzione di un contratto, obbligo legale, salvaguardia di interessi vitali, interesse pubblico, interesse legittimo. La base decide cosa puoi fare tecnicamente. Il consenso è revocabile, deve essere una prova registrabile con data e versione del testo, e non è richiesto per dati necessari all'erogazione del servizio contrattato. L'interesse legittimo richiede un test documentato (finalità, necessità, bilanciamento) e una modalità di opt-out.

Da questi obblighi nascono i principi dell'articolo 5 che hanno un impatto diretto sul codice: **minimizzazione** (non raccogliere campi che non servono), **limitazione della conservazione** (ogni tabella ha una scadenza e un job che la applica), **esattezza** (supporto correzione), **integrità e riservatezza**, **accountability** (puoi dimostrare le scelte, non solo dichiararle).

```sql
-- Esempio: traccia che un consenso è stato registrato con una versione precisa
CREATE TABLE preferenze (
  utente_id     uuid PRIMARY KEY,
  analytics     boolean NOT NULL DEFAULT false,
  marketing     boolean NOT NULL DEFAULT false,
  versione_doc  text    NOT NULL,          -- "informativa-2026-03"
  aggiornato_il timestamptz NOT NULL,
  ip_hash       bytea                       -- prova, non IP in chiaro
);
```

## Articolo 32: sicurezza come insieme di controlli

L'articolo 32 chiede misure appropriate al rischio: pseudonimizzazione e cifratura, capacità di garantire riservatezza, integrità, disponibilità e resilienza, ripristino tempestivo dopo un incidente, e regolare verifica dell'efficacia. È un requisito di risultato, non una checklist, ma ogni punto si può mappare su un controllo con un'evidenza.

| Requisito art. 32 | Controllo tipico | Evidenza da conservare |
| --- | --- | --- |
| Cifratura | TLS 1.2+ ovunque, AES-GCM a riposo, KMS | cipher suite attive, policy del bucket |
| Riservatezza | RBAC, minimo privilegio, MFA admin | export dei ruoli, log accessi |
| Integrità | hash firmati dei backup, log immutabili | verifica periodica, hash salvati |
| Disponibilità e resilienza | replica, multi-AZ, test di failover | report dei test |
| Ripristino | backup con prova di restore cronometrata | esito del restore, RTO misurato |
| Verifica dell'efficacia | pen test, audit, revisione accessi | report datati |

## Violazioni, DPIA e DPO

Una **violazione di dati personali** (articolo 4, punto 12) è un evento che porta alla distruzione, perdita, modifica, divulgazione o accesso non autorizzato. Va notificata all'autorità entro 72 ore dalla conoscenza, se comporta un rischio per i diritti delle persone; se il rischio è elevato, la notifica va fatta anche agli interessati. Il lavoro tecnico sta a monte: un registro degli incidenti con orologio, una procedura di classificazione e log sufficienti a ricostruire quali dati e quali persone sono stati toccati.

La DPIA è obbligatoria quando il trattamento è sistematico e su larga scala, per categorie particolari di dati o per il monitoraggio di aree accessibili al pubblico; deve descrivere il trattamento, valutare la necessità e i rischi e indicare le misure. Il DPO è obbligatorio per autorità pubbliche, per chi tratta su larga scala categorie particolari o dati relativi a condanne, e per chi monitora regolarmente gli interessati su larga scala.

## Errori comuni

- **"Non ospitiamo il database in Europa, quindi non ci riguarda"**: l'articolo 3 segue gli interessati che si trovano nell'UE, non la posizione dei server.
- **Registrare il consenso solo come flag `true`**: senza data, versione del testo e origine non hai la prova che il consenso esiste o è stato revocato correttamente.
- **Considerare i log "dati tecnici"**: gli IP, gli URL con parametri e gli user agent sono dati personali e hanno bisogno di scadenza e di una base giuridica.
- **Confondere responsabile e titolare nel contratto**: se non sai chi decide finalità, non sai chi notifica una violazione.
- **Documentare le misure solo nel contratto**: senza evidenze datate, l'accountability resta un'affermazione vuota in un'ispezione.

## In sintesi

Il GDPR si applica agli interessati nell'UE, non ai server. Le basi giuridiche decidono cosa il prodotto può fare, i principi dell'articolo 5 diventano scadenze e campi del database, e l'articolo 32 diventa un elenco di controlli con evidenza. La notifica entro 72 ore si regge su un processo e su log che esistono prima dell'incidente.

## Fonti

- [GDPR - Regolamento UE 2016/679 (testo completo, EUR-Lex)](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Garante per la protezione dei dati personali - Il Regolamento UE](https://www.garanteprivacy.it/regolamentoue)
- [EDPB - Guidelines, recommendations and best practices](https://edpb.europa.eu/our-work-tools/general-guidance/guidelines-recommendations-best-practices_en)
- [Art. 32 GDPR - Sicurezza del trattamento (gdpr-info.eu)](https://gdpr-info.eu/art-32-gdpr/)
