H.323 è la suite di raccomandazioni ITU-T che definisce come trasportare audio, video e dati su reti a commutazione di pacchetto prive di garanzie di qualità del servizio, cioè su IP. Nata nel 1996 per portare la videoconferenza su LAN e WAN, è stata per anni il pilastro delle soluzioni enterprise e dei trunk telefonici su IP. In questa lezione impari la struttura della suite, i ruoli che si scambiano i messaggi e il percorso che fa una chiamata dall'inizio alla fine.

## Obiettivi

- Ricostruire la mappa dei protocolli che compongono H.323 e il loro scopo.
- Distinguere gatekeeper, gateway, MCU, terminal e proxy nello stesso dominio.
- Descrivere lo scambio RAS e il ruolo di H.225.0 e H.245 nel setup di una chiamata.
- Collocare H.323 rispetto a SIP, RTP e ai protocolli di trasporto che usa.
- Leggere un flusso H.323 con gli strumenti di diagnostica di base.

## La suite di protocolli

H.323 non è un protocollo solo: è una famiglia di raccomandazioni che usa protocolli esistenti e ne aggiunge alcuni propri. L'idea era riutilizzare quello che esisteva già, da ISDN a RTP, invece di inventare un formato unico per tutto. Le raccomandazioni più citate della suite sono H.225.0 (segnalazione e RAS), H.245 (controllo dei canali), H.235 (sicurezza) e H.239 (condivisione di contenuti).

| Componente | Funzione | Trasporto tipico |
| --- | --- | --- |
| H.225.0 RAS | registrazione, ammissione, stato tra terminal e gatekeeper | UDP 1719 (non standard) |
| H.225.0 Q.931 | segnalazione di chiamata (setup, alerting, connect) | TCP 1720 |
| H.245 | negoziazione di codec, indirizzi e modalità di media | TCP, porta dinamica |
| H.235 | sicurezza e autenticazione | sopra H.225.0 |
| H.239 | condivisione di presentazione insieme al video | dentro H.245 |
| RTP/RTCP | trasporto e statistica dei flussi media | UDP |

Il livello media poggia su RTP, lo stesso protocollo usato da SIP e da quasi ogni sistema VoIP; la differenza sta nel modo in cui si costruisce e si controlla la sessione.

```text
# percorso logico di una chiamata con gatekeeper
terminale A --RAS--> gatekeeper (admesso, indirizzo del chiamato)
terminale A --Q.931 su TCP 1720--> terminale B
terminale A <--H.245--> terminale B (codec, porte RTP)
terminale A <===RTP/RTCP====> terminale B
```

## Ruoli e domini

Un terminale H.323 è un endpoint della chiamata: un telefono IP, un client software o un terminale di videoconferenza. Il gateway collega il dominio H.323 a un'altra rete, tipicamente la PSTN o un sistema H.320, traducendo segnalazione e codec. Il gatekeeper gestisce le registrazioni, l'ammissione e l'indirizzamento all'interno di una zona. L'MCU (Multipoint Control Unit) organizza le conferenze a più partecipanti, misturando i flussi o inoltrandoli.

| Ruolo | Funzione principale | Senza di lui |
| --- | --- | --- |
| terminal | utente finale, codec, RTP | nulla funziona: nessun endpoint |
| gateway | traduzione verso altre reti | solo chiamate interne |
| gatekeeper | registrazione, ammissione, routing, banda | chiamate solo per IP diretto |
| MCU | conferenza a N partecipanti | coppie punto a punto |
| proxy | inoltra la segnalazione senza gestire la banda | scenario raro, opzionale |

La zona è l'insieme di endpoint registrati a un gatekeeper. Se un endpoint prova a chiamare senza registrazione e il gatekeeper applica la regola, la chiamata viene rifiutata con un messaggio RAS che spiega il motivo: è il primo posto da guardare quando un telefono "non chiama".

## RAS, Q.931 e H.245

Il setup di una chiamata H.323 attraversa tre momenti distinti. Prima la RAS: il terminale si registra e chiede il permesso di avviare la chiamata. Poi Q.931: si stabilisce il canale di segnalazione con il chiamato. Infine H.245: si negozia tutto ciò che serve ai media, cioè codec, indirizzi e porte.

