Neon è un servizio Postgres gestito la cui particolarità non è il prezzo né la console, ma l'architettura: separa il motore Postgres dallo spazio di archiviazione durevole e mette un WAL replicato in mezzo ai due. Da questa scelta discendono branching istantaneo, scale to zero, autoscaling e restore puntuali. In questa lezione impari come è fatto il sistema, quali oggetti amministri e come si comporta il tuo codice quando il database non è un processo sempre acceso su un disco locale.

## Obiettivi

- Distinguere i due piani di Neon (compute effimero e storage durevole) e capire chi definisce il commit.
- Ordinare gli oggetti logici: organization, project, branch, compute, database, role.
- Scegliere le impostazioni di compute (dimensionamento, autoscaling, scale to zero) con criteri misurati.
- Riconoscere i limiti di compatibilità Postgres che contano in produzione.

## Compute effimero e storage durevole

Neon descrive la propria architettura come una separazione netta: il compute esegue Postgres vero, con parser, planner, MVCC, lock e indici invariati; lo storage possiede durabilità e storia. Il compute usa RAM e NVMe locale come cache, ma non possiede nulla: può essere riavviato, scalato o sostituito senza perdita di dati.

Il write path spiega perché funziona:

| Passo | Chi agisce | Cosa significa per te |
| --- | --- | --- |
| 1 | Il compute applica le modifiche in memoria e genera WAL | transazioni e lock sono quelli di Postgres |
| 2 | Il WAL viene inviato via rete a più safekeeper | il commit costa un round-trip di rete, non un `fsync` locale |
| 3 | Il commit è tale quando un quorum di safekeeper ha confermato (Paxos) | sopravvive alla morte di un safekeeper |
| 4 | I pageserver materializzano le pagine e le scaricano su object storage in modo asincrono | lo storage non è mai sul percorso critico della query |

Sul read path il compute guarda prima `shared_buffers`, poi la cache NVMe locale, e solo in caso di miss chiede la pagina al pageserver indicando un LSN. Il pageserver ricostruisce la versione richiesta riapplicando il WAL su una pagina base presa da object storage. Il punto delicato: **il compute non legge mai direttamente da object storage**, quindi la latenza dell'object storage non entra nelle query.

Il prezzo di questa architettura sono tre cose da sapere: il commit dipende da un quorum di rete, quindi la latenza di scrittura è sensibile alla posizione delle region; le tabelle `UNLOGGED` non scrivono WAL, restano sul disco locale del compute e **non sopravvivono** a un riavvio o a uno scale to zero; statistiche cumulative e stato di sessione (prepared statement, advisory lock, `LISTEN`/`NOTIFY`, parametri `SET` a livello di sessione) si perdono quando il compute viene sospeso.

## Gli oggetti che amministri

L'organizzazione dei dati non è quella di un Postgres con un solo cluster: quasi tutte le operazioni della console e della API lavorano su una gerarchia.

| Oggetto | Contenuto | Note pratiche |
| --- | --- | --- |
| Organization | utenti, fatturazione, progetti | livello account |
| Project | tutte le risorse di un'applicazione | contiene i branch |
| Branch | clone copy-on-write dello stato del database | contiene database e role |
| Compute | istanza Postgres collegata a un branch | si avvia, scala e sospende |
| Database | tabelle, schemi, viste dentro un branch | Postgres standard |
| Role | autenticazione e permessi | senza superuser reale |

Il branch è la vera idea nuova. Quando ne crei uno da `main`, il nuovo branch parte dai dati del genitore al punto attuale (o a un LSN precedente dentro la history window) e **non copia nulla**: condivide le pagine e memorizza solo quelle che modifica. Il tempo di creazione è quindi indipendente dalla dimensione del database, e workflow costosi su Postgres tradizionale diventano banali: una copia per pull request, una per run di CI, una su cui provare una migrazione distruttiva e poi cancellarla.

Il ruolo predefinito del progetto è membro di `neon_superuser`, quindi ha privilegi ampi ma **non può** installare estensioni fuori da quelle supportate né usare `CREATE TABLESPACE`, che in Neon dà errore perché non esiste un filesystem controllabile.

## Dimensionare il compute

Il dimensionamento è espresso in Compute Units (CU); 1 CU corrisponde a 4 GB di RAM. Le fasce basse (0,25 CU = 1 GB) esistono per development, non per carichi reali. Tre parametri guidano le decisioni: min/max compute size con autoscaling; scale to zero, non disattivabile sul piano gratuito dove la sospensione arriva dopo 5 minuti; `max_connections`, che dipende dal compute effettivo secondo `min(max_size, 8 × min_size)` moltiplicato per circa 450, con minimo 100 e massimo 4000.

```sql
-- slot di connessione reali su questo compute
SHOW max_connections;
-- parametri modificabili a livello di sessione
SELECT name FROM pg_settings WHERE context = 'user';
```

Da queste formule derivano due conseguenze operative. Con autoscaling da 0,25 a 4 CU il tetto effettivo usato per le connessioni è 2 CU, non 4, perché `8 × 0,25` limita. Inoltre il connection pooling (endpoint dedicato, fino a 10.000 connessioni indipendentemente dal compute) serve quando le connessioni superano il numero utile, mentre le connessioni dirette restano giuste per `pg_dump`, migrazioni e funzionalità legate alla sessione. Ricorda infine che il primo colpo su un compute sospeso costa il tempo di avvio: un health check con `SELECT 1` ogni minuto tiene il database acceso e lo paghi a ore piene.

## Errori comuni

- **Trattare Neon come un Postgres su disco locale**: usare tabelle `UNLOGGED` per cache o contatori veloci, poi scoprire che i dati spariscono dopo lo scale to zero.
- **Cachare prepared statement tra richieste**: funziona finché il compute resta acceso, poi il nome non esiste più.
- **Sovradimensionare le connessioni**: 300 connessioni dirette su un compute da 0,25 CU non sono disponibili.
- **Dimenticare le temp table**: sono su disco locale del compute, soggette agli stessi limiti delle unlogged.
- **Assumere che `neon_superuser` sia un superuser**: niente estensioni arbitrarie, niente `CREATE TABLESPACE`, parametri di istanza modificabili solo via supporto sul piano Scale.

## In sintesi

Neon è Postgres con la durabilità spostata fuori dal compute: il commit passa da un quorum di safekeeper, le pagine arrivano da un pageserver che le ricostruisce da WAL più object storage, il compute è un ospite intercambiabile. Ne discendono autoscaling, scale to zero e branch copy-on-write, e l'obbligo di pensare in termini di stato volatile del compute. Con la gerarchia di oggetti in mano (project, branch, compute, database, role) sei pronto ad affrontare branching e connessioni.

## Fonti

- [Neon Docs — Architecture overview](https://neon.com/docs/introduction/architecture-overview)
- [Neon Docs — Postgres compatibility](https://neon.com/docs/reference/compatibility)
- [Neon Docs — Branching](https://neon.com/docs/guides/branching-intro)
- [Neon Docs — Serverless driver](https://neon.com/docs/serverless/serverless-driver)
