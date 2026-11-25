Un singolo `ping` risponde alla domanda "c'è qualcuno?", non alla domanda "il percorso è sano?". In questa lezione impari a usare `ping` come strumento di misura sistematica: statistiche per stabilire soglie, test di dimensione per scoprire l'MTU del percorso, TTL crescente per trovare il punto critico e strumenti complementari per i casi in cui ICMP è filtrato. L'obiettivo è trasformare un comando interattivo in una procedura ripetibile, con criteri di uscita e risultati interpretabili.

## Obiettivi

- Costruire una procedura di verifica a strati con target e ordine di test fissi.
- Usare RTT, perdita, jitter e soglie per decidere se e quando un percorso è degradato.
- Misurare l'MTU del percorso con Echo Request e flag DF.
- Leggere `traceroute` e `pathping` per isolare l'hop responsabile della perdita.
- Scegliere alternative a ICMP quando il protocollo è filtrato o disattivato.

## Una procedura, non un comando

La pagina man di iputils descrive la procedura corretta: partire dall'host locale, poi gateway, poi host sempre più distanti. Ogni passo riduce lo spazio delle ipotesi, perché il primo test che funziona indica che tutto ciò che c'è a monte funziona, e il primo test che fallisce indica il confine tra la parte sana e la parte guasta.

| Passo | Target | Dimostra | Non dimostra |
| --- | --- | --- | --- |
| 1 | `127.0.0.1` e proprio IP | stack ICMP della macchina | cablaggio |
| 2 | gateway predefinito | rete locale e ARP | connettività esterna |
| 3 | `1.1.1.1` o IP pubblico | uscita verso Internet | DNS |
| 4 | nome risolto | risoluzione DNS | servizio applicativo |
| 5 | porta del servizio | applicazione | prestazioni di rete |

```bash
ip route | awk '/default/ {print $3}'          # trova il gateway
ping -c 3 -W 1 127.0.0.1
ping -c 3 -W 1 192.168.1.1
ping -c 3 -W 1 1.1.1.1
ping -c 3 -W 1 www.example.com
```

Un dettaglio di attribuzione: se il passo 2 funziona e il passo 3 no, il problema è nel router o nella sua policy di uscita; se il passo 1 fallisce, il ping non sta usando la rete che vuoi misurare. La sequenza va usata così, senza saltare passi, perché è il confronto tra passi adiacenti che dice dove guardare.

## Interpretare le statistiche

Il riepilogo di `ping` contiene abbastanza numeri per separare la latenza dalla perdita, che sono problemi distinti. L'RTT medio alto ma stabile descrive un percorso lungo o una coda persistente; la perdita concentrata descrive pacchetti che non tornano; `mdev` alto descrive variabilità, quella che rende scattanti le videochiamate e lente le trasferte di grossi file.

```bash
# Cento richieste a 200 ms: misura più solida del singolo pacchetto
ping -c 100 -i 0.2 -W 1 192.0.2.30 | tail -2
```

| Segno osservato | Ipotesi | Verifica successiva |
| --- | --- | --- |
| RTT stabile e alto | percorso lungo o coda fissa | `traceroute` per contare gli hop |
| Perdita a ondate | congestione o rate limit | `pathping` per hop |
| `mdev` alto al destinatario | jitter di rete o CPU | confronto con un secondo host |
| Perdita solo a payload grandi | frammentazione o MTU | `-M do` con dimensioni crescenti |
| Duplicati | retrasmissione al livello dati | log del link o dello switch |

La perdita di ICMP non equivale sempre a perdita applicativa: molti router deprioritizzano ICMP in coda, e un link sovraccarico scarta prima gli Echo che il traffico TCP. Il segnale più affidabile è la coerenza tra hop adiacenti, ed è esattamente ciò che `pathping` rende leggibile.

## Scoprire l'MTU e isolare l'hop

