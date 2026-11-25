SIP (Session Initiation Protocol) è un protocollo di segnalazione testuale, definito nella RFC 3261, che crea, modifica e chiude sessioni multimediali su una rete IP. Non trasporta la voce: quella viaggia in RTP, mentre SIP si occupa di chi chiama chi, con quali parametri e con quale esito. Capire l'anatomia di un messaggio SIP apre la porta a tutta la telefonia moderna, dagli interni aziendali alle reti mobili IMS.

## Obiettivi

- Riconoscere la struttura request e response di un messaggio SIP.
- Istanziare i metodi base e i gruppi di risposte per classe.
- Spiegare il ruolo di Call-ID, branch, tag e CSeq nella correlazione dei messaggi.
- Descrivere come una richiesta attraversa un proxy e raggiunge un user agent.
- Collegare SIP a URI, trasporto e SDP senza confonderne i ruoli.

## La struttura di un messaggio

SIP riprende la sintassi di HTTP: una riga iniziale, header `Nome: valore`, una riga vuota e un corpo eventuale. Il corpo più comune è l'descrizione SDP della sessione. Le header si estendono su più righe usando lo spazio bianco iniziale, e i nomi sono case-insensitive mentre i valori non sempre lo sono.

```text
INVITE sip:bob@biloxi.com SIP/2.0
Via: SIP/2.0/UDP pc33.atlanta.com;branch=z9hG4bK776asdhds
Max-Forwards: 70
To: Bob <sip:bob@biloxi.com>
From: Alice <sip:alice@atlanta.com>;tag=1928301774
Call-ID: a84b4c76e66710@pc33.atlanta.com
CSeq: 314159 INVITE
Contact: <sip:alice@pc33.atlanta.com>
Content-Type: application/sdp
Content-Length: 147

v=0
o=alice 2890844526 2890844526 IN IP4 pc33.atlanta.com
s=Session SDP
c=IN IP4 pc33.atlanta.com
t=0 0
m=audio 49172 RTP/AVP 0
a=rtpmap:0 PCMU/8000
```

La prima riga è la **request line**: metodo, Request-URI, versione. La risposta ha invece una **status line** con codice e reason phrase, che è solo descrittiva e non va confrontata.

```text
SIP/2.0 200 OK
Via: SIP/2.0/UDP pc33.atlanta.com;branch=z9hG4bK776asdhds;received=192.0.2.1
To: Bob <sip:bob@biloxi.com>;tag=a6c85cf
From: Alice <sip:alice@atlanta.com>;tag=1928301774
Call-ID: a84b4c76e66710@pc33.atlanta.com
CSeq: 314159 INVITE
Contact: <sip:bob@192.0.2.4>
Content-Length: 0
```

## Metodi e risposte

| Metodo | Scopo | Note |
| --- | --- | --- |
| `INVITE` | avvia una sessione | può contenere SDP o riceverne uno in risposta |
| `ACK` | conferma l'arrivo della risposta finale a INVITE | non ha risposta |
| `BYE` | termina la sessione | inviato da una delle parti |
| `CANCEL` | annulla una richiesta ancora pendente | non annulla un INVITE già accettato |
| `OPTIONS` | interroga le capacità di un endpoint | utile per il keep-alive |
| `REGISTER` | associa un URI a un contatto raggiungibile | gestito dal registrar |
| `INFO` | trasporta informazioni in-dialog | usato per DTMF fuori banda |
| `SUBSCRIBE`/`NOTIFY` | presenza e notifiche di stato | definiti in RFC 6665 |

Le risposte sono raggruppate in classi: `1xx` provvisoria (100 Trying, 180 Ringing, 183 Session Progress), `2xx` successo (200 OK), `3xx` redirezione (301, 302), `4xx` errore del client (401, 403, 404, 486 Busy Here), `5xx` errore del server (503), `6xx` errore globale (603 Decline). La distinzione conta: un `401` è un invito ad autenticarsi con un nuovo INVITE, un `403` è un rifiuto.

```text
Alice                         Bob
  |  --- INVITE (SDP) -------->   |
  |  <-- 100 Trying -------------  |
  |  <-- 180 Ringing -------------  |
  |  <-- 200 OK (SDP) -----------  |
  |  --- ACK ------------------->   |
  |  <============= RTP =========>  |
  |  --- BYE ------------------->   |
  |  <-- 200 OK -----------------  |
```

