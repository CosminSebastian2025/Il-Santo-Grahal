In questo laboratorio metti in mano le due parti di ATM che si possono toccare senza hardware speciale: il calcolo della cella e il percorso di una connessione virtuale. Scrivi `atm-tool`, un piccolo programma Python in standard library che spezza un pacchetto in celle, ricostruisce l'overhead e simula la commutazione di PVC e VPI/VCI. Il programma non parla con un apparato ATM: è un modello didattico dei conti che ATM fa, e serve a fissare i concetti prima di affrontare la configurazione di un router.

## Obiettivi

- Calcolare il numero di celle AAL5 di un pacchetto e l'overhead reale a livello di cella.
- Costruire un'intestazione ATM da 5 byte con VPI, VCI, PT e CLP e validarla sui limiti.
- Simulare lo switching locale di VPI/VCI tra due interfacce contigue.
- Distinguere un PVC configurato staticamente da un SVC in cui il circuito nasce a richiesta.
- Misurare quanto pesa la cella su pacchetti piccoli tipici di voce e telemetria.

## Il contratto di `atm-tool`

| Comando | Input | Output | Exit code |
| --- | --- | --- | --- |
| `celle LUNGA` | lunghezza del pacchetto in byte | numero di celle, payload utile, overhead | 0 |
| `header VPI VCI` | identificatori numerici | una riga con i 5 byte in esadecimale | 0, 2 se fuori intervallo |
| `switch` | tabella da stdin | porta e nuovo VPI/VCI per ogni cella | 0, 1 su VPI/VCI senza rotta |
| `profilo CLASS` | classe di servizio | parametri attesi e scheda del contratto | 0, 2 su classe ignota |

Il programma lavora su valori fittizi: nessuna connessione, nessuna configurazione reale, nessun apparato Cisco. L'obiettivo è il conto, non l'emulazione: quando un esercizio dice "cella di voce", assume payload di 20 byte del pacchetto IP, e l'output deve mostrare perché ATM considera una cella più parlante di un pacchetto.

```bash
python atm_tool.py celle 1500
python atm_tool.py header 0 32
printf '0/32 1/17 2 1/40\n' | python atm_tool.py switch
python atm_tool.py profilo cbr
```

## Celle, HEC e AAL5

Per AAL5 il payload dell'utente viene completato con padding fino a un multiplo di 48 byte, poi l'ultima cella porta 8 byte di trailer (lunghezza e checksum). Il numero di celle è quindi il minimo intero che copre payload, padding e trailer.

```python
def celle_aal5(n: int) -> dict:
    """Celle, payload utile e overhead per un pacchetto di n byte."""
    totale = n + 8                    # trailer AAL5: lunghezza + checksum
    celle = (totale + 47) // 48       # ceil(totale / 48)
    utile = celle * 48 - 8            # padding escluso
    return {"celle": celle, "utile": utile,
            "overhead": celle * 5 + (utile - n)}
```

L'HEC copre i primi 32 bit dell'intestazione con il polinomio x^8 + x^2 + x + 1 e serve sia a scoprire gli errori sia a ritrovare i confini delle celle. Nel modello basta calcolarlo su quei 32 bit e rifiutare un HEC fuori posto; nel reale un allineamento perso è quello che produce un `show interfaces` con HEC in crescita.

```python
def intestazione(vpi: int, vci: int, pt: int = 0, clp: int = 0) -> bytes:
    if not 0 <= vpi <= 255 or not 0 <= vci <= 65535:
        raise ValueError("VPI/VCI fuori intervallo")
    if not 0 <= pt <= 7 or clp not in (0, 1):
        raise ValueError("PT o CLP fuori intervallo")
    return bytes([vpi, vci >> 8, vci & 0xFF, (pt << 1) | clp, 0])
```

## Commutazione locale e tabelle

Lo switch non guarda l'indirizzo IP: guarda la coppia VPI/VCI e la riscrive verso la porta di uscita. La coppia è locale alla porta, quindi lo stesso valore può esistere su porte diverse e la tabella ha una riga per porta in ingresso, non per destinazione remota.

| Porta | VPI/VCI ingresso | Porta uscita | VPI/VCI uscita |
| --- | --- | --- | --- |
| 1 | 0/32 | 2 | 1/40 |
| 1 | 0/33 | 3 | 0/32 |
| 2 | 1/40 | 1 | 0/32 |

Da questa tabella un pacchetto che entra sulla porta 1 con 0/32 esce su 2 come 1/40: è l'equivalente ATM di un tag VLAN. La riga 0/33 esce su 3 con un altro 0/32 senza conflitto, perché il valore è nuovo sulla porta di uscita. Il simulatore deve segnalare una rotta mancante, non inventare una porta di default: ATM non ha forwarding best effort.

```python
def commuta(tab: dict, porta: int, vpi: int, vci: int) -> tuple:
    riga = tab.get((porta, vpi, vci))
    if riga is None:
        raise LookupError("nessuna voce: il circuito non esiste")
    uscita, nuovo_vpi, nuovo_vci = riga
    return uscita, nuovo_vpi, nuovo_vci
```

