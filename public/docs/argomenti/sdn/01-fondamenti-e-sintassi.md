Il software-defined networking (SDN) è un'architettura che separa il piano di controllo, cioè le decisioni su dove inoltrare il traffico, dal piano dati, cioè l'inoltro vero e proprio. Il risultato è che la rete diventa programmabile: un controller centrale vede la topologia, calcola i percorsi e li scrive nei dispositivi tramite un'interfaccia standard. In questa lezione capisci perché questa separazione è nata, come funziona OpenFlow e perché il modello ha cambiato anche i data center e i cluster Kubernetes.

## Obiettivi

- Distinguere piano dati e piano di controllo e spiegare cosa guadagna la rete dalla separazione.
- Descrivere OpenFlow: porte, tabelle di flusso, azioni e canale verso il controller.
- Conoscere il ruolo dei controller e le differenze tra approccio distribuito e centralizzato.
- Collocare SDN rispetto a VLAN, MPLS e alle reti tradizionali a controllo distribuito.
- Riconoscere i limiti pratici del modello centralizzato e le mitigazioni usate.

## Piano dati e piano di controllo

In una rete tradizionale ogni switch o router prende le proprie decisioni: esegue protocolli di routing, mantiene tabelle e inoltra. Il controllo è distribuito, e ogni apparato ha solo la vista che gli arriva dagli altri. SDN sposta le decisioni in un punto programmabile: i dispositivi diventano semplici inoltratori guidati da regole scritte dall'esterno.

| Aspetto | Rete tradizionale | SDN |
| --- | --- | --- |
| controllo | distribuito, per apparato | centralizzato nel controller |
| configurazione | per dispositivo, protocolli | regole uniformi dal controller |
| visibilità | parziale e locale | topologia complessiva |
| programmabilità | limitata all'equipaggiamento | API e linguaggi generali |
| punto debole | convergenza lenta del routing | disponibilità del controller |

L'idea di separare gestione e commutazione esiste da tempo nei sistemi telefonici e di gestione di rete. La novità di SDN è portarla al livello di inoltro di pacchetto su hardware generico, con un'interfaccia aperta tra i due piani.

I controller open source più citati sono OpenDaylight, con architettura modulare e impiego in ambito carrier, e ONOS, pensato per scalabilità e alta disponibilità nelle reti dei provider. Entrambi espongono API a nord verso le applicazioni e parlano protocolli a sud verso la rete.

| Controller | Tratto distintivo | Contesto tipico |
| --- | --- | --- |
| OpenDaylight | piattaforma modulare con molti plugin | provider e data center |
| ONOS | cluster ad alta disponibilità | reti di operatori e campus |
| controllo distribuito | niente controller separato | reti tradizionali, piccoli uffici |

```text
# modello a strati
applicazioni (intent, sicurezza, QoS)
      API nord
controller (topologia, routing, stato)
      protocolli sud (OpenFlow, NETCONF, P4Runtime)
switch / data plane
```

## OpenFlow

OpenFlow è il protocollo di riferimento tra switch e controller, e i suoi pilastri sono la tabella di flusso e il canale di controllo. Uno switch OpenFlow non decide: riceve pacchetti, cerca la corrispondenza in un set di tabelle di flusso ordinate, e applica l'azione associata alla voce con priorità più alta. Se nessuna voce corrisponde, la regola di table-miss può scartare il pacchetto, inoltrarlo al controller o passarlo alla pipeline successiva.

| Voce di OpenFlow | Significato |
| --- | --- |
| match | campi del pacchetto (porte, MAC, IP, TCP/UDP) |
| priority | ordine di scelta tra voci che corrispondono |
| counters | pacchetti e byte per voce |
| actions | output, drop, modifica campi, invio al controller |
| table-miss | comportamento quando nessuna voce corrisponde |

Il canale di controllo è una sessione con lo switch, protetta di norma con TLS, e i messaggi viaggiano dentro una connessione dedicata: è l'equivalente di un canale di management con cui il controller scrive lo stato del data plane.

