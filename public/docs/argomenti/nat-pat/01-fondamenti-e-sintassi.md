Nel 1994 gli indirizzi IPv4 stavano finendo. NAT (Network Address Translation) è la risposta operativa: un router cambia indirizzi nelle intestazioni e mantiene una tabella che ricorda come tradurre al ritorno. PAT estende l'idea alle porte, permettendo a centinaia di host di condividere un solo indirizzo pubblico. In questa lezione costruisci il modello mentale del meccanismo, con la tabella di traduzione al centro.

Le fonti normative sono RFC 3022, che formalizza NAT e NAPT, e RFC 2663, che descrive il vocabolario (Basic NAT, NAPT, Twice NAT). L'RFC 4787 aggiunge i requisiti per i dispositivi che fanno NAT con UDP, utili per capire come si comporta il firewall di casa tua con un gioco o una chiamata di gruppo.

## Obiettivi

- Distinguere NAT statico, dinamico e PAT e spiegare cosa cambia in ogni caso.
- Leggere una tabella di traduzione con indirizzi interni, esterni e porte.
- Ricostruire il destino di un pacchetto in uscita e di ritorno su un router che fa NAT.
- Riconoscere differenze di comportamento (full cone, restricted, symmetric) e le loro conseguenze.
- Collegare NAT, CGNAT e il problema del dual stack IPv6.

## Un indirizzo privato su Internet

RFC 1918 riserva tre blocchi per le reti private: `10.0.0.0/8`, `172.16.0.0/12` e `192.168.0.0/16`. Un router non instrada questi indirizzi su Internet. NAT risolve il problema di instradamento traducendo gli indirizzi privati in uno pubblico nel momento in cui i pacchetti attraversano il confine.

Originariamente NAT serviva a collegare due reti con spazio di indirizzamento sovrapposto o non aggregabile, non a risparmiare registro: con la penuria di IPv4 è diventato uno strumento di condivisione universale e ha contribuito a rimandare l'esaurimento. Il costo è l'opacità, perché un host interno non è raggiungibile dall'esterno finché nessuno crea un binding.

## Tre famiglie di traduzione

| Tipo | Cosa cambia | Chi lo usa | Mappatura |
| --- | --- | --- | --- |
| NAT 1:1 (Basic NAT) | solo indirizzo IP | reti aziendali con pool pubblici | statica o dinamica, una alla volta |
| PAT / NAPT | indirizzo IP e porta | router domestici, firewall, NAT cloud | molte host su un indirizzo |
| Port forwarding | destinazione e porta in ingresso | server pubblicati dietro NAT | regola statica, non tabella dinamica |

Il **NAT statico** lega per sempre un indirizzo privato a uno pubblico: utile per server che devono essere raggiunti dall'esterno. Il **NAT dinamico** associa on demand un indirizzo privato a uno del pool pubblico e lo rilascia alla fine del flusso, con lo stesso vincolo uno a uno. Il **PAT** (Port Address Translation, chiamato NAPT in RFC 3022) va oltre: usa una sola combinazione `ip:porta` esterna per tutti i flussi, e solo la porta sorgente cambia distinguendo i client.

Il port forwarding è la regola speculare: dentro la configurazione del router si dice "la porta 443 in ingresso va a `192.168.1.10:443`", e la traduzione avviene in direzione opposta alla tabella dinamica. I due meccanismi convivono nello stesso router.

## La tabella di traduzione

La traduzione è un problema di stato. Il router guarda il pacchetto con `(sorgente:porta, destinazione:porta, protocollo)` e lo confronta con le regole; se è nuovo crea un binding, altrimenti usa quello esistente. Il binding copre quattro valori: indirizzo e porta originali, indirizzo e porta tradotti.

| Lato interno | Lato esterno | Destinazione | Stato |
| --- | --- | --- | --- |
| 192.168.1.10:52144 | 203.0.113.7:40001 | 93.184.216.34:443 | ACTIVE, 1m |
| 192.168.1.11:52144 | 203.0.113.7:40002 | 93.184.216.34:443 | ACTIVE, 3m |
| 192.168.1.12:53000 | 203.0.113.7:40003 | 198.51.100.25:53 | ACTIVE, 5s |

Due client usano la stessa porta sorgente `52144`: il PAT non si confonde perché la coppia `ip:porta` tradotta è distinta, e una risposta che arriva su `40003` va a `.12` solo perché il binding lo dice. Quando il binding scade, la stessa porta può essere riusata per un altro flusso.

