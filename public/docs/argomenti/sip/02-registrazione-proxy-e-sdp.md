Una chiamata SIP non è solo un INVITE: dietro ci sono registrazione, risoluzione dei nomi, autenticazione, negoziazione dei codec e una catena di server che instrada i messaggi. Questa lezione passa dalla sintassi alle macchine di rete: registrar, proxy, redirect server e il modello offer/answer di SDP. È il livello in cui si decide se una telefonata funziona, e dove si trova la causa quando non funziona.

## Obiettivi

- Distinguere il ruolo di registrar, proxy e redirect server.
- Seguire il flusso di registrazione e capirlo come binding temporaneo.
- Usare `dig` per individuare il server SIP di un dominio.
- Leggere un SDP e riconoscere il modello offer/answer.
- Spiegare l'autenticazione digest e il suo limite nel contesto SIP.

## Il registro: dove si trova un utente

Un user agent non è raggiungibile a un indirizzo fisso: si registra presso un **registrar**, che conserva l'associazione tra un AOR (Address of Record, cioè l'URI pubblico) e uno o più Contact concreti. La registrazione è un `REGISTER` con `Expires`, e scade se non rinnovata.

```text
REGISTER sip:registrar.biloxi.com SIP/2.0
Via: SIP/2.0/UDP bobspc.biloxi.com:5060;branch=z9hG4bKnashds7
Max-Forwards: 70
To: Bob <sip:bob@biloxi.com>
From: Bob <sip:bob@biloxi.com>;tag=456248
Call-ID: 843817637684230@998sdasdh09
CSeq: 1826 REGISTER
Contact: <sip:bob@192.0.2.4>
Expires: 7200
Content-Length: 0
```

Il registrar risponde `200 OK` e il binding dura per il tempo indicato. Un utente con più dispositivi (desk phone, softphone, mobile) registra più Contact sullo stesso AOR, e il proxy farà **forking** su tutti, oppure su uno in base alla priorità `q`. Il registro è il motivo per cui il numero SIP di una persona resta stabile anche se il suo IP cambia.

## Proxy, redirect e location service

Il **proxy server** riceve una richiesta e la inoltra verso il destinatario, modificando la request-URI o consultando il location service. Un **redirect server** non inoltra: risponde con `3xx` e un `Contact` dove il chiamante deve andare. La differenza pratica: con il proxy il chiamante non conosce l'indirizzo finale, con il redirect lo scopre e invia lui stesso la nuova richiesta.

| Ruolo | Stato della richiesta | Esito tipico |
| --- | --- | --- |
| registrar | nessuna (gestisce binding) | `200 OK` a `REGISTER` |
| proxy | inoltra, aggiunge `Via` | trasmette la richiesta al prossimo hop |
| redirect server | non inoltra | `3xx` con `Contact` |
| location service | database dell'AOR | fornito al proxy |
| B2BUA | termina e rigenera | due dialoghi distinti |

Un **B2BUA** (back-to-back user agent) è usato dai centralini (PBX) e dagli SBC: non è un proxy trasparente, ma chiude un dialogo e ne apre un altro, il che permette di cambiare SDP, codec o indirizzi. Questa è la ragione per cui un SBC può "aggiustare" il NAT e un proxy no.

```bash
# Trova il server SIP di un dominio tramite SRV, poi risolvi l'host
dig +short SRV _sip._udp.sip2sip.info
dig +short SRV _sips._tcp.sip2sip.info
```

Il parametro `transport` e il prefisso `_sip._udp` o `_sips._tcp` dicono anche quale trasporto usare. Se il DNS non ha SRV, SIP usa un `A` sul dominio, ed è un errore frequente configurare solo il peer IP dimenticando il registro.

## SDP e offer/answer

SIP non negozia il media da solo: il corpo SDP (RFC 8866) descrive la sessione. Con offer/answer (RFC 3264) una parte propone una lista di codec e indirizzi, l'altra sceglie un valore per ogni riga `m=`. La riga `m=audio 49172 RTP/AVP 0` dice: tipo audio, porta 49172, profilo RTP/AVP, payload 0 (PCMU, 8000 Hz). Il payload 8 è PCMA (G.711 A-law), il 101 è tipicamente telephony-event per il DTMF.

