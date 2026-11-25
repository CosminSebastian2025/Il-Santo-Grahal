Un PVC ATM si configura in pochi comandi sul router, ma funziona solo se ogni pezzo della catena è coerente: identificatori giusti, incapsulamento giusto, classe di servizio negoziata, allineamento delle celle sull'interfaccia fisica. Questa lezione passa in rassegna gli strumenti con cui si osserva e si diagnostica una connessione ATM, e le strategie con cui ATM ha convissuto con IP prima di essere sostituito. È materiale da leggere con la documentazione della propria piattaforma accanto, perché la sintassi Cisco varia tra le release.

## Obiettivi

- Leggere l'output di verifica di PVC, interfaccia ATM e stato dell'allineamento.
- Riconoscere in un output la differenza tra PVC attivo, cella con HEC errato e cella scartata per congestione.
- Distinguere i parametri del contratto di traffico e il loro effetto su latenza e scarti.
- Mappare l'architettura a portante ATM (ADSL) con PPPoA, PPPoEoA e incapsulamento IP.
- Spiegare le strategie di migrazione da ATM a IP/MPLS in accesso e core.

## Osservare una connessione

La verifica inizia dall'interfaccia fisica: finché la sincronizzazione di trama o le celle non sono corrette, nessun PVC ha senso. I comandi storici di Cisco IOS riflettono questa stratificazione: uno per il link, uno per l'interfaccia ATM, uno per il PVC.

```bash
show interfaces atm 1/0          # stato del link e contatori fisici
show atm pvc 0/32                # stato e contatori del circuito virtuale
show atm vc                      # tutti i vc attivi con classe e banda
show atm interface atm 1/0       # dettagli dell'interfaccia ATM
```

Un PVC può essere `ACTIVE` e il link `up` anche se il traffico IP non passa: lo stato del PVC conferma che la connessione esiste, non che l'indirizzo incapsulato sia corretto. Confrontare il PVC con la configurazione dell'incapsulamento e verificare che le due estremità usino lo stesso tipo, per esempio `aal5snap` da entrambi i lati. Chi negli anni Novanta ha incontrato un PVC "up, protocol down" conosce bene questa distinzione.

| Sintomo | Dove guardare | Causa tipica |
| --- | --- | --- |
| PVC `INACTIVE` | `show atm pvc` | identificatore diverso su un estremo o sull'operatore |
| ip up, protocol down | `show atm pvc`, incapsulamento | `aal5snap` e `aal5mux` diversi tra i due lati |
| HEC e scarti in crescita | `show interfaces atm`, `show controller` | cavo, deriva di clock, errore fisico |
| scarti con CLP 1 | contatori coda e contratto | burst oltre MBS o sopra il PCR |
| errore di LLC su bridged | configurazione LAN emulation | VLAN o tunnel non coerenti |

I contatori contano cose diverse: errori HEC sono di livello fisico, la caduta di celle è una scelta di politica (coda piena o CLP), la perdita di trama è un problema di trasmissione. Distinguerli evita di inseguire il problema sbagliato.

## Contratto di traffico e strumenti di misura

La classe di servizio non è un'etichetta: determina come il network accetta, marca o scarta le celle. Il policer misura il ritmo con PCR e CDVT; uno shaper in uscita limita l'invio al ritmo contrattato; le soglie di buffer decidono cosa scartare quando la coda cresce. Per questo un PVC che "va lento" spesso è un PVC che rispetta un contratto più basso del necessario.

```bash
show atm pvc 0/32        # nell'output compaiono classe, PCR/SCR/MBS contrattati
show policy-map interface ATM1/0
```

Sul lato applicativo gli strumenti di misura generici non vedono le celle. Un test di throughput IP misura l'effetto complessivo, ma per capire se il policer sta segando il traffico servono i contatori di classe e la distinzione tra celle inviate e celle trasmesse. Nei contratti UBR non c'è nulla da misurare perché non c'è niente di promesso: la scheda tecnica dello SLA deve indicarlo, non lasciarlo dedurre.

