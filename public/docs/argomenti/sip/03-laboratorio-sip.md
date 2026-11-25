In questo laboratorio metti in piedi un dominio minimale di cui sei cliente e amministratore: una macchina con un registrar e un proxy, un softphone che si registra, una cattura SIP e un report che verifica se la chiamata ha tutti i pezzi. Non installi un PBX completo: usi strumenti di rete per scrivere a mano messaggi SIP e leggere le risposte, così vedi ogni header e ogni codice.

## Obiettivi

- Costruire un dialogo SIP a mano con `netcat` e leggere la risposta.
- Registrare un endpoint e scoprire il binding con un `REGISTER` e un `OPTIONS`.
- Analizzare una chiamata completa in una cattura, dal `INVITE` al `BYE`.
- Verificare che l'SDP sia coerente con i pacchetti RTP osservati.

## Il contratto del laboratorio

| Strumento | Ruolo | Comando |
| --- | --- | --- |
| `nc` | invio manuale di messaggi SIP | `nc -u 192.0.2.10 5060` |
| `tshark` | decodifica di SIP e RTP | `tshark -r file.pcapng` |
| `dig` | risoluzione SRV | `dig SRV _sip._udp.example.com` |
| `sngrep` | visualizzazione di dialoghi | `sngrep -r file.pcapng` |
| `sip:.` URI | indirizzamento del server | `sip:registrar@192.0.2.10` |

Il criterio di successo è semplice: una chiamata registrata, un `INVITE` con risposta `200 OK`, ACK, almeno 100 pacchetti RTP in ciascuna direzione e un `BYE` che chiude senza errori. Ogni mancanza viene registrata come difetto con il messaggio che la evidenzia.

## Registrazione e verifica a mano

Il primo passo è la registrazione. Con `netcat` scrivi il messaggio, segui con una riga vuota e attendi la risposta. Le righe `Via`, `From`, `Call-ID` e `CSeq` devono essere coerenti; il `branch` deve iniziare con `z9hG4bK`.

```bash
# Invio di un REGISTER e risposta del registrar
printf 'REGISTER sip:192.0.2.10 SIP/2.0\r\nVia: SIP/2.0/UDP 192.0.2.20:5060;branch=z9hG4bK-lab1\r\nMax-Forwards: 70\r\nTo: <sip:lab@192.0.2.10>\r\nFrom: <sip:lab@192.0.2.10>;tag=lab1\r\nCall-ID: lab-register-1@192.0.2.20\r\nCSeq: 1 REGISTER\r\nContact: <sip:lab@192.0.2.20:5060>\r\nExpires: 600\r\nContent-Length: 0\r\n\r\n' | nc -u -w 3 192.0.2.10 5060
```

Se la risposta è `401 Unauthorized`, il registrar chiede credenziali; se è `200 OK`, il binding esiste. Per confermare la raggiungibilità senza chiamare, invia un `OPTIONS`: la risposta elenca i metodi supportati e il `Allow`. Un `404` su `OPTIONS` mentre il `REGISTER` funziona indica un problema di routing del proxy.

```text
SIP/2.0 200 OK
Via: SIP/2.0/UDP 192.0.2.20:5060;branch=z9hG4bK-lab1;received=192.0.2.20
To: <sip:lab@192.0.2.10>;tag=registar-77
From: <sip:lab@192.0.2.10>;tag=lab1
Call-ID: lab-register-1@192.0.2.20
CSeq: 1 REGISTER
Contact: <sip:lab@192.0.2.20:5060>;expires=600
Allow: INVITE, ACK, CANCEL, BYE, OPTIONS, REGISTER
```

Il tag nel `To` è nuovo e appartiene al dialogo: annotalo, perché tutte le richieste successive devono riportarlo.

## La chiamata in cattura

Con la registrazione attiva, esegui una chiamata con il softphone e cattura il traffico. L'analisi segue l'ordine dei messaggi nella cattura e verifica la sequenza: `INVITE`, `100 Trying`, `180 Ringing`, `200 OK`, `ACK`, media, `BYE`, `200 OK`. Il `200 OK` all'`INVITE` contiene l'answer SDP; l'`ACK` è obbligatorio e senza di esso il chiamato rinvia il `200 OK` e infine abbandona.

```bash
# Sequenza delle richieste e risposte SIP
tshark -r chiamata.pcapng -Y sip -T fields -e sip.CSeq.method -e sip.Status-Code | head -30
```

