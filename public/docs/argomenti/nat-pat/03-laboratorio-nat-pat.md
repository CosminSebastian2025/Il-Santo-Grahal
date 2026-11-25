In questo laboratorio costruisci un router che fa NAT: due namespace, uno che finge Internet e uno che contiene client e server, con `nftables` per la traduzione e `conntrack` per verificare ogni binding. Gli esercizi sono pensati per far emergere i casi che in produzione costano ore: la porta in ingresso che non arriva, il binding che scade, il server che vede tutti con lo stesso indirizzo.

## Obiettivi

- Costruire un router netfilter con una rete privata e una "Internet" simulata in namespace.
- Verificare masquerade, SNAT statico e port forwarding con catture e `conntrack`.
- Dimostrare sperimentalmente la differenza tra NAT 1:1 e PAT.
- Riprodurre l'esaurimento delle porte di un indirizzo pubblico condiviso.
- Misurare l'effetto dell'espirazione dei binding e del keepalive applicativo.

## Preparazione

Tre namespace: `isp` (Internet finta), `rtr` (il router NAT) e `lan` (client e server). Il router ha due piedi, uno verso `isp` con un indirizzo pubblico `203.0.113.7/24`, uno verso `lan` con `192.168.1.1/24`.

```bash
for n in isp rtr lan; do sudo ip netns add $n; done
sudo ip link add pub type veth peer name pub-rtr
sudo ip link add lan-rtr type veth peer name lan-cli
sudo ip link set pub netns isp
sudo ip link set pub-rtr netns rtr
sudo ip link set lan-rtr netns rtr
sudo ip link set lan-cli netns lan

sudo ip -n isp addr add 203.0.113.1/24 dev pub
sudo ip -n rtr addr add 203.0.113.7/24 dev pub-rtr
sudo ip -n rtr addr add 192.168.1.1/24 dev lan-rtr
sudo ip -n lan addr add 192.168.1.10/24 dev lan-cli
sudo ip -n lan route add default via 192.168.1.1

for ns in isp:pub rtr:pub-rtr rtr:lan-rtr lan:lan-cli; do
  sudo ip -n ${ns%%:*} link set ${ns##*:} up
done

# Inoltro e NAT dentro il router
sudo ip netns exec rtr sysctl -w net.ipv4.ip_forward=1
sudo ip netns exec rtr nft add table ip nat
sudo ip netns exec rtr nft 'add chain ip nat post { type nat hook postrouting priority 100; }'
sudo ip netns exec rtr nft 'add chain ip nat pre { type nat hook prerouting priority -100; }'
sudo ip netns exec rtr nft add rule ip nat post oifname "pub-rtr" masquerade
```

Un server di prova nella LAN e un "site" nella rete `isp` rendono il laboratorio verificabile senza Internet:

```bash
# Server HTTP nella LAN, client nella ISP
sudo ip netns exec lan python3 -m http.server 8080 &
sudo ip netns exec isp curl -s -o /dev/null -w '%{http_code}\n' http://192.168.1.10:8080/
# Atteso: nessuna risposta, il server è irraggiungibile
```

L'`ASSURED` conta: un binding resta protetto dalla pulizia automatica anche dopo un periodo di inattività, perché il kernel lo ha visto in entrambe le direzioni. Un flusso che compare senza `ASSURED` non ha ancora ricevuto risposte, e spesso è la spia di una regola `dnat` che inoltra il SYN ma non fa tornare il SYN-ACK.

Prima di bloccare nulla, però, il laboratorio insegna un'abitudine: assegnare a ogni prova un risultato osservabile. Se non sai quale comando deve restituire quale uscita, non stai sperimentando ma giocando con una configurazione. Il criterio più comodo è l'exit code di `curl -f` combinato con la riga di `conntrack`: uno dice che il flusso è arrivato all'applicazione, l'altra che il kernel ha creato e mantenuto il binding.

## Esercizi

