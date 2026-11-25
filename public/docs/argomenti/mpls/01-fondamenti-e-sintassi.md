MPLS è la tecnologia con cui gli operatori trasportano pacchetti IP decidendo il percorso in base a un'etichetta corta invece che al prefisso di destinazione. Nasce come soluzione per accelerare il forwarding dei router degli anni Novanta, ma la sua fortuna duratura è un'altra: con le etichette si costruiscono tunnel, si separano clienti in VPN di livello 3 e si ingegnerizza il traffico senza toccare i router dei clienti. Qui impari il modello concettuale: FEC, etichetta, LSP, LSR e i protocolli che comunicano le etichette.

## Obiettivi

- Spiegare la differenza tra forwarding basato sull'etichetta e lookup del prefisso IP.
- Descrivere i quattro byte dell'etichetta e le operazioni push, swap e pop.
- Distinguere LER da LSR, ingress da egress, e spiegare come nasce un LSP.
- Confrontare LDP con RSVP-TE e il ruolo di BGP nella distribuzione delle etichette.
- Riconoscere PHP, penultimo hop popping e perché l'etichetta è locale al router.

## Da pacchetto a forwarding equivalence class

Nel routing IP classico ogni router legge l'indirizzo di destinazione e cerca il prefisso più lungo nella tabella di routing. MPLS sposta parte di quel lavoro all'ingresso della rete: il router di bordo classifica il pacchetto una volta, gli assegna un'etichetta e da quel momento i router interni guardano solo l'etichetta. Il gruppo di pacchetti che ricevono lo stesso trattamento si chiama forwarding equivalence class (FEC).

La classificazione può usare più dell'indirizzo: VPN, classe di servizio, path esplicito. Due pacchetti con lo stesso prefisso ma etichette 1000 e 1001 possono andare in tunnel diversi, uno con QoS alta e uno con più banda.

| Aspetto | Forwarding IP classico | Forwarding MPLS |
| --- | --- | --- |
| chiave della decisione | indirizzo di destinazione, prefisso più lungo | etichetta a 20 bit |
| dove si decide il percorso | in ogni router, per pacchetto | in ingresso o con piano di controllo esplicito |
| tabelle | routing + FIB | label forwarding table (label in ingresso e in uscita) |
| differenziazione per servizio | DSCP nel campo TOS/Traffic Class | campo TC dell'etichetta |
| costo per hop | lookup LPM, valutato hardware | lookup esatto su indice dell'etichetta |

Le due modalità convivono: il router di bordo (label edge router, LER) può essere lo stesso che fa routing IP verso l'esterno; i router interni (label switching router, LSR) non hanno bisogno di vedere i prefissi dei clienti. Questa separazione rende MPLS scalabile: il transito non gestisce centinaia di migliaia di rotte VPN.

## L'etichetta da 32 bit

Il label stack entry (chiamato anche shim header) è lungo 4 byte e si inserisce tra l'intestazione di link e quella IP. I campi sono pochi e il loro significato è il contratto di MPLS.

| Campo | Bit | Significato |
| --- | --- | --- |
| Label | 20 | valore dell'etichetta, da 0 a 1048575 |
| TC (ex EXP) | 3 | traffic class, per esempio per DiffServ |
| S | 1 | bottom of stack: 1 sull'ultima etichetta |
| TTL | 8 | time to live, copiato dall'IP in ingresso |

Il campo S dice se ci sono altre etichette sotto: la pila è il meccanismo con cui MPLS costruisce tunnel dentro tunnel. Il TTL viene copiato dall'IP e decrementato a ogni hop, così i loop restano visibili anche nella rete label switched.

```text
+---------------------+--------+-------------+--------------+-------------+
| Ethernet / PPP      | Label  |  TC  | S |TTL| Label 2 ...  | IP header ...|
+---------------------+--------+-------------+--------------+-------------+
         link         <----- 4 byte ------>   <-- pila -->      payload
```

Le etichette da 0 a 15 sono riservate. La 0 è l'explicit null: l'egress la riceve e capisce che deve guardare il pacchetto IP. La 3 è l'implicit null: il penultimo router toglie l'etichetta e il pacchetto arriva senza. Sono i due modi di dire al penultimo hop come comportarsi nel penultimate hop popping.

## Label, LSP e le operazioni del router

Su un'interfaccia il router mantiene una tabella di inoltro etichette: etichetta in ingresso, interfaccia, etichetta in uscita. Le operazioni sono tre: push (aggiunge un'etichetta, tipico dell'ingress), swap (sostituisce l'etichetta, il lavoro dell'LSR), pop (toglie l'etichetta, all'egress o al penultimo hop).

