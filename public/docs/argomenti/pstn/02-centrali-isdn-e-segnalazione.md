Passare dalla rete analogica a una rete a pacchetti ha significato rifare il livello di trasporto, il sistema di segnalazione e i servizi: i canali a 64 kbit/s sono diventati pacchetti IP, e la segnalazione SS7 è stata affiancata, e in parte sostituita, da SIP. Questa lezione mette in ordine le tappe tecniche di questa transizione e gli strumenti con cui osservarla, distinguendo ciò che è ancora PSTN da ciò che è già voce su IP.

## Obiettivi

- Distinguere accesso, core e segnalazione di una rete telefonica moderna.
- Spiegare il ruolo del gateway e della segnalazione SS7 nel collegamento con la commutazione di circuito.
- Sapere perché una rete a pacchetti introduce ritardo, jitter e perdita diversi da una rete a circuito.
- Riconoscere 200 OK e rifiuti di una chiamata nei trace di rete.
- Leggere una cattura con `tshark` per verificare se una chiamata è passata per il VoIP.

## Accesso: rame, fibra e ISDN

Il punto di contatto tra utente e rete è l'accesso. Storicamente l'accesso era la linea analogica: due fili, tensione di alimentazione, toni. La prima evoluzione significativa è stata ISDN, in particolare il Basic Rate (2B+D), che portava due canali a 64 kbit/s e un canale di segnalazione D. ISDN ha introdotto il concetto di segnalazione fuori banda verso l'utente: il D-channel trasporta i messaggi di chiamata, come setup e disconnect, definiti dalla raccomandazione Q.931.

Oggi l'accesso è dominato da fibra e da reti cosiddette Next Generation: la voce viene portata su un tunnel IP e viene terminata da un access gateway con funzioni di telefono (ad esempio un ATA o un ONT con porta FXS). La filodiffusione a 2 o 4 fili dei chiamanti residenziali resta un cavo di rame schermato che finisce in una porta analogica, ma il segnale che ne esce è già stato digitalizzato.

| Tecnologia | Mezzo | Segnalazione verso l'utente | Stato attuale |
| --- | --- | --- | --- |
| Linea analogica (POTS) | rame bifilare | in banda (toni, DTMF) | in dismissione |
| ISDN BRA | rame | Q.931 su D-channel | dismessa nei grandi operatori |
| Fibra con ATA/ONT | FTTH/FTTC | SIP su IP | adottata |
| Accesso mobile | radio | protocolli 3GPP | IMS |

```text
CORNETTA (analogica)
   |  doppino
   v
[ONT/ATA con porta FXS] --(Ethernet/VLAN)-- [router] --(fibra)-- [OLT] --> rete IP
```

Il risultato è che l'ultimo tratto verso la centrale non è più una giunzione a circuito: è un flusso IP.

## Il core: da E1 a IP e il ruolo del gateway

Nel core tradizionale la voce viaggia su fasci E1 a 2 Mbit/s, fatti di 32 canali da 64 kbit/s; uno dei canali è dedicato alla segnalazione. Il protocollo di segnalazione che gestisce le chiamate all'interno della rete è in gran parte SS7 ISUP (Integrated Services User Part). Quando la chiamata deve attraversare una rete IP, serve un **gateway**: un apparato che da un lato ha interfacce E1 e segnalazione ISUP e dall'altro ha SIP e RTP. Il gateway traduce i messaggi ISUP in messaggi SIP e viceversa, e adatta i flussi voce.

```text
[centrale PSTN] --E1/ISUP--> [Media Gateway] --SIP/RTP--> [Softswitch o IMS]
```

Il mapping tra i due mondi è documentato e non banale: una chiamata ISUP ha stati come Initial Address Message, Answer Message e Release, mentre SIP usa INVITE, 200 OK e BYE, con la risposta 183 Session Progress che può anticipare un aggiornamento di stato. La RFC 3398 descrive questa conversione. Nelle reti moderne la parte di controllo è affidata a un **softswitch** o a un nucleo IMS, mentre il Media Gateway è controllato tramite protocolli come Megaco/H.248.

