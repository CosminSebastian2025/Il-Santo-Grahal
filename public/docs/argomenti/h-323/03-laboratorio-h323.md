In questo laboratorio simuli H.323 senza un centralino vero: un gatekeeper finto in Python risponde ai messaggi RAS, e la sequenza viene registrata in un log e confrontata con una cattura di rete. Ogni fase ha un responsabile preciso, e l'obiettivo è avere un harness con cui provare scenari di errore, come un alias duplicato o un codec non comune.

## Obiettivi

- Modellare i messaggi RAS come strutture riconoscibili e registrarli in un log.
- Simulare un gatekeeper minimale che accetta o rifiuta una registrazione.
- Riconoscere le porte negoziate nella fase H.245.
- Scrivere test che coprono gli scenari di errore.
- Integrare una verifica di raggiungibilità delle porte.

## Il contratto del laboratorio

Il laboratorio produce un log di sessione leggibile e un riepilogo stampabile. La scelta chiave è non dipendere da un sistema H.323 reale: i messaggi sono dizionari in ordine cronologico, come quelli di un gatekeeper.

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| `simula_gatekeeper` | funzione pura | testabile senza rete |
| `registra` | risposta RRQ/RCF/RRJ | è il primo punto che fallisce |
| `amministra` | risposta ARQ/ACF/ARJ | introduce il concetto di banda |
| log | lista ordinata di tuple | semplice confronto nei test |
| exit code | 0 successo, 1 rifiuto | coerente con le convenzioni CLI |

```bash
python -m venv .venv
source .venv/bin/activate
python laboratorio.py --verbose
```

## Core: Gatekeeper finto

Il simulatore registra gli endpoint e risponde con accettazione o rifiuto. L'alias in chiaro basta per il laboratorio: in un sistema reale l'identità arriva da H.235.

```python
def registra(endpoint, alias, registrati, log):
    """Simula un RRQ e restituisce il codice di risposta."""
    log.append(("RRQ", endpoint, alias))
    if alias in registrati:
        log.append(("RRJ", alias, "duplicateAlias"))  # alias già in zona
        return False
    registrati[alias] = endpoint
    log.append(("RCF", alias, endpoint))
    return True
```

L'ammissione ripete la struttura e introduce la banda: un ARJ arriva quando il chiamato non è in zona o la banda richiesta supera quella disponibile.

```python
def amministra(chiamante, chiamato, banda, registrati, disponibile, log):
    """Simula un ARQ verso il gatekeeper in zona."""
    log.append(("ARQ", chiamante, chiamato, banda))
    if chiamato not in registrati:
        log.append(("ARJ", "callerNotRegistered"))
        return None
    if banda > disponibile:
        log.append(("ARJ", "bandwidthLimit"))
        return None
    disponibile -= banda
    log.append(("ACF", registrati[chiamato]))
    return disponibile
```

Chiamare `registra` due volte con lo stesso alias produce `RRJ`: l'endpoint non entra in zona e la successiva ammissione fallisce per chiamato sconosciuto.

```python
def sessione(log):
    registrati = {}
    banda = 512
    registra("10.0.0.5", "reception", registrati, log)
    banda = amministra("10.0.0.5", "studio", 128, registrati, banda, log) or banda
    return registrati, banda
```

`sessione` restituisce la mappa degli endpoint registrati e la banda residua: i test verificano questi valori senza aprire socket.

## Scenari di errore

Lo scenario non felice è quello che nella realtà produce un ticket. Il laboratorio ne copre tre: alias duplicato, chiamato assente e banda esaurita.

```python
def test_alias_duplicato():
    log, reg = [], {}
    registra("10.0.0.5", "reception", reg, log)
    assert registra("10.0.0.9", "reception", reg, log) is False
    assert ("RRJ", "reception", "duplicateAlias") in log

def test_banda_esaurita():
    log, reg = [], {}
    registra("10.0.0.5", "reception", reg, log)
    registra("10.0.0.6", "studio", reg, log)
    assert amministra("10.0.0.5", "studio", 900, reg, 512, log) is None
```

| Test | Messaggio atteso | Revisione |
| --- | --- | --- |
| alias duplicato | RRJ | non registrare due volte |
| chiamato assente | ARJ | mantenere il messaggio esatto |
| banda insufficiente | ARJ | nessun consumo di banda |
| caso felice | ACF | banda ridotta del valore richiesto |

