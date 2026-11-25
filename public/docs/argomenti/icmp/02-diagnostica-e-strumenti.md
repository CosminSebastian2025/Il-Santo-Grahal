ICMP non è solo un interprete di errori: è anche un linguaggio che un amministratore può usare per misurare la rete. In questa lezione impari a intercettare i messaggi su un socket, a generare Echo Request manualmente, a usare l'hop limit per tracciare il percorso e a digitalizzare i casi in cui ICMP diventa un rischio. Il filo conduttore è che ogni tecnica di misura riusa lo stesso formato di messaggio, cambiando solo tipo, codice e TTL.

## Obiettivi

- Aprire un socket ICMP in Python e leggere type, code e checksum di un messaggio ricevuto.
- Ricostruire un Echo Request e un Echo Reply a mano, senza usare `ping`.
- Usare il decremento del TTL per costruire il percorso con `traceroute`.
- Filtrare ICMP per tipo e codice con `iptables`, distinguendo IPv4 e IPv6.
- Riconoscere gli abusi di ICMP: echo flood, redirect falsi, ICMP unreachable che chiude connessioni TCP.

## Intercettare e costruire messaggi

Un socket ICMP richiede privilegi elevati, perché permette di ricevere copie dei messaggi indirizzati alla macchina. Su Linux `socket.IPPROTO_ICMP` apre un raw socket; in Python si crea con `socket(AF_INET, SOCK_RAW, IPPROTO_ICMP)` e si legge direttamente il messaggio ICMP, perché il kernel toglie l'header IP. Il messaggio letto contiene tutti i campi, inclusi quelli che `ping` mostra in forma riassunta.

```python
import socket
import struct

# Richiede privilegi di root: ascolta tutti gli ICMP destinati all'host
s = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
s.settimeout(5)
while True:
    msg, addr = s.recvfrom(2048)
    tipo, codice, checksum = struct.unpack("!BBH", msg[:4])
    print(addr[0], "type", tipo, "code", codice, "checksum", hex(checksum))
```

Il pacchetto successivo è la costruzione: un Echo Request è un header di otto byte fatto di type 8, code 0, checksum e un campo identifier/sequence, seguito da un payload arbitrario. Il checksum si calcola sull'intero messaggio con il campo checksum a zero: è il complemento a uno della somma a uno delle parole da 16 bit. Gli Echo Reply tornano con type 0 e la stessa sequenza.

```python
import struct

def checksum(dati: bytes) -> int:
    if len(dati) % 2:
        dati += b"\x00"  # padding per parole da 16 bit
    somma = sum(struct.unpack("!%dH" % (len(dati) // 2), dati))
    while somma >> 16:          # riporta gli overflow verso i 16 bit bassi
        somma = (somma & 0xFFFF) + (somma >> 16)
    return ~somma & 0xFFFF

def echo_request(ident: int, seq: int, payload: bytes = b"prova") -> bytes:
    header = struct.pack("!BBHHH", 8, 0, 0, ident, seq)  # checksum provvisorio a 0
    c = checksum(header + payload)
    return struct.pack("!BBHHH", 8, 0, c, ident, seq) + payload
```

L'identifier a sedici bit è ciò che distingue due processi che interrogano lo stesso host simultaneamente. RFC 792 lo chiama "identifier" e lo lascia libero; iputils usa il PID, e quando due `ping` hanno lo stesso ID la risposta può finire al processo sbagliato. Anche la dimensione conta: header IP di 20 byte, header ICMP di 8 e payload predefinito di 56 byte danno un pacchetto da 84 byte.

## Misurare con TTL e traceroute

ICMP non ha un contatore di hop, ma ogni router decrementa il TTL dell'header IP e, quando arriva a zero, scarta il pacchetto e genera Time Exceeded type 11 code 0 con il suo indirizzo come sorgente. Inviare Echo Request con TTL crescente trasforma quel messaggio in una sonda: la prima prova restituisce il primo router, la seconda il secondo e così via fino alla destinazione, che risponde con Echo Reply type 0.

| Comando Linux | TTL iniziale predefinito | Probe predefinite | Trasporto predefinito |
| --- | --- | --- | --- |
| `traceroute host` | crescente da 1 a 30 | 3 | UDP alte porte |
| `traceroute -I host` | crescente da 1 a 30 | 3 | ICMP Echo |
| `ping -t 3 host` | 3 fisso | come da opzioni | ICMP Echo |

