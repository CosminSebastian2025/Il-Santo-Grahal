Il jitter buffer è il pezzo che trasforma una rete incerta in una voce fluida. Riceve pacchetti RTP che arrivano con ritardo variabile, li riordina, ne misura il tempo con il timestamp e li restituisce al decoder a intervalli regolari. In questo laboratorio scrivi un jitter buffer minimo in Python, lo metti alla prova con una rete simulata e leggi i report RTCP come farebbe un telefono. Alla fine saprai spiegare perché un buffer troppo piccolo produce buchi e uno troppo grande produce ritardo.

## Obiettivi

- Stimare il jitter con lo stimatore ricorsivo di RFC 3550.
- Costruire un jitter buffer che riordina e nasconde la perdita.
- Misurare latenza aggiunta, buchi e pacchetti scartati.
- Generare un receiver report RTCP coerente con le statistiche raccolte.
- Distinguere un guasto di rete da un guasto di buffer guardando i numeri.

## Scenario e simulazione

Il laboratorio usa tre script: un generatore che emette pacchetti RTP ogni 20 ms, un canale che applica ritardo, jitter e perdita, e un ricevitore che scrive in un file di log quello che accade. La cattura di riferimento è un flusso G.711 con clock 8000 Hz, quindi il timestamp avanza di 160 unità per pacchetto.

```bash
# Genera 60 secondi di "voce" a 20 ms per pacchetto
python genera.py --durata 60 --clock 8000 --pt 0 --out rtp.csv
# Applica un canale con 80 ms di ritardo, jitter 30 ms e perdita 1%
python canale.py --in rtp.csv --jitter-ms 30 --lost 0.01 --out rete.csv
```

```python
import csv, random

def canale(righe, jitter_ms=30, lost=0.01, base_ms=80):
    out = []
    for r in righe:
        if random.random() < lost:
            continue                           # il pacchetto si perde in rete
        arrivo = float(r["tempo_invio"]) + base_ms + random.uniform(0, jitter_ms)
        out.append({"seq": int(r["seq"]), "ts": int(r["ts"]), "arrivo": arrivo})
    return out
```

Il canale non riordina in modo esplicito: il ritardo casuale aggiunto a ogni pacchetto è sufficiente a far scambiare due pacchetti consecutivi quando la differenza supera i 20 ms, un effetto che il buffer deve assorbire senza rimescolare l'ordine una seconda volta.

## Buffer, ordine e jitter

Il buffer tiene i pacchetti in una mappa per sequenza, con un indice di "prossimo atteso". Quando un pacchetto arriva in anticipo rispetto al tempo di consegna viene tenuto; quando arriva in ritardo rispetto all'istante in cui il pacchetto successivo è già stato restituito, viene scartato come late. Il tempo di uscita si calcola dal timestamp, non dall'arrivo.

```python
class JitterBuffer:
    def __init__(self, clock, ptime_ms, target_ms):
        self.clock, self.ptime = clock, ptime_ms
        self.target = int(target_ms * clock / 1000)   # unità di timestamp
        self.coda = {}
        self.base_ts = None

    def ricevi(self, seq, ts, ora_ms):
        if self.base_ts is None:
            self.base_ts = ts
        self.coda[seq] = (ts, ora_ms)

    def estrai(self, seq_atteso, ora_ms):
        if seq_atteso not in self.coda:
            self.buchi += 1                          # nessun pacchetto: buco
            return None
        ts, arrivo = self.coda.pop(seq_atteso)
        if (ts - self.base_ts) < self.target:
            self.buchi += 1                          # non ancora maturo: attesa
            self.coda[seq_atteso] = (ts, arrivo)
            return None
        return ts
```

Il target di 40 ms assorbe un jitter di 30 ms ma non il riordino oltre 20 ms; l'esercizio 1 mostra l'effetto di target sbagliati. Un buffer adattivo aumenta il target quando i buchi crescono e lo riduce lentamente quando il canale si stabilizza, sempre con isteresi per evitare oscillazioni.

```python
def jitter_rfc3550(prev_j, r_prev, s_prev, r_cur, s_cur, clock):
    d = ((r_cur - r_prev) - (s_cur - s_prev)) & 0xFFFFFFFF
    d = d - 0x100000000 if d >= 0x80000000 else d     # differenza in complemento a 32
    return prev_j + (abs(d) / clock * 1000 - prev_j) / 16
```

Il jitter stimato così è espresso in millisecondi: converti le differenze dalla stessa unità del clock prima di applicare il filtro, altrimenti il valore va confrontato con un target in unità diverse e ogni confronto è falso.

## Esercizi

