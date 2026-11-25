In questo laboratorio costruisci `icmp-eco`, una piccola CLI in Python che invia Echo Request a mano, attende la risposta giusta e stampa type, code, RTT e TTL ricevuto. Non è una copia di `ping`: serve a esercitare il formato del messaggio, il checksum, l'accoppiamento per identifier e sequence e l'uso del TTL per ottenere Time Exceeded. Ogni errore di costruzione, invece di un timeout generico, deve diventare un messaggio riconoscibile.

## Obiettivi

- Costruire e parsare un messaggio ICMP senza librerie dedicate, controllando il checksum.
- Accoppiare richiesta e risposta con identifier e sequence, ignorando pacchetti estranei.
- Gestire Echo Reply, Time Exceeded e Destination Unreachable come segnali diversi.
- Misurare RTT e dedurre il numero di hop dal TTL restituito.
- Chiudere con un codice di uscita coerente e verificare il contratto con test manuali.

## Il contratto di `icmp-eco`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `icmp-eco [OPZIONI] HOST` | un solo obiettivo per invocazione |
| `-c N, --count N` | intero >= 1, default 4 | numero di Echo Request |
| `-s N, --size N` | payload in byte, default 56 | verifica MTU e frammentazione |
| `-t N, --ttl N` | 1-255, default 64 | sonda con TTL forzato |
| `-6` | usa ICMPv6 | percorso separato |
| exit 0 | almeno una Echo Reply | host raggiungibile |
| exit 1 | nessuna risposta valida | timeout o errore ICMP |
| exit 2 | uso errato o reset dei privilegi fallito | errore operativo |

Il codice di uscita ricalca la convenzione di iputils: 0 se c'è almeno una risposta, 1 se non ne arriva nessuna o se ne arrivano meno di `--count`, 2 per gli altri errori. Il caso della risposta ICMP di errore è il più insidioso: "rete irraggiungibile" è un messaggio valido, ma non è una Echo Reply, quindi finisce nell'exit 1 senza mai contare come successo.

```bash
sudo python icmp_eco.py -c 3 -t 4 192.0.2.10   # TTL basso: attesa Time Exceeded
sudo python icmp_eco.py -c 1 -s 1400 192.0.2.10 # payload grande: test di MTU
echo $?                                         # 0 risposta, 1 nessuna, 2 uso
```

## Costruzione, invio e ricezione

La costruzione riusa la funzione `checksum` della lezione precedente. Due dettagli fanno la differenza tra un pacchetto valido e uno silenziosamente scartato: il checksum va calcolato con il campo a zero e inserito dopo, e il payload deve avere la stessa lunghezza richiesta, perché la dimensione fa parte del test. L'invio usa `sendto` perché anche con un raw socket serve l'indirizzo di destinazione.

```python
import struct
import time
import socket

def costruisci(ident: int, seq: int, size: int) -> bytes:
    payload = struct.pack("!d", time.time()) + b"\x00" * max(0, size - 8)
    hdr = struct.pack("!BBHHH", 8, 0, 0, ident, seq)  # type 8 = Echo Request
    c = checksum(hdr + payload)
    return struct.pack("!BBHHH", 8, 0, c, ident, seq) + payload
```

La ricezione è il punto in cui lo strumento diventa corretto. Un raw socket consegna tutti gli ICMP destinati all'host, non solo i propri, quindi il filtro non è opzionale: type, identifier e sequence devono corrispondere, e dall'header IP va estratto il TTL. In Linux il pacchetto letto comincia proprio con l'header IPv4, di cui bastano i primi byte: versione e lunghezza IHL, lunghezza totale, TTL al nono byte e protocollo al decimo.

```python
def leggi(sock: socket.socket, ident: int, timeout: float):
    fine = time.time() + timeout
    while time.time() < fine:
        sock.settimeout(max(0.01, fine - time.time()))
        pacchetto, _ = sock.recvfrom(4096)
        ihl = (pacchetto[0] & 0x0F) * 4        # header IP: lunghezza in parole da 32 bit
        icmp = pacchetto[ihl:]
        tipo, codice, _, rid, seq = struct.unpack("!BBHHH", icmp[:8])
        if tipo == 8:                          # una richiesta altrui: ignora
            continue
        if tipo in (0, 11, 3) and rid == ident:  # risposta o errore per noi
            ttl = pacchetto[8]                     # byte 8 dell'header IP
            return tipo, codice, ttl, seq
    return None
```

Il TTL restituito è quello del messaggio di risposta, non della richiesta: un host che inizializza il TTL a 64 e risponde da cinque router di distanza produce 59. Con un TTL di richiesta pari a 4, invece, l'errore arriva dal quarto router con type 11 e il suo indirizzo IP: da lì si ricava l'hop senza attendere la destinazione.

## Uso pratico e verifica

La tabella riassume come leggere le risposte che `icmp-eco` deve saper distinguere.

