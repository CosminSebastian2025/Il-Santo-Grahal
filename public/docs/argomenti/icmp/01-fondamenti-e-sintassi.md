ICMP sta per Internet Control Message Protocol ed è il protocollo di servizio che accompagna IP: non trasporta dati applicativi, ma messaggi di errore e di controllo tra host e router. Quando un router scarta un pacchetto, quando una destinazione non è raggiungibile o quando vuoi verificare se un host risponde, il canale di comunicazione è quasi sempre ICMP. In questa lezione impari la struttura del messaggio, i tipi e i codici che contano e le differenze tra ICMPv4 e ICMPv6.

## Obiettivi

- Riconoscere il formato base di un messaggio ICMP e il ruolo di tipo, codice e checksum.
- Distinguere i messaggi di errore da quelli informativi e collegare tipo e codice al significato.
- Leggere il comportamento di Echo Request ed Echo Reply, il meccanismo su cui si basa `ping`.
- Capire cosa cambia in ICMPv6: numerazione, pseudo-header e obbligatorietà.
- Sapere quali errori un nodo non deve mai generare, per evitare tempeste di pacchetti.

## Formato e funzione del messaggio

ICMP viaggia dentro un datagramma IP e viene identificato dal valore 1 nel campo Protocol dell'header IPv4; in IPv6 il valore 58 nel campo Next Header. Il messaggio inizia con tre campi comuni a tutti i tipi: otto bit di Type, otto bit di Code e sedici bit di Checksum. Il resto dipende dal tipo.

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type      |     Code      |          Checksum             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                 lunghezza variabile secondo il tipo           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

Il checksum copre l'intero messaggio ICMP "a partire dal campo Type" e si calcola come complemento a uno della somma a uno. Per calcolarlo, il campo stesso si azzera prima della somma. Il Type separa le famiglie di messaggi, il Code aggiunge il dettaglio: la stessa famiglia può avere più cause distinte.

| Famiglia | Tipo v4 | Uso tipico |
| --- | --- | --- |
| Echo | 8 richiesta, 0 risposta | verifica di raggiungibilità |
| Destination Unreachable | 3 | rete, host, protocollo, porta |
| Time Exceeded | 11 | TTL esaurito o riassemblaggio scaduto |
| Redirect | 5 | route migliore consigliata dal router |
| Parameter Problem | 12 | header malformato |

## Errori e codici

I messaggi di errore ICMP sono il modo con cui la rete dice al mittente che qualcosa è andato storto, e quasi tutti riportano l'header IP del pacchetto originale più una parte dei suoi dati, così che il mittente sappia a quale flusso si riferisce l'errore. RFC 792 prevede header più 64 bit di dati; RFC 1812 estende il contenuto ai massimi byte possibili senza superare i 576 byte complessivi. RFC 4884 ha poi aggiunto un'estensione multi-parte con un attributo di lunghezza, necessaria perché il campo "original datagram" non dichiarava da solo dove finisse.

| Tipo | Codice | Significato |
| --- | --- | --- |
| 3 | 0 | rete non raggiungibile |
| 3 | 1 | host non raggiungibile |
| 3 | 2 | protocollo non disponibile |
| 3 | 3 | porta non raggiungibile |
| 3 | 4 | frammentazione necessaria e DF impostato |
| 3 | 13 | comunicazione amministrativamente proibita (RFC 1812) |
| 11 | 0 | TTL esaurito in transito |
| 11 | 1 | tempo di riassemblaggio scaduto |
| 12 | 0 | problema nel campo puntato dall'header |

I codici di Destination Unreachable hanno una gerarchia di utilità. Il codice 3 (port unreachable) è quello che riceve chi invia un datagramma UDP su una porta chiusa, ed è la ragione per cui una scansione UDP può concludere "chiuso" senza attendere il timeout. Il codice 4 è la base della Path MTU Discovery: il router non può inoltrare un pacchetto più grande dell'MTU del link successivo con DF attivo, lo scarta e lo comunica.

