`ping` è il primo comando che si digita quando una rete non risponde, ed è anche quello che più spesso viene frainteso. Invia un ICMP Echo Request e attende un Echo Reply: se la risposta arriva, il percorso IP è aperto nelle due direzioni. Non dice nulla sulle porte, sui servizi o sull'applicazione. In questa lezione impari cosa misurano davvero i numeri di `ping`, come leggere RTT e TTL e in quali casi il silenzio non significa guasto.

## Obiettivi

- Riconoscere il protocollo usato da `ping` e i limiti di ciò che può dimostrare.
- Leggere un output completo: byte, tempo, TTL e riepilogo statistico.
- Usare le opzioni principali di iputils e di Windows per i test mirati.
- Distinguere un timeout da un errore ICMP o da un errore di risoluzione del nome.
- Interpretare RTT, perdita e jitter senza confonderli con problemi di applicazione.

## Cosa invia e cosa riceve

`ping` costruisce un datagramma di Echo Request: header IP, header ICMP di otto byte, una marca temporale e un numero arbitrario di byte di riempimento. La risposta attesa è type 0 con lo stesso identificatore: l'identifier a sedici bit separa i processi che interrogano lo stesso host, la sequence ordina i pacchetti. Se il payload è almeno grande quanto una `struct timeval`, `ping` usa quei byte per il timestamp e calcola l'RTT; con payload più corti gli RTT non vengono mostrati.

| Linguaggio | Nome | Messaggio ICMP | Risposta |
| --- | --- | --- | --- |
| IPv4 | Echo Request | type 8, code 0 | type 0 |
| IPv6 | Echo Request | type 128, code 0 | type 129 |

Le dimensioni predefinite cambiano tra implementazioni: iputils invia 56 byte di dati, per un pacchetto IP da 84 byte, mentre Windows parte da 32 byte di dati. In entrambi i casi il numero indicato è la dimensione del payload e non quella del pacchetto completo.

```bash
ping -c 4 example.com
```

## Leggere l'output

L'output di iputils su Linux riporta per ogni risposta la sorgente, la dimensione dei dati, la sequence e l'RTT, con la eventuale deviazione standard. Il riepilogo finale elenca pacchetti trasmessi, ricevuti e perduti, poi valori minimi, medi, massimi e `mdev`. Windows usa un formato diverso e un riepilogo simile, ma il timeout predefinito è quattro secondi, più lungo dell'attesa su Linux.

```text
64 bytes from 93.184.216.34: icmp_seq=1 ttl=56 time=12.4 ms
64 bytes from 93.184.216.34: icmp_seq=2 ttl=56 time=12.1 ms
4 packets transmitted, 4 received, 0% packet loss
rtt min/avg/max/mdev = 12.104/12.302/12.451/0.132 ms
```

| Voce | Significato | Come leggerla |
| --- | --- | --- |
| `bytes` | payload dell'Echo Reply | conferma la dimensione richiesta |
| `time` | RTT misurato al processo | tempo di andata e ritorno, non unico verso |
| `ttl` | TTL del pacchetto di risposta | stima degli hop superati |
| `mdev` | deviazione standard degli RTT | alta variabilità, non perdita |
| `packet loss` | richieste senza risposta | può essere un filtro |

Il TTL va interpretato con cautela. Molti sistemi ricominciano il TTL della risposta da 255, altri da 64 o da un valore unico per protocollo; la distanza si ricava solo supponendo il valore iniziale. Un TTL di 56 su un host che parte da 64 suggerisce otto hop, ma se l'host parte da 128 gli hop sarebbero settantadue. La pagina man di `ping` documenta proprio questa incertezza e l'abitudine di dedurre il numero di router solo come ipotesi.

## Opzioni che cambiano il test

Le opzioni servono a isolare una variabile alla volta. Il numero di pacchetti rende l'esito misurabile invece di soggettivo, l'intervallo agisce sul carico di rete, la dimensione mette alla prova gli MTU lungo il percorso e l'interfaccia o il tipo di indirizzo levano l'ambiguità del dual-stack.

