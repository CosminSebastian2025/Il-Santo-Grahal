In questo laboratorio costruisci un'intera rete DHCP in locale: un server `dhcpd` in un namespace di rete, un client `dhclient` in un altro, un relay in mezzo e un indirizzo riservato. Alla fine non devi credere alle nostre parole: ogni affermazione va verificata con un file di lease, una cattura o un exit code. Serve una macchina Linux con privilegi di root, pacchetti `isc-dhcp-server` e `isc-dhcp-client` installati, e la possibilità di usare `ip netns` e `unshare`.

## Obiettivi

- Costruire una topologia client-relay-server con namespace e link `veth`.
- Scrivere un `dhcpd.conf` con range, opzioni e riserva e farlo validare da `dhcpd -t`.
- Verificare la negoziazione DORA leggendo il summary di `tcpdump` e il file di lease.
- Diagnosticare un relay che riceve ma non inoltra per una subnet non dichiarata.
- Riprodurre e spiegare il caso del client legato a un server inesistente (rebinding).

## Preparazione

Due LAN e un relay, tutti su una sola macchina. Il server sta in `10.10.0.0/24`, il client in `10.20.0.0/24`, il relay in mezzo con un piede in ciascuna.

```bash
# Namespace e link
sudo ip netns add srv
sudo ip netns add relay
sudo ip netns add cli

sudo ip link add s-srv type veth peer name s-rel
sudo ip link add c-rel type veth peer name c-cli
sudo ip link set s-srv netns srv
sudo ip link set s-rel netns relay
sudo ip link set c-rel netns relay
sudo ip link set c-cli netns cli

# Indirizzi dei link "da server" e "da client"
sudo ip -n srv addr add 10.10.0.1/24 dev s-srv
sudo ip -n relay addr add 10.10.0.2/24 dev s-rel
sudo ip -n relay addr add 10.20.0.1/24 dev c-rel
sudo ip -n srv link set s-srv up
sudo ip -n relay link set s-rel up
sudo ip -n relay link set c-rel up
sudo ip -n cli link set c-cli up

# Il client parte senza indirizzo: deve ottenerlo via DHCP
sudo ip netns exec cli ip -4 addr show c-cli
```

I namespace non hanno un demone DHCP: `dhclient` e `dhcpd` vanno lanciati con `ip netns exec`, e ogni file di lease vive nel namespace del processo che lo scrive. Per un test rapido in una sola rete si può evitare il relay, ma la topologia a tre è quella che fa emergere i problemi veri: un pacchetto che entra e non esce.

## Esercizi

1. Scrivi un `dhcpd.conf` per la rete `10.20.0.0/24` con range `.100-.150`, gateway `.1`, DNS `10.20.0.1`, lease di 600 secondi e riserva `.20` per il MAC `52:54:00:c0:ff:ee`; validalo con `dhcpd -t -cf`.
2. Avvia `dhcpd` nel namespace `srv` (ascolto su `s-srv`) e `dhcrelay` nel namespace `relay`, poi verifica con `ss -ulpn` che la porta 67 sia occupata da entrambi; controlla anche che il relay abbia ricevuto un pacchetto da `c-rel`.
3. Lancia `dhclient -1 -v c-cli` nel namespace `cli` e cattura con `tcpdump -n -vv 'udp port 67 or udp port 68'`: quali indirizzi sorgente e destinazione vedi in DISCOVER, OFFER, REQUEST e ACK?
4. Aggiungi un `host` con `fixed-address 10.20.0.20` e il MAC indicato, poi forza un nuovo `DISCOVER` cambiando il MAC dell'interfaccia con `ip link set c-cli address 52:54:00:c0:ff:ee`. Il client ottiene `.20`?
5. Commenta la subnet `10.20.0.0/24` e riavvia `dhcpd` lasciando i due server attivi e poi uno solo; cosa cambia nel log del relay e nell'exit code di `dhclient -1`?
6. Con lease di 60 secondi, uccidi il server a metà vita e osserva il passaggio da rinnovo unicast a rebinding broadcast; recupera gli orari dal file di lease.

<details>
<summary>Soluzione</summary>

