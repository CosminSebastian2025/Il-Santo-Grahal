Il modello delle minacce è il ragionamento strutturato con cui un team decide quali rischi di sicurezza valgono la pena di essere affrontati e con quale priorità. Non produce liste infinite di pericoli: costringe a dichiarare che cosa si vuole proteggere, da chi e con quali assunzioni. In questa lezione costruirai un modello minimo per una piccola applicazione web e imparerai a usarlo come documento vivo, aggiornato a ogni cambiamento architetturale.

## Obiettivi

- Delimitare il sistema con confini di fiducia e inventario degli asset.
- Elencare attori, capacità e obiettivi usando una forma riconoscibile di modello.
- Trasformare le minacce in rischi classificati con probabilità e impatto.
- Collegare ogni mitigazione a una voce del modello, senza duplicare controlli inutilmente.

## Che cosa si modella

Un modello delle minacce parte sempre da tre domande: che cosa costruiamo, che cosa può andare storto, che cosa facciamo al riguardo. La prima risposta è un inventario: servizi esposti, database, code di messaggi, segreti, dati personali, pipeline di build. La seconda richiede di ragionare per componenti e flussi di dati, non per elenchi generici di vulnerabilità. La terza produce azioni concrete con un proprietario e una data.

Il punto più trascurato è il **confine di fiducia**: la linea immaginaria oltre la quale un dato o una richiesta non sono più controllati da noi. Il browser dell'utente, un partner che chiama la nostra API, una funzione serverless che legge un bucket, un runner CI che pubblica artefatti: ognuno di questi attraversamenti merita una domanda. Che cosa dimostra l'altra parte? Che cosa accettiamo senza verifica?

Un modello utile è breve. Va aggiornato quando nasce un nuovo endpoint pubblico, quando si introduce un servizio gestito o quando cambia chi può leggere un dataset. Un documento di trenta pagine mai più toccato è peggio di una scheda di due pagine rivista ogni trimestre.

## Attori, obiettivi e capacità

Invece di immaginare "hacker", descrivi attori con motivazioni plausibili. Un classificatore comune distingue attaccanti opportunistici, che sfruttano configurazioni di default trovate con scansioni automatiche, attaccanti con un obiettivo specifico, come frodi o accesso a dati di clienti, e insider, come dipendenti, fornitori e script con credenziali ampie.

| Attore | Interesse | Capacità tipica |
| --- | --- | --- |
| Scanner automatico | trovare servizi esposti non patchati | alta ampiezza, bassa profondità |
| Frode economica | credenziali riutilizzabili | phishing, stuffing, automazione |
| Insider con privilegi | dati riservati | accesso legittimo e abuso |
| Fornitore o libreria | continuità del servizio | catena di fornitura, dipendenze |

Per ogni attore conviene stimare che cosa può fare senza essere scoperto: leggere il codice pubblico, creare account gratuiti, inviare richieste verso endpoint non documentati, osservare tempi di risposta. Queste capacità rendono il modello verificabile: se un controllo presuppone che un attore non abbia un certo permesso, lo devi dichiarare e poi testare.

## Da minacce a rischi

Un approccio pratico è partire dai flussi di dati e chiedere, per ciascuno, se sono garantite proprietà specifiche. Il metodo STRIDE divide le minacce in sei famiglie: spoofing, tampering, repudiation, information disclosure, denial of service ed elevation of privilege. Non è un elenco esaustivo, ma aiuta a non fermarsi alle prime due idee che vengono in mente.

Poi si passa a rischi in forma quasi quantitativa: probabilità in tre livelli e impatto in tre livelli danno una matrice 3x3 sufficiente per ordinare il lavoro. Un rischio "alto per probabilità e impatto" va trattato prima di uno "medio per impatto", anche se nel secondo caso il danno potenziale sembra drammatico.

```text
Esempio di voce del modello

Asset:              archivio delle fatture (dati personali e fiscali)
Confine:            API interna -> servizio di archiviazione
Minaccia:           accesso in lettura da parte di un utente autenticato senza permesso
Scenario:           URL diretto di un file indovinabile e controllo di autorizzazione assente
Rischio:            probabilità alta, impatto alto
Mitigazione:        identificativi opachi, controllo di autorizzazione per oggetto
Verifica:           test di accesso incrociato tra due account di prova
```

La mitigazione non deve essere solo tecnica: spesso la soluzione più economica è ridurre la superficie, per esempio evitando di conservare un dato che non serve o spostando una funzione verso un componente già isolato. Questa scelta va scritta nel modello perché è una decisione di progetto, non un dettaglio implementativo.

## Renderlo operativo

Un modello che non entra nel flusso di lavoro non cambia nulla. Due abitudini lo tengono in vita: la prima è inserirlo nella revisione di progetto delle funzionalità che toccano autenticazione, dati sensibili o integrazioni esterne; la seconda è legarlo ai test, così che ogni mitigazione abbia almeno un test automatico che fallisce se il controllo viene rimosso.

Framing come il NIST Cybersecurity Framework aiutano a collocare l'attività in una struttura più ampia, con funzioni come identificazione, protezione, rilevamento, risposta e recupero. Il modello delle minacce vive soprattutto nella fase di identificazione e alimenta quelle successive, ma non sostituisce né un piano di risposta né i controlli tecnici. Il suo valore è la coerenza: le priorità dichiarate corrispondono al lavoro che il team riesce a dimostrare.

Quando mancano informazioni, non fermarti: annota le assunzioni e le domande aperte. Un modello con tre assunzioni esplicite è più utile di uno perfetto mai scritto, perché rende visibile il punto in cui bisogna chiedere a chi gestisce quel sistema.

## Errori comuni

- **Modellare solo dopo l'incidente**: è un elenco di rimedi tardivi, non una guida di progetto; serve prima, quando una scelta ancora costa poco.
- **Confondere vulnerabilità note con minacce**: "XSS" descrive una classe di problema, non chi la sfrutterebbe e con quale obiettivo; senza attore e scenario manca la priorità.
- **Non aggiornare i confini di fiducia**: aggiungere un'integrazione esterna senza rivedere il modello lascia controlli calibrati su un'affidabilità che non esiste più.
- **Scrivere mitigazioni senza verifica**: se non esiste un test o una revisione periodica, il controllo può sparire con un refactoring e nessuno se ne accorge.

## In sintesi

Il modello delle minacce è un ragionamento breve, esplicito e aggiornato su asset, confini di fiducia, attori e rischi. Si costruisce per flussi di dati, si organizza con famiglie come STRIDE, si prioritizza con una matrice probabilità/impatto. Ogni mitigazione deve avere un modo di verifica. Il modello va collegato alla revisione di progetto e ai test, altrimenti resta un documento decorativo.

## Fonti

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
