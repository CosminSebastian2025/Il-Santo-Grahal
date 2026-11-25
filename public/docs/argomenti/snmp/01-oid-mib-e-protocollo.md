SNMP serve a leggere e scrivere variabili dentro dispositivi di rete e server: router, switch, stampanti, UPS, demoni su Linux. Non è un protocollo di comandi nominati ma un accesso a un albero numerico, l'MIB, dove ogni valore ha un identificatore OID. Capire la struttura dell'albero e il formato dei messaggi spiega perché gli strumenti si chiamano `snmpget` e `snmpwalk` e perché un OID sbagliato restituisce `noSuchObject` invece di un errore.

## Obiettivi

- Leggere un OID come percorso nell'albero SMI e trovare il prefisso aziendale.
- Distinguere scalari e colonne di tabella e capire il suffisso dell'indice.
- Riconoscere le operazioni GET, GETNEXT, GETBULK e SET e il loro scopo.
- Capire come una MIB tradotta da ASN.1 dà un nome ai numeri.
- Spiegare cosa succede quando il dispositivo non implementa un OID.

## OID, MIB e struttura dell'albero

Un OID è una sequenza di numeri separati da punti che parte dalla radice ASN.1. La radice `1.3.6.1` identifica `internet`, `1.3.6.1.2.1` è `mib-2` gestito da IANA, `1.3.6.1.4.1` è lo spazio delle aziende. Lo standard SMIv2 (RFC 2578) definisce i tipi e le regole con cui una MIB descrive gli oggetti; RFC 1155 descrive la versione precedente, SMIv1.

| OID | Nome | Contenuto |
| --- | --- | --- |
| `1.3.6.1.2.1.1.1` | `sysDescr.0` | descrizione del dispositivo |
| `1.3.6.1.2.1.1.3` | `sysUpTime.0` | tempo dall'avvio in centesimi |
| `1.3.6.1.2.1.2.2.1.2` | `ifDescr` | nome delle interfacce |
| `1.3.6.1.2.1.31.1.1.1.6` | `ifHCInOctets` | byte ricevuti, contatore a 64 bit |
| `1.3.6.1.4.1.9.2.1.1` | `sysDescr` Cisco | MIB aziendale, ramo 9 |

```text
iso(1) org(3) dod(6) internet(1) mgmt(2) mib-2(1) system(1)
                                \ private(4) enterprises(1) 9 = Cisco
```

Un OID senza istanza identifica la colonna o il nodo; il dispositivo risponde su un'istanza, cioè l'OID più il suffisso. Per un scalare il suffisso è `.0`.

## Scalari, tabelle e indici

Le tabelle sono sequenze di colonne, e ogni riga è identificata da un indice: per `ifTable` l'indice è il numero dell'interfaccia. L'OID completo è colonna più indice, `.1` per la prima interfaccia.

| `ifTable` | .1 | .2 | .3 | .4 | .5 |
| `ifEntry` | `ifIndex` | `ifDescr` | `ifType` | `ifMtu` | `ifSpeed` |
| istanza 1 | `...1.1.1` | `...1.2.1` | `...1.3.1` | `...1.4.1` | `...1.5.1` |

Il prefisso comune è `1.3.6.1.2.1.2.2.1`: la colonna è l'ultimo numero, l'istanza lo segue e per la prima interfaccia è `.1`. Una tabella con indice composto, come una routing table, ha un suffisso di più numeri. Il valore può assumere tipi come `Integer32`, `Counter64`, `Gauge32`, `OctetString`, `Opaque` oppure eccezioni come `noSuchObject` e `noSuchInstance`.

## Operazioni del protocollo

Il protocollo di trasporto è definito in RFC 3416 per v2c e v3 e in RFC 1157 per v1. Il manager manda una PDU con un `request-id`, il dispositivo risponde con lo stesso `request-id`.

| Operazione | PDU | Uso |
| --- | --- | --- |
| GET | `GetRequest` | legge un OID esatto |
| GETNEXT | `GetNextRequest` | legge l'istanza successiva nell'albero |
| GETBULK | `GetBulkRequest` | legge più istanze in una richiesta (v2c, v3) |
| SET | `SetRequest` | scrive un valore, se la MIB è scrivibile |
| RESPONSE | `GetResponse` | risposta con `error-status` e varbinds |
| TRAP | `SNMPv2-Trap` | notifica spontanea dal dispositivo |

Il comando `snmptranslate` traduce in entrambe le direzioni e in questa fase è lo strumento più utile: converte un numero in un nome e il nome in un OID. Il suffisso `-On` forza l'output numerico, `-Tp` mostra l'albero di un modulo con le descrizioni dei nodi.

```bash
snmptranslate -On IF-MIB::ifDescr          # nome -> OID numerico
snmptranslate -On .1.3.6.1.2.1.1.3.0      # resta numerico
snmptranslate -Tp -IR ifTable              # albero leggibile di una tabella
```

`-IR` cerca il nome in tutte le MIB caricate, quindi funziona anche senza il prefisso del modulo. Senza MIB installate, il tool lavora solo con i numeri: la MIB serve alla leggibilità, non al protocollo.

## Errori comuni

- **Chiamare OID quello che è il nome plus istanza**: `sysUpTime` è il nodo, `sysUpTime.0` è l'istanza che il dispositivo legge.
- **Omettere `.0` su uno scalare**: il GET riceve `noSuchInstance` anche se il dispositivo supporta l'oggetto.
- **Trattare `ifSpeed` come affidabile**: è un `Gauge32` a 32 bit e satura sulle interfacce veloci; per il traffico conta `ifHCInOctets`.
- **Supporre che una MIB installata descriva il dispositivo**: una MIB standard descrive un OID, non garantisce che quell'OID sia implementato.
- **Leggere un contatore come se fosse un tasso**: `ifInOctets` cresce e riparte da zero al riavvio, il tasso è la differenza nel tempo.

## In sintesi

SNMP è un albero di variabili numeriche: l'OID è l'indirizzo, l'istanza il punto esatto, la MIB il dizionario dei nomi e dei tipi. Le tabelle hanno un indice che si aggiunge alla colonna, e le operazioni sono poche: GET, GETNEXT, GETBULK, SET e le notifiche. Una MIB assente non impedisce di leggere, toglie solo i nomi. Tutto il resto del protocollo costruisce su questa struttura.

## Fonti

- [RFC 3411 — An Architecture for Describing SNMP Management Frameworks](https://www.rfc-editor.org/rfc/rfc3411.html)
- [RFC 3416 — Version 2 of the Protocol Operations for SNMP](https://www.rfc-editor.org/rfc/rfc3416.html)
- [RFC 2578 — Structure of Management Information Version 2 (SMIv2)](https://www.rfc-editor.org/rfc/rfc2578.html)
- [RFC 1157 — A Simple Network Management Protocol (SNMP)](https://www.rfc-editor.org/rfc/rfc1157.html)
- [Net-SNMP — Tutorial su snmptranslate](https://www.net-snmp.org/wiki/index.php/TUT:snmptranslate)
