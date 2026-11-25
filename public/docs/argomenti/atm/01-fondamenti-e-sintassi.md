L'Asynchronous Transfer Mode è la tecnologia con cui le reti pubbliche degli anni Novanta hanno provato a unificare voce, dati e video in un solo dominio a circuito virtuale. Non ha vinto la guerra contro Ethernet e IP, ma ha introdotto idee — celle a lunghezza fissa, contratto di traffico, classi di servizio — che ritrovi in MPLS, DiffServ e nei contratti di SLA. Qui impari come funziona e in quale contesto storico si colloca.

## Obiettivi

- Descrivere la cella ATM da 53 byte, l'intestazione da 5 byte e la mappatura su SONET/SDH.
- Distinguere UNI da NNI, VPI da VCI e la differenza tra PVC e SVC.
- Collocare i livelli fisico, ATM e di adattamento (AAL) e il ruolo di AAL5 per il traffico dati.
- Associare le classi CBR, VBR, ABR e UBR ai parametri del contratto di traffico.
- Riconoscere quando ATM è stato sostituito da Ethernet/IP e quali concetti sopravvivono.

## Una cella piccola e costante

ATM trasporta unità fisse da 53 byte: 5 di intestazione e 48 di payload. La scelta è il cuore del progetto: con unità piccole una cella di voce non aspetta dietro a un file grande più di un tempo limitato, quindi latenza e jitter restano prevedibili anche mescolando dati e tempo reale. Il prezzo è l'overhead, circa il 9,4% della banda, che sale molto quando il payload è piccolo. La lezione resta valida anche fuori da ATM: la dimensione della più piccola unità trasportabile conta quanto la banda.

L'intestazione è di 40 bit più l'HEC. Il GFC esiste solo sulla UNI; sulla rete (NNI) quei 4 bit si aggiungono al VPI, che passa da 8 a 12 bit.

| Campo | Bit | Significato |
| --- | --- | --- |
| GFC | 4 | controllo di flusso, presente solo sulla UNI |
| VPI | 8 | Virtual Path Identifier, 12 bit sulla NNI |
| VCI | 16 | Virtual Channel Identifier |
| PT | 3 | tipo di payload, marca l'ultima cella del pacchetto |
| CLP | 1 | Cell Loss Priority: a 1 la cella si scarta prima |
| HEC | 8 | checksum dell'header e sincronia delle celle |

L'HEC serve a due scopi insieme: verifica i primi 40 bit e fornisce un pattern per ritrovare i confini delle celle. Soprattutto, ATM non ha indirizzi di destinazione, quindi il percorso deve esistere prima che il traffico parta.

## Circuiti virtuali: PVC, SVC, VPI e VCI

Su un'interfaccia ogni percorso virtuale (VPI) contiene fino a 65536 canali virtuali (VCI): la coppia identifica un circuito su quel collegamento. Il valore è locale al link, quindi ogni switch lo riscrive verso il collegamento successivo, come avviene con un tag VLAN.

| Tipo | Come nasce | Chi la configura | Uso tipico |
| --- | --- | --- | --- |
| PVC | statica, concordata con l'operatore | entrambe le estremità e gli switch del percorso | link dati tra sedi |
| SVC | a richiesta, con segnalazione UNI 4.0 | il software del dispositivo chiamante | traffico intermittente |
| UNI / NNI | interfaccia utente / di rete | contratto di servizio | confine cliente-operatore, switch-switch |

Sopra un PVC AAL5 il router incapsula IP secondo la RFC 2684, nella forma "snap" per più protocolli sullo stesso circuito o "mux" per uno solo. Lo stesso circuito poteva portare IP, IPX o una LAN emulata: per questo ATM fu un candidato a trasportare Internet senza cambiare protocollo di rete.

## Livelli, AAL e classi di servizio

Lo stack ATM assomiglia più a SONET/SDH che a Ethernet: le celle viaggiano in una trama STM-N, con overhead di sezione e riga. L'ITU-T colloca la comunicazione su tre livelli: fisico, ATM (celle e multiplexing) e adattamento (AAL), che ricostruisce i pacchetti dell'utente.