```text
# struttura concettuale di una voce di flusso
match:    in_port=1, eth_dst=aa:bb:cc:00:11:22, ipv4_dst=10.0.0.10
priority: 100
counter:  1300 pacchetti
action:   output:port=2
```

```python
# descrizione di una voce di flusso (formato didattico di un controller)
voce = {
    "match": {"in_port": 1, "eth_dst": "aa:bb:cc:00:11:22"},
    "priority": 100,
    "actions": [{"output": 2}],
}
print(voce)  # il controller traduce questo modello nel messaggio OpenFlow
```

```bash
# aggiunge una voce sullo switch via canale di controllo
ovs-ofctl add-flow br0 "priority=100,in_port=1,dl_dst=aa:bb:cc:00:11:22,actions=output:2"

# elenca le voci e i contatori
ovs-ofctl dump-flows br0
```

`ovs-ofctl` parla direttamente con Open vSwitch, che è un caso concreto e ben documentato di switch OpenFlow software. Lo comandi dal nodo che ospita il bridge `br0`: la voce scritta compare nella tabella, e il primo pacchetto che la corrisponde incrementa il contatore.

## Controller e intent-based networking

Un controller mantiene la vista della topologia, raccoglie gli eventi dagli switch (pacchetti sconosciuti, cambi di porta) e calcola le regole. Alimenta le applicazioni tramite API a nord e dialoga con i dispositivi tramite protocolli a sud, non solo OpenFlow: NETCONF per gli apparati di configurazione, gNMI per la telemetria e P4Runtime per gli switch programmabili.

```text
# topologia minima gestita da un controller
              controller
             /        \
     switch A ---------- switch B
        |                  |
      host 1             host 2
```

L'intent-based networking è il passo successivo: invece di scrivere regole, l'operatore dichiara un obiettivo ("il traffico video tra i due uffici deve avere priorità") e il sistema deduce le configurazioni. Il controller traduce l'intento in politiche, le verifica e può tornare indietro se lo stato reale non corrisponde. Senza una visione centralizzata della rete questo livello sarebbe impraticabile.

## Dove si trova oggi

SDN non ha sostituito tutto: si è affermato dove la programmabilità porta valore, cioè data center e provider. Overlay come VXLAN, il networking dei cluster e le policy di sicurezza distribuite usano la stessa idea, un controllo che deriva il piano dati da una descrizione. Il controller diventa così un punto di servizio: la disponibilità si ottiene con cluster e la località delle regole, che restano in cache nei dispositivi quando il controller non è raggiungibile.

## Errori comuni

- **Pensare che SDN significhi solo OpenFlow**: OpenFlow è un protocollo del sud, e i controller parlano anche NETCONF, gNMI o P4Runtime.
- **Considerare il controller un singolo punto di guasto senza mitigazioni**: in produzione si usano cluster, repliche e fallback in modalità indipendente.
- **Confondere SDN con la virtualizzazione degli apparati**: la virtualizzazione cambia dove gira il software, non separa i piani.
- **Ignorare la modalità sicura del canale**: una regola scritta da un canale non protetto è una superficie di attacco diretta.
- **Derivare regole senza verificare la topologia**: un controller con una vista errata calcola percorsi che scavalcano link reali.

## In sintesi

SDN separa il controllo dall'inoltro e rende la rete programmabile. OpenFlow esprime questa separazione come tabelle di flusso sul data plane e un canale verso il controller. Il controller conosce la topologia e traduce intenti in regole, con OpenDaylight e ONOS come esempi open source. Il modello convive con le reti tradizionali e domina dove la programmabilità è un valore: data center, provider e orchestrazione dei cluster.

## Fonti

- [Open Networking Foundation — Overview](https://opennetworking.org/software-defined-standards/overview/)
- [Open Networking Foundation — Sdn definition](https://opennetworking.org/sdn-definition/)
- [Openflow specification v1.5.1](https://opennetworking.org/wp-content/uploads/2014/10/openflow-switch-v1.5.1.pdf)
- [Open vSwitch Documentation](https://docs.openvswitch.org/)
- [Open Networking Foundation — Software-defined standards](https://opennetworking.org/software-defined-standards/specifications/)