| iputils (Linux) | Windows | Effetto |
| --- | --- | --- |
| `-c N` | `/n N` | numero di Echo Request |
| `-i S` | - | intervallo tra invii, predefinito 1 secondo |
| `-W T` | `/w T` | attesa di una risposta (secondi / millisecondi) |
| `-w D` | - | termine complessivo in secondi |
| `-s N` | `/l N` | dimensione dei dati |
| `-t N` | `/i N` | TTL dei pacchetti inviati |
| `-M do` | `/f` | DF impostato, per la PMTU |
| `-I INT` | `/S addr` | interfaccia o sorgente |
| `-4`, `-6` | `/4`, `/6` | forza IPv4 o IPv6 |

```bash
ping -c 3 -i 0.2 -W 1 192.0.2.20        # tre richieste, attesa breve
ping -c 1 -M do -s 1472 192.0.2.20      # 1472 + 28 = 1500 byte, test di PMTU
ping -6 -c 2 fe80::1%eth0               # link-local: serve la zona interfaccia
```

Le due combinazioni con cui si commette più spesso un errore sono `-M do` e la dimensione. Con DF, un payload che supera l'MTU del percorso viene scartato da un router con Destination Unreachable code 4: il risultato non è un timeout, ma un messaggio che `ping` mostra come "fragmentation needed". La dimensione da provare si calcola togliendo dall'MTU la dimensione degli header, 28 byte per IPv4 senza opzioni.

## Quando ping non basta

Il silenzio ha molte cause. Un timeout può significare che l'host è spento, che un firewall scarta Echo Request, che la risposta è filtrata in uscita o che il rate limit del dispositivo ha abbassato il traffico. Un errore ICMP, invece, è un'informazione certa: "destination host unreachable" dal gateway locale oppure dal primo router dice che esiste un router disposto a dichiarare l'errore, non che il percorso è assente. Se il nome non si risolve, il fallimento è di DNS, come ricorda la documentazione Microsoft: se il ping all'indirizzo funziona e al nome no, il problema non è di connettività.

Molti servizi cloud e provider filtrano ICMP per scelta, quindi un ping fallito verso un indirizzo pubblico valido dice poco: lo stesso indirizzo può servire HTTP senza rispondere a Echo Request. Viceversa l'Echo è un servizio di scoperta degli host, ed è per questo che le reti esposte lo limitano con regole di filtro.

```bash
ping -c 1 www.example.org; echo "exit $?"     # 0 con risposta, 1 senza, 2 errore
ping -c 1 1.1.1.1; ping -c 1 nonexistent.example.invalid
```

## Errori comuni

- **Usare `ping` per verificare una porta**: se una porta è chiusa lo stack risponde comunque agli Echo; per i servizi serve una connessione TCP o una prova UDP.
- **Considerare "request timed out" una dimostrazione di host spento**: il filtro degli Echo produce lo stesso sintomo, va confrontato con altri target o altre porte.
- **Interpretare il TTL come numero di hop senza supporre il valore iniziale**: il TTL misurato dipende da come il sistema remoto costruisce la risposta.
- **Lasciare `ping` senza `-c` in uno script**: il comando continua all'infinito e blocca pipeline e job automatici.
- **Inviare a ritmo alto su un link pieno**: `-f` e intervalli molto bassi aggiungono carico e falsano la misura; iputils li riservano al super-utente.

## In sintesi

`ping` è un test di raggiungibilità a livello IP fondato su una coppia Echo Request ed Echo Reply. L'RTT misura il tempo di andata e ritorno, il TTL stimola la distanza, il riepilogo rende conto di perdita e variabilità. Le opzioni permettono di isolare una variabile alla volta, dalla dimensione all'interfaccia. Il limite più importante è che non parla di porte né di applicazioni: un ping positivo è il punto di partenza della diagnosi, mai la sua conclusione.

## Fonti

- [man 8 ping (iputils)](https://man7.org/linux/man-pages/man8/ping.8.html)
- [ping - Windows Server command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping)
- [RFC 792 - Internet Control Message Protocol](https://www.rfc-editor.org/rfc/rfc792.html)
- [RFC 4443 - ICMPv6 for IPv6](https://www.rfc-editor.org/rfc/rfc4443.html)