## Dialoghi, transazioni e identificatori

SIP distingue due unità. La **transazione** è lo scambio tra una richiesta e una risposta; il **dialogo** è la conversazione persistente tra due user agent, identificata da Call-ID, tag del `From` e tag del `To`. Il tag del `To` compare solo nella risposta, e da quel momento il dialogo esiste.

| Identificatore | Chi lo genera | Scopo |
| --- | --- | --- |
| `Call-ID` | chi avvia | identifica la chiamata nella sua interezza |
| `From` tag | l'initiator | lato del dialogo |
| `To` tag | il destinatario | fissa il dialogo alla risposta |
| `Via` branch | ogni hop | matcha la risposta alla transazione |
| `CSeq` | l'initiator | ordina le richieste nel dialogo |

Il campo `Max-Forwards` è il TTL dei proxy: ogni proxy lo decrementa e, a zero, risponde `483 Too Many Hops`. Il `branch` con prefisso `z9hG4bK` è la firma delle transazioni secondo RFC 3261; senza quel prefisso, commenti di interop possono ignorarlo.

## Tutto passa da un URI

Un `sip:` URI identifica un'entità raggiungibile: `sip:alice@atlanta.com`. Il nome può contenere un numero di telefono: `sip:+15551234567@example.com;user=phone`. La risoluzione passa da un record `NAPTR`/`SRV` nel DNS e da un record `A`, oppure direttamente dall'indirizzo IP.

```bash
# Record di servizio che indicano come raggiungere un dominio SIP
dig +short SRV _sip._udp.example.com
```

Nella pratica una chiamata può passare per proxy, redirect server, registrar e location service, ed è il proxy a decidere il salto successivo. SIP è agnostico rispetto al trasporto: UDP, TCP, TLS o SCTP; la scelta incide su latenza e affidabilità, con `TCP` preferibile per i messaggi lunghi. La RFC 3261 definisce i meccanismi base, mentre la RFC 5636 descrive il tracciamento di una sessione SIP per la diagnostica.

## Errori comuni

- **Confrontare la reason phrase invece del codice**: `404 Not Found` e `404 No Such User` sono la stessa cosa. Confronta solo il codice numerico.
- **Confondere `CANCEL` con `BYE`**: `CANCEL` ferma una richiesta non ancora accettata; una chiamata già in dialogo si chiude con `BYE`.
- **Dimenticare il `tag` del To nel dialogo**: senza, il dialogo non è identificabile e il BYE può finire in un'altra sessione.
- **Assumere che SIP trasporti la voce**: trasporta solo la segnalazione; il media va in RTP, con codec descritti nel corpo SDP.
- **Tenere il `Max-Forwards` al default senza comprendere l'anello**: un routing mal configurato crea loop che il valore basso intercetta, ma il problema resta nel proxy.

## In sintesi

- SIP è un protocollo testuale di segnalazione basato su una request line o una status line, header e un corpo SDP.
- I metodi core sono `INVITE`, `ACK`, `BYE`, `CANCEL`, `OPTIONS`, `REGISTER`; le risposte si raggruppano in 1xx-6xx.
- Call-ID, tag, branch e CSeq identificano chiamata, dialogo e transazione.
- URI `sip:` e proxy decidono come e dove arriva una richiesta.
- SIP non trasporta audio: separa la segnalazione dal media ed è questa separazione che rende possibile la telefonia su IP.

## Fonti

- RFC 3261 — SIP: Session Initiation Protocol: https://www.rfc-editor.org/rfc/rfc3261.html
- RFC 3264 — An Offer/Answer Model with SDP: https://www.rfc-editor.org/rfc/rfc3264.html
- RFC 3966 — The tel URI for Telephone Numbers: https://www.rfc-editor.org/rfc/rfc3966.html
- RFC 6665 — SIP-Specific Event Notification: https://www.rfc-editor.org/rfc/rfc6665.html
- RFC 5636 — Trace of a SIP Session: https://www.rfc-editor.org/rfc/rfc5636.html
