La PSTN (Public Switched Telephone Network) è la rete telefonica pubblica commutata: un insieme di centrali e collegamenti che, per oltre un secolo, ha garantito che due persone distanti potessero parlarsi alzando la cornetta. Non è un singolo sistema ma una gerarchia di reti nazionali interconnesse, nata come infrastruttura analogica e oggi quasi interamente digitale nel trasporto. Capirla serve ancora oggi, perché ogni chiamata VoIP verso un numero fisso passa prima o poi da un gateway che parla con la PSTN.

## Obiettivi

- Descrivere la struttura gerarchica della rete (terminale, linea d'accesso, centrale locale, transito).
- Distinguere segnalazione, commutazione e trasmissione come piani separati.
- Spiegare cosa fa una centrale elettromeccanica o elettronica quando componi un numero.
- Riconoscere i concetti di canale a 64 kbit/s, circuito e occupazione della linea.
- Sapere perché la rete è stata costruita per essere sempre disponibile e a che prezzo.

## Dalla cornetta alla centrale: l'accesso

Il primo tratto è la **linea di abbonato** (accesso), un doppino in rame che parte dal terminale dell'utente e arriva alla centrale locale. Il circuito è alimentato in corrente continua dalla centrale, quindi un telefono a filo funziona anche durante un blackout. La centrale eroga anche la tensione di chiamata (tipicamente attorno ai 48 V DC) e genera la segnalazione in banda, come il tono di libero e la suoneria.

Le prime reti usavano un operatore che collegava a mano i pannelli; l'automazione ha introdotto la selezione a impulsi (decadica) e poi la segnalazione multifrequenza DTMF. Le due modalità convivono ancora: molti apparecchi moderni offrono la scelta tra impulsi e toni.

```text
Terminale --(doppino)-- [centrale locale] --(giunzione)-- [centrale di transito] ...
```

Una **centrale locale** serve un insieme di abbonati e conosce i numeri di quella zona. Se il numero cercato non è locale, la chiamata viene inoltrata a una centrale di livello superiore, che sceglie il percorso verso la rete di destinazione. La numerazione è organizzata in prefissi: in Italia il prefisso distrettuale identifica la zona, lo 0 seleziona la chiamata nazionale e il prefisso internazionale quella verso un altro paese.

## Tre piani che viaggiano insieme

| Piano | Funzione | Esempio |
| --- | --- | --- |
| Accesso | porta la voce dall'utente alla centrale | linea a due fili, DSL sulla stessa coppia |
| Trasporto | porta i fasci di circuiti tra centrali | giunzioni analogiche, link digitali, fibra |
| Segnalazione | stabilisce, controlla e libera la chiamata | impulsi, DTMF, SS7 |
| Commutazione | crea la connessione end-to-end | matrice di commutazione della centrale |

A questi si aggiunge il piano di **gestione**: centrali, tariffe e diagnostica. I confini tra i piani non sono rigidi: la segnalazione può viaggiare dentro la stessa infrastruttura dei canali voce (in banda, come il DTMF) oppure su una rete dati completamente separata (fuori banda, come il canale di segnalazione SS7).

```text
utente ----[segnale di off-hook]----> centrale
centrale --[tono di libero]--------> utente
utente ----[cifre del numero]------> centrale
centrale --[suoneria]--------------> destinatario
```

Il modello del telefono classico è semplice: alzare il microtelefono chiude il circuito e viene interpretato come richiesta di servizio; la centrale risponde con un tono, l'utente digita le cifre, la centrale occupa il canale e genera la suoneria all'altro capo. Ogni passaggio consuma risorse: mentre l'utente parla, il canale è allocato in modo esclusivo da un capo all'altro.

## Il canale a 64 kbit/s e la commutazione di circuito

Quando la voce è stata digitalizzata, la rete ha adottato un formato comune: la voce analogica viene campionata 8000 volte al secondo e codificata con 8 bit per campione, come definito nella raccomandazione ITU-T G.711. Il risultato è un flusso di 64 kbit/s, la "unità" della rete. Un canale vocale o un circuito è fatto di multipli di questa unità.

La **commutazione di circuito** significa che, per tutta la durata della conversazione, esiste un percorso fisico o logico dedicato tra le due parti. La larghezza di banda è garantita e non condivisa con altre chiamate; la latenza e la qualità sono prevedibili. Il prezzo è che la rete è sovradimensionata per il traffico medio: se nel fuso di punta tutte le linee sono occupate, la chiamata fallisce con un tono di occupato, non con un rallentamento.

```bash
# Misurare il ritardo e la perdita di un collegamento verso un apparato di rete
ping -n 5 192.0.2.10
```

Il confronto con le reti a pacchetti (ATM, IP) è il punto di partenza di tutta la telefonia moderna: la PSTN garantisce una banda fissa, le reti a pacchetti risparmiano banda ma richiedono meccanismi per la qualità. Il termine **canale a 64 kbit/s** è la base comune a PSTN e ISDN, e resta il riferimento anche in molti codec VoIP.

## La voce come sequenza di campioni

La conversione analogico-digitale usa la modulazione a codifica di impulsi (PCM): un filtro anti-aliasing limita la banda a circa 4 kHz, il campionamento a 8 kHz soddisfa il teorema di Nyquist, e la quantizzazione a 8 bit produce il flusso a 64 kbit/s. La legge di companding (μ-law in Nord America, A-law in Europa) comprime i valori piccoli per migliorare il rapporto segnale-rumore percepito.

```text
Segnale analogico 3 kHz
        |
    campionamento 8 kHz (125 µs per campione)
        |
    quantizzazione 8 bit + companding A-law
        |
    frame a 64 kbit/s -> multiplex
```

Questo flusso è ciò che la centrale commuta. Qualsiasi sia l'apparato finale, la rete lavora su un valore numerico continuo: è già, a modo suo, una rete digitale, anche se i termini "analogico" e "digitale" descrivono la linea d'accesso residenziale e non il core.

## Errori comuni

- **Confondere PSTN con "la rete analogica"**: l'accesso può essere in rame analogico, ma il trasporto tra centrali è digitale da decenni.
- **Credere che la voce viaggi da un telefono all'altro senza conversione**: ogni tratta ha amplificatori, rigeneratori e codifiche; il segnale che arriva non è identico a quello di partenza.
- **Pensare che la linea sia "libera" quando la cornetta è appoggiata**: la corrente di alimentazione circola sempre, e l'off-hook è la richiesta di servizio.
- **Ignorare la distinzione tra segnalazione e voce**: in banda significa che malintenzionati o guasti acustici possono influenzare la chiamata, come nel caso dei tones di segnalazione.
- **Sottovalutare il costo della commutazione di circuito**: un canale allocato e non utilizzato è banda sprecata, ed è questo che ha spinto verso il VoIP.

## In sintesi

- La PSTN è una gerarchia di centrali collegate da giunzioni, con una numerazione a prefissi.
- Accesso, trasporto, segnalazione e commutazione sono piani distinti che cooperano.
- La commutazione di circuito garantisce banda dedicata, a costo di inefficienza.
- Il canale a 64 kbit/s nasce da PCM a 8 kHz e 8 bit (G.711) ed è il mattone della rete.
- Capire la PSTN aiuta a capire cosa fanno i gateway VoIP e perché esistono.

## Fonti

- ITU-T Q.700 — Introduction to CCITT Signalling System No. 7: https://www.itu.int/rec/T-REC-Q.700-199309-I/en
- ITU-T G.711 — Pulse code modulation (PCM) of voice frequencies: https://www.itu.int/rec/T-REC-G.711/
- ITU-T Q.704 — Signalling network functions and messages: https://www.itu.int/rec/T-REC-Q.704-199403-I/en
- RFC 3398 — ISUP to SIP mapping (contesto della conversione): https://www.rfc-editor.org/rfc/rfc3398.html
