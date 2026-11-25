In questo laboratorio allestisci un servizio ToIP minimo ma completo: un PBX IP locale, due telefoni software, un trunk verso un gateway di test e un fax che tenta la traversata. Non serve comprare numeri: il laboratorio gira su indirizzi riservati alla documentazione e su un gateway di prova, e ogni passaggio lascia una traccia verificabile. L'obiettivo non è avere una centrale in produzione, è sapere quale anello della catena stai guardando quando il servizio non risponde.

## Obiettivi

- Allestire un PBX IP con un endpoint interno e uno remoto dietro NAT.
- Configurare un trunk SIP in uscita e verificare la registrazione.
- Forzare il percorso media attraverso il PBX e misurarne gli effetti sul conteggio.
- Negoziare un fax T.38 e leggere la trattativa in cattura.
- Definire una prova di accettazione ripetibile con criteri numerici.

## Il banco di prova

Il laboratorio usa indirizzi di documentazione RFC 5737, quindi nulla del traffico esce verso il mondo reale. Il PBX ascolta su TLS 5061 con un certificato locale, i telefoni sono client SIP software, il trunk è puntato a un gateway di test con registrazione attiva.

| Componente | Indirizzo | Ruolo | Prova |
| --- | --- | --- | --- |
| PBX IP | 192.0.2.10 | registrazione, dialplan, relay media | `pjsip show endpoints` |
| telefono interno | 192.0.2.20 | utente 6001 | chiamata a 6002 e tono di prova |
| telefono remoto | 198.51.100.40 | utente 6002 dietro NAT | chiamata bidirezionale |
| trunk | 203.0.113.1 | numerazione esterna | `pjsip show registrations` |
| gateway fax | 203.0.113.5 | T.38 | `image/t38` nella SDP |

```bash
# Verifica del servizio in tre passi, senza digressioni sull'audio
asterisk -rx "pjsip show transports"
asterisk -rx "pjsip show registrations"
asterisk -rx "pjsip show contacts" | grep -c 6001
```

## Configurare il servizio

La configurazione minima separa le responsabilità: un transport TLS per la segnalazione cifrata, un transport UDP con la rete locale dichiarata e un indirizzo esterno per i casi in cui il PBX è dietro NAT. Il trunk riceve autenticazione separata dal telefono, così le credenziali dell'operatore non circolano sui dispositivi.

```text
; pjsip.conf (frammento, indirizzi di documentazione)
[transport-tls]
type=transport
protocol=tls
bind=0.0.0.0:5061
cert_file=/etc/asterisk/keys/pbx.crt
priv_key_file=/etc/asterisk/keys/pbx.key

[trunk-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
local_net=192.0.2.0/24
external_media_address=
external_signaling_address=
```

```text
[test-operatore]
type=registration
transport=trunk-udp
outbound_auth=test-operatore
server_uri=sip:test@203.0.113.1:5060
client_uri=sip:test@192.0.2.10:5060
retry_interval=60

[test-operatore]
type=auth
auth_type=userpass
username=test
password=********

[test-operatore]
type=aor
contact=sip:203.0.113.1:5060
```

Il numero in coda al client e al contatto è quello di prova fornito dal gateway: cambiarlo non serve a "far funzionare meglio" la registrazione, diverso caso invece è l'identità chiamante, che va autorizzata sul trunk prima di essere presentata.

## Un trunk che non registra

La diagnosi segue un ordine fisso: prima la raggiungibilità, poi la sfida, poi l'autorizzazione, infine il registro. Ogni passo ha una prova.

```bash
# 1) registrazione richiesta al volo e cattura dei messaggi del trunk
tcpdump -i any -n -c 5 'udp port 5060' -w probe.pcap &
sleep 1
asterisk -rx "pjsip send register test-operatore"

# 2) sfida e risposta con credenziali, in ordine cronologico
tshark -r probe.pcap -Y sip -T fields \
       -e frame.number -e sip.Method -e sip.Status-Code -e sip.CSeq.method
```

```text
1  5060 -> 5060  REGISTER   401  REGISTER
2  5060 <- 5060  REGISTER   200  REGISTER
```

