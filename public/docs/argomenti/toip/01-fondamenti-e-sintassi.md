ToIP, Telephony over IP, è la visione che considera la telefonia un servizio completo e non un flusso audio: il centralino, i numeri, i trasferimenti, il fax e le chiamate verso la rete pubblica commutata. VoIP è l'ingranaggio che trasporta la voce; ToIP è la macchina che la usa per lavorare. In questa lezione capisci dove finisce il VoIP e comincia la telefonia, e perché un'azienda media non sopravvive alla confusione tra i due perimetri.

## Obiettivi

- Distinguere il perimetro VoIP (media e segnalazione di sessione) dal perimetro ToIP (servizio telefonico aziendale).
- Descrivere il ruolo di PBX IP, trunk SIP e media relay in una catena di chiamata completa.
- Riconoscere quando il fax richiede T.38 invece del pass-through audio.
- Costruire una catena QoS end-to-end e spiegare cosa non può garantire un solo router.
- Elencare i rischi di un servizio ToIP esposto senza autorizzazione.

## Due perimetri, un servizio

Il VoIP descrive come la voce diventa pacchetti: RTP, codec, jitter, SRTP. ToIP descrive ciò che rende quei pacchetti un telefono vero: il PBX IP che conosce gli utenti, il trunk SIP che collega il mondo esterno, la numerazione, la mobilità del numero aziendale, le regole di inoltro, la fatturazione delle chiamate.

| Domanda | Risposta VoIP | Risposta ToIP |
| --- | --- | --- |
| come viaggia la voce | RTP su UDP, codec, jitter buffer | non è il problema principale |
| chi sa che il numero esiste | nessuno | il PBX e il trunk verso l'operatore |
| cosa succede in una riunione | media negoziati con SDP | conferenza nel PBX, trasferimenti, parcheggio |
| come arriva un fax | codec audio o T.38 | il trunk deve dichiarare T.38 e le porte devono passare |
| cosa misurare | perdita, jitter, MOS | disponibilità del servizio, chiamate perse, registro |

Il modem e il fax sono il caso più chiaro: la voce compressa è ottima per parlare e pessima per i toni, quindi il fax chiede a SDP un media `image/t38`, definito da ITU-T T.38 e registrato da RFC 3362, e il gateway ricostruisce le immagini invece di comprimere il suono. Lontano dal trunk, il protocollo è ancora un dettaglio; dentro il servizio, è una voce di contratto.

## La catena di chiamata

Una chiamata aziendale attraversa un PBX nel cloud, un trunk SIP fornito da un operatore e un media relay che instrada i flussi. Ogni pezzo firma un pezzo del servizio: il PBX decide chi ha diritto a chiamare, il trunk fornisce i numeri e le rotte verso la rete pubblica, il relay gestisce i casi in cui i media non possono attraversare il NAT direttamente.

```text
Telefono SIP -->[registrazione]--> PBX IP -->[INVITE]--> Trunk SIP operatore --> PSTN
      ^                              |                                     |
      +-------- RTP ---------------> Media relay <-------------------------+
```

La registrazione è il primo contratto: il telefono comunica al PBX dove raggiungerlo e per quanto tempo la registrazione è valida. Un timeout troppo corto riempie le tabelle di registrazioni, uno troppo lungo lascia il PBX a chiamare telefoni spenti. Il PBX moderno come Asterisk organizza tutto in sezioni distinte di `pjsip.conf`, con un `transport` per protocollo e credenziali, un `endpoint` per le regole, un `auth` per le credenziali e un `aor` per l'indirizzo raggiungibile.

```text
[transport-tls]
type=transport
protocol=tls
bind=0.0.0.0
cert_file=/etc/asterisk/keys/pbx.crt
priv_key_file=/etc/asterisk/keys/pbx.key

[6001]
type=endpoint
transport=transport-tls
context=from-internal
disallow=all
allow=opus
allow=ulaw
auth=auth6001
aors=6001

[auth6001]
type=auth
auth_type=userpass
username=6001
password=cambia-questa-password
```

