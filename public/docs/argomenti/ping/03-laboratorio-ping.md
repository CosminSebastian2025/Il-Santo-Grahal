In questo laboratorio costruisci `ping-check`, uno script che esegue la procedura a strati delle lezioni precedenti, misura una serie di pacchetti per target, verifica l'MTU del percorso e restituisce un codice di uscita binario: 0 se tutti i target sono raggiungibili e il percorso regge, 1 in caso contrario. È uno strumento pensato per la pipeline, non per il terminale: output in una forma stabile e giudizio su soglie dichiarate.

## Obiettivi

- Tradurre la procedura a strati in una sequenza ordinata e verificabile.
- Invocare `ping` in modo non presidiato, con conteggi e timeout espliciti.
- Calcolare latenza media e perdita e confrontarle con soglie configurabili.
- Verificare l'MTU del percorso con Echo Request e flag DF.
- Rendere l'uscita leggibile da uno script e documentata nei suoi limiti.

## Il contratto di `ping-check`

| Elemento | Scelta | Motivazione |
| --- | --- | --- |
| forma | `ping-check [--target IP]...` | ordine di test esplicito |
| `--count N` | default 10 | serie sufficiente per perdita e media |
| `--interval S` | default 0.5 | limite al carico di rete |
| `--loss PCT` | default 20 | soglia oltre la quale il target fallisce |
| `--mtu N` | opzionale, default 1500 | payload massimo da provare |
| exit 0 | tutti i target sotto soglia | esito positivo |
| exit 1 | almeno un target oltre soglia | esito negativo |
| exit 2 | uso errato o binario `ping` assente | errore operativo |

La soglia di perdita è un parametro e non un valore magico. Un 20 per cento su due pacchetti vale poco; con dieci pacchetti diventa un segnale grossolano ma ripetibile. La scelta va scritta nell'output, così chi legge il risultato sa con quale regola è stato attribuito l'esito.

```bash
python ping_check.py --target 127.0.0.1 --target 192.168.1.1 --count 10
printf 'exit: %s\n' "$?"
```

## Misurare con ping

Lo script non inventa un client ICMP nuovo: usa iputils e ne interpreta il riepilogo. La pagina man documenta i numeri che servono: pacchetti trasmessi e ricevuti per la perdita, `rtt min/avg/max/mdev` per la latenza. Da qui derivano un dict per target e un verdetto booleano.

```python
import re
import subprocess

RIGA_STAT = re.compile(r"rtt min/avg/max/mdev = ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+) ms")

def misura(target: str, count: int, interval: float) -> dict:
    cmd = ["ping", "-c", str(count), "-i", str(interval), "-W", "1", "-n", target]
    esito = subprocess.run(cmd, capture_output=True, text=True, timeout=count * interval + 10)
    testo = esito.stdout + esito.stderr
    persi = re.search(r"(\d+)% packet loss", testo)
    stat = RIGA_STAT.search(testo)
    return {
        "target": target,
        "exit": esito.returncode,          # 0 risposta, 1 nessuna, 2 errore
        "loss": int(persi.group(1)) if persi else 100,
        "avg_ms": float(stat.group(2)) if stat else None,
        "mdev_ms": float(stat.group(4)) if stat else None,
    }
```

Il verdetto per target combina due condizioni e non una: deve esserci almeno una risposta e la perdita deve stare sotto soglia. Un target con risposta e perdita al 50 per cento ha exit 0 sul singolo comando ma non passa il controllo: è il caso tipico delle reti instabili, dove un singolo test è fuorviante e una serie dice il contrario.

```python
def sotto_soglia(r: dict, soglia: int) -> bool:
    if r["exit"] in (2,):            # errore operativo: non è un giudizio sulla rete
        return False
    return r["loss"] <= soglia and r["avg_ms"] is not None
```

## MTU, output e limiti

La verifica dell'MTU è un test di costruzione, non di misura: si invia payload con DF e si guarda se `ping` torna con successo. Il valore dei dati è l'MTU meno 28 byte per IPv4. Con `-M do`, un payload troppo grande produce un errore esplicito che contiene "too long" o "Frag needed" negli output più diffusi; va trattato come un esito negativo del controllo MTU, non come un timeout.

