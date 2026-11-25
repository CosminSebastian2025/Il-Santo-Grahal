QoS non aggiunge banda: decide a chi togliere banda quando la banda non basta. Tutto comincia da due domande semplici, che cosa sta attraversando il router e quanto posso fidarmi di chi lo dichiara. La prima risposta è la classificazione, la seconda è il marking, cioè la scrittura di un'etichetta nell'header IP o nel frame Ethernet che i dispositivi successivi possono leggere senza riaprire i pacchetti fino al livello applicativo.

## Obiettivi

- Spiegare perché la QoS diventa necessaria solo nei momenti di congestione.
- Leggere i campi DSCP e un bit di classe Ethernet e capire cosa può essere marcato.
- Applicare classificazione modulare e NBAR al traffico reale.
- Usare l'interfaccia di comando per marcare e correggere le etichette.
- Distinguere il marking di fiducia dal marking abusivo di un host.

## Perché la QoS esiste

Nessun operatore può comprare banda infinita: le offerte commerciali sono quasi sempre sovradimensionate di giorno e strette nei momenti di picco. Quando la coda di uscita di un'interfaccia si riempie, il router deve scartare o ritardare qualcosa. Senza QoS lo fa secondo un ordine casuale, e il pacchetto di una chiamata vocale condivide la sorte di un download da 2 GiB.

La qualità percepita dipende da tre ritardi: latenza (una via), jitter (variazione della latenza) e perdita. La voce tollera una certa perdita mascherata dai codec, mentre il tailgating dell'ultimo pacchetto di un frame video si nota subito. La QoS non elimina la congestione ma rende prevedibile chi la subisce.

| Traffico | Latenza tipica tollerata | Sensibilità al jitter | Sensibilità alla perdita |
| --- | --- | --- | --- |
| Voce interattiva | sotto 150 ms una via | alta | media, codec con mascheramento |
| Videoconferenza | sotto 200-300 ms | alta | alta sui pacchetti I-frame |
| Video in streaming | 1-3 s di buffer | bassa | bassa, recuperata dal buffer |
| Navigazione web | 200-400 ms | bassa | media |
| Backup e trasferimenti | minuti | nulla | alta se si vuole la velocità |

La tabella non è una legge fisica ma una guida di progettazione: fissa i valori target prima di configurare qualsiasi cosa.

## DSCP, TOS e CoS

In IPv4 l'header contiene un byte chiamato tradizionalmente TOS. Dal 1998 la parte alta di quel byte, sei bit, si chiama DSCP e i due bit bassi sono ECN (RFC 2474, RFC 3168). I primi tre bit del DSCP riproducono il vecchio campo di precedenza IP e formano i codepoint Class Selector da `xxx000`, quindi `CS0` corrisponde a DF, `CS1` a `001000` e così via.

| Codepoint | Binario | Decimale | Uso tipico |
| --- | --- | --- | --- |
| DF (CS0) | `000000` | 0 | best effort |
| AF11 | `001010` | 10 | dati a basso rischio, store and forward |
| AF21 | `010010` | 18 | transazioni interattive |
| AF31 | `011010` | 26 | streaming |
| AF41 | `100010` | 34 | videoconferenza |
| CS4 | `100000` | 32 | video interattivo |
| CS5 | `101000` | 40 | segnalazione telefonica |
| EF | `101110` | 46 | voce |
| CS6 | `110000` | 48 | protocolli di instradamento |
| CS7 | `111000` | 56 | riservato |

I codepoint AF hanno tre livelli di scarto all'interno della stessa classe: AF11, AF12, AF13 cambiano solo nel valore di drop, e i PHB Assured Forwarding devono garantire banda per classe indipendentemente dal carico delle altre (RFC 2597). Nel livello 2 802.1Q esiste il campo PCP di tre bit, otto classi, ma non tutti gli switch lo rispettano nello stesso modo.

```text
# Byte DSCP di un pacchetto voce EF
  7  6  5  4  3  2  1  0
+--+--+--+--+--+--+--+--+
| 1| 0| 1| 1| 1| 0| E|E |   = 0xB8 con ECN disattivato
+--+--+--+--+--+--+--+--+
  \__________ DSCP ______/^- ECN
```

Un'attrezzatura che mostra `0xB8`, `184` oppure `46` sta dicendo la stessa cosa a livelli diversi: l'ultimo valore è quello corretto da usare nei comandi.