## PVC, SVC e criterio di uscita

Il PVC è una riga della tabella scritta a mano; l'SVC è una riga che appare dopo un segnale di setup e sparisce dopo il rilascio. Basta un'opzione `--svc` che accetta una richiesta e pretenda che il circuito esista prima di qualsiasi cella: è la stessa differenza che in MPLS separa un LSP statico da uno segnalato.

Il criterio di accettazione è verificabile in un minuto: `celle 1500` deve restituire 32 celle e circa 160 byte di overhead; `celle 20` deve mostrare che la cella di voce usa meno della metà del payload; `header 0 70000` deve uscire con 2; `switch` senza riga per la coppia in ingresso deve uscire con 1 e scrivere una sola riga di errore su stderr. Se uno di questi quattro casi non regge, il modello sta semplificando troppo il protocollo.

## Esercizi

1. Calcola l'overhead percentuale per pacchetti da 20, 64, 576 e 1500 byte e spiega perché la voce è il peggior nemico della cella.
2. Aggiungi un comando `header` con `--nni` che valida il VPI a 12 bit e testa i limiti.
3. Simula una congestione: coda di N celle, contratto CBR con PCR fisso, scarto prioritario delle celle con CLP 1.
4. Scrivi un test che verifica la monotonia del numero di celle al crescere della lunghezza.
5. Estendi `switch` con un secondo hop per mostrare dove una cella non può proseguire.
6. Spiega in un paragrafo perché il padding AAL5 rende il conto delle celle poco intuitivo.

<details>
<summary>Soluzione</summary>

1. Con trailer di 8 byte e celle da 48: 20 byte danno 1 cella e 60 byte di overhead, più del payload stesso; 64 danno 2 celle, 576 ne danno 13, 1500 ne danno 32. La percentuale di overhead scende all'aumentare del payload, per questo la voce compressa a pochi byte esalta il costo della cella.

2. Sulla UNI il GFC occupa 4 bit e il VPI 8; sulla NNI il VPI occupa 12 bit. Con `--nni` il comando deve accettare fino a 4095 e rifiutare 4096 con exit 2, senza l'opzione accetta fino a 255.

3. Il policer usa un token bucket con capacità MBS e ricarica a PCR: se il bucket è vuoto le celle con CLP 1 si scartano, le altre si accodano fino a un limite. Con input costantemente sopra SCR il contatore di scarti deve crescere e le celle CLP 0 devono arrivare in proporzione maggiore.

4. Il test confronta `celle_aal5(n)` con `celle_aal5(n+1)` e verifica che la differenza sia 0 o 1 e che l'utile cresca di un byte solo quando n è già multiplo di 48.

5. La tabella a due hop ha due righe per la porta intermedia; una cella che arriva su una porta senza la coppia attesa deve produrre un errore esplicito, come uno switch reale scarta una cella con VPI/VCI non riconosciuto.

6. Il padding dipende dal residuo modulo 48, quindi il numero di celle non è proporzionale alla lunghezza; Ethernet incapsula direttamente il frame, con overhead fisso per trama, senza riempimento per allinearsi alle celle.

</details>

## Errori comuni

- **Contare le celle come lunghezza diviso 48 arrotondata per difetto**: il trailer AAL5 aggiunge 8 byte e il padding è per eccesso; il conto corretto è sul totale, non sul payload.
- **Trattare VPI/VCI come indirizzo di destinazione**: sono identificatori locali per porta, e una tabella costruita come una tabella di routing non descrive uno switch ATM.
- **Dare una porta di default quando manca la rotta**: in ATM una cella senza voce viene scartata, e simulare un default nasconde un errore di configurazione che nella realtà spegne il circuito.
- **Confondere HEC con un CRC del payload**: l'HEC copre la sola intestazione e serve anche alla sincronizzazione; non protegge i 48 byte di dati.
- **Validare solo i casi felici**: limiti di VPI, di VCI e di PT sono quelli su cui la configurazione fallisce in laboratorio e in produzione.

## In sintesi

Il laboratorio trasforma ATM in tre conti verificabili: celle, intestazione e tabelle di commutazione. La cella è piccola per la voce, non per l'efficienza, e il padding AAL5 rende il conto meno intuitivo di quanto sembri. Lo switch ATM è una tabella locale per porta, non un router. Il passaggio a MPLS diventa così naturale: cambia l'incapsulamento e il protocollo che distribuisce le etichette, non l'idea di commutare su un identificatore locale.

## Fonti

- ITU-T I.150 — B-ISDN asynchronous transfer mode functional characteristics: https://www.itu.int/rec/T-REC-I.150/en
- ITU-T I.361 — B-ISDN ATM layer specification: https://www.itu.int/rec/T-REC-I.361/en
- ITU-T I.363.5 — B-ISDN ATM Adaptation Layer specification: Type 5 AAL: https://www.itu.int/rec/T-REC-I.363.5/en
- RFC 2684 — Multiprotocol Encapsulation over ATM Adaptation Layer 5: https://www.rfc-editor.org/rfc/rfc2684.html
