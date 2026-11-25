Le versioni di SNMP non differiscono solo nei numeri: v1 è il protocollo originale su UDP, v2c ne migliora l'efficienza mantenendo la sicurezza a una stringa condivisa, v3 aggiunge un modello utente vero con autenticazione e cifratura. Attorno a questa evoluzione si organizza il lavoro operativo: un poller che legge contatori a intervalli e un ricevitore di trap che ascolta gli eventi. In questa lezione confronti le tre versioni e costruisci un polling minimo con Net-SNMP.

## Obiettivi

- Scegliere tra v1, v2c e v3 in base all'ambiente e non alla comodità.
- Limitare la community v2c a un nome di sola lettura e a una rete precisa.
- Configurare un utente SNMPv3 con autenticazione e privacy.
- Distinguere polling e trap e sapere quale dei due serve a cosa.
- Calcolare un tasso di traffico dai contatori `ifHCInOctets`.

## v1, v2c e v3 a confronto

| Elemento | v1 | v2c | v3 |
| --- | --- | --- | --- |
| sicurezza | community in chiaro | community in chiaro | USM: utenti, auth e privacy |
| `GETBULK` | no | sì | sì |
| contatori 64 bit | no | sì | sì |
| notifiche | Trap (v1) | SNMPv2-Trap, Inform | SNMPv2-Trap, Inform |
| uso tipico | attrezzatura vecchia | monitoraggio locale | reti regolate |
| specifica | RFC 1157 | RFC 3416 | RFC 3411–3418 |

`GETBULK` raccoglie più istanze per richiesta e rende lo `walk` di una tabella grande molto più veloce. I contatori `Counter64` sono indispensabili su interfacce oltre un gigabit, dove un contatore a 32 bit va in wrap in pochi secondi. Le `Inform` sono notifiche confermate dal ricevitore, mentre le trap non hanno riscontro e possono andare perse sull'UDP.

## Community e USM

La community v2c è una stringa inviata in chiaro in ogni messaggio: chi la intercetta può leggere, e se è `private` può scrivere. RFC 3584 raccomanda un modello di sicurezza per comunità che separa il nome dalla semantica e limita l'accesso per vista. In pratica significa community solo di lettura, legate a un gruppo e a una vista, e segmentazione ACL su rete e porta.

```bash
# lettura di un singolo scalare; -v2c e -c sono le due scelte da fare ogni volta
snmpget -v2c -c monitor-ro 192.0.2.10 .1.3.6.1.2.1.1.3.0

# walk efficiente: in v2c snmpwalk usa GETBULK
snmpwalk -v2c -c monitor-ro 192.0.2.10 1.3.6.1.2.1.2.2.1.2
```

USM, descritto da RFC 3414, identifica un utente (`securityName`), un livello di sicurezza (`noAuthNoPriv`, `authNoPriv`, `authPriv`) e un motore SNMP con identificatore e contatore anti-replay. L'autenticazione usa HMAC-MD5 o HMAC-SHA-1, la privacy DES; RFC 3826 aggiunge AES come alternativa più sicura, e RFC 7860 aggiorna l'autenticazione a SHA-2. Le password separate per autenticazione e privacy derivano le chiavi locali con il motore del dispositivo.

```bash
# utente creato con authentication e privacy; il file .conf protegge le credenziali
snmpget -v3 -l authPriv -u monitor -a SHA -A 'auth-solo-lab' \
  -x AES -X 'priv-solo-lab' 192.0.2.10 .1.3.6.1.2.1.1.5.0
```

Su un dispositivo reale l'utente si crea dalla sua interfaccia di configurazione oppure con `snmpusm`, che richiede un utente già esistente: è una delle fonti di errore più comuni. Il livello `authPriv` significa che il contenuto è cifrato e autenticato, `authNoPriv` solo autenticato, `noAuthNoPriv` niente di entrambi.

## Polling e trap

Il poller legge valori a intervalli ed è affidabile perché la richiesta parte da lui: contatori, stato delle porte, temperatura, livello della batteria. La trap invece parte dal dispositivo su un evento e non ha garanzia di consegna: serve dove l'evento conta più del valore. Molti sistemi usano entrambi: trap per la reazione immediata e polling per la conferma e per la serie storica. Le trap si ricevono con `snmptrapd`, che ascolta sulla 162 e registra ogni notifica con l'OID e i varbind.

```bash
# ricevitore in foreground: ogni trap diventa una riga di log, utile per capire il formato
snmptrapd -f -Lo -c /etc/snmp/snmptrapd.conf

# contatori assoluti: il tasso è la differenza divisa l'intervallo
snmpget -v2c -c monitor-ro 192.0.2.10 .1.3.6.1.2.1.31.1.1.1.6.2 .1.3.6.1.2.1.1.3.0
# ifHCInOctets.2 e sysUpTime.0: se sysUpTime è diminuito il dispositivo si è riavviato
snmpwalk -v2c -c monitor-ro 192.0.2.10 .1.3.6.1.2.1.31.1.1.1.6 | head -3
```

Un `Counter64` non ha significato da solo: 12 GiB da quando il dispositivo è acceso non dicono nulla sul momento. Il tasso corretto è `(bc - ba) / (tc - ta)` in secondi, scartando il campione se `bc < ba` (contatore ripartito) o se `tc < ta`. Lo stesso vale per una notifica: leggere `sysUpTime.0` nel payload della trap permette di distinguere un evento reale da un trap ritardato.

## Errori comuni

- **Lasciare la community `public` o `private` di default**: sono le prime due stringhe provate da uno scanner.
- **Uscire su internet con SNMP v2c**: la community in chiaro è una credenziale leggibile da chiunque sul percorso.
- **Confondere trap e polling**: la trap non è una prova che il sistema fosse sano, solo che ha provato a notificare un evento.
- **Sottovalutare il costo di un `walk` completo ogni minuto**: un GETBULK mirato su pochi OID costa molto meno e misura lo stesso.
- **Creare un utente USM senza la password del motore**: le chiavi non corrispondono e ogni richiesta va in timeout senza un messaggio chiaro.

## In sintesi

SNMP v1 è storico, v2c è il compromesso di funzionalità, v3 è la versione da usare quando i dati non devono essere leggibili sulla rete. Community e utenti USM riproducono i rischi delle password condivise: la sicurezza è nella configurazione, non nel numero di versione. Il polling costruisce serie storiche sui contatori e richiede il calcolo della differenza; le trap danno reattività ma non garanzia. Le due tecniche si completano.

## Fonti

- [RFC 3414 — User-based Security Model (USM) for SNMPv3](https://www.rfc-editor.org/rfc/rfc3414.html)
- [RFC 3584 — Coexistence between SNMP Versions 1, 2 and 3](https://www.rfc-editor.org/rfc/rfc3584.html)
- [RFC 3826 — The Advanced Encryption Standard (AES) Cipher Algorithm in SNMPv3](https://www.rfc-editor.org/rfc/rfc3826.html)
- [RFC 2576 — Coexistence between SNMPv1, SNMPv2, and SNMPv3](https://www.rfc-editor.org/rfc/rfc2576.html)
- [Net-SNMP — Tutorial sulle opzioni SNMPv3](https://www.net-snmp.org/wiki/index.php/TUT:SNMPv3_Options)