```bash
# Correla il Call-ID con i pacchetti RTP osservati
tshark -r chiamata.pcapng -T fields -e sip.Call-ID -e rtp.ssrc | sort | uniq -c | sort -nr | head
```

L'`ACK` per un `200 OK` è una richiesta nuova con un proprio `CSeq`, mentre l'`ACK` per una risposta non-2xx appartiene alla stessa transazione. È un dettaglio che rompe molti strumenti improvvisati: un `ACK` mancante su una chiamata a buon fine è quasi sempre un errore di codice nel client.

| Fase | Messaggio | Cosa verificare |
| --- | --- | --- |
| registrazione | `REGISTER`/`200 OK` | `Contact` e `Expires` |
| chiamata | `INVITE` | `Request-URI` e SDP offer |
| squillo | `180 Ringing` | presenza del tag `To` |
| risposta | `200 OK` | SDP answer con codec scelto |
| conferma | `ACK` | `CSeq` nuova e `Max-Forwards` |
| chiusura | `BYE`/`200 OK` | stesso `Call-ID` del dialogo |

## Esercizi

1. Aggiungi `OPTIONS` al test di registrazione e interpreta le differenze tra `200` e `404`.
2. Invia un `INVITE` con un `branch` che non inizia con `z9hG4bK` e osserva la tolleranza del server.
3. Estrai da una cattura tutti i `Call-ID` e conta quanti messaggi appartengono a ciascuno.
4. Confronta la porta `m=` con le porte UDP osservate: cosa accade se l'answer cambia porta?
5. Prova un `CANCEL` dopo il `180 Ringing` ma prima del `200 OK` e verifica il codice di risposta.
6. Descrivi un caso di `401` digest durante l'`INVITE` e la differenza con `403 Forbidden`.

<details>
<summary>Soluzione</summary>

1. `OPTIONS` senza autenticazione può dare `401`; un `404` indica che l'URI non è instradabile. La diagnosi cambia: credenziali contro routing.

2. Il server può accettare il `branch`, perché il prefisso è richiesto ma pochi proxy lo verificano; il test serve a capire quanto il codice sia rigoroso.

3. `tshark ... -e sip.Call-ID | sort | uniq -c` conta i messaggi; un re-INVITE riusa lo stesso `Call-ID` perché resta nello stesso dialogo.

4. Se l'answer sposta la porta, il flusso RTP va verso la nuova porta: un firewall che consente solo la porta dell'offer scarta i pacchetti.

5. Il `CANCEL` deve avere lo stesso `Call-ID`, `From` con tag, `To` senza tag e `CSeq` uguale ma con metodo `CANCEL`. La risposta è `200 OK`; l'`INVITE` originale risponde `487 Request Terminated` e richiede un `ACK`.

6. Con `401` il richiedente rifà l'`INVITE` con `Authorization`; con `403` la richiesta è rifiutata e non c'è recupero. Il server può restituire `407` quando a chiedere è il proxy.

</details>

## Errori comuni

- **Inviare `REGISTER` senza `Contact`**: il binding non ha dove puntare e la risposta è `400`.
- **Scrivere messaggi SIP senza `\r\n`**: `printf` con `\n` produce header che il parser non riconosce.
- **Confondere `ACK` per non-2xx e per 2xx**: nel primo caso appartiene alla transazione, nel secondo è una richiesta nuova.
- **Ritestare solo la chiamata "felice"**: i casi `486`, `487` e `603` sono quelli che il client deve gestire.
- **Ignorare l'expires del binding**: a fine `Expires` il registrar cancella il contatto e la chiamata va in `404`.

## In sintesi

- La registrazione è un contratto temporaneo; senza `Contact` ed `Expires` corretti l'utente sparisce.
- Il dialogo è riconoscibile da Call-ID e tag: senza tag il BYE non trova la sessione.
- L'`ACK` è obbligatorio per ogni `INVITE` accettato e appartiene a una transazione diversa.
- La regia della cattura: prima la sequenza SIP, poi la coerenza SDP, infine il media RTP.
- Scrivere i messaggi a mano è il modo più rapido per capire dove un client è non conforme.

## Fonti

- RFC 3261 — SIP: Session Initiation Protocol: https://www.rfc-editor.org/rfc/rfc3261.html
- RFC 8866 — SDP: Session Description Protocol: https://www.rfc-editor.org/rfc/rfc8866.html
- RFC 3264 — An Offer/Answer Model with SDP: https://www.rfc-editor.org/rfc/rfc3264.html
- tshark — Manuale della riga di comando: https://www.wireshark.org/docs/man-pages/tshark.html