1. Il file contiene `authoritative;`, `default-lease-time 600;`, `max-lease-time 600;`, un blocco `subnet 10.20.0.0 netmask 255.255.255.0` con `range 10.20.0.100 10.20.0.150`, le opzioni `routers`, `subnet-mask` e `domain-name-servers`, e un `host`. `dhcpd -t` stampa la configurazione interpretata e non restituisce errori; se `range` esce dalla subnet lo segnala.

2. `dhcpd` sta nel namespace `srv` e ascolta su `s-srv`, il relay sta nel namespace `relay` e inoltra da `c-rel` verso `10.10.0.1`; con `ss -ulpn` nel namespace di ciascuno si vede la porta 67 occupata dal processo giusto. Se `ss` non mostra nulla, nessun demone è in ascolto sull'interfaccia indicata: è la stessa firma dell'errore `Not configured to listen on any interfaces!` di `dhcpd`.

3. `DISCOVER` e `REQUEST` partono da `0.0.0.0:68` verso `255.255.255.255:67`, `OFFER` e `ACK` tornano dal server `10.20.0.1` (l'indirizzo di relay) sulle porte 67→68. Il relay compare come relay agent e nelle opzioni del pacchetto appare la subnet di provenienza, l'opzione 82.

4. Con il MAC riservato il client riceve `10.20.0.20` e un lease più lungo, se il `host` lo prevede. Se il MAC non coincide e il CID generato dal client resta diverso, il server può comunque preferire il CID: per questo, in laboratorio, si preferisce cancellare `/var/lib/dhcp/dhclient.leases` prima di ogni prova.

5. Senza la subnet dichiarata il server scarta la richiesta e il relay non ottiene risposta; `dhclient -1` esce con codice diverso da zero e il log mostra `no free leases` o nessuna riga di risposta. Con due server nella stessa LAN il primo che risponde vince e gli `OFFER` concorrenti restano nella cattura.

6. A metà lease il client manda un `REQUEST` unicast all'indirizzo dell'opzione 54; quando il server tace fino a T2 la richiesta torna a `255.255.255.255`. Nel file di lease del client, `renew` e `rebind` mostrano i tempi calcolati, mentre il server registra `DHCPNAK` solo se riemerge.

</details>

## Errori comuni

- **Lanciare `dhcpd` fuori dal namespace giusto**: il server ascolta su un'interfaccia che il client non raggiunge e ogni cattura resta vuota.
- **Dimenticare `range` fuori subnet o opzioni obbligatorie**: il client ottiene un indirizzo ma non la rotta, e il sintomo è "rete assente" con IP valido.
- **Sovrapporre due `dhclient` nel namespace**: entrambi applicano rotte e lease diversi, e l'indirizzo finale è imprevedibile.
- **Usare `localhost` del namespace sbagliato**: `ip netns exec` cambia la rete, non il filesystem, e i file di lease dei due lati non si leggono a colpo d'occhio.
- **Non pulire i lease tra una prova e l'altra**: `dhclient.leases` conserva l'indirizzo vecchio e la prova successiva parte da una condizione che pensavi di non avere.

## In sintesi

Hai costruito a mano una rete DHCP con namespace e `veth`: server, relay e client separati, un file di lease per lato. `dhcpd -t` intercetta gli errori di sintassi prima del riavvio, `tcpdump` mostra che `DISCOVER` e `REQUEST` sono broadcast e che il relay cambia il destinatario. Le riserve si verificano cambiando MAC o cancellando il lease del client, e il rinnovo è misurabile solo con lease brevi e un server che sparisce.

## Fonti

- [RFC 2131 - Dynamic Host Configuration Protocol](https://www.rfc-editor.org/rfc/rfc2131)
- [RFC 2132 - DHCP Options and BOOTP Vendor Extensions](https://www.rfc-editor.org/rfc/rfc2132)
- [ISC DHCP - pagine dhcpd](https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd)
- [ISC DHCP Client Configuration](https://kb.isc.org/docs/aa-00333)
- [ip(8) - Linux man page](https://man7.org/linux/man-pages/man8/ip.8.html)
