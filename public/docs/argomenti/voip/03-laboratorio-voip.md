In questo laboratorio costruisci `voip-check`, uno strumento che prende un flusso RTP simulato, lo salva come pacchetti e ne calcola le stesse statistiche che un telefono userebbe per decidere la qualità: continuità della sequenza, jitter, buchi e perdita. Non serve un PBX, un registro o un numero: bastano Python, Wireshark e molta disciplina nel seguire le specifiche. Alla fine saprai leggere un flusso RTP dal punto di vista del ricevente, che è quasi sempre il punto di vista che conta.

## Obiettivi

- Costruire e leggere intestazioni RTP conformi a RFC 3550.
- Simulare un mittente con intervalli perturbati per generare jitter misurabile.
- Calcolare jitter e perdita come li calcola un ricevente reale.
- Verificare il flusso con `tshark -z rtp,streams` e confrontare i due risultati.
- Aggiungere un evento DTMF come in RFC 4733 e controllarne la ricostruzione.

## Il contratto di `voip-check`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `voip-check capture.pcapng` | legge una cattura, non la rete |
| uscita | tabella di flussi per SSRC | un file può contenere più chiamate |
| `--clock` | Hertz, default 8000 | serve per passare ai millisecondi |
| `--window` | pacchetti per la stima | piccola finestra reagisce velocemente |
| exit 0 | analisi completata | anche con perdita del 90% |
| exit 1 | file illeggibile o formato errato | errore operativo |

Il formato di lavoro è una cattura RTP reale salvata con `dumpcap`, così il laboratorio usa le stesse interfacce che useresti in azienda.

```bash
# Genera un flusso G.711 sul loopback e catturalo in parallelo.
# Il mittente esce da solo dopo un secondo di audio; la cattura si chiude con Ctrl+C.
ffmpeg -f lavfi -i "sine=frequency=1000:sample_rate=8000:duration=1" \
       -c:a pcm_mulaw -ar 8000 -ac 1 -f rtp rtp://127.0.0.1:41000 &
dumpcap -i lo -f "udp port 41000" -w capture.pcapng -q

# Lettura con tshark: porte, SSRC, pacchetti, perdita e jitter per flusso
tshark -r capture.pcapng -q -z rtp,streams
```

## Core: intestazioni e sequenza

Il ricevente non conosce i ritardi reali del mittente, solo i timestamp RTP e l'ordine di arrivo. La sequenza a 16 bit avanza di uno e va confrontata con aritmetica modulo 65536, altrimenti un pacchetto dopo il riavvio sembra arrivato prima.

```python
import struct

# Intestazione RTP fissa di 12 byte: V=2, P=0, X=0, CC=0, M, PT
# sequenza a 16 bit, timestamp a 32, SSRC a 32
def parse(pacchetto: bytes) -> dict:
    v_flags, pt, seq, ts, ssrc = struct.unpack("!BBHII", pacchetto[:12])
    return {"ver": v_flags >> 6, "pt": pt & 0x7F, "m": bool(pt & 0x80),
            "seq": seq, "ts": ts, "ssrc": ssrc, "payload": pacchetto[12:]}

def differenza_seq(a: int, b: int) -> int:
    # differenza a 16 bit con segno, robusta al wrap-around
    return ((a - b + 32768) % 65536) - 32768
```

La perdita segue la sequenza estesa: se `seq` salta di due, manca un pacchetto. I ritardi fuori ordine non vanno contati come perdita finché restano dentro la finestra di riordino, perché la rete può consegnarli invertiti.

```text
Flusso SSRC=0x1a2b3c4d, PT=0, 8.000 Hz, 50 pacchetti/s
  pacchetti ricevuti:   1.240
  attesi per seq:       1.243
  persi (stimati):      3   (0,24%)
  fuori ordine:         1
  jitter (media):       0,9 ms
  pausa massima:        620 ms   <-- campanello di allarme
```

Il numero di pacchetti attesi si ricava dal primo e dall'ultimo numero di sequenza, non dal conteggio ricevuto: i pacchetti persi non esistono nel file, quindi il denominatore va ricostruito. Una pausa di 620 ms, come nell'esempio, può essere perdita a raffica o silenzio reale: senza VAD e senza contatori non si distingue, ed è per questo che la soppressione del silenzio va documentata come scelta di servizio.

## Jitter, buffer e ricostruzione della voce

Il jitter di RFC 3550 è una media esponenziale della differenza `D` tra spaziatura osservata e spaziatura del mittente. La formula standard usa un guadagno di `1/16`, compromesso tra reattività e rumore; il parametro `--window` del laboratorio serve proprio a raccontare cosa cambia quando il guadagno non è più quello della specifica.

```python
def jitter(flusso, clock=8000):
    j = 0.0
    prev = None
    for s in flusso:
        if prev:
            # D in unità di timestamp: spaziatura osservata meno quella dichiarata
            d = int((s["arrivo"] - prev["arrivo"]) * clock) - (s["ts"] - prev["ts"])
            j += (abs(d) - j) / 16
        prev = s
        yield j
```

```bash
# Stats per flusso (porte, SSRC, pacchetti, persi, jitter) e note gestite dal dissector
tshark -r capture.pcapng -q -z rtp,streams -z expert
```