La tabella è il criterio di uscita: se un test manca, una parte della diagnostica resta scoperta. Il log di un gatekeeper reale riporta codici simili, quindi il modello mantiene la terminologia.

## Porte e raggiungibilità

Il modello non apre socket, ma il laboratorio si chiude con una verifica sull'ambiente reale: le porte della suite devono essere raggiungibili tra gli host in prova, e il controllo distingue un problema di codice da uno di rete.

```bash
# la segnalazione ascolta su TCP 1720
ss -lntp | grep 1720

# il primo pacchetto della segnalazione deve arrivare al chiamato
sudo tcpdump -ni any 'tcp port 1720 and tcp[tcpflags] & tcp-syn != 0'
```

Se il secondo comando non mostra pacchetti, la segnalazione non ha mai lasciato l'host: la causa è di routing o firewall. Se la SYN arriva e l'altra parte non risponde, il servizio non ascolta sulla 1720.

## Esercizi

1. Aggiungi la `LRQ`: se il chiamato non è in zona, simula una richiesta location e rispondi con `LCF` o `LRJ`.
2. Registra il tempo di ogni messaggio e verifica che il setup non superi i 500 ms simulati.
3. Salva il log in un file e confronta due sessioni con `diff` per individuare la differenza.
4. Estendi il modello con una fase `H245` che negoziata due codec e sceglie il primo comune.
5. Scrivi un test che verifichi che un endpoint espulso (`DRQ`) non possa più essere ammesso.
6. Cattura il traffico di una chiamata vera con `tcpdump` e confronta la sequenza con il log simulato.

<details>
<summary>Soluzione</summary>

1. `LRQ` restituisce una tupla con alias e endpoint reale; se l'alias manca si risponde `LRJ` con il motivo, così il chiamante distingue "non in zona" da "porta chiusa".

2. Il tempo si misura con `time.perf_counter()` e si aggiunge al log; il test confronta primo e ultimo messaggio, senza dipendere dal singolo passo.

3. `json.dump` del log su file e confronto con una seconda esecuzione: le differenze indicano un errore nel modello, non nella rete.

4. `H245` interseca i due insiemi con `set` e restituisce il primo codec nell'ordine del chiamante; se l'intersezione è vuota, la chiamata si chiude con un messaggio esplicito.

5. `registra` controlla una struttura con gli endpoint espulsi e rifiuta con `RRJ`; il test registra, espelle e riprova, verificando l'ordine dei messaggi.

6. `tcpdump -ni eth0 'tcp port 1720' -w vera.pcap` salva la sessione; in Wireshark i messaggi RAS e Q.931 seguono l'ordine della simulazione, e le porte dinamiche di H.245 spiegano le differenze.

</details>

## Errori comuni

- **Usare solo il caso felice nei test**: i ticket arrivano dagli scenari di errore.
- **Confondere l'alias con l'indirizzo IP**: l'alias è il nome logico dell'endpoint e il gatekeeper può risolverlo in un indirizzo diverso.
- **Leggere il log come sequenza certa**: senza timestamp non si distingue un ritardo di rete da un rifiuto immediato.
- **Modellare H.245 dentro la RAS**: sono fasi separate con canali diversi, e i nomi devono rifletterlo.
- **Ignorare la banda residua**: accettare senza detrarre falsa tutte le prove successive.

## In sintesi

Il laboratorio separa la logica H.323 dagli apparati: registrazione e ammissione diventano funzioni pure con un log leggibile. I tre scenari di errore coprono i rifiuti che contano, e la tabella dei messaggi attesi è il criterio di completamento. Il passo successivo è collegare il modello alla cattura reale.

## Fonti

- [Itu-t H.323 — Packet-based multimedia communications systems](https://www.itu.int/rec/T-REC-H.323/en)
- [Itu-t H.225.0 — Call signalling protocols and media stream packetization](https://www.itu.int/rec/T-REC-H.225)
- [Itu-t H.245 — Control protocol for multimedia communication](https://www.itu.int/rec/T-REC-H.245)
- [Rfc 3261 — Sip: Session Initiation Protocol](https://www.rfc-editor.org/rfc/rfc3261.html)
