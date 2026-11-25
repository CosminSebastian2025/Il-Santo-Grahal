Cisco IOS è il sistema operativo che gira su router e switch Cisco. Non è una shell Unix: è un ambiente a modalità, con una gerarchia di comandi e una configurazione che diventa attiva solo quando la applichi. In questa lezione impari a leggere il prompt e a capire come una modifica passa da testo digitato a configurazione operativa.

## Obiettivi

- Distinguere IOS da IOS XE e dagli altri sistemi operativi Cisco.
- Riconoscere la modalità corrente dalla forma del prompt.
- Usare la help inline e la terminazione parziale dei comandi.
- Spostare una modifica tra configurazione in esecuzione e configurazione di avvio.
- Leggere i messaggi all'avvio della console sui dispositivi non ancora configurati.

## Un sistema operativo, più famiglie di prodotto

La sigla IOS identifica il software di rete di Cisco; nella documentazione ufficiale convive con IOS XE, la sua evoluzione modulare, e con NX-OS per il data center. Un comando che funziona su un router IOS non è detto che esista identico altrove: la sintassi va confrontata con la guida della piattaforma. Il modello mentale (modalità, prompt, configurazione) resta valido anche su IOS XE.

| Sistema | Ambito tipico | Nota per lo studio |
| --- | --- | --- |
| IOS | router e switch storici | riferimento di molti comandi dei lab |
| IOS XE | router e switch recenti | stesso modello a modalità, più moduli |
| NX-OS | data center | sintassi simile, semantica diversa |

## Le modalità e il prompt

IOS espone una macchina a stati: da una modalità se ne raggiungono altre con comandi precisi e tornare indietro è un'operazione esplicita. Il prompt dice dove sei, e ignorarlo è la causa più comune di comandi rifiutati.

| Modalità | Prompt tipico | Cosa consente |
| --- | --- | --- |
| utente | `Router>` | comandi di visualizzazione |
| privilegiata | `Router#` | stato completo, debug, salvataggio |
| configurazione globale | `Router(config)#` | impostazioni che valgono per tutto il sistema |
| interfaccia | `Router(config-if)#` | parametri di una singola porta |
| sottomodale (linea) | `Router(config-line)#` | accesso console e vty |

Il passaggio tra modalità non è un dettaglio di comodo: alcune operazioni hanno senso solo in una modalità e il dispositivo le rifiuta altrove. `exit` retrocede di un livello, `end` torna alla privilegiata da qualsiasi livello di configurazione.

La documentazione di prodotto descrive la sessione CLI come un'interfaccia con help inline, completamento e cronologia delle ultime linee: sono gli strumenti che rendono utilizzabile un vocabolario molto ampio. Il `?` in qualunque posizione mostra le parole ammesse in quel punto.

```text
Router> enable
Router# configure terminal
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip address 192.168.1.1 255.255.255.0
Router(config-if)# no shutdown
Router(config-if)# end
Router#
```

Le stesse operazioni accettano abbreviazioni: `en` per `enable`, `conf t` per `configure terminal`. Sono tollerate finché il prefisso non diventa ambiguo: da IOS 12.4 in poi `sh` non basta più, perché `show` e `shutdown` iniziano con le stesse lettere.

## Configurazione in esecuzione e configurazione di avvio

IOS mantiene due copie della configurazione: quella **in esecuzione**, che si modifica in modalità globale e determina il comportamento immediato, e quella di **avvio**, salvata in memoria non volatile e caricata a ogni riavvio. Le modifiche alla copia in esecuzione non passano automaticamente a quella di avvio: un riavvio senza salvataggio cancella il lavoro.

```bash
# in modalità privilegiata: copia la configurazione in esecuzione in quella di avvio
copy running-config startup-config
```

Nelle versioni più recenti lo stesso risultato si ottiene con `write memory`. Il confronto tra le due copie dice se hai dimenticato un salvataggio.

```bash
show running-config | include hostname   # cosa è attivo in questo momento
show startup-config | include hostname   # cosa verrà caricato al riavvio
```

Lo stesso comando `copy` funziona nelle due direzioni: `copy startup-config running-config` riporta la macchina allo stato salvato, ma le righe presenti solo nella copia in esecuzione non vengono rimosse.

| Copia | Dove vive | Quando cambia | Perdita di un riavvio |
| --- | --- | --- | --- |
| running-config | RAM | subito, con ogni comando accettato | si perde |
| startup-config | memoria non volatile | solo con il salvataggio | resta |
| configurazione predefinita | immagine IOS | mai, è il punto di partenza | resta |

Un dettaglio che a prima vista confonde: i comandi rifiutati non entrano nella copia in esecuzione, quindi `show running-config` è anche la verifica che il comando sia stato interpretato. Se non vedi la riga appena digitata, non è un problema di visualizzazione.

## Primo avvio e messaggi di sistema

Una macchina senza configurazione si presenta con una sequenza di messaggi sulla console. IOS usa i messaggi di sistema per raccontare lo stato dell'hardware e dei servizi, e all'avvio conviene leggerli invece di premere invio per scorrere. Un dispositivo nuovo mostra anche una procedura di configurazione iniziale, che può essere annullata per lavorare a mano.

```text
%SYS-5-CONFIG_I: Configured from console by console
%LINK-3-UPDOWN: Interface GigabitEthernet0/0, changed state to up
```

Il formato è fisso: servizio che emette il messaggio, livello di gravità (da `0` emergenze a `7` debug) e testo. I livelli più bassi sono i più urgenti: un messaggio di livello `5` è una notifica, non un guasto.

## Errori comuni

- **Digitare un comando senza guardare il prompt**: in modalità utente i comandi di modifica non esistono e il dispositivo risponde con un errore.
- **Dimenticare il salvataggio**: la configurazione in esecuzione vive in RAM e un riavvio la cancella.
- **Trattare IOS e IOS XE come identici**: sintassi e feature cambiano per piattaforma; la guida di prodotto è il riferimento.
- **Confondere il livello di gravità con la priorità**: nei messaggi di IOS `0` è il più grave e `7` il più verboso.
- **Uscire dalle modalità senza prestare cura**: un `exit` di troppo ti lascia un livello più in alto e il comando successivo viene interpretato altrove, con un errore che punta al comando e non alla modalità.

## In sintesi

Cisco IOS è un sistema operativo a modalità, e il prompt dice quale è attiva. La configurazione ha due copie: quella in esecuzione modifica subito il comportamento, quella di avvio va salvata. L'help inline e il completamento sono parte dell'interfaccia, non scorciatoie da evitare. I messaggi di sistema raccontano la macchina prima della sua configurazione.

## Fonti

- Cisco IOS Software: una panoramica del sistema operativo — https://www.cisco.com/c/en/us/support/ios-nx-os-software/index.html
- CCNA Exam Topics (Cisco Learning Network) — https://learningnetwork.cisco.com/s/ccna-exam-topics
- TCP/IP Overview — https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13769-5.html
- Configure IP Addresses and Unique Subnets — https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html
- Cisco Modeling Labs — https://developer.cisco.com/modeling-labs/
