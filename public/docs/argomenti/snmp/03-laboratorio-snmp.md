In questo laboratorio monti un ricevitore di trap con `snmptrapd`, un agente con `snmpd` sulla stessa macchina e uno script Python che interroga i contatori. Il risultato è un percorso completo: un evento simulato diventa una trap, la trap diventa una riga nel log, e un piccolo poller calcola il tasso di traffico. Tutto in locale, senza dispositivi di rete, con Net-SNMP installato.

## Obiettivi

- Costruire agenti e ricevitori con `snmpd` e `snmptrapd` e verificare le porte UDP.
- Inviare una trap con `snmptrap` e leggerla nel ricevitore.
- Scegliere un utente SNMPv3 per le notifiche invece della community.
- Interrogare OID da Python con `pysnmp` e gestire i timeout.
- Calcolare un tasso e ignorare i campioni non validi.

## Il contratto del laboratorio

| Componente | Ruolo | Porta / file |
| --- | --- | --- |
| `snmpd` | agente locale, espone `mib-2` | UDP 161 |
| `snmptrapd` | ricevitore di notifiche | UDP 162 |
| `snmptrap` | mittente di notifiche di prova | verso 162 |
| `snmpd.conf` | community, utenti, vista | `/etc/snmp/` |
| `snmptrapd.conf` | authUser, utenti accettati | `/etc/snmp/` |

```bash
snmpd -v                               # versione e percorsi compilati
sudo snmpd -H 2>&1 | head -20          # opzioni di avvio e file letti
ss -lunp | grep -E ':(161|162)\b'      # UDP, non TCP: 161 e 162
```

## Core: configurazione e trap
Una community di solo laboratorio non deve uscire da `lo`. Il parametro `rocommunity` accetta come secondo argomento un host o una rete, e la vista limita l'albero leggibile.

```text
# /etc/snmp/snmpd.conf — minimo per il laboratorio
rocommunity lab-ro 127.0.0.1 .1.3.6.1.2.1      # community sola lettura, solo da localhost
sysLocation  "lab"
sysContact   lab@example.org
```

Il ricevitore si configura con la community che accetta e, per v3, con un utente creato dal suo motore. La direttiva `disableAuthorization yes` va bene solo per una demo su localhost: in produzione autentica ogni mittente.

```text
# /etc/snmp/snmptrapd.conf — solo laboratorio su localhost
disableAuthorization yes
# in v3: createUser -e 0x8000000001020304 monitor SHA 'auth-solo-lab' AES 'priv-solo-lab'
```

```bash
# finestra 1: ricevitore in foreground, log su stdout
sudo snmptrapd -f -Lo -C -c /etc/snmp/snmptrapd.conf

# finestra 2: una trap di prova verso il ricevitore su 127.0.0.1
snmptrap -v 2c -c lab-ro 127.0.0.1 '' NET-SNMP-EXAMPLES-MIB::netSnmpExampleHeartbeatNotification \
  netSnmpExampleHeartbeatRate i 42
snmpget -v2c -c lab-ro 127.0.0.1 .1.3.6.1.2.1.1.3.0
```

## Polling di contatori da Python

`pysnmp` implementa le PDU SNMP in Python puro: si costruiscono `get_cmd` o `bulk_cmd` e si inviano a un `SnmpEngine` con un `CommunityData` o `UsmUserData`. Lo script legge `sysUpTime.0` e `ifHCInOctets.2`, e restituisce solo differenze valide.

```python
from pysnmp.hlapi import *
import time

CONTATORI = {
    "uptime": "1.3.6.1.2.1.1.3.0",       # centesimi di secondo, scala 100/s
    "byte_in": "1.3.6.1.2.1.31.1.1.1.6.2",  # Counter64, 64 bit
}

def leggi(host, community, oids):
    objs = [ObjectType(ObjectIdentity(o)) for o in oids]
    it = getCmd(SnmpEngine(), CommunityData(community, mpModel=1),
                UdpTransportTarget((host, 161), timeout=1, retries=1),
                ContextData(), *objs)
    err_ind, err_stat, _, varbinds = next(it)   # una sola richiesta
    if err_ind or err_stat:
        raise RuntimeError(f"SNMP: {err_ind or err_stat.prettyPrint()}")
    return {name: int(value) for name, value in varbinds}

a = leggi("127.0.0.1", "lab-ro", list(CONTATORI.values()))
time.sleep(5)
b = leggi("127.0.0.1", "lab-ro", list(CONTATORI.values()))

dt = (b["uptime"] - a["uptime"]) / 100.0          # centesimi -> secondi
if dt <= 0:
    print("dispositivo riavviato o campione non valido")
else:
    print(f"{(b['byte_in'] - a['byte_in']) / dt:.0f} B/s")
```

