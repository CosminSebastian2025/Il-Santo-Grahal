In questo laboratorio costruisci una rete minima controllata da un controller, usando Open vSwitch in namespace di rete Linux. Crei due host, un bridge che li collega e un controller esterno, poi scrivi le regole a mano, verifichi con `ofproto/trace` che il percorso sia quello atteso e simuli la caduta del controller. Tutto gira in locale e si smonta con pochi comandi.

## Obiettivi

- Creare namespace, veth e un bridge Open vSwitch con il comando giusto.
- Collegare un bridge a un controller e osservare il canale.
- Installare voci di flusso con priorità e verificare la scelta con il trace.
- Misurare l'effetto della table-miss quando il controller non risponde.
- Smontare l'ambiente e rendere l'esperimento ripetibile.

## Il contratto del laboratorio

Il laboratorio produce una rete con due host che si scambiano pacchetti attraverso un bridge. I namespace rendono l'esperimento veloce e isolato, ma richiedono privilegi di root e un kernel Linux con supporto di rete virtuale.

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| host | namespace `h1`, `h2` | isolamento |
| bridge | `br-sdn` | software, con supporto OpenFlow |
| indirizzi | 10.10.0.1/24 e 10.10.0.2/24 | rete unica del laboratorio |
| controller | localhost:6653 | indirizzo di ascolto noto |
| regole | scritte a mano | effetto delle singole voci |
| criterio | `ping` e `trace` | verifica diretta |

## Montare topologia e canale

Si parte dai namespace, poi i cavi virtuali, poi il bridge. Ogni `veth` nasce in coppia: un'estremità resta nel root namespace e viene agganciata al bridge, l'altra entra nell'host.

```bash
sudo ip netns add h1
sudo ip netns add h2
sudo ip link add br-sdn type openvswitch
sudo ip link add veth1 type veth peer name veth1-br
sudo ip link add veth2 type veth peer name veth2-br
sudo ip link set veth1 netns h1
sudo ip link set veth2 netns h2
sudo ip link set veth1-br master br-sdn
sudo ip link set veth2-br master br-sdn
sudo ip netns exec h1 ip addr add 10.10.0.1/24 dev veth1
sudo ip netns exec h2 ip addr add 10.10.0.2/24 dev veth2
sudo ip -n h1 link set veth1 up
sudo ip -n h2 link set veth2 up
sudo ip link set br-sdn up
sudo ip link set veth1-br up
sudo ip link set veth2-br up
```

Il bridge è di tipo `openvswitch`, quindi accetta porte normali e il canale OpenFlow. Il canale va verificato prima delle regole.

```bash
# canale verso il controller
sudo ovs-vsctl set-controller br-sdn tcp:127.0.0.1:6653
sudo ovs-vsctl show
```

Se `is_connected` è falso, il controller non ascolta sulla porta indicata: `ss -lntp | grep 6653` lo conferma. Senza un controller vero il bridge resta in modalità normale e inoltra da solo, ma la sessione non si stabilisce.

```bash
# ping di base tra gli host
sudo ip netns exec h1 ping -c 3 10.10.0.2
```

Il ping funziona prima delle regole perché lo switch in modalità normale impara le MAC: le voci che scrivi diventano la verità quando la modalità cambia.

## Regole, trace e caduta del controller

Il cuore del laboratorio sono una voce specifica per ICMP e una voce di table-miss. `ofproto/trace` simula il pacchetto e dice quale vince, prima dei contatori.

```bash
# voce specifica di priorità alta per ICMP verso h2
sudo ovs-ofctl add-flow br-sdn \
  "priority=200,in_port=1,ip,nw_dst=10.10.0.2,icmp,actions=output:2"

# table-miss che invia al controller durante il debug
sudo ovs-ofctl add-flow br-sdn "priority=0,actions=controller"

# simulazione del pacchetto dentro il bridge
sudo ovs-appctl ofproto/trace br-sdn \
  "in_port=1,eth_src=0a:00:00:00:00:01,eth_dst=0a:00:00:00:00:02,\
ip,nw_src=10.10.0.1,nw_dst=10.10.0.2,nw_proto=1"
```

Il trace restituisce la pipeline e la voce scelta; se `priority=200` non compare, il match non corrisponde al pacchetto. Le porte sono numerate per ordine di inserimento: controllale con `ovs-ofctl show br-sdn`.

