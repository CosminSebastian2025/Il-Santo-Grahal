Un sistema H.323 che non funziona raramente sbaglia una cosa sola. Può fallire la registrazione al gatekeeper, la traduzione dell'alias in indirizzo, la negoziazione del codec o il percorso dei flussi RTP. Questo file è una guida pratica alla diagnostica: quali comandi usare, in quale ordine scendere attraverso gli strati e come leggere i sintomi tipici. Il punto di partenza è sempre lo stesso: capire se il problema sta nella segnalazione o nei media.

## Obiettivi

- Ordinare la diagnosi in tre livelli: rete, segnalazione, media.
- Usare comandi di rete per verificare gatekeeper e porte.
- Leggere i messaggi RAS di rifiuto e ricondurli alla causa.
- Distinguere un problema di codec da un problema di firewall.
- Raccogliere una cattura utile da consegnare al team di rete.

## Capi della catena

La catena H.323 coinvolge quattro anelli: l'endpoint, il gatekeeper, l'altro endpoint e la rete che li separa. Ogni anello ha strumenti propri. Prima si controlla che i pacchetti passino, poi che la segnalazione venga accettata, infine che i media arrivino.

| Livello | Domanda | Strumento |
| --- | --- | --- |
| rete | il gatekeeper è raggiungibile? | `nc`, `traceroute` |
| registrazione | l'endpoint è in zona? | log dell'endpoint, RAS |
| chiamata | il setup arriva e torna? | `tcpdump` su TCP 1720 |
| media | i flussi RTP sono bidirezionali? | cattura, statistiche RTCP |
| qualità | perdita, jitter, MOS | RTCP, contatori del telefono |

Se la prima riga fallisce, le altre non hanno senso: una diagnosi ordinata evita di perdere tempo sull'audio quando il problema è un firewall che blocca tutto.

```bash
# 1. raggiungibilità del gatekeeper in UDP
nc -vzu 192.0.2.10 1719

# 2. raggiungibilità del servizio di segnalazione
nc -vz 192.0.2.10 1720

# 3. percorso e perdite verso l'host
ping -c 5 192.0.2.10
mtr -rwzbc 20 192.0.2.10
```

`nc -vzu` è un test grossolano: UDP non ha un handshake, quindi l'assenza di errore indica solo che l'ICMP di porta non raggiungibile non è tornato. Per la segnalazione TCP il test è invece affidabile, e un `refused` sulla 1720 significa che il servizio non è in ascolto.

## Diagnostica della segnalazione

I rifiuti RAS sono formali: il gatekeeper risponde con un messaggio di risposta negativo che contiene un codice. Conoscere i codici principali riduce di molto i tempi, perché indicano già dove guardare.

| Messaggio | Significato | Intervento tipico |
| --- | --- | --- |
| RRJ | registrazione rifiutata | credenziali, alias duplicato, endpoint sconosciuto |
| ARJ | ammissione negata | banda esaurita, chiamato non raggiungibile |
| LRQ senza LCF | location fallita | dial plan del gatekeeper |
| DRQ | deregistrazione | riavvio programmato, sessione scaduta |

L'ordine dei controlli per uno RRJ parte dalle credenziali (se è attiva l'autenticazione H.235), passa per l'alias già presente nei log del gatekeeper, e termina con la configurazione del terminale. Se il terminale si registra ma la chiamata si ferma, il problema è nella traduzione dell'alias o nella raggiungibilità dell'endpoint chiamato.

```bash
# cattura solo la segnalazione tattica della chiamata
sudo tcpdump -ni eth0 -s 0 'tcp port 1720' -w chiamata.pcap

# riepilogo rapido: chi parla con chi
sudo tcpdump -r chiamata.pcap -nn -q | head -20
```

Il primo comando salva il traffico grezzo con una snapshot lunga, perché i messaggi H.225.0 contengono strutture ASN.1 che possono richiedere più spazio dei 96 byte predefiniti. Il secondo mostra il riepilogo con indirizzi e porte senza risoluzione DNS, che è il modo più rapido per capire se lo scambio è asimmetrico.

## Media, codec e firewall

Un audio a senso unico è un sintomo classico: la segnalazione ha funzionato, ma H.245 ha negoziato porte che il firewall non conosce. In quel caso il setup H.245 compare nella cattura, mentre i flussi RTP arrivano solo in una direzione. Stessa diagnostica se i media arrivano ma con jitter alto: il problema è di rete e priorità.

```bash
# flussi RTP osservati dal host, con contatori
sudo tcpdump -ni eth0 -c 200 -vv 'udp and portrange 16384-32767'
```

La cattura mostra due endpoint e due serie di pacchetti: se ne compare una sola, il firewall sta scartando i flussi in una direzione. Le statistiche RTCP aiutano a quantificare la perdita, ma i contatori restano parziali se la cattura è limitata al bordo.

| Sintomo | Ipotesi principale | Verifica |
| --- | --- | --- |
| nessun suono | RTP unidirezionale | cattura bidirezionale |
| audio a scatti | jitter, perdita | RTCP, `mtr` |
| chiamata cade subito | timeout H.245 | log endpoint |
| nessuna registrazione | porta RAS chiusa | `nc -vzu` |
| video ma non audio | codec audio non comune | H.245 TerminalCapabilitySet |

## Esempi e casi reali

In una rete enterprise il modello più comune è la coppia gatekeeper più gateway, con due gatekeeper configurati in coppia per la ridondanza. Quando un endpoint non trova il gatekeeper primario, cerca il secondario: una diagnosi completa guarda entrambi, non solo il primo. Le catture raccolte in questo file si possono aprire con Wireshark, che decodifica RAS, Q.931 e H.245 e rende visibile la sequenza completa. Nel laboratorio successivo costruirai un ambiente di prova con questi strumenti.

## Errori comuni

- **Diagnosticare i media prima della segnalazione**: se il setup fallisce, i sintomi sull'audio sono rumore e ingannano.
- **Considerare `nc -vzu` un test affidabile**: su UDP non c'è risposta applicativa, quindi l'assenza di errore non prova l'ascolto del servizio.
- **Trascurare RTCP**: senza statistiche non si distingue la perdita di rete dal jitter dell'endpoint.
- **Catturare con snapshot corta**: i messaggi H.225.0 troncati perdono le informazioni utili per l'analisi.
- **Analizzare solo il primo gatekeeper**: la ridondanza cambia il comportamento quando il primario è irraggiungibile.

## In sintesi

La diagnostica H.323 si svolge a strati: raggiungibilità, registrazione, setup, media. Ogni livello ha comandi e log specifici, e saltare l'ordine fa perdere tempo sulla causa sbagliata. I rifiuti RAS e le catture H.225.0 sono i due strumenti più informativi. Come criterio di chiusura, una cattura completa di una chiamata che fallisce, con snapshot lunga, vale più di ore di tentativi alla cieca.

## Fonti

- [Itu-t H.323 — Packet-based multimedia communications systems](https://www.itu.int/rec/T-REC-H.323/en)
- [Itu-t H.225.0 — Call signalling protocols and media stream packetization](https://www.itu.int/rec/T-REC-H.225)
- [Itu-t H.245 — Control protocol for multimedia communication](https://www.itu.int/rec/T-REC-H.245)
- [Rfc 3550 — Rtp: A Transport Protocol for Real-Time Applications](https://www.rfc-editor.org/rfc/rfc3550.html)