1. Verifica il NAT in uscita: dal namespace `lan` raggiungi il server `203.0.113.1:80` che hai avviato in `isp`. Abilita la regola da zero e dimostra con due `tcpdump` e `conntrack -L` che la sorgente cambia in `203.0.113.7` e che il binding è `ASSURED`.
2. Aggiungi una regola di port forwarding `203.0.113.7:8080 → 192.168.1.10:8080` e verifica con `curl` dal namespace `isp` che il server nella LAN risponde; controlla con `conntrack -L` che il binding inverso punti a `203.0.113.1`.
3. Con due client nello stesso namespace `lan` verso la stessa porta di destinazione, usa `ss -tnp` e `conntrack -L` per mostrare che la porta tradotta è diversa e la porta sorgente originale può coincidere.
4. Sostituisci `masquerade` con `snat to 203.0.113.7` e spiega in un test quale differenza osservi al cambio dell'indirizzo del piede WAN.
5. Apri 1000 connessioni TCP con `nc` o `hping3` dal client e mostra `conntrack -S`; poi porta `net.netfilter.nf_conntrack_max` a 256 e osserva che cosa scarta il router.
6. Cancella il binding con `conntrack -D -p tcp --dport 80` a sessione attiva e osserva con `tcpdump` il pacchetto che arriva fuori contesto: quale reset riceve il client?

<details>
<summary>Soluzione</summary>

1. Con `ip_forward=1` e la catena `post` con `masquerade`, il client `192.168.1.10` raggiunge `203.0.113.1:80`. La cattura su `lan-rtr` mostra la sorgente privata, quella su `pub-rtr` mostra `203.0.113.7:porta`. `conntrack -L -p tcp --dport 80` elenca il flusso con `src/cport` interni, `dst/dport` esterni e `reply`. Senza `ip_forward` il SYN non lo inoltra: il NAT non si applica perché il pacchetto muore nel kernel.

2. La regola è `dnat` nella catena `pre` con destinazione `192.168.1.10:8080`. Il router inoltra il pacchetto tradotto verso la LAN e il binding inverso fa tornare la risposta: il client esterno vede solo `203.0.113.7`. Se il router non inoltra, la prima cosa da verificare è che il pacchetto non venga scartato in inoltro da regole esistenti.

3. Due client con porta sorgente identica ottengono porte tradotte diverse: è il cuore del PAT, e `conntrack -L` le mostra affiancate con lo stesso `dst`. La porta originale condivisa non è un problema perché la traduzione è per flusso, non per host.

4. Con `snat` l'indirizzo è scritto nella regola: se il WAN cambia indirizzo, le connessioni nuove usano ancora quello vecchio e si rompono. `masquerade` legge l'indirizzo dell'interfaccia a ogni invio e segue il cambio; il costo è che il kernel deve determinarlo a ogni pacchetto.

5. Con `nf_conntrack_max=256` i binding nuovi vengono scartati e `insert_failed` in `conntrack -S` cresce; le connessioni già `ASSURED` continuano. Le nuove `nc` restano in `SYN_SENT` e il server non vede nulla: è la firma della tabella piena.

6. Dopo `conntrack -D` il SYN-ACK che arriva è senza binding: il router lo considera nuovo e risponde con `RST`, che il client riceve come connessione resettata. Un keepalive applicativo con intervallo inferiore ai timeout del NAT evita il caso.

</details>

## Errori comuni

- **Regola di masquerade senza `ip_forward`**: il NAT è configurato ma nessun pacchetto attraversa il router, e nessuna cattura mostra traffico di uscita.
- **Catena sbagliata per l'ingresso**: `dnat` va in `prerouting`, non in `postrouting`; una regola nel posto sbagliato non produce errori e non funziona.
- **Osservare il server invece del router**: con NAT in mezzo gli indirizzi visti dal server sono già tradotti e l'analisi attribuisce tutte le connessioni al router.
- **Dimenticare la catena `forward`**: in un firewall già attivo il `dnat` riesce ma il pacchetto viene comunque scartato in inoltro.
- **Testare con un solo client**: PAT e NAT 1:1 sembrano identici finché non si aggiunge il secondo host che deve condividere l'indirizzo.

## In sintesi

Hai visto il NAT dal lato della tabella: `conntrack` mostra il binding, `nftables` applica la traduzione in `pre` e `post`, e la cattura doppia dimostra che l'indirizzo cambia solo al confine. Port forwarding e masquerade sono due metà dello stesso stato, e i limiti della tabella producono sintomi precisi: SYN senza risposta, reset su pacchetti senza binding, flussi nuovi mai visti dal server.

## Fonti

- [RFC 3022 - Traditional IP Network Address Translator](https://www.rfc-editor.org/rfc/rfc3022)
- [RFC 4787 - NAT Behavioral Requirements for Unicast UDP](https://www.rfc-editor.org/rfc/rfc4787)
- [nftables - statements](https://git.netfilter.org/nftables/tree/doc/statements.txt)
- [conntrack(8) - Debian manpages](https://manpages.debian.org/bookworm/conntrack/conntrack.8.en.html)
- [tcpdump(8) - Linux man page](https://man7.org/linux/man-pages/man8/tcpdump.8.html)