```bash
# Primo pacchetto interno: sorgente privata, porta originale
sudo tcpdump -i eth0 -n 'port 443'
# 192.168.1.10.52144 > 93.184.216.34.443: Flags [S]

# Pacchetto che esce davvero sul collegamento WAN
sudo tcpdump -i eth1 -n 'port 443'
# 203.0.113.7.40001 > 93.184.216.34.443: Flags [S]

# Il binding visto dal kernel Linux
sudo conntrack -L -p tcp --dport 443
```

Su un router che usa Linux, `conntrack -L` mostra esattamente la tabella sopra, con `src`, `dst`, `sport`, `dport`, gli `reply` e lo stato `ESTABLISHED`. La regola consente anche il ritorno dei pacchetti senza regole in ingresso aggiuntive: si chiama stateful, perché il firewall ricorda il flusso.

Punto delicato: il checksum. NAT deve riscrivere IP, TCP o UDP e ricalcolare i checksum; per ICMP invece la traduzione tocca l'*echo identifier* e il checksum ICMP, perché non ci sono porte. I protocolli con indirizzi dentro il payload (FTP attivo, SIP, H.323) richiedono un modulo ALG che li riscriva.

## Comportamenti: symmetric, cone e l'inconveniente del P2P

L'RFC 4787 classifica i NAT con UDP su due assi. Il primo è il **filtering**: full cone accetta l'in ingresso da chiunque verso un binding aperto, address-restricted solo da indirizzi già contattati, address-and-port restricted solo dalla coppia esatta. Il secondo è il **mapping**: indipendente dall'endpoint se lo stesso binding viene riusato verso destinazioni diverse, o dipendente dall'endpoint se per ogni destinazione si crea un binding nuovo.

Un NAT **symmetric** crea binding diversi per destinazioni diverse, quindi due peer che vogliono parlarsi senza un server di rendezvous non ci riescono: è la causa tecnica di molta "non si connette" nel video in peer-to-peer e nei giochi. Risolvere richiede STUN (RFC 8489) per scoprire l'indirizzo esterno, TURN (RFC 8656) come relay e ICE per scegliere il percorso.

```bash
# Su un router Linux, controllare il comportamento di UDP
# nf_conntrack_udp_timeout: durata del binding UDP (secondi)
sysctl net.netfilter.nf_conntrack_udp_timeout
sysctl net.netfilter.nf_conntrack_tcp_timeout_established

# Binding attuali: "src" è il lato client, "dst" la tabella tradotta
sudo conntrack -L
```

Anche il **timeout** conta: un binding UDP scade dopo pochi secondi di inattività, un TCP dopo ore o giorni. Una connessione apparentemente viva dopo ore non significa che il NAT la conosca ancora: un buco di 30 secondi in un `SSH` o in una sessione di database può chiudere il binding, e il calo si manifesta come reset.

## Errori comuni

- **Credere che NAT sia un firewall**: la traduzione non è una politica di sicurezza; lo è la regola stateful che la accompagna.
- **Assumere che l'IP esterno identifichi il client**: dietro un CGNAT, migliaia di client condividono l'indirizzo e si distinguono solo per porta e finestra temporale.
- **Ignorare i protocolli con indirizzi nel payload**: FTP attivo e SIP si rompono senza ALG o senza server che gestiscano i dati fuori banda.
- **Confondere NAT e port forwarding**: il primo è una tabella dinamica, il secondo una regola in ingresso; il router spesso fa entrambi.
- **Dimenticare che IPv6 non ha bisogno di PAT**: le reti IPv6 nascono con indirizzi globali e il NAT è solo una scelta di gestione, non una necessità.

## In sintesi

NAT traduce indirizzi, PAT aggiunge le porte e permette a molti host di condividere un indirizzo. Tutto si regge su una tabella che unisce `ip:porta` interni ed esterni e scade con i timeout. Il comportamento del NAT con UDP, simmetrico o cone, decide se un peer può essere raggiunto; i protocolli con indirizzi nel payload richiedono aiuto. Il CGNAT porta questi compromessi alla scala di un intero provider.

## Fonti

- [RFC 3022 - Traditional IP Network Address Translator](https://www.rfc-editor.org/rfc/rfc3022)
- [RFC 2663 - IP Network Address Translator Terminology and Considerations](https://www.rfc-editor.org/rfc/rfc2663)
- [RFC 4787 - Network Address Translation (NAT) Behavioral Requirements for Unicast UDP](https://www.rfc-editor.org/rfc/rfc4787)
- [RFC 1918 - Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918)
- [Linux Kernel - netfilter conntrack sysctl](https://docs.kernel.org/networking/nf_conntrack-sysctl.html)