```bash
# TTL forzato: se il primo router scarta, torna Time Exceeded type 11
ping -c 2 -t 3 198.51.100.23
# Percorso solo con ICMP, utile dove UDP è filtrato
traceroute -I -m 15 198.51.100.23
```

Il traceroute UDP predefinito sfrutta un altro codice ICMP: la porta alta non è in ascolto, quindi il pacchetto di destinazione genera Destination Unreachable type 3 code 3. Se un firewall blocca quel codice, il traceroute non conclude; con `-I` la destinazione risponde con Echo Reply e la conclusione è certa. `-T` usa TCP SYN e serve a verificare anche l'apertura di una porta, cosa che ICMP da solo non può dire.

## Diagnosi, limiti e rischi

L'uso diagnostico di ICMP dà tre informazioni a basso costo: raggiungibilità, errore esplicito e hop dove l'errore compare. Non dice però se un servizio è in ascolto: per quello serve una connessione TCP o un datagramma UDP e la relativa risposta ICMP. Un `ping` che passa con un `curl` che fallisce è un risultato comune e non contraddittorio: il server risponde a ICMP e rifiuta l'applicazione.

Il lato rischio si divide in tre famiglie. Gli echo flood amplificano traffico verso una vittima e verso la rete che lo genera; `ping -f` è riservato al super-utente proprio perché può saturare un link. I Redirect (type 5) dicono all'host di usare un altro gateway, e un attaccante può iniettare redirect per deviare il traffico. Gli errori falsi chiudono connessioni: RFC 5927 descrive l'attacco di connection reset cieco, in cui un ICMP Destination Unreachable falsificato convince TCP che la destinazione sia morta, e raccomanda di accettarlo solo su connessioni già sincronizzate.

```bash
# Blocco mirato: rifiuta redirect, consenti echo e unreachable legittimi
iptables -A INPUT -p icmp --icmp-type redirect -j DROP
ip6tables -A INPUT -p ipv6-icmp --icmpv6-type packet-too-big -j ACCEPT
```

La regola finale è di grana: filtrare per tipo e codice, non per protocollo. Consentire Echo Request e Reply permette la diagnostica; consentire Packet Too Big e Time Exceeded preserva la Path MTU Discovery; limitare la frequenza dei propri errori con un token bucket evita di diventare sorgente di amplificazione.

## Errori comuni

- **Confondere reachability con apertura di porta**: un Echo Reply non implica che un servizio sia attivo, solo che lo stack IP risponde.
- **Dimenticare il privilegio del raw socket**: senza root il socket ICMP fallisce, e il tentativo di aggirare con setuid apre un rischio di sicurezza.
- **Assumere un TTL iniziale fisso**: router e sistemi operativi partono da 64, 128 o 255; ricava il numero di hop come 255 meno TTL solo dopo aver identificato il valore iniziale.
- **Filtrare ICMP a tappeto in IPv6**: il risultato più frequente è un IPv6 che funziona a tratti, perché Neighbor Discovery usa ICMPv6.
- **Fidarsi di un errore non autenticato**: ICMP non ha autenticazione; un attaccante sulla rete può forgiare un unreachable e chiudere un TCP.

## In sintesi

Il formato ICMP è abbastanza semplice da essere costruito a mano, e questo lo rende strumento di misura: Echo per la raggiungibilità, Time Exceeded per il percorso, Destination Unreachable per le porte chiuse. `traceroute` è un'applicazione di questa idea con un TTL crescente. La stessa flessibilità ha un prezzo: redirect, echo flood e errori falsi sono tecniche di attacco note, quindi filtri per tipo e codice e trattamenti difensivi di TCP sono parte di una configurazione corretta. La lezione successiva trasforma tutto questo in esercizi verificabili con `ping` e `tcpdump`.

## Fonti

- [RFC 792 - Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792.html)
- [RFC 5927 - ICMP Attacks against TCP](https://www.rfc-editor.org/rfc/rfc5927)
- [man 8 traceroute](https://man7.org/linux/man-pages/man8/traceroute.8.html)
- [man 8 iptables-extensions](https://man7.org/linux/man-pages/man8/iptables-extensions.8.html)