```bash
# contatori: la voce riceve traffico?
sudo ovs-ofctl dump-flows br-sdn

# rimozione mirata delle voci di debug
sudo ovs-ofctl del-flows br-sdn "priority=0"
```

| Scenario | Azioni | Esito atteso |
| --- | --- | --- |
| regola specifica | output:2 | ping diretto |
| table-miss controller | controller | pacchetto al controller |
| table-miss drop | drop | ping perso |
| canale giù, regola presente | output:2 | ping continua |
| canale giù, no regola | drop | ping si interrompe |

Le ultime due righe spiegano il valore delle regole locali: se il data plane ha già le voci, il traffico sopravvive alla caduta del controller.

## Smontare e ripetere

Un ambiente pulito vale come un test scritto. Lo smontaggio va fatto sempre, anche dopo un errore: i link residui sono la prima causa di esperimenti che non funzionano più.

```bash
sudo ovs-vsctl del-controller br-sdn
sudo ovs-vsctl del-br br-sdn
sudo ip netns del h1
sudo ip netns del h2
sudo ip netns list   # deve restare vuoto
```

Se il bridge segnala porte in uso, cancella prima i namespace con `ip netns del` e poi il bridge.

## Esercizi

1. Collega un controller vero, per esempio ONOS o OpenDaylight come container, e registra i messaggi che riceve.
2. Aggiungi una seconda coppia di host e verifica che la regola non inoltri il loro traffico.
3. Sostituisci la table-miss con `drop`: perché il ping si interrompe solo per il traffico sconosciuto?
4. Esegui `dump-flows` dopo un minuto di ping e calcola la frequenza dei pacchetti.
5. Rimuovi il controller con `set-controller` vuoto e osserva `ovs-vsctl show`.
6. Scrivi uno script `laboratorio.sh` idempotente per montare e smontare la rete.

<details>
<summary>Soluzione</summary>

1. Il container espone la porta 6653 verso l'host; `ovs-vsctl show` deve mostrare `is_connected: true` con la versione del protocollo.

2. La regola ha `in_port=1`, quindi riguarda solo h1; il traffico della seconda coppia segue la table-miss, e il test mostra che la specificità delle voci controlla il traffico.

3. Con `drop` viene scartato solo il pacchetto senza voce; il ping si interrompe se richiesta o risposta finiscono nella table-miss.

4. Si leggono i contatori prima e dopo, si sottrae il valore iniziale e si divide per i secondi trascorsi: circa 1 pacchetto al secondo per l'ICMP, più le risposte.

5. `set-controller` vuoto rimuove il canale e lo switch torna in modalità normale; le voci scritte a mano restano finché non vengono rimosse.

6. Lo script verifica l'esistenza con `ip netns list` e `ovs-vsctl br-exists` prima di creare, e un caso `--down` esegue i comandi in ordine inverso.

</details>

## Errori comuni

- **Scrivere `in_port` senza conoscere la numerazione del bridge**: `ovs-ofctl show` è l'unica fonte affidabile, e la numerazione cambia con l'ordine di creazione.
- **Dimenticare di portare le interfacce in stato up**: il bridge non vede le porte e il ping fallisce.
- **Togliere il controller prima di aver scritto le regole locali**: il traffico si interrompe e sembra un guasto del bridge.
- **Lasciare la table-miss su `controller` senza un controller**: ogni pacchetto sconosciuto viene perso.
- **Non smontare l'ambiente**: namespace e bridge residui fanno fallire il montaggio successivo.

## In sintesi

Namespace per gli host, Open vSwitch per il data plane, canale verso il controller, regole a mano e trace. La tabella degli scenari mostra il punto centrale di SDN: con le regole locali il traffico sopravvive alla caduta del controller, senza di esse la rete dipende dal controllo.

## Fonti

- [Open vSwitch Documentation](https://docs.openvswitch.org/)
- [OvS — Openflow topics](https://docs.openvswitch.org/en/latest/topics/openflow/)
- [Openflow specification v1.5.1](https://opennetworking.org/wp-content/uploads/2014/10/openflow-switch-v1.5.1.pdf)
- [Open Networking Foundation — Software-defined standards](https://opennetworking.org/software-defined-standards/specifications/)
- [OpenDaylight Documentation](https://docs.opendaylight.org/)