| Situazione | Conteggio | Perdita | MTU | Esito |
| --- | --- | --- | --- | --- |
| rete sana | 10 | 0 | 1500 | 0 |
| singola perdita | 10 | 10 | 1500 | 0 se soglia 20 |
| router che filtra Echo | 10 | 100 | n/d | 1 |
| firewall che blocca solo DF | 10 | 0 | errore | 1 sul controllo MTU |
| `ping` assente | - | - | - | 2 |

```bash
# Il controllo MTU riusa la stessa funzione, con payload e DF
ping -c 1 -M do -s 1472 192.168.1.1   # se fallisce con "too long", MTU < 1500
```

L'output va pensato prima della diagnosi: una riga per target con lo stato, e un blocco finale che ripete le soglie usate. Le limitazioni sono le stesse della lezione precedente, e vanno scritte nell'output: un target che filtra ICMP fallisce anche se il servizio è attivo; un router che deprioritizza Echo può mostrare perdita dove il TCP è sano; l'MTU misurato è quello del percorso verso quel target, non di tutta la rete.

## Esercizi

1. Aggiungi `--json` e rendi stabile l'ordine dei campi per il consumo da parte di altri strumenti.
2. Aggiungi una soglia `--max-rtt` in millisecondi e spiega perché non va confusa con la perdita.
3. Rileva e segnala la risoluzione inversa: stampa il nome ottenuto e spiega perché `-n` è più adatto a una pipeline.
4. Aggiungi un controllo DNS separato: un target con nome e uno con IP devono distinguere i due fallimenti.
5. Su Windows, usa `/n` e `/l` al posto di `-c` e `-s`: quali parti dello script deve cambiare e perché.
6. Estendi il controllo MTU con una ricerca a bisezione tra 1200 e 1500 e stampa il valore trovato.

<details>
<summary>Soluzione</summary>

1. Costruisci un `dict` con i campi nell'ordine documentato e serializza con `json.dumps(..., ensure_ascii=False)`. Gli altri campi vanno aggiunti in coda, così le versioni precedenti restano leggibili.

2. `--max-rtt` controlla la latenza, `--loss` la raggiungibilità: un link con RTT altissimo per code può arrivare a destinazione senza perdita. Le due condizioni sono indipendenti e vanno riportate separate nell'output.

3. La risoluzione inversa si legge dalla riga `PING nome (ip)` o dal testo per-pacchetto; con `-n` si evita la query PTR e l'output diventa deterministico, quindi adatto ai confronti.

4. Esegui `ping -c 1 nome` e `ping -c 1 ip`: se il primo fallisce e il secondo no, il problema è di risoluzione. Il secondo target può anche essere ricavato con `getent hosts` o `Resolve-DnsName`.

5. Su Windows l'uscita del riepilogo ha un formato diverso e la regex va cambiata; `/w` è in millisecondi, non in secondi, e il timeout predefinito è 4000 ms. Conviene un adattatore che produca lo stesso `dict`.

6. Parti da 1200, che in IPv6 è il minimo garantito, e prova il valore medio della finestra: quando l'invio riesce, il limite inferiore sale a quel valore; quando fallisce, il superiore scende. Con dieci prove si arriva al byte.

</details>

## Errori comuni

- **Interpretare exit 2 come rete irraggiungibile**: è un errore operativo, quindi il verdetto deve dire "non misurato" e non "non raggiungibile".
- **Confondere il timeout di `ping` e quello del processo**: il primo è un dato che lo script legge, il secondo va alzato perché la serie di pacchetti finisca.
- **Legare l'esito dell'MTU alla perdita**: il controllo MTU è un test separato e va riportato a parte.
- **Eseguire il controllo con intervalli troppo bassi**: si aggiunge carico e si falsano sia la perdita sia la latenza.
- **Non documentare le soglie stampate**: senza le soglie il risultato non è riproducibile e non regge un confronto tra esecuzioni.

## In sintesi

`ping-check` trasforma una sequenza manuale in un contratto: target nell'ordine giusto, serie con conteggio e intervallo espliciti, perdita e latenza confrontate con soglie dichiarate, codice di uscita binario e un caso dedicato agli errori operativi. Il controllo MTU riusa lo stesso strumento con DF. Il passo successivo è estendere la serie a `pathping` o `mtr` per attribuire la perdita a un hop, mantenendo lo stesso formato di output.

## Fonti

- [man 8 ping (iputils)](https://man7.org/linux/man-pages/man8/ping.8.html)
- [ping - Windows Server command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping)
- [RFC 1191 - Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc1191)
- [pathping - Windows Server command reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/pathping)