```text
ingress LER:   IP versione 192.0.2.0/24  ->  push 1000  ->  LSP verso egress
LSR interno:  in 1000 su Gi0/1            ->  swap -> 2000 su Gi0/2
penultimo:    in 2000                     ->  pop  -> pacchetto IP nativo
egress LER:   riceve IP, lo consegna all'host o alla rete del cliente
```

L'insieme dei router e dei link attraversati da un pacchetto con una certa etichetta forma un label switched path (LSP). L'LSP può seguire il percorso del routing IP (hop-by-hop, con LDP) oppure un percorso calcolato e riservato (traffic engineering con RSVP-TE). Il secondo caso spiega perché MPLS esiste ancora: un operatore sposta un LSP su un link specifico per evitare congestione senza cambiare prefissi.

## Chi distribuisce le etichette

Un'etichetta non è globale: è un valore locale che ogni router assegna a una FEC e annuncia ai vicini. Ci sono due famiglie di protocolli: quelli che distribuiscono etichette per le rotte già calcolate dal routing IGP (LDP, RFC 5036) e quelli che calcolano loro il percorso e poi riservano risorse (RSVP-TE, RFC 3209). BGP distribuisce le etichette per le VPN, come vedi nella lezione sulle VPN L3.

| Protocollo | Cosa distribuisce | Chi decide il percorso | Uso tipico |
| --- | --- | --- | --- |
| LDP | mapping etichetta-FEC per prefissi IGP | l'IGP, in modo hop-by-hop | core MPLS semplice, VPN L3 |
| RSVP-TE | etichette e risorse riservate su tunnel | l'ingress, con path esplicito | traffic engineering, fast reroute |
| BGP | etichette per VPNv4/VPNv6 e per inter-AS | il piano BGP, con RD e RT | VPN di livello 3, inter-AS option B |

Una nota storica: MPLS nasce da proposte concorrenti (Cisco tag switching, IP switching, ARIS) che l'IETF standardizzò alla fine degli anni Novanta. Oggi convive con segment routing, dove l'ingress impone la lista dei nodi o dei link da attraversare al posto delle etichette locali per prefisso. Molte reti nuove crescono già su SR-MPLS: le etichette restano il livello base su cui SR viaggia, ma il piano di controllo non è più LDP.

## Errori comuni

- **Pensare che l'etichetta identifichi una destinazione**: codifica una FEC, cioè un trattamento; in VPN può identificare un cliente o una route, e prefissi diversi hanno etichette diverse.
- **Credere che l'etichetta sia un valore globale di rete**: ogni router sceglie il valore e lo scambia con i vicini; configurazioni con etichette fisse non funzionano tra apparati diversi.
- **Trattare LDP come protocollo di routing**: LDP non calcola percorsi, segue quello dell'IGP; se l'IGP cambia, anche l'LSP cambia e LDP aggiorna i mapping.
- **Dimenticare TTL e MTU**: ogni etichetta aggiunge 4 byte per livello, e un MTU non adeguato spezza o scarta i pacchetti in modo difficile da vedere.
- **Studiare MPLS solo come "IP veloce"**: il vantaggio attuale non è la velocità del lookup (l'hardware IP è ormai equivalente), ma tunnel, VPN e traffic engineering.

## In sintesi

MPLS sostituisce il look-up del prefisso con un'etichetta corta e locale, assegnata all'ingresso e riscritta a ogni hop, che rappresenta un percorso e un trattamento. L'LSP è il percorso risultante: LDP lo costruisce seguendo l'IGP, RSVP-TE lo calcola e riserva risorse, BGP lo usa per le VPN. I campi dell'etichetta spiegano classifica del traffico, pile per i tunnel e popping finale. La lezione seguente guarda gli strumenti e le VPN che rendono MPLS utile ancora oggi.

## Fonti

- RFC 3031 — Multiprotocol Label Switching Architecture: https://www.rfc-editor.org/rfc/rfc3031.html
- RFC 3032 — MPLS Label Stack Encoding: https://www.rfc-editor.org/rfc/rfc3032.html
- RFC 5036 — LDP Specification: https://www.rfc-editor.org/rfc/rfc5036.html
- RFC 3209 — RSVP-TE: Extensions to RSVP for LSP Tunnels: https://www.rfc-editor.org/rfc/rfc3209.html
- Cisco — Introduction to MPLS: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/mpls/mpls-configuration-guide/introduction-to-mpls.html
