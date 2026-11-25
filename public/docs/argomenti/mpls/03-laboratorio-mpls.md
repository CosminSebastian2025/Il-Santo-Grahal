In questo laboratorio costruisci `mpls-tool`, un simulatore minimale del piano di forwarding MPLS scritto in Python. Calcoli le etichette come una manciata di interi, monti una tabella di inoltro per tre router e segui un pacchetto dal client al server guardando push, swap e pop a ogni hop. Non serve un laboratorio di rete: quello che si impara qui è il conto che ogni router fa, e perché la diagnosi di un LSP si fa leggendo tabelle e non con un `ping` generico.

## Obiettivi

- Calcolare una pila di etichette e i quattro campi del shim header a 32 bit.
- Costruire una tabella di inoltro con in-etichetta, out-etichetta e operazione.
- Simulare un LSP a tre router, riconoscendo explicit null e implicit null.
- Derivare una lookup VPNv4 da RD e prefisso e distinguere RD da route target.
- Misurare l'effetto dell'MTU quando una pila di tunnel aggiunge etichette.

## Il contratto di `mpls-tool`

| Comando | Input | Output | Exit code |
| --- | --- | --- | --- |
| `etichetta LABEL` | valore decimale | i 32 bit del shim header e il byte in esadecimale | 0, 2 se LABEL è fuori da 0..1048575 |
| `pila N` | numero di etichette | pila con S=0 in tutte tranne l'ultima | 0, 2 oltre 255 livelli |
| `hop` | tabella e pacchetto | traccia hop per hop con operazione | 0, 1 se manca la riga |
| `rd A:B` | number e assigned | una stringa VPNv4 e la tabella di import | 0, 2 su formato invalido |

Il programma è deterministico: nessuna rete, nessun socket. Serve a costruire la tabella che poi confronterai con `show mpls forwarding-table` in un laboratorio vero, dove l'output ha le stesse informazioni ma in formato Cisco.

```bash
python mpls_tool.py etichetta 1000
python mpls_tool.py pila 3
printf '1,1000,2,2000,swap\n2,2000,3,no,pop\n' | python mpls_tool.py hop
python mpls_tool.py rd 65000:42
```

## Shim header e pila

Il shim header è 32 bit: label, traffic class, bit S e TTL. L'unica sottigliezza è nell'ordine dei bit, e copiarla sbagliando è l'errore che in un vero laboratorio produce pacchetti scartati con contatori che non spiegano nulla.

```python
def shim(label: int, tc: int = 0, s: int = 1, ttl: int = 64) -> bytes:
    if not 0 <= label < 2**20:
        raise ValueError("label fuori da 20 bit")
    valore = (label << 12) | (tc << 9) | (s << 8) | ttl
    return valore.to_bytes(4, "big")

def pila(labels: list[int], ttl: int = 64) -> bytes:
    # solo l'ultima etichetta ha S=1
    return b"".join(shim(l, s=(1 if i == len(labels) - 1 else 0), ttl=ttl)
                    for i, l in enumerate(labels))
```

L'etichetta 0 e l'etichetta 3 sono riservate e hanno un ruolo preciso. Zero è explicit null: il router la riceve e capisce che il pacchetto va instradato in IP, ma il byte è comunque presente; tre è implicit null, e il penultimo hop la sostituisce togliendo il shim header del tutto. Nel simulatore, se l'out-etichetta è `no`, l'hop fa pop e restituisce un pacchetto senza etichette.

## Una tabella e tre hop

La tabella di inoltro deve essere coerente: un router locale non sa che etichetta userà il vicino, quindi la riga contiene sia l'etichetta in ingresso sia quella da mettere in uscita. Se manca la riga per una certa in-etichetta, il pacchetto viene scartato: non esiste un percorso di default.

| Router | In-label | Interfaccia | Out-label | Operazione |
| --- | --- | --- | --- | --- |
| LER1 | nessuna (IP) | Gi0/1 | 1000 | push |
| P1 | 1000 | Gi0/2 | 2000 | swap |
| P2 | 2000 | Gi0/3 | nessuna | pop |

```python
def hop(tab: list[dict], router: int, label: int | None) -> tuple:
    for riga in tab:
        if riga["router"] != router:
            continue
        if riga["in"] == label:
            return riga["out"], riga["op"]
    raise LookupError(f"router {router}: etichetta {label} senza riga")
```