AAL5 è il tipo scelto per i dati: un trailer di 8 byte solo nell'ultima cella del pacchetto indica lunghezza e checksum, e le altre celle restano piene. AAL1 serviva al traffico a bit rate costante, AAL2 alla voce compressa. Le classi di servizio descrivono il comportamento promesso alla connessione.

| Classe | Profilo | Esempio d'uso | Parametri del contratto |
| --- | --- | --- | --- |
| CBR | bit rate costante | fonia non compressa, ponti TDM | PCR, CDVT |
| VBR rt / nrt | bit rate variabile | video codificato, dati a burst | PCR, SCR, MBS, CDVT |
| ABR | tasso disponibile con feedback | TCP su ATM, LAN emulation | PCR, MCR, celle RM |
| UBR | senza garanzie | traffico IP senza requisiti | nessuna garanzia |

PCR è il picco di celle al secondo, SCR il valore sostenibile, MBS la dimensione massima di burst, CDVT la tolleranza sulla variabilità. ABR è la parte più ambiziosa: i switch inviano celle di gestione (RM) per comunicare la banda disponibile, anticipando il controllo esplicito di congestione. UBR è il riconoscimento che il best effort non si può contrattare.

## Come ATM è stato sostituito

ATM prometteva una rete unica con qualità garantita per circuito. La storia è andata diversamente per tre ragioni: Ethernet è diventata più economica e veloce, fino a 10 e 100 gigabit; IP ha ottenuto Quality of Service senza celle fisse con DiffServ e MPLS; il traffico web, dove TCP gestisce la congestione, non aveva bisogno di ABR.

Anche l'MPLS delle origini guardò all'ATM come possibile livello di trasporto, con etichette distribuite da LDP sopra commutatori ATM; quella commistione è finita, ma MPLS ha ereditato la commutazione per etichette e l'idea di connessione dedicata per classe di servizio. Il residuo di ATM è l'accesso ADSL: il modem espone un link ATM, il provider usa PVC verso il BNG e le celle AAL5 viaggiano sul rame. Chi studia ATM lo fa soprattutto per capire MPLS e QoS.

## Errori comuni

- **Considerare la cella da 53 byte una scelta di efficienza**: è piccola per ridurre latenza e jitter, non per alzare il throughput; l'overhead è il prezzo che si paga quando la voce viaggia accanto ai dati.
- **Confondere VPI e VCI con indirizzi globali**: sono locali al link, come un tag VLAN, e non servono a instradare da un capo all'altro della rete.
- **Pensare che un PVC garantisca la banda**: la garanzia viene dalla classe di servizio e dal contratto; un PVC in UBR non promette nulla.
- **Ignorare la differenza tra UNI e NNI**: GFC e VPI hanno dimensioni diverse, e un'interfaccia configurata nel modo sbagliato non stabilisce connessioni.
- **Studiare ATM solo come tecnologia morta**: molti documenti su MPLS e QoS ne presuppongono i concetti, che restano la chiave per leggere le reti storiche.

## In sintesi

ATM è stato un tentativo coerente di fare una rete multi-servizio con garanzie di tempo: cella fissa, connessione esplicita, contratto negoziato. È stato superato da Ethernet e IP, più economici e sufficienti, ma ha lasciato concetti e vocabolario: identificatori locali, classi di servizio, PVC, AAL. MPLS ne è l'erede funzionale senza celle, ADSL il residuo di accesso, e capire ATM è la migliore preparazione per capire perché MPLS esiste.

## Fonti

- ITU-T I.150 — B-ISDN asynchronous transfer mode functional characteristics: https://www.itu.int/rec/T-REC-I.150/en
- ITU-T I.361 — B-ISDN ATM layer specification: https://www.itu.int/rec/T-REC-I.361/en
- ITU-T I.363.5 — B-ISDN ATM Adaptation Layer specification: Type 5 AAL: https://www.itu.int/rec/T-REC-I.363.5/en
- RFC 2684 — Multiprotocol Encapsulation over ATM Adaptation Layer 5: https://www.rfc-editor.org/rfc/rfc2684.html