```bash
# Echo richiesta con iputils: quattro pacchetti e poi termine
ping -4 -c 4 192.0.2.10
```

## ICMPv6 e le regole di generazione

ICMPv6 (RFC 4443) non si limita a replicare ICMPv4: è parte integrante di IPv6. Il Neighbor Discovery e altri meccanismi del livello di rete usano messaggi ICMPv6, quindi un firewall che blocca ICMPv6 in blocco rompe IPv6. La numerazione è più compatta e divide errori e informativi in due blocchi: tipi da 0 a 127 sono errori, da 128 a 255 sono messaggi informativi.

| Tipo ICMPv6 | Nome | Classe |
| --- | --- | --- |
| 1 | Destination Unreachable | errore |
| 2 | Packet Too Big | errore |
| 3 | Time Exceeded | errore |
| 4 | Parameter Problem | errore |
| 128 | Echo Request | informativo |
| 129 | Echo Reply | informativo |

Due differenze pratiche. In IPv6 non esiste il campo "TTL" ma l'Hop Limit, decrementato di uno da ogni router; quando arriva a zero, il router genera Time Exceeded, esattamente come per IPv4. Il checksum ICMPv6 include uno pseudo-header con gli indirizzi IPv6 e il valore 58 come Next Header, quindi non può essere calcolato con gli strumenti IPv4 generici.

Le regole su quando non inviare errori esistono per evitare amplificazioni incontrollate. Un nodo non deve inviare errori ICMP in risposta a un altro messaggio ICMP di errore, a pacchetti broadcast o multicast, a frammenti successivi al primo, a pacchetti con indirizzo sorgente non valido. E deve limitare la frequenza dei propri errori, ad esempio con un token bucket.

```bash
# Con iptables puoi filtrare per tipo e codice ICMP
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT
iptables -A INPUT -p icmp --icmp-type destination-unreachable -j ACCEPT
```

## Errori comuni

- **Trattare ICMP come un protocollo di trasporto**: non ha porte e non identifica processi; solo l'Echo ha un campo identifier per accoppiare richiesta e risposta.
- **Filtrare tutto ICMP pensando di guadagnare sicurezza**: bloccare gli errori impedisce Path MTU Discovery, genera timeout misteriosi e in IPv6 rompe il Neighbor Discovery.
- **Confondere type e code**: il tipo dice la famiglia, il codice la causa; leggere "type 3" senza il codice non dice se manca la rete o solo la porta.
- **Rispondere a errori con errori**: senza le regole di RFC 1812 un loop di errori può saturare una rete.
- **Dimenticare la rete minima IPv6**: un pacchetto IPv6 più grande di 1280 byte non può passare frammentato in cammino, e il blocco di ICMPv6 Packet Too Big lo rende irraggiungibile.

## In sintesi

ICMP è il canale di segnalazione di IP: errori e messaggi informativi con un header comune di tipo, codice e checksum. I codici di Destination Unreachable dicono alla diagnosi se manca la rete, l'host, il protocollo o la porta. Il campo "original datagram" collega l'errore al pacchetto che lo ha causato. ICMPv6 cambia i numeri dei tipi, usa uno pseudo-header nel checksum e rende il protocollo obbligatorio per il funzionamento di IPv6. Le regole di generazione, infine, sono parte del protocollo e non un dettaglio implementativo.

## Fonti

- [RFC 792 - Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792.html)
- [RFC 4443 - ICMPv6 for IPv6](https://www.rfc-editor.org/rfc/rfc4443.html)
- [RFC 1812 - Requirements for IP Version 4 Routers](https://www.rfc-editor.org/rfc/rfc1812.html)
- [RFC 4884 - Extended ICMP to Support Multi-Part Messages](https://www.rfc-editor.org/rfc/rfc4884.html)