| Risposta | Type e code | Significato | Esito |
| --- | --- | --- | --- |
| Echo Reply | 0/0 | host raggiunto, RTT valido | exit 0 |
| Time Exceeded | 11/0 | TTL esaurito su un router | diagnostica hop |
| Destination Unreachable | 3/1 | host dichiarato irraggiungibile | exit 1 |
| Destination Unreachable | 3/3 | non applicabile all'Echo | risposta estranea |
| Nessuna risposta | - | filtro o rete muta | exit 1, ma causa ignota |

```bash
# Confronto diretto con iputils e verifica con tcpdump
ping -c 1 -w 1 203.0.113.1; printf 'iputils exit: %s\n' "$?"
sudo python icmp_eco.py -c 1 127.0.0.1; printf 'icmp-eco exit: %s\n' "$?"
```

Il test su `127.0.0.1` deve dare RTT bassissimo e TTL pari al valore iniziale dell'host. Il test con `-t 1` verso un indirizzo esterno deve produrre un Time Exceeded dal gateway locale e nessun Echo Reply, quindi exit 1: il risultato è corretto anche quando non c'è raggiungibilità.

## Esercizi

1. Aggiungi il calcolo del numero di hop: chiedi un valore iniziale con `--initial-ttl` e stampa la distanza stimata.
2. Calcola min, media, massima e mdev degli RTT come fa iputils e verifica su `127.0.0.1` che mdev sia quasi zero.
3. Rileva i pacchetti Echo Reply duplicati e spiega come potrebbero alleggerire il calcolo della perdita.
4. Implementa `-6` con ICMPv6 type 128/129 e verifica con un socket `IPPROTO_ICMPV6`.
5. Aggiungi il controllo del checksum in ricezione e scarta i messaggi corrotti, contandoli.
6. Confronta il tuo RTT con quello di `ping` sugli stessi host e spiega differenze di ordine dei millisecondi.

<details>
<summary>Soluzione</summary>

1. Il numero di hop è `initial_ttl - ttl_ricevuto`, valido solo se la destinazione non cambia il TTL nella risposta e non ci sono hop doppi. Con `-t N` si stampa direttamente `N - 1`, cioè quanti router hanno risposto prima dell'errore.

2. Accumula ogni RTT in una lista: la pagina man di `ping` definisce `mdev` come deviazione standard della popolazione, quindi media delle distanze dalla media senza sottrarre uno al divisore. Su `127.0.0.1` i valori sono giustificati dallo scheduler e dal carico del processo, non dalla rete.

3. Tieni un set di sequence già viste: se una sequence torna, incrementa un contatore di duplicati senza sommarla alla perdita, come fa iputils, ma usala per il calcolo degli RTT statistici.

4. `socket(AF_INET6, SOCK_RAW, IPPROTO_ICMPV6)` e `struct.pack("!BBHHH", 128, 0, 0, ident, seq)`. Il checksum ICMPv6 include lo pseudo-header IPv6 con indirizzi e Next Header 58: senza, il kernel scarta il pacchetto.

5. Ricalcola lo stesso checksum dell'invio su `pacchetto[ihl:]`: se non coincide, ignora il messaggio e incrementa un contatore `corrotti` da mostrare nel riepilogo.

6. `ping` timestampa con `struct timeval` nel payload e misura al momento del `recvmsg`, quindi la differenza è dovuta a buffering e precisione del timer. Usa `-3` in iputils per evitare l'arrotondamento verso l'alto.

</details>

## Errori comuni

- **Mettere il checksum prima di averlo calcolato**: il campo deve valere zero durante la somma e ricevere il risultato solo dopo.
- **Accettare qualunque Echo Reply ricevuto**: su una macchina con più sessioni il rischio è di attribuire un RTT al pacchetto sbagliato.
- **Leggere il TTL dall'offset zero della risposta**: il byte 8 appartiene all'header IP, ma il messaggio ICMP inizia dopo IHL byte; mescolare i due piani rompe il parsing.
- **Considerare "nessuna risposta" come "host spento"**: firewall, rate limit e regole di filtro producono lo stesso silenzio; servono test incrociati su altri hop.
- **Usare un payload costante**: un payload tutto uguale non rileva problemi dipendenti dai dati e non basta a calcolare l'RTT.

## In sintesi

Hai costruito un client ICMP minimo ma corretto: checksum, identifier e sequence rendono affidabile l'accoppiamento, e il TTL trasforma un semplice Echo in uno strumento di percorso. Il contratto di uscita 0/1/2 distingue raggiungibilità, assenza di risposta ed errore operativo. Le quattro famiglie di risposta della tabella sono la base per leggere qualunque cattura ICMP, e il confronto con `ping` ne verifica la precisione.

## Fonti

- [RFC 792 - Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792.html)
- [man 8 ping](https://man7.org/linux/man-pages/man8/ping.8.html)
- [man 7 icmp](https://man7.org/linux/man-pages/man7/icmp.7.html)
- [RFC 4443 - ICMPv6 for IPv6](https://www.rfc-editor.org/rfc/rfc4443.html)