## Classificare prima di marcare

Un classificatore associa ogni pacchetto a una classe. `MQC` (Modular QoS CLI) divide il lavoro in tre pezzi: una `class-map` riconosce, una `policy-map` decide, un'applicazione all'interfaccia agisce. Gli strumenti tipici sono ACL, `match dscp`, `match protocol` con `NBAR` per riconoscere HTTP, TelePresence o applicazioni simili, e la direzione.

```cisco
class-map match-any VOCE
 match protocol rtp audio
 match protocol skinny
!
class-map match-any SEGNALAZIONE
 match protocol sip
!
policy-map MARKING-INGRESSO
 class VOCE
  set dscp ef
 class SEGNALAZIONE
  set dscp cs5
 class class-default
  set dscp df
!
interface GigabitEthernet0/1
 service-policy input MARKING-INGRESSO
```

```cisco
! Verifica delle classi e dell'interfaccia
Router# show class-map VOCE
Router# show policy-map interface GigabitEthernet0/1
Router# show policy-map MARKING-INGRESSO
```

La direzione `input` è quasi sempre quella corretta per il marking: un pacchetto marcato dall'host si può controllare e correggere all'ingresso, mentre lasciarlo intatto per tutta la rete significa fidarsi di ogni presa Ethernet.

## Fiducia e correzione

Un telefona IP configurato dall'azienda marca la sua voce con EF: è ragionevole fidarsi. Un portatile di un ospite può marcare EF il backup: no. La tecnica standard è un border between domini, cioè un router che cancella o riscrive il marking di chi non conviene.

```cisco
! Host non fidati: azzera il DSCP e poi applica una policy locale
class-map match-any NON_FIDATO
 match access-group name PORTE_OSPITI
!
policy-map CORREGGI
 class NON_FIDATO
  set dscp df
```

Esistono due strategie diffuse: marcare il più vicino possibile alla sorgente e fidarsi solo delle porte configurate (trust boundary), oppure cancellare tutto all'ingresso e riclassificare con NBAR. La prima è più scalabile, la seconda più robusta; molte reti aziendali le combinano.

## Errori comuni

- **Marcare solo dove c'è congestione**: il marking serve a tutti i dispositivi successivi, e conviene farlo il prima possibile, con una policy coerente nell'intero dominio; NBAR matcha i protocolli per porta non standard e richiede che il motore di classificazione sia abilitato e aggiornato.
- **Fidarsi del DSCP proveniente da qualsiasi porta**: un ospite può alzare la priorità del proprio traffico, quindi il marking di ingressi non controllati va azzerato.
- **Confondere DSCP e campo TOS completo**: il DSCP occupa sei bit del byte TOS e i valori mostrati da un analizzatore possono essere shifted, raddoppiati o decimali; controlla sempre la convenzione in uso, perché un byte `0xB8` è il valore del campo TOS intero e non un DSCP.
- **Segmentare con una regola ACL per ogni codice DSCP senza documentare le classi**: dopo tre mesi nessuno sa più perché AF31 riceve più banda di AF21; scrivi una tabella delle classi e mantienila aggiornata.
- **Applicare il marking solo all'uscita**: il pacchetto è già stato messo in coda, e il ritardo che la voce doveva evitare è già avvenuto prima che il nuovo valore venga scritto.

## In sintesi

La QoS senza classificazione e marking è un elenco di priorità senza etichetta. Il DSCP a sei bit è il posto in cui la rete registra la promessa, i codepoint EF, AF e CS sono le scorciatoie standardizzate che permettono di riusare le configurazioni. La regola operativa è marcare vicino alla sorgente, correggere alle frontiere e documentare le classi.

## Fonti

- [An Architecture for Differentiated Services — RFC 2475](https://www.rfc-editor.org/rfc/rfc2475.html)
- [Definition of the Differentiated Services Field (DS Field) — RFC 2474](https://www.rfc-editor.org/rfc/rfc2474.html)
- [Assured Forwarding PHB Group — RFC 2597](https://www.rfc-editor.org/rfc/rfc2597.html)
- [DiffServ Service Classes and DSCP ranges — Cisco](https://www.cisco.com/c/en/us/support/docs/quality-of-service-qos/qos-packet-marking/10103-dscpvalues.html)
- [Guidelines for DiffServ Service Classes — RFC 4594](https://www.rfc-editor.org/rfc/rfc4594.html)