Il percorso del pacchetto è quindi `IP -> 1000 -> 2000 -> IP`. Le LER1 fa push (assegna la FEC), P1 fa swap (riscrive l'etichetta verso il vicino), P2 fa pop (consegna). Se P2 avesse annunciato explicit null, invece del pop ci sarebbe swap verso 0 e l'egress avrebbe la responsabilità del pop. Lo script deve stampare i due casi e accettarli entrambi: sono due implementazioni valide dello stesso LSP.

## RD, route target e lookup VPNv4

Nelle VPN L3 il prefisso del cliente è reso univoco con un route distinguisher da 8 byte, normalmente `ASN:assigned` o `IP:assigned`. Il PE non guarda il prefisso nudo, ma la coppia RD+prefisso, e il route target è un attributo extended community che decide in quali VRF importare la rotta.

```python
def vpnv4(rd: str, prefix: str) -> str:
    num, assegnato = rd.split(":")
    int(num); int(assegnato)
    return f"{num}:{assegnato}:{prefix}"   # forma didattica, non testo BGP
```

Il simulatore deve accorgersi del caso classico: due clienti con lo stesso `10.0.0.0/8` hanno VPNv4 distinte grazie a RD diversi, e una VRF importa solo le rotte il cui route target compare nella sua lista `import`. Scrivere un test con due clienti e lo stesso spazio privato è il modo più breve per capire perché esistono due campi distinti.

## Esercizi

1. Calcola la codifica di `shim(1000, tc=5, s=1, ttl=255)` e verifica a mano che i campi occupino i bit attesi.
2. Aggiungi a `hop` il supporto per l'etichetta 0 (explicit null) e mostra la differenza con il pop.
3. Simula un secondo LSP che usa una pila di due etichette e spiega quale S vale 1.
4. Scrivi un test con due VRF, entrambe con `10.0.0.0/8`, e stampa quali rotte importa ciascuna.
5. Calcola l'MTU: con MTU 1500 sull'interfaccia fisica, quale payload IP rimane con due etichette?
6. Spiega perché due VRF con lo stesso prefisso generano rotte VPNv4 diverse e perché l'RD da solo non basta a separare il traffico.

<details>
<summary>Soluzione</summary>

1. `1000 << 12` occupa i bit 12-31, `5 << 9` i bit 9-11, `1 << 8` il bit 8, `255` gli 8 bit bassi. Il valore decimale è `4099071`, e in esadecimale `0x3E8BFF`: il TTL resta il byte meno significativo.

2. Con explicit null la riga ha out 0 e operazione `swap`: il pacchetto prosegue ancora con il shim header (etichetta 0) e l'egress fa il pop. Con implicit null out è `no` e il pop avviene al penultimo hop: la differenza sta in chi fa il lavoro, e in entrambi i casi il payload è IP.

3. Nella pila `[3000, 2000]` vale 1 solo sul shim di 2000, quello più interno: in un tunnel MPLS il livello esterno trasporta quello interno, e l'S=1 sull'inner indica la fine dello stack.

4. Ogni VRF ha un route target: `65000:1` per il cliente A e `65000:2` per il cliente B. Il test verifica che la VRF A importi solo le rotte con target `65000:1`, anche quando i prefissi VPNv4 sono `65000:1:10.0.0.0/8` e `65000:2:10.0.0.0/8`.

5. Ogni etichetta consuma 4 byte: con due livelli il payload IP scende a `1500 - 8`, cioè 1492. Se il client non riduce l'MTU, il router scarta o frammenta, e su MPLS la frammentazione non è ammessa: il TCP path MTU discovery è l'unica difesa.

6. Le due rotte hanno lo stesso prefisso e RD diversi, quindi restano distinte nel BGP: l'RD serve a rendere univoco il nome. Ma è il route target a decidere l'importe nella VRF, quindi senza route target corretti il PE conosce la rotta e non la usa per il cliente sbagliato.

</details>

## Errori comuni

- **Scrivere il shim header con label e TTL invertiti**: i byte sono in ordine di rete e il TTL sta in fondo; invertirli produce pacchetti accettati dal parser ma scartati dal router.
- **Mettere S=1 su tutte le etichette della pila**: il router smette di leggere oltre la prima, e un tunnel sopra un trasporto VPN ha sempre bisogno dell'inner normale.
- **Considerare un'etichetta unica per tutti i router**: ogni router sceglie la sua, e una tabella con la stessa etichetta in ingresso e in uscita descrive un solo router, non un percorso.
- **Dare per scontato che il pop avvenga sull'egress**: con implicit null avviene sul penultimo hop, quindi il router dove si staccano le etichette non è quello di destinazione.
- **Ignorare l'MTU con due livelli di etichette**: 8 byte sono pochi per un ping, ma bastano a spezzare il TCP con PMTU discovery mal configurato.

## In sintesi

Il laboratorio riduce MPLS a tre oggetti: un header da 32 bit, una tabella per router e un percorso di operazioni. Gli hop mostrano perché push, swap e pop sono locali e perché la diagnosi si fa tabella per tabella. Explicit null e implicit null sono due convenzioni valide, non un errore. La VPNv4 aggiunge RD e route target, il tunnel aggiunge livelli di pila e riduce l'MTU: tutto il resto di MPLS è amministrazione di questi pezzi.

## Fonti

- RFC 3031 — Multiprotocol Label Switching Architecture: https://www.rfc-editor.org/rfc/rfc3031.html
- RFC 3032 — MPLS Label Stack Encoding: https://www.rfc-editor.org/rfc/rfc3032.html
- RFC 4364 — BGP/MPLS IP Virtual Private Networks (VPNs): https://www.rfc-editor.org/rfc/rfc4364.html
- RFC 5036 — LDP Specification: https://www.rfc-editor.org/rfc/rfc5036.html
- Cisco — Introduction to MPLS: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/mpls/mpls-configuration-guide/introduction-to-mpls.html