```text
v=0
o=alice 2890844526 2890844527 IN IP4 192.0.2.1
s=-
c=IN IP4 192.0.2.1
t=0 0
m=audio 49170 RTP/AVP 0 8 101
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:101 telephone-event/8000
a=sendrecv
```

L'offerta contiene tutta la lista e l'answer ne seleziona un sottoinsieme, un valore per `m=`. Se l'answer non supporta alcun codec, la riga `m=` va rifiutata con porta `0`. Un `c=IN IP4 0.0.0.0` significa solo che l'indirizzo va preso dalla riga `m=` o dal flusso ricevuto.

```bash
# Verifica che i pacchetti RTP vadano alla porta dichiarata in SDP
tshark -r sip.pcapng -Y 'sip && sip.msg_body' -T fields -e sdp.media_port
```

## Autenticazione e sicurezza

Il `401 Unauthorized` con `WWW-Authenticate` e il `407 Proxy Authentication Required` con `Proxy-Authenticate` avviano l'autenticazione **digest**: il client ripete la richiesta con un `Authorization` contenente nome utente, realm, nonce e response. È lo stesso schema di HTTP, senza trasporto cifrato di default. Per questo SIP si accoppia a TLS e SRTP, e le identità si verificano con i certificati.

| Protezione | Cosa copre | Nota |
| --- | --- | --- |
| TLS | canale SIP cifrato | necessario su `sips:` |
| digest | credenziali a livelli da replay limitato | non protegge il media |
| SRTP | cifratura e integrità del media | richiede scambio chiave |
| certificati | identità degli endpoint | RFC 5922 |

Anche il dialogo si gestisce con messaggi specifici: `SUBSCRIBE`/`NOTIFY` (RFC 6665) per lo stato di presenza, `INFO` per il DTMF fuori banda, `PRACK` (RFC 3262) per l'affidabilità delle risposte provvisorie, `UPDATE` (RFC 3311) per modificare la sessione prima dell'ACK.

## Errori comuni

- **Considerare la registrazione permanente**: il binding scade e va rinnovato prima di `Expires`; un clock sbagliato o un intervallo troppo lungo rende l'utente irraggiungibile.
- **Aspettarsi che un proxy modifichi l'SDP**: solo un B2BUA o un media relay lo fanno; il proxy inoltra i messaggi così come sono.
- **Dimenticare la porta del media nel SDP**: due chiamate con la stessa porta producono silenzio o audio incrociato.
- **Usare credenziali fisse nel digest senza TLS**: il nonce evita il replay, non l'intercettazione se il canale è in chiaro.
- **Configurare solo il peer IP al posto del dominio**: il DNS SRV permette failover e multipli indirizzi; l'IP fisso toglie la ridondanza.

## In sintesi

- Il registrar mantiene il binding AOR-Contact, temporaneo e rinnovabile.
- Proxy inoltra, redirect indirizza, B2BUA termina e rigenera: ruoli diversi con conseguenze diverse sulla modifica del SDP.
- SDP con offer/answer negozia codec e indirizzi; un `m=` senza valori viene rifiutato con porta 0.
- Digest e TLS/SRTP proteggono canale e media, con limiti diversi.
- La diagnosi parte sempre dai ruoli: se manca il registro, non c'è chiamata.

## Fonti

- RFC 3261 — SIP: Session Initiation Protocol: https://www.rfc-editor.org/rfc/rfc3261.html
- RFC 3264 — An Offer/Answer Model with SDP: https://www.rfc-editor.org/rfc/rfc3264.html
- RFC 8866 — SDP: Session Description Protocol: https://www.rfc-editor.org/rfc/rfc8866.html
- RFC 3311 — The SIP UPDATE Method: https://www.rfc-editor.org/rfc/rfc3311.html
- RFC 5922 — Domain Certificates in SIP: https://www.rfc-editor.org/rfc/rfc5922.html