```text
Esempio di -z rtp,streams con due flussi nella stessa cattura:
  Src IP addr  Port  Dest IP addr  Port  SSRC          Payload  Pkts  Lost  Max Delta(ms)  Max Jitter(ms)
  192.0.2.10   41000 127.0.0.1    41002 0x1A2B3C4D    ITU-T G.711 P 50   0     32,1           1,4
  192.0.2.10   42000 127.0.0.1    42002 0x5E6F7A8B    ITU-T G.711 P 50   2     80,0           9,7
```

Se i due risultati divergono di più del 10%, quasi sempre è la scala: `tshark` esprime il jitter in millisecondi solo per i payload che dichiarano un clock rate noto, altrimenti in unità di timestamp. La conversione si fa con `ms = unita / clock * 1000`.

## DTMF e pacchetti speciali

Un tasto premuto viaggia come evento RFC 4733, non come due frequenze. Il primo pacchetto di un evento ha il bit `M` impostato, gli altri ripetono lo stesso evento con durata crescente, e gli eventi si indicano `0-11` per le cifre e `*`, `#`, `A-D` da 12 a 15. Molti dispositivi trasmettono una copia finale per tolleranza alla perdita.

```python
# Evento DTMF secondo RFC 4733: id 0-15, volume, durata in campioni
def evento_dtmf(codice: int, durata_ms: int, clock: int = 8000) -> bytes:
    durata = int(durata_ms * clock / 1000)
    return bytes([codice, 0x0A]) + durata.to_bytes(2, "big")
```

Un laboratorio completo verifica anche il ritorno: il ricevente deve interpretare `#` come codice 11 e non come due toni, e un evento interrotto da due pacchetti persi non deve diventare una cifra diversa.

## Esercizi

1. Estendi `voip-check` per elaborare più SSRC nello stesso file e separare le chiamate.
2. Fai parlare due mittenti sulla stessa porta e verifica che gli SSRC restino distinti.
3. Calcola il jitter con finestra `1/2` e `1/32`: quale si avvicina al valore di `tshark`?
4. Aggiungi la ricostruzione della forma d'onda G.711 e confrontala con quella del segnale sinusoidale di partenza.
5. Simula la perdita del 5% eliminando pacchetti casuali e verifica il conteggio della sequenza.
6. Inietta un evento DTMF e verifica che `tshark` lo riconosca come `telephone-event`.

<details>
<summary>Soluzione</summary>

1. Si tiene un dizionario `ssrc -> lista` e si ordina per istante di arrivo; ogni SSRC ha la sua numerazione e il suo clock, quindi le statistiche vanno fatte in parallelo, non mescolate.

2. Due mittenti possono condividere la porta UDP di destinazione; il distacco sta solo nel campo SSRC, che va letto prima della decodifica del payload. Se gli SSRC sono uguali, il ricevente deve trattare la collisione come errore, come segnala RFC 3550.

3. Con `1/16` la stima è liscia e vicina al valore medio di `tshark`; `1/2` segue troppo le singole variazioni e `1/32` è lenta. La differenza non è un errore, è la costante di tempo.

4. G.711 si decodifica byte per byte con la tabella u-law; il segnale ricostruito ha la stessa frequenza ma una risoluzione di 8 bit logaritmici, quindi va confrontato per forma, non per campione.

5. Si numerano i pacchetti prima dell'eliminazione, si scartano a caso 5 su 100 e si confronta `attesi` con `ricevuti`: il conteggio corrisponde ai soli buchi, i ritardi tardivi restano fuori.

6. L'evento va incapsulato in RTP con PT dinamico negoziato e in seguito indicato in SDP come `telephone-event/8000`; `tshark` lo mostra sotto il dissector RTP con il codice evento e la durata.

</details>

## Errori comuni

- **Calcolare la perdita dal numero di pacchetti ricevuti**: il denominatore corretto è la sequenza estesa, altrimenti ogni buco sposta la percentuale.
- **Usare l'orologio del sistema per misurare il jitter**: va bene per l'arrivo, non per la scala del timestamp RTP.
- **Trattare il bit `M` come "ultimo pacchetto"**: in RTP segna un confine di frame, e il significato dipende dal payload.
- **Decodificare G.711 come se fosse lineare**: u-law e A-law sono logaritmici e vanno convertiti con la tabella giusta.
- **Confondere perdita e riordino**: un pacchetto in ritardo dentro la finestra non è perduto e non deve innescare una sostituzione.

## In sintesi

Il ricevente è il giudice: sequenza, timestamp e ritmo d'arrivo bastano a stimare perdita e jitter, e il confronto con `tshark` è il controllo incrociato che separa un errore del codice da un problema di scala. Il laboratorio di questo modulo non simula una centrale ma la parte più difficile da misurare, quella in cui la voce diventa numeri e i numeri diventano una decisione sul buffer.

## Fonti

- [RFC 3550 - RTP e RTCP: intestazioni e jitter](https://www.rfc-editor.org/rfc/rfc3550.txt)
- [RFC 3551 - Profilo audio: PCMU, PCMA e clock rate](https://www.rfc-editor.org/rfc/rfc3551.txt)
- [RFC 4733 - Eventi DTMF e toni in RTP](https://www.rfc-editor.org/rfc/rfc4733.txt)
- [Wireshark - man page di tshark](https://www.wireshark.org/docs/man-pages/tshark.html)
- [Wireshark - man page di dumpcap](https://www.wireshark.org/docs/man-pages/dumpcap.html)