L'MTU del percorso si trova con una ricerca a due estremi. Si invia un payload con DF impostato: se la risposta è "message too long" o arriva Destination Unreachable code 4, il valore supera l'MTU; se arriva un Echo Reply, si può provare più grande. In Windows si usa `/f` con `/l`, in iputils `-M do` con `-s`.

```bash
ping -c 1 -M do -s 1472 203.0.113.5      # ok se l'MTU è 1500
ping -c 1 -M do -s 1473 203.0.113.5      # atteso: troppo grande
```

Per la perdita, `traceroute` mostra dove il TTL scade e `pathping` aggiunge statistiche per hop e per link: invia per default cento richieste a ogni router e distingue la perdita attribuibile al nodo da quella del collegamento, che è la distinzione che serve per sapere chi chiamare.

| Comando | Piattaforma | Cosa aggiunge |
| --- | --- | --- |
| `traceroute -I` | Linux | percorso con ICMP Echo |
| `tracert` | Windows | percorso con Time Exceeded |
| `pathping` | Windows | perdita per hop e per link |
| `mtr` | Linux/macOS | misura continua, se installato |

```powershell
tracert -d -h 15 www.example.com
pathping -n -q 50 www.example.com
```

## Quando ICMP è filtrato

Se il ping verso tutti i target pubblici fallisce ma i servizi funzionano, la domanda diventa che cosa risponde. Gli strumenti complementari usano altri protocolli: `tracepath` e `traceroute -T` camminano con TCP, `nc` o `curl` verificano una porta, e uno scanner di host discovery come quelli documentati da Nmap può usare ARP, TCP o finestre ICMP a seconda della rete.

La scelta operativa è quindi esplicita: l'Echo è comodo e obbligatorio in ogni host IPv4 secondo RFC 1122, anche se un amministratore o un apparato può filtrarlo, e gli strumenti alternativi sono più onerosi ma rispondono a domande diverse. Per una verifica di rete ben fatta servono entrambi, e la documentazione delle soglie rende ripetibile il giudizio su un percorso.

```bash
tracepath -m 20 203.0.113.5                  # PMTU e percorso senza root
nc -zv -w 2 203.0.113.5 443                  # verifica della porta, non di ICMP
curl -sS -m 5 -o /dev/null -w '%{http_code}\n' https://example.com
```

## Errori comuni

- **Ricavare conclusioni da un solo pacchetto**: un singolo timeout è rumore; senza una serie e una soglia la diagnosi non è ripetibile.
- **Attribuire la perdita al destinatario quando i router intermedi la mostrano**: i router limitano ICMP, e `pathping` va letto per coppie di hop.
- **Dimenticare l'header nel calcolo dell'MTU**: 1500 byte di MTU corrispondono a 1472 byte di dati con header IPv4 e ICMP standard.
- **Pensare che un ping fallito verso Internet escluda problemi locali**: il filtro in uscita produce lo stesso risultato e richiede un test a tutti gli hop.
- **Eseguire `pathping` o `mtr` come prova immediata**: raccolgono statistiche per decine di secondi e su reti lente consumano tempo e traffico.
## In sintesi

`ping` diventa uno strumento professionale quando è inserito in una procedura a strati con soglie, serie di pacchetti e criteri di uscita dichiarati. RTT, perdita e `mdev` descrivono problemi diversi e vanno letti separatamente. La dimensione con DF scopre l'MTU, `traceroute` e `pathping` localizzano l'hop critico. Quando ICMP è filtrato, gli strumenti basati su TCP, UDP e HTTP rispondono a domande diverse e smettono di essere un ripiego. Il laboratorio mette insieme i pezzi in uno script ripetibile.

## Fonti

- [man 8 ping (iputils)](https://man7.org/linux/man-pages/man8/ping.8.html)
- [pathping - Windows Server command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pathping)
- [tracert - Windows Server command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert)
- [RFC 1122 - Requirements for Internet Hosts](https://www.rfc-editor.org/rfc/rfc1122.html)
- [RFC 1191 - Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc1191)