```bash
# Endpoint e trunk configurati su un centralino Asterisk
grep -nE '^\[|^type=|^context=|^host=' /etc/asterisk/pjsip.conf | head -20
```

Un Softphone che chiama un numero fisso attraversa SIP, un trunk, un gateway ISUP e infine i canali della centrale. Se le tratte a circuito sono occupate, il gateway risponde con un errore (spesso 503 o un codice ISUP di congestione), che risale al chiamante come tono di occupato.

## Qualità e strumenti: cosa cambia con i pacchetti

Il circuito dedicato garantisce una banda fissa e una latenza costante. Su IP la voce viaggia in pacchetti RTP, quindi compaiono tre fenomeni: il **ritardo** end-to-end (oltre i 150 ms la conversazione diventa difficile), il **jitter** (variazione dei tempi di arrivo, assorbita da un jitter buffer) e la **perdita di pacchetti**. Le code di accodamento possono mitigare il jitter ma aggiungono ritardo.

```bash
# Conta i pacchetti RTP di una cattura e mostra i flussi
tshark -r chiamata.pcapng -Y rtp -T fields -e ip.src -e ip.dst -e rtp.p_type
```

```bash
# Ispeziona una chiamata SIP: metodo, risposta e Call-ID
tshark -r chiamata.pcapng -Y sip -T fields -e ip.src -e ip.dst -e sip.Method -e sip.Status-Code -e sip.Call-ID
```

Una cattura SIP mostra due tipi di traffico: la segnalazione, testuale e leggibile, e i flussi RTP, binari. Per separare il problema, si guarda prima la segnalazione: un INVITE senza 200 OK è un problema di instradamento o di registrazione, mentre un 200 OK seguito da silenzio indica un problema di media o di codec, spesso un NAT che scarta i pacchetti in ingresso.

| Sintomo | Zona da verificare | Segnale utile |
| --- | --- | --- |
| tono di occupato immediato | chiamata rifiutata | 486 Busy Here o 503 |
| voce solo in un senso | NAT, SDP, firewall | SDP con indirizzo privato |
| voce metallica e scatti | jitter, perdita | statistiche RTP |
| chiamata che cade dopo 30-60 s | timeout o BYE | INVITE senza ACK |

## Errori comuni

- **Credere che "voce su IP" significhi "nessuna relazione con la PSTN"**: ogni chiamata verso un numero fisso passa da un gateway che parla con la rete a circuito.
- **Ignorare la segnalazione fuori banda**: su ISDN o su SS7 i messaggi di chiamata hanno una propria struttura, e non si vede nei toni.
- **Misurare solo la latenza media**: per la voce conta la distribuzione e il jitter, non solo il valore medio di ping.
- **Studiare la cattura SIP senza correlare i flussi RTP**: un dialogo 200 OK non garantisce che i pacchetti voce arrivino.
- **Confondere Q.931 (verso l'utente) con ISUP (tra centrali)**: sono livelli e interfacce diversi, con messaggi e scopi diversi.

## In sintesi

- L'accesso evolve da rame analogico a ISDN e poi a fibra con SIP, ma la cornetta resta spesso analogica.
- Nel core SS7 ISUP governa le chiamate a circuito; i gateway traducono ISUP in SIP e RTP verso IP.
- La commutazione di circuito garantisce banda e latenza costanti, mentre IP richiede attenzione a ritardo, jitter e perdita.
- `tshark` separa segnalazione e media e aiuta a capire dove si rompe una chiamata.
- La transizione è un ponte permanente: gateway e softswitch fanno convivere i due mondi.

## Fonti

- ITU-T Q.931 — ISDN user-network interface layer 3 specification: https://www.itu.int/rec/T-REC-Q.931-199805-I/en
- ITU-T Q.704 — Signalling network functions and messages: https://www.itu.int/rec/T-REC-Q.704-199403-I/en
- RFC 3398 — ISUP to SIP Mapping: https://www.rfc-editor.org/rfc/rfc3398.html
- tshark — Manuale della riga di comando di Wireshark: https://www.wireshark.org/docs/man-pages/tshark.html