Il timeout di default di `pysnmp` è brevissimo: senza `timeout=1, retries=1` su un dispositivo lento i risultati sono casuali. Udp6 o mpModel errati cambiano il formato del messaggio, quindi la versione si fissa esplicitamente. Il calcolo scarta `dt <= 0`, che corrisponde a un tasso impossibile.

## Esercizi

1. Verifica che v2c sia accettato e TCP sia rifiutato: `snmpget` funziona, `s_client` su 161 no.
2. Aggiungi un secondo indice a `CONTATORI` e conferma che la differenza riguarda la stessa interfaccia.
3. Calcola il tempo di wrap di un `Counter32` a 1 Gbit/s e quello di un `Counter64` a 10 Gbit/s.
4. Configura `snmptrapd` per accettare solo un utente v3, poi prova una trap v2c e documenta il rifiuto.
5. Aggiungi `walk` su `ifDescr` e usa il risultato per scrivere un nome leggibile accanto a ogni contatore.
6. Simula la perdita di una trap e mostra come il polling periodico compensi.

<details>
<summary>Soluzione</summary>

1. SNMP usa UDP: `ss -lunp` mostra `161/u` e `s_client -connect 127.0.0.1:161` (TCP) fallisce subito. La domanda giusta è su UDP.

2. La colonna è la stessa e l'indice finale cambia, `...1.6.2` e `...1.6.3`: il confronto è valido solo sullo stesso OID, quindi si somma l'indice alla chiave nel dizionario.

3. Un `Counter32` arriva a `2^32 - 1 = 4294967295` byte; a 1 Gbit/s sono 125000000 byte/s, cioè 34 secondi. Un `Counter64` a 10 Gbit/s arriva a `2^64 - 1` in oltre 4600 anni: nessun wrap pratico.

4. Con `createUser` e `authUser log monitor` il ricevitore accetta solo v3 con utente dichiarato; una trap v2c arriva come community sconosciuta e viene scartata, con una riga nel log senza mittente autenticato.

5. `bulkCmd` o `nextCmd` con un generator restituisce tutte le colonne della tabella, e `ifDescr` dà il nome associato all'indice, che funge da etichetta stabile.

6. Le trap restano in UDP senza ritrasmissione; un poller ogni 60 secondi ricalcola il tasso e chiude l'intervallo sull'ultimo valore noto. Il log mostra la mancanza come assenza nel campione, non come errore.

</details>

## Errori comuni

- **Avviare `snmptrapd` senza `-c`**: legge il default e in un container non trova il file, quindi non riceve nulla.
- **Confrontare contatori di interfacce diverse**: l'indice va fissato, altrimenti la differenza mescola valori di porte differenti.
- **Usare `mpModel=0` senza accorgersene**: `CommunityData` costruito per v1 rifiuta i contatori 64 bit.
- **Aspettarsi una ritrasmissione della trap**: UDP non lo fa, e il polling è quello che chiude i buchi.
- **Lasciare `disableAuthorization yes` oltre il laboratorio**: chiunque invii una trap riesce a scrivere nel ricevitore.

## In sintesi

Il laboratorio mostra l'intera catena SNMP: agente, poller e ricevitore. `snmpd.conf` e `snmptrapd.conf` definiscono chi può leggere e chi può notificare e vanno tenuti su reti ristrette. `pysnmp` riduce il polling a una funzione con timeout esplicito, e il tasso di traffico è sempre una differenza di contatori nello stesso OID. Trap e polling non sono alternativi: il primo dà reattività, il secondo copre i buchi.

## Fonti

- [Net-SNMP — snmpd.conf](https://www.net-snmp.org/docs/man/snmpd.conf.html)
- [Net-SNMP — snmptrapd.conf](https://www.net-snmp.org/docs/man/snmptrapd.conf.html)
- [Net-SNMP — snmptrap](https://www.net-snmp.org/docs/man/snmptrap.html)
- [Net-SNMP — Tutorial su snmptrap](https://www.net-snmp.org/wiki/index.php/TUT:snmptrap)
- [RFC 3416 — Version 2 of the Protocol Operations for SNMP](https://www.rfc-editor.org/rfc/rfc3416.html)