Il 401 seguito da 200 è la prova che le credenziali sono corrette e che il registro è accettato. Se compare 403, la password funziona ma il gateway non autorizza quella sorgente o quel profilo; se il registro si ripete senza risposta, il problema è di rete o di porta, non di credenziali. In questo laboratorio il gateway di test è configurato per accettare solo 192.0.2.10, quindi un cambio di indirizzo del PBX riproduce un 403 identico al caso reale.

## Esercizi

1. Riproduci il 403 cambiando l'indirizzo sorgente e spiega quale logica lo ha generato.
2. Aggiungi un secondo endpoint TLS e verifica che le chiamate interne restino nel PBX.
3. Misura il numero di flussi RTP con `direct_media=yes` e con `direct_media=no`.
4. Provoca un `Session-Expires` e osserva il BYE con il tempo trascorso.
5. Prova un fax senza T.38 e con T.38 e confronta i risultati.
6. Scrivi la checklist di accettazione del servizio con almeno quattro prove numeriche.<details>
<summary>Soluzione</summary>

1. La logica che ha generato il 403 è l'ACL del gateway: l'indirizzo sorgente è noto ma non è nella lista dei permessi. La prova è che la sfida arrivava correttamente (407) prima del cambio, segno che il trasporto e il dialogo funzionavano.

2. Due endpoint su transport TLS condividono lo stesso transport: la chiamata interna va con `direct_media=no` e resta nel PBX. Nel registro delle chiamate compaiono entrambe le gambe e il conteggio dei canali è 2.

3. Con `direct_media=yes` il PBX vede due canali di segnalazione e nessuna gamba media; con `no` vede anche i due flussi RTP. La differenza si legge nel `core show channels` e nel tasso di CPU, che aumenta nel secondo caso.

4. Si configura un `Session-Expires` basso solo nel laboratorio; il BYE arriva entro la metà dell'intervallo se il refresh non parte. Il tempo si ricava dalla cattura con `frame.time_relative` e conferma che la chiusura è logica, non un timeout di rete.

5. Senza T.38 il fax passa come audio G.711: già pochi pacchetti persi rovinano una pagina intera. Con T.38 la SDP mostra `m=image` e la cattura contiene ritrasmissioni UDPTL, con più volte di ripetizione ma tolleranza alla perdita.

6. Le prove minime sono: registrazione trunk entro dieci secondi, chiamata interna con audio bidirezionale su entrambi i canali, chiamata esterna con codice 200 e ritorno in meno di un secondo, fax T.38 con pagina completata, e assenza di marcature DSCP azzerate a valle del gateway.

</details>

## Errori comuni

- **Partire dal codec quando il registro non funziona**: finché il trunk non è registrato nessun payload esiste, e il tempo speso sui codec è tempo perso.
- **Dare al trunk lo stesso profilo dei telefoni**: le credenziali dell'operatore finiscono nei dispositivi e la rotazione diventa un incidente.
- **Usare `external_media_address` senza `local_net`**: l'indirizzo esterno viene scritto anche verso interlocutori interni e rompe i media locali.
- **Ripetere il test sempre uguale**: solo una variazione controllata dice quale anello è responsabile.
- **Dichiarare il servizio pronto senza prova di fax**: il fax è spesso il primo servizio che cade in produzione.

## In sintesi

Un servizio ToIP si progetta per anelli: registrazione, segnalazione, media, numerazione, fax e QoS. Il banco di prova di questo modulo rende ogni anello controllabile e ogni prova ripetibile, così il passaggio in produzione non è una scommessa ma una checklist con numeri. La regola finale è nel contratto: la ToIP misura il servizio, non l'audio, e il servizio è fatto di tutte le sue gambe.

## Fonti

- [Asterisk Docs - PJSIP Configuration Sections and Relationships](https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/PJSIP-Configuration-Sections-and-Relationships/)
- [Asterisk Docs - Configuring res_pjsip to work through NAT](https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/Configuring-res_pjsip-to-work-through-NAT/)
- [ITU-T T.38 - Facsimile su reti IP](https://www.itu.int/rec/T-REC-T.38/en)
- [RFC 5737 - IPv4 Address Blocks Reserved for Documentation](https://www.rfc-editor.org/rfc/rfc5737.txt)
- [Wireshark wiki - SIP](https://gitlab.com/wireshark/wireshark/-/wikis/SIP)