```text
# sequenza RAS tra terminale e gatekeeper
RRQ   terminale -> gatekeeper   Registrazione con alias ed endpoint
RCF   gatekeeper -> terminale   Accettata, con eventuale prefisso
ARQ   terminale -> gatekeeper   Ammissione: chiamato, banda richiesta
ACF   gatekeeper -> terminale   Ammessa, con indirizzo di destinazione
LRQ   terminale -> gatekeeper   Location request, se l'indirizzo non è noto
```

Q.931 è riutilizzato da ISDN: messaggi come SETUP, ALERTING, CONNECT e RELEASE COMPLETE fanno parte del vocabolario. H.245 apre un canale TCP separato e scambia capacità con messaggi come TerminalCapabilitySet, poi apre i canali logici per audio, video e dati. Questa separazione è elegante ma costosa: servono più connessioni TCP e più porte aperte nel firewall.

```text
# porte tradizionalmente associate a H.323
TCP 1720       segnalazione H.225.0 (Q.931)
UDP 1719       RAS, solo se il gatekeeper è raggiungibile per porta fissa
TCP dinamiche  H.245, negoziato dentro la segnalazione
UDP dinamiche  RTP/RTCP, negoziate dentro H.245
```

## Osservare una chiamata

Un analizzatore di rete che decodifica H.225.0 mostra la sequenza RAS e Q.931, e i messaggi H.245 con i codec proposti. In assenza di un decoder specializzato si può controllare il flusso con `tcpdump`, filtrando la porta di segnalazione e le porte RTP negoziate.

```bash
# verifica che il gatekeeper risponda sulla porta RAS
nc -vzu 192.0.2.10 1719

# cattura la segnalazione di chiamata su TCP 1720
sudo tcpdump -ni eth0 'tcp port 1720' -w h323.pcap

# mostra i branch di media RTP con statistiche di base
sudo tcpdump -ni eth0 'udp and portrange 16384-32767' -vv
```

Il primo comando usa `nc` in modalità UDP per controllare la raggiungibilità del gatekeeper, il secondo salva il traffico per l'analisi con Wireshark, e il terzo serve a distinguere i flussi RTP dal resto del traffico. Le porte dinamiche variano da implementazione a implementazione, quindi il filtro va costruito sulla base del traffico H.245 osservato.

## Errori comuni

- **Confondere H.323 con un solo protocollo**: è una suite, e i problemi vanno isolati tra RAS, Q.931, H.245 e RTP.
- **Sbloccare solo la porta 1720 sul firewall**: la segnalazione passa, ma H.245 e RTP usano porte dinamiche e la chiamata resta senza audio.
- **Pubblicare la RAS su Internet senza controllo**: amplia la superficie di attacco, e in molti casi basta esporre la sola segnalazione.
- **Ignorare la priorità del gatekeeper**: un endpoint registrato a un gatekeeper diverso dal previsto può fallire senza errori evidenti.
- **Dare per scontato che il codec negoziato sia quello voluto**: H.245 sceglie il primo codec comune secondo l'ordine, e questo va verificato.

## In sintesi

H.323 organizza la conversazione su IP in tre fasi: RAS per registrazione e ammissione, Q.931 per la segnalazione di chiamata, H.245 per la negoziazione dei media. Il gatekeeper è il perno di un dominio, il gateway lo collega alle reti tradizionali e l'MCU abilita le conferenze. La suite funziona, ma paga la complessità con l'apertura di più porte e più connessioni: un tema che domina anche la sua parabola storica.

## Fonti

- [Itu-t H.323 — Packet-based multimedia communications systems](https://www.itu.int/rec/T-REC-H.323/en)
- [Itu-t H.245 — Control protocol for multimedia communication](https://www.itu.int/rec/T-REC-H.245)
- [Itu-t H.225.0 — Call signalling protocols and media stream packetization](https://www.itu.int/rec/T-REC-H.225)
- [Rfc 3261 — Sip: Session Initiation Protocol](https://www.rfc-editor.org/rfc/rfc3261.html)
- [Itu-t Recommendation index](https://www.itu.int/rec/T-REC/en)
