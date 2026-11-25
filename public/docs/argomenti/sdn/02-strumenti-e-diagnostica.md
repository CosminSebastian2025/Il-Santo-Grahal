Un controller SDN è comodo finché funziona; quando non risponde, la rete non smette di inoltrare perché vuole, ma perché qualcuno ha deciso cosa succede nel frattempo. La diagnostica di una rete SDN è quindi diversa da quella classica: non basta guardare le interfacce, bisogna capire se le regole sono arrivate, se sono corrette e se il controller vede la topologia reale. Qui trovi strumenti e procedimenti, con Open vSwitch come laboratorio concreto.

## Obiettivi

- Verificare lo stato di un bridge Open vSwitch e la connessione al controller.
- Ispezionare tabelle di flusso, contatori e pacchetti inviati al controller.
- Riconoscere i sintomi di regole mancanti, disallineate o troppo generiche.
- Usare i log del controller per ricostruire un evento.
- Preparare una verifica di topologia prima di attribuire la colpa alla rete.

## Il modello di guasto

In una rete SDN tre piani vanno controllati: il data plane che inoltra secondo le regole, il canale tra switch e controller, e il controller, che deve vedere la topologia reale. Ogni guasto produce sintomi diversi, e i controlli seguono l'ordine del traffico.

| Livello | Sintomo tipico | Prima verifica |
| --- | --- | --- |
| data plane | perdita selettiva per flusso | contatori delle voci |
| canale | switch in modalità indipendente | stato del canale |
| controller | regole nuove non applicate | log e coda del controller |
| topologia | percorsi subottimali | vista degli host |

Se il canale è giù e lo switch non ha regole locali, il traffico sconosciuto finisce nella table-miss e viene scartato: è il guasto più eclatante e il più facile da diagnosticare.

## Ispezionare Open vSwitch

Open vSwitch espone comandi per lo stato del bridge, delle porte e del canale. Il primo controllo è duplice: cosa contiene il data plane e se è ancora in contatto con chi lo governa.

```bash
# stato complessivo del bridge, incluso il controller
ovs-vsctl show

# connessione al controller: vero se la sessione è stabilita
ovs-vsctl get-controller br0
ovs-appctl ofproto/trace br0 "in_port=1,eth_dst=aa:bb:cc:00:11:22"

# dump delle voci con contatori
ovs-ofctl dump-flows br0
```

`ovs-vsctl show` elenca bridge, interfacce e la sezione `Controller`: con `is_connected` falso nessuna regola nuova verrà consegnata. `ovs-appctl ofproto/trace` simula un pacchetto nel bridge e stampa la voce che lo intercetta, senza sporcare la rete.

```bash
# verifica che la table-miss porti al controller
ovs-ofctl dump-flows br0 table=0 | grep -i table-miss

# contatori per porta: errori, drop, pacchetti
ovs-ofctl dump-ports br0
```

Con `output:controller` il pacchetto sconosciuto viene consegnato; con `drop` un controller assente significa perdita totale. `dump-ports` aggiunge gli errori di interfaccia, invisibili nelle voci.

## Controller, log e intenti

Il controller ha due fonti di verità: la topologia ricostruita e il log delle decisioni. In OpenDaylight e ONOS il log riporta connessioni e disconnessioni di switch, cambi di link e fallimenti di installazione. Prima di sospettare OpenFlow si controlla che lo switch sia connesso, il link noto e il flusso installato.

```text
# sequenza di verifica davanti a un flusso assente
1. lo switch risulta connesso al controller?
2. il link tra i due switch è presente nella topologia?
3. il flusso è stato installato o è in coda?
4. la voce installata corrisponde al traffico reale?
```

Il quarto punto è il più insidioso: un match più stretto non intercetta il traffico, e una priorità bassa perde contro voci generiche. Con `dump-flows` si confrontano le voci, con `ofproto/trace` si simula il pacchetto esatto. Un intento scritto male produce effetti simili a un errore di installazione.

| Errore | Effetto | Rimedia |
| --- | --- | --- |
| match troppo specifico | il flusso non corrisponde | allargare il match su un campo alla volta |
| priorità più bassa | vince una voce generica | aumentare la priorità e motivarla |
| table-miss in drop | pacchetti sconosciuti persi | mandare al controller durante il debug |
| regola vecchia | comportamento obsoleto | rimuovere per cookie o per tabelle |

Il `cookie` è l'alleato della diagnostica: se il controller lo imposta, una query per cookie restituisce solo le sue regole e consente rimozioni mirate.

## Verifica della topologia

I problemi di topologia si presentano come prestazioni degradate o percorsi che attraversano link spenti. Prima di attribuire la colpa al controller, verifica che la rete abbia la forma che il controller descrive: link, indirizzi di management e porta del canale.

```bash
# raggiungibilità degli switch verso il controller
nc -vz 10.10.0.1 6653

# l'indirizzo del controller compare nella tabella ARP
ip neigh show 10.10.0.1
```

La porta 6653 è fra le più usate, ma può variare: controlla quella configurata. Un controller raggiungibile con link assenti indica scoperta topologica incompleta, non un guasto di rete.

## Un caso concreto

In un data center con due switch di accesso e uno di aggregazione, gli host nuovi non raggiungono la rete mentre i flussi già installati funzionano: le voci ci sono e i contatori crescono. Il problema riguarda i flussi nuovi, quindi la verifica si sposta sul canale.

```bash
# il canale è attivo?
ovs-vsctl show | grep -A2 Controller

# il comando di trace dice dove finisce il pacchetto
ovs-appctl ofproto/trace br0 "in_port=3,eth_src=0a:00:00:00:00:01,eth_dst=0a:00:00:00:00:02,ip,nw_dst=10.0.0.20,icmp"
```

Il trace stampa le tabelle attraversate e la voce selezionata. Qui la table-miss di `br0` scarta il pacchetto: lo switch non ha ricevuto la regola nuova. Nel log del controller compare un errore di installazione o una disconnessione recente, e la correzione va fatta sul controller, non sul bridge.

## Errori comuni

- **Guardare solo il controller**: lo switch può essere in modalità indipendente senza che nessuno lo noti.
- **Svuotare il bridge per ripartire puliti**: si perdono i contatori e la prova del guasto.
- **Testare con un ping invece del traffico reale**: il ping segue una voce generica, non il flusso che fallisce.
- **Assumere la porta 6653 senza verificarla**: la porta del canale è spesso personalizzata, e il test fallisce per il motivo sbagliato.
- **Considerare la telemetria esaustiva**: i contatori non dicono quando la voce è stata installata, servono log e timestamp.

## In sintesi

La diagnostica SDN segue il percorso del traffico: data plane, canale, controller, topologia. Open vSwitch offre `show`, `dump-flows`, `dump-ports` e `ofproto/trace`, che insieme permettono di ricostruire la decisione sul singolo pacchetto. La tabella di table-miss spiega quasi sempre i guasti più gravi. I log del controller completano il quadro quando il problema è di installazione o di intento.

## Fonti

- [Open vSwitch Documentation](https://docs.openvswitch.org/)
- [OvS — Faq Openflow](https://docs.openvswitch.org/en/latest/faq/openflow/)
- [OvS — Openflow topics](https://docs.openvswitch.org/en/latest/topics/openflow/)
- [Open Networking Foundation — Sdn definition](https://opennetworking.org/sdn-definition/)
- [Openflow specification v1.5.1](https://opennetworking.org/wp-content/uploads/2014/10/openflow-switch-v1.5.1.pdf)