I nomi delle sezioni non sono decorativi: per gli endpoint e gli AOR devono corrispondere alla parte utente dell'URI SIP nel campo From della richiesta in ingresso, secondo la documentazione di res_pjsip. Un centralino che accetta chiamate dall'esterno deve distinguere gli utenti interni dai fornitori: l'ACL e `identify` fanno parte del servizio, non dell'hardening opzionale.

Il servizio comprende anche le code, i trasferimenti e il parcheggio: sono funzioni del dialplan del PBX, non del protocollo SIP in sé, e ognuna va provata come parte del contratto con gli utenti. Un trasferimento che fallisce è un ticket di telefonia, non un difetto di rete, e la diagnosi deve partire dal log del PBX.

## QoS end-to-end

Il VoIP chiede alla rete di trattare bene i suoi pacchetti, la ToIP chiede di farlo dall'inizio alla fine. In RFC 4594 la portante vocale, il fax T.38 e la voice-band data finiscono nella classe Telephony con DSCP EF, mentre la segnalazione SIP e H.323 finisce nella classe Signaling con CS5. Un router che marca bene ma lascia uscire il traffico incodato verso l'operatore ha spostato il problema, non l'ha risolto.

```bash
# Linux: due classi di traffico. Prima si marca il pacchetto con iptables,
# poi si accoda in banda prioritaria. 0xb8 = 184 = 46 << 2 (EF),
# 0xa0 = 160 = 40 << 2 (CS5): il TOS contiene DSCP shiftato di due bit.
iptables -t mangle -A POSTROUTING -p udp -m dscp --dscp-class EF  -j CLASSIFY --set-class 1:1
iptables -t mangle -A POSTROUTING -p udp -m dscp --dscp-class CS5 -j CLASSIFY --set-class 1:2
tc qdisc replace dev eth0 root handle 1: prio bands 3
```

Il punto di perimetro non è il valore assegnato ma la coerenza: l'operatore deve accettare e onorare quei valori, e il router deve rinnovare la marcatura se il pacchetto proviene da un telefono non fidato. RFC 4594 dice esplicitamente che i flussi in ingresso vanno verificati e politi.

## Errori comuni

- **Chiamare ToIP un'app di chiamata**: senza trunk verso la rete pubblica e senza numerazione gestita non c'è servizio telefonico, solo VoIP con un'interfaccia grafica.
- **Trattare il fax come audio compresso**: ricomprimere i toni rompe immagini e velocità di trasmissione, il fax vuole il suo media dichiarato.
- **Impostare DSCP e dichiarare la QoS fatta**: la marcatura senza accodamento prioritario lungo tutta la catena non cambia cosa vede la voce.
- **Lasciare il PBX aperto su internet**: un centralino con una password debole offre chiamate verso numeri a tariffazione maggiorata.
- **Misurare la qualità dal centralino**: il PBX conta le chiamate, non sente la voce; la qualità si misura sul percorso.

## In sintesi

Il VoIP è il mestiere del trasporto, la ToIP è il mestiere del servizio. Un trunk SIP, un PBX che conosce utenti e numeri, un media relay e un piano QoS coerente formano il servizio; T.38 e la classe EF aiutano a non confondere la voce con il resto del traffico. Tenere separati i due perimetri significa sapere quale contratto stai progettando e quale misura lo verifica.

## Fonti

- [RFC 3362 - Real-time Facsimile (T.38) - image/t38](https://www.rfc-editor.org/rfc/rfc3362.txt)
- [ITU-T T.38 - Procedures for real-time Group 3 facsimile communication over IP networks](https://www.itu.int/rec/T-REC-T.38/en)
- [RFC 4594 - Configuration Guidelines for DiffServ Service Classes](https://www.rfc-editor.org/rfc/rfc4594.txt)
- [Asterisk Docs - PJSIP Configuration Sections and Relationships](https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/PJSIP-Configuration-Sections-and-Relationships/)
- [Asterisk Docs - Important Security Considerations](https://docs.asterisk.org/Deployment/Important-Security-Considerations/)