## Da ATM a IP: accesso, incapsulamento e migrazione

L'accesso ADSL è il punto in cui ATM ha vissuto più a lungo: il modem stabilisce l'ADSL sul rame, poi incapsula il traffico utente in celle ATM. Due famiglie di incapsulamento hanno convissuto: PPP over AAL5 (PPPoA) e PPP over Ethernet su ATM (PPPoEoA), in cui un Ethernet minimo porta una sessione PPPoE.

| Incapsulamento | Payload ATM | Quando lo si è incontrato | Note |
| --- | --- | --- | --- |
| PPPoA | PPP diretto in AAL5 | attivazione ADSL residenziale classica | nessuna trama Ethernet, overhead minore |
| PPPoEoA | Ethernet con PPPoE dentro AAL5 | ADSL con modem in bridging | autenticazione PPP in un client |
| IPoA / RBE | IP o Ethernet direttamente | configurazioni specifiche | meno frequente nei residenziali |

Lo studio di questi incapsulamenti serve oggi per riconoscere la parola ATM nella configurazione di un modem o nella documentazione di un operatore, e per spiegare perché l'autenticazione PPP è ancora il modo standard con cui molti accessi a banda larga convalidano le credenziali.

La migrazione è avvenuta in due direzioni. In accesso, l'ATM è stato sostituito prima da Ethernet nativo su fibra (accesso FTTH), poi dall'accesso Ethernet su DSLAM vettorizzati, dove le celle restano solo nella parte finale. Nel core, l'ATM dei grandi operatori è stato sostituito da IP/MPLS, che conserva la separazione per servizio tramite VRF e classi senza celle da adattare. Il criterio non è tecnologico ma economico: Ethernet e IP sono stati più veloci e più semplici da scalare, e la garanzia di servizio si è spostata dal circuito di trasporto al contratto IP.

## Errori comuni

- **Fermarsi allo stato `up` del PVC**: essere attivo non significa che l'incapsulamento e l'indirizzo siano corretti; servono anche `protocol up` e verifiche di instradamento.
- **Cercare il problema di velocità nel PVC quando è il contratto**: PCR, SCR e MBS fanno parte del servizio; senza leggerli si cambia configurazione senza cambiare risultato.
- **Diagnosticare errori di trasmissione con i contatori di coda**: HEC e allineamento sono fisici, gli scarti sono politici, e richiedono azioni opposte.
- **Copiare configurazioni ATM da una release a un'altra**: la sintassi di `protocol ip` e delle mappe di classe cambia; la configurazione va presa dal documento della propria versione.
- **Ridurre ADSL a un problema di velocità**: il profilo include incapsulamento e circuito virtuale, e un PVC lato operatore sbagliato rende inutile ogni ottimizzazione.

## In sintesi

La diagnostica ATM si fa a strati: link, interfaccia, PVC, incapsulamento, contratto di traffico. Ogni strato ha i suoi contatori e i suoi errori tipici, e confonderli è l'errore più frequente. Il contratto è ciò che promette prestazioni, non il PVC da solo. Nell'accesso ADSL ATM sopravvive come incapsulamento sopra il rame; nel core l'erede è IP/MPLS, che ne ha assorbito le idee senza le celle.

## Fonti

- ITU-T I.150 — B-ISDN asynchronous transfer mode functional characteristics: https://www.itu.int/rec/T-REC-I.150/en
- ITU-T I.361 — B-ISDN ATM layer specification: https://www.itu.int/rec/T-REC-I.361/en
- ITU-T I.363.5 — B-ISDN ATM Adaptation Layer specification: Type 5 AAL: https://www.itu.int/rec/T-REC-I.363.5/en
- RFC 2684 — Multiprotocol Encapsulation over ATM Adaptation Layer 5: https://www.rfc-editor.org/rfc/rfc2684.html