1. Cambia `target_ms` a 20, 40, 80 e 200 sullo stesso canale: registra buchi, pacchetti late e latenza media di consegna.
2. Rendi il target adattivo: cresce di 20 ms se i buchi in una finestra di 5 secondi superano l'1%, cala di 10 ms ogni 30 secondi senza buchi.
3. Aggiungi la ricostruzione per perdita nascosta: al posto del pacchetto mancante emetti silenzio e marca il buco nel log, confrontando le due strategie con il codec.
4. Produci un receiver report RTCP con fraction lost, cumulative lost, extended highest sequence number e jitter dell'ultimo intervallo, e verifica che i contatori siano cumulativi.
5. Cambia il canale per inserire un burst di perdita di 15 pacchetti consecutivi: come si comporta il buffer e che cosa serve per non udire glitch?
6. Calcola LSR e DLSR simulando un sender report ogni 5 secondi e stima l'RTT con la formula A meno LSR meno DLSR.

<details>
<summary>Soluzione</summary>

1. Un target di 20 ms genera buchi a ogni pacchetto che arriva oltre il budget, un target di 200 ms non genera buchi ma aggiunge due pacchetti di ritardo percepibile; il compromesso è tra il jitter reale del canale e il ritardo che l'utente accetta, tipicamente sotto i 150 ms una via complessivi.

2. Il target adattivo si implementa con due contatori: una finestra scorrevole di esiti (emesso, buco, late) e una macchina a stati con intervallo minimo in cui il target non cambia. L'isteresi evita il ping-pong tra 40 e 60 ms a ogni fluttuazione del canale.

3. Il silenzio maschera peggio una perdita di voce rispetto alla ripetizione dell'ultimo pacchetto, ma è l'unica scelta neutra rispetto al codec; la strategia va confrontata sulla stessa cattura con un ascolto e con il valore di MOS dell'analizzatore.

4. Il report accumula nella sessione `pacchetti_ricevuti` e `pacchetti_attesi`; la frazione di intervallo è `(attesi-intervallo - ricevuti-intervallo) / attesi-intervallo` in un byte, il cumulativo intero in 24 bit, il jitter è la stima dell'intervallo e l'extended highest è il numero di ciclo (16 bit in alto) più la sequenza massima. I due report successivi devono contenere totali crescenti, non variazioni.

5. Quindici pacchetti corrispondono a 300 ms: oltre qualunque target ragionevole il buffer produce un buco di 300 ms e un reset del tempo; per non udirlo servono la ripetizione dell'ultimo frame o il PLC del codec, e il report RTCP mostra il burst come uno scarto tra cumulative e fraction.

6. LSR contiene i 32 bit centrali dell'NTP dell'ultimo SR ricevuto, DLSR il tempo trascorso in unità di 1/65536 di secondo; un report ricevuto con A uguale alla somma di LSR e DLSR indica RTT zero, una differenza negativa indica tempi presi da clock diversi.

</details>

## Errori comuni

- **Usare il tempo di arrivo come tempo di consegna**: l'uscita deve seguire i timestamp del flusso, altrimenti il ritardo jitter non viene mai compensato.
- **Inizializzare il jitter a zero e applicare subito il filtro**: il primo valore è dominato da un singolo campione; una media iniziale su alcuni pacchetti evita di sottodimensionare il buffer.
- **Confrontare jitter in unità del clock con un target in millisecondi**: è il bug più diffuso degli implementatori, e passa inosservato su 8000 Hz per alcune impostazioni.
- **Ripetere l'ultimo pacchetto per ogni buco senza limite**: i buchi lunghi diventano un suono continuo e artificioso, meglio un tempo massimo dopo il quale emettere silenzio.
- **Vedere male una chiamata e alzare subito il target**: il buffer più grande non risolve la perdita, se la perdita è alta servono FEC o PLC, e serve guardare i report prima di intervenire.

## In sintesi

Il jitter buffer è la traduzione del jitter di rete in ordine e regolarità locale. Misura con lo stimatore di RFC 3550, riordina per sequenza, consegna per timestamp e accetta il trade-off tra latenza e buchi. Gli esercizi mostrano che il target non è un numero magico ma una funzione del canale, e che i report RTCP sono il linguaggio con cui difendersi.

## Fonti

- [RTP: A Transport Protocol for Real-Time Applications — RFC 3550, sezione 6.4](https://www.rfc-editor.org/rfc/rfc3550.html)
- [RTP Profile for Audio and Video Conferences — RFC 3551](https://www.rfc-editor.org/rfc/rfc3551.html)
- [The Secure Real-time Transport Protocol (SRTP) — RFC 3711](https://www.rfc-editor.org/rfc/rfc3711.html)
- [RTP Payload for DTMF Digits, Telephony Tones and Telephony Signals — RFC 4733](https://www.rfc-editor.org/rfc/rfc4733.html)
- [Wireshark User's Guide — analisi di flussi RTP e RTCP](https://www.wireshark.org/docs/)
